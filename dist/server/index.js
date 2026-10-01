const cookieName = '__Host-rahiq_admin'
let setupPromise

const initialProducts = [
  [1, 'عسل الفصة', 100, 'clover', 'عسل الفصة بلون ذهبي فاتح وقوام لطيف. مذاقه هادئ وحلاوته متوازنة، ويليق بوجبة الفطور أو بإضافة صغيرة إلى مشروب دافئ.'],
  [2, 'عسل السدر', 350, 'sidr', 'عسل السدر ذو لون عنبري ونكهة غنية ودافئة. رائحته الزهرية وقوامه الكثيف يمنحانه حضوراً واضحاً عند التذوق، ويمكن الاستمتاع به وحده أو مع وجبة الفطور.'],
  [3, 'عسل الأوكالبتوس', 200, 'eucalyptus', 'عسل الأوكالبتوس بلون عنبري دافئ ونكهة عطرية منعشة من أزهار الأوكالبتوس. مذاقه المميز يجعله اختياراً لمن يفضل عسلاً بطابع نباتي واضح.'],
  [4, 'عسل الرحامنة', 450, 'rehamna', 'عسل خام من مراعي الرحامنة بالمغرب. تعكس نكهته ما يزهر في المنطقة خلال الموسم، ويرتبط بحكاية إعادة بناء المنحل من خمس خلايا بعد موسم صعب.'],
  [5, 'عسل الخروب', 250, 'carob', 'عسل الخروب بلون داكن ومذاق عميق تميل نهايته إلى مرارة خفيفة محببة. طابعه القوي يلائم من يحبون العسل ذي النكهة الغنية.'],
  [6, 'عسل الفرنان', 250, 'fernan', 'عسل الفرنان بلون ذهبي داكن وطابع عشبي. تنتجه أزهار الفرنان في موسمها، لذلك قد تتغير درجته ونكهته قليلاً بين دفعة وأخرى.'],
  [7, 'عسل الدغموس', 550, 'daghmous', 'عسل الدغموس معروف بنكهته القوية واللمسة الدافئة التي تظهر عند تذوقه. يأتي بلون عنبري عميق، وتبقى كمياته مرتبطة بالموسم وتوفر المرعى.'],
  [8, 'عسل الليمون', 150, 'lemon', 'عسل أزهار الليمون فاتح اللون وبرائحة زهرية منعشة. مذاقه رقيق وحلاوته لطيفة، ويليق بالفطور أو بإضافة صغيرة إلى مشروب دافئ.'],
]
const previousDescriptions = [
  [1, 'عسل خفيف بمذاق لطيف للاستعمال اليومي.'],
  [2, 'عسل بنكهة غنية ودافئة من أزهار السدر.'],
  [3, 'عسل عنبري بنكهة منعشة من أزهار الأوكالبتوس.'],
  [4, 'عسل خام من مراعي الرحامنة، من أرض قاسية عامرة بالحياة.'],
  [5, 'عسل داكن بمذاق مميز من أزهار الخروب.'],
  [6, 'عسل موسمي بطابع عشبي ولون ذهبي داكن.'],
  [7, 'عسل من أزهار الدغموس بنكهة قوية ومميزة.'],
  [8, 'عسل فاتح برائحة زهر الليمون ومذاق لطيف.'],
]

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })
}

function setup(env) {
  if (!env.DB) throw new Error('D1 binding is missing')
  if (!setupPromise) setupPromise = (async () => {
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, description TEXT NOT NULL DEFAULT \'\', image_key TEXT, tone TEXT NOT NULL DEFAULT \'rehamna\', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run()
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, country TEXT, city TEXT, entered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)').run()
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS visits_entered_idx ON visits(entered_at)').run()
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT)').run()
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS login_attempts (visitor_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, first_at INTEGER NOT NULL)').run()
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, phone TEXT NOT NULL, city TEXT NOT NULL, address TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', subtotal REAL NOT NULL, status TEXT NOT NULL DEFAULT 'NEW', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run()
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER, product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id))').run()
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at)').run()
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS order_attempts (visitor_hash TEXT PRIMARY KEY, count INTEGER NOT NULL, first_at INTEGER NOT NULL)').run()
    const seeded = await env.DB.prepare("SELECT value FROM app_meta WHERE key='seeded'").first()
    if (!seeded) {
      for (const p of initialProducts) {
        await env.DB.prepare('INSERT OR IGNORE INTO products(id,name,price,tone,description) VALUES (?,?,?,?,?)').bind(...p).run()
      }
      await env.DB.prepare("INSERT OR IGNORE INTO app_meta(key,value) VALUES ('seeded','1')").run()
    }
    const descriptionsUpgraded = await env.DB.prepare("SELECT value FROM app_meta WHERE key='descriptions_v2'").first()
    if (!descriptionsUpgraded) {
      for (const [id, oldDescription] of previousDescriptions) {
        const current = initialProducts.find(product => product[0] === id)
        await env.DB.prepare('UPDATE products SET description=? WHERE id=? AND description=?').bind(current[4], id, oldDescription).run()
      }
      await env.DB.prepare("INSERT OR IGNORE INTO app_meta(key,value) VALUES ('descriptions_v2','1')").run()
    }
  })().catch(error => { setupPromise = undefined; throw error })
  return setupPromise
}

const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0))
async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))))
}
function equal(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
async function authorized(request, env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return false
  const value = request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
  if (!value) return false
  const [payload, signature] = value.split('.')
  if (!payload || !signature) return false
  try {
    const data = JSON.parse(new TextDecoder().decode(decode(payload)))
    if (data.role !== 'admin' || !Number.isFinite(data.exp) || data.exp < Date.now()) return false
    return equal(await hmac(env.SESSION_SECRET, payload), signature)
  } catch { return false }
}
function sameOrigin(request) {
  const origin = request.headers.get('origin')
  return origin === new URL(request.url).origin
}
function validProduct(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const price = Number(body?.price)
  const imageKey = body?.imageKey || null
  const tone = body?.tone || 'rehamna'
  if (!name || name.length > 100 || description.length > 600 || !Number.isFinite(price) || price <= 0 || price > 100000 || (imageKey && !/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(imageKey)) || !['clover','sidr','eucalyptus','rehamna','carob','fernan','daghmous','lemon'].includes(tone)) return null
  return { name, price, description, imageKey, tone }
}
async function bodyJson(request) {
  if (Number(request.headers.get('content-length')) > 10000) return null
  try { return await request.json() } catch { return null }
}
async function clientAsset(request, env, path) {
  if (!env.ASSETS) return new Response('Assets unavailable', { status: 503 })
  const url = new URL(request.url)
  if (path) url.pathname = path
  const response = await env.ASSETS.fetch(new Request(url, request))
  const headers = new Headers(response.headers)
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  return new Response(response.body, { status: response.status, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method
    try {
      if (path === '/admin' || path === '/admin/') return clientAsset(request, env, '/admin.html')
      if (path === '/api/products' && method === 'GET') {
        await setup(env)
        const rows = await env.DB.prepare('SELECT id,name,price,description,image_key AS imageKey,tone FROM products ORDER BY id').all()
        return json(rows.results || [])
      }
      if (path === '/api/visit' && method === 'POST') {
        if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
        const body = await bodyJson(request)
        if (!/^[a-f0-9-]{36}$/.test(body?.sessionId || '')) return json({ error: 'Invalid session' }, 400)
        await setup(env)
        const cf = request.cf || {}
        const country = String(cf.country || request.headers.get('cf-ipcountry') || '').slice(0, 2)
        const city = String(cf.city || '').slice(0, 100)
        const recent = await env.DB.prepare("SELECT 1 FROM visits WHERE session_id=? AND entered_at > datetime('now','-5 minutes') LIMIT 1").bind(body.sessionId).first()
        if (!recent) await env.DB.prepare('INSERT INTO visits(session_id,country,city) VALUES (?,?,?)').bind(body.sessionId, country, city).run()
        return new Response(null, { status: 204 })
      }
      if (path === '/api/orders' && method === 'POST') {
        if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
        const body = await bodyJson(request)
        if (body?.website) return json({ error: 'طلب غير صالح' }, 400)
        const name = typeof body?.customerName === 'string' ? body.customerName.trim() : ''
        const phone = typeof body?.phone === 'string' ? body.phone.replace(/[\s().-]/g, '') : ''
        const city = typeof body?.city === 'string' ? body.city.trim() : ''
        const address = typeof body?.address === 'string' ? body.address.trim() : ''
        const note = typeof body?.note === 'string' ? body.note.trim() : ''
        const items = body?.items
        if (name.length < 2 || name.length > 100 || !/^(?:\+212|0)[5-7]\d{8}$/.test(phone) || city.length < 2 || city.length > 100 || address.length < 5 || address.length > 300 || note.length > 300 || !Array.isArray(items) || !items.length || items.length > 30 || items.some(item => !Number.isSafeInteger(item?.productId) || !Number.isSafeInteger(item?.quantity) || item.quantity < 1 || item.quantity > 20)) return json({ error: 'راجع معلومات الطلب ورقم الهاتف والكميات' }, 400)
        const quantities = new Map()
        for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity)
        if ([...quantities.values()].some(quantity => quantity > 20)) return json({ error: 'الحد الأقصى 20 من كل منتج' }, 400)
        await setup(env)
        const visitorHash = await hmac(env.SESSION_SECRET, request.headers.get('cf-connecting-ip') || 'unknown')
        const now = Math.floor(Date.now() / 1000)
        const attempt = await env.DB.prepare('SELECT count,first_at FROM order_attempts WHERE visitor_hash=?').bind(visitorHash).first()
        if (attempt && now - attempt.first_at < 600 && attempt.count >= 5) return json({ error: 'وصلات طلبات كثيرة. حاول من بعد شوية.' }, 429)
        const products = []
        for (const [id, quantity] of quantities) {
          const product = await env.DB.prepare('SELECT id,name,price FROM products WHERE id=?').bind(id).first()
          if (!product) return json({ error: 'شي منتج ما بقاش متوفر. جدّد الصفحة.' }, 409)
          products.push({ ...product, quantity })
        }
        const subtotal = Math.round(products.reduce((sum, product) => sum + product.price * product.quantity, 0) * 100) / 100
        const orderNumber = `RA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        const result = await env.DB.prepare('INSERT INTO orders(order_number,customer_name,phone,city,address,note,subtotal) VALUES (?,?,?,?,?,?,?)').bind(orderNumber,name,phone,city,address,note,subtotal).run()
        try {
          for (const product of products) await env.DB.prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?)').bind(result.meta.last_row_id,product.id,product.name,product.quantity,product.price).run()
        } catch (error) {
          await env.DB.prepare('DELETE FROM order_items WHERE order_id=?').bind(result.meta.last_row_id).run()
          await env.DB.prepare('DELETE FROM orders WHERE id=?').bind(result.meta.last_row_id).run()
          throw error
        }
        if (!attempt || now - attempt.first_at >= 600) await env.DB.prepare('INSERT INTO order_attempts(visitor_hash,count,first_at) VALUES (?,1,?) ON CONFLICT(visitor_hash) DO UPDATE SET count=1,first_at=excluded.first_at').bind(visitorHash,now).run()
        else await env.DB.prepare('UPDATE order_attempts SET count=count+1 WHERE visitor_hash=?').bind(visitorHash).run()
        return json({ orderNumber, subtotal, status: 'NEW' }, 201)
      }
      if (path === '/api/admin/login' && method === 'POST') {
        if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
        if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return json({ error: 'Admin is not configured' }, 503)
        await setup(env)
        const ip = request.headers.get('cf-connecting-ip') || 'unknown'
        const visitorHash = await hmac(env.SESSION_SECRET, ip)
        const now = Math.floor(Date.now() / 1000)
        const attempt = await env.DB.prepare('SELECT count,first_at FROM login_attempts WHERE visitor_hash=?').bind(visitorHash).first()
        const body = await bodyJson(request)
        if (body?.username !== (env.ADMIN_USERNAME || 'admin') || typeof body?.password !== 'string' || body.password.length > 256 || !equal(body.password, env.ADMIN_PASSWORD)) {
          if (attempt && now - attempt.first_at < 900 && attempt.count >= 5) return json({ error: 'محاولات كثيرة. حاول بعد ربع ساعة.' }, 429)
          if (!attempt || now - attempt.first_at >= 900) await env.DB.prepare('INSERT INTO login_attempts(visitor_hash,count,first_at) VALUES (?,1,?) ON CONFLICT(visitor_hash) DO UPDATE SET count=1,first_at=excluded.first_at').bind(visitorHash, now).run()
          else await env.DB.prepare('UPDATE login_attempts SET count=count+1 WHERE visitor_hash=?').bind(visitorHash).run()
          return json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, 401)
        }
        await env.DB.prepare('DELETE FROM login_attempts WHERE visitor_hash=?').bind(visitorHash).run()
        const payload = encode(new TextEncoder().encode(JSON.stringify({ role: 'admin', exp: Date.now() + 12 * 60 * 60 * 1000 })))
        const signature = await hmac(env.SESSION_SECRET, payload)
        return json({ ok: true }, 200, { 'set-cookie': `${cookieName}=${payload}.${signature}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200` })
      }
      if (path === '/api/admin/session' && method === 'GET') return json({ authenticated: await authorized(request, env) })
      if (path === '/api/admin/logout' && method === 'POST') {
        if (!sameOrigin(request)) return json({ error: 'Forbidden' }, 403)
        return json({ ok: true }, 200, { 'set-cookie': `${cookieName}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` })
      }
      if (path.startsWith('/api/admin/') || (path === '/api/products' && method !== 'GET') || /^\/api\/products\/\d+$/.test(path)) {
        if (!sameOrigin(request) && method !== 'GET') return json({ error: 'Forbidden' }, 403)
        if (!await authorized(request, env)) return json({ error: 'غير مصرح' }, 401)
        await setup(env)
        if (path === '/api/admin/stats' && method === 'GET') {
          const [counts, recent, places, daily] = await Promise.all([
            env.DB.prepare("SELECT (SELECT COUNT(*) FROM visits) AS visits,(SELECT COUNT(DISTINCT session_id) FROM visits) AS visitors,(SELECT COUNT(*) FROM visits WHERE date(entered_at)=date('now')) AS today,(SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM orders) AS orders,(SELECT COUNT(*) FROM orders WHERE status='NEW') AS newOrders,(SELECT COALESCE(SUM(subtotal),0) FROM orders WHERE status='DELIVERED') AS deliveredRevenue").first(),
            env.DB.prepare('SELECT country,city,entered_at AS enteredAt FROM visits ORDER BY id DESC LIMIT 20').all(),
            env.DB.prepare("SELECT country,city,COUNT(*) AS visits FROM visits GROUP BY country,city ORDER BY visits DESC LIMIT 10").all(),
            env.DB.prepare("SELECT date(created_at) AS day,COUNT(*) AS orders FROM orders WHERE created_at >= datetime('now','-6 days') GROUP BY date(created_at) ORDER BY day").all(),
          ])
          return json({ ...counts, recent: recent.results || [], places: places.results || [], daily: daily.results || [] })
        }
        if (path === '/api/admin/orders' && method === 'GET') {
          const [orders, items] = await Promise.all([env.DB.prepare('SELECT id,order_number AS orderNumber,customer_name AS customerName,phone,city,address,note,subtotal,status,created_at AS createdAt FROM orders ORDER BY id DESC LIMIT 200').all(),env.DB.prepare('SELECT order_id AS orderId,product_name AS productName,quantity,unit_price AS unitPrice FROM order_items WHERE order_id IN (SELECT id FROM orders ORDER BY id DESC LIMIT 200)').all()])
          return json((orders.results || []).map(order => ({ ...order, items: (items.results || []).filter(item => item.orderId === order.id) })))
        }
        const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/)
        if (orderMatch && method === 'PATCH') {
          const body = await bodyJson(request)
          if (!['NEW','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'].includes(body?.status)) return json({ error: 'حالة غير صالحة' }, 400)
          const result = await env.DB.prepare('UPDATE orders SET status=? WHERE id=?').bind(body.status,Number(orderMatch[1])).run()
          return result.meta.changes ? json({ ok: true }) : json({ error: 'الطلب غير موجود' }, 404)
        }
        if (path === '/api/admin/upload' && method === 'POST') {
          if (!env.IMAGES) return json({ error: 'Image storage unavailable' }, 503)
          const form = await request.formData()
          const file = form.get('image')
          const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
          if (!(file instanceof File) || !extensions[file.type] || file.size > 5 * 1024 * 1024 || file.size === 0) return json({ error: 'صورة غير صالحة (JPG/PNG/WebP، حتى 5MB)' }, 400)
          const key = `${crypto.randomUUID()}.${extensions[file.type]}`
          await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type } })
          return json({ imageKey: key, url: `/media/${key}` }, 201)
        }
        if (path === '/api/products' && method === 'POST') {
          const product = validProduct(await bodyJson(request))
          if (!product) return json({ error: 'بيانات المنتج غير صالحة' }, 400)
          const result = await env.DB.prepare('INSERT INTO products(name,price,description,image_key,tone) VALUES (?,?,?,?,?)').bind(product.name,product.price,product.description,product.imageKey,product.tone).run()
          return json({ ...product, id: result.meta.last_row_id }, 201)
        }
        const match = path.match(/^\/api\/products\/(\d+)$/)
        if (match && method === 'PUT') {
          const product = validProduct(await bodyJson(request))
          if (!product) return json({ error: 'بيانات المنتج غير صالحة' }, 400)
          const result = await env.DB.prepare('UPDATE products SET name=?,price=?,description=?,image_key=?,tone=? WHERE id=?').bind(product.name,product.price,product.description,product.imageKey,product.tone,Number(match[1])).run()
          return result.meta.changes ? json({ ...product, id: Number(match[1]) }) : json({ error: 'المنتج غير موجود' }, 404)
        }
        if (match && method === 'DELETE') {
          const result = await env.DB.prepare('DELETE FROM products WHERE id=?').bind(Number(match[1])).run()
          return result.meta.changes ? json({ ok: true }) : json({ error: 'المنتج غير موجود' }, 404)
        }
      }
      if (path.startsWith('/media/') && method === 'GET') {
        const key = path.slice(7)
        if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key)) return new Response('Not found', { status: 404 })
        const object = await env.IMAGES?.get(key)
        if (!object) return new Response('Not found', { status: 404 })
        return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } })
      }
      if (path.startsWith('/api/')) return json({ error: 'Not found' }, 404)
      return clientAsset(request, env)
    } catch (error) {
      console.error('Site request failed', error)
      return json({ error: 'تعذر إتمام الطلب' }, 500)
    }
  },
}
