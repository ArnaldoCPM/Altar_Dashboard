# Base de datos

## Colección: `users`

Cada documento de la colección `users` representa a un usuario autenticado del sistema y contiene los siguientes campos:

- `uid`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Identificador único del usuario proporcionado por Firebase Authentication.

- `email`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Dirección de correo electrónico del usuario.

- `displayName`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Nombre legible del usuario para mostrar en la interfaz.

- `role`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Rol del usuario en la aplicación que determina sus permisos.

- `chapelId`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Identificador de la capilla asociada al usuario.

- `active`
  - Tipo: `boolean`
  - Obligatorio: sí
  - Descripción: Estado activo del usuario; `true` si puede acceder al sistema.

- `createdAt`
  - Tipo: `timestamp`
  - Obligatorio: sí
  - Descripción: Fecha y hora de creación del documento de usuario.

- `lastLogin`
  - Tipo: `timestamp`
  - Obligatorio: sí
  - Descripción: Fecha y hora del último inicio de sesión del usuario.

## Colección: `chapels`

Cada documento de la colección `chapels` representa una capilla referenciada por usuarios y servidores.

- `id`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Identificador único de la capilla.

- `name`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Nombre de la capilla.

- `city`
  - Tipo: `string`
  - Obligatorio: sí
  - Descripción: Ciudad donde se ubica la capilla.

- `active`
  - Tipo: `boolean`
  - Obligatorio: sí
  - Descripción: Indica si la capilla está activa en el sistema.

- `createdAt`
  - Tipo: `timestamp`
  - Obligatorio: sí
  - Descripción: Fecha y hora de creación del documento de la capilla.

## Relaciones

- `users.chapelId` referencia a `chapels.id`
- `servers.chapelId` referencia a `chapels.id`

## Roles

- `admin`
  - Responsabilidades: Gestionar la configuración global del sistema, supervisar usuarios y datos, y acceder a todas las funciones administrativas.

- `coordinator`
  - Responsabilidades: Administrar registros operativos de los servidores del altar y coordinar actividades de la capilla asignada.
