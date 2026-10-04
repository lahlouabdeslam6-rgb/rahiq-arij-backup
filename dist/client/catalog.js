const grid = document.querySelector('.productsGrid')
const floatingCart = document.querySelector('.floatingCart')
if (floatingCart) document.body.append(floatingCart)
const heroVideo = document.querySelector('.heroVideo')
if (heroVideo) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const syncHeroMotion = () => {
    if (reducedMotion.matches || document.hidden) heroVideo.pause()
    else heroVideo.play().catch(() => {})
  }
  reducedMotion.addEventListener('change', syncHeroMotion)
  document.addEventListener('visibilitychange', syncHeroMotion)
  syncHeroMotion()
}
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
const i18n = window.rahiqI18n
const tr = value => i18n.translate(value)
const productName = product => i18n.lang === 'fr' ? (product.nameFr || product.name) : product.name
const productWeight = product => { const grams = Number(product.weightGrams) || 1000; return grams >= 1000 ? `${Number((grams / 1000).toFixed(3))}kg` : `${grams}g` }
const productTitle = product => `${productWeight(product)} · ${productName(product)}`
const productDescription = product => i18n.lang === 'fr' ? (product.descriptionFr || product.description) : product.description
const tones = new Set(['clover','sidr','eucalyptus','rehamna','carob','fernan','daghmous','lemon'])
const mockup = (name, tone) => `<div class="jarVisual" data-honey="${tones.has(tone) ? tone : 'rehamna'}"><img class="jarImage" src="/rahiq-signature-jar.png" alt="تصوّر لتصميم عبوة ${safe(name)}"/><img class="jarLogo" src="/brand-logo.png" alt=""/></div>`
const productPhoto = product => product.imageKey && /^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(product.imageKey) ? `<img class="uploadedImage" src="/media/${product.imageKey}" alt="${safe(productName(product))}"/>` : mockup(productName(product), product.tone)
const money = value => `${Number(value).toLocaleString(i18n.lang === 'fr' ? 'fr-MA' : 'ar-MA')} ${tr('درهم')}`
const plusIcon = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>'
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

const cartNotice = document.createElement('div')
cartNotice.className = 'cartNotice'
cartNotice.setAttribute('role', 'status')
cartNotice.setAttribute('aria-live', 'polite')
document.body.append(cartNotice)
let noticeTimer
function showCartNotice(name) {
  cartNotice.textContent = i18n.lang === 'fr' ? `${name} ajouté au panier` : `تزاد ${name} للسلة`
  cartNotice.classList.add('visible')
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => cartNotice.classList.remove('visible'), 2300)
}
function animateToCart(source) {
  const target = document.querySelector('.floatingCart')
  if (!source || !target) return
  const bump = () => { target.classList.remove('cartBump'); void target.offsetWidth; target.classList.add('cartBump') }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { bump(); return }
  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const flyer = document.createElement('span')
  flyer.className = 'cartFlyer'
  flyer.textContent = '+'
  flyer.style.left = `${from.left + from.width / 2 - 14}px`
  flyer.style.top = `${from.top + from.height / 2 - 14}px`
  document.body.append(flyer)
  flyer.animate([
    { transform:'translate(0,0) scale(1)', opacity:1 },
    { transform:`translate(${(to.left + to.width / 2 - from.left - from.width / 2) * .55}px,-72px) scale(.8)`, opacity:1, offset:.45 },
    { transform:`translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top + to.height / 2 - from.top - from.height / 2}px) scale(.35)`, opacity:.15 },
  ], { duration:650, easing:'cubic-bezier(.2,.7,.2,1)' }).finished.then(() => { flyer.remove(); bump() }).catch(() => flyer.remove())
}
function addToCart(id, source) {
  const product = products.find(item => item.id === id)
  if (!product) return
  const line = cart.find(item => item.id === id)
  if (line && line.quantity >= 20) { cartNotice.textContent = 'الحد الأقصى 20 من كل منتج'; cartNotice.classList.add('visible'); return }
  if (line) line.quantity += 1
  else cart.push({ id, quantity: 1 })
  saveCart()
  if (details.open) details.close()
  showCartNotice(productTitle(product))
  animateToCart(source)
}
function updateCart() {
  cartDialog.querySelector('.cartHeading h2').textContent = 'سلة المشتريات'
  cart = cart.filter(line => products.some(product => product.id === line.id))
  const count = cart.reduce((sum, line) => sum + line.quantity, 0)
  document.querySelectorAll('.cartCount').forEach(node => { node.textContent = count; node.hidden = !count })
  const content = cartDialog.querySelector('.cartContent')
  if (!cart.length) { content.innerHTML = '<div class="cartEmpty"><span class="emptyCartIcon">◇</span><h3>سلة مشترياتك فارغة</h3><p>تعرّف على مجموعتنا واختر العسل المناسب لك.</p></div><button type="button" class="cartContinue">تصفح المنتجات</button>'; return }
  const subtotal = cart.reduce((sum, line) => sum + products.find(product => product.id === line.id).price * line.quantity, 0)
  content.innerHTML = `<div class="cartLines">${cart.map(line => { const product = products.find(item => item.id === line.id); return `<article class="cartLine"><div class="cartThumb">${productPhoto(product)}</div><div><strong>${safe(productTitle(product))}</strong><small>${money(product.price)}</small><div class="quantity"><button type="button" data-dec="${product.id}" aria-label="تقليل كمية ${safe(productName(product))}">−</button><span>${line.quantity}</span><button type="button" data-inc="${product.id}" aria-label="زيادة كمية ${safe(productName(product))}">+</button></div></div><b>${money(product.price * line.quantity)}</b></article>` }).join('')}</div><div class="cartFooter"><div class="cartTotal"><span>مجموع المنتجات</span><strong>${money(subtotal)}</strong></div><p class="cartNote">تُحدد رسوم التوصيل بعد مراجعة المدينة والعنوان. الدفع عند الاستلام.</p><button type="button" class="checkoutStart">متابعة الطلب ←</button></div>`
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
  cartDialog.querySelector('.cartHeading h2').textContent = 'تأكيد الطلب'
  const subtotal = cart.reduce((sum, line) => sum + products.find(product => product.id === line.id).price * line.quantity, 0)
  cartDialog.querySelector('.cartContent').innerHTML = `<form id="checkoutForm">
    <div class="checkoutFields"><label>الاسم الكامل<input name="customerName" autocomplete="name" minlength="2" maxlength="100" required></label><label>رقم الهاتف<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="06 12 34 56 78" required></label><label>العنوان الكامل<textarea name="address" autocomplete="street-address" minlength="5" maxlength="300" placeholder="المدينة، الحي، الزنقة ورقم الدار" required></textarea></label><label class="websiteField" aria-hidden="true">website<input name="website" tabindex="-1" autocomplete="off"></label></div>
    <div class="checkoutSummary"><h3>ملخص الطلب</h3>${cart.map(line => { const product = products.find(item => item.id === line.id); return `<div class="summaryLine"><span>${line.quantity} × ${safe(productTitle(product))}</span><strong>${money(product.price * line.quantity)}</strong></div>` }).join('')}<div class="cartTotal"><span>مجموع المنتجات</span><strong>${money(subtotal)}</strong></div><p class="cartNote">تُحدد رسوم التوصيل بعد مراجعة المدينة والعنوان.</p></div>
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
    if (!response.ok) throw new Error(tr(result.error || 'تعذر تسجيل الطلب'))
    cart = []; saveCart()
    cartDialog.querySelector('.cartHeading h2').textContent = 'تم تسجيل الطلب'
    cartDialog.querySelector('.cartContent').innerHTML = `<div class="orderSuccess"><span>✓</span><h3>تم تسجيل طلبك بنجاح</h3><p>رقم الطلب: <strong dir="ltr">${safe(result.orderNumber)}</strong></p><p>سنتواصل معك لتأكيد التوصيل والمبلغ النهائي. شكراً لثقتك برحيق أريج.</p><button type="button" class="cartContinue">متابعة التصفح</button></div>`
  } catch (error) { form.querySelector('.checkoutError').textContent = error.message; button.disabled = false }
})

function renderProducts() {
  grid.innerHTML = products.length ? products.map(product => { const name = safe(productName(product)); const weight = safe(productWeight(product)); return `<article class="productCard"><div class="productArt"><span class="productIndex">${name}</span><button type="button" class="productImageButton" data-detail="${product.id}" aria-label="${tr('عرض تفاصيل')} ${name}">${productPhoto(product)}</button>${!product.imageKey ? `<span class="productMockupNote">${tr('تصوّر لتصميم العبوة')}</span>` : ''}</div><div class="productInfo"><button type="button" class="productNameButton" data-detail="${product.id}" aria-label="${tr('عرض تفاصيل')} ${name}"><h3><span class="productWeight" dir="ltr">${weight}</span> ${name}</h3></button></div><div class="productMeta"><strong>${money(product.price)}</strong><button type="button" class="addCartButton" data-add="${product.id}" aria-label="${tr('أضف إلى السلة')} ${name}">${plusIcon}<span>${tr('أضف للسلة')}</span></button></div></article>` }).join('') : `<div class="loading">${tr('لا توجد منتجات متاحة حالياً.')}</div>`
}
function showDetails(product) {
  details.dataset.productId = product.id
  details.querySelector('.detailsBody').innerHTML = `<div class="detailsMedia">${productPhoto(product)}</div><div class="detailsCopy"><h2><span class="productWeight" dir="ltr">${safe(productWeight(product))}</span> ${safe(productName(product))}</h2><p>${safe(productDescription(product) || tr('عسل مغربي خام بمذاق أصيل.'))}</p><strong>${money(product.price)}</strong><button type="button" class="addCartButton" data-add="${product.id}">${tr('أضف إلى السلة')}</button></div>`
  if (!details.open) details.showModal()
}
grid.addEventListener('click', event => {
  const add = event.target.closest('[data-add]')
  if (add) { addToCart(Number(add.dataset.add), add); return }
  const detail = event.target.closest('[data-detail]')
  if (!detail) return
  const product = products.find(item => item.id === Number(detail.dataset.detail))
  if (product) showDetails(product)
})
details.addEventListener('click', event => { const button = event.target.closest('[data-add]'); if (button) addToCart(Number(button.dataset.add), button) })
document.addEventListener('rahiq:languagechange', () => {
  if (!products.length) return
  renderProducts()
  if (details.open) { const product = products.find(item => item.id === Number(details.dataset.productId)); if (product) showDetails(product) }
  if (cartDialog.querySelector('#checkoutForm')) {
    const values = Object.fromEntries(new FormData(cartDialog.querySelector('#checkoutForm')))
    renderCheckout()
    for (const [key, value] of Object.entries(values)) if (cartDialog.querySelector(`[name="${key}"]`)) cartDialog.querySelector(`[name="${key}"]`).value = value
  } else if (!cartDialog.querySelector('.orderSuccess')) updateCart()
  i18n.apply()
})
fetch('/api/products', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Products unavailable')
  products = await response.json()
  renderProducts()
  updateCart()
  i18n.apply()
}).catch(() => { grid.innerHTML = `<div class="loading">${tr('تعذر تحميل المنتجات حالياً. حاول من بعد شوية.')}</div>` })

try {
  let sessionId = sessionStorage.getItem('rahiq-visit-session')
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('rahiq-visit-session', sessionId) }
  fetch('/api/visit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }), keepalive: true }).catch(() => {})
} catch {}
