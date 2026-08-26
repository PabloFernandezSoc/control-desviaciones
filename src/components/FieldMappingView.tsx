/**
 * Vista "Mapeo de Origen de Datos".
 *
 * Muestra los campos consolidados que usa el frontend y de qué fuente sale cada
 * uno. Los campos que existen en ambos lados se pueden reasignar con el selector
 * de la derecha; el resto queda fijo porque sólo una fuente los publica.
 *
 * Incluye además la configuración de los dos endpoints, para que la pantalla
 * funcione como el panel completo de la integración.
 */

import React, { useMemo, useState } from 'react';
import {
  Database,
  Table2,
  Lock,
  RotateCcw,
  Save,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Service } from '../types';
import {
  DataSource,
  FieldDefinition,
  FieldMappingState,
  FIELD_CATALOG,
  FIELD_GROUPS,
  MergeResult,
  defaultFieldMapping,
} from '../services/dataSources';
import { EndpointConfig, IntegrationConfig } from '../services/apiClient';

interface FieldMappingViewProps {
  mapeo: FieldMappingState;
  onChangeMapeo: (mapeo: FieldMappingState) => void;
  config: IntegrationConfig;
  onChangeConfig: (config: IntegrationConfig) => void;
  ultimoCruce: MergeResult<Service> | null;
}

const ETIQUETA_ORIGEN: Record<DataSource, string> = {
  api: 'API',
  sheets: 'Google Sheets',
};

export const OrigenBadge: React.FC<{ origen: DataSource; bloqueado?: boolean }> = ({
  origen,
  bloqueado,
}) => {
  const esApi = origen === 'api';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        esApi
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
      title={`Origen: ${ETIQUETA_ORIGEN[origen]}`}
    >
      {esApi ? <Database className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
      {ETIQUETA_ORIGEN[origen]}
      {bloqueado && <Lock className="h-3 w-3 opacity-60" />}
    </span>
  );
};

export const FieldMappingView: React.FC<FieldMappingViewProps> = ({
  mapeo,
  onChangeMapeo,
  config,
  onChangeConfig,
  ultimoCruce,
}) => {
  const [borradorConfig, setBorradorConfig] = useState<IntegrationConfig>(config);
  const [configGuardada, setConfigGuardada] = useState(false);

  const conteos = useMemo(() => {
    let api = 0;
    let sheets = 0;
    let editables = 0;
    for (const campo of FIELD_CATALOG) {
      const origen = campo.bloqueado ? campo.origenPorDefecto : mapeo[campo.key] ?? campo.origenPorDefecto;
      if (origen === 'api') api++;
      else sheets++;
      if (!campo.bloqueado && campo.disponibleEn.length > 1) editables++;
    }
    return { api, sheets, editables, total: FIELD_CATALOG.length };
  }, [mapeo]);

  const statPorCampo = useMemo(() => {
    const mapa = new Map<string, { desdeApi: number; desdeSheets: number; porRespaldo: number; vacios: number }>();
    for (const stat of ultimoCruce?.detallePorCampo ?? []) {
      mapa.set(stat.campo, stat);
    }
    return mapa;
  }, [ultimoCruce]);

  const cambiarOrigen = (campo: FieldDefinition, origen: DataSource) => {
    onChangeMapeo({ ...mapeo, [campo.key]: origen });
  };

  const restablecer = () => onChangeMapeo(defaultFieldMapping());

  const guardarConfig = () => {
    onChangeConfig(borradorConfig);
    setConfigGuardada(true);
    setTimeout(() => setConfigGuardada(false), 2500);
  };

  const actualizarEndpoint = (clave: 'api' | 'sheets', parcial: Partial<EndpointConfig>) => {
    setBorradorConfig((actual) => ({ ...actual, [clave]: { ...actual[clave], ...parcial } }));
    setConfigGuardada(false);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Link2 className="h-5 w-5 text-indigo-600" />
              Mapeo de Origen de Datos
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Cada campo que muestra la aplicación proviene de la API de BIT o de la planilla de
              Google Sheets. Donde el dato existe en ambos lados, aquí se define cuál manda.
            </p>
          </div>
          <button
            onClick={restablecer}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer por defecto
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumenTarjeta etiqueta="Campos consolidados" valor={conteos.total} />
          <ResumenTarjeta etiqueta="Desde la API" valor={conteos.api} color="indigo" />
          <ResumenTarjeta etiqueta="Desde Google Sheets" valor={conteos.sheets} color="emerald" />
          <ResumenTarjeta etiqueta="Reasignables" valor={conteos.editables} />
        </div>
      </div>

      {/* Resultado del último cruce */}
      {ultimoCruce && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Último cruce de fuentes
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ResumenTarjeta etiqueta="Registros unificados" valor={ultimoCruce.resumen.total} />
            <ResumenTarjeta etiqueta="En ambas fuentes" valor={ultimoCruce.resumen.enAmbasFuentes} />
            <ResumenTarjeta etiqueta="Sólo en la API" valor={ultimoCruce.resumen.soloApi} color="indigo" />
            <ResumenTarjeta etiqueta="Sólo en Sheets" valor={ultimoCruce.resumen.soloSheets} color="emerald" />
            <ResumenTarjeta
              etiqueta="Conflictos"
              valor={ultimoCruce.resumen.conflictos}
              color={ultimoCruce.resumen.conflictos > 0 ? 'amber' : undefined}
            />
          </div>
          {ultimoCruce.resumen.camposPorRespaldo > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                {ultimoCruce.resumen.camposPorRespaldo} valores se tomaron de la fuente alterna
                porque la fuente asignada llegó vacía. El detalle por campo aparece en la columna
                &ldquo;Cruce&rdquo; de la tabla.
              </span>
            </p>
          )}
        </div>
      )}

      {/* Tabla de campos */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Campo en la aplicación</th>
                <th className="px-4 py-3 font-semibold">Origen</th>
                <th className="px-4 py-3 font-semibold">Prioridad</th>
                <th className="px-4 py-3 font-semibold">Nombre en el origen</th>
                <th className="px-4 py-3 font-semibold">Cruce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FIELD_GROUPS.map((grupo) => {
                const campos = FIELD_CATALOG.filter((c) => c.grupo === grupo);
                if (campos.length === 0) return null;

                return (
                  <React.Fragment key={grupo}>
                    <tr className="bg-slate-100/70">
                      <td
                        colSpan={5}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600"
                      >
                        {grupo}
                      </td>
                    </tr>
                    {campos.map((campo) => {
                      const origen = campo.bloqueado
                        ? campo.origenPorDefecto
                        : mapeo[campo.key] ?? campo.origenPorDefecto;
                      const reasignable = !campo.bloqueado && campo.disponibleEn.length > 1;
                      const stat = statPorCampo.get(campo.key);

                      return (
                        <tr key={campo.key} className="align-top transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{campo.label}</div>
                            <code className="text-[11px] text-slate-400">{campo.key}</code>
                            {campo.descripcion && (
                              <p className="mt-1 max-w-xs text-xs leading-snug text-slate-500">
                                {campo.descripcion}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <OrigenBadge origen={origen} bloqueado={campo.bloqueado} />
                          </td>

                          <td className="px-4 py-3">
                            {reasignable ? (
                              <select
                                value={origen}
                                onChange={(e) => cambiarOrigen(campo, e.target.value as DataSource)}
                                aria-label={`Fuente con prioridad para ${campo.label}`}
                                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                              >
                                {campo.disponibleEn.map((fuente) => (
                                  <option key={fuente} value={fuente}>
                                    {ETIQUETA_ORIGEN[fuente]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-400">
                                {campo.bloqueado ? 'Llave del cruce' : 'Fuente única'}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="space-y-1 text-xs">
                              {campo.disponibleEn.map((fuente) => (
                                <div key={fuente} className="flex items-center gap-1.5">
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      fuente === 'api' ? 'bg-indigo-500' : 'bg-emerald-500'
                                    }`}
                                  />
                                  <code className="text-slate-500">
                                    {campo.nombreExterno?.[fuente] ?? campo.key}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs">
                            {stat ? (
                              <div className="space-y-0.5 text-slate-500">
                                <div>
                                  API <strong className="text-slate-700">{stat.desdeApi}</strong> ·
                                  Sheets <strong className="text-slate-700">{stat.desdeSheets}</strong>
                                </div>
                                {stat.porRespaldo > 0 && (
                                  <div className="text-amber-600">{stat.porRespaldo} por respaldo</div>
                                )}
                                {stat.vacios > 0 && <div className="text-slate-400">{stat.vacios} sin dato</div>}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conflictos detectados */}
      {ultimoCruce && ultimoCruce.conflictos.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Conflictos entre fuentes ({ultimoCruce.conflictos.length})
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            Ambas fuentes traen un valor distinto para el mismo campo. Se conservó el de la fuente
            con prioridad; el otro se muestra sólo como referencia.
          </p>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-amber-200 bg-white">
            <table className="w-full min-w-[640px] text-xs">
              <thead className="bg-amber-100/70 text-left uppercase tracking-wider text-amber-800">
                <tr>
                  <th className="px-3 py-2 font-semibold">Servicio</th>
                  <th className="px-3 py-2 font-semibold">Campo</th>
                  <th className="px-3 py-2 font-semibold">Valor API</th>
                  <th className="px-3 py-2 font-semibold">Valor Sheets</th>
                  <th className="px-3 py-2 font-semibold">Se usó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {ultimoCruce.conflictos.slice(0, 100).map((c, i) => (
                  <tr key={`${c.id}-${c.campo}-${i}`}>
                    <td className="px-3 py-2 font-mono text-slate-700">{c.id}</td>
                    <td className="px-3 py-2 text-slate-700">{c.label}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-slate-500">{formatear(c.valorApi)}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-slate-500">{formatear(c.valorSheets)}</td>
                    <td className="px-3 py-2">
                      <OrigenBadge origen={c.origenAsignado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Configuración de endpoints */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Conexión con las fuentes</h3>
        <p className="mt-1 text-xs text-slate-600">
          Mientras ninguna fuente esté activa, &ldquo;Actualizar datos&rdquo; trabaja sobre los datos
          de maqueta guardados en el navegador.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <EndpointForm
            titulo="API de BIT"
            icono={<Database className="h-4 w-4 text-indigo-600" />}
            endpoint={borradorConfig.api}
            onChange={(parcial) => actualizarEndpoint('api', parcial)}
            placeholderUrl="https://api.bit.lydcargo.cl/v1/servicios"
            conAuth
          />
          <EndpointForm
            titulo="Google Sheets"
            icono={<Table2 className="h-4 w-4 text-emerald-600" />}
            endpoint={borradorConfig.sheets}
            onChange={(parcial) => actualizarEndpoint('sheets', parcial)}
            placeholderUrl="https://script.google.com/macros/s/.../exec"
            conAuth={false}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Tiempo máximo de espera
            <input
              type="number"
              min={1000}
              step={1000}
              value={borradorConfig.timeoutMs}
              onChange={(e) => {
                setBorradorConfig((a) => ({ ...a, timeoutMs: Number(e.target.value) || 15000 }));
                setConfigGuardada(false);
              }}
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
            ms
          </label>

          <button
            onClick={guardarConfig}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar conexión
          </button>

          {configGuardada && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Configuración guardada
            </span>
          )}
        </div>

        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          La clave se guarda en el navegador de quien la escribe (<code>localStorage</code>), no se
          comparte entre usuarios y viaja sólo hacia la URL configurada. Para una credencial de
          producción conviene que el endpoint quede detrás de un proxy propio en vez de exponerla en
          el frontend.
        </p>
      </div>
    </div>
  );
};

const ResumenTarjeta: React.FC<{
  etiqueta: string;
  valor: number;
  color?: 'indigo' | 'emerald' | 'amber';
}> = ({ etiqueta, valor, color }) => {
  const colores = {
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  } as const;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className={`text-xl font-bold ${color ? colores[color] : 'text-slate-800'}`}>{valor}</div>
      <div className="text-[11px] leading-tight text-slate-500">{etiqueta}</div>
    </div>
  );
};

const EndpointForm: React.FC<{
  titulo: string;
  icono: React.ReactNode;
  endpoint: EndpointConfig;
  onChange: (parcial: Partial<EndpointConfig>) => void;
  placeholderUrl: string;
  conAuth: boolean;
}> = ({ titulo, icono, endpoint, onChange, placeholderUrl, conAuth }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icono}
        {titulo}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
        <input
          type="checkbox"
          checked={endpoint.habilitado}
          onChange={(e) => onChange({ habilitado: e.target.checked })}
          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
        />
        Activa
      </label>
    </div>

    <div className="mt-3 space-y-2.5">
      <Campo etiqueta="URL">
        <input
          type="url"
          value={endpoint.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder={placeholderUrl}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        />
      </Campo>

      <Campo etiqueta="Ruta del arreglo en la respuesta">
        <input
          type="text"
          value={endpoint.rutaDatos}
          onChange={(e) => onChange({ rutaDatos: e.target.value })}
          placeholder="data · results · (vacío si la raíz ya es el arreglo)"
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        />
      </Campo>

      {conAuth && (
        <div className="grid grid-cols-3 gap-2">
          <Campo etiqueta="Cabecera">
            <input
              type="text"
              value={endpoint.headerAuth}
              onChange={(e) => onChange({ headerAuth: e.target.value })}
              placeholder="Authorization"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
          </Campo>
          <Campo etiqueta="Esquema">
            <input
              type="text"
              value={endpoint.esquemaAuth}
              onChange={(e) => onChange({ esquemaAuth: e.target.value })}
              placeholder="Bearer"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
          </Campo>
          <Campo etiqueta="Clave">
            <input
              type="password"
              value={endpoint.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              placeholder="••••••"
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            />
          </Campo>
        </div>
      )}
    </div>
  </div>
);

const Campo: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-medium text-slate-500">{etiqueta}</span>
    {children}
  </label>
);

function formatear(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'object') {
    try {
      return JSON.stringify(valor);
    } catch {
      return '[objeto]';
    }
  }
  return String(valor);
}
