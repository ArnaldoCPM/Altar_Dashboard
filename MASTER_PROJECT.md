# SGSA

Sistema de Gestão dos Servidores do Altar. Este documento descreve a arquitetura vigente; o histórico está em `docs/PROJECT_CONTEXT.md`.

## Arquitetura atual

O SGSA é uma aplicação web em JavaScript ES Modules, sem framework de UI, apoiada por Firebase Authentication e Cloud Firestore. O Shell mantém Header, Sidebar e Workspace; a navegação troca o módulo ativo sem recarregar a aplicação.

Módulos operativos:

- **Dashboard:** consulta e gestão do cadastro de servidores.
- **Formation:** Formations, Polos, Encounters, Participants e Attendance.

Cada módulo novo segue `index.js` com ciclo de vida `initialize()`, `refresh()` e `destroy()`. Internamente, Controller coordena fluxo e autorização de cliente, State mantém estado do domínio, Services acessam Firestore e Views renderizam/intermediam ações.

`js/main.js` orquestra sessão, Shell e navegação entre módulos. Ainda contém compatibilidade e fluxos legacy do domínio de servidores; não é uma arquitetura monolítica completa nem todo o aplicativo já foi migrado para módulos.

## Identidade e autorização

Firebase Authentication identifica o usuário. O perfil canônico é `users/{uid}` e define `role`, `active` e `chapelId`; os papéis oficiais são `admin`, `coordinator` e `viewer`.

Não há acesso anônimo como comportamento vigente, nem permissões baseadas em email. A compatibilidade com documentos históricos `users/{email}` existe somente para concluir migração controlada ao perfil canônico.

As Rules são a proteção final. A UI e os Controllers aplicam autorização de cliente; Firestore valida papel, usuário ativo, escopo de capela e, em Formation, contexto de Polo/Encounter e estado do recurso.

## Dados e módulos

- `js/firebase.js`: instância compartilhada de Firebase e conexão explícita ao Emulator apenas em host local com `?emulator=1`.
- `js/auth.js` e `js/session.js`: autenticação e sessão.
- `js/data/*`: acesso ao domínio de usuários, servidores e capelas.
- `js/modules/dashboard/*`: Dashboard modular.
- `js/modules/formation/*`: domínio Formation, com serviços por entidade, Views e componentes de breadcrumb/status.

O contrato Firestore atual está em `docs/DATABASE.md`; o contrato final de Formation está em `docs/M10_FORMATION_DATA_MODEL.md`.

## Shell responsivo (M12)

O Header é compacto e concentra identidade e o menu de conta. `Sair` permanece exclusivo desse menu; `Usuários` é uma ação administrativa disponível somente para Admin e reutiliza o modal legacy existente. O estado normal de sincronização é silencioso.

O Sidebar é gerado a partir do contrato de navegação e reflete somente destinos reais: Dashboard e Formation, além de Usuários para Admin. O módulo ativo é derivado da navegação em execução. Em desktop começa expandido e pode ser recolhido a ícones durante a carga atual; em tablet e móvel funciona como drawer com overlay, Escape, foco contido e retorno do foco. A preferência não é persistida.

`Novo Servidor` permanece no contexto operacional do Dashboard e conserva as verificações de autorização existentes. A ocultação da interface não substitui as Rules nem as verificações de cliente.

## Limites atuais

M11 inclui apenas o relatório HTML contextual e sua impressão A4. M12 não cria Router global, nem modulariza os fluxos legacy de Servidores ou Usuários. CSV, PDF client-side, histórico global por Server, estatísticas globais, ações massivas, offline real, multi-paróquia e substituição autônoma por coordinator continuam no backlog. O relatório reutiliza snapshots de Participants e não introduz escritas, coleções, consultas globais ou mudanças de autorização.
