export type Role = 'comercial' | 'costos' | 'admin';

export type ServiceState =
  | 'proyeccion'
  | 'borrador'
  | 'confirmado'
  | 'en_transito'
  | 'cerrado'
  | 'facturado'
  /** Revisado en BIT: sus extracostos ya se verificaron y están conformes. */
  | 'validado'
  | 'anulado';

export type OperationType = 'importacion' | 'exportacion' | 'nacional';
export type ServiceModality = 'directo' | 'diferido' | 'sin_definir';

export type RuleSeverity = 'Alta' | 'Media' | 'Baja' | 'Funcional';
export type RuleCategory = 
  | 'Generales' 
  | 'Importación' 
  | 'Exportación' 
  | 'Extra Costos' 
  | 'Incidencias' 
  | 'Liquidación y Cierre' 
  | 'Matriz Comercial';

export type PrdRuleId =
  | 'R-GEN-01' // Control de fechas (ETA nula o en pasado en proyección)
  | 'R-GEN-02' // Control de peso (en blanco, cero o < 1)
  | 'R-GEN-03' // Sobrepeso (> 25.000 kg)
  | 'R-GEN-04' // Modalidad de servicio (campo vacío)
  | 'R-GEN-05' // Estadía (in planta vs out planta > umbral)
  | 'R-IMP-01' // Validación de direcciones (múltiples direcciones -> Dirección por Confirmar)
  | 'R-IMP-02' // Campos obligatorios Importación (unidad, programa, peso, puerto, nave, depósito vacío)
  | 'R-EXP-01' // Control de stacking / corte documental faltante
  | 'R-EXP-02' // Campos obligatorios Exportación (contenedor, peso, puerto, nave, depósito retiro, modalidad)
  | 'R-EXC-01' // Servicio diferido sin extra costo de almacenaje
  | 'R-EXC-02' // Almacenaje preventivo (Retiro vs Presentación > 2 días)
  | 'R-EXC-03' // Generación automática de líneas al seleccionar tickets
  | 'R-EXC-04' // Nuevos atributos en ficha (Cuadrillas, Sobrepeso, Consolidado, Insulado, IMO)
  | 'R-INC-01' // Control cruzado de incidencias (Falso Flete, Redestino, Multas)
  | 'R-INC-02' // Gestión dashboard consolidado
  | 'R-LIQ-01' // Rentabilidad mínima (margen < 15-18%)
  | 'R-LIQ-02' // Validación integral de conceptos (IMO/Cuadrilla sin costos y ventas asociados)
  | 'R-LIQ-03' // Almacenaje - diferencia de días > 2 en diferidos
  | 'R-LIQ-04' // Acuerdo comercial - parámetros de valor
  | 'R-LIQ-05' // Gestión visual y clasificación para facturación + PDF
  | 'R-MAT-01'; // Desviación general respecto a matriz comercial

export type DeviationType = 
  | 'concepto_faltante' 
  | 'valor_fuera_tarifa' 
  | 'costo_sin_venta' 
  | 'venta_sin_costo' 
  | 'moneda_distinta' 
  | 'margen_bajo_minimo'
  | 'no_conciliable'
  | 'campo_obligatorio_vacio'
  | 'sobrepeso'
  | 'estadia_excedida'
  | 'almacenaje_faltante'
  | 'direccion_por_confirmar'
  | 'stacking_invalido'
  | 'incidencia_pendiente'
  | 'proyeccion_sin_venta'
  | 'eta_invalida';

export type DeviationStatus = 
  | 'abierta' 
  | 'en_revision' 
  | 'corregida' 
  | 'excepcion_justificada' 
  | 'reabierta';

export type ConceptType = 'venta' | 'costo';
export type ConceptUnit = 'contenedor' | 'bl' | 'servicio' | 'peso_volumen' | 'dia' | 'hora';

export interface ConceptDef {
  codigo: string;
  nombre: string;
  tipo: ConceptType;
  valor: number; // En CLP ($)
  moneda: 'CLP'; // Moneda estándar en pesos chilenos
  unidad: ConceptUnit;
  obligatorio: boolean;
}

export interface Client {
  id: string;
  nombre: string;
  ejecutivo: string;
  rut?: string;
  tieneMatriz: boolean;
  margenObjetivo?: number; // e.g. 0.18 (18%)
  direccionesRegistradas?: string[];
}

export interface Agreement {
  id: string;
  clienteId: string;
  clienteNombre: string;
  ruta: {
    origen: string;
    destino: string;
  };
  tipoContenedor: string; // e.g., '40HC', '20ST', 'REEFER', 'OT', 'FR'
  vigenciaDesde: string; // YYYY-MM-DD
  vigenciaHasta: string; // YYYY-MM-DD
  moneda: 'CLP'; // Moneda estándar CLP
  margenMinimo: number; // e.g. 0.18 for 18%
  estado: 'vigente' | 'vencido' | 'por_vencer';
  conceptos: ConceptDef[];
}

export interface ServiceLine {
  id: string;
  codigo: string;
  nombreConcepto?: string;
  tipo: ConceptType;
  valor: number; // En CLP ($)
  moneda: 'CLP';
}

export interface ContainerInfo {
  tipo: string;
  cantidad: number;
}

export interface ProyeccionInfo {
  numReg: number;
  tipoServ: string; // 'DIRECTO' | 'IMPOD' | 'EXPOD' | 'LCL'
  mandante: string;
  planta: string;
  retiro: string;
  presen: string;
  modal: string;
  estAct: string; // e.g. 'PROYECCION DE CARGA'
  estSgte: string; // e.g. 'EN COORDINACION'
  dias: number;
  eta: string;
  puerto: string;
  nave: string;
  numContenedor: string;
  peso: number;
  sello: string;
  tara: number;
  chofer?: string;
  patente?: string;
  rutDriver?: string;
  fonoDriver?: string;
  referencia: string;
  tarifaPactadaClp: number;
  costoTransporteClp: number;
  ventaAdicClp: number;
  tieneVentaCargada: boolean;
}

export interface ServiceAtributosEspeciales {
  imo?: boolean;
  cuadrillas?: boolean;
  sobrepesoEspecial?: boolean;
  consolidado?: boolean;
  insulado?: boolean;
}

export interface ServiceIncidencias {
  falsoFlete?: boolean;
  redestino?: boolean;
  multas?: boolean;
  detalle?: string;
  driveRef?: string;
}

export interface Service {
  id: string; // e.g. 'SRV-24871' or 'REG-25944'
  clienteId: string;
  clienteNombre: string;
  ejecutivo: string;
  ruta: {
    origen: string;
    destino: string;
  };
  contenedores: ContainerInfo[];
  estado: ServiceState;
  fechaCreacion: string; // YYYY-MM-DD
  lineas: ServiceLine[];
  proyeccion?: ProyeccionInfo;

  // PRD OPERATIONAL ATTRIBUTES
  tipoOperacion?: OperationType; // 'importacion' | 'exportacion' | 'nacional'
  modalidad?: ServiceModality; // 'directo' | 'diferido' | 'sin_definir'
  pesoKg?: number;
  puerto?: string;
  nave?: string;
  depositoVacio?: string;
  depositoRetiro?: string;
  fechaStacking?: string;
  corteDocumental?: string;
  inPlanta?: string; // YYYY-MM-DD HH:mm
  outPlanta?: string; // YYYY-MM-DD HH:mm
  horasEstadia?: number;
  fechaRetiro?: string; // YYYY-MM-DD
  fechaPresentacion?: string; // YYYY-MM-DD
  diasAlmacenaje?: number;
  direccionPlanta?: string;
  direccionPorConfirmar?: boolean;
  atributosEspeciales?: ServiceAtributosEspeciales;
  incidencias?: ServiceIncidencias;
  aptoFacturacion?: boolean; // RF-06: True iff no open Alta severity alerts
  notas?: string; // Observaciones libres
  /**
   * Tipos de extracosto que el servicio SÍ tiene cobrados (sobreestadía,
   * sobrepeso, almacenaje…). La mayoría de las reglas compara una condición
   * detectada contra esta lista: si la condición ocurrió y el tipo no está,
   * hay un cobro que falta.
   */
  extracostosPresentes?: string[];
}

export interface AuditLog {
  id: string;
  fecha: string;
  rol: Role;
  usuario: string;
  accion: string;
  estadoAnterior?: DeviationStatus;
  estadoNuevo?: DeviationStatus;
  comentario: string;
}

export interface Deviation {
  id: string; // e.g. 'DEV-1001'
  idRegla: PrdRuleId; // R-GEN-01, R-IMP-02, R-EXC-01, etc.
  severidad: RuleSeverity; // 'Alta' | 'Media' | 'Baja' | 'Funcional'
  categoriaRegla: RuleCategory; // 'Generales', 'Importación', 'Exportación', 'Extra Costos', 'Incidencias', 'Liquidación y Cierre', 'Matriz Comercial'
  mensaje: string;
  campoAfectado: string;
  
  servicioId: string;
  clienteId: string;
  clienteNombre: string;
  rutaStr: string;
  ejecutivo: string;
  tipo: DeviationType;
  conceptoCodigo: string;
  conceptoNombre: string;
  valorEsperado: number;
  valorCargado: number;
  monedaEsperada: string;
  monedaCargada: string;
  impactoClp: number; // En CLP ($)
  impactoUsd?: number; // Alias retrocompatible
  responsableRol: 'comercial' | 'costos' | 'admin';
  estado: DeviationStatus;
  fechaDeteccion: string;
  antiguedadDias: number | null; // null = el servicio llegó sin fecha utilizable
  reincidente?: boolean;
  bitacora: AuditLog[];
  detallesExplicacion?: string;
}

export interface SystemSettings {
  toleranciaAbsolutaClp: number; // e.g. 25000 CLP
  toleranciaAbsolutaUsd?: number; // Alias retrocompatible
  toleranciaPorcentaje: number; // e.g. 2%
  puntoEvaluacionEstado: ServiceState; // e.g. 'confirmado'
  margenMinimoGlobal: number; // e.g. 0.18 (18%)
  umbralHorasEstadia: number; // e.g. 4 horas (R-GEN-05)
  umbralDiasAlmacenaje: number; // e.g. 2 días (R-EXC-02, R-LIQ-03)
  topePesoKg: number; // e.g. 25000 kg (R-GEN-03)
  reglasActivas: {
    // 5.1 Generales
    R_GEN_01: boolean; // Control de fechas (ETA)
    R_GEN_02: boolean; // Control de peso
    R_GEN_03: boolean; // Sobrepeso (> 25t)
    R_GEN_04: boolean; // Modalidad de servicio
    R_GEN_05: boolean; // Estadía en planta
    // 5.2 Importación
    R_IMP_01: boolean; // Validación de direcciones
    R_IMP_02: boolean; // Campos obligatorios Importación
    // 5.3 Exportación
    R_EXP_01: boolean; // Control de stacking / corte documental
    R_EXP_02: boolean; // Campos obligatorios Exportación
    // 5.4 Extra costos
    R_EXC_01: boolean; // Servicio diferido sin extra costo almacenaje
    R_EXC_02: boolean; // Almacenaje preventivo (> 2 días)
    R_EXC_03: boolean; // Generación automática de líneas
    R_EXC_04: boolean; // Nuevos atributos en ficha
    // 5.5 Incidencias
    R_INC_01: boolean; // Control cruzado Falso Flete / Redestino / Multas
    // 5.6 Liquidación y cierre
    R_LIQ_01: boolean; // Rentabilidad mínima (Margen)
    R_LIQ_02: boolean; // Validación integral IMO / Cuadrilla
    R_LIQ_03: boolean; // Almacenaje diferencia días > 2
    // Matriz Comercial & Catálogo
    conceptoFaltante: boolean;
    valorFueraTarifa: boolean;
    costoSinVenta: boolean;
    ventaSinCosto: boolean;
    monedaDistinta: boolean;
    margenBajoMinimo: boolean;
  };
}


