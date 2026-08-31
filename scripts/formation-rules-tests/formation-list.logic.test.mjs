import test from "node:test";
import assert from "node:assert/strict";
import { availableFormationStatusTransitions, filterFormations, formationYears, paginationFor } from "../../js/modules/formation/services/formation-list.service.js";
import { activeOperationalFormations, canCompleteWithEncounterCounts, completionBlockMessage, encounterStatusCounts } from "../../js/modules/formation/services/formation-lifecycle.logic.js";

const today = new Date("2026-08-30T12:00:00");
const formation = (id, values = {}) => ({ id, name: id, status: "draft", modalities: ["initial"], ...values });
const source = [
    formation("tomorrow", { startDate: "2026-08-31", endDate: "2026-09-03", status: "active" }),
    formation("starts-today", { startDate: "2026-08-30", endDate: "2026-09-03", status: "active" }),
    formation("ends-today", { startDate: "2026-08-25", endDate: "2026-08-30", status: "completed" }),
    formation("yesterday", { startDate: "2026-08-01", endDate: "2026-08-29", status: "archived" }),
    formation("no-date", { status: "draft" })
];

test("period filters classify dates safely", () => {
    assert.deepEqual(filterFormations(source, { period: "upcoming" }, today).map((item) => item.id), ["tomorrow"]);
    assert.deepEqual(filterFormations(source, { period: "current" }, today).map((item) => item.id), ["starts-today", "ends-today"]);
    assert.deepEqual(filterFormations(source, { period: "closed", status: "archived" }, today).map((item) => item.id), ["yesterday"]);
    assert.doesNotThrow(() => filterFormations(source, { period: "current" }, today));
});

test("years, exact status, combined filters and date order work", () => {
    assert.deepEqual(formationYears(source), [2026]);
    assert.deepEqual(filterFormations(source, { status: "draft" }, today).map((item) => item.id), ["no-date"]);
    assert.deepEqual(filterFormations(source, { query: "starts", period: "current" }, today).map((item) => item.id), ["starts-today"]);
    assert.deepEqual(filterFormations(source, { status: "active", year: "2026", period: "upcoming" }, today).map((item) => item.id), ["tomorrow"]);
    assert.deepEqual(filterFormations(source, { query: "missing" }, today), []);
    assert.deepEqual(filterFormations(source, {}, today).map((item) => item.id), ["tomorrow", "starts-today", "ends-today", "no-date"]);
    assert.deepEqual(filterFormations(source, { status: "archived" }, today).map((item) => item.id), ["yesterday"]);
});

test("pagination covers boundary totals and corrects an out-of-range page", () => {
    for (const total of [0, 1, 20, 21, 40, 41]) {
        const result = paginationFor(Array.from({ length: total }, (_, index) => index), 99);
        assert.equal(result.pageCount, Math.ceil(total / 20));
        assert.equal(result.items.length, total ? (total % 20 || 20) : 0);
    }
    assert.equal(paginationFor(Array.from({ length: 21 }, (_, index) => index), 1).page, 1);
    assert.equal(paginationFor(Array.from({ length: 21 }, (_, index) => index), 99).page, 2);
});

test("only valid status transitions are offered", () => {
    assert.deepEqual(availableFormationStatusTransitions("draft"), ["active", "archived"]);
    assert.deepEqual(availableFormationStatusTransitions("active"), ["completed"]);
    assert.deepEqual(availableFormationStatusTransitions("completed"), ["archived"]);
    assert.deepEqual(availableFormationStatusTransitions("archived"), []);
});

test("lifecycle completion requires only terminal encounters", () => {
    const blocked = encounterStatusCounts([{ status: "scheduled" }, { status: "in_progress" }, { status: "completed" }]);
    assert.equal(canCompleteWithEncounterCounts(blocked), false);
    assert.match(completionBlockMessage(blocked), /1 encontro agendado e 1 encontro em andamento/);
    assert.equal(canCompleteWithEncounterCounts(encounterStatusCounts([{ status: "completed" }, { status: "cancelled" }])), true);
    assert.equal(canCompleteWithEncounterCounts(encounterStatusCounts([])), true);
});

test("operational contexts include only active formations", () => {
    assert.deepEqual(activeOperationalFormations(source).map((item) => item.id), ["tomorrow", "starts-today"]);
});
