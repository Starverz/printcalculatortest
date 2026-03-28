// modules/calculators/stampSettings.js
// Stamp settings panel functions — extracted from app.js
// Uses init(ctx) pattern.

import { saveSettingsScrolls, restoreSettingsScrolls } from '../utils/ui.js';

let _ctx = null;
let _originalStampCategories = [];
let _colorPickerTarget = null;
let _originalStampsData = {};

export function initStampSettings(ctx) { _ctx = ctx; }

export function generateRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function openManageStampCategoriesModal() {
  _originalStampCategories = JSON.parse(JSON.stringify(_ctx.getStampCategories()));
  const list = document.getElementById('manageStampCategoriesList');
  list.innerHTML = '';
  _ctx.getStampCategories().forEach((cat, idx) => _appendStampCategoryRow(cat.name, cat.color, idx));
  const modal = document.getElementById('manageStampCategoriesModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeManageStampCategoriesModal() {
  const modal = document.getElementById('manageStampCategoriesModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function openColorPickerModal(targetElement, currentColor) {
  _colorPickerTarget = targetElement;
  const modal = document.getElementById('colorPickerModal');
  const colorInput = document.getElementById('colorPickerInput');
  const hexInput = document.getElementById('colorPickerHex');
  
  // Normalize color to hex
  let normalizedColor = currentColor;
  if (currentColor.startsWith('rgb')) {
    normalizedColor = rgbToHex(currentColor);
  }
  
  colorInput.value = normalizedColor;
  hexInput.value = normalizedColor;
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeColorPickerModal() {
  const modal = document.getElementById('colorPickerModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  _colorPickerTarget = null;
}

export function confirmColorPicker() {
  const hexInput = document.getElementById('colorPickerHex');
  let color = hexInput.value.trim();
  
  // Validate hex color
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    if (_colorPickerTarget) {
      _colorPickerTarget.style.backgroundColor = color;
    }
    closeColorPickerModal();
  } else {
    _ctx.showToast('Invalid hex color format');
  }
}

export function rgbToHex(rgb) {
  const rgbValues = rgb.match(/\d+/g);
  if (!rgbValues || rgbValues.length < 3) return '#3b82f6';
  
  const r = parseInt(rgbValues[0]).toString(16).padStart(2, '0');
  const g = parseInt(rgbValues[1]).toString(16).padStart(2, '0');
  const b = parseInt(rgbValues[2]).toString(16).padStart(2, '0');
  
  return '#' + r + g + b;
}

function _appendStampCategoryRow(name, color, idx) {
  const list = document.getElementById('manageStampCategoriesList');
  const row = document.createElement('div');
  row.className = 'manage-size-row flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700';
  row.innerHTML = `
          <div class="flex items-center gap-3 flex-1">
            <div class="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-500" 
                 style="background-color: ${color};" 
                 onclick="openColorPickerModal(this, '${color}')"
                 title="Click to change color">
            </div>
            <input type="text" value="${name}" placeholder="Category Name" class="flex-1 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors mr-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
          </div>
          <div class="flex items-center gap-2">
            <button onclick="moveStampCategoryRowUp(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-up text-xs"></i></button>
            <button onclick="moveStampCategoryRowDown(this)" class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"><i class="fas fa-arrow-down text-xs"></i></button>
            <button onclick="removeStampCategoryRow(this)" class="px-3 py-1.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg text-sm transition-colors ml-1">Remove</button>
          </div>`;
  list.appendChild(row);
}

export function addRowToManageStampCategories() {
  const list = document.getElementById('manageStampCategoriesList');
  const idx = list.children.length;
  _appendStampCategoryRow('New Category', generateRandomColor(), idx);
  list.lastElementChild.querySelector('input').focus();
}

export function moveStampCategoryRowUp(btn) {
  const row = btn.closest('.manage-size-row');
  const prev = row.previousElementSibling;
  if (prev) { row.parentNode.insertBefore(row, prev); _ctx.blinkRow(row); }
}

export function moveStampCategoryRowDown(btn) {
  const row = btn.closest('.manage-size-row');
  const next = row.nextElementSibling;
  if (next) { row.parentNode.insertBefore(next, row); _ctx.blinkRow(row); }
}

export function removeStampCategoryRow(btn) {
  btn.closest('.manage-size-row').remove();
}

export function redoManageStampCategories() {
  const list = document.getElementById('manageStampCategoriesList');
  list.innerHTML = '';
  _originalStampCategories.forEach((cat, idx) => _appendStampCategoryRow(cat.name, cat.color, idx));
}

export function saveManageStampCategories() {
  const rows = document.querySelectorAll('#manageStampCategoriesList .manage-size-row');
  const newCategories = [];
  rows.forEach(row => {
    const val = row.querySelector('input').value.trim();
    const colorBox = row.querySelector('.cursor-pointer');
    let color = colorBox ? colorBox.style.backgroundColor : generateRandomColor();
    
    // Convert RGB to hex if needed
    if (color.startsWith('rgb')) {
      color = rgbToHex(color);
    }
    
    if (val && !newCategories.find(c => c.name === val)) {
      newCategories.push({ name: val, color: color });
    }
  });
  if (newCategories.length === 0) { _ctx.showToast('At least one category is required.'); return; }

  // Add default stamp for new categories
  newCategories.forEach(cat => {
    const existingCat = _originalStampCategories.find(oc => oc.name === cat.name);
    if (!existingCat) {
      // This is a new category, add a default stamp
      _ctx.getStamps().push({
        name: 'New Stamp',
        width: 10,
        height: 10,
        customerPrice: 0.00,
        agentPrice: 0.00,
        shape: 'rect',
        category: cat.name,
        img: ''
      });
    }
  });

  // Show confirmation modal
  window._pendingStampCategories = newCategories;
  _ctx.setPendingCallback(() => _confirmSave_saveStampCategories('categories', null));
}

function _confirmSave_saveStampCategories(section, index) {
  _ctx.setStampCategories(window._pendingStampCategories);
  delete window._pendingStampCategories;
  
  _ctx.closeSaveConfirmationModal();
  closeManageStampCategoriesModal();
  _ctx.showToast('Stamp categories updated successfully.');
  _ctx.updateSettingsTable();
}

export function renderStampSettingsTable() {
  console.log('Rendering Stamp Settings Table');
  let html = '';
  
  // Header with Manage Categories button
  html += `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h4 style="margin:0 0 4px 0;">Stamp Categories</h4>
        <p style="margin:0; font-size: 13px; color: #9ca3af;">Manage stamp categories and their base prices.</p>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:11px; color:#9ca3af; font-weight:600; letter-spacing:0.05em;">CATEGORIES:</span>
        <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="openManageStampCategoriesModal()">Manage Categories</button>
      </div>
    </div>`;

  // Initialize edit state if not exists
  // Add any new categories to edit state
  _ctx.getStampCategories().forEach((cat, idx) => {
    if (_ctx.getEditState()[cat.name] === undefined) {
      _ctx.getEditState()[cat.name] = false;
    }
  });

  // Build categories from stamps data
  const categoriesInUse = {};
  _ctx.getStamps().forEach((stamp, stampIdx) => {
    if (!categoriesInUse[stamp.category]) {
      categoriesInUse[stamp.category] = [];
    }
    categoriesInUse[stamp.category].push({ ...stamp, originalIndex: stampIdx });
  });

  // Render each category
  _ctx.getStampCategories().forEach((cat, catIdx) => {
    const catStamps = categoriesInUse[cat.name] || [];
    // Render category even if empty so user can add stamps to it
    // if (catStamps.length === 0) return;
    
    const isEditing = _ctx.getEditState()[cat.name];
    let catColor = cat.color || '#' + Math.floor(Math.random()*16777215).toString(16);
    
    // Convert hex to RGB for opacity if needed
    let bgColor = catColor;
    if (catColor.startsWith('#')) {
      const r = parseInt(catColor.slice(1, 3), 16);
      const g = parseInt(catColor.slice(3, 5), 16);
      const b = parseInt(catColor.slice(5, 7), 16);
      bgColor = `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    
    html += `
      <div style="margin-bottom: 24px; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
        <div style="background-color: ${bgColor}; padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h5 style="margin:0; font-weight: 600; color: ${catColor};">${cat.name}</h5>
          <div style="display:flex; gap:8px;">
            ${isEditing ? `
              <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width: auto; margin-top:0;" onclick="addStampToCategory('${cat.name}')">+ Add Stamp</button>
              <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px; width: auto; margin-top:0;" onclick="cancelStampCategoryEdit('${cat.name}')">Cancel</button>
              <button class="btn btn-sm btn-primary" style="width: auto; margin-top:0; padding: 8px 14px; font-size: 13px;" onclick="saveStampCategory('${cat.name}')">Done</button>
            ` : `
              <button class="btn btn-sm btn-secondary" style="padding: 8px 14px; font-size: 13px;" onclick="toggleStampCategoryEdit('${cat.name}', true)">Edit</button>
            `}
          </div>
        </div>
        <div style="overflow-x: auto;">
          <table class="settings-table" style="min-width: 700px; width: 100%; table-layout: fixed;">
            <thead>
              <tr>
                <th style="width: 28%;">Model Name</th>
                <th style="width: 14%;">Size (mm)</th>
                <th style="width: 14%;">Shape</th>
                <th style="width: 14%;">Customer Price</th>
                <th style="width: 14%;">Agent Price</th>
                ${isEditing ? '<th style="width: 16%;">Actions</th>' : ''}
              </tr>
            </thead>
            <tbody>`;
    
    catStamps.forEach((stamp, stampIdx) => {
      // Display logic: if round show ⌀, if square just size without x, if rect show x
      let displayWidth = '';
      if (stamp.shape === 'round') {
        displayWidth = `${stamp.width}mm ⌀`;
      } else if (stamp.shape === 'square') {
        displayWidth = `${stamp.width}mm`;
      } else {
        displayWidth = `${stamp.width} x ${stamp.height}`;
      }
      
      if (isEditing) {
        const currentShape = stamp.shape || 'rect';
        html += `
                <tr data-stamp-row="${encodeURIComponent(cat.name)}-${stampIdx}">
                  <td style="padding: 4px;"><input type="text" value="${stamp.name}" data-stamp-index="${stamp.originalIndex}" data-field="name" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align:center;"></td>
                  <td style="padding: 4px;">
                    <div style="display: flex; gap: 4px; align-items: center; justify-content: center; width: 100%;">
                      <input type="number" value="${stamp.width}" data-stamp-index="${stamp.originalIndex}" data-field="width" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%; min-width: 0; box-sizing: border-box; text-align: center;"> x 
                      <input type="number" value="${stamp.height}" data-stamp-index="${stamp.originalIndex}" data-field="height" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px; width: 100%; min-width: 0; box-sizing: border-box; text-align: center;">
                    </div>
                  </td>
                  <td style="padding: 4px;">
                    <div class="custom-sticker-dropdown" id="stampShapeWrapper-${stamp.originalIndex}" data-floating="true" onclick="toggleGenericStickerDropdown(event, 'stampShapeWrapper-${stamp.originalIndex}')">
                      <div class="custom-sticker-dropdown-trigger">
                        <span class="custom-sticker-dropdown-label">${currentShape === 'rect' ? 'Rectangle' : currentShape === 'square' ? 'Square' : 'Round'}</span>
                        <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </div>
                      <div class="custom-sticker-dropdown-options">
                        <div class="custom-sticker-dropdown-option ${currentShape === 'rect' ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('stampShape-${stamp.originalIndex}', 'stampShapeWrapper-${stamp.originalIndex}', 'rect', '')">Rectangle</div>
                        <div class="custom-sticker-dropdown-option ${currentShape === 'square' ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('stampShape-${stamp.originalIndex}', 'stampShapeWrapper-${stamp.originalIndex}', 'square', '')">Square</div>
                        <div class="custom-sticker-dropdown-option ${currentShape === 'round' ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('stampShape-${stamp.originalIndex}', 'stampShapeWrapper-${stamp.originalIndex}', 'round', '')">Round</div>
                      </div>
                      <select id="stampShape-${stamp.originalIndex}" data-stamp-index="${stamp.originalIndex}" data-field="shape" class="hidden-native-select" style="display:none;">
                        <option value="rect" ${currentShape === 'rect' ? 'selected' : ''}>Rectangle</option>
                        <option value="square" ${currentShape === 'square' ? 'selected' : ''}>Square</option>
                        <option value="round" ${currentShape === 'round' ? 'selected' : ''}>Round</option>
                      </select>
                    </div>
                  </td>
                  <td style="padding: 4px;"><input type="number" step="0.01" value="${stamp.customerPrice.toFixed(2)}" data-stamp-index="${stamp.originalIndex}" data-field="customerPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>
                  <td style="padding: 4px;"><input type="number" step="0.01" value="${stamp.agentPrice.toFixed(2)}" data-stamp-index="${stamp.originalIndex}" data-field="agentPrice" class="form-control" style="background-color: #374151; border: 1px solid #4b5563; color: white; border-radius: 6px; padding: 8px 10px; width: 100%; box-sizing: border-box; text-align: center;"></td>
                  <td style="padding:4px; white-space:nowrap; vertical-align: middle;">
                    <div style="display: flex; justify-content: center; align-items: center; gap: 4px; width: 100%; height: 100%;">
                      <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveStampUp('${cat.name}', ${stampIdx})"><i class="fas fa-arrow-up"></i></button>
                      <button class="btn btn-sm btn-secondary" style="padding:7px 10px; border-radius:6px; background-color:#374151; border:1px solid #4b5563; color:white;" onclick="moveStampDown('${cat.name}', ${stampIdx})"><i class="fas fa-arrow-down"></i></button>
                      <button class="btn btn-sm btn-danger" style="padding:7px 10px; border-radius:6px;" onclick="deleteStamp('${cat.name}', ${stampIdx})"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>`;
      } else {
        const displayShape = (stamp.shape === 'rect' ? 'Rectangle' : stamp.shape === 'square' ? 'Square' : stamp.shape === 'round' ? 'Round' : 'Rectangle');
        html += `
                <tr data-stamp-row="${encodeURIComponent(cat.name)}-${stampIdx}">
                  <td style="width: 30%;"><strong>${stamp.name}</strong></td>
                  <td style="width: 15%;">${displayWidth}</td>
                  <td style="width: 15%;">${displayShape}</td>
                  <td style="width: 20%; text-align: center;">${_ctx.formatCurrency(stamp.customerPrice)}</td>
                  <td style="width: 20%; text-align: center;">${_ctx.formatCurrency(stamp.agentPrice)}</td>
                </tr>`;
      }
    });
    
    if (catStamps.length === 0) {
      html += `
                <tr>
                  <td colspan="${isEditing ? '6' : '5'}" style="text-align: center; padding: 20px; color: #9ca3af;">
                    ${isEditing ? 'Click "+ Add Stamp" to add stamps to this category' : 'Click "Edit" to add stamps to this category'}
                  </td>
                </tr>`;
    }
    
    html += `
            </tbody>
          </table>
        </div>
      </div>`;
  });

  { const _s = saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = html; restoreSettingsScrolls(_s); }
}

export function toggleStampCategoryEdit(categoryName, isEditing) {
  if (isEditing) {
    // Backup stamps data before entering edit mode
    _originalStampsData = JSON.parse(JSON.stringify(_ctx.getStamps()));
  }
  _ctx.getEditState()[categoryName] = isEditing;
  renderStampSettingsTable();
}

export function cancelStampCategoryEdit(categoryName) {
  // Restore original stamps data if backup exists
  if (Object.keys(_originalStampsData).length > 0) {
    _ctx.setStamps(JSON.parse(JSON.stringify(_originalStampsData)));
    _originalStampsData = {};
  }
  _ctx.getEditState()[categoryName] = false;
  renderStampSettingsTable();
  _ctx.showToast('Changes cancelled');
}

export function addStampToCategory(categoryName) {
  const newStamp = {
    name: 'New Stamp',
    width: 20,
    height: 20,
    customerPrice: 0.00,
    agentPrice: 0.00,
    shape: 'rect',
    category: categoryName,
    img: ''
  };
  
  _ctx.getStamps().push(newStamp);
  renderStampSettingsTable();
  _ctx.showToast('New stamp added');
}

export function saveStampCategory(categoryName) {
  _ctx.setPendingCallback(() => {
    // Get all inputs for this category
    const inputs = document.querySelectorAll(`[data-stamp-index]`);
    
    inputs.forEach(input => {
      const stampIndex = parseInt(input.dataset.stampIndex);
      const field = input.dataset.field;
      const value = input.value;
      
      if (_ctx.getStamps()[stampIndex]) {
        if (field === 'name') {
          _ctx.getStamps()[stampIndex].name = value;
        } else if (field === 'width') {
          _ctx.getStamps()[stampIndex].width = parseFloat(value);
        } else if (field === 'height') {
          _ctx.getStamps()[stampIndex].height = parseFloat(value);
        } else if (field === 'shape') {
          _ctx.getStamps()[stampIndex].shape = value;
        } else if (field === 'customerPrice') {
          _ctx.getStamps()[stampIndex].customerPrice = parseFloat(value);
        } else if (field === 'agentPrice') {
          _ctx.getStamps()[stampIndex].agentPrice = parseFloat(value);
        }
      }
    });
    
    _ctx.showToast(`Stamp ${categoryName} saved successfully!`);
    toggleStampCategoryEdit(categoryName, false);
  });
}

export function moveStampUp(categoryName, stampIdx) {
  const catStamps = _ctx.getStamps().filter(s => s.category === categoryName);
  if (stampIdx > 0) {
    // Find the actual stamp indices
    const currentStamp = catStamps[stampIdx];
    const prevStamp = catStamps[stampIdx - 1];
    const currentIdx = _ctx.getStamps().indexOf(currentStamp);
    const prevIdx = _ctx.getStamps().indexOf(prevStamp);
    
    // Swap
    [_ctx.getStamps()[currentIdx], _ctx.getStamps()[prevIdx]] = [_ctx.getStamps()[prevIdx], _ctx.getStamps()[currentIdx]];
    renderStampSettingsTable();
    _ctx.highlightMoveRow('data-stamp-row', `${encodeURIComponent(categoryName)}-${stampIdx - 1}`);
  }
}

export function moveStampDown(categoryName, stampIdx) {
  const catStamps = _ctx.getStamps().filter(s => s.category === categoryName);
  if (stampIdx < catStamps.length - 1) {
    const currentStamp = catStamps[stampIdx];
    const nextStamp = catStamps[stampIdx + 1];
    const currentIdx = _ctx.getStamps().indexOf(currentStamp);
    const nextIdx = _ctx.getStamps().indexOf(nextStamp);
    
    // Swap
    [_ctx.getStamps()[currentIdx], _ctx.getStamps()[nextIdx]] = [_ctx.getStamps()[nextIdx], _ctx.getStamps()[currentIdx]];
    renderStampSettingsTable();
    _ctx.highlightMoveRow('data-stamp-row', `${encodeURIComponent(categoryName)}-${stampIdx + 1}`);
  }
}

export function deleteStamp(categoryName, stampIdx) {
  const catStamps = _ctx.getStamps().filter(s => s.category === categoryName);
  const stampToDelete = catStamps[stampIdx];
  const actualIdx = _ctx.getStamps().indexOf(stampToDelete);
  
  _ctx.showDeleteConfirmationModal(
    'Delete Stamp?',
    `Are you sure you want to delete "${stampToDelete.name}"? This action cannot be undone.`,
    () => {
      _ctx.getStamps().splice(actualIdx, 1);
      _ctx.showToast('Stamp deleted successfully');
      renderStampSettingsTable();
    }
  );
}

