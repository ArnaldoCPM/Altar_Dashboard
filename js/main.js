import { initAuth, setupAuthStateListener, loginWithEmailPassword, loginWithGoogle, requestPasswordReset, performLogout as performFirebaseLogout } from "./auth.js";
import { getAllUsers, resolveUserProfile, updateUser, createUser } from "./data/users.js";
import { destroy as destroyDashboard, initialize as initializeDashboard, refresh as refreshDashboard } from "./modules/dashboard/index.js";
import { destroy as destroyFormation, initialize as initializeFormation, refresh as refreshFormation } from "./modules/formation/index.js";
import { destroy as destroyServers, initialize as initializeServers, refresh as refreshServers } from "./modules/servers/index.js";
import { destroy as destroyUsers, initialize as initializeUsers, refresh as refreshUsers } from "./modules/users/index.js";
import { destroy as destroyChapels, initialize as initializeChapels, refresh as refreshChapels } from "./modules/chapels/index.js";
import {
    setCurrentUser,
    setCurrentProfile,
    setCurrentChapelId,
    getCurrentProfile,
    clearSession
} from "./session.js";
import {
    setCurrentUserRole,
    canManageUsers,
    resetPermissions
} from "./permissions.js";
import { getActiveChapels } from "./data/chapels.js";
import { closeAccountMenu, initHeader, updateHeaderSession } from "./layout/header.js";
import { closeSidebar, initSidebar, updateSidebar } from "./layout/sidebar.js";
import { getWorkspaceElement } from "./layout/workspace.js";

// Estado global de la aplicación
let user = null;
let cachedActiveChapels = [];
let activeModule = 'dashboard';
let loginScreenMessage = null;

function initApplicationShell() {
    initHeader();
    initSidebar();
    getWorkspaceElement();
}

initApplicationShell();

function stopServerSubscription() {
    destroyDashboard();
    destroyFormation();
    destroyServers();
    destroyUsers();
    destroyChapels();
    activeModule = null;
}

function setDashboardWorkspaceVisibility(isVisible) {
    ['dashboard-content'].forEach((id) => {
        document.getElementById(id)?.classList.toggle('hidden', !isVisible);
    });
}

async function navigateToModule(moduleId, context = null, action = null) {
    if (moduleId === 'chapels') {
        if (!canManageUsers()) return;
        if (activeModule === 'chapels') { await refreshChapels(); return; }
        destroyDashboard(); destroyFormation(); destroyServers(); destroyUsers();
        setDashboardWorkspaceVisibility(false);
        await initializeChapels({ mountElement: getWorkspaceElement() });
        activeModule = 'chapels';
        updateSidebar({ moduleId: activeModule });
        return;
    }
    if (moduleId === 'servers') {
        if (activeModule === 'servers') { refreshServers(); return; }
        destroyDashboard(); destroyFormation(); destroyUsers(); destroyChapels();
        setDashboardWorkspaceVisibility(false);
        await initializeServers({ mountElement: getWorkspaceElement(), context });
        activeModule = 'servers';
        updateSidebar({ moduleId: activeModule });
        if (action === 'new') document.getElementById('servers-add')?.click();
        return;
    }

    if (moduleId === 'users') {
        if (!canManageUsers()) return;
        if (activeModule === 'users') { await refreshUsers(); return; }
        destroyDashboard(); destroyFormation(); destroyServers(); destroyChapels();
        setDashboardWorkspaceVisibility(false);
        await initializeUsers({ mountElement: getWorkspaceElement() });
        activeModule = 'users';
        updateSidebar({ moduleId: activeModule });
        return;
    }

    if (moduleId === 'training') {
        if (activeModule === 'training') {
            if (context?.type === 'my-encounters' || context?.type === 'operational-encounter') {
                destroyFormation();
                initializeFormation({ mountElement: getWorkspaceElement(), context });
            } else refreshFormation();
            return;
        }

        destroyDashboard(); destroyServers(); destroyUsers(); destroyChapels();
        setDashboardWorkspaceVisibility(false);
        initializeFormation({ mountElement: getWorkspaceElement(), context });
        activeModule = 'training';
        updateSidebar({ moduleId: activeModule });
        return;
    }

    if (moduleId === 'dashboard') {
        if (activeModule === 'dashboard') {
            refreshDashboard();
            return;
        }

        destroyFormation(); destroyServers(); destroyUsers(); destroyChapels();
        setDashboardWorkspaceVisibility(true);
        await initializeDashboard({ chapels: cachedActiveChapels });
        activeModule = 'dashboard';
        updateSidebar({ moduleId: activeModule });
    }
}

document.addEventListener('shell:navigate', ({ detail }) => {
    closeSidebar({ returnFocus: false });
    navigateToModule(detail.moduleId, detail.context, detail.action);
});

function showLoginScreen(message = loginScreenMessage) {
    closeSidebar({ returnFocus: false });
    closeAccountMenu();
    stopServerSubscription();
    resetEmailLoginFields();
    updateHeaderSession(null, null);
    document.getElementById('app-content').classList.add('hidden');
    document.getElementById('admin-login-modal').classList.remove('hidden');
    document.getElementById('loading-overlay').classList.add('hidden');

    if (message) {
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }
}

function showAuthenticatedScreen() {
    document.getElementById('app-content').classList.remove('hidden');
    document.getElementById('admin-login-modal').classList.add('hidden');
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

// Auth state listener - Determina acceso de administrador exclusivamente por Firebase Auth
setupAuthStateListener(async (u) => {

    if (u) {

        stopServerSubscription();
        user = u;
        const authUid = u.uid;
        setCurrentUser(user);

        document.getElementById('db-status').classList.add('hidden');

        const profile = await resolveUserProfile(user);

        if (user?.uid === authUid) {
            if (!profile) {
                showLoginScreen();
                return;
            }

            if (profile.active !== true) {
                loginScreenMessage = 'Seu acesso ao sistema estÃ¡ desativado. Entre em contato com um administrador.';
                user = null;
                clearSession();
                resetPermissions();
                updateAdminUI(false);
                showLoginScreen(loginScreenMessage);
                try {
                    await performFirebaseLogout();
                } catch (error) {
                    console.error('Unable to sign out inactive user:', error);
                }
                return;
            }

            loginScreenMessage = null;
            showAuthenticatedScreen();
            setCurrentProfile(profile);
            setCurrentChapelId(profile?.chapelId ?? null);
            setCurrentUserRole(profile?.role);
            const chapels = await getActiveChapels();
            setCurrentProfile({
                ...profile,
                chapelName: resolveSessionChapelName(profile, chapels)
            });
            updateHeaderSession(getCurrentProfile(), user);
            updateSidebar({ moduleId: activeModule, role: getCurrentProfile()?.role });

            await loadChapelsIntoForm(chapels);

            updateAdminUI(false);

            await initializeDashboard({ chapels });
            activeModule = 'dashboard';
            updateSidebar({ moduleId: activeModule, role: getCurrentProfile()?.role });
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
function showConfirm(title, message, onConfirm, { cancelLabel = "Cancelar", confirmLabel = "Confirmar", onCancel = null } = {}) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const btnSubmit = document.getElementById('btn-confirm-submit');
    const btnCancel = document.getElementById('btn-confirm-cancel');

    const newSubmit = btnSubmit.cloneNode(true);
    const newCancel = btnCancel.cloneNode(true);
    btnSubmit.parentNode.replaceChild(newSubmit, btnSubmit);
    btnCancel.parentNode.replaceChild(newCancel, btnCancel);

    newSubmit.textContent = confirmLabel;
    newCancel.textContent = cancelLabel;
    newSubmit.onclick = () => {
        modal.classList.add('hidden');
        onConfirm();
    };
    newCancel.onclick = () => {
        modal.classList.add('hidden');
        onCancel?.();
    };

    modal.classList.remove('hidden');
}

// Renderizado del directorio con paginación

// Header basado exclusivamente en el perfil resuelto desde users/{uid}.
const adminLoginModal = document.getElementById('admin-login-modal');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const btnLoginGoogle = document.getElementById('btn-login-google');
const emailLoginFields = document.getElementById('email-login-fields');
const adminEmailInput = document.getElementById('admin-email-input');
const adminPasswordInput = document.getElementById('admin-password-input');
const btnPasswordReset = document.getElementById('btn-password-reset');
const loginError = document.getElementById('login-error');

function resetEmailLoginFields() {
    emailLoginFields?.classList.remove('hidden');
    loginError?.classList.add('hidden');
}

// Actualiza los controles del header según profile.role.
function updateAdminUI(renderDashboard = true) {
    const profileRole = getCurrentProfile()?.role;
    document.getElementById('btn-manage-users')?.classList.add('hidden');
    updateSidebar({ moduleId: activeModule, role: profileRole });

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
        loginError.textContent = "E-mail ou senha inválidos.";
        loginError.classList.remove('hidden');
    }
});

btnLoginGoogle.addEventListener('click', async () => {
    try {
        await loginWithGoogle();
        loginError.classList.add('hidden');
    } catch (error) {
        console.error("Google Sign-In error:", error.code);
        loginError.textContent = "Não foi possível iniciar sessão com Google. Tente novamente.";
        loginError.classList.remove('hidden');
    }
});

// LOGOUT: cerrar sesión en Firebase Authentication
async function performLogout() {
    closeSidebar({ returnFocus: false });
    closeAccountMenu();
    try {
        await performFirebaseLogout();
    } catch (err) {
        showError("Não foi possível encerrar a sessão: " + err.message);
    }
}

document.addEventListener('shell:confirm', ({ detail }) => {
    showConfirm(detail.title, detail.message, detail.onConfirm, detail);
});

btnPasswordReset?.addEventListener('click', async () => {
    const email = adminEmailInput.value.trim();
    if (!email) {
        loginError.textContent = 'Informe seu e-mail para continuar.';
        loginError.classList.remove('hidden');
        adminEmailInput.focus();
        return;
    }

    btnPasswordReset.disabled = true;
    try {
        await requestPasswordReset(email);
    } catch (error) {
        // The public flow must never disclose whether this address has an Auth account.
        console.warn('Password reset request could not be completed.', error.code);
    } finally {
        btnPasswordReset.disabled = false;
        loginError.textContent = 'Se existir uma conta com este e-mail, enviaremos as instruções para definir ou recuperar sua senha.';
        loginError.classList.remove('hidden');
    }
});

// FORMULARIO MANUAL DE AGREGAR / EDITAR
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

async function editUser(uid) {
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
}

document.getElementById('btn-manage-users').addEventListener('click', async () => {
    if (!canManageUsers()) {
        return;
    }

    closeAccountMenu();
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
    // El módulo Usuários conserva el mismo modal, pero administra su submit.
    e.preventDefault();
    if (activeModule === 'users') {
        return;
    }
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

document.addEventListener('shell:manage-users', async () => {
    if (!canManageUsers()) return;
    closeAccountMenu();
    usersManagementModal.classList.remove('hidden');
    await loadUsersTable();
});

// Mostrar errores personalizados en la interfaz de usuario en vez de alert()
function showError(message) {
    const alertBox = document.getElementById('error-alert');
    const alertText = document.getElementById('error-alert-text');
    alertText.textContent = message;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth' });
}
