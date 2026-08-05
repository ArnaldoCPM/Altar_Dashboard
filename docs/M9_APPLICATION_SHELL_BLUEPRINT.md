# M9 — Blueprint del Application Shell

## 1. Objetivo

El Application Shell transforma el SGSA de una página única en una aplicación modular. Define una infraestructura visual y de navegación común, estable y reutilizable para que cada módulo presente su contenido sin duplicar la estructura principal de la aplicación.

Este shell será la base de toda evolución futura del sistema: los módulos actuales y los que se incorporen después deberán integrarse en él.

## 2. Filosofía

- El Header permanece fijo durante la sesión.
- El Sidebar permanece fijo durante la sesión.
- Solamente cambia el contenido del Workspace.
- La navegación no produce recargas de página.
- Todos los módulos reutilizan la misma infraestructura, estado de sesión y navegación.

## 3. Estructura visual

El layout previsto se organiza en cuatro regiones:

```text
+-------------------------------------------------------------+
| Header                                                      |
+-------------------+-----------------------------------------+
| Sidebar           | Workspace                               |
|                   |                                         |
|                   | Área renderizada por el módulo activo   |
|                   |                                         |
+-------------------+-----------------------------------------+
| Footer (reservado para futuro)                              |
+-------------------------------------------------------------+
```

- **Header:** identidad global, contexto de sesión y acciones generales.
- **Sidebar:** navegación entre los módulos autorizados.
- **Workspace:** área variable donde se renderiza exclusivamente el módulo activo.
- **Footer:** región reservada para necesidades futuras; no forma parte del alcance funcional inicial.

## 4. Header

El Header representa el contexto global y permanece visible al navegar entre módulos. Debe documentar y mostrar, según corresponda:

- Logo SGSA.
- Nombre del sistema.
- Información de sesión:
  - foto;
  - nombre;
  - rol;
  - capilla asociada.
- Acción para cerrar sesión.

También podrá alojar acciones globales futuras, como notificaciones, ayuda, selector de contexto, preferencias, accesos rápidos o indicadores de sincronización. Estas acciones no deben pertenecer a la lógica de un módulo particular.

## 5. Sidebar

El Sidebar centraliza la navegación por módulos. La estructura inicial prevista es:

- Dashboard
- Servidores
- Capelas
- Formação
- Usuários
- Relatórios
- Configurações

Los módulos visibles dependen del rol del usuario autenticado. No existen botones deshabilitados en la navegación: un módulo no autorizado simplemente no aparece en el Sidebar. La visibilidad se calcula a partir de las capacidades de navegación del rol, no de decisiones aisladas dentro de cada componente visual.

## 6. Workspace

Cada módulo renderiza únicamente dentro del Workspace. Un módulo puede gestionar su contenido interno, sus eventos y su estado local, pero nunca reemplaza ni reconstruye el Header o el Sidebar.

Esta frontera permite cambiar de módulo sin perder la infraestructura común, evita duplicar elementos globales y mantiene una experiencia de aplicación continua.

## 7. Arquitectura JavaScript

La estructura objetivo para el Application Shell es:

```text
js/
├── layout/
│   ├── header.js
│   ├── sidebar.js
│   └── workspace.js
├── navigation/
│   └── router.js
└── modules/
    ├── dashboard/
    ├── servers/
    ├── training/
    ├── users/
    ├── chapels/
    ├── reports/
    └── settings/
```

Responsabilidades previstas:

- `layout/`: construye y actualiza las regiones persistentes del shell. `header.js` gestiona la identidad y las acciones globales; `sidebar.js` genera la navegación autorizada y refleja el módulo activo; `workspace.js` define el único punto de montaje y limpieza del contenido variable.
- `navigation/`: coordina la navegación. `router.js` interpreta el destino solicitado, valida el acceso de navegación y activa el renderizado del módulo correspondiente.
- `modules/`: contiene los módulos funcionales aislados por dominio. Cada carpeta agrupa la interfaz, los eventos y las dependencias propias de su dominio, sin asumir control de las regiones globales.

La estructura es objetivo de evolución; este Blueprint no crea todavía esos archivos ni altera la estructura actual.

## 8. Router

El flujo esperado de navegación es:

```text
Sidebar
   ↓
Router
   ↓
Render del módulo
   ↓
Workspace
```

Al seleccionar una opción autorizada del Sidebar, el Router identifica el módulo, confirma que el destino está disponible para el rol actual y solicita su renderizado en el Workspace. La transición ocurre sin recargar la página. El Router no contiene reglas de negocio de los módulos ni sustituye la autorización de acciones internas.

## 9. Permisos

La navegación se define por rol:

- **Administrador:** acceso a los módulos administrativos y operativos definidos para la gestión integral del sistema.
- **Coordinador:** acceso a los módulos necesarios para la coordinación pastoral y operativa dentro de sus capacidades.
- **Viewer:** acceso solamente a los módulos de consulta autorizados.

Los permisos de navegación son independientes de los permisos internos de cada módulo. Poder abrir un módulo no implica poder ejecutar todas sus acciones: por ejemplo, un usuario puede visualizar un módulo y, dentro de él, tener restricciones de creación, edición, eliminación o alcance por capilla. Las decisiones internas continúan sujetas a la política de permisos y autorización vigente.

## 10. Integración futura

Los módulos de Formação, Agenda, Relatórios y Configurações deberán integrarse registrando una ruta, declarando su visibilidad por rol y renderizando exclusivamente dentro del Workspace. No deberán crear un Header, Sidebar o mecanismo de navegación paralelo.

Los nuevos módulos seguirán el mismo contrato: aislamiento por carpeta de dominio, uso de servicios y reglas compartidas, y montaje controlado por el Router. Cuando un módulo requiera acciones globales, deberá integrarlas a través de las regiones del shell correspondientes, no mediante duplicación de UI.

## 11. Principios

- **Responsabilidad única:** cada archivo y cada región del shell tiene un propósito definido.
- **Bajo acoplamiento:** los módulos no dependen de la implementación interna de otros módulos ni controlan la estructura global.
- **Alta cohesión:** la lógica relacionada con un dominio permanece agrupada en su módulo.
- **Componentes reutilizables:** las regiones y elementos compartidos se implementan una vez y se reutilizan.
- **Fuente única de verdad:** sesión, permisos, ruta activa y estado global se resuelven en sus responsables centrales.
- **Separación entre UI y reglas de negocio:** el renderizado no duplica decisiones de autorización ni lógica de dominio.
- **Compatibilidad con futuras versiones:** la arquitectura permite añadir, sustituir o evolucionar módulos sin rediseñar el shell completo.

## 12. Roadmap de implementación

La implementación de M9 se divide en las siguientes tareas:

| Tarea | Alcance |
| --- | --- |
| M9-T1 Blueprint | Definición documental de la arquitectura del Application Shell. |
| M9-T2 Layout | Implementación de las regiones persistentes: Header, Sidebar y Workspace. |
| M9-T3 Dashboard | Integración del Dashboard como primer módulo del Workspace. |
| M9-T4 Servidores | Integración del módulo de Servidores en el Workspace. |
| M9-T5 Navegación | Implementación y consolidación del Router y la navegación por rol. |
| M9-T6 Refactor final | Eliminación de acoplamientos heredados, revisión de consistencia y consolidación de la arquitectura. |
