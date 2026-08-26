import React, { useState, useMemo } from 'react';
import { 
  Ship, 
  Anchor, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search,
  BarChart3,
  MapPin,
  ArrowUpRight,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Service } from '../types';

interface DashboardViewProps {
  projectionServices: Service[];
  allServices: Service[];
  onSelectService?: (serviceId: string) => void;
}

// Color palettes for sleek dark/modern UI
const PORT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];
const NAVEE_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#f59e0b', '#84cc16'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  projectionServices,
  allServices,
  onSelectService
}) => {
  // Filters
  const [selectedPuerto, setSelectedPuerto] = useState<string>('all');
  const [selectedNave, setSelectedNave] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [timeMode, setTimeMode] = useState<'semana' | 'dia'>('semana');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Currency formatter (CLP)
  const formatClp = (val: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Helper to extract numeric date from string DD/MM/YYYY or YYYY-MM-DD
  const parseDateStr = (dateStr?: string): Date | null => {
    if (!dateStr || dateStr === 'PENDIENTE' || dateStr === '-') return null;
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    }
    return null;
  };

  // Helper to get ISO week string, e.g. "Semana 29 (13/Jul - 19/Jul)"
  const getWeekInfo = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const week1 = new Date(date.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    
    // Start/End dates of that week
    const firstDay = new Date(date);
    firstDay.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const label = `Semana ${weekNum} (${firstDay.getDate()}/${monthNames[firstDay.getMonth()]})`;
    return { weekNum, label };
  };

  // 1. Unique Filter Options derived from data
  const puertosList = useMemo(() => {
    const set = new Set<string>();
    projectionServices.forEach(s => {
      if (s.proyeccion?.puerto) set.add(s.proyeccion.puerto);
    });
    return Array.from(set).sort();
  }, [projectionServices]);

  const navesList = useMemo(() => {
    const set = new Set<string>();
    projectionServices.forEach(s => {
      if (s.proyeccion?.nave && s.proyeccion.nave !== '-') set.add(s.proyeccion.nave);
    });
    return Array.from(set).sort();
  }, [projectionServices]);

  // 2. Filtered Services List
  const filteredServices = useMemo(() => {
    return projectionServices.filter(s => {
      const p = s.proyeccion;
      if (!p) return false;

      if (selectedPuerto !== 'all' && p.puerto !== selectedPuerto) return false;
      if (selectedNave !== 'all' && p.nave !== selectedNave) return false;
      if (selectedTipo !== 'all' && p.tipoServ !== selectedTipo) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = p.numReg.toString().includes(term);
        const matchMandante = p.mandante.toLowerCase().includes(term);
        const matchCliente = s.clienteNombre.toLowerCase().includes(term);
        const matchCont = p.numContenedor.toLowerCase().includes(term);
        const matchNave = p.nave.toLowerCase().includes(term);
        const matchPuerto = p.puerto.toLowerCase().includes(term);
        if (!matchNum && !matchMandante && !matchCliente && !matchCont && !matchNave && !matchPuerto) {
          return false;
        }
      }

      return true;
    });
  }, [projectionServices, selectedPuerto, selectedNave, selectedTipo, searchTerm]);

  // 3. KPI Summaries
  const kpiData = useMemo(() => {
    const totalCount = filteredServices.length;
    let totalVentaProyectada = 0;
    let conVentaCount = 0;
    let sinVentaCount = 0;
    const uniqueNaves = new Set<string>();
    const uniquePuertos = new Set<string>();

    filteredServices.forEach(s => {
      const p = s.proyeccion;
      if (!p) return;

      // Projected revenue formula:
      // If lines exist with 'venta', sum them, else use tarifaPactadaClp + ventaAdicClp
      const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
      const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);
      totalVentaProyectada += estimatedSale;

      const tieneVenta = s.lineas.some(l => l.tipo === 'venta');
      if (tieneVenta) conVentaCount++;
      else sinVentaCount++;

      if (p.nave && p.nave !== '-') uniqueNaves.add(p.nave);
      if (p.puerto) uniquePuertos.add(p.puerto);
    });

    const avgSale = totalCount > 0 ? Math.round(totalVentaProyectada / totalCount) : 0;

    return {
      totalCount,
      totalVentaProyectada,
      avgSale,
      conVentaCount,
      sinVentaCount,
      navesCount: uniqueNaves.size,
      puertosCount: uniquePuertos.size
    };
  }, [filteredServices]);

  // 4. Data Breakdown by Vessel (Nave)
  const navesChartData = useMemo(() => {
    const map = new Map<string, { nave: string; cantidad: number; ventaClp: number }>();

    filteredServices.forEach(s => {
      const p = s.proyeccion;
      if (!p) return;
      const naveName = p.nave && p.nave !== '-' ? p.nave : 'Sin Nave Asignada';

      const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
      const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);

      const existing = map.get(naveName) || { nave: naveName, cantidad: 0, ventaClp: 0 };
      existing.cantidad += 1;
      existing.ventaClp += estimatedSale;
      map.set(naveName, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredServices]);

  // 5. Data Breakdown by Week / Day (ETA / Presentación)
  const timelineChartData = useMemo(() => {
    if (timeMode === 'semana') {
      const weekMap = new Map<string, { label: string; semanaKey: number; servicios: number; ventaClp: number }>();

      filteredServices.forEach(s => {
        const p = s.proyeccion;
        if (!p) return;

        // Try ETA first, then presen
        const dateObj = parseDateStr(p.eta) || parseDateStr(p.presen);
        let key = 'Sin Fecha';
        let weekNum = 99;

        if (dateObj) {
          const wInfo = getWeekInfo(dateObj);
          key = wInfo.label;
          weekNum = wInfo.weekNum;
        }

        const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
        const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);

        const curr = weekMap.get(key) || { label: key, semanaKey: weekNum, servicios: 0, ventaClp: 0 };
        curr.servicios += 1;
        curr.ventaClp += estimatedSale;
        weekMap.set(key, curr);
      });

      return Array.from(weekMap.values()).sort((a, b) => a.semanaKey - b.semanaKey);
    } else {
      // Por día en base a ETA
      const dayMap = new Map<string, { label: string; rawDate: Date | null; servicios: number; ventaClp: number }>();

      filteredServices.forEach(s => {
        const p = s.proyeccion;
        if (!p) return;

        const dateObj = parseDateStr(p.eta);
        const dayLabel = p.eta ? p.eta.split(' ')[0] : 'Sin ETA';

        const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
        const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);

        const curr = dayMap.get(dayLabel) || { label: dayLabel, rawDate: dateObj, servicios: 0, ventaClp: 0 };
        curr.servicios += 1;
        curr.ventaClp += estimatedSale;
        dayMap.set(dayLabel, curr);
      });

      return Array.from(dayMap.values()).sort((a, b) => {
        if (!a.rawDate) return 1;
        if (!b.rawDate) return -1;
        return a.rawDate.getTime() - b.rawDate.getTime();
      });
    }
  }, [filteredServices, timeMode]);

  // 6. Data Breakdown by Port / Zone
  const puertosChartData = useMemo(() => {
    const map = new Map<string, { puerto: string; servicios: number; ventaClp: number }>();

    filteredServices.forEach(s => {
      const p = s.proyeccion;
      if (!p) return;

      const puertoName = p.puerto || 'Sin Puerto Def.';
      const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
      const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);

      const curr = map.get(puertoName) || { puerto: puertoName, servicios: 0, ventaClp: 0 };
      curr.servicios += 1;
      curr.ventaClp += estimatedSale;
      map.set(puertoName, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.servicios - a.servicios);
  }, [filteredServices]);

  // 7. Client Revenue Breakdown
  const clientRevenueData = useMemo(() => {
    const map = new Map<string, { cliente: string; servicios: number; ventaProyectada: number; sinVentaCount: number }>();

    filteredServices.forEach(s => {
      const p = s.proyeccion;
      if (!p) return;

      const clienteName = s.clienteNombre || p.mandante;
      const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
      const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);
      const tieneVenta = s.lineas.some(l => l.tipo === 'venta');

      const curr = map.get(clienteName) || { cliente: clienteName, servicios: 0, ventaProyectada: 0, sinVentaCount: 0 };
      curr.servicios += 1;
      curr.ventaProyectada += estimatedSale;
      if (!tieneVenta) curr.sinVentaCount += 1;
      map.set(clienteName, curr);
    });

    return Array.from(map.values()).sort((a, b) => b.ventaProyectada - a.ventaProyectada);
  }, [filteredServices]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">
              Dashboard de Proyección de Carga
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Análisis consolidado de servicios proyectados, naves, distribución temporal (ETA) y venta estimada en CLP.
          </p>
        </div>

        {/* Global Quick Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-blue-950/80 border border-blue-800 text-blue-300 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
            <Ship className="w-3.5 h-3.5 text-blue-400" />
            {kpiData.totalCount} Servicios Proyectados
          </span>
          <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-3 py-1.5 rounded-lg font-bold font-mono flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            {formatClp(kpiData.totalVentaProyectada)} Venta Est.
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span>Filtros:</span>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por N° Reg, nave, mandante, contenedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Puerto Filter */}
        <select
          value={selectedPuerto}
          onChange={(e) => setSelectedPuerto(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los Puertos ({puertosList.length})</option>
          {puertosList.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Nave Filter */}
        <select
          value={selectedNave}
          onChange={(e) => setSelectedNave(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todas las Naves ({navesList.length})</option>
          {navesList.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* Modal/Tipo Filter */}
        <select
          value={selectedTipo}
          onChange={(e) => setSelectedTipo(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="all">Todos los Tipos</option>
          <option value="DIRECTO">DIRECTO</option>
          <option value="IMPOD">IMPOD</option>
          <option value="EXPOD">EXPOD</option>
          <option value="LCL">LCL</option>
        </select>

        {/* Reset Filters */}
        {(selectedPuerto !== 'all' || selectedNave !== 'all' || selectedTipo !== 'all' || searchTerm !== '') && (
          <button
            onClick={() => {
              setSelectedPuerto('all');
              setSelectedNave('all');
              setSelectedTipo('all');
              setSearchTerm('');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1.5 hover:bg-rose-950/40 rounded transition-colors"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* 4 MAIN KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Cantidad de Servicios en Proyección */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Servicios en Proyección
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-100">
                {kpiData.totalCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">registros</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {kpiData.conVentaCount} con venta
              </span>
              {kpiData.sinVentaCount > 0 && (
                <span className="text-[11px] bg-amber-950/80 border border-amber-800 text-amber-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1" title="Servicios sin venta cargada en BIT">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  {kpiData.sinVentaCount} sin venta
                </span>
              )}
            </div>
          </div>
          <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl text-blue-400">
            <Ship className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2: Venta Proyectada Total (CLP) */}
        <div className="bg-slate-900 border border-emerald-900/50 rounded-xl p-4 shadow-md flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Venta Proyectada Total
            </p>
            <div className="space-y-0.5">
              <p className="text-2xl font-black text-emerald-300 font-mono">
                {formatClp(kpiData.totalVentaProyectada)}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Promedio por servicio: <span className="text-emerald-400 font-mono font-bold">{formatClp(kpiData.avgSale)}</span>
              </p>
            </div>
          </div>
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3: Cantidad de Naves Activas */}
        <div className="bg-slate-900 border border-indigo-900/50 rounded-xl p-4 shadow-md flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Naves en Proyección
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-300">
                {kpiData.navesCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">naves asignadas</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Top Nave: <span className="font-semibold text-indigo-300">{navesChartData[0]?.nave || 'N/A'}</span> ({navesChartData[0]?.cantidad || 0} srv)
            </p>
          </div>
          <div className="p-3 bg-indigo-950/60 border border-indigo-800/60 rounded-xl text-indigo-400">
            <Anchor className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4: Zonas / Puertos Operativos */}
        <div className="bg-slate-900 border border-amber-900/50 rounded-xl p-4 shadow-md flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Puertos / Zonas
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-300">
                {kpiData.puertosCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">terminales activos</span>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Terminal principal: <span className="font-semibold text-amber-300">{puertosChartData[0]?.puerto || 'N/A'}</span>
            </p>
          </div>
          <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded-xl text-amber-400">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* CHART ROW 1: DESGLOSE POR SEMANA / DIA & SERVICIOS POR PUERTO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Desglose por Semana / Día (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Distribución Temporal (Semana / Día ETA)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Volumen de servicios y venta estimada según programación de arribo / presentación.
              </p>
            </div>

            {/* Toggle Week vs Day */}
            <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setTimeMode('semana')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  timeMode === 'semana'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Semana
              </button>
              <button
                onClick={() => setTimeMode('dia')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  timeMode === 'dia'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Por Día (ETA)
              </button>
            </div>
          </div>

          {/* Timeline Recharts BarChart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis 
                  dataKey="label" 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(value: any, name: any) => {
                    if (name === 'Venta CLP') return [formatClp(Number(value)), 'Venta Proyectada'];
                    return [value, 'Servicios'];
                  }}
                />
                <Bar dataKey="servicios" name="Servicios" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36}>
                  {timelineChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PORT_COLORS[index % PORT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Timeline Summary Mini Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-800 text-xs">
            {timelineChartData.slice(0, 4).map((item, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 block truncate">{item.label}</span>
                <span className="text-sm font-bold text-slate-200">{item.servicios} srv</span>
                <span className="text-[10px] text-emerald-400 font-mono block font-semibold">
                  {formatClp(item.ventaClp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 2: Cantidad de Servicios por Zona / Puerto (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100">
                Servicios por Zona / Puerto
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Distribución por terminal marítimo o recinto aduanero.
            </p>

            {/* Donut Chart */}
            <div className="h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={puertosChartData}
                    dataKey="servicios"
                    nameKey="puerto"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {puertosChartData.map((_, index) => (
                      <Cell key={`cell-p-${index}`} fill={PORT_COLORS[index % PORT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [`${val} servicios`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List breakdown of ports */}
          <div className="space-y-2 pt-3 border-t border-slate-800 max-h-40 overflow-y-auto pr-1">
            {puertosChartData.map((p, idx) => (
              <div key={p.puerto} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/40 last:border-0">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: PORT_COLORS[idx % PORT_COLORS.length] }} 
                  />
                  <span className="font-semibold text-slate-300 truncate max-w-[140px]" title={p.puerto}>
                    {p.puerto}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-slate-100">{p.servicios} srv</span>
                  <span className="text-[10px] text-emerald-400 block font-semibold">{formatClp(p.ventaClp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CHART ROW 2: SERVICIOS POR NAVE & DETALLE DE VENTA PROYECTADA POR CLIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CHART 3: Cuántos Servicios Vienen Por Nave */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Anchor className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Servicios por Nave / Barco
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Carga programada desglosada por buque porta-contenedores.
              </p>
            </div>
            <span className="text-xs bg-indigo-950/80 border border-indigo-800 text-indigo-300 px-2.5 py-1 rounded-lg font-bold">
              {navesChartData.length} Naves
            </span>
          </div>

          {/* Horizontal Bar Chart for Vessels */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={navesChartData}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="nave" 
                  stroke="#cbd5e1" 
                  fontSize={11} 
                  tickLine={false}
                  width={110}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                  formatter={(val: any, name: any) => {
                    if (name === 'Venta') return [formatClp(Number(val)), 'Venta Est.'];
                    return [`${val} servicios`, 'Cantidad'];
                  }}
                />
                <Bar dataKey="cantidad" name="Servicios" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={20}>
                  {navesChartData.map((_, index) => (
                    <Cell key={`cell-n-${index}`} fill={NAVEE_COLORS[index % NAVEE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vessel Table */}
          <div className="overflow-x-auto max-h-48 overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-2 px-3">Nave</th>
                  <th className="py-2 px-3 text-center">Servicios</th>
                  <th className="py-2 px-3 text-right">Venta Proyectada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {navesChartData.map((n, idx) => (
                  <tr key={n.nave} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-semibold text-slate-200 flex items-center gap-2">
                      <Anchor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      {n.nave}
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-100 font-mono">
                      {n.cantidad}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatClp(n.ventaClp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETALLE DE VENTA PROYECTADA POR CLIENTE / MANDANTE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-slate-100">
                  Venta Proyectada por Cliente / Mandante
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingresos esperados desglosados por empresa contratante.
              </p>
            </div>
            <span className="text-xs bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-1 rounded-lg font-bold font-mono">
              {formatClp(kpiData.totalVentaProyectada)} Total
            </span>
          </div>

          {/* Client Breakdown Table */}
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Cliente / Mandante</th>
                  <th className="py-2.5 px-3 text-center">Servicios</th>
                  <th className="py-2.5 px-3 text-center">Estado Venta</th>
                  <th className="py-2.5 px-3 text-right">Venta CLP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {clientRevenueData.map((c) => (
                  <tr key={c.cliente} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {c.cliente}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-100 font-mono">
                      {c.servicios}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {c.sinVentaCount > 0 ? (
                        <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                          ⚠️ {c.sinVentaCount} sin venta
                        </span>
                      ) : (
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                          ✓ Venta cargada
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatClp(c.ventaProyectada)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* DETAILED SERVICES DRILL-DOWN TABLE IN DASHBOARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Detalle de Servicios en Proyección
            </h3>
            <p className="text-xs text-slate-400">
              Listado completo filtrado según la selección actual ({filteredServices.length} de {projectionServices.length} servicios).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3">N° Reg</th>
                <th className="py-3 px-3">Cliente / Mandante</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Nave</th>
                <th className="py-3 px-3">Puerto</th>
                <th className="py-3 px-3">ETA</th>
                <th className="py-3 px-3">Contenedor</th>
                <th className="py-3 px-3 text-right">Venta Proyectada</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No se encontraron servicios proyectados para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredServices.map((s) => {
                  const p = s.proyeccion;
                  if (!p) return null;

                  const lineSales = s.lineas.filter(l => l.tipo === 'venta').reduce((sum, l) => sum + l.valor, 0);
                  const estimatedSale = lineSales > 0 ? lineSales : (p.tarifaPactadaClp + p.ventaAdicClp);
                  const tieneVenta = s.lineas.some(l => l.tipo === 'venta');

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                        N° {p.numReg}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {p.mandante || s.clienteNombre}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {p.tipoServ}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-300">
                        {p.nave && p.nave !== '-' ? p.nave : <span className="text-slate-500 font-normal">Sin nave</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {p.puerto}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {p.eta}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                        {p.numContenedor}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatClp(estimatedSale)}
                        {!tieneVenta && (
                          <span className="block text-[9px] text-amber-400 font-semibold">(Est. pactada)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {onSelectService && (
                          <button
                            onClick={() => onSelectService(s.id)}
                            className="text-[11px] bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1 mx-auto"
                          >
                            <span>Ver Ficha</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        )}
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
