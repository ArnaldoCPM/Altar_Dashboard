# M9-AR — Architecture Review del Dashboard

## Resumen ejecutivo

El Dashboard se encuentra en una fase intermedia de modularización. Existe una estructura de módulo, una API de ciclo de vida, un servicio de datos y un estado central inicial. Sin embargo, la separación de responsabilidades todavía no está completa: `main.js` conserva el render de gráficos y tabla, filtros, paginación, callbacks de Dashboard y escrituras directas sobre el estado.

La conclusión de esta revisión es **NO**: el Dashboard todavía no constituye el patrón oficial de módulos del SGSA. La infraestructura definida por la arquitectura existe, pero el módulo no la aplica de forma suficientemente autónoma para servir de referencia segura a Formação u otros módulos.

## Evaluación por criterios

| Criterio | Resultado | Evidencia arquitectónica |
| --- | --- | --- |
| 1. Separación clara entre Controller, State, Services, Views y Components | Cumple parcialmente | Existen `controller.js`, `state.js`, `services/` y `views/kpis.view.js`, pero gráficos, tabla, filtros y paginación siguen en `main.js`; `components/` no contiene componentes reutilizables aún. |
| 2. `main.js` no contiene responsabilidades propias del Dashboard | No cumple | `main.js` contiene `updateUI()`, `populateFilters()`, `renderCharts()`, `renderTable()`, `updatePaginationControls()` y `setupInteractiveEvents()`. |
| 3. Única fuente de datos | Cumple | La suscripción activa del Dashboard se centraliza en `services/dashboard.service.js` y el controller cancela la suscripción anterior antes de registrar una nueva. |
| 4. Única fuente de estado | Cumple parcialmente | `state.js` concentra dataset, gráficos, paginación, UI y suscripción; no obstante, `main.js` lee y escribe directamente `dashboardState` para gráficos y paginación. |
| 5. Las vistas no contienen reglas de negocio | Cumple parcialmente | La vista de KPIs incluye cálculo de edad y clasificación de tipos; además, las vistas principales aún no fueron extraídas de `main.js`. |
| 6. El Controller coordina correctamente el módulo | Cumple parcialmente | Coordina suscripción, datos, loading y refresh, pero recibe callbacks de render y filtros desde `main.js` en lugar de coordinar vistas internas del módulo. |
| 7. Inicialización mediante `initialize()` | Cumple | `index.js` expone `initialize()` y `main.js` la invoca al completar el flujo de sesión. |
| 8. Descarga mediante `destroy()` | Cumple | `destroy()` cancela la suscripción y restablece la paginación; su alcance actual es mínimo pero válido para el ciclo de vida presente. |
| 9. Puede servir como plantilla para un nuevo módulo | No cumple | Copiar su forma actual trasladaría responsabilidades de vistas y estado compartido a `main.js`, reproduciendo el acoplamiento pendiente. |
| 10. Soporta Formação sin rediseñar infraestructura | No cumple | El Shell y el contrato de ciclo de vida son reutilizables, pero el patrón de implementación todavía requiere completar la independencia interna del Dashboard. |

## Coherencia con los documentos de referencia

- **SGSA_ARCHITECTURE.md:** cumple parcialmente el patrón oficial de Controller, State, Services, Views y Components. La estructura existe, pero la responsabilidad de Views continúa fuera del módulo.
- **M9_APPLICATION_SHELL_BLUEPRINT.md:** cumple en la integración visual: el Dashboard se muestra en Workspace y no reemplaza Header ni Sidebar.
- **UI_GUIDELINES.md:** no se evalúa la estética; desde la arquitectura, la reutilización visual aún no está encapsulada como vistas o componentes del módulo.

## Aspectos que impiden usarlo como patrón oficial

- Las responsabilidades de Dashboard principales permanecen en `main.js`: renderizado de gráficos y tabla, filtros, búsqueda, paginación y listeners.
- El controller depende de callbacks entregados desde `main.js` para renderizar y actualizar filtros, por lo que no es el coordinador autónomo del módulo.
- `main.js` escribe directamente sobre `dashboardState` para gráficos y paginación; el estado no está protegido por una API del módulo.
- La tabla conserva callbacks globales hacia flujos de Servidores y mezcla renderizado, autorización y composición de acciones.
- Solo los KPIs tienen una vista dedicada; las demás vistas previstas no existen todavía.

## Conclusión

**¿El Dashboard ya constituye el patrón oficial de módulos del SGSA?**

**NO.**

El Dashboard es un piloto arquitectónico prometedor, pero no una referencia oficial todavía. El contrato de ciclo de vida, la fuente de datos y el estado central son una base válida; la falta de independencia respecto a `main.js` impide considerar concluido el patrón.

## Recomendación final para el roadmap

Completar la extracción pendiente de las responsabilidades ya identificadas en M9-T3B antes de iniciar Formação como módulo basado en esta arquitectura. No se recomienda rediseñar el Shell ni los contratos de sesión: la prioridad es terminar la separación ya definida entre controller, state y views del Dashboard.
