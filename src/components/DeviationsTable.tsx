import React, { useState, useMemo } from 'react';
import { 
  Deviation, 
  DeviationType, 
  DeviationStatus, 
  Role, 
  Client,
  RuleCategory,
  RuleSeverity,
  PrdRuleId
} from '../types';
import { 
  Search, 
  Filter, 
  Download, 
  RotateCcw, 
  UserCheck, 
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface DeviationsTableProps {
  deviations: Deviation[];
  clients: Client[];
  currentRole: Role;
  onSelectDeviation: (deviation: Deviation) => void;
}

export const DeviationsTable: React.FC<DeviationsTableProps> = ({
  deviations,
  clients,
  currentRole,
  onSelectDeviation
}) => {
  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyMine, setOnlyMine] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Format currency in Chilean Pesos (CLP)
  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Severity Badges
  const getSeverityBadge = (sev?: RuleSeverity) => {
    switch (sev) {
      case 'Alta':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Alta
          </span>
        );
      case 'Media':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
            Media
          </span>
        );
      case 'Baja':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-slate-200 text-slate-700">
            Baja
          </span>
        );
      default:
        return null;
    }
  };

  // Rule ID Badge
  const getRuleBadge = (idRegla?: PrdRuleId) => {
    if (!idRegla) return null;
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-100 border border-slate-700 shadow-2xs">
        {idRegla}
      </span>
    );
  };

  // Type labels and badges
  const getTypeBadge = (type: DeviationType, idRegla?: PrdRuleId) => {
    switch (type) {
      case 'concepto_faltante':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Concepto Faltante</span>;
      case 'valor_fuera_tarifa':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Valor fuera de tarifa</span>;
      case 'costo_sin_venta':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Costo sin venta</span>;
      case 'venta_sin_costo':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Venta sin costo</span>;
      case 'moneda_distinta':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">Moneda distinta</span>;
      case 'margen_bajo_minimo':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">Margen &lt; Mínimo</span>;
      case 'no_conciliable':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-800 border border-slate-300">No conciliable</span>;
      case 'proyeccion_sin_venta':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Proyección sin venta</span>;
      case 'eta_invalida':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">ETA Caducada / Inválida</span>;
      case 'sobrepeso':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Sobrepeso &gt; 25t</span>;
      case 'estadia_excedida':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">Estadía &gt; 4 hrs</span>;
      case 'campo_obligatorio_vacio':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Campo Obligatorio Vacío</span>;
      case 'direccion_por_confirmar':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">Dirección por Confirmar</span>;
      case 'stacking_invalido':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">Stacking / Corte Faltante</span>;
      case 'almacenaje_faltante':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Almacenaje Diferido Faltante</span>;
      case 'incidencia_pendiente':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">Incidencia sin Cobro</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">{type}</span>;
    }
  };

  // Status badges
  const getStatusBadge = (st: DeviationStatus) => {
    switch (st) {
      case 'abierta':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>Abierta</span>;
      case 'en_revision':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>En revisión</span>;
      case 'corregida':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Corregida</span>;
      case 'excepcion_justificada':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>Excepción</span>;
      case 'reabierta':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-700"></span>Reabierta</span>;
    }
  };

  // Responsible Role badges
  const getRoleBadge = (role: 'comercial' | 'costos' | 'admin') => {
    if (role === 'comercial') {
      return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold rounded">Comercial</span>;
    }
    if (role === 'costos') {
      return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded">Costos & Booking</span>;
    }
    return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-semibold rounded">Administración</span>;
  };

  // Filtered & Sorted Deviations
  const filteredDeviations = useMemo(() => {
    return deviations.filter(dev => {
      // Search term (service id, client name, concept name, rule ID)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesSrv = dev.servicioId.toLowerCase().includes(term);
        const matchesClient = dev.clienteNombre.toLowerCase().includes(term);
        const matchesConcept = dev.conceptoNombre.toLowerCase().includes(term);
        const matchesRule = dev.idRegla ? dev.idRegla.toLowerCase().includes(term) : false;
        const matchesMsg = dev.mensaje.toLowerCase().includes(term);
        if (!matchesSrv && !matchesClient && !matchesConcept && !matchesRule && !matchesMsg) return false;
      }

      // Client filter
      if (selectedClient !== 'all' && dev.clienteId !== selectedClient) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && dev.categoriaRegla !== selectedCategory) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== 'all' && dev.severidad !== selectedSeverity) {
        return false;
      }

      // Type filter
      if (selectedType !== 'all' && dev.tipo !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && dev.estado !== selectedStatus) {
        return false;
      }

      // Role filter
      if (selectedRole !== 'all' && dev.responsableRol !== selectedRole) {
        return false;
      }

      // Quick filter "Solo lo mío"
      if (onlyMine && currentRole !== 'admin') {
        if (dev.responsableRol !== currentRole) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const impA = a.impactoClp || a.impactoUsd || 0;
      const impB = b.impactoClp || b.impactoUsd || 0;
      if (sortDirection === 'desc') {
        return impB - impA;
      } else {
        return impA - impB;
      }
    });
  }, [deviations, searchTerm, selectedClient, selectedCategory, selectedSeverity, selectedType, selectedRole, selectedStatus, onlyMine, currentRole, sortDirection]);

  // Export CSV in CLP
  const exportToCsv = () => {
    if (filteredDeviations.length === 0) return;

    const headers = [
      'ID Desviación',
      'Regla PRD',
      'Severidad',
      'Categoría',
      'Servicio ID',
      'Cliente',
      'Ruta',
      'Tipo Desviación',
      'Mensaje / Alerta',
      'Campo Afectado',
      'Concepto',
      'Valor Esperado',
      'Valor Cargado',
      'Impacto CLP',
      'Rol Responsable',
      'Estado',
      'Antigüedad (días)'
    ];

    const rows = filteredDeviations.map(d => [
      d.id,
      d.idRegla || 'N/A',
      d.severidad || 'Media',
      d.categoriaRegla || 'Matriz Comercial',
      d.servicioId,
      `"${d.clienteNombre.replace(/"/g, '""')}"`,
      `"${d.rutaStr.replace(/"/g, '""')}"`,
      d.tipo,
      `"${d.mensaje.replace(/"/g, '""')}"`,
      `"${(d.campoAfectado || '').replace(/"/g, '""')}"`,
      `"${d.conceptoNombre.replace(/"/g, '""')}"`,
      d.valorEsperado,
      d.valorCargado,
      d.impactoClp || d.impactoUsd || 0,
      d.responsableRol,
      d.estado,
      d.antiguedadDias
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `desviaciones_prd_bit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClient('all');
    setSelectedCategory('all');
    setSelectedSeverity('all');
    setSelectedType('all');
    setSelectedRole('all');
    setSelectedStatus('all');
    setOnlyMine(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      
      {/* Table Toolbar & Filters */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por ID servicio, regla (ej. R-GEN-01), cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-2xs"
            />
          </div>

          {/* Quick Buttons: "Solo lo mío", Sort, Export */}
          <div className="flex items-center gap-2 flex-wrap">
            
            <button
              onClick={() => setOnlyMine(!onlyMine)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                onlyMine
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Solo lo mío</span>
            </button>

            <button
              onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Cambiar orden por impacto CLP"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Impacto {sortDirection === 'desc' ? 'Mayor → Menor' : 'Menor → Mayor'}</span>
            </button>

            <button
              onClick={exportToCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV (CLP)</span>
            </button>

          </div>

        </div>

        {/* Dropdown Filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
          
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtros:
          </span>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todas las Severidades</option>
            <option value="Alta">🔴 Severidad Alta (Bloquea Facturación)</option>
            <option value="Media">🟡 Severidad Media</option>
            <option value="Baja">⚪ Severidad Baja</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todas las Categorías PRD</option>
            <option value="Generales">5.1 Generales (Fechas, Pesos, Estadía)</option>
            <option value="Importación">5.2 Importación</option>
            <option value="Exportación">5.3 Exportación</option>
            <option value="Extra Costos">5.4 Extra Costos & Almacenaje</option>
            <option value="Incidencias">5.5 Incidencias Operativas</option>
            <option value="Liquidación y Cierre">5.6 Liquidación & Cierre</option>
            <option value="Matriz Comercial">Matriz Comercial & Catálogo</option>
          </select>

          {/* Client Filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todos los Clientes</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todos los Roles</option>
            <option value="comercial">Comercial</option>
            <option value="costos">Costos y Booking</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todos los Estados</option>
            <option value="abierta">Abierta</option>
            <option value="en_revision">En revisión</option>
            <option value="corregida">Corregida</option>
            <option value="excepcion_justificada">Excepción Justificada</option>
          </select>

          {/* Clear button */}
          {(selectedClient !== 'all' || selectedCategory !== 'all' || selectedSeverity !== 'all' || selectedType !== 'all' || selectedRole !== 'all' || selectedStatus !== 'all' || searchTerm !== '' || onlyMine) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded transition-colors cursor-pointer ml-auto"
            >
              <RotateCcw className="w-3 h-3" /> Limpiar Filtros
            </button>
          )}

        </div>

      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-3 px-4">Regla / Severidad</th>
              <th className="py-3 px-4">Servicio / Mandante</th>
              <th className="py-3 px-4">Detalle / Alerta</th>
              <th className="py-3 px-4">Campo Afectado</th>
              <th className="py-3 px-4 text-right">Impacto CLP</th>
              <th className="py-3 px-4">Responsable</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-center">Antigüedad</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs text-slate-700">
            
            {filteredDeviations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 bg-slate-50/30">
                  <div className="max-w-xs mx-auto space-y-2">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">No se encontraron desviaciones</p>
                    <p className="text-xs text-slate-400">
                      {deviations.length === 0
                        ? 'No existen desviaciones detectadas en este momento.'
                        : 'No hay desviaciones que coincidan con los filtros seleccionados.'}
                    </p>
                    {deviations.length > 0 && (
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        Restablecer todos los filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredDeviations.map((dev) => (
                <tr
                  key={dev.id}
                  onClick={() => onSelectDeviation(dev)}
                  className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                >
                  
                  {/* Rule & Severity */}
                  <td className="py-3 px-4 font-medium">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="flex items-center gap-1.5">
                        {getRuleBadge(dev.idRegla)}
                        {getSeverityBadge(dev.severidad)}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {dev.categoriaRegla || 'Matriz'}
                      </span>
                    </div>
                  </td>

                  {/* Service ID & Client */}
                  <td className="py-3 px-4 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">
                        {dev.servicioId}
                      </span>
                      {dev.reincidente && (
                        <span className="bg-rose-100 text-rose-800 text-[9px] font-extrabold px-1 py-0.2 rounded border border-rose-300">
                          Reincidente
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate max-w-[160px]" title={dev.clienteNombre}>
                      {dev.clienteNombre}
                    </div>
                  </td>

                  {/* Message / Alert details */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-slate-800 line-clamp-1">{dev.mensaje}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      {getTypeBadge(dev.tipo, dev.idRegla)}
                    </div>
                  </td>

                  {/* Affected Field / Concept */}
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{dev.campoAfectado || dev.conceptoNombre}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{dev.conceptoCodigo}</div>
                  </td>

                  {/* Impact CLP */}
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    <span className="text-rose-600 font-mono text-sm">
                      {formatClp(dev.impactoClp || dev.impactoUsd || 0)}
                    </span>
                  </td>

                  {/* Responsible */}
                  <td className="py-3 px-4">
                    {getRoleBadge(dev.responsableRol)}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4">
                    {getStatusBadge(dev.estado)}
                  </td>

                  {/* Antigüedad */}
                  <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                    {dev.antiguedadDias} {dev.antiguedadDias === 1 ? 'día' : 'días'}
                  </td>

                  {/* Action arrow */}
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center text-slate-400 group-hover:text-rose-600 transition-colors">
                      <span className="text-[11px] font-semibold mr-1">Revisar</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </td>

                </tr>
              ))
            )}

          </tbody>
        </table>
      </div>

      {/* Footer Info bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
        <span>Mostrando <strong>{filteredDeviations.length}</strong> de <strong>{deviations.length}</strong> desviaciones según reglas PRD</span>
        <span className="text-slate-400 font-mono">Ordenado por impacto financiero CLP (desc)</span>
      </div>

    </div>
  );
};
