import React, { useState, useMemo } from 'react';
import { Service, Client, Deviation } from '../types';
import { Search, Ship, Filter, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';

interface ServicesViewProps {
  services: Service[];
  clients: Client[];
  deviations: Deviation[];
  onSelectService: (service: Service) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  clients,
  deviations,
  onSelectService
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedConformity, setSelectedConformity] = useState('all');

  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Map service IDs that have open deviations
  const devServiceIds = useMemo(() => {
    const set = new Set<string>();
    deviations.forEach(d => {
      if (d.estado === 'abierta' || d.estado === 'en_revision' || d.estado === 'reabierta') {
        set.add(d.servicioId);
      }
    });
    return set;
  }, [deviations]);

  const filteredServices = useMemo(() => {
    return services.filter(s => {
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        if (!s.id.toLowerCase().includes(term) && !s.clienteNombre.toLowerCase().includes(term)) {
          return false;
        }
      }

      if (selectedClient !== 'all' && s.clienteId !== selectedClient) {
        return false;
      }

      if (selectedState !== 'all' && s.estado !== selectedState) {
        return false;
      }

      if (selectedConformity === 'con_desviacion' && !devServiceIds.has(s.id)) {
        return false;
      }

      if (selectedConformity === 'conforme' && devServiceIds.has(s.id)) {
        return false;
      }

      return true;
    });
  }, [services, searchTerm, selectedClient, selectedState, selectedConformity, devServiceIds]);

  return (
    <div className="space-y-4">
      
      {/* Search & Filters Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Ship className="w-5 h-5 text-indigo-600" />
            <span>Todos los Servicios Evaluados ({services.length})</span>
          </h2>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar servicio por ID o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filter selects */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtros:
          </span>

          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Todos los Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Todos los Estados Operativos</option>
            <option value="confirmado">Confirmado</option>
            <option value="en_transito">En Tránsito</option>
            <option value="cerrado">Cerrado</option>
            <option value="facturado">Facturado</option>
          </select>

          <select
            value={selectedConformity}
            onChange={(e) => setSelectedConformity(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 cursor-pointer"
          >
            <option value="all">Todas las Evaluaciones</option>
            <option value="con_desviacion">Con Desviación Activa</option>
            <option value="conforme">Conforme (Sin Desviación)</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">ID Servicio</th>
                <th className="py-3 px-4">Cliente / Ejecutivo</th>
                <th className="py-3 px-4">Ruta / Equipos</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Venta Total</th>
                <th className="py-3 px-4 text-right">Costo Total</th>
                <th className="py-3 px-4 text-center">Conformidad</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredServices.map(srv => {
                const totalVenta = srv.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
                const totalCosto = srv.lineas.filter(l => l.tipo === 'costo').reduce((sum, l) => sum + l.valor, 0);
                const hasDev = devServiceIds.has(srv.id);

                return (
                  <tr
                    key={srv.id}
                    onClick={() => onSelectService(srv)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-indigo-600">
                      {srv.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{srv.clienteNombre}</div>
                      <div className="text-[11px] text-slate-400">{srv.ejecutivo}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-700">{srv.ruta.origen} → {srv.ruta.destino}</div>
                      <div className="text-[11px] text-slate-400">
                        {srv.contenedores.map(c => `${c.cantidad}x ${c.tipo}`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                        {srv.estado}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatClp(totalVenta)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                      {formatClp(totalCosto)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {hasDev ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Con Desviación
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Conforme
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
