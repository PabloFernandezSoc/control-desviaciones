import React from 'react';
import { Ship, AlertTriangle, DollarSign, CheckCircle2 } from 'lucide-react';

interface KpiCardsProps {
  /** Todos los servicios que llegaron de la API y pasaron por el motor. */
  totalAnalyzed: number;
  /** De esos, los que además cruzan con una matriz comercial vigente. */
  totalWithMatrix: number;
  servicesWithDeviation: number;
  marginAtRiskClp: number;
  conformityPercentage: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({
  totalAnalyzed,
  totalWithMatrix,
  servicesWithDeviation,
  marginAtRiskClp,
  conformityPercentage
}) => {
  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Evaluated Services */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Servicios Analizados
          </p>
          <p className="text-2xl font-black text-slate-100">
            {totalAnalyzed}
          </p>
          <p className="text-xs text-slate-500">
            {totalWithMatrix} con matriz vigente
          </p>
        </div>
        <div className="p-3 bg-indigo-950/60 border border-indigo-800/60 rounded-lg text-indigo-400">
          <Ship className="w-6 h-6" />
        </div>
      </div>

      {/* 2. Services with Deviation */}
      <div className="bg-slate-900 border border-rose-900/40 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            Con Desviación
          </p>
          <p className="text-2xl font-black text-rose-300">
            {servicesWithDeviation}
            <span className="text-xs font-normal text-rose-400 ml-1">
              ({((servicesWithDeviation / Math.max(1, totalAnalyzed)) * 100).toFixed(0)}%)
            </span>
          </p>
          <p className="text-xs text-slate-500">
            Requieren revisión manual
          </p>
        </div>
        <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg text-rose-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
      </div>

      {/* 3. Margin at Risk CLP */}
      <div className="bg-slate-900 border border-amber-900/50 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
            Margen en Riesgo (CLP)
          </p>
          <p className="text-2xl font-black text-amber-300">
            {formatClp(marginAtRiskClp)}
          </p>
          <p className="text-xs text-amber-500/80 font-medium">
            Impacto financiero estimado
          </p>
        </div>
        <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-lg text-amber-400">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* 4. Conformity % */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Tasa de Conformidad
          </p>
          <p className="text-2xl font-black text-emerald-300">
            {conformityPercentage.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500">
            Meta v1: Línea base + 15 pp
          </p>
        </div>
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-lg text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

    </div>
  );
};
