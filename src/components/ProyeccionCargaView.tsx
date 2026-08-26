import React, { useState } from 'react';
import { Service, ServiceLine } from '../types';
import { 
  Search, 
  FileSpreadsheet, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Truck, 
  Ship, 
  Building2, 
  Calendar, 
  MapPin, 
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  ChevronRight
} from 'lucide-react';

interface ProyeccionCargaViewProps {
  services: Service[];
  onUpdateService: (service: Service) => void;
  onOpenServiceModal: (service: Service) => void;
}

export const ProyeccionCargaView: React.FC<ProyeccionCargaViewProps> = ({
  services,
  onUpdateService,
  onOpenServiceModal
}) => {
  const [activeTab, setActiveTab] = useState<'proyeccion' | 'reefer' | 'dry' | 'lcl' | 'en_curso' | 'stock' | 'terminados'>('proyeccion');
  
  // Filters state
  const [filterCliente, setFilterCliente] = useState('TODOS');
  const [filterModalidad, setFilterModalidad] = useState('TODOS');
  const [filterTipoConten, setFilterTipoConten] = useState('TODOS');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterSoloSinVenta, setFilterSoloSinVenta] = useState(false);

  // Quick Load Sale Modal State
  const [selectedServiceToLoadSale, setSelectedServiceToLoadSale] = useState<Service | null>(null);
  const [customSaleVal, setCustomSaleVal] = useState<number>(0);

  // Filter services for Projection
  const projectionServices = services.filter(s => s.estado === 'proyeccion' || s.proyeccion !== undefined);

  // Filter logic
  const filteredList = projectionServices.filter(s => {
    if (filterSoloSinVenta && (s.proyeccion?.tieneVentaCargada || s.lineas.some(l => l.tipo === 'venta'))) {
      return false;
    }
    if (filterCliente !== 'TODOS' && s.clienteNombre !== filterCliente) {
      return false;
    }
    if (filterModalidad !== 'TODOS' && s.proyeccion?.modal !== filterModalidad) {
      return false;
    }
    if (filterTipoConten !== 'TODOS' && s.proyeccion?.numContenedor && !s.proyeccion.numContenedor.includes(filterTipoConten)) {
      return false;
    }
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      const matchReg = s.proyeccion?.numReg.toString().includes(q);
      const matchClient = s.clienteNombre.toLowerCase().includes(q);
      const matchMandante = s.proyeccion?.mandante.toLowerCase().includes(q);
      const matchConten = s.proyeccion?.numContenedor.toLowerCase().includes(q);
      if (!matchReg && !matchClient && !matchMandante && !matchConten) return false;
    }
    return true;
  });

  const totalProyeccionCount = projectionServices.length;
  const sinVentaCount = projectionServices.filter(s => !s.proyeccion?.tieneVentaCargada && !s.lineas.some(l => l.tipo === 'venta')).length;

  // Handle loading quick sale line
  const handleConfirmLoadSale = () => {
    if (!selectedServiceToLoadSale) return;
    const p = selectedServiceToLoadSale.proyeccion;
    const saleAmount = customSaleVal || p?.tarifaPactadaClp || 500000;

    const newLine: ServiceLine = {
      id: `sale_${Date.now()}`,
      codigo: 'FLETE',
      nombreConcepto: 'Tarifa Venta Carga Local',
      tipo: 'venta',
      valor: saleAmount,
      moneda: 'CLP'
    };

    const updated: Service = {
      ...selectedServiceToLoadSale,
      estado: 'confirmado',
      lineas: [...selectedServiceToLoadSale.lineas, newLine],
      proyeccion: p ? {
        ...p,
        tieneVentaCargada: true
      } : undefined
    };

    onUpdateService(updated);
    setSelectedServiceToLoadSale(null);
  };

  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-4">
      {/* Top Operational Navigation Bar (Identical to Screenshot) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex flex-wrap gap-1 text-xs font-semibold text-slate-300 shadow-sm">
        <button
          onClick={() => setActiveTab('proyeccion')}
          className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
            activeTab === 'proyeccion' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'hover:bg-slate-800 text-slate-400'
          }`}
        >
          <span>Proyección de Carga</span>
          {sinVentaCount > 0 && (
            <span className="bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {sinVentaCount} sin venta
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('reefer')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'reefer' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          En Coordinación Reefer
        </button>
        <button
          onClick={() => setActiveTab('dry')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'dry' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          En Coordinación Dry
        </button>
        <button
          onClick={() => setActiveTab('lcl')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'lcl' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          En Coordinación LCL
        </button>
        <button
          onClick={() => setActiveTab('en_curso')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'en_curso' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          En Curso
        </button>
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'stock' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          Stock Almacenamiento
        </button>
        <button
          onClick={() => setActiveTab('terminados')}
          className={`px-3 py-2 rounded-lg transition ${activeTab === 'terminados' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          Servicios Terminados
        </button>
      </div>

      {/* Control Banner for Missing Sales Alert */}
      {sinVentaCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-amber-100 flex items-center gap-2">
                Control de Servicios Sin Venta Cargada en Proyección
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Se detectaron <span className="font-bold text-amber-200">{sinVentaCount} registros</span> operacionales que poseen costo de transporte asignado o tarifa pactada pero <strong className="text-white">AÚN NO TIENEN VENTA CARGADA EN BIT</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterSoloSinVenta(!filterSoloSinVenta)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              filterSoloSinVenta 
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' 
                : 'bg-amber-900/50 hover:bg-amber-900 text-amber-200 border-amber-500/40'
            }`}
          >
            {filterSoloSinVenta ? 'Ver Todos los Registros' : 'Filtrar Solo Sin Venta ⚠️'}
          </button>
        </div>
      )}

      {/* Main Layout Grid: Left Controls & Right Vessel Schedule Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Filters Panel (Left - 8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-200 text-xs font-bold uppercase tracking-wider">
              <Filter className="w-4 h-4 text-blue-400" />
              <span>Filtros de Búsqueda y Operación</span>
            </div>
            <div className="text-xs text-slate-400">
              Registros Encontrados: <strong className="text-white">{filteredList.length}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Cliente</label>
              <select 
                value={filterCliente}
                onChange={(e) => setFilterCliente(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="TODOS">TODOS LOS CLIENTES</option>
                {Array.from(new Set(projectionServices.map(s => s.clienteNombre))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Modalidad</label>
              <select 
                value={filterModalidad}
                onChange={(e) => setFilterModalidad(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="TODOS">TODAS</option>
                <option value="EXPOD">EXPOD</option>
                <option value="IMPOD">IMPOD</option>
                <option value="LCL">LCL</option>
                <option value="DIRECTO">DIRECTO</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Tipo Contenedor</label>
              <select 
                value={filterTipoConten}
                onChange={(e) => setFilterTipoConten(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none"
              >
                <option value="TODOS">TODOS</option>
                <option value="20">20' (ST)</option>
                <option value="40">40' (HC/ST)</option>
                <option value="REEFER">REEFER</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Búsqueda Rápida</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="N° Reg, Contenedor, Mandante..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-200 focus:border-blue-500 focus:outline-none placeholder-slate-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Quick Filter Buttons & Action Icons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setFilterCliente('TODOS'); setFilterModalidad('TODOS'); setFilterTipoConten('TODOS'); setFilterSearch(''); setFilterSoloSinVenta(false); }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Limpiar Filtros</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs rounded-lg transition font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>

              <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition font-medium flex items-center gap-1.5 shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Registro</span>
              </button>
            </div>
          </div>
        </div>

        {/* Vessel & Port Arrival Schedule Summary (Right - 4 cols, matching top right of screenshot) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Ship className="w-3.5 h-3.5 text-blue-400" />
                Programación Naves & ETA
              </span>
              <span className="text-[11px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-mono">
                #{totalProyeccionCount} Registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-2 py-1 font-medium">ETA</th>
                    <th className="px-2 py-1 font-medium">Puerto</th>
                    <th className="px-2 py-1 font-medium">Nave</th>
                    <th className="px-2 py-1 font-medium text-center">Q Serv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">13/07/2026</td>
                    <td className="px-2 py-1 truncate max-w-[100px]">VALPARAISO (TPS)</td>
                    <td className="px-2 py-1 font-bold">MSC EMILIA</td>
                    <td className="px-2 py-1 text-center font-bold text-white">1</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">17/07/2026</td>
                    <td className="px-2 py-1">HGT VAP</td>
                    <td className="px-2 py-1 text-slate-500">-</td>
                    <td className="px-2 py-1 text-center font-bold text-white">2</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">21/07/2026</td>
                    <td className="px-2 py-1 truncate max-w-[100px]">VALPARAISO (TPS)</td>
                    <td className="px-2 py-1 font-bold">EVER LUCENT</td>
                    <td className="px-2 py-1 text-center font-bold text-white">2</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">25/07/2026</td>
                    <td className="px-2 py-1">PUERTO CENTRAL</td>
                    <td className="px-2 py-1 font-bold">EDISON</td>
                    <td className="px-2 py-1 text-center font-bold text-white">1</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">29/07/2026</td>
                    <td className="px-2 py-1">PUERTO CENTRAL</td>
                    <td className="px-2 py-1 font-bold">Istanbul Express</td>
                    <td className="px-2 py-1 text-center font-bold text-white">1</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="px-2 py-1 text-blue-400">01/08/2026</td>
                    <td className="px-2 py-1">VALPARAISO (TPS)</td>
                    <td className="px-2 py-1 font-bold">ITAJAI EXPRESS</td>
                    <td className="px-2 py-1 text-center font-bold text-white">2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Dense Main Operational Records Grid (Structured like the screenshot) */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            <p className="text-sm">No se encontraron registros en la proyección con los filtros seleccionados.</p>
          </div>
        ) : (
          filteredList.map((srv) => {
            const p = srv.proyeccion;
            const tieneVenta = p?.tieneVentaCargada || srv.lineas.some(l => l.tipo === 'venta');
            const totalVentaCargada = srv.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);

            return (
              <div 
                key={srv.id}
                className={`bg-slate-900 border rounded-xl p-3.5 transition shadow-sm hover:shadow-md ${
                  !tieneVenta 
                    ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  
                  {/* Column 1: N° Reg & Programa (3 cols) */}
                  <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-800 pr-0 md:pr-3 pb-2 md:pb-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600/30 text-blue-300 font-mono font-bold px-2 py-0.5 rounded text-xs border border-blue-500/40">
                        {p?.numReg || srv.id}
                      </span>
                      <span className="font-bold text-slate-200">
                        Tipo Serv: {p?.tipoServ || 'DIRECTO'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5">
                      <div><span className="text-slate-500">Retiro:</span> {p?.retiro || 'PENDIENTE'}</div>
                      <div><span className="text-slate-500">Presen:</span> {p?.presen || 'PENDIENTE'}</div>
                      <div><span className="text-slate-500">Modal:</span> <span className="font-semibold text-slate-200">{p?.modal || 'IMPOD'}</span></div>
                      <div><span className="text-slate-500 font-bold">Est.Act:</span> <span className="text-blue-400 font-bold">{p?.estAct || 'PROYECCION DE CARGA'}</span></div>
                      <div><span className="text-slate-500">Est.Sgte:</span> <span className="text-slate-400">{p?.estSgte || 'EN COORDINACION'}</span></div>
                      <div><span className="text-slate-500">Días Operación:</span> <strong className="text-slate-200">{p?.dias || 15} días</strong></div>
                    </div>
                  </div>

                  {/* Column 2: Datos Cliente & Destino (3 cols) */}
                  <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-800 pr-0 md:pr-3 pb-2 md:pb-0 space-y-1">
                    <div className="font-bold text-slate-100 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{srv.clienteNombre}</span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5">
                      <div><span className="text-slate-500">Mandante:</span> <strong className="text-slate-200">{p?.mandante || srv.clienteNombre}</strong></div>
                      <div className="truncate"><span className="text-slate-500">Planta:</span> {p?.planta || `${srv.ruta.origen} → ${srv.ruta.destino}`}</div>
                      <div><span className="text-slate-500">ETA Nave:</span> <span className="text-blue-400 font-bold">{p?.eta || '25/07/2026'}</span></div>
                      <div><span className="text-slate-500">Ejecutivo:</span> {srv.ejecutivo}</div>
                    </div>
                  </div>

                  {/* Column 3: Contenedor & Transporte (3 cols) */}
                  <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-slate-800 pr-0 md:pr-3 pb-2 md:pb-0 space-y-1">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Contenedor & Nave</span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5">
                      <div><span className="text-slate-500">Tipo/N°:</span> <span className="font-mono text-white font-bold">{p?.numContenedor || 'DFSU1238020'}</span></div>
                      <div><span className="text-slate-500">Peso/Sello:</span> {p?.peso || 0} kg / Sello: {p?.sello || '-'}</div>
                      <div><span className="text-slate-500">Nave / Puerto:</span> <span className="text-slate-200 font-semibold">{p?.nave || '-'} ({p?.puerto || 'PUERTO'})</span></div>
                      <div><span className="text-slate-500">Referencia:</span> <span className="font-mono text-slate-300">{p?.referencia || '-'}</span></div>
                    </div>
                  </div>

                  {/* Column 4: Costo vs Venta & Control de Venta Faltante (3 cols) */}
                  <div className="md:col-span-3 flex flex-col justify-between space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Tarifa Pactada:</span>
                        <span className="font-mono font-bold text-slate-200">{formatClp(p?.tarifaPactadaClp || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Costo Transporte:</span>
                        <span className="font-mono font-bold text-slate-300">{formatClp(p?.costoTransporteClp || 0)}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-300 text-[11px] font-semibold">Venta Cargada BIT:</span>
                        {tieneVenta ? (
                          <span className="font-mono font-bold text-emerald-400">{formatClp(totalVentaCargada || p?.tarifaPactadaClp || 0)}</span>
                        ) : (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            SIN VENTA CARGADA
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      {!tieneVenta ? (
                        <button
                          onClick={() => {
                            setSelectedServiceToLoadSale(srv);
                            setCustomSaleVal(p?.tarifaPactadaClp || 500000);
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 px-2 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Cargar Venta BIT</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenServiceModal(srv)}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2 rounded-lg text-xs transition flex items-center justify-center gap-1 border border-slate-700"
                        >
                          <span>Ver Detalle Servicio</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL FOR LOADING MISSING SALE LINE INTO BIT */}
      {selectedServiceToLoadSale && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Cargar Venta en BIT</h3>
                  <p className="text-xs text-slate-400">Reg: N° {selectedServiceToLoadSale.proyeccion?.numReg}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedServiceToLoadSale(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                <div><span className="text-slate-500">Cliente:</span> <strong className="text-white">{selectedServiceToLoadSale.clienteNombre}</strong></div>
                <div><span className="text-slate-500">Mandante:</span> {selectedServiceToLoadSale.proyeccion?.mandante}</div>
                <div><span className="text-slate-500">Tarifa Acordada:</span> <span className="font-mono text-emerald-400 font-bold">{formatClp(selectedServiceToLoadSale.proyeccion?.tarifaPactadaClp || 0)}</span></div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Monto Venta a Cargar (en CLP):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                  <input
                    type="number"
                    value={customSaleVal}
                    onChange={(e) => setCustomSaleVal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-7 pr-3 py-2 text-white font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedServiceToLoadSale(null)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2 rounded-xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLoadSale}
                className="w-1/2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl text-xs transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Carga</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
