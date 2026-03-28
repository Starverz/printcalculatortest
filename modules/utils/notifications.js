/**
 * modules/utils/notifications.js
 * Toast notification utility.
 */

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = toast ? toast.querySelector('i') : null;

  if (toast && toastMessage) {
    const bgColor = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#E9D502' : '#007bff';
    const textColor = type === 'warning' ? '#000' : '#fff';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';

    toast.style.background = bgColor;
    toast.style.color = textColor;

    if (toastIcon) {
      toastIcon.className = `fas ${icon}`;
    }

    toastMessage.textContent = message;
    toast.classList.add('toast-show');

    const duration = type === 'warning' ? 4000 : type === 'error' ? 4000 : 2500;
    setTimeout(() => {
      toast.classList.remove('toast-show');
    }, duration);
  }
}
