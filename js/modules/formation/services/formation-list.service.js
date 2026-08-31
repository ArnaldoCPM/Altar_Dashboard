function formationDate(value) {
    const candidate = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(`${value}T00:00:00`) : null;
    return candidate && !Number.isNaN(candidate.getTime()) ? candidate : null;
}

function formationYears(formations) {
    return [...new Set(formations.map((formation) => formationDate(formation.startDate)?.getFullYear()).filter(Boolean))].sort((left, right) => right - left);
}

function filterFormations(formations, filters = {}, today = new Date()) {
    const query = (filters.query || "").trim().toLocaleLowerCase();
    const comparisonDate = new Date(today); comparisonDate.setHours(0, 0, 0, 0);
    return formations.filter((formation) => {
        const start = formationDate(formation.startDate);
        const end = formationDate(formation.endDate);
        const matchesQuery = !query || (formation.name || "").toLocaleLowerCase().includes(query);
        const matchesStatus = filters.status ? formation.status === filters.status : formation.status !== "archived";
        const matchesStage = !filters.stage || formation.stage === filters.stage;
        const matchesModality = !filters.modality || (formation.modalities || []).includes(filters.modality);
        const matchesYear = !filters.year || String(start?.getFullYear() || "") === String(filters.year);
        const matchesPeriod = !filters.period || (
            filters.period === "current" ? Boolean(start && start <= comparisonDate && (!end || end >= comparisonDate))
                : filters.period === "upcoming" ? Boolean(start && start > comparisonDate)
                    : Boolean(end && end < comparisonDate)
        );
        return matchesQuery && matchesStatus && matchesStage && matchesModality && matchesYear && matchesPeriod;
    }).sort((left, right) => (formationDate(right.startDate)?.getTime() ?? -Infinity) - (formationDate(left.startDate)?.getTime() ?? -Infinity));
}

function paginationFor(items, currentPage, pageSize = 20) {
    const pageCount = Math.ceil(items.length / pageSize);
    if (!pageCount) return { page: 0, pageCount: 0, items: [] };
    const page = Math.max(1, Math.min(currentPage || 1, pageCount));
    return { page, pageCount, items: items.slice((page - 1) * pageSize, page * pageSize) };
}

function availableFormationStatusTransitions(status) {
    return ({ draft: ["active", "archived"], active: ["completed"], completed: ["archived"], archived: [] })[status] || [];
}

export { availableFormationStatusTransitions, filterFormations, formationDate, formationYears, paginationFor };
