# Control de Desviaciones — LYD Cargo

Detección de desviaciones comerciales y de costos sobre los servicios de BIT,
previa al cierre y a la facturación. Aplicación de una sola página: todo corre
en el navegador, sin servidor propio ni base de datos.

## Cómo se publica

El resultado del build son **archivos estáticos**: un `index.html`, un `.css` y
un `.js`. Se suben al mismo servidor que la landing y funcionan; no hace falta
Node, ni PM2, ni un proceso corriendo.

```bash
cd app
npm install
npm run build          # -> app/dist/
```

Se copia el contenido de `dist/` a la carpeta que sirva el sitio. Las rutas del
build son relativas, así que da igual si queda en la raíz del dominio o en un
subdirectorio como `/control-desviaciones/`.

### Versión de un solo archivo

```bash
npm run build:standalone   # -> app/dist-standalone/control-desviaciones.html
```

Un único HTML de ~860 kB con el CSS y el JavaScript embebidos. Se sube tal cual,
se manda por correo o se abre con doble clic. Mismo criterio que el
`build-standalone.py` de la landing.

Ver **[DESPLIEGUE.md](DESPLIEGUE.md)** para las configuraciones de Nginx y
Apache y el detalle de qué subir.

## Cómo verla en local

```bash
npm install
npm run dev            # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Build estático en `dist/` |
| `npm run build:standalone` | Build de archivo único en `dist-standalone/` |
| `npm run lint` | Chequeo de tipos (`tsc --noEmit`) |
| `npm run verify` | Verifica el cruce de fuentes, el diff y los mensajes |
| `npm run check` | `lint` + `verify` |

## Estructura

```
index.html                   Documento raíz
src/App.tsx                  Estado global y orquestación de vistas
src/types.ts                 Modelo de dominio (Service, Deviation, Agreement…)
src/data/seed.ts             Datos de maqueta
src/services/
  engine.ts                  Motor de reglas del PRD (R-GEN, R-IMP, R-EXP, …)
  dataSources.ts             Catálogo de campos + cruce Sheets/API
  dataDiff.ts                Comparación entre lecturas + redacción de mensajes
  apiClient.ts               Lectura y normalización de las fuentes remotas
  refreshPipeline.ts         Orquestación de "Actualizar datos"
src/components/              Vistas y componentes de interfaz
scripts/
  build-standalone.mjs       Genera el HTML de un solo archivo
  verificar-integracion.ts   Verificación de las funciones puras
```

---

## Integración de datos

La aplicación consolida dos fuentes: la **API de BIT** y el **documento de
Google Sheets** que se usaba antes. Ambas se leen por HTTP y se cruzan por la
llave primaria `id` (`id_servicio` en la API, `ID SERVICIO` en la planilla).

### Mapeo de Origen de Datos

La vista **Mapeo de Datos** lista los 31 campos consolidados que usa el
frontend y de qué fuente sale cada uno:

| Campo | Origen por defecto |
|---|---|
| `ID Servicio` | API — llave del cruce, no se reasigna |
| `Nombre Cliente` | Google Sheets |
| `Estado del Servicio` | API |
| `Notas Adicionales` | Google Sheets |
| … | … |

Los campos que existen en ambos lados traen un selector para cambiar cuál manda;
los que sólo publica una fuente quedan fijos y así se indica. La elección se
guarda en `localStorage` y se normaliza al cargar: si un campo cambia de
disponibilidad en una versión posterior, la preferencia inválida se descarta en
vez de romper el cruce.

El catálogo vive en `src/services/dataSources.ts` (`FIELD_CATALOG`). Agregar un
campo es agregar una entrada ahí: la tabla, los contadores y el cruce se
actualizan solos.

#### La función de cruce

```ts
mergeDataSources(datosSheets, datosApi, { mapeo, llavePrimaria, catalogo })
// -> { registros, resumen, detallePorCampo, conflictos }
```

- El resultado es la **unión** de ambas fuentes: un registro que existe sólo en
  una de ellas igual aparece.
- Para cada campo se lee la fuente con prioridad. Si esa fuente no trae valor, se
  usa la otra y se contabiliza como *respaldo*.
- Cuando ambas traen valores distintos se registra el **conflicto**, sin alterar
  el valor elegido. La vista los lista con los dos valores lado a lado.

### Notificaciones de cambios

Cada "Actualizar datos" guarda una referencia del estado anterior, lee las
fuentes, cruza, compara y avisa:

```ts
diffData(previousData, newData)
// -> { nuevos, cambiosEstado, eliminados, sinCambios, totalAnterior, totalNuevo }
```

Los mensajes salen de `construirNotificacionesDeDiff`:

| Situación | Mensaje | Color |
|---|---|---|
| Sin cambios | «Datos actualizados. Sin cambios recientes.» | Neutro |
| Sólo servicios nuevos | «Se han añadido X nuevos servicios desde la API.» | Éxito |
| Sólo cambios de estado | «X servicios han cambiado su estado.» | Advertencia |
| Ambos | «Actualización completada: X servicios nuevos, Y cambios de estado detectados.» | Éxito |

Aparecen arriba a la derecha, se apilan hasta cuatro, incluyen el detalle de los
primeros cambios y se cierran solas. El temporizador se pausa al pasar el cursor
por encima.

### Conexión con las fuentes

Se configura desde la misma vista **Mapeo de Datos**: URL de cada fuente,
cabecera y esquema de autenticación, clave, y la ruta dentro del JSON donde
viene el arreglo de filas (`data`, `results`, o vacío si la raíz ya es el
arreglo).

Mientras no haya ninguna fuente activa, "Actualizar datos" trabaja sobre los
datos de maqueta guardados en el navegador y de todos modos ejercita el diff y
las notificaciones, para poder mostrar el flujo sin conexión. La barra superior
indica en qué modo está (`En línea` / `Maqueta`).

Si una de las dos fuentes falla, la actualización sigue con la que respondió y
avisa del error. Si fallan las dos, no se aplica nada y los datos en pantalla
quedan como estaban.

#### Formato esperado

El contrato de la API todavía no está cerrado, así que la normalización acepta
las variantes de nombre habituales (`id_servicio`, `idServicio`, `id`) y las
mayúsculas de la planilla. La tabla de equivalencias es `ALIAS`, en
`src/services/apiClient.ts`; cuando el contrato quede fijo basta con recortarla.

Ejemplo de respuesta que la aplicación entiende sin ajustes:

```json
{
  "data": [
    {
      "id_servicio": "SRV-24871",
      "id_cliente": "CLI-014",
      "nombre_cliente": "AGROSUPER SA",
      "estado": "en_transito",
      "peso_kg": 21000,
      "puerto": "San Antonio",
      "lineas": [
        { "id": "l1", "codigo": "FLETE", "tipo": "venta", "valor": 890000, "moneda": "CLP" }
      ]
    }
  ]
}
```

Los estados se traducen desde la nomenclatura operacional de BIT
(`PROYECCION DE CARGA` → `proyeccion`, `EN COORDINACION` → `borrador`,
`EN CURSO` → `en_transito`, …). Un estado desconocido se deja sin definir en vez
de adivinarse.

### Sobre la clave de la API

Se guarda en el navegador de quien la escribe: no se comparte entre usuarios y
viaja sólo hacia la URL configurada. Para una credencial de producción conviene
que el endpoint quede detrás de un proxy propio, para no exponerla en el
frontend. La API también tiene que permitir CORS desde el dominio donde se
publique la aplicación.
