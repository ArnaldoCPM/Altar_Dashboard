import { formatBirthDate } from "../../../services/birth-date.service.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const categories = { legacy: "Formato antigo — conversão segura", ambiguous: "Data ambígua", invalid: "Data inválida", empty: "Sem data", iso: "Data já normalizada" };
const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function rawText(value) {
  if (value === null || typeof value !== "object") return String(value);
  if (value?.type === "document" && typeof value.path === "string") return `Referência: ${value.path}`;
  try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
}
export function humanBirthDate(iso) {
  const display = formatBirthDate(iso);
  return display ? `${display} — ${Number(iso.slice(8))} de ${months[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}` : "";
}
function filter(label, key, values, chosen, busy) {
  return `<label>${label}<select data-quality-filter="${key}" class="block w-full rounded border p-2" ${busy ? "disabled" : ""}><option value="">Todos</option>${values.map(([value, text]) => `<option value="${escape(value)}" ${chosen === value ? "selected" : ""}>${escape(text)}</option>`).join("")}</select></label>`;
}
export function birthDateQualityHtml(state) {
  const { selected, draft, busy } = state;
  const chapels = [...new Map(state.servers.filter(s => s.chapelId).map(s => [String(s.chapelId), String(s.Capela || s.chapelId)])).entries()];
  const types = [...new Set(state.servers.map(s => String(s.Tipo || "")).filter(Boolean))].map(t => [t, t]);
  const disabled = busy ? "disabled" : "";
  let card = `<p>${state.filtered ? `Você chegou ao fim desta passagem. Restam ${state.skipped} registros pulados.` : "Nenhum registro pendente neste filtro."}</p>${state.skipped ? '<button data-quality-action="restart" class="rounded border p-3">Revisar registros pulados</button>' : ""}`;
  if (selected) {
    const { server, expected, classification } = selected;
    const raw = !expected.present ? "(campo ausente)" : rawText(expected.value);
    const radio = (value, label) => `<label class="block rounded border p-3"><input type="radio" name="quality-date-choice" data-quality-choice value="${escape(value)}" ${draft.choice === value ? "checked" : ""} ${disabled}> ${escape(label)}</label>`;
    let input = "";
    if (classification.category === "ambiguous") input = `<p>Confirme a data com a ficha ou o responsável:</p>${classification.candidates.map(iso => radio(iso, humanBirthDate(iso))).join("")}${radio("manual", "Informar outra data confirmada")}`;
    if (["invalid", "empty"].includes(classification.category) || (classification.category === "ambiguous" && draft.choice === "manual")) input += `<label class="block">Informe a data confirmada<input type="date" data-quality-date value="${escape(draft.value)}" class="mt-1 block rounded border p-3" ${disabled}></label>`;
    if (classification.category === "legacy") input = `<p>A conversão é inequívoca. Confirme para normalizar:</p><p class="font-semibold">${escape(raw)} → ${escape(humanBirthDate(classification.candidates[0]))}</p>`;
    card = `<article class="space-y-4 rounded-xl border bg-white p-5"><h3 class="text-xl font-bold">${escape(server.Nome || "Sem nome")}</h3><p>ID: ${escape(server.id)} · Capela: ${escape(server.Capela || "Sem capela")} · Tipo: ${escape(server.Tipo || "Não informado")}</p><p>${escape(categories[classification.category])}</p>${classification.category === "empty" ? '<p>Data de nascimento não informada</p>' : ""}<div>Valor armazenado:<pre class="whitespace-pre-wrap break-words">${escape(raw)}</pre></div>${input}${state.stale ? '<button data-quality-action="reviewLatest" class="rounded border p-3">Revisar valor atualizado</button>' : ""}<div class="flex gap-3"><button data-quality-action="skip" class="rounded border p-3" ${disabled}>Pular</button><button data-quality-action="submit" class="rounded bg-emerald-700 p-3 text-white" ${state.canSave ? "" : "disabled"}>${busy ? "Salvando…" : classification.category === "legacy" ? "Normalizar e próximo" : "Salvar e próximo"}</button></div></article>`;
  }
  return `<section class="mx-auto max-w-4xl space-y-5"><button data-quality-action="close" class="rounded border p-3" ${disabled}>← Voltar para Servidores</button><header><h2 class="text-2xl font-bold">Qualidade dos dados</h2><p>Datas de nascimento</p></header><div aria-live="polite">Pendentes agora: ${state.pending} · Neste filtro: ${state.filtered} · Resolvidos por você nesta sessão: ${state.resolved}</div><div class="grid gap-3 sm:grid-cols-3">${filter("Capela", "chapel", chapels, state.filters.chapel, busy)}${filter("Tipo", "type", types, state.filters.type, busy)}${filter("Categoria", "category", Object.entries(categories).filter(([k]) => k !== "iso"), state.filters.category, busy)}</div><p role="status" class="text-amber-800">${escape(state.message)}</p>${card}</section>`;
}
export function renderBirthDateQuality(root, state, actions) {
  root.innerHTML = birthDateQualityHtml(state);
  root.querySelectorAll('[data-quality-action]').forEach(el => el.addEventListener('click', () => actions[el.dataset.qualityAction]()));
  root.querySelectorAll('[data-quality-filter]').forEach(el => el.addEventListener('change', () => actions.setFilter(el.dataset.qualityFilter, el.value)));
  root.querySelectorAll('[data-quality-choice]').forEach(el => el.addEventListener('change', () => actions.setDraft(el.value, "")));
  root.querySelector('[data-quality-date]')?.addEventListener('change', event => actions.setDraft("manual", event.target.value));
}
