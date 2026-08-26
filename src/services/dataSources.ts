/**
 * Módulo de Mapeo de Origen de Datos.
 *
 * La aplicación consume dos fuentes distintas:
 *   - `sheets`: el documento de Google Sheets que se usaba antes de la API.
 *   - `api`:    el servicio REST de BIT.
 *
 * Cada campo consolidado del frontend declara de qué fuentes puede venir y cuál
 * tiene prioridad. Esa prioridad es editable por el usuario desde la vista
 * "Mapeo de Origen de Datos" y se persiste en localStorage.
 */

import { Service } from '../types';

export type DataSource = 'api' | 'sheets';

export type FieldGroup =
  | 'Identificación'
  | 'Operación'
  | 'Fechas y tiempos'
  | 'Comercial'
  | 'Complementarios';

export interface FieldDefinition {
  /** Ruta del campo dentro de `Service`. Admite notación con punto: `ruta.origen`. */
  key: string;
  /** Nombre legible que se muestra en la interfaz. */
  label: string;
  grupo: FieldGroup;
  /** Fuentes que efectivamente publican este campo. */
  disponibleEn: DataSource[];
  /** Fuente con prioridad por defecto. Siempre contenida en `disponibleEn`. */
  origenPorDefecto: DataSource;
  /** Nombre del campo tal como llega en cada fuente. Sirve de documentación viva. */
  nombreExterno?: Partial<Record<DataSource, string>>;
  descripcion?: string;
  /** Los campos llave no se reasignan: identifican el registro en el cruce. */
  bloqueado?: boolean;
}

/** Prioridad elegida por el usuario: `key` del campo -> fuente ganadora. */
export type FieldMappingState = Record<string, DataSource>;

export interface MergeFieldStat {
  campo: string;
  label: string;
  origenAsignado: DataSource;
  desdeApi: number;
  desdeSheets: number;
  /** Veces que se usó la fuente alterna porque la asignada no traía valor. */
  porRespaldo: number;
  vacios: number;
}

export interface MergeConflict {
  id: string;
  campo: string;
  label: string;
  origenAsignado: DataSource;
  valorApi: unknown;
  valorSheets: unknown;
}

export interface MergeSummary {
  total: number;
  soloApi: number;
  soloSheets: number;
  enAmbasFuentes: number;
  camposPorRespaldo: number;
  conflictos: number;
}

export interface MergeResult<T> {
  registros: T[];
  resumen: MergeSummary;
  detallePorCampo: MergeFieldStat[];
  conflictos: MergeConflict[];
}

export const STORAGE_KEY_FIELD_MAPPING = 'lyd_bit_field_mapping_v1';

/** Llave primaria usada para cruzar ambas fuentes. */
export const LLAVE_PRIMARIA = 'id';

// ---------------------------------------------------------------------------
// Catálogo de campos consolidados
// ---------------------------------------------------------------------------

export const FIELD_CATALOG: FieldDefinition[] = [
  // --- Identificación ---
  {
    key: 'id',
    label: 'ID Servicio',
    grupo: 'Identificación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'id_servicio', sheets: 'ID SERVICIO' },
    descripcion: 'Llave primaria del cruce. No se puede reasignar.',
    bloqueado: true,
  },
  {
    key: 'clienteId',
    label: 'ID Cliente',
    grupo: 'Identificación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'id_cliente' },
    descripcion: 'Identificador maestro del cliente en BIT.',
  },
  {
    key: 'clienteNombre',
    label: 'Nombre Cliente',
    grupo: 'Identificación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'nombre_cliente', sheets: 'MANDANTE' },
    descripcion: 'La planilla mantiene el nombre comercial acordado con el cliente.',
  },
  {
    key: 'ejecutivo',
    label: 'Ejecutivo Comercial',
    grupo: 'Identificación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'ejecutivo', sheets: 'EJECUTIVO' },
    descripcion: 'La asignación vigente se administra en la planilla comercial.',
  },
  {
    key: 'estado',
    label: 'Estado del Servicio',
    grupo: 'Identificación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'estado' },
    descripcion: 'Ciclo de vida operacional. Es la fuente del diff de actualizaciones.',
  },
  {
    key: 'fechaCreacion',
    label: 'Fecha de Creación',
    grupo: 'Identificación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'fecha_creacion' },
  },

  // --- Operación ---
  {
    key: 'tipoOperacion',
    label: 'Tipo de Operación',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'tipo_operacion', sheets: 'TIPO SERV' },
  },
  {
    key: 'modalidad',
    label: 'Modalidad (Directo / Diferido)',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'modalidad', sheets: 'MODAL' },
  },
  {
    key: 'ruta.origen',
    label: 'Ruta · Origen',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'ruta.origen', sheets: 'ORIGEN' },
  },
  {
    key: 'ruta.destino',
    label: 'Ruta · Destino',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'ruta.destino', sheets: 'PLANTA' },
  },
  {
    key: 'contenedores',
    label: 'Contenedores',
    grupo: 'Operación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'contenedores[]' },
  },
  {
    key: 'pesoKg',
    label: 'Peso (kg)',
    grupo: 'Operación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'peso_kg' },
  },
  {
    key: 'puerto',
    label: 'Puerto',
    grupo: 'Operación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'puerto' },
  },
  {
    key: 'nave',
    label: 'Nave',
    grupo: 'Operación',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'nave' },
  },
  {
    key: 'depositoVacio',
    label: 'Depósito Vacío',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'deposito_vacio', sheets: 'DEP. VACÍO' },
  },
  {
    key: 'depositoRetiro',
    label: 'Depósito de Retiro',
    grupo: 'Operación',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'deposito_retiro', sheets: 'DEP. RETIRO' },
  },

  // --- Fechas y tiempos ---
  {
    key: 'fechaStacking',
    label: 'Fecha de Stacking',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'fecha_stacking', sheets: 'STACKING' },
  },
  {
    key: 'corteDocumental',
    label: 'Corte Documental',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'corte_documental', sheets: 'CORTE DOC' },
  },
  {
    key: 'inPlanta',
    label: 'In Planta',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'in_planta' },
  },
  {
    key: 'outPlanta',
    label: 'Out Planta',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'out_planta' },
  },
  {
    key: 'fechaRetiro',
    label: 'Fecha de Retiro',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'fecha_retiro', sheets: 'RETIRO' },
  },
  {
    key: 'fechaPresentacion',
    label: 'Fecha de Presentación',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'fecha_presentacion', sheets: 'PRESEN' },
  },
  {
    key: 'diasAlmacenaje',
    label: 'Días de Almacenaje',
    grupo: 'Fechas y tiempos',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'dias_almacenaje', sheets: 'DÍAS ALM.' },
    descripcion: 'La planilla registra el conteo validado con el depósito.',
  },

  // --- Comercial ---
  {
    key: 'lineas',
    label: 'Líneas de Venta y Costo',
    grupo: 'Comercial',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'lineas[]' },
    descripcion: 'Conceptos facturables. Alimentan las reglas de margen y matriz.',
  },
  {
    key: 'proyeccion',
    label: 'Datos de Proyección (BIT)',
    grupo: 'Comercial',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'proyeccion' },
    descripcion: 'Bloque completo de proyección de carga: tarifa pactada, costo y estado.',
  },
  {
    key: 'aptoFacturacion',
    label: 'Apto para Facturación',
    grupo: 'Comercial',
    disponibleEn: ['api'],
    origenPorDefecto: 'api',
    nombreExterno: { api: 'apto_facturacion' },
    descripcion: 'Se recalcula localmente con el motor de reglas tras cada actualización.',
  },

  // --- Complementarios (históricamente en la planilla) ---
  {
    key: 'direccionPlanta',
    label: 'Dirección de Planta',
    grupo: 'Complementarios',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'direccion_planta', sheets: 'DIRECCIÓN' },
  },
  {
    key: 'direccionPorConfirmar',
    label: 'Dirección por Confirmar',
    grupo: 'Complementarios',
    disponibleEn: ['sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { sheets: 'DIR. POR CONFIRMAR' },
    descripcion: 'Marca manual del equipo de coordinación (regla R-IMP-01).',
  },
  {
    key: 'atributosEspeciales',
    label: 'Atributos Especiales',
    grupo: 'Complementarios',
    disponibleEn: ['api', 'sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { api: 'atributos_especiales', sheets: 'IMO / CUADRILLA / INSULADO' },
    descripcion: 'IMO, cuadrillas, sobrepeso, consolidado e insulado (regla R-EXC-04).',
  },
  {
    key: 'incidencias',
    label: 'Incidencias',
    grupo: 'Complementarios',
    disponibleEn: ['sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { sheets: 'FALSO FLETE / REDESTINO / MULTAS' },
    descripcion: 'Registro manual de incidencias (regla R-INC-01).',
  },
  {
    key: 'notas',
    label: 'Notas Adicionales',
    grupo: 'Complementarios',
    disponibleEn: ['sheets'],
    origenPorDefecto: 'sheets',
    nombreExterno: { sheets: 'OBSERVACIONES' },
    descripcion: 'Texto libre que la API no expone.',
  },
];

export const FIELD_GROUPS: FieldGroup[] = [
  'Identificación',
  'Operación',
  'Fechas y tiempos',
  'Comercial',
  'Complementarios',
];

const CATALOG_BY_KEY = new Map(FIELD_CATALOG.map((f) => [f.key, f]));

export function getFieldDefinition(key: string): FieldDefinition | undefined {
  return CATALOG_BY_KEY.get(key);
}

// ---------------------------------------------------------------------------
// Estado del mapeo (persistido)
// ---------------------------------------------------------------------------

export function defaultFieldMapping(): FieldMappingState {
  const mapeo: FieldMappingState = {};
  for (const campo of FIELD_CATALOG) {
    mapeo[campo.key] = campo.origenPorDefecto;
  }
  return mapeo;
}

/**
 * Normaliza un mapeo guardado contra el catálogo actual: descarta campos que ya
 * no existen y corrige orígenes inválidos (p. ej. un campo que dejó de estar en
 * la planilla, o una llave que quedó bloqueada en una versión posterior).
 */
export function sanitizeFieldMapping(parcial: Partial<FieldMappingState> | null | undefined): FieldMappingState {
  const mapeo = defaultFieldMapping();
  if (!parcial) return mapeo;

  for (const campo of FIELD_CATALOG) {
    const elegido = parcial[campo.key];
    if (!elegido) continue;
    if (campo.bloqueado) continue;
    if (!campo.disponibleEn.includes(elegido)) continue;
    mapeo[campo.key] = elegido;
  }
  return mapeo;
}

export function loadFieldMapping(): FieldMappingState {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_FIELD_MAPPING);
    return sanitizeFieldMapping(crudo ? JSON.parse(crudo) : null);
  } catch {
    return defaultFieldMapping();
  }
}

export function saveFieldMapping(mapeo: FieldMappingState): void {
  try {
    localStorage.setItem(STORAGE_KEY_FIELD_MAPPING, JSON.stringify(sanitizeFieldMapping(mapeo)));
  } catch (e) {
    console.error('No se pudo persistir el mapeo de campos:', e);
  }
}

// ---------------------------------------------------------------------------
// Utilidades de rutas con punto
// ---------------------------------------------------------------------------

export function getPath(objeto: unknown, ruta: string): unknown {
  if (objeto == null) return undefined;
  let actual: any = objeto;
  for (const parte of ruta.split('.')) {
    if (actual == null || typeof actual !== 'object') return undefined;
    actual = actual[parte];
  }
  return actual;
}

export function setPath(objeto: Record<string, any>, ruta: string, valor: unknown): void {
  const partes = ruta.split('.');
  let actual = objeto;
  for (let i = 0; i < partes.length - 1; i++) {
    const parte = partes[i];
    if (actual[parte] == null || typeof actual[parte] !== 'object') {
      actual[parte] = {};
    }
    actual = actual[parte];
  }
  actual[partes[partes.length - 1]] = valor;
}

/** Un valor "sin dato": la fuente asignada no lo trae y corresponde ir al respaldo. */
export function esVacio(valor: unknown): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === 'string') return valor.trim() === '';
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

function sonEquivalentes(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (esVacio(a) && esVacio(b)) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return String(a) === String(b);
}

// ---------------------------------------------------------------------------
// Cruce de fuentes
// ---------------------------------------------------------------------------

export interface MergeOptions {
  /** Campo usado para cruzar ambas fuentes. Por defecto `id`. */
  llavePrimaria?: string;
  catalogo?: FieldDefinition[];
  mapeo?: FieldMappingState;
  /** Si la fuente asignada no trae valor, tomarlo de la otra. Por defecto `true`. */
  rellenarConFuenteAlterna?: boolean;
}

/**
 * Cruza los registros de Google Sheets con los de la API usando una llave
 * primaria y devuelve un arreglo unificado donde cada campo proviene de la
 * fuente que tiene prioridad según el mapeo.
 *
 * Reglas del cruce:
 *  - El resultado es la unión de ambas fuentes (un registro que sólo existe en
 *    una de ellas igual se incluye).
 *  - Para cada campo se lee la fuente asignada. Si esa fuente no aporta valor y
 *    `rellenarConFuenteAlterna` está activo, se usa la otra y se contabiliza
 *    como respaldo.
 *  - Cuando ambas fuentes traen valores distintos para un mismo campo se
 *    registra el conflicto, sin alterar el valor elegido.
 */
export function mergeDataSources<T extends Record<string, any> = Service>(
  datosSheets: T[] | null | undefined,
  datosApi: T[] | null | undefined,
  opciones: MergeOptions = {},
): MergeResult<T> {
  const {
    llavePrimaria = LLAVE_PRIMARIA,
    catalogo = FIELD_CATALOG,
    mapeo = defaultFieldMapping(),
    rellenarConFuenteAlterna = true,
  } = opciones;

  const indexar = (filas: T[] | null | undefined): Map<string, T> => {
    const mapa = new Map<string, T>();
    for (const fila of filas ?? []) {
      const id = getPath(fila, llavePrimaria);
      if (id === null || id === undefined || id === '') continue;
      mapa.set(String(id), fila);
    }
    return mapa;
  };

  const porApi = indexar(datosApi);
  const porSheets = indexar(datosSheets);

  const estadisticas = new Map<string, MergeFieldStat>();
  for (const campo of catalogo) {
    estadisticas.set(campo.key, {
      campo: campo.key,
      label: campo.label,
      origenAsignado: campo.bloqueado ? campo.origenPorDefecto : mapeo[campo.key] ?? campo.origenPorDefecto,
      desdeApi: 0,
      desdeSheets: 0,
      porRespaldo: 0,
      vacios: 0,
    });
  }

  const conflictos: MergeConflict[] = [];
  const registros: T[] = [];
  const resumen: MergeSummary = {
    total: 0,
    soloApi: 0,
    soloSheets: 0,
    enAmbasFuentes: 0,
    camposPorRespaldo: 0,
    conflictos: 0,
  };

  // Orden estable: primero el orden de la API, luego lo que sólo exista en Sheets.
  const ids: string[] = [];
  for (const id of porApi.keys()) ids.push(id);
  for (const id of porSheets.keys()) if (!porApi.has(id)) ids.push(id);

  for (const id of ids) {
    const filaApi = porApi.get(id);
    const filaSheets = porSheets.get(id);

    if (filaApi && filaSheets) resumen.enAmbasFuentes++;
    else if (filaApi) resumen.soloApi++;
    else resumen.soloSheets++;

    // Base: la fuente disponible, para conservar campos fuera del catálogo.
    const unificado: Record<string, any> = {
      ...(filaSheets ? structuredCloneSeguro(filaSheets) : {}),
      ...(filaApi ? structuredCloneSeguro(filaApi) : {}),
    };
    setPath(unificado, llavePrimaria, id);

    for (const campo of catalogo) {
      const stat = estadisticas.get(campo.key)!;
      const origen = stat.origenAsignado;

      const valorApi = campo.disponibleEn.includes('api') ? getPath(filaApi, campo.key) : undefined;
      const valorSheets = campo.disponibleEn.includes('sheets') ? getPath(filaSheets, campo.key) : undefined;

      const preferido = origen === 'api' ? valorApi : valorSheets;
      const alterno = origen === 'api' ? valorSheets : valorApi;

      let elegido = preferido;
      let usadoRespaldo = false;

      if (esVacio(preferido) && rellenarConFuenteAlterna && !esVacio(alterno)) {
        elegido = alterno;
        usadoRespaldo = true;
      }

      if (esVacio(elegido)) {
        stat.vacios++;
      } else if (usadoRespaldo) {
        stat.porRespaldo++;
        resumen.camposPorRespaldo++;
        if (origen === 'api') stat.desdeSheets++;
        else stat.desdeApi++;
      } else if (origen === 'api') {
        stat.desdeApi++;
      } else {
        stat.desdeSheets++;
      }

      if (!esVacio(valorApi) && !esVacio(valorSheets) && !sonEquivalentes(valorApi, valorSheets)) {
        conflictos.push({
          id,
          campo: campo.key,
          label: campo.label,
          origenAsignado: origen,
          valorApi,
          valorSheets,
        });
      }

      if (elegido === undefined) {
        // No sobrescribir con `undefined` lo que ya venía en la base.
        continue;
      }
      setPath(unificado, campo.key, elegido);
    }

    registros.push(unificado as T);
  }

  resumen.total = registros.length;
  resumen.conflictos = conflictos.length;

  return {
    registros,
    resumen,
    detallePorCampo: Array.from(estadisticas.values()),
    conflictos,
  };
}

function structuredCloneSeguro<T>(valor: T): T {
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch {
    return { ...(valor as any) };
  }
}
