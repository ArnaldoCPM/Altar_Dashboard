const initialState = () => ({
    data: {
        formations: [],
        filteredFormations: [],
        currentFormation: null,
        poles: [],
        currentPole: null,
        encounters: [],
        currentEncounter: null,
        participants: []
    },
    filters: {
        query: "",
        status: null,
        stage: null,
        modality: null,
        period: null
    },
    navigation: {
        currentSection: "formations",
        currentView: "list"
    },
    permissions: {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canManageAttendance: false,
        canCloseEncounter: false
    },
    ui: {
        loading: false,
        error: null,
        success: null
    },
    subscriptions: {
        formations: null,
        poles: null,
        encounters: null,
        participants: null
    }
});

let formationState = initialState();

function copyFormation(formation) {
    return formation
        ? { ...formation, modalities: [...(formation.modalities || [])] }
        : formation;
}

function getState() {
    return {
        ...formationState,
        data: {
            ...formationState.data,
            formations: formationState.data.formations.map(copyFormation),
            filteredFormations: formationState.data.filteredFormations.map(copyFormation),
            poles: [...formationState.data.poles],
            encounters: [...formationState.data.encounters],
            participants: [...formationState.data.participants]
        },
        filters: { ...formationState.filters },
        navigation: { ...formationState.navigation },
        permissions: { ...formationState.permissions },
        ui: { ...formationState.ui },
        subscriptions: { ...formationState.subscriptions }
    };
}

function setFormations(formations) {
    formationState.data.formations = formations.map(copyFormation);
}

function setFilteredFormations(formations) {
    formationState.data.filteredFormations = formations.map(copyFormation);
}

function setCurrentFormation(formation) {
    formationState.data.currentFormation = copyFormation(formation);
}

function setFilters(filters) {
    formationState.filters = { ...formationState.filters, ...filters };
}

function setNavigation(navigation) {
    formationState.navigation = { ...formationState.navigation, ...navigation };
}

function setPermissions(permissions) {
    formationState.permissions = { ...formationState.permissions, ...permissions };
}

function setUiState(ui) {
    formationState.ui = { ...formationState.ui, ...ui };
}

function setSubscription(name, unsubscribe) {
    formationState.subscriptions[name]?.();
    formationState.subscriptions[name] = unsubscribe;
}

function clearSubscriptions() {
    Object.values(formationState.subscriptions).forEach((unsubscribe) => {
        unsubscribe?.();
    });

    formationState.subscriptions = initialState().subscriptions;
}

function resetState() {
    formationState = initialState();
}

export {
    clearSubscriptions,
    getState,
    resetState,
    setCurrentFormation,
    setFilteredFormations,
    setFilters,
    setFormations,
    setNavigation,
    setPermissions,
    setSubscription,
    setUiState
};
