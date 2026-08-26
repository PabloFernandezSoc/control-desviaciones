/**
 * Cliente de las fuentes de datos externas.
 *
 * Hay dos orígenes y ambos se consultan por HTTP:
 *   - la API REST de BIT;
 *   - la planilla de Google Sheets, publicada como JSON (Apps Script, Sheets API
 *     con `?alt=json`, o cualquier endpoint que devuelva las filas).
 *
 * El contrato exacto de la API todavía no está cerrado, así que la
 * normalización es tolerante: acepta las variantes de nombre habituales
 * (`id_servicio`, `idServicio`, `id`) y deja pasar sin tocar lo que ya viene con
 * la forma interna. Cuando el contrato quede fijo basta con recortar las
 * variantes de `ALIAS`.
 */

import { Service, ServiceState, OperationType, ServiceModality } from '../types';

export type OrigenLectura = 'api' | 'sheets';

export interface EndpointConfig {
  habilitado: boolean;
  url: string;
  /** Nombre de la cabecera de autenticación. Vacío = sin autenticación. */
  headerAuth: string;
  /** Prefijo del valor: `Bearer`, `Token`, o vacío para mandar la clave cruda. */
  esquemaAuth: string;
  apiKey: string;
  /** Ruta dentro del JSON donde viene el arreglo de filas. Vacío = raíz. */
  rutaDatos: string;
}

export interface IntegrationConfig {
  api: EndpointConfig;
  sheets: EndpointConfig;
  timeoutMs: number;
}

export const STORAGE_KEY_INTEGRATION = 'lyd_bit_integration_config_v1';

export const defaultIntegrationConfig = (): IntegrationConfig => ({
  api: {
    habilitado: false,
    url: '',
    headerAuth: 'Authorization',
    esquemaAuth: 'Bearer',
    apiKey: '',
    rutaDatos: 'data',
  },
  sheets: {
    habilitado: false,
    url: '',
    headerAuth: '',
    esquemaAuth: '',
    apiKey: '',
    rutaDatos: '',
  },
  timeoutMs: 15000,
});

export function loadIntegrationConfig(): IntegrationConfig {
  const base = defaultIntegrationConfig();
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_INTEGRATION);
    if (!crudo) return base;
    const guardado = JSON.parse(crudo) as Partial<IntegrationConfig>;
    return {
      api: { ...base.api, ...(guardado.api ?? {}) },
      sheets: { ...base.sheets, ...(guardado.sheets ?? {}) },
      timeoutMs: guardado.timeoutMs ?? base.timeoutMs,
    };
  } catch {
    return base;
  }
}

export function saveIntegrationConfig(config: IntegrationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_INTEGRATION, JSON.stringify(config));
  } catch (e) {
    console.error('No se pudo persistir la configuración de integración:', e);
  }
}

/** ¿Hay al menos una fuente remota configurada y activa? */
export function hayFuenteRemota(config: IntegrationConfig): boolean {
  return (
    (config.api.habilitado && config.api.url.trim() !== '') ||
    (config.sheets.habilitado && config.sheets.url.trim() !== '')
  );
}

// ---------------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------------

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly origen: OrigenLectura,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

function extraerArreglo(cuerpo: unknown, rutaDatos: string): unknown[] {
  let actual: any = cuerpo;
  if (rutaDatos.trim() !== '') {
    for (const parte of rutaDatos.split('.')) {
      if (actual == null || typeof actual !== 'object') break;
      actual = actual[parte];
    }
  }
  if (Array.isArray(actual)) return actual;
  if (Array.isArray(cuerpo)) return cuerpo as unknown[];
  // Formatos habituales cuando `rutaDatos` no acierta.
  for (const clave of ['data', 'items', 'results', 'registros', 'servicios', 'values', 'rows']) {
    const candidato = (cuerpo as any)?.[clave];
    if (Array.isArray(candidato)) return candidato;
  }
  return [];
}

async function leerEndpoint(
  endpoint: EndpointConfig,
  origen: OrigenLectura,
  timeoutMs: number,
): Promise<unknown[]> {
  const url = endpoint.url.trim();
  if (!url) {
    throw new IntegrationError(`La URL de ${etiquetaOrigen(origen)} no está configurada.`, origen);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = { Accept: 'application/json' };
  const header = endpoint.headerAuth.trim();
  const clave = endpoint.apiKey.trim();
  if (header && clave) {
    const esquema = endpoint.esquemaAuth.trim();
    headers[header] = esquema ? `${esquema} ${clave}` : clave;
  }

  try {
    const respuesta = await fetch(url, { method: 'GET', headers, signal: controller.signal });

    if (!respuesta.ok) {
      throw new IntegrationError(
        `${etiquetaOrigen(origen)} respondió ${respuesta.status} ${respuesta.statusText}.`,
        origen,
        respuesta.status,
      );
    }

    const cuerpo = await respuesta.json();
    return extraerArreglo(cuerpo, endpoint.rutaDatos);
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    if ((e as Error)?.name === 'AbortError') {
      throw new IntegrationError(
        `${etiquetaOrigen(origen)} no respondió en ${Math.round(timeoutMs / 1000)} s.`,
        origen,
      );
    }
    throw new IntegrationError(
      `No se pudo leer ${etiquetaOrigen(origen)}: ${(e as Error)?.message ?? 'error desconocido'}.`,
      origen,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function etiquetaOrigen(origen: OrigenLectura): string {
  return origen === 'api' ? 'la API' : 'Google Sheets';
}

// ---------------------------------------------------------------------------
// Normalización
// ---------------------------------------------------------------------------

/** Variantes de nombre aceptadas para cada campo interno. */
const ALIAS: Record<string, string[]> = {
  id: ['id', 'id_servicio', 'idServicio', 'ID SERVICIO', 'servicio_id', 'numero_servicio'],
  clienteId: ['clienteId', 'id_cliente', 'idCliente', 'cliente_id'],
  clienteNombre: ['clienteNombre', 'nombre_cliente', 'nombreCliente', 'cliente', 'MANDANTE', 'mandante'],
  ejecutivo: ['ejecutivo', 'ejecutivo_comercial', 'ejecutivoComercial', 'EJECUTIVO'],
  estado: ['estado', 'status', 'estado_servicio', 'estadoServicio', 'ESTADO'],
  fechaCreacion: ['fechaCreacion', 'fecha_creacion', 'created_at', 'createdAt'],
  tipoOperacion: ['tipoOperacion', 'tipo_operacion', 'tipo_serv', 'tipoServ', 'TIPO SERV'],
  modalidad: ['modalidad', 'modal', 'MODAL'],
  pesoKg: ['pesoKg', 'peso_kg', 'peso', 'PESO'],
  puerto: ['puerto', 'PUERTO'],
  nave: ['nave', 'NAVE'],
  depositoVacio: ['depositoVacio', 'deposito_vacio', 'DEP. VACÍO'],
  depositoRetiro: ['depositoRetiro', 'deposito_retiro', 'DEP. RETIRO'],
  fechaStacking: ['fechaStacking', 'fecha_stacking', 'stacking', 'STACKING'],
  corteDocumental: ['corteDocumental', 'corte_documental', 'corte_doc', 'CORTE DOC'],
  inPlanta: ['inPlanta', 'in_planta', 'IN PLANTA'],
  outPlanta: ['outPlanta', 'out_planta', 'OUT PLANTA'],
  fechaRetiro: ['fechaRetiro', 'fecha_retiro', 'retiro', 'RETIRO'],
  fechaPresentacion: ['fechaPresentacion', 'fecha_presentacion', 'presen', 'PRESEN'],
  diasAlmacenaje: ['diasAlmacenaje', 'dias_almacenaje', 'dias_alm', 'DÍAS ALM.'],
  horasEstadia: ['horasEstadia', 'horas_estadia'],
  direccionPlanta: ['direccionPlanta', 'direccion_planta', 'direccion', 'DIRECCIÓN'],
  direccionPorConfirmar: ['direccionPorConfirmar', 'direccion_por_confirmar', 'DIR. POR CONFIRMAR'],
  aptoFacturacion: ['aptoFacturacion', 'apto_facturacion'],
  notas: ['notas', 'observaciones', 'OBSERVACIONES', 'nota', 'comentarios'],
  lineas: ['lineas', 'lines', 'conceptos', 'detalle'],
  contenedores: ['contenedores', 'containers'],
  proyeccion: ['proyeccion', 'projection'],
  atributosEspeciales: ['atributosEspeciales', 'atributos_especiales'],
  incidencias: ['incidencias', 'incidents'],
  ruta: ['ruta', 'route'],
};

function tomar(fila: Record<string, any>, campo: string): unknown {
  for (const alias of ALIAS[campo] ?? [campo]) {
    if (alias in fila && fila[alias] !== null && fila[alias] !== '') return fila[alias];
  }
  return undefined;
}

const ESTADOS_VALIDOS: ServiceState[] = [
  'proyeccion', 'borrador', 'confirmado', 'en_transito', 'cerrado', 'facturado',
];

function normalizarEstado(valor: unknown): ServiceState | undefined {
  if (valor === undefined || valor === null) return undefined;
  const bruto = String(valor).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((ESTADOS_VALIDOS as string[]).includes(bruto)) return bruto as ServiceState;

  // Equivalencias con la nomenclatura operacional de BIT.
  const equivalencias: Record<string, ServiceState> = {
    proyeccion_de_carga: 'proyeccion',
    en_coordinacion: 'borrador',
    coordinado: 'confirmado',
    en_curso: 'en_transito',
    en_ruta: 'en_transito',
    finalizado: 'cerrado',
    liquidado: 'facturado',
    pendiente: 'borrador',
    completado: 'cerrado',
  };
  return equivalencias[bruto];
}

function aNumero(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;
  const limpio = String(valor).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

function aBooleano(valor: unknown): boolean | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor === 'boolean') return valor;
  const bruto = String(valor).trim().toLowerCase();
  if (['true', '1', 'si', 'sí', 'x', 'y', 'yes'].includes(bruto)) return true;
  if (['false', '0', 'no', 'n'].includes(bruto)) return false;
  return undefined;
}

const TIPOS_OPERACION: OperationType[] = ['importacion', 'exportacion', 'nacional'];
const MODALIDADES: ServiceModality[] = ['directo', 'diferido', 'sin_definir'];

function normalizarTipoOperacion(valor: unknown): OperationType | undefined {
  if (valor === undefined || valor === null) return undefined;
  const bruto = String(valor).trim().toLowerCase();
  if ((TIPOS_OPERACION as string[]).includes(bruto)) return bruto as OperationType;
  if (bruto.startsWith('impo')) return 'importacion';
  if (bruto.startsWith('expo')) return 'exportacion';
  if (bruto.startsWith('nac')) return 'nacional';
  return undefined;
}

function normalizarModalidad(valor: unknown): ServiceModality | undefined {
  if (valor === undefined || valor === null) return undefined;
  const bruto = String(valor).trim().toLowerCase();
  if ((MODALIDADES as string[]).includes(bruto)) return bruto as ServiceModality;
  if (bruto.startsWith('direct')) return 'directo';
  if (bruto.startsWith('difer')) return 'diferido';
  return undefined;
}

function asignarSiDefinido(destino: Record<string, any>, clave: string, valor: unknown): void {
  if (valor !== undefined) destino[clave] = valor;
}

/**
 * Convierte una fila cruda de cualquiera de las dos fuentes en la forma interna
 * `Service`. Los campos que la fila no traiga quedan sin definir, para que el
 * cruce de `mergeDataSources` pueda completarlos con la otra fuente.
 */
export function normalizarServicio(crudo: unknown): Partial<Service> | null {
  if (crudo == null || typeof crudo !== 'object') return null;
  const fila = crudo as Record<string, any>;

  const id = tomar(fila, 'id');
  if (id === undefined) return null;

  const servicio: Record<string, any> = { id: String(id) };

  asignarSiDefinido(servicio, 'clienteId', tomar(fila, 'clienteId') as string | undefined);
  asignarSiDefinido(servicio, 'clienteNombre', tomar(fila, 'clienteNombre') as string | undefined);
  asignarSiDefinido(servicio, 'ejecutivo', tomar(fila, 'ejecutivo') as string | undefined);
  asignarSiDefinido(servicio, 'estado', normalizarEstado(tomar(fila, 'estado')));
  asignarSiDefinido(servicio, 'fechaCreacion', tomar(fila, 'fechaCreacion') as string | undefined);
  asignarSiDefinido(servicio, 'tipoOperacion', normalizarTipoOperacion(tomar(fila, 'tipoOperacion')));
  asignarSiDefinido(servicio, 'modalidad', normalizarModalidad(tomar(fila, 'modalidad')));
  asignarSiDefinido(servicio, 'pesoKg', aNumero(tomar(fila, 'pesoKg')));
  asignarSiDefinido(servicio, 'puerto', tomar(fila, 'puerto') as string | undefined);
  asignarSiDefinido(servicio, 'nave', tomar(fila, 'nave') as string | undefined);
  asignarSiDefinido(servicio, 'depositoVacio', tomar(fila, 'depositoVacio') as string | undefined);
  asignarSiDefinido(servicio, 'depositoRetiro', tomar(fila, 'depositoRetiro') as string | undefined);
  asignarSiDefinido(servicio, 'fechaStacking', tomar(fila, 'fechaStacking') as string | undefined);
  asignarSiDefinido(servicio, 'corteDocumental', tomar(fila, 'corteDocumental') as string | undefined);
  asignarSiDefinido(servicio, 'inPlanta', tomar(fila, 'inPlanta') as string | undefined);
  asignarSiDefinido(servicio, 'outPlanta', tomar(fila, 'outPlanta') as string | undefined);
  asignarSiDefinido(servicio, 'fechaRetiro', tomar(fila, 'fechaRetiro') as string | undefined);
  asignarSiDefinido(servicio, 'fechaPresentacion', tomar(fila, 'fechaPresentacion') as string | undefined);
  asignarSiDefinido(servicio, 'diasAlmacenaje', aNumero(tomar(fila, 'diasAlmacenaje')));
  asignarSiDefinido(servicio, 'horasEstadia', aNumero(tomar(fila, 'horasEstadia')));
  asignarSiDefinido(servicio, 'direccionPlanta', tomar(fila, 'direccionPlanta') as string | undefined);
  asignarSiDefinido(servicio, 'direccionPorConfirmar', aBooleano(tomar(fila, 'direccionPorConfirmar')));
  asignarSiDefinido(servicio, 'aptoFacturacion', aBooleano(tomar(fila, 'aptoFacturacion')));
  asignarSiDefinido(servicio, 'notas', tomar(fila, 'notas') as string | undefined);

  // Estructuras anidadas: se aceptan tal cual si vienen con la forma esperada.
  const lineas = tomar(fila, 'lineas');
  if (Array.isArray(lineas)) servicio.lineas = lineas;

  const contenedores = tomar(fila, 'contenedores');
  if (Array.isArray(contenedores)) servicio.contenedores = contenedores;

  const proyeccion = tomar(fila, 'proyeccion');
  if (proyeccion && typeof proyeccion === 'object') servicio.proyeccion = proyeccion;

  const atributos = tomar(fila, 'atributosEspeciales');
  if (atributos && typeof atributos === 'object') servicio.atributosEspeciales = atributos;

  const incidencias = tomar(fila, 'incidencias');
  if (incidencias && typeof incidencias === 'object') servicio.incidencias = incidencias;

  const ruta = tomar(fila, 'ruta');
  if (ruta && typeof ruta === 'object') {
    servicio.ruta = { origen: (ruta as any).origen ?? '', destino: (ruta as any).destino ?? '' };
  } else {
    const origen = fila.origen ?? fila.ORIGEN ?? fila.ruta_origen;
    const destino = fila.destino ?? fila.PLANTA ?? fila.planta ?? fila.ruta_destino;
    if (origen !== undefined || destino !== undefined) {
      servicio.ruta = { origen: origen ?? '', destino: destino ?? '' };
    }
  }

  return servicio as Partial<Service>;
}

export interface LecturaFuente {
  origen: OrigenLectura;
  registros: Partial<Service>[];
  /** Filas que llegaron sin llave primaria y se descartaron. */
  descartadas: number;
}

async function leerFuente(
  endpoint: EndpointConfig,
  origen: OrigenLectura,
  timeoutMs: number,
): Promise<LecturaFuente> {
  const filas = await leerEndpoint(endpoint, origen, timeoutMs);
  const registros: Partial<Service>[] = [];
  let descartadas = 0;

  for (const fila of filas) {
    const normalizado = normalizarServicio(fila);
    if (normalizado) registros.push(normalizado);
    else descartadas++;
  }

  return { origen, registros, descartadas };
}

export interface LecturaCombinada {
  api: LecturaFuente | null;
  sheets: LecturaFuente | null;
  /** Fuentes que fallaron. La lectura continúa con las que sí respondieron. */
  errores: IntegrationError[];
}

/**
 * Lee las fuentes activas en paralelo. Si una falla, se reporta el error pero se
 * conserva el resultado de la otra: es preferible actualizar a medias con aviso
 * que dejar la pantalla congelada.
 */
export async function leerFuentes(config: IntegrationConfig): Promise<LecturaCombinada> {
  const tareas: Promise<LecturaFuente>[] = [];
  const origenes: OrigenLectura[] = [];

  if (config.api.habilitado && config.api.url.trim()) {
    tareas.push(leerFuente(config.api, 'api', config.timeoutMs));
    origenes.push('api');
  }
  if (config.sheets.habilitado && config.sheets.url.trim()) {
    tareas.push(leerFuente(config.sheets, 'sheets', config.timeoutMs));
    origenes.push('sheets');
  }

  const resultados = await Promise.allSettled(tareas);

  const combinada: LecturaCombinada = { api: null, sheets: null, errores: [] };

  resultados.forEach((resultado, i) => {
    const origen = origenes[i];
    if (resultado.status === 'fulfilled') {
      combinada[origen] = resultado.value;
    } else {
      const razon = resultado.reason;
      combinada.errores.push(
        razon instanceof IntegrationError
          ? razon
          : new IntegrationError(String(razon?.message ?? razon), origen),
      );
    }
  });

  return combinada;
}
