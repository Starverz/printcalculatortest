/**
 * modules/quotePad.js
 * Quote Pad: add/edit/remove items, save/load/export quotes.
 *
 * Uses init(ctx) pattern — call init(ctx) once at bootstrap.
 * Depends on global: Sortable (CDN)
 */

let _ctx = null;

let quotePadItems = [];
let quotePadSortable = null;
let currentQuoteName = null;
let isQuotePadEditMode = true;

export function init(ctx) {
  _ctx = ctx;
}

// Accessors for app.js delegates
export function getQuotePadItems() { return quotePadItems; }
export function getCurrentQuoteName() { return currentQuoteName; }


// --- START: NEW UNIVERSAL FUNCTION (Module 36: DRY Principle) ---
export function addItemToQuotePad({ type, title, name, unitPrice, quantity, details }) {
  // 1. Centralized Tax Logic
  let finalTotal = unitPrice * quantity;
  if (_ctx.getIsTaxEnabled()) {
    finalTotal += finalTotal * (_ctx.getGlobalTaxPercent() / 100);
  }

  // 2. Ensure price string exists in details for static view
  if (!details.price) {
    details.price = `Total: ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(finalTotal)}`;
  }

  // 3. Create the standard object
  const newItem = {
    id: new Date().getTime(),
    type: type,
    title: title,
    name: name,
    price: unitPrice, // Always store Unit Price (Pre-tax)
    quantity: quantity,
    details: details
  };

  // 4. Push and Render
  quotePadItems.push(newItem);
  renderQuotePad();
  toggleQuotePad(true);

  // 5. Cleanup (Optional)
  const titleInput = document.getElementById('itemTitle');
  if (titleInput) titleInput.value = '';
}
// --- END: NEW UNIVERSAL FUNCTION ---

// --- START: Quote Pad Functions ---
export function openOrCloseQuotePad() {
  const slider = document.getElementById('quotePadSlider');
  // Check if the slider already has the 'visible' class
  const isVisible = slider.classList.contains('visible');
  // Call the existing toggle function with the opposite of the current state
  toggleQuotePad(!isVisible);
}

export function toggleQuotePad(show) {
  const slider = document.getElementById('quotePadSlider');
  if (show) {
    slider.classList.add('visible');
  } else {
    slider.classList.remove('visible');
  }
}
// --- START: NEW FUNCTION ---
export function toggleQuotePadView(isEdit) {
  isQuotePadEditMode = isEdit;
  renderQuotePad(); // Re-render the pad in the new mode
}
// --- END: NEW FUNCTION ---
export function addOpenItemToPad() {
  const newItem = {
    id: new Date().getTime(),
    type: 'open', // This is the new item type
    title: '', // <-- Set to empty string
    details: '', // <-- Set to empty string
    price: 0.00,
    quantity: 1
  };
  quotePadItems.push(newItem);
  renderQuotePad();
}

export function updateOpenItemField(id, field, value) {
  // Find the item in our array
  const item = quotePadItems.find(item => item.id === id);
  if (item) {
    // Update the specific field
    if (field === 'title') {
      item.title = value;
    } else if (field === 'details') {
      item.details = value;
    }
  }
  // Note: We don't re-render here, as the input field itself is holding the value.
  // This prevents the page from losing focus on the input.
}
// --- END: NEW FUNCTIONS FOR OPEN ITEMS ---
export function renderQuotePad() {
  const itemsContainer = document.getElementById('quotePadItems');
  const totalContainerEl = document.querySelector('.quote-pad-total');
  let total = 0.0;
  let totalQuantity = 0;
  itemsContainer.innerHTML = ''; // Clear it
  // --- START: NEW LOGIC ---
  // Update the active state of the view toggle buttons
  const editBtn = document.getElementById('quote-view-btn-edit');
  const staticBtn = document.getElementById('quote-view-btn-static');
  if (editBtn && staticBtn) {
    if (isQuotePadEditMode) {
      editBtn.classList.add('active');
      staticBtn.classList.remove('active');
    } else {
      editBtn.classList.remove('active');
      staticBtn.classList.add('active');
    }
  }
  if (currentQuoteName) {
    if (isQuotePadEditMode) {
        // Editable title in edit mode
        itemsContainer.innerHTML += `
            <input type="text" id="quote-title-input" value="${currentQuoteName}" 
                   onchange="updateQuoteName(this.value)"
                   style="
                       font-size: 1.1rem;
                       font-weight: 600;
                       color: var(--text-primary);
                       margin: 0 0 12px 0;
                       padding: 8px;
                       border: 2px solid var(--primary-color);
                       border-radius: 4px;
                       background-color: var(--content-bg);
                       width: calc(100% - 16px);
                   }">
        `;
    } else {
        // Static title in static view
        itemsContainer.innerHTML += `
            <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 12px 0;
                padding-bottom: 8px;
                border-bottom: 2px solid var(--border-color);
            ">${currentQuoteName}</h3>
        `;
    }
  }
  if (quotePadItems.length === 0) {
    itemsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Your quote pad is empty.</p>';
    itemsContainer.innerHTML += `
            <div style="padding: 10px 0;">
                <button class="btn btn-sm btn-secondary" style="width: 100%; margin-top: 0;" onclick="addOpenItemToPad()">
                    <i class="fas fa-plus mr-2"></i> Add Open Item
                </button>
            </div>`;
    totalContainerEl.innerHTML = `
            <strong>Total:</strong>
            <span id="quotePadTotal">${_ctx.getCurrentCurrency().symbol} 0.00</span>
        `;
    return;
  }
  quotePadItems.forEach((item, itemIndex) => {
    const lineSubTotal = item.price * item.quantity;
    let taxAmount = 0;
    let lineFinalTotal = lineSubTotal;
    if (_ctx.getIsTaxEnabled()) {
      taxAmount = lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
      lineFinalTotal += taxAmount;
    }
    const displayTitle = item.title && item.title.trim() !== '' ? item.title : (item.name || 'Item');
    let itemHTML = '';
    if (isQuotePadEditMode) {
      // --- RENDER THE EDITABLE VIEW ---
      let titleHTML = '';
      let detailsHTML = '';
      // RENDER EDITABLE TITLE for all items
      titleHTML = `
                <input type="text" value="${displayTitle}" 
                       onchange="updateQuoteItemTitle(${item.id}, this.value)" 
                       placeholder="Item Title"
                       style="font-size: 1.1em; font-weight: 700; width: 100%; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--content-bg); color: var(--text-primary); margin-bottom: 0;">
            `;
      if (item.type === 'open') {
        // RENDER EDITABLE DETAILS for "open" items
        detailsHTML = `
                    <textarea onchange="updateOpenItemField(${item.id}, 'details', this.value); autoResizeTextarea(this);" 
                              oninput="autoResizeTextarea(this)"
                              placeholder="Click to edit description..."
                              style="width: 100%; font-size: 0.9rem; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--content-bg); color: var(--text-secondary); resize: vertical; overflow: hidden; line-height: 1.4;">${item.details}</textarea>
                `;
        // Auto-resize after rendering
        setTimeout(() => {
          const textareas = itemsContainer.querySelectorAll('textarea');
          if (textareas.length > 0) autoResizeTextarea(textareas[textareas.length - 1]);
        }, 0);
      } else {
        // RENDER EDITABLE DETAILS for "calculator" and "stand" items
        const sizeValue = (item.details && item.details.size) ? item.details.size : '';
        const materialValue = (item.details && item.details.material) ? item.details.material : '';
        const finishingValue = (item.details && item.details.finishing) ? item.details.finishing : '';
        const combinedDetails = `${sizeValue}${materialValue ? '\n' + materialValue : ''}${finishingValue ? '\n' + finishingValue : ''}`;
        detailsHTML = `
                    <textarea onchange="updateQuoteItemCombinedDetails(${item.id}, this.value); autoResizeTextarea(this);" 
                              oninput="autoResizeTextarea(this)"
                              placeholder="Size, Material, Finishing..."
                              style="width: 100%; font-size: 0.9rem; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--content-bg); color: var(--text-secondary); resize: vertical; overflow: hidden; line-height: 1.4;">${combinedDetails}</textarea>
                `;
        // Auto-resize after rendering
        setTimeout(() => {
          const textareas = itemsContainer.querySelectorAll('textarea');
          if (textareas.length > 0) autoResizeTextarea(textareas[textareas.length - 1]);
        }, 0);
      }
      itemHTML = `
                <div class="quote-pad-item" data-id="${item.id}" data-index="${itemIndex}">
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div style="position: relative;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                            ${titleHTML}
                            <div class="item-action-btns">
                                <button class="item-action-btn" onclick="duplicateQuotePadItem(${item.id})" title="Duplicate item"><i class="fas fa-copy"></i></button>
                                <button class="item-action-btn btn-danger" onclick="removeFromPad(${item.id})" title="Remove item"><i class="fas fa-times"></i></button>
                            </div>
                        </div>
                        ${detailsHTML}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <label for="price-${item.id}" style="font-weight: 600; color: var(--text-secondary);">Unit Price:</label>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="color: var(--text-secondary);">${_ctx.getCurrentCurrency().symbol}</span>
                            <input type="number" id="price-${item.id}" value="${item.price.toFixed(2)}" 
                                   step="0.10" 
                                   onchange="updateQuoteItemPrice(${item.id}, this.value)"
                                   style="width: 80px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; text-align: right; background-color: var(--content-bg); color: var(--text-primary); -moz-appearance: textfield;">
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <label for="qty-${item.id}" style="font-weight: 600; color: var(--text-secondary);">Qty:</label>
                        <div style="display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden;">
                            <button onclick="adjustQuoteItemQuantity(${item.id}, -1)" 
                                    style="background-color: var(--light-bg); border: none; padding: 2px 8px; cursor: pointer; color: var(--text-primary); border-right: 1px solid var(--border-color); font-size: 1em; line-height: 1; user-select: none;">
                                &minus;
                            </button>
                            <input type="number" id="qty-${item.id}" value="${item.quantity}" min="1" 
                                   onchange="updateQuoteItemQuantity(${item.id}, this.value)"
                                   style="width: 45px; padding: 2px 0px; border: none; text-align: center; background-color: var(--content-bg); color: var(--text-primary); -moz-appearance: textfield; outline: none;">
                            <button onclick="adjustQuoteItemQuantity(${item.id}, 1)" 
                                    style="background-color: var(--light-bg); border: none; padding: 2px 8px; cursor: pointer; color: var(--text-primary); border-left: 1px solid var(--border-color); font-size: 1em; line-height: 1; user-select: none;">
                                &plus;
                            </button>
                        </div>
                    </div>

                    <div style="text-align: right; min-width: 120px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 600; color: var(--text-secondary); font-size: 0.9em;">Subtotal</span>
                            <span id="subtotal-val-${item.id}" style="font-weight: 600; color: var(--text-secondary); font-size: 0.9em;">${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineSubTotal)}</span>
                        </div>
                    ${_ctx.getIsTaxEnabled() ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                            <span style="font-weight: 600; color: var(--text-secondary); font-size: 0.9em;">Tax (${_ctx.getGlobalTaxPercent()}%)</span>
                            <span id="tax-val-${item.id}" style="font-weight: 600; color: var(--text-secondary); font-size: 0.9em;">+ ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(taxAmount)}</span>
                        </div>
                    ` : ''}
                    </div>
                </div>
                    </div>  </div>  `;
    } else {
      // --- RENDER THE NEW STATIC VIEW ---
      let detailsHTML = '';
      if (item.type === 'open') {
        if (item.details && item.details.trim() !== '') {
          detailsHTML = `<div class="quote-item-details" style="margin: 4px 0 8px 0;">${item.details.replace(/\n/g, '<br>')}</div>`;
        }
      } else {
        const finishingHTML = (item.details && item.details.finishing) ? `<div>${item.details.finishing}</div>` : '';
        detailsHTML = `
                    <div class="quote-item-details" style="margin: 4px 0 8px 0;">
                        <div>${item.details.size}</div>
                        <div>${item.details.material}</div>
                        ${finishingHTML}
                    </div>
                `;
      }
      itemHTML = `
                <div class="quote-pad-item" data-id="${item.id}" data-index="${itemIndex}" style="padding: 10px 12px 12px 3.5rem;">
                    <div class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div style="position: relative;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                  <strong style="margin-bottom: 0; flex: 1;">${displayTitle}</strong>
                  <div class="item-action-btns">
                    <button class="item-action-btn" onclick="duplicateQuotePadItem(${item.id})" title="Duplicate item"><i class="fas fa-copy"></i></button>
                    <button class="item-action-btn btn-danger" onclick="removeFromPad(${item.id})" title="Remove item"><i class="fas fa-times"></i></button>
                  </div>
                </div>
                    ${detailsHTML}
                    <div style="margin-top: 8px;">
                        <div style="font-weight: 600; color: var(--text-secondary);">Qty : ${item.quantity}</div>
                        <div style="font-weight: 600; color: var(--text-secondary);">Unit Price : ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(item.price)}</div>
                        <div style="font-weight: 600; color: var(--primary-color); margin-top: 4px;">Subtotal : ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(lineSubTotal)}${_ctx.getIsTaxEnabled() ? ` + Tax ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(taxAmount)} = ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(lineFinalTotal)}` : ''}</div>
                    </div>
                    </div>
                </div>
            `;
    }
    itemsContainer.innerHTML += itemHTML;
    total += lineFinalTotal;
    totalQuantity += item.quantity;
  });
  // --- END: Main Change ---
  // Add "Open Item" button for non-empty state
  itemsContainer.innerHTML += `
        <div style="padding: 10px 0; border-top: 1px dashed var(--border-color); margin-top: 10px;">
            <button class="btn btn-sm btn-secondary" style="width: 100%; margin-top: 0;" onclick="addOpenItemToPad()">
                <i class="fas fa-plus mr-2"></i> Add Open Item
            </button>
        </div>`;
  totalContainerEl.innerHTML = `
        <strong style="font-weight: 600; color: var(--text-secondary);">Qty : ${totalQuantity}pcs</strong>
        <strong style="font-size: 1.2rem;">Total : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(total)}</strong>
    `;
  // Auto-resize all textareas after rendering
  setTimeout(() => {
    const textareas = itemsContainer.querySelectorAll('textarea');
    textareas.forEach(textarea => autoResizeTextarea(textarea));
  }, 0);
  // Initialize drag-and-drop reordering
  initQuotePadSortable();
}

export function initQuotePadSortable() {
  const itemsContainer = document.getElementById('quotePadItems');
  if (!itemsContainer) return;
  // Destroy previous instance if it exists
  if (quotePadSortable) {
    quotePadSortable.destroy();
  }
  // Only initialize if there are items to sort
  const items = itemsContainer.querySelectorAll('.quote-pad-item');
  if (items.length === 0) return;
  quotePadSortable = new Sortable(itemsContainer, {
    animation: 200,
    handle: '.drag-handle', // Only drag by the handle
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    forceFallback: true, // Better mobile support
    fallbackTolerance: 3, // Touch sensitivity
    touchStartThreshold: 5, // Prevent accidental drags
    delay: 100, // Slight delay helps distinguish drag from tap on mobile
    delayOnTouchOnly: true, // Only apply delay on touch devices
    onEnd: function (evt) {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;
      if (oldIndex === newIndex) return; // No change
      // Reorder the array
      const [movedItem] = quotePadItems.splice(oldIndex, 1);
      quotePadItems.splice(newIndex, 0, movedItem);
      // Re-render to update totals and maintain state
      // renderQuotePad(); // <-- REMOVED THIS LINE
      // Show feedback
      _ctx.showToast(`Item moved from position ${oldIndex + 1} to ${newIndex + 1}`, 'success');
    }
  });
}

export function updateGrandTotalDisplay() {
  let total = 0;
  let totalQuantity = 0;
  quotePadItems.forEach(item => {
    const lineSubTotal = item.price * item.quantity;
    let lineFinalTotal = lineSubTotal;
    if (_ctx.getIsTaxEnabled()) lineFinalTotal += lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
    total += lineFinalTotal;
    totalQuantity += item.quantity;
  });
  const totalContainerEl = document.querySelector('.quote-pad-total');
  if (totalContainerEl) {
    totalContainerEl.innerHTML = `
      <strong style="font-weight: 600; color: var(--text-secondary);">Qty : ${totalQuantity}pcs</strong>
      <strong style="font-size: 1.2rem;">Total : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(total)}</strong>
    `;
  }
}

export function adjustQuoteItemQuantity(id, delta) {
  const item = quotePadItems.find(item => item.id === id);
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty < 1) return;
  item.quantity = newQty;
  const qtyInput = document.getElementById(`qty-${id}`);
  if (qtyInput) qtyInput.value = newQty;
  const lineSubTotal = item.price * newQty;
  let taxAmount = 0;
  if (_ctx.getIsTaxEnabled()) taxAmount = lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
  const subtotalVal = document.getElementById(`subtotal-val-${id}`);
  if (subtotalVal) subtotalVal.textContent = `${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineSubTotal)}`;
  const taxVal = document.getElementById(`tax-val-${id}`);
  if (taxVal) taxVal.textContent = `+ ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(taxAmount)}`;
  updateGrandTotalDisplay();
}

export function updateQuoteItemPrice(id, newPrice) {
  const price = parseFloat(newPrice);
  const item = quotePadItems.find(item => item.id === id);
  if (price >= 0 && item) {
    item.price = price;
    const lineSubTotal = price * item.quantity;
    let taxAmount = 0;
    if (_ctx.getIsTaxEnabled()) taxAmount = lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
    const subtotalVal = document.getElementById(`subtotal-val-${id}`);
    if (subtotalVal) subtotalVal.textContent = `${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineSubTotal)}`;
    const taxVal = document.getElementById(`tax-val-${id}`);
    if (taxVal) taxVal.textContent = `+ ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(taxAmount)}`;
    updateGrandTotalDisplay();
  }
}

export function updateQuoteItemQuantity(id, newQuantity) {
  const qty = parseInt(newQuantity);
  const item = quotePadItems.find(item => item.id === id);
  if (qty > 0 && item) {
    item.quantity = qty;
    const lineSubTotal = item.price * qty;
    let taxAmount = 0;
    if (_ctx.getIsTaxEnabled()) taxAmount = lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
    const subtotalVal = document.getElementById(`subtotal-val-${id}`);
    if (subtotalVal) subtotalVal.textContent = `${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineSubTotal)}`;
    const taxVal = document.getElementById(`tax-val-${id}`);
    if (taxVal) taxVal.textContent = `+ ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(taxAmount)}`;
    updateGrandTotalDisplay();
  }
}

export function autoResizeTextarea(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = (element.scrollHeight) + 'px';
}

export function updateQuoteName(newName) {
  if (newName && newName.trim() !== '') {
    currentQuoteName = newName.trim();
    renderQuotePad(); // Re-render to update the display
  }
}

export function updateQuoteItemTitle(id, newTitle) {
  const item = quotePadItems.find(item => item.id === id);
  if (item && newTitle && newTitle.trim() !== '') {
    item.title = newTitle.trim();
    renderQuotePad(); // Re-render to update the display
  }
}

export function updateQuoteItemDetail(id, field, value) {
  const item = quotePadItems.find(item => item.id === id);
  if (item && item.details && typeof item.details === 'object') {
    item.details[field] = value;
    renderQuotePad(); // Re-render to update the display
  }
}

export function updateQuoteItemCombinedDetails(id, combinedValue) {
  const item = quotePadItems.find(item => item.id === id);
  if (item && item.details && typeof item.details === 'object') {
    const lines = combinedValue.split('\n').map(line => line.trim()).filter(line => line);
    // Parse the lines and assign them to the respective fields
    item.details.size = lines[0] || '';
    item.details.material = lines[1] || '';
    item.details.finishing = lines[2] || '';
    renderQuotePad(); // Re-render to update the display
  }
}

export function duplicateQuotePadItem(id) {
  const original = quotePadItems.find(item => item.id === id);
  if (!original) return;
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = Date.now();
  const originalIndex = quotePadItems.findIndex(item => item.id === id);
  quotePadItems.splice(originalIndex + 1, 0, copy);
  renderQuotePad();
  _ctx.showToast('Item duplicated.', 'success');
}

export function removeFromPad(id) {
  // Find the item's index using its unique ID
  const indexToRemove = quotePadItems.findIndex(item => item.id === id);
  if (indexToRemove > -1) {
    quotePadItems.splice(indexToRemove, 1);
  }
  renderQuotePad();
  // If the pad is now empty, hide it
  if (quotePadItems.length === 0) {
    setTimeout(() => toggleQuotePad(false), 500);
  }
}

export function clearPad() {
  _ctx.showDeleteConfirmationModal(
    "Clear Quote Pad?",
    "Are you sure you want to clear all items from the pad?",
    () => {
      quotePadItems = [];
      currentQuoteName = null;
      renderQuotePad();
      setTimeout(() => toggleQuotePad(false), 500);
      _ctx.showToast("Quote pad cleared.");
    }
  );
}

export function copyAllFromPad() {
  let combinedText = "";
  let grandTotal = 0;
  let totalQuantity = 0;
  // Check if a quote name is saved and add it to the top
  if (currentQuoteName && currentQuoteName.trim() !== '') {
    combinedText += `${currentQuoteName.trim()}\n\n`; // Add the name and two newlines
  }
  quotePadItems.forEach(item => {
    const displayTitle = item.title && item.title.trim() !== '' ? item.title : item.name;
    // 1. Get pre-tax prices
    const unitSubTotal = item.price;
    const lineSubTotal = item.price * item.quantity;
    // 2. Calculate tax and final total
    let taxAmount = 0;
    let lineFinalTotal = lineSubTotal;
    if (_ctx.getIsTaxEnabled()) {
      taxAmount = lineSubTotal * (_ctx.getGlobalTaxPercent() / 100);
      lineFinalTotal += taxAmount;
    }
    // 3. Build text block
    // Skip open items with no title and no details
    if (item.type === 'open') {
      const hasTitle = item.title && item.title.trim() !== '' && item.title.trim() !== 'Item';
      const hasDetails = item.details && item.details.trim() !== '';
      if (!hasTitle && !hasDetails) return; // skip this item entirely
    }
    combinedText += `${displayTitle}\n`;
    if (item.type === 'open') {
      if (item.details && item.details.trim() !== '') {
        combinedText += `${item.details}\n`;
      }
    } else if (item.details) { // Check if item.details exists
      if (item.details.size) combinedText += `${item.details.size}\n`;
      if (item.details.material) combinedText += `${item.details.material}\n`;
      if (item.details.finishing) combinedText += `${item.details.finishing}\n`;
    }
    combinedText += `Qty : ${item.quantity}\n`;
    // --- START: MODIFIED LOGIC ---
    // Conditionally set the label for the unit price based on whether tax is enabled
    const unitPriceLabel = _ctx.getIsTaxEnabled() ? "Unit Price (pre-tax)" : "Unit Price";
    combinedText += `${unitPriceLabel} : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(unitSubTotal)}\n`;
    // --- END: MODIFIED LOGIC ---
    if (item.quantity > 1) {
      combinedText += `Subtotal : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineSubTotal)}\n`;
    }
    if (_ctx.getIsTaxEnabled()) {
      combinedText += `Tax (${_ctx.getGlobalTaxPercent()}%) : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(taxAmount)}\n`;
      combinedText += `Total : ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(lineFinalTotal)}\n`;
    }
    combinedText += `\n`; // Add one newline for spacing before the next item
    // 4. Add to grand totals
    grandTotal += lineFinalTotal;
    totalQuantity += item.quantity;
  });
  // Add the final total at the very end
  combinedText += `---------------------\n`;
  combinedText += `TOTAL QTY (All Items): ${totalQuantity}pcs\n`;
  combinedText += `GRAND TOTAL (All Options): ${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(grandTotal)}`;
  navigator.clipboard.writeText(combinedText.trim()).then(() => {
    _ctx.showToast('âœ“ Quote Pad copied!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}
// --- START: NEW SAVE/LOAD QUOTE FUNCTIONS ---
export function getQuoteSummary(quoteItems) {
  let total = 0;
  let totalQty = 0;
  if (!quoteItems || quoteItems.length === 0) {
    return {
      total: 0,
      totalQty: 0
    };
  }
  quoteItems.forEach(item => {
    total += (item.price || 0) * (item.quantity || 1);
    totalQty += (item.quantity || 1);
  });
  return {
    total,
    totalQty
  };
}

export function saveQuote() {
  if (quotePadItems.length === 0) {
    alert("Your quote pad is empty. Add some items first!");
    return;
  }
  let quoteName;
  let isOverwrite = false;
  if (currentQuoteName) {
    _ctx.showDeleteConfirmationModal(
      "Overwrite Quote?",
      `This will overwrite your saved quote: "${currentQuoteName}".\n\nIs that okay?`,
      () => {
        quoteName = currentQuoteName;
        isOverwrite = true;
        executeSaveQuote(quoteName, isOverwrite);
      }
    );
    return;
  } else {
    quoteName = prompt("Enter a name for this new quote (e.g., 'Cultural Village'):");
    if (!quoteName || quoteName.trim() === "") {
      return;
    }
  }

  let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
  if (!isOverwrite && savedQuotes[quoteName]) {
    _ctx.showDeleteConfirmationModal(
      "Overwrite Quote?",
      `A quote named "${quoteName}" already exists. Do you want to overwrite it?`,
      () => {
        executeSaveQuote(quoteName, isOverwrite);
      }
    );
    return;
  }

  executeSaveQuote(quoteName, isOverwrite);

  function executeSaveQuote(quoteName, isOverwrite) {
    try {
      let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};

      // 1. Get the summary ONCE during save.
      const {
        total,
        totalQty
      } = getQuoteSummary(quotePadItems);

      // 2. Create the new quote object
      const quoteToSave = {
        name: quoteName,
        savedAt: new Date().toISOString(),
        summary: {
          total: total,
          totalQty: totalQty
        },
        items: quotePadItems
      };

      // 3. Save this new object instead of just the items
      savedQuotes[quoteName] = quoteToSave;
      localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
      currentQuoteName = quoteName;
      renderQuotePad();

      _ctx.showToast(isOverwrite ? `Quote "${quoteName}" updated successfully!` : `Quote saved as "${quoteName}"!`);
    } catch (e) {
      console.error("Error saving quote:", e);
      _ctx.showToast("An error occurred while saving your quote. Your browser's storage might be full.");
    }
  }
}
// --- MODIFIED: Function now accepts a sort parameter ---
export function renderLoadQuotePage(container, currentSort = 'date_desc') {
  let sortDropdownHTML = `
    <div class="mb-4 max-w-lg mx-auto">
      <label for="quoteSort" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort by</label>
      <select id="quoteSort" 
              onchange="renderLoadQuotePage(document.getElementById('contentArea'), this.value)"
              class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm 
                     focus:ring-blue-500 focus:border-blue-500 
                     dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        <option value="date_desc" ${currentSort === 'date_desc' ? 'selected' : ''}>Date Saved (Newest First)</option>
        <option value="date_asc" ${currentSort === 'date_asc' ? 'selected' : ''}>Date Saved (Oldest First)</option>
        <option value="name_asc" ${currentSort === 'name_asc' ? 'selected' : ''}>Name (A-Z)</option>
        <option value="name_desc" ${currentSort === 'name_desc' ? 'selected' : ''}>Name (Z-A)</option>
        <option value="total_desc" ${currentSort === 'total_desc' ? 'selected' : ''}>Total (High to Low)</option>
        <option value="total_asc" ${currentSort === 'total_asc' ? 'selected' : ''}>Total (Low to High)</option>
      </select>
    </div>
  `;
  let searchBarHTML = `
    <div class="mb-4 max-w-lg mx-auto">
      <label for="quoteSearch" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Search Saved Quotes</label>
      <input type="text" id="quoteSearch" onkeyup="filterSavedQuotes()" placeholder="Enter quote name..." 
             class="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm 
                    focus:ring-blue-500 focus:border-blue-500 
                    dark:bg-gray-700 dark:border-gray-600 dark:text-white">
    </div>
  `;
  let html = '<h2>Load Saved Quote</h2>';
  let savedQuotes = {};
  try {
    savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
  } catch (e) {
    console.error("Error parsing saved quotes:", e);
    localStorage.removeItem('savedQuotes');
  }
  const allQuotes = Object.values(savedQuotes);
  if (allQuotes.length === 0) {
    html += '<p style="margin-top: 16px; color: var(--text-secondary);">You have no saved quotes.</p>';
    // Also show the import button for an empty state
    html += `
      <div class="max-w-4xl mx-auto mt-6">
        <div class="flex gap-4 mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button class="btn btn-secondary" style="width: auto;" onclick="importQuotes()">
            <i class="fas fa-file-import mr-2"></i> Import Quotes
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400 my-auto">
            Have a backup file? Import your saved quotes here.
          </p>
                        </div>
                    </div>
    `;
    container.innerHTML = html;
  } else {
    // --- START: NEW SORTING LOGIC ---
    allQuotes.sort((a, b) => {
      // Ensure 'a' and 'b' are valid objects with fallbacks
      const aName = a.name || '';
      const bName = b.name || '';
      const aDate = a.savedAt || 0;
      const bDate = b.savedAt || 0;
      const aTotal = (a.summary && a.summary.total) || 0;
      const bTotal = (b.summary && b.summary.total) || 0;
      switch (currentSort) {
        case 'date_asc':
          return new Date(aDate) - new Date(bDate);
        case 'name_asc':
          return aName.localeCompare(bName);
        case 'name_desc':
          return bName.localeCompare(aName);
        case 'total_asc':
          return aTotal - bTotal;
        case 'total_desc':
          return bTotal - aTotal;
        case 'date_desc':
        default:
          return new Date(bDate) - new Date(aDate);
      }
    });
    // --- END: NEW SORTING LOGIC ---
    // Combine controls and the grid
    html += `
      <div class="max-w-4xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${searchBarHTML}
          ${sortDropdownHTML}
        </div>

        <div class="flex gap-4 mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button class="btn btn-secondary" style="width: auto;" onclick="exportQuotes()">
            <i class="fas fa-file-export mr-2"></i> Export All Quotes
          </button>
          <button class="btn btn-secondary" style="width: auto;" onclick="importQuotes()">
            <i class="fas fa-file-import mr-2"></i> Import Quotes
          </button>
          <p class="text-sm text-gray-600 dark:text-gray-400 my-auto">
            Save a backup of your quotes or move them to another computer.
          </p>
        </div>
        
        <div class="load-quote-grid" id="savedQuotesGrid" style="margin-top: 1.5rem;">
    `;
    allQuotes.forEach(quote => {
      // Check if the quote is in the new format. If not, provide fallbacks.
      const quoteName = quote.name || "Unnamed Quote";
      // This is the CRITICAL fix: We must handle both OLD and NEW data formats.
      let total, totalQty;
      if (quote.summary) {
        // New format
        totalQty = quote.summary.totalQty;
        total = quote.summary.total;
      } else {
        // Old format (fallback)
        const summary = getQuoteSummary(quote.items || quote); // 'quote' itself might be the items array
        totalQty = summary.totalQty;
        total = summary.total;
      }
      const savedDate = quote.savedAt ? _ctx.formatSavedDate(quote.savedAt) : 'Not dated';
      // --- START: MODIFIED CARD HTML ---
      html += `
        <div class="load-quote-card">
          <h4>${quoteName}</h4>
          <p>
            <strong>${totalQty}</strong> items<br>
            Total: <strong>${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(total)}</strong>
          </p>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px;">
            <i class="fas fa-calendar-alt mr-1"></i> ${savedDate}
          </p>
          
          <div class="load-quote-actions">
            <button class="btn-load" onclick="loadSelectedQuote('${quoteName}')"><i class="fas fa-folder-open mr-2"></i> Load</button>
            <button class="btn-preview" onclick="showQuotePreview('${quoteName}')"><i class="fas fa-eye mr-2"></i> Preview</button>
            <button class="btn-edit" onclick="duplicateSavedQuote('${quoteName}')"><i class="fas fa-copy mr-2"></i> Duplicate</button>
            <button class="btn-delete" onclick="deleteSavedQuote('${quoteName}')"><i class="fas fa-trash-alt mr-2"></i> Delete</button>
          </div>
          <button class="btn-edit" style="width: 100%; margin-top: 8px;" onclick="renameSavedQuote('${quoteName}')">
            <i class="fas fa-pencil-alt mr-2"></i> Rename
          </button>
        </div>
      `;
      // --- END: MODIFIED CARD HTML ---
    });
    html += '</div></div>'; // Close grid and wrapper
    container.innerHTML = html;
  }
}

export function loadSelectedQuote(quoteName) {
  try {
    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
    // Get the quote data
    const quoteToLoad = savedQuotes[quoteName];
    if (quoteToLoad) {
      // --- This is our "unsaved changes" check ---
      let isDirty = false;
      if (currentQuoteName) {
        const savedVersion = savedQuotes[currentQuoteName];
        // Check if the savedVersion is new format (has .items) or old (is array)
        const savedItems = savedVersion.items || savedVersion;
        if (JSON.stringify(savedItems) !== JSON.stringify(quotePadItems)) {
          isDirty = true; // The loaded quote has been changed!
        }
      } else if (quotePadItems.length > 0) {
        isDirty = true; // A new, unsaved quote is in the pad.
      }
      if (isDirty && !confirm("You have unsaved changes in your current quote. These changes will be lost.\n\nAre you sure you want to load a new quote?")) {
        return; // User cancelled
      }
      // --- End of check ---
      // --- MODIFIED: Load items from quoteToLoad.items OR quoteToLoad ---
      // This handles both old (array) and new (object) data formats
      quotePadItems = quoteToLoad.items || quoteToLoad;
      currentQuoteName = quoteName; // Set the name
      renderQuotePad(); // Render the pad
      toggleQuotePad(true); // Open the quote pad
    } else {
      alert("Could not find that quote. It may have been deleted.");
      // Refresh the list
      renderLoadQuotePage(document.getElementById('contentArea'));
    }
  } catch (e) {
    console.error("Error loading quote:", e);
    alert("An error occurred while loading your quote.");
  }
}

export function deleteSavedQuote(quoteName) {
  if (!confirm(`Are you sure you want to permanently delete the quote "${quoteName}"?`)) {
    return;
  }
  try {
    let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
    delete savedQuotes[quoteName];
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    // Refresh the current page to show the item is gone
    renderLoadQuotePage(document.getElementById('contentArea'));
  } catch (e) {
    console.error("Error deleting quote:", e);
    alert("An error occurred while deleting your quote.");
  }
}
// --- END: NEW SAVE/LOAD QUOTE FUNCTIONS ---
// --- END: Quote Pad Functions ---

/**
 * Filters the saved quote cards based on the search input.
 */
export function filterSavedQuotes() {
  const input = document.getElementById("quoteSearch");
  if (!input) return; // Guard clause in case the element doesn't exist
  const filter = input.value.toUpperCase();
  const grid = document.getElementById("savedQuotesGrid");
  if (!grid) return; // Guard clause
  const cards = grid.getElementsByClassName("load-quote-card");
  for (let i = 0; i < cards.length; i++) {
    const h4 = cards[i].getElementsByTagName("h4")[0];
    if (h4) {
      const txtValue = h4.textContent || h4.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        cards[i].style.display = "";
      } else {
        cards[i].style.display = "none";
      }
    }
  }
}
/**
 * Displays the Quote Preview modal with the contents of the selected quote.
 * This version handles BOTH old and new data formats.
 */
export function showQuotePreview(quoteName) {
  try {
    const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
    const quote = savedQuotes[quoteName];
    if (!quote) {
      alert("Error: Could not find quote to preview.");
      return;
    }
    const modal = document.getElementById('quotePreviewModal');
    const titleEl = document.getElementById('quotePreviewTitle');
    const bodyEl = document.getElementById('quotePreviewBody');
    const totalEl = document.getElementById('quotePreviewTotal');
    // --- Handle both data formats ---
    let items, total, quoteTitle;
    if (quote.items) {
      // NEW format (object)
      items = quote.items;
      total = quote.summary.total;
      quoteTitle = quote.name;
    } else {
      // OLD format (array)
      items = quote;
      const summary = getQuoteSummary(items);
      total = summary.total;
      quoteTitle = quoteName; // Use the key as the name
    }
    // --- End of format handling ---
    // Set modal title
    titleEl.innerText = `Preview: ${quoteTitle}`;
    // Set modal total
    totalEl.innerText = `${_ctx.getCurrentCurrency().symbol} ${_ctx.formatCurrency(total)}`;
    // Build and set modal content
    let itemsHTML = '';
    if (!items || items.length === 0) {
      itemsHTML = '<p>This quote has no items.</p>';
    } else {
      items.forEach(item => {
        const displayTitle = item.title && item.title.trim() !== '' ? item.title : (item.name || 'Item');
        const lineTotal = item.price * item.quantity;
        // --- START: MODIFIED PREVIEW LOGIC ---
        // Build detailsHTML conditionally, just like the static quote pad view
        let detailsHTML = '';
        let itemDetailsText = '';
        if (item.type === 'open') {
          // For 'open' items, only show details if they exist
          if (item.details && item.details.trim() !== '') {
            itemDetailsText = item.details;
          }
        } else if (item.details) {
          // For 'calculator' or 'stand' items, check each property
          if (item.details.size) itemDetailsText += `${item.details.size}\n`;
          if (item.details.material) itemDetailsText += `${item.details.material}\n`;
          if (item.details.finishing) itemDetailsText += `${item.details.finishing}\n`;
        }
        // Only create the <pre> tag if there is text to show
        if (itemDetailsText.trim() !== '') {
          detailsHTML = `<pre class="preview-item-details">${itemDetailsText.trim()}</pre>`;
        }
        // This is the new, cleaner structure, matching the static view
        itemsHTML += `
          <div class="preview-item">
            <strong class="preview-item-title">${displayTitle}</strong>
            
            ${detailsHTML} 
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 8px; margin-top: 8px;">
                <span style="font-weight: 600; color: var(--text-secondary);">
                    Qty: ${item.quantity} @ ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(item.price)}
                </span>
                <strong style="font-size: 1.1em; color: var(--primary-color);">
                    ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(lineTotal)}
                </strong>
            </div>
          </div>
        `;
        // --- END: MODIFIED PREVIEW LOGIC ---
      });
    }
    bodyEl.innerHTML = itemsHTML;
    // Show the modal
    modal.classList.add('flex');
    modal.classList.remove('hidden');
  } catch (e) {
    console.error("Error showing preview:", e);
    alert("An error occurred while trying to preview the quote.");
  }
}
/**
 * Closes the Quote Preview modal.
 */
export function closeQuotePreviewModal() {
  const modal = document.getElementById('quotePreviewModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  // Clear the body to prevent flash of old content
  document.getElementById('quotePreviewBody').innerHTML = '';
}
/**
 * Renames a saved quote.
 */
export function renameSavedQuote(oldName) {
  const newName = prompt(`Enter a new name for "${oldName}":`, oldName);
  if (!newName || newName.trim() === "" || newName === oldName) {
    return; // User cancelled or didn't change the name
  }
  try {
    let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
    if (savedQuotes[newName]) {
      alert(`Error: A quote with the name "${newName}" already exists.`);
      return;
    }
    // Get the quote data, update its name property, and save it under the new key
    const quoteData = savedQuotes[oldName];
    quoteData.name = newName;
    savedQuotes[newName] = quoteData;
    // Delete the old quote
    delete savedQuotes[oldName];
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    // If the renamed quote was the one currently loaded, update its name
    if (currentQuoteName === oldName) {
      currentQuoteName = newName;
      renderQuotePad(); // Update the quote pad title
    }
    // Refresh the "Load Quote" page to show the change
    const sortSelect = document.getElementById('quoteSort');
    const currentSort = sortSelect ? sortSelect.value : 'date_desc';
    renderLoadQuotePage(document.getElementById('contentArea'), currentSort);
  } catch (e) {
    console.error("Error renaming quote:", e);
    alert("An error occurred while renaming the quote.");
  }
}
/**
 * Duplicates a saved quote.
 */
export function duplicateSavedQuote(quoteName) {
  let newName = prompt(`Enter a name for the duplicated quote:`, `${quoteName} (Copy)`);
  if (!newName || newName.trim() === "") {
    return; // User cancelled
  }
  try {
    let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
    if (savedQuotes[newName]) {
      alert(`Error: A quote with the name "${newName}" already exists.`);
      return;
    }
    // Get the original quote data
    const originalQuote = savedQuotes[quoteName];
    // Create a new object for the copy (using JSON parse/stringify for a deep copy)
    const newQuote = JSON.parse(JSON.stringify(originalQuote));
    // Update the new quote's metadata
    newQuote.name = newName;
    newQuote.savedAt = new Date().toISOString(); // Give it a new save date
    // Save the new quote
    savedQuotes[newName] = newQuote;
    localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
    // Refresh the "Load Quote" page to show the new copy
    const sortSelect = document.getElementById('quoteSort');
    const currentSort = sortSelect ? sortSelect.value : 'date_desc';
    renderLoadQuotePage(document.getElementById('contentArea'), currentSort);
    alert(`Quote duplicated successfully as "${newName}"!`);
  } catch (e) {
    console.error("Error duplicating quote:", e);
    alert("An error occurred while duplicating the quote.");
  }
}
/**
 * Exports all saved quotes from localStorage to a JSON file.
 */
export function exportQuotes() {
  try {
    const savedQuotes = localStorage.getItem('savedQuotes') || "{}";
    if (Object.keys(JSON.parse(savedQuotes)).length === 0) {
      alert("You have no saved quotes to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(savedQuotes);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    downloadAnchorNode.setAttribute("download", `saved_quotes_backup_${timestamp}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    alert("All saved quotes have been exported!");
  } catch (e) {
    console.error("Error exporting quotes:", e);
    alert("An error occurred while exporting your quotes.");
  }
}
/**
 * Imports quotes from a JSON file and merges them with existing quotes.
 */
export function importQuotes() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = readerEvent => {
      try {
        const content = readerEvent.target.result;
        const importedQuotes = JSON.parse(content);
        if (typeof importedQuotes !== 'object' || importedQuotes === null) {
          throw new Error("Invalid file format. The file must be a valid JSON object.");
        }
        if (Object.keys(importedQuotes).length === 0) {
          alert("The selected file contains no quotes.");
          return;
        }
        if (!confirm("Are you sure you want to import quotes from this file? \n\nThis will merge them with your current quotes. If any imported quotes have the same name as an existing quote, the imported quote will overwrite your saved one.")) {
          return;
        }
        let savedQuotes = JSON.parse(localStorage.getItem('savedQuotes')) || {};
        let mergedQuotes = {
          ...savedQuotes,
          ...importedQuotes
        };
        let importCount = Object.keys(importedQuotes).length;
        localStorage.setItem('savedQuotes', JSON.stringify(mergedQuotes));
        alert(`Successfully imported and merged ${importCount} quote(s)!`);
        const sortSelect = document.getElementById('quoteSort');
        const currentSort = sortSelect ? sortSelect.value : 'date_desc';
        renderLoadQuotePage(document.getElementById('contentArea'), currentSort);
      } catch (error) {
        alert("Error importing file. Please ensure it is a valid quotes backup file.\n\n" + error);
      }
    }
  };
  input.click();
}
