import React, { useState } from 'react';
import { Agreement, ConceptDef, Client } from '../types';
import { 
  FileText, 
  Plus, 
  Edit3, 
  AlertTriangle, 
  X, 
  Trash2
} from 'lucide-react';

interface MatrizComercialViewProps {
  agreements: Agreement[];
  clients: Client[];
  onSaveAgreement: (agreement: Agreement) => void;
}

export const MatrizComercialView: React.FC<MatrizComercialViewProps> = ({
  agreements,
  clients,
  onSaveAgreement
}) => {
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(agreements[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Agreement | null>(null);

  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  const expiredAgreements = agreements.filter(a => a.estado === 'vencido');
  const expiringSoonAgreements = agreements.filter(a => a.estado === 'por_vencer');

  const handleStartNew = () => {
    const newAg: Agreement = {
      id: `ACU-0${agreements.length + 20}`,
      clienteId: clients[0]?.id || 'CLI-001',
      clienteNombre: clients[0]?.nombre || 'Cliente Nuevo',
      ruta: { origen: 'SHA (Shanghai)', destino: 'SAI (San Antonio)' },
      tipoContenedor: '40HC',
      vigenciaDesde: new Date().toISOString().split('T')[0],
      vigenciaHasta: '2026-12-31',
      moneda: 'CLP',
      margenMinimo: 0.18,
      estado: 'vigente',
      conceptos: [
        { codigo: 'FLETE', nombre: 'Flete marítimo', tipo: 'venta', valor: 2500000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
        { codigo: 'FLETE_COSTO', nombre: 'Flete marítimo costo', tipo: 'costo', valor: 2000000, moneda: 'CLP', unidad: 'contenedor', obligatorio: true },
        { codigo: 'BL', nombre: 'Emisión Documento BL', tipo: 'venta', valor: 350000, moneda: 'CLP', unidad: 'bl', obligatorio: true }
      ]
    };
    setEditForm(newAg);
    setIsEditing(true);
  };

  const handleStartEdit = (ag: Agreement) => {
    setEditForm(JSON.parse(JSON.stringify(ag)));
    setIsEditing(true);
  };

  const handleSaveForm = () => {
    if (!editForm) return;
    onSaveAgreement(editForm);
    setSelectedAgreement(editForm);
    setIsEditing(false);
    setEditForm(null);
  };

  const handleAddConcept = () => {
    if (!editForm) return;
    const newConcept: ConceptDef = {
      codigo: 'NUEVO_CONCEPTO',
      nombre: 'Nuevo Concepto Servicio',
      tipo: 'venta',
      valor: 150000,
      moneda: 'CLP',
      unidad: 'contenedor',
      obligatorio: true
    };
    setEditForm({
      ...editForm,
      conceptos: [...editForm.conceptos, newConcept]
    });
  };

  const handleRemoveConcept = (idx: number) => {
    if (!editForm) return;
    const updated = [...editForm.conceptos];
    updated.splice(idx, 1);
    setEditForm({
      ...editForm,
      conceptos: updated
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Expiration Alerts Banner */}
      {(expiredAgreements.length > 0 || expiringSoonAgreements.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900">
            <h3 className="font-bold">Advertencia de Acuerdos Comerciales Vencidos o por Vencer</h3>
            <p className="leading-relaxed">
              Existen <strong>{expiredAgreements.length} acuerdos vencidos</strong> y <strong>{expiringSoonAgreements.length} por vencer en los próximos 30 días</strong>. Las evaluaciones mantendrán la última tarifa pactada en CLP marcando la alerta correspondiente.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left List / Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: List of Agreements */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Matriz de Acuerdos ({agreements.length})</span>
            </h3>
            <button
              onClick={handleStartNew}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nuevo Acuerdo
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {agreements.length === 0 && (
              /* La matriz siempre arranca vacía: los clientes los trae la API y
                 los acuerdos se cargan aquí. Sin esto la pantalla queda muda. */
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center space-y-2">
                <FileText className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Todavía no hay acuerdos cargados</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Los clientes vienen del reporte de BIT. Mientras un cliente no tenga acuerdo, sus
                  servicios aparecen en <strong>Sin Matriz</strong> y se evalúan sólo con las reglas
                  generales: peso, fechas, extracostos y margen.
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Al crear su matriz se activan además las reglas de tarifa: concepto faltante,
                  valor fuera de tarifa y desviación respecto del acuerdo.
                </p>
                <button
                  onClick={handleStartNew}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Cargar el primer acuerdo
                </button>
              </div>
            )}
            {agreements.map((ag) => {
              const isSelected = selectedAgreement?.id === ag.id;
              return (
                <div
                  key={ag.id}
                  onClick={() => { setSelectedAgreement(ag); setIsEditing(false); }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-700">{ag.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      ag.estado === 'vigente'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ag.estado === 'vencido'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {ag.estado}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-xs truncate">
                    {ag.clienteNombre}
                  </div>

                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>{ag.ruta.origen} → {ag.ruta.destino}</span>
                    <span className="font-mono font-semibold">{ag.tipoContenedor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Agreement Details & Concept Manager */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6">
          
          {selectedAgreement && !isEditing && (
            <div className="space-y-6">
              
              {/* Agreement Header Card */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedAgreement.clienteNombre}</h2>
                    <span className="font-mono bg-slate-100 border border-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded">
                      {selectedAgreement.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Ruta: <strong className="text-slate-800">{selectedAgreement.ruta.origen} → {selectedAgreement.ruta.destino}</strong> · Equipo: <strong className="text-slate-800">{selectedAgreement.tipoContenedor}</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleStartEdit(selectedAgreement)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar Matriz
                </button>
              </div>

              {/* Agreement Metadata Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Vigencia Desde</span>
                  <span className="font-mono font-bold text-slate-800">{selectedAgreement.vigenciaDesde}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Vigencia Hasta</span>
                  <span className="font-mono font-bold text-slate-800">{selectedAgreement.vigenciaHasta}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Moneda del Acuerdo</span>
                  <span className="font-bold text-indigo-700">{selectedAgreement.moneda || 'CLP'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Margen Mínimo Objetivo</span>
                  <span className="font-bold text-emerald-700">{(selectedAgreement.margenMinimo * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Defined Concepts Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Conceptos de Venta y Costo Configurados en CLP ({selectedAgreement.conceptos.length})
                </h3>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                        <th className="py-2.5 px-4">Código / Nombre</th>
                        <th className="py-2.5 px-4">Tipo</th>
                        <th className="py-2.5 px-4 text-right">Tarifa Pactada</th>
                        <th className="py-2.5 px-4">Unidad</th>
                        <th className="py-2.5 px-4 text-center">Obligatoriedad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedAgreement.conceptos.map((c) => (
                        <tr key={c.codigo} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{c.nombre}</div>
                            <div className="text-[10px] font-mono text-slate-400">{c.codigo}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              c.tipo === 'venta' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                            }`}>
                              {c.tipo}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                            {formatClp(c.valor)}
                          </td>
                          <td className="py-2.5 px-4 capitalize text-slate-600">
                            {c.unidad}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {c.obligatorio ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                Obligatorio
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                Opcional
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Edit / Create Form View */}
          {isEditing && editForm && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-base font-bold text-slate-900">
                  Editar Matriz Comercial: {editForm.id}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente</label>
                  <select
                    value={editForm.clienteId}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setEditForm({
                        ...editForm,
                        clienteId: e.target.value,
                        clienteNombre: client?.nombre || editForm.clienteNombre
                      });
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800"
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Equipo</label>
                  <input
                    type="text"
                    value={editForm.tipoContenedor}
                    onChange={(e) => setEditForm({ ...editForm, tipoContenedor: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vigencia Desde</label>
                  <input
                    type="date"
                    value={editForm.vigenciaDesde}
                    onChange={(e) => setEditForm({ ...editForm, vigenciaDesde: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vigencia Hasta</label>
                  <input
                    type="date"
                    value={editForm.vigenciaHasta}
                    onChange={(e) => setEditForm({ ...editForm, vigenciaHasta: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Editable Concepts List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase">Conceptos del Acuerdo (CLP)</h4>
                  <button
                    onClick={handleAddConcept}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Concepto
                  </button>
                </div>

                <div className="space-y-2">
                  {editForm.conceptos.map((c, idx) => (
                    <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-wrap items-center gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Código"
                        value={c.codigo}
                        onChange={(e) => {
                          const updated = [...editForm.conceptos];
                          updated[idx].codigo = e.target.value;
                          setEditForm({ ...editForm, conceptos: updated });
                        }}
                        className="w-24 p-1.5 border border-slate-300 rounded font-mono uppercase bg-white"
                      />
                      <input
                        type="text"
                        placeholder="Nombre Concepto"
                        value={c.nombre}
                        onChange={(e) => {
                          const updated = [...editForm.conceptos];
                          updated[idx].nombre = e.target.value;
                          setEditForm({ ...editForm, conceptos: updated });
                        }}
                        className="flex-1 p-1.5 border border-slate-300 rounded bg-white min-w-[140px]"
                      />
                      <select
                        value={c.tipo}
                        onChange={(e) => {
                          const updated = [...editForm.conceptos];
                          updated[idx].tipo = e.target.value as 'venta' | 'costo';
                          setEditForm({ ...editForm, conceptos: updated });
                        }}
                        className="p-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="venta">Venta</option>
                        <option value="costo">Costo</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Valor CLP"
                        value={c.valor}
                        onChange={(e) => {
                          const updated = [...editForm.conceptos];
                          updated[idx].valor = parseFloat(e.target.value) || 0;
                          setEditForm({ ...editForm, conceptos: updated });
                        }}
                        className="w-28 p-1.5 border border-slate-300 rounded font-mono font-bold bg-white"
                      />
                      <button
                        onClick={() => handleRemoveConcept(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveForm}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  Guardar Matriz Comercial
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
