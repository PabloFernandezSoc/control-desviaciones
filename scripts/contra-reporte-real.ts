/**
 * Corre la capa de datos completa contra un reporte real de BIT.
 *
 *   npx tsx scripts/contra-reporte-real.ts <archivo.json>
 *
 * No reemplaza a `npm run verify` —que es determinista y no depende de un
 * archivo— sino que sirve para ver, sobre datos de producción, qué columnas se
 * detectan, cómo quedan los servicios y qué hallazgos produce cada regla.
 */

import { readFileSync } from 'node:fs';
import { filasDesdeRespuesta } from '../src/services/apiClient';
import { autoMapear, CAMPOS } from '../src/services/fieldMapping';
import { construirServicios } from '../src/services/adapter';
import { crearClasificador, labelDeTipo, TipoExtracosto } from '../src/services/extracostos';

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: npx tsx scripts/contra-reporte-real.ts <archivo.json>');
  process.exit(1);
}

const crudo = JSON.parse(readFileSync(archivo, 'utf8'));
const filas = filasDesdeRespuesta(crudo);
const { mapeo, columnas } = autoMapear(filas);
const clasificador = crearClasificador();
const r = construirServicios(filas, mapeo, clasificador);

const t = (s: string) => console.log(`\n${'─'.repeat(64)}\n${s}\n${'─'.repeat(64)}`);

t('LECTURA');
console.log(`filas: ${filas.length}   servicios: ${r.servicios.length}   extracostos: ${r.filasExtra}   huérfanos: ${r.huerfanos}`);
console.log(`columnas en la respuesta: ${Object.keys(columnas).length}`);
r.avisos.forEach((a) => console.log('aviso:', a));

t('MAPEO DETECTADO');
const sinAsignar: string[] = [];
for (const campo of Object.keys(CAMPOS)) {
  const col = mapeo[campo];
  if (col) console.log(`  ${CAMPOS[campo].label.padEnd(32)} <- ${col}`);
  else sinAsignar.push(CAMPOS[campo].label + (CAMPOS[campo].requerido ? ' (REQUERIDO)' : ''));
}
console.log(`\n  sin asignar (${sinAsignar.length}): ${sinAsignar.join(', ')}`);

t('ESTADOS');
const porEstado = new Map<string, number>();
for (const s of r.servicios) porEstado.set(s.estado, (porEstado.get(s.estado) ?? 0) + 1);
[...porEstado].sort((a, b) => b[1] - a[1]).forEach(([e, n]) => console.log(`  ${e.padEnd(14)} ${n}`));

t('EXTRACOSTOS CLASIFICADOS');
const porTipo = new Map<string, number>();
for (const s of r.servicios) {
  for (const tipo of s.extracostosPresentes ?? []) porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + 1);
}
[...porTipo].sort((a, b) => b[1] - a[1]).forEach(([tipo, n]) =>
  console.log(`  ${labelDeTipo(tipo as TipoExtracosto).padEnd(22)} ${n} servicios`),
);

t('COBERTURA DE DATOS');
const activos = r.servicios.filter((s) => s.estado !== 'anulado');
const con = (f: (s: (typeof activos)[number]) => boolean) => activos.filter(f).length;
console.log(`  servicios activos (sin anulados): ${activos.length} de ${r.servicios.length}`);
console.log(`  con peso > 0            ${con((s) => (s.pesoKg ?? 0) > 0)}`);
console.log(`  con estadía medible     ${con((s) => s.horasEstadia !== undefined)}`);
console.log(`  con días de almacenaje  ${con((s) => s.diasAlmacenaje !== undefined)}`);
console.log(`  con modalidad           ${con((s) => !!s.modalidad)}`);
console.log(`  con tipo de operación   ${con((s) => !!s.tipoOperacion)}`);
console.log(`  con venta > 0           ${con((s) => s.lineas.some((l) => l.tipo === 'venta' && l.valor > 0))}`);

t('CONDICIÓN vs COBRO (lo que detectan las reglas)');
const fila = (nombre: string, cumplen: typeof activos, tipo: TipoExtracosto) => {
  const cobrado = cumplen.filter((s) => (s.extracostosPresentes ?? []).includes(tipo)).length;
  console.log(
    `  ${nombre.padEnd(34)} cumplen ${String(cumplen.length).padStart(4)}` +
      `   ya cobrado ${String(cobrado).padStart(4)}` +
      `   → DESVIACIÓN ${String(cumplen.length - cobrado).padStart(4)}`,
  );
};
fila('Estadía > 4 h', activos.filter((s) => (s.horasEstadia ?? 0) > 4), 'sobreestadia');
fila('Peso > 25.000 kg', activos.filter((s) => (s.pesoKg ?? 0) > 25000), 'sobrepeso');
fila('Modalidad diferida', activos.filter((s) => s.modalidad === 'diferido'), 'almacenaje');
fila('Almacenaje > 2 días', activos.filter((s) => (s.diasAlmacenaje ?? 0) > 2), 'almacenaje');

t('MUESTRA DE SERVICIOS');
for (const s of r.servicios.slice(0, 3)) {
  console.log(`\n  ${s.id} · ${s.clienteNombre} · ${s.estado} · ${s.tipoOperacion ?? '?'}/${s.modalidad ?? '?'}`);
  console.log(`    fecha=${s.fechaCreacion || '(sin fecha)'}  peso=${s.pesoKg ?? '?'}  puerto=${s.puerto ?? '?'}  nave=${s.nave ?? '?'}`);
  console.log(`    estadía=${s.horasEstadia ?? '(no medible)'}  almacenaje=${s.diasAlmacenaje ?? '?'} días`);
  console.log(`    extracostos: ${(s.extracostosPresentes ?? []).join(', ') || '(ninguno)'}`);
  for (const l of s.lineas) console.log(`      ${l.tipo.padEnd(6)} ${l.nombreConcepto?.slice(0, 42).padEnd(44)} $${l.valor.toLocaleString('es-CL')}`);
}
console.log();

// ---------------------------------------------------------------------------
// Desglose por regla, corriendo el motor completo.
// El motor guarda configuración en localStorage; aquí se le da uno de mentira.
// ---------------------------------------------------------------------------
const almacen = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => { almacen.set(k, v); },
  removeItem: (k: string) => { almacen.delete(k); },
};

const { engineInstance } = await import('../src/services/engine');
const { reglasDesactivadasPorMapeo } = await import('../src/services/adapter');

engineInstance.setReglasSuprimidas(reglasDesactivadasPorMapeo(mapeo).reglas);
engineInstance.setDatosApi(r.servicios, r.clientes);
const det = engineInstance.detectDeviations();

t('DESVIACIONES POR REGLA');
const porRegla = new Map<string, { n: number; sev: string; msg: string }>();
for (const d of det.deviations) {
  const e = porRegla.get(d.idRegla) ?? { n: 0, sev: d.severidad, msg: d.mensaje };
  e.n++;
  porRegla.set(d.idRegla, e);
}
const totalDev = det.deviations.length;
[...porRegla].sort((a, b) => b[1].n - a[1].n).forEach(([regla, e]) =>
  console.log(`  ${regla.padEnd(10)} ${e.sev.padEnd(9)} ${String(e.n).padStart(5)}  ${e.msg.slice(0, 62)}`),
);
console.log(`\n  total: ${totalDev} desviaciones sobre ${det.evaluatedServices.length + det.unmatchedServices.length} servicios`);
const conDev = new Set(det.deviations.map((d) => d.servicioId)).size;
console.log(`  servicios con al menos una: ${conDev} (${((conDev / activos.length) * 100).toFixed(0)}%)`);
