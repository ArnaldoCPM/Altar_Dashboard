# SGSA — Sistema de Gestão dos Servidores do Altar

## Arquitectura oficial

Este documento es la referencia permanente para diseñar y evolucionar el SGSA. Complementa a `PROJECT_CONTEXT.md`, que registra decisiones e hitos de trabajo, pero no lo reemplaza.

## 1. Filosofía del proyecto

El SGSA es una plataforma de gestión pastoral, no solamente un dashboard. Su propósito es acompañar y administrar el ciclo completo de los Servidores del Altar de la parroquia: su registro, formación, participación, organización y seguimiento histórico.

Toda nueva funcionalidad debe respetar esta arquitectura para que el sistema pueda crecer sin perder coherencia funcional, técnica ni pastoral.

## 2. Principios

- **Fuente única de verdad:** cada dato y cada decisión de autorización tienen una fuente canónica definida.
- **Responsabilidad única por módulo:** cada módulo resuelve un dominio concreto y evita asumir responsabilidades ajenas.
- **Separación de capas:** autenticación, autorización, datos e interfaz son responsabilidades distintas.
- **La UI no concede permisos:** puede ocultar o mostrar controles, pero la autorización pertenece al modelo de permisos y a las reglas de Firestore.
- **Defensa en profundidad:** el cliente valida la intención de la acción y Firestore protege la operación en el servidor.

## 3. Arquitectura general

```text
Firebase Authentication
        ↓
Firestore
        ↓
Servicios y capa de datos
        ↓
Módulos JavaScript
        ↓
Interfaz de usuario
```

- **Firebase Authentication** autentica la identidad de la persona.
- **Firestore** conserva perfiles, servidores, capillas, formaciones y demás datos operativos; sus Security Rules aplican el control final de acceso.
- **Servicios y capa de datos** encapsulan las lecturas y escrituras de cada colección.
- **Módulos JavaScript** resuelven sesión, permisos, autorización, presentación y coordinación de flujos.
- **UI** presenta información y dispara acciones ya autorizadas; no define por sí misma qué está permitido.

## 4. Modelo de identidad

La autenticación se realiza mediante Firebase Authentication. El perfil canónico del usuario se encuentra en `users/{uid}`, donde `{uid}` es el UID autenticado.

`profile.role` es la única fuente del rol. No existen permisos determinados por emails especiales ni por identificadores de documento basados en email.

La migración desde el modelo histórico `users/{email}` se realizó para trasladar perfiles autorizados hacia `users/{uid}`. Puede subsistir lógica de compatibilidad estrictamente para completar dicha migración de identidad, pero no forma parte del modelo de permisos ni debe reutilizarse para nuevas funcionalidades.

## 5. Modelo de autorización

Los roles oficiales son `admin`, `coordinator` y `viewer`.

| Rol | Lectura | Escritura sobre servidores | Administración |
| --- | --- | --- | --- |
| **ADMIN** | Consulta toda la parroquia, dashboard, gráficos, búsqueda y filtros. | Crea, edita, elimina y cambia la capilla de cualquier servidor. | Administra usuarios y capillas. |
| **COORDINATOR** | Consulta toda la parroquia, dashboard, gráficos, búsqueda y filtros. | Crea servidores de su capilla y solo edita servidores con `server.chapelId == profile.chapelId`. No elimina ni cambia `chapelId`. | No administra usuarios ni capillas. |
| **VIEWER** | Consulta dashboard, gráficos y búsqueda de toda la parroquia. | No modifica datos. | No administra usuarios ni capillas. |

La política oficial establece que todos los coordinadores pueden consultar toda la parroquia. `chapelId` limita exclusivamente las operaciones de escritura; nunca se utiliza para recortar el dataset visible.

## 6. Modelo de datos

Las colecciones principales son:

- **`users`**: perfiles canónicos de los usuarios autenticados. Contiene, entre otros, `uid`, `role`, `chapelId` y `active`.
- **`servers`**: padrón operativo de Servidores del Altar. `chapelId` es el identificador canónico para decisiones de escritura; `Capela` puede mantenerse como dato descriptivo.
- **`chapels`**: catálogo de capillas y sus datos de referencia.
- **`formations`**: jerarquía contextual Formation → Polo → Encounter → Participant. El detalle de su contrato está en `M10_FORMATION_DATA_MODEL.md`.
- **`authorizedUsers`**: colección reservada para una necesidad futura de autorización explícita; no debe usarse ni implementarse sin una decisión arquitectónica previa.

Las relaciones y el detalle de campos se documentan en `DATABASE.md`.

### Datos derivados

El SGSA diferencia entre:

- datos almacenados;
- datos derivados.

Ejemplo:

Data_nascimento → Edad

La edad no se almacena como dato oficial.

Se calcula dinámicamente mediante calculateAge().

Este principio evita inconsistencias y elimina la necesidad de procesos periódicos de actualización.

## 7. Arquitectura UI

- **Header:** identifica el estado general de la sesión y muestra acciones de alto nivel según `currentUserProfile.role`.
- **Sidebar:** organiza la navegación entre los dominios funcionales sin asumir reglas de autorización.
- **Workspace:** área central donde se presenta el módulo activo y sus datos.
- **Modales:** contienen formularios y confirmaciones de acciones puntuales; validan antes de escribir, sin reemplazar la autorización.
- **Tabla:** presenta el padrón, contactos y acciones disponibles para cada registro.
- **Dashboard:** resume el estado parroquial mediante indicadores, filtros y gráficos a partir del dataset completo visible.

## 8. Organización de módulos JavaScript

### Patrón oficial de módulos

Todo módulo funcional nuevo debe organizarse bajo `js/modules/<module>/` y exponer una API de ciclo de vida desde `index.js`: `initialize()`, `refresh()` y `destroy()`.

- `controller.js` coordina carga de datos y actualización de vistas.
- `state.js` mantiene exclusivamente el estado del módulo.
- `services/` encapsula el acceso a datos del dominio.
- `views/` se limita al renderizado.
- `components/` concentra piezas reutilizables cuando el módulo las necesite.

Dashboard y Formation aplican este patrón. `main.js` conserva la orquestación global de sesión y el inicio de módulos; no debe contener el estado o ciclo de vida interno de un módulo, aunque mantiene compatibilidad con flujos legacy de servidores.

- **`auth`**: integra Firebase Authentication y comunica cambios de sesión.
- **`authorization`**: decide si una operación sobre un servidor concreto está permitida según rol y capilla.
- **`permissions`**: mantiene roles y capacidades generales del sistema.
- **`main`**: orquesta la sesión, la carga de datos y la coordinación de la UI.
- **`firebase`**: centraliza la inicialización y las instancias compartidas de Firebase.
- **`data/*`**: encapsula el acceso a las colecciones del dominio, como usuarios, servidores y capillas.
- **`charts`**: construye las visualizaciones estadísticas.
- **`filters`**: gestiona los criterios de filtrado de datos visibles.
- **`pagination`**: administra la navegación de conjuntos extensos de registros.
- **`table`**: representa datos tabulares y sus estados visuales.
- **`modals`**: controla diálogos, formularios y confirmaciones reutilizables.
- **`session`**: conserva el estado de sesión, incluido `currentUserProfile`, durante la ejecución de la aplicación.

Los módulos pueden evolucionar o extraerse desde `main`, pero deben conservar estas fronteras de responsabilidad.

## 9. Principios para nuevos módulos

Todo nuevo módulo debe:

- usar el sistema de permisos existente;
- no consultar Firebase Authentication directamente para decidir permisos;
- consultar `currentUserProfile` a través del estado de sesión cuando necesite información del usuario;
- usar `authorization.js` para cualquier decisión sobre registros o ámbito de escritura;
- mantener la separación entre lectura y escritura;
- delegar las operaciones de Firestore en la capa de datos correspondiente.

## 10. Roadmap arquitectónico

La visión de crecimiento contempla los siguientes dominios:

- **Shell (M9):** estructura de navegación y espacio de trabajo modular.
- **Formación:** módulo operativo de Formations, Polos, Encounters, Participants y Attendance.
- **Reportes operativos:** siguiente candidato para salida imprimible/exportable contextual de Encounter.
- **Escalas:** organización de servicios y asignaciones pastorales.
- **Historial del servidor:** trayectoria individual, cambios y eventos relevantes.
- **Reportes:** consultas y salidas operativas para coordinación y administración.
- **Notificaciones:** comunicación contextual con los usuarios y responsables.

No se asignan fechas en este documento; cada dominio deberá incorporarse respetando los principios y capas anteriores.

## 11. Principios de calidad y mantenimiento

- Evitar lógica duplicada y centralizar las decisiones en el módulo responsable.
- No reintroducir `ADMIN_EMAIL` ni permisos basados en emails especiales.
- No crear permisos paralelos fuera del sistema de roles.
- Toda autorización sobre servidores debe pasar por `authorization.js` y estar respaldada por Firestore Security Rules.
- Toda modificación relevante debe actualizar `PROJECT_CONTEXT.md`.
- Toda modificación arquitectónica debe actualizar este documento.
- Toda modificación de modelo, colección o relación debe actualizar `DATABASE.md` cuando corresponda.
