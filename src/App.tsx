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
import {
  FieldMappingState,
  FIELD_CATALOG,
  MergeResult,
  loadFieldMapping,
  saveFieldMapping,
} from './services/dataSources';
import {
  IntegrationConfig,
  IntegrationError,
  hayFuenteRemota,
  loadIntegrationConfig,
  saveIntegrationConfig,
} from './services/apiClient';
import {
  ModoActualizacion,
  actualizarDatos,
  notificacionesDeActualizacion,
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

  // Integración: mapeo de origen de datos y conexión con las fuentes
  const [fieldMapping, setFieldMapping] = useState<FieldMappingState>(() => loadFieldMapping());
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>(() =>
    loadIntegrationConfig(),
  );
  const [ultimoCruce, setUltimoCruce] = useState<MergeResult<Service> | null>(null);
  const [modoLectura, setModoLectura] = useState<ModoActualizacion>(() =>
    hayFuenteRemota(loadIntegrationConfig()) ? 'remoto' : 'maqueta',
  );

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

  // Campos que hoy se resuelven contra la planilla, para el badge del sidebar.
  const camposDesdeSheetsCount = useMemo(() => {
    return FIELD_CATALOG.filter((campo) => {
      const origen = campo.bloqueado
        ? campo.origenPorDefecto
        : fieldMapping[campo.key] ?? campo.origenPorDefecto;
      return origen === 'sheets';
    }).length;
  }, [fieldMapping]);

  // Persistencia del mapeo y de la configuración de las fuentes
  const handleChangeMapeo = (nuevo: FieldMappingState) => {
    setFieldMapping(nuevo);
    saveFieldMapping(nuevo);
  };

  const handleChangeConfig = (nueva: IntegrationConfig) => {
    setIntegrationConfig(nueva);
    saveIntegrationConfig(nueva);
    setModoLectura(hayFuenteRemota(nueva) ? 'remoto' : 'maqueta');
    toast.mostrar({
      variante: 'info',
      titulo: 'Conexión actualizada',
      mensaje: hayFuenteRemota(nueva)
        ? 'La próxima actualización leerá las fuentes configuradas.'
        : 'Sin fuentes activas: se seguirá trabajando sobre los datos de maqueta.',
    });
  };

  /**
   * "Actualizar datos": lee las fuentes, cruza según el mapeo, compara contra la
   * lectura anterior y avisa los cambios con notificaciones.
   */
  const handleActualizarDatos = async () => {
    if (isSyncing) return;
    setIsSyncing(true);

    try {
      const resultado = await actualizarDatos(fieldMapping, integrationConfig);

      setLastSyncTime(resultado.timestamp);
      setModoLectura(resultado.modo);
      setUltimoCruce(resultado.cruce);
      forceRefresh();

      toast.mostrarVarios(notificacionesDeActualizacion(resultado));
    } catch (e) {
      const mensaje =
        e instanceof IntegrationError
          ? e.message
          : `No se pudo actualizar: ${(e as Error)?.message ?? 'error desconocido'}.`;
      toast.mostrar({
        variante: 'error',
        titulo: 'Actualización fallida',
        mensaje,
        detalle: ['Los datos en pantalla siguen siendo los de la última lectura correcta.'],
        duracionMs: 9000,
      });
    } finally {
      setIsSyncing(false);
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

  const conformityPercentage = useMemo(() => {
    const total = evaluatedServices.length;
    if (total === 0) return 100;
    const conformes = total - servicesWithDeviationCount;
    return (conformes / total) * 100;
  }, [evaluatedServices.length, servicesWithDeviationCount]);

  const expiredAgreementsCount = useMemo(() => {
    return agreements.filter(a => a.estado === 'vencido').length;
  }, [agreements]);

  // Open Service Modal
  const handleSelectDeviation = (dev: Deviation) => {
    const srv = evaluatedServices.find(s => s.id === dev.servicioId);
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
    const idx = evaluatedServices.findIndex(s => s.id === selectedService.id);
    if (idx === -1) return;

    let targetIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (targetIdx < 0) targetIdx = evaluatedServices.length - 1;
    if (targetIdx >= evaluatedServices.length) targetIdx = 0;

    const nextSrv = evaluatedServices[targetIdx];
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
        modoLectura={modoLectura}
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
          camposDesdeSheetsCount={camposDesdeSheetsCount}
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
                totalEvaluated={evaluatedServices.length}
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
              clients={clients}
              onSelectService={handleSelectServiceDirect}
              onAddVentaLine={(serviceId, concepto, valorClp) => {
                engineInstance.addVentaLineToService(serviceId, concepto, valorClp);
                forceRefresh();
              }}
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
              mapeo={fieldMapping}
              onChangeMapeo={handleChangeMapeo}
              config={integrationConfig}
              onChangeConfig={handleChangeConfig}
              ultimoCruce={ultimoCruce}
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
                engineInstance.resetToSeed();
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
        />
      )}

    </div>
  );
}
