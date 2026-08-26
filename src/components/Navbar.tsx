import React from 'react';
import { Role } from '../types';
import { ShieldAlert, RefreshCw, UserCheck, CheckCircle2, Clock } from 'lucide-react';

interface NavbarProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  onActualizarDatos: () => void;
  isSyncing: boolean;
  lastSyncTime: string;
  /** Origen efectivo de la última lectura, para que se note si es maqueta o API. */
  modoLectura: 'remoto' | 'maqueta';
  openDeviationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onActualizarDatos,
  isSyncing,
  lastSyncTime,
  modoLectura,
  openDeviationsCount
}) => {
  const formatTime = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'reciente';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand & App Title */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-rose-600 to-amber-500 text-white p-2 rounded-lg shadow-inner flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Control de Desviaciones</h1>
              <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
                BIT v0.9
              </span>
            </div>
            <p className="text-xs text-slate-400">
              LYD Cargo · Control Comercial y de Costos sobre Servicios
            </p>
          </div>
        </div>

        {/* Action Controls & Role Switcher */}
        <div className="flex items-center gap-4 flex-wrap">
          
          {/* Sync status */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Última lectura: <strong className="text-slate-100">{formatTime(lastSyncTime)}</strong></span>
            <span
              className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                modoLectura === 'remoto'
                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                  : 'bg-slate-700/60 text-slate-300 border border-slate-600'
              }`}
              title={
                modoLectura === 'remoto'
                  ? 'Los datos provienen de las fuentes configuradas'
                  : 'Sin fuentes configuradas: se trabaja sobre los datos de maqueta'
              }
            >
              {modoLectura === 'remoto' ? 'En línea' : 'Maqueta'}
            </span>
          </div>

          <button
            onClick={onActualizarDatos}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Relee las fuentes configuradas y avisa qué cambió desde la última lectura"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
            <span>{isSyncing ? 'Actualizando...' : 'Actualizar datos'}</span>
          </button>

          {/* Role selector dropdown/toggle */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg p-1">
            <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-slate-400">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Rol activo:</span>
            </div>
            <button
              onClick={() => onRoleChange('comercial')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'comercial'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Comercial
            </button>
            <button
              onClick={() => onRoleChange('costos')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'costos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Costos y Booking
            </button>
            <button
              onClick={() => onRoleChange('admin')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Administrador
            </button>
          </div>

          {/* Alert Counter Badge */}
          <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800/80 text-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>{openDeviationsCount} abiertas</span>
          </div>

        </div>

      </div>
    </header>
  );
};
