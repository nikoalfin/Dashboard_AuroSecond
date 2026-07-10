let listStokMotor = [];
let payloadData = {};

window.addEventListener('DOMContentLoaded', () => {
  inisialisasiFilterTahun();

  // Inisialisasi dropdown kustom beranda
  konfigurasiCustomSelect('filterBulan');
  konfigurasiCustomSelect('filterTahun');
  konfigurasiCustomSelect('filterStatus');

  // Inisialisasi Flatpickr pada input tanggal beli modal tambah
  const modalTglInput = document.getElementById('modalInputTglBeli');
  if (modalTglInput) {
    flatpickr("#modalInputTglBeli", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d F Y",
      locale: "id"
    });
  }

  // Tarik data awal dari Sheet
  tarikDataDariSheet();
});

function inisialisasiFilterTahun() {
  const selectTahun = document.getElementById('filterTahun');
  if (!selectTahun) return;

  const tahunSekarang = new Date().getFullYear();
  let optionsHtml = '<option value="">Semua Tahun</option>';
  for (let t = tahunSekarang; t >= 2024; t--) {
    optionsHtml += `<option value="${t}">${t}</option>`;
  }
  selectTahun.innerHTML = optionsHtml;
}

function toggleFilter() {
  const container = document.getElementById('containerFilter');
  const arrow = document.getElementById('arrowFilter');
  if (container && arrow) {
    container.classList.toggle('hidden');
    container.classList.toggle('grid');
    arrow.classList.toggle('rotate-180');
  }
}

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
        // Filter baris kosong/invalid
        listStokMotor = data.filter((motor) => motor && motor.id && motor.nama);

        // Sort berdasarkan tanggal beli - terbaru ditaruh paling atas
        listStokMotor.sort((a, b) => {
          const dateA = new Date(a.tglBeli || '1970-01-01');
          const dateB = new Date(b.tglBeli || '1970-01-01');
          return dateB - dateA;
        });

        renderBeranda();
        
        const berandaPage = document.getElementById('pageBeranda');
        if (berandaPage) {
          berandaPage.classList.remove('hidden'); // Membuka kunci layar
        }
      } else {
        console.error('Format data dari Sheets salah:', data);
      }
    })
    .catch((err) => {
      console.error(err);
      tampilkanToast('⚠️ Gagal sinkronisasi otomatis cloud Sheets.');
    })
    .finally(() => {
      if (loader) loader.classList.add('hidden');
    });
}

function renderBeranda() {
  const grid = document.getElementById('gridMotor');
  if (!grid) return;
  grid.innerHTML = '';

  // AMBIL NILAI INPUTAN FILTER DARI UI HTML
  const filterNama = document.getElementById('filterNamaMotor')?.value.toLowerCase() || '';
  const filterBulan = document.getElementById('filterBulan')?.value || '';
  const filterTahun = document.getElementById('filterTahun')?.value || '';
  const filterStatus = document.getElementById('filterStatus')?.value || '';

  let ready = 0,
    terjual = 0,
    totalTercatat = 0;
  let renderedCount = 0;

  listStokMotor.forEach((motor, index) => {
    // ⚡ PROSES FILTER DATA SECARA REALTIME

    // 1. Filter Nama Motor
    if (filterNama && !motor.nama.toLowerCase().includes(filterNama)) return;

    // 2. Filter Status Unit
    const statusClean = String(motor.status || '').trim().toLowerCase();
    if (filterStatus && statusClean !== filterStatus.toLowerCase()) return;

    // Ambil data tanggal untuk kebutuhan filter Bulan dan Tahun
    // Gunakan tglLaku (Tanggal Jual) jika motor sudah Terjual, jika tidak gunakan tglBeli
    const tglStr = (statusClean === 'terjual' && motor.tglLaku) ? motor.tglLaku : motor.tglBeli;
    
    let tglBulan = null;
    let tglTahun = null;
    if (tglStr && tglStr.includes('-')) {
      const parts = tglStr.split('-');
      tglTahun = parseInt(parts[0], 10);
      tglBulan = parseInt(parts[1], 10);
    }

    // 3. Filter Bulan
    if (filterBulan && tglBulan !== parseInt(filterBulan, 10)) return;

    // 4. Filter Tahun
    if (filterTahun && tglTahun !== parseInt(filterTahun, 10)) return;

    // Jalankan kalkulasi counter untuk data yang terfilter
    if (statusClean === 'ready') ready++;
    else if (statusClean === 'terjual') terjual++;
    totalTercatat++;

    // MEMBUAT ELEMENT CARD JIKA LOLOS SELEKSI FILTER
    const card = document.createElement('div');
    card.className = 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer transform hover:-translate-y-0.5';

    card.addEventListener('click', () => {
      // Navigasi ke halaman detail dengan path relatif baru
      window.location.href = `../detail-page/detail.html?id=${encodeURIComponent(motor.id)}`;
    });

    const imgHtml = motor.gambar
      ? `<div class="w-full h-32 rounded-lg overflow-hidden mb-3 bg-gray-100 border border-gray-100"><img src="${motor.gambar}" class="w-full h-full object-cover" /></div>`
      : `<div class="w-full h-32 rounded-lg bg-gray-50 flex items-center justify-center mb-3 text-gray-300 border border-dashed border-gray-200"><i class="fa-solid fa-motorcycle text-3xl"></i></div>`;

    card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <div class="text-xs font-bold text-gray-400">#${listStokMotor.length - index}</div>
                <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${statusClean === 'ready' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}">${motor.status}</span>
            </div>
            ${imgHtml}
            <div>
                <h3 class="text-base font-bold text-gray-800 capitalize mb-2">${motor.nama}</h3>
                <div class="flex flex-col gap-1 mb-4">
                    <p class="text-xs text-gray-400">Tgl Beli: ${motor.tglBeli || '-'}</p>
                    <p class="text-xs text-gray-400">Tgl Jual: ${motor.tglLaku || '-'}</p>
                </div>
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

  // UPDATE BADGE STATISTIK COUNTER
  const cTotal = document.getElementById('countTotal');
  const cReady = document.getElementById('countReady');
  const cTerjual = document.getElementById('countTerjual');

  if (cTotal) cTotal.innerText = totalTercatat;
  if (cReady) cReady.innerText = ready;
  if (cTerjual) cTerjual.innerText = terjual;
}

function bukaModalTambah() {
  const modal = document.getElementById('modalTambah');
  if (modal) {
    modal.classList.remove('hidden');
    // Prefill input tanggal beli dengan tanggal hari ini
    const tglBeliInput = document.getElementById('modalInputTglBeli');
    if (tglBeliInput) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (tglBeliInput._flatpickr) {
        tglBeliInput._flatpickr.setDate(todayStr, false);
      } else {
        tglBeliInput.value = todayStr;
      }
    }
  }
}

function tutupModalTambah() {
  const modal = document.getElementById('modalTambah');
  if (modal) modal.classList.add('hidden');
}

function prosesTambahMotor() {
  const nama = document.getElementById('modalInputNama').value;
  const tglBeli = document.getElementById('modalInputTglBeli').value;
  if (!nama) {
    alert('Nama motor wajib diisi!');
    return;
  }

  const newId = listStokMotor.length > 0 ? Math.max(...listStokMotor.map((o) => Number(o.id) || 0)) + 1 : 1;
  const newObj = {
    id: newId,
    nama: nama,
    status: 'Ready',
    tglBeli: tglBeli || new Date().toISOString().split('T')[0],
    tglLaku: '',
    modalNiko: 0,
    modalFikri: 0,
    penjualan: 0,
    totalPengeluaran: 0,
    pengeluaran: [],
    gambar: '',
  };

  payloadData = newObj;

  const btnSimpan = document.querySelector('#modalTambah button.bg-blue-600');
  const oldText = btnSimpan.innerText;
  btnSimpan.innerText = 'Menyimpan...';
  btnSimpan.disabled = true;

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payloadData),
  })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then((data) => {
      if (data.status === 'success') {
        // Arahkan ke subfolder detail-page
        window.location.href = `../detail-page/detail.html?id=${newId}`;
      } else {
        throw new Error(data.message || 'Gagal menyimpan.');
      }
    })
    .catch((err) => {
      alert('Gagal menambahkan motor ke cloud: ' + err.message);
      btnSimpan.innerText = oldText;
      btnSimpan.disabled = false;
    });
}
