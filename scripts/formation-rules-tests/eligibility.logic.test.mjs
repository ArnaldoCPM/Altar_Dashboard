import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const dateSource = await readFile(new URL('../../js/modules/formation/services/date.service.js', import.meta.url), 'utf8');
const eligibilitySource = await readFile(new URL('../../js/modules/formation/services/eligibility.service.js', import.meta.url), 'utf8');
const source = `${dateSource.replace(/export \{ ageOn, parseFormationDate \};/, '')}\n${eligibilitySource.replace(/import \{ ageOn, parseFormationDate \} from "\.\/date\.service\.js";\n/, '')}`;
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
test('date parser accepts ISO, Brazilian legacy and unequivocal US legacy dates', () => {
 assert.equal(eligibility.ageOn('2014-08-27', '2026-08-27'), 12);
 assert.equal(eligibility.ageOn('27/08/2014', '2026-08-27'), 12);
 assert.equal(eligibility.ageOn('2014/08/27', '2026-08-27'), 12);
 assert.equal(eligibility.ageOn('08/27/2014', '2026-08-27'), 12);
});
test('date parser rejects ambiguous, malformed and missing dates', () => {
 for (const value of ['03/04/2014', '31/02/2014', '', null, 'texto']) assert.equal(eligibility.ageOn(value, '2026-08-27'), null);
});
test('age calculation handles birthdays and leap days against a fixed reference date', () => {
 assert.equal(eligibility.ageOn('2014-08-27', '2026-08-27'), 12);
 assert.equal(eligibility.ageOn('2014-08-28', '2026-08-27'), 11);
 assert.equal(eligibility.ageOn('2014-08-26', '2026-08-27'), 12);
 assert.equal(eligibility.ageOn('29/02/2016', '2020-02-29'), 4);
});
