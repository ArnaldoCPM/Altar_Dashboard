const initialState = () => ({
    data: {
        formations: [],
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
        error: null
    },
    subscriptions: {
        formations: null,
        poles: null,
        encounters: null,
        participants: null
    }
});

let formationState = initialState();

function getState() {
    return {
        ...formationState,
        data: {
            ...formationState.data,
            formations: [...formationState.data.formations],
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

function setUiState(ui) {
    formationState.ui = { ...formationState.ui, ...ui };
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
    setUiState
};
