# Objetivo del proyecto

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

- Migración de `Capela` a `capela_id` / `chapelId` en los flujos pendientes.
- Eliminación del acceso anónimo heredado del proyecto base.
- Permisos completos por rol en autenticación, autorización e interfaz.

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
6. Si el usuario no existe en Firestore, devolver un perfil temporal con rol `guest` y sin permisos.

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

## M7-T4 — Consolidación del sistema de permisos

Se realizó una auditoría de `main.js` para garantizar que todas las decisiones de autorización utilicen exclusivamente la API pública de `permissions.js`.

### Cambios realizados

- Se verificó que todas las comprobaciones de permisos utilizan las funciones públicas de `permissions.js`.
- Se eliminaron comprobaciones heredadas o redundantes, cuando existían.
- Se mantuvo el comportamiento funcional de la aplicación.

### Decisión arquitectónica

`permissions.js` queda consolidado como el único módulo responsable de decidir las capacidades del usuario según su rol. Ningún otro módulo debe implementar lógica propia de autorización.

## M8-T1 — Autorización por capilla

Se introdujo un nuevo módulo `authorization.js` encargado de aplicar el ámbito de acceso del usuario autenticado sobre los datos de servidores.

### Cambios realizados

- Se creó `js/authorization.js`.
- Se implementó `filterAuthorizedServers(dataset)`.
- Se implementó `canAccessServer(server)`.
- `main.js` utiliza el dataset autorizado antes de actualizar la interfaz.
- La autorización mantiene compatibilidad temporal entre `chapelId` y el campo heredado `Capela`.

### Decisión arquitectónica

Se separa la autorización del sistema de permisos.

- `permissions.js` define **qué acciones** puede realizar un usuario según su rol.
- `authorization.js` define **sobre qué registros** puede actuar ese usuario según su ámbito (`chapelId`).

Esta separación evita que la interfaz implemente lógica de seguridad y establece una única fuente de verdad para la autorización de registros.

## M8-T2 — Restricción de escritura por capilla

Se extendió el sistema de autorización para proteger todas las operaciones de escritura.

### Cambios realizados

- Las operaciones de edición requieren `canEdit()` y `canAccessServer(server)`.
- Las operaciones de eliminación requieren `canDelete()` y `canAccessServer(server)`.
- Los coordinadores crean registros asociados automáticamente a su propia capilla.
- Se mantiene compatibilidad temporal con el campo heredado `Capela`.

### Decisión arquitectónica

La autorización de escritura reutiliza la misma lógica que la autorización de lectura. No se introducen reglas duplicadas: `permissions.js` determina las capacidades del usuario y `authorization.js` determina el ámbito de los registros sobre los que puede actuar.

## M8-T3 — Dashboard contextual

Se realizó una auditoría completa del dashboard para garantizar que todos los componentes visuales utilicen exclusivamente el dataset autorizado generado por `authorization.js`.

### Cambios realizados

- Se verificó que la tabla utiliza únicamente el dataset autorizado.
- Se verificó que los KPIs utilizan únicamente el dataset autorizado.
- Se verificó que los gráficos utilizan únicamente el dataset autorizado.
- Se verificó que los filtros se generan únicamente con el dataset autorizado.
- Se verificó que las exportaciones visibles respetan el ámbito de autorización del usuario.

### Decisión arquitectónica

La autorización se aplica una única vez al conjunto de datos mediante `authorization.js`. Todos los componentes de la interfaz consumen ese dataset autorizado, evitando duplicar lógica de seguridad y garantizando un comportamiento consistente para todos los roles.