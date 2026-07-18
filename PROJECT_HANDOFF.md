# SGSA – PROJECT HANDOFF

**Versión:** v0.6.0  
**Fecha:** 2026-07-17  
**Estado:** M6 Finalizado

---

# Objetivo de este documento

Este documento sirve como punto de continuidad del proyecto entre conversaciones de ChatGPT y como referencia rápida para retomar el desarrollo sin perder contexto.

No sustituye la documentación técnica del proyecto (`MASTER_PROJECT.md`) ni el contexto del proyecto (`docs/PROJECT_CONTEXT.md`).

---

# Estado general del proyecto

Al finalizar M6:

- ✅ Sin errores críticos conocidos.
- ✅ Gestión de usuarios completamente funcional.
- ✅ Gestión de capillas completamente funcional.
- ✅ Dashboard estable.
- ✅ Documentación actualizada.
- ✅ Proyecto preparado para comenzar M7.

Versión actual:

**v0.6.0**

---

# Estado de Git

**Rama principal de desarrollo**

```
develop
```

**Tag de versión**

```
v0.6.0
```

Este tag representa el cierre oficial del módulo M6.

---

# Documentación disponible

| Documento | Propósito |
|-----------|-----------|
| `MASTER_PROJECT.md` | Arquitectura técnica del sistema |
| `docs/PROJECT_CONTEXT.md` | Estado actual del proyecto |
| `CHANGELOG.md` | Historial de versiones |
| `ROADMAP.md` | Planificación del proyecto |

---

# Arquitectura actual

## Frontend

- HTML5
- CSS3
- JavaScript (ES Modules)

## Backend

- Firebase Authentication
- Cloud Firestore

## Hosting

- Vercel

---

# Flujo de autenticación

Actualmente el sistema utiliza el siguiente flujo:

```
Firebase Authentication
        │
        ▼
resolveAuthenticatedProfile()
        │
        ├── getUserByUid()
        ├── getUserByEmail()
        ├── linkUserUid()
        └── placeholder (si no existe)
```

---

# Roles existentes

El sistema implementa tres roles:

- **admin**
  - Acceso completo.

- **coordinator**
  - Gestión de los servidores pertenecientes a su capilla.

- **viewer**
  - Acceso de solo lectura (base para futuras ampliaciones).

---

# Módulos finalizados

## M1

Arquitectura inicial del proyecto.

## M2

Sistema de permisos.

## M3

Gestión de servidores.

## M4

Gestión de capillas.

## M5

Migración completa a Firebase Firestore.

## M6

Gestión de usuarios.

Incluye:

- CRUD de usuarios.
- Roles.
- Asociación usuario ↔ capilla.
- Vinculación automática UID.
- Login administrativo.
- Gestión de estado (activo/inactivo).
- Selector dinámico de capillas.
- Caché de capillas.

---

# Deuda técnica

Pendientes para próximas versiones:

- Migración definitiva:

```
Capela
    ↓
capela_id
```

- Eliminar definitivamente el acceso anónimo.
- Completar permisos por rol.
- Revisar reglas de seguridad de Firestore.

---

# Objetivo de M7

Orden previsto de trabajo:

1. Migración completa a `capela_id`.
2. Revisión del modelo de datos.
3. Eliminación del acceso anónimo.
4. Autenticación obligatoria.
5. Implementación completa de permisos por rol.
6. Revisión de reglas de Firestore.

---

# Metodología de trabajo

Durante el desarrollo del SGSA seguiremos estas reglas:

1. Analizar la tarea antes de modificar el código.
2. Dividir el trabajo en tareas pequeñas.
3. Implementar únicamente una tarea por vez.
4. Probar completamente cada tarea.
5. Realizar un commit al finalizar una tarea estable.
6. Mantener la documentación sincronizada con el código.
7. Evitar mezclar refactorizaciones con nuevas funcionalidades.
8. Priorizar una arquitectura limpia antes que soluciones rápidas.

---

# Lecciones aprendidas durante M6

- Trabajar en tareas pequeñas reduce considerablemente los errores.
- Probar antes de hacer cada commit facilita volver atrás cuando es necesario.
- La documentación debe evolucionar junto con el código.
- Separar claramente arquitectura, contexto, roadmap e historial facilita el mantenimiento.
- Resolver primero la causa de un problema produce una base más estable que aplicar soluciones temporales.

---

# Punto de partida para el próximo módulo

El siguiente objetivo es comenzar **M7**.

El enfoque será:

- Seguridad.
- Modelo de datos.
- Permisos.
- Escalabilidad.

No se desarrollarán nuevas funcionalidades hasta completar la migración del modelo de datos y consolidar el sistema de autenticación.

---

# Observaciones finales

M6 marca el primer punto estable del SGSA.

A partir de este momento el proyecto cuenta con:

- Arquitectura modular.
- Control de versiones mediante Git.
- Versionado funcional (`v0.6.0`).
- Documentación técnica.
- Contexto del proyecto.
- Historial de cambios.
- Roadmap de desarrollo.

La prioridad para M7 será fortalecer la arquitectura existente antes de incorporar nuevas funcionalidades.