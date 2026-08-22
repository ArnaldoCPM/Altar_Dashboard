# SGSA – UI Guidelines

Este documento establece las reglas visuales y de interacción comunes para los módulos del SGSA. Su finalidad es preservar una experiencia clara, coherente y útil para el trabajo pastoral cotidiano, tomando como referencia prioritaria los patrones que ya existen en la aplicación.

Es complementario a [SGSA_ARCHITECTURE.md](SGSA_ARCHITECTURE.md), [M9_APPLICATION_SHELL_BLUEPRINT.md](M9_APPLICATION_SHELL_BLUEPRINT.md) y [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). No reemplaza las decisiones de arquitectura, autenticación, permisos o reglas de negocio que estos documentos registran.

## 1. Principios de interfaz

- **Claridad:** cada pantalla debe comunicar su propósito y la acción disponible con textos comprensibles.
- **Simplicidad:** se prioriza el contenido operativo necesario, sin recargar la interfaz con controles redundantes.
- **Consistencia:** los módulos reutilizan los patrones ya presentes de superficies, tipografía, espaciado, controles y estados.
- **Accesibilidad:** la información y las acciones deben poder comprenderse sin depender solo de color, iconos o contexto implícito.
- **Jerarquía visual:** títulos, valores, texto auxiliar y acciones se distinguen por tamaño, peso, color y agrupación ya usados en el sistema.
- **Reducción de carga cognitiva:** filtros, formularios y acciones se agrupan por tarea y se presentan con etiquetas explícitas.
- **Responsive design:** la misma función debe mantenerse disponible en desktop, tablet y móvil mediante los breakpoints ya empleados.
- **Reutilización de componentes:** antes de crear una variante nueva, se debe reutilizar el patrón equivalente existente.
- **Feedback claro:** los estados de carga, error, vacío y confirmación deben informar qué ocurre y cuál es el siguiente paso.

La interfaz prioriza el uso pastoral cotidiano —consulta, seguimiento y gestión de servidores— por encima de decisiones exclusivamente estéticas.

## 2. Application Shell

El patrón vigente es:

```text
Header + Sidebar + Workspace
```

- El **Header** y el **Sidebar** pertenecen al sistema y aportan identidad, sesión y navegación.
- Los módulos renderizan su contenido dentro del **Workspace** (`#workspace`).
- Un módulo no debe alterar directamente la estructura global del Shell ni recrear Header o Sidebar.
- La navegación debe conservar una experiencia visual consistente. El Sidebar se genera desde su configuración y el estado activo se deriva del módulo que el Shell está mostrando; no se deben agregar destinos inertes.

El Footer existente permanece como parte del marco visual actual. Su evolución funcional no queda definida por esta guía.

## 3. Colores

La paleta se deriva de los colores y clases actualmente presentes. No se define una paleta nueva.

| Función semántica | Uso actual | Clases o valores observados |
| --- | --- | --- |
| Primario | Header, acciones principales, foco y módulo activo | `bg-liturgical-blue`, `text-liturgical-blue`, `focus:ring-liturgical-blue`; `#1E3A8A` |
| Acento litúrgico | Borde del Header e identidad | `border-liturgical-gold`, `text-liturgical-gold`; `#D4AF37` |
| Fondo general | Fondo de la aplicación | `bg-slate-50` |
| Superficies y tarjetas | Cards, tablas, formularios y modales | `bg-white`, `bg-slate-50` |
| Texto principal | Títulos, valores y contenido destacado | `text-slate-900`, `text-slate-800`, `text-slate-700` |
| Texto secundario | Ayuda, etiquetas y metadatos | `text-slate-500`, `text-slate-400` |
| Bordes | Separación de superficies y campos | `border-slate-100`, `border-slate-200` |
| Éxito | Modo administrativo y progreso de carga | `bg-emerald-50`, `text-emerald-600`, `bg-emerald-500`, `bg-emerald-600` |
| Advertencia | Estado inicial de sincronización y confirmación | `bg-amber-500`, `text-amber-500` |
| Error o peligro | Alertas de error y métrica de salud | `bg-rose-50`, `border-rose-200`, `text-rose-800`, `text-liturgical-red` |
| Estado activo | Enlace activo del Sidebar | `.sidebar-link-active`, fondo `#1e3a8a`, texto blanco |

Los colores de categoría de los KPIs y gráficos —azul, índigo, ámbar, esmeralda, púrpura y rojo litúrgico— se usan para apoyar la lectura, no como único canal para comunicar estado o significado.

## 4. Tipografía

La fuente base actual es **Plus Jakarta Sans**. Los módulos futuros deben reutilizar estas jerarquías antes de introducir tamaños nuevos:

| Elemento | Patrón actual |
| --- | --- |
| Título principal del sistema | `text-xl sm:text-2xl font-extrabold tracking-tight` |
| Título de página o bloque principal | `text-lg font-bold text-slate-800` |
| Título de card o gráfico | `text-base font-bold text-slate-800` |
| Valor de KPI | `text-2xl font-black` |
| Etiqueta de KPI o encabezado de tabla | `text-xs font-semibold uppercase tracking-wider` |
| Texto normal de tabla | `text-sm text-slate-600` |
| Texto auxiliar, subtítulo y ayuda | `text-xs text-slate-500` o `text-slate-400` |
| Etiqueta de formulario | `text-xs font-semibold text-slate-500` o `font-semibold text-slate-500` |

Los tamaños se eligen por jerarquía funcional. No deben añadirse tamaños arbitrarios para diferenciar elementos que ya cuentan con un patrón establecido.

## 5. Botones y acciones

Las categorías semánticas se basan en los controles existentes:

| Categoría | Patrón existente | Uso |
| --- | --- | --- |
| Acción primaria | `bg-liturgical-blue text-white ... rounded-xl` | Guardar, confirmar, iniciar sesión y crear usuarios. |
| Acción secundaria | `bg-slate-100 text-slate-700 ... rounded-xl` | Cancelar, cerrar y paginación. |
| Acción destructiva | No hay un botón destructivo visual consolidado. | Pendiente de estandarización; no reutilizar el primario para eliminar. |
| Acción discreta o contextual | Texto azul, iconos o controles de tabla | Acciones de contexto, búsqueda y cierre; deben mantener un texto o etiqueta accesible. |

- Debe existir una acción principal claramente identificable por contexto.
- Las acciones destructivas deben diferenciarse visualmente cuando se estandaricen.
- Los textos deben expresar una acción: por ejemplo, “Guardar alterações”, “Cancelar” o “Confirmar”.
- Se debe evitar multiplicar botones si una acción puede agruparse en un flujo o menú contextual.
- Los estados `disabled` actuales se aplican a paginación; no deben usarse para sustituir la decisión de visibilidad de módulos autorizados.

## 6. Formularios

El formulario de Servidor es la referencia principal.

- **Label:** se muestra encima del campo con `font-semibold`, color `slate-500` y separación `mb-1`.
- **Input y select:** usan superficie `bg-slate-50`, borde `border-slate-200`, esquinas `rounded-lg` o `rounded-xl`, y foco azul (`focus:ring-liturgical-blue`).
- **Checkbox:** se agrupa con su texto visible en línea; los grupos relacionados se presentan dentro de una superficie `bg-slate-50`.
- **Campos obligatorios:** se indican actualmente mediante `*` en el texto y el atributo HTML `required` cuando corresponde.
- **Readonly:** el campo de edad y el email de edición de usuario usan `readonly` y un fondo más tenue (`bg-slate-50` o `bg-slate-100`) para comunicar que no se editan.
- **Deshabilitados:** se observan en controles de paginación; no existe un patrón general de campos de formulario deshabilitados consolidado.
- **Ayuda contextual:** se presenta como texto auxiliar o placeholder cuando aporta orientación operativa, como la carga de capillas o el formato de teléfono.
- **Validación y errores:** la aplicación usa un alerta global `#error-alert` para errores operativos y mensajes puntuales en el login. Los módulos futuros deben conservar mensajes concretos y accionables.

Los nuevos formularios deben ordenar los campos por tema, usar los grids responsive ya presentes (`grid-cols-1`, `sm:grid-cols-*`, `md:grid-cols-*`) y mantener las acciones al final, alineadas a la derecha cuando el patrón existente aplique.

## 7. Tablas

La tabla de Servidores es la referencia para listados operativos.

- Se presenta dentro de una superficie blanca con borde, `rounded-3xl` y cabecera de filtros separada por borde.
- Los encabezados usan fondo `bg-slate-50/75`, mayúsculas, `text-xs`, peso semibold y `tracking-wider`.
- El contenido usa alineación a la izquierda, `text-sm`, `text-slate-600` y divisores `divide-y divide-slate-100`.
- El contenedor `overflow-x-auto` mantiene disponible la tabla en pantallas estrechas.
- Filtros y búsqueda se sitúan antes de la tabla y se adaptan de una a cuatro columnas según el breakpoint.
- Las columnas **Contatos** y **Ações** se mantienen separadas: los datos de contacto no se mezclan con controles que modifican o disparan una acción.
- Los estados, información sacramental y alertas de salud se presentan como información del registro, no como sustituto de las acciones disponibles.

## 8. Cards y KPIs

El Dashboard actual establece el patrón de tarjetas:

- Card blanca con `p-5`, `rounded-2xl`, `shadow-sm` y `border-slate-100`.
- Título auxiliar en mayúsculas, `text-xs`, peso semibold y color secundario.
- Icono o indicador de color en una superficie suave (`bg-*-50`) para apoyar el contexto.
- Valor destacado con `text-2xl font-black`.
- Información secundaria con `text-[10px] text-slate-400`.
- Grid progresivo de una, dos, tres y seis columnas: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`.

Las cards de gráficos amplían el mismo lenguaje con `p-6`, `rounded-3xl`, título `text-base font-bold` e indicador circular de color.

## 9. Modales

Los modales actuales de login, edición de Servidor, usuarios, edición de usuario y confirmación comparten estos patrones:

- Overlay fijo con `bg-slate-900/60`, `backdrop-blur-sm` y centrado.
- Contenedor blanco con `rounded-3xl`, `shadow-2xl`, borde suave y `p-6`.
- Título `text-lg font-bold text-slate-800` y división inferior mediante `border-b`.
- Acción de cierre en la cabecera cuando existe, además de acciones explícitas al pie cuando el flujo lo requiere.
- Formularios dentro del modal con agrupación vertical `space-y-*` y grids responsive.
- Acciones de cancelación y confirmación situadas al final del flujo.
- Los modales de contenido extenso permiten desplazamiento vertical con `overflow-y-auto`.

Un módulo futuro no debe crear un estilo de modal aislado si uno de estos patrones cubre la necesidad.

## 10. Estados de interfaz

| Estado | Patrón actual | Regla |
| --- | --- | --- |
| Loading | Overlay fijo con spinner, texto y fondo oscurecido; progreso de CSV en barra | Mantener mensajes que indiquen qué se está cargando. |
| Vacío | Icono SVG, mensaje centrado y espacio vertical amplio en la tabla | Explicar qué no se encontró y, cuando corresponda, orientar sobre filtros o datos. |
| Error | Alerta global rosa con icono, texto y cierre; error puntual en login | El mensaje debe ser específico y comprensible. |
| Éxito | Banner administrativo y barra de progreso usan semántica verde, pero no hay confirmación de éxito general consolidada | **Pendiente de estandarización.** |
| Sin permisos | Los controles se ocultan según la lógica actual; no existe un estado visual único | **Pendiente de estandarización.** |
| Datos no disponibles | Carga de capillas y estado vacío cubren casos parciales; no hay componente general | **Pendiente de estandarización.** |

## 11. Iconografía

El SGSA usa SVG inline para identidad, búsqueda, estados, gráficos y modales; también usa emojis en alertas y mensajes de modo administrativo. Los iconos complementan el texto y no deben ser el único medio para comunicar una acción importante.

Los nuevos iconos deben conservar una semántica clara y un estilo compatible con los SVG actuales (`stroke="currentColor"`, tamaños compactos y colores del contexto). Los botones que muestren solo un icono necesitan una etiqueta accesible.

La identidad gráfica existente se conserva en `assets/icons/`. Esta guía no autoriza su modificación.

## 12. Responsive design

Los patrones actuales usan Tailwind y los breakpoints ya presentes:

- **Desktop:** Shell en dos columnas, Sidebar visible y sticky; puede recolher a ícones durante a carga atual.
- **Tablet y móvil:** el Sidebar es un drawer cerrado por defecto, abierto desde la izquierda con overlay; cards, filtros y formularios comienzan en `grid-cols-1`.
- **Sidebar:** el drawer debe cerrar al navegar o con Escape, contener el foco mientras esté abierto y devolverlo a su disparador al cerrar. Los iconos del Sidebar colapsado mantienen texto accesible y tooltip.
- **Tablas:** no se eliminan columnas; se conservan mediante `overflow-x-auto`.
- **Cards:** los KPIs pasan de una a seis columnas de forma progresiva.

No se introducen nuevos breakpoints en esta guía.

## 13. Accesibilidad

Los módulos futuros deben respetar estas reglas mínimas:

- Usar labels asociados a los campos correspondientes.
- Mantener contraste suficiente entre texto, fondo, borde y estado.
- Usar `aria-label` cuando no exista un texto visible suficiente y `aria-current="page"` para la navegación activa.
- Presentar una navegación comprensible mediante títulos de sección y textos de enlace.
- No depender únicamente del color para comunicar un estado.
- Identificar las acciones con texto; los iconos son complementarios.
- Mantener el foco visible de campos y controles mediante los patrones de `focus:ring` existentes.

## 14. Convenciones para nuevos módulos

Todo módulo nuevo deberá:

1. Renderizar dentro de Workspace.
2. Reutilizar los patrones visuales existentes de esta guía.
3. Evitar estilos aislados cuando ya exista un patrón equivalente.
4. Mantener consistencia de formularios, tablas, cards, modales y botones.
5. Respetar los estados de loading, error y vacío; documentar cualquier estado aún no estandarizado.
6. Ser responsive mediante los breakpoints existentes.
7. Mantener la separación entre UI y reglas de negocio.

Formação será el primer módulo nuevo que deberá aplicar formalmente esta guía.

## Pendências de padronização

Las siguientes inconsistencias se detectaron durante la auditoría y no se corrigen en esta tarea:

- La interfaz mezcla portugués, español y algunas variantes terminológicas en títulos, placeholders, etiquetas y mensajes. Falta definir una política de idioma y glosario único.
- Los labels existentes no están asociados sistemáticamente a sus campos mediante el atributo `for`; los controles de cierre basados solo en icono tampoco tienen `aria-label` de forma consistente.
- No existe un patrón visual único para acciones destructivas, confirmaciones de éxito, “sin permisos” o “datos no disponibles”.
- Los tamaños y detalles de algunos botones primarios y secundarios varían entre Header, modales, login y paginación.
- El ancho máximo del Footer (`max-w-7xl`) no coincide con el del Shell (`max-w-[90rem]`).
- El Blueprint reserva el Footer para evolución futura, mientras que la interfaz actual ya muestra un Footer informativo; su papel final requiere confirmación arquitectónica.

Estas pendientes deben resolverse en tareas acotadas y no justifican introducir nuevas variantes visuales de forma aislada.
