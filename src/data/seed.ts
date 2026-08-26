import { Client, Agreement, Service, SystemSettings } from '../types';

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

export const initialClients: Client[] = [
  { 
    id: 'CLI-001', 
    nombre: 'Importadora Andes S.A.', 
    ejecutivo: 'Rodrigo Morales', 
    rut: '76.432.110-8', 
    tieneMatriz: true,
    margenObjetivo: 0.18,
    direccionesRegistradas: [
      'Av. Américo Vespucio 1400, Pudahuel',
      'Camino a Lampa 450, Lampa',
      'Av. Los Conquistadores 2800, Providencia'
    ]
  },
  { 
    id: 'CLI-002', 
    nombre: 'Minera del Sur SpA', 
    ejecutivo: 'Camila Valenzuela', 
    rut: '96.882.340-K', 
    tieneMatriz: true,
    margenObjetivo: 0.20,
    direccionesRegistradas: ['Faena Mina Sur, Km 45, Calama']
  },
  { 
    id: 'CLI-003', 
    nombre: 'Frutícola Valparaíso Ltda.', 
    ejecutivo: 'Gonzalo Tapia', 
    rut: '78.102.990-4', 
    tieneMatriz: true,
    margenObjetivo: 0.16,
    direccionesRegistradas: [
      'Packing San Pedro, Hijuelas',
      'Frigorífico Aconcagua, San Felipe'
    ]
  },
  { 
    id: 'CLI-004', 
    nombre: 'Retail Transandino Corp', 
    ejecutivo: 'Rodrigo Morales', 
    rut: '99.510.220-1', 
    tieneMatriz: true,
    margenObjetivo: 0.18,
    direccionesRegistradas: ['Centro de Distribución Lo Boza, Renca']
  },
  { 
    id: 'CLI-005', 
    nombre: 'Distribuidora BioBío Ltda.', 
    ejecutivo: 'Camila Valenzuela', 
    rut: '77.340.100-3', 
    tieneMatriz: true,
    margenObjetivo: 0.15,
    direccionesRegistradas: ['Parque Industrial Coronel, Lote 4B']
  },
  { 
    id: 'CLI-006', 
    nombre: 'Agroservicios del Pacífico', 
    ejecutivo: 'Gonzalo Tapia', 
    rut: '81.200.330-7', 
    tieneMatriz: false 
  },
  { 
    id: 'CLI-007', 
    nombre: 'FULTER LOGISTICS CHILE SPA', 
    ejecutivo: 'Rodrigo Morales', 
    rut: '76.102.390-1', 
    tieneMatriz: true,
    margenObjetivo: 0.18 
  },
  { 
    id: 'CLI-008', 
    nombre: 'NOWPORTS CHILE SPA', 
    ejecutivo: 'Camila Valenzuela', 
    rut: '77.890.120-K', 
    tieneMatriz: true,
    margenObjetivo: 0.15 
  },
  { 
    id: 'CLI-009', 
    nombre: 'TOTAL LOGISTICS SPA', 
    ejecutivo: 'Gonzalo Tapia', 
    rut: '76.990.810-5', 
    tieneMatriz: true,
    margenObjetivo: 0.18 
  },
];

export const initialAgreements: Agreement[] = [
  {
    id: 'ACU-014',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    tipoContenedor: '40HC',
    vigenciaDesde: '2026-01-01',
    vigenciaHasta: '2026-12-31',
    moneda: 'CLP',
    margenMinimo: 0.18,
    estado: 'vigente',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'FLETE_COSTO', nombre: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'GATEIN', nombre: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'GATEIN_COSTO', nombre: 'Gate in costo', tipo: 'costo', valor: 650000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'BL', nombre: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP', unidad: 'bl', obligatorio: true },
      { codigo: 'THC', nombre: 'THC destino', tipo: 'venta', valor: 180000, moneda: 'CLP', unidad: 'contenedor', obligatorio: false },
    ],
  },
  {
    id: 'ACU-019',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ruta: { origen: 'NGB (Ningbo)', destino: 'VAL (Valparaíso)' },
    tipoContenedor: '20ST',
    vigenciaDesde: '2026-02-01',
    vigenciaHasta: '2026-12-31',
    moneda: 'CLP',
    margenMinimo: 0.20,
    estado: 'vigente',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Flete marítimo 20ST', tipo: 'venta', valor: 1650000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'FLETE_COSTO', nombre: 'Flete marítimo costo', tipo: 'costo', valor: 1250000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'BL', nombre: 'Emisión Documento BL', tipo: 'venta', valor: 320000, moneda: 'CLP', unidad: 'bl', obligatorio: true },
      { codigo: 'BAF', nombre: 'BAF Ajuste Combustible', tipo: 'venta', valor: 280000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'BAF_COSTO', nombre: 'BAF costo', tipo: 'costo', valor: 210000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
    ],
  },
  {
    id: 'ACU-008',
    clienteId: 'CLI-003',
    clienteNombre: 'Frutícola Valparaíso Ltda.',
    ruta: { origen: 'SAI (San Antonio)', destino: 'MIA (Miami)' },
    tipoContenedor: 'REEFER',
    vigenciaDesde: '2025-06-01',
    vigenciaHasta: '2026-05-31', // Vencido
    moneda: 'CLP',
    margenMinimo: 0.15,
    estado: 'vencido',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Flete Reefer', tipo: 'venta', valor: 3800000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'FLETE_COSTO', nombre: 'Flete Reefer costo', tipo: 'costo', valor: 3100000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'CONEXION', nombre: 'Conexión Reefer Puerto', tipo: 'venta', valor: 420000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'BL', nombre: 'Emisión Documento BL', tipo: 'venta', valor: 380000, moneda: 'CLP', unidad: 'bl', obligatorio: true },
    ],
  },
  {
    id: 'ACU-022',
    clienteId: 'CLI-004',
    clienteNombre: 'Retail Transandino Corp',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    tipoContenedor: '40HC',
    vigenciaDesde: '2026-03-01',
    vigenciaHasta: '2026-11-30',
    moneda: 'CLP',
    margenMinimo: 0.16,
    estado: 'por_vencer',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Flete marítimo 40HC', tipo: 'venta', valor: 2400000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'FLETE_COSTO', nombre: 'Flete marítimo costo', tipo: 'costo', valor: 1900000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'GATEIN', nombre: 'Gate in puerto', tipo: 'venta', valor: 950000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'BL', nombre: 'Emisión BL', tipo: 'venta', valor: 350000, moneda: 'CLP', unidad: 'bl', obligatorio: true },
    ],
  },
  {
    id: 'ACU-030',
    clienteId: 'CLI-007',
    clienteNombre: 'FULTER LOGISTICS CHILE SPA',
    ruta: { origen: 'MVD', destino: 'BCN' },
    tipoContenedor: '40HC',
    vigenciaDesde: '2026-01-01',
    vigenciaHasta: '2026-12-31',
    moneda: 'CLP',
    margenMinimo: 0.18,
    estado: 'vigente',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Tarifa Flete Local', tipo: 'venta', valor: 1900000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'TRANSP_COSTO', nombre: 'Costo Transporte Terrestre', tipo: 'costo', valor: 1300000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
    ],
  },
  {
    id: 'ACU-031',
    clienteId: 'CLI-008',
    clienteNombre: 'NOWPORTS CHILE SPA',
    ruta: { origen: 'VALPARAISO', destino: 'SAN BERNARDO' },
    tipoContenedor: '40HC',
    vigenciaDesde: '2026-01-01',
    vigenciaHasta: '2026-12-31',
    moneda: 'CLP',
    margenMinimo: 0.15,
    estado: 'vigente',
    conceptos: [
      { codigo: 'FLETE', nombre: 'Tarifa Transporte Terrestre', tipo: 'venta', valor: 369000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
      { codigo: 'TRANSP_COSTO', nombre: 'Costo Transporte Chofer', tipo: 'costo', valor: 320000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
    ],
  },
];

export function generateSeedServices(): Service[] {
  const services: Service[] = [];

  // PROYECCION DE CARGA SERVICES (Directly modeled from screenshot)
  // Reg 25944
  services.push({
    id: 'REG-25944',
    clienteId: 'CLI-001',
    clienteNombre: 'HILLEBRAND GORI CHILE LTDA.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'BODEGA MONTES', destino: 'VALPARAISO (TPS)' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-13',
    lineas: [
      // NO SALE CARGED! Only zero cost or pending
    ],
    proyeccion: {
      numReg: 25944,
      tipoServ: 'DIRECTO',
      mandante: 'VIÑA MONTES',
      planta: 'BODEGA MONTES, RUTA 5 SUR KM 149, CHIMBARONGO',
      retiro: '13/07/2026 00:00',
      presen: '20/07/2026 08:00',
      modal: 'EXPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 30,
      eta: '13/07/2026',
      puerto: 'VALPARAISO (TPS)',
      nave: 'MSC EMILIA',
      numContenedor: '***',
      peso: 2070,
      sello: '-',
      tara: 0,
      referencia: 'OS N° 36017',
      tarifaPactadaClp: 671580,
      costoTransporteClp: 0,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26068
  services.push({
    id: 'REG-26068',
    clienteId: 'CLI-007',
    clienteNombre: 'FULTER LOGISTICS CHILE SPA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'HGT VAP', destino: 'LA SERENA' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-17',
    lineas: [
      { id: 'p68_1', codigo: 'FLETE', nombreConcepto: 'Tarifa Flete Local', tipo: 'venta', valor: 1900000, moneda: 'CLP' },
      { id: 'p68_2', codigo: 'TRANSP_COSTO', nombreConcepto: 'Costo Transporte Terrestre', tipo: 'costo', valor: 1300000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26068,
      tipoServ: 'DIRECTO',
      mandante: 'ASCENSORES OTIS',
      planta: 'AVENIDA CUATRO ESQUINAS 1500, LA SERENA',
      retiro: '17/07/2026 00:00',
      presen: '27/07/2026 15:00',
      modal: 'LCL',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 26,
      eta: '17/07/2026',
      puerto: 'HGT VAP',
      nave: '-',
      numContenedor: 'PARTES DE ASCENSORES',
      peso: 0,
      sello: '-',
      tara: 0,
      referencia: '633',
      tarifaPactadaClp: 1900000,
      costoTransporteClp: 1300000,
      ventaAdicClp: 0,
      tieneVentaCargada: true
    }
  });

  // Reg 26069
  services.push({
    id: 'REG-26069',
    clienteId: 'CLI-007',
    clienteNombre: 'FULTER LOGISTICS CHILE SPA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'HGT VAP', destino: 'LA SERENA' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-17',
    lineas: [
      { id: 'p69_1', codigo: 'FLETE', nombreConcepto: 'Tarifa Flete Local', tipo: 'venta', valor: 1900000, moneda: 'CLP' },
      { id: 'p69_2', codigo: 'TRANSP_COSTO', nombreConcepto: 'Costo Transporte Terrestre', tipo: 'costo', valor: 1300000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26069,
      tipoServ: 'DIRECTO',
      mandante: 'ASCENSORES OTIS',
      planta: 'AVENIDA CUATRO ESQUINAS 1500, LA SERENA',
      retiro: '17/07/2026 00:00',
      presen: '29/07/2026 00:00',
      modal: 'LCL',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 26,
      eta: '17/07/2026',
      puerto: 'HGT VAP',
      nave: '-',
      numContenedor: 'PARTES DE ASCENSORES',
      peso: 0,
      sello: '-',
      tara: 0,
      referencia: '-',
      tarifaPactadaClp: 1900000,
      costoTransporteClp: 1300000,
      ventaAdicClp: 0,
      tieneVentaCargada: true
    }
  });

  // Reg 26303
  services.push({
    id: 'REG-26303',
    clienteId: 'CLI-001',
    clienteNombre: 'QUALITY RUBBER S.A',
    ejecutivo: 'Gonzalo Tapia',
    ruta: { origen: 'PUERTO CENTRAL', destino: 'QUILICURA' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-25',
    lineas: [],
    proyeccion: {
      numReg: 26303,
      tipoServ: 'IMPOD',
      mandante: 'QUALITY RUBBER',
      planta: 'AV. AMERICO VESPUCIO #1001, QUILICURA',
      retiro: 'PENDIENTE',
      presen: 'PENDIENTE',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 18,
      eta: '25/07/2026',
      puerto: 'PUERTO CENTRAL',
      nave: 'EDISON',
      numContenedor: 'DFSU1238020',
      peso: 18780,
      sello: '0',
      tara: 0,
      referencia: '1802-2026',
      tarifaPactadaClp: 362500,
      costoTransporteClp: 0,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26442 (MISSING SALE WITH COST LOADED!)
  services.push({
    id: 'REG-26442',
    clienteId: 'CLI-008',
    clienteNombre: 'NOWPORTS CHILE SPA',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'VALPARAISO (TPS)', destino: 'SAN BERNARDO' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-01',
    lineas: [
      { id: 'p442_1', codigo: 'TRANSP_COSTO', nombreConcepto: 'Costo Transporte Terrestre', tipo: 'costo', valor: 320000, moneda: 'CLP' }
      // NO VENTA!
    ],
    proyeccion: {
      numReg: 26442,
      tipoServ: 'DIRECTO',
      mandante: 'CALVAC',
      planta: 'SANTA MARGARITA 01830, SAN BERNARDO. SANTIAGO',
      retiro: 'PENDIENTE',
      presen: 'PENDIENTE',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 11,
      eta: '01/08/2026',
      puerto: 'VALPARAISO (TPS)',
      nave: 'ITAJAI EXPRESS',
      numContenedor: 'HLBU6094892',
      peso: 8780,
      sello: '0',
      tara: 0,
      referencia: '39359',
      tarifaPactadaClp: 369000,
      costoTransporteClp: 320000,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26443 (MISSING SALE WITH COST LOADED!)
  services.push({
    id: 'REG-26443',
    clienteId: 'CLI-008',
    clienteNombre: 'NOWPORTS CHILE SPA',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'VALPARAISO (TPS)', destino: 'SAN BERNARDO' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-01',
    lineas: [
      { id: 'p443_1', codigo: 'TRANSP_COSTO', nombreConcepto: 'Costo Transporte Terrestre', tipo: 'costo', valor: 320000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26443,
      tipoServ: 'DIRECTO',
      mandante: 'CALVAC',
      planta: 'SANTA MARGARITA 01830, SAN BERNARDO. SANTIAGO',
      retiro: 'PENDIENTE',
      presen: 'PENDIENTE',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 11,
      eta: '01/08/2026',
      puerto: 'VALPARAISO (TPS)',
      nave: 'ITAJAI EXPRESS',
      numContenedor: 'HLBU6133962',
      peso: 3345,
      sello: '0',
      tara: 0,
      referencia: '39359',
      tarifaPactadaClp: 369000,
      costoTransporteClp: 320000,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26479
  services.push({
    id: 'REG-26479',
    clienteId: 'CLI-002',
    clienteNombre: 'FR. MEYERS SOHN LOGISTICA SPA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'PUERTO CENTRAL', destino: 'SANTIAGO' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-29',
    lineas: [],
    proyeccion: {
      numReg: 26479,
      tipoServ: 'DIRECTO',
      mandante: 'AMPACET',
      planta: 'SANTA FLORENCIA NRO. 910 PARQUE INDUSTRIAL ESTRELLA DEL SUR',
      retiro: 'PENDIENTE',
      presen: 'PENDIENTE',
      modal: 'EXPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 14,
      eta: '29/07/2026',
      puerto: 'PUERTO CENTRAL',
      nave: 'Istanbul Express',
      numContenedor: '***',
      peso: 25000,
      sello: '-',
      tara: 0,
      referencia: '6508857350',
      tarifaPactadaClp: 385000,
      costoTransporteClp: 0,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26487
  services.push({
    id: 'REG-26487',
    clienteId: 'CLI-009',
    clienteNombre: 'TOTAL LOGISTICS SPA',
    ejecutivo: 'Gonzalo Tapia',
    ruta: { origen: 'VALPARAISO (TPS)', destino: 'PEDRO AGUIRRE CERDA' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-07-21',
    lineas: [],
    proyeccion: {
      numReg: 26487,
      tipoServ: 'DIRECTO',
      mandante: 'MILLED SPA',
      planta: 'TRASLAVIÑA 1999, PEDRO AGUIRRE CERDA',
      retiro: '30/07/2026 00:00',
      presen: '30/07/2026 00:00',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 22,
      eta: '21/07/2026',
      puerto: 'VALPARAISO (TPS)',
      nave: 'EVER LUCENT',
      numContenedor: 'YMLU3564672',
      peso: 2455,
      sello: '-',
      tara: 0,
      referencia: 'S00004380',
      tarifaPactadaClp: 428000,
      costoTransporteClp: 0,
      ventaAdicClp: 0,
      tieneVentaCargada: false
    }
  });

  // Reg 26501
  services.push({
    id: 'REG-26501',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'STI SAN ANTONIO', destino: 'SANTIAGO (PUDAHUEL)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-03',
    lineas: [
      { id: 'p501_1', codigo: 'FLETE', nombreConcepto: 'Flete Marítimo Base', tipo: 'venta', valor: 2200000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26501,
      tipoServ: 'IMPOD',
      mandante: 'IMPORTADORA ANDES',
      planta: 'BODEGA CENTRO LOGISTICO PUDAHUEL',
      retiro: '05/08/2026 08:00',
      presen: '05/08/2026 14:00',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 9,
      eta: '03/08/2026',
      puerto: 'STI SAN ANTONIO',
      nave: 'CMA CGM JEAN GABRIEL',
      numContenedor: 'CMAU9821034',
      peso: 19400,
      sello: 'SL-8842',
      tara: 3800,
      referencia: 'IMP-8820',
      tarifaPactadaClp: 2200000,
      costoTransporteClp: 1750000,
      ventaAdicClp: 150000,
      tieneVentaCargada: true
    }
  });

  // Reg 26502
  services.push({
    id: 'REG-26502',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'STI SAN ANTONIO', destino: 'SANTIAGO (PUDAHUEL)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-03',
    lineas: [
      { id: 'p502_1', codigo: 'FLETE', nombreConcepto: 'Flete Marítimo Base', tipo: 'venta', valor: 2200000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26502,
      tipoServ: 'IMPOD',
      mandante: 'IMPORTADORA ANDES',
      planta: 'BODEGA CENTRO LOGISTICO PUDAHUEL',
      retiro: '06/08/2026 08:00',
      presen: '06/08/2026 14:00',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 9,
      eta: '03/08/2026',
      puerto: 'STI SAN ANTONIO',
      nave: 'CMA CGM JEAN GABRIEL',
      numContenedor: 'CMAU9821099',
      peso: 18900,
      sello: 'SL-8843',
      tara: 3800,
      referencia: 'IMP-8821',
      tarifaPactadaClp: 2200000,
      costoTransporteClp: 1750000,
      ventaAdicClp: 0,
      tieneVentaCargada: true
    }
  });

  // Reg 26510
  services.push({
    id: 'REG-26510',
    clienteId: 'CLI-003',
    clienteNombre: 'Frutícola Valparaíso Ltda.',
    ejecutivo: 'Gonzalo Tapia',
    ruta: { origen: 'LIRQUEN', destino: 'TALCAHUANO' },
    contenedores: [{ tipo: 'REEFER', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-10',
    lineas: [],
    proyeccion: {
      numReg: 26510,
      tipoServ: 'EXPOD',
      mandante: 'FRUTICOLA VALPARAISO',
      planta: 'PACKING SAN PEDRO, CORONEL',
      retiro: '12/08/2026 06:00',
      presen: '12/08/2026 18:00',
      modal: 'EXPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: 2,
      eta: '10/08/2026',
      puerto: 'LIRQUEN',
      nave: 'MSC FLORENTINA',
      numContenedor: 'MSCU7741029',
      peso: 22000,
      sello: 'MS-1102',
      tara: 4200,
      referencia: 'EXP-4410',
      tarifaPactadaClp: 1850000,
      costoTransporteClp: 1400000,
      ventaAdicClp: 120000,
      tieneVentaCargada: false
    }
  });

  // Reg 26522
  services.push({
    id: 'REG-26522',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'IQUIQUE (ITI)', destino: 'CALAMA' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'proyeccion',
    fechaCreacion: '2026-08-15',
    lineas: [
      { id: 'p522_1', codigo: 'FLETE', nombreConcepto: 'Flete Minero 20ST', tipo: 'venta', valor: 1450000, moneda: 'CLP' }
    ],
    proyeccion: {
      numReg: 26522,
      tipoServ: 'DIRECTO',
      mandante: 'MINERA DEL SUR',
      planta: 'FAENA CHUQUICAMATA, CALAMA',
      retiro: '17/08/2026 08:00',
      presen: '18/08/2026 12:00',
      modal: 'IMPOD',
      estAct: 'PROYECCION DE CARGA',
      estSgte: 'EN COORDINACION',
      dias: -3,
      eta: '15/08/2026',
      puerto: 'IQUIQUE (ITI)',
      nave: 'MSC ORSOLA',
      numContenedor: 'MEDU4491022',
      peso: 26000,
      sello: 'MO-9901',
      tara: 2300,
      referencia: 'MIN-0092',
      tarifaPactadaClp: 1450000,
      costoTransporteClp: 1100000,
      ventaAdicClp: 0,
      tieneVentaCargada: true
    }
  });

  // STANDARD EVALUATED SERVICES (10 Specific DEVIATION TEST CASES IN CLP)

  // 1. Concepto Faltante: CLI-001 (Gate in missing from sale)
  services.push({
    id: 'SRV-24871',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-01',
    lineas: [
      { id: 'l1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l3', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
      // MISSING GATEIN sale ($850.000 CLP)
    ],
  });

  // 2. Valor fuera de tarifa
  services.push({
    id: 'SRV-24872',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-02',
    lineas: [
      { id: 'l1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 1800000, moneda: 'CLP' }, // Matriz = 2200000 -> -$400.000
      { id: 'l2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l4', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ],
  });

  // 3. Costo sin venta asociada
  services.push({
    id: 'SRV-24873',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'NGB (Ningbo)', destino: 'VAL (Valparaíso)' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'en_transito',
    fechaCreacion: '2026-08-03',
    lineas: [
      { id: 'l1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 20ST', tipo: 'venta', valor: 1650000, moneda: 'CLP' },
      { id: 'l2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1250000, moneda: 'CLP' },
      { id: 'l3', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 320000, moneda: 'CLP' },
      { id: 'l4', codigo: 'BAF', nombreConcepto: 'BAF Ajuste Combustible', tipo: 'venta', valor: 280000, moneda: 'CLP' },
      { id: 'l5', codigo: 'BAF_COSTO', nombreConcepto: 'BAF costo', tipo: 'costo', valor: 210000, moneda: 'CLP' },
      { id: 'l6', codigo: 'EXTRA_STORAGE_COSTO', nombreConcepto: 'Sobreestadía Puerto Extra', tipo: 'costo', valor: 480000, moneda: 'CLP' }, // Costo sin venta
    ],
  });

  // 4. Venta sin costo asociada en servicio cerrado
  services.push({
    id: 'SRV-24874',
    clienteId: 'CLI-004',
    clienteNombre: 'Retail Transandino Corp',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'cerrado',
    fechaCreacion: '2026-07-15',
    lineas: [
      { id: 'l1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 40HC', tipo: 'venta', valor: 2400000, moneda: 'CLP' },
      // MISSING FLETE_COSTO ($1.900.000)
      { id: 'l2', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 950000, moneda: 'CLP' },
      { id: 'l3', codigo: 'BL', nombreConcepto: 'Emisión BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ],
  });

  // 5. Moneda no estándar / Error de homologación
  services.push({
    id: 'SRV-24875',
    clienteId: 'CLI-005',
    clienteNombre: 'Distribuidora BioBío Ltda.',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'HAM (Hamburgo)', destino: 'VAL (Valparaíso)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-04',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 19500,
    puerto: 'TPS VALPARAISO',
    nave: 'MSC FLORENTINA',
    depositoVacio: 'MEDLOG VALPARAISO',
    lineas: [
      { id: 'l1', codigo: 'NO_CATALOGO_EUR_FLETE', nombreConcepto: 'Flete Europa 40HC Tarifa No Homologada', tipo: 'venta', valor: 2600000, moneda: 'CLP' },
      { id: 'l2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete Europa costo', tipo: 'costo', valor: 1950000, moneda: 'CLP' },
      { id: 'l3', codigo: 'THC', nombreConcepto: 'THC origen', tipo: 'venta', valor: 220000, moneda: 'CLP' },
      { id: 'l4', codigo: 'BL', nombreConcepto: 'BL Express Release', tipo: 'venta', valor: 380000, moneda: 'CLP' },
    ],
  });

  // 6. Margen bajo el mínimo (R-LIQ-01)
  services.push({
    id: 'SRV-24876',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'NGB (Ningbo)', destino: 'VAL (Valparaíso)' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-05',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 21000,
    puerto: 'TPS VALPARAISO',
    nave: 'MSC ORSOLA',
    depositoVacio: 'SITRANS VALPARAISO',
    lineas: [
      { id: 'l1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 20ST', tipo: 'venta', valor: 1650000, moneda: 'CLP' },
      { id: 'l2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1600000, moneda: 'CLP' }, // Margen ~3% vs 20%
      { id: 'l3', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 320000, moneda: 'CLP' },
      { id: 'l4', codigo: 'BAF', nombreConcepto: 'BAF Ajuste Combustible', tipo: 'venta', valor: 280000, moneda: 'CLP' },
      { id: 'l5', codigo: 'BAF_COSTO', nombreConcepto: 'BAF costo', tipo: 'costo', valor: 275000, moneda: 'CLP' },
    ],
  });

  // 7. R-GEN-02: Control de Peso (Peso 0 o en blanco)
  services.push({
    id: 'SRV-24881',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-06',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 0, // ERROR: Peso en blanco o 0 (R-GEN-02)
    puerto: 'STI SAN ANTONIO',
    nave: 'CMA CGM JEAN GABRIEL',
    depositoVacio: 'MEDLOG SAN ANTONIO',
    lineas: [
      { id: 'l81_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l81_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l81_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l81_4', codigo: 'GATEIN_COSTO', nombreConcepto: 'Gate in costo', tipo: 'costo', valor: 650000, moneda: 'CLP' },
      { id: 'l81_5', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // 8. R-GEN-03: Sobrepeso (> 25.000 kg)
  services.push({
    id: 'SRV-24882',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'NGB (Ningbo)', destino: 'VAL (Valparaíso)' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'en_transito',
    fechaCreacion: '2026-08-07',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 28650, // ERROR: Sobrepeso 28.65 t > 25 t (R-GEN-03)
    puerto: 'VALPARAISO TPS',
    nave: 'MSC ORSOLA',
    depositoVacio: 'SITRANS VALPARAISO',
    lineas: [
      { id: 'l82_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 20ST', tipo: 'venta', valor: 1650000, moneda: 'CLP' },
      { id: 'l82_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1250000, moneda: 'CLP' },
      { id: 'l82_3', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 320000, moneda: 'CLP' },
      { id: 'l82_4', codigo: 'BAF', nombreConcepto: 'BAF Ajuste Combustible', tipo: 'venta', valor: 280000, moneda: 'CLP' },
      { id: 'l82_5', codigo: 'BAF_COSTO', nombreConcepto: 'BAF costo', tipo: 'costo', valor: 210000, moneda: 'CLP' },
    ]
  });

  // 9. R-GEN-04: Modalidad de servicio vacía / sin definir
  services.push({
    id: 'SRV-24883',
    clienteId: 'CLI-004',
    clienteNombre: 'Retail Transandino Corp',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-08',
    tipoOperacion: 'importacion',
    modalidad: 'sin_definir', // ERROR: Modalidad vacía (R-GEN-04)
    pesoKg: 19800,
    puerto: 'PUERTO CENTRAL SAN ANTONIO',
    nave: 'EVER LUCENT',
    depositoVacio: 'CONTECON SAN ANTONIO',
    lineas: [
      { id: 'l83_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 40HC', tipo: 'venta', valor: 2400000, moneda: 'CLP' },
      { id: 'l83_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1900000, moneda: 'CLP' },
      { id: 'l83_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 950000, moneda: 'CLP' },
      { id: 'l83_4', codigo: 'BL', nombreConcepto: 'Emisión BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // 10. R-GEN-05: Estadía excedida (> 4 horas)
  services.push({
    id: 'SRV-24884',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'en_transito',
    fechaCreacion: '2026-08-08',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 18500,
    puerto: 'STI SAN ANTONIO',
    nave: 'CMA CGM JEAN GABRIEL',
    depositoVacio: 'MEDLOG SAN ANTONIO',
    inPlanta: '2026-08-08 07:30',
    outPlanta: '2026-08-08 16:45',
    horasEstadia: 9.25, // ERROR: Estadía 9.25 horas > 4 horas (R-GEN-05)
    lineas: [
      { id: 'l84_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l84_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l84_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l84_4', codigo: 'GATEIN_COSTO', nombreConcepto: 'Gate in costo', tipo: 'costo', valor: 650000, moneda: 'CLP' },
      { id: 'l84_5', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // 11. R-IMP-01: Validación de direcciones (múltiples direcciones -> Dirección por Confirmar)
  services.push({
    id: 'SRV-24885',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-09',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 19100,
    puerto: 'STI SAN ANTONIO',
    nave: 'ITAJAI EXPRESS',
    depositoVacio: 'MEDLOG SAN ANTONIO',
    direccionPlanta: 'Av. Américo Vespucio 1400 / Camino a Lampa',
    direccionPorConfirmar: true, // ERROR: Múltiples direcciones históricas (R-IMP-01)
    lineas: [
      { id: 'l85_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l85_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l85_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l85_4', codigo: 'GATEIN_COSTO', nombreConcepto: 'Gate in costo', tipo: 'costo', valor: 650000, moneda: 'CLP' },
      { id: 'l85_5', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // 12. R-IMP-02: Campos obligatorios Importación (falta depósito vacío)
  services.push({
    id: 'SRV-24886',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-09',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 20000,
    puerto: 'STI SAN ANTONIO',
    nave: 'ITAJAI EXPRESS',
    depositoVacio: '', // ERROR: Depósito vacío faltante (R-IMP-02)
    lineas: [
      { id: 'l86_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l86_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l86_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l86_4', codigo: 'GATEIN_COSTO', nombreConcepto: 'Gate in costo', tipo: 'costo', valor: 650000, moneda: 'CLP' },
      { id: 'l86_5', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // 13. R-EXP-01: Control de Stacking / Corte Documental en Exportación
  services.push({
    id: 'SRV-24887',
    clienteId: 'CLI-003',
    clienteNombre: 'Frutícola Valparaíso Ltda.',
    ejecutivo: 'Gonzalo Tapia',
    ruta: { origen: 'SAI (San Antonio)', destino: 'MIA (Miami)' },
    contenedores: [{ tipo: 'REEFER', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-10',
    tipoOperacion: 'exportacion',
    modalidad: 'directo',
    pesoKg: 21500,
    puerto: 'STI SAN ANTONIO',
    nave: 'MSC FLORENTINA',
    depositoRetiro: 'DYC VALPARAISO',
    fechaStacking: '', // ERROR: Fecha Stacking faltante (R-EXP-01)
    corteDocumental: '', // ERROR: Corte documental faltante
    lineas: [
      { id: 'l87_1', codigo: 'FLETE', nombreConcepto: 'Flete Reefer', tipo: 'venta', valor: 3800000, moneda: 'CLP' },
      { id: 'l87_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete Reefer costo', tipo: 'costo', valor: 3100000, moneda: 'CLP' },
      { id: 'l87_3', codigo: 'CONEXION', nombreConcepto: 'Conexión Reefer Puerto', tipo: 'venta', valor: 420000, moneda: 'CLP' },
      { id: 'l87_4', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 380000, moneda: 'CLP' },
    ]
  });

  // 14. R-EXC-01 & R-EXC-02 & R-LIQ-03: Servicio Diferido sin Extra Costo de Almacenaje (> 2 días)
  services.push({
    id: 'SRV-24888',
    clienteId: 'CLI-001',
    clienteNombre: 'Importadora Andes S.A.',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-10',
    tipoOperacion: 'importacion',
    modalidad: 'diferido', // DIFERIDO
    fechaRetiro: '2026-08-04',
    fechaPresentacion: '2026-08-09',
    diasAlmacenaje: 5, // 5 días > 2 días
    pesoKg: 19400,
    puerto: 'STI SAN ANTONIO',
    nave: 'CMA CGM JEAN GABRIEL',
    depositoVacio: 'MEDLOG SAN ANTONIO',
    lineas: [
      { id: 'l88_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo base', tipo: 'venta', valor: 2200000, moneda: 'CLP' },
      { id: 'l88_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1750000, moneda: 'CLP' },
      { id: 'l88_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 850000, moneda: 'CLP' },
      { id: 'l88_4', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
      // ERROR: No tiene línea de extra costo ALMACENAJE (R-EXC-01) y días > 2 (R-EXC-02 / R-LIQ-03)
    ]
  });

  // 15. R-EXC-04 & R-LIQ-02: Atributos Especiales (IMO / Cuadrilla) sin líneas de venta y costo asociadas
  services.push({
    id: 'SRV-24889',
    clienteId: 'CLI-002',
    clienteNombre: 'Minera del Sur SpA',
    ejecutivo: 'Camila Valenzuela',
    ruta: { origen: 'NGB (Ningbo)', destino: 'VAL (Valparaíso)' },
    contenedores: [{ tipo: '20ST', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-11',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 22500,
    puerto: 'VALPARAISO TPS',
    nave: 'MSC ORSOLA',
    depositoVacio: 'SITRANS VALPARAISO',
    atributosEspeciales: {
      imo: true, // ERROR: Marcado como IMO pero no tiene líneas de IMO venta/costo cargadas (R-LIQ-02)
      cuadrillas: true // ERROR: Marcado con Cuadrillas sin línea de costo/venta de cuadrilla
    },
    lineas: [
      { id: 'l89_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 20ST', tipo: 'venta', valor: 1650000, moneda: 'CLP' },
      { id: 'l89_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1250000, moneda: 'CLP' },
      { id: 'l89_3', codigo: 'BL', nombreConcepto: 'Emisión Documento BL', tipo: 'venta', valor: 320000, moneda: 'CLP' },
      { id: 'l89_4', codigo: 'BAF', nombreConcepto: 'BAF Ajuste Combustible', tipo: 'venta', valor: 280000, moneda: 'CLP' },
      { id: 'l89_5', codigo: 'BAF_COSTO', nombreConcepto: 'BAF costo', tipo: 'costo', valor: 210000, moneda: 'CLP' },
    ]
  });

  // 16. R-INC-01: Control cruzado de incidencias (Falso Flete / Multa no cobrada)
  services.push({
    id: 'SRV-24890',
    clienteId: 'CLI-004',
    clienteNombre: 'Retail Transandino Corp',
    ejecutivo: 'Rodrigo Morales',
    ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
    contenedores: [{ tipo: '40HC', cantidad: 1 }],
    estado: 'confirmado',
    fechaCreacion: '2026-08-11',
    tipoOperacion: 'importacion',
    modalidad: 'directo',
    pesoKg: 19200,
    puerto: 'PUERTO CENTRAL SAN ANTONIO',
    nave: 'EDISON',
    depositoVacio: 'CONTECON SAN ANTONIO',
    incidencias: {
      falsoFlete: true, // ERROR: Falso Flete registrado en bitácora operativa sin cobro de venta asociado (R-INC-01)
      detalle: 'Camión rechazado en planta cliente por horario cerrado; reprogramado sin nota de cobro adicional.',
      driveRef: 'DRIVE-INC-2026-08-9912'
    },
    lineas: [
      { id: 'l90_1', codigo: 'FLETE', nombreConcepto: 'Flete marítimo 40HC', tipo: 'venta', valor: 2400000, moneda: 'CLP' },
      { id: 'l90_2', codigo: 'FLETE_COSTO', nombreConcepto: 'Flete marítimo costo', tipo: 'costo', valor: 1900000, moneda: 'CLP' },
      { id: 'l90_3', codigo: 'GATEIN', nombreConcepto: 'Gate in puerto', tipo: 'venta', valor: 950000, moneda: 'CLP' },
      { id: 'l90_4', codigo: 'BL', nombreConcepto: 'Emisión BL', tipo: 'venta', valor: 350000, moneda: 'CLP' },
    ]
  });

  // Additional compliant services
  const clientsWithAgreements = initialClients.filter(c => c.tieneMatriz);
  const states: Service['estado'][] = ['confirmado', 'en_transito', 'cerrado', 'facturado'];

  for (let i = 1; i <= 40; i++) {
    const srvNum = 24900 + i;
    const client = clientsWithAgreements[(i % clientsWithAgreements.length)];
    const agreement = initialAgreements.find(a => a.clienteId === client.id) || initialAgreements[0];
    const state = states[i % states.length];
    
    const lines: Service['lineas'] = agreement.conceptos.map((c, idx) => ({
      id: `l_${srvNum}_${idx}`,
      codigo: c.codigo,
      nombreConcepto: c.nombre,
      tipo: c.tipo,
      valor: c.valor,
      moneda: c.moneda,
    }));

    const day = (i % 28) + 1;
    const dateStr = `2026-07-${day < 10 ? '0' + day : day}`;

    services.push({
      id: `SRV-${srvNum}`,
      clienteId: client.id,
      clienteNombre: client.nombre,
      ejecutivo: client.ejecutivo,
      ruta: agreement.ruta,
      contenedores: [{ tipo: agreement.tipoContenedor, cantidad: 1 }],
      estado: state,
      fechaCreacion: dateStr,
      lineas: lines,
    });
  }

  return services;
}
