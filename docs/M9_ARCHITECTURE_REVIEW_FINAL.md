# M9-AR FINAL - Revisión Arquitectónica Comparativa del Dashboard

## Resultado

El Dashboard avanzó de forma sustancial respecto de `M9_ARCHITECTURE_REVIEW.md`: sus datos, estado, vistas, callbacks y eventos internos están ahora contenidos en `js/modules/dashboard/`. Sin embargo, todavía no puede declararse patrón oficial por dos acoplamientos estructurales reales: los handlers de acciones de tabla dependen de funciones globales definidas en `main.js`, y la vista sigue calculando y aplicando los filtros en vez de que el Controller gobierne esa decisión.

## Evaluación comparativa

| # | Criterio | Revisión anterior | Estado final | Evidencia actual |
| --- | --- | --- | --- | --- |
| 1 | Separación clara entre Controller, State, Services, Views y Components | Cumple parcialmente | Cumple parcialmente | Existen Controller, State, Service y vistas diferenciadas (`dashboard.view.js`, `table.view.js`, `kpis.view.js`). `components/` permanece vacío y la vista principal aún combina render de gráficos con coordinación de filtros y eventos. |
| 2 | `main.js` no contiene responsabilidades propias del Dashboard | No cumple | Cumple | `main.js` inicializa, refresca, destruye y consulta la API pública; no contiene render, filtros, paginación, callbacks ni listeners internos del Dashboard. |
| 3 | Única fuente de datos | Cumple | Cumple | La suscripción sigue centralizada en `dashboard.service.js`, coordinada por el Controller y cancelada por `destroy()`. |
| 4 | Única fuente de estado | Cumple parcialmente | Cumple | `dashboardState` no se exporta hacia `main.js`; dataset, paginación y gráficos se modifican mediante la API controlada por el Controller. |
| 5 | Las vistas no contienen reglas de negocio | Cumple parcialmente | Cumple parcialmente | `table.view.js` renderiza con acciones pre-resueltas por el Controller. No obstante, `dashboard.view.js` todavía calcula el dataset filtrado y aplica los criterios de búsqueda/filtro. |
| 6 | El Controller coordina correctamente el módulo | Cumple parcialmente | Cumple parcialmente | Coordina suscripción, estado, errores, render de tabla, paginación y permisos de acciones. Aún recibe el resultado de filtrado ya calculado por la vista. |
| 7 | Inicialización mediante `initialize()` | Cumple | Cumple | `index.js` expone `initialize()` y `main.js` lo invoca con las capillas disponibles. |
| 8 | Descarga mediante `destroy()` | Cumple | Cumple | `destroy()` cancela la suscripción y reinicia la paginación. |
| 9 | Puede servir como plantilla para un nuevo módulo | No cumple | Cumple parcialmente | El ciclo de vida, Service, State, Controller y vistas internas son reutilizables. La dependencia de handlers globales de tabla no debe trasladarse a un patrón oficial. |
| 10 | Soporta Formação sin rediseñar infraestructura | No cumple | Cumple parcialmente | La infraestructura modular es reutilizable sin rediseñar Shell, Router, datos o estado. Antes de tomarla como patrón oficial debe eliminarse el acoplamiento global de acciones y centralizar la decisión de filtros. |

## Comparación con la revisión anterior

### Criterios que mejoraron

- 2: `main.js` dejó de contener responsabilidades internas del Dashboard.
- 4: el estado quedó encapsulado y ya no recibe escrituras directas desde `main.js`.
- 9: la estructura actual constituye una base reutilizable, aunque todavía no completamente oficial.
- 10: Formação puede apoyarse en la infraestructura actual sin rediseñar el Shell ni el contrato de ciclo de vida.

### Criterios que permanecen iguales

- 3: la fuente única de datos continúa correctamente centralizada.
- 7: la inicialización mediante `initialize()` continúa correcta.
- 8: la descarga mediante `destroy()` continúa correcta.

### Criterios que continúan siendo impedimento

- 5 y 6: el cálculo y aplicación de filtros permanecen en `dashboard.view.js`; el Controller no gobierna todavía esa decisión.
- 9 y 10: `table.view.js` conserva `onclick` hacia `editServer()` y `deleteServer()`, funciones globales de `main.js`. Es un acoplamiento técnico efectivo con el exterior del módulo y evita que la tabla sea autónoma.

## Bloqueantes reales para el patrón oficial

1. Las acciones de editar y eliminar se emiten desde la tabla mediante handlers globales (`editServer` y `deleteServer`) definidos fuera del módulo Dashboard. El Controller decide su visibilidad, pero el módulo no posee ni recibe un contrato interno para ejecutar esas acciones.
2. La vista calcula el resultado de filtros y búsqueda antes de invocar al Controller. Esto mantiene una decisión de estado y de interacción fuera del responsable de coordinación del módulo.

Estos dos puntos son bloqueantes arquitectónicos porque impiden aislar o reutilizar el Dashboard sin depender de `main.js`; no son mejoras menores de estilo ni de organización.

## Conclusión

NO

El Dashboard no constituye todavía el patrón oficial de módulos del SGSA. La autonomía lograda es alta, pero los handlers globales de acciones de tabla y la decisión de filtros fuera del Controller mantienen dependencias estructurales con `main.js` y con la vista.

## Recomendación final para el roadmap

Completar exclusivamente la internalización del contrato de acciones de tabla y del flujo de decisión de filtros. Después de eliminar esos dos acoplamientos, realizar una revisión breve de confirmación antes de declarar el Dashboard como patrón oficial para Formação y los módulos posteriores.
