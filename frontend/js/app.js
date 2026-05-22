// ======================= KONFIGURASI DASAR =======================
export const API = 'http://localhost:5000/api';
export const token = () => localStorage.getItem('token');
export const headers = () =>
  token()
    ? { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

// ======================= UTILITAS =======================
export const $ = (q, root = document) => root.querySelector(q);
export const $$ = (q, root = document) => root.querySelectorAll(q);
export const toRp = (n = 0) =>
  Number(n).toLocaleString('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  });

export function setActiveNav() {
  const file = location.pathname.split('/').pop() || 'index.html';
  $$('.navbar a').forEach((a) =>
    a.classList.toggle('active', a.getAttribute('href') === file)
  );
}

export function showIfLogged() {
  const logged = Boolean(token());
  const elLogin = $('#btnLoginHeader');
  const elReg = $('#btnRegisterHeader');
  const elLogout = $('#btnLogoutHeader');
  if (elLogin) elLogin.classList.toggle('hidden', logged);
  if (elReg) elReg.classList.toggle('hidden', logged);
  if (elLogout) elLogout.classList.toggle('hidden', !logged);

  // logout handler
  if (elLogout && !elLogout._bound) {
    elLogout._bound = true;
    elLogout.addEventListener('click', () => {
      localStorage.clear();
      location.href = 'login.html';
    });
  }
}

// ======================= HOME =======================
export async function loadNews() {
  const box = $('#newsList');
  if (!box) return;
  try {
    const r = await fetch(API + '/announce/list');
    const list = await r.json();
    if (!Array.isArray(list) || !list.length)
      return (box.innerHTML = '<div class="subtitle">Belum ada berita terbaru.</div>');

    box.innerHTML = list
      .map(
        (n) => `
        <div class="card">
          ${n.imageUrl ? `<img src="${n.imageUrl}" class="pimg" alt="gambar">` : ''}
          <div class="kv" style="margin-top:8px">
            <div class="title">${n.title || 'Pengumuman'}</div>
            <div class="subtitle">${new Date(n.createdAt).toLocaleString('id-ID')}</div>
          </div>
          <p class="subtitle" style="margin-top:6px">${n.text || ''}</p>
        </div>`
      )
      .join('');
  } catch {
    box.innerHTML = '<div class="subtitle">Gagal memuat berita.</div>';
  }
}

export async function loadBalance() {
  const el = $('#balance');
  if (!el) return;
  if (!token()) {
    el.textContent = 'Login untuk melihat saldo';
    return;
  }
  const r = await fetch(API + '/wallet/balance', { headers: headers() });
  const data = await r.json();
  el.textContent = toRp(data.balance || 0);
}

export function setWelcomeText() {
  const name =
    localStorage.getItem('username') ||
    (() => {
      try {
        const payload = JSON.parse(atob(token()?.split('.')[1] || ''));
        return payload?.username || payload?.user?.username;
      } catch {
        return 'Investor';
      }
    })();
  const el = $('#welcomeText');
  if (el) el.textContent = `Hello, ${name || 'Investor'} 👋`;
}

export async function doDeposit() {
  location.href = 'deposit.html';
}

export async function doWithdraw() {
  if (!token()) return alert('Login dulu');
  const amount = Number(prompt('Nominal withdraw (Rp)')) || 0;
  if (amount <= 0) return;
  const r = await fetch(API + '/wallet/withdraw', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount }),
  });
  const d = await r.json();
  if (r.ok) {
    alert('Withdraw berhasil');
    loadBalance();
  } else alert(d.message || 'Gagal');
}

// ======================= TOKO =======================
export async function loadProducts() {
  const g = $('#productGrid');
  if (!g) return;
  const r = await fetch(API + '/products');
  const list = await r.json();
  g.innerHTML = list
    .map((p) => {
      const profitTotal = Math.round(p.price * (p.roiPercent / 100));
      const profitHarian = Math.floor(profitTotal / Math.max(1, p.durationDays));
      return `<article class="card pcard">
        <img class="pimg" src="${p.imageUrl}" alt="${p.name}">
        <div style="margin-top:10px">
          <div class="title">${p.name}</div>
          <div class="subtitle">Durasi ${p.durationDays} hari • ROI ${p.roiPercent}%</div>
          <div class="small">Profit / hari: <b>${toRp(profitHarian)}</b></div>
          <div class="kv" style="margin-top:8px">
            <div>
              <div class="price">${toRp(p.price)}</div>
              <div class="small">Profit total: ${toRp(profitTotal)}</div>
            </div>
            <button class="btn btn-primary" data-buy="${p._id}">Beli</button>
          </div>
          <button class="btn" style="margin-top:8px" data-detail="${p._id}">Detail</button>
        </div>
      </article>`;
    })
    .join('');

  g.onclick = (e) => {
    const idD = e.target.getAttribute('data-detail');
    const idB = e.target.getAttribute('data-buy');
    if (idD) openDetail(idD);
    if (idB) buyProduct(idB);
  };
}

async function openDetail(id) {
  const r = await fetch(API + '/products/' + id);
  const p = await r.json();
  const profitTotal = Math.round(p.price * (p.roiPercent / 100));
  const profitHarian = Math.floor(profitTotal / Math.max(1, p.durationDays));
  $('#mTitle').textContent = p.name;
  $('#mImg').src = p.imageUrl;
  $('#mDesc').textContent = p.description || '';
  $('#mPrice').textContent = toRp(p.price);
  $('#mDur').textContent = p.durationDays + ' hari';
  $('#mDay').textContent = toRp(profitHarian) + ' / hari';
  $('#mTotal').textContent = toRp(profitTotal) + ' total';
  $('#mBuy').onclick = () => buyProduct(p._id);
  $('#modal').classList.add('show');
}
export function closeModal() {
  $('#modal').classList.remove('show');
}
export async function buyProduct(id) {
  if (!token()) return alert('Harap login');
  const r = await fetch(API + `/orders/buy/${id}`, {
    method: 'POST',
    headers: headers(),
  });
  const d = await r.json();
  if (r.ok) {
    alert('Pembelian berhasil');
    loadBalance();
    closeModal();
  } else alert(d.message || 'Gagal');
}

// ======================= PRODUK SAYA =======================
export async function loadMyProducts() {
  const c = $('#myProducts');
  if (!c) return;

  if (!token()) {
    c.innerHTML = '<div class="subtitle">Harap login.</div>';
    return;
  }

  const msDay = 24 * 60 * 60 * 1000;
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const nextMidnight = () => {
    const n = new Date();
    const t = new Date(n);
    t.setHours(24, 0, 0, 0);
    return t;
  };

  const r = await fetch(API + '/orders/mine', { headers: headers() });
  const list = await r.json();

  c.innerHTML = (list || [])
    .map((o) => {
      const now = new Date();
      const start = new Date(o.startAt);
      const end = new Date(o.endAt);
      const last = o.lastProfitAt ? new Date(o.lastProfitAt) : null;

      const totalProfit = Math.round(o.priceAtBuy * (o.roiPercent / 100));
      const profitPerDay = Math.floor(totalProfit / Math.max(1, o.durationDays));

      const passedDays = Math.min(
        Math.max(0, Math.floor((now - start) / msDay)),
        o.durationDays
      );
      const progress = Math.round((passedDays / o.durationDays) * 100);

      const payoutToday = last ? isSameDay(last, now) : false;
      const next = nextMidnight();
      const remainMs = Math.max(0, next - now);
      const hrs = String(Math.floor(remainMs / (60 * 60 * 1000))).padStart(2, '0');
      const mins = String(Math.floor((remainMs % (60 * 60 * 1000)) / (60 * 1000))).padStart(2, '0');

      const statusLine =
        o.status === 'completed'
          ? `<span class="badge done">Selesai</span>`
          : payoutToday
          ? `<span class="badge ok">Penghasilan hari ini sudah masuk ✅</span>`
          : `<span class="badge wait">Masuk lagi dalam ${hrs}:${mins}</span>`;

      return `
      <div class="card">
        <div class="kv">
          <div class="title">${o?.productId?.name || 'Produk'}</div>
          <div class="subtitle">Status: ${o.status} • Selesai: ${end.toLocaleDateString('id-ID')}</div>
        </div>

        <div class="grid" style="margin-top:8px">
          <div>
            <div class="small">Profit / hari</div>
            <div class="price">${toRp(profitPerDay)}</div>
          </div>
          <div>
            <div class="small">Profit total</div>
            <div class="price">${toRp(totalProfit)}</div>
          </div>
        </div>

        <div class="small" style="margin-top:10px">Progres (${passedDays}/${o.durationDays} hari)</div>
        <div class="progress"><span style="width:${progress}%;"></span></div>

        <div style="margin-top:10px">${statusLine}</div>
      </div>`;
    })
    .join('') || '<div class="subtitle">Belum ada produk aktif.</div>';

  if (!window._mpCountdown) {
    window._mpCountdown = setInterval(loadMyProducts, 60 * 1000);
  }
}

// ======================= TEAM =======================
export async function loadTeam() {
  const box = $('#teamLevels');
  if (!box) return;
  if (!token())
    return (box.innerHTML = '<div class="subtitle">Harap login.</div>');
  const r = await fetch(API + '/team/me', { headers: headers() });
  const data = await r.json();
  const code = (data.referralLink?.split('ref=')[1] || '').split('&')[0];
  const frontendRef = `${location.origin}${location.pathname.replace(
    /[^/]+$/,
    ''
  )}register.html?ref=${code}`;
  $('#refLink').value = frontendRef;
  const mk = (t, arr) =>
    `<div class="card"><div class="title">${t}</div><div class="subtitle">${
      arr.length
    } member</div><ul style="margin-top:6px">${arr
      .map((u) => `<li class="subtitle">@${u.username}</li>`)
      .join('')}</ul></div>`;
  box.innerHTML =
    mk('Level 1', data.levels?.L1 || []) +
    mk('Level 2', data.levels?.L2 || []) +
    mk('Level 3', data.levels?.L3 || []);
}

// ======================= AKUN =======================
export async function loadAccount() {
  const infoDep = $('#saldoDeposit');
  const infoWd = $('#saldoWithdraw');
  if (!token()) return;

  const r = await fetch(API + '/wallet/balance', { headers: headers() });
  const d = await r.json();
  infoDep.textContent = toRp(d.balanceDeposit || 0);
  infoWd.textContent = toRp(d.balanceWithdrawable || 0);
}

export async function loadHistoryPreview() {
  const c = $('#recentHistory');
  if (!c || !token()) return;
  const r = await fetch(API + '/history/me', { headers: headers() });
  const list = await r.json();
  if (!list.length) return (c.textContent = 'Belum ada transaksi.');

  c.innerHTML = list
    .slice(0, 3)
    .map(
      (h) => `
    <div class="subtitle">
      <b>${h.type.replace(/_/g, ' ').toUpperCase()}</b> ${h.amount > 0 ? '+' : ''}${toRp(h.amount)}<br>
      <small>${new Date(h.createdAt).toLocaleString('id-ID')}</small>
    </div>`
    )
    .join('');
}

export function toggleBankEdit(show) {
  const form = document.querySelector('#bankForm');
  const view = document.querySelector('#bankView');
  if (!form || !view) return;
  const s = show === undefined ? form.classList.contains('hidden') : !!show;
  form.classList.toggle('hidden', !s);
  view.classList.toggle('hidden', s);
}

export async function saveBank() {
  if (!token()) return alert('Login dulu');

  const payload = {
    bankName: document.querySelector('#bankName').value.trim(),
    accountNumber: document.querySelector('#bankAcc').value.trim(),
    accountHolder: document.querySelector('#bankHolder').value.trim(),
  };
  if (!payload.bankName || !payload.accountNumber || !payload.accountHolder) {
    return alert('Semua field rekening wajib diisi');
  }

  try {
    const r = await fetch(API + '/wallet/bank', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || 'Gagal simpan rekening');

    alert('Rekening disimpan');
    await loadAccount();
    toggleBankEdit(false);
  } catch (err) {
    alert(err.message);
  }
}

// ======================= DEPOSIT =======================
export function initDepositPage() {
  const amount = new URLSearchParams(location.search).get('amount');
  if (amount) $('#depAmount').value = amount;
  const chips = $$('.chip');
  chips.forEach((ch) =>
    ch.addEventListener('click', () => {
      chips.forEach((x) => x.classList.remove('active'));
      ch.classList.add('active');
      const m = ch.dataset.method;
      $('#secQRIS').classList.toggle('hidden', m !== 'qris');
      $('#secPermata').classList.toggle('hidden', m !== 'permata');
    })
  );
  chips[0]?.click();
}
export async function submitDeposit() {
  if (!token()) return alert('Login dulu');
  const amount = Number($('#depAmount').value || 0);
  if (amount <= 0) return alert('Nominal tidak valid');
  const method = $('.chip.active')?.dataset.method;
  const meta =
    method === 'permata'
      ? {
          bank: 'Permata',
          va: '8981234567890',
          instr: 'Transfer ke VA atas nama PT Aurora Nebula Investindo.',
        }
      : { channel: 'QRIS' };
  const r = await fetch(API + '/wallet/deposit', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount, method, meta }),
  });
  const d = await r.json();
  if (r.ok) {
    alert('Deposit request dikirim');
    location.href = 'account.html';
  } else alert(d.message || 'Gagal');
}

// ======================= AUTH =======================

// --- Tambahan Captcha ---
let _captchaToken = '';

export async function loadCaptcha() {
  try {
    const r = await fetch(API + '/auth/captcha');
    const d = await r.json();
    if (r.ok) {
      _captchaToken = d.token;
      const img = document.getElementById('captchaImg');
      if (img) img.src = d.image;
    }
  } catch {}
}

export async function doLogin() {
  const u = $('#username').value.trim();
  const p = $('#password').value.trim();
  if (!u || !p) return alert('Isi username & password');
  const r = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  });
  const d = await r.json();
  if (r.ok) {
    localStorage.setItem('token', d.token);
    localStorage.setItem('username', d.user?.username || u);
    localStorage.setItem('role', d.user?.role || 'user');
    if (d.user?.role === 'admin') location.href = 'admin/admin.html';
    else location.href = 'index.html';
  } else alert(d.message || 'Login gagal');
}

// --- Update doRegister dengan Captcha ---
export async function doRegister() {
  const u = $('#username').value.trim();
  const ph = $('#phone').value.trim();
  const p1 = $('#password').value.trim();
  const p2 = $('#confirm').value.trim();
  const ref =
    $('#ref') ? $('#ref').value.trim() : new URLSearchParams(location.search).get('ref');
  const capAns = $('#captchaAnswer')?.value.trim();

  if (!u || !ph || !p1 || !p2) return alert('Lengkapi semua field!');
  if (!capAns) return alert('Isi captcha.');
  if (p1.length < 6) return alert('Password minimal 6 karakter.');
  if (p1 !== p2) return alert('Password tidak sama.');

  const r = await fetch(API + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: u,
      password: p1,
      phone: ph,
      referredBy: ref,
      captchaToken: _captchaToken,
      captchaAnswer: capAns,
    }),
  });
  const d = await r.json();
  if (r.ok) {
    localStorage.setItem('token', d.token);
    alert('Register sukses. Selamat datang!');
    location.href = 'index.html';
  } else {
    alert(d.message || 'Register gagal');
    loadCaptcha();
    if ($('#captchaAnswer')) $('#captchaAnswer').value = '';
  }
}

export async function loadExternalNews() {
  const box = document.getElementById('newsExternal');
  if (!box) return;

  try {
    const r = await fetch(API + '/news/external');
    const list = await r.json();
    if (!Array.isArray(list)) throw new Error('bad payload');

    const fmt = (d) => new Date(d).toLocaleString('id-ID');
    box.innerHTML = list.map(n => `
      <article class="card" style="display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center">
        <img src="${n.image || 'https://res.cloudinary.com/demo/image/upload/placeholder.jpg'}"
             alt="" style="width:120px;height:80px;object-fit:cover;border-radius:10px; background:#0f1621">
        <div>
          <div class="title" style="margin:0 0 4px 0">${n.title}</div>
          <div class="subtitle" style="margin:0 0 8px 0">${n.source} • ${fmt(n.publishedAt)}</div>
          <a href="${n.link}" target="_blank" rel="noopener" class="btn">Baca</a>
        </div>
      </article>
    `).join('');
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="subtitle">Gagal memuat berita.</div>`;
  }
}


// ======================= HOME BALANCE (BARU DITAMBAHKAN) =======================
export async function loadHomeBalances() {
  const elTotal = document.getElementById('homeBalanceTotal');
  const elDep = document.getElementById('homeBalanceDep');
  const elWd = document.getElementById('homeBalanceWd');
  const elStat = document.getElementById('homeStatus');

  if (!elTotal || !elDep || !elWd) return;

  if (!token()) {
    elTotal.textContent = 'Login untuk melihat';
    elDep.textContent = '-';
    elWd.textContent = '-';
    if (elStat) elStat.textContent = 'Guest';
    return;
  }

  try {
    const r = await fetch(API + '/wallet/balance', { headers: headers() });
    const d = await r.json();

    if (r.ok) {
      elTotal.textContent = toRp(d.total || 0);
      elDep.textContent = toRp(d.balanceDeposit || 0);
      elWd.textContent = toRp(d.balanceWithdrawable || 0);
      if (elStat) elStat.textContent = `Halo, ${d.username}`;
    } else {
      elTotal.textContent = 'Error';
      elDep.textContent = '-';
      elWd.textContent = '-';
      if (elStat) elStat.textContent = d.message || 'Gagal memuat saldo';
    }
  } catch {
    elTotal.textContent = 'Gagal konek';
    elDep.textContent = '-';
    elWd.textContent = '-';
  }
}
