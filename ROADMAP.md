# Roadmap SGSA

Este roadmap prioriza o estado atual do produto. Decisões e detalhes históricos permanecem em `docs/PROJECT_CONTEXT.md`.

## Milestones concluídos

- **M7 — Segurança e modelo de dados:** autenticação obrigatória, perfis canônicos em `users/{uid}`, Rules Firestore e autorização por papel/capela.
- **M8 — Estabilização de experiência:** login, sessão, Dashboard e gestão de servidores/capelas estabilizados.
- **M9 — Application Shell e Dashboard modular:** Shell, Workspace, navegação contextual e módulo Dashboard com Controller/State/Services/Views.
- **M10 — Formação:** Formations, Polos, Encounters, Participants e Attendance operacionais. Inclui consulta contextual de presenças após `completed`, UX1–UX3 e regressão de Rules. A composição de Participants permanece exclusiva de Encounter `scheduled`.
- **M11 — Relatório operacional de Encounter:** pré-visualização HTML contextual e impressão A4 a partir do detalhe do Encounter. Reutiliza Participants/Attendance existentes, com variantes para os quatro estados, sem escritas, CSV, PDF client-side ou alterações de Rules.

## Próximo milestone

Será definido após priorização funcional. CSV, histórico e estatísticas permanecem itens separados de backlog.

## Backlog pós-M11

### Próximo

- Histórico por Server.
- Filtros de Encounter.
- KPIs e relatórios de Formation.

### Futuro

- Substituição autônoma iniciada por coordinator.
- Estatísticas globais.
- Ações massivas.
- Offline real.

### Estratégico

- Multi-paróquia.
