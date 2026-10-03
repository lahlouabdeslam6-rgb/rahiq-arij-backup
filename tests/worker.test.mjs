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
  ASSETS: { async fetch(request) { return new Response(new URL(request.url).pathname, { headers: { 'content-type': 'text/html' } }) } },
}
const request = (path, method = 'GET', body, cookie) => new Request('https://example.com' + path, { method, headers: { ...(method !== 'GET' ? { origin: 'https://example.com' } : {}), ...(cookie ? { cookie } : {}), ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })

test('each admin section URL serves the dashboard shell', async () => {
  for (const path of ['/admin', '/admin/overview', '/admin/orders', '/admin/products', '/admin/visitors']) {
    const response = await worker.fetch(request(path), env)
    assert.equal(response.status, 200)
    assert.equal(await response.text(), '/admin.html')
  }
})

test('admin login protects edits while visits and product changes persist', async () => {
  const initial = await worker.fetch(request('/api/products'), env)
  assert.equal(initial.status, 200)
  const initialProducts = await initial.json()
  assert.equal(initialProducts.length, 8)
  assert.ok(initialProducts[2].description.length > 100)
  assert.equal(initialProducts[2].nameFr, 'Miel d’eucalyptus')
  assert.ok(initialProducts[2].descriptionFr.length > 40)

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
  const ownerVisit = await worker.fetch(request('/api/visit', 'POST', { sessionId: crypto.randomUUID() }, cookie), env)
  assert.equal(ownerVisit.status, 204)
  const stats = await worker.fetch(request('/api/admin/stats', 'GET', undefined, cookie), env)
  assert.equal((await stats.json()).visits, 1)

  const update = await worker.fetch(request('/api/products/1', 'PUT', { name: 'عسل الفصة', nameFr: 'Miel de luzerne', price: 125, description: 'وصف جديد', descriptionFr: 'Nouvelle description', tone: 'clover' }, cookie), env)
  assert.equal(update.status, 200)
  const changed = (await (await worker.fetch(request('/api/products'), env)).json())[0]
  assert.equal(changed.price, 125)
  assert.equal(changed.description, 'وصف جديد')
  assert.equal(changed.descriptionFr, 'Nouvelle description')

  const untranslated = await worker.fetch(request('/api/products', 'POST', { name: 'عسل بلا ترجمة', price: 180, description: 'وصف', tone: 'lemon' }, cookie), env)
  assert.equal(untranslated.status, 400)

  const added = await worker.fetch(request('/api/products', 'POST', { name: 'عسل جديد', nameFr: 'Nouveau miel', price: 180, description: 'منتوج من الإدارة', descriptionFr: 'Produit ajouté depuis l’administration', tone: 'lemon' }, cookie), env)
  assert.equal(added.status, 201)
  const catalogue = await (await worker.fetch(request('/api/products'), env)).json()
  assert.equal(catalogue.length, 9)
  assert.equal(catalogue.at(-1).name, 'عسل جديد')
  assert.equal(catalogue.at(-1).nameFr, 'Nouveau miel')

  const form = new FormData()
  form.append('image', new File([new Uint8Array([137, 80, 78, 71])], 'photo.png', { type: 'image/png' }))
  const upload = await worker.fetch(request('/api/admin/upload', 'POST', form, cookie), env)
  assert.equal(upload.status, 201)
  const photo = await upload.json()
  assert.equal((await worker.fetch(request(photo.url), env)).status, 200)
})

test('checkout stores server-priced orders and admin can manage their status', async () => {
  const invalid = await worker.fetch(request('/api/orders', 'POST', { customerName: 'A', phone: '123', city: 'Marrakech', address: 'Street 1', items: [{ productId: 1, quantity: 1 }] }), env)
  assert.equal(invalid.status, 400)
  const unavailable = await worker.fetch(request('/api/orders', 'POST', { customerName: 'Sara Ben', phone: '0612345678', city: 'Marrakech', address: 'Rue des Fleurs 12', items: [{ productId: 99999, quantity: 1 }] }), env)
  assert.equal(unavailable.status, 409)
  const placed = await worker.fetch(request('/api/orders', 'POST', { customerName: 'Sara Ben', phone: '0612345678', address: 'Marrakech، Rue des Fleurs 12', items: [{ productId: 1, quantity: 2, price: 1 }] }), env)
  assert.equal(placed.status, 201)
  const confirmation = await placed.json()
  assert.match(confirmation.orderNumber, /^RA-/)
  assert.equal(confirmation.subtotal, 250)
  assert.equal((await worker.fetch(request('/api/admin/orders'), env)).status, 401)
  const login = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: env.ADMIN_PASSWORD }), env)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const orders = await (await worker.fetch(request('/api/admin/orders', 'GET', undefined, cookie), env)).json()
  const order = orders.find(item => item.orderNumber === confirmation.orderNumber)
  assert.equal(order.customerName, 'Sara Ben')
  assert.equal(order.city, 'Marrakech')
  assert.equal(order.items[0].quantity, 2)
  assert.equal(order.items[0].productNameFr, 'Miel de luzerne')
  const changed = await worker.fetch(request('/api/admin/orders/' + order.id, 'PATCH', { status: 'DELIVERED' }, cookie), env)
  assert.equal(changed.status, 200)
  const stats = await (await worker.fetch(request('/api/admin/stats', 'GET', undefined, cookie), env)).json()
  assert.equal(stats.deliveredRevenue, 250)
})

test('correct admin password can recover from a prior rate limit', async () => {
  for (let index = 0; index < 5; index++) {
    const wrong = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: 'wrong' }), env)
    assert.equal(wrong.status, 401)
  }
  const limited = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: 'wrong' }), env)
  assert.equal(limited.status, 429)
  const correct = await worker.fetch(request('/api/admin/login', 'POST', { username: 'admin', password: env.ADMIN_PASSWORD }), env)
  assert.equal(correct.status, 200)
})
