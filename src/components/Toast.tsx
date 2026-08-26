/**
 * Sistema de notificaciones tipo Toast.
 *
 * Se monta una sola vez en la raíz (`<ToastProvider>`) y cualquier componente
 * pide notificaciones con `useToast()`. Aparecen apiladas en la esquina superior
 * derecha, bajo la barra de navegación, y se cierran solas. El temporizador se
 * pausa mientras el cursor está encima, para poder leer el detalle.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { ToastInput, ToastVariant } from '../services/dataDiff';

export type { ToastInput, ToastVariant };

interface Toast extends ToastInput {
  id: number;
  variante: ToastVariant;
  duracionMs: number;
}

interface ToastApi {
  /** Muestra una notificación y devuelve su id. */
  mostrar: (toast: ToastInput) => number;
  /** Muestra varias notificaciones apiladas, en orden. */
  mostrarVarios: (toasts: ToastInput[]) => void;
  cerrar: (id: number) => void;
  limpiar: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.');
  }
  return ctx;
}

const DURACION_POR_DEFECTO = 5000;
const MAX_VISIBLES = 4;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const limpiar = useCallback(() => setToasts([]), []);

  const mostrar = useCallback((entrada: ToastInput) => {
    const id = siguienteId.current++;
    const toast: Toast = {
      ...entrada,
      id,
      variante: entrada.variante ?? 'info',
      duracionMs: entrada.duracionMs ?? DURACION_POR_DEFECTO,
    };
    // Se descartan los más antiguos para que la pila no tape la pantalla.
    setToasts((actuales) => [...actuales, toast].slice(-MAX_VISIBLES));
    return id;
  }, []);

  const mostrarVarios = useCallback(
    (entradas: ToastInput[]) => {
      for (const entrada of entradas) mostrar(entrada);
    },
    [mostrar],
  );

  const api = useMemo<ToastApi>(
    () => ({ mostrar, mostrarVarios, cerrar, limpiar }),
    [mostrar, mostrarVarios, cerrar, limpiar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer toasts={toasts} onCerrar={cerrar} />
    </ToastContext.Provider>
  );
};

const ESTILOS: Record<ToastVariant, { contenedor: string; icono: React.ReactNode; barra: string }> = {
  info: {
    contenedor: 'bg-white border-slate-300 text-slate-800',
    icono: <Info className="w-5 h-5 text-slate-500" />,
    barra: 'bg-slate-400',
  },
  success: {
    contenedor: 'bg-white border-emerald-300 text-slate-800',
    icono: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    barra: 'bg-emerald-500',
  },
  warning: {
    contenedor: 'bg-white border-amber-300 text-slate-800',
    icono: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    barra: 'bg-amber-500',
  },
  error: {
    contenedor: 'bg-white border-rose-300 text-slate-800',
    icono: <XCircle className="w-5 h-5 text-rose-600" />,
    barra: 'bg-rose-500',
  },
};

const ToastContainer: React.FC<{ toasts: Toast[]; onCerrar: (id: number) => void }> = ({
  toasts,
  onCerrar,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))] pointer-events-none"
      role="region"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onCerrar={onCerrar} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: Toast; onCerrar: (id: number) => void }> = ({ toast, onCerrar }) => {
  const [visible, setVisible] = useState(false);
  const [pausado, setPausado] = useState(false);
  const estilo = ESTILOS[toast.variante];

  // Un frame de retraso para que la transición de entrada se aprecie.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (pausado || toast.duracionMs <= 0) return;
    const timer = setTimeout(() => onCerrar(toast.id), toast.duracionMs);
    return () => clearTimeout(timer);
  }, [pausado, toast.duracionMs, toast.id, onCerrar]);

  return (
    <div
      role="status"
      aria-live={toast.variante === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-lg border shadow-lg shadow-slate-900/10 transition-all duration-300 ease-out ${
        estilo.contenedor
      } ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      <div className="flex items-start gap-3 p-3.5 pr-9">
        <div className="shrink-0 mt-0.5">{estilo.icono}</div>
        <div className="min-w-0 flex-1">
          {toast.titulo && (
            <div className="text-sm font-semibold leading-tight text-slate-900">{toast.titulo}</div>
          )}
          <p className={`text-sm leading-snug text-slate-600 ${toast.titulo ? 'mt-0.5' : ''}`}>
            {toast.mensaje}
          </p>
          {toast.detalle && toast.detalle.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-slate-100 pt-2 text-xs text-slate-500">
              {toast.detalle.map((linea, i) => (
                <li key={i} className="truncate font-mono">
                  {linea}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <button
        onClick={() => onCerrar(toast.id)}
        aria-label="Cerrar notificación"
        className="absolute top-2.5 right-2.5 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {toast.duracionMs > 0 && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${estilo.barra} ${pausado ? '' : 'toast-progress'}`}
          style={{ animationDuration: `${toast.duracionMs}ms` }}
        />
      )}
    </div>
  );
};
