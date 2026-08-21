# M10 --- Formação

> **Documento histórico de design / blueprint.** Não é a fonte canônica do estado atual. Consulte `MASTER_PROJECT.md` para a arquitetura vigente, `docs/M10_FORMATION_DATA_MODEL.md` para o contrato final de M10 e `docs/PROJECT_CONTEXT.md` para estado e decisões.
>
> A implementação preservou a arquitetura modular central, mas deliberadamente integrou attendance em `participants.view.js` (sem `attendance.view.js` independente), usa operações individuais de attendance e deixou exportação, histórico, estatísticas e outros itens de futuro fora de M10.

## M10-T3 --- Architecture Blueprint

**Projeto:** SGSA --- Sistema de Gestão dos Servidores do Altar\
**Módulo:** M10 --- Formação\
**Documento:** Arquitetura oficial do módulo\
**Versão:** 1.0\
**Estado:** Proposto para aprovação\
**Data:** 2026-08-13

------------------------------------------------------------------------

## 1. Objetivo

Este documento define a arquitetura interna do módulo **Formação** antes
de sua implementação.

Ele complementa:

`docs/M10_FORMATION_DATA_MODEL.md`

O modelo de dados define **o que será armazenado**.

Este documento define **como o módulo será implementado**.

A arquitetura deverá permitir que o módulo seja implementado
incrementalmente, sem transferir sua lógica para `main.js` e sem criar
um sistema paralelo de autenticação ou autorização.

------------------------------------------------------------------------

# 2. Princípio arquitetural

Formação será um módulo independente do SGSA.

Estrutura geral:

``` text
main.js
   |
   +-- autenticação
   +-- Application Shell
   +-- integração global
   |
   +-- Formação
          |
          v
   js/modules/formation/
```

`main.js` será somente integrador da aplicação.

A lógica específica de Formação permanecerá em:

``` text
js/modules/formation/
```

------------------------------------------------------------------------

# 3. Estrutura de diretórios

Estrutura prevista:

``` text
js/
└── modules/
    └── formation/
        |
        ├── index.js
        ├── controller.js
        ├── state.js
        |
        ├── services/
        |   ├── formation.service.js
        |   ├── pole.service.js
        |   ├── encounter.service.js
        |   └── participant.service.js
        |
        ├── views/
        |   ├── formation.view.js
        |   ├── pole.view.js
        |   ├── encounter.view.js
        |   ├── participants.view.js
        |   └── attendance.view.js
        |
        └── components/
            ├── formation-card.js
            ├── pole-card.js
            ├── encounter-card.js
            ├── status-badge.js
            └── empty-state.js
```

A estrutura representa a arquitetura prevista. Os arquivos poderão ser
criados somente quando houver necessidade real durante a implementação.

Não criar arquivos vazios apenas para preencher a estrutura.

------------------------------------------------------------------------

# 4. API pública

`index.js` será a única porta pública do módulo.

API mínima:

``` text
initialize()
refresh()
destroy()
```

A aplicação externa não deverá importar diretamente:

``` text
controller.js
state.js
services/
views/
```

Toda integração externa deverá passar por `index.js`.

Novos métodos públicos somente deverão ser adicionados quando existir
uma necessidade concreta de integração.

------------------------------------------------------------------------

# 5. Controller

`controller.js` será responsável pela coordenação operacional do módulo.

Responsabilidades:

-   coordenar carregamento;
-   chamar services;
-   atualizar state;
-   aplicar regras de fluxo;
-   solicitar renderização;
-   receber ações das views;
-   controlar navegação interna;
-   consultar autorização;
-   coordenar operações de participantes;
-   coordenar presença;
-   controlar ciclo de vida;
-   tratar erros de operação.

O Controller não deverá conter grandes blocos de HTML.

O Controller não deverá executar diretamente operações Firestore.

Fluxo:

``` text
View
  |
  v
Controller
  |
  v
Service
  |
  v
Firestore
  |
  v
Service
  |
  v
Controller
  |
  v
State
  |
  v
View
```

------------------------------------------------------------------------

# 6. State

`state.js` será a única fonte de estado interno de Formação.

Estrutura conceitual:

``` javascript
formationState = {
    data: {
        formations: [],
        currentFormation: null,
        poles: [],
        currentPole: null,
        encounters: [],
        currentEncounter: null,
        participants: []
    },

    filters: {
        query: "",
        status: null,
        stage: null,
        modality: null,
        period: null
    },

    navigation: {
        currentSection: "formations",
        currentView: "list"
    },

    permissions: {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canManageAttendance: false,
        canCloseEncounter: false
    },

    ui: {
        loading: false,
        error: null
    },

    subscriptions: {
        formations: null,
        poles: null,
        encounters: null,
        participants: null
    }
};
```

Os nomes poderão ser ajustados durante a implementação, mas a regra
permanece:

> Não haverá cópias paralelas do estado de Formação em `main.js` ou em
> outras camadas.

------------------------------------------------------------------------

# 7. Services

Os services serão responsáveis exclusivamente pelo acesso aos dados.

## 7.1 `formation.service.js`

Responsável por:

-   listar formações;
-   obter formação;
-   criar;
-   atualizar;
-   alterar status.

## 7.2 `pole.service.js`

Responsável por:

-   listar polos;
-   obter polo;
-   criar;
-   atualizar;
-   ativar/desativar.

## 7.3 `encounter.service.js`

Responsável por:

-   listar encontros;
-   obter encontro;
-   criar;
-   atualizar;
-   cancelar;
-   iniciar;
-   concluir;
-   reabrir quando autorizado.

## 7.4 `participant.service.js`

Responsável por:

-   gerar participantes;
-   listar participantes;
-   adicionar participante;
-   remover participante;
-   atualizar presença;
-   atualizar observação;
-   operações batch.

------------------------------------------------------------------------

# 8. Services não decidem autorização

Services não devem determinar:

> "Este coordenador pode fazer isso?"

Essa decisão pertence ao Controller em conjunto com o sistema de
autorização existente.

Fluxo:

``` text
Authorization
      |
      v
Controller
      |
      v
Service
      |
      v
Firestore
```

O service executa uma operação já autorizada e não deve duplicar as
regras de autorização da aplicação.

As Firestore Security Rules continuam sendo a proteção final no backend.

------------------------------------------------------------------------

# 9. Views

Views serão responsáveis por:

-   apresentação;
-   captura de interação;
-   emissão de ações para o Controller.

Não deverão:

-   consultar Firestore;
-   decidir permissões;
-   alterar diretamente o state;
-   implementar regras de elegibilidade;
-   decidir transições de estado;
-   executar queries.

## 9.1 `formation.view.js`

Responsável por:

-   lista de formações;
-   filtros;
-   criação;
-   edição;
-   status.

## 9.2 `pole.view.js`

Responsável por:

-   lista de polos;
-   capela base;
-   capelas atendidas;
-   coordenadores.

## 9.3 `encounter.view.js`

Responsável por:

-   agenda;
-   criação;
-   edição;
-   responsáveis;
-   substitutos;
-   status.

## 9.4 `participants.view.js`

Responsável por:

-   lista de participantes;
-   inclusão;
-   remoção;
-   exportação.

## 9.5 `attendance.view.js`

Responsável por:

-   presença;
-   ausência;
-   justificação;
-   observações;
-   fechamento da lista.

------------------------------------------------------------------------

# 10. Comunicação View → Controller

A View comunica ações.

Exemplo:

``` text
Usuário clica "Criar encontro"
        |
        v
encounter.view
        |
        v
onAction("create")
        |
        v
controller
```

A View não deve decidir o que significa a ação.

------------------------------------------------------------------------

# 11. Components

`components/` será reservado para elementos visuais reutilizáveis.

Exemplos:

``` text
formation-card
pole-card
encounter-card
status-badge
empty-state
```

Não criar componentes apenas por antecipação.

Uma peça deverá ser extraída quando:

-   houver reutilização real;
-   houver ganho claro de manutenção;
-   ou existir uma necessidade estrutural do módulo.

------------------------------------------------------------------------

# 12. Navegação

O Application Shell continua sendo responsável pela navegação principal:

``` text
Dashboard
Servidores
Capelas
Formação
Usuários
Relatórios
Configurações
```

Ao entrar em Formação:

``` text
Shell
  |
  v
Formation Module
```

Formação poderá possuir navegação interna:

``` text
Formações
Polos
Agenda
Encontros
```

Não será criado um segundo router global.

------------------------------------------------------------------------

# 13. Estado de navegação

O módulo poderá manter:

``` text
currentSection
currentView
currentFormation
currentPole
currentEncounter
```

Exemplos conceituais:

``` text
formations/list
formation/detail
pole/detail
encounter/detail
attendance
```

O objetivo é permitir retorno sem perder o contexto atual.

------------------------------------------------------------------------

# 14. Carregamento progressivo

Não carregar todas as entidades de uma vez.

Fluxo:

``` text
Entrar em Formação
        |
        v
Formações

Selecionar Formação
        |
        v
Polos

Selecionar Polo
        |
        v
Encontros

Selecionar Encontro
        |
        v
Participantes
```

Isso reduz consultas e mantém o módulo escalável.

------------------------------------------------------------------------

# 15. Participantes

Participantes serão carregados quando um encontro for selecionado.

Fluxo:

``` text
Encontro selecionado
        |
        v
participant.service
        |
        v
participants/*
        |
        v
state.participants
        |
        v
participants.view
```

Não haverá uma lista global em memória contendo participantes de todos
os encontros.

------------------------------------------------------------------------

# 16. Geração dos participantes

A geração será uma operação coordenada pelo Controller.

Fluxo:

``` text
Criar/preparar encontro
        |
        v
Controller
        |
        +-- obter Polo
        +-- obter capelas
        +-- obter servidores elegíveis
        +-- aplicar critérios
        +-- criar snapshots
        |
        v
batch write
        |
        v
participants/*
```

A View somente inicia a ação.

A lógica de elegibilidade não pertence à View.

------------------------------------------------------------------------

# 17. Critérios de elegibilidade

A arquitetura deverá permitir critérios baseados em:

``` text
stage
modality
chapelIds
```

A implementação não deverá ser codificada para uma única combinação.

Deve suportar, por exemplo:

``` text
first + initial
first + permanent
second + initial
second + permanent
```

e também:

``` text
first + initial + permanent
```

quando a realidade pastoral utilizar essa configuração.

------------------------------------------------------------------------

# 18. Lista de participantes como snapshot

Quando a lista for gerada, o módulo copiará os dados necessários para o
participante do encontro.

Depois da geração:

> a lista pertence ao encontro.

Alterações futuras no cadastro global de servidor ou capela não deverão
alterar retroativamente o histórico do encontro.

------------------------------------------------------------------------

# 19. Presença

Fluxo:

``` text
Attendance View
        |
        v
Controller
        |
        v
Authorization
        |
        v
participant.service
        |
        v
Firestore
        |
        v
State
        |
        v
Attendance View
```

Para múltiplas presenças:

``` text
marcação local
        |
        v
Salvar
        |
        v
batch update
        |
        v
Firestore
        |
        v
refresh
```

------------------------------------------------------------------------

# 20. Exportação

A exportação será uma operação do módulo.

Fluxo:

``` text
Encounter
+
Participants
        |
        v
Controller
        |
        v
formatter/export
        |
        v
impressão ou PDF
```

Não será criada uma coleção Firestore para os PDFs gerados.

A primeira versão deverá gerar uma folha pronta para impressão.

------------------------------------------------------------------------

# 21. Permissões

O módulo reutilizará o sistema de autorização existente.

Não será criado um sistema paralelo.

O Controller resolverá permissões contextuais como:

``` text
canCreate
canEdit
canManageAttendance
canCloseEncounter
```

A View recebe o resultado necessário para a interface.

A View não deverá consultar diretamente:

``` text
user.role
```

para decidir regras de negócio.

------------------------------------------------------------------------

# 22. Autorização contextual

Além do role global:

``` text
admin
coordinator
viewer
```

o Controller considerará:

``` text
pole.coordinatorIds
encounter.coordinatorIds
encounter.responsibilities
```

Isso permite tratar corretamente:

-   coordenador responsável;
-   coordenador de outro polo;
-   substituto;
-   viewer;
-   administrador.

------------------------------------------------------------------------

# 23. Substitutos

O substituto terá autorização operacional específica para o encontro.

Ele não se torna responsável permanente pelo polo.

O Controller deverá distinguir:

``` text
responsável habitual
```

de:

``` text
substituto do encontro
```

------------------------------------------------------------------------

# 24. `main.js`

`main.js` deverá permanecer como integrador.

Sua interação com Formação deverá ser equivalente a:

``` text
initializeFormation()
refreshFormation()
destroyFormation()
```

ou equivalente através de `index.js`.

`main.js` não deverá conhecer:

``` text
formationState
formation.service
pole.service
encounter.service
participant.service
formation.view
attendance.view
```

------------------------------------------------------------------------

# 25. Eventos globais

Quando uma comunicação com a aplicação for realmente necessária, poderão
ser utilizados eventos explícitos.

Exemplo:

``` text
formation:encounter-completed
```

Entretanto, eventos globais não deverão ser usados como mecanismo padrão
de comunicação interna.

Dentro do módulo, preferir:

``` text
View → Controller
Controller → State/View
```

------------------------------------------------------------------------

# 26. Ciclo de vida

O módulo deverá possuir:

``` text
initialize()
refresh()
destroy()
```

### `initialize()`

-   preparar state;
-   registrar listeners;
-   carregar dados iniciais;
-   renderizar.

### `refresh()`

-   atualizar os dados da tela atual;
-   preservar contexto quando possível.

### `destroy()`

-   cancelar listeners;
-   cancelar subscriptions;
-   limpar estado temporário;
-   remover eventos internos.

Objetivo:

``` text
Entrar
  ↓
initialize

Sair
  ↓
destroy

Entrar novamente
  ↓
initialize
```

sem listeners duplicados.

------------------------------------------------------------------------

# 27. Subscriptions

Subscriptions Firestore deverão pertencer ao módulo.

Não será permitido:

``` text
main.js → onSnapshot(Formação)
```

O padrão será:

``` text
formation.service
        ↓
controller
        ↓
state
```

`destroy()` deverá cancelar todas as subscriptions ativas.

------------------------------------------------------------------------

# 28. Loading, vazio e erro

O módulo deverá possuir estados explícitos para:

``` text
idle
loading
success
error
```

Cada tela deverá prever:

-   loading;
-   empty state;
-   error state;
-   conteúdo.

Exemplos:

``` text
Nenhuma formação cadastrada.
```

``` text
Nenhum polo configurado para esta formação.
```

``` text
Nenhum encontro agendado para este polo.
```

``` text
Nenhum participante encontrado.
```

------------------------------------------------------------------------

# 29. Tratamento de erros

Services propagam erros.

Controller decide como tratá-los.

Views apresentam mensagens amigáveis.

Fluxo:

``` text
Firestore error
      |
      v
Service
      |
      v
Controller
      |
      v
mensagem amigável
      |
      v
View
```

Não exibir sucesso quando a operação Firestore falhar.

------------------------------------------------------------------------

# 30. Filtros

Os filtros pertencem ao Controller.

As Views apenas capturam os valores.

### Formações

-   busca;
-   etapa;
-   modalidade;
-   status.

### Polos

-   busca;
-   capela;
-   coordenador;
-   ativo/inativo.

### Encontros

-   período;
-   status;
-   responsável.

### Participantes

-   nome;
-   capela;
-   presença.

Seguir o padrão consolidado em Dashboard:

``` text
View
  ↓
Controller.applyFilters(...)
  ↓
State
  ↓
Render
```

------------------------------------------------------------------------

# 31. Fluxo funcional --- Formação

``` text
Nova Formação
      ↓
form.view
      ↓
controller
      ↓
authorization
      ↓
formation.service
      ↓
Firestore
      ↓
refresh
```

------------------------------------------------------------------------

# 32. Fluxo funcional --- Polo

``` text
Nova Polo
      ↓
pole.view
      ↓
controller
      ↓
authorization
      ↓
pole.service
      ↓
Firestore
      ↓
refresh
```

------------------------------------------------------------------------

# 33. Fluxo funcional --- Encontro

``` text
Novo Encontro
      ↓
encounter.view
      ↓
controller
      ↓
authorization
      ↓
validation
      ↓
encounter.service
      ↓
Firestore
```

Estado inicial:

``` text
scheduled
```

------------------------------------------------------------------------

# 34. Fluxo funcional --- Substituição

``` text
Responsável designado
      ↓
não poderá comparecer
      ↓
selecionar substituto
      ↓
Controller
      ↓
authorization
      ↓
responsibilities
      ↓
coordinatorIds
```

O substituto recebe somente o acesso operacional previsto para aquele
encontro.

------------------------------------------------------------------------

# 35. Fluxo funcional --- Participantes

``` text
Gerar participantes
      ↓
Controller
      ↓
capelas do polo
      ↓
servidores elegíveis
      ↓
snapshot
      ↓
batch write
      ↓
participants/*
```

Participante manual:

``` text
Adicionar participante
      ↓
Controller
      ↓
validar servidor
      ↓
participant.service
      ↓
participationType = manual
```

------------------------------------------------------------------------

# 36. Fluxo funcional --- Exportação

``` text
Encontro
  +
Participantes
      ↓
Controller
      ↓
formatter
      ↓
folha imprimível
```

O documento deverá conter:

-   formação;
-   polo;
-   encontro;
-   tema;
-   data;
-   horário;
-   local;
-   responsáveis;
-   participantes;
-   capela;
-   espaço para presença;
-   observações.

------------------------------------------------------------------------

# 37. Fluxo funcional --- Presença

``` text
Attendance View
      ↓
marcação
      ↓
state local
      ↓
Salvar presenças
      ↓
Controller
      ↓
authorization
      ↓
batch update
      ↓
Firestore
```

Estados:

``` text
pending
present
absent
justified
```

------------------------------------------------------------------------

# 38. Fluxo funcional --- Concluir encontro

``` text
in_progress
      ↓
Concluir encontro
      ↓
confirmação
      ↓
Controller
      ↓
encounter.service
      ↓
completed
```

Participantes pendentes não impedem obrigatoriamente o fechamento.

A interface deverá alertar sobre pendências.

------------------------------------------------------------------------

# 39. Fluxo funcional --- Reabrir

Somente administrador:

``` text
completed
      ↓
Reabrir
      ↓
in_progress
      ↓
corrigir
      ↓
completed
```

------------------------------------------------------------------------

# 40. Fluxo funcional --- Cancelar

``` text
scheduled
      ↓
Cancelar
      ↓
confirmação
      ↓
cancelled
```

Um encontro cancelado não recebe presença e não gera ausência.

------------------------------------------------------------------------

# 41. Histórico

Histórico de servidor:

``` text
Servidor
      ↓
collectionGroup(participants)
      ↓
serverId
      ↓
histórico
```

Não será criada uma coleção de histórico duplicada.

------------------------------------------------------------------------

# 42. Frequência

A frequência será calculada a partir dos participantes dos encontros.

Encontros `cancelled` não entram no cálculo.

A fórmula definitiva deverá ser estabelecida antes da implementação da
tela de estatísticas.

------------------------------------------------------------------------

# 43. Ordem oficial de implementação

M10 deverá ser implementado incrementalmente.

## M10-T4.1 --- Foundation

-   estrutura do módulo;
-   `index.js`;
-   `controller.js`;
-   `state.js`;
-   integração com Shell;
-   navegação inicial;
-   ciclo de vida.

## M10-T4.2 --- Formações

-   listar;
-   criar;
-   editar;
-   ativar;
-   arquivar.

## M10-T4.3 --- Polos

-   criar;
-   editar;
-   capela base;
-   capelas atendidas;
-   coordenadores.

## M10-T4.4 --- Encontros

-   agenda;
-   criar;
-   editar;
-   responsáveis;
-   substituições;
-   estados.

## M10-T4.5 --- Participantes

-   geração automática;
-   snapshot;
-   inclusão manual;
-   remoção.

## M10-T4.6 --- Presenças

-   registrar;
-   batch;
-   observações;
-   fechamento;
-   reabertura administrativa.

## M10-T4.7 --- Exportação

-   lista imprimível;
-   folha de presença.

## M10-T4.8 --- Histórico e estatísticas

-   histórico por servidor;
-   frequência;
-   estatísticas básicas.

## M10-T4.9 --- Security Rules e auditoria

-   regras Firestore;
-   testes de autorização;
-   revisão final de permissões.

------------------------------------------------------------------------

# 44. Critérios de qualidade por etapa

Cada etapa deverá seguir:

``` text
Implementação
      ↓
node --check
      ↓
git diff --check
      ↓
teste funcional
      ↓
revisão
      ↓
commit
```

Não avançar para a próxima etapa se a anterior deixar o sistema
instável.

Especialmente porque Formação reutiliza:

-   usuários;
-   capelas;
-   servidores;
-   autorização;
-   Firestore.

------------------------------------------------------------------------

# 45. Regras arquitetônicas obrigatórias

Durante M10, não deverão ser introduzidos em `main.js`:

``` text
renderFormation()
renderPoles()
renderEncounters()
renderParticipants()
applyFormationFilters()
saveAttendance()
generateParticipants()
```

Também não deverá ser criada:

-   autenticação paralela;
-   autorização paralela;
-   cadastro paralelo de servidores;
-   cadastro paralelo de capelas;
-   coleção global de presença;
-   coleção global de histórico;
-   router paralelo.

------------------------------------------------------------------------

# 46. Princípio de ouro

A arquitetura de M10 seguirá:

``` text
VIEW
"Algo aconteceu."

CONTROLLER
"Qual operação corresponde?"

AUTHORIZATION
"Este usuário pode executá-la?"

SERVICE
"Executarei a operação de dados."

STATE
"Este é o novo estado."

VIEW
"Mostrarei o resultado."
```

A regra pode ser resumida em:

> **A View não decide. O Service não decide. `main.js` não decide. O
> Controller coordena, o sistema de autorização autoriza e o Firestore
> Security Rules protege os dados.**

------------------------------------------------------------------------

# 47. Critérios de conclusão de M10-T3

M10-T3 será considerado concluído quando:

-   o módulo possuir API pública;
-   `main.js` permanecer apenas como integrador;
-   existir uma única fonte de estado;
-   Firestore estiver isolado nos services;
-   Views não consultarem Firestore;
-   Views não decidirem permissões;
-   Controller coordenar operações;
-   autorização permanecer centralizada;
-   subscriptions possuírem ciclo de vida;
-   participantes e presença estiverem encapsulados;
-   exportação pertencer ao módulo;
-   navegação interna estiver encapsulada;
-   não houver lógica de Formação em `main.js`.

------------------------------------------------------------------------

# 48. Próximo passo

Após aprovação deste blueprint:

``` text
M10-T1
Requisitos funcionais
        ↓
M10-T2
Modelo de dados
        ↓
M10-T3
Arquitetura
        ↓
M10-T4.1
Foundation do módulo
```

**Nenhuma alteração em Firebase, Firestore Security Rules ou código
deverá ser feita antes da aprovação deste documento.**

O primeiro prompt de Codex deverá ser exclusivamente para **M10-T4.1 ---
Foundation**, com escopo pequeno, validação completa e sem CRUD de
Formação ainda.
