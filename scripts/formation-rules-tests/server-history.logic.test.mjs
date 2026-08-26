import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('../../js/modules/servers/services/server-history.logic.js', 'utf8');
const logic = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const at = (iso) => ({ toMillis: () => new Date(iso).getTime() });
const item = (overrides = {}) => ({ participant: { attendanceStatus: 'pending' }, formation: { id: 'formation-a' }, encounter: { status: 'completed', startAt: at('2026-03-10T10:00:00Z') }, ...overrides });

test('extracts participant parents only from the formation hierarchy', () => {
  assert.deepEqual(logic.participantContextFromPath('formations/f1/poles/p1/encounters/e1/participants/s1'), { formationId: 'f1', poleId: 'p1', encounterId: 'e1' });
  assert.equal(logic.participantContextFromPath('other/x/participants/s1'), null);
});

test('orders by encounter start time and summarizes only operational encounters', () => {
  const records = [
    item({ participant: { attendanceStatus: 'present' }, encounter: { status: 'completed', startAt: at('2026-02-01T10:00:00Z') } }),
    item({ participant: { attendanceStatus: 'absent' }, formation: { id: 'formation-b' }, encounter: { status: 'in_progress', startAt: at('2026-03-01T10:00:00Z') } }),
    item({ participant: { attendanceStatus: 'justified' }, encounter: { status: 'cancelled', startAt: at('2026-04-01T10:00:00Z') } }),
    item({ participant: { attendanceStatus: 'pending' }, encounter: { status: 'scheduled', startAt: at('2026-05-01T10:00:00Z') } }),
  ];
  const summary = logic.summarizeHistory(records);
  assert.deepEqual({ formationCount: summary.formationCount, encounterCount: summary.encounterCount, present: summary.present, absent: summary.absent, justified: summary.justified, pending: summary.pending }, { formationCount: 2, encounterCount: 2, present: 1, absent: 1, justified: 0, pending: 0 });
  assert.equal(summary.latestParticipation.encounter.startAt.toMillis(), new Date('2026-03-01T10:00:00Z').getTime());
  const sections = logic.categorizeHistory(records);
  assert.equal(sections.upcoming.length, 1); assert.equal(sections.historical.length, 2); assert.equal(sections.cancelled.length, 1);
});

test('empty and missing-parent records remain safe to summarize', () => {
  assert.deepEqual(logic.summarizeHistory([]), { formationCount: 0, encounterCount: 0, present: 0, absent: 0, justified: 0, pending: 0, latestParticipation: null });
  const unavailable = item({ formation: null, encounter: null });
  assert.equal(logic.sortByStartAtDesc([unavailable])[0], unavailable);
});

test('traverses the canonical hierarchy once and reads only the selected server in each encounter', async () => {
  const calls = { formations: 0, poles: [], encounters: [], participants: [] };
  const source = {
    async listFormations() { calls.formations += 1; return [{ id: 'f1' }, { id: 'f2' }]; },
    async listPoles(formationId) { calls.poles.push(formationId); return formationId === 'f1' ? [{ id: 'p1' }, { id: 'p2' }] : [{ id: 'p3' }]; },
    async listEncounters(formationId, poleId) { calls.encounters.push(`${formationId}/${poleId}`); return [{ id: `${poleId}-e1`, status: 'completed', startAt: at('2026-03-01T10:00:00Z') }]; },
    async getParticipant(formationId, poleId, encounterId, serverId) { calls.participants.push(`${formationId}/${poleId}/${encounterId}/${serverId}`); return poleId === 'p2' ? { serverId, attendanceStatus: 'present' } : null; },
  };
  const result = await logic.collectServerHistoryFromHierarchy('server-a', source, 2);
  assert.equal(calls.formations, 1);
  assert.deepEqual(calls.poles.sort(), ['f1', 'f2']);
  assert.deepEqual(calls.encounters.sort(), ['f1/p1', 'f1/p2', 'f2/p3']);
  assert.equal(calls.participants.length, 3);
  assert.ok(calls.participants.every((path) => path.endsWith('/server-a')));
  assert.equal(result.length, 1);
  assert.equal(result[0].pole.id, 'p2');
});
