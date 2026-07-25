# Changelog

Este archivo registra los cambios relevantes entre versiones del proyecto.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [v0.6.0] - Fin de M6

### Añadido

- CRUD completo de usuarios.
- Gestión de roles (admin, coordinator, viewer).
- Asociación usuario-capilla.
- Vinculación automática UID.
- Login administrativo.
- Gestión de estado de usuarios.
- CRUD de capillas.
- Selector dinámico de capillas.
- Caché en memoria para capillas.

### Corregido

- Restauración del flujo `resolveAuthenticatedProfile()`.
- Corrección del filtro de capillas.
- Restauración del modo creación de usuarios.
- Corrección de la carga de capillas en el formulario de usuarios.

### Mejorado

- Arquitectura de autenticación.
- Organización de módulos.
- Documentación técnica del proyecto.

## M8.1 – UI Stabilization

### Added
- Role-based header.
- Contacts column separated from actions.
- WhatsApp link for server, mother, father and guardian.
- Coordinator creation limited to own chapel.

### Changed
- Removed legacy administrator login flow.
- Permissions now depend exclusively on users/{uid}.
- Actions rendered per server according to role and chapel.

### Fixed
- Header visibility by role.
- Coordinator action visibility.
- UI aligned with Firestore authorization rules.

## [v0.8.0] - Release Candidate

### Added

- Login renovado.
- Tutor/Responsable legal.
- WhatsApp del servidor.
- Horario de estudio mediante selección múltiple.
- Normalización centralizada de teléfonos.
- calculateAge() en utils.js.

### Changed

- Edad calculada automáticamente desde Data_nascimento.
- Header por rol.
- Tabla separada en Contactos y Acciones.
- Login centrado en Google.

### Fixed

- Fecha de nacimiento durante edición.
- Compatibilidad con registros antiguos.
- Carga de teléfonos.
- Horario de estudio legado.