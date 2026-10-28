let listStokMotor = [];
let idMotorAktif = null;
let selectedGambarBase64 = null;
let selectedGambarNama = null;
let currentGambarUrl = '';
let payloadData = {};
window.apakahAdaPerubahan = false;

// State saldo modal untuk dropdown
let listSaldoModalNiko = [];  // group = 'niko'
let listSaldoModalFikri = []; // group = 'fikri'
let prevSaldoModalNikoId = null;  // ID saldo modal yang sebelumnya terpakai (untuk reset)
let prevSaldoModalFikriId = null;

window.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi Flatpickr pada input detail
  flatpickr("#tglBeli", FLATPICKR_CONFIG);
  flatpickr("#tglLaku", FLATPICKR_CONFIG);

  // Inisialisasi dropdown kustom status unit dari master data bersama
  isiDropdownStatus('detailStatusSelect', '');
  konfigurasiCustomSelect('detailStatusSelect');

  // Baca ID motor dari URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id) {
    idMotorAktif = id;
    // Ambil data saldo modal + data motor secara bersamaan
    inisialisasiHalaman();
  } else {
    alert('ID Motor tidak ditemukan!');
    window.location.href = '../index.html';
  }
});

function kembaliKeBeranda() {
  // Kembali murni hanya untuk navigasi tanpa menyimpan data otomatis
  window.location.href = '../index.html';
}

// ============================================================
// INISIALISASI HALAMAN: ambil saldo modal + data motor sekaligus
// ============================================================
async function inisialisasiHalaman() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    // Ambil saldo modal dan seluruh data motor secara paralel
    const [{ data: dataSaldo, error: errSaldo }, { data: allMotors, error: errMotor }] = await Promise.all([
      client.from(TABLE_SALDO_MODAL).select('*').order('id', { ascending: true }),
      client.from(TABLE_MOTOR).select('*')
    ]);

    if (errSaldo) throw errSaldo;
    if (errMotor) throw errMotor;

    // Cari data motor aktif saat ini
    const dataMotor = (allMotors || []).find((m) => String(m.id) === String(idMotorAktif));
    if (!dataMotor) {
      alert('Data motor tidak ditemukan!');
      window.location.href = '../index.html';
      return;
    }

    // Koreksi data historis jika motor Terjual sempat terkena imbas update master saldo modal
    // (Misal: Ibuk naik ke 13jt padahal transaksi motor saat terjual adalah 12jt)
    if (dataMotor.status === 'Terjual' && Number(dataMotor.modal_niko) === 13000000 && Number(dataMotor.modal_fikri) === 8800000) {
      dataMotor.modal_niko = 12000000;
      client.from(TABLE_MOTOR).update({ modal_niko: 12000000 }).eq('id', dataMotor.id).then();
    }

    // Simpan data saldo modal ke state
    const semuaSaldo = (dataSaldo || []).map((row) => ({
      id: row.id,
      keterangan: row.keterangan || '',
      nominal: Number(row.nominal || 0),
      group: row.group || 'niko',
      status: row.status || 'tersedia'
    }));

    listSaldoModalNiko = semuaSaldo.filter((s) => s.group === 'niko');
    listSaldoModalFikri = semuaSaldo.filter((s) => s.group === 'fikri');

    // Deteksi sumber modal yang SUDAH DIPAKAI oleh unit motor LAIN yang masih Ready
    const usedByOtherMotors = new Set();
    (allMotors || []).forEach((m) => {
      if (String(m.id) !== String(idMotorAktif) && m.status === 'Ready') {
        // Cek pemakaian modal niko di motor lain
        if (m.saldo_modal_niko_id) {
          usedByOtherMotors.add(Number(m.saldo_modal_niko_id));
        } else if (Number(m.modal_niko) > 0) {
          const match = listSaldoModalNiko.find((s) => s.nominal === Number(m.modal_niko));
          if (match) usedByOtherMotors.add(match.id);
        }

        // Cek pemakaian modal fikri di motor lain
        if (m.saldo_modal_fikri_id) {
          usedByOtherMotors.add(Number(m.saldo_modal_fikri_id));
        } else if (Number(m.modal_fikri) > 0) {
          const match = listSaldoModalFikri.find((s) => s.nominal === Number(m.modal_fikri));
          if (match) usedByOtherMotors.add(match.id);
        }
      }
    });

    // Auto-sync status di TABLE_SALDO_MODAL jika di DB masih tercatat tersedia
    usedByOtherMotors.forEach((usedId) => {
      client.from(TABLE_SALDO_MODAL).update({ status: 'terpakai' }).eq('id', usedId).then();
    });

    // Load data motor ini
    const motor = formatMotorFromDB(dataMotor);
    const isTerjual = motor.status === 'Terjual';

    // Simpan ID saldo modal yang sudah terpakai (dari kolom FK baru)
    prevSaldoModalNikoId = dataMotor.saldo_modal_niko_id || null;
    prevSaldoModalFikriId = dataMotor.saldo_modal_fikri_id || null;

    let currentNikoId = prevSaldoModalNikoId;
    if (!currentNikoId && motor.modalNiko > 0) {
      const match = listSaldoModalNiko.find((s) => s.nominal === motor.modalNiko);
      if (match) currentNikoId = match.id;
    }

    let currentFikriId = prevSaldoModalFikriId;
    if (!currentFikriId && motor.modalFikri > 0) {
      const match = listSaldoModalFikri.find((s) => s.nominal === motor.modalFikri);
      if (match) currentFikriId = match.id;
    }

    // Jika motor ini berstatus Terjual, pastikan modal yang pernah dipakainya tidak terkunci 'terpakai' di DB (jika tidak dipakai unit Ready lain)
    if (isTerjual) {
      if (currentNikoId && !usedByOtherMotors.has(currentNikoId)) {
        client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', currentNikoId).then();
      }
      if (currentFikriId && !usedByOtherMotors.has(currentFikriId)) {
        client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', currentFikriId).then();
      }
    }

    // Isi dropdown opsi:
    // Jika Terjual: tampilkan data historis yang terkunci
    // Jika Ready: hanya tampilkan yang TIDAK dipakai motor lain & tersedia
    isiDropdownModal('modalNikoSelect', listSaldoModalNiko, currentNikoId, usedByOtherMotors, isTerjual, motor.modalNiko);
    isiDropdownModal('modalFikriSelect', listSaldoModalFikri, currentFikriId, usedByOtherMotors, isTerjual, motor.modalFikri);

    listStokMotor = [motor];
    bukaDetailMotor(idMotorAktif, currentNikoId, currentFikriId);

    const pageDetail = document.getElementById('pageDetail');
    if (pageDetail) pageDetail.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    tampilkanToast('Gagal sinkronisasi data dari Supabase.');
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

// ============================================================
// ISI OPSI DROPDOWN MODAL
// ============================================================
function isiDropdownModal(selectId, listSaldo, currentSelectedId = null, usedByOtherMotors = new Set(), isTerjual = false, historicalNominal = 0) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  // Reset opsi
  sel.innerHTML = '<option value="">-- Pilih Sumber --</option>';

  if (isTerjual) {
    // UNIT TERJUAL: Data transaksi historis telah selesai & terkunci.
    // Tampilkan label sumber dengan nominal historis motor ini (bukan saldo master terbaru).
    const matched = listSaldo.find((s) => currentSelectedId && String(s.id) === String(currentSelectedId));
    const labelSumber = matched
      ? matched.keterangan
      : (currentSelectedId ? `Sumber #${currentSelectedId}` : 'Data Tercatat');

    const opt = document.createElement('option');
    opt.value = currentSelectedId || 'historical';
    opt.text = `${labelSumber} — ${Number(historicalNominal).toLocaleString('id-ID')}`;
    opt.dataset.nominal = historicalNominal;
    opt.selected = true;
    sel.appendChild(opt);
    sel.value = opt.value;
    konfigurasiCustomSelect(selectId);
    return;
  }

  // UNIT READY (MASIH AKTIF):
  // Pertahankan nilai yang sudah terpilih sebelumnya jika ada
  const prevVal = sel.value || (currentSelectedId ? String(currentSelectedId) : '');

  // Filter: hanya tampilkan yang sedang dipakai unit ini ATAU yang tidak dipakai unit lain & tersedia
  const opsiTampil = listSaldo.filter((saldo) => {
    if (currentSelectedId && String(saldo.id) === String(currentSelectedId)) {
      return true;
    }
    // Jika sudah dipakai unit motor lain yang aktif -> jangan tampilkan
    if (usedByOtherMotors.has(saldo.id)) {
      return false;
    }
    return saldo.status === 'tersedia';
  });

  opsiTampil.forEach((saldo) => {
    const opt = document.createElement('option');
    opt.value = saldo.id;
    opt.text = `${saldo.keterangan} — ${Number(saldo.nominal).toLocaleString('id-ID')}`;
    opt.dataset.nominal = saldo.nominal;
    opt.dataset.status = saldo.status;
    sel.appendChild(opt);
  });

  // Kembalikan nilai terpilih jika masih ada dalam daftar
  if (prevVal) sel.value = prevVal;

  // Inisialisasi custom select
  konfigurasiCustomSelect(selectId);
}

// ============================================================
// HANDLER SAAT DROPDOWN DIPILIH
// ============================================================
function pilihModalDariDropdown(group) {
  const selectId = group === 'niko' ? 'modalNikoSelect' : 'modalFikriSelect';
  const hiddenId  = group === 'niko' ? 'modalNiko'        : 'modalFikri';

  const sel = document.getElementById(selectId);
  if (!sel) return;

  const selectedOpt = sel.options[sel.selectedIndex];
  const nominal = selectedOpt && selectedOpt.dataset.nominal
    ? Number(selectedOpt.dataset.nominal)
    : 0;

  // Update hidden input (dipakai hitungSemua)
  const hiddenEl = document.getElementById(hiddenId);
  if (hiddenEl) hiddenEl.value = nominal;

  window.apakahAdaPerubahan = true;
  hitungSemua();
}

async function tarikDataDariSheet() {
  await inisialisasiHalaman();
}

/**
 * Helper untuk mengontrol tampilan preview gambar unit
 */
function setPreviewGambarUI(url) {
  const previewImg = document.getElementById('previewGambar');
  const placeholderDiv = document.getElementById('placeholderGambar');
  const btnHapus = document.getElementById('btnHapusGambar');
  if (!previewImg || !placeholderDiv || !btnHapus) return;

  if (url) {
    previewImg.src = url;
    previewImg.classList.remove('hidden');
    placeholderDiv.classList.add('hidden');
    btnHapus.classList.remove('hidden');
  } else {
    previewImg.src = '';
    previewImg.classList.add('hidden');
    placeholderDiv.classList.remove('hidden');
    btnHapus.classList.add('hidden');
  }
}

function bukaDetailMotor(id, saldoNikoId = null, saldoFikriId = null) {
  idMotorAktif = id;
  const motor = listStokMotor.find((x) => String(x.id) === String(id));
  if (!motor) {
    alert('Data motor tidak ditemukan!');
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('detailNamaMotorDisplay').value = motor.nama;
  document.getElementById('detailStatusSelect').value = motor.status;
  konfigurasiCustomSelect('detailStatusSelect');

  // Load status gambar unit motor
  selectedGambarBase64 = null;
  selectedGambarNama = null;
  currentGambarUrl = motor.gambar || '';

  const inputGambar = document.getElementById('inputGambar');
  if (inputGambar) inputGambar.value = '';
  setPreviewGambarUI(currentGambarUrl);

  // Set Tanggal Flatpickr
  const tglBeliInput = document.getElementById('tglBeli');
  if (tglBeliInput) {
    if (tglBeliInput._flatpickr) {
      tglBeliInput._flatpickr.setDate(motor.tglBeli || '', false);
    } else {
      tglBeliInput.value = motor.tglBeli || '';
    }
  }

  const tglLakuInput = document.getElementById('tglLaku');
  if (tglLakuInput) {
    if (tglLakuInput._flatpickr) {
      tglLakuInput._flatpickr.setDate(motor.tglLaku || '', false);
    } else {
      tglLakuInput.value = motor.tglLaku || '';
    }
  }

  const isTerjual = motor.status === 'Terjual';

  // ---- Dropdown Modal Niko ----
  preSelectDropdownModal('niko', saldoNikoId, motor.modalNiko, isTerjual);

  // ---- Dropdown Modal Fikri ----
  preSelectDropdownModal('fikri', saldoFikriId, motor.modalFikri, isTerjual);

  // Set Harga Penjualan
  document.getElementById('hargaPenjualan').value = (motor.penjualan || 0).toLocaleString('id-ID');

  // Load tabel pengeluaran
  const tbody = document.getElementById('bodyPengeluaran');
  if (tbody) {
    tbody.innerHTML = '';
    const listPengeluaran = Array.isArray(motor.pengeluaran)
      ? motor.pengeluaran
      : (typeof motor.pengeluaran === 'string' && motor.pengeluaran ? JSON.parse(motor.pengeluaran) : []);

    listPengeluaran.forEach((ops) => {
      tambahBarisPengeluaran(toTitleCase(ops.ket), String(ops.item), false);
    });
  }

  // Hitung ulang kalkulasi di layar
  hitungSemua();

  // Reset flag penanda perubahan
  window.apakahAdaPerubahan = false;
}

// ============================================================
// PRE-SELECT DROPDOWN BERDASARKAN ID ATAU NOMINAL
// ============================================================
function preSelectDropdownModal(group, saldoId, nominalMotor, isTerjual = false) {
  const selectId = group === 'niko' ? 'modalNikoSelect' : 'modalFikriSelect';
  const hiddenId  = group === 'niko' ? 'modalNiko'        : 'modalFikri';
  const listSaldo = group === 'niko' ? listSaldoModalNiko : listSaldoModalFikri;

  const sel = document.getElementById(selectId);
  const hiddenEl = document.getElementById(hiddenId);
  if (!sel) return;

  let matchedNominal = 0;

  if (isTerjual) {
    // Unit TERJUAL: Modal terkunci sesuai nominal historis motor ini!
    // Tidak boleh ikut berubah walaupun master saldo modal bertambah.
    if (saldoId) sel.value = String(saldoId);
    matchedNominal = Number(nominalMotor) || 0;
  } else if (saldoId) {
    // Unit Ready: Jika terhubung ke ID saldo_modal, sinkronkan dengan nominal master terbaru
    sel.value = String(saldoId);
    const matched = listSaldo.find((s) => String(s.id) === String(saldoId));
    if (matched) matchedNominal = matched.nominal;
    else matchedNominal = Number(nominalMotor) || 0;
  } else if (nominalMotor > 0) {
    // Belum ada FK (motor lama) → coba cocokkan berdasarkan nominal
    const matched = listSaldo.find((s) => s.nominal === nominalMotor);
    if (matched) {
      sel.value = String(matched.id);
      matchedNominal = matched.nominal;
    } else {
      // Tidak cocok dengan saldo aktif (misal unit terjual atau data modal lampau)
      let legacyOpt = sel.querySelector('option[value="legacy"]');
      if (!legacyOpt) {
        legacyOpt = document.createElement('option');
        legacyOpt.value = 'legacy';
        sel.appendChild(legacyOpt);
      }
      legacyOpt.text = `Data Tercatat (${Number(nominalMotor).toLocaleString('id-ID')})`;
      legacyOpt.dataset.nominal = nominalMotor;
      sel.value = 'legacy';
      matchedNominal = nominalMotor;
    }
  } else {
    sel.value = '';
  }

  // Update hidden input
  if (hiddenEl) hiddenEl.value = matchedNominal;

  // Re-render custom select agar tampil label yang tepat
  konfigurasiCustomSelect(selectId);
}

function handleInputRupiah(input) {
  handleInputRupiahPreserveCursor(input);
  hitungSemua();
}

function tambahBarisPengeluaran(keterangan = '', jumlah = '0', hitungUlang = true) {
  const tbody = document.getElementById('bodyPengeluaran');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = 'hover:bg-gray-50 border-b border-gray-150 transition';

  const tdNo = document.createElement('td');
  tdNo.className = 'py-3 px-4 text-xs font-bold text-gray-400 text-center hidden sm:table-cell';

  const tdKet = document.createElement('td');
  tdKet.className = 'py-2 px-3';
  const inputKet = document.createElement('input');
  inputKet.type = 'text';
  inputKet.className = 'w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-sm focus:outline-none focus:border-blue-500 capitalize';
  inputKet.value = toTitleCase(keterangan);
  inputKet.placeholder = 'Keterangan operasional...';
  inputKet.addEventListener('input', () => {
    handleInputTitleCase(inputKet);
    window.apakahAdaPerubahan = true;
  });
  inputKet.addEventListener('blur', () => {
    inputKet.value = toTitleCase(inputKet.value.trim());
    window.apakahAdaPerubahan = true;
  });
  tdKet.appendChild(inputKet);

  const tdJml = document.createElement('td');
  tdJml.className = 'py-2 px-3';
  const inputJml = document.createElement('input');
  inputJml.type = 'text';
  inputJml.className = 'w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-sm text-left font-semibold text-gray-700 class-jumlah';
  const cleanJumlah = typeof jumlah === 'number' ? jumlah : Number(String(jumlah).replace(/\D/g, '')) || 0;
  inputJml.value = cleanJumlah.toLocaleString('id-ID');
  inputJml.addEventListener('keydown', (e) => {
    handleRupiahKeydown(e, inputJml);
  });
  inputJml.addEventListener('input', () => {
    handleInputRupiah(inputJml);
  });
  tdJml.appendChild(inputJml);

  const tdAksi = document.createElement('td');
  tdAksi.className = 'py-2 px-3 text-center';
  const btnHapus = document.createElement('button');
  btnHapus.className = 'bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 h-8 w-8 rounded-lg cursor-pointer flex items-center justify-center transition shadow-sm';
  btnHapus.innerHTML = '<i class="fa-solid fa-trash-can text-xs"></i>';
  btnHapus.addEventListener('click', async function () {
    const yakinHapus = await tampilkanKonfirmasi('Apakah Anda yakin ingin menghapus baris pengeluaran ini?', 'Hapus Pengeluaran?');
    if (yakinHapus) {
      tr.remove();
      urutkanNomorTabel();
      hitungSemua();
    }
  });
  tdAksi.appendChild(btnHapus);

  tr.appendChild(tdNo);
  tr.appendChild(tdKet);
  tr.appendChild(tdJml);
  tr.appendChild(tdAksi);

  tbody.appendChild(tr);

  urutkanNomorTabel();
  if (hitungUlang) {
    hitungSemua();
  }
}

function urutkanNomorTabel() {
  const tbody = document.getElementById('bodyPengeluaran');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((tr, idx) => {
    tr.cells[0].innerText = idx + 1;
  });
}

function hitungSemua() {
  const mNikoElem = document.getElementById('modalNiko');
  if (!mNikoElem) return;

  const detailStatus = document.getElementById('detailStatusSelect')?.value || STATUS_READY;
  const tglLakuInput = document.getElementById('tglLaku');
  if (tglLakuInput) {
    if (detailStatus === 'Ready') {
      tglLakuInput.disabled = true;
      if (tglLakuInput._flatpickr) {
        if (tglLakuInput._flatpickr.input.value !== '') {
          tglLakuInput._flatpickr.setDate('', false);
        }
        if (tglLakuInput._flatpickr.altInput) {
          tglLakuInput._flatpickr.altInput.disabled = true;
          tglLakuInput._flatpickr.altInput.classList.add('opacity-50', 'cursor-not-allowed');
        }
      } else {
        tglLakuInput.value = '';
      }
      tglLakuInput.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      tglLakuInput.disabled = false;
      if (tglLakuInput._flatpickr) {
        if (tglLakuInput._flatpickr.altInput) {
          tglLakuInput._flatpickr.altInput.disabled = false;
          tglLakuInput._flatpickr.altInput.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }
      tglLakuInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  // Atur status dropdown modal (disable jika status Terjual)
  const isTerjual = detailStatus === 'Terjual';
  const selNiko = document.getElementById('modalNikoSelect');
  const selFikri = document.getElementById('modalFikriSelect');
  if (selNiko && selNiko.disabled !== isTerjual) {
    selNiko.disabled = isTerjual;
    if (!isTerjual) {
      isiDropdownModal('modalNikoSelect', listSaldoModalNiko, selNiko.value, new Set());
    }
    konfigurasiCustomSelect('modalNikoSelect');
  }
  if (selFikri && selFikri.disabled !== isTerjual) {
    selFikri.disabled = isTerjual;
    if (!isTerjual) {
      isiDropdownModal('modalFikriSelect', listSaldoModalFikri, selFikri.value, new Set());
    }
    konfigurasiCustomSelect('modalFikriSelect');
  }

  window.apakahAdaPerubahan = true;

  const mNiko = Number(document.getElementById('modalNiko').value) || 0;
  const mFikri = Number(document.getElementById('modalFikri').value) || 0;
  const penjualan = getCleanNumber(document.getElementById('hargaPenjualan').value);

  let totalPengeluaran = 0;
  const tbody = document.getElementById('bodyPengeluaran');
  if (tbody) {
    tbody.querySelectorAll('.class-jumlah').forEach((input) => {
      totalPengeluaran += getCleanNumber(input.value);
    });
  }

  const totalModal = mNiko + mFikri;
  const sisaSaldo = totalModal - totalPengeluaran;

  // Untung bersih dan bagi hasil dinolkan jika belum terjual
  let totalUntung = 0;
  let untungPerorang = 0;
  let akhirNiko = mNiko;
  let akhirFikri = mFikri;

  if (penjualan > 0) {
    totalUntung = penjualan - totalPengeluaran;
    untungPerorang = totalUntung / 2;
    akhirNiko = mNiko + untungPerorang;
    akhirFikri = mFikri + untungPerorang;
  }

  document.getElementById('txtTotalModal').innerText = formatRupiahDisplay(totalModal);
  document.getElementById('txtTotalPengeluaran').innerText = formatRupiahDisplay(totalPengeluaran);
  document.getElementById('txtSisaSaldo').innerText = formatRupiahDisplay(sisaSaldo);
  document.getElementById('txtTotalUntung').innerText = formatRupiahDisplay(totalUntung);
  document.getElementById('txtUntungPerorang').innerText = formatRupiahDisplay(untungPerorang);
  document.getElementById('txtAkhirNiko').innerText = formatRupiahDisplay(akhirNiko);
  document.getElementById('txtAkhirFikri').innerText = formatRupiahDisplay(akhirFikri);

  let arrPengeluaran = [];
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr) => {
      const inputs = tr.querySelectorAll('input');
      if (inputs.length >= 2) {
        arrPengeluaran.push({
          ket: toTitleCase(inputs[0].value.trim()),
          item: getCleanNumber(inputs[1].value)
        });
      }
    });
  }

  payloadData = {
    id: idMotorAktif,
    nama: document.getElementById('detailNamaMotorDisplay').value,
    status: document.getElementById('detailStatusSelect').value,
    tglBeli: document.getElementById('tglBeli').value,
    tglLaku: document.getElementById('tglLaku').value,
    modalNiko: mNiko,
    modalFikri: mFikri,
    penjualan: penjualan,
    totalPengeluaran: totalPengeluaran,
    pengeluaran: arrPengeluaran,
    gambar: currentGambarUrl,
    gambarBase64: selectedGambarBase64,
    gambarNama: selectedGambarNama,
    saldoModalNikoId: selNiko && selNiko.value && !isNaN(Number(selNiko.value)) ? Number(selNiko.value) : null,
    saldoModalFikriId: selFikri && selFikri.value && !isNaN(Number(selFikri.value)) ? Number(selFikri.value) : null
  };
}

async function uploadGambarKeStorage(base64Data, namaFile) {
  if (!base64Data) return currentGambarUrl;
  try {
    const client = getSupabase();
    const res = await fetch(base64Data);
    const blob = await res.blob();
    const cleanFileName = `${Date.now()}_${namaFile.replace(/\s+/g, '_')}`;
    const filePath = `units/${cleanFileName}`;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.warn('Storage upload note:', error);
      return base64Data;
    }

    const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return urlData.publicUrl;
  } catch (e) {
    console.warn('Fallback simpan foto:', e);
    return base64Data;
  }
}

async function kirimDataKeSheet() {
  hitungSemua();

  const btnSimpan = document.getElementById('btnSimpan');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  if (btnSimpan) {
    btnSimpan.disabled = true;
    btnSimpan.classList.add('opacity-60', 'cursor-not-allowed');
  }
  if (btnText) btnText.innerText = 'Menyimpan data...';
  if (btnLoader) btnLoader.classList.remove('hidden');

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    if (selectedGambarBase64 && selectedGambarNama) {
      const urlBaru = await uploadGambarKeStorage(selectedGambarBase64, selectedGambarNama);
      currentGambarUrl = urlBaru;
      payloadData.gambar = urlBaru;
      selectedGambarBase64 = null;
      selectedGambarNama = null;
    }

    const dbPayload = formatMotorToDB(payloadData);

    // Tambah kolom FK saldo modal ke payload DB
    dbPayload.saldo_modal_niko_id = payloadData.saldoModalNikoId || null;
    dbPayload.saldo_modal_fikri_id = payloadData.saldoModalFikriId || null;

    const { error } = await client
      .from(TABLE_MOTOR)
      .update(dbPayload)
      .eq('id', idMotorAktif);

    if (error) throw error;

    // ---- Update status saldo modal ----
    await updateStatusSaldoModal(
      client,
      payloadData.saldoModalNikoId,
      payloadData.saldoModalFikriId,
      payloadData.status
    );

    window.apakahAdaPerubahan = false;
    tampilkanToast(`Sukses sinkron! Data unit ${payloadData.nama} berhasil diamankan.`);
    await inisialisasiHalaman();
  } catch (err) {
    tampilkanToast('Gagal sinkron database: ' + err.message);
    console.error(err);
  } finally {
    if (btnSimpan) {
      btnSimpan.disabled = false;
      btnSimpan.classList.remove('opacity-60', 'cursor-not-allowed');
    }
    if (btnText) btnText.innerText = 'Sinkronisasikan Data';
    if (btnLoader) btnLoader.classList.add('hidden');
  }
}

// ============================================================
// UPDATE STATUS SALDO MODAL SAAT SIMPAN
// ============================================================
async function updateStatusSaldoModal(client, newNikoId, newFikriId, motorStatus = 'Ready') {
  const updates = [];

  if (motorStatus === 'Terjual') {
    // Unit TERJUAL: modal tidak lagi ditahan/dipakai oleh motor ini.
    // Pastikan status saldo modal lama maupun baru kembali 'tersedia'
    // (kecuali jika ada motor Ready lain yang sedang memakainya).
    const idsToCheck = [newNikoId, newFikriId, prevSaldoModalNikoId, prevSaldoModalFikriId].filter(Boolean);

    if (idsToCheck.length > 0) {
      try {
        const { data: readyMotors } = await client
          .from(TABLE_MOTOR)
          .select('id, saldo_modal_niko_id, saldo_modal_fikri_id')
          .eq('status', 'Ready');

        const activeUsedIds = new Set();
        (readyMotors || []).forEach((m) => {
          if (String(m.id) !== String(idMotorAktif)) {
            if (m.saldo_modal_niko_id) activeUsedIds.add(Number(m.saldo_modal_niko_id));
            if (m.saldo_modal_fikri_id) activeUsedIds.add(Number(m.saldo_modal_fikri_id));
          }
        });

        idsToCheck.forEach((id) => {
          if (!activeUsedIds.has(Number(id))) {
            updates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', id));
          }
        });
      } catch (e) {
        console.warn('Gagal cek ready motors saat update status modal:', e);
      }
    }
  } else {
    // Unit READY:
    if (prevSaldoModalNikoId && prevSaldoModalNikoId !== newNikoId) {
      updates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', prevSaldoModalNikoId));
    }
    if (prevSaldoModalFikriId && prevSaldoModalFikriId !== newFikriId) {
      updates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', prevSaldoModalFikriId));
    }

    if (newNikoId) {
      updates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'terpakai' }).eq('id', newNikoId));
    }
    if (newFikriId) {
      updates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'terpakai' }).eq('id', newFikriId));
    }
  }

  if (updates.length > 0) {
    const results = await Promise.all(updates);
    results.forEach(({ error }) => { if (error) console.warn('Update status saldo modal:', error); });
  }

  // Update state prevId untuk sesi berikutnya
  prevSaldoModalNikoId = newNikoId;
  prevSaldoModalFikriId = newFikriId;
}

async function hapusMotorDariSheet() {
  const yakinHapus = await tampilkanKonfirmasi(
    'Apakah kamu yakin ingin menghapus unit motor ini dari database? Tindakan ini tidak bisa dibatalkan.',
    'Hapus Unit Motor?'
  );

  if (yakinHapus) {
    const loader = document.getElementById('globalLoader');
    if (loader) {
      loader.classList.remove('hidden');
      const p = loader.querySelector('p');
      if (p) p.innerText = 'Menghapus unit motor...';
    }

    window.apakahAdaPerubahan = false;

    try {
      const client = getSupabase();
      if (!client) throw new Error('Supabase client belum diinisialisasi');

      // Reset status saldo modal yang dipakai motor ini → kembali 'tersedia'
      const resetUpdates = [];
      if (prevSaldoModalNikoId) {
        resetUpdates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', prevSaldoModalNikoId));
      }
      if (prevSaldoModalFikriId) {
        resetUpdates.push(client.from(TABLE_SALDO_MODAL).update({ status: 'tersedia' }).eq('id', prevSaldoModalFikriId));
      }
      if (resetUpdates.length > 0) await Promise.all(resetUpdates);

      const { error } = await client
        .from(TABLE_MOTOR)
        .delete()
        .eq('id', idMotorAktif);

      if (error) throw error;

      window.location.href = '../index.html';
    } catch (err) {
      alert('Gagal menghapus motor dari database: ' + err.message);
      console.error(err);
      if (loader) loader.classList.add('hidden');
    }
  }
}

function handlePilihGambar(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        selectedGambarBase64 = canvas.toDataURL('image/jpeg', 0.7);
        selectedGambarNama = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

        setPreviewGambarUI(selectedGambarBase64);

        hitungSemua();
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
}

async function hapusGambar() {
  const yakinHapus = await tampilkanKonfirmasi('Apakah Anda yakin ingin menghapus foto unit motor ini?', 'Hapus Foto Unit?');
  if (!yakinHapus) return;

  selectedGambarBase64 = null;
  selectedGambarNama = null;
  currentGambarUrl = '';

  const inputGambar = document.getElementById('inputGambar');
  if (inputGambar) inputGambar.value = '';

  setPreviewGambarUI('');

  hitungSemua();
}