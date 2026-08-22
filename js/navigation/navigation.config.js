export const NAVIGATION_SECTIONS = [
    {
        id: 'general',
        label: 'GERAL',
        items: [
            { id: 'dashboard', label: 'Dashboard', href: '#dashboard', icon: 'dashboard' }
        ]
    },
    {
        id: 'training',
        label: 'FORMAÇÃO',
        items: [
            { id: 'training', label: 'Formações', href: '#training', icon: 'training' }
        ]
    },
    {
        id: 'administration',
        label: 'ADMINISTRAÇÃO',
        items: [
            { id: 'users', label: 'Usuários', href: '#users', icon: 'users', action: 'manage-users', roles: ['admin'] }
        ]
    }
];
