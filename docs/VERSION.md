# SGSA

Sistema de Gestão dos Servidores do Altar

---

## Estado actual

**Versión:** v0.8.0

**Estado:** Stable

**Fecha:** 24 de julio de 2026

---

## Milestone completado

**M8.1 – UI Stabilization**

Release Candidate v0.8.0

Completado

---

## Arquitectura

**Estado:** Estable

Componentes estabilizados:

- Firebase Authentication
- Google Sign-In
- Firestore
- Firestore Rules
- Roles
- Authorization
- Header por rol
- Gestión de Servidores
- Dashboard
- Formularios
- Importación CSV

---

## Modelo de datos

**Estado:** Estable

Principios:

- `users/{uid}` como identidad oficial.
- `profile.role` como única fuente del rol.
- `Data_nascimento` como fuente de verdad para la edad.
- Teléfonos normalizados.
- Compatibilidad con datos legados.

---

## Funcionalidades disponibles

### Autenticación

- Login Google
- Login Email/Senha
- Logout

### Gestión

- Crear servidor
- Editar servidor
- Eliminar (solo administrador)

### Dashboard

- KPIs
- Gráficos
- Búsqueda
- Filtros
- Paginación

---

## Roles

### Admin

- Acceso completo.

### Coordinator

- Lectura de toda la parroquia.
- Escritura únicamente en su capilla.

### Viewer

- Solo lectura.

---

## Próximo Milestone

**M9 – Application Shell**

Objetivos principales:

- Header definitivo.
- Sidebar.
- Workspace.
- Navegación modular.
- Shell responsive.

---

## Estado del proyecto

| Área | Estado |
| --- | --- |
| Arquitectura | ✅ Estable |
| Base de datos | ✅ Estable |
| Autenticación | ✅ Estable |
| Autorización | ✅ Estable |
| Gestión de servidores | ✅ Estable |
| Dashboard | ✅ Estable |
| Documentación | ✅ Actualizada |
| Deploy Vercel | ⏳ Pendiente |

---

## Documentación oficial

### [SGSA_ARCHITECTURE.md](SGSA_ARCHITECTURE.md)

Arquitectura permanente.

### [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)

Estado actual del desarrollo.

### [DATABASE.md](DATABASE.md)

Modelo de datos.

### [CHANGELOG.md](../CHANGELOG.md)

Historial de cambios.

### [ROADMAP.md](../ROADMAP.md)

Plan de evolución.

### [PROJECT_HANDOFF.md](../PROJECT_HANDOFF.md)

Continuidad entre sesiones.

### [VERSION.md](VERSION.md)

Resumen ejecutivo del estado del proyecto.

---

## Observaciones

Este documento debe actualizarse únicamente cuando cambie la versión estable del sistema o se complete un nuevo milestone.

No registrar aquí cambios menores ni historial de desarrollo.
