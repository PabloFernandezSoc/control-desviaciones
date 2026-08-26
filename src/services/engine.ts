import {
  Service,
  Agreement,
  Client,
  Deviation,
  SystemSettings,
  DeviationStatus,
  AuditLog,
  Role,
  PrdRuleId,
  RuleSeverity,
  RuleCategory,
  DeviationType,
  ServiceState
} from '../types';
import { initialAgreements, defaultSettings } from '../data/seed';

/**
 * Los servicios y los clientes NO se persisten: son un reflejo de la última
 * respuesta de la API y se reconstruyen en cada lectura (la copia local para
 * trabajar sin conexión la guarda `apiClient.ts`, como respuesta cruda).
 *
 * Sí se persiste lo que es configuración propia de la aplicación y no vive en
 * el ERP: la matriz comercial, los umbrales, y el triaje de las desviaciones.
 */
const STORAGE_KEY_AGREEMENTS = 'lyd_bit_agreements_v5';
const STORAGE_KEY_SETTINGS = 'lyd_bit_settings_v5';
const STORAGE_KEY_DEVIATION_STATES = 'lyd_bit_deviation_states_v5';

export interface SavedDeviationState {
  status: DeviationStatus;
  reincidente?: boolean;
  bitacora: AuditLog[];
}

export class EngineService {
  private services: Service[] = [];
  private agreements: Agreement[] = [];
  private clients: Client[] = [];
  private settings: SystemSettings = defaultSettings;
  private savedDeviationStates: Record<string, SavedDeviationState> = {};
  private lastSyncTime: string = new Date().toISOString();
  private reglasSuprimidas: Set<string> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedAgreements = localStorage.getItem(STORAGE_KEY_AGREEMENTS);
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      const storedDevStates = localStorage.getItem(STORAGE_KEY_DEVIATION_STATES);

      this.agreements = storedAgreements ? JSON.parse(storedAgreements) : initialAgreements;
      this.settings = storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
      this.savedDeviationStates = storedDevStates ? JSON.parse(storedDevStates) : {};
    } catch (e) {
      console.error('Error cargando la configuración local:', e);
      this.resetConfig();
    }
  }

  public saveAll() {
    localStorage.setItem(STORAGE_KEY_AGREEMENTS, JSON.stringify(this.agreements));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEY_DEVIATION_STATES, JSON.stringify(this.savedDeviationStates));
  }

  /** Restablece la configuración local. No toca los datos, que vienen de la API. */
  public resetConfig() {
    this.agreements = initialAgreements;
    this.settings = defaultSettings;
    this.savedDeviationStates = {};
    this.saveAll();
  }

  /**
   * Reemplaza los datos con el resultado de una lectura de la API.
   *
   * Los clientes se derivan de la respuesta; `tieneMatriz` se resuelve aquí
   * cruzando contra la matriz comercial guardada localmente.
   */
  public setDatosApi(servicios: Service[], clientes: Client[]) {
    const porId = new Map<string, Service>();
    for (const s of servicios) porId.set(s.id, s);
    this.services = Array.from(porId.values());

    const conMatriz = new Set(this.agreements.map(a => a.clienteId));
    this.clients = clientes.map(c => ({ ...c, tieneMatriz: conMatriz.has(c.id) }));

    this.lastSyncTime = new Date().toISOString();
  }

  /**
   * Reglas que no se pueden evaluar porque el reporte no trae la columna que
   * necesitan. Se apagan en vez de marcar todos los servicios como incompletos.
   */
  public setReglasSuprimidas(reglas: Set<string>) {
    this.reglasSuprimidas = reglas;
  }

  public getReglasSuprimidas(): Set<string> {
    return this.reglasSuprimidas;
  }

  /** Reglas activas efectivas: las configuradas menos las no evaluables. */
  private reglasEfectivas(): SystemSettings['reglasActivas'] {
    const base = this.settings.reglasActivas;
    if (this.reglasSuprimidas.size === 0) return base;
    const salida = { ...base } as Record<string, boolean>;
    for (const regla of this.reglasSuprimidas) {
      if (regla in salida) salida[regla] = false;
    }
    return salida as SystemSettings['reglasActivas'];
  }

  public getSettings(): SystemSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: SystemSettings) {
    this.settings = newSettings;
    this.saveAll();
  }

  public getClients(): Client[] {
    return [...this.clients];
  }

  public getAgreements(): Agreement[] {
    return [...this.agreements];
  }

  public saveAgreement(agreement: Agreement) {
    const idx = this.agreements.findIndex(a => a.id === agreement.id);
    if (idx >= 0) {
      this.agreements[idx] = agreement;
    } else {
      this.agreements.push(agreement);
    }
    const client = this.clients.find(c => c.id === agreement.clienteId);
    if (client) {
      client.tieneMatriz = true;
    }
    this.saveAll();
  }

  public getServices(): Service[] {
    return [...this.services];
  }

  public getProjectionServices(): Service[] {
    return this.services.filter(s => s.estado === 'proyeccion');
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  // ==========================================
  // COMPLETE PRD RULES EVALUATION ENGINE
  // ==========================================
  public detectDeviations(): {
    deviations: Deviation[];
    evaluatedServices: Service[];
    unmatchedServices: Service[];
  } {
    const deviations: Deviation[] = [];
    const evaluatedServices: Service[] = [];
    const unmatchedServices: Service[] = [];

    const toleranciaAbsoluta = this.settings.toleranciaAbsolutaClp || 25000;
    const { 
      toleranciaPorcentaje, 
      umbralHorasEstadia = 4, 
      umbralDiasAlmacenaje = 2, 
      topePesoKg = 25000 
    } = this.settings;
    // Las reglas cuyo campo no vino en el reporte quedan apagadas.
    const reglasActivas = this.reglasEfectivas();

    const referenceDate = new Date('2026-08-24');

    for (const service of this.services) {
      const rutaStr = `${service.ruta.origen} → ${service.ruta.destino}`;
      const client = this.clients.find(c => c.id === service.clienteId);
      const agreement = this.agreements.find(a => a.clienteId === service.clienteId);

      const serviceDeviations: Deviation[] = [];

      const addDev = (params: {
        id: string;
        idRegla: PrdRuleId;
        severidad: RuleSeverity;
        categoriaRegla: RuleCategory;
        tipo: DeviationType;
        mensaje: string;
        campoAfectado: string;
        conceptoCodigo: string;
        conceptoNombre: string;
        valorEsperado: number;
        valorCargado: number;
        monedaEsperada?: string;
        monedaCargada?: string;
        impactoClp: number;
        responsableRol: 'comercial' | 'costos' | 'admin';
        detallesExplicacion: string;
      }) => {
        const saved = this.savedDeviationStates[params.id];
        const dev: Deviation = {
          id: params.id,
          idRegla: params.idRegla,
          severidad: params.severidad,
          categoriaRegla: params.categoriaRegla,
          mensaje: params.mensaje,
          campoAfectado: params.campoAfectado,
          servicioId: service.id,
          clienteId: service.clienteId,
          clienteNombre: service.clienteNombre,
          rutaStr,
          ejecutivo: service.ejecutivo,
          tipo: params.tipo,
          conceptoCodigo: params.conceptoCodigo,
          conceptoNombre: params.conceptoNombre,
          valorEsperado: params.valorEsperado,
          valorCargado: params.valorCargado,
          monedaEsperada: params.monedaEsperada || 'CLP',
          monedaCargada: params.monedaCargada || 'CLP',
          impactoClp: params.impactoClp,
          impactoUsd: params.impactoClp,
          responsableRol: params.responsableRol,
          estado: saved?.status || 'abierta',
          fechaDeteccion: service.fechaCreacion,
          antiguedadDias: this.calculateAgeDays(service.fechaCreacion),
          reincidente: saved?.reincidente,
          bitacora: saved?.bitacora || [{
            id: `log-${Date.now()}-${params.idRegla}`,
            fecha: service.fechaCreacion,
            rol: 'admin',
            usuario: 'Motor de Reglas BIT',
            accion: 'Detección automática',
            estadoNuevo: 'abierta',
            comentario: `Regla ${params.idRegla} disparada: ${params.mensaje}`
          }],
          detallesExplicacion: params.detallesExplicacion
        };

        // Avoid duplicate deviation IDs
        const existingIdx = deviations.findIndex(d => d.id === dev.id);
        if (existingIdx >= 0) {
          deviations[existingIdx] = dev;
          const sIdx = serviceDeviations.findIndex(d => d.id === dev.id);
          if (sIdx >= 0) serviceDeviations[sIdx] = dev;
          else serviceDeviations.push(dev);
        } else {
          serviceDeviations.push(dev);
          deviations.push(dev);
        }
      };

      // ----------------------------------------------------
      // 5.1 REGLAS GENERALES
      // ----------------------------------------------------

      // R-GEN-01: Control de fechas (ETA nula o en el pasado en proyección)
      if (reglasActivas.R_GEN_01 && service.estado === 'proyeccion' && service.proyeccion) {
        const etaStr = service.proyeccion.eta;
        let isPast = false;
        if (!etaStr) {
          isPast = true;
        } else {
          // Parse DD/MM/YYYY or YYYY-MM-DD
          const parts = etaStr.includes('/') ? etaStr.split('/') : etaStr.split('-');
          const etaDate = etaStr.includes('/')
            ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
            : new Date(etaStr);
          if (isNaN(etaDate.getTime()) || etaDate < new Date('2026-08-01')) {
            isPast = true;
          }
        }

        if (isPast) {
          addDev({
            id: `DEV-${service.id}-R-GEN-01`,
            idRegla: 'R-GEN-01',
            severidad: 'Alta',
            categoriaRegla: 'Generales',
            tipo: 'eta_invalida',
            mensaje: 'ETA nula o caducada en servicio en estado de proyección',
            campoAfectado: 'ETA / Fecha Arribo',
            conceptoCodigo: 'ETA_CADUCADA',
            conceptoNombre: 'Fecha ETA de Proyección Inválida',
            valorEsperado: 1,
            valorCargado: 0,
            impactoClp: 0,
            responsableRol: 'costos',
            detallesExplicacion: `El servicio en proyección N° Reg ${service.proyeccion.numReg} tiene una fecha ETA (${service.proyeccion.eta || 'Sin Fecha'}) vencida o no informada.`
          });
        }
      }

      // R-GEN-02: Control de peso (peso en blanco, cero o < 1)
      const pesoEfectivo = service.pesoKg !== undefined 
        ? service.pesoKg 
        : (service.proyeccion?.peso !== undefined ? service.proyeccion.peso : 20000);

      if (reglasActivas.R_GEN_02 && (pesoEfectivo <= 0 || isNaN(pesoEfectivo))) {
        addDev({
          id: `DEV-${service.id}-R-GEN-02`,
          idRegla: 'R-GEN-02',
          severidad: 'Alta',
          categoriaRegla: 'Generales',
          tipo: 'campo_obligatorio_vacio',
          mensaje: 'Peso de la carga en blanco, en cero o menor a 1 kg',
          campoAfectado: 'Peso (Kg)',
          conceptoCodigo: 'PESO_INVALIDO',
          conceptoNombre: 'Peso de Contenedor Requerido',
          valorEsperado: 20000,
          valorCargado: pesoEfectivo || 0,
          impactoClp: 0,
          responsableRol: 'costos',
          detallesExplicacion: `El servicio no registra peso neto válido (${pesoEfectivo} kg). Campo crítico para la tarificación y pesaje vial.`
        });
      }

      // R-GEN-03: Sobrepeso (> 25.000 kg o tope definido)
      if (reglasActivas.R_GEN_03 && pesoEfectivo > topePesoKg) {
        addDev({
          id: `DEV-${service.id}-R-GEN-03`,
          idRegla: 'R-GEN-03',
          severidad: 'Media',
          categoriaRegla: 'Generales',
          tipo: 'sobrepeso',
          mensaje: `Sobrepeso detectado: ${pesoEfectivo.toLocaleString('es-CL')} kg supera el tope legal de ${topePesoKg.toLocaleString('es-CL')} kg`,
          campoAfectado: 'Peso Declarado',
          conceptoCodigo: 'SOBREPESO_25T',
          conceptoNombre: 'Alerta de Sobrepeso > 25 Toneladas',
          valorEsperado: topePesoKg,
          valorCargado: pesoEfectivo,
          impactoClp: 180000, // Recargo estimado por sobrepeso
          responsableRol: 'costos',
          detallesExplicacion: `Carga declarada con ${pesoEfectivo.toLocaleString('es-CL')} kg (> 25.000 kg). Requiere verificación de permiso de sobrepeso o cobro de recargo.`
        });
      }

      // R-GEN-04: Modalidad de servicio (campo vacío)
      const modalidadEfectiva = service.modalidad || (service.proyeccion?.modal?.toLowerCase().includes('direct') ? 'directo' : (service.proyeccion?.modal?.toLowerCase().includes('difer') ? 'diferido' : undefined));
      if (reglasActivas.R_GEN_04 && (!modalidadEfectiva || modalidadEfectiva === 'sin_definir')) {
        addDev({
          id: `DEV-${service.id}-R-GEN-04`,
          idRegla: 'R-GEN-04',
          severidad: 'Alta',
          categoriaRegla: 'Generales',
          tipo: 'campo_obligatorio_vacio',
          mensaje: 'Modalidad de servicio no definida (debe ser Directo o Diferido)',
          campoAfectado: 'Modalidad de Servicio',
          conceptoCodigo: 'MODALIDAD_VACIA',
          conceptoNombre: 'Modalidad Requerida',
          valorEsperado: 1,
          valorCargado: 0,
          impactoClp: 0,
          responsableRol: 'costos',
          detallesExplicacion: 'Todos los servicios de transporte deben tener asignada explícitamente su modalidad (Directo / Diferido).'
        });
      }

      // R-GEN-05: Estadía (horas entre In planta y Out planta > umbral)
      const horasEstadia = service.horasEstadia || 0;
      if (reglasActivas.R_GEN_05 && horasEstadia > umbralHorasEstadia) {
        const excesoHoras = horasEstadia - umbralHorasEstadia;
        const cobroSobreestadia = Math.round(excesoHoras * 45000); // $45.000 por hora extra
        addDev({
          id: `DEV-${service.id}-R-GEN-05`,
          idRegla: 'R-GEN-05',
          severidad: 'Media',
          categoriaRegla: 'Generales',
          tipo: 'estadia_excedida',
          mensaje: `Estadía en planta de ${horasEstadia} hrs supera el umbral acordado de ${umbralHorasEstadia} hrs`,
          campoAfectado: 'In Planta / Out Planta',
          conceptoCodigo: 'SOBREESTADIA_PLANTA',
          conceptoNombre: 'Horas de Estadía en Planta Excedidas',
          valorEsperado: umbralHorasEstadia,
          valorCargado: horasEstadia,
          impactoClp: cobroSobreestadia,
          responsableRol: 'costos',
          detallesExplicacion: `Permanencia de ${horasEstadia} horas en faena supera el tiempo libre (${umbralHorasEstadia} hrs). Requiere cobro de extra costo por sobreestadía.`
        });
      }

      // ----------------------------------------------------
      // 5.2 REGLAS DE IMPORTACIÓN
      // ----------------------------------------------------
      const tipoOp = service.tipoOperacion || (service.proyeccion?.tipoServ === 'EXPOD' ? 'exportacion' : 'importacion');

      if (tipoOp === 'importacion') {
        // R-IMP-01: Validación de direcciones (múltiples direcciones históricas)
        if (reglasActivas.R_IMP_01 && (service.direccionPorConfirmar || (client?.direccionesRegistradas && client.direccionesRegistradas.length > 1 && !service.direccionPlanta))) {
          addDev({
            id: `DEV-${service.id}-R-IMP-01`,
            idRegla: 'R-IMP-01',
            severidad: 'Media',
            categoriaRegla: 'Importación',
            tipo: 'direccion_por_confirmar',
            mensaje: 'Dirección de entrega por confirmar (cliente posee múltiples plantas registradas)',
            campoAfectado: 'Dirección de Entrega / Destino',
            conceptoCodigo: 'DIR_POR_CONFIRMAR',
            conceptoNombre: 'Validación de Dirección de Destino',
            valorEsperado: 1,
            valorCargado: 0,
            impactoClp: 0,
            responsableRol: 'costos',
            detallesExplicacion: `El mandante '${service.clienteNombre}' registra múltiples direcciones históricas. Validar punto exacto antes del despacho.`
          });
        }

        // R-IMP-02: Campos obligatorios de Importación
        if (reglasActivas.R_IMP_02 && service.estado !== 'proyeccion') {
          const missingFields: string[] = [];
          if (!service.contenedores || service.contenedores.length === 0 || !service.contenedores[0].tipo) missingFields.push('Tipo Contenedor');
          if (!service.puerto && !service.proyeccion?.puerto) missingFields.push('Puerto');
          if (!service.nave && !service.proyeccion?.nave) missingFields.push('Nave');
          if (service.depositoVacio === '') missingFields.push('Depósito Vacío');

          if (missingFields.length > 0) {
            addDev({
              id: `DEV-${service.id}-R-IMP-02`,
              idRegla: 'R-IMP-02',
              severidad: 'Alta',
              categoriaRegla: 'Importación',
              tipo: 'campo_obligatorio_vacio',
              mensaje: `Campos obligatorios de importación faltantes: ${missingFields.join(', ')}`,
              campoAfectado: missingFields.join(', '),
              conceptoCodigo: 'CAMPOS_OBLIGATORIOS_IMP',
              conceptoNombre: 'Campos Mandatorios de Importación',
              valorEsperado: missingFields.length,
              valorCargado: 0,
              impactoClp: 0,
              responsableRol: 'costos',
              detallesExplicacion: `Falta completar los siguientes campos indispensables en la ficha de importación: ${missingFields.join(', ')}.`
            });
          }
        }
      }

      // ----------------------------------------------------
      // 5.3 REGLAS DE EXPORTACIÓN
      // ----------------------------------------------------
      if (tipoOp === 'exportacion') {
        // R-EXP-01: Control de Stacking / Corte Documental
        if (reglasActivas.R_EXP_01 && (service.fechaStacking === '' || service.corteDocumental === '')) {
          addDev({
            id: `DEV-${service.id}-R-EXP-01`,
            idRegla: 'R-EXP-01',
            severidad: 'Alta',
            categoriaRegla: 'Exportación',
            tipo: 'stacking_invalido',
            mensaje: 'Falta fecha de inicio de Stacking o Corte Documental de naviera',
            campoAfectado: 'Fecha Stacking / Corte Documental',
            conceptoCodigo: 'STACKING_FALTANTE',
            conceptoNombre: 'Control de Ventana de Stacking',
            valorEsperado: 1,
            valorCargado: 0,
            impactoClp: 0,
            responsableRol: 'costos',
            detallesExplicacion: 'En servicios de exportación es obligatorio registrar el inicio de stacking y corte para evitar falso flete y multas en terminal.'
          });
        }

        // R-EXP-02: Campos obligatorios de Exportación
        if (reglasActivas.R_EXP_02 && service.estado !== 'proyeccion') {
          const missingExp: string[] = [];
          if (!service.puerto && !service.proyeccion?.puerto) missingExp.push('Puerto');
          if (!service.nave && !service.proyeccion?.nave) missingExp.push('Nave');
          if (!service.depositoRetiro && service.depositoRetiro === '') missingExp.push('Depósito de Retiro');
          if (!modalidadEfectiva || modalidadEfectiva === 'sin_definir') missingExp.push('Modalidad');

          if (missingExp.length > 0) {
            addDev({
              id: `DEV-${service.id}-R-EXP-02`,
              idRegla: 'R-EXP-02',
              severidad: 'Alta',
              categoriaRegla: 'Exportación',
              tipo: 'campo_obligatorio_vacio',
              mensaje: `Campos obligatorios de exportación faltantes: ${missingExp.join(', ')}`,
              campoAfectado: missingExp.join(', '),
              conceptoCodigo: 'CAMPOS_OBLIGATORIOS_EXP',
              conceptoNombre: 'Campos Mandatorios de Exportación',
              valorEsperado: missingExp.length,
              valorCargado: 0,
              impactoClp: 0,
              responsableRol: 'costos',
              detallesExplicacion: `Faltan campos críticos para la coordinación del embarque de exportación: ${missingExp.join(', ')}.`
            });
          }
        }
      }

      // ----------------------------------------------------
      // 5.4 EXTRA COSTOS & ALMACENAJE
      // ----------------------------------------------------
      const isDiferido = modalidadEfectiva === 'diferido' || service.modalidad === 'diferido';
      const hasAlmacenajeLine = service.lineas.some(
        l => l.codigo.toUpperCase().includes('ALMACEN') || l.nombreConcepto?.toLowerCase().includes('almacen')
      );

      // R-EXC-01: Servicio Diferido sin Extra Costo de Almacenaje
      if (reglasActivas.R_EXC_01 && isDiferido && !hasAlmacenajeLine) {
        const dias = service.diasAlmacenaje || (service.proyeccion?.dias || 3);
        const cobroEstAlmacenaje = dias * 65000; // $65.000 CLP/día estimado
        addDev({
          id: `DEV-${service.id}-R-EXC-01`,
          idRegla: 'R-EXC-01',
          severidad: 'Alta',
          categoriaRegla: 'Extra Costos',
          tipo: 'almacenaje_faltante',
          mensaje: 'Servicio en modalidad diferida no tiene cargado el extra costo de almacenaje',
          campoAfectado: 'Extra Costo Almacenaje',
          conceptoCodigo: 'EXTRA_ALMACENAJE_FALTANTE',
          conceptoNombre: 'Cobro de Almacenaje en Servicio Diferido',
          valorEsperado: cobroEstAlmacenaje,
          valorCargado: 0,
          impactoClp: cobroEstAlmacenaje,
          responsableRol: 'costos',
          detallesExplicacion: `Modalidad diferida con ${dias} días de custodia en depósito sin línea de venta/costo de almacenaje ingresada.`
        });
      }

      // R-EXC-02 & R-LIQ-03: Almacenaje preventivo / Diferencia de días > 2 días
      const diasAlm = service.diasAlmacenaje || 0;
      if ((reglasActivas.R_EXC_02 || reglasActivas.R_LIQ_03) && isDiferido && diasAlm > umbralDiasAlmacenaje) {
        const diasExcedentes = diasAlm - umbralDiasAlmacenaje;
        const impactoExtra = diasExcedentes * 65000;
        addDev({
          id: `DEV-${service.id}-R-EXC-02`,
          idRegla: 'R-EXC-02',
          severidad: 'Media',
          categoriaRegla: 'Extra Costos',
          tipo: 'almacenaje_faltante',
          mensaje: `Custodia de ${diasAlm} días entre Retiro y Presentación supera el límite libre de ${umbralDiasAlmacenaje} días`,
          campoAfectado: 'Días de Almacenaje',
          conceptoCodigo: 'DIAS_ALMACENAJE_EXCEDIDOS',
          conceptoNombre: 'Almacenaje Preventivo (> 2 días)',
          valorEsperado: umbralDiasAlmacenaje,
          valorCargado: diasAlm,
          impactoClp: impactoExtra,
          responsableRol: 'costos',
          detallesExplicacion: `Diferencia de ${diasAlm} días entre retiro y presentación en planta genera cobros adicionales por ${diasExcedentes} días excedentes.`
        });
      }

      // R-EXC-04 & R-LIQ-02: Validación Integral de Atributos Especiales (IMO, Cuadrilla, Sobrepeso)
      if (reglasActivas.R_LIQ_02 && service.atributosEspeciales) {
        if (service.atributosEspeciales.imo) {
          const hasImoSale = service.lineas.some(l => l.tipo === 'venta' && l.codigo.includes('IMO'));
          const hasImoCost = service.lineas.some(l => l.tipo === 'costo' && l.codigo.includes('IMO'));
          if (!hasImoSale || !hasImoCost) {
            addDev({
              id: `DEV-${service.id}-R-LIQ-02-IMO`,
              idRegla: 'R-LIQ-02',
              severidad: 'Alta',
              categoriaRegla: 'Liquidación y Cierre',
              tipo: 'costo_sin_venta',
              mensaje: 'Servicio marcado como IMO sin líneas completas de venta y costo de recargo IMO',
              campoAfectado: 'Atributo Especial IMO',
              conceptoCodigo: 'EXTRA_IMO_INCOMPLETO',
              conceptoNombre: 'Recargo Mercancía Peligrosa IMO',
              valorEsperado: 280000,
              valorCargado: 0,
              impactoClp: 280000,
              responsableRol: 'comercial',
              detallesExplicacion: 'El servicio está catalogado como carga IMO pero no tiene la línea de venta y/o costo correspondiente en BIT.'
            });
          }
        }

        if (service.atributosEspeciales.cuadrillas) {
          const hasCuadrillaSale = service.lineas.some(l => l.tipo === 'venta' && l.codigo.includes('CUADRILLA'));
          if (!hasCuadrillaSale) {
            addDev({
              id: `DEV-${service.id}-R-LIQ-02-CUADRILLA`,
              idRegla: 'R-LIQ-02',
              severidad: 'Alta',
              categoriaRegla: 'Liquidación y Cierre',
              tipo: 'costo_sin_venta',
              mensaje: 'Servicio con Cuadrillas asignadas sin línea de cobro/venta asociada',
              campoAfectado: 'Atributo Especial Cuadrillas',
              conceptoCodigo: 'EXTRA_CUADRILLA_INCOMPLETO',
              conceptoNombre: 'Servicio de Cuadrilla y Estiba',
              valorEsperado: 220000,
              valorCargado: 0,
              impactoClp: 220000,
              responsableRol: 'comercial',
              detallesExplicacion: 'Se activó ticket de cuadrilla pero no se encuentra la línea de venta de cuadrilla para facturar al cliente.'
            });
          }
        }
      }

      // ----------------------------------------------------
      // 5.5 INCIDENCIAS
      // ----------------------------------------------------
      // R-INC-01: Control cruzado de Falso Flete, Redestino y Multas
      if (reglasActivas.R_INC_01 && service.incidencias) {
        const inc = service.incidencias;
        if (inc.falsoFlete || inc.redestino || inc.multas) {
          const hasIncSale = service.lineas.some(l => l.codigo.includes('INCIDENCIA') || l.codigo.includes('FALSO_FLETE') || l.codigo.includes('REDESTINO'));
          if (!hasIncSale) {
            const incDesc = inc.falsoFlete ? 'Falso Flete' : (inc.redestino ? 'Redestino de Carga' : 'Multa Operativa');
            addDev({
              id: `DEV-${service.id}-R-INC-01`,
              idRegla: 'R-INC-01',
              severidad: 'Media',
              categoriaRegla: 'Incidencias',
              tipo: 'incidencia_pendiente',
              mensaje: `Incidencia operativa (${incDesc}) registrada en bitácora sin nota de cobro al cliente`,
              campoAfectado: 'Incidencias Operativas (Drive/BIT)',
              conceptoCodigo: 'INCIDENCIA_SIN_COBRO',
              conceptoNombre: `Cobro por Incidencia: ${incDesc}`,
              valorEsperado: 350000,
              valorCargado: 0,
              impactoClp: 350000,
              responsableRol: 'comercial',
              detallesExplicacion: `Incidencia '${incDesc}': ${inc.detalle || 'Requiere conciliación con planilla Drive y nota de cobro al mandante'}. Ref: ${inc.driveRef || 'N/A'}`
            });
          }
        }
      }

      // ----------------------------------------------------
      // PROYECCION DE CARGA SERVICES
      // ----------------------------------------------------
      if (service.estado === 'proyeccion' && service.proyeccion) {
        const p = service.proyeccion;
        const totalVenta = service.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);

        if (!p.tieneVentaCargada && totalVenta === 0 && (p.costoTransporteClp > 0 || p.tarifaPactadaClp > 0)) {
          addDev({
            id: `DEV-${service.id}-PROYECCION-SINVENTA`,
            idRegla: 'R-LIQ-01',
            severidad: 'Alta',
            categoriaRegla: 'Liquidación y Cierre',
            tipo: 'proyeccion_sin_venta',
            mensaje: 'Falta venta cargada en servicio en Proyección de Carga',
            campoAfectado: 'Líneas de Venta BIT',
            conceptoCodigo: 'VENTA_PROYECCION_FALTANTE',
            conceptoNombre: 'Venta Flete en Proyección',
            valorEsperado: p.tarifaPactadaClp,
            valorCargado: 0,
            impactoClp: p.tarifaPactadaClp || p.costoTransporteClp,
            responsableRol: 'comercial',
            detallesExplicacion: `N° Reg ${p.numReg} (${p.mandante}): Tarifa pactada de $${p.tarifaPactadaClp.toLocaleString('es-CL')} CLP sin línea de venta ingresada.`
          });
        }

        evaluatedServices.push(service);
        // Compute RF-06: Apto para facturación
        service.aptoFacturacion = !serviceDeviations.some(d => d.severidad === 'Alta' && d.estado === 'abierta');
        continue;
      }

      // ----------------------------------------------------
      // MATRIZ COMERCIAL EVALUATION
      // ----------------------------------------------------
      if (!client || !client.tieneMatriz || !agreement) {
        unmatchedServices.push(service);
        service.aptoFacturacion = !serviceDeviations.some(d => d.severidad === 'Alta' && d.estado === 'abierta');
        continue;
      }

      evaluatedServices.push(service);
      const isAgreementExpired = agreement.estado === 'vencido';

      // 1. Conceptos Faltantes de Matriz
      if (reglasActivas.conceptoFaltante) {
        for (const conceptDef of agreement.conceptos) {
          if (!conceptDef.obligatorio) continue;

          const matchingLine = service.lineas.find(l => l.codigo === conceptDef.codigo);
          if (!matchingLine) {
            addDev({
              id: `DEV-${service.id}-${conceptDef.codigo}-FALTANTE`,
              idRegla: 'R-MAT-01',
              severidad: 'Alta',
              categoriaRegla: 'Matriz Comercial',
              tipo: 'concepto_faltante',
              mensaje: `Concepto obligatorio '${conceptDef.nombre}' no cargado en la venta`,
              campoAfectado: `Línea de Concepto: ${conceptDef.nombre}`,
              conceptoCodigo: conceptDef.codigo,
              conceptoNombre: conceptDef.nombre,
              valorEsperado: conceptDef.valor,
              valorCargado: 0,
              impactoClp: conceptDef.valor,
              responsableRol: conceptDef.tipo === 'venta' ? 'comercial' : 'costos',
              detallesExplicacion: isAgreementExpired 
                ? `[Tarifa Vencida] Concepto '${conceptDef.nombre}' ausente. Tarifa expiró el ${agreement.vigenciaHasta}.`
                : `Concepto obligatorio '${conceptDef.nombre}' no figura en las líneas del servicio.`
            });
          }
        }
      }

      // 2. Líneas No Conciliables & Valor Fuera de Tarifa
      for (const line of service.lineas) {
        const conceptDef = agreement.conceptos.find(c => c.codigo === line.codigo);

        if (!conceptDef && line.codigo.startsWith('NO_CATALOGO')) {
          addDev({
            id: `DEV-${service.id}-${line.id}-NOCONCILIABLE`,
            idRegla: 'R-MAT-01',
            severidad: 'Alta',
            categoriaRegla: 'Matriz Comercial',
            tipo: 'no_conciliable',
            mensaje: `Concepto '${line.nombreConcepto}' no coincide con el catálogo del acuerdo comercial`,
            campoAfectado: 'Código de Concepto',
            conceptoCodigo: line.codigo,
            conceptoNombre: line.nombreConcepto || line.codigo,
            valorEsperado: 0,
            valorCargado: line.valor,
            impactoClp: line.valor,
            responsableRol: 'costos',
            detallesExplicacion: 'Código de concepto no registrado en la matriz comercial del cliente. Se requiere homologación.'
          });
          continue;
        }

        if (reglasActivas.valorFueraTarifa && conceptDef) {
          const delta = line.valor - conceptDef.valor;
          const absDelta = Math.abs(delta);
          const pctDiff = (absDelta / conceptDef.valor) * 100;

          if (absDelta > toleranciaAbsoluta && pctDiff > toleranciaPorcentaje) {
            addDev({
              id: `DEV-${service.id}-${line.codigo}-VALOR`,
              idRegla: 'R-MAT-01',
              severidad: 'Media',
              categoriaRegla: 'Matriz Comercial',
              tipo: 'valor_fuera_tarifa',
              mensaje: `Diferencia de $${absDelta.toLocaleString('es-CL')} CLP (${pctDiff.toFixed(1)}%) respecto a tarifa pactada`,
              campoAfectado: `Tarifa Concepto ${conceptDef.nombre}`,
              conceptoCodigo: line.codigo,
              conceptoNombre: conceptDef.nombre,
              valorEsperado: conceptDef.valor,
              valorCargado: line.valor,
              impactoClp: absDelta,
              responsableRol: line.tipo === 'venta' ? 'comercial' : 'costos',
              detallesExplicacion: delta < 0
                ? `Cargado por debajo de tarifa: esperados $${conceptDef.valor.toLocaleString('es-CL')} CLP, cargados $${line.valor.toLocaleString('es-CL')} CLP.`
                : `Cargado por sobre tarifa: esperados $${conceptDef.valor.toLocaleString('es-CL')} CLP, cargados $${line.valor.toLocaleString('es-CL')} CLP.`
            });
          }
        }
      }

      // 3. Costo sin Venta Asociada
      if (reglasActivas.costoSinVenta) {
        const costLines = service.lineas.filter(l => l.tipo === 'costo');
        for (const costLine of costLines) {
          const hasMatchingSale = service.lineas.some(
            l => l.tipo === 'venta' && (l.codigo === costLine.codigo || l.codigo === costLine.codigo.replace('_COSTO', ''))
          );

          if (!hasMatchingSale) {
            addDev({
              id: `DEV-${service.id}-${costLine.id}-COSTOSINVENTA`,
              idRegla: 'R-MAT-01',
              severidad: 'Alta',
              categoriaRegla: 'Matriz Comercial',
              tipo: 'costo_sin_venta',
              mensaje: `Costo ingresado ($${costLine.valor.toLocaleString('es-CL')} CLP) sin contraparte de venta al cliente`,
              campoAfectado: `Línea de Costo: ${costLine.nombreConcepto}`,
              conceptoCodigo: costLine.codigo,
              conceptoNombre: costLine.nombreConcepto || costLine.codigo,
              valorEsperado: 0,
              valorCargado: costLine.valor,
              impactoClp: costLine.valor,
              responsableRol: 'comercial',
              detallesExplicacion: `Existe un costo cargado por $${costLine.valor.toLocaleString('es-CL')} CLP (${costLine.nombreConcepto}) sin venta asociada.`
            });
          }
        }
      }

      // 4. Venta sin Costo en Servicios Cerrados
      if (reglasActivas.ventaSinCosto && (service.estado === 'cerrado' || service.estado === 'facturado')) {
        const saleLines = service.lineas.filter(l => l.tipo === 'venta');
        for (const saleLine of saleLines) {
          const hasMatchingCost = service.lineas.some(
            l => l.tipo === 'costo' && (l.codigo === saleLine.codigo || l.codigo === `${saleLine.codigo}_COSTO`)
          );

          if (!hasMatchingCost) {
            const estCost = Math.round(saleLine.valor * 0.75);
            addDev({
              id: `DEV-${service.id}-${saleLine.id}-VENTASINCOSTO`,
              idRegla: 'R-MAT-01',
              severidad: 'Media',
              categoriaRegla: 'Matriz Comercial',
              tipo: 'venta_sin_costo',
              mensaje: `Servicio cerrado con venta de ${saleLine.nombreConcepto} pero sin costo de proveedor cargado`,
              campoAfectado: `Costo Proveedor: ${saleLine.nombreConcepto}`,
              conceptoCodigo: saleLine.codigo,
              conceptoNombre: saleLine.nombreConcepto || saleLine.codigo,
              valorEsperado: estCost,
              valorCargado: 0,
              impactoClp: estCost,
              responsableRol: 'costos',
              detallesExplicacion: `El servicio está cerrado pero aún no se ingresa el costo del proveedor para ${saleLine.nombreConcepto}.`
            });
          }
        }
      }

      // 5. R-LIQ-01: Rentabilidad mínima (Margen)
      if (reglasActivas.R_LIQ_01 || reglasActivas.margenBajoMinimo) {
        const totalVenta = service.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
        const totalCosto = service.lineas.filter(l => l.tipo === 'costo').reduce((sum, l) => sum + l.valor, 0);

        if (totalVenta > 0) {
          const margenReal = (totalVenta - totalCosto) / totalVenta;
          const targetMargen = client.margenObjetivo || agreement.margenMinimo || this.settings.margenMinimoGlobal || 0.18;

          if (margenReal < targetMargen) {
            const shortfall = Math.round((targetMargen * totalVenta) - (totalVenta - totalCosto));
            addDev({
              id: `DEV-${service.id}-R-LIQ-01-MARGEN`,
              idRegla: 'R-LIQ-01',
              severidad: 'Alta',
              categoriaRegla: 'Liquidación y Cierre',
              tipo: 'margen_bajo_minimo',
              mensaje: `Margen proyectado de ${(margenReal * 100).toFixed(1)}% está por debajo del objetivo (${(targetMargen * 100).toFixed(1)}%)`,
              campoAfectado: 'Margen Operativo Comercial',
              conceptoCodigo: 'MARGEN_MINIMO_LIQ',
              conceptoNombre: 'Rentabilidad Mínima de Liquidación',
              valorEsperado: Math.round(targetMargen * 100),
              valorCargado: Math.round(margenReal * 100),
              monedaEsperada: '%',
              monedaCargada: '%',
              impactoClp: Math.max(0, shortfall),
              responsableRol: 'comercial',
              detallesExplicacion: `El servicio proyecta un margen de ${(margenReal * 100).toFixed(1)}%, no alcanzando el mínimo acordado de ${(targetMargen * 100).toFixed(1)}%. Desfase de ~$${shortfall.toLocaleString('es-CL')} CLP.`
            });
          }
        }
      }

      // RF-06: Clasificación para Facturación (Apto solo si no tiene alertas abiertas de severidad Alta)
      const hasOpenHighDev = serviceDeviations.some(d => d.severidad === 'Alta' && (d.estado === 'abierta' || d.estado === 'reabierta'));
      service.aptoFacturacion = !hasOpenHighDev;
    }

    return {
      deviations,
      evaluatedServices,
      unmatchedServices
    };
  }

  public updateDeviationStatus(
    deviationId: string,
    newStatus: DeviationStatus,
    role: Role,
    userName: string,
    comment: string
  ) {
    const existing = this.savedDeviationStates[deviationId] || {
      status: 'abierta',
      bitacora: []
    };

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      rol: role,
      usuario: userName,
      accion: `Cambio de estado a '${this.getLabelForStatus(newStatus)}'`,
      estadoAnterior: existing.status,
      estadoNuevo: newStatus,
      comentario: comment || 'Sin comentario registrado.'
    };

    this.savedDeviationStates[deviationId] = {
      status: newStatus,
      reincidente: existing.status === 'corregida' && newStatus === 'abierta' ? true : existing.reincidente,
      bitacora: [newLog, ...(existing.bitacora || [])]
    };

    this.saveAll();
  }

  private getLabelForStatus(st: DeviationStatus): string {
    switch (st) {
      case 'abierta': return 'Abierta';
      case 'en_revision': return 'En Revisión';
      case 'corregida': return 'Corregida';
      case 'excepcion_justificada': return 'Excepción Justificada';
      case 'reabierta': return 'Reabierta';
    }
  }

  private calculateAgeDays(dateStr: string): number {
    const created = new Date(dateStr).getTime();
    const now = new Date('2026-08-24').getTime();
    const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff);
  }
}

export const engineInstance = new EngineService();
