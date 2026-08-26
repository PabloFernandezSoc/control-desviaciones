/**
 * Orquestación de "Actualizar datos".
 *
 * Un solo paso, en este orden:
 *   1. guarda una referencia de la lectura anterior (`previousData`);
 *   2. consulta el reporte de servicios de BIT;
 *   3. aplana la respuesta y detecta qué columna es cada campo;
 *   4. construye los servicios y los entrega al motor de reglas;
 *   5. compara contra la referencia anterior (diff) para avisar qué cambió.
 *
 * La API es la única fuente de datos. Si falla, se cae a la copia local de la
 * última respuesta y se avisa; si tampoco hay copia, la pantalla queda vacía
 * con el motivo a la vista.
 */

import { Service } from '../types';
import { engineInstance } from './engine';
import {
  ApiConfig,
  ApiError,
  consultarApi,
  filasDesdeRespuesta,
  getUltimaRespuesta,
  guardarSnapshot,
  leerSnapshot,
  loadApiConfig,
} from './apiClient';
import {
  InfoColumna,
  MapeoCampos,
  autoMapear,
  camposRequeridosFaltantes,
  combinarMapeo,
  loadMapeo,
  saveMapeo,
  CAMPOS,
} from './fieldMapping';
import { construirServicios, reglasDesactivadasPorMapeo } from './adapter';
import { aplicarComplementos, loadComplementos, reglasRehabilitadas } from './complementos';
import { DiffResult, ToastInput, construirNotificacionesDeDiff, diffData } from './dataDiff';

export type OrigenDatos = 'api' | 'copia-local';

export interface RefreshOutcome {
  origen: OrigenDatos;
  diff: DiffResult;
  /** Columnas encontradas en la respuesta, para la vista de mapeo. */
  columnas: Record<string, InfoColumna>;
  mapeo: MapeoCampos;
  /** Reglas que no se evalúan, con el motivo: falta la columna o los datos no la soportan. */
  reglasDesactivadas: { regla: string; titulo: string; motivo: string }[];
  avisos: string[];
  filas: number;
  servicios: number;
  latenciaMs: number | null;
  timestamp: string;
  /** Presente cuando se usó la copia local por un fallo de la API. */
  errorApi: ApiError | null;
}

/**
 * Procesa una respuesta cruda: filas -> mapeo -> servicios -> motor.
 * Se usa tanto para la respuesta en vivo como para la copia local.
 */
function procesarRespuesta(crudo: unknown): {
  columnas: Record<string, InfoColumna>;
  mapeo: MapeoCampos;
  servicios: Service[];
  avisos: string[];
  filas: number;
  reglasDesactivadas: { regla: string; titulo: string; motivo: string }[];
} {
  const filas = filasDesdeRespuesta(crudo);

  if (filas.length === 0) {
    return {
      columnas: {},
      mapeo: {},
      servicios: [],
      avisos: ['La respuesta no contiene filas de servicio.'],
      filas: 0,
      reglasDesactivadas: [],
    };
  }

  // Detección automática, corregida con lo que el usuario haya fijado a mano.
  const deteccion = autoMapear(filas);
  const mapeo = combinarMapeo(deteccion.mapeo, loadMapeo(), deteccion.columnas);

  const avisos: string[] = [];
  const faltantes = camposRequeridosFaltantes(mapeo);
  if (faltantes.length > 0) {
    avisos.push(
      `No se pudo identificar ${faltantes.map((f) => `"${CAMPOS[f].label}"`).join(', ')}. ` +
        'Asígnalo a mano en Mapeo de Campos.',
    );
  }

  const construccion = construirServicios(filas, mapeo);
  avisos.push(...construccion.avisos);

  // Lo cargado a mano rellena lo que la API dejó vacío, antes de evaluar reglas.
  const complementos = loadComplementos();
  const conComplementos = aplicarComplementos(construccion.servicios, complementos);

  // Se apagan dos clases de reglas: las que no tienen columna y las que la
  // tienen pero con datos que no las sostienen (ver `reglasSinSustento`).
  const porMapeo = reglasDesactivadasPorMapeo(mapeo);
  const suprimidas = new Set<string>(porMapeo.reglas);
  for (const r of construccion.reglasSinSustento) suprimidas.add(r.regla);

  // Una regla vuelve si el complemento aportó su dato en algún servicio.
  for (const regla of reglasRehabilitadas(complementos)) suprimidas.delete(regla);

  engineInstance.setReglasSuprimidas(suprimidas);
  engineInstance.setDatosApi(conComplementos.servicios, construccion.clientes);

  if (conComplementos.aplicados > 0) {
    avisos.push(
      `Se aplicaron ${conComplementos.aplicados} datos complementarios sobre ` +
        `${conComplementos.serviciosTocados} servicios.`,
    );
  }

  const reglasDesactivadas = [
    ...porMapeo.motivos.map((m) => ({
      regla: m.campo,
      titulo: `Falta la columna «${m.label}»`,
      motivo: `No se evalúa ${m.nota}. Se puede cargar a mano en la ficha de cada servicio.`,
    })),
    ...construccion.reglasSinSustento.map((r) => ({
      regla: r.regla,
      titulo: `${r.regla.replace(/_/g, '-')}: los datos no la sostienen`,
      motivo: r.motivo,
    })),
  ];

  return {
    columnas: deteccion.columnas,
    mapeo,
    servicios: conComplementos.servicios,
    avisos,
    filas: filas.length,
    reglasDesactivadas,
  };
}

/**
 * Ejecuta una lectura completa contra la API.
 *
 * `guardarComoPreferencia` deja el mapeo detectado como el guardado, para que la
 * próxima lectura arranque de ahí.
 */
export async function actualizarDatos(
  config: ApiConfig = loadApiConfig(),
): Promise<RefreshOutcome> {
  // 1. Referencia de la lectura anterior, antes de tocar nada.
  const previousData = engineInstance.getServices().map((s) => ({ ...s }));

  let crudo: unknown;
  let origen: OrigenDatos = 'api';
  let latenciaMs: number | null = null;
  let errorApi: ApiError | null = null;
  let cupoLaCopia = true;

  try {
    const respuesta = await consultarApi(config);
    crudo = respuesta.crudo;
    latenciaMs = respuesta.ms;
    cupoLaCopia = guardarSnapshot(crudo);
  } catch (e) {
    errorApi = e instanceof ApiError ? e : new ApiError(String((e as Error)?.message ?? e));
    const copia = leerSnapshot();
    if (!copia) throw errorApi;
    crudo = copia.d;
    origen = 'copia-local';
  }

  const procesado = procesarRespuesta(crudo);
  const newData = engineInstance.getServices();
  const diff = diffData(previousData, newData);

  saveMapeo(procesado.mapeo);

  if (!cupoLaCopia) {
    procesado.avisos.push(
      'La respuesta es demasiado grande para guardarla en el navegador. Se trabaja con ella en ' +
        'memoria: al recargar la página habrá que volver a leer la API.',
    );
  }

  return {
    origen,
    diff,
    columnas: procesado.columnas,
    mapeo: procesado.mapeo,
    reglasDesactivadas: procesado.reglasDesactivadas,
    avisos: procesado.avisos,
    filas: procesado.filas,
    servicios: procesado.servicios.length,
    latenciaMs,
    timestamp: engineInstance.getLastSyncTime(),
    errorApi,
  };
}

/**
 * Reconstruye los servicios con un mapeo corregido a mano, sin volver a
 * consultar la API: se reutiliza la copia local de la última respuesta.
 */
export function reprocesarConMapeo(mapeo: MapeoCampos): RefreshOutcome | null {
  const crudo = getUltimaRespuesta();
  if (crudo == null) return null;

  saveMapeo(mapeo);
  const previousData = engineInstance.getServices().map((s) => ({ ...s }));
  const procesado = procesarRespuesta(crudo);
  const diff = diffData(previousData, engineInstance.getServices());

  return {
    origen: 'copia-local',
    diff,
    columnas: procesado.columnas,
    mapeo: procesado.mapeo,
    reglasDesactivadas: procesado.reglasDesactivadas,
    avisos: procesado.avisos,
    filas: procesado.filas,
    servicios: procesado.servicios.length,
    latenciaMs: null,
    timestamp: engineInstance.getLastSyncTime(),
    errorApi: null,
  };
}

/**
 * Procesa un JSON pegado a mano, sin pasar por la red.
 *
 * Sirve para trabajar cuando la API no es alcanzable desde el navegador —por
 * CORS, por VPN o por el puerto— y para revisar una respuesta guardada.
 */
export function procesarJsonPegado(texto: string): RefreshOutcome {
  let crudo: unknown;
  try {
    crudo = JSON.parse(texto);
  } catch (e) {
    throw new ApiError(`El texto pegado no es JSON válido: ${(e as Error).message}`);
  }

  const previousData = engineInstance.getServices().map((s) => ({ ...s }));
  guardarSnapshot(crudo);
  const procesado = procesarRespuesta(crudo);
  saveMapeo(procesado.mapeo);

  return {
    origen: 'copia-local',
    diff: diffData(previousData, engineInstance.getServices()),
    columnas: procesado.columnas,
    mapeo: procesado.mapeo,
    reglasDesactivadas: procesado.reglasDesactivadas,
    avisos: procesado.avisos,
    filas: procesado.filas,
    servicios: procesado.servicios.length,
    latenciaMs: null,
    timestamp: engineInstance.getLastSyncTime(),
    errorApi: null,
  };
}

/** Carga inicial desde la copia local, para pintar algo antes de la primera consulta. */
export function cargarDesdeCopiaLocal(): RefreshOutcome | null {
  const copia = leerSnapshot();
  if (!copia) return null;

  const procesado = procesarRespuesta(copia.d);

  return {
    origen: 'copia-local',
    // La primera carga no reporta novedades: no hay con qué comparar.
    diff: diffData([], engineInstance.getServices()),
    columnas: procesado.columnas,
    mapeo: procesado.mapeo,
    reglasDesactivadas: procesado.reglasDesactivadas,
    avisos: procesado.avisos,
    filas: procesado.filas,
    servicios: procesado.servicios.length,
    latenciaMs: null,
    timestamp: copia.t,
    errorApi: null,
  };
}

/**
 * Traduce el resultado de la lectura a las notificaciones que se muestran:
 * primero el aviso de que se está usando la copia local, después los problemas
 * de mapeo, y al final el resumen de cambios.
 */
export function notificacionesDeActualizacion(resultado: RefreshOutcome): ToastInput[] {
  const avisos: ToastInput[] = [];

  if (resultado.errorApi) {
    avisos.push({
      variante: 'error',
      titulo: 'Sin conexión con la API',
      mensaje: resultado.errorApi.message,
      detalle: ['Se está mostrando la copia local de la última lectura correcta.'],
      duracionMs: 10000,
    });
  }

  for (const aviso of resultado.avisos) {
    avisos.push({
      variante: 'warning',
      titulo: 'Revisar el mapeo',
      mensaje: aviso,
      duracionMs: 9000,
    });
  }

  // Si se usó la copia local, no tiene sentido hablar de cambios: son los mismos datos.
  if (!resultado.errorApi) {
    avisos.push(...construirNotificacionesDeDiff(resultado.diff, { origen: 'la API' }));
  }

  return avisos;
}
