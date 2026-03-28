export function copyTextareaValue(textareaId, { successMessage = '✓ Invoice copied!', showToast } = {}) {
  const textArea = document.getElementById(textareaId);
  if (!textArea) return;

  textArea.select();
  navigator.clipboard.writeText(textArea.value).then(() => {
    if (typeof showToast === 'function') {
      showToast(successMessage);
    }
  }).catch((error) => {
    console.error('Failed to copy text: ', error);
  });
}

export function openSyncedCompareModal({
  modalId,
  customerPanelId,
  agentPanelId,
  customerScrollId,
  agentScrollId,
  renderCustomer,
  renderAgent,
  onMissing,
}) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    if (typeof onMissing === 'function') {
      onMissing();
    }
    return;
  }

  const customerPanel = document.getElementById(customerPanelId);
  const agentPanel = document.getElementById(agentPanelId);
  const customerScroll = document.getElementById(customerScrollId);
  const agentScroll = document.getElementById(agentScrollId);

  if (customerPanel) {
    customerPanel.innerHTML = renderCustomer();
  }
  if (agentPanel) {
    agentPanel.innerHTML = renderAgent();
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (customerScroll && agentScroll) {
    customerScroll.onscroll = () => {
      agentScroll.scrollTop = customerScroll.scrollTop;
    };
    agentScroll.onscroll = () => {
      customerScroll.scrollTop = agentScroll.scrollTop;
    };
  }
}

export function closeCompareModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function saveSettingsScrolls() {
  const container = document.getElementById('settingsTableDiv');
  if (!container) return [];
  return Array.from(container.querySelectorAll('[style*="overflow-x"]')).map(el => el.scrollLeft);
}

export function restoreSettingsScrolls(positions) {
  if (!positions || !positions.length) return;
  const container = document.getElementById('settingsTableDiv');
  if (!container) return;
  const els = container.querySelectorAll('[style*="overflow-x"]');
  positions.forEach((pos, i) => { if (els[i]) els[i].scrollLeft = pos; });
}