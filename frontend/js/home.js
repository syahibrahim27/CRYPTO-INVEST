// frontend/js/home.js
const API = import.meta.env.VITE_API_URL;
const token = localStorage.getItem('token');
const headers = token ? { Authorization: 'Bearer ' + token } : {};

const $ = (s) => document.querySelector(s);

// set sapaan
(function setWelcome() {
  // pakai username dari localStorage, fallback decode dari JWT bila ada
  let name = localStorage.getItem('username');
  if (!name && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      name = payload?.username || payload?.user?.username;
    } catch {}
  }
  $('#welcomeText').textContent = `Hello, ${name || 'Investor'} 👋`;
})();

// saldo
(async function loadBalance() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/wallet/balance`, { headers: { ...headers, 'Content-Type': 'application/json' } });
    const d = await r.json();
    const n = Number(d?.balance || 0).toLocaleString('id-ID');
    document.getElementById('balance').textContent = `Rp ${n}`;
  } catch (e) {
    document.getElementById('balance').textContent = 'Rp 0';
  }
})();

// tombol
document.getElementById('btnDeposit').onclick = () => location.href = 'deposit.html';
document.getElementById('btnWithdraw').onclick = () => alert('Fitur withdraw akan diarahkan ke halaman withdraw.html');

// berita & update (pakai endpoint publik)
(async function loadNews() {
  const box = document.getElementById('newsList');
  try {
    // coba list publik; kalau tidak ada, fallback ke satu "active"
    let list = [];
    let r = await fetch(`${API}/announce/list`).catch(() => null);
    if (r && r.ok) {
      list = await r.json();
    } else {
      r = await fetch(`${API}/announce/active`);
      const one = await r.json();
      if (one) list = [one];
    }

    if (!Array.isArray(list) || list.length === 0) {
      box.innerHTML = `<div class="subtitle">Belum ada update.</div>`;
      return;
    }

    box.innerHTML = list.map(a => `
      <article class="news-card">
        ${a.imageUrl ? `<img class="news-img" src="${a.imageUrl}" alt="">` : ''}
        <div class="news-content">
          <div class="news-title">${a.title || 'Pengumuman'}</div>
          <div class="news-text">${a.text || ''}</div>
          <div class="news-date">${new Date(a.createdAt || Date.now()).toLocaleString('id-ID')}</div>
        </div>
      </article>
    `).join('');
  } catch (e) {
    box.innerHTML = `<div class="subtitle">Gagal memuat berita.</div>`;
  }
})();
