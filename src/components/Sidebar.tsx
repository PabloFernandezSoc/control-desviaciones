import React from 'react';
import { 
  BarChart3,
  Inbox, 
  Ship, 
  FileText, 
  HelpCircle, 
  Settings, 
  AlertTriangle,
  Link2
} from 'lucide-react';
import { Role } from '../types';

export type ViewTab = 'dashboard' | 'bandeja' | 'proyeccion' | 'servicios' | 'matriz' | 'sin_matriz' | 'mapeo' | 'configuracion';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  openDeviationsCount: number;
  totalServicesCount: number;
  unmatchedServicesCount: number;
  expiredAgreementsCount: number;
  projectionServicesCount: number;
  sinVentaCount: number;
  currentRole: Role;
  /** Reglas apagadas porque falta su columna en el reporte. */
  reglasDesactivadasCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  openDeviationsCount,
  totalServicesCount,
  unmatchedServicesCount,
  expiredAgreementsCount,
  projectionServicesCount,
  sinVentaCount,
  currentRole,
  reglasDesactivadasCount
}) => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0">
      <div className="p-4 space-y-6">
        
        {/* Nav Header */}
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
          Navegación Principal
        </div>

        {/* Links */}
        <nav className="space-y-1">

          {/* Dashboard */}
          <button
            onClick={() => onTabChange('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Dashboard Proyección</span>
            </div>
            <span className="text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/80 px-1.5 py-0.5 rounded">
              KPIs
            </span>
          </button>
          
          {/* Bandeja de Desviaciones */}
          <button
            onClick={() => onTabChange('bandeja')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'bandeja'
                ? 'bg-rose-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Inbox className="w-4 h-4 text-rose-400" />
              <span>Bandeja Desviaciones</span>
            </div>
            {openDeviationsCount > 0 && (
              <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                activeTab === 'bandeja' ? 'bg-white text-rose-700' : 'bg-rose-900/80 text-rose-200 border border-rose-700/60'
              }`}>
                {openDeviationsCount}
              </span>
            )}
          </button>

          {/* Proyección de Carga */}
          <button
            onClick={() => onTabChange('proyeccion')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'proyeccion'
                ? 'bg-blue-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Ship className="w-4 h-4 text-blue-400" />
              <span>Proyección de Carga</span>
            </div>
            {sinVentaCount > 0 ? (
              <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded-full" title="Servicios sin venta cargada">
                ⚠️ {sinVentaCount}
              </span>
            ) : (
              <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                {projectionServicesCount}
              </span>
            )}
          </button>

          {/* Todos los Servicios */}
          <button
            onClick={() => onTabChange('servicios')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'servicios'
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Servicios Evaluados</span>
            </div>
            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
              {totalServicesCount}
            </span>
          </button>

          {/* Matriz Comercial */}
          <button
            onClick={() => onTabChange('matriz')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'matriz'
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4" />
              <span>Matriz Comercial</span>
            </div>
            {expiredAgreementsCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-amber-950/80 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded font-bold" title="Acuerdos vencidos">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                {expiredAgreementsCount}
              </span>
            )}
          </button>

          {/* Bandeja Sin Matriz */}
          <button
            onClick={() => onTabChange('sin_matriz')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'sin_matriz'
                ? 'bg-slate-700 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Sin Matriz</span>
            </div>
            {unmatchedServicesCount > 0 && (
              <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400 font-semibold">
                {unmatchedServicesCount}
              </span>
            )}
          </button>

          {/* Mapeo de Origen de Datos */}
          <button
            onClick={() => onTabChange('mapeo')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'mapeo'
                ? 'bg-indigo-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-indigo-400" />
              <span>Mapeo de Campos</span>
            </div>
            {reglasDesactivadasCount > 0 ? (
              <span
                className="flex items-center gap-1 text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded"
                title="Reglas que no se evalúan porque falta su columna en el reporte"
              >
                <AlertTriangle className="w-3 h-3" />
                {reglasDesactivadasCount}
              </span>
            ) : (
              <span className="text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                API
              </span>
            )}
          </button>

          {/* Configuración (Solo visible o resaltada para Admin, accesible) */}
          <button
            onClick={() => onTabChange('configuracion')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'configuracion'
                ? 'bg-amber-600 text-white font-semibold shadow-md'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4" />
              <span>Configuración</span>
            </div>
            {currentRole === 'admin' && (
              <span className="text-[10px] uppercase font-bold bg-amber-900/60 border border-amber-700/80 text-amber-200 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </button>

        </nav>

        {/* Legend / Context Box */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-xs space-y-2">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Línea Base
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Detección previa al cierre/facturación. Revisa diferencias de margen, conceptos faltantes o costos sin venta.
          </p>
        </div>

      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Sistema BIT</span>
          <span className="text-slate-400 font-mono">v0.9.2</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Entorno Maqueta LYD Cargo
        </div>
      </div>
    </aside>
  );
};
