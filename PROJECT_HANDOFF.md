# SGSA — Project Handoff

## Estado rápido

- **Branch:** `main`.
- **Versão formal atual:** `v0.9.0`.
- **Tag:** ainda pendente de criação.
- **Milestone fechado:** M11 — Relatório operacional de Encounter.
- **Produção:** sem commit, tag, push ou deploy; não há evidência no repositório de implantação de M10 ou M11.

## Arquitetura e módulos

O Shell usa Header, Sidebar e Workspace. `main.js` orquestra sessão e troca entre os módulos Dashboard e Formation; ainda mantém fluxos legacy de servidores.

- `js/modules/dashboard/*`: Dashboard.
- `js/modules/formation/*`: Formations, Polos, Encounters, Participants, Attendance e relatório operacional.
- `js/firebase.js`, `js/auth.js`, `js/session.js`: Firebase e sessão.

Formation usa Controller / State / Services / Views. A hierarquia é Formação → Polo → Encounter → Participant.

## Auth, dados e permissões

Firebase Auth identifica o usuário; `users/{uid}` contém o perfil canônico com `admin`, `coordinator` ou `viewer`. Rules exigem usuário ativo e controlam o escopo de capela e o contexto de Formation.

Participants são snapshots de Encounter. Sua composição só pode mudar em `scheduled`; em `completed`, participantes/attendance são consultáveis e somente Admin corrige attendance. O relatório M11 é uma view contextual somente leitura: espera o snapshot de Participants, ordena localmente por capela/nome e usa `window.print()` para A4.

## Validação

- **Automatizado:** 95/95 testes de Firestore Rules, `node --check` nos JS M11 e `git diff --check` aprovados.
- **Manual:** validação funcional M11 aprovada para os quatro estados e impressão; as validações anteriores de M10 permanecem registradas.
- **Sem cobertura automatizada específica:** rendering/UI, lifecycle, responsividade, acessibilidade, seeds e deploy.

## Limites e próximo passo

CSV, PDF client-side, histórico por Server, filtros de Encounter, KPIs/estatísticas, offline, ações massivas, multi-paróquia e substituição autônoma por coordinator não integram M11.

O próximo milestone será definido após priorização funcional.

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

## Estado pre-tag

`v0.9.0` é a versão formal atual no repositório. M11 está fechado funcionalmente, mas ainda não recebeu nova versão formal, tag, commit, push ou deploy. O deploy só pode ocorrer após checklist explícito de produção.
