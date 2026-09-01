# SGSA

Sistema de Gestão dos Servidores do Altar para administração pastoral de servidores, capelas, acessos e formação.

## Módulos e papéis

- Dashboard e Servidores: cadastro, filtros, paginação, ficha M16 e CSV reversível.
- Usuários e Capelas: gestão exclusiva de Admin.
- Formação v2: grupos reutilizáveis, critérios, lista-base, roster, encontros, presença e relatório M11.
- `admin`: gestão global; `coordinator`: leitura pastoral global e escrita somente na própria capela; `viewer`: leitura pastoral global, sem escrita.

## Stack e execução local

Frontend estático em JavaScript ES Modules/Tailwind Play CDN, hospedável em Vercel; Firebase Authentication, Firestore e Functions v2 atendem identidade, dados e M15. Consulte [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) para Emulator, seeds e testes.

O Emulator só é usado em host local com `?emulator=1`; sem esse parâmetro a aplicação usa Firebase Cloud. Não inclua credenciais no repositório.

## Release

O código está em preparação para `v0.10.0`. A produção ainda requer configuração Console, deploy controlado e smoke test; tag e publicação não foram realizados.
