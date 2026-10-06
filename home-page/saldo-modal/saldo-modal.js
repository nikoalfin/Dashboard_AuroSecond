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
      <td class="py-3 px-4 text-xs font-bold text-gray-400 text-center hidden sm:table-cell">${idx + 1}</td>
      <td class="py-2 px-3">
        <input type="text" value="${sumber.keterangan || ''}" placeholder="Keterangan sumber..."
          class="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-sm focus:outline-none focus:border-blue-500"
          oninput="updateKeterangan(${idx}, this.value)" />
      </td>
      <td class="py-2 px-3">
        <input type="text" value="${Number(sumber.nominal || 0).toLocaleString('id-ID')}" placeholder="0"
          class="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-sm text-left font-semibold text-gray-700"
          oninput="updateNominal(${idx}, this)" />
      </td>
      <td class="py-2 px-3 text-center">
        <button onclick="hapusBaris(${idx})" title="Hapus sumber ini"
          class="bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 h-8 w-8 rounded-lg cursor-pointer flex items-center justify-center transition shadow-xs mx-auto">
          <i class="fa-solid fa-trash-can text-xs"></i>
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

async function hapusBaris(idx) {
  const item = listSumberModal[idx];
  const namaSumber = item && item.keterangan ? `"${item.keterangan}"` : 'baris ini';
  const yakin = await tampilkanKonfirmasi(
    `Apakah kamu yakin ingin menghapus catatan saldo ${namaSumber}?`,
    'Hapus Sumber Modal?'
  );
  if (!yakin) return;

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
