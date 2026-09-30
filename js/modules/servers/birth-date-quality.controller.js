import { classifyStoredBirthDate, isValidBirthDateIso } from "../../services/birth-date.service.js";
import { birthDateState, sameBirthDateState, saveReviewedBirthDate } from "../../data/servers.js";

const conflictMessage = "Este registro foi alterado durante a revisão. Nada foi sobrescrito. Confira o valor atualizado.";
const missingMessage = "Este servidor não existe mais. Nenhum registro foi recriado.";

export function buildBirthDateQueue(servers, filters = {}) {
  return servers.map(server => ({ server, classification: classifyStoredBirthDate(server.Data_nascimento) }))
    .filter(item => item.classification.category !== "iso")
    .filter(({ server, classification }) => (!filters.chapel || String(server.chapelId || "") === filters.chapel)
      && (!filters.type || String(server.Tipo || "") === filters.type)
      && (!filters.category || classification.category === filters.category))
    .sort((a, b) => String(a.server.Nome || "").localeCompare(String(b.server.Nome || ""), "pt-BR") || a.server.id.localeCompare(b.server.id));
}

export function createBirthDateQualityController({ isAdmin, save = saveReviewedBirthDate, onChange = () => {},
  confirmDiscard = () => true, onSaved = () => {}, onClose = () => {} }) {
  let servers = [], active = false, selected = null, draft = { choice: "", value: "" }, dirty = false;
  let busy = false, stale = false, message = "", generation = 0;
  let filters = { chapel: "", type: "", category: "" };
  const skipped = new Set(), resolved = new Set();
  const nextIso = () => !selected ? "" : selected.classification.category === "legacy"
    ? selected.classification.candidates[0] : selected.classification.category === "ambiguous" && draft.choice !== "manual"
      ? (selected.classification.candidates.includes(draft.choice) ? draft.choice : "") : draft.value;
  function state() {
    const queue = buildBirthDateQueue(servers, filters);
    return { active, selected, draft: { ...draft }, filters: { ...filters }, busy, stale, message,
      pending: buildBirthDateQueue(servers).length, filtered: queue.length, resolved: resolved.size,
      skipped: queue.filter(x => skipped.has(x.server.id)).length, servers,
      canSave: active && isAdmin() && !busy && isValidBirthDateIso(nextIso()) };
  }
  const emit = () => { if (active) onChange(state()); };
  function select(item) {
    selected = item ? { server: { ...item.server }, classification: item.classification, expected: birthDateState(item.server) } : null;
    draft = { choice: "", value: "" }; dirty = false; stale = false;
  }
  function advance() { select(buildBirthDateQueue(servers, filters).find(x => !skipped.has(x.server.id))); }
  function update(nextServers) {
    if (!active) return;
    if (!isAdmin()) { destroy(); onClose(); return; }
    servers = nextServers.map(s => ({ ...s }));
    if (selected) {
      const current = servers.find(s => s.id === selected.server.id);
      if (!current || !sameBirthDateState(birthDateState(current), selected.expected)) {
        stale = true;
        // An in-flight commit may be visible to the listener before its promise settles.
        if (!busy) message = current ? conflictMessage : missingMessage;
      }
    } else advance();
    emit();
  }
  function open(nextServers) {
    if (!isAdmin()) return false;
    active = true; generation++; servers = nextServers.map(s => ({ ...s }));
    filters = { chapel: "", type: "", category: "" }; skipped.clear(); resolved.clear(); message = ""; busy = false;
    advance(); emit(); return true;
  }
  function setDraft(choice, value = "") {
    if (!active || busy || !selected) return;
    draft = { choice, value }; dirty = true; emit();
  }
  function setFilter(key, value) {
    if (!active || busy || !Object.hasOwn(filters, key)) return false;
    if (dirty && !confirmDiscard("Descartar a data ainda não salva e alterar o filtro?")) { emit(); return false; }
    filters = { ...filters, [key]: value }; message = ""; advance(); emit(); return true;
  }
  function skip() {
    if (!active || busy || !selected) return;
    if (dirty && !confirmDiscard("Descartar a data ainda não salva e pular este registro?")) return;
    skipped.add(selected.server.id); message = ""; advance(); emit();
  }
  function reviewLatest() {
    if (!active || busy || !selected) return;
    if (dirty && !confirmDiscard("Descartar a escolha anterior e revisar o valor atualizado?")) return;
    const item = buildBirthDateQueue(servers, filters).find(x => x.server.id === selected.server.id);
    if (item) select(item); else advance(); message = ""; emit();
  }
  async function submit() {
    if (!active || busy) return;
    if (!isAdmin()) { message = "Esta ferramenta está disponível somente para administradores."; emit(); return; }
    if (!state().canSave) return;
    const token = generation, reviewed = selected, iso = nextIso(); busy = true; message = "Salvando…"; emit();
    try {
      const result = await save({ serverId: reviewed.server.id, expected: reviewed.expected, nextIso: iso });
      if (!active || token !== generation) return;
      if (result.status === "saved") {
        resolved.add(reviewed.server.id);
        servers = servers.map(s => s.id === reviewed.server.id && sameBirthDateState(birthDateState(s), reviewed.expected)
          ? { ...s, Data_nascimento: result.value } : s);
        onSaved({ ...result, expected: reviewed.expected });
        skipped.delete(reviewed.server.id); advance(); message = "Data salva com sucesso.";
      } else if (result.status === "conflict") {
        servers = servers.map(s => { if (s.id !== reviewed.server.id) return s; const copy = { ...s };
          if (result.current.present) copy.Data_nascimento = result.current.value; else delete copy.Data_nascimento; return copy; });
        const current = servers.find(s => s.id === reviewed.server.id);
        if (current) select({ server: current, classification: classifyStoredBirthDate(current.Data_nascimento) }); else select(null);
        message = conflictMessage; // No selection is retained; an ISO corrected elsewhere offers skip/reload only.
      } else if (result.status === "not-found") {
        servers = servers.filter(s => s.id !== reviewed.server.id); advance(); message = missingMessage;
      } else throw new Error("Resposta de gravação inesperada.");
    } catch (err) {
      if (active && token === generation) message = `Não foi possível confirmar o salvamento. ${err.message || "Verifique a conexão e as permissões."}`;
    } finally {
      if (active && token === generation) { busy = false; emit(); }
    }
  }
  function restart() { if (!active || busy) return; skipped.clear(); advance(); message = ""; emit(); }
  function close() {
    if (busy || (dirty && !confirmDiscard("Descartar a data ainda não salva e sair?"))) return;
    destroy(); onClose();
  }
  function destroy() { active = false; generation++; selected = null; servers = []; busy = false; }
  return { open, update, getState: state, setDraft, setFilter, skip, reviewLatest, submit, restart, close, destroy };
}
