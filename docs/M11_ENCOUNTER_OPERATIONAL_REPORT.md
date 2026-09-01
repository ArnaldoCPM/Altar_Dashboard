# M11 — Relatório operacional de Encounter

## Estado atual v0.10.0

O relatório operacional permanece contextual e somente leitura. A UI usa **Grupo de formação**; o caminho técnico ainda usa `poles`. Ele acompanha o lifecycle de Formação e preserva snapshots de Participants/attendance.

## Fechamento

M11 foi implementado e validado funcionalmente em 2026-08-21. O recurso disponibiliza, a partir do detalhe contextual de um Encounter, uma pré-visualização HTML e impressão A4 por `window.print()`.

O relatório reutiliza exclusivamente o snapshot contextual de `participants` já existente em:

```text
formations/{formationId}/poles/{poleId}/encounters/{encounterId}/participants
```

Não cria coleções, não grava dados, não consulta `collectionGroup`, não modifica Rules nem amplia permissões.

## Comportamento entregue

- A impressão só é habilitada depois do primeiro snapshot de Participants.
- A lista é ordenada localmente por `chapelName` e, em seguida, `serverName`.
- `scheduled`: lista operacional com campos para presença e observações manuais, sem métricas finais.
- `in_progress`: resumo parcial dos estados de presença e espaço operacional para observações ainda ausentes.
- `completed`: resumo final local e apresentação das notas de presença existentes.
- `cancelled`: comunicado informativo, sem métricas pastorais nem tabela de participantes.
- Responsáveis só são mostrados quando seu nome já é resolvível no contexto atual; nomes indisponíveis são omitidos. UID e campos técnicos não são exibidos.
- O CSS de impressão usa A4 e oculta Shell, navegação, ações e identificadores técnicos; a pré-visualização móvel mantém resumo adaptável e tabela com rolagem horizontal.

## Validação

- `node --check` aprovado para `controller.js`, `encounter.view.js` e `report.view.js`.
- `git diff --check` aprovado.
- Regressão de Firestore Rules: 95/95 testes aprovados.
- Validação funcional manual aprovada pelo usuário para os quatro estados e a impressão.

## Fora do escopo preservado

CSV, PDF client-side, novas coleções, escritas Firestore, alterações de Rules, histórico global, estatísticas, offline real, `collectionGroup`, Functions e substituição autônoma continuam fora do escopo.

## Estado de publicação

Este fechamento não cria commit, tag, push ou deploy. Não há evidência de implantação em produção.
