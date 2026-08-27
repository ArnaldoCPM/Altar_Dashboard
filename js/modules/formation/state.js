const initialState = () => ({
    data: {
        formations: [],
        filteredFormations: [],
        currentFormation: null,
        poles: [],
        poleSummaryByFormationId: {},
        currentPole: null,
        encounters: [],
        operationalEncounters: [],
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
        savingAttendanceIds: [],
        pendingStatusConfirmation: null,
        statusTransitioning: false,
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

function copyPole(pole) {
    return pole
        ? {
            ...pole,
            chapelIds: [...(pole.chapelIds || [])],
            coordinatorIds: [...(pole.coordinatorIds || [])]
        }
        : pole;
}

function copyEncounter(encounter) {
    return encounter ? { ...encounter, coordinatorIds: [...(encounter.coordinatorIds || [])], responsibilities: (encounter.responsibilities || []).map((item) => ({ ...item })), location: { ...(encounter.location || {}) } } : encounter;
}

function copyParticipant(participant) {
    return participant ? { ...participant } : participant;
}

function getState() {
    return {
        ...formationState,
        data: {
            ...formationState.data,
            formations: formationState.data.formations.map(copyFormation),
            filteredFormations: formationState.data.filteredFormations.map(copyFormation),
            poles: formationState.data.poles.map(copyPole),
            poleSummaryByFormationId: Object.fromEntries(Object.entries(formationState.data.poleSummaryByFormationId).map(([formationId, summary]) => [formationId, { ...summary }])),
            currentPole: copyPole(formationState.data.currentPole),
            encounters: formationState.data.encounters.map(copyEncounter),
            operationalEncounters: formationState.data.operationalEncounters.map((item) => ({ ...item, formation: copyFormation(item.formation), pole: copyPole(item.pole), encounter: copyEncounter(item.encounter) })),
            currentEncounter: copyEncounter(formationState.data.currentEncounter),
            participants: formationState.data.participants.map(copyParticipant)
        },
        filters: { ...formationState.filters },
        navigation: { ...formationState.navigation },
        permissions: { ...formationState.permissions },
        ui: {
            ...formationState.ui,
            pendingStatusConfirmation: formationState.ui.pendingStatusConfirmation
                ? { ...formationState.ui.pendingStatusConfirmation }
                : null
        },
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

function setPoles(formationId, poles) {
    formationState.data.poles = poles.map(copyPole);
    formationState.data.poleSummaryByFormationId[formationId] = {
        count: poles.length,
        status: "loaded",
        source: "poles"
    };
}

function setPoleCount(formationId, count) {
    formationState.data.poleSummaryByFormationId[formationId] = {
        count,
        status: "loaded",
        source: "count"
    };
}

function setPoleLoadStatus(formationId, status) {
    const currentSummary = formationState.data.poleSummaryByFormationId[formationId] || {};
    formationState.data.poleSummaryByFormationId[formationId] = {
        ...currentSummary,
        status
    };
}

function setCurrentPole(pole) {
    formationState.data.currentPole = copyPole(pole);
}

function setEncounters(encounters) {
    formationState.data.encounters = encounters.map(copyEncounter);
}

function setOperationalEncounters(encounters) {
    formationState.data.operationalEncounters = encounters.map((item) => ({ ...item, formation: copyFormation(item.formation), pole: copyPole(item.pole), encounter: copyEncounter(item.encounter) }));
}

function setCurrentEncounter(encounter) {
    formationState.data.currentEncounter = copyEncounter(encounter);
}

function setParticipants(participants) {
    formationState.data.participants = participants.map(copyParticipant);
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
    setCurrentEncounter,
    setCurrentPole,
    setEncounters,
    setOperationalEncounters,
    setParticipants,
    setFilteredFormations,
    setFilters,
    setFormations,
    setNavigation,
    setPoleLoadStatus,
    setPoleCount,
    setPermissions,
    setPoles,
    setSubscription,
    setUiState
};
