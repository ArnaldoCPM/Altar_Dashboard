# SGSA — Project Handoff

## Estado rápido

- **Branch:** `main`.
- **Última versão formal:** `v0.8.0`.
- **Versão proposta:** `v0.9.0`, ainda sem tag.
- **Último milestone:** M10 operacionalmente concluído.
- **Produção:** não há evidência no repositório de deploy de M10.

## Arquitetura e módulos

O Shell usa Header, Sidebar e Workspace. `main.js` orquestra sessão e troca entre os módulos Dashboard e Formation; ainda mantém fluxos legacy de servidores.

- `js/modules/dashboard/*`: Dashboard.
- `js/modules/formation/*`: Formations, Polos, Encounters, Participants e Attendance.
- `js/firebase.js`, `js/auth.js`, `js/session.js`: Firebase e sessão.

Formation usa Controller / State / Services / Views. A hierarquia é Formação → Polo → Encounter → Participant.

## Auth, dados e permissões

Firebase Auth identifica o usuário; `users/{uid}` contém o perfil canônico com `admin`, `coordinator` ou `viewer`. Rules exigem usuário ativo e controlam o escopo de capela e o contexto de Formation.

Participants são snapshots de Encounter. Sua composição só pode mudar em `scheduled`; em `completed`, participantes/attendance são consultáveis e somente Admin corrige attendance.

## Validação

- **Automatizado:** 95/95 testes de Firestore Rules.
- **Manual:** fluxos UI de M10, Dashboard/sessão, breadcrumbs, consulta completed e sequência de seeds.
- **Sem cobertura automatizada específica:** rendering/UI, lifecycle, responsividade, acessibilidade, seeds e deploy.

## Limites e próximo passo

Exportação, histórico por Server, filtros de Encounter, KPIs/estatísticas, offline, ações massivas, multi-paróquia e substituição autônoma por coordinator não integram M10.

Próximo milestone proposto: **M11 — Relatório operacional de Encounter**, para saída contextual imprimível/exportável de Participants/Attendance.

## Comandos locais

Consulte `docs/LOCAL_DEVELOPMENT.md`. Resumo:

```powershell
firebase emulators:start --only auth,firestore
cd scripts/formation-rules-tests
node seed-local-admin.js
node seed-local-poles.js
node seed-local-servers.js
npm test
```

Para abrir a aplicação no Emulator, use host local com `?emulator=1`.

## Próximas ações de release

Antes de formalizar `v0.9.0`: revisar o diff documental, executar `git diff --check`, criar commits aprovados, atualizar/confirmar Changelog, criar o tag e realizar deploy somente após checklist explícito de produção.
