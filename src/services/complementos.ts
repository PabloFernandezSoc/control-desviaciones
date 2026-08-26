/**
 * Datos complementarios.
 *
 * El reporte de BIT no trae todos los campos que necesitan las reglas del PRD.
 * Cuando un dato no existe en el ERP —y por lo tanto no hay columna que mapear—
 * el equipo puede cargarlo aquí, por servicio. Se guarda en el navegador y se
 * aplica sobre el servicio antes de evaluar las reglas.
 *
 * Esto no es editar el ERP: es completar lo que el ERP no publica, para que la
 * detección pueda correr. El dato de la API siempre manda; el complemento sólo
 * rellena lo que llegó vacío.
 */

import { Service } from '../types';

export const STORAGE_KEY_COMPLEMENTOS = 'lyd_bit_complementos_v1';

/** Campos que se pueden complementar a mano, en el orden en que se muestran. */
export const CAMPOS_COMPLEMENTABLES = [
  { key: 'inPlanta', label: 'In planta', tipo: 'datetime', nota: 'Habilita R-GEN-05 (estadía). Necesita la hora, no sólo la fecha.' },
  { key: 'outPlanta', label: 'Out planta', tipo: 'datetime', nota: 'Habilita R-GEN-05 (estadía).' },
  { key: 'pesoKg', label: 'Peso (kg)', tipo: 'numero', nota: 'Habilita R-GEN-02 y R-GEN-03 (sobrepeso).' },
  { key: 'modalidad', label: 'Modalidad', tipo: 'modalidad', nota: 'Habilita R-GEN-04 y R-EXC-01.' },
  { key: 'tipoOperacion', label: 'Tipo de operación', tipo: 'operacion', nota: 'Selecciona el bloque R-IMP o R-EXP.' },
  { key: 'puerto', label: 'Puerto', tipo: 'texto', nota: 'Campo obligatorio en R-IMP-02 y R-EXP-02.' },
  { key: 'nave', label: 'Nave', tipo: 'texto', nota: 'Campo obligatorio en R-IMP-02 y R-EXP-02.' },
  { key: 'depositoVacio', label: 'Depósito vacío', tipo: 'texto', nota: 'Campo obligatorio en R-IMP-02.' },
  { key: 'depositoRetiro', label: 'Depósito de retiro', tipo: 'texto', nota: 'Campo obligatorio en R-EXP-02.' },
  { key: 'fechaStacking', label: 'Fecha de stacking', tipo: 'fecha', nota: 'Habilita R-EXP-01.' },
  { key: 'corteDocumental', label: 'Corte documental', tipo: 'fecha', nota: 'Habilita R-EXP-01.' },
  { key: 'fechaRetiro', label: 'Fecha de retiro', tipo: 'fecha', nota: 'Habilita R-EXC-02 (almacenaje).' },
  { key: 'fechaPresentacion', label: 'Fecha de presentación', tipo: 'fecha', nota: 'Habilita R-EXC-02 y R-LIQ-03.' },
] as const;

export type CampoComplementable = (typeof CAMPOS_COMPLEMENTABLES)[number];
export type ClaveComplementable = CampoComplementable['key'];

/** Lo cargado a mano: id de servicio -> campos. */
export type Complementos = Record<string, Partial<Record<ClaveComplementable, string | number>>>;

export function loadComplementos(): Complementos {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY_COMPLEMENTOS);
    return crudo ? (JSON.parse(crudo) as Complementos) : {};
  } catch {
    return {};
  }
}

export function saveComplementos(c: Complementos): void {
  try {
    localStorage.setItem(STORAGE_KEY_COMPLEMENTOS, JSON.stringify(c));
  } catch (e) {
    console.error('No se pudieron persistir los datos complementarios:', e);
  }
}

/** Guarda (o borra, con valor vacío) un campo de un servicio. Devuelve el mapa nuevo. */
export function setComplemento(
  actual: Complementos,
  servicioId: string,
  campo: ClaveComplementable,
  valor: string,
): Complementos {
  const siguiente: Complementos = { ...actual, [servicioId]: { ...(actual[servicioId] ?? {}) } };
  const delServicio = siguiente[servicioId]!;

  if (valor === '' || valor == null) {
    delete delServicio[campo];
  } else {
    const def = CAMPOS_COMPLEMENTABLES.find((c) => c.key === campo);
    delServicio[campo] = def?.tipo === 'numero' ? Number(valor) : valor;
  }

  if (Object.keys(delServicio).length === 0) delete siguiente[servicioId];
  return siguiente;
}

function estaVacio(v: unknown): boolean {
  return v === undefined || v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v));
}

/**
 * Aplica los complementos sobre los servicios construidos desde la API.
 *
 * Sólo rellena lo que llegó vacío: si el ERP publica el dato, ese manda. Así un
 * complemento cargado antes no tapa una corrección hecha después en BIT.
 */
export function aplicarComplementos(
  servicios: Service[],
  complementos: Complementos,
): { servicios: Service[]; aplicados: number; serviciosTocados: number } {
  let aplicados = 0;
  let serviciosTocados = 0;

  const salida = servicios.map((s) => {
    const delServicio = complementos[s.id];
    if (!delServicio) return s;

    const copia: Service = { ...s };
    let tocado = false;

    for (const campo of Object.keys(delServicio) as ClaveComplementable[]) {
      const valor = delServicio[campo];
      if (estaVacio(valor)) continue;
      if (!estaVacio((copia as unknown as Record<string, unknown>)[campo])) continue; // la API manda

      (copia as unknown as Record<string, unknown>)[campo] = valor;
      aplicados++;
      tocado = true;
    }

    if (!tocado) return s;
    serviciosTocados++;

    // Recalcular lo derivado: si se completó in/out planta, la estadía existe.
    const inP = copia.inPlanta ? new Date(copia.inPlanta) : null;
    const outP = copia.outPlanta ? new Date(copia.outPlanta) : null;
    if (inP && outP && !isNaN(inP.getTime()) && !isNaN(outP.getTime())) {
      copia.horasEstadia = Math.max(0, (outP.getTime() - inP.getTime()) / 3600000);
    }

    const ret = copia.fechaRetiro ? new Date(copia.fechaRetiro) : null;
    const pres = copia.fechaPresentacion ? new Date(copia.fechaPresentacion) : null;
    if (ret && pres && !isNaN(ret.getTime()) && !isNaN(pres.getTime())) {
      copia.diasAlmacenaje = Math.max(0, Math.round((pres.getTime() - ret.getTime()) / 86400000));
    }

    return copia;
  });

  return { servicios: salida, aplicados, serviciosTocados };
}

/** Campos que este servicio tiene vacíos y se podrían complementar. */
export function camposFaltantes(servicio: Service): CampoComplementable[] {
  return CAMPOS_COMPLEMENTABLES.filter((c) =>
    estaVacio((servicio as unknown as Record<string, unknown>)[c.key]),
  );
}

/**
 * Reglas que vuelven a ser evaluables porque el complemento aportó su dato en
 * al menos un servicio. Se usa para no apagarlas del todo.
 */
export function reglasRehabilitadas(complementos: Complementos): Set<string> {
  const porCampo: Record<string, string[]> = {
    inPlanta: ['R_GEN_05'],
    outPlanta: ['R_GEN_05'],
    pesoKg: ['R_GEN_02', 'R_GEN_03'],
    modalidad: ['R_GEN_04'],
    puerto: ['R_IMP_02', 'R_EXP_02'],
    fechaStacking: ['R_EXP_01'],
    corteDocumental: ['R_EXP_01'],
    fechaRetiro: ['R_EXC_02', 'R_LIQ_03'],
    fechaPresentacion: ['R_EXC_02', 'R_LIQ_03'],
  };

  const reglas = new Set<string>();
  for (const delServicio of Object.values(complementos)) {
    for (const campo of Object.keys(delServicio)) {
      for (const r of porCampo[campo] ?? []) reglas.add(r);
    }
  }
  return reglas;
}
