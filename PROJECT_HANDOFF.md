# SGSA — Handoff v0.10.0

`main` está no commit `ba45183`; está 33 commits à frente de `origin/main`. O candidato é `v0.10.0`, ainda sem tag, push ou deploy.

M13–M16 e Formação v2 estão encerrados. Não reabrir lifecycle, Rules, UX de Encounter/Presença, CSV, M15 ou política pastoral durante o release.

T1 removeu logs sensíveis. T2 aprovou leitura pastoral global. T3 auditou produção sem blockers/migrações reais e removeu o legacy controlado. Antes do deploy faltam Console Firebase/Functions/Rules, Vercel e smoke test produtivo.

Validação de referência: SGSA 121/121; Functions 3/3; `cd functions; npm run lint`. Use [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md). Produção v0.10.0 ainda não foi publicada; o tag deve apontar para o commit efetivamente testado em produção.
