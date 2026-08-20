# Objetivo del proyecto

## M9-T4.2 - Filtrado gobernado por el Controller

La vista del Dashboard captura los valores de búsqueda y filtros sin recorrer el dataset ni modificar estado. El Controller aplica los criterios sobre la fuente de datos, actualiza `filteredItems` y coordina el render de tabla y paginación.

## M9-T4.1 - Acciones de tabla sin handlers globales

La tabla del Dashboard emite acciones de edición y eliminación hacia su Controller mediante listeners locales. El Controller publica el evento de integración `dashboard:server-action`; `main.js` conserva la lógica existente de Servidores sin exponer `editServer` ni `deleteServer` como funciones globales.

## M9-T3C.4 - Eventos internos del Dashboard

Los eventos de filtros, búsqueda y paginación del Dashboard se registran dentro de sus vistas internas. `main.js` no registra listeners propios del Dashboard y conserva únicamente los eventos de autenticación, Shell y flujos administrativos.

## M9-T3C.2 — Callbacks internos del Dashboard

El Controller registra internamente los callbacks de carga, renderizado, filtros y errores del Dashboard. `main.js` inicializa el módulo únicamente con las capillas disponibles y ya no entrega callbacks al Controller.

## M9-T3C.1 — Controller como único modificador del estado del Dashboard

El Controller de `js/modules/dashboard/controller.js` pasó a ser el único responsable de modificar el estado del Dashboard. `main.js` ya no accede ni escribe directamente en `dashboardState`: las instancias de gráficos, los elementos filtrados y la página actual se actualizan exclusivamente mediante la API pública del módulo Dashboard.

SGSA - Sistema de Gestao dos Servidores do Altar.

Sistema web para administrar los servidores del altar de una parroquia, centralizando el padrón de servidores, la visualización operativa y la gestión administrativa con control de acceso por usuarios.

# Tecnologías utilizadas

- HTML
- Tailwind CSS
- JavaScript modular (ES Modules)
- Firebase Authentication
- Cloud Firestore
- Vercel

# Arquitectura general

- Aplicación frontend sin framework, basada en módulos ES.
- Firebase Authentication gestiona la autenticación.
- Cloud Firestore actúa como base de datos principal.
- La autorización se apoya en la colección `users`.
- La interfaz se organiza como dashboard administrativo con módulos en evolución.

# Estructura del proyecto

- `index.html`: estructura principal de la interfaz.
- `js/main.js`: orquestación de UI, autenticación, carga de datos y eventos.
- `js/firebase.js`: inicialización única de Firebase y exportación de instancias compartidas.
- `js/auth.js`: flujo de autenticación con Firebase Authentication.
- `js/data/users.js`: capa de datos de usuarios.
- `js/data/servers.js`: capa de datos de servidores.
- `js/data/chapels.js`: capa de datos de capillas.
- `js/session.js`: estado de sesión y rol actual.
- `docs/PROJECT_CONTEXT.md`: contexto funcional y técnico del proyecto.

# Modelo de datos

- `users`
  - `id`
  - `uid`
  - `email`
  - `displayName`
  - `role`
  - `chapelId`
  - `active`
  - `status`
  - `createdAt`
  - `updatedAt`
  - `lastLogin`

- `servers`
  - `id`
  - `Nome`
  - `Data_nascimento`
  - `Idade`
  - `Sexo`
  - `Capela`
  - `Tipo`
  - `Estado`
  - `Horario_estudo`
  - campos sacramentales, familiares y de contacto

- `chapels`
  - `id`
  - `name`
  - `active`
  - campos adicionales futuros según evolución del módulo

# Estado actual del proyecto

## M1

- Base inicial del dashboard.
- Conexión con Firebase.
- Visualización principal de servidores.

## M2

- Carga de datos desde Firestore.
- Renderizado de tabla, KPIs y gráficos.
- Soporte de filtros y paginación.

## M3

- Gestión manual y masiva de servidores.
- Formularios de edición y carga CSV.
- Consolidación del flujo principal del dashboard.

## M4

- Ajustes de UI administrativa.
- Mejoras de interacción y mantenimiento del panel.

## M5

- Modularización progresiva de la capa de datos.
- Separación de responsabilidades por dominio.
- Preparación del sistema para crecimiento funcional.

## M6

- CRUD de usuarios.
- Roles `admin`, `coordinator` y `viewer`.
- Asociación usuario-capilla.
- Vinculación automática de UID entre Firebase Authentication y Firestore.
- Login administrativo.
- Gestión de estado de usuarios (`pending`, `active`, `disabled`).
- Modal unificado para crear y editar usuarios.
- Selector dinámico de capillas.
- Caché de capillas para el formulario de usuarios.
- Navegación lateral base para expansión modular.

# Decisiones de arquitectura

- Mantener el proyecto simple y sin frameworks innecesarios.
- Usar JavaScript modular con una responsabilidad clara por archivo.
- Centralizar el acceso a Firestore en módulos de datos.
- Reutilizar una única inicialización de Firebase.
- Mantener la UI responsive con Tailwind.
- Evitar mezclar múltiples objetivos en una misma tarea.
- Priorizar código reutilizable, legible y fácil de mantener.
- Conservar compatibilidad temporal mientras avanza la migración de datos.

# Próximo módulo (M7)

## M10-T4.4 — Encontros

- Encontros se almacenan de forma contextual bajo `formations/{formationId}/poles/{poleId}/encounters/{encounterId}`.
- La asignación de sustitutos y la gestión de responsables se restringen temporalmente a administradores en las Security Rules. Los coordinators de Polo no pueden listar perfiles globales para seleccionar sustitutos externos ni modificar `responsibilities` o `coordinatorIds` directamente. Esta limitación responde a que las Rules actuales de `users` no permiten un listado global controlado de coordinators y será revisada en una etapa posterior.

## M10-T4.5 — Participantes

- Los participantes son contextuales a Encounter y usan `participants/{serverId}` con snapshot mínimo, `addedBy` y asistencia inicial `pending`.
- La edad se calcula desde `Data_nascimento` en la fecha local de `Encounter.startAt`; `Tipo` Instituído mapea a permanente y Candidato/Formando a inicial.
- La generación es aditiva, respeta `participantExclusions`, y la inclusión manual excepcional elimina la exclusión previa. Responsable efectivo y substitute tienen solo lectura; presencia queda para T4.6.
- La composición estructural de Participants es exclusiva de `scheduled`. Antes de iniciar un Encounter debe existir al menos un Participant; una vez en `in_progress`, `completed` o `cancelled` no se pueden generar, añadir ni remover Participants.

- Migración de `Capela` a `capela_id` / `chapelId` en los flujos pendientes.
- Eliminación del acceso anónimo heredado del proyecto base.
- Permisos completos por rol en autenticación, autorización e interfaz.

## M10-T4.6 — Presenças

- A assistência permanece em `participants/{serverId}`: `pending`, `present`, `absent` ou `justified`, sem coleção paralela.
- `justified` exige `attendanceNote` não vazia após trim e limitada a 500 caracteres; notas são opcionais para presente e ausente.
- Cada alteração não pendente grava o último `recordedBy` e `recordedAt`; o reset para `pending` remove nota e auditoria ativa.
- O registro é operacional apenas em `in_progress` para Admin, coordenador do Polo e responsável efetivo do Encounter. Em `completed`, apenas Admin corrige; `scheduled` e `cancelled` bloqueiam escrita.
- Substituto confirmado opera somente o Encounter cujo UID integra `coordinatorIds`; não adquire acesso ao Polo ou a outros encontros.
- Para manter `coordinatorIds` como projeção segura de autorização, um coordenador do Polo só cria Encounter autoatribuído; atribuições adicionais e substitutos exigem Admin.
- Perfis canônicos com `active !== true` não entram no shell protegido: a sessão Firebase é encerrada antes de inicializar Dashboard ou Formações.
- O Dashboard possui ciclo explícito `idle`/`loading`/`loaded`/`error`; o primeiro snapshot libera a primeira renderização de dados, e o cleanup de sessão cancela listeners, destrói gráficos e limpa dataset, filtros e paginação.
- Coordinator ativo não atribuído continua sendo um ator válido somente para leituras permitidas; `role == coordinator` sem atribuição contextual não concede permissões operacionais.

## M7-T1

- La autorización dejó de depender del estado `isAdmin`.

- Se introdujo una infraestructura basada en roles y capacidades
(`ROLE_CAPABILITIES`), manteniendo compatibilidad temporal con el
administrador definido por correo electrónico.

- El siguiente paso (M7-T2) reemplazará esa compatibilidad leyendo
los roles desde Firestore (`users/{uid}`).

## M7-T2 — Resolución del perfil autenticado

Se actualizó el flujo de resolución del perfil de usuario para utilizar el UID de Firebase Authentication como fuente principal de búsqueda en la colección `users`.

### Nuevo flujo

1. Buscar el usuario por `uid`.
2. Si existe, utilizar ese perfil.
3. Si no existe, buscar por `email`.
4. Si el usuario existe por email y aún no tiene un UID vinculado, asociar automáticamente el UID mediante `linkUserUid()`.
5. Releer el documento actualizado y devolver el perfil definitivo.
6. Si el usuario no existe en Firestore, cerrar la sesión y devolver `null`.

### Decisión arquitectónica

- El `uid` pasa a ser la fuente principal de identidad.
- El `email` queda únicamente como mecanismo de migración y compatibilidad.
- La autenticación permanece desacoplada de la resolución del perfil, manteniendo la separación entre `auth.js`, `users.js`, `session.js` y `permissions.js`.


## M7-T3 — Centralización de la inicialización de la sesión

Se eliminó la duplicación existente en la resolución del perfil autenticado.

### Cambios realizados

- Se eliminó `resolveAuthenticatedProfile()` de `main.js`.
- La resolución del perfil pasa a utilizar exclusivamente `resolveUserProfile()` definida en `js/data/users.js`.
- La inicialización de la sesión mantiene el mismo comportamiento funcional, pero ahora depende de una única implementación para resolver el perfil del usuario autenticado.

### Decisión arquitectónica

La resolución del perfil autenticado queda centralizada en `users.js`, eliminando duplicaciones y consolidando una única fuente de mantenimiento para esta responsabilidad.

### Flujo de autenticación

```
Firebase Authentication
        ↓
auth.js
        ↓
resolveUserProfile()
        ↓
session.js
        ↓
permissions.js
        ↓
UI
```

## M7-T5A – Migración automática users/{email} → users/{uid}

Se consolidó el UID de Firebase Authentication como identificador canónico de cada usuario en Firestore. El cambio elimina la dependencia operativa del email como ID de documento y alinea el perfil con la identidad autenticada.

### Nuevo flujo

1. `resolveUserProfile()` lee primero `users/{uid}`.
2. Si no existe, comprueba temporalmente el documento legacy `users/{email}`.
3. Cuando el documento legacy autorizado tiene `uid = null`, una transacción crea `users/{uid}` copiando todos sus campos, establece únicamente el UID y elimina `users/{email}` en la misma operación lógica.
4. El perfil se vuelve a leer desde `users/{uid}` antes de iniciar la sesión.

### Compatibilidad temporal y acceso

- Los administradores continúan creando usuarios en `users/{email}` con `uid = null` hasta que se actualice el flujo de alta.
- Un email autenticado que no tenga un documento previamente autorizado en Firestore se cierra mediante `signOut()` y la resolución devuelve `null`.
- Se eliminó el perfil temporal `guest`: no se crean perfiles ni usuarios automáticamente durante el inicio de sesión.
- La migración no modifica `email`, `displayName`, `role`, `chapelId`, `active`, `status`, `createdAt` ni `updatedAt`; solamente establece `uid` y cambia el ID del documento.

### Estabilización del inicio autenticado

- Se eliminó la autenticación anónima del inicio de la aplicación y de los scripts de migración.
- Sin una sesión persistente, la aplicación muestra únicamente el login y no resuelve perfiles, carga datos ni mantiene listeners de Firestore.
- Al cerrar sesión se cancela el listener activo de servidores y se vuelve a la pantalla de login.

## M7-T5B – Corrección de la migración con UID ya vinculado

Se incorporó el caso de documentos legacy cuyo campo `uid` ya coincide con el UID autenticado, pero cuyo documento canónico `users/{uid}` todavía no existe.

- Si `users/{uid}` existe, se devuelve sin cambios.
- Si existe `users/{email}` y su `uid` está vacío o coincide con el UID autenticado, se consolida mediante la misma transacción hacia `users/{uid}` y se elimina el documento legacy.
- Si el `uid` legacy pertenece a otro usuario, el acceso se rechaza y se cierra la sesión.

## M8-T1 – Integración inicial de Google Sign-In

Se añadió autenticación mediante Google como alternativa temporal al acceso por Email/Password.

- `auth.js` expone `loginWithGoogle()` usando `GoogleAuthProvider` y `signInWithPopup()`.
- El login presenta el botón “Continuar com Google” junto al flujo existente de Email/Password.
- Ambos métodos delegan la inicialización de la sesión en el mismo `onAuthStateChanged()`; no se duplica la resolución de perfil, permisos ni carga del dashboard.
- El modelo `users/{uid}`, las reglas de Firestore y los permisos permanecen sin cambios.

## M8-T2 – Reglas de migración users/{email} → users/{uid}

Las reglas de Firestore se ajustaron para permitir exclusivamente la migración automática del perfil propio.

- El administrador conserva acceso total a `users`.
- Un usuario autenticado puede leer su documento canónico y, temporalmente, el documento legacy cuyo ID coincide con su email autenticado.
- La creación de `users/{uid}` propia solo se permite si existe ese legacy, su UID está vacío o coincide con la sesión y el nuevo documento cambia únicamente `uid`.
- La eliminación de `users/{email}` solo se permite en la misma transacción que crea el documento canónico equivalente, validada mediante `getAfter()`.
- Las actualizaciones de perfiles continúan siendo exclusivas de administrador. La estructura deja aislados los helpers de identidad para incorporar `authorizedUsers` en una tarea futura.

## M7-T4 – Consolidación del sistema de permisos

Se realizó una auditoría de `main.js` para garantizar que todas las decisiones de autorización utilicen exclusivamente la API pública de `permissions.js`.

### Cambios realizados

- Se verificó que todas las comprobaciones de permisos utilizan las funciones públicas de `permissions.js`.
- Se eliminaron comprobaciones heredadas o redundantes, cuando existían.
- Se mantuvo el comportamiento funcional de la aplicación.

### Decisión arquitectónica

`permissions.js` queda consolidado como el único módulo responsable de decidir las capacidades del usuario según su rol. Ningún otro módulo debe implementar lógica propia de autorización.

## M8-T1 — Autorización por capilla

Se creó `authorization.js` para centralizar las decisiones de escritura por registro. La implementación inicial de filtrado de lectura fue reemplazada: el dataset no se filtra por `chapelId`.

`permissions.js` define las capacidades por rol y `authorization.js` valida el ámbito de la operación sobre cada servidor.

## M8-T2 — Restricción de escritura por capilla

Se extendió el sistema de autorización para proteger todas las operaciones de escritura.

### Cambios realizados

- Las operaciones de edición requieren `canEdit(server)`.
- Las operaciones de eliminación requieren `canDelete(server)`.
- Los coordinadores crean registros asociados automáticamente a su propia capilla.
- `chapelId` es el único identificador usado para autorizar escrituras.

### Decisión arquitectónica

La lectura no depende de la capilla. `permissions.js` determina las capacidades del rol y `authorization.js` determina el ámbito de escritura sobre cada registro.

## M8-T3 — Dashboard parroquial

Se realizó una auditoría completa del dashboard para garantizar que todos los componentes visuales utilicen el dataset completo de la parroquia.

### Cambios realizados

- La tabla, KPIs, gráficos, búsquedas y filtros utilizan el dataset completo.
- La creación, edición, eliminación y cambio de capilla se autorizan antes de escribir.

### Decisión arquitectónica

La autorización no recorta la visibilidad. Cada acción de escritura consulta las funciones de `authorization.js`, evitando que la interfaz replique reglas por rol o capilla.

## M8-MIG-T2 — Migración de chapelId

Se ejecutó una migración automática sobre la colección de servidores para incorporar el campo `chapelId` a todos los documentos existentes.

### Cambios realizados

- Se reutilizó el script `scripts/migrate_chapel_ids.js`.
- La migración utiliza `writeBatch()` para actualizar únicamente el campo `chapelId`.
- No se modificó ningún otro dato de los documentos.
- La auditoría posterior confirmó que todos los servidores disponen de `chapelId`.

### Decisión arquitectónica

`chapelId` pasa a ser el identificador canónico para la autorización y futuras consultas. El campo heredado `Capela` permanece temporalmente por compatibilidad y como dato descriptivo, pero deja de ser la base para la lógica de autorización.

## M8-MIG-T3 — Consolidación de `chapelId`

Se consolidó `chapelId` como identificador canónico para todas las decisiones de autorización del sistema.

### Cambios realizados

- La autorización utiliza exclusivamente `chapelId`.
- Se eliminó la dependencia del campo heredado `Capela` para validar el ámbito de acceso.
- `Capela` permanece únicamente como dato descriptivo y de compatibilidad temporal.

### Decisión arquitectónica

El sistema distingue entre:

- **Identificadores canónicos** (`chapelId`), utilizados para autorización y consultas.
- **Datos descriptivos** (`Capela`), utilizados únicamente para la presentación y la compatibilidad con procesos heredados.

Esta separación simplifica el modelo de autorización y prepara el proyecto para implementar consultas filtradas y Firestore Security Rules.

## M8-T4A — Revisión del modelo de consultas

Se revisó la estrategia de consultas a Firestore tras redefinir el modelo de autorización.

### Decisión arquitectónica

La visibilidad de los servidores deja de depender de la capilla. Todos los usuarios autenticados y activos pueden consultar la colección completa de servidores.

La autorización por `chapelId` se aplica exclusivamente a las operaciones de creación, edición, activación/inactivación y eliminación mediante `authorization.js` y, posteriormente, mediante las Firestore Security Rules.

### Motivación

El SGSA incorpora casos de uso pastorales (cursos, encuentros, listas de presencia y actividades intercapillas) que requieren consultar servidores de toda la parroquia sin otorgar permisos de modificación fuera del ámbito propio del usuario.

## M8-T4B — Firestore Security Rules

Se implementaron reglas de seguridad alineadas con el modelo de autorización del SGSA.

### Principios

- La autorización ya no depende del email del usuario.
- El documento `users/{uid}` define el rol, el estado (`active`) y el `chapelId`.
- Las operaciones de escritura sobre `servers` respetan el ámbito de la capilla.
- Solo los administradores pueden eliminar servidores.
- Todos los usuarios autenticados y activos pueden consultar la colección de servidores.

### Defensa en profundidad

El cliente continúa validando permisos mediante `permissions.js` y `authorization.js`, mientras que Firestore aplica las mismas restricciones en el servidor para impedir accesos o modificaciones no autorizadas.

## M8-T3A – Consolidación del modelo de autorización

`users/{uid}` es la única fuente de verdad de autorización. El rol se obtiene exclusivamente de `profile.role`; no se utilizan emails especiales ni `resolveRoleFromLegacyAdminEmail()` para decidir permisos.

Todos los usuarios activos (`admin`, `coordinator` y `viewer`) consultan el dataset completo de servidores, incluidos dashboard, gráficos, búsquedas y filtros. No se filtra el dataset por `chapelId`.

`chapelId` limita solamente las operaciones de escritura:

- **Admin:** puede crear, editar, eliminar y cambiar la capilla de cualquier servidor; también administra usuarios y capillas.
- **Coordinator:** puede crear servidores de su capilla y editar solo servidores cuyo `server.chapelId` coincide con `profile.chapelId`. No puede eliminar ni cambiar `chapelId`.
- **Viewer:** solo consulta datos; no puede modificar registros.

`authorization.js` expone las decisiones por registro (`canEdit(server)`, `canDelete(server)`, `canCreateServer(chapelId)` y `canChangeChapel(server, chapelId)`). La interfaz las aplica en los controles y antes de cada escritura, mientras que las Firestore Security Rules mantienen la misma restricción en el servidor.

# Estado del proyecto – RC v0.8.0

## Estado general

El proyecto alcanzó una versión candidata para producción (Release Candidate).

La arquitectura de autenticación, autorización y gestión de servidores fue estabilizada antes del despliegue en Vercel.

---

## Mejoras implementadas

### Autenticación

- Login rediseñado.
- Google Sign-In como método principal.
- Acceso por Email/Senha como opción secundaria.
- Eliminado el concepto de "Acesso de administrador".

---

### Autorización

- Roles consolidados:
  - Admin
  - Coordinator
  - Viewer

- Header dinámico según el rol.

---

### Gestión de Servidores

Formulario actualizado con:

- Nome do tutor
- WhatsApp do tutor

Corrección de carga de Data_nascimento durante la edición.

Campo Horário de estudo convertido a selección múltiple.

Compatibilidad con registros antiguos.

---

### Teléfonos

Se centralizó el tratamiento de teléfonos mediante funciones reutilizables:

- normalizePhone()
- formatPhone()
- isValidPhone()

Aplicadas en:

- creación
- edición
- importación CSV

---

### Edad

La edad dejó de almacenarse como dato principal.

Nueva política arquitectónica:

La única fuente de verdad es Data_nascimento.

calculateAge() pasa a ser el mecanismo oficial para obtener la edad.

Compatibilidad temporal con el campo legado Idade.

Aplicado en:

- formularios
- tabla
- dashboard
- KPIs
- gráficos

---

## Estado arquitectónico

La versión RC se considera estable.

El siguiente gran objetivo será:

M9 – Application Shell

## M9-T1 — Blueprint del Application Shell

Se definió el Blueprint oficial del Application Shell en `docs/M9_APPLICATION_SHELL_BLUEPRINT.md`.

El Blueprint establece la transición del SGSA desde una página única hacia una aplicación modular con una infraestructura persistente: Header, Sidebar y Workspace, con un Footer reservado para el futuro. Durante la navegación solo cambia el contenido del Workspace y no existen recargas de página.

La arquitectura objetivo incorpora responsabilidades separadas para `layout/`, `navigation/router.js` y los directorios de `modules/`. La navegación se determina por rol y oculta los módulos no autorizados; sus permisos son independientes de las autorizaciones internas de cada módulo.

El documento también define los principios de bajo acoplamiento, alta cohesión, fuente única de verdad y separación entre UI y reglas de negocio, además del roadmap M9-T1 a M9-T6 para su implementación progresiva.

## M9-T2 — Layout del Application Shell

Se implementó la infraestructura visual inicial del Application Shell: Header persistente, Sidebar estático y Workspace. El Dashboard existente se conserva sin cambios funcionales y se renderiza dentro de `#workspace`.

El Header mantiene las acciones globales existentes y presenta la información de sesión disponible (foto o iniciales, nombre, rol y capilla). El Sidebar muestra los módulos definidos por el Blueprint como enlaces estáticos; no realiza navegación ni aplica visibilidad por rol todavía. Esa responsabilidad queda explícitamente reservada para M9-T5.

Se añadió la estructura base en `js/layout/`, `js/navigation/` y `js/modules/`. Los módulos funcionales, Firebase, autenticación, permisos, Firestore y la lógica del Dashboard permanecen sin cambios.

## M9-T2A — Sidebar configurable

La definición de los módulos visibles del Sidebar fue centralizada en `js/navigation/navigation.config.js`, organizada en las secciones GERAL, FORMAÇÃO y ADMINISTRAÇÃO. `sidebar.js` renderiza esas secciones desde la configuración y mantiene los enlaces como elementos estáticos sin navegación funcional.

El Sidebar incorpora además un pie con la identificación SGSA y la versión `v0.8.0`. No se modificaron Router, permisos por rol ni módulos funcionales; esas responsabilidades continúan fuera del alcance de esta tarea.

## M9-T2B — Guía oficial de interfaz

Se creó `docs/UI_GUIDELINES.md` como referencia obligatoria de interfaz y consistencia visual para los módulos futuros del SGSA. El documento audita y consolida los patrones existentes de Application Shell, colores, tipografía, botones, formularios, tablas, cards, modales, estados, iconografía, responsive design y accesibilidad.

La guía registra además las pendientes de estandarización detectadas durante la auditoría, sin corregirlas ni ampliar el alcance. Esta tarea no realizó cambios de código en HTML, CSS, JavaScript, Firebase, Firestore, autenticación, permisos ni Application Shell.

## M9-T3 — Dashboard como módulo oficial

El Dashboard pasa a ser el módulo de referencia para la evolución modular del SGSA. Su estructura en `js/modules/dashboard/` separa punto de entrada, controlador, estado, servicio de datos, vistas y componentes reutilizables.

`main.js` inicia el ciclo de vida del Dashboard a través de su API pública. La suscripción de datos y el estado del módulo se centralizan en el Dashboard, manteniendo sin cambios las funcionalidades, permisos, autenticación y acceso a Firestore existentes.

## M9-T3B.1 — Fuente única de datos del Dashboard

Se eliminó la suscripción legacy de `main.js`. El Dashboard obtiene ahora sus datos exclusivamente mediante `js/modules/dashboard/services/dashboard.service.js`, coordinado por el controller del módulo. Esta consolidación evita suscripciones y renders duplicados sin modificar KPIs, gráficos, tabla, filtros, permisos, autenticación ni el comportamiento observable de la interfaz.

## M9-T3B.2 — Estado único del Dashboard

Se consolidó el estado propio del Dashboard en `js/modules/dashboard/state.js`, organizado por datos, filtros, paginación, gráficos, UI y suscripciones. `main.js` dejó de declarar referencias de gráficos y variables de paginación; estas se resuelven desde el estado centralizado. El controller accede a los datos mediante la API de `state.js`.

## M10-T4.1 — Foundation do módulo Formação

Foi criada a estrutura inicial em `js/modules/formation/`, com `index.js`, `controller.js` e `state.js`. A única API pública do módulo é `initialize()`, `refresh()` e `destroy()`; `main.js` integra somente esse ciclo de vida ao Shell.

O módulo possui uma fonte única de estado preparada para dados, filtros, navegação, permissões, interface e subscriptions. Nesta etapa não há operações Firestore, CRUD, serviços funcionais ou regras de negócio de Formação. Essas funcionalidades permanecem para as etapas posteriores.

## M10-T4.2 — CRUD de Formações

Foi implementado o CRUD inicial da entidade `Formation` na coleção `formations/{formationId}`. O módulo agora inclui `services/formation.service.js` para acesso ao Firestore e `views/formation.view.js` para listagem, filtros, formulário, detalhes e ações de status.

Os filtros permanecem centralizados no Controller, o estado continua sendo a única fonte de verdade do módulo e a subscription é controlada pelo ciclo de vida. O status utiliza as transições aprovadas: `draft → active/archived`, `active → completed/archived`, `completed → archived` e `archived → archived`.

As regras mínimas de Firestore permitem leitura a usuários ativos e escrita somente a administradores, com validação do schema e dos campos de auditoria. Coordenadores permanecem em leitura até que a responsabilidade contextual por Polo seja implementada. Polos, encontros, participantes, presenças, exportações e estatísticas continuam fora do escopo.
