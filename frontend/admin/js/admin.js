// frontend/admin/js/admin.js
// ====== Konfigurasi ======
const API = import.meta.env.VITE_API_URL;
const token = localStorage.getItem('token');
if (!token) location.href = '../login.html';

const authHeaders = () => ({
  Authorization: 'Bearer ' + localStorage.getItem('token'),
  'Content-Type': 'application/json',
});

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const toRp = (n = 0) =>
  Number(n).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

// ====== UI dasar ======
$('#adminName').textContent = `@${localStorage.getItem('username') || 'admin'}`;
$('#logout').onclick = () => { localStorage.clear(); location.href = '../login.html'; };

$$('.tabs button').forEach((b) =>
  b.addEventListener('click', () => {
    $$('.tabs button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $$('.tab').forEach((t) => t.classList.remove('active'));
    document.getElementById(b.dataset.tab).classList.add('active');
  })
);

// ====== Helper Upload ke Cloudinary via backend ======
async function uploadImage(file) {
  if (!file) return '';
  const form = new FormData();
  form.append('image', file);
  const r = await fetch(`${API}/upload/image`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'Upload gagal');
  return d.url; // secure_url
}

// ====================== DEPOSIT / WITHDRAW ======================
async function loadDeposits() {
  const box = $('#depositList');
  box.innerHTML = '<div class="row">Memuat...</div>';
  try {
    const r = await fetch(`${API}/wallet/admin/deposits?status=pending`, { headers: authHeaders() });
    const list = await r.json();
    box.innerHTML = (list || []).map((d) => `
      <div class="row">
        <div>
          <b>@${d.userId?.username || d.user?.username || 'user'}</b> • ${toRp(d.amount)} <span class="muted">(${d.method})</span><br>
          <span class="muted">${new Date(d.createdAt).toLocaleString('id-ID')}</span>
        </div>
        <div>
          <button class="btn" onclick="approveDeposit('${d._id}')">Setujui</button>
          <button class="btn" onclick="rejectDeposit('${d._id}')">Tolak</button>
        </div>
      </div>
    `).join('') || '<div class="row">Tidak ada deposit pending</div>';
  } catch (e) {
    box.innerHTML = '<div class="row">Gagal memuat deposit</div>';
  }
}

async function loadWithdraws() {
  const box = $('#withdrawList');
  box.innerHTML = '<div class="row">Memuat...</div>';
  try {
    const r = await fetch(`${API}/wallet/admin/withdraws?status=pending`, { headers: authHeaders() });
    const list = await r.json();
    box.innerHTML = (list || []).map((w) => `
      <div class="row">
        <div>
          <b>@${w.userId?.username || 'user'}</b> • ${toRp(w.amount)}<br>
          <span class="muted">${w.bankSnap?.bankName || '-'} • ${w.bankSnap?.accountNumber || '-'} • ${w.bankSnap?.accountHolder || '-'}</span><br>
          <span class="muted">${new Date(w.createdAt).toLocaleString('id-ID')}</span>
        </div>
        <div>
          <button class="btn" onclick="approveWithdraw('${w._id}')">Setujui</button>
          <button class="btn" onclick="rejectWithdraw('${w._id}')">Tolak</button>
        </div>
      </div>
    `).join('') || '<div class="row">Tidak ada withdraw pending</div>';
  } catch (e) {
    box.innerHTML = '<div class="row">Gagal memuat withdraw</div>';
  }
}

// Expose to window for inline onclick
window.approveDeposit = async (id) => {
  if (!confirm('Setujui deposit?')) return;
  const r = await fetch(`${API}/wallet/admin/deposit/${id}/approve`, { method:'POST', headers: authHeaders() });
  const d = await r.json();
  if (r.ok) { alert('Deposit disetujui'); loadDeposits(); } else alert(d.message || 'Gagal');
};
window.rejectDeposit = async (id) => {
  if (!confirm('Tolak deposit?')) return;
  const r = await fetch(`${API}/wallet/admin/deposit/${id}/reject`, { method:'POST', headers: authHeaders() });
  const d = await r.json();
  if (r.ok) { alert('Deposit ditolak'); loadDeposits(); } else alert(d.message || 'Gagal');
};

window.approveWithdraw = async (id) => {
  if (!confirm('Setujui withdraw?')) return;
  const r = await fetch(`${API}/wallet/admin/withdraw/${id}/approve`, { method:'POST', headers: authHeaders() });
  const d = await r.json();
  if (r.ok) { alert('Withdraw disetujui'); loadWithdraws(); } else alert(d.message || 'Gagal');
};
window.rejectWithdraw = async (id) => {
  if (!confirm('Tolak withdraw?')) return;
  const r = await fetch(`${API}/wallet/admin/withdraw/${id}/reject`, { method:'POST', headers: authHeaders() });
  const d = await r.json();
  if (r.ok) { alert('Withdraw ditolak'); loadWithdraws(); } else alert(d.message || 'Gagal');
};

// ====================== PRODUK (CRUD + Upload) ======================
function renderProducts(list) {
  $('#productList').innerHTML = (list || []).map((p) => `
    <div class="row">
      <div style="display:flex;align-items:center;gap:10px">
        ${p.imageUrl ? `<img class="thumb" src="${p.imageUrl}" alt="">` : ''}
        <div>
          <b>${p.name}</b> — ${toRp(p.price)} • ROI ${p.roiPercent}% • ${p.durationDays} hari
          <div class="muted">${p.description || ''}</div>
        </div>
      </div>
      <div>
        <button class="btn" onclick="editProduct('${p._id}')">Edit</button>
        <button class="btn" onclick="deleteProduct('${p._id}')">Hapus</button>
      </div>
    </div>
  `).join('') || '<div class="row">Belum ada produk</div>';
}
async function loadProducts() {
  const r = await fetch(`${API}/products`, { headers: authHeaders() });
  const list = await r.json();
  renderProducts(list);
}

$('#resetProduct').onclick = () => resetProductForm();
function resetProductForm(){
  $('#pId').value = '';
  $('#pName').value = '';
  $('#pPrice').value = '';
  $('#pDur').value = '';
  $('#pRoi').value = '';
  $('#pImg').value = '';
  $('#pImgFile').value = '';
  $('#pDesc').value = '';
}

$('#productForm').onsubmit = async (e) => {
  e.preventDefault();
  try {
    const file = $('#pImgFile').files[0];
    let imageUrl = $('#pImg').value.trim();
    if (file) imageUrl = await uploadImage(file);

    const payload = {
      name: $('#pName').value.trim(),
      price: Number($('#pPrice').value),
      durationDays: Number($('#pDur').value),
      roiPercent: Number($('#pRoi').value),
      imageUrl,
      description: $('#pDesc').value.trim(),
    };
    if (!payload.name || !payload.price || !payload.durationDays) {
      return alert('Nama, harga, dan durasi wajib diisi');
    }

    const id = $('#pId').value.trim();
    const url = id ? `${API}/products/${id}` : `${API}/products`;
    const method = id ? 'PUT' : 'POST';

    const r = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || 'Gagal simpan');

    alert('Produk disimpan');
    resetProductForm();
    loadProducts();
  } catch (err) {
    alert(err.message);
  }
};

window.editProduct = async (id) => {
  const r = await fetch(`${API}/products/${id}`, { headers: authHeaders() });
  const p = await r.json();
  $('#pId').value = p._id;
  $('#pName').value = p.name || '';
  $('#pPrice').value = p.price || '';
  $('#pDur').value = p.durationDays || '';
  $('#pRoi').value = p.roiPercent || '';
  $('#pImg').value = p.imageUrl || '';
  $('#pDesc').value = p.description || '';
  // pindah ke tab produk
  document.querySelector('[data-tab="products"]').click();
};

window.deleteProduct = async (id) => {
  if (!confirm('Hapus produk ini?')) return;
  const r = await fetch(`${API}/products/${id}`, { method:'DELETE', headers: authHeaders() });
  const d = await r.json();
  if (r.ok) { loadProducts(); } else alert(d.message || 'Gagal hapus');
};

// ====================== PENGGUNA (Edit + Adjust Saldo) ======================
async function loadUsers() {
  const box = $('#userList');
  box.innerHTML = '<div class="row">Memuat...</div>';
  const r = await fetch(`${API}/admin/users`, { headers: authHeaders() });
  const list = await r.json();
  box.innerHTML = (list || []).map((u) => `
    <div class="row">
      <div>
        <b>@${u.username}</b> • Saldo: ${toRp(u.balance || 0)} • Role: ${u.role || 'user'}
        <div class="muted">HP: ${u.phone || '-'}</div>
      </div>
      <div>
        <button class="btn" onclick="editUser('${u._id}')">Edit</button>
        <button class="btn" onclick="adjustBalance('${u._id}','${u.username}')">Adjust Saldo</button>
      </div>
    </div>
  `).join('') || '<div class="row">Belum ada pengguna</div>';
}
window.editUser = async (id) => {
  const r = await fetch(`${API}/admin/users/${id}`, { headers: authHeaders() });
  if (!r.ok) return alert('Gagal ambil user');
  const u = await r.json();
  const username = prompt('Ubah username:', u.username);
  if (username === null) return;
  const phone = prompt('Ubah no HP:', u.phone || '');
  if (phone === null) return;
  const role = prompt('Ubah role (user/admin):', u.role || 'user');
  if (role === null) return;

  const r2 = await fetch(`${API}/admin/users/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ username: username.trim(), phone: phone.trim(), role: role.trim() }),
  });
  const d2 = await r2.json();
  if (r2.ok) { alert('User diperbarui'); loadUsers(); } else alert(d2.message || 'Gagal update');
};
window.adjustBalance = async (id, username) => {
  const delta = Number(prompt(`Delta saldo untuk @${username} (contoh 50000 atau -25000):`, '0'));
  if (!delta) return;
  const reason = prompt('Keterangan perubahan (reason):', 'manual adjustment');
  if (!reason) return;
  const r = await fetch(`${API}/admin/users/${id}/balance`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ delta, reason }),
  });
  const d = await r.json();
  if (r.ok) { alert('Saldo diubah: ' + toRp(d.balance)); loadUsers(); } else alert(d.message || 'Gagal ubah saldo');
};

// ====================== PENGUMUMAN (Upload + Kirim + CRUD) ======================

// === Ambil & tampilkan daftar pengumuman ===
async function loadAnnouncements() {
  const box = document.getElementById('announcementList');
  box.innerHTML = '<div class="row">Memuat...</div>';

  try {
    const r = await fetch(`${API}/admin/announce`, { headers: authHeaders() });
    if (!r.ok) throw new Error('Gagal fetch');
    const list = await r.json();

    const fmtTime = d => d ? new Date(d).toLocaleString('id-ID') : '-';
    box.innerHTML = (list || []).map(a => `
      <div class="row card" style="display:flex;gap:10px;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700">${a.text}</div>
          ${a.imageUrl ? `<img src="${a.imageUrl}" style="max-width:150px;margin-top:5px;border-radius:8px;">` : ''}
          <div class="subtitle">
            Dibuat: ${fmtTime(a.createdAt)}
            ${a.expiresAt ? ` • Exp: ${fmtTime(a.expiresAt)}` : ''}
            ${a.showAsPopup ? ' • Popup' : ''}
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn" onclick="editAnnouncement('${a._id}', '${encodeURIComponent(a.text)}', '${a.imageUrl || ''}', ${a.showAsPopup}, '${a.expiresAt || ''}')">Edit</button>
          <button class="btn btn-danger" onclick="deleteAnnouncement('${a._id}')">Hapus</button>
        </div>
      </div>
    `).join('') || '<div class="row">Belum ada pengumuman</div>';
  } catch (e) {
    box.innerHTML = `<div class="row">Gagal memuat pengumuman: ${e.message}</div>`;
  }
}

// === Upload ke backend Cloudinary helper ===
async function uploadAnnImage(file) {
  if (!file) return '';
  const form = new FormData();
  form.append('image', file);
  const r = await fetch(`${API}/upload/image`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: form,
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || 'Upload gagal');
  return d.url; // URL dari backend
}

// === Kirim pengumuman baru ===
document.getElementById('sendAnnouncement').onclick = async () => {
  try {
    const text = document.getElementById('announcement').value.trim();
    const showAsPopup = document.getElementById('annPopup')?.checked ?? true;
    const expiresAt = document.getElementById('annExpire')?.value || null;
    const imageUrlManual = document.getElementById('annImageUrl')?.value.trim() || '';
    const file = document.getElementById('annFile')?.files[0];
    let imageUrl = imageUrlManual;

    if (!text) return alert('Isi pengumuman dulu!');
    if (!imageUrl && file) {
      imageUrl = await uploadAnnImage(file);
    }

    const r = await fetch(`${API}/admin/announce`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ text, showAsPopup, expiresAt, imageUrl }),
    });

    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new Error(d.message || 'Gagal kirim');
    }

    alert('Pengumuman berhasil dikirim!');
    document.getElementById('announcement').value = '';
    document.getElementById('annExpire').value = '';
    document.getElementById('annImageUrl').value = '';
    document.getElementById('annFile').value = '';
    loadAnnouncements();
  } catch (e) {
    alert(e.message);
  }
};

// === Edit pengumuman ===
window.editAnnouncement = async (id, encText, imageUrl, showAsPopup, expiresAt) => {
  const text = prompt('Ubah teks pengumuman:', decodeURIComponent(encText));
  if (text === null) return;

  const newImage = prompt('Ubah URL gambar (kosongkan jika tidak ada):', imageUrl || '');
  const exp = prompt('Ubah tanggal kadaluwarsa (YYYY-MM-DD HH:mm atau kosong):', expiresAt && expiresAt !== 'undefined' ? expiresAt : '');

  const body = { text, imageUrl: newImage || null, showAsPopup, expiresAt: exp?.trim() || null };

  const r = await fetch(`${API}/admin/announce/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (r.ok) {
    alert('Pengumuman diperbarui!');
    loadAnnouncements();
  } else {
    const d = await r.json().catch(() => ({}));
    alert(d.message || 'Gagal mengedit');
  }
};

// === Hapus pengumuman ===
window.deleteAnnouncement = async (id) => {
  if (!confirm('Hapus pengumuman ini?')) return;
  const r = await fetch(`${API}/admin/announce/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (r.ok) {
    alert('Dihapus');
    loadAnnouncements();
  } else {
    const d = await r.json().catch(() => ({}));
    alert(d.message || 'Gagal menghapus');
  }
};



// ====================== INIT ======================
(async function init() {
  await loadDeposits();
  await loadWithdraws();
  await loadProducts();
  await loadUsers();
  await loadAnnouncements();
})();
