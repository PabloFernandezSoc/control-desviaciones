/**
 * Genera la versión de archivo único a partir de `dist/`.
 *
 *   npm run build:standalone
 *
 * Deja `dist-standalone/control-desviaciones.html`: un HTML autocontenido, con
 * el CSS y el JavaScript embebidos, que se puede subir tal cual a cualquier
 * servidor web o abrir con doble clic. Mismo criterio que el
 * `build-standalone.py` de la landing.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(raiz, 'dist');
const salidaDir = path.join(raiz, 'dist-standalone');
const salida = path.join(salidaDir, 'control-desviaciones.html');

if (!existsSync(dist)) {
  console.error('No existe dist/. Ejecuta primero `npm run build`.');
  process.exit(1);
}

let html = await readFile(path.join(dist, 'index.html'), 'utf8');

const pendientes = [];

// <link rel="stylesheet" href="./assets/app.css">  ->  <style>…</style>
html = html.replace(
  /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g,
  (_, href) => {
    const marca = `@@CSS_${pendientes.length}@@`;
    pendientes.push({ marca, href, envolver: (c) => `<style>\n${c}\n</style>` });
    return marca;
  },
);

// <script type="module" src="./assets/app.js"></script>  ->  <script>…</script>
html = html.replace(
  /<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/g,
  (_, antes, src, despues) => {
    const marca = `@@JS_${pendientes.length}@@`;
    const atributos = `${antes}${despues}`.trim();
    pendientes.push({
      marca,
      href: src,
      envolver: (c) => `<script${atributos ? ` ${atributos}` : ''}>\n${c}\n</script>`,
    });
    return marca;
  },
);

if (pendientes.length === 0) {
  console.error('No se encontraron assets que embeber en dist/index.html.');
  process.exit(1);
}

for (const { marca, href, envolver } of pendientes) {
  if (/^https?:\/\//i.test(href)) {
    console.error(`El asset ${href} es remoto: el archivo único no puede embeberlo.`);
    process.exit(1);
  }
  const ruta = path.join(dist, href.replace(/^\.?\//, ''));
  const contenido = await readFile(ruta, 'utf8');
  // El contenido puede traer literales como `</script>` dentro de strings;
  // escaparlos evita que el navegador cierre la etiqueta antes de tiempo.
  const seguro = contenido.replace(/<\/script>/gi, '<\\/script>');
  html = html.replace(marca, () => envolver(seguro));
}

await mkdir(salidaDir, { recursive: true });
await writeFile(salida, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`\n  dist-standalone/control-desviaciones.html  ${kb} kB`);
console.log('  Un solo archivo, sin dependencias externas.\n');
