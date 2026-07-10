let listStokMotor = [];
let chartInstance = null;

// Mulai inisialisasi halaman
document.addEventListener('DOMContentLoaded', () => {
  tarikDataKeuangan();
});

// Ambil data dari cloud Sheets
function tarikDataKeuangan() {
  const loader = document.getElementById('globalLoader');
  if (loader) loader.classList.remove('hidden');

  fetch(APPS_SCRIPT_URL, { method: 'GET', redirect: 'follow' })
    .then((res) => {
      if (!res.ok) throw new Error('Gagal memuat data dari server.');
      return res.json();
    })
    .then((data) => {
      if (Array.isArray(data)) {
        // Filter baris kosong/invalid
        listStokMotor = data.filter((motor) => motor && motor.id && motor.nama);
        
        inisialisasiFilterTahun();
        prosesDataKeuangan();
      } else {
        console.error('Format data Sheets salah:', data);
        alert('Format data dari server salah!');
      }
    })
    .catch((err) => {
      console.error(err);
      alert('Gagal menyinkronkan data keuangan. Periksa koneksi internet Anda.');
    })
    .finally(() => {
      if (loader) loader.classList.add('hidden');
    });
}

// Inisialisasi dropdown Filter Tahun secara dinamis berdasarkan data
function inisialisasiFilterTahun() {
  const selectTahun = document.getElementById('filterTahun');
  if (!selectTahun) return;

  // Temukan semua tahun unik dari Tgl Jual (tglLaku) atau Tgl Beli (tglBeli) untuk motor Terjual
  const tahunSet = new Set();
  listStokMotor.forEach((motor) => {
    const statusClean = String(motor.status || '').trim().toLowerCase();
    if (statusClean === 'terjual') {
      const tglStr = motor.tglLaku || motor.tglBeli;
      if (tglStr && tglStr.includes('-')) {
        const tahun = tglStr.split('-')[0];
        tahunSet.add(tahun);
      }
    }
  });

  // Jika tidak ada data terjual sama sekali, tambahkan tahun saat ini
  const tahunSekarang = new Date().getFullYear().toString();
  if (tahunSet.size === 0) {
    tahunSet.add(tahunSekarang);
  }

  // Konversi set ke array dan urutkan descending (tahun terbaru di atas)
  const tahunArray = Array.from(tahunSet).sort((a, b) => b - a);

  // Buat HTML options
  let optionsHtml = '<option value="">Semua Tahun</option>';
  tahunArray.forEach((tahun) => {
    // Set default ke tahun saat ini
    const isSelected = tahun === tahunSekarang ? 'selected' : '';
    optionsHtml += `<option value="${tahun}" ${isSelected}>Tahun ${tahun}</option>`;
  });

  selectTahun.innerHTML = optionsHtml;
}

// Pemrosesan utama perhitungan keuangan dan penggambaran chart
function prosesDataKeuangan() {
  const filterBulan = document.getElementById('filterBulan')?.value || '';
  const filterTahun = document.getElementById('filterTahun')?.value || '';

  // Filter motor yang berstatus "Terjual" dan sesuai bulan/tahun filter
  const motorTerjual = listStokMotor.filter((motor) => {
    const statusClean = String(motor.status || '').trim().toLowerCase();
    if (statusClean !== 'terjual') return false;

    const tglStr = motor.tglLaku || motor.tglBeli;
    let tglBulan = null;
    let tglTahun = null;

    if (tglStr && tglStr.includes('-')) {
      const parts = tglStr.split('-');
      tglTahun = parseInt(parts[0], 10);
      tglBulan = parseInt(parts[1], 10);
    }

    // Filter Bulan
    if (filterBulan && tglBulan !== parseInt(filterBulan, 10)) return false;

    // Filter Tahun
    if (filterTahun && tglTahun !== parseInt(filterTahun, 10)) return false;

    return true;
  });

  // Urutkan data berdasarkan tanggal laku/jual (terbaru paling atas untuk tabel)
  motorTerjual.sort((a, b) => {
    const dateA = new Date(a.tglLaku || a.tglBeli || '1970-01-01');
    const dateB = new Date(b.tglLaku || b.tglBeli || '1970-01-01');
    return dateB - dateA;
  });

  // Hitung total finansial
  let totalOmset = 0;
  let totalUntungBersih = 0;

  motorTerjual.forEach((motor) => {
    const penjualan = Number(motor.penjualan) || 0;
    const pengeluaran = Number(motor.totalPengeluaran) || 0;
    const untungBersih = penjualan - pengeluaran;

    totalOmset += penjualan;
    totalUntungBersih += untungBersih;
  });

  const untungNiko = totalUntungBersih / 2;
  const untungFikri = totalUntungBersih / 2;

  // Update Tampilan Kartu Ringkasan
  document.getElementById('txtTotalOmset').innerText = formatRupiah(totalOmset);
  document.getElementById('txtTotalUntung').innerText = formatRupiah(totalUntungBersih);
  document.getElementById('txtUntungNiko').innerText = formatRupiah(untungNiko);
  document.getElementById('txtUntungFikri').innerText = formatRupiah(untungFikri);
  document.getElementById('txtJumlahData').innerText = `${motorTerjual.length} Unit`;

  // Render Tabel Rincian Penjualan
  renderTabelKeuangan(motorTerjual);

  // Render Grafik
  updateGrafikKeuangan(motorTerjual, filterBulan, filterTahun);
}

// Format Angka ke Rupiah Display
function formatRupiah(number) {
  return 'Rp ' + (number || 0).toLocaleString('id-ID');
}

// Render data motor ke elemen tabel
function renderTabelKeuangan(motorList) {
  const tbody = document.getElementById('bodyTabelKeuangan');
  if (!tbody) return;

  if (motorList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 text-gray-400 font-medium bg-white">
          <i class="fa-solid fa-folder-open text-3xl mb-2 block text-gray-200"></i>
          Tidak ada rincian data penjualan untuk filter ini.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  motorList.forEach((motor) => {
    const penjualan = Number(motor.penjualan) || 0;
    const pengeluaran = Number(motor.totalPengeluaran) || 0;
    const untungBersih = penjualan - pengeluaran;
    const bagiHasil = untungBersih / 2;

    html += `
      <tr class="hover:bg-gray-50/50 bg-white transition duration-150 text-gray-700">
        <td class="py-3.5 px-5 font-bold text-gray-800 capitalize">${motor.nama}</td>
        <td class="py-3.5 px-5 text-gray-500">${motor.tglLaku || motor.tglBeli || '-'}</td>
        <td class="py-3.5 px-5 text-right font-semibold text-blue-600">${formatRupiah(penjualan)}</td>
        <td class="py-3.5 px-5 text-right text-gray-500">${formatRupiah(pengeluaran)}</td>
        <td class="py-3.5 px-5 text-right font-bold text-emerald-600">${formatRupiah(untungBersih)}</td>
        <td class="py-3.5 px-5 text-right font-semibold text-indigo-600">${formatRupiah(bagiHasil)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

// Gambar Grafik dengan Chart.js
function updateGrafikKeuangan(motorList, filterBulan, filterTahun) {
  const ctx = document.getElementById('chartKeuangan')?.getContext('2d');
  if (!ctx) return;

  // Hancurkan chart yang ada sebelumnya agar tidak bertumpuk
  if (chartInstance) {
    chartInstance.destroy();
  }

  let labels = [];
  let dataNiko = [];
  let dataFikri = [];

  if (filterBulan === '') {
    // VIEW MACRO: Tampilkan Breakdown Bulanan (Jan - Des) dalam 1 Tahun
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    // Inisialisasi array kosong sebanyak 12 bulan
    const bulananNiko = Array(12).fill(0);
    const bulananFikri = Array(12).fill(0);

    motorList.forEach((motor) => {
      const tglStr = motor.tglLaku || motor.tglBeli;
      if (tglStr && tglStr.includes('-')) {
        const bulanIdx = parseInt(tglStr.split('-')[1], 10) - 1; // 0-indexed untuk array
        if (bulanIdx >= 0 && bulanIdx < 12) {
          const untungBersih = (Number(motor.penjualan) || 0) - (Number(motor.totalPengeluaran) || 0);
          const bagiHasil = untungBersih / 2;
          bulananNiko[bulanIdx] += bagiHasil;
          bulananFikri[bulanIdx] += bagiHasil;
        }
      }
    });

    dataNiko = bulananNiko;
    dataFikri = bulananFikri;
  } else {
    // VIEW MICRO: Tampilkan Rincian Keuntungan Per Motor di Bulan Terpilih
    // Ambil maksimal 10 data penjualan terbaru untuk visualisasi yang rapi
    const limitList = motorList.slice(0, 10).reverse(); // Balik agar terurut kronologis kiri ke kanan
    
    limitList.forEach((motor) => {
      // Potong nama motor jika terlalu panjang agar muat di label chart
      let namaSingkat = motor.nama;
      if (namaSingkat.length > 15) {
        namaSingkat = namaSingkat.substring(0, 15) + '...';
      }
      labels.push(namaSingkat);

      const untungBersih = (Number(motor.penjualan) || 0) - (Number(motor.totalPengeluaran) || 0);
      const bagiHasil = untungBersih / 2;
      dataNiko.push(bagiHasil);
      dataFikri.push(bagiHasil);
    });
  }

  // Buat chart baru dengan visual premium dan modern
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Keuntungan Niko',
          data: dataNiko,
          backgroundColor: 'rgba(99, 102, 241, 0.85)', // Indigo 500 dengan opacity
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1.5,
          borderRadius: 4,
          stack: 'Combined'
        },
        {
          label: 'Keuntungan Fikri',
          data: dataFikri,
          backgroundColor: 'rgba(20, 184, 166, 0.85)', // Teal 500 dengan opacity
          borderColor: 'rgb(20, 184, 166)',
          borderWidth: 1.5,
          borderRadius: 4,
          stack: 'Combined'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: 'Outfit, Inter, sans-serif', weight: 'bold', size: 12 },
            color: '#475569'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit, Inter, sans-serif', weight: 'bold' },
          bodyFont: { family: 'Outfit, Inter, sans-serif' },
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += formatRupiah(context.parsed.y);
              }
              return label;
            },
            footer: function(tooltipItems) {
              // Hitung total tumpukan di tooltip
              let sum = 0;
              tooltipItems.forEach(function(tooltipItem) {
                sum += tooltipItem.parsed.y;
              });
              return 'Total Untung Bersih: ' + formatRupiah(sum);
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: 'Outfit, Inter, sans-serif', weight: '500', size: 11 },
            color: '#64748b'
          }
        },
        y: {
          stacked: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { family: 'Outfit, Inter, sans-serif', size: 11 },
            color: '#64748b',
            callback: function(value) {
              // Tampilkan format kelipatan juta/ribu untuk keindahan sumbu Y
              if (value >= 1000000) return 'Rp ' + (value / 1000000) + 'jt';
              if (value >= 1000) return 'Rp ' + (value / 1000) + 'rb';
              return 'Rp ' + value;
            }
          }
        }
      }
    }
  });
}
