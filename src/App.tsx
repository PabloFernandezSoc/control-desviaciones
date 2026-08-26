/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Role, 
  Service, 
  Deviation, 
  Agreement, 
  DeviationStatus,
  SystemSettings 
} from './types';
import { engineInstance } from './services/engine';
import { Navbar } from './components/Navbar';
import { Sidebar, ViewTab } from './components/Sidebar';
import { KpiCards } from './components/KpiCards';
import { DeviationsTable } from './components/DeviationsTable';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { ServicesView } from './components/ServicesView';
import { ProyeccionCargaView } from './components/ProyeccionCargaView';
import { DashboardView } from './components/DashboardView';
import { MatrizComercialView } from './components/MatrizComercialView';
import { SinMatrizView } from './components/SinMatrizView';
import { SettingsView } from './components/SettingsView';
import { FieldMappingView } from './components/FieldMappingView';
import { ToastProvider, useToast } from './components/Toast';
import { InfoColumna, MapeoCampos, loadMapeo, saveMapeo } from './services/fieldMapping';
import { ApiConfig, loadApiConfig, saveApiConfig, getUltimaRespuesta } from './services/apiClient';
import { Complementos, loadComplementos, saveComplementos } from './services/complementos';
import {
  OrigenDatos,
  RefreshOutcome,
  actualizarDatos,
  cargarDesdeCopiaLocal,
  notificacionesDeActualizacion,
  procesarJsonPegado,
  reprocesarConMapeo,
} from './services/refreshPipeline';

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  const toast = useToast();

  // Global State
  const [currentRole, setCurrentRole] = useState<Role>('comercial');
  const [activeTab, setActiveTab] = useState<ViewTab>('bandeja');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(engineInstance.getLastSyncTime());
  
  // Selected Modal State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDeviation, setSelectedDeviation] = useState<Deviation | null>(null);

  // Integración con la API: única fuente de datos de servicios
  const [apiConfig, setApiConfig] = useState<ApiConfig>(() => loadApiConfig());
  const [mapeo, setMapeo] = useState<MapeoCampos>(() => loadMapeo());
  const [columnas, setColumnas] = useState<Record<string, InfoColumna>>({});
  const [reglasDesactivadas, setReglasDesactivadas] = useState<RefreshOutcome['reglasDesactivadas']>([]);
  const [origenDatos, setOrigenDatos] = useState<OrigenDatos | null>(null);
  const [filasRecibidas, setFilasRecibidas] = useState(0);
  const [latenciaMs, setLatenciaMs] = useState<number | null>(null);
  const [complementos, setComplementos] = useState<Complementos>(() => loadComplementos());

  // Trigger state increment for re-evaluations
  const [refreshTick, setRefreshTick] = useState(0);

  const forceRefresh = () => setRefreshTick(prev => prev + 1);

  // Run Rule Engine Detection
  const { deviations, evaluatedServices, unmatchedServices } = useMemo(() => {
    return engineInstance.detectDeviations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const clients = useMemo(() => engineInstance.getClients(), [refreshTick]);
  const agreements = useMemo(() => engineInstance.getAgreements(), [refreshTick]);
  const settings = useMemo(() => engineInstance.getSettings(), [refreshTick]);

  /** Aplica el resultado de una lectura al estado de la pantalla. */
  const aplicarResultado = (r: RefreshOutcome) => {
    setLastSyncTime(r.timestamp);
    setOrigenDatos(r.origen);
    setColumnas(r.columnas);
    setMapeo(r.mapeo);
    setReglasDesactivadas(r.reglasDesactivadas);
    setFilasRecibidas(r.filas);
    setLatenciaMs(r.latenciaMs);
    forceRefresh();
  };

  /**
   * "Actualizar datos": consulta el reporte de BIT, reconstruye el modelo y
   * avisa qué cambió respecto de la lectura anterior.
   */
  const handleActualizarDatos = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const resultado = await actualizarDatos(apiConfig);
      aplicarResultado(resultado);
      toast.mostrarVarios(notificacionesDeActualizacion(resultado));
    } catch (e) {
      toast.mostrar({
        variante: 'error',
        titulo: 'No se pudo leer la API',
        mensaje: (e as Error)?.message ?? 'Error desconocido.',
        detalle: ['Revisa la conexión en Mapeo de Campos.'],
        duracionMs: 10000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Primera carga: se pinta la copia local si existe y se consulta la API.
  useEffect(() => {
    const copia = cargarDesdeCopiaLocal();
    if (copia) aplicarResultado(copia);
    if (apiConfig.apiKey.trim() || apiConfig.proxy.trim()) {
      handleActualizarDatos();
    } else if (!copia) {
      toast.mostrar({
        variante: 'info',
        titulo: 'Falta configurar la conexión',
        mensaje: 'Carga la apiKey del reporte de BIT en Mapeo de Campos para empezar.',
        duracionMs: 9000,
      });
      setActiveTab('mapeo');
    }
    // Sólo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * El usuario cargó un dato que la API no trae: se guarda y se reconstruye el
   * modelo con la copia local, para que las reglas lo tomen de inmediato.
   */
  const handleChangeComplementos = (siguiente: Complementos) => {
    setComplementos(siguiente);
    saveComplementos(siguiente);
    const resultado = reprocesarConMapeo(mapeo);
    if (resultado) aplicarResultado(resultado);
  };

  /** Procesa una respuesta pegada a mano (sin red). */
  const handlePegarJson = (texto: string) => {
    try {
      const resultado = procesarJsonPegado(texto);
      aplicarResultado(resultado);
      toast.mostrar({
        variante: 'success',
        titulo: 'JSON procesado',
        mensaje: `${resultado.filas} filas leídas, ${resultado.servicios} servicios construidos.`,
      });
    } catch (e) {
      toast.mostrar({
        variante: 'error',
        titulo: 'No se pudo procesar el JSON',
        mensaje: (e as Error)?.message ?? 'Error desconocido.',
        duracionMs: 9000,
      });
    }
  };

  const handleChangeApiConfig = (nueva: ApiConfig) => {
    setApiConfig(nueva);
    saveApiConfig(nueva);
  };

  /**
   * El usuario corrigió una asignación: se reconstruye con la copia local, sin
   * volver a llamar a la API.
   */
  const handleChangeMapeo = (nuevo: MapeoCampos) => {
    setMapeo(nuevo);
    saveMapeo(nuevo);

    const resultado = reprocesarConMapeo(nuevo);
    if (resultado) {
      aplicarResultado(resultado);
    } else {
      toast.mostrar({
        variante: 'info',
        titulo: 'Sin datos que reprocesar',
        mensaje: 'Lee la API una vez para poder aplicar el mapeo.',
      });
    }
  };

  // Status update handler
  const handleUpdateStatus = (
    deviationId: string, 
    newStatus: DeviationStatus, 
    role: Role, 
    userName: string, 
    comment: string
  ) => {
    engineInstance.updateDeviationStatus(deviationId, newStatus, role, userName, comment);
    forceRefresh();
    
    // Update active deviation reference in drawer
    if (selectedDeviation && selectedDeviation.id === deviationId) {
      const updated = engineInstance.detectDeviations().deviations.find(d => d.id === deviationId);
      if (updated) {
        setSelectedDeviation(updated);
      }
    }
  };

  // KPI metrics
  const openDeviations = useMemo(() => {
    return deviations.filter(d => d.estado === 'abierta' || d.estado === 'en_revision' || d.estado === 'reabierta');
  }, [deviations]);

  const marginAtRiskClp = useMemo(() => {
    return openDeviations.reduce((sum, d) => sum + (d.impactoClp || d.impactoUsd || 0), 0);
  }, [openDeviations]);

  const servicesWithDeviationCount = useMemo(() => {
    const set = new Set<string>();
    openDeviations.forEach(d => set.add(d.servicioId));
    return set.size;
  }, [openDeviations]);

  // Projection services
  const projectionServices = useMemo(() => {
    return engineInstance.getProjectionServices();
  }, [refreshTick]);

  const sinVentaCount = useMemo(() => {
    return projectionServices.filter(s => {
      const tieneVenta = s.lineas.some(l => l.tipo === 'venta');
      return !tieneVenta;
    }).length;
  }, [projectionServices]);

  /**
   * Los KPI se calculan sobre TODOS los servicios analizados, no sólo los que
   * cruzan con la matriz comercial: las reglas generales (peso, fechas,
   * stacking) se evalúan igual sin matriz, y sus hallazgos aparecen en la
   * bandeja. Usar sólo los servicios con matriz como denominador daba
   * porcentajes por encima de 100.
   */
  const analyzedServicesCount = useMemo(
    () => evaluatedServices.length + unmatchedServices.length,
    [evaluatedServices.length, unmatchedServices.length],
  );

  const conformityPercentage = useMemo(() => {
    if (analyzedServicesCount === 0) return 100;
    const conformes = analyzedServicesCount - servicesWithDeviationCount;
    return (Math.max(0, conformes) / analyzedServicesCount) * 100;
  }, [analyzedServicesCount, servicesWithDeviationCount]);

  const expiredAgreementsCount = useMemo(() => {
    return agreements.filter(a => a.estado === 'vencido').length;
  }, [agreements]);

  // Open Service Modal
  /**
   * Todos los servicios analizados, con o sin matriz comercial.
   *
   * La bandeja lista desviaciones de ambos grupos —las reglas generales se
   * evalúan igual sin matriz—, así que la ficha y la navegación tienen que
   * poder alcanzarlos a todos. Buscar sólo entre los evaluados hacía que las
   * filas de clientes sin matriz no abrieran nada, sin decir por qué.
   */
  const allServices = useMemo(
    () => [...evaluatedServices, ...unmatchedServices],
    [evaluatedServices, unmatchedServices],
  );

  const handleSelectDeviation = (dev: Deviation) => {
    const srv = allServices.find(s => s.id === dev.servicioId);
    if (srv) {
      setSelectedService(srv);
      setSelectedDeviation(dev);
    }
  };

  const handleSelectServiceDirect = (srv: Service) => {
    setSelectedService(srv);
    const dev = deviations.find(d => d.servicioId === srv.id && (d.estado === 'abierta' || d.estado === 'en_revision' || d.estado === 'reabierta'));
    setSelectedDeviation(dev || null);
  };

  const activeAgreementForSelectedService = useMemo(() => {
    if (!selectedService) return null;
    return agreements.find(a => a.clienteId === selectedService.clienteId) || null;
  }, [selectedService, agreements]);

  // Drawer Next/Prev navigation
  const handleNavigateModal = (direction: 'next' | 'prev') => {
    if (!selectedService) return;
    const idx = allServices.findIndex(s => s.id === selectedService.id);
    if (idx === -1) return;

    let targetIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (targetIdx < 0) targetIdx = allServices.length - 1;
    if (targetIdx >= allServices.length) targetIdx = 0;

    const nextSrv = allServices[targetIdx];
    setSelectedService(nextSrv);
    const dev = deviations.find(d => d.servicioId === nextSrv.id && (d.estado === 'abierta' || d.estado === 'en_revision' || d.estado === 'reabierta'));
    setSelectedDeviation(dev || null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-rose-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onActualizarDatos={handleActualizarDatos}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        origenDatos={origenDatos}
        openDeviationsCount={openDeviations.length}
      />

      {/* App Body with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          openDeviationsCount={openDeviations.length}
          totalServicesCount={evaluatedServices.length}
          unmatchedServicesCount={unmatchedServices.length}
          expiredAgreementsCount={expiredAgreementsCount}
          projectionServicesCount={projectionServices.length}
          sinVentaCount={sinVentaCount}
          currentRole={currentRole}
          reglasDesactivadasCount={reglasDesactivadas.length}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <DashboardView
              projectionServices={projectionServices}
              allServices={evaluatedServices}
              onSelectService={handleSelectServiceDirect}
            />
          )}

          {/* BANDEJA DE DESVIACIONES VIEW */}
          {activeTab === 'bandeja' && (
            <div className="space-y-6">
              <KpiCards
                totalAnalyzed={analyzedServicesCount}
                totalWithMatrix={evaluatedServices.length}
                servicesWithDeviation={servicesWithDeviationCount}
                marginAtRiskClp={marginAtRiskClp}
                conformityPercentage={conformityPercentage}
              />

              <DeviationsTable
                deviations={deviations}
                clients={clients}
                currentRole={currentRole}
                onSelectDeviation={handleSelectDeviation}
              />
            </div>
          )}

          {/* PROYECCION DE CARGA VIEW */}
          {activeTab === 'proyeccion' && (
            <ProyeccionCargaView
              services={projectionServices}
              onOpenServiceModal={handleSelectServiceDirect}
            />
          )}

          {/* SERVICIOS EVALUADOS VIEW */}
          {activeTab === 'servicios' && (
            <ServicesView
              services={evaluatedServices}
              clients={clients}
              deviations={deviations}
              onSelectService={handleSelectServiceDirect}
            />
          )}

          {/* MATRIZ COMERCIAL VIEW */}
          {activeTab === 'matriz' && (
            <MatrizComercialView
              agreements={agreements}
              clients={clients}
              onSaveAgreement={(ag) => {
                engineInstance.saveAgreement(ag);
                forceRefresh();
              }}
            />
          )}

          {/* SIN MATRIZ VIEW */}
          {activeTab === 'sin_matriz' && (
            <SinMatrizView
              unmatchedServices={unmatchedServices}
              clients={clients}
              onNavigateToMatriz={() => setActiveTab('matriz')}
            />
          )}

          {/* MAPEO DE ORIGEN DE DATOS VIEW */}
          {activeTab === 'mapeo' && (
            <FieldMappingView
              columnas={columnas}
              mapeo={mapeo}
              onChangeMapeo={handleChangeMapeo}
              reglasDesactivadas={reglasDesactivadas}
              config={apiConfig}
              onChangeConfig={handleChangeApiConfig}
              onProbarConexion={handleActualizarDatos}
              cargando={isSyncing}
              filas={filasRecibidas}
              servicios={engineInstance.getServices().length}
              latenciaMs={latenciaMs}
              respuestaCruda={getUltimaRespuesta()}
              onPegarJson={handlePegarJson}
            />
          )}

          {/* CONFIGURACION VIEW */}
          {activeTab === 'configuracion' && (
            <SettingsView
              settings={settings}
              currentRole={currentRole}
              onUpdateSettings={(newSettings) => {
                engineInstance.updateSettings(newSettings);
                forceRefresh();
              }}
              onResetSeed={() => {
                engineInstance.resetConfig();
                forceRefresh();
              }}
            />
          )}

        </main>

      </div>

      {/* Service Detail Drawer Modal */}
      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          deviation={selectedDeviation}
          agreement={activeAgreementForSelectedService}
          currentRole={currentRole}
          onClose={() => { setSelectedService(null); setSelectedDeviation(null); }}
          onUpdateStatus={handleUpdateStatus}
          onNavigateNext={() => handleNavigateModal('next')}
          onNavigatePrev={() => handleNavigateModal('prev')}
          complementos={complementos}
          onChangeComplementos={handleChangeComplementos}
        />
      )}

    </div>
  );
}
