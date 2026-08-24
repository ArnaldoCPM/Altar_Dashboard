# Desenvolvimento local com Firebase Emulator

## Requisitos

Firebase CLI, Node.js e as dependências em `scripts/formation-rules-tests` e `functions`.

## Iniciar os Emulators

Na raiz do repositório:

```powershell
firebase emulators:start --only auth,firestore,functions
```

Portas configuradas: Auth `9099`, Firestore `8080`, Functions `5001` e Emulator UI `4000`.

Para o fluxo M15, instale as dependências de Functions uma vez com `cd functions; npm install`. Consulte [M15_EMAIL_ACCESS.md](M15_EMAIL_ACCESS.md) para o roteiro de acesso por e-mail e senha.

## Abrir a aplicação no modo Emulator

Sirva o projeto em `localhost`, `127.0.0.1` ou `::1` e inclua `?emulator=1` na URL, por exemplo:

```text
http://127.0.0.1:5500/?emulator=1
```

O código só conecta aos Emulators quando o host é local **e** o parâmetro está presente. Sem ele, a aplicação usa Firebase Cloud.

## Seeds locais

No diretório `scripts/formation-rules-tests`, execute na ordem:

```powershell
node seed-local-admin.js
node seed-local-poles.js
node seed-local-servers.js
```

As contas existem exclusivamente no Emulator. O Admin padrão é `admin.local@example.test`, com senha `local-admin-password`, ou o valor de `LOCAL_ADMIN_PASSWORD`. Os demais usuários de `seed-local-poles.js` usam `Test123456!`.

Os scripts verificam endpoints locais e foram desenhados para não usar endpoints Cloud. Não os use contra serviços Cloud.

## Tests de Rules

No mesmo diretório:

```powershell
npm test
```

O conjunto atual possui 95 testes de Rules.

## Persistência

Os dados do Emulator são efêmeros no fluxo atual. Import/export de dados pode ser adicionado futuramente; não há persistência automática configurada.
