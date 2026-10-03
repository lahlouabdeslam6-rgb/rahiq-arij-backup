const $ = selector => document.querySelector(selector)
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character])
const i18n = window.rahiqI18n
const tr = value => i18n.translate(value)
const nameOf = product => i18n.lang === 'fr' ? (product.nameFr || product.name) : product.name
const priceOf = value => `${Number(value).toLocaleString(i18n.lang === 'fr' ? 'fr-MA' : 'ar-MA')} ${tr('درهم')}`
const locationName = (country, city) => {
  let name = country || tr('غير محدد')
  try { if (country && country.length === 2) name = new Intl.DisplayNames([i18n.lang === 'fr' ? 'fr-MA' : 'ar-MA'], { type: 'region' }).of(country) || country } catch {}
  return city ? `${city}، ${name}` : `${tr('المدينة غير متاحة')} · ${name}`
}
const dateTime = value => {
  if (!value) return '—'
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  return new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Casablanca' }).format(new Date(iso))
}
let products = []
let orders = []
const statusLabels = { NEW: 'جديدة', CONFIRMED: 'مؤكدة', SHIPPED: 'مرسلة', DELIVERED: 'مسلّمة', CANCELLED: 'ملغاة' }
const views = {
  overview: { section: 'overview', title: 'نظرة عامة', lead: 'ملخص سريع للطلبات ونشاط المتجر.' },
  orders: { section: 'ordersSection', title: 'الطلبات', lead: 'تابع الطلبات من التأكيد حتى التسليم.' },
  products: { section: 'productsSection', title: 'المنتجات', lead: 'تحكم في الصور والأثمنة وأوصاف العسل.' },
  visitors: { section: 'visitsSection', title: 'الزيارات', lead: 'بيانات تقريبية عن جلسات الموقع ومصدرها.' },
}
function showView() {
  const key = location.pathname.split('/').filter(Boolean).at(-1)
  const selected = views[key] ? key : 'overview'
  for (const [view, details] of Object.entries(views)) {
    $('#' + details.section).hidden = view !== selected
    const link = document.querySelector(`.adminNav [data-view="${view}"]`)
    link.classList.toggle('active', view === selected)
    if (view === selected) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  $('#sectionTitle').textContent = views[selected].title
  $('#sectionLead').textContent = views[selected].lead
}
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options })
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(tr(data.error || 'تعذر إتمام الطلب'))
  return data
}
function showLogin(message = '') {
  $('#dashboard').hidden = true
  $('#loginPanel').hidden = false
  $('#loginError').textContent = message
}
async function showDashboard() {
  $('#loginPanel').hidden = true
  $('#dashboard').hidden = false
  showView()
  await Promise.all([loadStats(), loadProducts(), loadOrders()])
}
async function loadStats() {
  try {
    const data = await api('/api/admin/stats')
    $('#visitsCount').textContent = data.visits ?? 0
    $('#visitorsCount').textContent = data.visitors ?? 0
    $('#todayCount').textContent = data.today ?? 0
    $('#productsCount').textContent = data.products ?? 0
    $('#ordersCount').textContent = data.orders ?? 0
    $('#newOrdersCount').textContent = data.newOrders ?? 0
    $('#newOrderBadge').textContent = data.newOrders ?? 0
    $('#revenueCount').textContent = Number(data.deliveredRevenue || 0).toLocaleString(i18n.lang === 'fr' ? 'fr-MA' : 'ar-MA')
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(Date.now() - (6 - index) * 86400000).toISOString().slice(0, 10)
      return { day, count: Number(data.daily?.find(item => item.day === day)?.orders || 0) }
    })
    const max = Math.max(1, ...days.map(item => item.count))
    $('#ordersChart').innerHTML = days.map(item => `<div class="chartColumn" title="${item.day}: ${item.count} ${i18n.lang === 'fr' ? 'commande(s)' : 'طلب'}"><span>${item.count}</span><div class="chartTrack"><i style="height:${Math.max(4, item.count / max * 100)}%"></i></div><small>${item.day.slice(5)}</small></div>`).join('')
    $('#recentVisits').innerHTML = data.recent.length ? data.recent.map(row => `<div class="listItem"><span>${escapeHtml(locationName(row.country,row.city))}</span><span>${escapeHtml(dateTime(row.enteredAt))}</span></div>`).join('') : '<p class="empty">مازال ما تسجلات حتى زيارة من بعد تشغيل الإحصائيات.</p>'
    $('#places').innerHTML = data.places.length ? data.places.map(row => `<div class="listItem"><span>${escapeHtml(locationName(row.country,row.city))}</span><strong>${Number(row.visits)} ${tr('زيارة')}</strong></div>`).join('') : '<p class="empty">ما كايناش بيانات بعد.</p>'
    $('#globalError').textContent = ''
  } catch (error) { $('#globalError').textContent = error.message }
}
async function loadOrders() {
  try { orders = await api('/api/admin/orders'); renderOrders() }
  catch (error) { $('#globalError').textContent = error.message }
}
function renderOrders() {
  const filter = $('#orderFilter').value
  const visible = filter === 'ALL' ? orders : orders.filter(order => order.status === filter)
  $('#orderList').innerHTML = visible.length ? visible.map(order => `<article class="orderRow"><div><strong dir="ltr">${escapeHtml(order.orderNumber)}</strong><small>${escapeHtml(dateTime(order.createdAt))}</small></div><div><b>${escapeHtml(order.customerName)}</b><small dir="ltr">${escapeHtml(order.phone)}</small></div><div><span>${escapeHtml(order.city)}</span><small>${Number(order.subtotal).toLocaleString('fr-MA')} درهم</small></div><span class="status status-${order.status.toLowerCase()}">${statusLabels[order.status] || order.status}</span><button type="button" data-order="${order.id}" class="secondary">شوف الطلب</button></article>`).join('') : '<p class="empty">ما كاين حتى طلب فهاد الحالة.</p>'
  $('#overviewOrders').innerHTML = orders.length ? orders.slice(0, 4).map(order => `<div class="overviewOrder"><div><strong dir="ltr">${escapeHtml(order.orderNumber)}</strong><small>${escapeHtml(dateTime(order.createdAt))}</small></div><div><b>${escapeHtml(order.customerName)}</b><small>${escapeHtml(order.city)}</small></div><strong>${Number(order.subtotal).toLocaleString('fr-MA')} درهم</strong><span class="status status-${order.status.toLowerCase()}">${statusLabels[order.status] || order.status}</span></div>`).join('') : '<p class="empty">مازال ما كاين حتى طلب. الطلبات الجديدة غادي تبان هنا.</p>'
}
function openOrder(order) {
  $('#orderDetails').innerHTML = `<div class="orderMeta"><p><small>رقم الطلب</small><strong dir="ltr">${escapeHtml(order.orderNumber)}</strong></p><p><small>التاريخ</small><strong>${escapeHtml(dateTime(order.createdAt))}</strong></p><p><small>الزبون</small><strong>${escapeHtml(order.customerName)}</strong></p><p><small>الهاتف</small><strong dir="ltr">${escapeHtml(order.phone)}</strong></p><p><small>المدينة</small><strong>${escapeHtml(order.city)}</strong></p><p><small>العنوان</small><strong>${escapeHtml(order.address)}</strong></p>${order.note ? `<p><small>ملاحظة</small><strong>${escapeHtml(order.note)}</strong></p>` : ''}</div><h3>المنتجات</h3><div class="orderItems">${order.items.map(item => `<div><span>${item.quantity} × ${escapeHtml(i18n.lang === 'fr' ? (item.productNameFr || tr(item.productName)) : item.productName)}</span><strong>${priceOf(item.unitPrice * item.quantity)}</strong></div>`).join('')}</div><div class="orderTotal"><span>مجموع المنتجات</span><strong>${priceOf(order.subtotal)}</strong></div><p class="hint">رسوم التوصيل كتتأكد مع الزبون قبل الإرسال.</p><label>حالة الطلب<select id="orderStatus">${Object.entries(statusLabels).map(([key,label]) => `<option value="${key}" ${key === order.status ? 'selected' : ''}>${label}</option>`).join('')}</select></label><p id="orderError" class="error" role="alert"></p><button type="button" class="primary" id="saveOrderStatus" data-id="${order.id}">حفظ الحالة</button>`
  if (!$('#orderDialog').open) $('#orderDialog').showModal()
  i18n.apply()
}
async function loadProducts() {
  try {
    products = await api('/api/products')
  $('#productList').innerHTML = products.length ? products.map(product => `<article class="productRow">${product.imageKey ? `<img src="/media/${encodeURIComponent(product.imageKey)}" alt=""/>` : '<span class="adminJarVisual"><img class="adminJarImage" src="/rahiq-signature-jar.png" alt=""/><img class="adminJarLogo" src="/brand-logo.png" alt=""/></span>'}<div><strong>${escapeHtml(nameOf(product))}</strong><small>${priceOf(product.price)}</small></div><button type="button" data-edit="${product.id}">تعديل</button><button type="button" class="delete" data-delete="${product.id}">حذف</button></article>`).join('') : '<p class="empty">ما كايناش منتجات.</p>'
    $('#productList').querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openProduct(products.find(product => product.id === Number(button.dataset.edit)))))
    $('#productList').querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteProduct(Number(button.dataset.delete))))
  } catch (error) { $('#globalError').textContent = error.message }
}
function openProduct(product) {
  const form = $('#productForm')
  form.reset()
  form.elements.id.value = product?.id || ''
  form.elements.name.value = product?.name || ''
  form.elements.nameFr.value = product?.nameFr || ''
  form.elements.price.value = product?.price || ''
  form.elements.description.value = product?.description || ''
  form.elements.descriptionFr.value = product?.descriptionFr || ''
  form.elements.imageKey.value = product?.imageKey || ''
  form.elements.tone.value = product?.tone || 'rehamna'
  $('#dialogTitle').textContent = product ? 'تعديل المنتج' : 'إضافة منتج'
  $('#formError').textContent = ''
  $('#imagePreview').hidden = !product?.imageKey
  if (product?.imageKey) $('#imagePreview').src = '/media/' + encodeURIComponent(product.imageKey)
  $('#productDialog').showModal()
}
async function deleteProduct(id) {
  const product = products.find(item => item.id === id)
  if (!product || !confirm(i18n.lang === 'fr' ? `Supprimer ${nameOf(product)} du site ?` : `حذف ${product.name} من الموقع؟`)) return
  try {
    await api('/api/products/' + id, { method: 'DELETE' })
    await Promise.all([loadProducts(), loadStats()])
  } catch (error) { $('#globalError').textContent = error.message }
}
$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault()
  const form = event.currentTarget
  const button = form.querySelector('button[type=submit]')
  button.disabled = true
  $('#loginError').textContent = ''
  try {
    await api('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: form.elements.username.value.trim(), password: form.elements.password.value }) })
    form.elements.password.value = ''
    await showDashboard()
  } catch (error) { $('#loginError').textContent = error.message }
  finally { button.disabled = false }
})
$('#logoutBtn').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); showLogin() })
$('#refreshStats').addEventListener('click', () => Promise.all([loadStats(), loadProducts(), loadOrders()]))
$('#orderFilter').addEventListener('change', renderOrders)
$('#orderList').addEventListener('click', event => {
  const button = event.target.closest('[data-order]')
  if (button) { const order = orders.find(item => item.id === Number(button.dataset.order)); if (order) openOrder(order) }
})
$('#closeOrderDialog').addEventListener('click', () => $('#orderDialog').close())
$('#orderDetails').addEventListener('click', async event => {
  const button = event.target.closest('#saveOrderStatus')
  if (!button) return
  button.disabled = true
  try {
    await api('/api/admin/orders/' + button.dataset.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: $('#orderStatus').value }) })
    $('#orderDialog').close()
    await Promise.all([loadOrders(), loadStats()])
  } catch (error) { $('#orderError').textContent = error.message }
  finally { button.disabled = false }
})
$('#addProduct').addEventListener('click', () => openProduct(null))
$('#closeDialog').addEventListener('click', () => $('#productDialog').close())
$('#cancelDialog').addEventListener('click', () => $('#productDialog').close())
$('#productForm').addEventListener('submit', async event => {
  event.preventDefault()
  const form = event.currentTarget
  const button = form.querySelector('button[type=submit]')
  button.disabled = true
  $('#formError').textContent = ''
  try {
    let imageKey = form.elements.imageKey.value || null
    const file = form.elements.image.files[0]
    if (file) {
      const upload = new FormData()
      upload.append('image', file)
      const result = await api('/api/admin/upload', { method: 'POST', body: upload })
      imageKey = result.imageKey
    }
    const body = { name: form.elements.name.value.trim(), nameFr: form.elements.nameFr.value.trim(), price: Number(form.elements.price.value), description: form.elements.description.value.trim(), descriptionFr: form.elements.descriptionFr.value.trim(), tone: form.elements.tone.value, imageKey }
    const id = form.elements.id.value
    await api(id ? '/api/products/' + id : '/api/products', { method: id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    $('#productDialog').close()
    await Promise.all([loadProducts(), loadStats()])
  } catch (error) { $('#formError').textContent = error.message }
  finally { button.disabled = false }
})
$('#productForm').elements.image.addEventListener('change', event => {
  const file = event.currentTarget.files[0]
  if (!file) return
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    $('#formError').textContent = 'خاص الصورة تكون JPG أو PNG أو WebP وأقل من 5MB.'
    event.currentTarget.value = ''
    return
  }
  $('#imagePreview').src = URL.createObjectURL(file)
  $('#imagePreview').hidden = false
})
api('/api/admin/session').then(data => data.authenticated ? showDashboard() : showLogin()).catch(() => showLogin('تعذر الاتصال بالخادم. حاول مجدداً.'))
document.addEventListener('rahiq:languagechange', () => {
  if ($('#dashboard').hidden) { i18n.apply(); return }
  showView()
  renderOrders()
  loadProducts()
  loadStats()
  const dialog = $('#orderDialog')
  if (dialog.open) { const id = Number(dialog.querySelector('#saveOrderStatus')?.dataset.id); const order = orders.find(item => item.id === id); if (order) openOrder(order) }
  i18n.apply()
})
