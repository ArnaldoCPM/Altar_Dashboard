# Contexto atual — v0.11.0

SGSA possui Dashboard, Servidores, Usuários, Capelas e Formação v2. M13–M16 estão concluídos: modularização, Capelas, M15 email/senha/invite, ficha/histórico M16, CSV round-trip, listas paginadas e operação de Formação.

Auth usa Firebase e `users/{uid}` com `admin`, `coordinator` e `viewer`. M15 mantém `users/{email}` pending como transição consolidada exclusivamente pelo fluxo Admin `sendUserAccess`, sem migração autônoma pelo cliente; Google e Email/Password coexistem. Rules controlam papel, usuário ativo, capela e lifecycle.

Formação v2 usa catálogo `formationGroups`, instâncias técnicas `poles`, roster e Participants snapshots. Lifecycle: draft, active, completed e archived. Dashboard e Meus encontros mostram somente Formações active.

O contrato central de nascimento valida calendário real e resolve legacy seguro somente para leitura. `Idade` permanece legado/interchange, sem fallback funcional; desconhecido é `null`. A ferramenta Admin Qualidade dos dados permite revisão individual com detecção transacional de conflitos. Formação usa o contrato central preservando referências calendário e critérios pastorais. As Rules T4D reforçam a integridade de nascimento.

Política pastoral: usuários ativos leem globalmente Servidores para cuidado e coordenação; Coordinator escreve somente na própria capela; Viewer tem leitura global. Contatos familiares e informações de emergência são destinados exclusivamente a comunicação/cuidado autorizado. CSV completo é confidencial e Admin-only.

Frontend funcional `a7bd85d` validado em produção, T4D ativo e smoke antes e depois das Rules OK. Referência manual confirmada: Emulator 180/180 PASS. O fechamento documental, novo deploy de release e tag v0.11.0 ainda estão pendentes nesta etapa. T1/T2 são históricos e não fazem parte do runtime/release. Revisão de dependências de Functions permanece no roadmap, fora deste checkpoint.
