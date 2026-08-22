# SGSA — Project Handoff

## Estado rápido

- **Branch:** `main`.
- **Versão formal atual:** `v0.9.0`.
- **Tag:** ainda pendente de criação.
- **Milestone fechado:** M12 — Shell responsivo e navegação.
- **Produção:** sem tag, push ou deploy; não há evidência no repositório de implantação de M10, M11 ou M12.

## Arquitetura e módulos

O Shell usa Header, Sidebar e Workspace. O Header é compacto e contém o menu de conta; `main.js` orquestra sessão, Shell e troca entre Dashboard e Formation, mantendo os fluxos legacy de servidores e usuários.

- `js/modules/dashboard/*`: Dashboard.
- `js/modules/formation/*`: Formations, Polos, Encounters, Participants, Attendance e relatório operacional.
- `js/firebase.js`, `js/auth.js`, `js/session.js`: Firebase e sessão.

Formation usa Controller / State / Services / Views. A hierarquia é Formação → Polo → Encounter → Participant.

## Auth, dados e permissões

Firebase Auth identifica o usuário; `users/{uid}` contém o perfil canônico com `admin`, `coordinator` ou `viewer`. Rules exigem usuário ativo e controlam o escopo de capela e o contexto de Formation.

Participants são snapshots de Encounter. Sua composição só pode mudar em `scheduled`; em `completed`, participantes/attendance são consultáveis e somente Admin corrige attendance. O relatório M11 é uma view contextual somente leitura: espera o snapshot de Participants, ordena localmente por capela/nome e usa `window.print()` para A4.

## M12 e validação

- **Shell:** em desktop o Sidebar começa expandido e pode recolher a ícones sem persistência. Em tablet/móvel ele é drawer fechado por padrão, com overlay, Escape, trap/retorno de foco e fechamento ao navegar. O menu de conta também fecha por Escape, clique externo, logout, usuário inativo e troca de sessão.
- **Navegação:** Dashboard e Formações são os únicos módulos operacionais exibidos; Usuários é uma ação exclusiva de Admin que reutiliza o modal existente. Capelas, Relatórios, Configurações e o destino inerte de Servidores não são exibidos. `Novo Servidor` permanece no Dashboard.
- **Acesso:** controles preservam `canCreateServer()` e `canManageUsers()`; nenhuma alteração foi feita em Rules, dados ou permissões.

- **Automatizado:** 95/95 testes de Firestore Rules, `node --check` nos JS afetados e `git diff --check` aprovados.
- **Manual:** validação funcional M12 aprovada em mobile, tablet e desktop para Admin, Coordinator e Viewer; as validações anteriores de M10/M11 permanecem registradas.
- **Sem cobertura automatizada específica:** rendering/UI, lifecycle, responsividade, acessibilidade, seeds e deploy.

## Limites e próximo passo

CSV, PDF client-side, histórico por Server, filtros de Encounter, KPIs/estatísticas, offline, ações massivas, multi-paróquia e substituição autônoma por coordinator não integram M12. M12 não cria Router global nem modulariza Servidores ou Usuários.

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

`v0.9.0` é a versão formal atual no repositório. M12 está fechado funcionalmente, mas não recebeu nova versão formal, tag, push ou deploy. O deploy só pode ocorrer após checklist explícito de produção.
