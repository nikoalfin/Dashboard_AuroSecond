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
    tarikDataDariSheet();
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
                listStokMotor = data;
                
                // Cek halaman mana yang aktif
                if (document.getElementById('pageBeranda')) {
                    renderBeranda();
                    document.getElementById('pageBeranda').classList.remove('hidden');
                } else if (document.getElementById('pageDetail')) {
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
    let ready = 0,
        terjual = 0;

    listStokMotor.forEach((motor) => {
        if (motor.status === 'Ready') ready++;
        else terjual++;

        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer transform hover:-translate-y-0.5';
        
        // BUG FIX: Pindah halaman dengan window.location.href secara langsung pada event click, ini juga menangani string id yang aneh dengan aman
        card.addEventListener('click', () => {
            window.location.href = `detail.html?id=${encodeURIComponent(motor.id)}`;
        });

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-base font-bold text-gray-800 capitalize">${motor.nama}</h3>
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${motor.status === 'Ready' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}">${motor.status}</span>
                </div>
                <p class="text-xs text-gray-400 mb-4">Tgl Beli: ${motor.tglBeli || '-'}</p>
            </div>
            <div class="border-t border-gray-100 pt-3 flex justify-between items-center text-xs text-gray-600 font-medium">
                <span>Total Ops:</span><span class="font-bold text-gray-800">Rp ${(motor.totalPengeluaran || 0).toLocaleString('id-ID')}</span>
            </div>
        `;
        grid.appendChild(card);
    });

    const cTotal = document.getElementById('countTotal');
    const cReady = document.getElementById('countReady');
    const cTerjual = document.getElementById('countTerjual');
    
    if(cTotal) cTotal.innerText = listStokMotor.length;
    if(cReady) cReady.innerText = ready;
    if(cTerjual) cTerjual.innerText = terjual;
}

function bukaDetailMotor(id) {
    idMotorAktif = id;
    const motor = listStokMotor.find((x) => String(x.id) === String(id));
    if (!motor) {
        alert("Data motor tidak ditemukan!");
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('detailNamaMotorDisplay').innerText = motor.nama;
    document.getElementById('detailStatusSelect').value = motor.status;
    document.getElementById('tglBeli').value = motor.tglBeli || '';
    document.getElementById('tglLaku').value = motor.tglLaku || '';
    document.getElementById('modalNiko').value = (motor.modalNiko || 0).toLocaleString('id-ID');
    document.getElementById('modalFikri').value = (motor.modalFikri || 0).toLocaleString('id-ID');
    document.getElementById('hargaPenjualan').value = (motor.penjualan || 0).toLocaleString('id-ID');

    const tbody = document.getElementById('bodyPengeluaran');
    if(tbody) tbody.innerHTML = '';
    if (motor.pengeluaran) {
        motor.pengeluaran.forEach((x) => tambahBarisPengeluaran(x.ket, x.item, false));
    }
    hitungSemua();
}

function kembaliKeBeranda() {
    window.location.href = 'index.html';
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
    }).then(() => {
        window.location.href = `detail.html?id=${newId}`;
    }).catch(err => {
        alert("Gagal menambahkan motor ke cloud");
        btnSimpan.innerText = oldText;
        btnSimpan.disabled = false;
    });
}

function bukaModalTambah() {
    const modal = document.getElementById('modalTambah');
    if(modal) modal.classList.remove('hidden');
}
function tutupModalTambah() {
    const modal = document.getElementById('modalTambah');
    if(modal) modal.classList.add('hidden');
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
    if(!tbody) return;
    
    const index = tbody.rows.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td class="p-3 text-center text-sm text-gray-400 index-number font-medium">${index}</td>
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
    if(!tbody) return;
    tbody.querySelectorAll('tr').forEach((tr, i) => {
        tr.querySelector('.index-number').innerText = i + 1;
    });
}

function hitungSemua() {
    const mNikoElem = document.getElementById('modalNiko');
    if(!mNikoElem) return; // if not on detail page, abort calculation

    const mNiko = getCleanNumber(mNikoElem.value);
    const mFikri = getCleanNumber(document.getElementById('modalFikri').value);
    const penjualan = getCleanNumber(document.getElementById('hargaPenjualan').value);

    let totalPengeluaran = 0;
    const tbody = document.getElementById('bodyPengeluaran');
    if(tbody) {
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
    if(tbody) {
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

    if(btnSimpan) {
        btnSimpan.disabled = true;
        btnSimpan.classList.add('opacity-60', 'cursor-not-allowed');
    }
    if(btnText) btnText.innerText = 'Mengirim data ke Cloud Sheets...';
    if(btnLoader) btnLoader.classList.remove('hidden');

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
            if(btnSimpan) {
                btnSimpan.disabled = false;
                btnSimpan.classList.remove('opacity-60', 'cursor-not-allowed');
            }
            if(btnText) btnText.innerText = '🚀 Sinkronisasikan Data ke Google Sheets';
            if(btnLoader) btnLoader.classList.add('hidden');
        });
}

function tampilkanToast(pesan) {
    const toast = document.getElementById('customToast');
    const toastMsg = document.getElementById('toastMessage');
    if(!toast || !toastMsg) return;

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
        if(!modal) { resolve(true); return; } // if modal not found, just confirm

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

        function onCancel() { tutupModal(false); }
        function onConfirm() { tutupModal(true); }

        btnCancel.addEventListener('click', onCancel);
        btnAction.addEventListener('click', onConfirm);
    });
}
