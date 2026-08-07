import { app, db, doc, getDoc, deleteDoc, writeBatch } from "./firebase.js";
import { initAuth, setupAuthStateListener, loginWithEmailPassword, loginWithGoogle, performLogout as performFirebaseLogout } from "./auth.js";
import { getAllUsers, resolveUserProfile, updateUser, createUser } from "./data/users.js";
import { createServer } from "./data/servers.js";
import { calculateAge, cleanStr, generateWpLink } from "./utils.js";
import { destroy as destroyDashboard, getData as getDashboardData, initialize as initializeDashboard, refresh as refreshDashboard } from "./modules/dashboard/index.js";
import {
    setCurrentUser,
    setCurrentProfile,
    setCurrentChapelId,
    getCurrentChapelId,
    getCurrentProfile,
    clearSession
} from "./session.js";
import {
    setCurrentUserRole,
    canExport,
    canManageUsers,
    canAccessAdminMode,
    resetPermissions
} from "./permissions.js";
import {
    canChangeChapel,
    canCreateServer,
    canDelete as canDeleteServer,
    canEdit as canEditServer
} from "./authorization.js";
import { getActiveChapels } from "./data/chapels.js";
import { initHeader, updateHeaderSession } from "./layout/header.js";
import { initSidebar } from "./layout/sidebar.js";
import { getWorkspaceElement } from "./layout/workspace.js";

// import { renderTable } from "./table.js";
// import { renderCharts } from "./charts.js";
// import { populateFilters } from "./filters.js";
// import { updatePaginationControls, goToPage, nextPage, previousPage } from "./pagination.js";
// import { checkPermissions } from "./permissions.js";
// import { showConfirm } from "./modals.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Estado global de la aplicación
let user = null;
let cachedActiveChapels = [];

function initApplicationShell() {
    initHeader();
    initSidebar();
    getWorkspaceElement();
}

initApplicationShell();

function getServerAge(server) {
    const calculatedAge = calculateAge(server?.Data_nascimento);
    if (calculatedAge !== null) {
        return calculatedAge;
    }

    const legacyAge = parseInt(server?.Idade);
    return Number.isNaN(legacyAge) ? null : legacyAge;
}

function stopServerSubscription() {
    destroyDashboard();
}

function showLoginScreen() {
    stopServerSubscription();
    resetEmailLoginFields();
    updateHeaderSession(null, null);
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('admin-login-modal').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('hidden');
}

function showAuthenticatedScreen() {
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('admin-login-modal').classList.add('hidden');
}

// Variables de paginación

//temporal
function auditChapels() {

    const validChapels = [
        "Matriz",
        "Nossa Senhora Aparecida",
        "Nossa Senhora das Graças",
        "Nossa Senhora das Mercês",
        "Nossa Senhora de Fátima",
        "Santa Mônica",
        "Santa Paulina",
        "São Francisco",
        "XVI de Novembro"
    ];

    const problems = [];

    getDashboardData().forEach(server => {

        const chapel = (server.Capela || "").trim();

        if (!chapel) {

            problems.push({
                id: server.id,
                nome: server.Nome,
                problema: "Capela vazia"
            });

            return;
        }

        if (!validChapels.includes(chapel)) {

            problems.push({
                id: server.id,
                nome: server.Nome,
                capela: chapel,
                problema: "Capela não encontrada"
            });
        }

    });

    console.table(problems);

    console.log(
        "Total de problemas encontrados:",
        problems.length
    );
}

async function loadChapelsIntoForm(chapelsList = null) {

    const select = document.getElementById('form-capela');

    if (!select) return;

    const chapels = chapelsList || await getActiveChapels();
    cachedActiveChapels = chapels;

    select.innerHTML = '';

    chapels
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(chapel => {

            const option = document.createElement('option');

            option.value = chapel.name;
            option.textContent = chapel.name;

            select.appendChild(option);
        });
}

function resolveSessionChapelName(profile, chapels) {

    if (!profile?.chapelId || !Array.isArray(chapels)) {
        return null;
    }

    const matchedChapel =
        chapels.find(chapel => chapel.id === profile.chapelId);

    return matchedChapel?.name ?? null;
}

function resolveChapelIdFromName(chapelName, chapelsList = cachedActiveChapels) {

    const normalizedChapelName = (chapelName || "").trim().toLowerCase();

    if (!normalizedChapelName || !Array.isArray(chapelsList)) {
        return null;
    }

    const matchedChapel = chapelsList.find((chapel) =>
        (chapel.name || "").trim().toLowerCase() === normalizedChapelName
    );

    return matchedChapel?.id ?? null;
}

function getAuthorizedWriteScope() {

    const currentProfile = getCurrentProfile();

    return {
        chapelId: getCurrentChapelId(),
        chapelName: currentProfile?.chapelName ?? null
    };
}

function applyAuthorizedServerScope(serverData, existingServer = null) {

    if (canAccessAdminMode()) {
        return {
            ...serverData,
            chapelId:
                serverData.chapelId ??
                resolveChapelIdFromName(serverData.Capela) ??
                existingServer?.chapelId ??
                null
        };
    }

    const { chapelId, chapelName } = getAuthorizedWriteScope();

    return {
        ...serverData,
        chapelId: chapelId ?? existingServer?.chapelId ?? null,
        Capela: chapelName ?? existingServer?.Capela ?? serverData.Capela
    };
}

// Auth state listener - Determina acceso de administrador exclusivamente por Firebase Auth
setupAuthStateListener(async (u) => {

    if (u) {

        user = u;
        const authUid = u.uid;
        setCurrentUser(user);

        document.getElementById('db-status').innerHTML =
            `<span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Sincronizado`;

        document.getElementById('db-status').className =
            "text-xs px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5";

        console.log("1");
        console.log(user);
        const profile = await resolveUserProfile(user);

        if (user?.uid === authUid) {
            if (!profile) {
                showLoginScreen();
                return;
            }

            showAuthenticatedScreen();
            console.log("2", profile);
            setCurrentProfile(profile);
            setCurrentChapelId(profile?.chapelId ?? null);
            setCurrentUserRole(profile?.role);
            const chapels = await getActiveChapels();
            setCurrentProfile({
                ...profile,
                chapelName: resolveSessionChapelName(profile, chapels)
            });
            updateHeaderSession(getCurrentProfile(), user);

            console.log("3");
            await loadChapelsIntoForm(chapels);

            console.log("4");
            updateAdminUI();

            console.log("5");
            await initializeDashboard({ chapels });
            console.log("6");
        }

    } else {

        user = null;
        clearSession();
        resetPermissions();
        showLoginScreen();
        updateAdminUI(false);
    }
});

// EJECUCIÓN INICIAL: usar anonimamente (regla Canvas) y observar estado de auth
initAuth((err) => {
    showError('Error de autenticación con Firebase. Verifique sus claves.');
    document.getElementById('loading-overlay').classList.add('hidden');
});

// Actualizar UI

// Helper para lanzar modal de confirmación personalizada
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const btnSubmit = document.getElementById('btn-confirm-submit');
    const btnCancel = document.getElementById('btn-confirm-cancel');

    const newSubmit = btnSubmit.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    newSubmit.onclick = () => {
        modal.classList.add('hidden');
        onConfirm();
    };
    newCancel.onclick = () => {
        modal.classList.add('hidden');
    };

    modal.classList.remove('hidden');
}

// Renderizado del directorio con paginación

// Header basado exclusivamente en el perfil resuelto desde users/{uid}.
const adminLoginModal = document.getElementById('admin-login-modal');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnShowEmailLogin = document.getElementById('btn-show-email-login');
const emailLoginFields = document.getElementById('email-login-fields');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');
const loginError = document.getElementById('login-error');

function resetEmailLoginFields() {
    emailLoginFields?.classList.add('hidden');
    btnShowEmailLogin?.classList.remove('hidden');
    loginError?.classList.add('hidden');
}

btnShowEmailLogin.addEventListener('click', () => {
    emailLoginFields.classList.remove('hidden');
    btnShowEmailLogin.classList.add('hidden');
    loginError.classList.add('hidden');
    adminEmailInput.focus();
});

// Actualiza los controles del header según profile.role.
function updateAdminUI(renderDashboard = true) {
    const profileRole = getCurrentProfile()?.role;
    const isAdminProfile = profileRole === 'admin';
    const isCoordinatorProfile = profileRole === 'coordinator';
    const hasAuthenticatedProfile = isAdminProfile
        || isCoordinatorProfile
        || profileRole === 'viewer';

    document.getElementById('btn-add-manual').classList.toggle(
        'hidden',
        !(isAdminProfile || isCoordinatorProfile)
    );
    document.getElementById('btn-manage-users').classList.toggle(
        'hidden',
        !isAdminProfile
    );
    document.getElementById('btn-logout').classList.toggle(
        'hidden',
        !hasAuthenticatedProfile
    );

    if (isAdminProfile) {
        document.getElementById('admin-banner').classList.remove('hidden');
        document.getElementById('upload-section').classList.remove('hidden');

    } else {

        document.getElementById('admin-banner').classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');
    }

    if (renderDashboard) {
        refreshDashboard();
    }
}

document.getElementById('btn-logout').addEventListener('click', performLogout);

// LOGIN CON FIREBASE AUTHENTICATION (Email/Password)
btnLoginSubmit.addEventListener('click', async () => {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value.trim();
    if (!email || !password) {
        loginError.textContent = "Introduce o email e a palavra-passe.";
        loginError.classList.remove('hidden');
        return;
    }

    try {
        await loginWithEmailPassword(email, password);
        // Firebase maneja el estado; onAuthStateChanged activará modo admin automáticamente
        adminLoginModal.classList.add('hidden');
        loginError.classList.add('hidden');
    } catch (err) {
        let msg = "Credenciais incorretas.";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            msg = "Email ou palavra-passe inválidos. Verifique e tente novamente.";
        } else if (err.code === 'auth/too-many-requests') {
            msg = "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
        }
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
    }
});

btnLoginGoogle.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
        loginError.classList.add('hidden');
    } catch (error) {
        console.error("Google Sign-In error:", error);
        console.error("code:", error.code);
        console.error("message:", error.message);
        console.error("customData:", error.customData);
        console.error("credential:", error.credential);
        loginError.textContent = "Não foi possível iniciar sessão com Google. Tente novamente.";
        loginError.classList.remove('hidden');
    }
});

// LOGOUT: cerrar sesión en Firebase Authentication
async function performLogout() {
    await performFirebaseLogout((err) => {
        showError("Não foi possível encerrar a sessão: " + err.message);
    });
    resetPermissions();
    showLoginScreen();
    updateAdminUI(false);
}

// FORMULARIO MANUAL DE AGREGAR / EDITAR
const editServerModal = document.getElementById('edit-server-modal');
const serverForm = document.getElementById('server-form');
const birthDateInput = document.getElementById('form-data-nasc');
const ageInput = document.getElementById('form-idade');
const usersManagementModal = document.getElementById('users-management-modal');
const usersTableBody = document.getElementById('users-table-body');
const userEditModal = document.getElementById('user-edit-modal');
const userEditModalTitle = document.getElementById('user-edit-modal-title');
const userEditForm = document.getElementById('user-edit-form');
const userIdInput = document.getElementById('form-user-id');
const userDisplayNameInput = document.getElementById('form-user-display-name');
const userEmailInput = document.getElementById('form-user-email');
const userRoleInput = document.getElementById('form-user-role');
const userChapelInput = document.getElementById('form-user-chapel');
const userActiveInput = document.getElementById('form-user-active');
let loadedUsers = [];
let userFormMode = "edit";
let cachedUserChapels = null;
const emptyUsersRowMarkup = `
    <tr>
        <td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">Nenhum usuário cadastrado.</td>
    </tr>
`;

birthDateInput.addEventListener('input', () => {
    ageInput.value = calculateAge(birthDateInput.value) ?? '';
});

function syncUserChapelFieldState() {
    const userRoleRequiresNoChapel = userRoleInput.value === 'admin';

    userChapelInput.disabled = userRoleRequiresNoChapel;

    if (userRoleRequiresNoChapel) {
        userChapelInput.value = '';
    }
}

async function loadChapelsIntoUserForm(selectedChapel = '') {
    if (!cachedUserChapels) {
        cachedUserChapels = await getActiveChapels();
    }

    userChapelInput.innerHTML = '';

    cachedUserChapels
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(chapel => {
            const option = document.createElement('option');

            option.value = chapel.id;
            option.textContent = chapel.name;

            userChapelInput.appendChild(option);
        });

    userChapelInput.value = selectedChapel || '';
}

async function loadUsersTable() {
    if (!canManageUsers()) {
        usersTableBody.innerHTML = emptyUsersRowMarkup;
        return;
    }

    loadedUsers = await getAllUsers();

    usersTableBody.innerHTML = '';

    if (!loadedUsers.length) {
        usersTableBody.innerHTML = emptyUsersRowMarkup;
        return;
    }

    loadedUsers.forEach((userItem) => {
        const row = document.createElement('tr');
        const isActive = userItem.active !== false;

        row.className = "border-b border-slate-100 text-sm text-slate-600";
        row.innerHTML = `
            <td class="py-4 px-6">${userItem.displayName || ''}</td>
            <td class="py-4 px-6">${userItem.email || ''}</td>
            <td class="py-4 px-6">${userItem.role || ''}</td>
            <td class="py-4 px-6">${userItem.chapelId || '—'}</td>
            <td class="py-4 px-6">${isActive ? '🟢 Ativo' : '⚪ Inativo'}</td>
            <td class="py-4 px-6">
                ${userItem.uid === userItem.documentId ? `
                    <button type="button" onclick="editUser('${userItem.uid}')" class="text-xs font-bold text-liturgical-blue hover:text-liturgical-blue/80 transition-colors">
                        Editar
                    </button>
                ` : '<span class="text-xs text-slate-400">Aguardando ativação</span>'}
            </td>
        `;

        usersTableBody.appendChild(row);
    });
}

window.editUser = async function(uid) {
    if (!canManageUsers()) {
        return;
    }

    const userItem = loadedUsers.find((item) => item.uid === uid);

    if (!userItem) {
        return;
    }

    userFormMode = "edit";
    userEditModalTitle.textContent = "Editar Usuário";
    userDisplayNameInput.value = userItem.displayName || '';
    userEmailInput.value = userItem.email || '';
    userIdInput.value = userItem.uid || '';
    userEmailInput.readOnly = true;
    userRoleInput.value = userItem.role || 'viewer';
    await loadChapelsIntoUserForm(userItem.chapelId || '');
    userActiveInput.value = userItem.active !== false ? 'true' : 'false';
    syncUserChapelFieldState();
    userEditModal.classList.remove('hidden');
};

document.getElementById('btn-add-manual').addEventListener('click', () => {
    if (!canCreateServer(getCurrentChapelId())) {
        return;
    }

    document.getElementById('edit-modal-title').textContent = "Adicionar novo servidor";
    serverForm.reset();
    const lastIdNum = getDashboardData().reduce((max, cur) => {
        const curId = cur.id || '';
        const match = curId.toString().match(/\d+/);
        return match ? Math.max(max, parseInt(match[0])) : max;
    }, 0);
    document.getElementById('form-id').value = `SRV-${String(lastIdNum + 1).padStart(4, '0')}`;
    const chapelInput = document.getElementById('form-capela');
    if (canAccessAdminMode()) {
        chapelInput.disabled = false;
    } else {
        chapelInput.value = getCurrentProfile()?.chapelName ?? '';
        chapelInput.disabled = true;
    }
    editServerModal.classList.remove('hidden');
});

document.getElementById('btn-manage-users').addEventListener('click', async () => {
    if (!canManageUsers()) {
        return;
    }

    usersManagementModal.classList.remove('hidden');
    await loadUsersTable();
});

document.getElementById('btn-close-users-modal').addEventListener('click', () => {
    usersManagementModal.classList.add('hidden');
});

document.getElementById('btn-new-user').addEventListener('click', async () => {
    if (!canManageUsers()) {
        return;
    }

    userFormMode = "create";
    userEditModalTitle.textContent = "Registrar Usuário";
    userDisplayNameInput.value = '';
    userEmailInput.value = '';
    userIdInput.value = '';
    userEmailInput.readOnly = false;
    userRoleInput.value = 'viewer';
    await loadChapelsIntoUserForm('');
    userActiveInput.value = 'true';
    syncUserChapelFieldState();
    userEditModal.classList.remove('hidden');
});

document.getElementById('btn-cancel-user-edit').addEventListener('click', () => {
    userEditModal.classList.add('hidden');
});

userRoleInput.addEventListener('change', () => {
    syncUserChapelFieldState();
});

userEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!canManageUsers()) {
        return;
    }

    const uid = userIdInput.value;
    const email = userEmailInput.value.trim();
    const role = userRoleInput.value;
    const chapelId = userChapelInput.value.trim();

    if ((role === 'coordinator' || role === 'viewer') && !chapelId) {
        showError("Selecione uma capela.");
        return;
    }

    const userData = {
        displayName: userDisplayNameInput.value.trim(),
        role,
        chapelId: role === 'admin' ? null : chapelId,
        active: userActiveInput.value === 'true'
    };

    if (userFormMode === "create") {
        await createUser({
            id: email,
            email,
            ...userData
        });
    } else {
        await updateUser(uid, userData);
    }

    userEditModal.classList.add('hidden');
    await loadUsersTable();
});

// Guardar monaguillo en Firestore (Regla 1 de Firebase de Canvas)
serverForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    const existingServer = getDashboardData().find(item => item.id === id) || null;

    if (existingServer
        ? !canEditServer(existingServer)
        : !canCreateServer(getCurrentChapelId())) {
        return;
    }

    const payload = applyAuthorizedServerScope({
        id: id,
        Nome: document.getElementById('form-nome').value.trim(),
        Data_nascimento: document.getElementById('form-data-nasc').value,
        Sexo: document.getElementById('form-sexo').value,
        Capela: document.getElementById('form-capela').value.trim(),
        Tipo: document.getElementById('form-tipo').value,
        Estado: document.getElementById('form-estado').value,
        Horario_estudo: getStudyScheduleFromForm(),
        Batizado: document.getElementById('form-batizado').checked ? 'Sim' : 'Não',
        Primeira_eucaristia: document.getElementById('form-comunion').checked ? 'Sim' : 'Não',
        Crismado: document.getElementById('form-crisma').checked ? 'Sim' : 'Não',
        Possui_alergia_doenca: document.getElementById('form-tem-alergia').value,
        Descricao_alergia_doenca: document.getElementById('form-desc-alergia').value.trim(),
        Nome_mae: document.getElementById('form-nome-mae').value.trim(),
        Whatsapp_candidato: normalizePhone(document.getElementById('form-wp-candidato').value),
        Whatsapp_mae: normalizePhone(document.getElementById('form-wp-mae').value),
        Nome_pai: document.getElementById('form-nome-pai').value.trim(),
        Whatsapp_pai: normalizePhone(document.getElementById('form-wp-pai').value),
        Nome_tutor_guardiao: document.getElementById('form-nome-tutor').value.trim(),
        Whatsapp_tutor_guardiao: normalizePhone(document.getElementById('form-wp-tutor').value),
    }, existingServer);

    if (existingServer && !canChangeChapel(existingServer, payload.chapelId)) {
        return;
    }

    try {
        await createServer(payload);
        editServerModal.classList.add('hidden');
    } catch (err) {
        showError("No se pudo guardar el registro: " + err.message);
    }
});

function formatDateForDateInput(value) {
    if (!value) {
        return '';
    }

    if (typeof value.toDate === 'function') {
        return formatDateForDateInput(value.toDate());
    }

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return '';
        }

        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return formatDateForDateInput(new Date(value.seconds * 1000));
    }

    const dateValue = String(value).trim();
    const brazilianDate = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (brazilianDate) {
        const [, day, month, year] = brazilianDate;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    const isoDate = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return isoDate ? isoDate[0] : '';
}

function normalizePhone(phone) {
    return (phone || '').toString().replace(/\D/g, '');
}

function formatPhone(phone) {
    const originalPhone = (phone || '').toString().trim();
    const normalizedPhone = normalizePhone(originalPhone);
    const brazilianPhone = normalizedPhone.startsWith('55')
        && (normalizedPhone.length === 12 || normalizedPhone.length === 13)
        ? normalizedPhone.slice(2)
        : normalizedPhone;

    if (brazilianPhone.length === 11) {
        return `(${brazilianPhone.slice(0, 2)}) ${brazilianPhone.slice(2, 7)}-${brazilianPhone.slice(7)}`;
    }

    if (brazilianPhone.length === 10) {
        return `(${brazilianPhone.slice(0, 2)}) ${brazilianPhone.slice(2, 6)}-${brazilianPhone.slice(6)}`;
    }

    return originalPhone;
}

function isValidPhone(phone) {
    return [10, 11, 12, 13].includes(normalizePhone(phone).length);
}

function getStudyScheduleFromForm() {
    return Array.from(
        document.querySelectorAll('input[name="form-horario-estudo"]:checked')
    )
        .map((input) => input.value)
        .join(';');
}

function setStudyScheduleInForm(schedule) {
    const selectedValues = new Set(
        (schedule || '')
            .toString()
            .split(';')
            .map((value) => cleanStr(value))
    );

    document
        .querySelectorAll('input[name="form-horario-estudo"]')
        .forEach((input) => {
            input.checked = selectedValues.has(cleanStr(input.value));
        });
}

function editServer(id) {
    const server = getDashboardData().find(d => d.id === id);
    if (!canEditServer(server)) return;

    document.getElementById('edit-modal-title').textContent = `Editar Servidor: ${server.id}`;
    document.getElementById('form-id').value = server.id;
    document.getElementById('form-nome').value = server.Nome || '';
    document.getElementById('form-data-nasc').value = formatDateForDateInput(server.Data_nascimento);
    document.getElementById('form-idade').value = getServerAge(server) ?? '';
    document.getElementById('form-sexo').value = server.Sexo || 'Masculino';
    document.getElementById('form-capela').value = server.Capela || '';
    document.getElementById('form-capela').disabled = !canAccessAdminMode();
    document.getElementById('form-tipo').value = server.Tipo || 'Candidato';
    document.getElementById('form-estado').value = server.Estado || 'Ativo';
    setStudyScheduleInForm(server.Horario_estudo);

    document.getElementById('form-batizado').checked = ['sim', 'si', 's'].includes(cleanStr(server.Batizado));
    document.getElementById('form-comunion').checked = ['sim', 'si', 's'].includes(cleanStr(server.Primeira_eucaristia));
    document.getElementById('form-crisma').checked = ['sim', 'si', 's'].includes(cleanStr(server.Crismado));

    document.getElementById('form-tem-alergia').value = ['sim', 'si', 's'].includes(cleanStr(server.Possui_alergia_doenca)) ? 'Sim' : 'Não';
    document.getElementById('form-desc-alergia').value = server.Descricao_alergia_doenca || '';

    document.getElementById('form-nome-mae').value = server.Nome_mae || '';
    document.getElementById('form-wp-candidato').value = formatPhone(server.Whatsapp_candidato);
    document.getElementById('form-wp-mae').value = formatPhone(server.Whatsapp_mae);
    document.getElementById('form-nome-pai').value = server.Nome_pai || '';
    document.getElementById('form-wp-pai').value = formatPhone(server.Whatsapp_pai);
    document.getElementById('form-nome-tutor').value = server.Nome_tutor_guardiao || '';
    document.getElementById('form-wp-tutor').value = formatPhone(server.Whatsapp_tutor_guardiao);

    editServerModal.classList.remove('hidden');
}

function deleteServer(id, name) {
    const server = getDashboardData().find(d => d.id === id);

    if (!canDeleteServer(server)) {
        return;
    }

    showConfirm(
        "Eliminar Servidor",
        `Tem a certeza absoluta de que deseja eliminar "${name}" (${id}) da base de dados de forma permanente?`,
        async () => {
            try {
                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'servers', id);
                await deleteDoc(docRef);
            } catch (err) {
                showError("Não foi possível eliminar o registo: " + err.message);
            }
        }
    );
}

document.addEventListener('dashboard:server-action', ({ detail }) => {
    if (detail.action === 'edit') {
        editServer(detail.serverId);
    } else if (detail.action === 'delete') {
        deleteServer(detail.serverId, detail.serverName);
    }
});

// CARGA MASIVA CSV (Conexión directa, única y robusta al input)
const fileInput = document.getElementById('csv-file-input');
fileInput.addEventListener('change', handleCsvUpload);

async function handleCsvUpload(e) {
    if (!canExport()) {
        return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        const parsed = csvToObjects(text);

        if (parsed && parsed.length > 0) {
            showConfirm(
                "Sincronizar a base de datos",
                `Foram detetados ${parsed.length} servidores válidos no seu ficheiro CSV. Isto irá atualizar e importar todos os registos para a base de dados do Firebase. Deseja continuar?`,
                async () => {
                    await uploadBatchToFirestore(parsed);
                }
            );
        } else {
            showError("O formato do ficheiro CSV não foi reconhecido. Verifique se existe uma coluna com o nome «Nome» ou se os outros cabeçalhos estão corretos.");
        }
    };
    reader.readAsText(file, 'UTF-8');
}

async function uploadBatchToFirestore(items) {
    const progressBar = document.getElementById('upload-progress');
    const progressFill = document.getElementById('upload-progress-bar');
    progressBar.classList.remove('hidden');
    progressFill.style.width = '0%';

    let index = 0;
    const chunkSize = 150; // Procesado en lotes seguros

    try {
        const cleanYesNo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            return ['sim', 'sí', 'si', 's', 'true', '1', 'yes'].includes(cleanVal) ? 'Sim' : 'Não';
        };

        const cleanEstado = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (['inativo', 'inactivo', 'false', '0', 'n', 'não', 'nao'].includes(cleanVal)) {
                return 'Inativo';
            }
            return 'Ativo';
        };

        const cleanTipo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (cleanVal.includes('cand')) return 'Candidato';
            if (cleanVal.includes('form')) return 'Formando';
            if (cleanVal.includes('inst') || cleanVal.includes('serv')) return 'Instituído';
            return 'Candidato';
        };

        const cleanSexo = (val) => {
            const cleanVal = (val || '').toString().trim().toLowerCase();
            if (['femenino', 'feminino', 'f', 'mulher', 'mujer'].includes(cleanVal)) {
                return 'Femenino';
            }
            return 'Masculino';
        };

        while (index < items.length) {
            const batch = writeBatch(db);
            const chunk = items.slice(index, index + chunkSize);

            chunk.forEach((item, innerIdx) => {
                const uniqueSeqNum = index + innerIdx + 1;
                let itemID = item.Id ? item.Id.toString().trim() : '';
                if (!itemID || itemID === '') {
                    itemID = `SRV-${String(uniqueSeqNum).padStart(4, '0')}`;
                }

                const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'servers', itemID);

                const payload = applyAuthorizedServerScope({
                    id: itemID,
                    Nome: (item.Nome || 'Sem Nome').trim(),
                    Data_nascimento: item.Data_nascimento || '',
                    Sexo: cleanSexo(item.Sexo),
                    Capela: (item.Capela || 'Sem Capela').trim(),
                    Tipo: cleanTipo(item.Tipo),
                    Estado: cleanEstado(item.Estado),
                    Horario_estudo: item.Horario_estudo || '',
                    Batizado: cleanYesNo(item.Batizado),
                    Primeira_eucaristia: cleanYesNo(item.Primeira_eucaristia),
                    Crismado: cleanYesNo(item.Crismado),
                    Possui_alergia_doenca: cleanYesNo(item.Possui_alergia_doenca),
                    Descricao_alergia_doenca: (item.Descricao_alergia_doenca || '').trim(),
                    Bairro: item.Bairro || '',
                    Nome_mae: (item.Nome_mae || '').trim(),
                    Whatsapp_mae: normalizePhone(item.Whatsapp_mae),
                    Nome_pai: (item.Nome_pai || '').trim(),
                    Whatsapp_pai: normalizePhone(item.Whatsapp_pai),
                    Whatsapp_candidato: normalizePhone(item.Whatsapp_candidato),
                    Nome_tutor_guardiao: (item.Nome_tutor_guardiao || '').trim(),
                    Whatsapp_tutor_guardiao: normalizePhone(item.Whatsapp_tutor_guardiao)
                });

                batch.set(docRef, payload, { merge: true });
            });

            await batch.commit();
            index += chunkSize;

            const progressVal = Math.min(100, Math.round((index / items.length) * 100));
            progressFill.style.width = `${progressVal}%`;
        }

        setTimeout(() => {
            progressBar.classList.add('hidden');
            const dropzoneText = document.querySelector('#upload-section h3');
            dropzoneText.innerHTML = `✅ Sincronizado com sucesso! ${items.length} servidores estão permanentemente disponíveis na nuvem.`;
            dropzoneText.className = "text-lg font-bold text-emerald-600";

            fileInput.value = "";
        }, 1000);

    } catch (err) {
        console.error("Batch upload failed:", err);
        showError("Ocorreu um erro ao carregar os lotes na base de dados: " + err.message);
        progressBar.classList.add('hidden');
        fileInput.value = "";
    }
}

// LECTOR DE CSV ROBUSTO CON ASIGNACIÓN DE CLAVE TOLERANTE (MAPPING DE CAMPOS)
function csvToObjects(text) {
    if (!text || !text.trim()) return null;

    text = text.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '').trim();

    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    const rawHeaders = splitCsvLine(headerLine, delimiter);
    const headers = rawHeaders.map(h =>
        h.trim()
         .replace(/^"|"$/g, '')
         .replace(/[\u200B-\u200D\uFEFF]/g, '')
         .replace(/\s+/g, ' ')
         .replace(/[^\x20-\x7E]/g, '')
         .trim()
    );

    function getVal(rowObj, keyAlternatives) {
        for (const alt of keyAlternatives) {
            if (rowObj[alt] !== undefined) return rowObj[alt];

            const foundKey = Object.keys(rowObj).find(k => {
                const cleanK = k.toLowerCase().replace(/[^\w]/g, '').trim();
                const cleanAlt = alt.toLowerCase().replace(/[^\w]/g, '').trim();
                return cleanK === cleanAlt;
            });

            if (foundKey) return rowObj[foundKey];
        }
        return '';
    }

    const list = [];
    for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (!line) continue;

        const values = splitCsvLine(line, delimiter);

        const nonemptyValues = values.filter(v => v.trim() !== "");
        if (nonemptyValues.length === 0) continue;

        const tempObj = {};
        headers.forEach((header, index) => {
            let val = values[index] !== undefined ? values[index].trim() : '';
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1);
            }
            tempObj[header] = val;
        });

        const normalizedObj = {
            Id: getVal(tempObj, ['Id', 'id', 'ID', 'Identificador', 'Código', 'Codigo']).toString().trim(),
            Nome: getVal(tempObj, ['Nome', 'nome', 'NOME', 'Nome Completo', 'Nombre']).toString().trim(),
            Data_nascimento: getVal(tempObj, ['Data_nascimento', 'Data nascimento', 'Nascimento', 'Data_nasc', 'Fecha_nacimiento', 'Nasc']).toString().trim(),
            Idade: getVal(tempObj, ['Idade', 'idade', 'Edad']).toString().trim(),
            Sexo: getVal(tempObj, ['Sexo', 'sexo', 'Gênero', 'Genero']).toString().trim(),
            Capela: getVal(tempObj, ['Capela', 'capela', 'Capilla', 'Origem', 'Comunidade']).toString().trim(),
            Bairro: getVal(tempObj, ['Bairro', 'bairro', 'Barrio']).toString().trim(),
            Tipo: getVal(tempObj, ['Tipo', 'tipo', 'Tipo de Registro', 'Tipo_registro']).toString().trim(),
            Estado: getVal(tempObj, ['Estado', 'estado', 'Status', 'Situação', 'Ativo']).toString().trim(),
            Horario_estudo: getVal(tempObj, ['Horario_estudo', 'Horário de estudo', 'Horário de Estudo', 'Horario de estudio']).toString().trim(),
            Batizado: getVal(tempObj, ['Batizado', 'batizado', 'Bautizado']).toString().trim(),
            Primeira_eucaristia: getVal(tempObj, ['Primeira_eucaristia', 'Primeira eucaristia', '1ª Comunhão', 'Primera Comunión', 'Comunion']).toString().trim(),
            Crismado: getVal(tempObj, ['Crismado', 'crismado', 'Crisma', 'Confirmación']).toString().trim(),
            Possui_alergia_doenca: getVal(tempObj, ['Possui_alergia_doenca', 'Possui alergia', 'Alergia', 'Tem Alergia', 'Alergias', 'Enfermedad', 'Condición']).toString().trim(),
            Descricao_alergia_doenca: getVal(tempObj, ['Descricao_alergia_doenca', 'Descrição alergia', 'Descripción de alergia', 'Observacoes', 'Observações']).toString().trim(),
            Nome_mae: getVal(tempObj, ['Nome_mae', 'Nome da mãe', 'Mãe', 'Madre']).toString().trim(),
            Whatsapp_mae: getVal(tempObj, ['Whatsapp_mae', 'WhatsApp mãe', 'Wp mãe', 'Whatsapp da mãe']).toString().trim(),
            Nome_pai: getVal(tempObj, ['Nome_pai', 'Nome do pai', 'Pai', 'Padre']).toString().trim(),
            Whatsapp_pai: getVal(tempObj, ['Whatsapp_pai', 'WhatsApp pai', 'Wp pai', 'Whatsapp do pai']).toString().trim(),
            Whatsapp_candidato: getVal(tempObj, ['Whatsapp_candidato', 'WhatsApp candidato', 'Wp candidato']).toString().trim(),
            Nome_tutor_guardiao: getVal(tempObj, ['Nome_tutor_guardiao', 'Nome do tutor', 'Tutor']).toString().trim(),
            Whatsapp_tutor_guardiao: getVal(tempObj, ['Whatsapp_tutor_guardiao', 'WhatsApp tutor', 'Wp tutor']).toString().trim()
        };

        if (normalizedObj.Nome && normalizedObj.Nome.trim() !== '') {
            list.push(normalizedObj);
        }
    }
    return list;
}

// Helper para dividir líneas respetando comillas dobles
function splitCsvLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Mostrar errores personalizados en la interfaz de usuario en vez de alert()
function showError(message) {
    const alertBox = document.getElementById('error-alert');
    const alertText = document.getElementById('error-alert-text');
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth' });
}
