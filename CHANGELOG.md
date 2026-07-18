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
