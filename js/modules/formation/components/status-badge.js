const STATUS_PRESENTATION = {
    formation: {
        draft: { label: "Rascunho", className: "bg-slate-100 text-slate-700" },
        active: { label: "Ativa", className: "bg-emerald-100 text-emerald-800" },
        completed: { label: "Concluída", className: "bg-slate-100 text-slate-700" },
        archived: { label: "Arquivada", className: "bg-slate-100 text-slate-700" }
    },
    pole: {
        active: { label: "Ativo", className: "bg-emerald-100 text-emerald-800" },
        inactive: { label: "Inativo", className: "bg-slate-100 text-slate-700" }
    },
    encounter: {
        scheduled: { label: "Agendado", className: "bg-amber-100 text-amber-800" },
        in_progress: { label: "Em andamento", className: "bg-sky-100 text-sky-800" },
        completed: { label: "Concluído", className: "bg-slate-100 text-slate-700" },
        cancelled: { label: "Cancelado", className: "bg-rose-100 text-rose-800" }
    }
};

function statusBadge(type, status) {
    const presentation = STATUS_PRESENTATION[type]?.[status] || { label: status, className: "bg-slate-100 text-slate-700" };
    return `<span class="inline-flex rounded-full px-2 py-1 text-xs font-semibold ${presentation.className}">${presentation.label}</span>`;
}

export { statusBadge };
