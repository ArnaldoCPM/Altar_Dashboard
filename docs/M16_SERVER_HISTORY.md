# M16 — Histórico individual do servidor

## Estado atual v0.10.0

M16 está concluído como ficha e histórico de consulta paroquial. Os campos `Possui_alergia_doenca` e `Descricao_alergia_doenca` destinam-se a cuidado/emergência pastoral; uma melhoria futura deve orientar o registro ao mínimo necessário, sem alterar a UI neste release.

## Consulta adotada

A ficha percorre exclusivamente a hierarquia canônica no momento em que o
usuário abre um servidor: `formations → poles → encounters → participants`.
Para cada encontro, ela lê somente o documento `participants/{serverId}` do
servidor escolhido. Não há `collectionGroup`, nova coleção, materialização,
Cloud Function nem assinatura permanente.

As listas de formações, polos e encontros são lidas uma vez por pai durante a
carga, com concorrência limitada a seis operações. Os documentos de
participantes também são lidos com o mesmo limite. Assim, não são baixadas as
listas de participantes de outros servidores.

## Apresentação do histórico

A interface carrega o histórico completo ao abrir a ficha e calcula todos os
contadores sobre esse conjunto completo. A seção **Histórico** mostra
inicialmente os 10 eventos mais recentes e permite **Mostrar mais** em blocos
de 10. Isto é paginação/expansão exclusivamente de apresentação: não trunca
nem altera a consulta hierárquica. **Próximos** e **Cancelados** permanecem em
seções separadas; cancelados não entram nas métricas pastorais.

Para o volume paroquial atual, a carga completa na abertura da ficha continua
adequada. Uma paginação de dados remota só deve ser considerada se o volume
futuro justificar uma nova decisão explícita de modelo e segurança.

## Custo aproximado

Para `F` formações, `P` polos e `E` encontros, uma abertura faz
`1 + F + P + E` chamadas Firestore: uma lista de formações, uma lista de polos
por formação, uma lista de encontros por polo e um `get` do participante por
encontro. Em leituras de documentos, a aproximação é `F + P + 2E` (incluindo a
verificação de participante inexistente). Com o conjunto de teste atual
(1 formação, 1 polo e 1 encounter), isso equivale a 4 leituras de documentos.

Reavaliar esta arquitetura quando o número total de Encounters históricos
ficar alto a ponto de tornar a abertura da ficha perceptivelmente lenta ou
dispendiosa. Nessa ocasião, qualquer mudança para consulta global ou resumo
materializado deve ser tratada como decisão explícita de modelo e segurança.

## Limitação de contexto indisponível

Sem uma consulta global não é possível descobrir uma subcoleção participante
cujo caminho pai já não pode ser enumerado. Os registros encontrados pela
hierarquia conservam os snapshots de participante; se uma futura estratégia
permitir localizar órfãos, a interface já apresenta `Contexto indisponível`
sem expor IDs técnicos.
