# Publicar "Control de Desviaciones"

Es una aplicación **estática**: HTML, CSS y JavaScript. No hay backend, no hay
base de datos, no hay proceso Node corriendo en el servidor. Se genera el build,
se copian los archivos y funciona.

Todo el estado (datos, mapeo de campos, configuración de las fuentes) vive en el
`localStorage` del navegador de cada usuario.

---

## 1. Generar el build

```bash
cd app
npm install
npm run check     # chequeo de tipos + verificación de la lógica de integración
npm run build     # -> app/dist/
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
rsync -avz --delete app/dist/ usuario@servidor:/var/www/logity/control-desviaciones/
```

Con el `deploy/nginx.conf` de este repositorio no hace falta tocar nada: el
bloque `location /assets/` ya cachea los assets y el resto se sirve como archivo
estático. Si se quiere que la aplicación no aparezca en buscadores, además del
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
npm run build:standalone   # -> app/dist-standalone/control-desviaciones.html
```

Un único HTML de ~860 kB, sin dependencias externas. Sirve para:

- subirlo suelto a cualquier hosting, sin estructura de carpetas;
- mandarlo por correo o por Drive para que alguien lo revise;
- abrirlo con doble clic, sin servidor.

Con el archivo abierto desde el disco (`file://`) funciona todo salvo la lectura
de las fuentes remotas: los navegadores bloquean esas peticiones por CORS. Para
conectarlo con la API hay que servirlo por HTTP.

---

## 4. Antes de conectar la API

Tres cosas dependen del entorno y no se resuelven desde el frontend:

| Qué | Dónde se resuelve |
|---|---|
| **CORS** | La API tiene que permitir el dominio donde se publique la aplicación (`Access-Control-Allow-Origin`) |
| **HTTPS** | Si la página se sirve por HTTPS, la API también: el navegador bloquea el contenido mixto |
| **Credencial** | La clave queda en el navegador de cada usuario. Para producción conviene un proxy propio que la guarde en el servidor |

La configuración de las URLs, la cabecera de autenticación y la clave se hace
desde la propia aplicación, en la vista **Mapeo de Datos** → *Conexión con las
fuentes*. No hay variables de entorno ni archivos de configuración que editar
antes del build.

### El proxy recomendado

Si no se quiere exponer la clave, un `location` en el mismo Nginx alcanza:

```nginx
location /api/bit/ {
    proxy_pass https://api.bit.interno/v1/;
    proxy_set_header Authorization "Bearer LA_CLAVE_REAL";
    proxy_set_header Host api.bit.interno;
}
```

Y en la aplicación se configura `https://logity.com/api/bit/servicios` sin clave:
la agrega el servidor y nunca llega al navegador. De paso desaparece el problema
de CORS, porque la petición queda en el mismo origen.

---

## 5. Actualizar una versión publicada

```bash
cd app && npm run build
rsync -avz --delete app/dist/ usuario@servidor:/var/www/logity/control-desviaciones/
```

Los nombres de los archivos son estables (`app.js`, `app.css`), así que el
`Cache-Control: no-cache` del `deploy/nginx.conf` es lo que hace que el cambio se
vea de inmediato. Los datos guardados en el navegador de cada usuario sobreviven
a la actualización.
