const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznPeNopsYluBHTCM77pCAdPJluaQrwJgOWanGLQrYR8GB6NPTMok_mPpdnjPKcGLCP3Q/exec';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1zOfS6Sqou_q_o34X4XH2px83DoxRqEmvgOc-GMK0wa4/edit?hl=id&gid=0#gid=0';

let listStokMotor = [];
let idMotorAktif = null;
let payloadData = {};

window.addEventListener('DOMContentLoaded', () => {
  const btnSpreadsheet = document.getElementById('btnBukaSpreadsheet');
  if (btnSpreadsheet) {
    btnSpreadsheet.href = SPREADSHEET_URL;
  }
  inisialisasiFilterTahun();

  // Inisialisasi dropdown kustom beranda
  konfigurasiCustomSelect('filterBulan');
  konfigurasiCustomSelect('filterTahun');
  konfigurasiCustomSelect('filterStatus');

  tarikDataDariSheet();
});

function inisialisasiFilterTahun() {
  const selectTahun = document.getElementById('filterTahun');
  if (!selectTahun) return;

  const tahunMulai = 2025;
  const tahunSekarang = new Date().getFullYear();

  // Reset options but keep "Semua Tahun"
  selectTahun.innerHTML = '<option value="">Semua Tahun</option>';

  // Generate options from tahunSekarang down to tahunMulai (newest on top)
  for (let tahun = tahunSekarang; tahun >= tahunMulai; tahun--) {
    const opt = document.createElement('option');
    opt.value = tahun;
    opt.innerText = tahun;
    selectTahun.appendChild(opt);
  }
}

function toggleFilter() {
  const container = document.getElementById('containerFilter');
  const arrow = document.getElementById('arrowFilter');
  if (!container || !arrow) return;

  const isHidden = container.classList.contains('hidden');
  if (isHidden) {
    container.classList.remove('hidden');
    container.classList.add('grid');
    arrow.classList.add('rotate-180');
  } else {
    container.classList.add('hidden');
    container.classList.remove('grid');
    arrow.classList.remove('rotate-180');
  }
}

function konfigurasiCustomSelect(selectId) {
  const nativeSelect = document.getElementById(selectId);
  if (!nativeSelect) return;

  // Sembunyikan native select bawaan browser
  nativeSelect.classList.add('hidden');

  // Cari atau buat pembungkus kustom select
  let customContainer = document.getElementById(`custom-select-${selectId}`);
  if (!customContainer) {
    customContainer = document.createElement('div');
    customContainer.id = `custom-select-${selectId}`;
    customContainer.className = 'relative w-full custom-select-container';
    nativeSelect.parentNode.insertBefore(customContainer, nativeSelect.nextSibling);
  }

  // Ambil teks opsi terpilih saat ini
  const selectedOption = nativeSelect.options[nativeSelect.selectedIndex] || nativeSelect.options[0];
  const selectedText = selectedOption ? selectedOption.text : 'Pilih...';

  // Render trigger button dan panel list
  customContainer.innerHTML = `
    <button type="button" class="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none flex justify-between items-center font-medium cursor-pointer text-gray-800 shadow-sm hover:border-gray-400 transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
      <span class="custom-select-label">${selectedText}</span>
      <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 custom-select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    <div class="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl hidden py-1 max-h-60 overflow-y-auto transition-all custom-select-panel">
    </div>
  `;

  const button = customContainer.querySelector('button');
  const panel = customContainer.querySelector('.custom-select-panel');
  const arrow = customContainer.querySelector('.custom-select-arrow');

  // Isi opsi item secara dinamis
  Array.from(nativeSelect.options).forEach((option) => {
    const isSelected = option.value === nativeSelect.value;
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `w-full text-left px-4 py-2.5 text-sm transition-all cursor-pointer flex justify-between items-center ${
      isSelected
        ? 'bg-blue-50 text-blue-600 font-bold'
        : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 font-medium'
    }`;
    item.innerHTML = `
      <span>${option.text}</span>
      ${isSelected ? `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>` : ''}
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      nativeSelect.value = option.value;
      
      // Update label di tombol trigger
      customContainer.querySelector('.custom-select-label').innerText = option.text;

      // Tutup panel dropdown
      panel.classList.add('hidden');
      arrow.classList.remove('rotate-180');

      // Picu event change di select asli agar fungsi pencarian ter-trigger
      nativeSelect.dispatchEvent(new Event('change'));

      // Inisialisasi ulang agar status 'selected' / tanda centang berpindah
      konfigurasiCustomSelect(selectId);
    });

    panel.appendChild(item);
  });

  // Toggle buka/tutup dropdown panel
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Tutup panel lain yang sedang terbuka
    document.querySelectorAll('.custom-select-panel').forEach((otherPanel) => {
      if (otherPanel !== panel) {
        otherPanel.classList.add('hidden');
        otherPanel.previousElementSibling.querySelector('.custom-select-arrow')?.classList.remove('rotate-180');
      }
    });

    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
      panel.classList.remove('hidden');
      arrow.classList.add('rotate-180');
    } else {
      panel.classList.add('hidden');
      arrow.classList.remove('rotate-180');
    }
  });
}

// Tutup semua dropdown panel bila mengklik di luar area dropdown kustom
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-panel').forEach((panel) => {
    panel.classList.add('hidden');
  });
  document.querySelectorAll('.custom-select-arrow').forEach((arrow) => {
    arrow.classList.remove('rotate-180');
  });
});

function tarikDataDariSheet() {
  const endpoint = APPS_SCRIPT_URL;
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  fetch(endpoint, { method: 'GET', redirect: 'follow' })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then((data) => {
      if (Array.isArray(data)) {
        // Sort berdasarkan tanggal beli - terbaru ditaruh paling atas
        listStokMotor = data.sort((a, b) => {
          const dateA = new Date(a.tglBeli || '1970-01-01');
          const dateB = new Date(b.tglBeli || '1970-01-01');
          return dateB - dateA;
        });

        // 🔥 PERBAIKAN: Pastikan ID elemen sesuai dengan yang ada di HTML (pageBeranda)
        const berandaPage = document.getElementById('pageBeranda');
        if (berandaPage) {
          renderBeranda();
          berandaPage.classList.remove('hidden'); // Membuka kunci layar agar card bisa diklik kembali
        }

        // Logika untuk halaman detail
        if (document.getElementById('pageDetail')) {
          const urlParams = new URLSearchParams(window.location.search);
          const id = urlParams.get('id');
          if (id) {
            bukaDetailMotor(id);
          }
          document.getElementById('pageDetail').classList.remove('hidden');
        }
      } else {
        console.error('Format data dari Sheets salah:', data);
      }
    })
    .catch((err) => {
      if (typeof tampilkanToast === 'function') {
        tampilkanToast('⚠️ Gagal sinkronisasi otomatis cloud Sheets.');
      }
      console.error(err);
    })
    .finally(() => {
      if (loader) loader.classList.add('hidden');
    });
}

function renderBeranda() {
  const grid = document.getElementById('gridMotor');
  if (!grid) return;
  grid.innerHTML = '';

  // 🔥 AMBIL NILAI INPUTAN FILTER DARI UI HTML Kamu
  const filterNama = document.getElementById('filterNamaMotor')?.value.toLowerCase() || '';
  const filterBulan = document.getElementById('filterBulan')?.value || '';
  const filterTahun = document.getElementById('filterTahun')?.value || '';
  const filterStatus = document.getElementById('filterStatus')?.value || '';

  let ready = 0,
    terjual = 0,
    totalTercatat = 0;
  let renderedCount = 0;

  listStokMotor.forEach((motor, index) => {
    // Jalankan kalkulasi counter internal untuk status aslinya terlebih dahulu
    if (motor.status === 'Ready') ready++;
    else if (motor.status === 'Terjual') terjual++;
    totalTercatat++;

    // ⚡ PROSES FILTER DATA SECARA REALTIME

    // 1. Filter Nama Motor
    if (filterNama && !motor.nama.toLowerCase().includes(filterNama)) return;

    // 2. Filter Status Unit
    if (filterStatus && motor.status !== filterStatus) return;

    // Ambil data tanggal untuk kebutuhan filter Bulan dan Tahun
    const tgl = motor.tglBeli ? new Date(motor.tglBeli) : null;

    // 3. Filter Bulan Beli
    if (filterBulan && (!tgl || tgl.getMonth() + 1 !== parseInt(filterBulan))) return;

    // 4. Filter Tahun Beli
    if (filterTahun && (!tgl || tgl.getFullYear() !== parseInt(filterTahun))) return;

    // MEMBUAT ELEMENT CARD JIKA LOLOS SELEKSI FILTER
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer transform hover:-translate-y-0.5';

    card.addEventListener('click', () => {
      window.location.href = `detail.html?id=${encodeURIComponent(motor.id)}`;
    });

    card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div class="text-xs font-bold text-gray-400">#${listStokMotor.length - index}</div>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${motor.status === 'Ready' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}">${motor.status}</span>
            </div>
            <div>
                <h3 class="text-base font-bold text-gray-800 capitalize mb-2">${motor.nama}</h3>
                <p class="text-xs text-gray-400 mb-4">Tgl Beli: ${motor.tglBeli || '-'}</p>
            </div>
            <div class="border-t border-gray-100 pt-3 flex justify-between items-center text-xs text-gray-600 font-medium">
                <span>Total Ops:</span><span class="font-bold text-gray-800">Rp ${(motor.totalPengeluaran || 0).toLocaleString('id-ID')}</span>
            </div>
        `;
    grid.appendChild(card);
    renderedCount++;
  });

  if (renderedCount === 0) {
    grid.innerHTML = `
      <div class="col-span-full flex flex-col items-center justify-center py-12 px-4 text-center">
        <div class="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner mb-4">🔍</div>
        <h3 class="text-base font-bold text-gray-700">Unit Tidak Ditemukan</h3>
        <p class="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Tidak ada unit motor yang cocok dengan kriteria filter saat ini.</p>
      </div>
    `;
  }

  // UPDATE BADGE STATISTIK COUNTER DI ATAS TABEL
  const cTotal = document.getElementById('countTotal');
  const cReady = document.getElementById('countReady');
  const cTerjual = document.getElementById('countTerjual');

  if (cTotal) cTotal.innerText = totalTercatat;
  if (cReady) cReady.innerText = ready;
  if (cTerjual) cTerjual.innerText = terjual;
}

function bukaDetailMotor(id) {
  idMotorAktif = id;
  const motor = listStokMotor.find((x) => String(x.id) === String(id));
  if (!motor) {
    alert('Data motor tidak ditemukan!');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('detailNamaMotorDisplay').innerText = motor.nama;
  document.getElementById('detailStatusSelect').value = motor.status;
  konfigurasiCustomSelect('detailStatusSelect');
  document.getElementById('tglBeli').value = motor.tglBeli || '';
  document.getElementById('tglLaku').value = motor.tglLaku || '';
  document.getElementById('modalNiko').value = (motor.modalNiko || 0).toLocaleString('id-ID');
  document.getElementById('modalFikri').value = (motor.modalFikri || 0).toLocaleString('id-ID');
  document.getElementById('hargaPenjualan').value = (motor.penjualan || 0).toLocaleString('id-ID');

  const tbody = document.getElementById('bodyPengeluaran');
  if (tbody) tbody.innerHTML = '';
  if (motor.pengeluaran) {
    motor.pengeluaran.forEach((x) => tambahBarisPengeluaran(x.ket, x.item, false));
  }
  hitungSemua();
  
  setTimeout(() => {
    window.apakahAdaPerubahan = false;
  }, 100);

  // Push state to intercept browser/phone back button
  history.pushState({ page: 'detail' }, null, window.location.href);
  
  if (!window.hasPopstateListener) {
    window.addEventListener('popstate', function(event) {
      kembaliKeBeranda();
    });
    window.hasPopstateListener = true;
  }
}

function kembaliKeBeranda() {
  if (window.apakahAdaPerubahan) {
    syncDanKembali();
  } else {
    window.location.href = 'index.html';
  }
}

function syncDanKembali() {
  const endpointUrl = APPS_SCRIPT_URL;
  hitungSemua();

  const loader = document.getElementById('globalLoader');
  if (loader) {
    loader.classList.remove('hidden');
    const p = loader.querySelector('p');
    if (p) p.innerText = 'Menyimpan perubahan otomatis...';
  }

  fetch(endpointUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadData),
  })
    .then(() => {
      window.location.href = 'index.html';
    })
    .catch((err) => {
      console.error(err);
      window.location.href = 'index.html';
    });
}

function prosesTambahMotor() {
  const nama = document.getElementById('modalInputNama').value;
  const status = document.getElementById('modalInputStatus').value;
  if (!nama) {
    alert('Nama motor wajib diisi!');
    return;
  }

  const newId = listStokMotor.length > 0 ? Math.max(...listStokMotor.map((o) => Number(o.id) || 0)) + 1 : 1;
  const newObj = {
    id: newId,
    nama: nama,
    status: status,
    tglBeli: new Date().toISOString().split('T')[0],
    tglLaku: '',
    modalNiko: 0,
    modalFikri: 0,
    penjualan: 0,
    totalPengeluaran: 0,
    pengeluaran: [],
  };

  // Langsung posting data ke cloud lalu pindah halaman
  payloadData = newObj;

  const btnSimpan = document.querySelector('#modalTambah button.bg-blue-600');
  const oldText = btnSimpan.innerText;
  btnSimpan.innerText = 'Menyimpan...';
  btnSimpan.disabled = true;

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadData),
  })
    .then(() => {
      window.location.href = `detail.html?id=${newId}`;
    })
    .catch((err) => {
      alert('Gagal menambahkan motor ke cloud');
      btnSimpan.innerText = oldText;
      btnSimpan.disabled = false;
    });
}

function bukaModalTambah() {
  const modal = document.getElementById('modalTambah');
  if (modal) modal.classList.remove('hidden');
}
function tutupModalTambah() {
  const modal = document.getElementById('modalTambah');
  if (modal) modal.classList.add('hidden');
}

// FORMATTER UTILITY
function formatNumberWithDots(val) {
  return Number(val.replace(/\D/g, '') || 0).toLocaleString('id-ID');
}
function getCleanNumber(val) {
  return Number(val.replace(/\./g, '')) || 0;
}
function formatRupiahDisplay(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

function handleInputRupiah(input) {
  if (input.value === '') return;
  let selectionStart = input.selectionStart,
    oldLength = input.value.length;
  input.value = formatNumberWithDots(input.value);
  input.selectionStart = selectionStart + (input.value.length - oldLength);
  hitungSemua();
}

function tambahBarisPengeluaran(keterangan = '', jumlah = '0', hitungUlang = true) {
  const tbody = document.getElementById('bodyPengeluaran');
  if (!tbody) return;

  const index = tbody.rows.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
        <td class="p-3 text-center text-sm text-gray-400 index-number font-medium hidden sm:table-cell">${index}</td>
        <td class="p-2"><input type="text" value="${keterangan}" placeholder="Keterangan..." class="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 px-2 focus:outline-none text-sm class-keterangan"></td>
        <td class="p-2"><input type="text" value="${jumlah}" placeholder="0" class="w-full bg-transparent border-b border-transparent focus:border-blue-500 py-1 px-2 focus:outline-none text-sm text-right font-semibold class-jumlah" oninput="handleInputRupiah(this)"></td>
        <td class="p-2 text-center"><button class="btn-hapus-operasional text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">Hapus</button></td>
    `;

  const btnHapus = tr.querySelector('.btn-hapus-operasional');
  btnHapus.addEventListener('click', async function () {
    await hapusBaris(this);
  });

  tbody.appendChild(tr);
  if (hitungUlang) {
    urutkanNomorTabel();
    hitungSemua();
  }
}

async function hapusBaris(btn) {
  const yakinHapus = await tampilkanKonfirmasi('Apakah kamu yakin ingin menghapus pengeluaran ini?');

  if (yakinHapus) {
    const row = btn.closest('tr');
    row.remove();
    urutkanNomorTabel();
    hitungSemua();
    if (typeof tampilkanToast === 'function') {
      tampilkanToast('🗑️ Pengeluaran berhasil dihapus.');
    }
  }
}

function urutkanNomorTabel() {
  const tbody = document.getElementById('bodyPengeluaran');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((tr, i) => {
    tr.querySelector('.index-number').innerText = i + 1;
  });
}

function hitungSemua() {
  const mNikoElem = document.getElementById('modalNiko');
  if (!mNikoElem) return; // if not on detail page, abort calculation

  const detailStatus = document.getElementById('detailStatusSelect').value;
  const tglLakuInput = document.getElementById('tglLaku');
  if (tglLakuInput) {
    if (detailStatus === 'Ready') {
      tglLakuInput.disabled = true;
      tglLakuInput.value = ''; // clear value if Ready
      tglLakuInput.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      tglLakuInput.disabled = false;
      tglLakuInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  if (window.apakahAdaPerubahan !== undefined) {
    window.apakahAdaPerubahan = true;
  }

  const mNiko = getCleanNumber(mNikoElem.value);
  const mFikri = getCleanNumber(document.getElementById('modalFikri').value);
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
  const totalUntung = penjualan - totalPengeluaran;
  const untungPerorang = totalUntung / 2;
  const akhirNiko = mNiko + untungPerorang;
  const akhirFikri = mFikri + untungPerorang;

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
      arrPengeluaran.push({
        ket: tr.querySelector('.class-keterangan').value,
        item: tr.querySelector('.class-jumlah').value,
      });
    });
  }

  payloadData = {
    id: idMotorAktif,
    nama: document.getElementById('detailNamaMotorDisplay').innerText,
    status: document.getElementById('detailStatusSelect').value,
    tglBeli: document.getElementById('tglBeli').value,
    tglLaku: document.getElementById('tglLaku').value,
    modalNiko: mNiko,
    modalFikri: mFikri,
    penjualan: penjualan,
    totalPengeluaran: totalPengeluaran,
    pengeluaran: arrPengeluaran,
  };
}

function kirimDataKeSheet() {
  const endpointUrl = APPS_SCRIPT_URL;
  hitungSemua();

  const btnSimpan = document.getElementById('btnSimpan');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  if (btnSimpan) {
    btnSimpan.disabled = true;
    btnSimpan.classList.add('opacity-60', 'cursor-not-allowed');
  }
  if (btnText) btnText.innerText = 'Mengirim data ke Cloud Sheets...';
  if (btnLoader) btnLoader.classList.remove('hidden');

  fetch(endpointUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payloadData),
  })
    .then(() => {
      tampilkanToast(`Sukses sinkron! Data unit ${payloadData.nama} berhasil diamankan ke cloud.`);
    })
    .catch((err) => {
      tampilkanToast('❌ Gagal sinkron cloud.');
      console.error(err);
    })
    .finally(() => {
      if (btnSimpan) {
        btnSimpan.disabled = false;
        btnSimpan.classList.remove('opacity-60', 'cursor-not-allowed');
      }
      if (btnText) btnText.innerText = '🚀 Sinkronisasikan Data ke Google Sheets';
      if (btnLoader) btnLoader.classList.add('hidden');
    });
}

function tampilkanToast(pesan) {
  const toast = document.getElementById('customToast');
  const toastMsg = document.getElementById('toastMessage');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = pesan;
  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

function tampilkanKonfirmasi(pesan) {
  return new Promise((resolve) => {
    const modal = document.getElementById('customConfirmModal');
    if (!modal) {
      resolve(true);
      return;
    } // if modal not found, just confirm

    const modalBox = modal.querySelector('.relative');
    const msgElement = document.getElementById('confirmModalMessage');
    const btnCancel = document.getElementById('btnCancelConfirm');
    const btnAction = document.getElementById('btnActionConfirm');

    if (pesan) msgElement.innerText = pesan;

    modal.classList.remove('opacity-0', 'pointer-events-none');
    modalBox.classList.remove('scale-95');
    modalBox.classList.add('scale-100');

    function tutupModal(hasil) {
      modal.classList.add('opacity-0', 'pointer-events-none');
      modalBox.classList.remove('scale-100');
      modalBox.classList.add('scale-95');

      btnCancel.removeEventListener('click', onCancel);
      btnAction.removeEventListener('click', onConfirm);

      resolve(hasil);
    }

    function onCancel() {
      tutupModal(false);
    }
    function onConfirm() {
      tutupModal(true);
    }

    btnCancel.addEventListener('click', onCancel);
    btnAction.addEventListener('click', onConfirm);
  });
}
