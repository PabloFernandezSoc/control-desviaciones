import React, { useEffect, useState } from 'react';
import { 
  Service, 
  Agreement, 
  Deviation, 
  Role, 
  DeviationStatus 
} from '../types';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  ShieldCheck, 
  History, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Ship, 
  Calendar, 
  AlertCircle,
  Truck,
  Layers,
  MapPin,
  Clock,
  Flame,
  Users,
  Weight
} from 'lucide-react';
import { ComplementarDatos } from './ComplementarDatos';
import { Complementos } from '../services/complementos';

interface ServiceDetailModalProps {
  service: Service | null;
  deviation: Deviation | null;
  agreement: Agreement | null;
  currentRole: Role;
  onClose: () => void;
  onUpdateStatus: (
    deviationId: string, 
    newStatus: DeviationStatus, 
    role: Role, 
    userName: string, 
    comment: string
  ) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  complementos: Complementos;
  onChangeComplementos: (siguiente: Complementos) => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  service,
  deviation,
  agreement,
  currentRole,
  onClose,
  onUpdateStatus,
  onNavigateNext,
  onNavigatePrev,
  complementos,
  onChangeComplementos
}) => {
  // Action Dialog state
  const [actionModal, setActionModal] = useState<{
    type: 'corregir' | 'excepcion' | 'reasignar' | 'comentar' | null;
    targetStatus?: DeviationStatus;
    targetRole?: 'comercial' | 'costos';
  }>({ type: null });

  const [commentText, setCommentText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Escape cierra primero el diálogo de acción y después el panel.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (actionModal.type) {
        setActionModal({ type: null });
        setErrorMessage('');
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [actionModal.type, onClose]);

  // El return temprano va después de los hooks: adelantarlo los saltaría en
  // unos renders y no en otros.
  if (!service) return null;

  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculate totals in CLP
  const totalVentaCargada = service.lineas.filter(l => l.tipo === 'venta').reduce((s, l) => s + l.valor, 0);
  const totalCostoCargado = service.lineas.filter(l => l.tipo === 'costo').reduce((s, l) => s + l.valor, 0);
  const margenCargadoClp = totalVentaCargada - totalCostoCargado;
  const pctMargenCargado = totalVentaCargada > 0 ? (margenCargadoClp / totalVentaCargada) * 100 : 0;

  const totalVentaMatriz = agreement ? agreement.conceptos.filter(c => c.tipo === 'venta').reduce((s, c) => s + c.valor, 0) : 0;
  const totalCostoMatriz = agreement ? agreement.conceptos.filter(c => c.tipo === 'costo').reduce((s, c) => s + c.valor, 0) : 0;
  const margenMatrizClp = totalVentaMatriz - totalCostoMatriz;
  const pctMargenMatriz = totalVentaMatriz > 0 ? (margenMatrizClp / totalVentaMatriz) * 100 : (agreement?.margenMinimo ? agreement.margenMinimo * 100 : 18);

  const handleConfirmAction = () => {
    if (!actionModal.type || !deviation) return;

    // Check mandatory comment
    if (actionModal.type !== 'corregir' && commentText.trim() === '') {
      setErrorMessage('El comentario es obligatorio para esta acción.');
      return;
    }

    const userName = currentRole === 'comercial' ? 'Ejecutivo Comercial' : (currentRole === 'costos' ? 'Encargado Costos & Booking' : 'Administrador');

    if (actionModal.type === 'corregir') {
      onUpdateStatus(deviation.id, 'corregida', currentRole, userName, commentText || 'Monto o parámetro corregido en el sistema BIT.');
    } else if (actionModal.type === 'excepcion') {
      onUpdateStatus(deviation.id, 'excepcion_justificada', currentRole, userName, commentText);
    } else if (actionModal.type === 'comentar') {
      onUpdateStatus(deviation.id, deviation.estado, currentRole, userName, commentText);
    } else if (actionModal.type === 'reasignar') {
      onUpdateStatus(deviation.id, 'en_revision', currentRole, userName, `Reasignado. Comentario: ${commentText}`);
    }

    setActionModal({ type: null });
    setCommentText('');
    setErrorMessage('');
  };

  const pesoKg = service.pesoKg !== undefined ? service.pesoKg : (service.proyeccion?.peso || 20000);
  const modalidad = service.modalidad || (service.proyeccion?.modal ? (service.proyeccion.modal.toLowerCase().includes('direct') ? 'directo' : 'diferido') : 'directo');
  const tipoOp = service.tipoOperacion || (service.proyeccion?.tipoServ === 'EXPOD' ? 'exportacion' : 'importacion');

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Ficha del servicio ${service.id}`}
    >
      
      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-rose-600 text-white text-xs font-black px-2 py-0.5 rounded">
                FICHA DE SERVICIO
              </span>
              <h2 className="text-xl font-bold font-mono tracking-tight">{service.id}</h2>
              <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded uppercase font-semibold">
                Estado: {service.estado}
              </span>
              {service.aptoFacturacion ? (
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs px-2 py-0.5 rounded font-bold">
                  ✓ Apto Facturación
                </span>
              ) : (
                <span className="bg-rose-950 text-rose-300 border border-rose-700 text-xs px-2 py-0.5 rounded font-bold">
                  ✕ Bloqueado Facturación
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              Mandante: <strong className="text-white">{service.clienteNombre}</strong> · Ejecutivo: {service.ejecutivo}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigatePrev && (
              <button
                onClick={onNavigatePrev}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Anterior servicio"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {onNavigateNext && (
              <button
                onClick={onNavigateNext}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                title="Siguiente servicio"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar la ficha del servicio"
              title="Cerrar (Esc)"
              className="p-1.5 bg-slate-800 hover:bg-rose-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Active Deviation Alert Banner */}
          {deviation && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-100 border border-rose-300 text-rose-700 rounded-lg shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {deviation.idRegla && (
                        <span className="bg-slate-900 text-white text-xs font-mono font-black px-2 py-0.5 rounded">
                          {deviation.idRegla}
                        </span>
                      )}
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        deviation.severidad === 'Alta' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        Severidad: {deviation.severidad || 'Alta'}
                      </span>
                      <span className="bg-rose-200 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {deviation.categoriaRegla || 'Matriz'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-rose-950 mt-1">
                      {deviation.mensaje}
                    </h3>
                    <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                      {deviation.detallesExplicacion}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-rose-700 block font-bold">Impacto Estimado</span>
                  <span className="text-xl font-black text-rose-900 font-mono">
                    {formatClp(deviation.impactoClp || deviation.impactoUsd || 0)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-rose-800 font-medium">
                  Responsable: <strong className="uppercase">{deviation.responsableRol}</strong> · Estado: <strong className="uppercase">{deviation.estado}</strong>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setActionModal({ type: 'corregir', targetStatus: 'corregida' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Marcar Corregida en BIT</span>
                  </button>

                  <button
                    onClick={() => setActionModal({ type: 'excepcion', targetStatus: 'excepcion_justificada' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Justificar Excepción</span>
                  </button>

                  <button
                    onClick={() => setActionModal({ type: 'comentar' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Comentar / Bitácora</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Operational Attributes & PRD Parameters Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Parámetros Operativos del Servicio (Control de Reglas PRD)
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tipo Operación</span>
                <span className="font-bold text-slate-800 uppercase">{tipoOp}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Modalidad</span>
                <span className={`font-bold uppercase ${modalidad === 'diferido' ? 'text-amber-700' : 'text-slate-800'}`}>
                  {modalidad}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Peso Neto Declarado</span>
                <span className={`font-mono font-bold ${pesoKg > 25000 ? 'text-rose-600' : (pesoKg <= 0 ? 'text-red-600' : 'text-slate-800')}`}>
                  {pesoKg > 0 ? `${pesoKg.toLocaleString('es-CL')} kg` : '0 kg (En blanco)'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Puerto / Terminal</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {service.puerto || service.proyeccion?.puerto || 'No especificado'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Nave / Arribo</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {service.nave || service.proyeccion?.nave || 'Sin Nave'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Depósito Vacío / Retiro</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {service.depositoVacio || service.depositoRetiro || 'Falta Depósito'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Estadía en Planta</span>
                <span className={`font-bold ${(service.horasEstadia || 0) > 4 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {service.horasEstadia ? `${service.horasEstadia} hrs` : 'Dentro de límite'}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Días Almacenaje</span>
                <span className={`font-bold ${(service.diasAlmacenaje || 0) > 2 ? 'text-amber-700' : 'text-slate-700'}`}>
                  {service.diasAlmacenaje ? `${service.diasAlmacenaje} días` : (modalidad === 'diferido' ? '3 días (Diferido)' : '0 días')}
                </span>
              </div>
            </div>

            {/* Special attributes tags */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Atributos Especiales:</span>
              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${service.atributosEspeciales?.imo ? 'bg-red-100 text-red-800 font-bold border border-red-300' : 'bg-slate-100 text-slate-400'}`}>
                IMO: {service.atributosEspeciales?.imo ? 'SÍ' : 'NO'}
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${service.atributosEspeciales?.cuadrillas ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300' : 'bg-slate-100 text-slate-400'}`}>
                Cuadrillas: {service.atributosEspeciales?.cuadrillas ? 'SÍ' : 'NO'}
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${service.atributosEspeciales?.sobrepesoEspecial ? 'bg-purple-100 text-purple-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                Sobrepeso Esp: {service.atributosEspeciales?.sobrepesoEspecial ? 'SÍ' : 'NO'}
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${service.atributosEspeciales?.consolidado ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                Consolidado: {service.atributosEspeciales?.consolidado ? 'SÍ' : 'NO'}
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${service.atributosEspeciales?.insulado ? 'bg-sky-100 text-sky-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
                Insulado: {service.atributosEspeciales?.insulado ? 'SÍ' : 'NO'}
              </span>
            </div>

            {/* Incidencias banner if any */}
            {service.incidencias && (service.incidencias.falsoFlete || service.incidencias.redestino || service.incidencias.multas) && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-900 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-purple-700" />
                  Incidencia Operativa Registrada (R-INC-01):
                </span>
                <p className="text-[11px] text-purple-800">
                  {service.incidencias.detalle || 'Falso Flete o Redestino registrado en bitácora de terreno.'} (Ref: {service.incidencias.driveRef || 'N/A'})
                </p>
              </div>
            )}
          </div>

          {/* Line-by-Line Comparison Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden space-y-0 shadow-xs">
            <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Comparación Línea a Línea (Matriz Comercial vs. Carga BIT)
              </h3>
              <span className="text-xs text-slate-500 font-medium">Valores en pesos chilenos (CLP)</span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Concepto</th>
                  <th className="py-2.5 px-4">Tipo</th>
                  <th className="py-2.5 px-4 text-right">Tarifa Matriz</th>
                  <th className="py-2.5 px-4 text-right">Cargado en BIT</th>
                  <th className="py-2.5 px-4 text-right">Diferencia Delta</th>
                  <th className="py-2.5 px-4 text-center">Estado Línea</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {agreement?.conceptos.map((concept) => {
                  const matchingLine = service.lineas.find(l => l.codigo === concept.codigo);
                  const cargadoVal = matchingLine ? matchingLine.valor : 0;
                  const delta = cargadoVal - concept.valor;
                  const isDeviated = !matchingLine || Math.abs(delta) > 5000;

                  return (
                    <tr key={concept.codigo} className={isDeviated ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{concept.nombre}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{concept.codigo}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          concept.tipo === 'venta' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {concept.tipo}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-slate-700">
                        {formatClp(concept.valor)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {matchingLine ? formatClp(matchingLine.valor) : <span className="text-rose-600 font-semibold">$0 (No cargado)</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold">
                        {delta === 0 ? (
                          <span className="text-slate-400">$0</span>
                        ) : delta > 0 ? (
                          <span className="text-emerald-700">+{formatClp(delta)}</span>
                        ) : (
                          <span className="text-rose-600">-{formatClp(Math.abs(delta))}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isDeviated ? (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Desviado
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Conforme
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Non-catalog lines or extra costs */}
                {service.lineas.filter(l => !agreement?.conceptos.some(c => c.codigo === l.codigo)).map(l => (
                  <tr key={l.id} className="bg-purple-50/40">
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-purple-950">{l.nombreConcepto}</div>
                      <div className="text-[10px] text-purple-500 font-mono">{l.codigo} (Fuera de Matriz)</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        l.tipo === 'venta' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-400">
                      $0 (No pactado)
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-900">
                      {formatClp(l.valor)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-purple-700">
                      +{formatClp(l.valor)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Extra / Adicional
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals & Margins comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Proyección según Matriz Comercial
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Venta Esperada:</span>
                  <span className="font-mono font-bold text-slate-800">{formatClp(totalVentaMatriz)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Costo Esperado:</span>
                  <span className="font-mono font-bold text-slate-800">{formatClp(totalCostoMatriz)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
                  <span className="text-slate-700">Margen Esperado:</span>
                  <span className="font-mono text-indigo-700">{formatClp(margenMatrizClp)} ({pctMargenMatriz.toFixed(1)}%)</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Real Carga Efectiva en BIT
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Venta Cargada:</span>
                  <span className="font-mono font-bold text-slate-100">{formatClp(totalVentaCargada)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Costo Cargado:</span>
                  <span className="font-mono font-bold text-slate-100">{formatClp(totalCostoCargado)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                  <span className="text-slate-300">Margen Resultante:</span>
                  <span className={`font-mono ${pctMargenCargado < pctMargenMatriz ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatClp(margenCargadoClp)} ({pctMargenCargado.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Datos que el reporte no trajo y se pueden cargar a mano */}
          <ComplementarDatos
            service={service}
            complementos={complementos}
            onChange={onChangeComplementos}
          />

          {/* Audit Log / Bitácora Section */}
          {deviation && deviation.bitacora && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Bitácora e Historial de Gestión
                </h3>
              </div>

              <div className="space-y-3">
                {deviation.bitacora.map((log) => (
                  <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-bold text-slate-700">{log.usuario} ({log.rol})</span>
                      <span className="font-mono text-[11px]">{log.fecha}</span>
                    </div>
                    <div className="font-semibold text-indigo-700">{log.accion}</div>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 text-[11px] italic">
                      "{log.comentario}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Action Dialog Modal */}
      {actionModal.type && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {actionModal.type === 'corregir' && 'Confirmar Corrección en BIT'}
                {actionModal.type === 'excepcion' && 'Justificar Excepción Comercial'}
                {actionModal.type === 'comentar' && 'Agregar Comentario a Bitácora'}
              </h3>
              <button
                onClick={() => { setActionModal({ type: null }); setErrorMessage(''); }}
                aria-label="Cerrar el diálogo"
                title="Cerrar (Esc)"
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-700">
                {actionModal.type === 'corregir' ? 'Comentario opcional de la corrección:' : 'Comentario obligatorio (Justificación o instrucciones):'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionModal.type === 'excepcion'
                    ? 'Indique motivo comercial de la tarifa acordada diferida o autorizada...'
                    : 'Escriba las observaciones del caso...'
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActionModal({ type: null }); setErrorMessage(''); }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Confirmar Acción
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
