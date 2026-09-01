# SGSA — arquitetura vigente

SGSA é uma aplicação estática ES Modules com Shell (Header, Sidebar e Workspace), módulos Dashboard, Servidores, Usuários, Capelas e Formação, Firebase Auth/Firestore/Functions e hospedagem Vercel.

`main.js` orquestra sessão e navegação; `js/data/*` e services isolam dados; módulos usam `initialize`, `refresh` e `destroy`. Rules são a autorização final.

## Identidade e papéis

O perfil canônico é `users/{uid}`. Admin gere globalmente; Coordinator lê globalmente e só escreve Servidores da própria capela; Viewer é usuário pastoral de leitura global. M15 usa a Function v2 `sendUserAccess`; `users/{email}` pending é transição tolerada, não novo modelo.

## Formação v2

`formationGroups` é o catálogo reutilizável. Ao preparar uma Formação, grupos técnicos `poles/{poleId}` são instâncias/snapshots; a UI usa **Grupo de formação**. O roster é preparado por grupo, Participants são snapshots automáticos por Encounter e attendance vive no Participant. `groupId`, `rosterPreparedAt`, critérios e `referenceDate` preservam a decisão de elegibilidade. O lifecycle permite preparação em draft, operação em active, consulta/correção Admin limitada em completed e consulta em archived.

Detalhes de schema: [docs/DATABASE.md](docs/DATABASE.md). Arquitetura ampliada: [docs/SGSA_ARCHITECTURE.md](docs/SGSA_ARCHITECTURE.md).
