# SGSA

Sistema de Gestao dos Servidores do Altar

Version 2.0

Documento Maestro del Proyecto

## Arquitectura general

SGSA es una aplicacion web frontend basada en JavaScript modular (ES Modules), sin framework de UI, con Firebase como plataforma de autenticacion y persistencia. La aplicacion concentra la logica de interfaz en `js/main.js`, mientras que el acceso a datos se separa por dominio en modulos especificos.

El sistema se apoya en tres pilares:

- Firebase Authentication para autenticar usuarios.
- Cloud Firestore para almacenar usuarios, servidores y capillas.
- Una capa de datos modular para encapsular lecturas y escrituras por coleccion.

La autorizacion se resuelve principalmente a partir de la coleccion `users`, que actua como fuente de verdad para roles, estado y asociacion con capillas.

## Modulos

### Nucleo

- `js/firebase.js`
  - inicializa una unica instancia de Firebase App.
  - expone una unica instancia compartida de Authentication y Firestore.

- `js/auth.js`
  - centraliza inicio de sesion, logout e inicializacion de auth.
  - mantiene compatibilidad con el flujo heredado de acceso anonimo.

- `js/session.js`
  - conserva el estado de sesion en cliente.
  - almacena usuario actual, perfil y rol actual.

### Datos

- `js/data/users.js`
  - CRUD de usuarios.
  - resolucion por UID y por email.
  - vinculacion automatica entre documento Firestore y UID de Firebase Authentication.

- `js/data/servers.js`
  - persistencia de servidores del altar.

- `js/data/chapels.js`
  - acceso a la coleccion de capillas.
  - recuperacion de capillas activas para formularios y filtros.

### Interfaz y orquestacion

- `js/main.js`
  - orquesta autenticacion, carga de datos, dashboard, filtros, formularios y modales.
  - coordina el flujo entre UI y capa de datos.

- `index.html`
  - contiene la estructura principal de la interfaz.
  - incluye dashboard, formularios, modales y navegacion lateral base.

## Flujo de autenticacion

El flujo actual de autenticacion y resolucion de perfil es:

Firebase Authentication

↓

`resolveAuthenticatedProfile()`

↓

`getUserByUid()`

↓

`getUserByEmail()`

↓

`linkUserUid()`

↓

placeholder

### Descripcion del flujo

1. Firebase Authentication autentica al usuario.
2. El sistema intenta resolver primero el perfil por `uid`.
3. Si no existe coincidencia por `uid`, busca por `email`.
4. Si encuentra un documento por `email` sin `uid` vinculado, asocia automaticamente el `uid` mediante `linkUserUid()`.
5. Si no existe documento en Firestore, retorna un perfil placeholder sin permisos.

### Criterio principal de identidad

El `uid` de Firebase Authentication es el identificador principal del usuario autenticado. El `email` se usa como mecanismo de vinculacion y compatibilidad para el primer acceso.

## Roles

El sistema contempla actualmente tres roles:

- `admin`
- `coordinator`
- `viewer`

### Responsabilidad general por rol

- `admin`
  - acceso administrativo completo previsto para gestion y configuracion.

- `coordinator`
  - rol operativo asociado a una capilla.

- `viewer`
  - rol de visualizacion asociado a una capilla.

La interfaz y la logica ya reconocen estos roles, aunque la matriz completa de permisos por rol sigue evolucionando.

## Gestion de usuarios

La gestion de usuarios ya forma parte estable de M6 y contempla:

- listado de usuarios;
- creacion de usuarios;
- edicion de usuarios;
- desactivacion logica;
- estado de ciclo de vida;
- vinculacion automatica UID-email;
- asociacion opcional u obligatoria con capilla segun rol.

### Campos principales de usuario

- `uid`
- `email`
- `displayName`
- `role`
- `chapelId`
- `active`
- `status`

### Estados de usuario

- `pending`
- `active`
- `disabled`

## Gestion de capillas

Las capillas se gestionan como una coleccion independiente en Firestore.

### Principios actuales

- las capillas activas se cargan dinamicamente desde la coleccion `chapels`;
- los formularios no dependen de listas hardcodeadas para la seleccion principal;
- existe cache en memoria para evitar lecturas repetidas en el formulario de usuarios;
- los filtros y formularios consumen la misma fuente de datos de capillas activas.

### Uso actual en interfaz

- `form-capela`
  - selector del formulario de servidores.

- `form-user-chapel`
  - selector del formulario de usuarios.

- `filter-capilla`
  - filtro del dashboard de servidores.

## Modelo de datos

### Coleccion `users`

Campos principales:

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

### Coleccion `servers`

Campos principales:

- `id`
- `Nome`
- `Data_nascimento`
- `Idade`
- `Sexo`
- `Capela`
- `Tipo`
- `Estado`
- `Horario_estudo`
- campos sacramentales
- campos de salud
- campos familiares y de contacto

### Coleccion `chapels`

Campos principales:

- `id`
- `name`
- `active`

## Convenciones

- una responsabilidad principal por archivo;
- acceso a Firestore encapsulado en modulos `js/data/*`;
- uso de ES Modules;
- UI sin framework;
- cambios acotados por tarea;
- preferencia por soluciones simples y mantenibles;
- reutilizacion antes que duplicacion;
- compatibilidad temporal cuando una migracion de datos aun no ha concluido.

## Decisiones de arquitectura

- mantener una unica inicializacion de Firebase;
- separar autenticacion, sesion, datos y UI en modulos distintos;
- usar la coleccion `users` como fuente de verdad para autorizacion;
- usar `uid` como identificador principal del usuario autenticado;
- conservar compatibilidad con documentos heredados mientras se completa la migracion de modelo;
- cargar capillas dinamicamente desde Firestore en lugar de mantener catalogos fijos en la interfaz.

## Deuda tecnica

- migracion pendiente de `Capela` (texto) hacia `capela_id` / `chapelId` en la coleccion de servidores;
- coexistencia temporal entre modelo heredado y modelo objetivo durante la transicion;
- persistencia del flujo anonimo heredado del proyecto base, aun presente por compatibilidad.

## Roadmap tecnico

### Objetivos de M7

- eliminar el acceso anonimo;
- autenticacion obligatoria;
- permisos completos por rol;
- avanzar la migracion de `Capela` hacia `capela_id` / `chapelId`.
