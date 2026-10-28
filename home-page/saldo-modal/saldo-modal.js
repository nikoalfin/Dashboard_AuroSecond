// ============================================================
// STATE
// ============================================================
let listModal = [];       // Semua data dari DB saldo_modal
let listMotor = [];       // Semua data dari DB aurosecond-dashboard (untuk hitung sisa kas)
let deletedIds = [];

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  tarikDataSaldoModal();
});

// ============================================================
// FORMAT UTILITIES
// ============================================================
function parseNominal(str) {
  return getCleanNumber(str);
}

// ============================================================
// FETCH DATA
// ============================================================
async function tarikDataSaldoModal() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    // Ambil data saldo modal
    const { data: dataSaldo, error: errSaldo } = await client
      .from(TABLE_SALDO_MODAL)
      .select('*')
      .order('id', { ascending: true });

    if (errSaldo) throw errSaldo;

    // Ambil data motor untuk hitung sisa kas (termasuk FK saldo modal)
    const { data: dataMotor, error: errMotor } = await client
      .from(TABLE_MOTOR)
      .select('id, nama, modal_niko, modal_fikri, total_pengeluaran, status, saldo_modal_niko_id, saldo_modal_fikri_id');

    if (errMotor) throw errMotor;

    listModal = (dataSaldo || []).map((row) => ({
      id: row.id,
      keterangan: row.keterangan || '',
      nominal: Number(row.nominal || 0),
      group: row.group || 'niko',
      status: row.status || 'tersedia'
    }));

    listMotor = (dataMotor || []).map((row) => ({
      id: row.id,
      nama: row.nama || '',
      modalNiko: Number(row.modal_niko || 0),
      modalFikri: Number(row.modal_fikri || 0),
      totalPengeluaran: Number(row.total_pengeluaran || 0),
      status: row.status || 'Ready',
      saldoModalNikoId: row.saldo_modal_niko_id || null,
      saldoModalFikriId: row.saldo_modal_fikri_id || null
    }));

    // Auto-link untuk motor Ready yang belum punya saldo_modal_*_id
    for (const motor of listMotor) {
      if (motor.status === 'Ready') {
        const patch = {};
        if (!motor.saldoModalNikoId && motor.modalNiko > 0) {
          const match = listModal.find(
            (s) => s.group === 'niko' && (
              s.nominal === motor.modalNiko ||
              (s.keterangan.toLowerCase().includes('ibuk') && (motor.modalNiko === 12000000 || motor.modalNiko === 13000000)) ||
              (s.keterangan.toLowerCase().includes('nova') && motor.modalNiko === 6500000) ||
              (s.keterangan.toLowerCase().includes('niko') && motor.modalNiko === 11400000)
            )
          );
          if (match) {
            motor.saldoModalNikoId = match.id;
            patch.saldo_modal_niko_id = match.id;
          }
        }
        if (!motor.saldoModalFikriId && motor.modalFikri > 0) {
          const match = listModal.find(
            (s) => s.group === 'fikri' && (
              s.nominal === motor.modalFikri ||
              (s.keterangan.toLowerCase().includes('fikri 1') && motor.modalFikri === 8800000) ||
              (s.keterangan.toLowerCase().includes('fikri 2') && motor.modalFikri === 12500000) ||
              (s.keterangan.toLowerCase().includes('fikri 3') && motor.modalFikri === 11700000)
            )
          );
          if (match) {
            motor.saldoModalFikriId = match.id;
            patch.saldo_modal_fikri_id = match.id;
          }
        }
        if (Object.keys(patch).length > 0) {
          client.from(TABLE_MOTOR).update(patch).eq('id', motor.id).then();
        }
      }
    }

    // Evaluasi status dinamis oleh sistem:
    // Sumber otomatis 'terpakai' jika terhubung ke motor aktif (Ready), selain itu 'tersedia'
    const activeUsedIds = new Set();
    listMotor.forEach((m) => {
      if (m.status === 'Ready') {
        if (m.saldoModalNikoId) activeUsedIds.add(m.saldoModalNikoId);
        if (m.saldoModalFikriId) activeUsedIds.add(m.saldoModalFikriId);
      }
    });

    listModal.forEach((m) => {
      if (activeUsedIds.has(m.id)) {
        m.status = 'terpakai';
      } else {
        m.status = 'tersedia';
      }
    });

    deletedIds = [];
    renderSemuaTabel();
  } catch (err) {
    console.error('Gagal mengambil data:', err);
    tampilkanToast('Gagal memuat data dari server.');
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

// ============================================================
// RENDER TABEL
// ============================================================
function renderSemuaTabel() {
  renderGrupTabel('niko', 'tbodyCard1', 'totalCard1');
  renderGrupTabel('fikri', 'tbodyCard2', 'totalCard2');
  updateRingkasanAtas();
  updateCard3();
}

function renderGrupTabel(group, tbodyId, totalId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = '';

  const dataGrup = listModal.filter((m) => m.group === group);

  if (dataGrup.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-gray-400 italic text-sm">
          Belum ada catatan. Klik "Tambah" untuk menambahkan.
        </td>
      </tr>
    `;
    const totalEl = document.getElementById(totalId);
    if (totalEl) totalEl.innerText = formatRupiahDisplay(0);
    return;
  }

  let totalGrup = 0;

  dataGrup.forEach((sumber, localIdx) => {
    const globalIdx = listModal.indexOf(sumber);
    const isTermasuk = sumber.status === 'terpakai';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/70 transition';

    // Badge status (Dinamis sistem, tidak bisa diklik manual oleh user)
    const badgeClass = isTermasuk
      ? 'bg-red-100 text-red-600 border border-red-200'
      : 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    const badgeText = isTermasuk ? 'Terpakai' : 'Tersedia';
    const dotColor = isTermasuk ? 'bg-red-500' : 'bg-emerald-500';

    tr.innerHTML = `
      <td class="py-2.5 px-3 text-xs font-bold text-gray-400 text-center hidden sm:table-cell">${localIdx + 1}</td>
      <td class="py-1.5 sm:py-2 px-1.5 sm:px-3">
        <input type="text" value="${toTitleCase(sumber.keterangan || '')}" placeholder="Keterangan..."
          class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm focus:outline-none focus:border-blue-500 capitalize"
          oninput="handleInputTitleCase(this); updateKeterangan(${globalIdx}, this.value)"
          onblur="this.value = toTitleCase(this.value.trim()); updateKeterangan(${globalIdx}, this.value)" />
      </td>
      <td class="py-1.5 sm:py-2 px-1.5 sm:px-3">
        <input type="text" value="${Number(sumber.nominal || 0).toLocaleString('id-ID')}" placeholder="0"
          class="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm text-left font-semibold text-gray-700"
          onkeydown="handleRupiahKeydown(event, this)"
          oninput="updateNominal(${globalIdx}, this)" />
      </td>
      <td class="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
        <span class="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${badgeClass} select-none cursor-default whitespace-nowrap"
          title="Status ditentukan otomatis oleh sistem">
          <span class="w-1.5 h-1.5 rounded-full ${dotColor} shrink-0"></span>
          <span>${badgeText}</span>
        </span>
      </td>
      <td class="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
        <button onclick="hapusBaris(${globalIdx})" title="Hapus sumber ini"
          class="bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 h-7 w-7 sm:h-8 sm:w-8 rounded-lg cursor-pointer flex items-center justify-center transition shadow-2xs mx-auto">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
    totalGrup += sumber.nominal || 0;
  });

  const totalEl = document.getElementById(totalId);
  if (totalEl) totalEl.innerText = formatRupiahDisplay(totalGrup);
}

// ============================================================
// UPDATE HANDLERS
// ============================================================
function updateKeterangan(idx, value) {
  if (listModal[idx]) listModal[idx].keterangan = toTitleCase(value);
}

function updateNominal(idx, inputEl) {
  handleInputRupiahPreserveCursor(inputEl);
  const rawValue = parseNominal(inputEl.value);
  if (listModal[idx]) listModal[idx].nominal = rawValue;
  updateRingkasanAtas();
  updateCard3();
  // Update total card header
  renderGrupTabelTotalSaja();
}

function renderGrupTabelTotalSaja() {
  // Hanya update angka total di header card, tanpa re-render seluruh tabel
  const totalNiko = listModal
    .filter((m) => m.group === 'niko')
    .reduce((a, b) => a + (b.nominal || 0), 0);
  const totalFikri = listModal
    .filter((m) => m.group === 'fikri')
    .reduce((a, b) => a + (b.nominal || 0), 0);
  const elN = document.getElementById('totalCard1');
  const elF = document.getElementById('totalCard2');
  if (elN) elN.innerText = formatRupiahDisplay(totalNiko);
  if (elF) elF.innerText = formatRupiahDisplay(totalFikri);
}

function tambahBaris(group) {
  listModal.push({ id: null, keterangan: '', nominal: 0, group: group, status: 'tersedia' });
  renderSemuaTabel();

  // Auto focus ke input keterangan baris baru
  setTimeout(() => {
    const tbodyId = group === 'niko' ? 'tbodyCard1' : 'tbodyCard2';
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
      const inputs = tbody.querySelectorAll('input[type="text"]');
      if (inputs.length > 0) inputs[inputs.length - 2].focus();
    }
  }, 60);
}

async function hapusBaris(idx) {
  const item = listModal[idx];
  const namaSumber = item && item.keterangan ? `"${item.keterangan}"` : 'baris ini';
  const yakin = await tampilkanKonfirmasi(
    `Apakah kamu yakin ingin menghapus catatan saldo ${namaSumber}?`,
    'Hapus Sumber Modal?'
  );
  if (!yakin) return;

  if (item && item.id) {
    deletedIds.push(item.id);
  }
  listModal.splice(idx, 1);
  renderSemuaTabel();
}

// ============================================================
// RINGKASAN ATAS (total keseluruhan & jumlah sumber)
// ============================================================
function updateRingkasanAtas() {
  const total = listModal.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const count = listModal.filter(
    (s) => (s.keterangan && s.keterangan.trim() !== '') || s.nominal > 0
  ).length;

  const totalEl = document.getElementById('totalSaldoTeks');
  const countEl = document.getElementById('totalSumberTeks');
  if (totalEl) totalEl.innerText = formatRupiahDisplay(total);
  if (countEl) countEl.innerText = `${count} Sumber`;
}

// ============================================================
// CARD 3: SISA TOTAL DANA
// ============================================================
function updateCard3() {
  // 1. Modal Tersedia = modal yang belum dipakai sama sekali
  const modalTersedia = listModal.filter((m) => m.status === 'tersedia');
  const totalTersedia = modalTersedia.reduce((a, b) => a + (b.nominal || 0), 0);

  // 2. Sisa Modal Kas = dari motor yang sedang berjalan (Ready)
  //    Dinamis: Jika motor terhubung ke saldo_modal, gunakan nominal terbaru dari listModal!
  const motorReady = listMotor.filter((m) => m.status === 'Ready');
  const totalSisaKas = motorReady.reduce((acc, motor) => {
    let mNiko = motor.modalNiko;
    if (motor.saldoModalNikoId) {
      const sm = listModal.find((s) => s.id === motor.saldoModalNikoId);
      if (sm) mNiko = sm.nominal;
    }

    let mFikri = motor.modalFikri;
    if (motor.saldoModalFikriId) {
      const sm = listModal.find((s) => s.id === motor.saldoModalFikriId);
      if (sm) mFikri = sm.nominal;
    }

    const kasMotor = (mNiko + mFikri) - motor.totalPengeluaran;
    return acc + (kasMotor > 0 ? kasMotor : 0);
  }, 0);

  // 3. Total Dana Aman
  const totalDanaAman = totalTersedia + totalSisaKas;

  // 4. Total modal keseluruhan (untuk progress bar)
  const totalModalKeseluruhan = listModal.reduce((a, b) => a + (b.nominal || 0), 0);
  const persen = totalModalKeseluruhan > 0
    ? Math.min(100, Math.round((totalDanaAman / totalModalKeseluruhan) * 100))
    : 0;

  // Update DOM
  const elTersedia = document.getElementById('card3Tersedia');
  const elTersediaCount = document.getElementById('card3TersediaCount');
  const elSisaKas = document.getElementById('card3SisaKas');
  const elSisaKasCount = document.getElementById('card3SisaKasCount');
  const elTotal = document.getElementById('card3Total');
  const elTotalModal = document.getElementById('card3TotalModal');
  const elProgress = document.getElementById('card3ProgressBar');

  if (elTersedia) elTersedia.innerText = formatRupiahDisplay(totalTersedia);
  if (elTersediaCount) elTersediaCount.innerText = `${modalTersedia.length} sumber`;
  if (elSisaKas) elSisaKas.innerText = formatRupiahDisplay(totalSisaKas);
  if (elSisaKasCount) elSisaKasCount.innerText = `dari ${motorReady.length} motor aktif`;
  if (elTotal) elTotal.innerText = formatRupiahDisplay(totalDanaAman);
  if (elTotalModal) elTotalModal.innerText = formatRupiahDisplay(totalModalKeseluruhan);
  if (elProgress) elProgress.style.width = `${persen}%`;
}

// ============================================================
// SIMPAN PER GROUP
// ============================================================
async function simpanGroup(group) {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    // Hapus baris yang dihapus user
    if (deletedIds.length > 0) {
      const { error: delErr } = await client
        .from(TABLE_SALDO_MODAL)
        .delete()
        .in('id', deletedIds);
      if (delErr) throw delErr;
      deletedIds = [];
    }

    // Simpan/update baris untuk group ini saja
    const dataGrup = listModal.filter((m) => m.group === group);

    for (const item of dataGrup) {
      const ket = String(item.keterangan || '').trim();
      const nom = parseNominal(item.nominal);
      const grp = item.group;
      const sts = item.status || 'tersedia';

      if (item.id) {
        // Update existing di TABLE_SALDO_MODAL
        const { error: updErr } = await client
          .from(TABLE_SALDO_MODAL)
          .update({ keterangan: ket, nominal: nom, group: grp, status: sts })
          .eq('id', item.id);
        if (updErr) throw updErr;

        // Sinkronisasi otomatis HANYA ke motor aktif (Ready) yang memakai saldo modal ini
        // Unit yang sudah Terjual TIDAK BOLEH diubah karena merupakan data transaksi historis yang telah selesai!
        if (grp === 'niko') {
          await client.from(TABLE_MOTOR)
            .update({ modal_niko: nom })
            .eq('saldo_modal_niko_id', item.id)
            .eq('status', 'Ready');
        } else {
          await client.from(TABLE_MOTOR)
            .update({ modal_fikri: nom })
            .eq('saldo_modal_fikri_id', item.id)
            .eq('status', 'Ready');
        }
      } else if (ket !== '' || nom > 0) {
        // Insert baru
        const { error: insErr } = await client
          .from(TABLE_SALDO_MODAL)
          .insert([{ keterangan: ket, nominal: nom, group: grp, status: sts }]);
        if (insErr) throw insErr;
      }
    }

    await tarikDataSaldoModal();
    const label = group === 'niko' ? 'Niko Group' : 'Fikri Group';
    tampilkanToast(`Data ${label} berhasil disimpan!`);
  } catch (err) {
    console.error('Gagal menyimpan:', err);
    tampilkanToast('Gagal menyimpan: ' + (err.message || err));
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}
