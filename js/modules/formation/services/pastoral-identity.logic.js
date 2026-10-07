function validUid(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function responsibilityUserIds(responsibilities = []) {
    const ids = new Set();
    responsibilities.forEach((item) => {
        [item?.userId, item?.replacesUserId].forEach((value) => {
            const uid = validUid(value);
            if (uid) ids.add(uid);
        });
    });
    return [...ids];
}

function displayNameFromDirectory(data) {
    return typeof data?.displayName === "string" && data.displayName.trim()
        ? data.displayName.trim()
        : null;
}

function createPastoralIdentityResolver(readDirectory) {
    const cache = new Map();

    function resolveUid(uid) {
        if (!cache.has(uid)) {
            const pending = Promise.resolve()
                .then(() => readDirectory(uid))
                .then(displayNameFromDirectory)
                .catch(() => null);
            cache.set(uid, pending);
        }
        return cache.get(uid);
    }

    async function resolveResponsibilities(responsibilities) {
        const ids = responsibilityUserIds(responsibilities);
        const settled = await Promise.allSettled(ids.map(async (uid) => [uid, await resolveUid(uid)]));
        return Object.fromEntries(settled.flatMap((result) => (
            result.status === "fulfilled" && result.value[1] ? [result.value] : []
        )));
    }

    return { resolveResponsibilities };
}

export { createPastoralIdentityResolver, displayNameFromDirectory, responsibilityUserIds };
