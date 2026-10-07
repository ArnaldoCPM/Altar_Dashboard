"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const backfill = require("./backfill-user-directory.js");

function canonical(overrides = {}) {
  return {
    id: "uid-1",
    data: { uid: "uid-1", displayName: "  Maria Souza  ", email: "maria@example.test", role: "coordinator", ...overrides }
  };
}

function planFor(document, directory = null) {
  return backfill.buildPlan([document], new Map([[document.id, directory]]));
}

test("canonical valid profile is planned as an exact create", () => {
  const plan = planFor(canonical());
  assert.deepEqual(plan.counts, { create: 1, update: 0, unchanged: 0, "skip-invalid": 0, "skip-pending": 0 });
  assert.deepEqual(plan.entries[0], { action: "create", uid: "uid-1", projection: { displayName: "Maria Souza" } });
});

test("an exact directory projection is unchanged and remains idempotent", () => {
  const document = canonical();
  const first = planFor(document, { displayName: "Maria Souza" });
  const second = planFor(document, { displayName: "Maria Souza" });
  assert.equal(first.entries[0].action, "unchanged");
  assert.equal(second.entries[0].action, "unchanged");
  assert.deepEqual(backfill.writeEntries(second), []);
});

test("same name with extra fields and a changed name are normalized by update", () => {
  const withExtra = planFor(canonical(), { displayName: "Maria Souza", email: "leak@example.test" });
  const changed = planFor(canonical(), { displayName: "Nome anterior" });
  assert.equal(withExtra.entries[0].action, "update");
  assert.deepEqual(withExtra.entries[0].projection, { displayName: "Maria Souza" });
  assert.equal(changed.entries[0].action, "update");
});

test("pending, missing uid, mismatched uid, and invalid names are skipped", () => {
  const cases = [
    { document: { id: "pending@example.test", data: { uid: null, displayName: "Pending" } }, action: "skip-pending" },
    { document: { id: "uid-2", data: { displayName: "Sem UID" } }, action: "skip-invalid" },
    { document: { id: "uid-null", data: { uid: null, displayName: "UID nulo" } }, action: "skip-invalid" },
    { document: { id: "uid-3", data: { uid: "other", displayName: "Diferente" } }, action: "skip-invalid" },
    { document: canonical({ displayName: "  " }), action: "skip-invalid" },
    { document: canonical({ displayName: 12 }), action: "skip-invalid" }
  ];
  for (const { document, action } of cases) {
    const plan = planFor(document);
    assert.equal(plan.entries[0].action, action);
    assert.deepEqual(backfill.writeEntries(plan), []);
  }
});

test("the plan never contains deletes and batches are capped at 400 writes", () => {
  const documents = Array.from({ length: 401 }, (_, index) => ({ id: `uid-${index}`, data: { uid: `uid-${index}`, displayName: `Nome ${index}` } }));
  const plan = backfill.buildPlan(documents, new Map());
  const writes = backfill.writeEntries(plan);
  assert.equal(writes.length, 401);
  assert.equal(writes.every((entry) => entry.action === "create" || entry.action === "update"), true);
  assert.deepEqual(backfill.chunk(writes).map((group) => group.length), [400, 1]);
});

test("apply CLI guard requires exact project and confirmation", () => {
  assert.equal(backfill.parseArguments([]).apply, false);
  assert.throws(() => backfill.parseArguments(["--apply"]), /Apply requires/);
  assert.throws(() => backfill.parseArguments(["--project", "wrong-project"]), /Project guard failed/);
  assert.deepEqual(backfill.parseArguments(["--apply", "--project", backfill.PROJECT_ID, "--confirm-project", backfill.PROJECT_ID]), {
    apply: true,
    project: backfill.PROJECT_ID,
    confirmation: backfill.PROJECT_ID
  });
});

test("manifest avoids names and emails while retaining auditable identifiers", () => {
  const plan = backfill.buildPlan([
    canonical(),
    { id: "pending@example.test", data: { uid: null, displayName: "Pending User" } }
  ], new Map());
  const manifest = backfill.createManifest({ apply: false }, plan);
  assert.equal(JSON.stringify(manifest).includes("Maria Souza"), false);
  assert.equal(JSON.stringify(manifest).includes("pending@example.test"), false);
  assert.deepEqual(manifest.actions, [
    { action: "create", uid: "uid-1" },
    { action: "skip-pending", documentId: "[email-id omitted]" }
  ]);
});
