"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { _test } = require("../index.js");

function canonicalProfile(overrides = {}) {
  return {
    uid: "user-1",
    displayName: "  Arnaldo Paiva  ",
    email: "arnaldo@example.test",
    role: "coordinator",
    chapelId: "chapel-a",
    active: true,
    status: "active",
    ...overrides
  };
}

async function synchronize({ userId = "user-1", afterExists = true, afterData = canonicalProfile(), existing = null } = {}) {
  const writes = [];
  const result = await _test.synchronizePastoralIdentity({
    userId,
    afterExists,
    afterData,
    getDirectory: async () => existing,
    setDirectory: async (uid, projection) => writes.push({ uid, projection })
  });
  return { result, writes };
}

test("canonical profile creates the minimal trimmed pastoral identity", async () => {
  const { result, writes } = await synchronize();
  assert.equal(result.action, "synchronized");
  assert.deepEqual(writes, [{ uid: "user-1", projection: { displayName: "Arnaldo Paiva" } }]);
  assert.deepEqual(Object.keys(writes[0].projection), ["displayName"]);
});

test("a changed canonical displayName updates the directory", async () => {
  const { result, writes } = await synchronize({
    afterData: canonicalProfile({ displayName: "Maria Souza" }),
    existing: { displayName: "Arnaldo Paiva" }
  });
  assert.equal(result.action, "synchronized");
  assert.deepEqual(writes, [{ uid: "user-1", projection: { displayName: "Maria Souza" } }]);
});

test("pending and non-canonical user documents are ignored", async () => {
  for (const scenario of [
    { userId: "pending@example.test", afterData: { uid: null, displayName: "Pending" } },
    { userId: "pending@example.test", afterData: { displayName: "Pending" } },
    { userId: "user-1", afterData: canonicalProfile({ uid: "another-user" }) }
  ]) {
    const { result, writes } = await synchronize(scenario);
    assert.equal(result.action, "ignored");
    assert.deepEqual(writes, []);
  }
});

test("missing, empty, and non-textual names never overwrite a historical directory entry", async () => {
  for (const displayName of [undefined, "   ", 42]) {
    const { result, writes } = await synchronize({
      afterData: canonicalProfile({ displayName }),
      existing: { displayName: "Nome histórico" }
    });
    assert.equal(result.action, "ignored");
    assert.deepEqual(writes, []);
  }
});

test("deactivation keeps and may synchronize the historical name", async () => {
  const { result, writes } = await synchronize({
    afterData: canonicalProfile({ active: false, displayName: "Nome após desativação" }),
    existing: { displayName: "Nome anterior" }
  });
  assert.equal(result.action, "synchronized");
  assert.deepEqual(writes, [{ uid: "user-1", projection: { displayName: "Nome após desativação" } }]);
});

test("profile deletion leaves the directory untouched", async () => {
  const { result, writes } = await synchronize({ afterExists: false, afterData: undefined });
  assert.equal(result.action, "ignored");
  assert.deepEqual(writes, []);
});

test("an exact existing projection is not rewritten", async () => {
  const { result, writes } = await synchronize({ existing: { displayName: "Arnaldo Paiva" } });
  assert.equal(result.action, "unchanged");
  assert.deepEqual(writes, []);
});

test("a directory document with extra fields is replaced by the exact projection", async () => {
  const { result, writes } = await synchronize({
    existing: { displayName: "Arnaldo Paiva", role: "coordinator", email: "wrong@example.test" }
  });
  assert.equal(result.action, "synchronized");
  assert.deepEqual(writes, [{ uid: "user-1", projection: { displayName: "Arnaldo Paiva" } }]);
});
