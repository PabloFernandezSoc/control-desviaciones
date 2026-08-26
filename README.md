# Control de Desviaciones — LYD Cargo

Detección de desviaciones comerciales y de costos sobre los servicios de BIT,
previa al cierre y a la facturación.

**Es una herramienta de detección, no de edición.** Lee el reporte de servicios
de BIT, aplica las reglas del PRD y organiza lo que hay que revisar. Las
correcciones las hace el equipo en el ERP; la aplicación no escribe nada de
vuelta.

Todo corre en el navegador: una sola página, sin servidor propio ni base de
datos.

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

Un único HTML de ~830 kB con el CSS y el JavaScript embebidos. Se sube tal cual,
se manda por correo o se abre con doble clic — igual que el dashboard de
evolución de servicios.

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
| `npm run lint` | Chequeo de tipos (`tsc --noEmit`, en modo estricto) |
| `npm run verify` | Verifica la capa de datos: aplanado, detección, construcción y diff |
| `npm run check` | `lint` + `verify` |

## Estructura

```
index.html                   Documento raíz
src/App.tsx                  Estado global y orquestación de vistas
src/types.ts                 Modelo de dominio (Service, Deviation, Agreement…)
src/data/seed.ts             Umbrales por defecto y matriz inicial (vacía)
src/services/
  apiClient.ts               Consulta del reporte, copia local y aplanado
  fieldMapping.ts            Catálogo de campos y detección de columnas
  adapter.ts                 Filas de la API -> modelo Service
  engine.ts                  Motor de reglas del PRD (R-GEN, R-IMP, R-EXP, …)
  dataDiff.ts                Comparación entre lecturas + redacción de mensajes
  refreshPipeline.ts         Orquestación de "Actualizar datos"
src/components/              Vistas y componentes de interfaz
scripts/
  build-standalone.mjs       Genera el HTML de un solo archivo
  verificar-integracion.ts   Verificación de la capa de datos
```

---

## La fuente de datos

Todos los servicios salen del reporte de BIT. No hay datos de maqueta ni una
segunda fuente.

```
POST https://biterp.cl:451/api/misservicios/reporte/prod-general
{ "apiKey": "...", "perDesde": "2026-01-01", "perHasta": "2026-12-31" }
```

Es el mismo endpoint y el mismo cuerpo que la consulta de Power Query. La
respuesta trae filas de servicio con los extracostos en un arreglo anidado; la
aplicación los aplana y los vuelve a unir por el id de servicio.

La configuración (URL, `apiKey`, periodo, proxy) se hace desde la vista
**Mapeo de Campos**. No hay variables de entorno ni archivos que editar antes
del build.

### Copia local

Cada respuesta correcta se guarda en el navegador. Si la API no responde, la
aplicación sigue mostrando la última lectura buena y lo dice: la barra superior
cambia de `API` a `Copia local` y aparece un aviso con el motivo.

---

## Mapeo de campos

El reporte **no tiene nombres de columna estables**, así que en vez de
codificarlos la aplicación los detecta: cada campo declara sus alias y qué tipo
de dato espera, y se elige la columna con mejor puntaje. Es el mismo criterio
del dashboard de evolución de servicios, extendido con los campos
operacionales que necesitan las reglas del PRD.

La vista **Mapeo de Campos** muestra qué columna quedó asignada a cada campo,
con una muestra de sus valores y su porcentaje de llenado. Si alguna quedó mal,
se corrige con el selector y el modelo se reconstruye al instante, usando la
copia local — sin volver a llamar a la API.

Lo que el usuario fija a mano manda sobre la detección, pero sólo mientras esa
columna siga existiendo: si el reporte cambia de forma, la preferencia obsoleta
se descarta y vuelve a mandar la detección automática.

El catálogo vive en `src/services/fieldMapping.ts` (`CAMPOS`). Agregar un campo
es agregar una entrada ahí.

### Reglas que se apagan solas

Si el reporte no trae la columna que una regla necesita, esa regla **no se
evalúa**. Sin esto, un campo ausente haría que *todos* los servicios se marcaran
como incompletos: ruido, no hallazgos.

La vista de mapeo lista cuáles quedaron apagadas y por qué, y el sidebar lo
muestra con un contador. Si la columna existe con otro nombre, basta asignarla y
las reglas vuelven solas.

| Falta la columna | No se evalúa |
|---|---|
| Peso | R-GEN-02 (peso en blanco), R-GEN-03 (sobrepeso) |
| ETA | R-GEN-01 (control de fechas) |
| Modalidad | R-GEN-04 |
| In / Out planta | R-GEN-05 (estadía) |
| Puerto | R-IMP-02, R-EXP-02 (campos obligatorios) |
| Stacking / corte documental | R-EXP-01 |
| Retiro / presentación | R-EXC-02, R-LIQ-03 (almacenaje) |
| Costo | R-LIQ-01 (rentabilidad mínima) |

---

## La matriz comercial

El reporte entrega venta, costo y tarifa por servicio, pero **no** la matriz de
tarifas acordadas por cliente. Esa matriz es configuración de la aplicación: se
carga desde la vista **Matriz Comercial** y se guarda en el navegador.

Arranca vacía a propósito. Los clientes se derivan de la respuesta de la API, así
que la matriz se construye contra los clientes reales; una matriz de ejemplo
tendría ids que nunca cruzarían.

Mientras un cliente no tenga matriz, sus servicios aparecen en **Sin Matriz** y
se evalúan sólo con las reglas generales (peso, fechas, extracostos, margen).
Las reglas de tarifa se activan al crear su matriz.

---

## Notificaciones de cambios

Cada "Actualizar datos" guarda una referencia de la lectura anterior, consulta
la API, reconstruye el modelo y avisa qué cambió:

```ts
diffData(previousData, newData)
// -> { nuevos, cambiosEstado, eliminados, sinCambios, totalAnterior, totalNuevo }
```

| Situación | Mensaje | Color |
|---|---|---|
| Sin cambios | «Datos actualizados. Sin cambios recientes.» | Neutro |
| Sólo servicios nuevos | «Se han añadido X nuevos servicios desde la API.» | Éxito |
| Sólo cambios de estado | «X servicios han cambiado su estado.» | Advertencia |
| Ambos | «Actualización completada: X servicios nuevos, Y cambios de estado detectados.» | Éxito |

Aparecen arriba a la derecha, se apilan hasta cuatro, incluyen el detalle de los
primeros cambios y se cierran solas. El temporizador se pausa al pasar el cursor
por encima.

La primera lectura no reporta nada como novedad: no hay línea base con qué
comparar.

---

## Qué guarda el navegador

| Clave | Contenido | Por qué |
|---|---|---|
| `lyd_bit_api_config_v2` | URL, `apiKey`, periodo, proxy | Configuración de la conexión |
| `lyd_bit_api_snapshot_v2` | Última respuesta cruda | Para seguir trabajando si la API cae |
| `lyd_bit_mapeo_campos_v2` | Correcciones manuales del mapeo | Para no repetirlas en cada lectura |
| `lyd_bit_agreements_v5` | Matriz comercial | No vive en el ERP |
| `lyd_bit_settings_v5` | Umbrales y reglas activas | Configuración del motor |
| `lyd_bit_deviation_states_v5` | Triaje de desviaciones y bitácora | Organizar la revisión |

Los servicios y los clientes **no** se guardan: se reconstruyen en cada lectura
a partir de la respuesta.

### Sobre la `apiKey`

Se guarda en el navegador de quien la escribe y viaja sólo hacia la URL
configurada. Para producción conviene un proxy propio que la guarde en el
servidor — ver `DESPLIEGUE.md`. La API también tiene que permitir CORS desde el
dominio donde se publique la aplicación.
