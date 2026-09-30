# CSV de Servidores — contrato SGSA v1

El CSV oficial es exclusivo para administradores. La exportación siempre incluye todos los documentos `Server`, incluso los de capillas inactivas; no incluye historial de formação/attendance ni metadatos técnicos.

El archivo usa UTF-8 con BOM, `;`, CRLF y las columnas exactamente en este orden:

`schema_version;Id;Nome;Data_nascimento;Idade;Sexo;chapelId;Capela;Bairro;Tipo;Estado;Horario_estudo;Batizado;Primeira_eucaristia;Crismado;Possui_alergia_doenca;Descricao_alergia_doenca;Nome_mae;Whatsapp_mae;Nome_pai;Whatsapp_pai;Whatsapp_candidato;Nome_tutor_guardiao;Whatsapp_tutor_guardiao`

`schema_version` debe ser `1`. `Id`, `Nome`, `chapelId` y `Capela` son obligatorios. `Id` hace merge: existente actualiza, nuevo crea y los ausentes no se eliminan. `chapelId` es canónico y `Capela` debe coincidir con el catálogo, activo o inactivo. En v1, un campo vacío limpia ese campo.

Las fechas se exportan ISO (`YYYY-MM-DD`), `Idade` y `Bairro` se preservan como valores legacy, y los teléfonos son dígitos. Los valores de sacramentos/alergia pueden ser `Sim`, `Não` o vacíos.

## Protección de fórmulas reversible

Para que una hoja de cálculo no ejecute valores que comienzan con `=`, `+`, `-` o `@`, el exportador les antepone un apóstrofo (`'`). Si el valor original ya empieza con apóstrofo, también se antepone uno. Al reimportar un CSV oficial se elimina exactamente un apóstrofo inicial. Por ello `=1+1` y `'texto` recuperan exactamente su valor original después de exportar e importar.

Los campos que contienen `;`, comillas o saltos de línea se entrecomillan; las comillas interiores se duplican. El parser acepta campos quoted y multilinea. Cualquier error de estructura o validación bloquea todo antes del primer batch.


## Data_nascimento — proteção T4B

O contrato oficial permanece ISO estrito `YYYY-MM-DD` de calendário real ou célula vazia. Não aceita barras, anos incompletos, espaços em torno da data nem datas impossíveis como `2015-02-31`. A validação reutiliza o serviço central de nascimento; não usa Date/getTime. Célula vazia continua limpando o campo no merge v1.

Todas as datas do arquivo oficial são verificadas antes do primeiro batch; o writer repete essa validação sobre uma cópia dos payloads. O importador legado permanece disponível: ISO é preservado; DD/MM, MM/DD e YYYY/MM/DD inequívocos, inclusive dia igual ao mês, são convertidos a ISO. Ambíguos e inválidos bloqueiam toda a importação, sem começar a gravar. Vazio legado continua produzindo string vazia; não se inventa data. Os mapeamentos das demais colunas permanecem os mesmos.

O legado é normalizado no preview e novamente na fronteira de escrita; todos os payloads após aplicação do escopo também são validados antes do primeiro batch. A atomicidade é de VALIDAÇÃO: uma falha de rede/permissão após um batch confirmado ainda pode deixar uma importação parcial. Não há transação única para todos os batches.

### Reconhecimento do arquivo

- `official`: cabeçalho completo, na ordem oficial, e schema_version igual a 1 em todas as linhas.
- `malformed`: cabeçalho oficial com versão incorreta; ou cabeçalho não exato com marcador normalizado começando por `schema`, coluna `chapelId`, ou pelo menos 23 colunas com 20 correspondências aos nomes oficiais. Produz erro; nunca cai automaticamente no legado.
- `legacy`: demais cabeçalhos, sujeitos ao parser legado e à validação de todas as datas dos registros importáveis. Os cabeçalhos antigos sem schema_version e chapelId continuam aceitos.

Para reconhecer marcadores, ignoram-se caixa, acentos e caracteres não alfanuméricos. Isso não relaxa a exigência das 24 colunas do contrato oficial. Arquivo impossível de analisar também produz erro. Um arquivo arbitrariamente descaracterizado não permite inferir sua origem: a regra é deliberadamente explícita, não uma tentativa de adivinhação.

### Exportação durante o saneamento

A exportação oficial valida todos os registros antes de construir o CSV e de criar o arquivo para download. ISO válido sai inalterado. Valores reconhecidos como vazios pelo serviço central (ausente, null, string vazia ou só espaços) saem como célula vazia, sem alterar Firestore. Qualquer data não vazia fora do contrato — inclusive legacy seguro — bloqueia toda a exportação, com contagem e aviso de normalização pendente.

Nenhuma data legacy é convertida ou apagada para permitir exportar. Não existe exportador legacy alternativo nesta fase. O número de pendências é calculado; não se fixa 44. BOM, separador, CRLF, escaping reversível e as outras 23 colunas conservam o contrato existente.
