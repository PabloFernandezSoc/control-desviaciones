/**
 * Cliente del reporte de servicios de BIT.
 *
 * Contrato (el mismo que usa la consulta de Power Query y el dashboard de
 * evolución de servicios):
 *
 *   POST https://biterp.cl:451/api/misservicios/reporte/prod-general
 *   { "apiKey": "...", "perDesde": "2025-01-01", "perHasta": "2026-12-31" }
 *
 * La respuesta trae filas de servicio; los extracostos vienen en arreglos
 * anidados dentro de cada fila y se aplanan como filas hermanas unidas por el
 * id de servicio. Los nombres de campo no son estables, así que aquí sólo se
 * obtiene y se aplana: la detección de qué columna es qué vive en
 * `fieldMapping.ts`.
 *
 * Esta es la única fuente de datos de servicios de la aplicación.
 */

export interface ApiConfig {
  url: string;
  metodo: 'POST' | 'GET';
  apiKey: string;
  perDesde: string;
  perHasta: string;
  /** Cabeceras extra, por ejemplo un token. */
  headers: Record<string, string>;
  /** Webhook o proxy intermedio. Si está definido, se usa en vez de `url`. */
  proxy: string;
  timeoutMs: number;
}

export const STORAGE_KEY_API = 'lyd_bit_api_config_v2';
export const STORAGE_KEY_SNAPSHOT = 'lyd_bit_api_snapshot_v2';

/** Rango por defecto: el año en curso completo más el siguiente. */
function rangoPorDefecto(): { perDesde: string; perHasta: string } {
  const hoy = new Date();
  return {
    perDesde: `${hoy.getFullYear()}-01-01`,
    perHasta: `${hoy.getFullYear() + 1}-12-31`,
  };
}

export const defaultApiConfig = (): ApiConfig => ({
  url: 'https://biterp.cl:451/api/misservicios/reporte/prod-general',
  metodo: 'POST',
  apiKey: '',
  ...rangoPorDefecto(),
  headers: {},
  proxy: '',
  timeoutMs: 45000,
});

export function loadApiConfig(): ApiConfig {
  const base = defaultApiConfig();
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_API);
    if (!crudo) return base;
    return { ...base, ...(JSON.parse(crudo) as Partial<ApiConfig>) };
  } catch {
    return base;
  }
}

export function saveApiConfig(config: ApiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_API, JSON.stringify(config));
  } catch (e) {
    console.error('No se pudo persistir la configuración de la API:', e);
  }
}

export function apiEstaConfigurada(config: ApiConfig): boolean {
  const destino = (config.proxy || config.url).trim();
  return destino !== '' && (config.proxy.trim() !== '' || config.apiKey.trim() !== '');
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Copia local de la última respuesta
// ---------------------------------------------------------------------------

export interface Snapshot {
  /** Fecha legible de la lectura. */
  t: string;
  /** Respuesta cruda tal como llegó. */
  d: unknown;
}

/**
 * Última respuesta, en memoria.
 *
 * `localStorage` tiene una cuota de pocos MB y un reporte de varios miles de
 * servicios no cabe. Antes eso fallaba en silencio: la copia local nunca se
 * escribía y lo que dependía de ella —descargar la respuesta, reprocesar con
 * otro mapeo— se quedaba sin datos. La memoria es la fuente de la sesión; el
 * almacenamiento es sólo para sobrevivir a un refresco.
 */
let ultimaRespuesta: unknown = null;

export function getUltimaRespuesta(): unknown {
  return ultimaRespuesta ?? leerSnapshot()?.d ?? null;
}

/** Guarda la respuesta. Devuelve `false` si no cupo en el almacenamiento. */
export function guardarSnapshot(crudo: unknown): boolean {
  ultimaRespuesta = crudo;
  try {
    localStorage.setItem(
      STORAGE_KEY_SNAPSHOT,
      JSON.stringify({ t: new Date().toISOString(), d: crudo } satisfies Snapshot),
    );
    return true;
  } catch {
    // No cabe: se sigue con la copia en memoria y quien llama lo informa.
    try {
      localStorage.removeItem(STORAGE_KEY_SNAPSHOT);
    } catch { /* nada que hacer */ }
    return false;
  }
}

export function leerSnapshot(): Snapshot | null {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
    if (!crudo) return null;
    const snap = JSON.parse(crudo) as Snapshot;
    return snap && snap.d !== undefined ? snap : null;
  } catch {
    return null;
  }
}

export function borrarSnapshot(): void {
  ultimaRespuesta = null;
  try {
    localStorage.removeItem(STORAGE_KEY_SNAPSHOT);
  } catch {
    /* nada que hacer */
  }
}

// ---------------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------------

export interface RespuestaApi {
  crudo: unknown;
  ms: number;
}

export async function consultarApi(config: ApiConfig): Promise<RespuestaApi> {
  const destino = (config.proxy || config.url).trim();
  if (!destino) {
    throw new ApiError('No hay URL configurada para el reporte de servicios.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(config.metodo === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    ...config.headers,
  };

  const opciones: RequestInit = { method: config.metodo, headers, signal: controller.signal };
  if (config.metodo === 'POST') {
    opciones.body = JSON.stringify({
      apiKey: config.apiKey,
      perDesde: config.perDesde,
      perHasta: config.perHasta,
    });
  }

  const t0 = performance.now();
  try {
    const respuesta = await fetch(destino, opciones);
    if (!respuesta.ok) {
      throw new ApiError(
        `La API respondió ${respuesta.status} ${respuesta.statusText}.`,
        respuesta.status,
      );
    }
    const crudo = await respuesta.json();
    return { crudo, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error)?.name === 'AbortError') {
      throw new ApiError(`La API no respondió en ${Math.round(config.timeoutMs / 1000)} s.`);
    }
    // Un fallo de red con `fetch` no distingue CORS de host caído; se nombran
    // las dos causas porque son las que aparecen en la práctica.
    throw new ApiError(
      `No se pudo contactar la API (${(e as Error)?.message ?? 'error de red'}). ` +
        'Revisa la URL, que el certificado sea válido y que el servidor permita CORS desde este dominio.',
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Extracción y aplanado
// ---------------------------------------------------------------------------

export type FilaCruda = Record<string, unknown>;

/**
 * Busca dentro de la respuesta el arreglo de objetos más grande. La API puede
 * devolver el arreglo en la raíz o envuelto en un sobre (`data`, `result`,
 * `Table`…), y el nombre del sobre ha cambiado entre versiones.
 */
export function extraerArreglo(json: unknown): FilaCruda[] {
  if (!json) return [];
  if (Array.isArray(json) && json.length && typeof json[0] === 'object') return json as FilaCruda[];

  let mejor: FilaCruda[] = [];
  const recorrer = (nodo: unknown, profundidad: number): void => {
    if (!nodo || typeof nodo !== 'object' || profundidad > 6) return;
    if (Array.isArray(nodo)) {
      if (nodo.length && typeof nodo[0] === 'object' && !Array.isArray(nodo[0])) {
        if (nodo.length > mejor.length) mejor = nodo as FilaCruda[];
        nodo.slice(0, 3).forEach((x) => recorrer(x, profundidad + 1));
      }
      return;
    }
    for (const clave of Object.keys(nodo)) {
      recorrer((nodo as Record<string, unknown>)[clave], profundidad + 1);
    }
  };
  recorrer(json, 0);
  return mejor;
}

/** Marca que distingue la fila base de un servicio de sus extracostos. */
export const TIPO_FILA = '__tipoFila';

/**
 * Aplana los registros anidados.
 *
 * Un objeto anidado se expande con prefijo (`cliente_nombre`). Un arreglo de
 * objetos se interpreta como los extracostos del servicio: cada elemento sale
 * como fila hermana, marcada con `__tipoFila: 'EXTRACOSTO'` y heredando el id
 * de servicio de su fila base.
 */
export function aplanar(filas: FilaCruda[]): FilaCruda[] {
  const salida: FilaCruda[] = [];

  for (const fila of filas) {
    if (!fila || typeof fila !== 'object') continue;

    const hijos: { clave: string; valor: FilaCruda[] }[] = [];
    const plano: FilaCruda = {};

    for (const clave of Object.keys(fila)) {
      const valor = fila[clave];
      if (Array.isArray(valor) && valor.length && typeof valor[0] === 'object') {
        hijos.push({ clave, valor: valor as FilaCruda[] });
      } else if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
        for (const sub of Object.keys(valor as object)) {
          plano[`${clave}_${sub}`] = (valor as Record<string, unknown>)[sub];
        }
      } else {
        plano[clave] = valor;
      }
    }

    salida.push(plano);

    for (const hijo of hijos) {
      for (const extra of hijo.valor) {
        const filaExtra: FilaCruda = { ...extra };
        // Si el extracosto no trae su propio id de servicio, hereda el del padre.
        const traeId = Object.keys(filaExtra).some((k) => /id[_\s-]?servicio/i.test(k));
        if (!traeId) {
          const claveId = Object.keys(plano).find((k) => /id[_\s-]?servicio|^id$/i.test(k));
          if (claveId) filaExtra[claveId] = plano[claveId];
        }
        filaExtra[TIPO_FILA] = 'EXTRACOSTO';
        salida.push(filaExtra);
      }
    }

    if (hijos.length) plano[TIPO_FILA] = 'SERVICIO';
  }

  return salida;
}

/** Obtiene y deja las filas listas para mapear. */
export function filasDesdeRespuesta(crudo: unknown): FilaCruda[] {
  return aplanar(extraerArreglo(crudo));
}
