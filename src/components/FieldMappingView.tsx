/**
 * Vista "Mapeo de Campos".
 *
 * El reporte de BIT no tiene nombres de columna estables, así que la aplicación
 * los detecta. Esta pantalla muestra qué columna quedó asignada a cada campo,
 * con una muestra de sus valores para poder verificarlo de un vistazo, y permite
 * corregir a mano cualquier asignación. Al corregir se reconstruye el modelo con
 * la copia local, sin volver a llamar a la API.
 *
 * Incluye también la conexión con el endpoint.
 */

import React, { useMemo, useState } from 'react';
import {
  Database,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  Plug,
  ShieldOff,
  Download,
  ClipboardPaste,
} from 'lucide-react';
import {
  CAMPOS,
  GRUPOS_CAMPO,
  InfoColumna,
  MapeoCampos,
} from '../services/fieldMapping';
import { ApiConfig } from '../services/apiClient';

interface FieldMappingViewProps {
  columnas: Record<string, InfoColumna>;
  mapeo: MapeoCampos;
  onChangeMapeo: (mapeo: MapeoCampos) => void;
  reglasDesactivadas: { regla: string; titulo: string; motivo: string }[];
  config: ApiConfig;
  onChangeConfig: (config: ApiConfig) => void;
  onProbarConexion: () => void;
  cargando: boolean;
  filas: number;
  servicios: number;
  latenciaMs: number | null;
  /** Respuesta cruda de la última lectura, para inspeccionarla y exportarla. */
  respuestaCruda: unknown;
  onPegarJson: (texto: string) => void;
}

export const FieldMappingView: React.FC<FieldMappingViewProps> = ({
  columnas,
  mapeo,
  onChangeMapeo,
  reglasDesactivadas,
  config,
  onChangeConfig,
  onProbarConexion,
  cargando,
  filas,
  servicios,
  latenciaMs,
  respuestaCruda,
  onPegarJson,
}) => {
  const [jsonPegado, setJsonPegado] = useState('');
  const [mostrarPegar, setMostrarPegar] = useState(false);
  const [borrador, setBorrador] = useState<ApiConfig>(config);
  const [guardada, setGuardada] = useState(false);

  const nombresColumna = useMemo(
    () => Object.keys(columnas).sort((a, b) => a.localeCompare(b, 'es')),
    [columnas],
  );

  const hayRespuesta = nombresColumna.length > 0;

  const asignados = useMemo(
    () => Object.keys(CAMPOS).filter((k) => mapeo[k]).length,
    [mapeo],
  );

  const cambiarCampo = (campo: string, columna: string) => {
    const nuevo = { ...mapeo };
    if (columna === '') delete nuevo[campo];
    else nuevo[campo] = columna;
    onChangeMapeo(nuevo);
  };

  const guardarConfig = () => {
    onChangeConfig(borrador);
    setGuardada(true);
    setTimeout(() => setGuardada(false), 2500);
  };

  /** Descarga la respuesta cruda: sirve para revisarla fuera de la app. */
  const descargarJson = () => {
    try {
      const blob = new Blob([JSON.stringify(respuestaCruda, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-bit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('No se pudo preparar la descarga:', e);
    }
  };

  const set = (parcial: Partial<ApiConfig>) => {
    setBorrador((a) => ({ ...a, ...parcial }));
    setGuardada(false);
  };

  return (
    <div className="space-y-6">
      {/* Conexión */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <Plug className="h-5 w-5 text-indigo-600" />
          Conexión con BIT
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Mismo endpoint y cuerpo JSON que la consulta de Power Query. Toda la información que
          muestra la aplicación sale de aquí; nada se escribe de vuelta.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Campo etiqueta="URL del reporte" ancho>
            <input
              type="url"
              value={borrador.url}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://biterp.cl:451/api/misservicios/reporte/prod-general"
              className={inputCls}
            />
          </Campo>

          <Campo etiqueta="Proxy o webhook (opcional)" ancho>
            <input
              type="url"
              value={borrador.proxy}
              onChange={(e) => set({ proxy: e.target.value })}
              placeholder="https://n8n.tudominio.cl/webhook/reporte-prod-general"
              className={inputCls}
            />
          </Campo>

          <Campo etiqueta="apiKey">
            <input
              type="password"
              value={borrador.apiKey}
              onChange={(e) => set({ apiKey: e.target.value })}
              placeholder="••••••••••••"
              className={inputCls}
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Periodo desde">
              <input
                type="date"
                value={borrador.perDesde}
                onChange={(e) => set({ perDesde: e.target.value })}
                className={inputCls}
              />
            </Campo>
            <Campo etiqueta="Periodo hasta">
              <input
                type="date"
                value={borrador.perHasta}
                onChange={(e) => set({ perHasta: e.target.value })}
                className={inputCls}
              />
            </Campo>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={guardarConfig}
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar conexión
          </button>
          <button
            onClick={onProbarConexion}
            disabled={cargando}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {cargando ? 'Consultando...' : 'Probar y leer ahora'}
          </button>
          {guardada && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Configuración guardada
            </span>
          )}
        </div>

        {hayRespuesta && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tarjeta etiqueta="Filas recibidas" valor={filas.toLocaleString('es-CL')} />
            <Tarjeta etiqueta="Servicios construidos" valor={servicios.toLocaleString('es-CL')} />
            <Tarjeta etiqueta="Columnas detectadas" valor={nombresColumna.length} />
            <Tarjeta
              etiqueta="Campos asignados"
              valor={`${asignados} / ${Object.keys(CAMPOS).length}`}
            />
          </div>
        )}

        {latenciaMs !== null && (
          <p className="mt-3 text-xs text-slate-500">La API respondió en {latenciaMs} ms.</p>
        )}

        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          La <code>apiKey</code> se guarda en el navegador de quien la escribe y viaja sólo hacia la
          URL configurada. Si el navegador bloquea la llamada por CORS, o si prefieres no exponer la
          clave, apunta el campo <strong>Proxy</strong> a un webhook propio: se usa en vez del
          endpoint directo.
        </p>
      </div>

      {/* Reglas desactivadas */}
      {reglasDesactivadas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <ShieldOff className="h-4 w-4 text-amber-600" />
            Reglas que no se están evaluando ({reglasDesactivadas.length})
          </h3>
          <p className="mt-1 max-w-3xl text-xs text-amber-800">
            Falta la columna que necesitan, o la columna llegó con datos que no las sostienen. Se
            prefiere no evaluarlas antes que marcar todos los servicios como desviados: eso no son
            hallazgos, es ruido.
          </p>
          <ul className="mt-3 space-y-2">
            {reglasDesactivadas.map((r, i) => (
              <li key={`${r.regla}-${i}`} className="flex items-start gap-2 text-xs text-amber-900">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span>
                  <strong>{r.titulo}</strong> — {r.motivo}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Esquema recibido */}
      {hayRespuesta && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Datos recibidos</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Las {nombresColumna.length} columnas que trae el reporte, tal como llegan. Sirve para
                verificar el mapeo y para saber qué información existe y cuál habría que complementar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={descargarJson} className={botonSecundario}>
                <Download className="h-3.5 w-3.5" />
                Descargar respuesta
              </button>
              <button onClick={() => setMostrarPegar((v) => !v)} className={botonSecundario}>
                <ClipboardPaste className="h-3.5 w-3.5" />
                Pegar JSON
              </button>
            </div>
          </div>

          {mostrarPegar && (
            <div className="border-b border-slate-200 bg-slate-50 p-5">
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                Pega aquí la respuesta del endpoint para trabajar sin conexión
              </label>
              <textarea
                rows={5}
                value={jsonPegado}
                onChange={(e) => setJsonPegado(e.target.value)}
                placeholder='{"data":[ ... ]}'
                className="w-full rounded-lg border border-slate-300 p-2.5 font-mono text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
              />
              <button
                onClick={() => { onPegarJson(jsonPegado); setJsonPegado(''); }}
                disabled={!jsonPegado.trim()}
                className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                Procesar JSON
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Columna</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Llenado</th>
                  <th className="px-4 py-3 font-semibold">Valores de ejemplo</th>
                  <th className="px-4 py-3 font-semibold">Usada por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {nombresColumna.map((nombre) => {
                  const info = columnas[nombre];
                  const llenado = ((info.total - info.nulos) / (info.total || 1)) * 100;
                  const campo = Object.keys(CAMPOS).find((k) => mapeo[k] === nombre);
                  return (
                    <tr key={nombre} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-2.5">
                        <code className="text-xs font-semibold text-slate-800">{nombre}</code>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {info.esNumero ? 'numérica' : info.esFecha ? (info.conHora ? 'fecha con hora' : 'fecha sin hora') : 'texto'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{Math.round(llenado)}%</td>
                      <td className="max-w-sm px-4 py-2.5">
                        <div className="space-y-0.5">
                          {info.valores.slice(0, 3).map((v, i) => (
                            <div key={i} className="truncate font-mono text-xs text-slate-500">{v}</div>
                          ))}
                          {info.valores.length === 0 && <span className="text-xs text-slate-300">sin valores</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {campo ? (
                          <span className="rounded bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                            {CAMPOS[campo].label}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de mapeo */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900">Mapeo de Campos</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Qué columna de la respuesta alimenta cada campo. La asignación es automática; si
                alguna quedó mal, corrígela y el modelo se reconstruye al instante.
              </p>
            </div>
            <button
              onClick={() => onChangeMapeo({})}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Volver a la detección automática
            </button>
          </div>
        </div>

        {!hayRespuesta ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Info className="h-8 w-8 text-slate-300" />
            <p className="max-w-md text-sm text-slate-500">
              Todavía no hay una respuesta de la API que analizar. Configura la conexión y pulsa
              &ldquo;Probar y leer ahora&rdquo; para que se detecten las columnas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campo de la aplicación</th>
                  <th className="px-4 py-3 font-semibold">Columna de la API</th>
                  <th className="px-4 py-3 font-semibold">Muestra de valores</th>
                  <th className="px-4 py-3 font-semibold">Cobertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {GRUPOS_CAMPO.map((grupo) => {
                  const campos = Object.keys(CAMPOS).filter((k) => CAMPOS[k].grupo === grupo);
                  if (campos.length === 0) return null;

                  return (
                    <React.Fragment key={grupo}>
                      <tr className="bg-slate-100/70">
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600"
                        >
                          {grupo}
                        </td>
                      </tr>
                      {campos.map((campo) => {
                        const def = CAMPOS[campo];
                        const columna = mapeo[campo];
                        const info = columna ? columnas[columna] : undefined;
                        const faltaRequerido = def.requerido && !columna;
                        const llenado = info ? ((info.total - info.nulos) / (info.total || 1)) * 100 : 0;

                        return (
                          <tr
                            key={campo}
                            className={`align-top transition-colors hover:bg-slate-50/70 ${
                              faltaRequerido ? 'bg-rose-50/60' : ''
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{def.label}</span>
                                {def.requerido && (
                                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                                    Requerido
                                  </span>
                                )}
                              </div>
                              {def.usadoPor && (
                                <p className="mt-1 max-w-xs text-xs leading-snug text-slate-500">
                                  {def.usadoPor}
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={columna ?? ''}
                                onChange={(e) => cambiarCampo(campo, e.target.value)}
                                aria-label={`Columna para ${def.label}`}
                                className={`w-full max-w-[15rem] cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:ring-indigo-100 focus:outline-none ${
                                  faltaRequerido
                                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                                    : columna
                                      ? 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                                      : 'border-slate-200 bg-slate-50 text-slate-400'
                                }`}
                              >
                                <option value="">— sin asignar —</option>
                                {nombresColumna.map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="px-4 py-3">
                              {info ? (
                                <div className="max-w-xs space-y-0.5">
                                  {info.valores.slice(0, 3).map((v, i) => (
                                    <div key={i} className="truncate font-mono text-xs text-slate-500">
                                      {v}
                                    </div>
                                  ))}
                                  {info.valores.length === 0 && (
                                    <span className="text-xs text-slate-300">sin valores</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {info ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className={`h-full rounded-full ${
                                          llenado > 80
                                            ? 'bg-emerald-500'
                                            : llenado > 40
                                              ? 'bg-amber-500'
                                              : 'bg-rose-400'
                                        }`}
                                        style={{ width: `${Math.round(llenado)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-slate-600">
                                      {Math.round(llenado)}%
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {info.distintos} distintos
                                    {info.esNumero && ' · numérica'}
                                    {info.esFecha && ' · fecha'}
                                  </div>
                                </div>
                              ) : faltaRequerido ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-rose-600">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Sin asignar
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
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
        )}
      </div>
    </div>
  );
};

const botonSecundario =
  'flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50';

const inputCls =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none';

const Campo: React.FC<{ etiqueta: string; children: React.ReactNode; ancho?: boolean }> = ({
  etiqueta,
  children,
}) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-medium text-slate-500">{etiqueta}</span>
    {children}
  </label>
);

const Tarjeta: React.FC<{ etiqueta: string; valor: string | number }> = ({ etiqueta, valor }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
    <div className="text-xl font-bold text-slate-800">{valor}</div>
    <div className="text-[11px] leading-tight text-slate-500">{etiqueta}</div>
  </div>
);
