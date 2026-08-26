import { Agreement, SystemSettings } from '../types';

/**
 * La matriz comercial arranca vacía: los clientes vienen de la API y el equipo
 * carga sus acuerdos contra esos clientes reales. Una matriz de ejemplo tendría
 * ids que nunca cruzarían con los del reporte.
 */
export const initialAgreements: Agreement[] = [];

export const defaultSettings: SystemSettings = {
  toleranciaAbsolutaClp: 25000, // $25.000 CLP
  toleranciaAbsolutaUsd: 25000, // Retrocompatible
  toleranciaPorcentaje: 2,
  puntoEvaluacionEstado: 'confirmado',
  margenMinimoGlobal: 0.18, // 18% objetivo según PRD
  umbralHorasEstadia: 4, // 4 horas para R-GEN-05
  umbralDiasAlmacenaje: 2, // 2 días para R-EXC-02 y R-LIQ-03
  topePesoKg: 25000, // 25.000 kg para R-GEN-03
  reglasActivas: {
    // 5.1 Generales
    R_GEN_01: true,
    R_GEN_02: true,
    R_GEN_03: true,
    R_GEN_04: true,
    R_GEN_05: true,
    // 5.2 Importación
    R_IMP_01: true,
    R_IMP_02: true,
    // 5.3 Exportación
    R_EXP_01: true,
    R_EXP_02: true,
    // 5.4 Extra costos
    R_EXC_01: true,
    R_EXC_02: true,
    R_EXC_03: true,
    R_EXC_04: true,
    // 5.5 Incidencias
    R_INC_01: true,
    // 5.6 Liquidación y cierre
    R_LIQ_01: true,
    R_LIQ_02: true,
    R_LIQ_03: true,
    // Matriz Comercial & Catálogo
    conceptoFaltante: true,
    valorFueraTarifa: true,
    costoSinVenta: true,
    ventaSinCosto: true,
    monedaDistinta: true,
    margenBajoMinimo: true,
  },
};
