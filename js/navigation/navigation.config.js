export const NAVIGATION_SECTIONS = [
    {
        id: 'general',
        label: 'GERAL',
        items: [
            { id: 'dashboard', label: 'Dashboard', href: '#dashboard', isActive: true },
            { id: 'servers', label: 'Servidores', href: '#servers' },
            { id: 'chapels', label: 'Capelas', href: '#chapels' }
        ]
    },
    {
        id: 'training',
        label: 'FORMAÇÃO',
        items: [
            { id: 'training', label: 'Formação', href: '#training' }
        ]
    },
    {
        id: 'administration',
        label: 'ADMINISTRAÇÃO',
        items: [
            { id: 'users', label: 'Usuários', href: '#users' },
            { id: 'reports', label: 'Relatórios', href: '#reports' },
            { id: 'settings', label: 'Configurações', href: '#settings' }
        ]
    }
];
