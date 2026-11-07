// จุดเริ่มต้นของแอป: โหลดข้อมูล + เราเตอร์ (hash)
import { loadData } from './data.js';
import { $, $$, h, hydrateIcons } from './util.js';
import * as S from './store.js';
import { renderHome, renderImport, renderCredits } from './views/home.js';
import { renderWizard } from './views/wizard.js';
import { renderSheet } from './views/sheet.js';

const app = $('#app');
const nav = hash => { location.hash = hash; };

function notFound() {
  app.replaceChildren(h('section.hero', h('h1', 'ไม่พบตัวละครนี้ในเครื่อง'), h('p', 'ตัวละครเก็บแยกตามเครื่อง/เบราว์เซอร์ ถ้าเล่นจากเครื่องอื่น ให้ใช้ลิงก์แชร์หรือไฟล์สำรอง'), h('a.btn', { href: '#/' }, 'กลับหน้าแรก')));
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [page, a, b] = parts;
  document.body.dataset.page = page || 'home';
  $$('[data-nav]').forEach(el => el.classList.toggle('on', el.dataset.nav === (page || 'home')));
  if (page === 'c' || page === 'edit') {
    const c = S.get(a);
    if (!c) return notFound();
    return page === 'c' ? renderSheet(app, c, b, nav) : renderWizard(app, c, b, nav);
  }
  if (page === 'import' && a) return renderImport(app, parts.slice(1).join('/'), nav);
  if (page === 'credits') return renderCredits(app);
  renderHome(app, nav);
}

loadData().then(() => {
  hydrateIcons();
  S.askPersist();
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });
  route();
}).catch(err => {
  console.error(err);
  app.replaceChildren(h('section.hero', h('h1', 'โหลดข้อมูลไม่สำเร็จ'), h('p', 'ลองรีเฟรชหน้าอีกครั้ง'), h('button.btn', { onclick: () => location.reload() }, 'รีเฟรช')));
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
