# M10 --- Formation Data Model

## M10-T2.3 --- Contrato técnico del modelo de datos

**Projeto:** SGSA --- Sistema de Gestão dos Servidores do Altar\
**Módulo:** M10 --- Formação\
**Estado:** Proposto para aprovação\
**Versão:** 1.0\
**Data:** 2026-08-13

------------------------------------------------------------------------

## 1. Objetivo e escopo

Este documento define o contrato técnico do modelo de dados do módulo
**Formação** do SGSA.

O módulo deverá permitir organizar itinerários formativos, as duas
etapas da formação, formação inicial e permanente, diferentes polos com
agendas independentes, capelas atendidas, responsáveis e substituições,
encontros, participantes, presença, observações e exportação para
impressão.

A primeira versão deverá permitir imprimir a lista quando não houver
internet e lançar posteriormente as presenças no sistema.

### Princípio arquitetural

O módulo reutilizará as entidades existentes `users`, `chapels` e
`servers`. Não deverá criar usuários, capelas, servidores ou permissões
paralelos.

------------------------------------------------------------------------

## 2. Entidades existentes reutilizadas

### `users`

Campos relevantes: `uid`, `displayName`, `role`, `chapelId`, `active`.

O `role` determina o nível geral de autorização. `chapelId` identifica a
capela associada ao usuário, mas não determina sozinho a
responsabilidade sobre um polo.

### `chapels`

São reutilizadas as capelas existentes no SGSA. Não será criado cadastro
paralelo.

### `servers`

Os servidores existentes continuam sendo a fonte principal dos
participantes. Um servidor poderá participar de mais de uma formação ou
polo quando necessário.

------------------------------------------------------------------------

## 3. Entidades novas

1.  `Formation`
2.  `Pole`
3.  `Encounter`
4.  `EncounterParticipant`

Estrutura lógica:

``` text
Formation
  └── Pole
       └── Encounter
            └── EncounterParticipant
```

Estrutura Firestore proposta:

``` text
formations/{formationId}
formations/{formationId}/poles/{poleId}
formations/{formationId}/poles/{poleId}/encounters/{encounterId}
formations/{formationId}/poles/{poleId}/encounters/{encounterId}/participants/{serverId}
```

------------------------------------------------------------------------

## 4. Entidade `Formation`

Representa o itinerário ou processo formativo.

``` text
formations/{formationId}

name          string       obrigatório
description   string       opcional
stage         string       obrigatório
modalities    array        obrigatório
startDate     timestamp    opcional
endDate       timestamp    opcional
status        string       obrigatório
createdBy     string       obrigatório
createdAt     timestamp    obrigatório
updatedAt     timestamp    obrigatório
```

### `stage`

Valores: `first`, `second`.

Interface: - `first` → 1ª Fase --- 6 a 11 anos - `second` → 2ª Fase ---
12 a 24 anos

### `modalities`

Valores permitidos: `initial`, `permanent`.

Exemplos: `['initial']`, `['permanent']`, `['initial', 'permanent']`.

### `status`

Valores: `draft`, `active`, `completed`, `archived`.

------------------------------------------------------------------------

## 5. Entidade `Pole`

Representa um polo/base de formação dentro de uma formação.

``` text
formations/{formationId}/poles/{poleId}

name             string
baseChapelId     string
chapelIds        array<string>
coordinatorIds   array<string>
active           boolean
createdAt        timestamp
updatedAt        timestamp
```

`baseChapelId` identifica a capela-base. `chapelIds` lista as capelas
atendidas. Regra: `baseChapelId` deve estar presente em `chapelIds`.

`coordinatorIds` contém os coordenadores com responsabilidade
operacional habitual sobre o polo.

A relação capela-polo é contextual à formação. Não adicionar `poleId` à
entidade global `chapels`.

------------------------------------------------------------------------

## 6. Entidade `Encounter`

Representa um encontro concreto da agenda.

``` text
formations/{formationId}/poles/{poleId}/encounters/{encounterId}

title                  string
description            string
startAt                timestamp
endAt                  timestamp
location               map
status                 string
coordinatorIds         array<string>
responsibilities       array<map>
createdBy              string
createdAt              timestamp
updatedAt              timestamp
```

`location`:

``` text
location:
  chapelId    string
  name        string
```

O nome do local é preservado como snapshot histórico.

------------------------------------------------------------------------

## 7. Responsáveis e substituições

Exemplo:

``` javascript
responsibilities: [
  { userId: "uid_maria", type: "designated", status: "confirmed" },
  { userId: "uid_ana", type: "substitute", replacesUserId: "uid_maria", status: "confirmed" }
]
```

`type`: `designated`, `substitute`.\
`status`: `confirmed`, `cancelled`.

O substituto recebe autorização operacional para aquele encontro
específico, sem receber responsabilidade permanente sobre o polo.

------------------------------------------------------------------------

## 8. `coordinatorIds` no encontro

O encontro manterá também `coordinatorIds`, representando os
coordenadores com responsabilidade operacional efetiva.

O campo existe para facilitar consultas, especialmente a agenda pessoal
do coordenador. `responsibilities` preserva o detalhe histórico da
designação e substituição.

A duplicação é intencional e deve ser mantida consistente pela
aplicação.

------------------------------------------------------------------------

## 9. Entidade `EncounterParticipant`

``` text
formations/{formationId}/poles/{poleId}/encounters/{encounterId}/participants/{serverId}
```

O `serverId` será o ID do documento.

Campos:

``` text
serverId             string
serverName           string
chapelId             string
chapelName           string
participationType    string
attendanceStatus     string
attendanceNote       string
recordedBy            string
recordedAt            timestamp
addedManually        boolean
createdAt             timestamp
updatedAt             timestamp
```

------------------------------------------------------------------------

## 10. Snapshot do participante

Ao gerar a lista do encontro, serão copiados `serverName`, `chapelId` e
`chapelName`.

Objetivo: preservar a fotografia histórica da lista no momento em que o
encontro foi preparado.

Alterações futuras no cadastro do servidor ou da capela não deverão
modificar retroativamente a lista histórica.

------------------------------------------------------------------------

## 11. `participationType`

Valores: `regular`, `manual`.

-   `regular`: incluído automaticamente segundo os critérios do polo.
-   `manual`: adicionado excepcionalmente por coordenador autorizado.

------------------------------------------------------------------------

## 12. Geração dos participantes

Fluxo:

``` text
Formation
   ↓
Pole
   ↓
Capelas atendidas
   ↓
Servidores elegíveis
   ↓
Critérios de etapa/modalidade
   ↓
Snapshot dos participantes
   ↓
EncounterParticipant
```

A lista resultante pertence ao encontro e não será recalculada
continuamente.

------------------------------------------------------------------------

## 13. Estado de presença

Valores: `pending`, `present`, `absent`, `justified`.

Todo participante novo começa como `pending`. `pending` não significa
ausência.

------------------------------------------------------------------------

## 14. Registro de presença

Ao registrar presença, atualizar `attendanceStatus`, `recordedBy`,
`recordedAt` e, quando necessário, `attendanceNote`.

------------------------------------------------------------------------

## 15. Observação individual

`attendanceNote` permite registrar informações como atraso, saída
antecipada ou justificativa. Não substitui o estado de presença.

------------------------------------------------------------------------

## 16. Auditoria básica

`recordedBy` e `recordedAt` permitem saber quem registrou e quando. Não
haverá coleção de auditoria independente na primeira versão.

------------------------------------------------------------------------

## 17. Estados do encontro

Valores: `scheduled`, `in_progress`, `completed`, `cancelled`.

Fluxo normal:

``` text
scheduled → in_progress → completed
```

Cancelamento:

``` text
scheduled → cancelled
```

------------------------------------------------------------------------

## 18. Regras por estado

### `scheduled`

Pode editar informações administrativas, agenda, responsáveis e
participantes e exportar a lista.

### `in_progress`

Pode registrar presença, modificar observações e adicionar participante
excepcionalmente. A identidade estrutural do encontro não deve ser
modificada livremente.

### `completed`

O encontro fica fechado. Coordenadores não alteram livremente presenças.
Administrador poderá reabrir/corrigir conforme as regras do módulo.

### `cancelled`

Não permite registro de presença e não gera ausência.

------------------------------------------------------------------------

## 19. Participantes e histórico

Não haverá entidade global de inscrição nesta versão. A participação é
contextual ao encontro.

Um servidor poderá participar de várias formações, polos e encontros.

------------------------------------------------------------------------

## 20. Permissões

### Administrador

Gestão global: formações, polos, capelas dos polos, coordenadores,
encontros, participantes, presenças, correções, reabertura, histórico e
exportações.

### Coordenador responsável pelo polo

Gestão operacional do polo: consultar formação e capelas, criar e editar
encontros permitidos, administrar participantes, registrar presença,
concluir encontros e exportar listas.

### Coordenador substituto

Acesso operacional somente ao encontro específico: consultar
participantes, registrar presença, observações, adicionar participante
excepcionalmente, concluir encontro e exportar lista.

### Viewer

Somente consulta.

------------------------------------------------------------------------

## 21. Regra de autorização

A autorização combina:

``` text
role do usuário
+
responsabilidade contextual
+
estado do recurso
```

### Polo

Administrador pode administrar qualquer polo.

Coordenador pode administrar um polo quando seu UID estiver em
`pole.coordinatorIds`.

### Encontro

Pode operar:

-   administrador;
-   coordenador autorizado pelo polo;
-   substituto confirmado no encontro.

Substituto recebe acesso somente ao encontro específico.

------------------------------------------------------------------------

## 22. Fechamento e correção

Depois de `completed`, coordenadores e substitutos não alteram
livremente a assistência. Administrador poderá reabrir/corrigir.

------------------------------------------------------------------------

## 23. Geração da lista para impressão

A exportação utilizará o `Encounter` e seus `EncounterParticipant`.

A lista deverá conter, no mínimo:

-   formação;
-   polo;
-   encontro;
-   tema;
-   data;
-   horário;
-   local;
-   responsáveis;
-   número;
-   servidor;
-   capela;
-   espaço para presença;
-   espaço para observação.

------------------------------------------------------------------------

## 24. Estratégia offline da primeira versão

A primeira versão não implementará sincronização offline real.

Fluxo:

``` text
Sistema online
      ↓
Preparar encontro
      ↓
Exportar lista
      ↓
Imprimir
      ↓
Realizar encontro sem internet
      ↓
Retornar à internet
      ↓
Lançar presenças
```

Uma futura versão poderá implementar modo offline e sincronização sem
alterar o modelo conceitual principal.

------------------------------------------------------------------------

## 25. Consultas previstas

### Formações

-   listar formações;
-   consultar formação;
-   listar formações ativas.

### Polos

-   listar polos de uma formação;
-   consultar capelas atendidas;
-   consultar coordenadores.

### Encontros

-   listar encontros de um polo;
-   listar próximos encontros;
-   consultar encontros de um coordenador;
-   consultar por período;
-   consultar por estado.

### Participantes

-   listar participantes de um encontro;
-   consultar presença;
-   adicionar participante;
-   consultar histórico de servidor.

### Estatísticas

-   frequência por servidor;
-   frequência por formação;
-   frequência por polo;
-   presentes/ausentes/justificados.

------------------------------------------------------------------------

## 26. Consultas históricas

O histórico de um servidor será obtido a partir dos documentos
`participants`, preferencialmente mediante `collectionGroup`.

Não será criada inicialmente uma coleção duplicada de histórico de
presença.

------------------------------------------------------------------------

## 27. Índices previstos

Os índices definitivos deverão ser confirmados durante a implementação.

Consultas candidatas:

``` text
encounters
  coordinatorIds array-contains
  startAt orderBy
```

Também poderão ser necessários índices por `status + startAt` e para
consultas `collectionGroup` de `participants`.

Não criar índices manualmente antes de confirmar as consultas reais.

------------------------------------------------------------------------

## 28. Regras de integridade

1.  `baseChapelId` deve estar em `chapelIds`.
2.  `coordinatorIds` devem referenciar usuários válidos.
3.  Participantes devem referenciar servidores existentes.
4.  `attendanceStatus` utiliza somente valores definidos.
5.  `status` do encontro utiliza somente valores definidos.
6.  Encontro cancelado não recebe presença.
7.  Encontro concluído não recebe alterações ordinárias de
    coordenadores.
8.  Substituto só recebe acesso ao encontro específico.
9.  Alterações futuras no cadastro do servidor não alteram snapshots
    históricos.
10. Nenhum módulo deverá criar usuários ou capelas paralelos.

------------------------------------------------------------------------

## 29. Decisões arquitetônicas congeladas para M10

-   Estrutura: `formations → poles → encounters → participants`.
-   ID do participante: `serverId`.
-   Presença: atributo do participante do encontro.
-   Capelas: entidades existentes.
-   Servidores: entidades existentes.
-   Usuários: entidades existentes.
-   Permissões: sistema de autorização existente.
-   Substituição: contextual ao encontro.
-   Snapshot: nome do servidor e capela preservados no participante.
-   Offline: exportação/impressão e lançamento posterior na primeira
    versão.

------------------------------------------------------------------------

## 30. Fora do escopo de M10

Não implementar neste módulo inicial:

-   sincronização offline automática;
-   certificados;
-   avaliações;
-   provas;
-   inscrições formais independentes;
-   notificações automáticas;
-   WhatsApp automático;
-   armazenamento permanente dos PDFs gerados;
-   sistema de frequência paralelo;
-   usuários específicos de Formação.

------------------------------------------------------------------------

## 31. Princípio final

O módulo deverá representar a realidade pastoral sem tornar o SGSA
excessivamente rígido.

Deverá permitir tanto:

``` text
Hoje

1ª Fase
└── Inicial + Permanente
     ├── Polo A
     └── Polo B
```

quanto:

``` text
Futuro

1ª Fase
├── Inicial
│    ├── Polo A
│    └── Polo B
│
└── Permanente
     ├── Polo A
     ├── Polo B
     └── Polo C
```

sem alteração da arquitetura fundamental.

------------------------------------------------------------------------

## 32. Próximo passo

Este documento é o contrato técnico de referência para a implementação
de M10.

Sequência prevista:

``` text
M10-T1 — Definição funcional
        ↓
M10-T2 — Modelo de dados
        ↓
M10-T2.3 — Este contrato técnico
        ↓
M10-T3 — Arquitetura do módulo Formação
        ↓
M10-T4 — Implementação incremental
```

**Nenhuma alteração em Firestore, Security Rules ou código deverá ser
realizada antes da aprovação deste contrato e da arquitetura M10-T3.**
