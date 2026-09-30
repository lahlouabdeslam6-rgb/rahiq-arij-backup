const $ = selector => document.querySelector(selector)
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character])
const locationName = (country, city) => {
  let name = country || 'غير محدد'
  try { if (country && country.length === 2) name = new Intl.DisplayNames(['ar-MA'], { type: 'region' }).of(country) || country } catch {}
  return city ? `${city}، ${name}` : name
}
const dateTime = value => {
  if (!value) return '—'
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
  return new Intl.DateTimeFormat('fr-MA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Casablanca' }).format(new Date(iso))
}
let products = []
async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options })
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'تعذر إتمام الطلب')
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
  await Promise.all([loadStats(), loadProducts()])
}
async function loadStats() {
  try {
    const data = await api('/api/admin/stats')
    $('#visitsCount').textContent = data.visits ?? 0
    $('#visitorsCount').textContent = data.visitors ?? 0
    $('#todayCount').textContent = data.today ?? 0
    $('#productsCount').textContent = data.products ?? 0
    $('#recentVisits').innerHTML = data.recent.length ? data.recent.map(row => `<div class="listItem"><span>${escapeHtml(locationName(row.country,row.city))}</span><span>${escapeHtml(dateTime(row.enteredAt))}</span></div>`).join('') : '<p class="empty">مازال ما تسجلات حتى زيارة من بعد تشغيل الإحصائيات.</p>'
    $('#places').innerHTML = data.places.length ? data.places.map(row => `<div class="listItem"><span>${escapeHtml(locationName(row.country,row.city))}</span><strong>${Number(row.visits)} زيارة</strong></div>`).join('') : '<p class="empty">ما كايناش بيانات بعد.</p>'
    $('#globalError').textContent = ''
  } catch (error) { $('#globalError').textContent = error.message }
}
async function loadProducts() {
  try {
    products = await api('/api/products')
    $('#productList').innerHTML = products.length ? products.map(product => `<article class="productRow"><img src="${product.imageKey ? '/media/'+encodeURIComponent(product.imageKey) : '/rahiq-signature-jar.png'}" alt=""/><div><strong>${escapeHtml(product.name)}</strong><small>${Number(product.price)} درهم</small></div><button type="button" data-edit="${product.id}">تعديل</button><button type="button" class="delete" data-delete="${product.id}">حذف</button></article>`).join('') : '<p class="empty">ما كايناش منتجات.</p>'
    $('#productList').querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openProduct(products.find(product => product.id === Number(button.dataset.edit)))))
    $('#productList').querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => deleteProduct(Number(button.dataset.delete))))
  } catch (error) { $('#globalError').textContent = error.message }
}
function openProduct(product) {
  const form = $('#productForm')
  form.reset()
  form.elements.id.value = product?.id || ''
  form.elements.name.value = product?.name || ''
  form.elements.price.value = product?.price || ''
  form.elements.description.value = product?.description || ''
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
  if (!product || !confirm(`حذف ${product.name} من الموقع؟`)) return
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
$('#refreshStats').addEventListener('click', loadStats)
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
    const body = { name: form.elements.name.value.trim(), price: Number(form.elements.price.value), description: form.elements.description.value.trim(), tone: form.elements.tone.value, imageKey }
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
