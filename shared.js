// FORMATTER UTILITY
function formatNumberWithDots(val) {
  return Number(String(val).replace(/\D/g, '') || 0).toLocaleString('id-ID');
}

function getCleanNumber(val) {
  return Number(String(val).replace(/\./g, '')) || 0;
}

function formatRupiahDisplay(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}

// MAPPER DARI/KE SUPABASE DATABASE
function formatMotorFromDB(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    nama: row.nama || '',
    status: row.status || 'Ready',
    tglBeli: row.tgl_beli || '',
    tglLaku: row.tgl_laku || '',
    modalNiko: Number(row.modal_niko) || 0,
    modalFikri: Number(row.modal_fikri) || 0,
    penjualan: Number(row.penjualan) || 0,
    totalPengeluaran: Number(row.total_pengeluaran) || 0,
    pengeluaran: Array.isArray(row.pengeluaran)
      ? row.pengeluaran
      : (typeof row.pengeluaran === 'string' ? JSON.parse(row.pengeluaran || '[]') : []),
    gambar: row.gambar || ''
  };
}

function formatMotorToDB(motor) {
  return {
    id: Number(motor.id),
    nama: motor.nama || '',
    status: motor.status || 'Ready',
    tgl_beli: motor.tglBeli || null,
    tgl_laku: motor.tglLaku || null,
    modal_niko: Number(motor.modalNiko) || 0,
    modal_fikri: Number(motor.modalFikri) || 0,
    penjualan: Number(motor.penjualan) || 0,
    total_pengeluaran: Number(motor.totalPengeluaran) || 0,
    pengeluaran: motor.pengeluaran || [],
    gambar: motor.gambar || ''
  };
}

// TOAST NOTIFICATION UTILITY
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

// ==========================================
// COMMON FILTER & MASTER DATA (BEST PRACTICE)
// ==========================================
const MASTER_BULAN = [
  { value: '1', nama: 'Januari' },
  { value: '2', nama: 'Februari' },
  { value: '3', nama: 'Maret' },
  { value: '4', nama: 'April' },
  { value: '5', nama: 'Mei' },
  { value: '6', nama: 'Juni' },
  { value: '7', nama: 'Juli' },
  { value: '8', nama: 'Agustus' },
  { value: '9', nama: 'September' },
  { value: '10', nama: 'Oktober' },
  { value: '11', nama: 'November' },
  { value: '12', nama: 'Desember' }
];

const MASTER_STATUS = ['Ready', 'Terjual'];

/**
 * Mengisi dropdown filter Bulan secara standar dari MASTER_BULAN
 */
function isiDropdownBulan(selectId, defaultLabel = 'Semua Bulan') {
  const el = document.getElementById(selectId);
  if (!el) return;
  const valSaatIni = el.value;
  let html = defaultLabel ? `<option value="">${defaultLabel}</option>` : '';
  MASTER_BULAN.forEach((b) => {
    html += `<option value="${b.value}">${b.nama}</option>`;
  });
  el.innerHTML = html;
  if (valSaatIni) el.value = valSaatIni;
}

/**
 * Mengisi dropdown filter Status secara standar dari MASTER_STATUS
 */
function isiDropdownStatus(selectId, defaultLabel = 'Semua Status') {
  const el = document.getElementById(selectId);
  if (!el) return;
  const valSaatIni = el.value;
  let html = defaultLabel ? `<option value="">${defaultLabel}</option>` : '';
  MASTER_STATUS.forEach((status) => {
    html += `<option value="${status}">${status}</option>`;
  });
  el.innerHTML = html;
  if (valSaatIni) el.value = valSaatIni;
}

/**
 * Mengisi dropdown filter Tahun secara dinamis berdasarkan data motor yang tersedia
 */
function isiDropdownTahun(selectId, dataList = [], defaultLabel = 'Semua Tahun') {
  const el = document.getElementById(selectId);
  if (!el) return;
  const valSaatIni = el.value;

  const tahunSet = new Set();
  if (Array.isArray(dataList) && dataList.length > 0) {
    dataList.forEach((item) => {
      const tglStr = item.tglLaku || item.tglBeli || item.tgl_laku || item.tgl_beli;
      if (tglStr && typeof tglStr === 'string' && tglStr.includes('-')) {
        const thn = tglStr.split('-')[0];
        if (thn && !isNaN(thn)) tahunSet.add(thn);
      }
    });
  }

  // Jika belum ada data dari cloud, gunakan default tahun saat ini ke bawah
  if (tahunSet.size === 0) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2024; y--) {
      tahunSet.add(String(y));
    }
  }

  // Urutkan tahun terbaru di atas (descending)
  const sortedYears = Array.from(tahunSet).sort((a, b) => Number(b) - Number(a));

  let html = defaultLabel ? `<option value="">${defaultLabel}</option>` : '';
  sortedYears.forEach((y) => {
    html += `<option value="${y}">${y}</option>`;
  });
  el.innerHTML = html;
  if (valSaatIni) el.value = valSaatIni;
}

// REGISTRASI PWA SERVICE WORKER OTOMATIS
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA ServiceWorker note:', err);
    });
  });
}
