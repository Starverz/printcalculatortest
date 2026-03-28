/**
 * modules/utils/canvas.js
 * Canvas / image-capture utilities.
 *
 * Depends on the global `html2canvas` library loaded in index.html.
 */

/**
 * Capture a DOM element as a JPG and trigger a download.
 *
 * @param {Event}  event       - The click event (used to reference/disable the button).
 * @param {string} containerId - ID of the element to capture.
 * @param {string} filename    - Download filename (should end in .jpg).
 */
export function downloadElementAsJPG(event, containerId, filename) {
  const container = document.getElementById(containerId);
  const downloadButton = event.currentTarget;

  if (!container) {
    console.error(`canvas.js: container "${containerId}" not found.`);
    return;
  }

  const originalButtonText = downloadButton.innerHTML;
  downloadButton.innerHTML = 'Generating...';
  downloadButton.disabled = true;

  /* global html2canvas */
  html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
  })
    .then(canvas => {
      const image = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = image;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    })
    .catch(err => {
      console.error('canvas.js: error generating image:', err);
    })
    .finally(() => {
      downloadButton.innerHTML = originalButtonText;
      downloadButton.disabled = false;
    });
}
