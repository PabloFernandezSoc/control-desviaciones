/**
 * Comparación (diffing) entre la lectura anterior y la recién obtenida.
 *
 * Se usa en cada "Actualizar datos" para saber qué cambió y poder avisarlo con
 * notificaciones. Es una función pura: no toca el estado ni el DOM, así que se
 * puede reutilizar tal cual desde un worker, un test o el backend.
 */

import { getPath } from './dataSources';

export interface RegistroNuevo {
  id: string;
  clienteNombre?: string;
  estado?: string;
}

export interface CambioDeEstado {
  id: string;
  clienteNombre?: string;
  estadoAnterior: string;
  estadoNuevo: string;
}

export interface DiffResult {
  nuevos: RegistroNuevo[];
  eliminados: RegistroNuevo[];
  cambiosEstado: CambioDeEstado[];
  sinCambios: boolean;
  totalAnterior: number;
  totalNuevo: number;
}

export interface DiffOptions {
  /** Ruta de la llave primaria. Por defecto `id`. */
  llavePrimaria?: string;
  /** Ruta del campo de estado a vigilar. Por defecto `estado`. */
  campoEstado?: string;
  /** Ruta del campo con el nombre del cliente, para enriquecer los mensajes. */
  campoCliente?: string;
  /** Si es `true`, además reporta los registros que desaparecieron. */
  detectarEliminados?: boolean;
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

/**
 * Compara dos colecciones de registros y devuelve:
 *  - `nuevos`: IDs presentes en `newData` que no existían en `previousData`.
 *  - `cambiosEstado`: IDs presentes en ambas cuyo campo de estado cambió.
 *  - `eliminados`: IDs que estaban antes y ya no están (opcional).
 *
 * `previousData` puede venir vacío o nulo: en la primera carga no hay nada con
 * qué comparar, así que no se reporta nada como novedad.
 */
export function diffData<T extends Record<string, any>>(
  previousData: T[] | null | undefined,
  newData: T[] | null | undefined,
  opciones: DiffOptions = {},
): DiffResult {
  const {
    llavePrimaria = 'id',
    campoEstado = 'estado',
    campoCliente = 'clienteNombre',
    detectarEliminados = true,
  } = opciones;

  const anteriores = previousData ?? [];
  const nuevosDatos = newData ?? [];

  const indexar = (filas: T[]): Map<string, T> => {
    const mapa = new Map<string, T>();
    for (const fila of filas) {
      const id = getPath(fila, llavePrimaria);
      if (id === null || id === undefined || id === '') continue;
      mapa.set(String(id), fila);
    }
    return mapa;
  };

  const previos = indexar(anteriores);
  const actuales = indexar(nuevosDatos);

  const nuevos: RegistroNuevo[] = [];
  const cambiosEstado: CambioDeEstado[] = [];
  const eliminados: RegistroNuevo[] = [];

  // Primera carga: no hay línea base, nada que reportar como cambio.
  const hayLineaBase = previos.size > 0;

  for (const [id, fila] of actuales) {
    const anterior = previos.get(id);

    if (!anterior) {
      if (hayLineaBase) {
        nuevos.push({
          id,
          clienteNombre: texto(getPath(fila, campoCliente)) || undefined,
          estado: texto(getPath(fila, campoEstado)) || undefined,
        });
      }
      continue;
    }

    const estadoAnterior = texto(getPath(anterior, campoEstado));
    const estadoNuevo = texto(getPath(fila, campoEstado));

    if (estadoAnterior !== estadoNuevo && estadoNuevo !== '') {
      cambiosEstado.push({
        id,
        clienteNombre: texto(getPath(fila, campoCliente)) || undefined,
        estadoAnterior,
        estadoNuevo,
      });
    }
  }

  if (detectarEliminados && hayLineaBase) {
    for (const [id, fila] of previos) {
      if (actuales.has(id)) continue;
      eliminados.push({
        id,
        clienteNombre: texto(getPath(fila, campoCliente)) || undefined,
        estado: texto(getPath(fila, campoEstado)) || undefined,
      });
    }
  }

  return {
    nuevos,
    eliminados,
    cambiosEstado,
    sinCambios: nuevos.length === 0 && cambiosEstado.length === 0 && eliminados.length === 0,
    totalAnterior: previos.size,
    totalNuevo: actuales.size,
  };
}

// ---------------------------------------------------------------------------
// Traducción del diff a notificaciones
// ---------------------------------------------------------------------------

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastInput {
  mensaje: string;
  variante?: ToastVariant;
  titulo?: string;
  detalle?: string[];
  duracionMs?: number;
}

/** Etiquetas legibles para los estados internos del servicio. */
const ETIQUETAS_ESTADO: Record<string, string> = {
  proyeccion: 'Proyección',
  borrador: 'Borrador',
  confirmado: 'Confirmado',
  en_transito: 'En tránsito',
  cerrado: 'Cerrado',
  facturado: 'Facturado',
};

export function etiquetaEstado(estado: string): string {
  return ETIQUETAS_ESTADO[estado] ?? estado;
}

const MAX_DETALLE = 4;

/**
 * Construye los mensajes que se muestran tras una actualización.
 *
 * - Sin cambios          -> un aviso neutro.
 * - Sólo servicios nuevos -> un aviso de éxito.
 * - Sólo cambios de estado -> un aviso de advertencia.
 * - Ambos                -> un único aviso consolidado con el desglose.
 */
export function construirNotificacionesDeDiff(
  diff: DiffResult,
  opciones: { origen?: string } = {},
): ToastInput[] {
  const { origen } = opciones;
  const sufijoOrigen = origen ? ` desde ${origen}` : '';

  const nuevos = diff.nuevos.length;
  const cambios = diff.cambiosEstado.length;

  const detalleNuevos = diff.nuevos
    .slice(0, MAX_DETALLE)
    .map((n) => `${n.id}${n.clienteNombre ? ` · ${n.clienteNombre}` : ''}`);
  if (diff.nuevos.length > MAX_DETALLE) {
    detalleNuevos.push(`y ${diff.nuevos.length - MAX_DETALLE} más`);
  }

  const detalleCambios = diff.cambiosEstado
    .slice(0, MAX_DETALLE)
    .map((c) => `${c.id}: ${etiquetaEstado(c.estadoAnterior)} → ${etiquetaEstado(c.estadoNuevo)}`);
  if (diff.cambiosEstado.length > MAX_DETALLE) {
    detalleCambios.push(`y ${diff.cambiosEstado.length - MAX_DETALLE} más`);
  }

  if (nuevos === 0 && cambios === 0) {
    return [
      {
        variante: 'info',
        titulo: 'Sin novedades',
        mensaje: 'Datos actualizados. Sin cambios recientes.',
        duracionMs: 4000,
      },
    ];
  }

  if (nuevos > 0 && cambios > 0) {
    return [
      {
        variante: 'success',
        titulo: 'Actualización completada',
        mensaje: `Actualización completada: ${nuevos} ${plural(nuevos, 'servicio nuevo', 'servicios nuevos')}, ${cambios} ${plural(cambios, 'cambio de estado detectado', 'cambios de estado detectados')}.`,
        detalle: [...detalleNuevos, ...detalleCambios],
        duracionMs: 8000,
      },
    ];
  }

  if (nuevos > 0) {
    return [
      {
        variante: 'success',
        titulo: 'Servicios nuevos',
        mensaje: `Se ${plural(nuevos, 'ha añadido', 'han añadido')} ${nuevos} ${plural(nuevos, 'nuevo servicio', 'nuevos servicios')}${sufijoOrigen}.`,
        detalle: detalleNuevos,
        duracionMs: 6000,
      },
    ];
  }

  return [
    {
      variante: 'warning',
      titulo: 'Cambios de estado',
      mensaje: `${cambios} ${plural(cambios, 'servicio ha cambiado su estado', 'servicios han cambiado su estado')}.`,
      detalle: detalleCambios,
      duracionMs: 6000,
    },
  ];
}

function plural(n: number, singular: string, plural_: string): string {
  return n === 1 ? singular : plural_;
}
