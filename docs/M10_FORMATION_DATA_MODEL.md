# M10 — Formation Data Model

## Contrato final

Este é o contrato de dados final de M10. A validação e autorização definitivas estão em `firestore.rules`; a arquitetura geral está em `MASTER_PROJECT.md`.

```text
formations/{formationId}
  poles/{poleId}
    encounters/{encounterId}
      participants/{serverId}
      participantExclusions/{serverId}
```

## Entidades

### Formation

`name`, `description`, `stage` (`first` ou `second`), `modalities` (`initial` e/ou `permanent`), datas opcionais, `status` (`draft`, `active`, `completed`, `archived`) e auditoria (`createdBy`, `createdAt`, `updatedAt`).

### Pole

`name`, `baseChapelId`, `chapelIds`, `coordinatorIds`, `active`, `createdAt` e `updatedAt`. O Polo é contextual à Formation; a capela base deve integrar `chapelIds`.

### Encounter

`title`, `description`, `startAt`, `endAt` opcional, `location`, `status`, `coordinatorIds`, `responsibilities`, `createdBy`, `createdAt` e `updatedAt`.

`location` é o snapshot `{ chapelId, name }`. Os estados são `scheduled`, `in_progress`, `completed` e `cancelled`; o fluxo normal é `scheduled → in_progress → completed`, e o cancelamento ocorre a partir de `scheduled`.

`responsibilities` registra designados e substitutos confirmados. `coordinatorIds` é uma projeção operacional de autorização. A gestão vigente de substituições é exclusiva de Admin: Admin pode designar e gerir substitutes no fluxo atual. Um coordinator designado não pode criar nem gerir seu próprio substitute pelo sistema. A substituição autônoma por coordinator foi analisada e deliberadamente adiada para etapa futura; essa limitação é funcional e de autorização, não apenas de UI.

### Participant

O ID é o `serverId`; o documento contém `serverId`, `serverName`, `chapelId`, `chapelName`, `participationType` (`regular` ou `manual`), `attendanceStatus`, `attendanceNote` quando aplicável, `recordedBy`, `recordedAt`, `addedManually`, `addedBy`, `createdAt` e `updatedAt`.

Nome e capela são snapshots. Attendance é atributo do Participant, com estados `pending`, `present`, `absent` e `justified`. `justified` exige nota válida; `recordedBy` e `recordedAt` registram a auditoria básica. Não há coleção de auditoria ou attendance paralela.

### Participant exclusion

`participantExclusions/{serverId}` contém `serverId`, `excludedBy` e `createdAt`, evitando nova geração do mesmo servidor no Encounter.

## Política por estado e permissões

- **scheduled:** composição estrutural autorizada — geração, inclusão manual, remoção e exclusions.
- **in_progress:** composição bloqueada; attendance pode ser registrado pelos atores contextualmente autorizados.
- **completed:** Participants e attendance permanecem consultáveis no mesmo contexto Formation → Polo → Encounter. Admin pode corrigir attendance; os demais atores autorizados têm somente leitura. Rules permitem a transição administrativa de retorno a `in_progress`, mas ela não é um fluxo operacional exposto pela UI atual.
- **cancelled:** sem composição ou attendance.

Leitura contextual exige usuário ativo. Admin possui alcance global; coordenadores atuam conforme Polo/Encounter; viewer apenas consulta. As Rules continuam como garantia final.

## Fora do escopo final de M10

Exportação/impressão, histórico global por Server, `collectionGroup`, estatísticas, KPIs, ações massivas, offline real e substituição autônoma por coordinator são funcionalidades futuras. Não devem ser interpretadas como recursos já implementados.

## Decisões preservadas

- Hierarquia contextual, sem coleção global de Participants.
- Participant identificado por `serverId` e mantido como snapshot.
- `coordinatorIds` e `responsibilities` coexistem deliberadamente.
- Composição de Participant estritamente `scheduled`-only.
