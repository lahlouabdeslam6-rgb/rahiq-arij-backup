const grid = document.querySelector('.productsGrid')
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
const tones = new Set(['clover','sidr','eucalyptus','rehamna','carob','fernan','daghmous','lemon'])
const mockup = tone => `<div class="jarVisual" data-honey="${tones.has(tone) ? tone : 'rehamna'}"><img class="jarImage" src="/rahiq-signature-jar.png" alt="تصوّر لتصميم عبوة رحيق أريج"/><img class="jarLogo" src="/brand-logo.png" alt=""/></div>`
const productPhoto = product => product.imageKey && /^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(product.imageKey) ? `<img class="uploadedImage" src="/media/${product.imageKey}" alt="${safe(product.name)}"/>` : mockup(product.tone)
const money = value => `${Number(value).toLocaleString('ar-MA')} درهم`
let products = []
let cart = []
try { cart = JSON.parse(localStorage.getItem('rahiq-cart') || '[]').filter(item => Number.isSafeInteger(item.id) && Number.isSafeInteger(item.quantity) && item.quantity > 0) } catch {}
const saveCart = () => { localStorage.setItem('rahiq-cart', JSON.stringify(cart)); updateCart() }

const details = document.createElement('dialog')
details.className = 'detailsDialog'
details.setAttribute('aria-label', 'تفاصيل المنتج')
details.innerHTML = '<button type="button" class="closeDetails" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><div class="detailsBody"></div>'
document.body.append(details)
details.querySelector('.closeDetails').addEventListener('click', () => details.close())
details.addEventListener('click', event => { if (event.target === details) details.close() })

const cartDialog = document.createElement('dialog')
cartDialog.className = 'cartDialog'
cartDialog.setAttribute('aria-label', 'سلة المشتريات')
cartDialog.innerHTML = '<div class="cartHeading"><div><span>رحيق أريج / طلبك</span><h2>سلة المشتريات</h2></div><button type="button" class="cartClose" aria-label="إغلاق">×</button></div><div class="cartContent"></div>'
document.body.append(cartDialog)
cartDialog.querySelector('.cartClose').addEventListener('click', () => cartDialog.close())
cartDialog.addEventListener('click', event => { if (event.target === cartDialog) cartDialog.close() })
document.querySelectorAll('.cartTrigger').forEach(button => button.addEventListener('click', () => { updateCart(); cartDialog.showModal() }))

function addToCart(id) {
  const product = products.find(item => item.id === id)
  if (!product) return
  const line = cart.find(item => item.id === id)
  if (line) line.quantity = Math.min(20, line.quantity + 1)
  else cart.push({ id, quantity: 1 })
  saveCart()
  details.close()
  cartDialog.showModal()
}
function updateCart() {
  cart = cart.filter(line => products.some(product => product.id === line.id))
  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  document.querySelectorAll('.cartCount').forEach(node => { node.textContent = count; node.hidden = !count })
  const content = cartDialog.querySelector('.cartContent')
  if (!cart.length) { content.innerHTML = '<div class="cartEmpty"><span class="emptyCartIcon">◇</span><h3>سلة مشترياتك فارغة</h3><p>تعرّف على مجموعتنا واختر العسل المناسب لك.</p></div><button type="button" class="cartContinue">تصفح المنتجات</button>'; return }
  const subtotal = cart.reduce((sum, line) => sum + products.find(product => product.id === line.id).price * line.quantity, 0)
  content.innerHTML = `<div class="cartLines">${cart.map(line => { const product = products.find(item => item.id === line.id); return `<article class="cartLine"><div class="cartThumb">${productPhoto(product)}</div><div><strong>${safe(product.name)}</strong><small>${money(product.price)}</small><div class="quantity"><button type="button" data-dec="${product.id}" aria-label="تقليل كمية ${safe(product.name)}">−</button><span>${line.quantity}</span><button type="button" data-inc="${product.id}" aria-label="زيادة كمية ${safe(product.name)}">+</button></div></div><b>${money(product.price * line.quantity)}</b></article>` }).join('')}</div><div class="cartFooter"><div class="cartTotal"><span>مجموع المنتجات</span><strong>${money(subtotal)}</strong></div><p class="cartNote">تُحدد رسوم التوصيل بعد مراجعة المدينة والعنوان. الدفع عند الاستلام.</p><button type="button" class="checkoutStart">متابعة الطلب ←</button></div>`
}
cartDialog.addEventListener('click', event => {
  const button = event.target.closest('button')
  if (!button) return
  if (button.classList.contains('cartContinue')) { cartDialog.close(); document.querySelector('#products')?.scrollIntoView({ behavior: 'smooth' }); return }
  if (button.classList.contains('checkoutStart')) { renderCheckout(); return }
  if (button.classList.contains('backToCart')) { updateCart(); return }
  const id = Number(button.dataset.inc || button.dataset.dec)
  if (!id) return
  const line = cart.find(item => item.id === id)
  if (!line) return
  line.quantity += button.dataset.inc ? 1 : -1
  line.quantity = Math.min(20, line.quantity)
  if (line.quantity < 1) cart = cart.filter(item => item.id !== id)
  saveCart()
})
function renderCheckout() {
  const subtotal = cart.reduce((sum, line) => sum + products.find(product => product.id === line.id).price * line.quantity, 0)
  cartDialog.querySelector('.cartContent').innerHTML = `<form id="checkoutForm">
    <div class="checkoutStep"><span>01</span><div><h3>معلومات التواصل</h3><p>سنستخدم هذه المعلومات لتأكيد طلبك وتنظيم التوصيل.</p></div></div>
    <div class="checkoutFields"><label>الاسم الكامل<input name="customerName" autocomplete="name" minlength="2" maxlength="100" required></label><label>رقم الهاتف<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="06 12 34 56 78" required></label></div>
    <div class="checkoutStep"><span>02</span><div><h3>عنوان التوصيل</h3><p>أدخل عنواناً واضحاً لتسهيل الوصول إليك.</p></div></div>
    <div class="checkoutFields"><label>المدينة<input name="city" autocomplete="address-level2" minlength="2" maxlength="100" required></label><label>العنوان الكامل<textarea name="address" autocomplete="street-address" minlength="5" maxlength="300" required></textarea></label><label>ملاحظة إضافية (اختياري)<textarea name="note" maxlength="300"></textarea></label><label class="websiteField" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="checkoutSummary"><h3>ملخص الطلب</h3>${cart.map(line => { const product = products.find(item => item.id === line.id); return `<div class="summaryLine"><span>${line.quantity} × ${safe(product.name)}</span><strong>${money(product.price * line.quantity)}</strong></div>` }).join('')}<div class="cartTotal"><span>مجموع المنتجات</span><strong>${money(subtotal)}</strong></div><p class="cartNote">تُحدد رسوم التوصيل بعد مراجعة المدينة والعنوان.</p></div>
    <p class="checkoutError" role="alert"></p><button type="submit" class="checkoutSubmit">تأكيد الطلب — ${money(subtotal)}</button><div class="checkoutTrust"><span>دفع عند الاستلام</span><span>تأكيد هاتفي للطلب</span></div><button type="button" class="backToCart">العودة إلى السلة</button>
  </form>`
}
cartDialog.addEventListener('submit', async event => {
  if (event.target.id !== 'checkoutForm') return
  event.preventDefault()
  const form = event.target
  const button = form.querySelector('.checkoutSubmit')
  button.disabled = true
  form.querySelector('.checkoutError').textContent = ''
  const data = Object.fromEntries(new FormData(form))
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, items: cart.map(line => ({ productId: line.id, quantity: line.quantity })) }) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'تعذر تسجيل الطلب')
    cart = []; saveCart()
    cartDialog.querySelector('.cartContent').innerHTML = `<div class="orderSuccess"><span>✓</span><h3>تم تسجيل طلبك بنجاح</h3><p>رقم الطلب: <strong dir="ltr">${safe(result.orderNumber)}</strong></p><p>سنتواصل معك لتأكيد التوصيل والمبلغ النهائي. شكراً لثقتك برحيق أريج.</p><button type="button" class="cartContinue">متابعة التصفح</button></div>`
  } catch (error) { form.querySelector('.checkoutError').textContent = error.message; button.disabled = false }
})

fetch('/api/products', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Products unavailable')
  products = await response.json()
  grid.innerHTML = products.length ? products.map(product => `<article class="productCard"><div class="productArt"><span class="productIndex">${safe(product.name)}</span><button type="button" class="productImageButton" data-detail="${product.id}" aria-label="عرض تفاصيل ${safe(product.name)}">${productPhoto(product)}</button>${!product.imageKey ? '<span class="productMockupNote">تصوّر لتصميم العبوة</span>' : ''}</div><div class="productDetails"><div><h3>${safe(product.name)}</h3><p>${safe(product.description || 'عسل مغربي · مذاق أصيل')}</p></div><strong>${money(product.price)}</strong></div><div class="productActions"><button type="button" class="addCartButton" data-add="${product.id}">أضف إلى السلة</button></div></article>`).join('') : '<div class="loading">لا توجد منتجات متاحة حالياً.</div>'
  updateCart()
  grid.addEventListener('click', event => {
    const add = event.target.closest('[data-add]')
    if (add) { addToCart(Number(add.dataset.add)); return }
    const detail = event.target.closest('[data-detail]')
    if (!detail) return
    const product = products.find(item => item.id === Number(detail.dataset.detail))
    if (!product) return
    details.querySelector('.detailsBody').innerHTML = `<div class="detailsMedia">${productPhoto(product)}</div><div class="detailsCopy"><h2>${safe(product.name)}</h2><p>${safe(product.description || 'عسل مغربي خام بمذاق أصيل.')}</p><strong>${money(product.price)}</strong><button type="button" class="addCartButton" data-add="${product.id}">أضف إلى السلة</button></div>`
    details.showModal()
  })
  details.addEventListener('click', event => { const button = event.target.closest('[data-add]'); if (button) addToCart(Number(button.dataset.add)) })
}).catch(() => { grid.innerHTML = '<div class="loading">تعذر تحميل المنتجات حالياً. حاول من بعد شوية.</div>' })

try {
  let sessionId = sessionStorage.getItem('rahiq-visit-session')
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('rahiq-visit-session', sessionId) }
  fetch('/api/visit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }), keepalive: true }).catch(() => {})
} catch {}
