function encounterStatusCounts(encounters = []) {
    return encounters.reduce((counts, encounter) => {
        counts[encounter.status] = (counts[encounter.status] || 0) + 1;
        return counts;
    }, { scheduled: 0, in_progress: 0, completed: 0, cancelled: 0 });
}

function canCompleteWithEncounterCounts(counts) {
    return !counts.scheduled && !counts.in_progress;
}

function activeOperationalFormations(formations = []) {
    return formations.filter((formation) => formation.status === "active");
}

function completionBlockMessage(counts) {
    const parts = [];
    if (counts.scheduled) parts.push(`${counts.scheduled} encontro${counts.scheduled === 1 ? " agendado" : "s agendados"}`);
    if (counts.in_progress) parts.push(`${counts.in_progress} encontro${counts.in_progress === 1 ? " em andamento" : "s em andamento"}`);
    return parts.length ? `A formação ainda possui ${parts.join(" e ")}. Conclua ou cancele esses encontros antes de concluir a formação.` : "";
}

export { activeOperationalFormations, canCompleteWithEncounterCounts, completionBlockMessage, encounterStatusCounts };
