/**
 * Panel de datos complementarios dentro de la ficha del servicio.
 *
 * Lista los campos que el reporte de BIT no trajo para ese servicio y permite
 * cargarlos a mano. No escribe en el ERP: completa lo que el ERP no publica,
 * para que las reglas que dependen de ese dato puedan evaluarse.
 */

import React, { useMemo, useState } from 'react';
import { PencilLine, Check, RotateCcw, Info } from 'lucide-react';
import { Service } from '../types';
import {
  CAMPOS_COMPLEMENTABLES,
  CampoComplementable,
  Complementos,
  camposFaltantes,
  setComplemento,
} from '../services/complementos';

interface Props {
  service: Service;
  complementos: Complementos;
  onChange: (siguiente: Complementos) => void;
}

export const ComplementarDatos: React.FC<Props> = ({ service, complementos, onChange }) => {
  const [abierto, setAbierto] = useState(false);
  const [guardado, setGuardado] = useState<string | null>(null);

  const faltantes = useMemo(() => camposFaltantes(service), [service]);
  const cargados = complementos[service.id] ?? {};
  const nCargados = Object.keys(cargados).length;

  // Los que faltan, más los ya cargados (que por eso mismo dejaron de faltar),
  // en el orden del catálogo.
  const camposAMostrar = useMemo(() => {
    const claves = new Set<string>([...faltantes.map((f) => f.key), ...Object.keys(cargados)]);
    return CAMPOS_COMPLEMENTABLES.filter((c) => claves.has(c.key));
  }, [faltantes, cargados]);

  const escribir = (campo: CampoComplementable['key'], valor: string) => {
    onChange(setComplemento(complementos, service.id, campo, valor));
    setGuardado(campo);
    setTimeout(() => setGuardado((g) => (g === campo ? null : g)), 1800);
  };

  // Nada que completar y nada cargado: no vale la pena mostrar el bloque.
  if (faltantes.length === 0 && nCargados === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-bold text-slate-900">Datos complementarios</span>
          {nCargados > 0 && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {nCargados} cargado{nCargados === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {faltantes.length > 0 ? `${faltantes.length} campos sin dato` : 'completo'}
          <span className="ml-2 text-slate-400">{abierto ? '▲' : '▼'}</span>
        </span>
      </button>

      {abierto && (
        <div className="space-y-3 border-t border-slate-100 p-4">
          <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              Estos campos no vinieron en el reporte de BIT. Al cargarlos aquí se habilitan las
              reglas que dependen de ellos. Si más adelante el ERP empieza a publicar el dato, el de
              la API manda y este queda ignorado.
            </span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {camposAMostrar.map((campo) => {
              const valor = (cargados[campo.key] ?? '') as string | number;
              return (
                <label key={campo.key} className="block">
                  <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                    {campo.label}
                    {guardado === campo.key && (
                      <Check className="h-3 w-3 text-emerald-600" aria-label="guardado" />
                    )}
                  </span>

                  {campo.tipo === 'modalidad' ? (
                    <select value={String(valor)} onChange={(e) => escribir(campo.key, e.target.value)} className={inputCls}>
                      <option value="">— sin dato —</option>
                      <option value="directo">Directo</option>
                      <option value="diferido">Diferido</option>
                    </select>
                  ) : campo.tipo === 'operacion' ? (
                    <select value={String(valor)} onChange={(e) => escribir(campo.key, e.target.value)} className={inputCls}>
                      <option value="">— sin dato —</option>
                      <option value="importacion">Importación</option>
                      <option value="exportacion">Exportación</option>
                      <option value="nacional">Nacional</option>
                    </select>
                  ) : (
                    <input
                      type={
                        campo.tipo === 'numero' ? 'number'
                        : campo.tipo === 'fecha' ? 'date'
                        : campo.tipo === 'datetime' ? 'datetime-local'
                        : 'text'
                      }
                      value={String(valor)}
                      onChange={(e) => escribir(campo.key, e.target.value)}
                      className={inputCls}
                    />
                  )}

                  <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">{campo.nota}</span>
                </label>
              );
            })}
          </div>

          {nCargados > 0 && (
            <button
              onClick={() => {
                const siguiente = { ...complementos };
                delete siguiente[service.id];
                onChange(siguiente);
              }}
              className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-rose-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Borrar lo cargado en este servicio
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const inputCls =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none';
