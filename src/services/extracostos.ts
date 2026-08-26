/**
 * Taxonomía de extracostos.
 *
 * En el reporte de BIT cada extracosto se identifica por el nombre de su
 * producto: "SOBRESTADIA POR HORA", "ALMACENAJE SAI 40 DRY", "CARGA IMO VAP".
 * Son nombres comerciales, no códigos, y hay decenas de variantes.
 *
 * Aquí se agrupan en tipos. De eso depende la detección: la mayoría de las
 * reglas no busca un valor fuera de rango, sino una **condición que ocurrió y
 * no se cobró** — hubo sobrepeso pero el servicio no tiene extracosto de
 * sobrepeso asociado.
 *
 * Los patrones se pueden ajustar desde Configuración sin tocar el código.
 */

export type TipoExtracosto =
  | 'sobreestadia'
  | 'sobrepeso'
  | 'almacenaje'
  | 'falso_flete'
  | 'cuadrilla'
  | 'imo'
  | 'insulado'
  | 'porteo'
  | 'devolucion_vacio'
  | 'servicio_cruzado'
  | 'otro';

export interface DefinicionTipo {
  tipo: TipoExtracosto;
  label: string;
  /** Fuente del patrón, en texto, para poder editarlo desde la interfaz. */
  patron: string;
  descripcion: string;
}

/**
 * Patrones por defecto, derivados de los nombres que usa BIT en producción.
 * El orden importa: gana el primero que calce.
 */
export const TIPOS_EXTRACOSTO: DefinicionTipo[] = [
  {
    tipo: 'sobreestadia',
    label: 'Sobrestadía',
    patron: 'SOBRESTADIA|SOBRE\\s*ESTADIA|SOBREESTADIA',
    descripcion: 'Cobra la permanencia por sobre el tiempo libre, en planta o en puerto.',
  },
  {
    tipo: 'sobrepeso',
    label: 'Sobrepeso',
    patron: 'SOBREPESO|SOBRE\\s*PESO',
    descripcion: 'Cobra la carga que excede el tope de peso.',
  },
  {
    tipo: 'almacenaje',
    label: 'Almacenaje',
    patron: 'ALMACENAJE|CUSTODIA|DIA\\s*ADICIONAL',
    descripcion: 'Cobra los días de custodia en depósito, típico de los servicios diferidos.',
  },
  {
    tipo: 'falso_flete',
    label: 'Falso flete',
    patron: 'FALSO\\s*(FLETE|POSICIONAMIENTO|RETIRO)|FALSO',
    descripcion: 'Cobra el viaje que se ejecutó sin carga o el servicio cancelado en terreno.',
  },
  {
    tipo: 'cuadrilla',
    label: 'Cuadrilla',
    patron: 'CUADRILLA|PEONETA|ESTIBA',
    descripcion: 'Cobra la mano de obra de carga y descarga.',
  },
  {
    tipo: 'imo',
    label: 'Carga IMO',
    patron: '\\bIMO\\b|MERCANCIA\\s*PELIGROSA|PELIGROSA',
    descripcion: 'Recargo por mercancía peligrosa.',
  },
  {
    tipo: 'insulado',
    label: 'Insulado / Flexi',
    patron: 'INSULADO|FLEXI|MANTA\\s*TERMICA',
    descripcion: 'Habilitación del contenedor con manta térmica o flexitanque.',
  },
  {
    tipo: 'porteo',
    label: 'Porteo',
    patron: 'PORTEO',
    descripcion: 'Movimiento entre terminales o dentro del puerto.',
  },
  {
    tipo: 'devolucion_vacio',
    label: 'Devolución de vacío',
    patron: 'DEVOLUCION\\s*VACIO|DEV\\.?\\s*VACIO',
    descripcion: 'Devolución del contenedor vacío al depósito.',
  },
  {
    tipo: 'servicio_cruzado',
    label: 'Servicio cruzado',
    patron: 'SERVICIO\\s*CRUZADO|CRUZADO',
    descripcion: 'Servicio que combina dos operaciones en un mismo viaje.',
  },
];

export const STORAGE_KEY_TIPOS = 'lyd_bit_tipos_extracosto_v1';

/** Patrones guardados por el usuario: tipo -> patrón. */
export type PatronesExtracosto = Partial<Record<TipoExtracosto, string>>;

export function loadPatrones(): PatronesExtracosto {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_TIPOS);
    return crudo ? (JSON.parse(crudo) as PatronesExtracosto) : {};
  } catch {
    return {};
  }
}

export function savePatrones(p: PatronesExtracosto): void {
  try {
    localStorage.setItem(STORAGE_KEY_TIPOS, JSON.stringify(p));
  } catch (e) {
    console.error('No se pudieron persistir los patrones de extracosto:', e);
  }
}

/** Quita acentos y normaliza, para que "SOBRESTADÍA" calce con "SOBRESTADIA". */
function normalizar(s: string): string {
  return String(s ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export interface Clasificador {
  /** Devuelve los tipos que calzan con el nombre de un producto. */
  clasificar: (producto: string) => TipoExtracosto[];
  definiciones: DefinicionTipo[];
}

/**
 * Compila los patrones una sola vez. Con miles de filas, recompilar la expresión
 * regular por cada una se nota.
 */
export function crearClasificador(personalizados: PatronesExtracosto = {}): Clasificador {
  const definiciones = TIPOS_EXTRACOSTO.map((d) => ({
    ...d,
    patron: personalizados[d.tipo] ?? d.patron,
  }));

  const compilados: { tipo: TipoExtracosto; rx: RegExp }[] = [];
  for (const d of definiciones) {
    try {
      compilados.push({ tipo: d.tipo, rx: new RegExp(d.patron, 'i') });
    } catch {
      // Un patrón inválido escrito por el usuario no debe romper la lectura.
      console.warn(`Patrón inválido para ${d.tipo}: ${d.patron}`);
    }
  }

  const cache = new Map<string, TipoExtracosto[]>();

  return {
    definiciones,
    clasificar(producto: string): TipoExtracosto[] {
      const clave = normalizar(producto);
      const enCache = cache.get(clave);
      if (enCache) return enCache;

      const tipos = compilados.filter((c) => c.rx.test(clave)).map((c) => c.tipo);
      const salida = tipos.length > 0 ? tipos : (['otro'] as TipoExtracosto[]);
      cache.set(clave, salida);
      return salida;
    },
  };
}

export function labelDeTipo(tipo: TipoExtracosto): string {
  return TIPOS_EXTRACOSTO.find((t) => t.tipo === tipo)?.label ?? 'Otro';
}
