# Base de dados Firestore

Rules são a fonte final de validação/autorização.

| Rota | Contrato atual |
| --- | --- |
| `users/{uid}` | Perfil canônico: `uid`, `email`, `displayName`, `role`, `chapelId`, `active`, `status`. `users/{email}` pending é transição tolerada. |
| `chapels/{id}` | `name`, `active`, endereço/notas opcionais e auditoria. |
| `artifacts/{appId}/public/data/servers/{id}` | `chapelId` canônico; `Capela` descritivo; `Data_nascimento` canônico e `Idade` fallback legado tolerado. |
| `formationGroups/{id}` | Grupo reutilizável, capelas, coordenadores padrão, critérios e estado. |
| `formations/{id}` | Formação, datas, `referenceDate`, `eligibilityCriteria`, `status`, auditoria. |
| `formations/{id}/poles/{id}` | Instância técnica do grupo: `groupId`, snapshot e `rosterPreparedAt`; UI: Grupo de formação. |
| `.../roster/{serverId}` | Lista-base preparada, snapshots e origem. |
| `.../encounters/{id}` | Agenda, local snapshot, responsabilidades e estado operacional. |
| `.../participants/{serverId}` | Snapshot de participação e attendance embutido. |
| `.../participantExclusions/{serverId}` | Exclusão de geração. |

Não há coleção paralela `attendance`: `attendanceStatus`, nota e auditoria vivem em Participant. Composição só é permitida em Encounter scheduled; em completed somente Admin corrige presença. Formation lifecycle: draft/active/completed/archived, com leitura total em archived.

Snapshots de capela/nome preservam histórico. `users.status`, `users/{email}` pending e `servers.Idade` são compatibilidade tolerada, não erros automáticos.
