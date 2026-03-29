// modules/stickers/sticker.js
// Sticker Layout Editor extracted from app.js
// Uses init(ctx) pattern for module-level context injection

let _ctx = null;

export function init(ctx) {
  _ctx = ctx;
}

// =================================================================================
// SCRIPT FOR STICKER LAYOUT EDITOR
// =================================================================================

// ===== SINGLE SOURCE OF TRUTH: Paper Sizes =====
// Add/remove paper sizes here â€” all dropdowns, Smart Finder, and preset detection auto-update.
const STICKER_PAPER_SIZES = [
  { id: 'a4',      label: 'A4',      w: 8.28, h: 11.64, default: false },
  { id: 'a3',      label: 'A3',      w: 11.7, h: 16.5,  default: false },
  { id: '12x18',   label: '12x18',   w: 12,   h: 18,    default: true  },
  { id: '12x18.5', label: '12x18.5', w: 12,   h: 18.5,  default: false },
  { id: '12x19',   label: '12x19',   w: 12,   h: 19,    default: false },
  { id: '13x19',   label: '13x19',   w: 13,   h: 19,    default: false },
];

// Helper: get the "w,h" value key used by <select> and data-value attributes
export function getPaperSizeValue(ps) { return `${ps.w},${ps.h}`; }

// Helper: build preset lookup map from STICKER_PAPER_SIZES
export function buildPaperSizePresetMap() {
  const map = {};
  STICKER_PAPER_SIZES.forEach(ps => { map[getPaperSizeValue(ps)] = 1; });
  return map;
}

// Helper: get the default paper size entry
export function getDefaultPaperSize() {
  return STICKER_PAPER_SIZES.find(ps => ps.default) || STICKER_PAPER_SIZES[0];
}

// Global variables for the sticker editor, encapsulated to avoid conflicts
const stickerSmartFinderState = { shape: 'round', mode: 1, unit: 'cm', lastRunMode: null };

const stickerEditorState = {
  currentArtworkUnit: "cm",
  currentPaperUnit: "in",
  currentSpacingUnit: "cm",
  uploadedImage: null,
  artworkOrientation: 'normal',
  isRatioLocked: false,
  lockedAspectRatio: 1,
  isPaperRatioLocked: false,
  lockedPaperAspectRatio: 1,
  originalArtworkDimensions: {
    width: null,
    height: null
  },
  originalUploadedImageRatio: 1,
  unitToInch: {
    "in": 1,
    "cm": 0.393701,
    "mm": 0.0393701,
    "ft": 12
  },
  artworkPresets: {
    "1": {
      horizontal: 0.1,
      vertical: 0.2,
      unit: "cm",
      layoutMode: "optimized"
    },
    "2": {
      horizontal: 0.1,
      vertical: 0.08,
      unit: "cm",
      layoutMode: "optimized"
    },
    "3": {
      horizontal: 0.1,
      vertical: 0.1,
      unit: "cm",
      layoutMode: "optimized"
    },
    "4": {
      horizontal: 0.05,
      vertical: 0.3,
      unit: "cm",
      layoutMode: "optimized"
    },
    "5": {
      horizontal: 0.2,
      vertical: 0.2,
      unit: "cm",
      layoutMode: "optimized"
    },
    "6": {
      horizontal: 0.4,
      vertical: -0.12,
      unit: "cm",
      layoutMode: "optimized"
    },
    "7": {
      horizontal: 0.1,
      vertical: 1,
      unit: "cm",
      layoutMode: "optimized"
    },
    "8": {
      horizontal: 2,
      vertical: -0.3,
      unit: "cm",
      layoutMode: "optimized"
    },
    "9": {
      horizontal: 0.4,
      vertical: 0.4,
      unit: "cm",
      layoutMode: "optimized"
    },
    "10": {
      horizontal: -0.8,
      vertical: 0.5,
      unit: "cm",
      layoutMode: "brickByColumn"
    },
  }
};

export function convertToInches(val, unit) {
  if (isNaN(val)) return 0;
  return val * stickerEditorState.unitToInch[unit];
}

export function convertFromInches(val, targetUnit) {
  if (isNaN(val)) return 0;
  return val / stickerEditorState.unitToInch[targetUnit];
}

export function updateArtworkDimensions(changedField) {
  const artworkWidthInput = document.getElementById("artworkWidth");
  const artworkHeightInput = document.getElementById("artworkHeight");
  let currentWidth = parseFloat(artworkWidthInput.value);
  let currentHeight = parseFloat(artworkHeightInput.value);
  if (stickerEditorState.originalArtworkDimensions.width === null || stickerEditorState.originalArtworkDimensions.height === null) {
    stickerEditorState.originalArtworkDimensions.width = currentWidth;
    stickerEditorState.originalArtworkDimensions.height = currentHeight;
    stickerEditorState.lockedAspectRatio = currentHeight > 0 ? currentWidth / currentHeight : 1;
  } else if (!stickerEditorState.isRatioLocked) {
    if (currentWidth > 0 && currentHeight > 0) {
      stickerEditorState.lockedAspectRatio = currentWidth / currentHeight;
    }
  }
  if (stickerEditorState.isRatioLocked && !isNaN(currentWidth) && !isNaN(currentHeight)) {
    if (changedField === 'width' && currentWidth > 0) {
      artworkHeightInput.value = (currentWidth / stickerEditorState.lockedAspectRatio).toFixed(1);
    } else if (changedField === 'height' && currentHeight > 0) {
      artworkWidthInput.value = (currentHeight * stickerEditorState.lockedAspectRatio).toFixed(1);
    }
  }
  calculateLayout();
}

export function toggleArtworkUnit() {
  const newUnit = document.getElementById("unitSelect").value;
  if (newUnit === stickerEditorState.currentArtworkUnit) return;
  const fields = ["artworkWidth", "artworkHeight"];
  fields.forEach(id => {
    let input = document.getElementById(id);
    let valInInches = convertToInches(parseFloat(input.value), stickerEditorState.currentArtworkUnit);
    if (!isNaN(valInInches) && input.value !== "") {
      input.value = convertFromInches(valInInches, newUnit).toFixed(1);
    }
  });
  if (stickerEditorState.originalArtworkDimensions.width !== null && stickerEditorState.originalArtworkDimensions.height !== null) {
    const originalWidthInInches = convertToInches(stickerEditorState.originalArtworkDimensions.width, stickerEditorState.currentArtworkUnit);
    const originalHeightInInches = convertToInches(stickerEditorState.originalArtworkDimensions.height, stickerEditorState.currentArtworkUnit);
    stickerEditorState.originalArtworkDimensions.width = convertFromInches(originalWidthInInches, newUnit);
    stickerEditorState.originalArtworkDimensions.height = convertFromInches(originalHeightInInches, newUnit);
  }
  stickerEditorState.currentArtworkUnit = newUnit;
  syncStickerDropdownLabel('unitSelect', 'stickerArtworkUnitWrapper');
  calculateLayout();
}

export function toggleCustomPaperUnit() {
  const newUnit = document.getElementById("customUnitSelect").value;
  if (newUnit === stickerEditorState.currentPaperUnit) return;
  const fields = ["paperWidth", "paperHeight"];
  fields.forEach(id => {
    let input = document.getElementById(id);
    let valInInches = convertToInches(parseFloat(input.value), stickerEditorState.currentPaperUnit);
    if (!isNaN(valInInches) && input.value !== "") {
      input.value = convertFromInches(valInInches, newUnit).toFixed(2);
    }
  });
  stickerEditorState.currentPaperUnit = newUnit;
  updatePaperSizeOptions(newUnit);
  syncStickerDropdownLabel('customUnitSelect', 'stickerPaperUnitWrapper');
  calculateLayout();
}

export function syncStickerDropdownLabel(selectId, wrapperId) {
  const select = document.getElementById(selectId);
  const wrapper = document.getElementById(wrapperId);
  if (!select || !wrapper) return;
  const label = wrapper.querySelector('.custom-sticker-dropdown-label');
  const selectedOption = select.options[select.selectedIndex];
  if (label && selectedOption) label.textContent = selectedOption.textContent;
  const selectedText = selectedOption ? selectedOption.textContent.trim() : '';
  wrapper.querySelectorAll('.custom-sticker-dropdown-option').forEach(opt => {
    const match = opt.dataset.value !== undefined
      ? opt.dataset.value === select.value
      : opt.textContent.trim() === selectedText;
    opt.classList.toggle('selected', match);
  });
}

export function syncStickerEditorDropdowns() {
  [
    ['spacingUnitSelect', 'stickerSpacingUnitWrapper'],
    ['stickerShape', 'stickerShapeWrapper'],
    ['layoutMode', 'stickerLayoutModeWrapper'],
    ['hybridLayoutVariant', 'stickerHybridLayoutWrapper'],
    ['sfLayoutMode', 'stickerSFLayoutModeWrapper'],
    ['sfUnitSelect', 'stickerSFUnitWrapper'],
    ['customUnitSelect', 'stickerPaperUnitWrapper'],
    ['unitSelect', 'stickerArtworkUnitWrapper'],
    ['paperSize', 'stickerPaperSizeWrapper']
  ].forEach(([selectId, wrapperId]) => syncStickerDropdownLabel(selectId, wrapperId));
}

export function closeAllStickerDropdowns(exceptWrapperId) {
  document.querySelectorAll('.custom-sticker-dropdown.open').forEach(wrapper => {
    if (wrapper.id !== exceptWrapperId) {
      wrapper.classList.remove('open');
      if (wrapper.dataset.floating === 'true') {
        const panel = wrapper.querySelector('.custom-sticker-dropdown-options, .custom-sticker-dropdown-list');
        if (panel) { panel.style.position = ''; panel.style.top = ''; panel.style.left = ''; panel.style.width = ''; panel.style.right = ''; panel.style.zIndex = ''; }
      }
    }
  });
}

export function toggleGenericStickerDropdown(e, wrapperId) {
  e.stopPropagation();
  closeAllStickerDropdowns(wrapperId);
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  wrapper.classList.toggle('open');
  if (wrapper.classList.contains('open')) {
    // Dynamically sync the highlighted option from whatever the native select currently holds
    const nativeSelect = wrapper.querySelector('select');
    if (nativeSelect && nativeSelect.id && wrapper.id) {
      syncStickerDropdownLabel(nativeSelect.id, wrapper.id);
    }
    // Floating mode: position the options panel with fixed coords to escape overflow-clipped containers
    if (wrapper.dataset.floating === 'true') {
      const trigger = wrapper.querySelector('.custom-sticker-dropdown-trigger');
      const panel = wrapper.querySelector('.custom-sticker-dropdown-options, .custom-sticker-dropdown-list');
      if (trigger && panel) {
        const rect = trigger.getBoundingClientRect();
        panel.style.position = 'fixed';
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.left = rect.left + 'px';
        panel.style.width = rect.width + 'px';
        panel.style.right = 'auto';
        panel.style.zIndex = '9999';
      }
    }
    const selected = wrapper.querySelector('.custom-sticker-dropdown-option.selected');
    if (selected) setTimeout(() => selected.scrollIntoView({ block: 'nearest' }), 10);
  } else if (wrapper.dataset.floating === 'true') {
    const panel = wrapper.querySelector('.custom-sticker-dropdown-options, .custom-sticker-dropdown-list');
    if (panel) { panel.style.position = ''; panel.style.top = ''; panel.style.left = ''; panel.style.width = ''; panel.style.right = ''; panel.style.zIndex = ''; }
  }
}

export function selectGenericStickerDropdownOption(selectId, wrapperId, value, handlerName = '') {
  const select = document.getElementById(selectId);
  const wrapper = document.getElementById(wrapperId);
  if (!select) return;
  select.value = value;
  syncStickerDropdownLabel(selectId, wrapperId);
  if (wrapper) wrapper.classList.remove('open');
  if (handlerName && typeof window[handlerName] === 'function') {
      window[handlerName](value);
    }
  }

export function toggleStickerPaperUnitDropdown(e) {
  toggleGenericStickerDropdown(e, 'stickerPaperUnitWrapper');
}

export function selectStickerPaperUnitOption(value) {
  const select = document.getElementById('customUnitSelect');
  const wrapper = document.getElementById('stickerPaperUnitWrapper');
  if (!select) return;
  select.value = value;
  syncStickerDropdownLabel('customUnitSelect', 'stickerPaperUnitWrapper');
  if (wrapper) wrapper.classList.remove('open');
  toggleCustomPaperUnit();
}

export function toggleStickerArtworkUnitDropdown(e) {
  toggleGenericStickerDropdown(e, 'stickerArtworkUnitWrapper');
}

export function selectStickerArtworkUnitOption(value) {
  const select = document.getElementById('unitSelect');
  const wrapper = document.getElementById('stickerArtworkUnitWrapper');
  if (!select) return;
  select.value = value;
  syncStickerDropdownLabel('unitSelect', 'stickerArtworkUnitWrapper');
  if (wrapper) wrapper.classList.remove('open');
  toggleArtworkUnit();
}

export function toggleSpacingUnit() {
  const newUnit = document.getElementById("spacingUnitSelect").value;
  if (newUnit === stickerEditorState.currentSpacingUnit) return;
  const fields = ["artworkHorizontalSpacing", "artworkVerticalSpacing"];
  fields.forEach(id => {
    let input = document.getElementById(id);
    let valInInches = convertToInches(parseFloat(input.value), stickerEditorState.currentSpacingUnit);
    if (!isNaN(valInInches) && input.value !== "") {
      input.value = convertFromInches(valInInches, newUnit).toFixed(2);
    }
  });
  document.getElementById("spacingInfoUnit").textContent = newUnit;
  stickerEditorState.currentSpacingUnit = newUnit;
  syncStickerDropdownLabel('spacingUnitSelect', 'stickerSpacingUnitWrapper');
  calculateLayout();
}

export function updatePaperSizeOptions(unit) {
  STICKER_PAPER_SIZES.forEach(ps => {
    const val = getPaperSizeValue(ps);
    const optionEl = document.querySelector(`#paperSize option[value="${val}"]`);
    if (optionEl) {
      const wConv = convertFromInches(ps.w, unit).toFixed(2);
      const hConv = convertFromInches(ps.h, unit).toFixed(2);
      optionEl.textContent = `${ps.label} (${wConv}${unit} x ${hConv}${unit})`;
      const dropdownOpt = document.querySelector(`#stickerPaperSizeList .custom-sticker-dropdown-option[data-value="${val}"]`);
      if (dropdownOpt) dropdownOpt.textContent = optionEl.textContent;
    }
  });

  const paperLabel = document.querySelector('#stickerPaperSizeWrapper .custom-sticker-dropdown-label');
  const paperSelect = document.getElementById('paperSize');
  const customPaperBtn = document.getElementById('customPaperToggle');
  const isCustomPaperActive = !!(customPaperBtn && customPaperBtn.classList.contains('active'));
  if (paperLabel && paperSelect && !isCustomPaperActive) {
    const selectedOption = paperSelect.options[paperSelect.selectedIndex];
    if (selectedOption) paperLabel.textContent = selectedOption.textContent;
  }
}

export function activatePresetButton(size) {
  document.querySelectorAll('.sticker-editor-wrapper .preset-button').forEach(button => {
    button.classList.remove('active');
    if (button.textContent === size + 'cm') {
      button.classList.add('active');
    }
  });
}

export function applyPresetArtworkSize(sizeCm) {
  const convertedSize = convertFromInches(convertToInches(sizeCm, "cm"), stickerEditorState.currentArtworkUnit);
  document.getElementById("artworkWidth").value = convertedSize.toFixed(1);
  document.getElementById("artworkHeight").value = convertedSize.toFixed(1);
  stickerEditorState.originalArtworkDimensions.width = parseFloat(document.getElementById("artworkWidth").value);
  stickerEditorState.originalArtworkDimensions.height = parseFloat(document.getElementById("artworkHeight").value);
  stickerEditorState.lockedAspectRatio = stickerEditorState.originalArtworkDimensions.height > 0 ? stickerEditorState.originalArtworkDimensions.width / stickerEditorState.originalArtworkDimensions.height : 1;
  toggleLockRatio(true);
  stickerEditorState.currentPaperUnit = "in";
  document.getElementById("customUnitSelect").value = "in";
  const preset = stickerEditorState.artworkPresets[sizeCm.toString()];
  if (preset) {
    document.getElementById("spacingUnitSelect").value = preset.unit;
    stickerEditorState.currentSpacingUnit = preset.unit;
    document.getElementById("artworkHorizontalSpacing").value = convertFromInches(convertToInches(preset.horizontal, preset.unit), stickerEditorState.currentSpacingUnit).toFixed(2);
    document.getElementById("artworkVerticalSpacing").value = convertFromInches(convertToInches(preset.vertical, preset.unit), stickerEditorState.currentSpacingUnit).toFixed(2);
    document.getElementById("layoutMode").value = preset.layoutMode;
    toggleSpacingUnit();
  }
  activatePresetButton(sizeCm);
  stickerEditorState.artworkOrientation = 'normal';
  syncStickerEditorDropdowns();
  calculateLayout();
}

export function handleImageUpload() {
  const fileInput = document.getElementById('artworkImage');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const file = fileInput.files[0];
  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (e.g., JPG, PNG, GIF).');
      clearUploadedImage();
      return;
    }
    fileNameDisplay.textContent = file.name;
    // Update design panel filename
    const designFileNameEl = document.getElementById('stickerDesignFileName');
    if (designFileNameEl) designFileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
      stickerEditorState.uploadedImage = new Image();
      stickerEditorState.uploadedImage.onload = function () {
        stickerEditorState.originalUploadedImageRatio = stickerEditorState.uploadedImage.width / stickerEditorState.uploadedImage.height;
        const artworkWidthInput = document.getElementById("artworkWidth");
        const artworkHeightInput = document.getElementById("artworkHeight");
        let currentArtW = parseFloat(artworkWidthInput.value) || 5.0;
        let currentArtH = parseFloat(artworkHeightInput.value) || 5.0;
        const maxDim = Math.max(currentArtW, currentArtH);
        let newWidth, newHeight;
        if (stickerEditorState.originalUploadedImageRatio > 1) {
          newWidth = maxDim;
          newHeight = maxDim / stickerEditorState.originalUploadedImageRatio;
        } else {
          newHeight = maxDim;
          newWidth = maxDim * stickerEditorState.originalUploadedImageRatio;
        }
        artworkWidthInput.value = newWidth.toFixed(1);
        artworkHeightInput.value = newHeight.toFixed(1);
        stickerEditorState.originalArtworkDimensions.width = newWidth;
        stickerEditorState.originalArtworkDimensions.height = newHeight;
        toggleLockRatio(true);
        stickerEditorState.artworkOrientation = 'normal';

        // Sync design panel fields
        stickerDesignRatio = stickerEditorState.originalUploadedImageRatio;
        const stickerDesignW = document.getElementById('stickerDesignW');
        const stickerDesignH = document.getElementById('stickerDesignH');
        if (stickerDesignW) { stickerDesignW.value = newWidth.toFixed(1); stickerDesignW.disabled = false; }
        if (stickerDesignH) { stickerDesignH.value = newHeight.toFixed(1); stickerDesignH.disabled = false; }

        calculateLayout();
      };
      stickerEditorState.uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    clearUploadedImage();
  }
}

export function clearUploadedImage() {
  stickerEditorState.uploadedImage = null;
  stickerEditorState.originalUploadedImageRatio = 1;
  document.getElementById('artworkImage').value = '';
  document.getElementById('fileNameDisplay').textContent = 'No file chosen';
  document.getElementById("artworkWidth").value = (5.0).toFixed(1);
  document.getElementById("artworkHeight").value = (5.0).toFixed(1);
  stickerEditorState.originalArtworkDimensions.width = 5.0;
  stickerEditorState.originalArtworkDimensions.height = 5.0;
  stickerEditorState.lockedAspectRatio = 1;
  setFreeSize();
  stickerEditorState.artworkOrientation = 'normal';

  // Clear design panel fields
  const designFileNameEl = document.getElementById('stickerDesignFileName');
  if (designFileNameEl) designFileNameEl.textContent = '';
  const stickerDesignW = document.getElementById('stickerDesignW');
  const stickerDesignH = document.getElementById('stickerDesignH');
  if (stickerDesignW) { stickerDesignW.value = ''; stickerDesignW.disabled = true; }
  if (stickerDesignH) { stickerDesignH.value = ''; stickerDesignH.disabled = true; }
  stickerDesignRatio = 1;

  calculateLayout();
}

// --- Sticker Layout Tools & Download Panel Logic ---
let stickerFileType = 'jpg';

// Sticker Download Config (DPI + file type + mode)
const stickerDownloadConfig = { dpi: 300, type: 'png', mode: 'all' };

export function setStickerDownloadDPI(val) {
  stickerDownloadConfig.dpi = parseInt(val);
  document.querySelectorAll('#stickerDpiBtnGroup .size-btn').forEach(btn => {
    if (parseInt(btn.innerText) === stickerDownloadConfig.dpi) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  const customInput = document.getElementById('stickerCustomDpiInput');
  if (customInput) customInput.value = '';
}

export function setStickerCustomDPI(val) {
  const num = parseInt(val);
  if (num > 0) {
    stickerDownloadConfig.dpi = num;
    document.querySelectorAll('#stickerDpiBtnGroup .size-btn').forEach(btn => btn.classList.remove('active'));
  }
}

export function setStickerFileType(type) {
  stickerDownloadConfig.type = type;
  document.querySelectorAll('#stickerFileTypeBtnGroup .size-btn').forEach(btn => {
    if (btn.innerText.toLowerCase() === type) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

export function setStickerDownloadMode(mode) {
  stickerDownloadConfig.mode = mode;
  document.querySelectorAll('#stickerDownloadModeBtnGroup .size-btn').forEach(btn => {
    if (btn.dataset.mode === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

let stickerArtToolsOpen = false;
let stickerDownloadOptionsOpen = false;
let stickerSpacingOpen = false;
let stickerSmartFinderOpen = false;

export function getStickerPanelStates() {
  return { stickerArtToolsOpen, stickerDownloadOptionsOpen, stickerSpacingOpen, stickerSmartFinderOpen };
}

export function toggleStickerArtworkTools() {
  const artPanel = document.getElementById('stickerArtworkToolsPanel');
  const artIcon = document.getElementById('stickerArtToggleIcon');
  const artBtn = document.getElementById('stickerArtworkToolsBtn');

  // Force close download panel
  const dlPanel = document.getElementById('stickerDownloadOptionsPanel');
  const dlIcon = document.getElementById('stickerDlToggleIcon');
  const dlBtn = document.getElementById('stickerDownloadOptionsBtn');

  if (stickerDownloadOptionsOpen) {
    stickerDownloadOptionsOpen = false;
    if (dlPanel) dlPanel.classList.remove('panel-open');
    if (dlIcon) {
      dlIcon.classList.remove('fa-chevron-up');
      dlIcon.classList.add('fa-chevron-down');
    }
    _ctx.applyMainCalcPanelButtonVisual(dlBtn, false);
  }

  // Toggle Artwork Panel
  stickerArtToolsOpen = !stickerArtToolsOpen;

  if (stickerArtToolsOpen) {
    if (artPanel) artPanel.classList.add('panel-open');
    if (artIcon) {
      artIcon.classList.remove('fa-chevron-down');
      artIcon.classList.add('fa-chevron-up');
    }
    _ctx.applyMainCalcPanelButtonVisual(artBtn, true);
  } else {
    if (artPanel) artPanel.classList.remove('panel-open');
    if (artIcon) {
      artIcon.classList.remove('fa-chevron-up');
      artIcon.classList.add('fa-chevron-down');
    }
    _ctx.applyMainCalcPanelButtonVisual(artBtn, false);
  }
}

export function toggleStickerDownloadOptions() {
  const dlPanel = document.getElementById('stickerDownloadOptionsPanel');
  const dlIcon = document.getElementById('stickerDlToggleIcon');
  const dlBtn = document.getElementById('stickerDownloadOptionsBtn');

  // Force close artwork panel
  const artPanel = document.getElementById('stickerArtworkToolsPanel');
  const artIcon = document.getElementById('stickerArtToggleIcon');
  const artBtn = document.getElementById('stickerArtworkToolsBtn');

  if (stickerArtToolsOpen) {
    stickerArtToolsOpen = false;
    if (artPanel) artPanel.classList.remove('panel-open');
    if (artIcon) {
      artIcon.classList.remove('fa-chevron-up');
      artIcon.classList.add('fa-chevron-down');
    }
    _ctx.applyMainCalcPanelButtonVisual(artBtn, false);
  }

  // Toggle Download Panel
  stickerDownloadOptionsOpen = !stickerDownloadOptionsOpen;

  if (stickerDownloadOptionsOpen) {
    if (dlPanel) dlPanel.classList.add('panel-open');
    if (dlIcon) {
      dlIcon.classList.remove('fa-chevron-down');
      dlIcon.classList.add('fa-chevron-up');
    }
    _ctx.applyMainCalcPanelButtonVisual(dlBtn, true);
  } else {
    if (dlPanel) dlPanel.classList.remove('panel-open');
    if (dlIcon) {
      dlIcon.classList.remove('fa-chevron-up');
      dlIcon.classList.add('fa-chevron-down');
    }
    _ctx.applyMainCalcPanelButtonVisual(dlBtn, false);
  }
}

export function toggleStickerSpacingPanel() {
  const panel = document.getElementById('stickerSpacingPanel');
  const icon = document.getElementById('stickerSpacingToggleIcon');
  const btn = document.getElementById('stickerSpacingBtn');

  // Force close smart finder
  if (stickerSmartFinderOpen) {
    stickerSmartFinderOpen = false;
    const sfPanel = document.getElementById('stickerSmartFinderPanel');
    const sfIcon = document.getElementById('stickerSFToggleIcon');
    const sfBtn = document.getElementById('stickerSmartFinderBtn');
    if (sfPanel) sfPanel.classList.remove('panel-open');
    if (sfIcon) { sfIcon.classList.remove('fa-chevron-up'); sfIcon.classList.add('fa-chevron-down'); }
    _ctx.applyMainCalcPanelButtonVisual(sfBtn, false);
  }

  stickerSpacingOpen = !stickerSpacingOpen;
  if (stickerSpacingOpen) {
    if (panel) panel.classList.add('panel-open');
    if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
    _ctx.applyMainCalcPanelButtonVisual(btn, true);
  } else {
    if (panel) panel.classList.remove('panel-open');
    if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
    _ctx.applyMainCalcPanelButtonVisual(btn, false);
  }
}

export function toggleStickerSmartFinderPanel() {
  const panel = document.getElementById('stickerSmartFinderPanel');
  const icon = document.getElementById('stickerSFToggleIcon');
  const btn = document.getElementById('stickerSmartFinderBtn');

  // Force close spacing
  if (stickerSpacingOpen) {
    stickerSpacingOpen = false;
    const spPanel = document.getElementById('stickerSpacingPanel');
    const spIcon = document.getElementById('stickerSpacingToggleIcon');
    const spBtn = document.getElementById('stickerSpacingBtn');
    if (spPanel) spPanel.classList.remove('panel-open');
    if (spIcon) { spIcon.classList.remove('fa-chevron-up'); spIcon.classList.add('fa-chevron-down'); }
    _ctx.applyMainCalcPanelButtonVisual(spBtn, false);
  }

  stickerSmartFinderOpen = !stickerSmartFinderOpen;
  if (stickerSmartFinderOpen) {
    if (panel) panel.classList.add('panel-open');
    if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
    _ctx.applyMainCalcPanelButtonVisual(btn, true);
    setSFMode(2);
  } else {
    if (panel) panel.classList.remove('panel-open');
    if (icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
    _ctx.applyMainCalcPanelButtonVisual(btn, false);
  }
}

export function handleStickerFinalDownload() {
  if (stickerDownloadConfig.mode === 'all') {
    downloadStickerAllShapes(stickerDownloadConfig.type, stickerDownloadConfig.dpi);
  } else {
    downloadStickerArtwork(stickerDownloadConfig.type, stickerDownloadConfig.dpi);
  }
  if (stickerDownloadOptionsOpen) {
    toggleStickerDownloadOptions();
  }
}

// --- Sticker Artwork Design Panel Functions ---
let stickerDesignLocked = true;
let stickerDesignRatio = 1;

export function updateStickerDesignFields() {
  const wInput = document.getElementById('stickerDesignW');
  const hInput = document.getElementById('stickerDesignH');
  const artW = document.getElementById('artworkWidth');
  const artH = document.getElementById('artworkHeight');
  if (wInput && artW) wInput.value = artW.value;
  if (hInput && artH) hInput.value = artH.value;

  // Update unit labels
  const unitSelect = document.getElementById('unitSelect');
  if (unitSelect) {
    const unit = unitSelect.value;
    const unitLabels = document.querySelectorAll('#stickerArtworkToolsPanel .dynamic-unit');
    unitLabels.forEach(label => { label.textContent = unit; });
  }
}

export function updateStickerDesignDims(axis) {
  const wInput = document.getElementById('stickerDesignW');
  const hInput = document.getElementById('stickerDesignH');
  const artW = document.getElementById('artworkWidth');
  const artH = document.getElementById('artworkHeight');

  if (!wInput || !hInput || !artW || !artH) return;

  if (axis === 'w') {
    artW.value = wInput.value;
    if (stickerDesignLocked && stickerDesignRatio) {
      const newH = (parseFloat(wInput.value) / stickerDesignRatio).toFixed(1);
      hInput.value = newH;
      artH.value = newH;
    }
  } else {
    artH.value = hInput.value;
    if (stickerDesignLocked && stickerDesignRatio) {
      const newW = (parseFloat(hInput.value) * stickerDesignRatio).toFixed(1);
      wInput.value = newW;
      artW.value = newW;
    }
  }

  calculateLayout();
}

export function rotateStickerDesignImg() {
  const wInput = document.getElementById('stickerDesignW');
  const hInput = document.getElementById('stickerDesignH');
  const artW = document.getElementById('artworkWidth');
  const artH = document.getElementById('artworkHeight');

  if (!wInput || !hInput || !artW || !artH) return;

  const tempW = wInput.value;
  wInput.value = hInput.value;
  hInput.value = tempW;
  artW.value = wInput.value;
  artH.value = hInput.value;

  if (stickerDesignRatio) {
    stickerDesignRatio = 1 / stickerDesignRatio;
  }

  calculateLayout();
}

export function toggleStickerArtLock() {
  stickerDesignLocked = !stickerDesignLocked;
  const btn = document.getElementById('stickerArtLockBtn');
  if (!btn) return;

  const icon = btn.querySelector('i');
  if (stickerDesignLocked) {
    btn.classList.add('active-control');
    if (icon) icon.className = 'fas fa-lock';
    // Recalculate ratio from current values
    const w = parseFloat(document.getElementById('stickerDesignW').value) || 1;
    const h = parseFloat(document.getElementById('stickerDesignH').value) || 1;
    stickerDesignRatio = w / h;
  } else {
    btn.classList.remove('active-control');
    if (icon) icon.className = 'fas fa-lock-open';
  }
}

export function resetStickerArtworkFit() {
  const artW = document.getElementById('artworkWidth');
  const artH = document.getElementById('artworkHeight');

  if (!artW || !artH) return;

  // Reset to current artwork size from main inputs
  if (stickerEditorState.uploadedImage) {
    // Recalculate from original image ratio
    const ratio = stickerEditorState.originalUploadedImageRatio;
    const currentW = parseFloat(artW.value) || 5.0;
    const currentH = parseFloat(artH.value) || 5.0;
    const maxDim = Math.max(currentW, currentH);
    let newW, newH;
    if (ratio > 1) {
      newW = maxDim;
      newH = maxDim / ratio;
    } else {
      newH = maxDim;
      newW = maxDim * ratio;
    }
    artW.value = newW.toFixed(1);
    artH.value = newH.toFixed(1);
    stickerDesignRatio = ratio;
  }

  // Sync design fields
  updateStickerDesignFields();

  // Re-lock
  stickerDesignLocked = true;
  const btn = document.getElementById('stickerArtLockBtn');
  if (btn) {
    btn.classList.add('active-control');
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'fas fa-lock';
  }

  calculateLayout();
}

// --- Download Sticker Canvas (DPI-aware) ---
export function downloadStickerCanvas(format = 'jpg', dpi = 200) {
  const canvas = document.getElementById('layoutCanvas');
  if (!canvas) return;

  const artW = document.getElementById('artworkWidth').value;
  const artH = document.getElementById('artworkHeight').value;
  const unit = document.getElementById('unitSelect').value;
  const timestamp = new Date().toISOString().slice(0, 10);

  // Scale based on DPI: base canvas is 880px wide at 96px/in default screen res.
  // We compute a scale factor so the output is at the requested DPI.
  const scale = Math.max(1, Math.round(dpi / 96));

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  const ctx = tempCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // White background for JPG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  ctx.scale(scale, scale);
  ctx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = `sticker_layout_${artW}x${artH}${unit}_${dpi}dpi_${timestamp}.${format}`;

  if (format === 'jpg') {
    link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
  } else {
    link.href = tempCanvas.toDataURL('image/png');
  }

  link.click();
  _ctx.showToast(`âœ“ Layout downloaded as ${format.toUpperCase()} @ ${dpi} DPI!`);
}

// --- High-Quality Sticker Artwork Download (Original Image + Clipping Mask) ---
export function downloadStickerArtwork(format = 'png', dpi = 200) {
  const img = stickerEditorState.uploadedImage;
  if (!img) {
    // No image uploaded â€” fall back to canvas screenshot
    downloadStickerCanvas(format, dpi);
    return;
  }

  // 1. Get artwork dimensions and convert to inches
  const artWVal = parseFloat(document.getElementById('artworkWidth').value) || 5;
  const artHVal = parseFloat(document.getElementById('artworkHeight').value) || 5;
  const artUnit = stickerEditorState.currentArtworkUnit;
  const artW_inch = convertToInches(artWVal, artUnit);
  const artH_inch = convertToInches(artHVal, artUnit);

  // 2. Compute pixel dimensions from DPI
  const pixelW = Math.ceil(artW_inch * dpi);
  const pixelH = Math.ceil(artH_inch * dpi);

  // Safety check for extremely large output
  if (pixelW * pixelH > 25000000 && !confirm(`This file will be very large (${pixelW}Ã—${pixelH}px). It might be slow. Continue?`)) {
    return;
  }

  // 3. Determine sticker shape
  const stickerShapeVal = document.getElementById('stickerShape').value;
  let shape;
  if (stickerShapeVal === 'round') {
    shape = Math.abs(artW_inch - artH_inch) < 0.001 ? 'round' : 'oval';
  } else {
    shape = Math.abs(artW_inch - artH_inch) < 0.001 ? 'square' : 'rectangle';
  }

  // 4. Create offscreen canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = pixelW;
  tempCanvas.height = pixelH;
  const ctx = tempCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 5. For JPG: fill white background first
  if (format === 'jpg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pixelW, pixelH);
  }
  // For PNG: leave transparent (default)

  // 6. Apply clipping mask based on shape
  ctx.save();
  ctx.beginPath();
  if (shape === 'round' || shape === 'oval') {
    ctx.ellipse(pixelW / 2, pixelH / 2, pixelW / 2, pixelH / 2, 0, 0, 2 * Math.PI);
  } else {
    ctx.rect(0, 0, pixelW, pixelH);
  }
  ctx.clip();

  // 7. Draw original image with "cover" fit (same logic as drawCanvas)
  const imageRatio = img.width / img.height;
  const stickerRatio = artW_inch / artH_inch;
  let drawW, drawH, drawX, drawY;

  if (imageRatio > stickerRatio) {
    // Image is wider than sticker: fit height, crop width
    drawH = pixelH;
    drawW = drawH * imageRatio;
    drawX = -(drawW - pixelW) / 2;
    drawY = 0;
  } else {
    // Image is taller than sticker: fit width, crop height
    drawW = pixelW;
    drawH = drawW / imageRatio;
    drawX = 0;
    drawY = -(drawH - pixelH) / 2;
  }

  // Handle rotation if artwork was rotated
  if (stickerEditorState.artworkOrientation === 'rotated') {
    const cx = pixelW / 2;
    const cy = pixelH / 2;
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 2);
    // Swap draw dimensions for rotated image
    if (imageRatio > (artH_inch / artW_inch)) {
      const rDrawH = pixelW;
      const rDrawW = rDrawH * imageRatio;
      ctx.drawImage(img, -(rDrawW) / 2, -(rDrawH) / 2, rDrawW, rDrawH);
    } else {
      const rDrawW = pixelH;
      const rDrawH = rDrawW / imageRatio;
      ctx.drawImage(img, -(rDrawW) / 2, -(rDrawH) / 2, rDrawW, rDrawH);
    }
  } else {
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  ctx.restore();

  // 8. Export and download
  const timestamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.download = `sticker_artwork_${artWVal}x${artHVal}${artUnit}_${dpi}dpi_${timestamp}.${format}`;

  if (format === 'jpg') {
    link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
  } else {
    link.href = tempCanvas.toDataURL('image/png');
  }

  link.click();
  _ctx.showToast(`âœ“ Artwork downloaded as ${format.toUpperCase()} @ ${dpi} DPI!`);
}

// --- Download ALL Arranged Sticker Shapes (Original Image + Clipping Masks) ---
export function downloadStickerAllShapes(format = 'png', dpi = 200) {
  const img = stickerEditorState.uploadedImage;
  if (!img) {
    downloadStickerCanvas(format, dpi);
    return;
  }

  const layoutData = stickerEditorState.lastLayoutData;
  if (!layoutData || !layoutData.stickersToDraw || layoutData.stickersToDraw.length === 0) {
    _ctx.showToast('âš  No sticker layout found. Please calculate first.');
    return;
  }

  const { stickersToDraw, centerOffsetX, centerOffsetY, designW, designH,
    paperW, paperH, marginLeft, marginTop, stickerShape,
    usableWidth, usableHeight } = layoutData;

  // Compute total paper size in pixels at the chosen DPI
  const pixelPaperW = Math.ceil(paperW * dpi);
  const pixelPaperH = Math.ceil(paperH * dpi);

  // Safety check
  if (pixelPaperW * pixelPaperH > 50000000 && !confirm(`This file will be very large (${pixelPaperW}Ã—${pixelPaperH}px). Continue?`)) {
    return;
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = pixelPaperW;
  tempCanvas.height = pixelPaperH;
  const ctx = tempCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // For JPG: white background. For PNG: transparent (default)
  if (format === 'jpg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pixelPaperW, pixelPaperH);
  }

  // Image cover-fit calculations (same ratio for all stickers)
  const imageRatio = img.width / img.height;
  const stickerRatio = designW / designH;

  // Pixel dimensions per sticker
  const stickerPixelW = designW * dpi;
  const stickerPixelH = designH * dpi;

  // Cover-fit: compute draw dimensions relative to a single sticker
  let imgDrawW, imgDrawH, imgOffsetX, imgOffsetY;
  if (imageRatio > stickerRatio) {
    imgDrawH = stickerPixelH;
    imgDrawW = imgDrawH * imageRatio;
    imgOffsetX = -(imgDrawW - stickerPixelW) / 2;
    imgOffsetY = 0;
  } else {
    imgDrawW = stickerPixelW;
    imgDrawH = imgDrawW / imageRatio;
    imgOffsetX = 0;
    imgOffsetY = -(imgDrawH - stickerPixelH) / 2;
  }

  // Margin offset in pixels
  const marginPxLeft = marginLeft * dpi;
  const marginPxTop = marginTop * dpi;

  // Draw each sticker with clipping mask
  stickersToDraw.forEach(sticker => {
    const posX = marginPxLeft + (sticker.x + centerOffsetX) * dpi;
    const posY = marginPxTop + (sticker.y + centerOffsetY) * dpi;

    ctx.save();
    ctx.beginPath();
    if (sticker.shape === 'round' || sticker.shape === 'oval') {
      ctx.ellipse(posX + stickerPixelW / 2, posY + stickerPixelH / 2,
        stickerPixelW / 2, stickerPixelH / 2, 0, 0, 2 * Math.PI);
    } else {
      ctx.rect(posX, posY, stickerPixelW, stickerPixelH);
    }
    ctx.clip();

    // Handle rotation
    if (stickerEditorState.artworkOrientation === 'rotated') {
      const cx = posX + stickerPixelW / 2;
      const cy = posY + stickerPixelH / 2;
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 2);
      // Swap dimensions for rotated drawing
      const rRatio = img.width / img.height;
      const rStickerRatio = designH / designW;
      let rDrawW, rDrawH, rOffX, rOffY;
      if (rRatio > rStickerRatio) {
        rDrawH = stickerPixelW;
        rDrawW = rDrawH * rRatio;
        rOffX = -(rDrawW) / 2;
        rOffY = -(rDrawH) / 2;
      } else {
        rDrawW = stickerPixelH;
        rDrawH = rDrawW / rRatio;
        rOffX = -(rDrawW) / 2;
        rOffY = -(rDrawH) / 2;
      }
      ctx.drawImage(img, rOffX, rOffY, rDrawW, rDrawH);
    } else {
      ctx.drawImage(img, posX + imgOffsetX, posY + imgOffsetY, imgDrawW, imgDrawH);
    }

    ctx.restore();
  });

  // Export
  const artUnit = stickerEditorState.currentArtworkUnit;
  const artWVal = parseFloat(document.getElementById('artworkWidth').value) || 5;
  const artHVal = parseFloat(document.getElementById('artworkHeight').value) || 5;
  const timestamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.download = `sticker_all_${artWVal}x${artHVal}${artUnit}_${stickersToDraw.length}pcs_${dpi}dpi_${timestamp}.${format}`;

  if (format === 'jpg') {
    link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
  } else {
    link.href = tempCanvas.toDataURL('image/png');
  }

  link.click();
  _ctx.showToast(`âœ“ All ${stickersToDraw.length} stickers downloaded as ${format.toUpperCase()} @ ${dpi} DPI!`);
}

export function copyStickerInvoiceText() {
  const invoiceText = document.getElementById("stickerInvoiceText");
  if (!invoiceText) return;
  invoiceText.select();
  navigator.clipboard.writeText(invoiceText.value).then(() => {
    _ctx.showToast('âœ“ Invoice copied!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

export function addStickerToPad() {
  // 1. Get the exact text from the generated invoice box
  const invoiceTextArea = document.getElementById("stickerInvoiceText");
  const rawText = invoiceTextArea.value;
  // Split the text into lines to map them to the Quote Pad structure
  // Standard Format coming from calculator:
  // Line 0: Print
  // Line 1: Size : 5.0cm x 5.0cm
  // Line 2: Paper Size : 12.00in x 18.00in
  // Line 3: Material : White Sticker Normal + Kiss Cut
  // Line 4: Shape : Round
  // Line 5: * Fit 45pcs in 1pc Paper
  const lines = rawText.split('\n');

  // Safety check
  if (lines.length < 2) {
    const designW = document.getElementById("artworkWidth").value;
    const unit = document.getElementById("unitSelect").value;
    lines[1] = `Size : ${designW}${unit} x ${designW}${unit}`;
  }

  const sizeLine = lines[1] || "";
  const paperAndMatLine = (lines[2] || "") + "\n" + (lines[3] || "");
  const shapeAndFitLine = (lines[4] || "") + "\n" + (lines[5] || "");

  // --- NEW: Retrieve calculated price from state ---
  const finalPrice = stickerEditorState.currentTotalPrice || 0;

  // --- REPLACED: Use Universal Helper ---
  _ctx.addItemToQuotePad({
    type: 'calculator',
    title: 'Sticker Layout',
    name: 'Sticker Layout',
    unitPrice: finalPrice, // <--- UPDATED: Uses the calculated price
    quantity: 1,
    details: {
      size: sizeLine,
      material: paperAndMatLine,
      finishing: shapeAndFitLine,
      price: `Price: RM 0.00 (Layout Only)`
    }
  });
}

export function setActiveControlButton(activeButton, allButtons) {
  allButtons.forEach(button => {
    button.classList.remove("active-control");
  });
  activeButton.classList.add("active-control");
}

export function togglePaperLockRatio() {
  const wInput = document.getElementById('paperWidth');
  const hInput = document.getElementById('paperHeight');
  const btn = document.getElementById('paperLockRatioBtn');
  if (!wInput || !hInput || !btn) return;
  if (!stickerEditorState.isPaperRatioLocked) {
    stickerEditorState.isPaperRatioLocked = true;
    const w = parseFloat(wInput.value);
    const h = parseFloat(hInput.value);
    stickerEditorState.lockedPaperAspectRatio = h > 0 ? w / h : 1;
    hInput.disabled = true;
    btn.classList.add('active-control');
    btn.innerHTML = '<i class="fas fa-lock"></i>';
  } else {
    stickerEditorState.isPaperRatioLocked = false;
    hInput.disabled = false;
    btn.classList.remove('active-control');
    btn.innerHTML = '<i class="fas fa-lock-open"></i>';
  }
}

export function rotatePaper() {
  const wInput = document.getElementById('paperWidth');
  const hInput = document.getElementById('paperHeight');
  if (!wInput || !hInput) return;
  const w = parseFloat(wInput.value);
  const h = parseFloat(hInput.value);
  if (isNaN(w) || isNaN(h)) return;
  wInput.value = h;
  hInput.value = w;
  if (stickerEditorState.isPaperRatioLocked) {
    stickerEditorState.lockedPaperAspectRatio = w > 0 ? h / w : 1;
  }
  calculateLayout();
}

export function toggleLockRatio(forceLock = false) {
  const artworkWidthInput = document.getElementById("artworkWidth");
  const artworkHeightInput = document.getElementById("artworkHeight");
  const lockRatioBtn = document.getElementById("lockRatioBtn");
  if (forceLock || !stickerEditorState.isRatioLocked) {
    stickerEditorState.isRatioLocked = true;
    lockRatioBtn.classList.add('active-control');
    lockRatioBtn.innerHTML = '<i class="fas fa-lock"></i>';
    const currentWidth = parseFloat(artworkWidthInput.value);
    const currentHeight = parseFloat(artworkHeightInput.value);
    stickerEditorState.lockedAspectRatio = currentHeight > 0 ? currentWidth / currentHeight : 1;
    artworkHeightInput.disabled = true;
    artworkWidthInput.disabled = false;
    updateArtworkDimensions('width');
  } else {
    setFreeSize();
  }
}

export function setFreeSize() {
  stickerEditorState.isRatioLocked = false;
  const lockRatioBtn = document.getElementById("lockRatioBtn");
  if (lockRatioBtn) {
    lockRatioBtn.classList.remove('active-control');
    lockRatioBtn.innerHTML = '<i class="fas fa-lock-open"></i>';
  }
  document.getElementById("artworkWidth").disabled = false;
  document.getElementById("artworkHeight").disabled = false;
  calculateLayout();
}

export function revertToOriginalSize() {
  if (stickerEditorState.originalArtworkDimensions.width !== null && stickerEditorState.originalArtworkDimensions.height !== null) {
    document.getElementById("artworkWidth").value = stickerEditorState.originalArtworkDimensions.width.toFixed(1);
    document.getElementById("artworkHeight").value = stickerEditorState.originalArtworkDimensions.height.toFixed(1);
    stickerEditorState.lockedAspectRatio = stickerEditorState.uploadedImage ? stickerEditorState.originalUploadedImageRatio : (stickerEditorState.originalArtworkDimensions.width / stickerEditorState.originalArtworkDimensions.height);
    toggleLockRatio(true);
    stickerEditorState.artworkOrientation = 'normal';
    calculateLayout();
  }
}

export function resizeArtworkToFitPaper() {
  let paperWidth, paperHeight;
  const customPaperBtn = document.getElementById('customPaperToggle');
  const isCustomPaperActive = !!(customPaperBtn && customPaperBtn.classList.contains('active'));
  const selectedSize = document.getElementById("paperSize").value;
  if (isCustomPaperActive) {
    paperWidth = getInputInInches("paperWidth", 'paper');
    paperHeight = getInputInInches("paperHeight", 'paper');
  } else {
    const [w, h] = selectedSize.split(',').map(Number);
    paperWidth = w;
    paperHeight = h;
  }
  const marginLeft = 0.3937,
    marginRight = 0.3937,
    marginTop = 0.3937,
    marginBottom = 1.1811;
  const usableWidth = paperWidth - marginLeft - marginRight;
  const usableHeight = paperHeight - marginTop - marginBottom;
  const currentArtW_in = getInputInInches("artworkWidth", 'artwork');
  const currentArtH_in = getInputInInches("artworkHeight", 'artwork');
  if (currentArtW_in <= 0 || currentArtH_in <= 0) return;
  const currentArtworkAspectRatio = stickerEditorState.uploadedImage ? stickerEditorState.originalUploadedImageRatio : (currentArtW_in / currentArtH_in);
  let newArtW_in = usableWidth;
  let newArtH_in = usableWidth / currentArtworkAspectRatio;
  if (newArtH_in > usableHeight) {
    newArtH_in = usableHeight;
    newArtW_in = usableHeight * currentArtworkAspectRatio;
  }
  document.getElementById("artworkWidth").value = convertFromInches(newArtW_in, stickerEditorState.currentArtworkUnit).toFixed(1);
  document.getElementById("artworkHeight").value = convertFromInches(newArtH_in, stickerEditorState.currentArtworkUnit).toFixed(1);
  toggleLockRatio(true);
  stickerEditorState.artworkOrientation = 'normal';
  calculateLayout();
}

export function rotateArtwork() {
  const artworkWidthInput = document.getElementById("artworkWidth");
  const artworkHeightInput = document.getElementById("artworkHeight");
  let currentWidth = parseFloat(artworkWidthInput.value);
  let currentHeight = parseFloat(artworkHeightInput.value);
  if (isNaN(currentWidth) || isNaN(currentHeight)) return;
  artworkWidthInput.value = currentHeight.toFixed(1);
  artworkHeightInput.value = currentWidth.toFixed(1);
  stickerEditorState.artworkOrientation = (stickerEditorState.artworkOrientation === 'normal') ? 'rotated' : 'normal';
  if (stickerEditorState.isRatioLocked) {
    stickerEditorState.lockedAspectRatio = currentWidth > 0 ? currentHeight / currentWidth : 1;
  }
  
  // Real-time sync to Smart Finder box
  const sfW = document.getElementById("sfSizeW");
  const sfH = document.getElementById("sfSizeH");
  if (sfW && sfH && sfW.value && sfH.value) {
    const curW = parseFloat(sfW.value);
    const curH = parseFloat(sfH.value);
    if (!isNaN(curW) && !isNaN(curH)) {
      sfW.value = curH.toFixed(1);
      sfH.value = curW.toFixed(1);
    }
  }

  calculateLayout();
}

export function handleLayoutModeChange() {
  const layoutMode = document.getElementById("layoutMode").value;
  const hybridOptions = document.getElementById("hybridLayoutOptions");
  syncStickerDropdownLabel('layoutMode', 'stickerLayoutModeWrapper');

  if (hybridOptions) {
    if (layoutMode === "hybrid") {
      hybridOptions.style.display = "flex";
    } else {
      hybridOptions.style.display = "none";
    }
  }

  calculateLayout();
}

export function calculateLayout() {
  let paperW, paperH;
  const paperSizeSelect = document.getElementById("paperSize");
  if (!paperSizeSelect) return;
  const customPaperBtn = document.getElementById('customPaperToggle');
  const isCustomPaperActive = !!(customPaperBtn && customPaperBtn.classList.contains('active'));
  const selectedSize = paperSizeSelect.value;
  if (isCustomPaperActive) {
    paperW = getInputInInches("paperWidth", 'paper');
    paperH = getInputInInches("paperHeight", 'paper');
  } else {
    const [w, h] = selectedSize.split(',').map(Number);
    paperW = w;
    paperH = h;
  }
  const designW = getInputInInches("artworkWidth", 'artwork');
  const designH = getInputInInches("artworkHeight", 'artwork');
  const horizSpacing = getInputInInches("artworkHorizontalSpacing", 'spacing');
  const vertSpacing = getInputInInches("artworkVerticalSpacing", 'spacing');
  const stickerShape = document.getElementById("stickerShape").value;
  const layoutMode = document.getElementById("layoutMode").value;
  const marginLeft = 0.3937,
    marginRight = 0.3937,
    marginTop = 0.3937,
    marginBottom = 1.1811;
  const usableWidth = paperW - marginLeft - marginRight;
  const usableHeight = paperH - marginTop - marginBottom;
  let actualStickerShape = stickerShape;
  if (stickerShape === "round") {
    actualStickerShape = Math.abs(designW - designH) < 0.001 ? "round" : "oval";
  } else {
    actualStickerShape = Math.abs(designW - designH) < 0.001 ? "square" : "rectangle";
  }
  const actualFitResult = drawCanvas(paperW, paperH, designW, designH, horizSpacing, vertSpacing, marginLeft, marginTop, marginRight, marginBottom, actualStickerShape, layoutMode, usableWidth, usableHeight);
  const artworkDisplayWidth = convertFromInches(designW, stickerEditorState.currentArtworkUnit).toFixed(1);
  const artworkDisplayHeight = convertFromInches(designH, stickerEditorState.currentArtworkUnit).toFixed(1);
  const displayPaperWidth = convertFromInches(paperW, stickerEditorState.currentPaperUnit).toFixed(2);
  const displayPaperHeight = convertFromInches(paperH, stickerEditorState.currentPaperUnit).toFixed(2);
  let invoiceStickerShapeText = actualStickerShape.charAt(0).toUpperCase() + actualStickerShape.slice(1);

  // --- NEW: Calculate Price ---
  const matIndex = document.getElementById("stickerMaterial").value;
  const selectedMat = _ctx.getMaterials()[matIndex];
  const unitPriceSqFt = _ctx.getGlobalAgentMode() ? selectedMat.agentPrice : selectedMat.customerPrice;

  // Calculate Area in Sq Ft (PaperW * PaperH / 144)
  const areaSqFt = (paperW * paperH) / 144;
  let totalPrice = areaSqFt * unitPriceSqFt;

  // --- NEW: Save Price to State for 'Add to Pad' ---
  stickerEditorState.currentTotalPrice = totalPrice;
  // -------------------------------------------------

  // Apply Tax if enabled
  let taxText = "";
  if (_ctx.getIsTaxEnabled()) {
    const taxAmt = totalPrice * (_ctx.getGlobalTaxPercent() / 100);
    totalPrice += taxAmt;
    taxText = `\nTax (${_ctx.getGlobalTaxPercent()}%): ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(taxAmt)}`;
  }

  // Update UI Price Display
  const priceDisplayEl = document.getElementById("stickerPriceDisplay");
  if (priceDisplayEl) {
    // --- UPDATED: Dynamic Color (Green for Agent, Blue for Customer) ---
    const activeColor = _ctx.getGlobalAgentMode() ? 'var(--success-color)' : 'var(--primary-color)';

    priceDisplayEl.innerHTML = `<span class="text-xs text-gray-500 dark:text-gray-400 block font-normal uppercase">Total</span><span style="color: ${activeColor}">${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(totalPrice)}</span>`;
  }
  // --- END NEW PRICE LOGIC ---

  // --- UPDATE PRICE TABLE ---
  renderStickerPriceTable(paperW, paperH);
  // ----------------------------

  // UPDATED: Invoice Text Generation
  const _stickerInvoiceEl = document.getElementById("stickerInvoiceText");
  if (_stickerInvoiceEl) {
    _stickerInvoiceEl.value = `Print\nSize : ${artworkDisplayWidth}${stickerEditorState.currentArtworkUnit} x ${artworkDisplayHeight}${stickerEditorState.currentArtworkUnit}\nPaper Size : ${displayPaperWidth}${stickerEditorState.currentPaperUnit} x ${displayPaperHeight}${stickerEditorState.currentPaperUnit}\nMaterial : ${selectedMat.name}\nShape : ${invoiceStickerShapeText}\n* Fit ${actualFitResult.total}pcs in 1pc Paper\nPrice : ${_ctx.getCurrentCurrency().symbol}${_ctx.formatCurrency(totalPrice)}${taxText}`;
    _stickerInvoiceEl.style.height = 'auto';
    _stickerInvoiceEl.style.height = _stickerInvoiceEl.scrollHeight + 'px';
  }

  // Text is now drawn directly on canvas in drawCanvas function
  // document.getElementById("canvasSummaryText").textContent = ... (Removed)

  const currentArtW = parseFloat(document.getElementById("artworkWidth").value);
  const currentArtH = parseFloat(document.getElementById("artworkHeight").value);
  let matchedPreset = null;
  for (const sizeCm of Object.keys(stickerEditorState.artworkPresets)) {
    const convertedPresetSize = parseFloat(convertFromInches(convertToInches(parseFloat(sizeCm), "cm"), stickerEditorState.currentArtworkUnit).toFixed(1));
    if (Math.abs(currentArtW - convertedPresetSize) < 0.001 && Math.abs(currentArtH - convertedPresetSize) < 0.001) {
      matchedPreset = sizeCm;
      break;
    }
  }
  if (matchedPreset !== null) {
    activatePresetButton(parseFloat(matchedPreset));
  } else {
    document.querySelectorAll('.sticker-editor-wrapper .preset-button').forEach(b => b.classList.remove('active'));
  }
}

export function renderStickerPriceTable(paperW, paperH) {
  const tableContainer = document.getElementById("stickerPriceTable");
  if (!tableContainer) return;

  // 1. Get Current Material & Paper Size
  const matIndex = document.getElementById("stickerMaterial").value;
  const selectedMat = _ctx.getMaterials()[matIndex];

  // Format Paper Size
  const paperSizeText = `${paperW.toFixed(1)}" x ${paperH.toFixed(1)}"`;
  const modeLabel = _ctx.getGlobalAgentMode() ? "AGENT" : "CUSTOMER";

  // 2. Calculate Prices & Quantity for each Preset
  // We'll show sizes 1 to 10 cm
  const presets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Helper to calc quantity (USING PRESET DEFINITIONS)
  const calcQty = (sizeCm, shape) => {
    const sizeInch = convertToInches(sizeCm, "cm");

    // Get preset configuration
    const preset = stickerEditorState.artworkPresets[sizeCm];
    if (!preset) return 0;

    // Convert preset spacing to inches
    const hSpacing = convertToInches(preset.horizontal, preset.unit);
    const vSpacing = convertToInches(preset.vertical, preset.unit);

    const marginLeft = 0.3937, marginRight = 0.3937, marginTop = 0.3937, marginBottom = 1.1811;
    const usableWidth = paperW - marginLeft - marginRight;
    const usableHeight = paperH - marginTop - marginBottom;

    const effectiveW = sizeInch + hSpacing;
    const effectiveH = sizeInch + vSpacing;

    // Optimized (Round/Oval) logic
    const verticalStepOptimized = effectiveH * Math.sqrt(3) / 2;

    let total = 0;

    if (shape === 'Round') {
      // Replicating drawCanvas loop for Round (Optimized)
      for (let y = 0; ; y++) {
        let currentStickerCenterY = y * verticalStepOptimized + sizeInch / 2;
        if (currentStickerCenterY + sizeInch / 2 > usableHeight + 0.001) break;
        for (let x = 0; ; x++) {
          let rowHorizontalShift = (y % 2 !== 0) ? effectiveW / 2 : 0;
          let currentStickerCenterX = x * effectiveW + rowHorizontalShift + sizeInch / 2;
          if (currentStickerCenterX + sizeInch / 2 > usableWidth + 0.001) break;
          total++;
        }
      }
    } else {
      // Rectangle / Square logic (Standard)
      for (let y = 0; ; y++) {
        let currentStickerCenterY = y * effectiveH + sizeInch / 2;
        if (currentStickerCenterY + sizeInch / 2 > usableHeight + 0.001) break;
        for (let x = 0; ; x++) {
          let currentStickerCenterX = x * effectiveW + sizeInch / 2;
          if (currentStickerCenterX + sizeInch / 2 > usableWidth + 0.001) break;
          total++;
        }
      }
    }
    return total;
  };

  // Helper to calc price (Price per SqFt * Area)
  const unitPrice = _ctx.getGlobalAgentMode() ? selectedMat.agentPrice : selectedMat.customerPrice;
  const areaSqFt = (paperW * paperH) / 144;
  const basePrice = areaSqFt * unitPrice;

  // 3. Build Table - RED STICKER STYLE
  let html = `
    <div class="text-center mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-900 shadow-sm">
        <h3 class="text-lg font-bold text-red-600 uppercase">Sticker Price List (${modeLabel})</h3>
        <p class="font-semibold text-blue-600 mt-2">${selectedMat.name}</p>
        <div class="flex justify-center gap-8 mt-2 text-sm text-gray-600 dark:text-gray-300">
             <span>Paper Size: <strong>${paperSizeText}</strong></span>
             <span>Price/Sheet: <strong class="text-gray-900 dark:text-white">RM ${basePrice.toFixed(2)}</strong></span>
        </div>
    </div>

    <h3 class="bg-red-600 text-white p-2 rounded-md text-center font-bold text-base mb-4">PRICE PER SHEET (RM)</h3>
    <table class="w-full text-left border-collapse border border-gray-200 dark:border-gray-700" style="font-size: 0.875rem;">
      <thead>
        <tr class="bg-red-50 dark:bg-red-900 border-b border-gray-200 dark:border-gray-700">
          <th class="p-3 text-center font-bold text-red-700 dark:text-red-200" style="width: 33%;">SIZE</th>
          <th class="p-3 text-center font-bold text-red-700 dark:text-red-200 static-shape-label" style="width: 33%;">ROUND QTY</th>
          <th class="p-3 text-center font-bold text-red-700 dark:text-red-200 static-shape-label" style="width: 33%;">RECT QTY</th>
        </tr>
      </thead>
      <tbody>
  `;

  presets.forEach(sizeCm => {
    const qtyRound = calcQty(sizeCm, 'Round');
    const qtyRect = calcQty(sizeCm, 'Rectangle');

    html += `
      <tr class="border-b border-gray-300 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20">
        <td class="p-3 text-center font-medium">${sizeCm} cm</td>
        <td class="p-3 text-center text-gray-700 dark:text-gray-300">${qtyRound} pcs</td>
        <td class="p-3 text-center text-gray-700 dark:text-gray-300">${qtyRect} pcs</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  tableContainer.innerHTML = html;
}

// ===== SMART FINDER =====
export function sfCalcQty(paperW, paperH, sizeW, sizeH, hSpacing, vSpacing, shape, layoutMode) {
  const marginLeft = 0.3937, marginRight = 0.3937, marginTop = 0.3937, marginBottom = 1.1811;
  const usableWidth = paperW - marginLeft - marginRight;
  const usableHeight = paperH - marginTop - marginBottom;
  const effectiveW = sizeW + hSpacing;
  const effectiveH = sizeH + vSpacing;
  if (effectiveW <= 0 || effectiveH <= 0 || sizeW <= 0 || sizeH <= 0) return { count: 0, isApprox: false };

  // Match drawCanvas logic exactly:
  // - "optimized" hex-interlocking only applies when shape is round/oval
  // - "brickByColumn" column offset applies to all shapes
  // - "hybrid" = actual variant logic with gap checking and collision detection
  const isRound = (shape === 'round');
  const verticalStepOptimized = effectiveH * Math.sqrt(3) / 2;

  const countLayout = (useOptimized, useBrick) => {
    let total = 0;
    for (let y = 0; ; y++) {
      const cy = (useOptimized && isRound) ? y * verticalStepOptimized + sizeH / 2 : y * effectiveH + sizeH / 2;
      if (cy + sizeH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        const rowShift = (useOptimized && isRound && y % 2 !== 0) ? effectiveW / 2 : 0;
        const colShift = (useBrick && x % 2 !== 0) ? effectiveH / 2 : 0;
        const cx = x * effectiveW + rowShift + sizeW / 2;
        const cyAdj = cy + colShift;
        if (cx + sizeW / 2 > usableWidth + 0.001) break;
        if (cyAdj + sizeH / 2 > usableHeight + 0.001) {
          if (useBrick) continue;
          else break;
        }
        total++;
      }
    }
    return total;
  };

  if (layoutMode === 'standard') {
    return { count: countLayout(false, false), isApprox: false };
  } else if (layoutMode === 'optimized') {
    return { count: countLayout(true, false), isApprox: false };
  } else if (layoutMode === 'brickByColumn') {
    return { count: countLayout(false, true), isApprox: false };
  } else if (layoutMode === 'hybrid') {
    // Implement actual hybrid variant logic (matching drawCanvas Variant 1: Normal centered, Rotated fills gaps)
    const nestGap = 0.08;
    
    // Generate normal stickers (vertical orientation)
    const normalStickers = [];
    for (let y = 0; ; y++) {
      let currentY = y * effectiveH + sizeH / 2;
      if (currentY + sizeH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        let currentX = x * effectiveW + sizeW / 2;
        if (currentX + sizeW / 2 > usableWidth + 0.001) break;
        normalStickers.push({
          x: currentX - sizeW / 2,
          y: currentY - sizeH / 2,
          w: sizeW,
          h: sizeH,
          rotated: false
        });
      }
    }

    // Generate rotated stickers (horizontal orientation - rotated 90 degrees)
    const rotW = sizeH;
    const rotH = sizeW;
    const rotatedStickers = [];
    for (let y = 0; ; y++) {
      let currentY = y * (rotH + vSpacing) + rotH / 2;
      if (currentY + rotH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        let currentX = x * (rotW + hSpacing) + rotW / 2;
        if (currentX + rotW / 2 > usableWidth + 0.001) break;
        rotatedStickers.push({
          x: currentX - rotW / 2,
          y: currentY - rotH / 2,
          w: rotW,
          h: rotH,
          rotated: true
        });
      }
    }

    // Collision detection with gap for different orientations
    const hasCollision = (sticker1, sticker2) => {
      if (sticker1.rotated === sticker2.rotated) return false; // Same orientation, no gap needed
      const gap = nestGap;
      return (
        sticker1.x < sticker2.x + sticker2.w + gap &&
        sticker1.x + sticker1.w > sticker2.x + gap &&
        sticker1.y < sticker2.y + sticker2.h + gap &&
        sticker1.y + sticker1.h > sticker2.y + gap
      );
    };

    // Center normal stickers and filter non-overlapping rotated ones
    let nMinX = Infinity, nMaxX = -Infinity;
    normalStickers.forEach(s => {
      nMinX = Math.min(nMinX, s.x);
      nMaxX = Math.max(nMaxX, s.x + s.w);
    });
    const nWidth = nMaxX - nMinX;
    const nOffsetX = (usableWidth - nWidth) / 2;
    const centeredNormalStickers = normalStickers.map(s => ({ ...s, x: s.x + nOffsetX }));

    let totalCount = centeredNormalStickers.length;
    rotatedStickers.forEach(rSticker => {
      let overlaps = false;
      for (let nSticker of centeredNormalStickers) {
        if (hasCollision(rSticker, nSticker)) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        totalCount++;
      }
    });

    return { count: totalCount, isApprox: false };
  } else {
    // Fallback for any unknown mode
    const std = countLayout(false, false);
    const opt = countLayout(true, false);
    const brk = countLayout(false, true);
    return { count: Math.max(std, opt, brk), isApprox: true };
  }
}

// Shared function to generate stickers array (used by both drawCanvas and calculateActualFitCount)
// This ensures they both use identical logic for sticker positioning
export function generateStickersArray(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode, usableWidth, usableHeight, hybridVariant = "1") {
  const effectiveArtW = designW + horizSpacing;
  const effectiveArtH = designH + vertSpacing;
  const verticalStepOptimized = effectiveArtH * Math.sqrt(3) / 2;

  let stickersToDraw = [];

  // --- HYBRID MODE LOGIC ---
  if (layoutMode === 'hybrid') {
    // Use specified variant (default: 1)
    const nestGap = 0.08;
    const padding = 0.01;

    // Generate base stickers (normal orientation - vertical)
    const normalStickers = [];
    for (let y = 0; ; y++) {
      let currentY = y * effectiveArtH + designH / 2;
      if (currentY + designH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        let currentX = x * effectiveArtW + designW / 2;
        if (currentX + designW / 2 > usableWidth + 0.001) break;
        normalStickers.push({
          x: currentX - designW / 2,
          y: currentY - designH / 2,
          w: designW,
          h: designH,
          shape: stickerShape,
          rotated: false
        });
      }
    }

    // Generate rotated stickers (horizontal orientation)
    const rotW = designH;
    const rotH = designW;
    const rotatedStickers = [];
    for (let y = 0; ; y++) {
      let currentY = y * (rotH + vertSpacing) + rotH / 2;
      if (currentY + rotH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        let currentX = x * (rotW + horizSpacing) + rotW / 2;
        if (currentX + rotW / 2 > usableWidth + 0.001) break;
        rotatedStickers.push({
          x: currentX - rotW / 2,
          y: currentY - rotH / 2,
          w: rotW,
          h: rotH,
          shape: stickerShape,
          rotated: true
        });
      }
    }

    // Collision detection
    const hasGap = (sticker1, sticker2) => {
      if (sticker1.rotated === sticker2.rotated) return false;
      const gap = nestGap;
      return (
        sticker1.x < sticker2.x + sticker2.w + gap &&
        sticker1.x + sticker1.w > sticker2.x + gap &&
        sticker1.y < sticker2.y + sticker2.h + gap &&
        sticker1.y + sticker1.h > sticker2.y + gap
      );
    };

    // Variant 1: Normal centered, Rotated fills gaps
    if (hybridVariant === "1") {
      let nMinX = Infinity, nMaxX = -Infinity;
      normalStickers.forEach(s => {
        nMinX = Math.min(nMinX, s.x);
        nMaxX = Math.max(nMaxX, s.x + s.w);
      });
      const nWidth = nMaxX - nMinX;
      const nOffsetX = (usableWidth - nWidth) / 2;
      const centeredNormalStickers = normalStickers.map(s => ({ ...s, x: s.x + nOffsetX }));

      rotatedStickers.forEach(rSticker => {
        let overlaps = false;
        for (let nSticker of centeredNormalStickers) {
          if (hasGap(rSticker, nSticker)) {
            overlaps = true;
            break;
          }
          if (rSticker.x < nSticker.x + nSticker.w + padding &&
            rSticker.x + rSticker.w > nSticker.x + padding &&
            rSticker.y < nSticker.y + nSticker.h + padding &&
            rSticker.y + nSticker.h > nSticker.y + padding) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          stickersToDraw.push(rSticker);
        }
      });
      stickersToDraw.push(...centeredNormalStickers);
    }
    // Variant 2: Rotated centered, Normal fills gaps
    else if (hybridVariant === "2") {
      let rMinX = Infinity, rMaxX = -Infinity;
      rotatedStickers.forEach(s => {
        rMinX = Math.min(rMinX, s.x);
        rMaxX = Math.max(rMaxX, s.x + s.w);
      });
      const rWidth = rMaxX - rMinX;
      const rOffsetX = (usableWidth - rWidth) / 2;
      const centeredRotatedStickers = rotatedStickers.map(s => ({ ...s, x: s.x + rOffsetX }));

      normalStickers.forEach(nSticker => {
        let overlaps = false;
        for (let rSticker of centeredRotatedStickers) {
          if (hasGap(nSticker, rSticker)) {
            overlaps = true;
            break;
          }
          if (nSticker.x < rSticker.x + rSticker.w + padding &&
            nSticker.x + nSticker.w > rSticker.x + padding &&
            nSticker.y < rSticker.y + rSticker.h + padding &&
            nSticker.y + nSticker.h > rSticker.y + padding) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          stickersToDraw.push(nSticker);
        }
      });
      stickersToDraw.push(...centeredRotatedStickers);
    }
    // Variant 3: Rotated aligned TOP, Normal fills gaps below
    else if (hybridVariant === "3") {
      normalStickers.forEach(nSticker => {
        let overlaps = false;
        for (let rSticker of rotatedStickers) {
          if (hasGap(nSticker, rSticker)) {
            overlaps = true;
            break;
          }
          if (nSticker.x < rSticker.x + rSticker.w + padding &&
            nSticker.x + nSticker.w > rSticker.x + padding &&
            nSticker.y < rSticker.y + rSticker.h + padding &&
            nSticker.y + nSticker.h > rSticker.y + padding) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          stickersToDraw.push(nSticker);
        }
      });
      stickersToDraw.push(...rotatedStickers);
    }
    // Variant 4: Rotated centered vertically, Normal fills gaps
    else if (hybridVariant === "4") {
      let rMinY = Infinity, rMaxY = -Infinity;
      rotatedStickers.forEach(s => {
        rMinY = Math.min(rMinY, s.y);
        rMaxY = Math.max(rMaxY, s.y + s.h);
      });
      const rHeight = rMaxY - rMinY;
      const rOffsetY = (usableHeight - rHeight) / 2;
      const centeredRotatedTopStickers = rotatedStickers.map(s => ({ ...s, y: s.y + rOffsetY }));

      normalStickers.forEach(nSticker => {
        let overlaps = false;
        for (let rSticker of centeredRotatedTopStickers) {
          if (hasGap(nSticker, rSticker)) {
            overlaps = true;
            break;
          }
          if (nSticker.x < rSticker.x + rSticker.w + padding &&
            nSticker.x + nSticker.w > rSticker.x + padding &&
            nSticker.y < rSticker.y + rSticker.h + padding &&
            nSticker.y + nSticker.h > rSticker.y + padding) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          stickersToDraw.push(nSticker);
        }
      });
      stickersToDraw.push(...centeredRotatedTopStickers);
    }
  } else {
    // --- STANDARD LAYOUT LOGIC ---
    for (let y = 0; ; y++) {
      let currentStickerCenterY = (layoutMode === "optimized" && (stickerShape === "round" || stickerShape === "oval")) ? y * verticalStepOptimized + designH / 2 : y * effectiveArtH + designH / 2;
      if (currentStickerCenterY + designH / 2 > usableHeight + 0.001) break;
      for (let x = 0; ; x++) {
        let rowHorizontalShift = (layoutMode === "optimized" && (stickerShape === "round" || stickerShape === "oval") && y % 2 !== 0) ? effectiveArtW / 2 : 0;
        let columnVerticalShift = (layoutMode === "brickByColumn" && x % 2 !== 0) ? effectiveArtH / 2 : 0;
        let currentStickerCenterX = x * effectiveArtW + rowHorizontalShift + designW / 2;
        let currentStickerCenterYWithColumnOffset = currentStickerCenterY + columnVerticalShift;
        if (currentStickerCenterX + designW / 2 > usableWidth + 0.001) break;
        if (currentStickerCenterYWithColumnOffset + designH / 2 > usableHeight + 0.001) {
          if (layoutMode === "brickByColumn") continue;
          else break;
        }
        stickersToDraw.push({
          x: currentStickerCenterX - designW / 2,
          y: currentStickerCenterYWithColumnOffset - designH / 2,
          w: designW,
          h: designH,
          shape: stickerShape,
          rotated: false
        });
      }
    }
  }

  return stickersToDraw;
}

// Calculate actual fit count by using the shared sticker generation logic
// This ensures 100% accuracy with canvas preview
export function calculateActualFitCount(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode) {
  const marginLeft = 0.3937, marginRight = 0.3937, marginTop = 0.3937, marginBottom = 1.1811;
  const usableWidth = paperW - marginLeft - marginRight;
  const usableHeight = paperH - marginTop - marginBottom;
  
  // Determine actual shape
  let actualStickerShape = stickerShape;
  if (stickerShape === "round") {
    actualStickerShape = Math.abs(designW - designH) < 0.001 ? "round" : "oval";
  } else {
    actualStickerShape = Math.abs(designW - designH) < 0.001 ? "square" : "rectangle";
  }

  // Get hybrid variant from UI (same as drawCanvas does)
  const hybridVariant = document.getElementById("hybridLayoutVariant") ? document.getElementById("hybridLayoutVariant").value : "1";

  // Generate stickers using shared function with the same variant as canvas
  const stickersToDraw = generateStickersArray(paperW, paperH, designW, designH, horizSpacing, vertSpacing, actualStickerShape, layoutMode, usableWidth, usableHeight, hybridVariant);
  
  return { count: stickersToDraw.length, isApprox: false };
}

export function setSFShape(shape) {
  stickerSmartFinderState.shape = shape;
  document.getElementById('sfShapeBtnRect').classList.toggle('active', shape === 'rect');
  document.getElementById('sfShapeBtnRound').classList.toggle('active', shape === 'round');

  // Auto-switch Smart Finder Layout Mode based on shape
  const newMode = (shape === 'rect') ? 'standard' : 'optimized';
  // Use existing helper to update select value + custom dropdown UI
  if (typeof selectGenericStickerDropdownOption === 'function') {
      selectGenericStickerDropdownOption('sfLayoutMode', 'stickerSFLayoutModeWrapper', newMode);
  } else {
      // Fallback
      const sel = document.getElementById('sfLayoutMode');
      if (sel) sel.value = newMode;
  }
}

export function setSFMode(mode) {
  stickerSmartFinderState.mode = mode;
  document.getElementById('sfMode1Inputs').style.display = mode === 1 ? '' : 'none';
  document.getElementById('sfMode2Inputs').style.display = mode === 2 ? '' : 'none';
  document.getElementById('sfModeBtn1').classList.toggle('active', mode === 1);
  document.getElementById('sfModeBtn2').classList.toggle('active', mode === 2);
  document.getElementById('sfResults').innerHTML = '';
}

export function toggleSFUnit() {
  const select = document.getElementById('sfUnitSelect');
  if (!select) return;
  const newUnit = select.value;
  if (newUnit === stickerSmartFinderState.unit) return;
  ['sfSizeW', 'sfSizeH'].forEach(id => {
    const input = document.getElementById(id);
    if (!input || input.value === '') return;
    const valueInInches = convertToInches(parseFloat(input.value), stickerSmartFinderState.unit);
    if (!isNaN(valueInInches)) {
      input.value = convertFromInches(valueInInches, newUnit).toFixed(1);
    }
  });
  stickerSmartFinderState.unit = newUnit;
  syncStickerDropdownLabel('sfUnitSelect', 'stickerSFUnitWrapper');
}

export function sfBlinkInputs(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = parseFloat(el.value);
    if (isNaN(val) || val <= 0) {
      const origPlaceholder = el.placeholder;
      el.placeholder = 'Required!';
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 0 2px rgba(220, 70, 70, 0.55)';
      setTimeout(() => { el.style.boxShadow = 'none'; }, 300);
      setTimeout(() => { el.style.boxShadow = '0 0 0 2px rgba(220, 70, 70, 0.55)'; }, 600);
      setTimeout(() => { el.style.boxShadow = 'none'; }, 900);
      setTimeout(() => { el.style.boxShadow = '0 0 0 2px rgba(220, 70, 70, 0.55)'; }, 1200);
      setTimeout(() => { el.style.boxShadow = ''; el.style.transition = ''; el.placeholder = origPlaceholder; }, 1500);
    }
  });
}

export function toggleSFTable(tableId, iconId, btnId, colorTheme) {
  const table = document.getElementById(tableId);
  const icon = document.getElementById(iconId);
  const btn = document.getElementById(btnId);
  if (!table || !icon || !btn) return;
  
  const isHidden = table.classList.contains('hidden');
  
    let colorClass = [];
    let dimClass = [];
    const grayClass = ['bg-gray-50', 'dark:bg-gray-800', 'text-gray-500', 'hover:bg-gray-100', 'dark:hover:bg-gray-700']; // fallback

    if (colorTheme === 'indigo') {
        colorClass = ['bg-indigo-100', 'dark:bg-indigo-900', 'text-indigo-700', 'dark:text-indigo-300', 'hover:bg-indigo-200', 'dark:hover:bg-indigo-800'];
        dimClass = ['bg-indigo-50', 'dark:bg-indigo-900/40', 'text-indigo-500', 'dark:text-indigo-400', 'hover:bg-indigo-100', 'dark:hover:bg-indigo-900/60'];
    } else {
        colorClass = ['bg-emerald-100', 'dark:bg-emerald-900', 'text-emerald-700', 'dark:text-emerald-300', 'hover:bg-emerald-200', 'dark:hover:bg-emerald-800'];
        dimClass = ['bg-emerald-50', 'dark:bg-emerald-900/40', 'text-emerald-500', 'dark:text-emerald-400', 'hover:bg-emerald-100', 'dark:hover:bg-emerald-900/60'];
    }

    if (isHidden) {
      table.classList.remove('hidden');
      icon.classList.remove('fa-chevron-right');
      icon.classList.add('fa-chevron-down');
      btn.classList.remove(...dimClass);
      btn.classList.remove(...grayClass);
      btn.classList.add(...colorClass);
    } else {
      table.classList.add('hidden');
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-right');
      btn.classList.remove(...colorClass);
      btn.classList.add(...dimClass);

      }
  }

export function runStickerSmartFinder(mode) {
    stickerSmartFinderState.lastRunMode = mode;
    const matIndex = document.getElementById('stickerMaterial').value;
    const selectedMat = _ctx.getMaterials()[matIndex];
    const unitPrice = _ctx.getGlobalAgentMode() ? selectedMat.agentPrice : selectedMat.customerPrice;

    const shape = stickerSmartFinderState.shape;
  const layoutSel = document.getElementById('sfLayoutMode');
  const layoutMode = layoutSel ? layoutSel.value : 'optimized';
  const resultsEl = document.getElementById('sfResults');
  if (!resultsEl) return;

  const paperSizes = STICKER_PAPER_SIZES.map(ps => ({ label: ps.label, w: ps.w, h: ps.h }));

  const modeLabel = _ctx.getGlobalAgentMode() ? 'AGENT' : 'CUSTOMER';
  const activeColor = _ctx.getGlobalAgentMode() ? '#059669' : '#2563eb';

  if (mode === 1) {
    // Budget Finder: 2 Tables
    const budget = parseFloat(document.getElementById('sfBudget').value);
    const targetQty = parseInt(document.getElementById('sfQtyMode1').value);
    if (isNaN(budget) || budget <= 0 || isNaN(targetQty) || targetQty <= 0) {
      sfBlinkInputs(['sfBudget', 'sfQtyMode1']);
      _ctx.showToast('Please fill in all required fields.', 'warning');
      return;
    }

    const rollWidths = [48];
    const marginTop2 = 0.3937, marginBot2 = 1.1811;

    // --- TABLE 1: Suggest Biggest Size (Target Qty Focus) ---
    // Logic: Iterate sizes 50cm -> 1cm. Find cheapest config fitting targetQty within budget.
    const results1 = [];
    for (let s = 50.0; s >= 1.0; s -= 0.5) {
      if (results1.length >= 20) break; // Increased limit slightly to accommodate double rows
      
      const sizeCm = parseFloat(s.toFixed(1));
      const sizeInch = convertToInches(sizeCm, 'cm');
      
      let hSp = 0, vSp = 0; 
      if (stickerEditorState.artworkPresets[sizeCm]) {
        const preset = stickerEditorState.artworkPresets[sizeCm];
        hSp = convertToInches(preset.horizontal, preset.unit);
        vSp = convertToInches(preset.vertical, preset.unit);
      } else if (shape === 'round') {
        hSp = convertToInches(0.1, 'cm');
        vSp = convertToInches(0.1, 'cm');
      }

      let bestPresetConfig = null;
      let bestCustomConfig = null;

      // 1. Check Presets
      for (const ps of paperSizes) {
         const sheetPrice = (ps.w * ps.h) / 144 * unitPrice;
         const res = calculateActualFitCount(ps.w, ps.h, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
         
         if (res.count > 0) {
            const sheetsNeeded = Math.ceil(targetQty / res.count);
            const totalCost = sheetPrice * sheetsNeeded;
            if (totalCost <= budget) {
               if (!bestPresetConfig || totalCost < bestPresetConfig.totalPrice) {
                 bestPresetConfig = { 
                   paper: ps.label, paperW: ps.w, paperH: ps.h, 
                   sizeCm: sizeCm, qty: sheetsNeeded * res.count, 
                   qtyPerSheet: res.count,
                   totalPrice: totalCost, desc: `${sheetsNeeded} sheets`,
                   isCustom: false 
                 };
               }
            }
         }
      }

      // 2. Check Custom Roll (48") - Find MIN HEIGHT to fit TARGET QTY (Economical custom cut)
      for (const rw of rollWidths) {
        const maxL_budget = (budget / unitPrice * 144) / rw;
        const minL = sizeInch + marginTop2 + marginBot2 + 0.01;
        
        if (maxL_budget < minL) continue; 

        // Check if max budget height with margins subtracted can even fit qty
        const usableMaxH = maxL_budget - (marginTop2 + marginBot2);
        if (usableMaxH <= 0) continue;
        const maxRes = calculateActualFitCount(rw, usableMaxH, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
        if (maxRes.count < targetQty) continue;

        // Binary Search for smallest length that fits targetQty
        let lo = minL, hi = maxL_budget;
        let foundL = null;
        for (let j=0; j<20; j++) {
           const mid = (lo + hi) / 2;
           const usableH = mid - (marginTop2 + marginBot2);
           if (usableH <= 0) { lo = mid; continue; }
           const res = calculateActualFitCount(rw, usableH, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
           if (res.count >= targetQty) {
             foundL = mid;
             hi = mid;
           } else {
             lo = mid;
           }
        }
        
        if (foundL !== null) {
          // Try rounding DOWN first for minimal paper waste
          let snappedH_down = Math.floor(foundL * 2) / 2;
          const usableHDown = snappedH_down - (marginTop2 + marginBot2);
          const testRes = calculateActualFitCount(rw, usableHDown, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
          let snappedH = (testRes.count >= targetQty) ? snappedH_down : Math.ceil(foundL * 2) / 2;
          
          const cost = (rw * snappedH) / 144 * unitPrice;
          
          if (cost <= budget) {
             const usableH = snappedH - (marginTop2 + marginBot2);
             const finalRes = calculateActualFitCount(rw, usableH, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
             if (finalRes.count >= targetQty) {
                 if (!bestCustomConfig || cost < bestCustomConfig.totalPrice) {
                    bestCustomConfig = {
                        paper: `${rw}\u2033\u00d7${snappedH}\u2033`, paperW: rw, paperH: snappedH,
                        sizeCm: sizeCm, qty: finalRes.count,
                        qtyPerSheet: finalRes.count,
                        totalPrice: cost, desc: '1 cut',
                        isCustom: true
                    };
                 }
             }
          }
        }
      }

      // Push both if they exist, or just one.
      // This ensures 12x18 (via bestPresetConfig) is shown even if 48" roll is cheaper
      if (bestPresetConfig) results1.push(bestPresetConfig);
      if (bestCustomConfig) results1.push(bestCustomConfig);
    }

    // --- TABLE 2: Budget Maximizer (1cm - 10cm) ---
    // Logic: For each size, show 48" Roll (Max Budget) AND Best Preset (Max Sheets)
    const results2 = [];
    for (let s = 1; s <= 10; s++) {
        const sizeCm = s;
        const sizeInch = convertToInches(sizeCm, 'cm');
        
        // Similar spacing logic
        let hSp = 0, vSp = 0; 
        if (stickerEditorState.artworkPresets[sizeCm]) {
          const preset = stickerEditorState.artworkPresets[sizeCm];
          hSp = convertToInches(preset.horizontal, preset.unit);
          vSp = convertToInches(preset.vertical, preset.unit);
        } else if (shape === 'round') {
          hSp = convertToInches(0.1, 'cm');
          vSp = convertToInches(0.1, 'cm');
        }

        // Option A: 48" Roll (Max Budget)
        const rw = 48;
        const maxH_budget = (budget / unitPrice * 144) / rw;
        // Check min height
        const minL = sizeInch + marginTop2 + marginBot2;
        if (maxH_budget >= minL) {
             const snappedH = Math.floor(maxH_budget * 2) / 2;
             // re-check minL after floor
             if (snappedH >= minL) {
               const cost = (rw * snappedH)/144 * unitPrice;
               const usableH = snappedH - (marginTop2 + marginBot2);
               const res = calculateActualFitCount(rw, usableH, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
               if (res.count > 0) {
                  results2.push({
                      sizeCm: s, isRoll: true,
                      paper: `${rw}\u2033\u00d7${snappedH}\u2033`, paperW: rw, paperH: snappedH,
                      qty: res.count, qtyPerSheet: res.count, price: cost, desc: 'Max Length (Budget)'
                  });
               }
             }
        }

        // Option B: Best Preset (Max Sheets for Budget)
        let bestPreset = null;
        for (const ps of paperSizes) {
            const sheetPrice = (ps.w * ps.h)/144 * unitPrice;
            const maxSheets = Math.floor(budget / sheetPrice);
            if (maxSheets >= 1) {
                const res = calculateActualFitCount(ps.w, ps.h, sizeInch, sizeInch, hSp, vSp, shape, layoutMode);
                if (res.count > 0) {
                  const totalQty = res.count * maxSheets;
                  if (!bestPreset || totalQty > bestPreset.qty) {
                      bestPreset = {
                          sizeCm: s, isRoll: false,
                          paper: ps.label, paperW: ps.w, paperH: ps.h,
                          qty: totalQty, qtyPerSheet: res.count, price: sheetPrice * maxSheets, 
                          desc: `${maxSheets} sheets (Max)`
                      };
                  }
                }
            }
        }
        if (bestPreset) results2.push(bestPreset);
    }
    
    // Filter: Only show positive diffs (qty >= targetQty)
    for (let i = results2.length - 1; i >= 0; i--) {
        if (results2[i].qty < targetQty) {
            results2.splice(i, 1);
        }
    }

    // Sort Results2: Size Ascending -> Roll First
    results2.sort((a,b) => {
        if (a.sizeCm !== b.sizeCm) return a.sizeCm - b.sizeCm;
        if (a.isRoll && !b.isRoll) return -1;
        if (!a.isRoll && b.isRoll) return 1;
        return 0;
    });


    // --- RENDER ---
    let html = `<div class="mt-3">`;
    html += `<div class="text-center mb-2"><span class="text-xs font-bold uppercase" style="color:${activeColor}">${modeLabel} BUDGET MODE</span></div>`;

    if (results1.length === 0 && results2.length === 0) {
       resultsEl.innerHTML = '<p class="text-sm text-gray-500 mt-2">No results found. Try adjusting budget or quantity.</p>';
       return;
    }

    // Render Table 1
    if (results1.length > 0) {
      html += `<div class="mb-4">`;
      // Default: Expanded -> use active indigo classes
      html += `<button id="sfBtn1" onclick="toggleSFTable('sfTable1', 'sfIcon1', 'sfBtn1', 'indigo')" class="w-full text-left flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1 p-2 rounded border border-gray-300 dark:border-gray-700 transition-colors focus:outline-none bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800">`;
      html += `<span>Based on Target Qty (${targetQty}pcs)</span>`;
      html += `<i id="sfIcon1" class="fas fa-chevron-down text-gray-400 transition-transform duration-200"></i>`;
      html += `</button>`;
      html += `<div id="sfTable1" class="transition-all duration-300 overflow-hidden">`;
      html += `<table class="w-full text-left border-collapse border border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent" style="font-size:0.8rem;">`;
      html += `<thead><tr class="bg-indigo-50 dark:bg-indigo-900/40 border-b border-gray-200 dark:border-gray-700">`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Artwork Size</th>`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Paper Size</th>`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Qty/Sheet</th>`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Total Sheet</th>`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Diff</th>`; 
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Total Qty</th>`;
      html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Price</th>`;
      html += `</tr></thead><tbody>`;
      
      results1.forEach(r => {
        const diff = r.qty - targetQty;
        const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
        const diffColor = diff >= 0 ? 'color:#059669' : 'color:#dc2626';
        let sheetCount = "1";
        if (r.desc && r.desc.includes('sheets')) {
             sheetCount = r.desc.replace(' sheets', '');
        } else if (r.desc && r.desc.includes('cut')) {
             sheetCount = "1";
        }
        
        html += `<tr class="border-b border-gray-300 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer" onclick="applySFResult(${r.paperW},${r.paperH},${r.sizeCm},${r.sizeCm},'${shape}','${layoutMode}')">`;
        html += `<td class="p-2 text-center font-bold">${r.sizeCm}cm</td>`;
        html += `<td class="p-2 text-center">${r.paper}${r.isCustom ? ' <span class="text-xs px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">custom</span>' : ''}</td>`;
        html += `<td class="p-2 text-center font-medium">${r.qtyPerSheet}</td>`;
        html += `<td class="p-2 text-center font-medium">${sheetCount}</td>`;
        html += `<td class="p-2 text-center" style="${diffColor}">${diffStr}</td>`;
        html += `<td class="p-2 text-center font-medium">${r.qty}</td>`;
        html += `<td class="p-2 text-center">RM ${r.totalPrice.toFixed(2)}</td>`;
        html += `</tr>`;
      });
      html += `</tbody></table></div></div>`;
    }

    // Render Table 2
    if (results2.length > 0) {
      html += `<div class="mb-4">`;
      // Default: Collapsed -> use inactive gray classes
      html += `<button id="sfBtn2" onclick="toggleSFTable('sfTable2', 'sfIcon2', 'sfBtn2', 'emerald')" class="w-full text-left flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1 p-2 rounded border border-gray-300 dark:border-gray-700 transition-colors focus:outline-none bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60">`;
      html += `<span>Max Qty for Budget (RM${budget.toFixed(2)})</span>`;
      html += `<i id="sfIcon2" class="fas fa-chevron-right text-gray-400 transition-transform duration-200"></i>`;
      html += `</button>`;
      html += `<div id="sfTable2" class="transition-all duration-300 overflow-hidden hidden">`;
      html += `<table class="w-full text-left border-collapse border border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent" style="font-size:0.8rem;">`;
      html += `<thead><tr class="bg-emerald-50 dark:bg-emerald-900/40 border-b border-gray-200 dark:border-gray-700">`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Artwork Size</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Paper Size</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Qty/Sheet</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Total Sheet</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Diff</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Total Qty</th>`;
      html += `<th class="p-2 text-center font-bold text-emerald-700 dark:text-emerald-300">Est. Price</th>`;
      html += `</tr></thead><tbody>`;
      
      let lastSize = -1;
      results2.forEach((r, idx) => {
         const isAlt = (r.sizeCm % 2 !== 0); // Alternate bg based on size group maybe?
         // Actually simpler to just use standard row hover.
         // But maybe separate size groups visually.
         const borderStyle = (idx < results2.length -1 && results2[idx+1].sizeCm !== r.sizeCm) ? 'border-b-2 border-gray-400 dark:border-gray-600' : 'border-b border-gray-100 dark:border-gray-700';

         const diff = r.qty - targetQty;
         const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
         const diffColor = diff >= 0 ? 'color:#059669' : 'color:#dc2626';

         let sheetCount = "1";
         if (r.desc && r.desc.includes('sheets')) {
             sheetCount = parseInt(r.desc);
         }
         
         html += `<tr class="${borderStyle} hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer" onclick="applySFResult(${r.paperW},${r.paperH},${r.sizeCm},${r.sizeCm},'${shape}','${layoutMode}')">`;
         html += `<td class="p-2 text-center font-bold">${r.sizeCm}cm</td>`;
         html += `<td class="p-2 text-center">${r.paper}${r.isRoll ? ' <span class="text-xs px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">custom</span>' : ''}</td>`;
         html += `<td class="p-2 text-center font-medium">${r.qtyPerSheet}</td>`;
         html += `<td class="p-2 text-center font-medium">${sheetCount}</td>`;
         html += `<td class="p-2 text-center" style="${diffColor}">${diffStr}</td>`;
         html += `<td class="p-2 text-center font-medium">${r.qty}</td>`;
         html += `<td class="p-2 text-center">RM ${r.price.toFixed(2)}</td>`;
         html += `</tr>`;
      });
      html += `</tbody></table></div></div>`;
    }

    html += `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-mouse-pointer mr-1"></i>Click any row to apply</p>`;
    html += `<p class="mt-1.5 italic text-gray-500 dark:text-gray-400" style="font-size: 11.5px; line-height: 1.3; letter-spacing: -0.1px;">* The suggest qty may have error qty inside table, and it may have different qty inside preview canvas, please readjust the paper size again to find the desire qty.</p>`;
    html += `</div>`;
    resultsEl.innerHTML = html;

  } else {

    // Paper Finder: qty + size â†’ paper (preset + custom sizes)
    const targetQty = parseInt(document.getElementById('sfQtyMode2').value);
    const sizeWInput = parseFloat(document.getElementById('sfSizeW').value);
    const sizeHInput = parseFloat(document.getElementById('sfSizeH').value);
    const sizeUnit = document.getElementById('sfUnitSelect') ? document.getElementById('sfUnitSelect').value : stickerSmartFinderState.unit;
    if (isNaN(targetQty) || targetQty <= 0 || isNaN(sizeWInput) || sizeWInput <= 0 || isNaN(sizeHInput) || sizeHInput <= 0) {
      sfBlinkInputs(['sfQtyMode2', 'sfSizeW', 'sfSizeH']);
      _ctx.showToast('Please fill in all required fields.', 'warning');
      return;
    }
    const sizeW = convertToInches(sizeWInput, sizeUnit);
    const sizeH = convertToInches(sizeHInput, sizeUnit);
    const sizeWcm = convertFromInches(sizeW, 'cm');
    const sizeHcm = convertFromInches(sizeH, 'cm');
    // Try to find preset spacing; for round default 0.1cm if no preset
    let hSp = 0, vSp = 0;
    const roundedCm = Math.round(sizeWcm);
    if (Math.abs(sizeWcm - sizeHcm) < 0.001 && Math.abs(sizeWcm - roundedCm) < 0.001 && stickerEditorState.artworkPresets[roundedCm]) {
      const preset = stickerEditorState.artworkPresets[roundedCm];
      hSp = convertToInches(preset.horizontal, preset.unit);
      vSp = convertToInches(preset.vertical, preset.unit);
    } else if (shape === 'round') {
      hSp = convertToInches(0.1, 'cm');
      vSp = convertToInches(0.1, 'cm');
    }

    const results = [];
    const seenKey = new Set();

    // 1. Preset paper sizes
    for (const ps of paperSizes) {
      const price = (ps.w * ps.h) / 144 * unitPrice;
      const res = calculateActualFitCount(ps.w, ps.h, sizeW, sizeH, hSp, vSp, shape, layoutMode);
      const key = `${ps.w}x${ps.h}`;
      seenKey.add(key);
      results.push({ paper: ps.label, paperW: ps.w, paperH: ps.h, qty: res.count, diff: res.count - targetQty, price, isApprox: res.isApprox, isCustom: false });
    }

    // 2. Custom sizes: for common roll widths, find optimal height to hit target qty
    const rollWidths = [48];
    const marginTop2 = 0.3937, marginBot2 = 1.1811;
    const effectiveH = sizeH + vSp;

    for (const rw of rollWidths) {
      // Max height: 48" for widths < 48 (no point unrolling big roll for narrow strip), 120" for 48" width
      const minH = sizeH + marginTop2 + marginBot2 + 0.01;
      const maxH = rw >= 48 ? 120 : 48;
      let bestH = null;
      let bestQty = 0;
      let bestApprox = false;

      // First check: can this width even fit 1 sticker column? (need at least sizeW + margins)
      if (sizeW + 0.3937 * 2 > rw + 0.001) continue;

      // Check if max height is enough to reach target
      const maxRes = calculateActualFitCount(rw, maxH, sizeW, sizeH, hSp, vSp, shape, layoutMode);
      if (maxRes.count < targetQty) {
        // Even 120" can't reach target with this width â€” show max as option if not a duplicate
        const key = `${rw}x${maxH}`;
        if (!seenKey.has(key) && maxRes.count > 0) {
          seenKey.add(key);
          const price = (rw * maxH) / 144 * unitPrice;
          results.push({ paper: `${rw}\u2033\u00d7${maxH}\u2033`, paperW: rw, paperH: maxH, qty: maxRes.count, diff: maxRes.count - targetQty, price, isApprox: maxRes.isApprox, isCustom: true });
        }
        continue;
      }

      // Binary search: find smallest height where qty >= targetQty
      let lo = minH, hi = maxH;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const res = calculateActualFitCount(rw, mid, sizeW, sizeH, hSp, vSp, shape, layoutMode);
        if (res.count >= targetQty) {
          hi = mid;
          bestH = mid;
          bestQty = res.count;
          bestApprox = res.isApprox;
        } else {
          lo = mid;
        }
      }

      if (bestH !== null) {
        // Snap height to nearest 0.5 inch (practical cut size), re-check qty
        let snappedH = Math.ceil(bestH * 2) / 2;
        const snapRes = calculateActualFitCount(rw, snappedH, sizeW, sizeH, hSp, vSp, shape, layoutMode);
        if (snapRes.count >= targetQty) {
          bestH = snappedH;
          bestQty = snapRes.count;
          bestApprox = snapRes.isApprox;
        } else {
          // Snap up one more 0.5"
          snappedH += 0.5;
          const snapRes2 = calculateActualFitCount(rw, snappedH, sizeW, sizeH, hSp, vSp, shape, layoutMode);
          bestH = snappedH;
          bestQty = snapRes2.count;
          bestApprox = snapRes2.isApprox;
        }

        const key = `${rw}x${bestH}`;
        if (!seenKey.has(key)) {
          seenKey.add(key);
          const price = (rw * bestH) / 144 * unitPrice;
          results.push({ paper: `${rw}\u2033\u00d7${bestH}\u2033`, paperW: rw, paperH: bestH, qty: bestQty, diff: bestQty - targetQty, price, isApprox: bestApprox, isCustom: true });
        }

        // Also show exact-fit if different from snapped (the smallest qty >= target at this width)
        // And show a "generous" option: next whole-inch up for cleaner cuts
        const wholeH = Math.ceil(bestH);
        if (wholeH !== bestH) {
          const wholeKey = `${rw}x${wholeH}`;
          if (!seenKey.has(wholeKey)) {
            seenKey.add(wholeKey);
            const wholeRes = calculateActualFitCount(rw, wholeH, sizeW, sizeH, hSp, vSp, shape, layoutMode);
            const wholePrice = (rw * wholeH) / 144 * unitPrice;
            if (wholeRes.count >= targetQty) {
              results.push({ paper: `${rw}\u2033\u00d7${wholeH}\u2033`, paperW: rw, paperH: wholeH, qty: wholeRes.count, diff: wholeRes.count - targetQty, price: wholePrice, isApprox: wholeRes.isApprox, isCustom: true });
            }
          }
        }
      }
    }

    // Sort: 48in custom first (best roll), then by closest diff, then price
    results.sort((a, b) => {
      const a48 = (a.isCustom && a.paperW === 48) ? 0 : 1;
      const b48 = (b.isCustom && b.paperW === 48) ? 0 : 1;
      if (a48 !== b48) return a48 - b48;
      const aAbs = Math.abs(a.diff);
      const bAbs = Math.abs(b.diff);
      if (aAbs !== bAbs) return aAbs - bAbs;
      return a.price - b.price;
    });

    let html = `<div class="mt-3"><div class="text-center mb-2"><span class="text-xs font-bold uppercase" style="color:${activeColor}">${modeLabel} MODE</span> <span class="text-xs text-gray-400">| ${sizeWcm}cm \u00d7 ${sizeHcm}cm ${shape === 'round' ? '(Round/Oval)' : '(Rect/Square)'}</span></div>`;
    
    // Sort logic remains (by 48in suggest, then diff, then price)
    results.sort((a, b) => {
      const a48 = (a.isCustom && a.paperW === 48) ? 0 : 1;
      const b48 = (b.isCustom && b.paperW === 48) ? 0 : 1;
      if (a48 !== b48) return a48 - b48;
      
      // For tiebreak, we probably care about total qty or price? 
      // Original logic was abs diff of ONE sheet. Now we deal with total sheets.
      // Let's stick to original sort order but calculate multi-sheet values below.
      const aDiff = Math.abs(a.diff); 
      const bDiff = Math.abs(b.diff); 
      if (aDiff !== bDiff) return aDiff - bDiff;
      return a.price - b.price; 
    });

    html += `<table class="w-full text-left border-collapse border border-gray-300 dark:border-gray-700 bg-white dark:bg-transparent" style="font-size:0.8rem;"><thead><tr class="bg-indigo-50 dark:bg-indigo-900/40 border-b border-gray-200 dark:border-gray-700">`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Paper</th>`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Qty/Sheet</th>`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Diff</th>`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">T.Sheet</th>`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">T.Qty</th>`;
    html += `<th class="p-2 text-center font-bold text-indigo-700 dark:text-indigo-300">Price</th>`;
    html += `</tr></thead><tbody>`;
    results.forEach(r => {
      // Logic:
      // qtyPerSheet = r.qty
      // totalSheets = ceil(targetQty / qtyPerSheet)
      // totalQty = totalSheets * qtyPerSheet
      // diff = totalQty - targetQty
      // price = r.price * totalSheets
      
      const qtyPerSheet = r.qty;
      const totalSheets = (qtyPerSheet > 0) ? Math.ceil(targetQty / qtyPerSheet) : 0;
      const totalQty = totalSheets * qtyPerSheet;
      const diff = totalQty - targetQty;
      const totalPrice = r.price * totalSheets;
      
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      const diffColor = diff >= 0 ? 'color:#059669' : 'color:#dc2626';
      // Highlight exact match if diff is 0
      const exactMatch = diff === 0 ? ' font-weight:700;' : '';
      const customBadge = r.isCustom ? (r.paperW === 48 ? ' <span class="text-xs px-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">suggest</span>' : ' <span class="text-xs px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">custom</span>') : '';
      
      html += `<tr class="border-b border-gray-300 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer" onclick="applySFResult(${r.paperW},${r.paperH},${sizeWcm},${sizeHcm},'${shape}','${layoutMode}')" title="Click to apply this setting">`;
      html += `<td class="p-2 text-center">${r.paper}${customBadge}</td>`;
      html += `<td class="p-2 text-center font-medium">${qtyPerSheet}</td>`;
      html += `<td class="p-2 text-center" style="${diffColor}${exactMatch}">${diffStr}</td>`;
      html += `<td class="p-2 text-center">${totalSheets}</td>`;
      html += `<td class="p-2 text-center font-medium">${totalQty}pcs${r.isApprox ? ' ~' : ''}</td>`;
      html += `<td class="p-2 text-center">RM ${totalPrice.toFixed(2)}</td>`;
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    html += `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-mouse-pointer mr-1"></i>Click any row to apply</p>`;
    html += `<p class="mt-1.5 italic text-gray-500 dark:text-gray-400" style="font-size: 11.5px; line-height: 1.3; letter-spacing: -0.1px;">* The suggest qty may have error qty inside table, and it may have different qty inside preview canvas, please readjust the paper size again to find the desire qty.</p>`;
    html += `</div>`;
    resultsEl.innerHTML = html;
  }
}

export function rerunLastStickerSmartFinder() {
  const mode = stickerSmartFinderState.lastRunMode;
  if (mode !== null && document.getElementById('sfResults') && document.getElementById('sfResults').innerHTML !== '') {
    runStickerSmartFinder(mode);
  }
}

export function applySFResult(paperW, paperH, sizeWcm, sizeHcm, sfShape, sfLayout) {
  // 1. Set paper size
  const paperSizeSelect = document.getElementById('paperSize');
  const customPaperDiv = document.getElementById('customPaper');
  const customPaperBtn = document.getElementById('customPaperToggle');
  const presetMap = buildPaperSizePresetMap();
  const presetKey = `${paperW},${paperH}`;
  if (presetMap[presetKey]) {
    paperSizeSelect.value = presetKey;
    customPaperDiv.style.display = 'none';
    if (customPaperBtn) customPaperBtn.classList.remove('active');
  } else {
    paperSizeSelect.value = getPaperSizeValue(getDefaultPaperSize());
    customPaperDiv.style.display = 'block';
    if (customPaperBtn) customPaperBtn.classList.add('active');
    stickerEditorState.currentPaperUnit = 'in';
    document.getElementById('customUnitSelect').value = 'in';
    document.getElementById('paperWidth').value = paperW;
    document.getElementById('paperHeight').value = paperH;
  }

  // 2. Set artwork size
  const artW = convertFromInches(convertToInches(sizeWcm, 'cm'), stickerEditorState.currentArtworkUnit);
  const artH = convertFromInches(convertToInches(sizeHcm, 'cm'), stickerEditorState.currentArtworkUnit);
  // Keep two decimals to reduce rounding drift between Smart Finder and canvas counts
  document.getElementById('artworkWidth').value = artW.toFixed(2);
  document.getElementById('artworkHeight').value = artH.toFixed(2);
  stickerEditorState.originalArtworkDimensions.width = artW;
  stickerEditorState.originalArtworkDimensions.height = artH;
  stickerEditorState.lockedAspectRatio = artH > 0 ? artW / artH : 1;

  // 3. Set shape
  const stickerShapeSel = document.getElementById('stickerShape');
  stickerShapeSel.value = sfShape === 'round' ? 'round' : 'square';

  // 4. Set layout mode
  const layoutModeSel = document.getElementById('layoutMode');
  layoutModeSel.value = sfLayout;
  const hybridOptions = document.getElementById('hybridLayoutOptions');
  if (hybridOptions) hybridOptions.style.display = sfLayout === 'hybrid' ? 'flex' : 'none';

  // 5. Spacing: if rect/square shape always set to 0; if round use preset if available
  if (sfShape === 'rect') {
    document.getElementById('artworkHorizontalSpacing').value = '0.00';
    document.getElementById('artworkVerticalSpacing').value = '0.00';
  } else {
    const roundedCm = Math.round(sizeWcm);
    if (Math.abs(sizeWcm - sizeHcm) < 0.001 && Math.abs(sizeWcm - roundedCm) < 0.001 && stickerEditorState.artworkPresets[roundedCm]) {
      const preset = stickerEditorState.artworkPresets[roundedCm];
      document.getElementById('spacingUnitSelect').value = preset.unit;
      stickerEditorState.currentSpacingUnit = preset.unit;
      document.getElementById('artworkHorizontalSpacing').value = convertFromInches(convertToInches(preset.horizontal, preset.unit), stickerEditorState.currentSpacingUnit).toFixed(2);
      document.getElementById('artworkVerticalSpacing').value = convertFromInches(convertToInches(preset.vertical, preset.unit), stickerEditorState.currentSpacingUnit).toFixed(2);
    } else {
      // Round default spacing: 0.10cm
      document.getElementById('spacingUnitSelect').value = 'cm';
      stickerEditorState.currentSpacingUnit = 'cm';
      document.getElementById('artworkHorizontalSpacing').value = '0.10';
      document.getElementById('artworkVerticalSpacing').value = '0.10';
    }
  }

  // 6. Recalculate
  syncStickerEditorDropdowns();
  calculateLayout();
}
// ===== END SMART FINDER =====

export function drawCanvas(paperW, paperH, designW, designH, horizSpacing, vertSpacing, marginLeft, marginTop, marginRight, marginBottom, stickerShape, layoutMode, usableWidth, usableHeight) {
  const canvas = document.getElementById("layoutCanvas");
  if (!canvas) return {
    total: 0
  };
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const padding = 60,
    targetCanvasWidth = canvas.width - padding * 2,
    targetCanvasHeight = canvas.height - padding * 2;
  const scale = Math.min(targetCanvasWidth / paperW, targetCanvasHeight / paperH);
  const drawnPaperWidth = paperW * scale,
    drawnPaperHeight = paperH * scale;
  const offsetX = (canvas.width - drawnPaperWidth) / 2,
    offsetY = (canvas.height - drawnPaperHeight) / 2;
  ctx.strokeStyle = "#495057";
  ctx.lineWidth = 2;
  ctx.strokeRect(offsetX, offsetY, drawnPaperWidth, drawnPaperHeight);
  const markSize = 4;
  const drawDot = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, markSize, 0, 2 * Math.PI);
    ctx.fillStyle = "#000";
    ctx.fill();
  };
  const regMarkOffset = 0.1;
  drawDot(offsetX + (marginLeft * scale) - (regMarkOffset * scale), offsetY + (marginTop * scale) - (regMarkOffset * scale));
  drawDot(offsetX + drawnPaperWidth - (marginRight * scale) + (regMarkOffset * scale), offsetY + (marginTop * scale) - (regMarkOffset * scale));
  drawDot(offsetX + (marginLeft * scale) - (regMarkOffset * scale), offsetY + drawnPaperHeight - (marginBottom * scale) + (regMarkOffset * scale));
  drawDot(offsetX + drawnPaperWidth - (marginRight * scale) + (regMarkOffset * scale), offsetY + drawnPaperHeight - (marginBottom * scale) + (regMarkOffset * scale));
  const usableAreaX = offsetX + (marginLeft * scale),
    usableAreaY = offsetY + (marginTop * scale);
  const usableAreaW = usableWidth * scale,
    usableAreaH = usableHeight * scale;
  ctx.strokeStyle = "#dc3545";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(usableAreaX, usableAreaY, usableAreaW, usableAreaH);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(0, 123, 255, 0.7)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.lineWidth = 0.5;
  
  // Get hybrid layout variant
  const hybridVariant = document.getElementById("hybridLayoutVariant") ? document.getElementById("hybridLayoutVariant").value : "1";
  
  // Use shared function to generate stickers (ensures Smart Finder accuracy)
  const stickersToDraw = generateStickersArray(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode, usableWidth, usableHeight, hybridVariant);

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  if (stickersToDraw.length > 0) {
    stickersToDraw.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      // Use s.w and s.h (which are set for Hybrid) or default to designW/designH
      maxX = Math.max(maxX, s.x + (s.w || designW));
      maxY = Math.max(maxY, s.y + (s.h || designH));
    });
  } else {
    return {
      total: 0
    };
  }
  const totalDrawnGridWidth = (maxX - minX),
    totalDrawnGridHeight = (maxY - minY);
  const centerOffsetX = (usableWidth - totalDrawnGridWidth) / 2,
    centerOffsetY = (usableHeight - totalDrawnGridHeight) / 2;
  stickersToDraw.forEach(sticker => {
    // Use sticker dimensions if available (Hybrid mode), otherwise defaults
    const itemW = sticker.w || designW;
    const itemH = sticker.h || designH;
    const isRotated = sticker.rotated || false;

    let posX_scaled = usableAreaX + (sticker.x + centerOffsetX) * scale,
      posY_scaled = usableAreaY + (sticker.y + centerOffsetY) * scale;
    let designW_scaled = itemW * scale,
      designH_scaled = itemH * scale;
    ctx.save();
    ctx.beginPath();
    if (sticker.shape === "square" || sticker.shape === "rectangle") {
      ctx.rect(posX_scaled, posY_scaled, designW_scaled, designH_scaled);
    } else if (sticker.shape === "round" || sticker.shape === "oval") {
      ctx.ellipse(posX_scaled + designW_scaled / 2, posY_scaled + designH_scaled / 2, designW_scaled / 2, designH_scaled / 2, 0, 0, 2 * Math.PI);
    }
    ctx.clip();
    if (stickerEditorState.uploadedImage) {
      let drawImageWidth = designW_scaled,
        drawImageHeight = designH_scaled,
        drawImageX = posX_scaled,
        drawImageY = posY_scaled;

      // Calculate aspect ratio based on the sticker item dimensions (not the global design)
      const itemRatio = itemW / itemH;
      const imageRatio = stickerEditorState.uploadedImage.width / stickerEditorState.uploadedImage.height;

      if (imageRatio > itemRatio) {
        drawImageHeight = designH_scaled;
        drawImageWidth = drawImageHeight * imageRatio;
        drawImageX = posX_scaled - (drawImageWidth - designW_scaled) / 2;
      } else {
        drawImageWidth = designW_scaled;
        drawImageHeight = drawImageWidth / imageRatio;
        drawImageY = posY_scaled - (drawImageHeight - designH_scaled) / 2;
      }
      ctx.save();
      // If this specific sticker is rotated (Hybrid mode), rotate it 90 deg
      if (isRotated) {
        const centerX = posX_scaled + designW_scaled / 2,
          centerY = posY_scaled + designH_scaled / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 2);
        // Swap dimensions for drawing the rotated image
        ctx.drawImage(stickerEditorState.uploadedImage, -drawImageHeight / 2, -drawImageWidth / 2, drawImageHeight, drawImageWidth);
      } else if (stickerEditorState.artworkOrientation === 'rotated') {
        const centerX = posX_scaled + designW_scaled / 2,
          centerY = posY_scaled + designH_scaled / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(stickerEditorState.uploadedImage, -drawImageHeight / 2, -drawImageWidth / 2, drawImageHeight, drawImageWidth);
      } else {
        ctx.drawImage(stickerEditorState.uploadedImage, drawImageX, drawImageY, drawImageWidth, drawImageHeight);
      }
      ctx.restore();
    } else {
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    if (sticker.shape === "square" || sticker.shape === "rectangle") {
      ctx.rect(posX_scaled, posY_scaled, designW_scaled, designH_scaled);
    } else if (sticker.shape === "round" || sticker.shape === "oval") {
      ctx.ellipse(posX_scaled + designW_scaled / 2, posY_scaled + designH_scaled / 2, designW_scaled / 2, designH_scaled / 2, 0, 0, 2 * Math.PI);
    }
    ctx.stroke();
  });

  // --- Draw Dimension Lines for Paper (Similar to Acrylic) ---
  // Get Paper Dimensions for display
  const displayPaperW = convertFromInches(paperW, stickerEditorState.currentPaperUnit).toFixed(1);
  const displayPaperH = convertFromInches(paperH, stickerEditorState.currentPaperUnit).toFixed(1);
  const paperUnit = stickerEditorState.currentPaperUnit;

  ctx.strokeStyle = "#dc3545"; // Red color like Acrylic
  ctx.fillStyle = "#111827";
  ctx.lineWidth = 1.5;
  ctx.font = "bold 18px sans-serif";

  // --- Draw Fit Summary (TOP) ---
  const displayW = convertFromInches(designW, stickerEditorState.currentArtworkUnit).toFixed(1);
  const displayH = convertFromInches(designH, stickerEditorState.currentArtworkUnit).toFixed(1);
  const summaryText = `${displayW}${stickerEditorState.currentArtworkUnit} x ${displayH}${stickerEditorState.currentArtworkUnit} Fit ${stickersToDraw.length}pcs`;

  ctx.font = "bold 18px Poppins, sans-serif";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText(summaryText, canvas.width / 2, 20);

  // --- Draw Paper Dimensions at BOTTOM and LEFT ---
  const drawTick = (x, y, dir) => {
    ctx.beginPath();
    if (dir === 'v') { ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); }
    else { ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); }
    ctx.stroke();
  };

  // Width Line (Bottom)
  const widthLineY = offsetY + drawnPaperHeight + 25;
  ctx.beginPath(); ctx.moveTo(offsetX, widthLineY); ctx.lineTo(offsetX + drawnPaperWidth, widthLineY); ctx.stroke();
  drawTick(offsetX, widthLineY, 'h'); drawTick(offsetX + drawnPaperWidth, widthLineY, 'h');

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${displayPaperW} ${paperUnit}`, offsetX + drawnPaperWidth / 2, widthLineY + 5);

  // Height Line (Left Side) - Keep it on LEFT
  const heightLineX = offsetX - 25;
  ctx.beginPath(); ctx.moveTo(heightLineX, offsetY); ctx.lineTo(heightLineX, offsetY + drawnPaperHeight); ctx.stroke();
  drawTick(heightLineX, offsetY, 'v'); drawTick(heightLineX, offsetY + drawnPaperHeight, 'v');

  ctx.save();
  ctx.translate(heightLineX - 10, offsetY + drawnPaperHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${displayPaperH} ${paperUnit}`, 0, 0);
  ctx.restore();

  // Store layout data for high-quality download
  stickerEditorState.lastLayoutData = {
    stickersToDraw: stickersToDraw,
    centerOffsetX: centerOffsetX,
    centerOffsetY: centerOffsetY,
    designW: designW,
    designH: designH,
    paperW: paperW,
    paperH: paperH,
    marginLeft: marginLeft,
    marginTop: marginTop,
    marginRight: marginRight,
    marginBottom: marginBottom,
    usableWidth: usableWidth,
    usableHeight: usableHeight,
    stickerShape: stickerShape
  };

  return {
    total: stickersToDraw.length
  };
}

export function updatePaperSize() {
  const paperSizeSelect = document.getElementById("paperSize");
  const customPaperDiv = document.getElementById("customPaper");
  const customPaperBtn = document.getElementById('customPaperToggle');
  const paperLabel = document.querySelector('#stickerPaperSizeWrapper .custom-sticker-dropdown-label');
  if (!paperSizeSelect || !customPaperDiv) return;
  customPaperDiv.style.display = "none";
  if (customPaperBtn) customPaperBtn.classList.remove('active');
  if (paperLabel) {
    const selectedOption = paperSizeSelect.options[paperSizeSelect.selectedIndex];
    if (selectedOption) paperLabel.textContent = selectedOption.textContent;
  }
  calculateLayout();
}

export function toggleStickerPaperDropdown(e) {
  e.stopPropagation();
  closeAllStickerDropdowns('stickerPaperSizeWrapper');
  const wrapper = document.getElementById('stickerPaperSizeWrapper');
  if (!wrapper) return;
  wrapper.classList.toggle('open');
  if (wrapper.classList.contains('open')) {
    const list = document.getElementById('stickerPaperSizeList');
    if (list) {
      const selected = list.querySelector('.custom-sticker-dropdown-option.selected');
      if (selected) setTimeout(() => selected.scrollIntoView({ block: 'nearest' }), 10);
    }
  }
}

export function selectStickerPaperOption(value) {
  const select = document.getElementById('paperSize');
  const label = document.querySelector('#stickerPaperSizeWrapper .custom-sticker-dropdown-label');
  const list = document.getElementById('stickerPaperSizeList');
  const wrapper = document.getElementById('stickerPaperSizeWrapper');
  if (!select || !label) return;
  select.value = value;
  const selectedOption = Array.from(select.options).find(option => option.value === value);
  if (selectedOption) label.textContent = selectedOption.textContent;
  if (list) {
    list.querySelectorAll('.custom-sticker-dropdown-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === value);
    });
  }
  if (wrapper) wrapper.classList.remove('open');
  updatePaperSize();
}

export function toggleCustomPaperSize() {
  const btn = document.getElementById('customPaperToggle');
  const customPaperDiv = document.getElementById('customPaper');
  const paperWrapper = document.getElementById('stickerPaperSizeWrapper');
  if (!btn || !customPaperDiv) return;
  const shouldEnable = !btn.classList.contains('active');
  btn.classList.toggle('active', shouldEnable);
  customPaperDiv.style.display = shouldEnable ? 'block' : 'none';
  if (paperWrapper) paperWrapper.classList.remove('open');
  calculateLayout();
}

export function getInputInInches(elementId, type) {
  const el = document.getElementById(elementId);
  if (!el) return 0;
  let value = parseFloat(el.value);
  let unit = type === 'artwork' ? stickerEditorState.currentArtworkUnit : type === 'paper' ? stickerEditorState.currentPaperUnit : stickerEditorState.currentSpacingUnit;
  return convertToInches(value, unit);
}

export function resetSpacing() {
  const defaultSpacingInCurrentUnit = convertFromInches(convertToInches(0.0, "cm"), stickerEditorState.currentSpacingUnit).toFixed(2);
  document.getElementById("artworkHorizontalSpacing").value = defaultSpacingInCurrentUnit;
  document.getElementById("artworkVerticalSpacing").value = defaultSpacingInCurrentUnit;
  calculateLayout();
}

export function changeInputValue(elementId, step, type) {
  const input = document.getElementById(elementId);
  let currentValue = parseFloat(input.value) || 0;
  let precision = (type === 'artwork') ? 1 : 2;
  input.value = (currentValue + step).toFixed(precision);
  if (type === 'artwork') {
    updateArtworkDimensions(elementId.includes('Width') ? 'width' : 'height');
  }
  if (type === 'paper' && elementId === 'paperWidth' && stickerEditorState.isPaperRatioLocked) {
    const newW = parseFloat(input.value);
    const hInput = document.getElementById('paperHeight');
    if (hInput && stickerEditorState.lockedPaperAspectRatio > 0) {
      hInput.value = (newW / stickerEditorState.lockedPaperAspectRatio).toFixed(2);
    }
  }
  calculateLayout();
}

export function initStickerEditor() {
  // --- NEW: Sync Global Agent Mode ---
  _ctx.setGlobalAgentMode(_ctx.getGlobalAgentMode(), 'stickerLayout');
  // -----------------------------------

  document.getElementById("unitSelect").value = "cm";
  document.getElementById("customUnitSelect").value = "in";
  document.getElementById("spacingUnitSelect").value = "cm";
  stickerEditorState.currentSpacingUnit = "cm";
  document.getElementById("layoutMode").value = "optimized";
  syncStickerEditorDropdowns();

  toggleArtworkUnit();
  toggleSpacingUnit();
  updatePaperSizeOptions(stickerEditorState.currentPaperUnit);

  stickerEditorState.originalArtworkDimensions.width = parseFloat(document.getElementById("artworkWidth").value);
  stickerEditorState.originalArtworkDimensions.height = parseFloat(document.getElementById("artworkHeight").value);
  stickerEditorState.lockedAspectRatio = stickerEditorState.originalArtworkDimensions.height > 0 ? stickerEditorState.originalArtworkDimensions.width / stickerEditorState.originalArtworkDimensions.height : 1;

  const initialArtworkWidth = parseFloat(document.getElementById("artworkWidth").value);
  const initialArtworkHeight = parseFloat(document.getElementById("artworkHeight").value);

  if (Math.abs(initialArtworkWidth - initialArtworkHeight) < 0.001) {
    toggleLockRatio(true);
  } else {
    setFreeSize();
  }

  let matchedPresetOnLoad = null;
  for (const sizeCm of Object.keys(stickerEditorState.artworkPresets)) {
    const convertedPresetSize = parseFloat(convertFromInches(convertToInches(parseFloat(sizeCm), "cm"), stickerEditorState.currentArtworkUnit).toFixed(1));
    if (Math.abs(initialArtworkWidth - convertedPresetSize) < 0.001 && Math.abs(initialArtworkHeight - convertedPresetSize) < 0.001) {
      matchedPresetOnLoad = sizeCm;
      break;
    }
  }

  if (matchedPresetOnLoad !== null) {
    applyPresetArtworkSize(parseFloat(matchedPresetOnLoad));
  } else {
    calculateLayout();
  }
  updatePaperSize();

  // --- NEW: Attach Listeners (Kiosk Mode Fix) ---
  // 1. Preset Buttons
  document.querySelectorAll('.preset-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = parseFloat(btn.dataset.presetSize);
      applyPresetArtworkSize(size);
    });
  });

  // 2. Add to Pad
  const addBtn = document.getElementById('addStickerToPadBtn');
  if (addBtn) addBtn.addEventListener('click', addStickerToPad);

  // 3. Copy Button
  const copyBtn = document.getElementById('btnCopyStickerLayout');
  if (copyBtn) copyBtn.addEventListener('click', copyStickerInvoiceText);
}


// === SECTION 2: STICKER LAYOUT EDITOR ===

export function toggleStickerDropdown(e) {
  e.stopPropagation();
  closeAllStickerDropdowns('stickerMaterialWrapper');
  const wrapper = document.getElementById('stickerMaterialWrapper');
  if (!wrapper) return;
  wrapper.classList.toggle('open');
  if (wrapper.classList.contains('open')) {
    const list = document.getElementById('stickerMaterialList');
    if (list) {
      const selected = list.querySelector('.custom-sticker-dropdown-option.selected');
      if (selected) setTimeout(() => selected.scrollIntoView({ block: 'nearest' }), 10);
    }
  }
}

export function selectStickerMaterialOption(index) {
  const select = document.getElementById('stickerMaterial');
  const label = document.querySelector('#stickerMaterialWrapper .custom-sticker-dropdown-label');
  const list = document.getElementById('stickerMaterialList');
  const wrapper = document.getElementById('stickerMaterialWrapper');
  if (!select || !label) return;
  select.value = index;
  if (select.options[index]) label.textContent = select.options[index].text;
  if (list) {
    list.querySelectorAll('.custom-sticker-dropdown-option').forEach((opt, i) => {
      opt.classList.toggle('selected', i === index);
    });
  }
  if (wrapper) wrapper.classList.remove('open');
  calculateLayout();
}

export function getStickerEditorHTML() {
  // Generate Preset Buttons cleanly without 'onclick'
  const agentClass = _ctx.getGlobalAgentMode() ? 'agent-active' : '';
  const stickerPanelColor = _ctx.getGlobalAgentMode() ? 'var(--success-color)' : 'var(--primary-color)';
  const presets = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const presetButtons = presets.map(size =>
    `<button class="preset-button ${agentClass} h-11" data-preset-size="${size}">${size}cm</button>`
  ).join('');

  // --- UPDATED: Set "White Sticker Normal + Kiss Cut" as Default ---
  const targetDefault = "White Sticker Normal + Kiss Cut";

  const materialOptions = _ctx.getMaterials().map((m, i) => {
    // We trim spaces to ensure a perfect match
    const isSelected = (m.name.trim() === targetDefault) ? 'selected' : '';
    return `<option value="${i}" ${isSelected}>${m.name}</option>`;
  }).join('');

  const defaultIdx = Math.max(0, _ctx.getMaterials().findIndex(m => m.name.trim() === targetDefault));
  // -----------------------------------------------------------------

  const toggleHTML = getGlobalToggleHTML('stickerLayout', _ctx.getGlobalAgentMode());

  return `
    <div class="sticker-editor-wrapper">
        <div class="calculator-panel mx-auto" style="max-width: 800px;">
            <h2 class="text-3xl font-bold mb-6 text-center uppercase" style="margin-top: 0; color: #f43f5e;">STICKER LAYOUT EDITOR</h2>
            
            ${toggleHTML}
            
            <!-- 1. Select Material -->
            <div class="mb-2 bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm flex items-center gap-3">
                
                <label for="stickerMaterial" class="font-bold text-gray-700 dark:text-gray-200 leading-tight whitespace-nowrap flex-shrink-0">
                    Select Material<br>
                    <span class="text-xs font-normal text-gray-500 dark:text-gray-400">(Large Format):</span>
                </label>
                
                <div class="custom-sticker-dropdown" id="stickerMaterialWrapper">
                  <div class="custom-sticker-dropdown-trigger" onclick="toggleStickerDropdown(event)">
                    <span class="custom-sticker-dropdown-label">${_ctx.getMaterials()[defaultIdx] ? _ctx.getMaterials()[defaultIdx].name : ''}</span>
                    <i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i>
                  </div>
                  <div class="custom-sticker-dropdown-list" id="stickerMaterialList">
                    ${_ctx.getMaterials().map((m, i) => `<div class="custom-sticker-dropdown-option${i === defaultIdx ? ' selected' : ''}" onclick="selectStickerMaterialOption(${i})">${m.name}</div>`).join('')}
                  </div>
                  <select id="stickerMaterial" style="display:none">
                    ${materialOptions}
                  </select>
                </div>
                
                <div id="stickerPriceDisplay" class="font-bold text-lg whitespace-nowrap text-right leading-tight flex-shrink-0"></div>
            </div>

            <div class="flex flex-col gap-3">
                
                <!-- 2. Artwork Presets -->
                <div style="margin-bottom: 10px; width: 100%;">
                    <label class="mb-1 block">Artwork Presets:</label>
                    <div class="preset-buttons-container" style="display: grid; gap: 6px; width: 100%;">
                        ${presetButtons}
                    </div>
                </div>

                <!-- COLLAPSIBLE SPACING & SHAPE + SMART FINDER -->
                <div class="sticker-toggle-container">
                    <button class="btn btn-sm btn-secondary unselected-grey-bg sticker-toggle-btn sticker-toggle-btn--spacing" id="stickerSpacingBtn" onclick="toggleStickerSpacingPanel()" style="color: var(--text-secondary); border: 1px solid var(--border-color);">
                        <i class="fas fa-sliders-h mr-2"></i> Modify Spacing & Shape
                        <i class="fas fa-chevron-down ml-1" id="stickerSpacingToggleIcon"></i>
                    </button>

                    <div id="stickerSpacingPanel" class="panel-collapsible sticker-toggle-panel sticker-toggle-panel--spacing" style="padding-left: 16px; padding-right: 16px; border-radius: 8px;">
                    <div class="flex flex-col gap-3">
                        <!-- 3. Spacing -->
                        <div>
                            <div class="row" style="margin-bottom: 5px; gap: 10px;">
                                <div style="flex: 1; min-width: 0;"><label>Horizontal Spacing:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('artworkHorizontalSpacing', -0.1, 'spacing')"><i class="fas fa-minus"></i></button><input type="number" id="artworkHorizontalSpacing" step="0.1" value="0" onchange="calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('artworkHorizontalSpacing', 0.1, 'spacing')"><i class="fas fa-plus"></i></button></div></div>
                                <div style="flex: 1; min-width: 0;"><label>Vertical Spacing:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('artworkVerticalSpacing', -0.1, 'spacing')"><i class="fas fa-minus"></i></button><input type="number" id="artworkVerticalSpacing" step="0.1" value="0" onchange="calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('artworkVerticalSpacing', 0.1, 'spacing')"><i class="fas fa-plus"></i></button></div></div>
                                <div style="flex: 1; min-width: 0;"><label>Spacing Unit:</label><div class="custom-sticker-dropdown" id="stickerSpacingUnitWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerSpacingUnitWrapper')"><span class="custom-sticker-dropdown-label">cm</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option" data-value="mm" onclick="selectGenericStickerDropdownOption('spacingUnitSelect', 'stickerSpacingUnitWrapper', 'mm', 'toggleSpacingUnit')">mm</div><div class="custom-sticker-dropdown-option selected" data-value="cm" onclick="selectGenericStickerDropdownOption('spacingUnitSelect', 'stickerSpacingUnitWrapper', 'cm', 'toggleSpacingUnit')">cm</div><div class="custom-sticker-dropdown-option" data-value="in" onclick="selectGenericStickerDropdownOption('spacingUnitSelect', 'stickerSpacingUnitWrapper', 'in', 'toggleSpacingUnit')">inch</div></div><select id="spacingUnitSelect" onchange="toggleSpacingUnit()" style="display:none"><option value="mm">mm</option><option value="cm" selected>cm</option><option value="in">inch</option></select></div></div>
                                <div style="flex: none; align-self: flex-end;"><button class="btn btn-control h-11 reset-spacing-btn" onclick="resetSpacing()" style="white-space: nowrap;">Reset Spacing</button></div>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0">Spacing between artwork edges (in <span id="spacingInfoUnit">cm</span>).</p>
                        </div>

                        <!-- 4. Sticker Shape & Layout Mode -->
                        <div class="row" style="margin-bottom: 10px; gap: 10px;">
                            <div style="flex: 1; min-width: 0;"><label>Sticker Shape:</label><div class="custom-sticker-dropdown" id="stickerShapeWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerShapeWrapper')"><span class="custom-sticker-dropdown-label">Round / Oval</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option" data-value="square" onclick="selectGenericStickerDropdownOption('stickerShape', 'stickerShapeWrapper', 'square', 'calculateLayout')">Square / Rectangle</div><div class="custom-sticker-dropdown-option selected" data-value="round" onclick="selectGenericStickerDropdownOption('stickerShape', 'stickerShapeWrapper', 'round', 'calculateLayout')">Round / Oval</div></div><select id="stickerShape" onchange="calculateLayout()" style="display:none"><option value="square">Square / Rectangle</option><option value="round" selected>Round / Oval</option></select></div></div>
                            <div style="flex: 1; min-width: 0;"><label>Layout Mode:</label><div class="custom-sticker-dropdown" id="stickerLayoutModeWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerLayoutModeWrapper')"><span class="custom-sticker-dropdown-label">Optimized (Interlocking)</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option" data-value="standard" onclick="selectGenericStickerDropdownOption('layoutMode', 'stickerLayoutModeWrapper', 'standard', 'handleLayoutModeChange')">Standard Grid</div><div class="custom-sticker-dropdown-option selected" data-value="optimized" onclick="selectGenericStickerDropdownOption('layoutMode', 'stickerLayoutModeWrapper', 'optimized', 'handleLayoutModeChange')">Optimized (Interlocking)</div><div class="custom-sticker-dropdown-option" data-value="brickByColumn" onclick="selectGenericStickerDropdownOption('layoutMode', 'stickerLayoutModeWrapper', 'brickByColumn', 'handleLayoutModeChange')">Brick by Column</div><div class="custom-sticker-dropdown-option" data-value="hybrid" onclick="selectGenericStickerDropdownOption('layoutMode', 'stickerLayoutModeWrapper', 'hybrid', 'handleLayoutModeChange')">Hybrid (Auto-Fill)</div></div><select id="layoutMode" onchange="handleLayoutModeChange()" style="display:none"><option value="standard">Standard Grid</option><option value="optimized">Optimized (Interlocking)</option><option value="brickByColumn">Brick by Column</option><option value="hybrid">Hybrid (Auto-Fill)</option></select></div></div>
                        </div>

                        <!-- Hybrid Layout Sub-Selector -->
                        <div id="hybridLayoutOptions" class="row" style="margin-bottom: 10px; gap: 10px; display: none;">
                            <div style="flex: 1; min-width: 0;"><label>Shuffle Hybrid Layout:</label><div class="custom-sticker-dropdown" id="stickerHybridLayoutWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerHybridLayoutWrapper')"><span class="custom-sticker-dropdown-label">Layout 1 (Vertical Center + Horizontal Fill)</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option selected" data-value="1" onclick="selectGenericStickerDropdownOption('hybridLayoutVariant', 'stickerHybridLayoutWrapper', '1', 'calculateLayout')">Layout 1 (Vertical Center + Horizontal Fill)</div><div class="custom-sticker-dropdown-option" data-value="2" onclick="selectGenericStickerDropdownOption('hybridLayoutVariant', 'stickerHybridLayoutWrapper', '2', 'calculateLayout')">Layout 2 (Horizontal Center + Vertical Fill)</div><div class="custom-sticker-dropdown-option" data-value="3" onclick="selectGenericStickerDropdownOption('hybridLayoutVariant', 'stickerHybridLayoutWrapper', '3', 'calculateLayout')">Layout 3 (Horizontal Top + Vertical Fill)</div><div class="custom-sticker-dropdown-option" data-value="4" onclick="selectGenericStickerDropdownOption('hybridLayoutVariant', 'stickerHybridLayoutWrapper', '4', 'calculateLayout')">Layout 4 (Horizontal Top + Vertical Fill)</div></div><select id="hybridLayoutVariant" onchange="calculateLayout()" style="display:none"><option value="1" selected>Layout 1 (Vertical Center + Horizontal Fill)</option><option value="2">Layout 2 (Horizontal Center + Vertical Fill)</option><option value="3">Layout 3 (Horizontal Top + Vertical Fill)</option><option value="4">Layout 4 (Horizontal Top + Vertical Fill)</option></select></div></div>
                        </div>
                    </div>
                </div>

                    <button class="btn btn-sm btn-secondary unselected-grey-bg sticker-toggle-btn sticker-toggle-btn--finder" id="stickerSmartFinderBtn" onclick="toggleStickerSmartFinderPanel()" style="color: var(--text-secondary); border: 1px solid var(--border-color);">
                        <i class="fas fa-wand-magic-sparkles mr-2"></i> Smart Finder
                        <i class="fas fa-chevron-down ml-1" id="stickerSFToggleIcon"></i>
                    </button>

                    <div id="stickerSmartFinderPanel" class="panel-collapsible sf-panel sticker-toggle-panel sticker-toggle-panel--finder" style="padding-left: 16px; padding-right: 16px; border-radius: 8px;">
                    <div class="flex flex-col gap-3">

                        <!-- Mode Toggle -->
                        <div>
                            <label>Finder Mode:</label>
                            <div class="size-btn-group" style="display: flex; gap: 10px;">
                                <button class="btn size-btn ${agentClass} active" id="sfModeBtn2" onclick="setSFMode(2)" style="flex:1;">Paper Finder</button>
                                <button class="btn size-btn ${agentClass}" id="sfModeBtn1" onclick="setSFMode(1)" style="flex:1;">Budget Finder</button>
                            </div>
                        </div>

                        <!-- Shape + Layout selectors -->
                        <div class="row" style="gap: 10px; margin-bottom: 0;">
                            <div style="flex: 1; min-width: 0;">
                                <label>Shape:</label>
                                <div class="size-btn-group" style="display: flex; gap: 10px;">
                                    <button class="btn size-btn ${agentClass}" id="sfShapeBtnRect" onclick="setSFShape('rect')" style="flex:1; font-size:12px;">Rectangle / Square</button>
                                    <button class="btn size-btn ${agentClass} active" id="sfShapeBtnRound" onclick="setSFShape('round')" style="flex:1; font-size:12px;">Round / Oval</button>
                                </div>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <label>Layout Mode:</label>
                                <div class="custom-sticker-dropdown" id="stickerSFLayoutModeWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerSFLayoutModeWrapper')"><span class="custom-sticker-dropdown-label">Optimized (Interlocking)</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option" data-value="standard" onclick="selectGenericStickerDropdownOption('sfLayoutMode', 'stickerSFLayoutModeWrapper', 'standard')">Standard Grid</div><div class="custom-sticker-dropdown-option selected" data-value="optimized" onclick="selectGenericStickerDropdownOption('sfLayoutMode', 'stickerSFLayoutModeWrapper', 'optimized')">Optimized (Interlocking)</div><div class="custom-sticker-dropdown-option" data-value="brickByColumn" onclick="selectGenericStickerDropdownOption('sfLayoutMode', 'stickerSFLayoutModeWrapper', 'brickByColumn')">Brick by Column</div><div class="custom-sticker-dropdown-option" data-value="hybrid" onclick="selectGenericStickerDropdownOption('sfLayoutMode', 'stickerSFLayoutModeWrapper', 'hybrid')">Hybrid (Best of All ~Approx)</div></div><select id="sfLayoutMode" style="display:none"><option value="standard">Standard Grid</option><option value="optimized" selected>Optimized (Interlocking)</option><option value="brickByColumn">Brick by Column</option><option value="hybrid">Hybrid (Best of All ~Approx)</option></select></div>
                            </div>
                        </div>

                        <!-- Mode 1: Budget Finder inputs -->
                        <div id="sfMode1Inputs" style="display: none;">
                            <div class="row" style="gap: 10px; margin-bottom: 0; align-items: flex-end;">
                                <div style="flex: 1; min-width: 0;">
                                    <label>Max Budget (RM):</label>
                                    <input type="number" id="sfBudget" step="0.5" placeholder="e.g. 50" class="px-2 py-1 h-11" style="width:100%;">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <label>Min Qty (pcs):</label>
                                    <input type="number" id="sfQtyMode1" step="1" placeholder="e.g. 100" class="px-2 py-1 h-11" style="width:100%;">
                                </div>
                                <div style="flex: none; align-self: flex-end;">
                                    <button id="sfFindBtn1" class="btn h-11" onclick="runStickerSmartFinder(1)" style="white-space:nowrap; background:${stickerPanelColor}; border-color:${stickerPanelColor}; color:#fff; padding: 0 18px;">
                                        <i class="fas fa-search mr-1"></i> Find
                                    </button>
                                </div>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">Find sticker size + paper combos within your budget.</p>
                        </div>

                        <!-- Mode 2: Paper Finder inputs -->
                        <div id="sfMode2Inputs">
                            <div class="row" style="gap: 10px; margin-bottom: 0; align-items: flex-end;">
                                <div style="flex: 1; min-width: 0;">
                                    <label>Target Qty (pcs):</label>
                                    <input type="number" id="sfQtyMode2" step="1" placeholder="e.g. 50" class="px-2 py-1 h-11" style="width:100%;">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                  <label>Width:</label>
                                    <input type="number" id="sfSizeW" step="0.1" placeholder="e.g. 5" class="px-2 py-1 h-11" style="width:100%;">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                  <label>Height:</label>
                                    <input type="number" id="sfSizeH" step="0.1" placeholder="e.g. 5" class="px-2 py-1 h-11" style="width:100%;">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                  <label>Artwork Unit:</label>
                                  <div class="custom-sticker-dropdown" id="stickerSFUnitWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleGenericStickerDropdown(event, 'stickerSFUnitWrapper')"><span class="custom-sticker-dropdown-label">cm</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list"><div class="custom-sticker-dropdown-option" data-value="in" onclick="selectGenericStickerDropdownOption('sfUnitSelect', 'stickerSFUnitWrapper', 'in', 'toggleSFUnit')">inch</div><div class="custom-sticker-dropdown-option selected" data-value="cm" onclick="selectGenericStickerDropdownOption('sfUnitSelect', 'stickerSFUnitWrapper', 'cm', 'toggleSFUnit')">cm</div><div class="custom-sticker-dropdown-option" data-value="mm" onclick="selectGenericStickerDropdownOption('sfUnitSelect', 'stickerSFUnitWrapper', 'mm', 'toggleSFUnit')">mm</div><div class="custom-sticker-dropdown-option" data-value="ft" onclick="selectGenericStickerDropdownOption('sfUnitSelect', 'stickerSFUnitWrapper', 'ft', 'toggleSFUnit')">feet</div></div><select id="sfUnitSelect" onchange="toggleSFUnit()" style="display:none"><option value="in">inch</option><option value="cm" selected>cm</option><option value="mm">mm</option><option value="ft">feet</option></select></div>
                                </div>
                                <div style="flex: none; align-self: flex-end;">
                                    <button id="sfFindBtn2" class="btn h-11" onclick="runStickerSmartFinder(2)" style="white-space:nowrap; background:${stickerPanelColor}; border-color:${stickerPanelColor}; color:#fff; padding: 0 18px;">
                                        <i class="fas fa-search mr-1"></i> Find
                                    </button>
                                </div>
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">Find the best paper size for your sticker dimensions.</p>
                        </div>

                        <!-- Results -->
                        <div id="sfResults"></div>

                    </div>
                </div>
                </div>

                <!-- 5. Paper Size -->
                <div>
                    <label for="paperSize" class="mb-1 block">Paper Size:</label>
                    <div style="display: flex; gap: 8px; align-items: center;">
                    <div class="custom-sticker-dropdown" id="stickerPaperSizeWrapper" style="flex: 1;">
                      <div class="custom-sticker-dropdown-trigger" onclick="toggleStickerPaperDropdown(event)">
                        <span class="custom-sticker-dropdown-label">${getDefaultPaperSize().label} (${getDefaultPaperSize().w.toFixed(2)}in x ${getDefaultPaperSize().h.toFixed(2)}in)</span>
                        <i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i>
                      </div>
                      <div class="custom-sticker-dropdown-list" id="stickerPaperSizeList">
                        ${STICKER_PAPER_SIZES.map(ps => {
                          const val = getPaperSizeValue(ps);
                          const sel = ps.default ? ' selected' : '';
                          return `<div class="custom-sticker-dropdown-option${sel}" data-value="${val}" onclick="selectStickerPaperOption('${val}')">${ps.label} (${ps.w.toFixed(2)}in x ${ps.h.toFixed(2)}in)</div>`;
                        }).join('\n                        ')}
                      </div>
                      <select id="paperSize" style="display:none" onchange="updatePaperSize()">
                        ${STICKER_PAPER_SIZES.map(ps => {
                          const val = getPaperSizeValue(ps);
                          const sel = ps.default ? ' selected' : '';
                          return `<option value="${val}"${sel}>${ps.label} (${ps.w}in x ${ps.h}in)</option>`;
                        }).join('\n                        ')}
                      </select>
                    </div>
                    <button id="customPaperToggle" class="btn size-btn ${agentClass} h-11" style="white-space: nowrap; padding: 0 14px; flex-grow: 0;" onclick="toggleCustomPaperSize()">Custom</button>
                    </div>
                </div>

                <div id="customPaper" style="display: none;">
                    <div class="row" style="margin-bottom: 0; gap: 10px; align-items: flex-end;">
                        <div style="flex: 1; min-width: 0;"><label>Paper Width:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('paperWidth', -1, 'paper')"><i class="fas fa-minus"></i></button><input type="number" id="paperWidth" step="1" value="12" onchange="if(stickerEditorState.isPaperRatioLocked){const h=document.getElementById('paperHeight');if(h&&stickerEditorState.lockedPaperAspectRatio>0)h.value=(parseFloat(this.value)/stickerEditorState.lockedPaperAspectRatio).toFixed(2);}calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('paperWidth', 1, 'paper')"><i class="fas fa-plus"></i></button></div></div>
                        <div style="flex: 1; min-width: 0;"><label>Paper Height:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('paperHeight', -1, 'paper')"><i class="fas fa-minus"></i></button><input type="number" id="paperHeight" step="1" value="18" onchange="calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('paperHeight', 1, 'paper')"><i class="fas fa-plus"></i></button></div></div>
                        <div style="flex: 1; min-width: 0;"><label>Paper Unit:</label><div class="custom-sticker-dropdown" id="stickerPaperUnitWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleStickerPaperUnitDropdown(event)"><span class="custom-sticker-dropdown-label">inch</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list" id="stickerPaperUnitList"><div class="custom-sticker-dropdown-option selected" data-value="in" onclick="selectStickerPaperUnitOption('in')">inch</div><div class="custom-sticker-dropdown-option" data-value="cm" onclick="selectStickerPaperUnitOption('cm')">cm</div><div class="custom-sticker-dropdown-option" data-value="mm" onclick="selectStickerPaperUnitOption('mm')">mm</div><div class="custom-sticker-dropdown-option" data-value="ft" onclick="selectStickerPaperUnitOption('ft')">feet</div></div><select id="customUnitSelect" onchange="toggleCustomPaperUnit()" style="display:none"><option value="in">inch</option><option value="cm">cm</option><option value="mm">mm</option><option value="ft">feet</option></select></div></div>
                        <div style="flex: none; width: 94px; display: flex; gap: 6px; align-self: flex-end;">
                            <button id="paperLockRatioBtn" class="btn btn-control ${agentClass}" onclick="togglePaperLockRatio()" title="Lock / Unlock Paper Ratio" style="width: 44px; height: 44px; padding: 0; font-size: 1.1em; display: flex; align-items: center; justify-content: center;"><i class="fas fa-lock-open"></i></button>
                            <button class="btn btn-control" onclick="rotatePaper()" title="Rotate Paper" style="width: 44px; height: 44px; padding: 0; font-size: 1.1em; display: flex; align-items: center; justify-content: center;"><i class="fas fa-sync-alt"></i></button>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-0">Enter custom paper dimensions in the selected unit.</p>
                </div>

                <!-- 6. Artwork Size with inline Lock Ratio & Rotate -->
                <div>
                    <div class="sticker-artwork-dims-row">
                        <div><label>Artwork Width:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('artworkWidth', -1, 'artwork')"><i class="fas fa-minus"></i></button><input type="number" id="artworkWidth" step="1" value="5.0" onchange="updateArtworkDimensions('width'); calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('artworkWidth', 1, 'artwork')"><i class="fas fa-plus"></i></button></div></div>
                        <div><label>Artwork Height:</label><div class="input-with-stepper"><button type="button" class="stepper-button" onclick="changeInputValue('artworkHeight', -1, 'artwork')"><i class="fas fa-minus"></i></button><input type="number" id="artworkHeight" step="1" value="5.0" onchange="updateArtworkDimensions('height'); calculateLayout();" class="px-2 py-1 h-11" /><button type="button" class="stepper-button" onclick="changeInputValue('artworkHeight', 1, 'artwork')"><i class="fas fa-plus"></i></button></div></div>
                        <div class="sticker-artwork-unit-group">
                            <div style="flex: 1; min-width: 0;"><label>Artwork Unit:</label><div class="custom-sticker-dropdown" id="stickerArtworkUnitWrapper"><div class="custom-sticker-dropdown-trigger" onclick="toggleStickerArtworkUnitDropdown(event)"><span class="custom-sticker-dropdown-label">cm</span><i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i></div><div class="custom-sticker-dropdown-list" id="stickerArtworkUnitList"><div class="custom-sticker-dropdown-option" data-value="in" onclick="selectStickerArtworkUnitOption('in')">inch</div><div class="custom-sticker-dropdown-option selected" data-value="cm" onclick="selectStickerArtworkUnitOption('cm')">cm</div><div class="custom-sticker-dropdown-option" data-value="mm" onclick="selectStickerArtworkUnitOption('mm')">mm</div><div class="custom-sticker-dropdown-option" data-value="ft" onclick="selectStickerArtworkUnitOption('ft')">feet</div></div><select id="unitSelect" onchange="toggleArtworkUnit()" style="display:none"><option value="in">inch</option><option value="cm" selected>cm</option><option value="mm">mm</option><option value="ft">feet</option></select></div></div>
                            <button id="lockRatioBtn" class="btn btn-control ${agentClass}" onclick="toggleLockRatio()" title="Lock / Unlock Ratio" style="width: 44px; height: 44px; flex-shrink: 0; padding: 0; font-size: 1.1em; display: flex; align-items: center; justify-content: center;"><i class="fas fa-lock-open"></i></button>
                            <button class="btn btn-control" onclick="rotateArtwork()" title="Rotate Artwork" style="width: 44px; height: 44px; flex-shrink: 0; padding: 0; font-size: 1.1em; display: flex; align-items: center; justify-content: center;"><i class="fas fa-sync-alt"></i></button>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0 mb-1">Enter artwork dimensions in the selected unit.</p>
                </div>

                <div>
                <!-- Canvas -->
                <div style="position: relative; display: inline-block; width: 100%; max-width: 880px;">
                    <canvas id="layoutCanvas" width="880" height="750" style="width: 100%; height: auto;"></canvas>
                </div>

                <!-- Hidden file input for artwork upload -->
                <input type="file" id="artworkImage" accept="image/*" onchange="handleImageUpload()" style="display: none;" />
                <span id="fileNameDisplay" style="display: none;">No file chosen</span>

                <!-- Manage Artwork Design / Download Options / Download Preview Buttons -->
                <div class="preview-action-grid" style="margin-top: 8px;">
                  <button class="btn btn-sm btn-secondary preview-action-btn" id="stickerArtworkToolsBtn" onclick="toggleStickerArtworkTools()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
                    <i class="fas fa-image mr-2"></i> Manage Artwork Design
                    <i class="fas fa-chevron-down ml-1" id="stickerArtToggleIcon"></i>
                  </button>
                  <button class="btn btn-secondary btn-sm preview-action-btn" id="stickerDownloadOptionsBtn" onclick="toggleStickerDownloadOptions()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);">
                    <i class="fas fa-file-export mr-2"></i> Download Options
                    <i class="fas fa-chevron-down ml-1" id="stickerDlToggleIcon"></i>
                  </button>
                  <button class="btn btn-secondary btn-sm preview-action-btn preview-action-btn--span" onclick="downloadStickerCanvas('jpg')" style="background: transparent; color: #28a745; border: 1px solid #28a745;">
                    <i class="fas fa-camera mr-2"></i> Download Preview
                  </button>
                </div>

                <!-- Manage Artwork Design Panel -->
                <div id="stickerArtworkToolsPanel" class="panel-collapsible" style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
                    
                  <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
                    <button class="btn btn-sm btn-primary" id="stickerUploadImageBtn" onclick="document.getElementById('artworkImage').click()" style="width: auto; margin-top: 0; white-space: nowrap; background: ${stickerPanelColor}; border-color: ${stickerPanelColor};">
                      <i class="fas fa-upload mr-2"></i> Upload Image
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="clearUploadedImage()" style="width: auto; margin-top: 0; white-space: nowrap;">
                      <i class="fas fa-trash mr-2"></i> Clear
                    </button>
                    <div class="artwork-filename-wrapper">
                      <span id="stickerDesignFileName" class="artwork-filename-text"></span>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: end;">
                    <div>
                      <label id="stickerDesignWLabel" style="font-size: 11px;">Design Width:</label>
                      <div style="position: relative;">
                        <input type="number" id="stickerDesignW" step="0.1" oninput="updateStickerDesignDims('w')" disabled style="padding-right: 30px;">
                        <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
                      </div>
                    </div>
                    <div>
                      <label id="stickerDesignHLabel" style="font-size: 11px;">Design Height:</label>
                      <div style="position: relative;">
                        <input type="number" id="stickerDesignH" step="0.1" oninput="updateStickerDesignDims('h')" disabled style="padding-right: 30px;">
                        <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">cm</span>
                      </div>
                    </div>
                        
                    <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="rotateStickerDesignImg()" title="Rotate 90Â°" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
                      <i class="fas fa-sync-alt"></i>
                    </button>
                        
                    <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 active-control ${agentClass}" id="stickerArtLockBtn" onclick="toggleStickerArtLock()" title="Lock Ratio" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
                      <i class="fas fa-lock"></i>
                    </button>

                    <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="resetStickerArtworkFit()" title="Reset to Fit" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;">
                      <i class="fas fa-compress-arrows-alt"></i>
                    </button>
                  </div>
                  <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 0;">* Design is automatically scaled to fit within artwork bounds.</p>
                </div>

                <!-- Download Options Panel -->
                <div id="stickerDownloadOptionsPanel" class="panel-collapsible" style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
                    
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px; align-items: end;">
                            <div>
                                <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select DPI:</label>
                                <div class="size-btn-group" id="stickerDpiBtnGroup">
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerDownloadDPI(72)">72</button>
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerDownloadDPI(100)">100</button>
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerDownloadDPI(150)">150</button>
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerDownloadDPI(200)">200</button>
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerDownloadDPI(250)">250</button>
                                    <button class="btn size-btn ${agentClass} active" onclick="setStickerDownloadDPI(300)">300</button>
                                </div>
                            </div>
                            <div style="margin-left: 12px;">
                                <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Custom:</label>
                                <div style="position: relative;">
                                    <input type="number" id="stickerCustomDpiInput" placeholder="200" oninput="setStickerCustomDPI(this.value)" style="padding-right: 10px; width: 80px;">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: end; gap: 10px;">
                        <div style="display: flex; gap: 16px; align-items: end;">
                            <div>
                                <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select File Type:</label>
                                <div class="size-btn-group" id="stickerFileTypeBtnGroup">
                                    <button class="btn size-btn ${agentClass}" onclick="setStickerFileType('jpg')">JPG</button>
                                    <button class="btn size-btn ${agentClass} active" onclick="setStickerFileType('png')">PNG</button>
                                </div>
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Download Mode:</label>
                                <div class="size-btn-group" id="stickerDownloadModeBtnGroup">
                                    <button class="btn size-btn ${agentClass}" data-mode="single" onclick="setStickerDownloadMode('single')">1 Shape</button>
                                    <button class="btn size-btn ${agentClass} active" data-mode="all" onclick="setStickerDownloadMode('all')">All Shapes</button>
                                </div>
                            </div>
                        </div>
                        
                        <button class="btn btn-primary" id="stickerFinalDownloadBtn" onclick="handleStickerFinalDownload()" style="width: auto; padding: 10px 24px; margin-top: 0; background: ${stickerPanelColor}; border-color: ${stickerPanelColor};">
                            <i class="fas fa-download mr-2"></i> Download
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button id="addStickerToPadBtn" class="btn"
                        style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                        + Add to Pad
                    </button>
                    <button id="btnCopyStickerLayout" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                        style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">
                        Copy
                    </button>
                </div>
                <div class="invoice-copy-area" style="margin-top: 8px;">
                    <textarea id="stickerInvoiceText" readonly rows="1"
                        class="w-full font-mono text-sm border rounded-lg p-3
                             bg-[#e9ecef] text-[#495057] border-gray-300
                             dark:bg-[#374151] dark:text-[#ffffff] dark:border-[#4b5563]"
                        style="overflow:hidden; resize:none;"
                    ></textarea>
                </div>
                </div>

                <div id="sticker-price-list-container" class="bg-white dark:bg-gray-800 p-4 sm:p-8 rounded-lg border border-gray-200 dark:border-gray-700 mt-3">
                    <div id="stickerPriceTable" class="overflow-x-auto"></div>
                </div>

                <div class="mt-4 text-center">
                     <button class="btn btn-primary" style="width: auto;" onclick="downloadElementAsJPG(event, 'sticker-price-list-container', 'sticker-price-list.jpg')">
                        <i class="fas fa-download mr-2"></i> Download Price List (JPG)
                    </button>
                </div>
            </div>

        </div>
    </div>`;

  updatePaperSize();
}
// --- END: STICKER EDITOR HELPER ---

export function renderStickerLayoutEditor(container) {
  container.innerHTML = getStickerEditorHTML();
  initStickerEditor();
}
