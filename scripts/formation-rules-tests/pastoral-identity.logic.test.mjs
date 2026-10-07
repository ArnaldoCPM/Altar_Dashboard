import test from "node:test";
import assert from "node:assert/strict";
import { createPastoralIdentityResolver, responsibilityUserIds } from "../../js/modules/formation/services/pastoral-identity.logic.js";

test("responsibilities collect user and replacement identities once and ignore empty values", () => {
    const responsibilities = [
        { userId: "uid-a", replacesUserId: "uid-b" },
        { userId: "uid-a", replacesUserId: "  uid-c  " },
        { userId: "", replacesUserId: null },
        { userId: undefined, replacesUserId: "   " }
    ];
    assert.deepEqual(responsibilityUserIds(responsibilities), ["uid-a", "uid-b", "uid-c"]);
});

test("directory names resolve valid documents without a users or email fallback", async () => {
    const reads = [];
    const resolver = createPastoralIdentityResolver(async (uid) => {
        reads.push(uid);
        return uid === "uid-a" ? { displayName: "Ana Pastoral" } : { displayName: "" };
    });
    const names = await resolver.resolveResponsibilities([{ userId: "uid-a" }, { userId: "uid-b" }]);
    assert.deepEqual(names, { "uid-a": "Ana Pastoral" });
    assert.deepEqual(reads, ["uid-a", "uid-b"]);
});

test("missing, invalid, and failed directory reads leave only that UID unresolved", async () => {
    const resolver = createPastoralIdentityResolver(async (uid) => {
        if (uid === "uid-error") throw new Error("permission-denied");
        if (uid === "uid-invalid") return { displayName: 42 };
        if (uid === "uid-good") return { displayName: "Responsável válido" };
        return null;
    });
    const names = await resolver.resolveResponsibilities([
        { userId: "uid-missing" },
        { userId: "uid-invalid" },
        { userId: "uid-error" },
        { userId: "uid-good", replacesUserId: "uid-substitute" }
    ]);
    assert.deepEqual(names, { "uid-good": "Responsável válido" });
});

test("repeated and missing identities are cached across encounter renders", async () => {
    const reads = [];
    const resolver = createPastoralIdentityResolver(async (uid) => {
        reads.push(uid);
        return uid === "uid-a" ? { displayName: "Ana" } : null;
    });
    const responsibilities = [{ userId: "uid-a", replacesUserId: "uid-missing" }, { userId: "uid-a" }];
    assert.deepEqual(await resolver.resolveResponsibilities(responsibilities), { "uid-a": "Ana" });
    assert.deepEqual(await resolver.resolveResponsibilities(responsibilities), { "uid-a": "Ana" });
    assert.deepEqual(reads, ["uid-a", "uid-missing"]);
});

test("a substitute and the replaced coordinator both resolve from the directory", async () => {
    const resolver = createPastoralIdentityResolver(async (uid) => ({ displayName: uid === "uid-substitute" ? "Substituta" : "Coordenador" }));
    const names = await resolver.resolveResponsibilities([
        { userId: "uid-substitute", replacesUserId: "uid-designated", type: "substitute" }
    ]);
    assert.deepEqual(names, { "uid-substitute": "Substituta", "uid-designated": "Coordenador" });
});
