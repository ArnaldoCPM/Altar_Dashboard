function escapeHtml(value = "") {
    const element = document.createElement("span");
    element.textContent = value;
    return element.innerHTML;
}

function dateTime(value) {
    const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString("pt-BR") : "—";
}

function statusLabel(status) {
    return ({ scheduled: "Agendado", in_progress: "Em andamento", completed: "Concluído", cancelled: "Cancelado" })[status] || "—";
}

function attendanceLabel(status) {
    return ({ pending: "Pendente", present: "Presente", absent: "Ausente", justified: "Justificado" })[status] || "Pendente";
}

function sortParticipants(participants) {
    return [...participants].sort((left, right) => {
        const chapel = String(left.chapelName || "").localeCompare(String(right.chapelName || ""), "pt-BR");
        return chapel || String(left.serverName || "").localeCompare(String(right.serverName || ""), "pt-BR");
    });
}

function summary(participants) {
    const counts = { present: 0, absent: 0, justified: 0, pending: 0 };
    participants.forEach((participant) => {
        const status = participant.attendanceStatus;
        counts[Object.hasOwn(counts, status) ? status : "pending"] += 1;
    });
    return counts;
}

function reportRows(participants, status) {
    return sortParticipants(participants).map((participant) => {
        const attendance = status === "scheduled"
            ? '<span class="report-operational-line" aria-label="Espaço para registrar presença"></span>'
            : escapeHtml(attendanceLabel(participant.attendanceStatus));
        const note = participant.attendanceNote
            ? escapeHtml(participant.attendanceNote)
            : '<span class="report-operational-line" aria-label="Sem observação registrada"></span>';
        return `<tr><td>${escapeHtml(participant.chapelName || "—")}</td><td>${escapeHtml(participant.serverName || "—")}</td><td>${escapeHtml(participant.participationType === "manual" ? "Manual" : "Regular")}</td><td>${attendance}</td><td>${note}</td></tr>`;
    }).join("") || '<tr><td colspan="5" class="report-empty">Nenhum participante preparado para este encontro.</td></tr>';
}

function responsibleNames(encounter, userNames) {
    return (encounter.responsibilities || [])
        .filter((item) => item.status === "confirmed")
        .map((item) => ({ ...item, name: userNames[item.userId] }))
        .filter((item) => Boolean(item.name));
}

function renderEncounterReportView(root, state, actions) {
    const encounter = state.data.currentEncounter;
    if (!encounter) {
        root.innerHTML = "";
        return;
    }

    const participants = state.data.participants;
    const ready = !state.ui.loading;
    const status = encounter.status;
    const counts = summary(participants);
    const responsibilities = responsibleNames(encounter, actions.userNames || {});
    const showMetrics = status === "completed" || status === "in_progress";
    const reportTitle = status === "cancelled" ? "Comunicado de cancelamento" : "Relatório operacional do encontro";
    const statusMessage = status === "cancelled"
        ? "Este encontro foi cancelado. Não há métricas pastorais nem registros operacionais neste relatório."
        : status === "scheduled"
            ? "Lista operacional preparada para registro manual de presença e observações."
            : status === "in_progress"
                ? "Resumo parcial conforme os registros disponíveis no momento da impressão."
                : "Resumo final conforme os registros de presença existentes.";

    root.innerHTML = `<section class="encounter-report" data-report-status="${escapeHtml(status)}"><div class="report-actions no-print"><button class="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" data-report-action="back">Voltar ao encontro</button><button class="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" data-report-action="print" ${ready ? "" : "disabled"}>Imprimir relatório</button></div>${!ready ? '<p class="report-loading" role="status">Carregando a lista de participantes antes de liberar a impressão…</p>' : ""}<article class="report-paper"><header class="report-header"><p class="report-kicker">SGSA · Formação → Polo → Encounter</p><h2>${reportTitle}</h2><div class="report-status">${escapeHtml(statusLabel(status))}</div></header><section class="report-context"><dl><div><dt>Formação</dt><dd>${escapeHtml(state.data.currentFormation?.name || "—")}</dd></div><div><dt>Polo</dt><dd>${escapeHtml(state.data.currentPole?.name || "—")}</dd></div><div><dt>Encontro</dt><dd>${escapeHtml(encounter.title || "—")}</dd></div><div><dt>Data e horário</dt><dd>${dateTime(encounter.startAt)}</dd></div><div><dt>Local</dt><dd>${escapeHtml(encounter.location?.name || "—")}</dd></div></dl></section><p class="report-message">${statusMessage}</p>${responsibilities.length ? `<section class="report-responsibilities"><h3>Responsáveis confirmados</h3><ul>${responsibilities.map((item) => `<li>${escapeHtml(item.name)}${item.type === "substitute" ? " · Substituto" : ""}</li>`).join("")}</ul></section>` : ""}${showMetrics ? `<section class="report-summary"><h3>${status === "completed" ? "Resumo final" : "Resumo parcial"}</h3><div><span><strong>${participants.length}</strong>Total</span><span><strong>${counts.present}</strong>Presentes</span><span><strong>${counts.absent}</strong>Ausentes</span><span><strong>${counts.justified}</strong>Justificados</span><span><strong>${counts.pending}</strong>Pendentes</span></div></section>` : ""}${status !== "cancelled" ? `<section class="report-participants"><h3>Participantes</h3><table><thead><tr><th>Capela</th><th>Servidor</th><th>Tipo</th><th>Presença</th><th>Observações</th></tr></thead><tbody>${reportRows(participants, status)}</tbody></table></section>` : ""}</article></section>`;

    root.querySelectorAll("[data-report-action]").forEach((element) => element.addEventListener("click", () => {
        if (element.dataset.reportAction === "back") actions.action("back");
        if (element.dataset.reportAction === "print" && !element.disabled) window.print();
    }));
}

export { renderEncounterReportView };
