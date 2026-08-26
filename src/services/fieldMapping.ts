/**
 * Mapeo de campos de la API.
 *
 * El reporte de BIT no tiene nombres de columna estables entre versiones, así
 * que en vez de codificarlos se detectan: cada campo que la aplicación necesita
 * declara sus alias y qué tipo de dato espera, y se elige la columna con mejor
 * puntaje. El mapeo resultante es editable por el usuario y se guarda en el
 * navegador; lo guardado manda sobre la detección automática.
 *
 * Es el mismo criterio del dashboard de evolución de servicios, extendido con
 * los campos operacionales que necesitan las reglas del PRD.
 */

import { FilaCruda, TIPO_FILA } from './apiClient';

export type TipoCampo = 'texto' | 'numero' | 'fecha';

export interface CampoDef {
  label: string;
  /** Un campo requerido sin columna asignada bloquea la construcción. */
  requerido?: boolean;
  tipo?: TipoCampo;
  /** Alias en orden de preferencia, ya normalizados (sin acentos ni símbolos). */
  alias: string[];
  /** Valores característicos, para detectar por contenido y no sólo por nombre. */
  valores?: string[];
  /** Reglas del PRD que dependen de este campo. Se muestra en la interfaz. */
  usadoPor?: string;
  grupo: GrupoCampo;
}

export type GrupoCampo = 'Identificación' | 'Comercial' | 'Operación' | 'Fechas y tiempos';

export const GRUPOS_CAMPO: GrupoCampo[] = [
  'Identificación',
  'Comercial',
  'Operación',
  'Fechas y tiempos',
];

/**
 * Catálogo de campos que la aplicación consume.
 *
 * Los que el reporte no traiga quedan sin asignar: las reglas que dependen de
 * ellos se desactivan solas en vez de marcar todos los servicios como
 * incompletos. Ver `reglasDesactivadasPorMapeo`.
 */
export const CAMPOS: Record<string, CampoDef> = {
  idServicio: {
    label: 'Id de servicio',
    requerido: true,
    grupo: 'Identificación',
    alias: ['idservicio', 'servicioid', 'idserv', 'nroservicio', 'numeroservicio', 'numservicio', 'nservicio', 'folio', 'correlativo', 'idos', 'nroos', 'id'],
    usadoPor: 'Llave de todo el modelo y del cruce de extracostos.',
  },
  extracostoId: {
    label: 'Id de extracosto',
    grupo: 'Identificación',
    alias: ['idextracosto', 'extracostoid', 'idextra', 'extraid', 'idgasto', 'gastoid', 'idadicional', 'idlinea', 'lineaid', 'iddetalle', 'detalleid'],
    usadoPor: 'Distingue la fila del flete de las de extracosto. Es el discriminador principal.',
  },
  tipoFila: {
    label: 'Tipo de fila',
    grupo: 'Identificación',
    alias: ['tiporegistro', 'tipofila', 'origenfila', 'tabla', 'tiporeg', 'origen', 'tipo'],
    valores: ['servicio', 'extracosto', 'extra costo', 'extracostos', 'gasto', 'adicional', 'cabecera'],
    usadoPor: 'Distingue la fila base del servicio de sus extracostos.',
  },
  cliente: {
    label: 'Cliente',
    requerido: true,
    grupo: 'Identificación',
    alias: ['nombrecliente', 'cliente', 'razonsocial', 'clientenombre', 'nomcliente', 'desccliente', 'empresa', 'customer', 'client'],
    usadoPor: 'Cruce con la matriz comercial.',
  },
  mandante: {
    label: 'Mandante',
    grupo: 'Identificación',
    alias: ['mandante', 'nombremandante', 'consignatario', 'embarcador', 'shipper', 'contraparte', 'clientefinal'],
  },
  ejecutiva: {
    label: 'Ejecutiva comercial',
    grupo: 'Identificación',
    alias: ['ejecutiva', 'ejecutivo', 'ejecutivacomercial', 'vendedor', 'comercial', 'agente', 'responsable', 'usuario'],
    usadoPor: 'Asignación de responsable en la bandeja.',
  },
  estado: {
    label: 'Estado',
    grupo: 'Identificación',
    alias: ['estadoservicio', 'estadodocumento', 'estado', 'status', 'situacion', 'etapa', 'estadoos'],
    usadoPor: 'Punto de evaluación y detección de cambios entre lecturas.',
  },

  // --- Comercial ---
  venta: {
    label: 'Venta',
    requerido: true,
    tipo: 'numero',
    grupo: 'Comercial',
    alias: ['totalventa', 'montoventa', 'valorventa', 'venta', 'ventas', 'facturacion', 'facturado', 'precioventa', 'ingreso', 'neto', 'monto', 'total'],
    usadoPor: 'R-LIQ-01 (margen), venta sin costo, proyección sin venta.',
  },
  costo: {
    label: 'Costo',
    tipo: 'numero',
    grupo: 'Comercial',
    alias: ['totalcosto', 'montocosto', 'valorcosto', 'costoventa', 'costo', 'costos', 'gasto', 'compra'],
    usadoPor: 'R-LIQ-01 (margen), costo sin venta.',
  },
  tarifa: {
    label: 'Tarifa base',
    tipo: 'numero',
    grupo: 'Comercial',
    alias: ['tarifa', 'tarifabase', 'valorbase', 'flete', 'base'],
    usadoPor: 'R-MAT-01, valor fuera de tarifa.',
  },
  concepto: {
    label: 'Concepto del extracosto',
    grupo: 'Comercial',
    alias: ['concepto', 'glosa', 'descripcion', 'detalle', 'item', 'nombregasto', 'nombreconcepto', 'tipogasto'],
    usadoPor: 'R-EXC-01, concepto faltante, validación integral.',
  },

  // --- Operación ---
  operacion: {
    label: 'Operación (Impo / Expo)',
    grupo: 'Operación',
    alias: ['tipooperacion', 'operacion', 'trafico', 'sentido', 'impoexpo'],
    valores: ['impo', 'expo', 'importacion', 'exportacion', 'importación', 'exportación'],
    usadoPor: 'Selecciona el bloque de reglas R-IMP o R-EXP.',
  },
  modalidad: {
    label: 'Modalidad (Directo / Diferido)',
    grupo: 'Operación',
    alias: ['tiposervicio', 'condicionpago', 'condicion', 'modalidadservicio', 'tiposervicionombre', 'modalidad', 'modal'],
    valores: ['directo', 'diferido'],
    usadoPor: 'R-GEN-04, R-EXC-01.',
  },
  origen: {
    label: 'Origen',
    grupo: 'Operación',
    alias: ['origen', 'ciudadorigen', 'puntoretiro', 'lugarretiro', 'desde'],
  },
  destino: {
    label: 'Destino / Planta',
    grupo: 'Operación',
    alias: ['destino', 'planta', 'ciudaddestino', 'lugarentrega', 'direccionentrega', 'hasta'],
    usadoPor: 'R-IMP-01 (validación de direcciones).',
  },
  peso: {
    label: 'Peso (kg)',
    tipo: 'numero',
    grupo: 'Operación',
    alias: ['pesokg', 'peso', 'pesobruto', 'kilos', 'kg', 'pesocarga'],
    usadoPor: 'R-GEN-02 (peso en blanco), R-GEN-03 (sobrepeso).',
  },
  puerto: {
    label: 'Puerto',
    grupo: 'Operación',
    alias: ['puerto', 'puertoembarque', 'puertodescarga', 'terminal'],
    usadoPor: 'R-IMP-02, R-EXP-02 (campos obligatorios).',
  },
  nave: {
    label: 'Nave',
    grupo: 'Operación',
    alias: ['nave', 'buque', 'motonave', 'vessel', 'naviera'],
    usadoPor: 'R-IMP-02, R-EXP-02.',
  },
  contenedor: {
    label: 'Contenedor',
    grupo: 'Operación',
    alias: ['numcontenedor', 'numerocontenedor', 'contenedor', 'container', 'sigla', 'equipo'],
    usadoPor: 'R-EXP-02.',
  },
  tipoContenedor: {
    label: 'Tipo de contenedor',
    grupo: 'Operación',
    alias: ['tipocontenedor', 'tipoequipo', 'tipocntr', 'medida', 'tamano'],
    usadoPor: 'Cruce con la matriz comercial.',
  },
  depositoVacio: {
    label: 'Depósito vacío',
    grupo: 'Operación',
    alias: ['depositovacio', 'depvacio', 'devolucionvacio', 'depositodevolucion'],
    usadoPor: 'R-IMP-02.',
  },
  depositoRetiro: {
    label: 'Depósito de retiro',
    grupo: 'Operación',
    alias: ['depositoretiro', 'depretiro', 'depositoorigen'],
    usadoPor: 'R-EXP-02.',
  },

  // --- Fechas ---
  fecha: {
    label: 'Fecha del servicio',
    requerido: true,
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['fechaservicio', 'fechaoperacion', 'fechaemision', 'fechafacturacion', 'fechaingreso', 'fechaapertura', 'fechadocumento', 'periodo', 'emision', 'fecha', 'mes'],
    usadoPor: 'Fecha de creación y agrupación por periodo.',
  },
  eta: {
    label: 'ETA',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['eta', 'fechaeta', 'fechaarribo', 'arribo'],
    usadoPor: 'R-GEN-01 (control de fechas).',
  },
  fechaRetiro: {
    label: 'Fecha de retiro',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['fecharetiro', 'retiro', 'fecharetirocontenedor'],
    usadoPor: 'R-EXC-02 (almacenaje preventivo).',
  },
  fechaPresentacion: {
    label: 'Fecha de presentación',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['fechapresentacion', 'presentacion', 'presen'],
    usadoPor: 'R-EXC-02, R-LIQ-03.',
  },
  fechaStacking: {
    label: 'Fecha de stacking',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['fechastacking', 'stacking', 'iniciostacking'],
    usadoPor: 'R-EXP-01 (control de stacking).',
  },
  corteDocumental: {
    label: 'Corte documental',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['cortedocumental', 'cortedoc', 'cutoffdoc', 'cutoff'],
    usadoPor: 'R-EXP-01.',
  },
  inPlanta: {
    label: 'In planta',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['inplanta', 'horain', 'fechain', 'llegadaplanta', 'entradaplanta'],
    usadoPor: 'R-GEN-05 (estadía en planta).',
  },
  outPlanta: {
    label: 'Out planta',
    tipo: 'fecha',
    grupo: 'Fechas y tiempos',
    alias: ['outplanta', 'horaout', 'fechaout', 'salidaplanta'],
    usadoPor: 'R-GEN-05.',
  },
};

export type MapeoCampos = Record<string, string>;

export const STORAGE_KEY_MAPEO = 'lyd_bit_mapeo_campos_v2';

// ---------------------------------------------------------------------------
// Inventario de columnas
// ---------------------------------------------------------------------------

export interface InfoColumna {
  nombre: string;
  /** Muestra de valores distintos, para que el usuario reconozca la columna. */
  valores: string[];
  nulos: number;
  total: number;
  esNumero: boolean;
  esFecha: boolean;
  /** La columna es de fecha y además trae hora en al menos parte de las filas. */
  conHora: boolean;
  distintos: number;
}

export const limpiaLlave = (k: string): string =>
  String(k)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Convierte a número tolerando los formatos chileno (1.234.567,89) e inglés. */
export function aNumero(v: unknown): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v).replace(/[^0-9,.\-]/g, '');
  if (!s) return 0;
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  if (coma > -1 && punto > -1) {
    if (coma > punto) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (coma > -1) {
    s = s.length - coma - 1 === 3 && /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (punto > -1) {
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Interpreta las formas de fecha del reporte, incluida la de .NET.
 *
 * Conserva la hora cuando viene: las reglas que miden tiempo (estadía en
 * planta) la necesitan. Descartarla hacía que la diferencia diera siempre cero.
 */
export function aFecha(v: unknown): Date | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const mk = (y: number, mo: number, da: number, h = 0, mi = 0, se = 0): Date | null => {
    const d = new Date(y, mo - 1, da, h, mi, se);
    return isNaN(d.getTime()) ? null : d;
  };

  if (typeof v === 'number') {
    if (v > 1e11) return new Date(v);
    if (v > 1e9) return new Date(v * 1000);
    if (v > 20000101 && v < 21001231) {
      const s = String(v);
      return mk(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
    }
    return null;
  }

  const s = String(v).trim();
  let m: RegExpMatchArray | null;

  if ((m = s.match(/\/Date\((\d+)/))) return new Date(+m[1]);

  // La hora, si viene, va aparte: aparece igual tras una fecha ISO o dd/mm/yyyy.
  const th = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const [h, mi, se] = th ? [+th[1], +th[2], +(th[3] ?? 0)] : [0, 0, 0];

  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return mk(+m[1], +m[2], +m[3], h, mi, se);
  if ((m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/))) return mk(+m[3], +m[2], +m[1], h, mi, se);
  if ((m = s.match(/^(\d{4})[-/](\d{1,2})$/))) return mk(+m[1], +m[2], 1);
  if ((m = s.match(/^(\d{4})(\d{2})(\d{2})$/))) return mk(+m[1], +m[2], +m[3]);

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * ¿El valor trae hora, o es sólo una fecha?
 *
 * Importa para las reglas que miden tiempo: si in/out planta llegan como fechas
 * sin hora, la diferencia son días completos y una regla con umbral en horas se
 * dispara en todos los servicios. Eso no es un hallazgo, es un artefacto.
 */
export function tieneHora(v: unknown): boolean {
  if (v == null || v === '') return false;
  if (v instanceof Date) return v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0;
  // Un epoch o un /Date(...)/ traen hora salvo que caigan justo en medianoche.
  if (typeof v === 'number') return v > 1e9;
  const s = String(v);
  if (/\/Date\(/.test(s)) return true;
  // hh:mm en cualquier parte, o un ISO con T y hora distinta de cero.
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return false;
  return !(m[1] === '00' && m[2] === '00' && (m[3] ?? '00') === '00');
}

export function inventariarColumnas(filas: FilaCruda[]): Record<string, InfoColumna> {
  const columnas: Record<string, InfoColumna> = {};
  const muestra = filas.slice(0, 400);

  for (const fila of filas) {
    for (const clave of Object.keys(fila ?? {})) {
      if (clave === TIPO_FILA) continue;
      if (!columnas[clave]) {
        columnas[clave] = {
          nombre: clave,
          valores: [],
          nulos: 0,
          total: 0,
          esNumero: false,
          esFecha: false,
          conHora: false,
          distintos: 0,
        };
      }
    }
  }

  for (const clave of Object.keys(columnas)) {
    const c = columnas[clave];
    let numericos = 0;
    let fechas = 0;
    let conHora = 0;

    for (const fila of muestra) {
      const v = fila ? fila[clave] : null;
      c.total++;
      if (v == null || v === '') {
        c.nulos++;
        continue;
      }
      if (c.valores.length < 8 && !c.valores.includes(String(v))) c.valores.push(String(v));
      if (typeof v === 'number' || (/^[\s$]*-?[\d.,]+\s*$/.test(String(v)) && /\d/.test(String(v)))) numericos++;
      if (aFecha(v)) {
        fechas++;
        if (tieneHora(v)) conHora++;
      }
    }

    const llenos = c.total - c.nulos;
    c.esNumero = llenos > 0 && numericos > llenos * 0.8;
    c.esFecha = llenos > 0 && fechas > llenos * 0.8 && !c.esNumero;
    c.conHora = c.esFecha && conHora > 0;
    c.distintos = new Set(muestra.map((f) => f && f[clave]).filter((v) => v != null && v !== '')).size;
  }

  return columnas;
}

// ---------------------------------------------------------------------------
// Detección automática
// ---------------------------------------------------------------------------

export interface DeteccionResultado {
  columnas: Record<string, InfoColumna>;
  mapeo: MapeoCampos;
}

/**
 * Elige, para cada campo del catálogo, la columna con mejor puntaje.
 *
 * Puntúa por nombre (coincidencia exacta > el nombre contiene el alias) y por
 * los valores característicos. El tipo esperado sube o hunde el puntaje: un
 * campo numérico no puede caer en una columna de texto. Cada columna se asigna
 * a un solo campo.
 */
export function autoMapear(filas: FilaCruda[]): DeteccionResultado {
  const columnas = inventariarColumnas(filas);
  const puntajes: { campo: string; columna: string; puntaje: number }[] = [];

  for (const nombreColumna of Object.keys(columnas)) {
    const c = columnas[nombreColumna];
    const lk = limpiaLlave(nombreColumna);

    for (const campo of Object.keys(CAMPOS)) {
      const def = CAMPOS[campo];
      let s = -1;

      def.alias.forEach((alias, i) => {
        let p = -1;
        if (lk === alias) p = 1000 - i;
        else if (alias.length >= 4 && lk.includes(alias)) p = 100 + alias.length - i;
        if (p > s) s = p;
      });

      if (def.valores) {
        const vals = c.valores.map((v) => String(v).toLowerCase().trim());
        const aciertos = vals.filter((v) => def.valores!.some((d) => v === d || v.includes(d))).length;
        if (vals.length && aciertos / vals.length > 0.6) s = Math.max(s, 0) + 300;
      }

      if (s <= 0) continue;

      if (def.tipo === 'numero') s += c.esNumero ? 40 : -500;
      if (def.tipo === 'fecha') s += c.esFecha ? 60 : -500;
      // Un id no puede ser una fecha ni tener dos valores distintos en todo el reporte.
      if (campo === 'idServicio' && (c.esFecha || c.distintos <= 2)) s -= 400;

      if (s > 0) puntajes.push({ campo, columna: nombreColumna, puntaje: s });
    }
  }

  puntajes.sort((a, b) => b.puntaje - a.puntaje);

  const mapeo: MapeoCampos = {};
  const usadas = new Set<string>();
  for (const p of puntajes) {
    if (mapeo[p.campo] || usadas.has(p.columna)) continue;
    mapeo[p.campo] = p.columna;
    usadas.add(p.columna);
  }

  return { columnas, mapeo };
}

// ---------------------------------------------------------------------------
// Persistencia
// ---------------------------------------------------------------------------

export function loadMapeo(): MapeoCampos {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_MAPEO);
    return crudo ? (JSON.parse(crudo) as MapeoCampos) : {};
  } catch {
    return {};
  }
}

export function saveMapeo(mapeo: MapeoCampos): void {
  try {
    localStorage.setItem(STORAGE_KEY_MAPEO, JSON.stringify(mapeo));
  } catch (e) {
    console.error('No se pudo persistir el mapeo de campos:', e);
  }
}

/**
 * Combina la detección con lo que el usuario haya guardado.
 *
 * Lo guardado manda, pero sólo mientras esas columnas sigan existiendo en la
 * respuesta: si el reporte cambia de forma, la preferencia obsoleta se descarta
 * y vuelve a mandar la detección, en vez de dejar el campo apuntando a la nada.
 */
export function combinarMapeo(detectado: MapeoCampos, guardado: MapeoCampos, columnas: Record<string, InfoColumna>): MapeoCampos {
  const resultado: MapeoCampos = { ...detectado };
  for (const campo of Object.keys(guardado)) {
    const columna = guardado[campo];
    if (columna === '') {
      // El usuario desasignó el campo a propósito.
      delete resultado[campo];
      continue;
    }
    if (columnas[columna]) resultado[campo] = columna;
  }
  return resultado;
}

/** Campos requeridos que quedaron sin columna. Bloquean la construcción. */
export function camposRequeridosFaltantes(mapeo: MapeoCampos): string[] {
  return Object.keys(CAMPOS).filter((k) => CAMPOS[k].requerido && !mapeo[k]);
}
