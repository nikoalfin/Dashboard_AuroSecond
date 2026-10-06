/**
 * Komponen Reusable Header Sticky Aurosecond
 * Mendukung deklarasi via Web Component <app-header> atau pemanggilan fungsi renderAppHeader()
 */

class AppHeader extends HTMLElement {
  connectedCallback() {
    const backText = this.getAttribute('back-text') || 'Kembali';
    const backUrl = this.getAttribute('back-url') || '../index.html';
    const onBack = this.getAttribute('on-back') || '';
    const title = this.getAttribute('title') || '';
    const maxWidth = this.getAttribute('max-width') || 'max-w-6xl';

    const backButtonHTML = onBack
      ? `<button type="button" onclick="${onBack}" class="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer">
           <i class="fa-solid fa-arrow-left"></i> ${backText}
         </button>`
      : `<a href="${backUrl}" class="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer">
           <i class="fa-solid fa-arrow-left"></i> ${backText}
         </a>`;

    const titleHTML = title
      ? `<span class="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline-block">${title}</span>`
      : '';

    this.className = 'sticky top-0 z-40 block';
    this.innerHTML = `
      <header class="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3.5 mb-6 shadow-xs">
        <div class="${maxWidth} mx-auto flex items-center justify-between">
          ${backButtonHTML}
          ${titleHTML}
        </div>
      </header>
    `;
  }
}

if (!customElements.get('app-header')) {
  customElements.define('app-header', AppHeader);
}

/**
 * Fungsi helper opsional jika ingin generate header secara dinamis via JS
 */
function renderAppHeader(containerId, { backText, backUrl, onBack, title, maxWidth = 'max-w-6xl' }) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const backButtonHTML = onBack
    ? `<button type="button" onclick="${onBack}" class="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer">
         <i class="fa-solid fa-arrow-left"></i> ${backText || 'Kembali'}
       </button>`
    : `<a href="${backUrl || '../index.html'}" class="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer">
         <i class="fa-solid fa-arrow-left"></i> ${backText || 'Kembali'}
       </a>`;

  const titleHTML = title
    ? `<span class="text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:inline-block">${title}</span>`
    : '';

  container.className = 'sticky top-0 z-40 block';
  container.innerHTML = `
    <header class="bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 md:px-8 py-3.5 mb-6 shadow-xs">
      <div class="${maxWidth} mx-auto flex items-center justify-between">
        ${backButtonHTML}
        ${titleHTML}
      </div>
    </header>
  `;
}
