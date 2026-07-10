let listStokMotor = [];
let idMotorAktif = null;
let selectedGambarBase64 = null;
let selectedGambarNama = null;
let currentGambarUrl = '';
let payloadData = {};
window.apakahAdaPerubahan = false;

window.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi Flatpickr pada input detail
  flatpickr("#tglBeli", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d F Y",
    locale: "id"
  });

  flatpickr("#tglLaku", {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d F Y",
    locale: "id"
  });

  // Baca ID motor dari URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  if (id) {
    idMotorAktif = id;
    tarikDataDariSheet();
  } else {
    alert('ID Motor tidak ditemukan!');
    window.location.href = '../home-page/index.html';
  }

  // Intersep tombol browser "Back" agar melakukan auto-save jika ada perubahan
  if (!window.hasPopstateListener) {
    window.history.pushState({ page: 'detail' }, '');
    window.addEventListener('popstate', function (event) {
      if (window.apakahAdaPerubahan) {
        event.preventDefault();
        syncDanKembali();
      } else {
        window.location.href = '../home-page/index.html';
      }
    });
    window.hasPopstateListener = true;
  }
});

function kembaliKeBeranda() {
  if (window.apakahAdaPerubahan) {
    syncDanKembali();
  } else {
    window.location.href = '../home-page/index.html';
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
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payloadData),
  })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then((data) => {
      if (data.status !== 'success') {
        console.error('Apps Script error:', data.message);
      }
      window.location.href = '../home-page/index.html';
    })
    .catch((err) => {
      console.error(err);
      window.location.href = '../home-page/index.html';
    });
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
        listStokMotor = data.filter((motor) => motor && motor.id && motor.nama);
        if (idMotorAktif) {
          bukaDetailMotor(idMotorAktif);
          const pageDetail = document.getElementById('pageDetail');
          if (pageDetail) pageDetail.classList.remove('hidden');
        }
      }
    })
    .catch((err) => {
      console.error(err);
      tampilkanToast('⚠️ Gagal sinkronisasi data.');
    })
    .finally(() => {
      if (loader) loader.classList.add('hidden');
    });
}

function bukaDetailMotor(id) {
  idMotorAktif = id;
  const motor = listStokMotor.find((x) => String(x.id) === String(id));
  if (!motor) {
    alert('Data motor tidak ditemukan!');
    window.location.href = '../home-page/index.html';
    return;
  }

  document.getElementById('detailNamaMotorDisplay').value = motor.nama;
  document.getElementById('detailStatusSelect').value = motor.status;

  // Load status gambar unit motor
  selectedGambarBase64 = null;
  selectedGambarNama = null;
  currentGambarUrl = motor.gambar || '';

  const previewImg = document.getElementById('previewGambar');
  const placeholderDiv = document.getElementById('placeholderGambar');
  const btnHapus = document.getElementById('btnHapusGambar');
  const inputGambar = document.getElementById('inputGambar');

  if (inputGambar) inputGambar.value = '';

  if (currentGambarUrl) {
    if (previewImg) previewImg.src = currentGambarUrl;
    if (previewImg) previewImg.classList.remove('hidden');
    if (placeholderDiv) placeholderDiv.classList.add('hidden');
    if (btnHapus) btnHapus.classList.remove('hidden');
  } else {
    if (previewImg) previewImg.src = '';
    if (previewImg) previewImg.classList.add('hidden');
    if (placeholderDiv) placeholderDiv.classList.remove('hidden');
    if (btnHapus) btnHapus.classList.add('hidden');
  }

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

  // Set Input Modal & Penjualan
  document.getElementById('modalNiko').value = (motor.modalNiko || 0).toLocaleString('id-ID');
  document.getElementById('modalFikri').value = (motor.modalFikri || 0).toLocaleString('id-ID');
  document.getElementById('hargaPenjualan').value = (motor.penjualan || 0).toLocaleString('id-ID');

  // Load tabel pengeluaran
  const tbody = document.getElementById('bodyPengeluaran');
  if (tbody) {
    tbody.innerHTML = '';
    const listPengeluaran = Array.isArray(motor.pengeluaran)
      ? motor.pengeluaran
      : (typeof motor.pengeluaran === 'string' && motor.pengeluaran ? JSON.parse(motor.pengeluaran) : []);

    listPengeluaran.forEach((ops) => {
      tambahBarisPengeluaran(ops.ket, String(ops.item), false);
    });
  }

  // Hitung ulang kalkulasi di layar
  hitungSemua();

  // Reset flag penanda perubahan
  window.apakahAdaPerubahan = false;
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

  const tr = document.createElement('tr');
  tr.className = 'hover:bg-gray-50 border-b border-gray-150 transition';

  const tdNo = document.createElement('td');
  tdNo.className = 'py-3 px-4 text-xs font-bold text-gray-400 text-center';

  const tdKet = document.createElement('td');
  tdKet.className = 'py-2 px-3';
  const inputKet = document.createElement('input');
  inputKet.type = 'text';
  inputKet.className = 'w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-sm focus:outline-none focus:border-blue-500';
  inputKet.value = keterangan;
  inputKet.placeholder = 'Keterangan operasional...';
  inputKet.addEventListener('input', () => {
    window.apakahAdaPerubahan = true;
  });
  tdKet.appendChild(inputKet);

  const tdJml = document.createElement('td');
  tdJml.className = 'py-2 px-3 relative';
  const divJml = document.createElement('div');
  divJml.className = 'relative';
  divJml.innerHTML = '<span class="absolute left-3 top-1 text-gray-500 text-sm">Rp</span>';
  const inputJml = document.createElement('input');
  inputJml.type = 'text';
  inputJml.className = 'w-full bg-white border border-gray-300 rounded pl-10 pr-3 py-1 text-sm text-right font-semibold text-gray-700 class-jumlah';
  const cleanJumlah = typeof jumlah === 'number' ? jumlah : Number(String(jumlah).replace(/\D/g, '')) || 0;
  inputJml.value = cleanJumlah.toLocaleString('id-ID');
  inputJml.addEventListener('input', () => {
    handleInputRupiah(inputJml);
  });
  divJml.appendChild(inputJml);
  tdJml.appendChild(divJml);

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

async function hapusBaris(btn) {
  const tr = btn.closest('tr');
  if (tr) {
    tr.remove();
    urutkanNomorTabel();
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

  const detailStatus = document.getElementById('detailStatusSelect').value;
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

  window.apakahAdaPerubahan = true;

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
          ket: inputs[0].value,
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
    gambarNama: selectedGambarNama
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
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payloadData),
  })
    .then((res) => {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.json();
    })
    .then((data) => {
      if (data.status === 'success') {
        tampilkanToast(`Sukses sinkron! Data unit ${payloadData.nama} berhasil diamankan ke cloud.`);
        tarikDataDariSheet();
      } else {
        throw new Error(data.message || 'Gagal menyimpan.');
      }
    })
    .catch((err) => {
      tampilkanToast('❌ Gagal sinkron cloud: ' + err.message);
      console.error(err);
    })
    .finally(() => {
      if (btnSimpan) {
        btnSimpan.disabled = false;
        btnSimpan.classList.remove('opacity-60', 'cursor-not-allowed');
      }
      if (btnText) btnText.innerText = 'Sinkronisasikan Data';
      if (btnLoader) btnLoader.classList.add('hidden');
    });
}

async function hapusMotorDariSheet() {
  const yakinHapus = await tampilkanKonfirmasi(
    'Apakah kamu yakin ingin menghapus unit motor ini dari database? Tindakan ini tidak bisa dibatalkan.',
    'Hapus Unit Motor?'
  );

  if (yakinHapus) {
    const endpointUrl = APPS_SCRIPT_URL;
    const loader = document.getElementById('globalLoader');
    if (loader) {
      loader.classList.remove('hidden');
      const p = loader.querySelector('p');
      if (p) p.innerText = 'Menghapus unit motor...';
    }

    window.apakahAdaPerubahan = false;

    fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        id: idMotorAktif,
        action: 'delete'
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (data.status === 'success') {
          window.location.href = '../home-page/index.html';
        } else {
          throw new Error(data.message || 'Gagal menghapus.');
        }
      })
      .catch((err) => {
        alert('Gagal menghapus motor dari database: ' + err.message);
        console.error(err);
        if (loader) loader.classList.add('hidden');
      });
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

        const previewImg = document.getElementById('previewGambar');
        const placeholderDiv = document.getElementById('placeholderGambar');
        const btnHapus = document.getElementById('btnHapusGambar');

        if (previewImg && placeholderDiv && btnHapus) {
          previewImg.src = selectedGambarBase64;
          previewImg.classList.remove('hidden');
          placeholderDiv.classList.add('hidden');
          btnHapus.classList.remove('hidden');
        }

        hitungSemua();
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
}

function hapusGambar() {
  selectedGambarBase64 = null;
  selectedGambarNama = null;
  currentGambarUrl = '';

  const inputGambar = document.getElementById('inputGambar');
  if (inputGambar) inputGambar.value = '';

  const previewImg = document.getElementById('previewGambar');
  const placeholderDiv = document.getElementById('placeholderGambar');
  const btnHapus = document.getElementById('btnHapusGambar');

  if (previewImg && placeholderDiv && btnHapus) {
    previewImg.src = '';
    previewImg.classList.add('hidden');
    placeholderDiv.classList.remove('hidden');
    btnHapus.classList.add('hidden');
  }

  hitungSemua();
}
