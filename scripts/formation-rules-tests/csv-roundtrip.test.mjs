import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourcePath = new URL('../../js/modules/servers/services/import.service.js', import.meta.url);
const source = (await readFile(sourcePath, 'utf8')).replace('import { db, doc, writeBatch } from "../../../firebase.js";', 'const db = null, doc = () => null, writeBatch = () => ({ set() {}, commit: async () => {} });');
const csv = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const sample = { id: 'SRV-0001', Nome: '=Ana; "da Silva"', Data_nascimento: '2010-02-03', Idade: '14', Sexo: 'Femenino', chapelId: 'inactive', Capela: 'Capela São José', Bairro: "'Centro", Tipo: 'Formando', Estado: 'Ativo', Horario_estudo: 'Manhã;Tarde', Batizado: 'Sim', Primeira_eucaristia: 'Não', Crismado: '', Possui_alergia_doenca: 'Sim', Descricao_alergia_doenca: 'Linha 1\nLinha "2"', Nome_mae: '+Maria', Whatsapp_mae: '5511999999999', Nome_pai: '@José', Whatsapp_pai: '5511888888888', Whatsapp_candidato: '5511777777777', Nome_tutor_guardiao: '-Tutor', Whatsapp_tutor_guardiao: '5511666666666' };
test('official CSV round-trips all 24 fields, BOM, quoting and formula escape', () => {
  const text = csv.serializeOfficialCsv([sample]); assert.ok(text.startsWith('\uFEFF')); assert.ok(text.includes('\r\n'));
  const plan = csv.prepareOfficialImport(text, { chapels: [{ id: 'inactive', name: 'Capela São José', active: false }], existingServers: [{ id: sample.id }] });
  assert.deepEqual(plan.errors, []); assert.equal(plan.summary.update, 1); assert.deepEqual(plan.items[0].payload, Object.fromEntries(csv.OFFICIAL_HEADERS.filter(h => !['schema_version', 'Id'].includes(h)).map(h => [h, sample[h] ?? ''])));
});
test('official CSV blocks duplicates, missing IDs and chapel mismatches before writes', () => {
  let text = csv.serializeOfficialCsv([sample, sample]); let plan = csv.prepareOfficialImport(text, { chapels: [{ id: 'inactive', name: 'Outra capela' }] }); assert.ok(plan.errors.some(e => e.includes('duplicado'))); assert.ok(plan.errors.some(e => e.includes('não corresponde')));
  text = csv.serializeOfficialCsv([{ ...sample, id: '' }]); plan = csv.prepareOfficialImport(text, { chapels: [{ id: 'inactive', name: 'Capela São José' }] }); assert.ok(plan.errors.some(e => e.includes('obrigatórios')));
});
