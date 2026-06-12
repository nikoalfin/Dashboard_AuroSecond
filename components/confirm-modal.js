document.addEventListener('DOMContentLoaded', () => {
  // Inject the custom confirm modal if not already present in the DOM
  if (!document.getElementById('customConfirmModal')) {
    const modalHTML = `
      <!-- MODAL KONFIRMASI HAPUS CUSTOM AUTO SECOND -->
      <div id="customConfirmModal"
        class="fixed inset-0 z-50 flex items-center justify-center opacity-0 pointer-events-none transition-all duration-200 ease-out">
        <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"></div>
        <div
          class="relative bg-white border border-gray-150 text-gray-800 w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl transform scale-95 transition-all duration-200">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500 mb-4">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-center text-lg font-bold text-gray-900">Hapus Pengeluaran?</h3>
          <p id="confirmModalMessage" class="text-center text-sm text-gray-500 mt-2 px-2">Apakah kamu yakin ingin menghapus
            pengeluaran ini? Tindakan ini tidak bisa dibatalkan.</p>
          <div class="flex gap-3 mt-6">
            <button id="btnCancelConfirm"
              class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl text-sm transition-all active:scale-98 cursor-pointer">Batal</button>
            <button id="btnActionConfirm"
              class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-lg shadow-red-600/15 active:scale-98 cursor-pointer">Ya,
              Hapus</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
});

function tampilkanKonfirmasi(pesan, judul = 'Konfirmasi') {
  return new Promise((resolve) => {
    const modal = document.getElementById('customConfirmModal');
    if (!modal) {
      resolve(true);
      return;
    }

    const modalBox = modal.querySelector('.relative');
    const msgElement = document.getElementById('confirmModalMessage');
    const titleElement = modal.querySelector('h3');
    const btnCancel = document.getElementById('btnCancelConfirm');
    const btnAction = document.getElementById('btnActionConfirm');

    if (pesan) msgElement.innerText = pesan;
    if (titleElement) titleElement.innerText = judul;

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
