export function renderContact({ instagram, whatsapp }) {
  const bagIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>'
  const socials = [
    { name: 'Instagram', url: 'https://www.instagram.com/rahiq.arij/', icon: instagram },
    { name: 'YouTube', url: 'https://www.youtube.com/@RahiqArij', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.3V8.7l5.7 3.3-5.7 3.3Z"/></svg>' },
    { name: 'TikTok', url: 'https://www.tiktok.com/@rahiq.arij', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.7 2h-3.4v13.5a3 3 0 1 1-2.6-3V9a6.4 6.4 0 1 0 6 6.4V8.6a9 9 0 0 0 5.3 1.7V6.9A5.4 5.4 0 0 1 16.7 2Z"/></svg>' },
    { name: 'Facebook', url: 'https://web.facebook.com/rahiq.arij', icon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.2 22v-9h3l.5-3.5h-3.5V7.2c0-1 .3-1.7 1.8-1.7h1.8V2.4c-.8-.1-1.8-.2-2.7-.2-2.7 0-4.5 1.7-4.5 4.7v2.6h-3V13h3v9h3.6Z"/></svg>' },
  ]
  const socialItems = socials.map(({ name, url, icon }) =>
    `<a class="contactSocial" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${name}"><span class="contactSocialIcon">${icon}</span><span lang="en" dir="ltr">${name}</span></a>`).join('')
  return `<section class="cta contact" id="contact" aria-labelledby="contactTitle">
    <div class="shell contactInner">
      <div class="contactIdentity"><a href="#top" aria-label="رحيق أريج"><img src="/brand-logo.png" width="84" height="84" alt="شعار رحيق أريج"/></a><span>رحيق أريج</span></div>
      <div class="contactCopy"><p class="overline">من الخلية إلى المائدة</p><h2 id="contactTitle">عسل تحكي كل قطرة <em>حكاية أرضها.</em></h2><p class="contactLead">اختار عسلك وكمّل طلبك، أو تواصل معنا على واتساب.</p></div>
      <div class="contactActions"><button type="button" class="contactCart cartTrigger">${bagIcon}<span>أكمل طلبك</span><span class="contactArrow" aria-hidden="true">↗</span></button><a class="contactWhatsApp" href="https://wa.me/212648366622" target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب على 0648 36 66 22">${whatsapp}<span><span>واتساب</span><strong dir="ltr">0648 36 66 22</strong></span></a></div>
      <div class="contactSocialArea"><p>تابعونا على منصات التواصل</p><div class="contactSocials" aria-label="حسابات التواصل الاجتماعي">${socialItems}</div></div>
      <div class="contactFoot"><span>عسل خام من أرض الرحامنة</span><span>الرحامنة · المغرب</span></div>
    </div>
  </section>`
}
