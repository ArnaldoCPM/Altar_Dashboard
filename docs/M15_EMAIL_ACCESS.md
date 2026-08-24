# M15 — Acesso por e-mail e senha

## Arquitetura

`sendUserAccess` é uma Cloud Function callable mínima. Ela exige uma sessão Firebase e confirma novamente, no servidor, que `users/{request.auth.uid}` é um perfil `admin` ativo. A interface não é uma camada de autorização.

Para um perfil pendente em `users/{email}` a Function normaliza o endereço (trim + minúsculas), cria ou reutiliza o usuário Firebase Authentication e cria `users/{uid}` em uma transação. Só remove o documento pendente depois de criar o perfil canônico. Se já existir um perfil canônico para o mesmo UID, ela interrompe o fluxo para evitar sobrescrever autorização existente.

A senha inicial é aleatória, gerada apenas dentro da Function e nunca retornada, registrada ou persistida fora do Firebase Authentication. O navegador chama `sendPasswordResetEmail()` após uma resposta elegível; é o e-mail padrão do Firebase que permite definir a primeira senha ou redefini-la.

## Limitação deliberada: contas somente Google

M15 não vincula provedores nem cria senha para contas cujo `providerData` não contém `password` (hoje, Google-only). A Function consolida com segurança um pendente que já corresponda ao UID Google, mas responde que ele não é elegível ao reset. A tela administrativa informa que o acesso Google permanece disponível. Uma melhoria futura pode oferecer vinculação explícita de credenciais após projeto e testes próprios.

## Desenvolvimento e testes locais

Inicie os três emuladores:

```powershell
firebase emulators:start --only auth,firestore,functions
```

Abra a aplicação local com `?emulator=1`. A Function usa a porta `5001` e nunca precisa de credenciais de produção. O formulário público de redefinição sempre mostra a mesma mensagem, inclusive se o e-mail não existir. O Auth Emulator expõe os action codes na Emulator UI para concluir a definição de senha.

Teste de unidade da Function:

```powershell
cd functions
npm test
```

Checklist de Emulator/manual: Admin convida pendente ativo (UID Auth + `users/{uid}`, pendente removido, Admin permanece logado); reenvio não cria segundo UID; Coordinator/Viewer recebem `permission-denied`; pendente inativo é recusado; endereço inexistente no fluxo público recebe texto neutro; login e logout preservam `role`, `active` e `chapelId`; Google Sign-In continua sem alteração; e a migração legacy pelo cliente continua compatível.

## Produção

Antes de deploy, habilite Email/Password e configure o modelo de e-mail padrão de recuperação no Firebase Authentication. Recomenda-se política forte com mínimo de 10 caracteres e combinação de letras, números e símbolos. Esta alteração de política deve ser feita e aprovada separadamente no Firebase Console; M15 não muda configurações produtivas.
