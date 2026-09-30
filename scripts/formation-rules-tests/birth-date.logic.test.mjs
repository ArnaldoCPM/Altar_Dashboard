import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../../js/services/birth-date.service.js', import.meta.url), 'utf8');
const dates = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('strict ISO validates real calendar and leap centuries without coercion', () => {
    for (const value of ['2015-04-04', '2016-02-29', '2000-02-29', '0001-01-01']) assert.equal(dates.isValidBirthDateIso(value), true, value);
    for (const value of ['2015-02-29', '2015-02-31', '2015-13-01', '1900-02-29', '0000-01-01', '2015-00-01', '2015-01-00', '03/04/2015', '08/27/2014', '2015-4-4', '2015-04-04T00:00:00Z', ' 2015-04-04 ', '', null, {}, 20150404]) assert.equal(dates.isValidBirthDateIso(value), false, String(value));
});
test('historical emptiness differs from an explicitly allowed empty write', () => {
    for (const value of ['', '  ', null, undefined]) assert.equal(dates.isEmptyBirthDate(value), true);
    assert.equal(dates.isEmptyBirthDate(0), false);
    assert.throws(() => dates.assertBirthDateWrite(''));
    assert.equal(dates.assertBirthDateWrite('', { allowEmpty: true }), '');
    for (const value of [null, undefined, ' ']) assert.throws(() => dates.assertBirthDateWrite(value, { allowEmpty: true }));
});
test('classification distinguishes ambiguity, identical interpretations and invalid years', () => {
    assert.deepEqual(dates.classifyStoredBirthDate('03/04/2015'), { category: 'ambiguous', candidates: ['2015-04-03', '2015-03-04'] });
    assert.deepEqual(dates.classifyStoredBirthDate('04/04/2015'), { category: 'legacy', candidates: ['2015-04-04'] });
    for (const value of ['27/08/2014', '08/27/2014', '2014/08/27']) assert.deepEqual(dates.classifyStoredBirthDate(value), { category: 'legacy', candidates: ['2014-08-27'] });
    for (const value of ['28/07/17', '31/02/2015']) assert.equal(dates.classifyStoredBirthDate(value).category, 'invalid');
    assert.equal(dates.classifyStoredBirthDate('').category, 'empty');
    assert.equal(dates.classifyStoredBirthDate('2015-04-04').category, 'iso');
});
test('display is pure string formatting and does not instantiate Date', () => {
    const native = globalThis.Date;
    globalThis.Date = class { constructor() { throw new Error('Timezone conversion forbidden'); } };
    try { assert.equal(dates.formatBirthDate('2015-04-04'), '04/04/2015'); assert.equal(dates.formatBirthDate('2015-02-31'), ''); }
    finally { globalThis.Date = native; }
});
