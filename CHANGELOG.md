# Changelog

Este archivo registra los cambios relevantes entre versiones del proyecto.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

## [v0.10.0] — Release candidate

### Added

- M13–M16: módulos Servidores/Usuários/Capelas, CSV reversível, ficha e histórico M16 e listas paginadas.
- Formação v2: grupos reutilizáveis, critérios, roster/lista-base, Participants automáticos, Encounter/Presença responsivos e relatório M11.
- Lifecycle de Formação `draft`, `active`, `completed` e `archived`.
- M15: acesso por e-mail/senha por `sendUserAccess`, mantendo Google Sign-In.

### Changed

- Dashboard e Meus encontros usam somente Formações active; completed/archived são consulta conforme contrato.
- Vocabulario operacional usa Grupo de formação, preservando `pole` como termo técnico.

### Security

- Logs de sessão/perfil sensíveis removidos.
- Política de leitura pastoral global documentada; CSV completo permanece Admin-only.

### Fixed

- Auditoria pré-produção: dados legacy tolerados classificados corretamente e perfil administrativo histórico removido controladamente.

### Documentation

- Release candidate, schema, arquitetura, operação local e dívida técnica pré-produção atualizados.

> Candidate somente: tag, push e deploy de v0.10.0 continuam pendentes.

### Añadido

- M11: vista contextual de reporte operacional de Encounter e impresión A4 mediante el diálogo nativo del navegador.
- Variantes para estados agendado, en curso, concluido y cancelado; resumen local para presencia cuando corresponde.
- M12: Sidebar colapsable a iconos en desktop y drawer accesible en tablet/móvil, con overlay, Escape y gestión de foco.
- Menú de cuenta accesible para sesión, gestión de usuarios (Admin) y cierre de sesión.

### Cambiado

- El detalle de Encounter permite abrir el reporte, que espera el snapshot de Participants y ordena por capilla y servidor.
- Header simplificado y acciones legacy reubicadas en su contexto: `Novo Servidor` permanece en Dashboard y `Usuários` reutiliza su modal existente.
- La navegación sólo presenta destinos funcionales; el estado activo se deriva del módulo real.

### Seguridad

- El reporte no muestra UID ni campos de auditoría; responsables sin nombre resoluble se omiten.
- M12 no modifica Rules, modelo de datos ni verificaciones de cliente existentes.

> M12 fue validado funcionalmente. Permanece sin nueva versión formal, tag, push o despliegue.

## [v0.9.0] — 2026-08-21

### Añadido

- Shell de aplicación y Dashboard modular.
- Módulo Formation: Formations, Polos, Encounters, Participants y Attendance.
- Consulta contextual de presencias de Encounter concluido.
- Breadcrumbs, conteo inicial de Polos y mejoras UX de jerarquía, tablas y attendance.
- Seeds locales para Firebase Emulator.

### Cambiado

- Autorización contextual de Formation respaldada por Firestore Rules y pruebas de regresión.
- Dashboard, sesión y navegación modular estabilizados.

### Corregido

- Consistencia de credenciales entre los seeds locales de Admin y Polos.

> Esta entrada formaliza v0.9.0 en el repositorio. El tag sigue pendiente de creación; no representa push ni despliegue de producción.

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
