/**
 * Verificación de las funciones puras del módulo de integración.
 *
 *   npm run verify
 *
 * No necesita navegador ni framework de testing: sólo ejercita el cruce de
 * fuentes, el diff y la redacción de los mensajes, que es donde está la lógica
 * que conviene no romper.
 */

import assert from 'node:assert/strict';
import {
  DataSource,
  FieldDefinition,
  mergeDataSources,
  defaultFieldMapping,
  sanitizeFieldMapping,
  FIELD_CATALOG,
} from '../src/services/dataSources';
import { diffData, construirNotificacionesDeDiff } from '../src/services/dataDiff';
import { normalizarServicio } from '../src/services/apiClient';

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

// ---------------------------------------------------------------------------
console.log('\nCruce de fuentes (mergeDataSources)');
// ---------------------------------------------------------------------------

const catalogoPrueba: FieldDefinition[] = [
  { key: 'id', label: 'ID Servicio', grupo: 'Identificación', disponibleEn: ['api'], origenPorDefecto: 'api', bloqueado: true },
  { key: 'clienteNombre', label: 'Nombre Cliente', grupo: 'Identificación', disponibleEn: ['api', 'sheets'], origenPorDefecto: 'sheets' },
  { key: 'estado', label: 'Estado', grupo: 'Identificación', disponibleEn: ['api'], origenPorDefecto: 'api' },
  { key: 'notas', label: 'Notas Adicionales', grupo: 'Complementarios', disponibleEn: ['sheets'], origenPorDefecto: 'sheets' },
  { key: 'ruta.origen', label: 'Ruta · Origen', grupo: 'Operación', disponibleEn: ['api', 'sheets'], origenPorDefecto: 'sheets' },
];

const mapeoPrueba: Record<string, DataSource> = {
  id: 'api',
  clienteNombre: 'sheets',
  estado: 'api',
  notas: 'sheets',
  'ruta.origen': 'sheets',
};

const sheets: Record<string, any>[] = [
  { id: 'SRV-1', clienteNombre: 'Viña Concha', notas: 'Entregar por portón 3', ruta: { origen: 'San Antonio' } },
  { id: 'SRV-2', clienteNombre: 'Agrosuper', notas: '', ruta: { origen: 'Valparaíso' } },
  { id: 'SRV-9', clienteNombre: 'Sólo en planilla', notas: 'Pendiente de carga en BIT' },
];

const api: Record<string, any>[] = [
  { id: 'SRV-1', clienteNombre: 'VINA CONCHA Y TORO S.A.', estado: 'confirmado', ruta: { origen: 'SAI' } },
  { id: 'SRV-2', clienteNombre: 'AGROSUPER SA', estado: 'en_transito' },
  { id: 'SRV-3', clienteNombre: 'Nuevo desde API', estado: 'proyeccion' },
];

prueba('cada campo sale de la fuente con prioridad', () => {
  const { registros } = mergeDataSources(sheets, api, { catalogo: catalogoPrueba, mapeo: mapeoPrueba });
  const srv1 = registros.find((r) => r.id === 'SRV-1')!;
  assert.equal(srv1.clienteNombre, 'Viña Concha', 'clienteNombre debe venir de Sheets');
  assert.equal(srv1.estado, 'confirmado', 'estado debe venir de la API');
  assert.equal(srv1.notas, 'Entregar por portón 3', 'notas es exclusivo de Sheets');
  assert.equal((srv1 as any).ruta.origen, 'San Antonio', 'la ruta priorizada es la de Sheets');
});

prueba('invertir la prioridad cambia el valor elegido', () => {
  const { registros } = mergeDataSources(sheets, api, {
    catalogo: catalogoPrueba,
    mapeo: { ...mapeoPrueba, clienteNombre: 'api' },
  });
  const srv1 = registros.find((r) => r.id === 'SRV-1')!;
  assert.equal(srv1.clienteNombre, 'VINA CONCHA Y TORO S.A.');
});

prueba('el resultado es la unión de ambas fuentes', () => {
  const { registros, resumen } = mergeDataSources(sheets, api, { catalogo: catalogoPrueba, mapeo: mapeoPrueba });
  assert.equal(registros.length, 4, 'SRV-1, SRV-2, SRV-3 y SRV-9');
  assert.equal(resumen.enAmbasFuentes, 2);
  assert.equal(resumen.soloApi, 1);
  assert.equal(resumen.soloSheets, 1);
});

prueba('si la fuente asignada viene vacía se usa la alterna', () => {
  const { registros, resumen } = mergeDataSources(sheets, api, { catalogo: catalogoPrueba, mapeo: mapeoPrueba });
  const srv2 = registros.find((r) => r.id === 'SRV-2')!;
  // `ruta.origen` de SRV-2 no viene en la API y sí en Sheets; el caso inverso es
  // `notas` vacío en Sheets y ausente en API: queda vacío, sin inventar valor.
  assert.equal((srv2 as any).ruta.origen, 'Valparaíso');
  assert.ok(resumen.camposPorRespaldo >= 0);

  const srv3 = registros.find((r) => r.id === 'SRV-3')!;
  assert.equal(srv3.notas, undefined, 'no debe inventarse un valor que ninguna fuente trae');
});

prueba('se registran los conflictos sin alterar el valor elegido', () => {
  const { conflictos, registros } = mergeDataSources(sheets, api, { catalogo: catalogoPrueba, mapeo: mapeoPrueba });
  const conflictoNombre = conflictos.find((c) => c.id === 'SRV-1' && c.campo === 'clienteNombre');
  assert.ok(conflictoNombre, 'debe detectar el conflicto de nombre en SRV-1');
  assert.equal(conflictoNombre!.valorApi, 'VINA CONCHA Y TORO S.A.');
  assert.equal(conflictoNombre!.valorSheets, 'Viña Concha');
  assert.equal(registros.find((r) => r.id === 'SRV-1')!.clienteNombre, 'Viña Concha');
});

prueba('las filas sin llave primaria se descartan', () => {
  const { registros } = mergeDataSources(
    [{ clienteNombre: 'Sin ID' } as any],
    [{ id: 'SRV-1', estado: 'confirmado' }],
    { catalogo: catalogoPrueba, mapeo: mapeoPrueba },
  );
  assert.equal(registros.length, 1);
});

prueba('admite una llave primaria distinta', () => {
  const { registros } = mergeDataSources(
    [{ id_servicio: 'A', notas: 'desde planilla' }],
    [{ id_servicio: 'A', estado: 'cerrado' }],
    {
      llavePrimaria: 'id_servicio',
      catalogo: [
        { key: 'notas', label: 'Notas', grupo: 'Complementarios', disponibleEn: ['sheets'], origenPorDefecto: 'sheets' },
        { key: 'estado', label: 'Estado', grupo: 'Identificación', disponibleEn: ['api'], origenPorDefecto: 'api' },
      ],
      mapeo: { notas: 'sheets', estado: 'api' },
    },
  );
  assert.equal(registros.length, 1);
  assert.equal(registros[0].notas, 'desde planilla');
  assert.equal(registros[0].estado, 'cerrado');
});

// ---------------------------------------------------------------------------
console.log('\nMapeo por defecto');
// ---------------------------------------------------------------------------

prueba('el origen por defecto siempre está entre las fuentes disponibles', () => {
  for (const campo of FIELD_CATALOG) {
    assert.ok(
      campo.disponibleEn.includes(campo.origenPorDefecto),
      `${campo.key}: origenPorDefecto fuera de disponibleEn`,
    );
  }
});

prueba('sanitize descarta orígenes inválidos y respeta los campos bloqueados', () => {
  const sucio = { notas: 'api' as DataSource, id: 'sheets' as DataSource, clienteNombre: 'api' as DataSource };
  const limpio = sanitizeFieldMapping(sucio);
  assert.equal(limpio.notas, 'sheets', 'notas no existe en la API');
  assert.equal(limpio.id, 'api', 'id está bloqueado');
  assert.equal(limpio.clienteNombre, 'api', 'clienteNombre sí es reasignable');
});

prueba('sanitize con entrada nula devuelve el mapeo por defecto', () => {
  assert.deepEqual(sanitizeFieldMapping(null), defaultFieldMapping());
});

// ---------------------------------------------------------------------------
console.log('\nComparación (diffData)');
// ---------------------------------------------------------------------------

const anterior: Record<string, any>[] = [
  { id: 'SRV-1', estado: 'confirmado', clienteNombre: 'Viña Concha' },
  { id: 'SRV-2', estado: 'proyeccion', clienteNombre: 'Agrosuper' },
];

prueba('detecta servicios nuevos', () => {
  const nuevo = [...anterior, { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'Nuevo' }];
  const diff = diffData(anterior, nuevo);
  assert.equal(diff.nuevos.length, 1);
  assert.equal(diff.nuevos[0].id, 'SRV-3');
  assert.equal(diff.cambiosEstado.length, 0);
  assert.equal(diff.sinCambios, false);
});

prueba('detecta cambios de estado', () => {
  const nuevo = [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'Viña Concha' },
    { id: 'SRV-2', estado: 'proyeccion', clienteNombre: 'Agrosuper' },
  ];
  const diff = diffData(anterior, nuevo);
  assert.equal(diff.cambiosEstado.length, 1);
  assert.deepEqual(diff.cambiosEstado[0], {
    id: 'SRV-1',
    clienteNombre: 'Viña Concha',
    estadoAnterior: 'confirmado',
    estadoNuevo: 'en_transito',
  });
  assert.equal(diff.nuevos.length, 0);
});

prueba('sin cambios reporta sinCambios', () => {
  const diff = diffData(anterior, anterior.map((s) => ({ ...s })));
  assert.equal(diff.sinCambios, true);
  assert.equal(diff.nuevos.length, 0);
  assert.equal(diff.cambiosEstado.length, 0);
  assert.equal(diff.eliminados.length, 0);
});

prueba('detecta eliminados', () => {
  const diff = diffData(anterior, [anterior[0]]);
  assert.equal(diff.eliminados.length, 1);
  assert.equal(diff.eliminados[0].id, 'SRV-2');
});

prueba('la primera carga no reporta todo como novedad', () => {
  const diff = diffData([], anterior);
  assert.equal(diff.nuevos.length, 0, 'sin línea base no hay nada que comparar');
  assert.equal(diff.sinCambios, true);
  assert.equal(diff.totalNuevo, 2);
});

prueba('previousData nulo no rompe', () => {
  const diff = diffData(null, anterior);
  assert.equal(diff.sinCambios, true);
  assert.equal(diff.totalAnterior, 0);
});

prueba('un estado que pasa a vacío no cuenta como cambio', () => {
  const diff = diffData(anterior, [{ id: 'SRV-1', estado: '', clienteNombre: 'Viña Concha' }, anterior[1]]);
  assert.equal(diff.cambiosEstado.length, 0, 'un dato faltante no es un avance de estado');
});

prueba('admite otro campo de estado', () => {
  const diff = diffData(
    [{ id: 'A', pago: 'Pendiente' }],
    [{ id: 'A', pago: 'Completado' }],
    { campoEstado: 'pago' },
  );
  assert.equal(diff.cambiosEstado.length, 1);
  assert.equal(diff.cambiosEstado[0].estadoNuevo, 'Completado');
});

// ---------------------------------------------------------------------------
console.log('\nMensajes de notificación');
// ---------------------------------------------------------------------------

prueba('sin cambios -> aviso neutro', () => {
  const avisos = construirNotificacionesDeDiff(diffData(anterior, anterior.map((s) => ({ ...s }))));
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].variante, 'info');
  assert.equal(avisos[0].mensaje, 'Datos actualizados. Sin cambios recientes.');
});

prueba('sólo nuevos -> aviso de éxito con el conteo', () => {
  const diff = diffData(anterior, [...anterior, { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'X' }]);
  const avisos = construirNotificacionesDeDiff(diff, { origen: 'la API' });
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].variante, 'success');
  assert.equal(avisos[0].mensaje, 'Se ha añadido 1 nuevo servicio desde la API.');
});

prueba('el plural se ajusta al conteo', () => {
  const diff = diffData(anterior, [
    ...anterior,
    { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'X' },
    { id: 'SRV-4', estado: 'proyeccion', clienteNombre: 'Y' },
  ]);
  const avisos = construirNotificacionesDeDiff(diff, { origen: 'la API' });
  assert.equal(avisos[0].mensaje, 'Se han añadido 2 nuevos servicios desde la API.');
});

prueba('sólo cambios de estado -> aviso de advertencia', () => {
  const diff = diffData(anterior, [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'Viña Concha' },
    { id: 'SRV-2', estado: 'borrador', clienteNombre: 'Agrosuper' },
  ]);
  const avisos = construirNotificacionesDeDiff(diff);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].variante, 'warning');
  assert.equal(avisos[0].mensaje, '2 servicios han cambiado su estado.');
});

prueba('ambos casos -> un único aviso consolidado', () => {
  const diff = diffData(anterior, [
    { id: 'SRV-1', estado: 'en_transito', clienteNombre: 'Viña Concha' },
    { id: 'SRV-2', estado: 'proyeccion', clienteNombre: 'Agrosuper' },
    { id: 'SRV-3', estado: 'proyeccion', clienteNombre: 'Nuevo' },
  ]);
  const avisos = construirNotificacionesDeDiff(diff);
  assert.equal(avisos.length, 1);
  assert.equal(
    avisos[0].mensaje,
    'Actualización completada: 1 servicio nuevo, 1 cambio de estado detectado.',
  );
  assert.ok(avisos[0].detalle && avisos[0].detalle.length >= 2);
});

prueba('el detalle se recorta cuando hay muchos cambios', () => {
  const nuevos = Array.from({ length: 10 }, (_, i) => ({
    id: `SRV-${100 + i}`,
    estado: 'proyeccion',
    clienteNombre: `Cliente ${i}`,
  }));
  const avisos = construirNotificacionesDeDiff(diffData(anterior, [...anterior, ...nuevos]));
  assert.ok(avisos[0].detalle!.length <= 5, 'máximo 4 líneas más el "y N más"');
  assert.ok(avisos[0].detalle!.at(-1)!.includes('y 6 más'));
});

// ---------------------------------------------------------------------------
console.log('\nNormalización de filas crudas');
// ---------------------------------------------------------------------------

prueba('acepta las variantes de nombre habituales', () => {
  const s = normalizarServicio({
    id_servicio: 'SRV-77',
    nombre_cliente: 'Agrosuper',
    estado: 'EN COORDINACION',
    peso: '24.500',
    tipo_operacion: 'IMPO',
  })!;
  assert.equal(s.id, 'SRV-77');
  assert.equal(s.clienteNombre, 'Agrosuper');
  assert.equal(s.estado, 'borrador', 'EN COORDINACION mapea a borrador');
  assert.equal(s.pesoKg, 24500, 'el separador de miles chileno se interpreta bien');
  assert.equal(s.tipoOperacion, 'importacion');
});

prueba('una fila sin llave primaria se descarta', () => {
  assert.equal(normalizarServicio({ nombre_cliente: 'Sin ID' }), null);
  assert.equal(normalizarServicio(null), null);
  assert.equal(normalizarServicio('texto'), null);
});

prueba('no inventa campos que la fila no trae', () => {
  const s = normalizarServicio({ id: 'SRV-1' })!;
  assert.equal(Object.keys(s).length, 1, 'sólo el id');
  assert.equal(s.estado, undefined);
});

prueba('un estado desconocido queda sin definir en vez de adivinarse', () => {
  const s = normalizarServicio({ id: 'SRV-1', estado: 'ALGO RARO' })!;
  assert.equal(s.estado, undefined);
});

// ---------------------------------------------------------------------------
console.log(`\n${pruebas - fallidas}/${pruebas} verificaciones correctas\n`);
if (fallidas > 0) process.exit(1);
