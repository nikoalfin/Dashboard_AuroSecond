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

// CUSTOM SELECT DROPDOWN COMPONENT
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
    item.className = `w-full text-left px-4 py-2.5 text-sm transition-all cursor-pointer flex justify-between items-center ${isSelected
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

      // Panggil re-inisialisasi agar tanda centang (tick) terupdate
      konfigurasiCustomSelect(selectId);
    });

    panel.appendChild(item);
  });

  // Tampilkan / Sembunyikan panel kustom dropdown
  button.addEventListener('click', (e) => {
    e.stopPropagation();

    // Sembunyikan dropdown kustom lainnya yang sedang terbuka
    document.querySelectorAll('.custom-select-panel').forEach((otherPanel) => {
      if (otherPanel !== panel) otherPanel.classList.add('hidden');
    });
    document.querySelectorAll('.custom-select-arrow').forEach((otherArrow) => {
      if (otherArrow !== arrow) otherArrow.classList.remove('rotate-180');
    });

    panel.classList.toggle('hidden');
    arrow.classList.toggle('rotate-180');
  });
}

// Tutup semua dropdown panel bila mengklik di luar area dropdown kustom
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-panel').forEach((panel) => {
    panel.classList.add('hidden');
  });
  document.querySelectorAll('.custom-select-arrow').forEach((otherArrow) => {
    otherArrow.classList.remove('rotate-180');
  });
});
