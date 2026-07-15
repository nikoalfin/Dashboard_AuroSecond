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


