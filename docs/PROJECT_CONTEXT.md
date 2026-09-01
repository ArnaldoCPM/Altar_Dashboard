# Contexto atual — v0.10.0 candidate

SGSA possui Dashboard, Servidores, Usuários, Capelas e Formação v2. M13–M16 estão concluídos: modularização, Capelas, M15 email/senha/invite, ficha/histórico M16, CSV round-trip, listas paginadas e operação de Formação.

Auth usa Firebase e `users/{uid}` com `admin`, `coordinator` e `viewer`. M15 mantém `users/{email}` pending como transição autorizada; Google e Email/Password coexistem. Rules controlam papel, usuário ativo, capela e lifecycle.

Formação v2 usa catálogo `formationGroups`, instâncias técnicas `poles`, roster e Participants snapshots. Lifecycle: draft, active, completed e archived. Dashboard e Meus encontros mostram somente Formações active.

Produção foi auditada em pré-produção: 11 usuários (4 pending normais), 15 capelas e 84 servidores; `Idade` é legado informativo. Não houve BLOCKER ou migração real pendente. Referência de validação: 121 testes SGSA e 3 testes Functions.

Política pastoral: usuários ativos leem globalmente Servidores para cuidado e coordenação; Coordinator escreve somente na própria capela; Viewer tem leitura global. Contatos familiares e informações de emergência são destinados exclusivamente a comunicação/cuidado autorizado. CSV completo é confidencial e Admin-only.

Pré-Vercel: código candidate pronto; Console Firebase, deploy e smoke test ainda pendentes. Functions têm 8 vulnerabilidades moderadas transitivas, sem altas/críticas; não usar audit fix automático antes do release.
