import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import worker from '../server/worker.mjs'

const db = new DatabaseSync(':memory:')
const d1 = {
  prepare(sql) {
    let args = []
    return {
      bind(...values) { args = values; return this },
      async run() { const result = db.prepare(sql).run(...args); return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } } },
      async first() { return db.prepare(sql).get(...args) || null },
      async all() { return { results: db.prepare(sql).all(...args) } },
    }
  },
}
const images = new Map()
const env = {
  DB: d1,
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD: 'a-strong-test-password-only',
  SESSION_SECRET: 'test-session-secret-has-more-than-32-characters',
  IMAGES: {
    async put(key, stream, options) { images.set(key, { body: await new Response(stream).arrayBuffer(), httpMetadata: options.httpMetadata }) },
    async get(key) { const item = images.get(key); return item && { body: item.body, httpMetadata: item.httpMetadata } },
  },
  ASSETS: { async fetch() { return new Response('static page', { headers: { 'content-type': 'text/html' } }) } },
}
const request = (path, method = 'GET', body, cookie) => new Request('https://example.com' + path, { method, headers: { ...(method !== 'GET' ? { origin: 'https://example.com' } : {}), ...(cookie ? { cookie } : {}), ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })

test('admin login protects edits while visits and product changes persist', async () => {
  const initial = await worker.fetch(request('/api/products'), env)
  assert.equal(initial.status, 200)
  assert.equal((await initial.json()).length, 8)

  const blocked = await worker.fetch(request('/api/products/1', 'PUT', { name: 'Updated', price: 120 }), env)
  assert.equal(blocked.status, 401)
  const wrong = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: 'wrong' }), env)
  assert.equal(wrong.status, 401)

  const login = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: env.ADMIN_PASSWORD }), env)
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await (await worker.fetch(request('/api/admin/session', 'GET', undefined, cookie), env)).json()).authenticated, true)
  assert.equal((await (await worker.fetch(request('/api/admin/session'), env)).json()).authenticated, false)

  const visit = await worker.fetch(request('/api/visit', 'POST', { sessionId: crypto.randomUUID() }), env)
  assert.equal(visit.status, 204)
  const stats = await worker.fetch(request('/api/admin/stats', 'GET', undefined, cookie), env)
  assert.equal((await stats.json()).visits, 1)

  const update = await worker.fetch(request('/api/products/1', 'PUT', { name: 'عسل الفصة', price: 125, description: 'وصف جديد', tone: 'clover' }, cookie), env)
  assert.equal(update.status, 200)
  const changed = (await (await worker.fetch(request('/api/products'), env)).json())[0]
  assert.equal(changed.price, 125)
  assert.equal(changed.description, 'وصف جديد')

  const form = new FormData()
  form.append('image', new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }))
  const upload = await worker.fetch(request('/api/admin/upload', 'POST', form, cookie), env)
  assert.equal(upload.status, 201)
  const photo = await upload.json()
  assert.equal((await worker.fetch(request(photo.url), env)).status, 200)
})
