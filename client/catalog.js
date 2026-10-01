const grid = document.querySelector('.productsGrid')
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char])
const tones = new Set(['clover','sidr','eucalyptus','rehamna','carob','fernan','daghmous','lemon'])
const mockup = (name, tone) => `<div class="jarVisual" data-honey="${tones.has(tone) ? tone : 'rehamna'}"><img class="jarImage" src="/rahiq-signature-jar.png" alt="تصوّر لتصميم عبوة رحيق أريج"/><img class="jarLogo" src="/brand-logo.png" alt=""/></div>`
const productPhoto = product => product.imageKey && /^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(product.imageKey) ? `<img class="uploadedImage" src="/media/${product.imageKey}" alt="${safe(product.name)}"/>` : mockup(product.name, product.tone)
const whatsapp = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.87 11.87 0 0 0 12.05 0C5.46 0 .1 5.36.1 11.95c0 2.1.55 4.15 1.61 5.96L0 24l6.25-1.64a11.92 11.92 0 0 0 5.8 1.48h.01C18.65 23.84 24 18.48 24 11.9a11.85 11.85 0 0 0-3.5-8.4ZM12.06 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.74.98.99-3.64-.24-.38a9.83 9.83 0 0 1-1.52-5.22A9.91 9.91 0 0 1 12.05 2c2.65 0 5.14 1.03 7.01 2.9a9.84 9.84 0 0 1 2.9 7.01c0 5.46-4.45 9.9-9.9 9.9Zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.28-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37s-1.04 1.02-1.04 2.49 1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.08 4.5.71.3 1.27.48 1.7.61.71.23 1.35.2 1.86.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg>`
const dialog = document.createElement('dialog')
dialog.className = 'detailsDialog'
dialog.setAttribute('aria-label', 'تفاصيل المنتج')
dialog.innerHTML = '<button type="button" class="closeDetails" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg></button><div class="detailsBody"></div>'
document.body.append(dialog)
dialog.querySelector('.closeDetails').addEventListener('click', () => dialog.close())
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })

fetch('/api/products', { cache: 'no-store' }).then(async response => {
  if (!response.ok) throw new Error('Products unavailable')
  const products = await response.json()
  grid.innerHTML = products.length ? products.map(product => {
    const photo = productPhoto(product)
    const message = encodeURIComponent(`السلام عليكم، بغيت نستفسر على ${product.name}`)
    return `<article class="productCard" data-detail="${product.id}"><div class="productArt"><span class="productIndex">${safe(product.name)}</span><button type="button" class="productImageButton" aria-label="شوف تفاصيل ${safe(product.name)}">${photo}</button>${!product.imageKey ? '<span class="productMockupNote">تصوّر لتصميم العبوة</span>' : ''}</div><div class="productDetails"><div><h3>${safe(product.name)}</h3><p>${safe(product.description || 'عسل مغربي · مذاق أصيل')}</p></div><strong>${Number(product.price)} <small>درهم</small></strong></div><div class="productActions"><button type="button" class="detailButton">اكتشف التفاصيل</button><a class="whatsappButton" href="https://wa.me/212648366622?text=${message}" target="_blank" rel="noopener noreferrer">${whatsapp} اطلب الآن</a></div></article>`
  }).join('') : '<div class="loading">ما كايناش منتجات متاحة دابا.</div>'
  grid.addEventListener('click', event => {
    if (event.target.closest('a')) return
    const card = event.target.closest('.productCard')
    if (!card) return
    const product = products.find(item => item.id === Number(card.dataset.detail))
    if (!product) return
    dialog.querySelector('.detailsBody').innerHTML = `<div class="detailsMedia">${productPhoto(product)}</div><div class="detailsCopy"><h2>${safe(product.name)}</h2><p>${safe(product.description || 'عسل مغربي خام بمذاق أصيل.')}</p><strong>${Number(product.price)} درهم</strong><a class="whatsappButton" href="https://wa.me/212648366622?text=${encodeURIComponent('السلام عليكم، بغيت نستفسر على '+product.name)}" target="_blank" rel="noopener noreferrer">${whatsapp} استفسر عبر واتساب</a></div>`
    dialog.showModal()
  })
}).catch(() => { grid.innerHTML = '<div class="loading">تعذر تحميل المنتجات حالياً. رجع للموقع بعد شوية أو تواصل معنا عبر واتساب.</div>' })

try {
  let sessionId = sessionStorage.getItem('rahiq-visit-session')
  if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('rahiq-visit-session', sessionId) }
  fetch('/api/visit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }), keepalive: true }).catch(() => {})
} catch {}
