/**
 * Adaptador: filas del reporte de BIT -> modelo `Service` de la aplicación.
 *
 * La API entrega filas de servicio y filas de extracosto unidas por el id de
 * servicio. Aquí se agrupan por id, se elige la fila base, y los extracostos se
 * convierten en líneas de venta y costo.
 *
 * La aplicación no escribe de vuelta: el equipo corrige en el ERP. Este módulo
 * es de sólo lectura sobre la respuesta.
 */

import { Service, ServiceLine, ServiceState, OperationType, ServiceModality, Client } from '../types';
import { FilaCruda, TIPO_FILA } from './apiClient';
import { CAMPOS, MapeoCampos, aFecha, aNumero, tieneHora } from './fieldMapping';

export interface ConstruccionResultado {
  servicios: Service[];
  clientes: Client[];
  avisos: string[];
  /** Filas de extracosto que no encontraron su servicio. */
  huerfanos: number;
  filasExtra: number;
  /**
   * Reglas que no se pueden evaluar por cómo vienen los datos, no por falta de
   * columna. Se apagan igual: una regla alimentada con un valor que no la
   * soporta no produce hallazgos, produce ruido.
   */
  reglasSinSustento: { regla: string; motivo: string }[];
  /** Cuántos servicios llegaron sin fecha utilizable. */
  sinFecha: number;
}

const iso = (d: Date | null): string | undefined =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;

const texto = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Id estable de cliente derivado del nombre, ya que el reporte no trae uno. */
export function clienteIdDesdeNombre(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base ? `CLI-${base}`.slice(0, 48) : 'CLI-sin-cliente';
}

// ---------------------------------------------------------------------------
// Normalización de valores del reporte
// ---------------------------------------------------------------------------

const EQUIVALENCIAS_ESTADO: [RegExp, ServiceState][] = [
  [/proyec/i, 'proyeccion'],
  [/coordinac|borrador|pendiente|ingresad/i, 'borrador'],
  [/confirmad|coordinad|aprobad/i, 'confirmado'],
  [/transito|tránsito|en\s*curso|en\s*ruta|despachad/i, 'en_transito'],
  [/factur|liquidad/i, 'facturado'],
  [/cerrad|finalizad|complet|terminad/i, 'cerrado'],
];

export function normalizarEstado(v: unknown): ServiceState {
  const s = texto(v);
  if (!s) return 'borrador';
  for (const [patron, estado] of EQUIVALENCIAS_ESTADO) {
    if (patron.test(s)) return estado;
  }
  return 'borrador';
}

export function normalizarOperacion(v: unknown): OperationType | undefined {
  const s = texto(v).toUpperCase();
  if (!s) return undefined;
  if (/EXPO/.test(s)) return 'exportacion';
  if (/IMPO/.test(s)) return 'importacion';
  if (/NAC/.test(s)) return 'nacional';
  return undefined;
}

export function normalizarModalidad(v: unknown): ServiceModality | undefined {
  const s = texto(v).toUpperCase();
  if (!s) return undefined;
  if (/DIFERID/.test(s)) return 'diferido';
  if (/DIRECT/.test(s)) return 'directo';
  return undefined;
}

// ---------------------------------------------------------------------------
// ¿Fila base o extracosto?
// ---------------------------------------------------------------------------

/**
 * `true` extracosto, `false` fila del flete, `null` indeterminado (se resuelve
 * por posición dentro del grupo).
 *
 * El reporte llega como filas planas: por cada servicio, una fila es el flete y
 * las demás son sus extracostos, unidas por el id de servicio. El discriminador
 * fiable es el id de extracosto: la fila del flete no lo trae.
 */
function esExtra(fila: FilaCruda, mapeo: MapeoCampos): boolean | null {
  // 1. El id de extracosto: sólo lo llevan las filas de extracosto.
  if (mapeo.extracostoId) {
    const id = texto(fila[mapeo.extracostoId]);
    // Un "0" es el relleno habitual para "no aplica", no un id real.
    return id !== '' && id !== '0';
  }

  // 2. La marca que puso `aplanar` cuando los extracostos venían anidados.
  const marca = texto(fila[TIPO_FILA]);
  if (marca === 'EXTRACOSTO') return true;
  if (marca === 'SERVICIO') return false;

  // 3. Una columna que nombre el tipo de fila.
  if (mapeo.tipoFila) {
    const v = texto(fila[mapeo.tipoFila]).toLowerCase();
    if (/extra|adicional|gasto/.test(v)) return true;
    if (/servicio|principal|base|cabecera|flete/.test(v)) return false;
  }

  // 4. Último recurso: un extracosto no suele repetir el cliente.
  if (mapeo.cliente && texto(fila[mapeo.cliente]) === '') return true;

  return null;
}

// ---------------------------------------------------------------------------
// Construcción
// ---------------------------------------------------------------------------

export function construirServicios(filas: FilaCruda[], mapeo: MapeoCampos): ConstruccionResultado {
  const avisos: string[] = [];

  if (!mapeo.idServicio) {
    return {
      servicios: [],
      clientes: [],
      avisos: ['No se pudo identificar la columna del id de servicio. Revisa el mapeo de campos.'],
      huerfanos: 0,
      filasExtra: 0,
      reglasSinSustento: [],
      sinFecha: 0,
    };
  }

  const leer = (fila: FilaCruda, campo: string): unknown =>
    mapeo[campo] ? fila[mapeo[campo]] : undefined;

  // Agrupar por id de servicio.
  const grupos = new Map<string, FilaCruda[]>();
  filas.forEach((fila, i) => {
    const id = texto(fila[mapeo.idServicio]) || `__sin_id_${i}`;
    const grupo = grupos.get(id);
    if (grupo) grupo.push(fila);
    else grupos.set(id, [fila]);
  });

  const servicios: Service[] = [];
  const clientesPorId = new Map<string, Client>();
  let huerfanos = 0;
  let filasExtra = 0;
  let sinFecha = 0;
  let estadiaMedible = false;
  let estadiaConFechaSuelta = false;

  for (const [id, delGrupo] of grupos) {
    const marcas = delGrupo.map((f) => esExtra(f, mapeo));

    // La fila del flete es la que no está marcada como extracosto, venga en la
    // posición que venga dentro del grupo.
    let idxBase = marcas.findIndex((m) => m === false);
    if (idxBase < 0) idxBase = marcas.findIndex((m) => m === null);
    if (idxBase < 0) {
      // Sólo extracostos: no hay flete al que colgarlos.
      huerfanos += delGrupo.length;
      filasExtra += delGrupo.length;
      continue;
    }

    const base = delGrupo[idxBase];

    const nombreCliente = texto(leer(base, 'cliente')) || '(sin cliente)';
    const clienteId = clienteIdDesdeNombre(nombreCliente);
    const ejecutivo = texto(leer(base, 'ejecutiva')) || 'Sin asignar';

    if (!clientesPorId.has(clienteId)) {
      clientesPorId.set(clienteId, {
        id: clienteId,
        nombre: nombreCliente,
        ejecutivo,
        tieneMatriz: false, // lo resuelve el motor al cruzar con la matriz
      });
    }

    const fechaServicio = aFecha(leer(base, 'fecha'));
    if (!fechaServicio) sinFecha++;

    // Línea base: la venta y el costo del servicio propiamente tal.
    const ventaBase = aNumero(leer(base, 'venta'));
    const costoBase = aNumero(leer(base, 'costo'));
    const tarifa = mapeo.tarifa ? aNumero(leer(base, 'tarifa')) : ventaBase;

    const lineas: ServiceLine[] = [];
    if (ventaBase !== 0) {
      lineas.push({
        id: `${id}-venta-base`,
        codigo: 'FLETE',
        nombreConcepto: 'Flete / servicio base',
        tipo: 'venta',
        valor: ventaBase,
        moneda: 'CLP',
      });
    }
    if (costoBase !== 0) {
      lineas.push({
        id: `${id}-costo-base`,
        codigo: 'FLETE_COSTO',
        nombreConcepto: 'Costo de transporte',
        tipo: 'costo',
        valor: costoBase,
        moneda: 'CLP',
      });
    }

    // Extracostos: una línea de venta y otra de costo por cada uno.
    delGrupo.forEach((fila, i) => {
      if (i === idxBase) return;
      filasExtra++;

      const concepto = texto(leer(fila, 'concepto')) || 'Sin concepto';
      const codigo = codigoDeConcepto(concepto);
      // Se prefiere el id real del extracosto sobre el índice de la fila.
      const idExtra = texto(leer(fila, 'extracostoId')) || String(i);
      const venta = aNumero(leer(fila, 'venta'));
      const costo = aNumero(leer(fila, 'costo'));

      if (venta !== 0) {
        lineas.push({
          id: `${id}-extra-v-${idExtra}`,
          codigo,
          nombreConcepto: concepto,
          tipo: 'venta',
          valor: venta,
          moneda: 'CLP',
        });
      }
      if (costo !== 0) {
        lineas.push({
          id: `${id}-extra-c-${idExtra}`,
          codigo: `${codigo}_COSTO`,
          nombreConcepto: `${concepto} (costo)`,
          tipo: 'costo',
          valor: costo,
          moneda: 'CLP',
        });
      }
    });

    const estado = normalizarEstado(leer(base, 'estado'));
    const pesoKg = mapeo.peso ? aNumero(leer(base, 'peso')) : undefined;
    const contenedor = texto(leer(base, 'contenedor'));
    const tipoContenedor = texto(leer(base, 'tipoContenedor'));

    const servicio: Service = {
      id,
      clienteId,
      clienteNombre: nombreCliente,
      ejecutivo,
      ruta: {
        origen: texto(leer(base, 'origen')),
        destino: texto(leer(base, 'destino')),
      },
      contenedores: tipoContenedor ? [{ tipo: tipoContenedor, cantidad: 1 }] : [],
      estado,
      fechaCreacion: iso(fechaServicio) ?? '',
      lineas,
      tipoOperacion: normalizarOperacion(leer(base, 'operacion')),
      modalidad: normalizarModalidad(leer(base, 'modalidad')),
      pesoKg,
      puerto: texto(leer(base, 'puerto')) || undefined,
      nave: texto(leer(base, 'nave')) || undefined,
      depositoVacio: texto(leer(base, 'depositoVacio')) || undefined,
      depositoRetiro: texto(leer(base, 'depositoRetiro')) || undefined,
      fechaStacking: iso(aFecha(leer(base, 'fechaStacking'))),
      corteDocumental: iso(aFecha(leer(base, 'corteDocumental'))),
      inPlanta: iso(aFecha(leer(base, 'inPlanta'))),
      outPlanta: iso(aFecha(leer(base, 'outPlanta'))),
      fechaRetiro: iso(aFecha(leer(base, 'fechaRetiro'))),
      fechaPresentacion: iso(aFecha(leer(base, 'fechaPresentacion'))),
      direccionPlanta: texto(leer(base, 'destino')) || undefined,
    };

    // Días de almacenaje: derivados, no vienen en el reporte.
    const retiro = aFecha(leer(base, 'fechaRetiro'));
    const presentacion = aFecha(leer(base, 'fechaPresentacion'));
    if (retiro && presentacion) {
      servicio.diasAlmacenaje = Math.max(
        0,
        Math.round((presentacion.getTime() - retiro.getTime()) / 86400000),
      );
    }

    // Horas de estadía: sólo tienen sentido si las marcas traen hora. Con
    // fechas a secas la diferencia son días completos y R-GEN-05 se dispararía
    // en todos los servicios (ver `estadiaMedible`).
    const crudoIn = leer(base, 'inPlanta');
    const crudoOut = leer(base, 'outPlanta');
    const inP = aFecha(crudoIn);
    const outP = aFecha(crudoOut);
    if (inP && outP) {
      if (tieneHora(crudoIn) || tieneHora(crudoOut)) {
        servicio.horasEstadia = Math.max(0, (outP.getTime() - inP.getTime()) / 3600000);
        estadiaMedible = true;
      } else {
        estadiaConFechaSuelta = true;
      }
    }

    // El bloque de proyección alimenta la vista de proyección de carga.
    const eta = aFecha(leer(base, 'eta'));
    servicio.proyeccion = {
      numReg: Number(String(id).replace(/\D/g, '')) || 0,
      tipoServ: texto(leer(base, 'operacion')) || texto(leer(base, 'modalidad')),
      mandante: texto(leer(base, 'mandante')) || nombreCliente,
      planta: servicio.ruta.destino,
      retiro: iso(retiro) ?? '',
      presen: iso(presentacion) ?? '',
      modal: texto(leer(base, 'modalidad')),
      estAct: texto(leer(base, 'estado')),
      estSgte: '',
      dias: servicio.diasAlmacenaje ?? 0,
      eta: iso(eta) ?? '',
      puerto: servicio.puerto ?? '',
      nave: servicio.nave ?? '',
      numContenedor: contenedor,
      peso: pesoKg ?? 0,
      sello: '',
      tara: 0,
      referencia: id,
      tarifaPactadaClp: tarifa,
      costoTransporteClp: costoBase,
      ventaAdicClp: lineas
        .filter((l) => l.tipo === 'venta' && l.codigo !== 'FLETE')
        .reduce((a, l) => a + l.valor, 0),
      tieneVentaCargada: lineas.some((l) => l.tipo === 'venta'),
    };

    servicios.push(servicio);
  }

  if (sinFecha) {
    avisos.push(
      `${sinFecha} de ${servicios.length} servicios llegaron sin fecha utilizable. ` +
        'Revisa la columna asignada a "Fecha del servicio" en Mapeo de Campos.',
    );
  }
  if (huerfanos) {
    avisos.push(
      `${huerfanos} filas de extracosto no encontraron su servicio y quedaron fuera del cálculo.`,
    );
  }

  const reglasSinSustento: { regla: string; motivo: string }[] = [];
  if (estadiaConFechaSuelta && !estadiaMedible) {
    reglasSinSustento.push({
      regla: 'R_GEN_05',
      motivo:
        'Las columnas de in/out planta traen sólo fecha, sin hora: la diferencia son días completos ' +
        'y el umbral está en horas. Mientras no llegue la hora real, la estadía no se evalúa.',
    });
  }
  if (sinFecha === servicios.length && servicios.length > 0) {
    reglasSinSustento.push({
      regla: 'R_GEN_01',
      motivo: 'Ningún servicio trae una fecha utilizable, así que no se puede controlar la ETA.',
    });
  }

  return {
    servicios,
    clientes: Array.from(clientesPorId.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    avisos,
    huerfanos,
    filasExtra,
    reglasSinSustento,
    sinFecha,
  };
}

/** Código corto y estable para un concepto de extracosto, para cruzar con la matriz. */
export function codigoDeConcepto(concepto: string): string {
  const limpio = concepto
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return limpio.slice(0, 32) || 'SIN_CONCEPTO';
}

// ---------------------------------------------------------------------------
// Reglas que dependen de campos ausentes
// ---------------------------------------------------------------------------

/**
 * Reglas del PRD que necesitan una columna que el reporte no trajo.
 *
 * Sin esto, un campo ausente haría que *todos* los servicios se marcaran como
 * incompletos: ruido, no hallazgos. Se desactivan y se avisa cuáles, para que
 * quede claro qué no se está evaluando y por qué.
 */
export const REGLAS_POR_CAMPO: Record<string, { reglas: (keyof ReglasActivables)[]; nota: string }> = {
  peso: { reglas: ['R_GEN_02', 'R_GEN_03'], nota: 'control de peso y sobrepeso' },
  eta: { reglas: ['R_GEN_01'], nota: 'control de fechas (ETA)' },
  modalidad: { reglas: ['R_GEN_04'], nota: 'modalidad de servicio' },
  inPlanta: { reglas: ['R_GEN_05'], nota: 'estadía en planta' },
  outPlanta: { reglas: ['R_GEN_05'], nota: 'estadía en planta' },
  destino: { reglas: ['R_IMP_01'], nota: 'validación de direcciones' },
  puerto: { reglas: ['R_IMP_02', 'R_EXP_02'], nota: 'campos obligatorios de importación y exportación' },
  fechaStacking: { reglas: ['R_EXP_01'], nota: 'control de stacking' },
  corteDocumental: { reglas: ['R_EXP_01'], nota: 'corte documental' },
  fechaRetiro: { reglas: ['R_EXC_02', 'R_LIQ_03'], nota: 'almacenaje preventivo' },
  fechaPresentacion: { reglas: ['R_EXC_02', 'R_LIQ_03'], nota: 'almacenaje preventivo' },
  costo: { reglas: ['R_LIQ_01'], nota: 'rentabilidad mínima' },
};

type ReglasActivables = {
  R_GEN_01: boolean; R_GEN_02: boolean; R_GEN_03: boolean; R_GEN_04: boolean; R_GEN_05: boolean;
  R_IMP_01: boolean; R_IMP_02: boolean;
  R_EXP_01: boolean; R_EXP_02: boolean;
  R_EXC_01: boolean; R_EXC_02: boolean; R_EXC_03: boolean; R_EXC_04: boolean;
  R_INC_01: boolean;
  R_LIQ_01: boolean; R_LIQ_02: boolean; R_LIQ_03: boolean;
};

export interface ReglasDesactivadas {
  reglas: Set<string>;
  motivos: { campo: string; label: string; nota: string }[];
}

export function reglasDesactivadasPorMapeo(mapeo: MapeoCampos): ReglasDesactivadas {
  const reglas = new Set<string>();
  const motivos: { campo: string; label: string; nota: string }[] = [];

  for (const campo of Object.keys(REGLAS_POR_CAMPO)) {
    if (mapeo[campo]) continue;
    const entrada = REGLAS_POR_CAMPO[campo];
    entrada.reglas.forEach((r) => reglas.add(r as string));
    motivos.push({ campo, label: CAMPOS[campo]?.label ?? campo, nota: entrada.nota });
  }

  return { reglas, motivos };
}
