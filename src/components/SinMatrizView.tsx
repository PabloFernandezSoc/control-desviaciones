import React from 'react';
import { Service, Client } from '../types';
import { HelpCircle, Plus } from 'lucide-react';

interface SinMatrizViewProps {
  unmatchedServices: Service[];
  clients: Client[];
  onNavigateToMatriz: () => void;
}

export const SinMatrizView: React.FC<SinMatrizViewProps> = ({
  unmatchedServices,
  clients,
  onNavigateToMatriz
}) => {
  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-4">
      
      {/* Information Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold">Servicios de Clientes Sin Matriz Comercial ({unmatchedServices.length})</h2>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Los siguientes servicios pertenecen a clientes que no cuentan con una matriz de condiciones comerciales activa. No se contabilizan como conformes ni como desviación tarifaria hasta crear su respectiva matriz en CLP.
        </p>
      </div>

      {/* Services Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="py-3 px-4">ID Servicio</th>
                <th className="py-3 px-4">Cliente / Ejecutivo</th>
                <th className="py-3 px-4">Ruta / Equipos</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Venta BIT (CLP)</th>
                <th className="py-3 px-4 text-right">Costo BIT (CLP)</th>
                <th className="py-3 px-4 text-center">Acción Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {unmatchedServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No hay servicios pendientes de asignación de matriz comercial.
                  </td>
                </tr>
              ) : (
                unmatchedServices.map((srv) => {
                  const totalVenta = srv.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
                  const totalCosto = srv.lineas.filter(l => l.tipo === 'costo').reduce((sum, l) => sum + l.valor, 0);

                  return (
                    <tr key={srv.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {srv.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{srv.clienteNombre}</div>
                        <div className="text-[11px] text-slate-400">{srv.ejecutivo}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {srv.ruta.origen} → {srv.ruta.destino}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 border border-slate-300 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
                          {srv.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatClp(totalVenta)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatClp(totalCosto)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={onNavigateToMatriz}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear Matriz</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
