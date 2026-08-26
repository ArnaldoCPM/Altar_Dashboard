# CSV de Servidores — contrato SGSA v1

El CSV oficial es exclusivo para administradores. La exportación siempre incluye todos los documentos `Server`, incluso los de capillas inactivas; no incluye historial de formação/attendance ni metadatos técnicos.

El archivo usa UTF-8 con BOM, `;`, CRLF y las columnas exactamente en este orden:

`schema_version;Id;Nome;Data_nascimento;Idade;Sexo;chapelId;Capela;Bairro;Tipo;Estado;Horario_estudo;Batizado;Primeira_eucaristia;Crismado;Possui_alergia_doenca;Descricao_alergia_doenca;Nome_mae;Whatsapp_mae;Nome_pai;Whatsapp_pai;Whatsapp_candidato;Nome_tutor_guardiao;Whatsapp_tutor_guardiao`

`schema_version` debe ser `1`. `Id`, `Nome`, `chapelId` y `Capela` son obligatorios. `Id` hace merge: existente actualiza, nuevo crea y los ausentes no se eliminan. `chapelId` es canónico y `Capela` debe coincidir con el catálogo, activo o inactivo. En v1, un campo vacío limpia ese campo.

Las fechas se exportan ISO (`YYYY-MM-DD`), `Idade` y `Bairro` se preservan como valores legacy, y los teléfonos son dígitos. Los valores de sacramentos/alergia pueden ser `Sim`, `Não` o vacíos.

## Protección de fórmulas reversible

Para que una hoja de cálculo no ejecute valores que comienzan con `=`, `+`, `-` o `@`, el exportador les antepone un apóstrofo (`'`). Si el valor original ya empieza con apóstrofo, también se antepone uno. Al reimportar un CSV oficial se elimina exactamente un apóstrofo inicial. Por ello `=1+1` y `'texto` recuperan exactamente su valor original después de exportar e importar.

Los campos que contienen `;`, comillas o saltos de línea se entrecomillan; las comillas interiores se duplican. El parser acepta campos quoted y multilinea. Cualquier error de estructura o validación bloquea todo antes del primer batch.
