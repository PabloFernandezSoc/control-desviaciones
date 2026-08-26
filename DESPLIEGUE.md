# Publicar "Control de Desviaciones"

Es una aplicación **estática**: HTML, CSS y JavaScript. No hay backend, no hay
base de datos, no hay proceso Node corriendo en el servidor. Se genera el build,
se copian los archivos y funciona.

Los servicios los entrega la API de BIT en cada lectura. Lo único que vive en el
`localStorage` de cada usuario es la configuración: conexión, correcciones del
mapeo, matriz comercial, umbrales y triaje de desviaciones — más una copia de la
última respuesta, para poder trabajar si la API cae.

La aplicación **no escribe en el ERP**: sólo lee y organiza.

---

## 1. Generar el build

```bash
npm install
npm run check     # chequeo de tipos + verificación de la lógica de integración
npm run build     # -> dist/
```

`dist/` queda así:

```
dist/
  index.html
  assets/app.css
  assets/app.js
```

Las rutas del build son **relativas** (`base: './'` en `vite.config.ts`), así que
la carpeta funciona igual en la raíz del dominio o en un subdirectorio.

---

## 2. Subirlo junto a la landing

La opción más simple: publicarlo como un subdirectorio del sitio que ya está en
producción, por ejemplo `https://logity.com/control-desviaciones/`.

```bash
rsync -avz --delete dist/ usuario@servidor:/var/www/logity/control-desviaciones/
```

En `deploy/nginx.conf` hay una configuración lista: sirve la carpeta como
subdirectorio y deja preparado el proxy hacia la API. Si se quiere que la aplicación no aparezca en buscadores, además del
`<meta name="robots" content="noindex, nofollow">` que ya trae el `index.html`,
conviene agregar la carpeta a `robots.txt`:

```
Disallow: /control-desviaciones/
```

### Dejarlo detrás de una contraseña

La aplicación no tiene login. Si el contenido no debe ser público, lo más directo
es una autenticación básica en el servidor:

```bash
# En el servidor, una sola vez
sudo apt install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd-desviaciones operaciones
```

Y en el bloque `server` de Nginx:

```nginx
location /control-desviaciones/ {
    auth_basic           "Control de Desviaciones";
    auth_basic_user_file /etc/nginx/.htpasswd-desviaciones;
    try_files $uri $uri/ /control-desviaciones/index.html;
}
```

En Apache, el equivalente es un `.htaccess` dentro de la carpeta con
`AuthType Basic`, `AuthUserFile` y `Require valid-user`.

---

## 3. La versión de un solo archivo

```bash
npm run build:standalone   # -> dist-standalone/control-desviaciones.html
```

Un único HTML de ~830 kB, sin dependencias externas. Sirve para:

- subirlo suelto a cualquier hosting, sin estructura de carpetas;
- mandarlo por correo o por Drive para que alguien lo revise;
- abrirlo con doble clic, sin servidor.

Con el archivo abierto desde el disco (`file://`) la interfaz funciona, pero no
puede leer la API: los navegadores bloquean esas peticiones desde `file://`. Sí
muestra la copia local si el navegador ya tenía una. Para conectarlo con BIT hay
que servirlo por HTTP.

---

## 4. Antes de conectar la API

Todos los datos salen del reporte de BIT:

```
POST https://biterp.cl:451/api/misservicios/reporte/prod-general
{ "apiKey": "...", "perDesde": "2026-01-01", "perHasta": "2026-12-31" }
```

Tres cosas dependen del entorno y no se resuelven desde el frontend:

| Qué | Dónde se resuelve |
|---|---|
| **CORS** | El servidor de BIT tiene que permitir el dominio donde se publique la aplicación (`Access-Control-Allow-Origin`) |
| **HTTPS** | Si la página se sirve por HTTPS, la API también: el navegador bloquea el contenido mixto. El endpoint ya es HTTPS, pero en el puerto 451 — hay que confirmar que el certificado sea válido para el navegador, no sólo para Power Query |
| **Credencial** | La `apiKey` queda en el navegador de cada usuario. Para producción conviene un proxy propio |

La URL, la `apiKey` y el periodo se configuran desde la propia aplicación, en la
vista **Mapeo de Campos** → *Conexión con BIT*. No hay variables de entorno ni
archivos que editar antes del build.

### El proxy recomendado

Un `location` en el mismo Nginx resuelve CORS y la credencial de una vez:

```nginx
location /api/bit/ {
    proxy_pass https://biterp.cl:451/api/;
    proxy_set_header Host biterp.cl;
    proxy_ssl_server_name on;

    # La apiKey no llega nunca al navegador: la inyecta el servidor.
    proxy_set_header Content-Type application/json;
}
```

Con eso, en la aplicación se deja el campo **Proxy** apuntando a
`https://logity.com/api/bit/misservicios/reporte/prod-general`. Como la petición
queda en el mismo origen, desaparece el problema de CORS.

Si además se quiere que la `apiKey` no viaje desde el navegador, el proxy tiene
que reescribir el cuerpo — eso ya no lo hace Nginx solo. Lo más simple es un
webhook intermedio (n8n, un Apps Script, una función serverless) que reciba
`perDesde` y `perHasta`, agregue la `apiKey` guardada en el servidor y reenvíe.
Ese webhook es exactamente lo que espera el campo **Proxy**.

### Verificar la conexión

Desde la aplicación: **Mapeo de Campos** → *Probar y leer ahora*. Si responde,
aparecen las filas recibidas, los servicios construidos y las columnas
detectadas. Si falla, el aviso dice si fue un error HTTP, un tiempo de espera
agotado o un problema de red/CORS.

---

## 5. Actualizar una versión publicada

```bash
npm run build
rsync -avz --delete dist/ usuario@servidor:/var/www/logity/control-desviaciones/
```

Los nombres de los archivos son estables (`app.js`, `app.css`), así que el
`Cache-Control: no-cache` de `deploy/nginx.conf` es lo que hace que el cambio se
vea de inmediato.

Lo que cada usuario tenga guardado en su navegador sobrevive a la actualización:
la conexión, las correcciones del mapeo, la matriz comercial y el triaje de
desviaciones. Los servicios no se guardan — se vuelven a leer de la API.
