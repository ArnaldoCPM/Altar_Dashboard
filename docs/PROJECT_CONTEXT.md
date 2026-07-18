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
