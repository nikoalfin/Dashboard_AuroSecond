let listStokMotor = [];
let globalCounters = { total: 0, ready: 0, terjual: 0 };

window.addEventListener('DOMContentLoaded', () => {
  // Isi opsi dropdown filter dari data master bersama
  isiDropdownBulan('filterBulan');
  isiDropdownTahun('filterTahun', []);

  // Set tampilan tab status aktif ke 'Ready' secara default
  updateTabStatusUI('Ready');

  // Inisialisasi dropdown kustom beranda untuk bulan dan tahun
  konfigurasiCustomSelect('filterBulan');
  konfigurasiCustomSelect('filterTahun');

  // Inisialisasi Flatpickr pada input tanggal beli modal tambah
  const modalTglInput = document.getElementById('modalInputTglBeli');
  if (modalTglInput) {
    flatpickr("#modalInputTglBeli", FLATPICKR_CONFIG);
  }

  // Tarik data awal dari database Supabase (hanya unit Ready secara default agar cepat & ringan)
  tarikDataDariSheet();
});

/**
 * Handler ganti tab filter status: All (''), Ready ('Ready'), Terjual ('Terjual')
 */
function setFilterStatus(status) {
  const hiddenInput = document.getElementById('filterStatus');
  if (hiddenInput) hiddenInput.value = status;
  updateTabStatusUI(status);
  tarikDataDariSheet();
}

/**
 * Update styling visual tab bar aktif dan badge count
 */
function updateTabStatusUI(status = 'Ready') {
  const tabAll = document.getElementById('tabStatusAll');
  const tabReady = document.getElementById('tabStatusReady');
  const tabTerjual = document.getElementById('tabStatusTerjual');
  if (!tabAll || !tabReady || !tabTerjual) return;

  const baseTabClass = 'flex-1 sm:flex-none py-1.5 px-3.5 text-xs sm:text-sm rounded-lg transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer';
  const inactiveClass = `${baseTabClass} text-gray-500 hover:text-gray-800 font-medium hover:bg-gray-200/50`;

  tabAll.className = inactiveClass;
  tabReady.className = inactiveClass;
  tabTerjual.className = inactiveClass;

  const bTotal = document.getElementById('countTotal');
  const bReady = document.getElementById('countReady');
  const bTerjual = document.getElementById('countTerjual');
  const inactiveBadge = 'px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-200 text-gray-600';

  if (bTotal) bTotal.className = inactiveBadge;
  if (bReady) bReady.className = inactiveBadge;
  if (bTerjual) bTerjual.className = inactiveBadge;

  const statusClean = String(status || '').trim().toLowerCase();
  if (statusClean === 'ready') {
    tabReady.className = `${baseTabClass} bg-white text-blue-600 font-bold shadow-sm`;
    if (bReady) bReady.className = 'px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-blue-100 text-blue-700';
  } else if (statusClean === 'terjual') {
    tabTerjual.className = `${baseTabClass} bg-white text-emerald-600 font-bold shadow-sm`;
    if (bTerjual) bTerjual.className = 'px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-700';
  } else {
    // All
    tabAll.className = `${baseTabClass} bg-white text-gray-900 font-bold shadow-sm`;
    if (bTotal) bTotal.className = 'px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-gray-200 text-gray-800';
  }
}

async function tarikDataDariSheet() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  const filterStatus = document.getElementById('filterStatus')?.value || '';

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    // 1. Ambil statistik counter ringan (hanya kolom status, sangat ringan & cepat)
    const { data: statsData } = await client.from(TABLE_MOTOR).select('status');
    if (statsData) {
      globalCounters.total = statsData.length;
      globalCounters.ready = statsData.filter((m) => (m.status || '').toLowerCase() === 'ready').length;
      globalCounters.terjual = statsData.filter((m) => (m.status || '').toLowerCase() === 'terjual').length;

      const cTotal = document.getElementById('countTotal');
      const cReady = document.getElementById('countReady');
      const cTerjual = document.getElementById('countTerjual');
      if (cTotal) cTotal.innerText = globalCounters.total;
      if (cReady) cReady.innerText = globalCounters.ready;
      if (cTerjual) cTerjual.innerText = globalCounters.terjual;
    }

    // 2. Query unit motor - default HANYA ambil unit 'Ready' agar sangat cepat dan ringan
    let query = client.from(TABLE_MOTOR).select('*').order('id', { ascending: false });
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (Array.isArray(data)) {
      listStokMotor = data
        .filter((motor) => motor && motor.id && motor.nama)
        .map(formatMotorFromDB);

      // Sort berdasarkan tanggal beli - terbaru ditaruh paling atas
      listStokMotor.sort((a, b) => {
        const dateA = new Date(a.tglBeli || '1970-01-01');
        const dateB = new Date(b.tglBeli || '1970-01-01');
        return dateB - dateA;
      });

      // Refresh pilihan tahun sesuai data aktual dari database
      isiDropdownTahun('filterTahun', listStokMotor);
      konfigurasiCustomSelect('filterTahun');

      renderBeranda();

      const berandaPage = document.getElementById('pageBeranda');
      if (berandaPage) {
        berandaPage.classList.remove('hidden');
      }
    }
  } catch (err) {
    console.error(err);
    tampilkanToast('Gagal sinkronisasi data dari Supabase.');
  } finally {
    if (loader) loader.classList.add('hidden');
  }
}

function renderBeranda() {
  const grid = document.getElementById('gridMotor');
  if (!grid) return;
  grid.innerHTML = '';

  // AMBIL NILAI INPUTAN FILTER DARI UI HTML
  const filterBulan = document.getElementById('filterBulan')?.value || '';
  const filterTahun = document.getElementById('filterTahun')?.value || '';
  const filterStatus = document.getElementById('filterStatus')?.value || '';

  let ready = 0,
    terjual = 0,
    totalTercatat = 0;
  let renderedCount = 0;

  listStokMotor.forEach((motor, index) => {
    // ⚡ PROSES FILTER DATA SECARA REALTIME

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
      window.location.href = `detail-page/detail.html?id=${encodeURIComponent(motor.id)}`;
    });

    const imgHtml = motor.gambar
      ? `<div class="w-full aspect-[4/3] rounded-lg overflow-hidden mb-3 bg-gray-100 border border-gray-100">
           <img src="${motor.gambar}" alt="${motor.nama}" loading="lazy" referrerpolicy="no-referrer" class="w-full h-full object-cover"
             onerror="handleMotorImageError(this, '${motor.gambar}')" />
         </div>`
      : `<div class="w-full aspect-[4/3] rounded-lg bg-gray-50 flex items-center justify-center mb-3 text-gray-300 border border-dashed border-gray-200"><i class="fa-solid fa-motorcycle text-3xl"></i></div>`;

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
        <div class="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 text-2xl shadow-inner mb-4">
          <i class="fa-solid fa-magnifying-glass"></i>
        </div>
        <h3 class="text-base font-bold text-gray-700">Unit Tidak Ditemukan</h3>
        <p class="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Tidak ada unit motor yang cocok dengan kriteria filter saat ini.</p>
      </div>
    `;
  }

  // UPDATE BADGE STATISTIK COUNTER
  const cTotal = document.getElementById('countTotal');
  const cReady = document.getElementById('countReady');
  const cTerjual = document.getElementById('countTerjual');

  // Jika user memfilter bulan atau tahun, tampilkan hitungan sesuai hasil filter
  if (filterBulan || filterTahun) {
    if (cTotal) cTotal.innerText = totalTercatat;
    if (cReady) cReady.innerText = ready;
    if (cTerjual) cTerjual.innerText = terjual;
  } else {
    // Tampilkan total keseluruhan aktual dari server
    if (cTotal) cTotal.innerText = globalCounters.total;
    if (cReady) cReady.innerText = globalCounters.ready;
    if (cTerjual) cTerjual.innerText = globalCounters.terjual;
  }
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

async function prosesTambahMotor() {
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

  const btnSimpan = document.querySelector('#modalTambah button.bg-blue-600');
  const oldText = btnSimpan.innerText;
  btnSimpan.innerText = 'Menyimpan...';
  btnSimpan.disabled = true;

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client belum diinisialisasi');

    const dbPayload = formatMotorToDB(newObj);
    const { error } = await client.from(TABLE_MOTOR).insert([dbPayload]);
    if (error) throw error;

    window.location.href = `detail-page/detail.html?id=${newId}`;
  } catch (err) {
    alert('Gagal menambahkan motor ke database: ' + err.message);
    btnSimpan.innerText = oldText;
    btnSimpan.disabled = false;
  }
}
