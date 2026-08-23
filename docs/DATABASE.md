# Base de dados Firestore

Esta é a referência do modelo atual. As Rules em `firestore.rules` são a fonte final de autorização e validação.

## Coleções principais

| Rota | Propósito e ID |
| --- | --- |
| `users/{uid}` | Perfil canônico do usuário autenticado. O ID é o Firebase Auth UID. Campos principais: `uid`, `email`, `displayName`, `role`, `chapelId`, `active`. Documentos históricos por email existem somente para migração controlada. |
| `chapels/{chapelId}` | Catálogo de capelas. Campos: `name`, `active`, `address?`, `notes?`, `createdAt?`, `updatedAt?`. |
| `artifacts/{appId}/public/data/servers/{serverId}` | Cadastro de servidores. `serverId` é o ID do registro; `chapelId` é a referência canônica de autorização e `Capela` pode permanecer como descrição legacy. |
| `formations/{formationId}` | Formação com `name`, `description`, `stage`, `modalities`, datas, `status` e auditoria. |
| `formations/{formationId}/poles/{poleId}` | Polo contextual à Formação: `name`, `baseChapelId`, `chapelIds`, `coordinatorIds`, `active` e auditoria. |
| `.../encounters/{encounterId}` | Encontro: `title`, `description`, `startAt`, `endAt`, `location`, `status`, `coordinatorIds`, `responsibilities` e auditoria. |

`location` é um snapshot `{ chapelId, name }`. `responsibilities` mantém designações/substituições e `coordinatorIds` é a projeção operacional usada para autorização contextual.

## Capelas (M14)

`name` é único na interface após normalização de maiúsculas, espaços e acentos. `address` é opcional; `notes` é opcional, administrativo, limitado a 500 caracteres e não deve conter dados sensíveis. Não há exclusão: uma capela é ativada ou desativada.

Ao renomear uma capela, o sistema sincroniza em lotes o campo legado `servers.Capela` dos servidores com o mesmo `chapelId`. Isso não altera snapshots históricos (`participants.chapelName` e `encounters.location.name`). Os documentos legacy `{name, active}` continuam válidos para leitura. Em sua primeira atualização, o aplicativo pode inicializar `createdAt` com o timestamp do servidor; ele não tenta inventar uma data histórica.

## Participants e attendance

```text
formations/{formationId}/poles/{poleId}/encounters/{encounterId}/participants/{serverId}
```

O ID do Participant é o `serverId`. Cada documento é um snapshot contextual da lista do Encounter e contém:

- `serverId`, `serverName`, `chapelId`, `chapelName`;
- `participationType`: `regular` ou `manual`;
- `attendanceStatus`: `pending`, `present`, `absent` ou `justified`;
- `attendanceNote`, quando aplicável;
- `recordedBy` e `recordedAt`, quando há presença registrada;
- `addedManually`, `addedBy`, `createdAt` e `updatedAt`.

Attendance pertence ao Participant; não há coleção paralela de presença. Alterações no cadastro global de servidor ou capela não modificam o snapshot.

## Exclusions e política de estado

```text
formations/{formationId}/poles/{poleId}/encounters/{encounterId}/participantExclusions/{serverId}
```

Exclusions registram `serverId`, `excludedBy` e `createdAt` para evitar geração futura no mesmo Encounter. A composição estrutural — gerar, incluir manualmente, remover e criar/remover exclusions — ocorre somente quando o Encounter está `scheduled`.

Em `in_progress`, attendance pode ser registrado pelos atores autorizados. Em `completed`, a lista permanece consultável por usuários ativos e somente Admin pode corrigir attendance. `cancelled` não permite attendance.

## Relações e limites

- `users.chapelId`, `servers.chapelId`, `poles.chapelIds` e `location.chapelId` referenciam capelas.
- A hierarquia de Formation é sempre contextual: Formação → Polo → Encounter → Participant.
- Não há `collectionGroup` implementado para histórico global, nem coleção duplicada de histórico, estatísticas ou exportações persistidas.
