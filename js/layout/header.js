function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() || 'SG';
}

function getRoleLabel(role = '') {
    const labels = {
        admin: 'Administrador',
        coordinator: 'Coordenador',
        viewer: 'Visualizador'
    };

    return labels[role] || role;
}

function getHeaderElements() {
    return {
        sessionInfo: document.getElementById('session-info'),
        name: document.getElementById('session-name'),
        role: document.getElementById('session-role'),
        chapel: document.getElementById('session-chapel'),
        photo: document.getElementById('session-photo'),
        initials: document.getElementById('session-initials')
    };
}

export function initHeader() {
    return getHeaderElements();
}

export function updateHeaderSession(profile, authenticatedUser) {
    const elements = getHeaderElements();
    const displayName = profile?.displayName || authenticatedUser?.displayName || 'Sessao ativa';
    const photoUrl = authenticatedUser?.photoURL || profile?.photoURL || '';

    elements.sessionInfo?.classList.toggle('hidden', !profile);
    elements.sessionInfo?.classList.toggle('flex', Boolean(profile));

    if (!profile) {
        return;
    }

    if (elements.name) elements.name.textContent = displayName;
    if (elements.role) elements.role.textContent = getRoleLabel(profile.role);
    if (elements.chapel) elements.chapel.textContent = profile.chapelName || 'Capela nao informada';
    if (elements.initials) elements.initials.textContent = getInitials(displayName);

    if (elements.photo) {
        elements.photo.src = photoUrl;
        elements.photo.classList.toggle('hidden', !photoUrl);
        elements.initials?.classList.toggle('hidden', Boolean(photoUrl));
    }
}
