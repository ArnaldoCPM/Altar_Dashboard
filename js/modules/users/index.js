import { createUser, getAllUsers, normalizeEmail, sendUserAccess, updateUser } from "../../data/users.js";
import { requestPasswordReset } from "../../auth.js";
import { getActiveChapels, getAllChapels } from "../../data/chapels.js";
import { canManageUsers } from "../../permissions.js";
import { paginate } from "../../pagination.js";

let mount = null;
let users = [];
let currentPage = 1;

const showMessage = (message) => {
  document.getElementById("error-alert-text").textContent = message;
  document.getElementById("error-alert").classList.remove("hidden");
};
const escapeHtml = (value) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
const isCanonical = (user) => Boolean(user.uid && user.uid === user.documentId);
const canSendAccess = (user) => user.active !== false && Boolean(user.email);

function statusLabel(user) {
  if (user.active === false) return "⚪ Inativo";
  return isCanonical(user) ? "🟢 Ativo" : "🟡 Aguardando acesso";
}

function render() {
  if (!mount) return;
  const page = paginate(users, currentPage);
  currentPage = page.currentPage;
  const rows = page.items.map((user) => {
    const index = users.indexOf(user);
    return `<tr class="border-t text-sm"><td class="p-4">${escapeHtml(user.displayName)}</td><td class="p-4">${escapeHtml(user.email)}</td><td class="p-4">${escapeHtml(user.role)}</td><td class="p-4">${escapeHtml(user.chapelId || "—")}</td><td class="p-4">${statusLabel(user)}</td><td class="p-4 flex gap-3">${isCanonical(user) ? `<button data-edit-user="${index}" class="text-liturgical-blue font-bold">Editar</button>` : ""}${canSendAccess(user) ? `<button data-send-access="${index}" class="text-liturgical-blue font-bold">Enviar acesso</button>` : '<span class="text-xs text-slate-400">Acesso bloqueado</span>'}</td></tr>`;
  }).join("");
  const pagination = users.length > 20 ? `<div class="flex items-center justify-between p-4 text-xs"><button data-users-prev class="font-semibold disabled:cursor-not-allowed disabled:opacity-40">← Anterior</button><span>Página ${page.currentPage} de ${page.totalPages}</span><button data-users-next class="font-semibold disabled:cursor-not-allowed disabled:opacity-40">Próxima →</button></div>` : "";
  mount.innerHTML = `<section class="space-y-6"><div class="flex justify-between items-center"><div><h2 class="text-2xl font-black text-slate-800">Usuários</h2><p class="text-sm text-slate-500">Administração de acessos ao SGSA.</p></div><button id="users-new" class="px-4 py-2 text-xs font-bold rounded-xl bg-liturgical-blue text-white">+ Novo usuário</button></div><section class="bg-white rounded-3xl border overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-slate-50 text-xs text-slate-500"><th class="p-4">Nome</th><th class="p-4">E-mail</th><th class="p-4">Perfil</th><th class="p-4">Capela</th><th class="p-4">Estado</th><th class="p-4">Ações</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="p-8 text-center text-slate-500">Nenhum usuário cadastrado.</td></tr>'}</tbody></table></div>${pagination}</section></section>`;
  document.getElementById("users-new").onclick = () => openUserForm();
  mount.querySelectorAll("[data-edit-user]").forEach((button) => { button.onclick = () => openUserForm(users[Number(button.dataset.editUser)]); });
  mount.querySelectorAll("[data-send-access]").forEach((button) => { button.onclick = () => handleSendAccess(button, users[Number(button.dataset.sendAccess)]); });
  const previous = mount.querySelector("[data-users-prev]");
  const next = mount.querySelector("[data-users-next]");
  if (previous && next) {
    previous.disabled = page.currentPage <= 1;
    next.disabled = page.currentPage >= page.totalPages;
    previous.onclick = () => { currentPage -= 1; render(); };
    next.onclick = () => { currentPage += 1; render(); };
  }
}

async function handleSendAccess(button, user) {
  if (!canManageUsers() || !canSendAccess(user)) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Enviando…";
  try {
    const result = await sendUserAccess(user.email);
    if (result.passwordResetEligible) {
      await requestPasswordReset(normalizeEmail(user.email));
      showMessage("Se o endereço estiver apto para acesso, enviamos as instruções.");
    } else {
      showMessage("Este usuário utiliza acesso somente com Google. O acesso por Google permanece disponível.");
    }
    await refresh();
  } catch (error) {
    console.error("Unable to send user access:", error.code || error.message);
    showMessage("Não foi possível enviar as instruções de acesso. Verifique o perfil e tente novamente.");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function openUserForm(item = null) {
  if (!canManageUsers()) return;
  const modal = document.getElementById("user-edit-modal");
  const form = document.getElementById("user-edit-form");
  const role = document.getElementById("form-user-role");
  const chapel = document.getElementById("form-user-chapel");
  document.getElementById("user-edit-modal-title").textContent = item ? "Editar Usuário" : "Registrar Usuário";
  document.getElementById("form-user-id").value = item?.uid || "";
  document.getElementById("form-user-display-name").value = item?.displayName || "";
  document.getElementById("form-user-email").value = item?.email || "";
  document.getElementById("form-user-email").readOnly = Boolean(item);
  role.value = item?.role || "viewer";
  document.getElementById("form-user-active").value = item?.active !== false ? "true" : "false";
  chapel.innerHTML = "";
  const [active, all] = await Promise.all([getActiveChapels(), getAllChapels()]);
  active.sort((a, b) => a.name.localeCompare(b.name)).forEach((entry) => chapel.add(new Option(entry.name, entry.id)));
  const historical = all.find((entry) => entry.id === item?.chapelId && entry.active === false);
  if (historical) { const option = new Option(`${historical.name} (inativa)`, historical.id); option.disabled = true; chapel.add(option); }
  chapel.value = item?.chapelId || "";
  const syncChapel = () => { chapel.disabled = role.value === "admin"; if (chapel.disabled) chapel.value = ""; };
  role.onchange = syncChapel;
  syncChapel();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const email = normalizeEmail(document.getElementById("form-user-email").value);
    const chapelId = chapel.value;
    const userData = { displayName: document.getElementById("form-user-display-name").value.trim(), role: role.value, chapelId: role.value === "admin" ? null : chapelId, active: document.getElementById("form-user-active").value === "true" };
    if (!email && !item) return showMessage("Informe um e-mail válido.");
    if ((role.value === "coordinator" || role.value === "viewer") && !chapelId) return showMessage("Selecione uma capela.");
    try {
      if (item) await updateUser(item.uid, userData);
      else await createUser({ id: email, email, ...userData });
      modal.classList.add("hidden");
      await refresh();
    } catch (error) { showMessage("Não foi possível guardar o usuário."); }
  };
  modal.classList.remove("hidden");
}

export async function initialize({ mountElement }) {
  if (!canManageUsers()) return;
  mount = document.createElement("div");
  mount.dataset.moduleRoot = "users";
  mountElement.append(mount);
  await refresh();
  document.getElementById("btn-cancel-user-edit").onclick = () => document.getElementById("user-edit-modal").classList.add("hidden");
}
export async function refresh() { if (!mount) return; users = await getAllUsers(); render(); }
export function destroy() { document.getElementById("user-edit-modal")?.classList.add("hidden"); const form = document.getElementById("user-edit-form"); if (form) form.onsubmit = null; mount?.remove(); mount = null; users = []; currentPage = 1; }
