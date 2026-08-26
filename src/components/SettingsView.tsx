import React, { useState } from 'react';
import { SystemSettings, Role } from '../types';
import { Settings, RotateCcw, Check, Save, AlertCircle, ShieldCheck, Truck, Scale, Clock, Layers } from 'lucide-react';

interface SettingsViewProps {
  settings: SystemSettings;
  currentRole: Role;
  onUpdateSettings: (settings: SystemSettings) => void;
  onResetSeed: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentRole,
  onUpdateSettings,
  onResetSeed
}) => {
  const [formState, setFormState] = useState<SystemSettings>(JSON.parse(JSON.stringify(settings)));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onUpdateSettings(formState);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleToggleRule = (key: keyof typeof formState.reglasActivas) => {
    setFormState({
      ...formState,
      reglasActivas: {
        ...formState.reglasActivas,
        [key]: !formState.reglasActivas[key]
      }
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      
      {/* Settings Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Configuración de Reglas de Negocio PRD y Tolerancias (CLP)</h2>
        </div>
        <p className="text-xs text-slate-500">
          Ajuste los parámetros del motor de validación (R-GEN a R-LIQ). Las modificaciones recalculan las alertas de las operaciones en tiempo real.
        </p>
      </div>

      {currentRole !== 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2 text-xs text-amber-800 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Modo solo lectura. Para modificar reglas o restaurar la base de datos de prueba, seleccione el rol Administrador en la barra superior.</span>
        </div>
      )}

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Configuración guardada correctamente y motor de reglas recalculado.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6 text-xs">
        
        {/* Operational & Financial Thresholds */}
        <div className="space-y-4 pb-6 border-b border-slate-200">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            Umbrales Operativos y Tolerancias Financieras (Moneda CLP)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tolerancia Absoluta ($ CLP)
              </label>
              <input
                type="number"
                step="5000"
                disabled={currentRole !== 'admin'}
                value={formState.toleranciaAbsolutaClp || 25000}
                onChange={(e) => setFormState({
                  ...formState,
                  toleranciaAbsolutaClp: parseFloat(e.target.value) || 0
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Diferencias menores a este monto en CLP no alertarán.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tolerancia Porcentual (%)
              </label>
              <input
                type="number"
                step="0.5"
                disabled={currentRole !== 'admin'}
                value={formState.toleranciaPorcentaje}
                onChange={(e) => setFormState({
                  ...formState,
                  toleranciaPorcentaje: parseFloat(e.target.value) || 0
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Porcentaje mínimo de desviación vs tarifa pactada.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Margen Mínimo Global (%)
              </label>
              <input
                type="number"
                step="1"
                disabled={currentRole !== 'admin'}
                value={Math.round(formState.margenMinimoGlobal * 100)}
                onChange={(e) => setFormState({
                  ...formState,
                  margenMinimoGlobal: (parseFloat(e.target.value) || 0) / 100
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Rentabilidad objetivo mínima para alertar (R-LIQ-01).
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Umbral Estadía en Faena (Horas)
              </label>
              <input
                type="number"
                step="0.5"
                disabled={currentRole !== 'admin'}
                value={formState.umbralHorasEstadia || 4}
                onChange={(e) => setFormState({
                  ...formState,
                  umbralHorasEstadia: parseFloat(e.target.value) || 4
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tiempo libre acordado en planta (R-GEN-05).
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Almacenaje Preventivo (Días)
              </label>
              <input
                type="number"
                step="1"
                disabled={currentRole !== 'admin'}
                value={formState.umbralDiasAlmacenaje || 2}
                onChange={(e) => setFormState({
                  ...formState,
                  umbralDiasAlmacenaje: parseInt(e.target.value) || 2
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Días de custodia antes de alertar extra costo (R-EXC-02).
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tope Peso Carga (Kg)
              </label>
              <input
                type="number"
                step="500"
                disabled={currentRole !== 'admin'}
                value={formState.topePesoKg || 25000}
                onChange={(e) => setFormState({
                  ...formState,
                  topePesoKg: parseFloat(e.target.value) || 25000
                })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 disabled:bg-slate-100"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tope vial de 25 toneladas para alertar sobrepeso (R-GEN-03).
              </span>
            </div>
          </div>
        </div>

        {/* 5.1 Reglas Generales */}
        <div className="space-y-3 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              5.1 Reglas Generales
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">R-GEN-01 a R-GEN-05</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { key: 'R_GEN_01', id: 'R-GEN-01', label: 'Control de Fechas (ETA)', sev: 'Alta', desc: 'Alerta si la fecha ETA es nula o caducada en servicios de proyección.' },
              { key: 'R_GEN_02', id: 'R-GEN-02', label: 'Control de Peso (Cero o Blanco)', sev: 'Alta', desc: 'Alerta si el contenedor no registra peso o es menor a 1 kg.' },
              { key: 'R_GEN_03', id: 'R-GEN-03', label: 'Alerta de Sobrepeso (> 25.000 kg)', sev: 'Media', desc: 'Detecta cargas que superen las 25 toneladas para cobro de sobrepeso.' },
              { key: 'R_GEN_04', id: 'R-GEN-04', label: 'Modalidad de Servicio Obligatoria', sev: 'Alta', desc: 'Exige que el servicio defina explícitamente modalidad Directo o Diferido.' },
              { key: 'R_GEN_05', id: 'R-GEN-05', label: 'Control de Estadía en Faena (> 4 hrs)', sev: 'Media', desc: 'Calcula permanencia entre In Planta y Out Planta para cobro de sobreestadía.' },
            ].map(r => (
              <label key={r.key} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/80 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={currentRole !== 'admin'}
                  checked={Boolean(formState.reglasActivas[r.key as keyof typeof formState.reglasActivas])}
                  onChange={() => handleToggleRule(r.key as keyof typeof formState.reglasActivas)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] bg-slate-900 text-white px-1.5 py-0.2 rounded">{r.id}</span>
                    <span className="font-bold text-slate-900">{r.label}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${r.sev === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{r.sev}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 5.2 & 5.3 Importación y Exportación */}
        <div className="space-y-3 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              5.2 y 5.3 Importación y Exportación
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">R-IMP & R-EXP</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { key: 'R_IMP_01', id: 'R-IMP-01', label: 'Validación de Direcciones de Mandante', sev: 'Media', desc: 'Valida mandantes con múltiples direcciones para evitar entregas erróneas.' },
              { key: 'R_IMP_02', id: 'R-IMP-02', label: 'Campos Obligatorios de Importación', sev: 'Alta', desc: 'Exige unidad, programa, peso, puerto, nave y depósito vacío.' },
              { key: 'R_EXP_01', id: 'R-EXP-01', label: 'Control de Stacking y Corte Documental', sev: 'Alta', desc: 'Valida fecha de inicio de stacking y corte de naviera para exportación.' },
              { key: 'R_EXP_02', id: 'R-EXP-02', label: 'Campos Obligatorios de Exportación', sev: 'Alta', desc: 'Exige contenedor, peso, puerto, nave, depósito de retiro y modalidad.' },
            ].map(r => (
              <label key={r.key} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/80 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={currentRole !== 'admin'}
                  checked={Boolean(formState.reglasActivas[r.key as keyof typeof formState.reglasActivas])}
                  onChange={() => handleToggleRule(r.key as keyof typeof formState.reglasActivas)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] bg-slate-900 text-white px-1.5 py-0.2 rounded">{r.id}</span>
                    <span className="font-bold text-slate-900">{r.label}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${r.sev === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{r.sev}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 5.4, 5.5, 5.6 Extra Costos, Incidencias y Liquidación */}
        <div className="space-y-3 pb-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              5.4 a 5.6 Extra Costos, Incidencias y Liquidación
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">R-EXC, R-INC & R-LIQ</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {[
              { key: 'R_EXC_01', id: 'R-EXC-01', label: 'Almacenaje Obligatorio en Diferidos', sev: 'Alta', desc: 'Todo servicio diferido debe contener su correspondiente cobro de almacenaje.' },
              { key: 'R_EXC_02', id: 'R-EXC-02', label: 'Almacenaje Preventivo (> 2 días)', sev: 'Media', desc: 'Alerta custodias superiores a 2 días entre retiro y presentación.' },
              { key: 'R_INC_01', id: 'R-INC-01', label: 'Control Cruzado de Incidencias Operativas', sev: 'Media', desc: 'Detecta Falsos Fletes, Redestinos y Multas sin nota de cobro al cliente.' },
              { key: 'R_LIQ_01', id: 'R-LIQ-01', label: 'Control de Margen de Liquidación Mínimo', sev: 'Alta', desc: 'Bloquea liquidación si el margen está por debajo del objetivo contractual.' },
              { key: 'R_LIQ_02', id: 'R-LIQ-02', label: 'Validación Integral de Atributos (IMO/Cuadrillas)', sev: 'Alta', desc: 'Exige que cargas con tickets especiales tengan venta y costo cargados.' },
              { key: 'conceptoFaltante', id: 'R-MAT-01', label: 'Concepto Faltante de Matriz Comercial', sev: 'Alta', desc: 'Valida que todos los conceptos obligatorios de la matriz estén cargados.' },
              { key: 'valorFueraTarifa', id: 'R-MAT-02', label: 'Valor Fuera de Tarifa Acordada', sev: 'Media', desc: 'Compara monto cargado vs tarifa acordada en pesos chilenos.' },
              { key: 'costoSinVenta', id: 'R-MAT-03', label: 'Costo Sin Venta Asociada', sev: 'Alta', desc: 'Detecta costos ingresados sin cobrar al mandante.' },
            ].map(r => (
              <label key={r.key} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100/80 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={currentRole !== 'admin'}
                  checked={Boolean(formState.reglasActivas[r.key as keyof typeof formState.reglasActivas])}
                  onChange={() => handleToggleRule(r.key as keyof typeof formState.reglasActivas)}
                  className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[11px] bg-slate-900 text-white px-1.5 py-0.2 rounded">{r.id}</span>
                    <span className="font-bold text-slate-900">{r.label}</span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${r.sev === 'Alta' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{r.sev}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          
          <button
            type="button"
            onClick={onResetSeed}
            disabled={currentRole !== 'admin'}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Maqueta a Cero (Seed Inicial)</span>
          </button>

          {currentRole === 'admin' && (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración y Recalcular Motor</span>
            </button>
          )}

        </div>

      </div>

    </div>
  );
};
