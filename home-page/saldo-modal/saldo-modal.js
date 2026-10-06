let listSumberModal = [];
let deletedIds = [];

window.addEventListener('DOMContentLoaded', () => {
  tarikDataSaldoModal();
});

function formatRupiahDisplay(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}

function parseNominal(str) {
  if (typeof str === 'number') return str;
  const clean = String(str || '').replace(/[^\d]/g, '');
  return parseInt(clean, 10) || 0;
}

async function tarikDataSaldoModal() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    const { data, error } = await client
      .from(TABLE_SALDO_MODAL)
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    listSumberModal = (data || []).map((row) => ({
      id: row.id,
      keterangan: row.keterangan || '',
      nominal: Number(row.nominal || 0)
    }));

    deletedIds = [];
    renderTabel();
  } catch (err) {
    console.error('Gagal mengambil data saldo modal:', err);
    tampilkanToast('Gagal memuat data saldo modal dari server.');
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

function renderTabel() {
  const tbody = document.getElementById('tbodySaldoModal');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (listSumberModal.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center text-gray-400 italic">
          Belum ada catatan sumber modal. Klik "Tambah Sumber" untuk menambahkan.
        </td>
      </tr>
    `;
    updateRingkasan();
    return;
  }

  listSumberModal.forEach((sumber, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/70 transition';

    tr.innerHTML = `
      <td class="py-3 px-3 text-center text-gray-400 font-bold text-xs">${idx + 1}</td>
      <td class="py-2.5 px-3">
        <input type="text" value="${sumber.keterangan || ''}" placeholder="Nama sumber (cth: Nova, Ibuk)"
          class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-blue-500 font-medium"
          oninput="updateKeterangan(${idx}, this.value)" />
      </td>
      <td class="py-2.5 px-3">
        <input type="text" value="${Number(sumber.nominal || 0).toLocaleString('id-ID')}" placeholder="0"
          class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-blue-500 font-bold text-right"
          oninput="updateNominal(${idx}, this)" />
      </td>
      <td class="py-2.5 px-3 text-center">
        <button onclick="hapusBaris(${idx})" title="Hapus sumber ini"
          class="w-8 h-8 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition cursor-pointer mx-auto">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  updateRingkasan();
}

function updateKeterangan(idx, value) {
  if (listSumberModal[idx]) {
    listSumberModal[idx].keterangan = value;
  }
}

function updateNominal(idx, inputEl) {
  const rawValue = parseNominal(inputEl.value);
  if (listSumberModal[idx]) {
    listSumberModal[idx].nominal = rawValue;
  }
  // Format pemisah titik live
  inputEl.value = Number(rawValue).toLocaleString('id-ID');
  updateRingkasan();
}

function tambahBaris() {
  listSumberModal.push({ id: null, keterangan: '', nominal: 0 });
  renderTabel();

  // Auto focus ke input baris terbaru
  setTimeout(() => {
    const inputs = document.querySelectorAll('#tbodySaldoModal input[type="text"]');
    if (inputs.length >= 2) {
      inputs[inputs.length - 2].focus();
    }
  }, 50);
}

function hapusBaris(idx) {
  const item = listSumberModal[idx];
  if (item && item.id) {
    deletedIds.push(item.id);
  }
  listSumberModal.splice(idx, 1);
  renderTabel();
}

function updateRingkasan() {
  const total = listSumberModal.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const count = listSumberModal.filter((s) => (s.keterangan && s.keterangan.trim() !== '') || s.nominal > 0).length;

  const totalEl = document.getElementById('totalSaldoTeks');
  const countEl = document.getElementById('totalSumberTeks');

  if (totalEl) totalEl.innerText = formatRupiahDisplay(total);
  if (countEl) countEl.innerText = `${count} Sumber`;
}

async function simpanSaldoModal() {
  const loader = document.getElementById('globalLoader');
  const btn = document.getElementById('btnSimpan');
  if (loader) loader.classList.remove('hidden');
  if (btn) btn.disabled = true;

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    // 1. Hapus record yang dihapus oleh user
    if (deletedIds.length > 0) {
      const { error: delErr } = await client
        .from(TABLE_SALDO_MODAL)
        .delete()
        .in('id', deletedIds);
      if (delErr) throw delErr;
      deletedIds = [];
    }

    // 2. Simpan update & insert record baru
    for (const item of listSumberModal) {
      const ket = String(item.keterangan || '').trim();
      const nom = parseNominal(item.nominal);

      if (item.id) {
        // Update baris lama
        const { error: updErr } = await client
          .from(TABLE_SALDO_MODAL)
          .update({ keterangan: ket, nominal: nom })
          .eq('id', item.id);
        if (updErr) throw updErr;
      } else if (ket !== '' || nom > 0) {
        // Insert baris baru
        const { error: insErr } = await client
          .from(TABLE_SALDO_MODAL)
          .insert([{ keterangan: ket, nominal: nom }]);
        if (insErr) throw insErr;
      }
    }

    // Ambil ulang data segar dari server
    await tarikDataSaldoModal();
    tampilkanToast('Data saldo modal berhasil disimpan ke Supabase!');
  } catch (err) {
    console.error('Gagal menyimpan saldo modal:', err);
    tampilkanToast('Gagal menyimpan saldo modal: ' + (err.message || err));
  } finally {
    if (loader) loader.classList.add('hidden');
    if (btn) btn.disabled = false;
  }
}
