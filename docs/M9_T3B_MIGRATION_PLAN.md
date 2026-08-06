# M9-T3B — Plan de migración del Dashboard

## Resumen ejecutivo

El Dashboard se encuentra en una migración parcial. `js/modules/dashboard/` ya contiene una API de ciclo de vida, estado, un servicio de suscripción y una vista de KPIs. Sin embargo, `js/main.js` todavía contiene el render de gráficos y tabla, filtros, paginación, listeners, estado visual y una suscripción legacy.

El riesgo principal no es visual: la tabla comparte el dataset con los flujos de alta, edición, eliminación e importación de Servidores que aún viven en `main.js`. La migración segura debe preservar esos flujos mediante callbacks explícitos, en lugar de mover indiscriminadamente el CRUD de Servidores al Dashboard.

## Estado objetivo

```text
main.js
  └── sesión, Application Shell e initializeDashboard()

modules/dashboard/
  ├── controller.js  → coordina datos, estado y vistas
  ├── state.js       → dataset, gráficos, filtros, paginación y suscripción
  ├── services/      → acceso de lectura al dataset del Dashboard
  ├── views/         → KPIs, gráficos, tabla y filtros
  └── components/    → solo piezas reutilizables que resulten necesarias
```

## Mapa de dependencias

| Responsabilidad | Archivo actual | Funciones y estado | Dependencias y consumidores | Riesgo | Destino recomendado |
| --- | --- | --- | --- | --- | --- |
| Entrada y ciclo de vida | `js/modules/dashboard/index.js` | `initialize()`, `refresh()`, `destroy()` | Delega en `controller.js`; llamado desde `main.js` | Bajo | Mantener en `index.js` |
| Estado inicial del módulo | `js/modules/dashboard/state.js` | `dashboardState.data`, `charts`, `currentPage`, `filteredItems`, `unsubscribe` | Controller actual; todavía duplicado por variables de `main.js` | Medio | Consolidar en `state.js` |
| Suscripción de datos | `services/dashboard.service.js` y `main.js` | `subscribeToDashboardData()`; `subscribeToDatabase()` legacy | Firebase, `buildServersQuery()`, carga, error y render | Alto | Mantener solo el servicio y coordinar desde `controller.js` |
| Coordinación actual | `controller.js` y `main.js` | `configure()`, `loadData()`, `refresh()`, `updateUI()` | Controller recibe callbacks de `main.js`; `updateUI()` orquesta vistas legacy | Alto | `controller.js` |
| KPIs y cálculo de edad | `views/kpis.view.js`; `main.js` | `getServerAge()`, `updateKPIs()`; duplicado `getServerAge()` | `cleanStr`, `calculateAge`, elementos KPI | Medio | `views/kpis.view.js` |
| Gráficos | `main.js` | `renderCharts()`, variable global `charts` | Chart.js, `cleanStr`, `getServerAge()`, canvases | Medio | `views/charts.view.js` |
| Tabla de Servidores | `main.js` | `renderTable()` | dataset filtrado, edad, enlaces WhatsApp, autorización, callbacks globales `editServer()` y `deleteServer()` | Alto | `views/table.view.js` con callbacks inyectados |
| Filtros y búsqueda | `main.js` | `populateFilters()`, `setupInteractiveEvents()` | Capillas, `cleanStr`, tabla, estado de página, campos DOM | Medio | `views/filters.view.js` |
| Paginación | `main.js` | `updatePaginationControls()`, `window.goToPage()`, `window.nextPage()`, `window.previousPage()`; `currentPage`, `totalFilteredItems`, `ITEMS_PER_PAGE` | Tabla e handlers inline del HTML | Medio | `views/table.view.js` y `state.js` |
| Confirmación de acciones | `main.js` | `showConfirm()` | Modal global, eliminación e importación CSV | Medio | Mantener temporalmente en `main.js` o extraer más adelante como utilidad global; no es exclusivo del Dashboard |
| Auditoría temporal de capillas | `main.js` | `auditChapels()` | Dataset del módulo y consola | Bajo | Retirar o mover a una utilidad de diagnóstico fuera del Dashboard; no es render productivo |
| Alta, edición, eliminación e importación | `main.js` | `editServer()`, `deleteServer()`, formulario, CSV y helpers | Autorización, Firestore, modales, dataset | Alto | Mantener en `main.js` hasta existir un módulo de Servidores; consumir callbacks desde la tabla |
| Estado de sesión y Shell | `main.js` | auth listener, Header, Sidebar, login/logout | Auth, sesión, permisos, Application Shell | Bajo | Debe permanecer en `main.js` |

## Dependencias y acoplamientos críticos

### Variables globales excesivamente compartidas

- `charts` en `main.js` duplica `dashboardState.charts` y debe consolidarse en `state.js` antes de mover gráficos.
- `currentPage`, `totalFilteredItems` e `ITEMS_PER_PAGE` permanecen en `main.js`; pertenecen exclusivamente a la tabla y deben migrar juntos a `state.js`.
- El dataset ya está disponible desde `dashboardState.data`, pero `main.js` lo consulta mediante `getDashboardData()` para los flujos de Servidores. Esa dependencia debe sustituirse, en una tarea posterior de Servidores, por una capa propia del dominio.

### Funciones con alto acoplamiento

- `renderTable()` mezcla presentación, composición de enlaces de WhatsApp, consulta de autorización y callbacks globales de edición/eliminación.
- `setupInteractiveEvents()` cierra sobre el dataset y modifica la paginación antes de volver a renderizar la tabla.
- `subscribeToDatabase()` es una implementación legacy duplicada de la suscripción del servicio y además realiza carga, filtros, render, auditoría de capillas y ocultamiento del loading.
- `updateUI()` concentra KPIs, gráficos, tabla y listeners; debe desaparecer tras centralizar la orquestación en el controller.

## Orden recomendado de migración

### Paso 1 — Eliminar la ruta de suscripción legacy

Conservar `services/dashboard.service.js` como única vía de lectura del Dashboard. Mover al controller el ocultamiento del loading y el tratamiento de error actualmente duplicados en `subscribeToDatabase()`.

**Criterios de validación:** una sola llamada a `onSnapshot` para el Dashboard; login, logout y recarga de datos mantienen el mismo comportamiento.

### Paso 2 — Consolidar estado en `state.js`

Trasladar `charts`, `currentPage`, `totalFilteredItems` e `ITEMS_PER_PAGE` al estado del módulo. Eliminar sus declaraciones en `main.js` antes de extraer vistas, evitando que dos fuentes de verdad convivan.

**Criterios de validación:** la paginación conserva página actual, botones y rango; los gráficos se destruyen y recrean como hoy.

### Paso 3 — Extraer KPIs y gráficos

`views/kpis.view.js` ya es la base. Completar la extracción de `getServerAge()` y mover `renderCharts()` a `views/charts.view.js`, usando solo datos recibidos y el estado de gráficos.

**Criterios de validación:** los seis KPIs y los cuatro gráficos muestran los mismos datos, etiquetas, colores y tooltips.

### Paso 4 — Extraer tabla y paginación como una sola unidad

Mover `renderTable()`, `updatePaginationControls()` y los callbacks de página a `views/table.view.js`. No separar paginación de tabla: ambas comparten estado y el HTML actual usa handlers inline globales.

La vista debe recibir callbacks `onEdit` y `onDelete`; estos seguirán llamando temporalmente a los flujos de Servidores en `main.js`.

**Criterios de validación:** mismos contactos, badges, acciones visibles, autorización de botones, estado vacío y navegación de páginas.

### Paso 5 — Extraer filtros y búsqueda

Mover `populateFilters()` y `setupInteractiveEvents()` a `views/filters.view.js`. El controller debe coordinar la actualización de opciones y solicitar a la vista de tabla el render del resultado filtrado.

**Criterios de validación:** búsqueda, cuatro filtros, restauración de capilla seleccionada y vuelta a página 1 conservan el comportamiento actual.

### Paso 6 — Cleanup del controller y `main.js`

Reemplazar `updateUI()` por la secuencia del controller: actualizar filtros, KPIs, gráficos, tabla y listeners. Eliminar las funciones legacy, imports y variables de Dashboard de `main.js`.

**Criterios de validación:** `main.js` no contiene `renderCharts`, `renderTable`, `populateFilters`, `setupInteractiveEvents`, paginación, `charts`, `currentPage`, `totalFilteredItems`, `dataset` ni `subscribeToDatabase`.

## Responsabilidades que deben permanecer en `main.js`

- Inicio de aplicación, sesión, autenticación y logout.
- Inicialización del Application Shell y del módulo Dashboard.
- Coordinación temporal de modales y flujos de Servidores: alta, edición, eliminación, importación CSV y sus reglas de autorización.
- Gestión de usuarios y sus modales.
- `showError()` y `showConfirm()` mientras sean utilidades globales compartidas por Dashboard, Servidores, login e importación.

Estas responsabilidades no deben migrar al Dashboard porque no pertenecen exclusivamente a la visualización y consulta del Dashboard.

## Riesgos de migración

- **Alto:** duplicar la suscripción Firestore o conservar dos datasets puede producir renders duplicados y datos desalineados.
- **Alto:** mover acciones de edición/eliminación sin callbacks preservados puede romper autorización o los modales de Servidores.
- **Medio:** cambiar handlers inline de paginación sin una transición compatible puede romper los botones existentes.
- **Medio:** registrar listeners repetidos de filtros puede degradar el rendimiento o aplicar filtros múltiples.
- **Bajo:** mover KPIs o gráficos si los IDs de DOM y las opciones de Chart.js se preservan exactamente.

## Validación final de M9-T3B

1. Ejecutar `node --check` sobre `main.js` y todos los archivos de `js/modules/dashboard/`.
2. Ejecutar `git diff --check`.
3. Confirmar una única suscripción del Dashboard.
4. Confirmar que los KPIs, gráficos, filtros, tabla, contactos, acciones y paginación no cambian visual ni funcionalmente.
5. Confirmar que login, logout, permisos, Firebase, Firestore y Application Shell no cambian.
6. Confirmar que `main.js` queda limitado a responsabilidades globales y no contiene lógica específica del Dashboard.
