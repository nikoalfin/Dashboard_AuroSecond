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

// Alias konsisten untuk seluruh modul
const formatRupiah = formatRupiahDisplay;

/**
 * Format string agar setiap kata diawali huruf kapital (Title Case)
 */
function toTitleCase(str) {
  if (!str) return '';
  return String(str).replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

/**
 * Handler input event untuk auto-kapitalisasi huruf pertama setiap kata dengan preservasi posisi kursor
 */
function handleInputTitleCase(input) {
  if (!input) return;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const formatted = toTitleCase(input.value);
  if (input.value !== formatted) {
    input.value = formatted;
    input.setSelectionRange(start, end);
  }
}

/**
 * Format string digit menjadi format titik ribuan Indonesia tanpa desimal
 */
function formatDigitsWithDots(digitsStr) {
  if (!digitsStr) return '';
  const clean = String(digitsStr).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!clean) return '0';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatter input rupiah presisi yang mempertahankan posisi kursor di mana pun user mengedit
 * (tengah, awal, akhir) tanpa melompat ke belakang ataupun menghapus digit lain secara tidak sengaja.
 */
function handleInputRupiahPreserveCursor(input) {
  if (!input) return;
  const rawVal = input.value;
  if (!rawVal || rawVal.trim() === '') {
    input.value = '';
    return;
  }

  const selStart = input.selectionStart || 0;
  // Hitung jumlah digit di sebelah kiri posisi kursor saat ini
  const digitsBefore = (rawVal.slice(0, selStart).match(/\d/g) || []).length;

  const rawDigits = rawVal.replace(/\D/g, '');
  if (!rawDigits) {
    input.value = '';
    return;
  }

  const formatted = formatDigitsWithDots(rawDigits);
  input.value = formatted;

  // Tempatkan kembali kursor tepat setelah digit yang sama dalam string hasil format
  let newPos = 0;
  let count = 0;
  if (digitsBefore === 0) {
    newPos = 0;
  } else {
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        count++;
      }
      if (count === digitsBefore) {
        newPos = i + 1;
        break;
      }
    }
    if (count < digitsBefore) {
      newPos = formatted.length;
    }
  }

  input.setSelectionRange(newPos, newPos);
}

/**
 * Mencegah kursor tersangkut pada titik pemisah saat menekan tombol Backspace atau Delete
 */
function handleRupiahKeydown(e, input) {
  if (!input) return;
  if (e.key === 'Backspace' && input.selectionStart === input.selectionEnd) {
    const pos = input.selectionStart;
    // Jika kursor tepat berada setelah titik (pos > 0 && char di pos-1 adalah '.'), hapus angka sebelum titik
    if (pos > 0 && input.value[pos - 1] === '.') {
      e.preventDefault();
      const val = input.value;
      const cutStart = Math.max(0, pos - 2);
      input.value = val.slice(0, cutStart) + val.slice(pos - 1);
      input.setSelectionRange(cutStart, cutStart);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (e.key === 'Delete' && input.selectionStart === input.selectionEnd) {
    const pos = input.selectionStart;
    // Jika kursor tepat berada sebelum titik (pos < length && char di pos adalah '.'), hapus angka sesudah titik
    if (pos < input.value.length && input.value[pos] === '.') {
      e.preventDefault();
      const val = input.value;
      input.value = val.slice(0, pos) + val.slice(pos + 2);
      input.setSelectionRange(pos, pos);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
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

const STATUS_READY = 'Ready';
const STATUS_TERJUAL = 'Terjual';
const MASTER_STATUS = [STATUS_READY, STATUS_TERJUAL];

// Konfigurasi standar Flatpickr untuk seluruh modul
const FLATPICKR_CONFIG = {
  dateFormat: "Y-m-d",
  altInput: true,
  altFormat: "d F Y",
  locale: "id"
};

/**
 * Fallback handler gambar unit motor jika gagal memuat
 */
function handleMotorImageError(imgEl, originalUrl) {
  if (!imgEl) return;
  if (!imgEl.dataset.retry && originalUrl) {
    imgEl.dataset.retry = '1';
    setTimeout(() => { imgEl.src = originalUrl; }, 1200);
  } else {
    imgEl.parentElement.innerHTML = '<div class="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300"><i class="fa-solid fa-motorcycle text-3xl"></i></div>';
  }
}

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
