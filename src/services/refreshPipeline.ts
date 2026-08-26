/**
 * Orquestación de "Actualizar datos".
 *
 * Un solo paso, en este orden:
 *   1. guarda una referencia del estado anterior (`previousData`);
 *   2. lee las fuentes activas (API y/o Google Sheets);
 *   3. las cruza por la llave primaria respetando el mapeo de origen;
 *   4. compara contra la referencia anterior (diff);
 *   5. aplica el resultado sobre el motor de reglas.
 *
 * Los mensajes que se muestran al usuario se construyen aparte, con
 * `construirNotificacionesDeDiff`, para que esta función siga siendo pura
 * respecto de la interfaz.
 */

import { Service } from '../types';
import { engineInstance } from './engine';
import {
  FieldMappingState,
  MergeResult,
  mergeDataSources,
} from './dataSources';
import { DiffResult, ToastInput, construirNotificacionesDeDiff, diffData } from './dataDiff';
import {
  IntegrationConfig,
  IntegrationError,
  hayFuenteRemota,
  leerFuentes,
  loadIntegrationConfig,
} from './apiClient';

export type ModoActualizacion = 'remoto' | 'maqueta';

export interface RefreshOutcome {
  modo: ModoActualizacion;
  diff: DiffResult;
  /** Detalle del cruce. Es `null` en modo maqueta, donde no hay dos fuentes. */
  cruce: MergeResult<Service> | null;
  /** Fuentes que no respondieron. La actualización sigue con las que sí lo hicieron. */
  errores: IntegrationError[];
  timestamp: string;
  /** Qué fuentes aportaron datos, para redactar los mensajes. */
  origenes: string[];
}

const HOY = () => new Date().toISOString().slice(0, 10);

/**
 * Completa un registro parcial hasta la forma que el motor de reglas espera.
 * Los campos que la lectura no trajo se toman del servicio local existente y,
 * si el servicio es nuevo, de un valor por defecto inofensivo: el motor debe
 * poder evaluarlo sin reventar, aunque después marque campos obligatorios
 * vacíos, que es justamente lo que tiene que detectar.
 */
export function completarServicio(parcial: Partial<Service>, previo?: Service): Service {
  const base = previo ?? ({} as Partial<Service>);
  return {
    ...base,
    ...parcial,
    id: String(parcial.id ?? base.id ?? ''),
    clienteId: parcial.clienteId ?? base.clienteId ?? '',
    clienteNombre: parcial.clienteNombre ?? base.clienteNombre ?? 'Sin identificar',
    ejecutivo: parcial.ejecutivo ?? base.ejecutivo ?? 'Sin asignar',
    ruta: parcial.ruta ?? base.ruta ?? { origen: '', destino: '' },
    contenedores: parcial.contenedores ?? base.contenedores ?? [],
    estado: parcial.estado ?? base.estado ?? 'borrador',
    fechaCreacion: parcial.fechaCreacion ?? base.fechaCreacion ?? HOY(),
    lineas: parcial.lineas ?? base.lineas ?? [],
  } as Service;
}

/**
 * Ejecuta una actualización completa y devuelve qué cambió.
 *
 * Si no hay ninguna fuente remota configurada trabaja en modo maqueta sobre los
 * datos guardados en el navegador, para que la pantalla siga siendo usable en
 * una demo sin conexión.
 *
 * Lanza `IntegrationError` sólo cuando todas las fuentes activas fallaron: en
 * ese caso no hay nada que aplicar y el estado local queda intacto.
 */
export async function actualizarDatos(
  mapeo: FieldMappingState,
  config: IntegrationConfig = loadIntegrationConfig(),
): Promise<RefreshOutcome> {
  // 1. Referencia del estado anterior, antes de tocar nada.
  const previousData = engineInstance.getServices().map((s) => ({ ...s }));

  // Modo maqueta: sin fuentes remotas, se mueve la data local.
  if (!hayFuenteRemota(config)) {
    engineInstance.simulateSync();
    const newData = engineInstance.getServices();
    return {
      modo: 'maqueta',
      diff: diffData(previousData, newData),
      cruce: null,
      errores: [],
      timestamp: engineInstance.getLastSyncTime(),
      origenes: ['los datos de maqueta'],
    };
  }

  // 2. Lectura de las fuentes activas.
  const lectura = await leerFuentes(config);

  if (!lectura.api && !lectura.sheets) {
    throw lectura.errores[0] ??
      new IntegrationError('Ninguna fuente de datos respondió.', 'api');
  }

  // 3. Cruce por llave primaria respetando el mapeo.
  const cruce = mergeDataSources<Partial<Service>>(
    lectura.sheets?.registros ?? [],
    lectura.api?.registros ?? [],
    { mapeo },
  );

  const previosPorId = new Map(previousData.map((s) => [s.id, s]));
  const newData = cruce.registros
    .map((parcial) => completarServicio(parcial, previosPorId.get(String(parcial.id))))
    .filter((s) => s.id !== '');

  // 4. Diff contra la referencia anterior.
  const diff = diffData(previousData, newData);

  // 5. Aplicación sobre el motor. Si sólo respondió una de las dos fuentes se
  //    usa `upsert` para no borrar lo que la otra aportaba.
  const soloUnaFuenteActiva = lectura.errores.length === 0 && (!lectura.api || !lectura.sheets);
  engineInstance.applyExternalServices(
    newData,
    lectura.errores.length > 0 || soloUnaFuenteActiva ? 'upsert' : 'reemplazar',
  );

  const origenes: string[] = [];
  if (lectura.api) origenes.push('la API');
  if (lectura.sheets) origenes.push('Google Sheets');

  return {
    modo: 'remoto',
    diff,
    cruce: cruce as MergeResult<Service>,
    errores: lectura.errores,
    timestamp: engineInstance.getLastSyncTime(),
    origenes,
  };
}

/**
 * Traduce el resultado de la actualización a la lista de notificaciones que
 * se muestran: primero los errores de las fuentes que fallaron, después el
 * resumen de cambios.
 */
export function notificacionesDeActualizacion(resultado: RefreshOutcome): ToastInput[] {
  const avisos: ToastInput[] = [];

  for (const error of resultado.errores) {
    avisos.push({
      variante: 'error',
      titulo: 'Fuente no disponible',
      mensaje: error.message,
      duracionMs: 9000,
    });
  }

  const origen = resultado.modo === 'maqueta' ? undefined : resultado.origenes[0] ?? 'la API';
  avisos.push(...construirNotificacionesDeDiff(resultado.diff, { origen }));

  return avisos;
}
