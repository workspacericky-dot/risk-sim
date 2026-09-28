import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/app/dashboard/e-perjadin/penugasan/actions.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const id = '11111111-2222-3333-4444-555555555555'

async function run(access, response = { data: { id, status: 'Berjalan' }, error: null }, target = id) {
  const calls = []
  const query = {
    delete() { calls.push('delete'); return this },
    eq(key, value) { assert.equal(key, 'id'); assert.equal(value, target); return this },
    select() { return this },
    async maybeSingle() { return response },
  }
  const admin = { from(table) { assert.equal(table, 'perjadin_penugasan'); return query } }
  const mocks = {
    'next/cache': { revalidatePath(...args) { calls.push(['revalidate', ...args]) } },
    '@/utils/supabase/server': { async createClient() { return {} } },
    '@/utils/supabase/admin': { createAdminClient() { calls.push('admin'); return admin } },
    '@/lib/e-perjadin/akses': { async muatAksesEPerjadin() { return access } },
    '@/lib/e-perjadin/log': { async catatLog(client, entry) { assert.equal(client, admin); calls.push(['audit', entry]) } },
  }
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => mocks[name] ?? {}, console })
  return { result: await exports.hapusPenugasan(target), calls }
}

const admin = { userId: 'admin-id', bisaAkses: true, isAdmin: true, peran: [] }
for (const access of [
  { ...admin, userId: null },
  { ...admin, isAdmin: false, peran: ['pengelola_kegiatan'] },
  { ...admin, bisaAkses: false },
]) {
  const { result, calls } = await run(access)
  assert.ok(result.error)
  assert.deepEqual(calls, [], 'Unauthorized requests must not create an admin client or delete data')
}
const invalid = await run(admin, undefined, 'invalid-id')
assert.ok(invalid.result.error)
assert.deepEqual(invalid.calls, [])

for (const response of [{ data: null, error: { message: 'database failure' } }, { data: null, error: null }]) {
  const { result, calls } = await run(admin, response)
  assert.ok(result.error)
  assert.deepEqual(calls, ['admin', 'delete'], 'Failed deletion must not record a successful deletion')
}
for (const status of ['Draf', 'Berjalan', 'Selesai', 'Dibatalkan']) {
  const { result, calls } = await run(admin, { data: { id, status }, error: null })
  assert.equal(result.success, true)
  assert.equal(calls[2][0], 'audit')
  assert.equal(calls[2][1].aktorId, admin.userId)
  assert.equal(calls[2][1].entitasId, id)
  assert.equal(calls[2][1].nilaiLama.status, status)
  assert.equal(calls[2][1].penugasanId, undefined, 'Audit must not reference the deleted foreign key')
  assert.deepEqual(calls[3], ['revalidate', '/dashboard/e-perjadin', 'layout'])
}
console.log('OK: admin authorization, invalid ID, database failures, missing assignment, deletion across all statuses, audit, and revalidation.')
