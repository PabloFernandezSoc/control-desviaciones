/**
 * Verificación de las funciones puras de la capa de datos.
 *
 *   npm run verify
 *
 * Cubre lo que no se ve en pantalla y es donde se rompen las cosas: el
 * aplanado de la respuesta, la detección de columnas, la construcción de los
 * servicios y la comparación entre lecturas.
 */

import assert from 'node:assert/strict';
import { extraerArreglo, aplanar, filasDesdeRespuesta, TIPO_FILA } from '../src/services/apiClient';
import {
  tieneHora,
  autoMapear,
  combinarMapeo,
  camposRequeridosFaltantes,
  aNumero,
  aFecha,
  limpiaLlave,
} from '../src/services/fieldMapping';
import {
  construirServicios,
  normalizarEstado,
  normalizarOperacion,
  normalizarModalidad,
  reglasDesactivadasPorMapeo,
  clienteIdDesdeNombre,
} from '../src/services/adapter';
import { diffData, construirNotificacionesDeDiff } from '../src/services/dataDiff';

let pruebas = 0;
let fallidas = 0;

function prueba(nombre: string, fn: () => void) {
  pruebas++;
  try {
    fn();
    console.log(`  ✓ ${nombre}`);
  } catch (e) {
    fallidas++;
    console.error(`  ✗ ${nombre}`);
    console.error(`    ${(e as Error).message.split('\n')[0]}`);
  }
}

/**
 * Respuesta de ejemplo con la forma que documenta el dashboard en producción:
 * un sobre, filas de servicio, y los extracostos en un arreglo anidado.
 */
const RESPUESTA = {
  ok: true,
  data: [
    {
      idServicio: 'SRV-1001',
      nombreCliente: 'AGROSUPER S.A.',
      mandante: 'Agrosuper Chile',
      ejecutiva: 'P. Fernández',
      estadoServicio: 'EN CURSO',
      fechaServicio: '2026-08-04',
      tipoOperacion: 'IMPO',
      tipoServicio: 'DIRECTO',
      totalVenta: '1.250.000',
      totalCosto: '890.000',
      tarifa: '1.100.000',
      pesoKg: 21500,
      puerto: 'San Antonio',
      nave: 'MSC ANNA',
      origen: 'San Antonio',
      planta: 'Rancagua',
      extracostos: [
        { concepto: 'Almacenaje', totalVenta: 120000, totalCosto: 90000 },
        { concepto: 'Cuadrilla', totalVenta: 80000, totalCosto: 60000 },
      ],
    },
    {
      idServicio: 'SRV-1002',
      nombreCliente: 'VIÑA CONCHA Y TORO',
      ejecutiva: 'M. Rojas',
      estadoServicio: 'PROYECCION DE CARGA',
      fechaServicio: '2026-08-12',
      tipoOperacion: 'EXPO',
      tipoServicio: 'DIFERIDO',
      totalVenta: 0,
      totalCosto: 400000,
      tarifa: 950000,
      pesoKg: 26800,
      puerto: 'Valparaíso',
      nave: 'MAERSK LIMA',
      origen: 'Pirque',
      planta: 'Valparaíso',
      extracostos: [],
    },
  ],
};

// ---------------------------------------------------------------------------
console.log('\nLectura de la respuesta');
// ---------------------------------------------------------------------------

prueba('encuentra el arreglo dentro del sobre', () => {
  const arr = extraerArreglo(RESPUESTA);
  assert.equal(arr.length, 2);
  assert.equal(arr[0].idServicio, 'SRV-1001');
});

prueba('acepta el arreglo en la raíz', () => {
  assert.equal(extraerArreglo(RESPUESTA.data).length, 2);
});

prueba('una respuesta vacía o nula no rompe', () => {
  assert.deepEqual(extraerArreglo(null), []);
  assert.deepEqual(extraerArreglo({}), []);
  assert.deepEqual(filasDesdeRespuesta(null), []);
});

prueba('los extracostos salen como filas hermanas con el id del padre', () => {
  const filas = filasDesdeRespuesta(RESPUESTA);
  // 2 servicios + 2 extracostos del primero
  assert.equal(filas.length, 4);
  const extras = filas.filter((f) => f[TIPO_FILA] === 'EXTRACOSTO');
  assert.equal(extras.length, 2);
  assert.equal(extras[0].idServicio, 'SRV-1001', 'el extracosto hereda el id del servicio');
  assert.equal(extras[0].concepto, 'Almacenaje');
});

prueba('un objeto anidado se expande con prefijo', () => {
  const filas = aplanar([{ id: 'A', cliente: { nombre: 'X', rut: '1-9' } }]);
  assert.equal(filas[0].cliente_nombre, 'X');
  assert.equal(filas[0].cliente_rut, '1-9');
});

// ---------------------------------------------------------------------------
console.log('\nConversión de valores');
// ---------------------------------------------------------------------------

prueba('interpreta el formato numérico chileno', () => {
  assert.equal(aNumero('1.250.000'), 1250000);
  assert.equal(aNumero('1.234,56'), 1234.56);
  assert.equal(aNumero('$ 890.000'), 890000);
  assert.equal(aNumero(21500), 21500);
});

prueba('interpreta el formato numérico inglés', () => {
  assert.equal(aNumero('1,234,567.89'), 1234567.89);
});

prueba('un valor vacío o basura vale cero', () => {
  assert.equal(aNumero(''), 0);
  assert.equal(aNumero(null), 0);
  assert.equal(aNumero('N/A'), 0);
});

prueba('interpreta las formas de fecha del reporte', () => {
  assert.equal(aFecha('2026-08-04')?.getFullYear(), 2026);
  assert.equal(aFecha('04/08/2026')?.getMonth(), 7, 'dd/mm/yyyy, no mm/dd');
  assert.equal(aFecha('/Date(1754265600000)/')?.getFullYear(), 2025);
  assert.equal(aFecha('20260804')?.getDate(), 4);
  assert.equal(aFecha(''), null);
  assert.equal(aFecha('no es fecha'), null);
});

prueba('normaliza nombres de columna', () => {
  assert.equal(limpiaLlave('Nombre Cliente'), 'nombrecliente');
  assert.equal(limpiaLlave('DÍAS ALM.'), 'diasalm');
  assert.equal(limpiaLlave('id_servicio'), 'idservicio');
});

// ---------------------------------------------------------------------------
console.log('\nDetección de columnas');
// ---------------------------------------------------------------------------

const filas = filasDesdeRespuesta(RESPUESTA);
const deteccion = autoMapear(filas);

prueba('detecta los campos requeridos', () => {
  assert.equal(deteccion.mapeo.idServicio, 'idServicio');
  assert.equal(deteccion.mapeo.cliente, 'nombreCliente');
  assert.equal(deteccion.mapeo.venta, 'totalVenta');
  assert.equal(deteccion.mapeo.fecha, 'fechaServicio');
  assert.deepEqual(camposRequeridosFaltantes(deteccion.mapeo), []);
});

prueba('distingue venta de costo y de tarifa', () => {
  assert.equal(deteccion.mapeo.costo, 'totalCosto');
  assert.equal(deteccion.mapeo.tarifa, 'tarifa');
});

prueba('detecta operación y modalidad por sus valores', () => {
  assert.equal(deteccion.mapeo.operacion, 'tipoOperacion');
  assert.equal(deteccion.mapeo.modalidad, 'tipoServicio');
});

prueba('no asigna la misma columna a dos campos', () => {
  const usadas = Object.values(deteccion.mapeo);
  assert.equal(usadas.length, new Set(usadas).size);
});

prueba('el mapeo guardado manda sobre la detección', () => {
  const combinado = combinarMapeo(deteccion.mapeo, { venta: 'tarifa' }, deteccion.columnas);
  assert.equal(combinado.venta, 'tarifa');
});

prueba('una preferencia hacia una columna inexistente se descarta', () => {
  const combinado = combinarMapeo(deteccion.mapeo, { venta: 'columna_que_ya_no_existe' }, deteccion.columnas);
  assert.equal(combinado.venta, 'totalVenta', 'vuelve a mandar la detección');
});

prueba('el usuario puede desasignar un campo a propósito', () => {
  const combinado = combinarMapeo(deteccion.mapeo, { tarifa: '' }, deteccion.columnas);
  assert.equal(combinado.tarifa, undefined);
});

prueba('la columna de fecha no se confunde con una numérica', () => {
  assert.ok(deteccion.columnas['fechaServicio'].esFecha);
  assert.ok(deteccion.columnas['totalVenta'].esNumero);
});

// ---------------------------------------------------------------------------
console.log('\nConstrucción de servicios');
// ---------------------------------------------------------------------------

const construccion = construirServicios(filas, deteccion.mapeo);

prueba('cada servicio se arma una sola vez', () => {
  assert.equal(construccion.servicios.length, 2);
  assert.equal(construccion.filasExtra, 2);
  assert.equal(construccion.huerfanos, 0);
});

prueba('los extracostos entran como líneas de venta y costo', () => {
  const s = construccion.servicios.find((x) => x.id === 'SRV-1001')!;
  const ventas = s.lineas.filter((l) => l.tipo === 'venta');
  const costos = s.lineas.filter((l) => l.tipo === 'costo');
  // flete + almacenaje + cuadrilla
  assert.equal(ventas.length, 3);
  assert.equal(costos.length, 3);
  assert.equal(ventas.reduce((a, l) => a + l.valor, 0), 1250000 + 120000 + 80000);
  assert.equal(costos.reduce((a, l) => a + l.valor, 0), 890000 + 90000 + 60000);
});

prueba('los campos del servicio quedan mapeados', () => {
  const s = construccion.servicios.find((x) => x.id === 'SRV-1001')!;
  assert.equal(s.clienteNombre, 'AGROSUPER S.A.');
  assert.equal(s.ejecutivo, 'P. Fernández');
  assert.equal(s.estado, 'en_transito', 'EN CURSO -> en_transito');
  assert.equal(s.tipoOperacion, 'importacion');
  assert.equal(s.modalidad, 'directo');
  assert.equal(s.pesoKg, 21500);
  assert.equal(s.puerto, 'San Antonio');
  assert.equal(s.ruta.origen, 'San Antonio');
  assert.equal(s.ruta.destino, 'Rancagua');
  assert.equal(s.fechaCreacion, '2026-08-04');
});

prueba('un servicio sin venta no inventa una línea', () => {
  const s = construccion.servicios.find((x) => x.id === 'SRV-1002')!;
  assert.equal(s.lineas.filter((l) => l.tipo === 'venta').length, 0);
  assert.equal(s.lineas.filter((l) => l.tipo === 'costo').length, 1);
  assert.equal(s.proyeccion?.tieneVentaCargada, false);
});

prueba('los clientes se derivan de la respuesta', () => {
  assert.equal(construccion.clientes.length, 2);
  const ids = construccion.clientes.map((c) => c.id);
  assert.equal(new Set(ids).size, 2, 'ids únicos');
  assert.ok(ids.every((id) => id.startsWith('CLI-')));
});

prueba('el id de cliente es estable y sin acentos', () => {
  assert.equal(clienteIdDesdeNombre('VIÑA CONCHA Y TORO'), clienteIdDesdeNombre('viña concha y toro'));
  assert.ok(!/[ñáéíóú]/.test(clienteIdDesdeNombre('VIÑA CONCHA Y TORO')));
});

prueba('sin columna de id no se construye nada y se avisa', () => {
  const r = construirServicios(filas, { cliente: 'nombreCliente' });
  assert.equal(r.servicios.length, 0);
  assert.ok(r.avisos[0].includes('id de servicio'));
});

prueba('los extracostos huérfanos se cuentan y se avisan', () => {
  const sueltos = [
    { idServicio: 'X-1', nombreCliente: '', concepto: 'Almacenaje', totalVenta: 1000, [TIPO_FILA]: 'EXTRACOSTO' },
  ];
  const r = construirServicios(sueltos, { idServicio: 'idServicio', cliente: 'nombreCliente', concepto: 'concepto', venta: 'totalVenta' });
  assert.equal(r.servicios.length, 0);
  assert.equal(r.huerfanos, 1);
  assert.ok(r.avisos.some((a) => a.includes('extracosto')));
});

// ---------------------------------------------------------------------------
console.log('\nEstadía: fecha sin hora no es estadía');
// ---------------------------------------------------------------------------

prueba('tieneHora distingue una fecha de una marca de tiempo', () => {
  assert.equal(tieneHora('2026-08-04'), false);
  assert.equal(tieneHora('2026-08-04 14:30'), true);
  assert.equal(tieneHora('2026-08-04T00:00:00'), false, 'medianoche exacta no es hora útil');
  assert.equal(tieneHora('04/08/2026 08:15:00'), true);
  assert.equal(tieneHora(''), false);
  assert.equal(tieneHora(null), false);
});

prueba('con in/out planta sin hora NO se calcula estadía y se apaga R-GEN-05', () => {
  const filasSinHora = filasDesdeRespuesta({
    data: [{
      idServicio: 'S-1', nombreCliente: 'X', totalVenta: 100, fechaServicio: '2026-08-01',
      inPlanta: '2026-08-01', outPlanta: '2026-08-16',   // 15 días, sin hora
    }],
  });
  const m = autoMapear(filasSinHora).mapeo;
  const r = construirServicios(filasSinHora, m);
  assert.equal(r.servicios[0].horasEstadia, undefined, 'no se inventa una estadía de 360 hrs');
  assert.ok(
    r.reglasSinSustento.some((x) => x.regla === 'R_GEN_05'),
    'R-GEN-05 debe quedar sin sustento',
  );
});

prueba('con hora real sí se calcula la estadía', () => {
  const filasConHora = filasDesdeRespuesta({
    data: [{
      idServicio: 'S-1', nombreCliente: 'X', totalVenta: 100, fechaServicio: '2026-08-01',
      inPlanta: '2026-08-01 08:00', outPlanta: '2026-08-01 14:30',
    }],
  });
  const m = autoMapear(filasConHora).mapeo;
  const r = construirServicios(filasConHora, m);
  assert.equal(r.servicios[0].horasEstadia, 6.5);
  assert.equal(r.reglasSinSustento.length, 0);
});

prueba('un servicio sin fecha utilizable se cuenta y se avisa', () => {
  const sinFecha = filasDesdeRespuesta({
    data: [{ idServicio: 'S-1', nombreCliente: 'X', totalVenta: 100, fechaServicio: 'no es fecha' }],
  });
  const m = autoMapear(sinFecha).mapeo;
  const r = construirServicios(sinFecha, m);
  assert.equal(r.sinFecha, 1);
  assert.equal(r.servicios[0].fechaCreacion, '', 'no se inventa una fecha');
  assert.ok(r.avisos.some((a) => a.includes('sin fecha utilizable')));
});

// ---------------------------------------------------------------------------
console.log('\nFilas planas con id de extracosto (forma real del reporte)');
// ---------------------------------------------------------------------------

/**
 * El reporte llega plano: por cada servicio, una fila es el flete y las demás
 * son extracostos, unidas por el id de servicio. Sólo los extracostos traen su
 * propio id.
 */
const PLANO = [
  { ServicioID: '20658', ExtraCostoID: '',     NombreCliente: 'CONTROL TRADE LOGISTICS SPA', Ejecutiva: 'P. Fernández', EstadoServicio: 'EN CURSO', FechaServicio: '2026-07-04', TotalVenta: '1.200.000', TotalCosto: '800.000', Concepto: 'Flete' },
  { ServicioID: '20658', ExtraCostoID: '9001', NombreCliente: 'CONTROL TRADE LOGISTICS SPA', Ejecutiva: 'P. Fernández', EstadoServicio: 'EN CURSO', FechaServicio: '2026-07-04', TotalVenta: '150.000',   TotalCosto: '100.000', Concepto: 'Almacenaje' },
  { ServicioID: '20658', ExtraCostoID: '9002', NombreCliente: 'CONTROL TRADE LOGISTICS SPA', Ejecutiva: 'P. Fernández', EstadoServicio: 'EN CURSO', FechaServicio: '2026-07-04', TotalVenta: '80.000',    TotalCosto: '60.000',  Concepto: 'Cuadrilla' },
  // El flete llega DESPUÉS de sus extracostos: el orden no debe importar.
  { ServicioID: '20659', ExtraCostoID: '9003', NombreCliente: 'INVERSIONES BPM SPA', Ejecutiva: 'M. Rojas', EstadoServicio: 'FINALIZADO', FechaServicio: '2026-07-06', TotalVenta: '50.000',  TotalCosto: '30.000', Concepto: 'Sobrestadía' },
  { ServicioID: '20659', ExtraCostoID: '',     NombreCliente: 'INVERSIONES BPM SPA', Ejecutiva: 'M. Rojas', EstadoServicio: 'FINALIZADO', FechaServicio: '2026-07-06', TotalVenta: '900.000', TotalCosto: '600.000', Concepto: 'Flete' },
];

const mapeoPlano = autoMapear(PLANO).mapeo;

prueba('detecta la columna del id de extracosto', () => {
  assert.equal(mapeoPlano.extracostoId, 'ExtraCostoID');
  assert.equal(mapeoPlano.idServicio, 'ServicioID');
});

prueba('agrupa las filas planas en un servicio por id', () => {
  const r = construirServicios(PLANO, mapeoPlano);
  assert.equal(r.servicios.length, 2, 'cinco filas -> dos servicios');
  assert.equal(r.filasExtra, 3);
  assert.equal(r.huerfanos, 0);
});

prueba('la fila sin id de extracosto es el flete, venga en la posición que venga', () => {
  const r = construirServicios(PLANO, mapeoPlano);
  const s2 = r.servicios.find((x) => x.id === '20659')!;
  const flete = s2.lineas.find((l) => l.codigo === 'FLETE')!;
  assert.equal(flete.valor, 900000, 'el flete es la fila sin ExtraCostoID, aunque venga segunda');
});

prueba('los totales suman flete + extracostos, sin duplicar', () => {
  const r = construirServicios(PLANO, mapeoPlano);
  const s1 = r.servicios.find((x) => x.id === '20658')!;
  const venta = s1.lineas.filter((l) => l.tipo === 'venta').reduce((a, l) => a + l.valor, 0);
  const costo = s1.lineas.filter((l) => l.tipo === 'costo').reduce((a, l) => a + l.valor, 0);
  assert.equal(venta, 1200000 + 150000 + 80000);
  assert.equal(costo, 800000 + 100000 + 60000);
  assert.equal(s1.lineas.filter((l) => l.tipo === 'venta').length, 3);
});

prueba('las líneas se identifican con el id real del extracosto', () => {
  const r = construirServicios(PLANO, mapeoPlano);
  const s1 = r.servicios.find((x) => x.id === '20658')!;
  assert.ok(s1.lineas.some((l) => l.id.includes('9001')));
  assert.ok(s1.lineas.some((l) => l.id.includes('9002')));
});

prueba('un id de extracosto en cero cuenta como flete, no como extra', () => {
  const conCero = [
    { ServicioID: 'A', ExtraCostoID: '0', NombreCliente: 'X', FechaServicio: '2026-07-01', TotalVenta: '100', Concepto: 'Flete' },
    { ServicioID: 'A', ExtraCostoID: '7', NombreCliente: 'X', FechaServicio: '2026-07-01', TotalVenta: '20',  Concepto: 'Almacenaje' },
  ];
  const m = autoMapear(conCero).mapeo;
  const r = construirServicios(conCero, m);
  assert.equal(r.servicios.length, 1);
  assert.equal(r.filasExtra, 1, 'sólo la fila con id 7 es extracosto');
});

// ---------------------------------------------------------------------------
console.log('\nNormalización de estados');
// ---------------------------------------------------------------------------

prueba('traduce la nomenclatura operacional de BIT', () => {
  assert.equal(normalizarEstado('PROYECCION DE CARGA'), 'proyeccion');
  assert.equal(normalizarEstado('EN COORDINACION'), 'borrador');
  assert.equal(normalizarEstado('EN CURSO'), 'en_transito');
  assert.equal(normalizarEstado('FINALIZADO'), 'cerrado');
  assert.equal(normalizarEstado('FACTURADO'), 'facturado');
});

prueba('un estado desconocido cae en borrador, no rompe', () => {
  assert.equal(normalizarEstado('ALGO RARO'), 'borrador');
  assert.equal(normalizarEstado(''), 'borrador');
});

prueba('operación y modalidad toleran abreviaturas', () => {
  assert.equal(normalizarOperacion('IMPOD'), 'importacion');
  assert.equal(normalizarOperacion('EXPOD'), 'exportacion');
  assert.equal(normalizarOperacion(''), undefined);
  assert.equal(normalizarModalidad('DIFERIDO'), 'diferido');
  assert.equal(normalizarModalidad('otra cosa'), undefined);
});

// ---------------------------------------------------------------------------
console.log('\nReglas sin columna');
// ---------------------------------------------------------------------------

prueba('una columna ausente apaga sólo sus reglas', () => {
  const r = reglasDesactivadasPorMapeo(deteccion.mapeo);
  // El ejemplo no trae ETA ni in/out planta.
  assert.ok(r.reglas.has('R_GEN_01'), 'sin ETA no se evalúa el control de fechas');
  assert.ok(r.reglas.has('R_GEN_05'), 'sin in/out planta no se evalúa la estadía');
  assert.ok(!r.reglas.has('R_GEN_03'), 'el peso sí vino: el sobrepeso se evalúa');
  assert.ok(!r.reglas.has('R_LIQ_01'), 'el costo sí vino: el margen se evalúa');
});

prueba('con todas las columnas no se apaga ninguna regla', () => {
  const completo: Record<string, string> = {};
  for (const c of ['peso', 'eta', 'modalidad', 'inPlanta', 'outPlanta', 'destino', 'puerto', 'fechaStacking', 'corteDocumental', 'fechaRetiro', 'fechaPresentacion', 'costo']) {
    completo[c] = `col_${c}`;
  }
  assert.equal(reglasDesactivadasPorMapeo(completo).reglas.size, 0);
});

// ---------------------------------------------------------------------------
console.log('\nComparación entre lecturas');
// ---------------------------------------------------------------------------

const anterior: Record<string, any>[] = [
  { id: 'SRV-1', estado: 'confirmado', clienteNombre: 'Agrosuper' },
  { id: 'SRV-2', estado: 'proyeccion', clienteNombre: 'Viña Concha' },
];

prueba('detecta servicios nuevos', () => {
  const diff = diffData(anterior, [...anterior, { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'Nuevo' }]);
  assert.equal(diff.nuevos.length, 1);
  assert.equal(diff.nuevos[0].id, 'SRV-3');
});

prueba('detecta cambios de estado', () => {
  const diff = diffData(anterior, [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'Agrosuper' },
    anterior[1],
  ]);
  assert.equal(diff.cambiosEstado.length, 1);
  assert.equal(diff.cambiosEstado[0].estadoNuevo, 'en_transito');
});

prueba('sin cambios reporta sinCambios', () => {
  assert.equal(diffData(anterior, anterior.map((s) => ({ ...s }))).sinCambios, true);
});

prueba('la primera carga no reporta todo como novedad', () => {
  const diff = diffData([], anterior);
  assert.equal(diff.nuevos.length, 0);
  assert.equal(diff.sinCambios, true);
});

prueba('un estado que llega vacío no cuenta como cambio', () => {
  const diff = diffData(anterior, [{ id: 'SRV-1', estado: '', clienteNombre: 'Agrosuper' }, anterior[1]]);
  assert.equal(diff.cambiosEstado.length, 0);
});

// ---------------------------------------------------------------------------
console.log('\nMensajes de notificación');
// ---------------------------------------------------------------------------

prueba('sin cambios -> aviso neutro', () => {
  const a = construirNotificacionesDeDiff(diffData(anterior, anterior.map((s) => ({ ...s }))));
  assert.equal(a[0].variante, 'info');
  assert.equal(a[0].mensaje, 'Datos actualizados. Sin cambios recientes.');
});

prueba('sólo nuevos -> aviso de éxito', () => {
  const diff = diffData(anterior, [...anterior, { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'X' }]);
  const a = construirNotificacionesDeDiff(diff, { origen: 'la API' });
  assert.equal(a[0].variante, 'success');
  assert.equal(a[0].mensaje, 'Se ha añadido 1 nuevo servicio desde la API.');
});

prueba('sólo cambios de estado -> advertencia', () => {
  const diff = diffData(anterior, [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'A' },
    { id: 'SRV-2', estado: 'borrador', clienteNombre: 'B' },
  ]);
  const a = construirNotificacionesDeDiff(diff);
  assert.equal(a[0].variante, 'warning');
  assert.equal(a[0].mensaje, '2 servicios han cambiado su estado.');
});

prueba('ambos -> un único aviso consolidado', () => {
  const diff = diffData(anterior, [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'A' },
    anterior[1],
    { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'C' },
  ]);
  const a = construirNotificacionesDeDiff(diff);
  assert.equal(a.length, 1);
  assert.equal(a[0].mensaje, 'Actualización completada: 1 servicio nuevo, 1 cambio de estado detectado.');
});

// ---------------------------------------------------------------------------
console.log(`\n${pruebas - fallidas}/${pruebas} verificaciones correctas\n`);
if (fallidas > 0) process.exit(1);
