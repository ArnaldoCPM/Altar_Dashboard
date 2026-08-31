import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../js/modules/formation/services/eligibility.service.js', import.meta.url), 'utf8');
const eligibility = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const criteria = { minAge: 11, maxAge: 24, referenceDate: '2027-02-01', serverTypes: ['Candidato', 'Formando', 'Instituído'] };
const server = (overrides = {}) => ({ id: 's', Nome: 'Ana', Data_nascimento: '2016-02-01', Tipo: 'Formando', Estado: 'Ativo', chapelId: 'a', ...overrides });
test('eligibility honours birthdays on the fixed reference date and chapel/type/activity', () => {
 assert.equal(eligibility.eligibilityFor(server(), criteria, ['a']).eligible, true);
 assert.equal(eligibility.eligibilityFor(server({ Data_nascimento: '2016-02-02' }), criteria, ['a']).eligible, false);
 assert.equal(eligibility.eligibilityFor(server({ Estado: 'Inativo' }), criteria, ['a']).eligible, false);
 assert.equal(eligibility.eligibilityFor(server({ chapelId: 'b' }), criteria, ['a']).eligible, false);
 assert.equal(eligibility.eligibilityFor(server({ Tipo: 'Outro' }), criteria, ['a']).eligible, false);
});
test('changed criteria reports differences without writes', () => {
 const result = eligibility.eligibilityFor(server(), { ...criteria, minAge: 12 }, ['a']);
 assert.equal(result.eligible, false); assert.ok(result.reasons.includes('Fora dos critérios atuais'));
});
