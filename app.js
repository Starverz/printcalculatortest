// Initialize PDF Worker
try {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
} catch (e) {
  console.log("PDF Worker init deferred:", e);
}

// Fix CodePen/CDN loading issues (Flowbite & PDF)
function initExternalLibs() {
  if (typeof pdfjsLib !== 'undefined') {
     try { 
       if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; 
       }
     } catch(e){}
  }
  if (typeof initFlowbite === 'function') {
    try { initFlowbite(); } catch(e){}
  }
}

window.appModules = window.appModules || {};

import('./modules/bootstrap.js')
  .then(({ registerAppModules }) => {
    registerAppModules(window);
    window.appModules?.sticker?.init?.(createStickerContext());
    window.appModules?.quotePad?.init?.(createQuotePadContext());
    window.appModules?.sublimationSettings?.initSublimationSettings?.(createSublimationSettingsContext());
    window.appModules?.invitationCardSettings?.initInvitationCardSettings?.(createInvitationCardSettingsContext());
    window.appModules?.businessCardSettings?.initBusinessCardSettings?.(createBusinessCardSettingsContext());
    window.appModules?.lanyardSettings?.initLanyardSettings?.(createLanyardSettingsContext());
    window.appModules?.stampSettings?.initStampSettings?.(createStampSettingsContext());
    window.appModules?.acrylicSettings?.initAcrylicSettings?.(createAcrylicSettingsContext());
    window.appModules?.idCardSettings?.initIdCardSettings?.(createIdCardSettingsContext());
  })
  .catch((error) => {
    console.warn('Module bootstrap skipped:', error);
  });

if (document.readyState === 'complete') {
  initExternalLibs();
} else {
  window.addEventListener('load', initExternalLibs);
}

// --- Toast Notification Utility ---

// Helper function to highlight row after move
function highlightMoveRow(dataAttrName, dataAttrValue) {
  setTimeout(() => {
    const rows = document.querySelectorAll(`tr[${dataAttrName}="${dataAttrValue}"]`);
    rows.forEach(row => {
      row.classList.remove('row-highlight');
      void row.offsetWidth; // restart animation
      row.classList.add('row-highlight');
      setTimeout(() => row.classList.remove('row-highlight'), 2000);
    });
  }, 50);
}

// Helper to blink a DOM element directly (for list-based rows that don't re-render)
function blinkRow(element) {
  if (!element) return;
  element.classList.remove('row-highlight');
  void element.offsetWidth; // restart animation
  element.classList.add('row-highlight');
  setTimeout(() => element.classList.remove('row-highlight'), 2000);
}

// =================================================================================
var agentExtraSizeCost = {};

function initializeAgentPricingData() {
  // === INVITATION CARD: Explicit Dual Pricing ===
  // Hardcoded data contains basePrice, materialAddOn, addons with explicit {customerPrice, agentPrice} in each price entry
  // globalAgentMode flag selects which price to use (no separate agentBasePrice/agentMaterialAddOn/agentAddons needed)

  businessCardData.materials.forEach(mat => {
    if (!mat.prices) {
      mat.prices = {
        customerPrice: { p1: [], p2: [] },
        agentPrice: { p1: [], p2: [] }
      };
    }
    // Helper to migrate old structure if needed, or just init empty
    // We assume the new hardcoded structure below is the source of truth
  });
  // businessCardData.addons now contains both customer and agent prices in the options
  normalizeSublimationAddons();
  if (!sublimationData.basePrices[0].agentPrice && sublimationData.basePrices[0].agentPrice !== 0) {
    sublimationData.basePrices.forEach(tier => { if (tier.agentPrice === undefined) tier.agentPrice = tier.customerPrice; });
  }
  // Backward compat: if old agentExtraSizeCost exists, merge into new consolidated format
  if (sublimationData.agentExtraSizeCost && sublimationData.extraSizeCost) {
    Object.keys(sublimationData.extraSizeCost).forEach(key => {
      const custCost = sublimationData.extraSizeCost[key];
      const agentCost = sublimationData.agentExtraSizeCost[key];
      if (typeof custCost === 'number') {
        sublimationData.extraSizeCost[key] = {
          customerPrice: custCost,
          agentPrice: agentCost !== undefined ? agentCost : custCost
        };
      }
    });
    delete sublimationData.agentExtraSizeCost;
  }
  // ID Card migration: idCardData is object-based, not array-based
  // Only apply migration if idCardData appears to be in old array format (backward compatibility)
  if (Array.isArray(idCardData)) {
    // OLD FORMAT DETECTED - convert to new format
    const oldRates = idCardData;
    idCardData = {
      "basePrice": {
        "1": {},
        "2": {}
      },
      "punchHolePrice": {
        "none": { customerPrice: 0, agentPrice: 0 },
        "yes": { customerPrice: 1.0, agentPrice: 0.8 }
      },
      "quantities": [],
      "sides": ["1", "2"]
    };
    // Fill in quantities and 1-sided prices from old rates
    oldRates.forEach(rate => {
      const qty = rate.qty;
      const custPrice = rate.customerUnitPrice || rate.unitPrice || 0;
      const agentPrice = rate.agentUnitPrice || custPrice;
      idCardData.quantities.push(qty);
      idCardData.basePrice["1"][qty] = { customerPrice: custPrice, agentPrice: agentPrice };
      // For 2-sided, add the $2.00 surcharge
      idCardData.basePrice["2"][qty] = { customerPrice: custPrice + 2.0, agentPrice: agentPrice + 2.0 };
    });
  }
  // Lanyard Data Migration (v1/v2/v3)
  try {
    if (typeof lanyardData !== 'undefined' && lanyardData.sizes) {
      lanyardData.sizes.forEach(size => {
        // 1. Initial move from global prices if present (Legacy v1/v2)
        if (lanyardData.prices && !size.prices) {
          if (lanyardData.prices.customerPrice) { // Legacy v2
            size.prices = {
              customerPrice: lanyardData.prices.customerPrice[size.label] || {},
              agentPrice: lanyardData.prices.agentPrice[size.label] || {}
            };
          } else { // Legacy v1
            size.prices = {
              customerPrice: lanyardData.prices[size.label] || {},
              agentPrice: JSON.parse(JSON.stringify(lanyardData.prices[size.label] || {}))
            };
          }
        }

        // 2. Convert keyed objects to positional arrays (v2 to v3)
        if (size.prices) {
          ['customerPrice', 'agentPrice'].forEach(target => {
            const pObj = size.prices[target];
            // If it's an object and not an array, it's v2
            if (pObj && typeof pObj === 'object' && !Array.isArray(pObj.p1)) {
              const newPrices = { p1: [], p2: [] };
              lanyardData.quantities.forEach(qty => {
                const qtyStr = qty.toString();
                const qPrice = pObj[qtyStr] || { 1: 0, 2: 0 };
                newPrices.p1.push(qPrice[1] || 0);
                newPrices.p2.push(qPrice[2] || 0);
              });
              size.prices[target] = newPrices;
            }
          });
        }
      });
      if (lanyardData.prices) delete lanyardData.prices;
    }
  } catch (err) {
    console.error("Lanyard migration failed:", err);
  }
  // Add agentPrice to lanyard addons if missing
  if (lanyardData.addons) {
    lanyardData.addons.forEach(addon => {
      if (addon.options) {
        addon.options.forEach(opt => {
          if (opt.agentPrice === undefined) opt.agentPrice = opt.cost || 0;
        });
      }
    });
  }
}

// =============================================================================
// Lanyard â€“ copy invoice text to clipboard
// =============================================================================
function copyLanyardInvoiceText() {
  window.appModules?.lanyard?.copyLanyardInvoiceText?.(createLanyardContext());
}
// =================================================================================
// STICKER LAYOUT EDITOR - Delegated to modules/stickers/sticker.js
// =================================================================================

function getPaperSizeValue(ps) { return window.appModules?.sticker?.getPaperSizeValue?.(ps) ?? ''; }
function buildPaperSizePresetMap() { return window.appModules?.sticker?.buildPaperSizePresetMap?.() ?? {}; }
function getDefaultPaperSize() { return window.appModules?.sticker?.getDefaultPaperSize?.(); }
function convertToInches(val, unit) { return window.appModules?.sticker?.convertToInches?.(val, unit) ?? 0; }
function convertFromInches(val, targetUnit) { return window.appModules?.sticker?.convertFromInches?.(val, targetUnit) ?? 0; }
function updateArtworkDimensions(changedField) { window.appModules?.sticker?.updateArtworkDimensions?.(changedField); }
function toggleArtworkUnit() { window.appModules?.sticker?.toggleArtworkUnit?.(); }
function toggleCustomPaperUnit() { window.appModules?.sticker?.toggleCustomPaperUnit?.(); }
function syncStickerDropdownLabel(selectId, wrapperId) { window.appModules?.sticker?.syncStickerDropdownLabel?.(selectId, wrapperId); }
function syncStickerEditorDropdowns() { window.appModules?.sticker?.syncStickerEditorDropdowns?.(); }
function closeAllStickerDropdowns(exceptWrapperId) { window.appModules?.sticker?.closeAllStickerDropdowns?.(exceptWrapperId); }
function toggleGenericStickerDropdown(e, wrapperId) { window.appModules?.sticker?.toggleGenericStickerDropdown?.(e, wrapperId); }
function selectGenericStickerDropdownOption(selectId, wrapperId, value, handlerName) { window.appModules?.sticker?.selectGenericStickerDropdownOption?.(selectId, wrapperId, value, handlerName); }
function toggleStickerArtworkUnitDropdown(e) { window.appModules?.sticker?.toggleStickerArtworkUnitDropdown?.(e); }
function selectStickerArtworkUnitOption(value) { window.appModules?.sticker?.selectStickerArtworkUnitOption?.(value); }
function toggleSpacingUnit() { window.appModules?.sticker?.toggleSpacingUnit?.(); }
function updatePaperSizeOptions(unit) { window.appModules?.sticker?.updatePaperSizeOptions?.(unit); }
function activatePresetButton(size) { window.appModules?.sticker?.activatePresetButton?.(size); }
function applyPresetArtworkSize(size) { window.appModules?.sticker?.applyPresetArtworkSize?.(size); }
function handleImageUpload(e) { window.appModules?.sticker?.handleImageUpload?.(e); }
function clearUploadedImage() { window.appModules?.sticker?.clearUploadedImage?.(); }
function setStickerDownloadDPI(val) { window.appModules?.sticker?.setStickerDownloadDPI?.(val); }
function setStickerCustomDPI(val) { window.appModules?.sticker?.setStickerCustomDPI?.(val); }
function setStickerFileType(type) { window.appModules?.sticker?.setStickerFileType?.(type); }
function setStickerDownloadMode(mode) { window.appModules?.sticker?.setStickerDownloadMode?.(mode); }
function toggleStickerArtworkTools() { window.appModules?.sticker?.toggleStickerArtworkTools?.(); }
function toggleStickerDownloadOptions() { window.appModules?.sticker?.toggleStickerDownloadOptions?.(); }
function toggleStickerSpacingPanel() { window.appModules?.sticker?.toggleStickerSpacingPanel?.(); }
function toggleStickerSmartFinderPanel() { window.appModules?.sticker?.toggleStickerSmartFinderPanel?.(); }
function handleStickerFinalDownload() { window.appModules?.sticker?.handleStickerFinalDownload?.(); }
function updateStickerDesignFields() { window.appModules?.sticker?.updateStickerDesignFields?.(); }
function updateStickerDesignDims(changedField) { window.appModules?.sticker?.updateStickerDesignDims?.(changedField); }
function rotateStickerDesignImg() { window.appModules?.sticker?.rotateStickerDesignImg?.(); }
function toggleStickerArtLock() { window.appModules?.sticker?.toggleStickerArtLock?.(); }
function resetStickerArtworkFit() { window.appModules?.sticker?.resetStickerArtworkFit?.(); }
function downloadStickerCanvas(dpi, format) { window.appModules?.sticker?.downloadStickerCanvas?.(dpi, format); }
function downloadStickerArtwork(dpi, format) { window.appModules?.sticker?.downloadStickerArtwork?.(dpi, format); }
function downloadStickerAllShapes() { window.appModules?.sticker?.downloadStickerAllShapes?.(); }
function copyStickerInvoiceText() { window.appModules?.sticker?.copyStickerInvoiceText?.(); }
function addStickerToPad() { window.appModules?.sticker?.addStickerToPad?.(); }
function setActiveControlButton(clickedBtn, groupClass) { window.appModules?.sticker?.setActiveControlButton?.(clickedBtn, groupClass); }
function togglePaperLockRatio() { window.appModules?.sticker?.togglePaperLockRatio?.(); }
function rotatePaper() { window.appModules?.sticker?.rotatePaper?.(); }
function toggleLockRatio(force) { window.appModules?.sticker?.toggleLockRatio?.(force); }
function setFreeSize() { window.appModules?.sticker?.setFreeSize?.(); }
function revertToOriginalSize() { window.appModules?.sticker?.revertToOriginalSize?.(); }
function resizeArtworkToFitPaper() { window.appModules?.sticker?.resizeArtworkToFitPaper?.(); }
function rotateArtwork() { window.appModules?.sticker?.rotateArtwork?.(); }
function handleLayoutModeChange(mode) { window.appModules?.sticker?.handleLayoutModeChange?.(mode); }
function calculateLayout() { window.appModules?.sticker?.calculateLayout?.(); }
function renderStickerPriceTable(container, forceAgent) { window.appModules?.sticker?.renderStickerPriceTable?.(container, forceAgent); }
function sfCalcQty(paperW, paperH, sizeW, sizeH, hSpacing, vSpacing, shape, layoutMode) { return window.appModules?.sticker?.sfCalcQty?.(paperW, paperH, sizeW, sizeH, hSpacing, vSpacing, shape, layoutMode) ?? { count: 0, isApprox: false }; }
function generateStickersArray(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode, usableWidth, usableHeight, hybridVariant) { return window.appModules?.sticker?.generateStickersArray?.(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode, usableWidth, usableHeight, hybridVariant) ?? []; }
function calculateActualFitCount(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode) { return window.appModules?.sticker?.calculateActualFitCount?.(paperW, paperH, designW, designH, horizSpacing, vertSpacing, stickerShape, layoutMode) ?? { total: 0 }; }
function setSFShape(shape) { window.appModules?.sticker?.setSFShape?.(shape); }
function setSFMode(mode) { window.appModules?.sticker?.setSFMode?.(mode); }
function toggleSFUnit(unit) { window.appModules?.sticker?.toggleSFUnit?.(unit); }
function sfBlinkInputs() { window.appModules?.sticker?.sfBlinkInputs?.(); }
function toggleSFTable(tableId, iconId, btnId, colorTheme) { window.appModules?.sticker?.toggleSFTable?.(tableId, iconId, btnId, colorTheme); }
function applySFResult(paperW, paperH, sizeWcm, sizeHcm, sfShape, sfLayout) { window.appModules?.sticker?.applySFResult?.(paperW, paperH, sizeWcm, sizeHcm, sfShape, sfLayout); }
function drawCanvas() { window.appModules?.sticker?.drawCanvas?.(); }
function updatePaperSize() { window.appModules?.sticker?.updatePaperSize?.(); }
function toggleStickerPaperDropdown(e) { window.appModules?.sticker?.toggleStickerPaperDropdown?.(e); }
function selectStickerPaperOption(value) { window.appModules?.sticker?.selectStickerPaperOption?.(value); }
function toggleCustomPaperSize() { window.appModules?.sticker?.toggleCustomPaperSize?.(); }
function getInputInInches(inputId, unitSelectId) { return window.appModules?.sticker?.getInputInInches?.(inputId, unitSelectId) ?? 0; }
function resetSpacing() { window.appModules?.sticker?.resetSpacing?.(); }
function changeInputValue(inputId, delta, type) { window.appModules?.sticker?.changeInputValue?.(inputId, delta, type); }
function initStickerEditor() { window.appModules?.sticker?.initStickerEditor?.(); }
function runStickerSmartFinder(mode) { window.appModules?.sticker?.runStickerSmartFinder?.(mode); }
function rerunLastStickerSmartFinder() { window.appModules?.sticker?.rerunLastStickerSmartFinder?.(); }
function selectStickerPaperUnitOption(value) { window.appModules?.sticker?.selectStickerPaperUnitOption?.(value); }
function toggleStickerPaperUnitDropdown(e) { window.appModules?.sticker?.toggleStickerPaperUnitDropdown?.(e); }
function getStickerPanelStates() { return window.appModules?.sticker?.getStickerPanelStates?.() ?? {}; }

function renderHomePage(container) {
  const allCategories = [{
    name: 'Large Format',
    icon: 'fas fa-expand-arrows-alt',
    page: 'largeFormat',
    color: 'from-red-500 to-orange-500',
    cardColor: '#ef4444'
  },
  {
    name: 'Signboard',
    icon: 'fas fa-sign',
    page: 'signboard',
    color: 'from-blue-500 to-teal-500',
    cardColor: '#3b82f6'
  },
  {
    name: 'Stand',
    icon: 'fas fa-flag',
    page: 'stand',
    color: 'from-purple-500 to-pink-500',
    cardColor: '#8b5cf6'
  },
  {
    name: 'Sublimation',
    icon: 'fas fa-tshirt',
    page: 'sublimation',
    color: 'from-yellow-500 to-amber-500',
    cardColor: '#eab308'
  },
  {
    name: 'Invitation Card',
    icon: 'fas fa-envelope-open-text',
    page: 'invitationCard',
    color: 'from-indigo-500 to-violet-500',
    cardColor: '#6366f1'
  },
  {
    name: 'Business Card',
    icon: 'fas fa-address-card',
    page: 'businessCard',
    color: 'from-green-500 to-lime-500',
    cardColor: '#22c55e'
  },
  {
    name: 'ID Card',
    icon: 'fas fa-id-card',
    page: 'idCard',
    color: 'from-cyan-500 to-sky-500',
    cardColor: '#06b6d4'
  },
  {
    name: 'Lanyard',
    icon: 'fas fa-id-badge',
    page: 'lanyard',
    color: 'from-fuchsia-500 to-purple-600',
    cardColor: '#d946ef'
  },
  {
    name: 'DTF & UVDTF',
    icon: 'fas fa-print',
    page: 'dtf',
    color: 'from-violet-500 to-purple-600',
    cardColor: '#7c3aed'
  },
  {
    name: 'Stamp',
    icon: 'fas fa-stamp',
    page: 'stamp',
    color: 'from-gray-700 to-gray-900',
    cardColor: '#4b5563'
  },
  {
    name: 'Sticker Layout',
    icon: 'fas fa-sticky-note',
    page: 'stickerLayout',
    color: 'from-rose-500 to-red-600',
    cardColor: '#f43f5e'
  },
  {
    name: 'Acrylic Calculator',
    icon: 'fas fa-layer-group',
    page: 'acrylicCalculator',
    color: 'from-sky-500 to-indigo-500',
    cardColor: '#0ea5e9'
  },
  {
    name: 'Gift Item',
    icon: 'fas fa-gift',
    page: 'giftItem',
    color: 'from-pink-500 to-rose-500',
    cardColor: '#ec4899'
  },
  {
    name: 'Asset Library',
    icon: 'fas fa-images',
    page: 'asset',
    color: 'from-teal-500 to-emerald-500',
    cardColor: '#14b8a6'
  }
  ];

  // FILTER: Only show enabled categories
  const visibleCategories = allCategories.filter(cat => pageVisibility[cat.page] !== false);

  let cardsHTML = visibleCategories.map(cat => `
    <div class="home-card" onclick="loadPage('${cat.page}')" style="--card-color: ${cat.cardColor};">
      <div class="home-card-icon"><i class="${cat.icon}"></i></div>
      <div class="home-card-title">${cat.name}</div>
    </div>
  `).join('');
  container.innerHTML = `
    <div class="homepage-background"></div>
    <div style="position: relative; z-index: 2; text-align: center;">
      <h2 style="font-size: 48px; font-weight: 700;">
        <span class="aurora-text">WELCOME</span>
      </h2>
      <p style="color: #FFFFFF; margin-top: -8px; margin-bottom: 24px;">Select a category to start calculating</p>
    </div>
    <div class="home-grid">${cardsHTML}</div>
  `;
}

// =================================================================================
// PAGE VISIBILITY MANAGEMENT
// =================================================================================
let pageVisibility = JSON.parse(localStorage.getItem('pageVisibility')) || {
  largeFormat: true,
  signboard: true,
  stand: true,
  sublimation: true,
  invitationCard: true,
  businessCard: true,
  idCard: true,
  lanyard: true,
  dtf: true,
  stamp: true,
  stickerLayout: true,
  acrylicCalculator: true,
  giftItem: true,
  asset: true,
  loadQuote: true
};

function savePageVisibility() {
  localStorage.setItem('pageVisibility', JSON.stringify(pageVisibility));
  applyPageVisibility(); // Update UI immediately
}

function applyPageVisibility() {
  // 1. Update Sidebar
  for (const [page, isVisible] of Object.entries(pageVisibility)) {
    const navItem = document.getElementById(`nav-item-${page}`);
    if (navItem) {
      navItem.style.display = isVisible ? 'block' : 'none';
    }
  }

  // 2. Update Dock (if dock exists)
  // We re-initialize dock to filter out hidden items
  initializeDock();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAgentPricingData();
  applyPageVisibility();
});

// =================================================================================
// SCRIPT FOR DOCK NAVIGATION
// =================================================================================
function initializeDock() {
  // Data for the dock, excluding Home and Settings
  const allDockCategories = [{
    name: 'Large Format',
    icon: 'fas fa-expand-arrows-alt',
    page: 'largeFormat'
  }, {
    name: 'Signboard',
    icon: 'fas fa-sign',
    page: 'signboard'
  }, {
    name: 'Stand',
    icon: 'fas fa-flag',
    page: 'stand'
  }, {
    name: 'Sublimation',
    icon: 'fas fa-tshirt',
    page: 'sublimation'
  }, {
    name: 'Invitation Card',
    icon: 'fas fa-envelope-open-text',
    page: 'invitationCard'
  }, {
    name: 'Business Card',
    icon: 'fas fa-address-card',
    page: 'businessCard'
  }, {
    name: 'ID Card',
    icon: 'fas fa-id-card',
    page: 'idCard'
  }, {
    name: 'Lanyard',
    icon: 'fas fa-id-badge',
    page: 'lanyard'
  }, {
    name: 'DTF & UVDTF',
    icon: 'fas fa-print',
    page: 'dtf'
  }, {
    name: 'Stamp',
    icon: 'fas fa-stamp',
    page: 'stamp'
  }, {
    name: 'Sticker Layout',
    icon: 'fas fa-sticky-note',
    page: 'stickerLayout'
  }, {
    name: 'Acrylic Calculator',
    icon: 'fas fa-layer-group',
    page: 'acrylicCalculator'
  }, {
    name: 'Gift Item',
    icon: 'fas fa-gift',
    page: 'giftItem'
  }];

  // FILTER: Only show enabled categories based on global settings
  const dockCategories = allDockCategories.filter(cat => pageVisibility[cat.page] !== false);

  const dockContainer = document.getElementById('dockContainer');
  const bottomDock = document.getElementById('bottomDock');
  if (!dockContainer || !bottomDock) return;

  // Restore original: plain <a> with inline onclick — most reliable click mechanism
  dockContainer.innerHTML = dockCategories.map(item => `
    <a class="dock-item" onclick="loadPage('${item.page}')">
      <i class="${item.icon}"></i>
      <div class="dock-label">${item.name}</div>
    </a>
  `).join('');

  const dockItems = Array.from(dockContainer.children);
  const baseSize = 44;
  const maxSize = 72;
  const magnificationDistance = 150;
  const canDockHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const resetDockMagnification = () => {
    dockItems.forEach((item) => {
      item.style.width = '';
      item.style.height = '';
      item.style.backdropFilter = '';
      item.style.webkitBackdropFilter = '';
      const icon = item.querySelector('i');
      if (icon) icon.style.fontSize = '';
    });
  };

  dockContainer.onmousemove = (e) => {
    if (!canDockHover() || bottomDock.classList.contains('is-dragging')) {
      resetDockMagnification();
      return;
    }
    const dockRect = dockContainer.getBoundingClientRect();
    const mouseX = e.clientX - dockRect.left;
    dockItems.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterX = itemRect.left - dockRect.left + itemRect.width / 2;
      const distance = Math.abs(mouseX - itemCenterX);
      const magnification = Math.max(0, 1 - distance / magnificationDistance);
      const easedMagnification = (1 - Math.cos(magnification * Math.PI)) / 2;
      const newSize = baseSize + (maxSize - baseSize) * easedMagnification;
      item.style.width = `${newSize}px`;
      item.style.height = `${newSize}px`;
      const blurAmount = 4 + easedMagnification * 8;
      item.style.backdropFilter = `blur(${blurAmount}px)`;
      item.style.webkitBackdropFilter = `blur(${blurAmount}px)`;
      const icon = item.querySelector('i');
      if (icon) icon.style.fontSize = `${newSize * 0.5}px`;
    });
  };

  let isDockNavigating = false;

  dockContainer.onmouseleave = () => {
    if (isDockNavigating) return;
    resetDockMagnification();
  };

  // Drag-to-scroll: only capture pointer AFTER drag threshold, so normal clicks pass through
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let isDraggingDock = false;

  const endDockDrag = () => {
    dragPointerId = null;
    isDraggingDock = false;
    bottomDock.classList.remove('is-dragging');
  };

  bottomDock.onpointerdown = (event) => {
    if (event.button !== 0) return;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScrollLeft = bottomDock.scrollLeft;
    isDraggingDock = false;
    // Do NOT setPointerCapture here — doing so would hijack the click event
  };

  bottomDock.onpointermove = (event) => {
    if (dragPointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragStartX;
    if (!isDraggingDock && Math.abs(deltaX) > 6) {
      isDraggingDock = true;
      bottomDock.classList.add('is-dragging');
      // Only capture after confirmed drag so click events are unaffected
      try { bottomDock.setPointerCapture(event.pointerId); } catch (_) {}
    }
    if (!isDraggingDock) return;
    bottomDock.scrollLeft = dragStartScrollLeft - deltaX;
    event.preventDefault();
  };

  bottomDock.onpointerup = (event) => {
    if (dragPointerId !== event.pointerId) return;
    const wasDragging = isDraggingDock;
    endDockDrag();
    if (wasDragging) {
      // Suppress the click that fires after a drag release
      bottomDock.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true });
    }
  };

  bottomDock.onpointercancel = () => { endDockDrag(); };
  bottomDock.onlostpointercapture = () => { endDockDrag(); };
}
// =================================================================================
// SCRIPT FOR PRINTING CALCULATOR
// =================================================================================
// --- CONSTANTS (Magic Strings) ---
const CAT_LARGE_FORMAT = "largeFormat";
const CAT_SIGNBOARD = "signboard";
const CAT_STAND = "stand";
const CAT_SUBLIMATION = "sublimation";
const CAT_INVITATION = "invitationCard";
const CAT_BUSINESS = "businessCard";
const CAT_ACRYLIC = "acrylicCalculator";
const CAT_STAMP = "stamp";
const CAT_SETTINGS = "settings";
const CAT_HOME = "home";
const CAT_LOAD_QUOTE = "loadQuote";
const CAT_GIFT_ITEM = "giftItem";
const CAT_ASSET = "asset";

var lastSearchQueries = {
  [CAT_LARGE_FORMAT]: "",
  [CAT_SIGNBOARD]: "",
  [CAT_STAND]: ""
};

// --- START: UNIVERSAL INVOICE GENERATOR (Enhanced) ---
/**
 * Generates a standardized invoice string.
 * @param {string} title - The product name
 * @param {Array} customLines - List of unique details
 * @param {number} unitPrice - The single unit price (pre-tax)
 * @param {number} quantity - Total quantity
 * @param {Object} options - { showQty: boolean, showTotal: boolean, unitLabel: string }
 */
function generateUniversalInvoice(title, customLines, unitPrice, quantity, options = {}) {
  const moduleInvoiceGenerator = window.appModules?.invoice?.generateUniversalInvoice;

  if (typeof moduleInvoiceGenerator === 'function') {
    return moduleInvoiceGenerator({
      title,
      customLines,
      unitPrice,
      quantity,
      options,
      currency: currentCurrency,
      isTaxEnabled,
      taxPercent: globalTaxPercent,
    });
  }

  // Default values: Show everything by default
  const showQty = options.hasOwnProperty('showQty') ? options.showQty : true;
  const showTotal = options.hasOwnProperty('showTotal') ? options.showTotal : true;
  const showPrice = options.hasOwnProperty('showPrice') ? options.showPrice : true;
  const unitLabel = options.hasOwnProperty('unitLabel') ? options.unitLabel : '/pc';

  let txt = `${title}\n`;

  // 1. Insert all the unique custom lines
  customLines.forEach(line => {
    if (line && line.trim() !== "") txt += `${line}\n`;
  });

  // 2. Unit Price (Optional, label is customizable)
  if (showPrice) {
    txt += `Price : ${currentCurrency.symbol}${formatCurrency(unitPrice)}${unitLabel}\n`;
  }

  // 3. Quantity (Optional)
  if (showQty) {
    txt += `Qty : ${quantity} pcs\n`;
  }

  let subTotal = unitPrice * quantity;
  let finalTotal = subTotal;

  if (isTaxEnabled) {
    const taxAmount = subTotal * (globalTaxPercent / 100);
    finalTotal += taxAmount;
    // Only show Tax line if we are showing totals (otherwise it's confusing)
    if (showTotal) {
      txt += `Tax (${globalTaxPercent}%): ${currentCurrency.symbol}${formatCurrency(taxAmount)}\n`;
    }
  }

  // 4. Total (Optional)
  if (showTotal) {
    txt += `Total : ${currentCurrency.symbol}${formatCurrency(finalTotal)}`;
  }

  return txt.trim();
}
// --- END: UNIVERSAL INVOICE GENERATOR ---

let previousTotalPrice = 0; // Stores the last price to animate from

function animatePriceTicker(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;

  // If the numbers are practically the same, just set it instantly
  if (Math.abs(start - end) < 0.01) {
    obj.innerHTML = formatCurrency(end);
    return;
  }

  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);

    // Ease-out effect (starts fast, slows down at the end)
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentVal = start + (end - start) * easeProgress;
    obj.innerHTML = formatCurrency(currentVal);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.innerHTML = formatCurrency(end); // Ensure it ends on the exact number
    }
  };
  window.requestAnimationFrame(step);
}

// Add this array at the top of your script, with your other global variables
// NOTE: quotePadItems/state now live in modules/quotePad.js
function addItemToQuotePad(data) { window.appModules?.quotePad?.addItemToQuotePad?.(data); }

// --- START: Quote Pad Functions ---
function openOrCloseQuotePad() { window.appModules?.quotePad?.openOrCloseQuotePad?.(); }
function toggleQuotePad(show) { window.appModules?.quotePad?.toggleQuotePad?.(show); }
function toggleQuotePadView(isEdit) { window.appModules?.quotePad?.toggleQuotePadView?.(isEdit); }
function addToQuotePad() {
  // 1. Determine the correct material array and category label
  const sourceArray = currentCategory === 'largeFormat' ? materials : signboardMaterials;
  const categoryLabel = currentCategory === 'largeFormat' ? 'Large Format' : 'Signboard';
  const material = sourceArray[selectedMaterialIndex];

  // 2. Gather all data
  const titleRaw = document.getElementById('itemTitle').value.trim();
  // Use custom title if provided, otherwise use Category + Material Name
  const title = titleRaw !== '' ? titleRaw : `${categoryLabel}: ${material.name}`;

  const widthRaw = parseFloat(document.getElementById('width').value);
  const heightRaw = parseFloat(document.getElementById('height').value);
  const unit = document.getElementById('measurementUnit').value;
  const subTotalEl = document.getElementById('lastSubTotal');
  const subTotal = subTotalEl ? parseFloat(subTotalEl.dataset.subtotal) : 0;
  const presetLabel = lastClickedASize ? `(${lastClickedASize}) ` : "";

  // 3. Prepare Invoice Lines
  const sizeLine = `Size : ${presetLabel}${widthRaw.toFixed(2)}${unit} (W) x ${heightRaw.toFixed(2)}${unit} (H)`;
  const materialLine = `Material : ${material.name}`;

  // Logic for finishing
  let finishingLine = '';
  const optEl = document.getElementById("eyeletOption");
  if (optEl && !material.simple) {
    const opt = optEl.value;
    if (opt === 'pipe') {
      finishingLine = 'Finishing : Pipe (Top & Bottom)';
    } else if (opt === 'auto' || opt === 'manual') {
      const eyeletCount = document.getElementById('invoiceText').value.match(/Eyelet : (\d+)pcs/);
      if (eyeletCount) finishingLine = `Finishing : Eyelet (${eyeletCount[1]}pcs)`;
    }
  }

  // 4. Use the Universal Function (Module 36)
  addItemToQuotePad({
    type: 'calculator',
    title: title,
    name: material.name,
    unitPrice: subTotal,
    quantity: 1,
    details: {
      size: sizeLine,
      material: materialLine,
      finishing: finishingLine
    }
  });
}
function addStandToQuotePad() {
  window.appModules?.stand?.addStandToQuotePad?.(createStandModuleContext());
}
function generateStandPriceListHTML(forceAgent = null, includeDownload = true, includeCompareBtn = true, containerId = 'stand-price-list-container', showHeader = true) {
  return window.appModules?.stand?.generateStandPriceListHTML?.(createStandModuleContext(), forceAgent, includeDownload, includeCompareBtn, containerId, showHeader);
}
function openStandCompareModal() {
  window.appModules?.stand?.openStandCompareModal?.(createStandModuleContext());
}
function closeStandCompareModal() {
  window.appModules?.stand?.closeStandCompareModal?.();
}
function addOpenItemToPad() { window.appModules?.quotePad?.addOpenItemToPad?.(); }
function updateOpenItemField(id, field, value) { window.appModules?.quotePad?.updateOpenItemField?.(id, field, value); }
function renderQuotePad() { window.appModules?.quotePad?.renderQuotePad?.(); }
function initQuotePadSortable() { window.appModules?.quotePad?.initQuotePadSortable?.(); }
function updateGrandTotalDisplay() { window.appModules?.quotePad?.updateGrandTotalDisplay?.(); }
function adjustQuoteItemQuantity(id, delta) { window.appModules?.quotePad?.adjustQuoteItemQuantity?.(id, delta); }
function updateQuoteItemPrice(id, newPrice) { window.appModules?.quotePad?.updateQuoteItemPrice?.(id, newPrice); }
function updateQuoteItemQuantity(id, newQuantity) { window.appModules?.quotePad?.updateQuoteItemQuantity?.(id, newQuantity); }
function autoResizeTextarea(element) { window.appModules?.quotePad?.autoResizeTextarea?.(element); }
function updateQuoteName(newName) { window.appModules?.quotePad?.updateQuoteName?.(newName); }
function updateQuoteItemTitle(id, newTitle) { window.appModules?.quotePad?.updateQuoteItemTitle?.(id, newTitle); }
function updateQuoteItemDetail(id, field, value) { window.appModules?.quotePad?.updateQuoteItemDetail?.(id, field, value); }
function updateQuoteItemCombinedDetails(id, combinedValue) { window.appModules?.quotePad?.updateQuoteItemCombinedDetails?.(id, combinedValue); }
function duplicateQuotePadItem(id) { window.appModules?.quotePad?.duplicateQuotePadItem?.(id); }
function removeFromPad(id) { window.appModules?.quotePad?.removeFromPad?.(id); }
function clearPad() { window.appModules?.quotePad?.clearPad?.(); }
function copyAllFromPad() { window.appModules?.quotePad?.copyAllFromPad?.(); }
function getQuoteSummary(quoteItems) { return window.appModules?.quotePad?.getQuoteSummary?.(quoteItems) ?? { total: 0, totalQty: 0 }; }
function saveQuote() { window.appModules?.quotePad?.saveQuote?.(); }
function renderLoadQuotePage(container, currentSort = 'date_desc') { window.appModules?.quotePad?.renderLoadQuotePage?.(container, currentSort); }
function loadSelectedQuote(quoteName) { window.appModules?.quotePad?.loadSelectedQuote?.(quoteName); }
function deleteSavedQuote(quoteName) { window.appModules?.quotePad?.deleteSavedQuote?.(quoteName); }
// --- END: Quote Pad Functions ---
// =================================================================================
// CURRENCY DATA & STATE
// =================================================================================
const currencies = [{
  code: 'MYR',
  symbol: 'RM',
  name: 'Malaysian Ringgit',
  decimal_digits: 2,
  country_code: 'my'
},
{
  code: 'USD',
  symbol: '$',
  name: 'United States Dollar',
  decimal_digits: 2,
  country_code: 'us'
},
{
  code: 'EUR',
  symbol: 'â‚¬',
  name: 'Euro',
  decimal_digits: 2,
  country_code: 'eu'
},
{
  code: 'JPY',
  symbol: 'Â¥',
  name: 'Japanese Yen',
  decimal_digits: 0,
  country_code: 'jp'
},
{
  code: 'IDR',
  symbol: 'Rp',
  name: 'Indonesian Rupiah',
  decimal_digits: 2,
  country_code: 'id'
},
{
  code: 'SGD',
  symbol: 'S$',
  name: 'Singapore Dollar',
  decimal_digits: 2,
  country_code: 'sg'
},
{
  code: 'GBP',
  symbol: 'Â£',
  name: 'British Pound',
  decimal_digits: 2,
  country_code: 'gb'
},
{
  code: 'AUD',
  symbol: 'A$',
  name: 'Australian Dollar',
  decimal_digits: 2,
  country_code: 'au'
},
{
  code: 'CAD',
  symbol: '$',
  name: 'Canadian Dollar',
  decimal_digits: 2,
  country_code: 'ca'
},
{
  code: 'CHF',
  symbol: 'CHF',
  name: 'Swiss Franc',
  decimal_digits: 2,
  country_code: 'ch'
},
{
  code: 'CNY',
  symbol: 'Â¥',
  name: 'Chinese Yuan',
  decimal_digits: 2,
  country_code: 'cn'
},
{
  code: 'HKD',
  symbol: '$',
  name: 'Hong Kong Dollar',
  decimal_digits: 2,
  country_code: 'hk'
},
{
  code: 'INR',
  symbol: 'â‚¹',
  name: 'Indian Rupee',
  decimal_digits: 2,
  country_code: 'in'
},
{
  code: 'KRW',
  symbol: 'â‚©',
  name: 'South Korean Won',
  decimal_digits: 0,
  country_code: 'kr'
},
{
  code: 'BRL',
  symbol: 'R$',
  name: 'Brazilian Real',
  decimal_digits: 2,
  country_code: 'br'
},
{
  code: 'RUB',
  symbol: 'â‚½',
  name: 'Russian Ruble',
  decimal_digits: 2,
  country_code: 'ru'
},
{
  code: 'ZAR',
  symbol: 'R',
  name: 'South African Rand',
  decimal_digits: 2,
  country_code: 'za'
},
{
  code: 'PHP',
  symbol: 'â‚±',
  name: 'Philippine Peso',
  decimal_digits: 2,
  country_code: 'ph'
},
{
  code: 'VND',
  symbol: 'â‚«',
  name: 'Vietnamese Dong',
  decimal_digits: 0,
  country_code: 'vn'
},
{
  code: 'AED',
  symbol: 'Ø¯.Ø¥',
  name: 'UAE Dirham',
  decimal_digits: 2,
  country_code: 'ae'
}
];
let currentCurrency = currencies[0]; // Default to MYR
let tempSelectedCurrencyCode = null;

function initializeCurrency() {
  const savedCurrencyCode = localStorage.getItem('selectedCurrency');
  if (savedCurrencyCode) {
    const savedCurrency = currencies.find(c => c.code === savedCurrencyCode);
    if (savedCurrency) {
      currentCurrency = savedCurrency;
    }
  }
}
initializeCurrency();

function formatCurrency(amount) {
  const moduleFormatter = window.appModules?.currency?.formatCurrency;

  if (typeof moduleFormatter === 'function') {
    return moduleFormatter(amount, currentCurrency);
  }

  if (isNaN(amount)) return '0';
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: currentCurrency.decimal_digits,
    maximumFractionDigits: currentCurrency.decimal_digits,
  });
  return formatter.format(amount);
}

function openCurrencyModal() {
  const list = document.getElementById('currencyList');
  const searchInput = document.getElementById('currencySearch');
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
  if (tempSelectedCurrencyCode === null) {
    tempSelectedCurrencyCode = currentCurrency.code;
  }
  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(searchTerm) ||
    c.code.toLowerCase().includes(searchTerm) ||
    c.symbol.toLowerCase().includes(searchTerm)
  );
  list.innerHTML = filteredCurrencies.map(currency => {
    const isSelected = currency.code === tempSelectedCurrencyCode;
    return `
            <div
                class="flex items-center p-2 rounded-md cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100 font-bold text-blue-700' : ''}"
                onclick="previewCurrency('${currency.code}')"
            >
                <img src="https://flagcdn.com/w20/${currency.country_code}.png" srcset="https://flagcdn.com/w40/${currency.country_code}.png 2x" width="20" class="mr-3 rounded-sm" alt="${currency.name} flag">
                <span class="w-8 text-center text-gray-500 ${isSelected ? 'text-blue-700' : ''}">${currency.symbol}</span>
                <span class="flex-1 ml-2">${currency.name}</span>
                <span class="text-gray-400 font-mono ${isSelected ? 'text-blue-600' : ''}">${currency.code}</span>
            </div>
        `;
  }).join('');
  if (document.getElementById('currencyModal').style.display !== 'flex') {
    document.getElementById('currencyModal').style.display = 'flex';
  }
}

function closeCurrencyModal() {
  document.getElementById('currencyModal').style.display = 'none';
}

function previewCurrency(code) {
  tempSelectedCurrencyCode = code;
  document.getElementById('saveCurrencyBtn').disabled = false;
  openCurrencyModal();
}

function selectCurrency() {
  const newCurrency = currencies.find(c => c.code === tempSelectedCurrencyCode);
  if (newCurrency) {
    currentCurrency = newCurrency;
    localStorage.setItem('selectedCurrency', tempSelectedCurrencyCode);
    closeCurrencyModal();
    tempSelectedCurrencyCode = null;
    document.getElementById('saveCurrencyBtn').disabled = true;
    if (currentCategory === 'settings') {
      renderSettingsPage(document.getElementById('contentArea'));
    } else {
      loadPage(currentCategory);
    }
  }
}
// =================================================================================
// TAX DATA & STATE
// =================================================================================
let isTaxEnabled = false;
let globalTaxPercent = 6; // Default to 6%
function initializeTaxSettings() {
  const savedTaxEnabled = localStorage.getItem('isTaxEnabled');
  const savedTaxPercent = localStorage.getItem('globalTaxPercent');
  if (savedTaxEnabled !== null) {
    isTaxEnabled = savedTaxEnabled === 'true';
  }
  if (savedTaxPercent !== null) {
    globalTaxPercent = parseFloat(savedTaxPercent);
  }
}
initializeTaxSettings(); // Call this function once when the script loads
let glueExceptionSizes = [];
let eyeletExceptionSizes = [];

function initializeGlueExceptions() {
  // This list has been optimized to remove redundant and overlapping sizes.
  // The logic checks if a banner's dimensions are less than or equal to ANY of these pairs.
  glueExceptionSizes = [
    [2, 6], // Covers all sizes up to 2ft x 6ft (including 1x1, 1x2, etc.)
    [3, 4], // Covers 3x1, 3x2, 3x3, 3x4 and their rotations (4x1, 4x2, 4x3)
    [4, 4], // Covers the specific 4x4 size
    [5, 2] // Covers 5x1, 5x2 and their rotations
  ];
}
// ADD THIS CALL
initializeGlueExceptions();

function initializeEyeletExceptions() {
  const savedSizes = localStorage.getItem('eyeletExceptionSizes');
  if (savedSizes) {
    try {
      eyeletExceptionSizes = JSON.parse(savedSizes);
    } catch (e) {
      console.error("Error parsing eyeletExceptionSizes from localStorage", e);
      eyeletExceptionSizes = [
        [1, 1],
        [1, 2],
        [3, 1],
        [3, 2],
        [3, 3],
        [3, 4],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
        [5, 1],
        [5, 2],
        [6, 1],
        [6, 2]
      ];
    }
  } else {
    // If no sizes are saved, initialize with the original hardcoded list.
    eyeletExceptionSizes = [
      [1, 1],
      [1, 2],
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
      [5, 1],
      [5, 2],
      [6, 1],
      [6, 2]
    ];
  }
}
initializeEyeletExceptions();
const a_sizes_mm = {
  'A0': {
    w: 841,
    h: 1189
  },
  'A1': {
    w: 594,
    h: 841
  },
  'A2': {
    w: 420,
    h: 594
  },
  'A3': {
    w: 297,
    h: 420
  },
  'A4': {
    w: 210,
    h: 297
  },
  'A5': {
    w: 148,
    h: 210
  },
  'A6': {
    w: 105,
    h: 148
  }
};

function isExceptionSize(w, h) {
  return eyeletExceptionSizes.some(([a, b]) => (w <= a && h <= b) || (w <= b && h <= a));
}
// ==========================================
// STAMP DATA CONFIGURATION
// ==========================================
// 1. Pre-Ink Stamps (SVG)
const PREINK_URL = "https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/Preink%20Stamp/";
// 2. Flash Stamps (SVG) - Updated Link
const FLASH_URL = "https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/Flash%20Stamp/";
// 3. Stamp Pad Rubber Stamps (SVG) - Updated Link
const RUBBER_URL = "https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/Stamp%20Pad%20Rubber%20Stamp/";

// ==========================================
// ASSET LIBRARY - Centralized Asset Registry
// ==========================================
const ASSETS_BASE_URL = "https://cdn.jsdelivr.net/gh/Starverz/my-svg-assets/";
const SUBLIMATION_ASSETS_URL = ASSETS_BASE_URL + "Sublimation/";
const DUMMY_ICON = ASSETS_BASE_URL + "Round_Neck.svg";

const assetLibrary = {
  // --- Sublimation Assets ---
  asset_round_neck:       { url: SUBLIMATION_ASSETS_URL + "Round_Neck.svg",       label: "Round Neck",       category: "Sublimation" },
  asset_v_neck:           { url: SUBLIMATION_ASSETS_URL + "V_Neck.svg",           label: "V-Neck",           category: "Sublimation" },
  asset_collar_button:    { url: SUBLIMATION_ASSETS_URL + "Collar_Button.svg",    label: "Collar Button",    category: "Sublimation" },
  asset_v_neck_cross:     { url: SUBLIMATION_ASSETS_URL + "V_Neck_Cross.svg",     label: "V-Neck Cross",     category: "Sublimation" },
  // --- Lanyard Assets (using dummy placeholders) ---
  asset_lanyard_body:     { url: DUMMY_ICON, label: "Body Lanyard",     category: "Lanyard" },
  asset_lanyard_keychain: { url: DUMMY_ICON, label: "Keychain Lanyard", category: "Lanyard" },
  asset_lanyard_oval_hook:{ url: DUMMY_ICON, label: "Oval Hook",        category: "Lanyard" },
  asset_lanyard_buckle:   { url: DUMMY_ICON, label: "Buckle",           category: "Lanyard" },
  asset_lanyard_safety:   { url: DUMMY_ICON, label: "Safety Clip",      category: "Lanyard" },
  // --- Stamp Assets (reference only, stamps already use URL constants) ---
  // Stamp assets are managed via PREINK_URL, FLASH_URL, RUBBER_URL constants
};

function getAssetURL(assetId) {
  if (!assetId) return DUMMY_ICON;
  
  // Check assetLibrary first (Sublimation, Lanyard, etc.)
  const libraryEntry = assetLibrary[assetId];
  if (libraryEntry) return libraryEntry.url;
  
  // Check stamps if ID starts with 'stamp_'
  if (assetId.startsWith('stamp_')) {
    for (const [catName, items] of Object.entries(stampsData)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const syntheticId = 'stamp_' + item.name.replace(/\s+/g, '_').toLowerCase();
        if (syntheticId === assetId) return item.img;
      }
    }
  }
  
  return DUMMY_ICON;
}
var mugData = {
  versions: [
    {
      label: "White Mug",
      types: [
        { label: "White Blank",  customerPrice: 15.00, agentPrice: 12.00 },
        { label: "Inner Color",  customerPrice: 18.00, agentPrice: 15.00 }
      ]
    },
    {
      label: "Magic Mug",
      types: [
        { label: "Full Body",    customerPrice: 28.00, agentPrice: 23.00 },
        { label: "Design Only", customerPrice: 25.00, agentPrice: 20.00 }
      ]
    }
  ]
};

var buttonBadgeData = {
  sizes: [
    { label: "44mm", customerPrice: 3.50, agentPrice: 2.50 },
    { label: "58mm", customerPrice: 4.00, agentPrice: 3.00 },
    { label: "75mm", customerPrice: 5.50, agentPrice: 4.50 }
  ],
  shapes: ["Round", "Heart Shape"],
  tiers: [
    { qty: 1, discount: 1.0 },
    { qty: 50, discount: 0.85 },
    { qty: 100, discount: 0.70 },
    { qty: 500, discount: 0.60 }
  ]
};

var keychainData = {
  variants: [
    { label: "Single Layer Acrylic (3mm)", customerPrice: 6.00, agentPrice: 4.50 },
    { label: "Double Layer Acrylic (2+2mm)", customerPrice: 9.00, agentPrice: 7.00 },
    { label: "Custom Shape Cut", customerPrice: 12.00, agentPrice: 9.50 }
  ],
  tiers: [
    { qty: 1, discount: 1.0 },
    { qty: 20, discount: 0.90 },
    { qty: 50, discount: 0.80 },
    { qty: 100, discount: 0.70 }
  ]
};

var dtfData = {
  fixedWidthCm: 55,
  priceTiers: {
    customer: [
      { minM: 1,  pricePerM: 35 },
      { minM: 6,  pricePerM: 34 },
      { minM: 11, pricePerM: 33 },
      { minM: 21, pricePerM: 30 },
    ],
    agent: [
      { minM: 1,  pricePerM: 33 },
      { minM: 6,  pricePerM: 32 },
      { minM: 11, pricePerM: 31 },
      { minM: 21, pricePerM: 30 },
    ],
  },
};

var uvdtfData = {
  variants: [
    { label: 'UVDTF Sticker', customerPrice: 35.00, agentPrice: 30.00 },
  ],
  tiers: [],
};

// Flat list used by the settings page (getCategoryArray) and Excel export.
// Aggregates mug, badge, and keychain base entries for display/editing.
var giftItems = [
  ...mugData.versions.flatMap(v => v.types.map(t => ({ name: `${v.label} - ${t.label}`, customerPrice: t.customerPrice, agentPrice: t.agentPrice, _type: 'mug' }))),
  ...buttonBadgeData.sizes.map(s => ({ name: `Button Badge: ${s.label}`, customerPrice: s.customerPrice, agentPrice: s.agentPrice, _type: 'badge' })),
  ...keychainData.variants.map(v => ({ name: `Keychain: ${v.label}`, customerPrice: v.customerPrice, agentPrice: v.agentPrice, _type: 'keychain' }))
];

var stampsData = {
  'Pre Ink Rubber Stamp': [
    {
      name: 'Printy 4910',
      width: 26,
      height: 9,
      customerPrice: 26.00,
      agentPrice: 22.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4910.svg'
    },
    {
      name: 'Printy 4911',
      width: 38,
      height: 14,
      customerPrice: 28.00,
      agentPrice: 24.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4911.svg'
    },
    {
      name: 'Printy 4912',
      width: 47,
      height: 18,
      customerPrice: 34.00,
      agentPrice: 30.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4912.svg'
    },
    {
      name: 'Printy 4913',
      width: 58,
      height: 22,
      customerPrice: 40.00,
      agentPrice: 36.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4913.svg'
    },
    {
      name: 'Printy 4915',
      width: 70,
      height: 25,
      customerPrice: 49.00,
      agentPrice: 45.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4915_v2.svg'
    },
    {
      name: 'Pocket Printy 9512',
      width: 47,
      height: 18,
      customerPrice: 36.00,
      agentPrice: 32.00,
      shape: 'rect',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Pocket_Printy_9512.svg'
    },
    {
      name: 'Printy 4630',
      width: 30,
      height: 30,
      customerPrice: 39.00,
      agentPrice: 35.00,
      shape: 'round',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Printy_4630.svg'
    },
    {
      name: 'Micro Printy 9342 (30mm)',
      width: 30,
      height: 30,
      customerPrice: 35.00,
      agentPrice: 31.00,
      shape: 'round',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Micro_Printy_9342_30mm.svg'
    },
    {
      name: 'Micro Printy 9342 (42mm)',
      width: 42,
      height: 42,
      customerPrice: 47.00,
      agentPrice: 43.00,
      shape: 'round',
      category: 'Pre Ink Rubber Stamp',
      img: PREINK_URL + 'Micro_Printy_9342_42mm.svg'
    }
  ],
  'Flash Stamp': [
    {
      name: 'Flash Stamp F1755',
      width: 50,
      height: 12,
      customerPrice: 36.00,
      agentPrice: 34.00,
      shape: 'rect',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F1755.svg'
    },
    {
      name: 'Flash Stamp F2255',
      width: 50,
      height: 17,
      customerPrice: 40.00,
      agentPrice: 36.00,
      shape: 'rect',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F2255.svg'
    },
    {
      name: 'Flash Stamp F2755',
      width: 50,
      height: 22,
      customerPrice: 43.00,
      agentPrice: 39.00,
      shape: 'rect',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F2755.svg'
    },
    {
      name: 'Flash Stamp F4367',
      width: 62,
      height: 38,
      customerPrice: 56.00,
      agentPrice: 52.00,
      shape: 'rect',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F4367.svg'
    },
    {
      name: 'Flash Stamp Keychain F1331',
      width: 26,
      height: 8,
      customerPrice: 20.00,
      agentPrice: 16.00,
      shape: 'rect',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F1331.svg'
    },
    {
      name: 'Flash Stamp Round F30 (26mm)',
      width: 26,
      height: 26,
      customerPrice: 43.00,
      agentPrice: 39.00,
      shape: 'round',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F30.svg'
    },
    {
      name: 'Flash Stamp Round F42 (38mm)',
      width: 38,
      height: 38,
      customerPrice: 50.00,
      agentPrice: 46.00,
      shape: 'round',
      category: 'Flash Stamp',
      img: FLASH_URL + 'Flash_Stamp_F42.svg'
    }
  ],
  'Stamp Pad Rubber Stamp': [
    {
      name: 'Wood Handle 3x7cm',
      width: 70,
      height: 30,
      customerPrice: 20.00,
      agentPrice: 16.00,
      shape: 'rect',
      category: 'Stamp Pad Rubber Stamp',
      img: RUBBER_URL + 'Stamp_Pad_Rubber_Stamp.svg'
    }
  ]
};

// Helper function to flatten stampsData into a single array
function getStampsArray() {
  const flat = [];
  for (const category in stampsData) {
    flat.push(...stampsData[category]);
  }
  return flat;
}

// For backward compatibility, use getStampsArray() when you need the full array
var stamps = getStampsArray();
var stampInkColors = [{
  name: 'Blue',
  hex: '#0000FF'
},
{
  name: 'Black',
  hex: '#000000'
},
{
  name: 'Red',
  hex: '#FF0000'
}
];
let selectedStampIndex = null;
let stampScrollPos = 0;
let largeFormatScrollPos = 0;
let signboardScrollPos = 0;
let standScrollPos = 0;

var materials = [{
  name: 'Tarpaulin Normal 340gsm',
  customerPrice: 2.50,
  agentPrice: 1.50,
  simple: false
}, {
  name: 'Tarpaulin UV 440gsm',
  customerPrice: 5.00,
  agentPrice: 4.00,
  simple: false
}, {
  name: 'White Sticker Normal',
  customerPrice: 5.00,
  agentPrice: 4.00,
  simple: true
}, {
  name: 'White Sticker  + Cold Laminate',
  customerPrice: 9.00,
  agentPrice: 8.00,
  simple: true
}, {
  name: 'White Sticker Normal + Kiss Cut',
  customerPrice: 6.7,
  agentPrice: 6.00,
  simple: true
}, {
  name: 'White Sticker Normal + Kiss Cut + Hot Laminate',
  customerPrice: 8.40,
  agentPrice: 7.40,
  simple: true
}, {
  name: 'White Sticker Normal + Kiss Cut + Cold Laminate',
  customerPrice: 11.40,
  agentPrice: 10.40,
  simple: true
}, {
  name: 'White Sticker UV',
  customerPrice: 6.50,
  agentPrice: 5.50,
  simple: true
}, {
  name: 'White Sticker UV + Kiss Cut',
  customerPrice: 9.50,
  agentPrice: 8.50,
  simple: true
}, {
  name: 'Sticker Transparent UV',
  customerPrice: 8.00,
  agentPrice: 7.00,
  simple: true
}, {
  name: 'Sticker Solid Cut Out',
  customerPrice: 14.00,
  agentPrice: 12.00,
  simple: true
}, {
  name: 'Sticker Chrome Cut Out',
  customerPrice: 17.00,
  agentPrice: 14.00,
  simple: true
}, {
  name: 'One Way Sticker UV',
  customerPrice: 9.50,
  agentPrice: 8.00,
  simple: true
}, {
  name: 'Backlit Film UV',
  customerPrice: 11.00,
  agentPrice: 10.00,
  simple: true
}, {
  name: 'Static Clear Cling - Roadtax Sticker',
  customerPrice: 100.00,
  agentPrice: 90.00,
  simple: true
}, {
  name: 'Synthetic Paper Normal',
  customerPrice: 6.00,
  agentPrice: 5.00,
  simple: false
}, {
  name: 'Synthetic Paper UV',
  customerPrice: 7.00,
  agentPrice: 6.00,
  simple: false
}, {
  name: 'Polysilk Normal',
  customerPrice: 6.00,
  agentPrice: 5.50,
  simple: true
}, {
  name: 'Art Canvas UV',
  customerPrice: 7.50,
  agentPrice: 6.50,
  simple: true
}, {
  name: 'White Sticker UV + Magnet Sheet 0.5mm',
  customerPrice: 25.00,
  agentPrice: 23.00,
  agent: false,
  simple: true
}, {
  name: 'Roll Up Stand + Synthetic Paper Normal',
  customerPrice: 11.85,
  agentPrice: 10.55,
  agent: false,
  simple: true,
  fixed: true,
  fixedWidth: 2.5,
  fixedHeight: 6.5
}, {
  name: 'Roll Up Stand + Synthetic Paper UV',
  customerPrice: 12.85,
  agentPrice: 11.55,
  agent: false,
  simple: true,
  fixed: true,
  fixedWidth: 2.5,
  fixedHeight: 6.5
}, {
  name: 'Jumbo Stand + Tarpaulin Normal',
  customerPrice: 8.15,
  agentPrice: 6.65,
  agent: false,
  simple: true,
  fixed: true,
  fixedWidth: 8.0,
  fixedHeight: 8.0
}, {
  name: 'PVC Promotion Counter + White Sticker Normal',
  customerPrice: 21.80,
  agentPrice: 19.20,
  agent: false,
  simple: true,
  fixed: true,
  fixedWidth: 6.92,
  fixedHeight: 2.67
},];
var stands = [{
  name: "X-Stand",
  customerPrice: 35,
  agentPrice: 30,
  agent: false
}, {
  name: "T-Stand",
  customerPrice: 40,
  agentPrice: 35,
  agent: false
}, {
  name: "Easel Stand",
  customerPrice: 85,
  agentPrice: 80,
  agent: false
}, {
  name: "Roll Up Stand",
  customerPrice: 95,
  agentPrice: 90,
  agent: false
}, {
  name: "Jumbo Stand (Sell Only)",
  customerPrice: 360,
  agentPrice: 330,
  agent: false
}, {
  name: "PVC Promotion Counter Blank",
  customerPrice: 260,
  agentPrice: 230,
  agent: false
}];
var signboardMaterials = [{
  name: "White Sticker Normal + Compress Foam Board",
  customerPrice: 9.50,
  agentPrice: 7.00,
  simple: true
}, {
  name: "White Sticker Normal + Compress Foam Board + Die Cut Shape",
  customerPrice: 12.50,
  agentPrice: 9.00,
  simple: true
}, {
  name: "White Sticker UV + Compress Foam Board",
  customerPrice: 11.00,
  agentPrice: 8.50,
  simple: true
}, {
  name: "White Sticker Normal + PP Board",
  customerPrice: 10.00,
  agentPrice: 7.50,
  simple: true
}, {
  name: "White Sticker Normal + PP Board + Simple Die Cut Shape",
  customerPrice: 12.00,
  agentPrice: 9.50,
  simple: true
}, {
  name: "White Sticker UV + PP Board",
  customerPrice: 11.50,
  agentPrice: 9.00,
  simple: true
}, {
  name: "White Sticker UV + PP Board + Simple Die Cut Shape",
  customerPrice: 14.50,
  agentPrice: 11.00,
  simple: true
}, {
  name: "White Sticker UV + Polycarbonate",
  customerPrice: 20.00,
  agentPrice: 17.00,
  simple: true
}];
var invitationCardData = {
  // CONSOLIDATED STRUCTURE: basePrice, materials (each with name + addOn per size), addons
  // Each price entry has explicit {customerPrice, agentPrice} â€” materialAddOn is gone, addOn lives on the material object
  // Rendering displays customer and agent prices on alternate rows (like ID Card)
  "basePrice": {
    "A6": {
      "30": {
        "1": { customerPrice: 2, agentPrice: 1.6 },
        "2": { customerPrice: 2.2, agentPrice: 1.76 }
      },
      "50": {
        "1": { customerPrice: 1.5, agentPrice: 1.2 },
        "2": { customerPrice: 1.8, agentPrice: 1.44 }
      },
      "100": {
        "1": { customerPrice: 1, agentPrice: 0.8 },
        "2": { customerPrice: 1.1, agentPrice: 0.88 }
      },
      "200": {
        "1": { customerPrice: 0.6, agentPrice: 0.48 },
        "2": { customerPrice: 0.7, agentPrice: 0.56 }
      },
      "500": {
        "1": { customerPrice: 0.55, agentPrice: 0.44 },
        "2": { customerPrice: 0.65, agentPrice: 0.52 }
      },
      "1000": {
        "1": { customerPrice: 0.45, agentPrice: 0.36 },
        "2": { customerPrice: 0.55, agentPrice: 0.44 }
      }
    },
    "DL": {
      "30": {
        "1": { customerPrice: 2.2, agentPrice: 1.76 },
        "2": { customerPrice: 2.6, agentPrice: 2.08 }
      },
      "50": {
        "1": { customerPrice: 1.9, agentPrice: 1.52 },
        "2": { customerPrice: 2.3, agentPrice: 1.84 }
      },
      "100": {
        "1": { customerPrice: 1.5, agentPrice: 1.2 },
        "2": { customerPrice: 1.55, agentPrice: 1.24 }
      },
      "200": {
        "1": { customerPrice: 0.85, agentPrice: 0.68 },
        "2": { customerPrice: 0.9, agentPrice: 0.72 }
      },
      "500": {
        "1": { customerPrice: 0.7, agentPrice: 0.56 },
        "2": { customerPrice: 0.8, agentPrice: 0.64 }
      },
      "1000": {
        "1": { customerPrice: 0.55, agentPrice: 0.44 },
        "2": { customerPrice: 0.7, agentPrice: 0.56 }
      }
    },
    "A5": {
      "30": {
        "1": { customerPrice: 2.3, agentPrice: 1.84 },
        "2": { customerPrice: 3, agentPrice: 2.4 }
      },
      "50": {
        "1": { customerPrice: 1.8, agentPrice: 1.44 },
        "2": { customerPrice: 2, agentPrice: 1.6 }
      },
      "100": {
        "1": { customerPrice: 1.45, agentPrice: 1.16 },
        "2": { customerPrice: 1.6, agentPrice: 1.28 }
      },
      "200": {
        "1": { customerPrice: 0.7, agentPrice: 0.56 },
        "2": { customerPrice: 0.8, agentPrice: 0.64 }
      },
      "500": {
        "1": { customerPrice: 0.65, agentPrice: 0.52 },
        "2": { customerPrice: 0.75, agentPrice: 0.6 }
      },
      "1000": {
        "1": { customerPrice: 0.5, agentPrice: 0.4 },
        "2": { customerPrice: 0.65, agentPrice: 0.52 }
      }
    },
    "A4": {
      "30": {
        "1": { customerPrice: 2.5, agentPrice: 2.0 },
        "2": { customerPrice: 4, agentPrice: 3.2 }
      },
      "50": {
        "1": { customerPrice: 2, agentPrice: 1.6 },
        "2": { customerPrice: 2.4, agentPrice: 1.92 }
      },
      "100": {
        "1": { customerPrice: 1.6, agentPrice: 1.28 },
        "2": { customerPrice: 1.8, agentPrice: 1.44 }
      },
      "200": {
        "1": { customerPrice: 1, agentPrice: 0.8 },
        "2": { customerPrice: 1.2, agentPrice: 0.96 }
      },
      "500": {
        "1": { customerPrice: 0.8, agentPrice: 0.64 },
        "2": { customerPrice: 1, agentPrice: 0.8 }
      },
      "1000": {
        "1": { customerPrice: 0.7, agentPrice: 0.56 },
        "2": { customerPrice: 0.9, agentPrice: 0.72 }
      }
    },
    "A3": {
      "30": {
        "1": { customerPrice: 3, agentPrice: 2.4 },
        "2": { customerPrice: 6, agentPrice: 4.8 }
      },
      "50": {
        "1": { customerPrice: 2.9, agentPrice: 2.32 },
        "2": { customerPrice: 3.6, agentPrice: 2.88 }
      },
      "100": {
        "1": { customerPrice: 2.4, agentPrice: 1.92 },
        "2": { customerPrice: 3, agentPrice: 2.4 }
      },
      "200": {
        "1": { customerPrice: 2, agentPrice: 1.6 },
        "2": { customerPrice: 2.6, agentPrice: 2.08 }
      },
      "500": {
        "1": { customerPrice: 1.6, agentPrice: 1.28 },
        "2": { customerPrice: 2, agentPrice: 1.6 }
      },
      "1000": {
        "1": { customerPrice: 1.2, agentPrice: 0.96 },
        "2": { customerPrice: 1.6, agentPrice: 1.28 }
      }
    }
  },
  "addons": [
    {
      "name": "Lamination",
      "options": [
        {
          "name": "None",
          "prices": {
            "A6": { customerPrice: 0, agentPrice: 0 },
            "DL": { customerPrice: 0, agentPrice: 0 },
            "A5": { customerPrice: 0, agentPrice: 0 },
            "A4": { customerPrice: 0, agentPrice: 0 },
            "A3": { customerPrice: 0, agentPrice: 0 }
          }
        },
        {
          "name": "Matte",
          "prices": {
            "A6": { customerPrice: 0.2, agentPrice: 0.16 },
            "DL": { customerPrice: 0.25, agentPrice: 0.2 },
            "A5": { customerPrice: 0.3, agentPrice: 0.24 },
            "A4": { customerPrice: 0.5, agentPrice: 0.4 },
            "A3": { customerPrice: 1, agentPrice: 0.8 }
          }
        },
        {
          "name": "Glossy",
          "prices": {
            "A6": { customerPrice: 0.3, agentPrice: 0.24 },
            "DL": { customerPrice: 0.35, agentPrice: 0.28 },
            "A5": { customerPrice: 0.4, agentPrice: 0.32 },
            "A4": { customerPrice: 0.6, agentPrice: 0.48 },
            "A3": { customerPrice: 1.2, agentPrice: 0.96 }
          }
        }
      ]
    }
  ],
  "quantities": [
    30,
    50,
    100,
    200,
    500,
    1000
  ],
  "materials": [
    { "name": "Simili 80gsm", "addOn": {
      "A6": { customerPrice: 0, agentPrice: 0 }, "DL": { customerPrice: 0, agentPrice: 0 },
      "A5": { customerPrice: 0, agentPrice: 0 }, "A4": { customerPrice: 0, agentPrice: 0 },
      "A3": { customerPrice: 0, agentPrice: 0 }
    }},
    { "name": "Simili 100gsm", "addOn": {
      "A6": { customerPrice: 0.05, agentPrice: 0.04 }, "DL": { customerPrice: 0.05, agentPrice: 0.04 },
      "A5": { customerPrice: 0.05, agentPrice: 0.04 }, "A4": { customerPrice: 0.1, agentPrice: 0.08 },
      "A3": { customerPrice: 0.1, agentPrice: 0.08 }
    }},
    { "name": "Simili 140gsm", "addOn": {
      "A6": { customerPrice: 0.05, agentPrice: 0.04 }, "DL": { customerPrice: 0.05, agentPrice: 0.04 },
      "A5": { customerPrice: 0.1, agentPrice: 0.08 }, "A4": { customerPrice: 0.1, agentPrice: 0.08 },
      "A3": { customerPrice: 0.2, agentPrice: 0.16 }
    }},
    { "name": "Art Paper 105gsm", "addOn": {
      "A6": { customerPrice: 0.05, agentPrice: 0.04 }, "DL": { customerPrice: 0.05, agentPrice: 0.04 },
      "A5": { customerPrice: 0.05, agentPrice: 0.04 }, "A4": { customerPrice: 0.1, agentPrice: 0.08 },
      "A3": { customerPrice: 0.1, agentPrice: 0.08 }
    }},
    { "name": "Art Paper 128gsm", "addOn": {
      "A6": { customerPrice: 0.05, agentPrice: 0.04 }, "DL": { customerPrice: 0.05, agentPrice: 0.04 },
      "A5": { customerPrice: 0.05, agentPrice: 0.04 }, "A4": { customerPrice: 0.1, agentPrice: 0.08 },
      "A3": { customerPrice: 0.2, agentPrice: 0.16 }
    }},
    { "name": "Art Paper 157gsm", "addOn": {
      "A6": { customerPrice: 0.1, agentPrice: 0.08 }, "DL": { customerPrice: 0.1, agentPrice: 0.08 },
      "A5": { customerPrice: 0.1, agentPrice: 0.08 }, "A4": { customerPrice: 0.15, agentPrice: 0.12 },
      "A3": { customerPrice: 0.3, agentPrice: 0.24 }
    }},
    { "name": "Art Card 260gsm", "addOn": {
      "A6": { customerPrice: 0.15, agentPrice: 0.12 }, "DL": { customerPrice: 0.2, agentPrice: 0.16 },
      "A5": { customerPrice: 0.2, agentPrice: 0.16 }, "A4": { customerPrice: 0.4, agentPrice: 0.32 },
      "A3": { customerPrice: 0.75, agentPrice: 0.6 }
    }},
    { "name": "Art Card 300gsm", "addOn": {
      "A6": { customerPrice: 0.2, agentPrice: 0.16 }, "DL": { customerPrice: 0.25, agentPrice: 0.2 },
      "A5": { customerPrice: 0.3, agentPrice: 0.24 }, "A4": { customerPrice: 0.5, agentPrice: 0.4 },
      "A3": { customerPrice: 1, agentPrice: 0.8 }
    }},
    { "name": "Ivory Card 230gsm", "addOn": {
      "A6": { customerPrice: 0.2, agentPrice: 0.16 }, "DL": { customerPrice: 0.25, agentPrice: 0.2 },
      "A5": { customerPrice: 0.3, agentPrice: 0.24 }, "A4": { customerPrice: 0.55, agentPrice: 0.44 },
      "A3": { customerPrice: 1.1, agentPrice: 0.88 }
    }},
    { "name": "Ivory Card 300gsm", "addOn": {
      "A6": { customerPrice: 0.25, agentPrice: 0.2 }, "DL": { customerPrice: 0.3, agentPrice: 0.24 },
      "A5": { customerPrice: 0.4, agentPrice: 0.32 }, "A4": { customerPrice: 0.7, agentPrice: 0.56 },
      "A3": { customerPrice: 1.4, agentPrice: 1.12 }
    }},
    { "name": "Taiga Card 320gsm", "addOn": {
      "A6": { customerPrice: 0.4, agentPrice: 0.32 }, "DL": { customerPrice: 0.5, agentPrice: 0.4 },
      "A5": { customerPrice: 0.65, agentPrice: 0.52 }, "A4": { customerPrice: 1.25, agentPrice: 1.0 },
      "A3": { customerPrice: 2.45, agentPrice: 1.96 }
    }},
    { "name": "Laid Paper 100gsm", "addOn": {
      "A6": { customerPrice: 0.15, agentPrice: 0.12 }, "DL": { customerPrice: 0.15, agentPrice: 0.12 },
      "A5": { customerPrice: 0.2, agentPrice: 0.16 }, "A4": { customerPrice: 0.35, agentPrice: 0.28 },
      "A3": { customerPrice: 0.7, agentPrice: 0.56 }
    }},
    { "name": "Laid Card 230gsm", "addOn": {
      "A6": { customerPrice: 0.55, agentPrice: 0.44 }, "DL": { customerPrice: 0.6, agentPrice: 0.48 },
      "A5": { customerPrice: 0.8, agentPrice: 0.64 }, "A4": { customerPrice: 1.6, agentPrice: 1.28 },
      "A3": { customerPrice: 3.15, agentPrice: 2.52 }
    }},
    { "name": "Linen Card 250gsm", "addOn": {
      "A6": { customerPrice: 0.4, agentPrice: 0.32 }, "DL": { customerPrice: 0.5, agentPrice: 0.4 },
      "A5": { customerPrice: 0.6, agentPrice: 0.48 }, "A4": { customerPrice: 1.2, agentPrice: 0.96 },
      "A3": { customerPrice: 2.4, agentPrice: 1.92 }
    }},
    { "name": "King Pearl Card 250gsm", "addOn": {
      "A6": { customerPrice: 0.4, agentPrice: 0.32 }, "DL": { customerPrice: 0.5, agentPrice: 0.4 },
      "A5": { customerPrice: 0.6, agentPrice: 0.48 }, "A4": { customerPrice: 1.2, agentPrice: 0.96 },
      "A3": { customerPrice: 2.4, agentPrice: 1.92 }
    }},
    { "name": "King Pearl Card 300gsm", "addOn": {
      "A6": { customerPrice: 0.45, agentPrice: 0.36 }, "DL": { customerPrice: 0.55, agentPrice: 0.44 },
      "A5": { customerPrice: 0.65, agentPrice: 0.52 }, "A4": { customerPrice: 1.3, agentPrice: 1.04 },
      "A3": { customerPrice: 2.6, agentPrice: 2.08 }
    }},
    { "name": "Synthetic Paper 130mic", "addOn": {
      "A6": { customerPrice: 0.15, agentPrice: 0.12 }, "DL": { customerPrice: 0.2, agentPrice: 0.16 },
      "A5": { customerPrice: 2, agentPrice: 1.6 }, "A4": { customerPrice: 4, agentPrice: 3.2 },
      "A3": { customerPrice: 8, agentPrice: 6.4 }
    }},
    { "name": "Synthetic Paper 210mic", "addOn": {
      "A6": { customerPrice: 2, agentPrice: 1.6 }, "DL": { customerPrice: 2.3, agentPrice: 1.84 },
      "A5": { customerPrice: 3, agentPrice: 2.4 }, "A4": { customerPrice: 6, agentPrice: 4.8 },
      "A3": { customerPrice: 12, agentPrice: 9.6 }
    }},
    { "name": "Kraft Paper 120gsm", "addOn": {
      "A6": { customerPrice: 0.15, agentPrice: 0.12 }, "DL": { customerPrice: 0.15, agentPrice: 0.12 },
      "A5": { customerPrice: 0.3, agentPrice: 0.24 }, "A4": { customerPrice: 0.4, agentPrice: 0.32 },
      "A3": { customerPrice: 0.7, agentPrice: 0.56 }
    }},
    { "name": "Kraft Paper 250gsm", "addOn": {
      "A6": { customerPrice: 0.3, agentPrice: 0.24 }, "DL": { customerPrice: 0.3, agentPrice: 0.24 },
      "A5": { customerPrice: 0.4, agentPrice: 0.32 }, "A4": { customerPrice: 0.8, agentPrice: 0.64 },
      "A3": { customerPrice: 1.6, agentPrice: 1.28 }
    }},
    { "name": "Kraft Paper 300gsm", "addOn": {
      "A6": { customerPrice: 0.3, agentPrice: 0.24 }, "DL": { customerPrice: 0.35, agentPrice: 0.28 },
      "A5": { customerPrice: 0.5, agentPrice: 0.4 }, "A4": { customerPrice: 0.9, agentPrice: 0.72 },
      "A3": { customerPrice: 1.8, agentPrice: 1.44 }
    }}
  ],
  "sizes": [
    "A6",
    "DL",
    "A5",
    "A4",
    "A3"
  ]
};;
// === ID CARD: Explicit Dual Pricing with Print Sides ===
// Hardcoded data contains basePrice (by side & qty) and punchHolePrice, with explicit {customerPrice, agentPrice}
// globalAgentMode flag selects which price to use
var idCardData = {
  "basePrice": {
    "1": { // 1-SIDED printing
      "1": { customerPrice: 25.0, agentPrice: 20.0 },
      "2": { customerPrice: 20.0, agentPrice: 16.0 },
      "3": { customerPrice: 18.0, agentPrice: 15.0 },
      "4": { customerPrice: 16.0, agentPrice: 14.0 },
      "5": { customerPrice: 14.0, agentPrice: 12.0 },
      "10": { customerPrice: 12.0, agentPrice: 10.0 },
      "20": { customerPrice: 10.0, agentPrice: 9.0 },
      "30": { customerPrice: 9.0, agentPrice: 8.0 },
      "50": { customerPrice: 7.0, agentPrice: 6.0 }
    },
    "2": { // 2-SIDED printing
      "1": { customerPrice: 27.0, agentPrice: 21.6 },
      "2": { customerPrice: 22.0, agentPrice: 17.6 },
      "3": { customerPrice: 20.0, agentPrice: 16.0 },
      "4": { customerPrice: 18.0, agentPrice: 14.4 },
      "5": { customerPrice: 16.0, agentPrice: 12.8 },
      "10": { customerPrice: 14.0, agentPrice: 11.2 },
      "20": { customerPrice: 12.0, agentPrice: 9.6 },
      "30": { customerPrice: 11.0, agentPrice: 8.8 },
      "50": { customerPrice: 9.0, agentPrice: 7.2 }
    }
  },
  "punchHolePrice": {
    "none": { customerPrice: 0, agentPrice: 0 },
    "yes": { customerPrice: 1.0, agentPrice: 0.8 }
  },
  "quantities": [1, 2, 3, 4, 5, 10, 20, 30, 50],
  "sides": ["1", "2"]
};

// For backward compatibility
var idCardRates = idCardData;

// ID Card add-ons (includes Punch Hole by default)
var idCardAddons = [];
let globalPunchHolePrice = 1.00;

function ensureIDCardDefaultAddons() {
  window.appModules?.idCard?.ensureIDCardDefaultAddons?.(createIDCardContext());
}

function syncIDCardLegacyPunchHolePriceFromAddons() {
  window.appModules?.idCard?.ensureIDCardDefaultAddons?.(createIDCardContext());
}

ensureIDCardDefaultAddons();
var businessCardData = {
  "quantities": [
    { "label": "2 Box", "qty": 2 },
    { "label": "5 Boxes", "qty": 5 },
    { "label": "10 Boxes", "qty": 10 }
  ],
  "materials": [
    {
      "name": "Art Card 260gsm",
      "prices": {
        "customerPrice": { "p1": [20, 19.8, 18.5], "p2": [22, 21.8, 21.5] },
        "agentPrice": { "p1": [18, 17.5, 17], "p2": [20, 19.5, 19] }
      }
    },
    {
      "name": "Art Card 300gsm",
      "prices": {
        "customerPrice": { "p1": [23, 22.8, 21.5], "p2": [25, 24.8, 24.5] },
        "agentPrice": { "p1": [21, 20.8, 19.5], "p2": [23, 22.8, 22.5] }
      }
    },
    {
      "name": "Ivory Card 230gsm",
      "prices": {
        "customerPrice": { "p1": [26, 25.8, 24.5], "p2": [28, 27.8, 27.5] },
        "agentPrice": { "p1": [24, 23.8, 22.5], "p2": [26, 25.8, 25.5] }
      }
    },
    {
      "name": "King Pearl Card 250gsm",
      "prices": {
        "customerPrice": { "p1": [40, 38, 37], "p2": [42, 40, 39] },
        "agentPrice": { "p1": [38, 36, 35], "p2": [40, 38, 37] }
      }
    },
    {
      "name": "Linen Card 250gsm",
      "prices": {
        "customerPrice": { "p1": [40, 38, 37], "p2": [42, 40, 39] },
        "agentPrice": { "p1": [38, 36, 35], "p2": [40, 38, 37] }
      }
    },
    {
      "name": "Laid Card 250gsm",
      "prices": {
        "customerPrice": { "p1": [40, 38, 37], "p2": [42, 40, 39] },
        "agentPrice": { "p1": [38, 36, 35], "p2": [40, 38, 37] }
      }
    }
  ],
  "addons": [
    {
      "name": "Finishing",
      "options": [
        { "name": "None", "value": "none", "customerPrice": 0, "agentPrice": 0 },
        { "name": "Matte Lamination", "value": "matte", "customerPrice": 14, "agentPrice": 12 },
        { "name": "Gloss Lamination", "value": "gloss", "customerPrice": 19, "agentPrice": 17}
      ]
    },
    {
      "name": "Round Corner",
      "options": [
        { "name": "None", "value": "none", "customerPrice": 0, "agentPrice": 0 },
        { "name": "All 4 Corners", "value": "all", "customerPrice": 5, "agentPrice": 4 }
      ]
    },
    {
      "name": "Spot UV",
      "options": [
        { "name": "None", "value": "none", "customerPrice": 0, "agentPrice": 0 },
        { "name": "1 Side", "value": "1", "customerPrice": 40, "agentPrice": 35},
        { "name": "2 Sides", "value": "2", "customerPrice": 60, "agentPrice": 55}
      ]
    }
  ],
  "printSides": [
    {
      "label": "1 Side",
      "value": 1
    },
    {
      "label": "2 Sides",
      "value": 2
    }
  ]
};
var globalEyeletPrice = 0.50,
  globalGluePrice = 1.00,
  globalPipePrice = 3.00,
  globalGovSurchargePercent = 40,
  selectedMaterialIndex = null,
  pricePerSqFt = 0,
  isStickerOrPolysilk = false,
  currentInputUnit = 'ft',
  currentCategory = "largeFormat",
  editingIndex = -1,
  selectedSublimationQty = 10,
  selectedIdCardQty = 10,
  selectedInvCardMaterial = 0,
  selectedBc = {
    qty: 2,
    material: 0,
    printSide: 2,
    selectedAddons: businessCardData.addons.map(() => 0)
  };
let selectedMugIndex = 0;
let currentGiftTab = 'mug';
let currentDTFTab = 'dtf';
let currentDTFUnit = 'cm';
let uploadedArtworkImg = null;
let artConfig = {
  width: 0, // In Feet
  height: 0, // In Feet
  rotation: 0,
  isLocked: true,
  ratio: 1,
  showTools: false
};
let lastUsedWidth = 3;
let lastUsedHeight = 2;
let lastUsedUnit = 'ft';
let globalAgentMode = false;
let isRatioLocked = false;
let currentAspectRatio = 1;
// State for invitation card settings edit mode
var invitationCardEditState = {
  base: false,
  material: false,
  addons: [] // will be populated with boolean flags
};
var originalInvitationCardData = {};
var businessCardEditState = {
  materials: false,
  addons: [] // will be populated with boolean flags
};
var originalBusinessCardData = {};
var lanyardEditState = {
  base: false,
  sizes: false,
  sides: false,
  hooks: false,
  extras: false
};
var originalLanyardData = {};
var idCardEditState = {
  base: false,
  materials: false,
  accessories: false,
  addons: []
};
var sublimationEditState = { // NEW
  base: false,
  extraSize: false,
  addons: [],
  addonsRulesOpen: []
};
var originalSublimationData = {}; // NEW
var lanyardData = {
  "quantities": [
    20,
    50,
    100,
    200,
    500,
    1000
  ],
  "sizes": [
    {
      "label": "20mm",
      "prices": {
        "customerPrice": {
          "p1": [15, 14, 13, 12, 10, 9],
          "p2": [16, 15, 14, 13, 11, 10]
        },
        "agentPrice": {
          "p1": [15, 14, 13, 12, 10, 9],
          "p2": [16, 15, 14, 13, 11, 10]
        }
      }
    },
    {
      "label": "25mm",
      "prices": {
        "customerPrice": {
          "p1": [17, 16, 15, 14, 12, 11],
          "p2": [18, 17, 16, 15, 13, 12]
        },
        "agentPrice": {
          "p1": [17, 16, 15, 14, 12, 11],
          "p2": [18, 17, 16, 15, 13, 12]
        }
      }
    }
  ],
  "addons": [
    {
      "name": "Lanyard Type",
      "type": "radio",
      "options": [
        {
          "name": "Body Lanyard",
          "customerPrice": 0,
          "agentPrice": 0,
          "assetId": "asset_lanyard_body"
        },
        {
          "name": "Keychain Lanyard",
          "customerPrice": -3,
          "agentPrice": -3,
          "assetId": "asset_lanyard_keychain"
        }
      ]
    },
    {
      "name": "Hook Type",
      "type": "radio",
      "options": [
        {
          "name": "Oval Hook",
          "customerPrice": 0,
          "agentPrice": 0,
          "assetId": "asset_lanyard_oval_hook"
        }
      ]
    },
    {
      "name": "Extra",
      "type": "checkbox",
      "options": [
        {
          "name": "Buckle",
          "customerPrice": 3,
          "agentPrice": 3,
          "assetId": "asset_lanyard_buckle"
        },
        {
          "name": "Safety Clip",
          "customerPrice": 3,
          "agentPrice": 3,
          "assetId": "asset_lanyard_safety"
        }
      ]
    }
  ]
};
var sublimationData = {
  basePrices: [
    { label: "10",   qty: 10,  customerPrice: 45.00, agentPrice: 43.00 },
    { label: "30",   qty: 30,  customerPrice: 43.00, agentPrice: 41.00 },
    { label: "50",   qty: 50,  customerPrice: 40.00, agentPrice: 38.00 },
    { label: "70",   qty: 70,  customerPrice: 37.00, agentPrice: 35.00 },
    { label: "100",  qty: 100, customerPrice: 35.00, agentPrice: 33.00 },
    { label: "500+", qty: 500, customerPrice: 29.00, agentPrice: 27.00 }
  ],
  extraSizeCost: {
    "XS-2XL": { customerPrice: 0,  agentPrice: 0  },
    "3XL": { customerPrice: 5,  agentPrice: 4  },
    "4XL": { customerPrice: 6,  agentPrice: 5  },
    "5XL": { customerPrice: 7,  agentPrice: 6  },
    "6XL": { customerPrice: 8,  agentPrice: 7  },
    "7XL": { customerPrice: 10, agentPrice: 9  },
    "8XL": { customerPrice: 12, agentPrice: 11 }
  },
  addons: [
    {
      name: "Neck",
      type: "radio",
      options: [
        { name: "Round Neck",       customerPrice: 0,  agentPrice: 0,  assetId: "asset_round_neck" },
        { name: "V-Neck",           customerPrice: 4,  agentPrice: 4,  assetId: "asset_v_neck" },
        { name: "Collar Button",    customerPrice: 5,  agentPrice: 5,  assetId: "asset_collar_button" },
        { name: "Retro Collar",     customerPrice: 5,  agentPrice: 5,  assetId: "asset_v_neck_cross" },
        { name: "Mock Neck Zipper", customerPrice: 8,  agentPrice: 8,  assetId: "asset_v_neck_cross" }
      ]
    },
    {
      name: "Sleeve",
      type: "radio",
      options: [
        { name: "Short Sleeve", customerPrice: 0,  agentPrice: 0,  assetId: "asset_v_neck_cross" },
        { name: "Long Sleeve",  customerPrice: 4,  agentPrice: 4,  assetId: "asset_v_neck_cross" },
        { name: "Sleeveless",   customerPrice: -1, agentPrice: -1, assetId: "asset_v_neck_cross" }
      ]
    },
    {
      name: "Body",
      type: "radio",
      options: [
        { name: "Unisex",          customerPrice: 0,  agentPrice: 0,  assetId: "asset_v_neck_cross" },
        { name: "Unisex Kid Size", customerPrice: -2, agentPrice: -2, assetId: "asset_v_neck_cross" },
        { name: "Muslimah",        customerPrice: 9,  agentPrice: 9,  assetId: "asset_v_neck_cross" },
        { name: "Oversize",        customerPrice: 5,  agentPrice: 5,  assetId: "asset_v_neck_cross" }
      ]
    },
    {
      name: "Extra",
      type: "checkbox",
      options: [
        { name: "Name Custom",     customerPrice: 3, agentPrice: 3, assetId: "asset_v_neck_cross" },
        { name: "Number Custom",   customerPrice: 3, agentPrice: 3, assetId: "asset_v_neck_cross" },
        { name: "Name Set Custom", customerPrice: 5, agentPrice: 5, assetId: "asset_v_neck_cross" }
      ]
    }
  ]
};

function getSublimationOptionCost(option, useAgent = false) {
  return window.appModules?.sublimation?.getSublimationOptionCost?.(option, useAgent) ?? 0;
}

function normalizeSublimationAddons(targetData) {
  window.appModules?.sublimation?.normalizeSublimationAddons?.(targetData);
}

function getSublimationSizeCost(sizeKey, data, useAgent = false) {
  return window.appModules?.sublimation?.getSublimationSizeCost?.(sizeKey, data, useAgent) ?? 0;
}

let lastClickedASize = null;
// ============================================
// NEW FUNCTION - ADD THIS HERE
// ============================================
/**
 * Toggles the aspect ratio lock for the calculator.
 */
function toggleRatioLock() {
  window.appModules?.printShell?.toggleRatioLock?.(createPrintShellContext());
}
/**
 * Handles input from width/height fields to maintain aspect ratio if locked.
 */
function handleDimensionInput(changedField) {
  window.appModules?.printShell?.handleDimensionInput?.(changedField, createPrintShellContext());
}
/**
 * Validates and constrains numeric input to a specific range
 * @param {HTMLInputElement} input - The input element to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} The validated value
 */
function validateNumericInput(input, min = 0, max = Infinity) {
  let value = parseFloat(input.value);
  if (isNaN(value) || value < min) {
    input.value = min;
    value = min;
  } else if (value > max) {
    input.value = max;
    value = max;
  }
  return value;
}
// --- START: NEW KIOSK MODE JAVASCRIPT ---
let isKioskMode = false; // This will hold the current state
/**
 * Applies or removes the Kiosk Mode class from the <body>
 */
function applyKioskModeStyling() {
  if (isKioskMode) {
    document.body.classList.add('kiosk-mode-active');
  } else {
    document.body.classList.remove('kiosk-mode-active');
  }
}

function applyKioskModeStyling() {
  if (isKioskMode) {
    document.body.classList.add('kiosk-mode-active');
  } else {
    document.body.classList.remove('kiosk-mode-active');
  }
}
/**
 * Loads the Kiosk Mode setting from localStorage on startup
 */
function initializeKioskMode() {
  isKioskMode = localStorage.getItem('isKioskMode') === 'true';
  applyKioskModeStyling(); // Apply the style on first page load
}
// --- END: NEW KIOSK MODE JAVASCRIPT ---
function renderGlueExceptionTable() {
  const container = document.getElementById('glueExceptionTableContainer');
  if (!container) return;
  let tableHTML = `<table class="settings-table"><thead><tr><th>Width (ft)</th><th>Height (ft)</th><th>Action</th></tr></thead><tbody>`;
  if (glueExceptionSizes.length === 0) {
    tableHTML += `<tr><td colspan="3" class="text-center text-gray-500">No exception sizes defined.</td></tr>`;
  } else {
    glueExceptionSizes.forEach((size, index) => {
      tableHTML += `<tr><td class="text-center">${size[0]}</td><td class="text-center">${size[1]}</td><td class="text-center"><button class="btn btn-sm btn-danger" onclick="deleteGlueExceptionSize(${index})">Delete</button></td></tr>`;
    });
  }
  tableHTML += `</tbody></table>`;
  container.innerHTML = tableHTML;
}

function addGlueExceptionSize() {
  const wInput = document.getElementById('glueExceptionW');
  const hInput = document.getElementById('glueExceptionH');
  const w = parseFloat(wInput.value);
  const h = parseFloat(hInput.value);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    alert("Please enter a valid width and height.");
    return;
  }
  glueExceptionSizes.push([w, h]);
  localStorage.setItem('glueExceptionSizes', JSON.stringify(glueExceptionSizes));
  renderGlueExceptionTable(); // Refresh the table
  // Add these lines to resize the accordion
  const content = document.getElementById('glue-exception-content');
  if (content && !content.classList.contains('hidden')) {
    content.style.maxHeight = content.scrollHeight + 'px';
  }
  wInput.value = '';
  hInput.value = '';
}

function deleteGlueExceptionSize(index) {
  if (confirm("Are you sure you want to delete this exception size?")) {
    glueExceptionSizes.splice(index, 1);
    localStorage.setItem('glueExceptionSizes', JSON.stringify(glueExceptionSizes));
    renderGlueExceptionTable(); // Refresh the table
  }
}

function renderEyeletExceptionTable() {
  const container = document.getElementById('eyeletExceptionTableContainer');
  if (!container) return;
  let tableHTML = `<table class="settings-table"><thead><tr><th>Width (ft)</th><th>Height (ft)</th><th>Action</th></tr></thead><tbody>`;
  if (eyeletExceptionSizes.length === 0) {
    tableHTML += `<tr><td colspan="3" class="text-center text-gray-500">No exception sizes defined.</td></tr>`;
  } else {
    eyeletExceptionSizes.forEach((size, index) => {
      tableHTML += `<tr><td class="text-center">${size[0]}</td><td class="text-center">${size[1]}</td><td class="text-center"><button class="btn btn-sm btn-danger" onclick="deleteEyeletExceptionSize(${index})">Delete</button></td></tr>`;
    });
  }
  tableHTML += `</tbody></table>`;
  container.innerHTML = tableHTML;
}

function addEyeletExceptionSize() {
  const wInput = document.getElementById('eyeletExceptionW');
  const hInput = document.getElementById('eyeletExceptionH');
  const w = parseFloat(wInput.value);
  const h = parseFloat(hInput.value);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
    alert("Please enter a valid width and height.");
    return;
  }
  eyeletExceptionSizes.push([w, h]);
  localStorage.setItem('eyeletExceptionSizes', JSON.stringify(eyeletExceptionSizes));
  renderEyeletExceptionTable();
  // Add these lines to resize the accordion
  const content = document.getElementById('eyelet-exception-content');
  if (content && !content.classList.contains('hidden')) {
    content.style.maxHeight = content.scrollHeight + 'px';
  }
  wInput.value = '';
  hInput.value = '';
}

function deleteEyeletExceptionSize(index) {
  if (confirm("Are you sure you want to delete this exception size?")) {
    eyeletExceptionSizes.splice(index, 1);
    localStorage.setItem('eyeletExceptionSizes', JSON.stringify(eyeletExceptionSizes));
    renderEyeletExceptionTable();
  }
}

function convertToFeetCalc(value, unit) {
  switch (unit) {
    case "mm":
      return value * 0.00328084;
    case "cm":
      return value * 0.0328084;
    case "in":
      return value / 12.0;
    case "m":
      return value * 3.28084;
    default:
      return value;
  }
}

function convertFromMm(valueMm, unit) {
  switch (unit) {
    case 'mm':
      return valueMm;
    case 'cm':
      return valueMm / 10;
    case 'in':
      return valueMm / 25.4;
    case 'm':
      return valueMm / 1000;
    case 'ft':
      return valueMm * 0.00328084;
    default:
      return valueMm;
  }
}

function convertToMm(val, unit) {
  switch (unit) {
    case 'mm':
      return val;
    case 'cm':
      return val * 10;
    case 'in':
      return val * 25.4;
    case 'm':
      return val * 1000;
    case 'ft':
      return val / 0.00328084;
    default:
      return val;
  }
}

function isGamExemptedSize(w, h) {
  if (!glueExceptionSizes || glueExceptionSizes.length === 0) {
    return false;
  }
  return glueExceptionSizes.some(([exceptW, exceptH]) =>
    (w <= exceptW && h <= exceptH) || (w <= exceptH && h <= exceptW)
  );
}

function autoEyelet(w, h) {
  if (isExceptionSize(w, h)) return 4;
  var topCount = Math.round(w / 2);
  var bottomCount = Math.round(w / 3);
  var sideEach = (h > 2.5 && h <= 3) ? 1 : (h > 3 && h <= 4) ? 2 : (h > 4) ? 2 : 0;
  var interiorTop = topCount > 0 ? topCount - 1 : 0;
  var interiorBottom = bottomCount > 0 ? bottomCount - 1 : 0;
  return interiorTop + interiorBottom + (sideEach * 2) + 4;
}

function copyInvoiceText() {
  const textArea = document.getElementById('invoiceText');
  if (!textArea) return;

  // --- FIXED: Just copy the textarea content directly.
  // The calculator functions now handle adding the Title inside the text.
  textArea.select();
  navigator.clipboard.writeText(textArea.value).then(() => {
    showToast('âœ“ Invoice copied!');
  }).catch(err => {
    console.error('Failed to copy text: ', err);
  });
}

function copyBusinessCardInvoiceText() {
  window.appModules?.businessCard?.copyBusinessCardInvoiceText?.(createBusinessCardModuleContext());
}

function getBusinessCardPriceTier(customQty) {
  return window.appModules?.businessCard?.getBusinessCardPriceTier?.(createBusinessCardModuleContext(), customQty);
}

function handleBcCustomQtyChange() {
  window.appModules?.businessCard?.handleBcCustomQtyChange?.(createBusinessCardModuleContext());
}

function kiraBusinessCard() {
  window.appModules?.businessCard?.kiraBusinessCard?.(createBusinessCardModuleContext());
}

function copyInvitationCardInvoiceText() {
  window.appModules?.invitationCard?.copyInvitationCardInvoiceText?.(createInvitationCardModuleContext());
}

function copySublimationInvoiceText() {
  window.appModules?.sublimation?.copySublimationInvoiceText?.(createSublimationContext());
}

function renderStampPage(container) {
  window.appModules?.stamp?.renderStampPage?.(container, createStampContext());
}

function renderStampPriceList(forceAgent = null, includeDownload = true, containerId = 'stamp-price-list-container', showHeader = true) {
  return window.appModules?.stamp?.renderStampPriceList?.(forceAgent, includeDownload, containerId, showHeader, createStampContext()) ?? '';
}

function openStampCompareModal() {
  window.appModules?.stamp?.openStampCompareModal?.(createStampContext());
}

function closeStampCompareModal() {
  window.appModules?.stamp?.closeStampCompareModal?.();
}

function selectStamp(index) {
  window.appModules?.stamp?.selectStamp?.(index, createStampContext());
}

function setStampInk(index) {
  window.appModules?.stamp?.setStampInk?.(index, createStampContext());
}

function changeStampQty(delta) {
  window.appModules?.stamp?.changeStampQty?.(delta, createStampContext());
}

function calculateStampPrice() {
  window.appModules?.stamp?.calculateStampPrice?.(createStampContext());
}

function renderStampPreview() {
  window.appModules?.stamp?.renderStampPreview?.(createStampContext());
}

function addStampToPad() {
  window.appModules?.stamp?.addStampToPad?.(createStampContext());
}

function copyStampInvoice() {
  window.appModules?.stamp?.copyStampInvoice?.();
}


function filterMaterials(type) {
  const input = document.getElementById('materialSearch');
  const filter = input.value.toUpperCase();
  const grid = document.getElementById(`material-grid-${type}`);
  const cards = grid.getElementsByClassName('material-card');
  for (let i = 0; i < cards.length; i++) {
    const title = cards[i].getElementsByTagName("strong")[0];
    if (title.innerText.toUpperCase().indexOf(filter) > -1) {
      cards[i].style.display = "";
    } else {
      cards[i].style.display = "none";
    }
  }
}

function clearSearch(category) {
  const searchInput = document.getElementById('materialSearch');
  if (searchInput) {
    // 1. Clear the text in the input field
    searchInput.value = '';
    // 2. Re-run the filter to show all materials
    filterMaterials(category);
    // 3. Set focus back to the search bar for convenience
    searchInput.focus();
  }
}

function downloadElementAsJPG(event, containerId, filename) {
  const container = document.getElementById(containerId);
  const downloadButton = event.currentTarget; // Get the button that was clicked
  if (!container) {
    console.error(`Error: Container with ID '${containerId}' not found.`);
    return;
  }
  // Temporarily disable the button to prevent multiple clicks
  const originalButtonText = downloadButton.innerHTML;
  downloadButton.innerHTML = 'Generating...';
  downloadButton.disabled = true;
  // Use html2canvas to capture the element
  html2canvas(container, {
    scale: 2, // Improves image quality for high-resolution screens
    useCORS: true, // Needed if you have images from other domains
    // Set a background color to prevent transparency issues
    backgroundColor: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
  }).then(canvas => {
    // Convert the canvas to a JPG image format
    const image = canvas.toDataURL('image/jpeg', 0.95); // 0.95 is the quality level
    // Create a temporary link element to trigger the download
    const a = document.createElement('a');
    a.href = image;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Restore the button to its original state
    downloadButton.innerHTML = originalButtonText;
    downloadButton.disabled = false;
  }).catch(err => {
    console.error('Error generating image:', err);
    // Restore the button even if there's an error
    downloadButton.innerHTML = originalButtonText;
    downloadButton.disabled = false;
  });
}

function filterStands() {
  const input = document.getElementById('standSearch');
  const filter = input.value.toUpperCase();
  const grid = document.getElementById('stand-grid');
  const cards = grid.getElementsByClassName('material-card');
  for (let i = 0; i < cards.length; i++) {
    const title = cards[i].getElementsByTagName("strong")[0];
    if (title.innerText.toUpperCase().indexOf(filter) > -1) {
      cards[i].style.display = "";
    } else {
      cards[i].style.display = "none";
    }
  }
}

// ==========================================
// ASSET LIBRARY PAGE
// ==========================================
function renderAssetPage(container) {
  // Group assets by category
  const categories = {};
  for (const [id, asset] of Object.entries(assetLibrary)) {
    const cat = asset.category || 'Uncategorized';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ id, ...asset });
  }

  // Also collect stamp assets from stampsData
  const stampCategories = {};
  for (const [catName, items] of Object.entries(stampsData)) {
    if (!Array.isArray(items)) continue;
    stampCategories[catName] = items.map(item => ({
      id: 'stamp_' + item.name.replace(/\s+/g, '_').toLowerCase(),
      url: item.img,
      label: item.name,
      category: catName
    }));
  }

  // Category color mapping
  const catColors = {
    'Sublimation': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-700', badge: 'bg-amber-500', icon: 'fas fa-tshirt' },
    'Lanyard':     { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', badge: 'bg-purple-500', icon: 'fas fa-id-badge' },
    'Pre Ink Rubber Stamp': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-700', badge: 'bg-blue-500', icon: 'fas fa-stamp' },
    'Flash Stamp':          { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', badge: 'bg-red-500', icon: 'fas fa-bolt' },
    'Stamp Pad Rubber Stamp': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', badge: 'bg-green-500', icon: 'fas fa-stamp' }
  };
  const defaultCatColor = { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', badge: 'bg-gray-500', icon: 'fas fa-folder' };

  function renderCategorySection(catName, assets) {
    const colors = catColors[catName] || defaultCatColor;
    const cardsHTML = assets.map(asset => `
      <div class="asset-card ${colors.bg} ${colors.border}">
        <div class="asset-card-img-wrap">
          <img src="${asset.url}" alt="${asset.label}" class="asset-card-img" loading="lazy"
               onerror="this.src='${DUMMY_ICON}'; this.classList.add('asset-img-error');">
        </div>
        <div class="asset-card-label">${asset.label}</div>
      </div>
    `).join('');

    return `
      <div class="asset-category-section">
        <div class="asset-category-header">
          <span class="asset-category-badge ${colors.badge}"><i class="${colors.icon}"></i></span>
          <h3 class="asset-category-title">${catName}</h3>
          <span class="asset-category-count">${assets.length} asset${assets.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="asset-card-grid">${cardsHTML}</div>
      </div>
    `;
  }

  // Build all sections
  let sectionsHTML = '';

  // Registry assets (Sublimation, Lanyard)
  for (const [catName, assets] of Object.entries(categories)) {
    sectionsHTML += renderCategorySection(catName, assets);
  }

  // Stamp assets
  for (const [catName, assets] of Object.entries(stampCategories)) {
    sectionsHTML += renderCategorySection(catName, assets);
  }

  // Summary stats
  const totalRegistry = Object.keys(assetLibrary).length;
  let totalStamp = 0;
  for (const items of Object.values(stampCategories)) totalStamp += items.length;
  const totalAssets = totalRegistry + totalStamp;

  container.innerHTML = `
    <div class="asset-page">
      <div class="asset-page-header">
        <div class="asset-page-header-content">
          <h2 class="asset-page-title"><i class="fas fa-images"></i> Asset Library</h2>
          <p class="asset-page-subtitle">Browse all registered image assets used across products</p>
        </div>
        <div class="asset-page-stats">
          <div class="asset-stat">
            <span class="asset-stat-number">${totalAssets}</span>
            <span class="asset-stat-label">Total Assets</span>
          </div>
          <div class="asset-stat">
            <span class="asset-stat-number">${Object.keys(categories).length + Object.keys(stampCategories).length}</span>
            <span class="asset-stat-label">Categories</span>
          </div>
        </div>
      </div>

      <div class="asset-search-bar">
        <input type="text" id="assetSearchInput" placeholder="Search assets..."
               class="asset-search-input" oninput="filterAssetCards(this.value)">
      </div>

      <div id="assetSectionsContainer">
        ${sectionsHTML}
      </div>
    </div>
  `;
}

let _assetPickerTarget = null;

function openAssetPicker(dataType, addonIndex, optionIndex) {
  _assetPickerTarget = { dataType, addonIndex, optionIndex };
  let currentAssetId = '';
  if (dataType === 'sublimation') {
    currentAssetId = (sublimationData.addons[addonIndex]?.options?.[optionIndex]?.assetId) || '';
  } else if (dataType === 'lanyard') {
    currentAssetId = (lanyardData.addons[addonIndex]?.options?.[optionIndex]?.assetId) || '';
  }

  const catColors = {
    'Sublimation':            { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-500',  icon: 'fas fa-tshirt' },
    'Lanyard':                { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-500', icon: 'fas fa-id-badge' },
    'Pre Ink Rubber Stamp':   { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-500',   icon: 'fas fa-stamp' },
    'Flash Stamp':            { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-500',    icon: 'fas fa-bolt' },
    'Stamp Pad Rubber Stamp': { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-500',  icon: 'fas fa-stamp' },
  };
  const defaultCatColor = { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-500', icon: 'fas fa-folder' };

  // Build unified asset list: assetLibrary entries + stampsData entries
  const allSections = [];

  // 1. Registry assets (Sublimation, Lanyard, â€¦)
  const regCategories = [...new Set(Object.values(assetLibrary).map(a => a.category))];
  regCategories.forEach(cat => {
    const entries = Object.entries(assetLibrary)
      .filter(([, a]) => a.category === cat)
      .map(([id, a]) => ({ assetId: id, url: a.url, label: a.label }));
    allSections.push({ cat, entries });
  });

  // 2. Stamp assets (generate synthetic IDs matching the asset library page)
  for (const [catName, items] of Object.entries(stampsData)) {
    if (!Array.isArray(items)) continue;
    const entries = items.map(item => ({
      assetId: 'stamp_' + item.name.replace(/\s+/g, '_').toLowerCase(),
      url: item.img,
      label: item.name
    }));
    allSections.push({ cat: catName, entries });
  }

  // Render grid
  let gridHtml = '';
  allSections.forEach(({ cat, entries }) => {
    const colors = catColors[cat] || defaultCatColor;
    const cardsHtml = entries.map(({ assetId, url, label }) => {
      const sel = assetId === currentAssetId;
      return `<div class="asset-card picker-asset-card ${colors.bg} ${colors.border}"
           data-asset-id="${assetId}"
           onclick="selectAssetForOption('${assetId}')"
           style="cursor:pointer;${sel ? ' border-color:#14b8a6 !important; box-shadow:0 0 0 3px rgba(20,184,166,0.25);' : ''}">
        <div class="asset-card-img-wrap">
          <img src="${url}" alt="${label}" class="asset-card-img" onerror="this.src='${DUMMY_ICON}'">
        </div>
        <div class="asset-card-label">${label}</div>
      </div>`;
    }).join('');
    gridHtml += `
      <div class="asset-category-section" data-picker-category="${cat}">
        <div class="asset-category-header">
          <span class="asset-category-badge ${colors.badge}"><i class="${colors.icon}"></i></span>
          <h3 class="asset-category-title">${cat}</h3>
          <span class="asset-category-count">${entries.length} asset${entries.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="asset-card-grid">${cardsHtml}</div>
      </div>`;
  });

  // Build tabs dynamically to match whatever categories exist
  const allCats = allSections.map(s => s.cat);
  const tabsContainer = document.getElementById('assetPickerTabs');
  if (tabsContainer) {
    const tabStyle = (active) => `padding:4px 12px; border-radius:999px; font-size:13px; font-weight:600; border:none; cursor:pointer; background:${active ? '#14b8a6' : '#e5e7eb'}; color:${active ? 'white' : '#374151'};`;
    tabsContainer.innerHTML =
      `<button id="assetPickerTab_all" onclick="filterAssetPickerCategory('all')" style="${tabStyle(true)}">All</button>` +
      allCats.map(cat =>
        `<button id="assetPickerTab_${cat.replace(/\s+/g,'_')}" onclick="filterAssetPickerCategory('${cat.replace(/'/g, "\\'")}')"
          style="${tabStyle(false)}">${cat}</button>`
      ).join('');
  }

  document.getElementById('assetPickerGrid').innerHTML = gridHtml;
  const searchEl = document.getElementById('assetPickerSearch');
  if (searchEl) searchEl.value = '';
  filterAssetPickerCategory('all');
  document.getElementById('assetPickerModal').style.display = 'flex';
}

function filterAssetPickerCategory(cat) {
  document.querySelectorAll('#assetPickerGrid .asset-category-section').forEach(section => {
    section.style.display = (cat === 'all' || section.dataset.pickerCategory === cat) ? '' : 'none';
  });
  // Tab IDs use underscores for spaces (built dynamically)
  const targetId = `assetPickerTab_${cat === 'all' ? 'all' : cat.replace(/\s+/g, '_')}`;
  document.querySelectorAll('#assetPickerTabs button').forEach(btn => {
    const active = btn.id === targetId;
    btn.style.background = active ? '#14b8a6' : '#e5e7eb';
    btn.style.color = active ? 'white' : '#374151';
  });
}

function filterPickerAssets(query) {
  const filter = query.toLowerCase().trim();
  const grid = document.getElementById('assetPickerGrid');
  if (!grid) return;
  grid.querySelectorAll('.picker-asset-card').forEach(card => {
    const label = card.querySelector('.asset-card-label').textContent.toLowerCase();
    card.style.display = label.includes(filter) ? '' : 'none';
  });
  grid.querySelectorAll('.asset-category-section').forEach(section => {
    const hasVisible = [...section.querySelectorAll('.picker-asset-card')].some(c => c.style.display !== 'none');
    section.style.display = hasVisible ? '' : 'none';
  });
}

function selectAssetForOption(assetId) {
  if (!_assetPickerTarget) return;
  const { dataType, addonIndex, optionIndex } = _assetPickerTarget;
  closeAssetPicker();
  if (dataType === 'sublimation') {
    sublimationData.addons[addonIndex].options[optionIndex].assetId = assetId;
    renderSublimationSettingsTable();
  } else if (dataType === 'lanyard') {
    lanyardData.addons[addonIndex].options[optionIndex].assetId = assetId;
    renderLanyardSettingsTable();
  }
  showToast('Icon updated.');
}

function closeAssetPicker() {
  document.getElementById('assetPickerModal').style.display = 'none';
  _assetPickerTarget = null;
}

function filterAssetCards(query) {
  const filter = query.toLowerCase().trim();
  const container = document.getElementById('assetSectionsContainer');
  if (!container) return;
  const cards = container.querySelectorAll('.asset-card');
  const sections = container.querySelectorAll('.asset-category-section');

  cards.forEach(card => {
    const label = card.querySelector('.asset-card-label').textContent.toLowerCase();
    card.style.display = label.includes(filter) ? '' : 'none';
  });

  // Hide empty sections
  sections.forEach(section => {
    const visibleCards = section.querySelectorAll('.asset-card[style=""], .asset-card:not([style])');
    const allCards = section.querySelectorAll('.asset-card');
    let hasVisible = false;
    allCards.forEach(c => { if (c.style.display !== 'none') hasVisible = true; });
    section.style.display = hasVisible ? '' : 'none';
  });
}

function _waitForModuleAndRender(content, checkFn, label, renderFn) {
  if (checkFn()) { renderFn(); return; }
  content.innerHTML = `<div style="text-align:center;padding:60px 20px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-color);"></i><p style="margin-top:16px;color:var(--text-secondary);">Loading ${label}...</p></div>`;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (checkFn()) {
      clearInterval(timer);
      renderFn();
    } else if (attempts >= 20) {
      clearInterval(timer);
      content.innerHTML = `<div style="text-align:center;padding:60px 20px;"><p style="color:var(--text-secondary);">Failed to load ${label}. <button onclick="location.reload()" class="btn btn-primary" style="width:auto;">Refresh Page</button></p></div>`;
    }
  }, 100);
}

function loadPage(page) {
  const dock = document.getElementById('bottomDock');
  // --- UPDATED: Use Constants ---
  if (page === CAT_HOME || page === CAT_SETTINGS || page === CAT_ASSET) {
    dock.style.display = 'none';
  } else {
    dock.style.display = 'flex';
  }
  const navLinks = document.querySelectorAll('#drawer-navigation a');
  navLinks.forEach(link => {
    link.classList.remove('sidebar-active');
  });
  const activeLink = document.querySelector(`#drawer-navigation a[onclick="loadPage('${page}');"]`);
  if (activeLink) {
    activeLink.classList.add('sidebar-active');
  }
  const content = document.getElementById('contentArea');
  selectedMaterialIndex = null;
  currentCategory = page;
  if (page === 'invitationCard') {
    // Initialize the selected addons state, defaulting to the first option (index 0) for each
    selectedInvCardAddons = invitationCardData.addons.map(() => 0);
  }
  switch (page) {
    case CAT_HOME:
      renderHomePage(content);
      break;
    case CAT_LOAD_QUOTE:
      renderLoadQuotePage(content);
      break;
    case CAT_LARGE_FORMAT: {
      const _lfOpen = window.appModules?.largeFormat?.openLargeFormatPage;
      if (typeof _lfOpen === 'function') {
        _lfOpen(content, {
          setScrollPosition: (value) => { largeFormatScrollPos = value; },
          setDefaultDimensions: () => {
            lastUsedWidth = 3;
            lastUsedHeight = 2;
            lastUsedUnit = 'ft';
            currentInputUnit = 'ft';
          },
          materials,
          globalAgentMode,
          renderMaterialGrid,
        });
      } else {
        largeFormatScrollPos = 0;
        lastUsedWidth = 3; lastUsedHeight = 2; lastUsedUnit = 'ft'; currentInputUnit = 'ft';
        materials.forEach(item => { item.agent = globalAgentMode; });
        renderMaterialGrid(content, 'largeFormat');
      }
      break;
    }
    case 'signboard': {
      const _sbOpen = window.appModules?.signboard?.openSignboardPage;
      if (typeof _sbOpen === 'function') {
        _sbOpen(content, {
          setScrollPosition: (value) => { signboardScrollPos = value; },
          setDefaultDimensions: () => {
            lastUsedWidth = 3;
            lastUsedHeight = 2;
            lastUsedUnit = 'ft';
            currentInputUnit = 'ft';
          },
          signboardMaterials,
          globalAgentMode,
          renderMaterialGrid,
        });
      } else {
        signboardScrollPos = 0;
        lastUsedWidth = 3; lastUsedHeight = 2; lastUsedUnit = 'ft'; currentInputUnit = 'ft';
        signboardMaterials.forEach(item => { item.agent = globalAgentMode; });
        renderMaterialGrid(content, 'signboard');
      }
      break;
    }
    case 'stand': {
      const _stOpen = window.appModules?.stand?.openStandPage;
      if (typeof _stOpen === 'function') {
        _stOpen(content, {
          setStandScrollPos: (value) => { standScrollPos = value; },
          renderStandGrid,
        });
      } else {
        standScrollPos = 0;
        renderStandGrid(content);
      }
      break;
    }
    case 'businessCard':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.businessCard?.renderBusinessCardPage === 'function',
        'Business Card',
        () => renderBusinessCardPage(content));
      break;
    case 'invitationCard':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.invitationCard?.renderInvitationCardCalculator === 'function',
        'Invitation Card',
        () => renderInvitationCardCalculator(content));
      break;
    case 'sublimation':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.sublimation?.renderSublimationCalculator === 'function',
        'Sublimation',
        () => renderSublimationCalculator(content));
      break;
    case 'idCard':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.idCard?.renderIDCardCalculator === 'function',
        'ID Card',
        () => renderIDCardCalculator(content));
      break;
    case 'lanyard':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.lanyard?.renderLanyardCalculator === 'function',
        'Lanyard',
        () => renderLanyardCalculator(content));
      break;
    case 'stickerLayout':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.sticker?.renderStickerLayoutEditor === 'function',
        'Sticker Layout',
        () => renderStickerLayoutEditor(content));
      break;
    case 'acrylicCalculator':
      _waitForModuleAndRender(content,
        () => typeof window.appModules?.acrylic?.renderAcrylicCalculator === 'function',
        'Acrylic Calculator',
        () => renderAcrylicCalculator(content));
      break;
    case 'stamp': {
      const _spOpen = window.appModules?.stamp?.openStampPage;
      if (typeof _spOpen === 'function') {
        _spOpen(content, {
          setStampScrollPos: (value) => { stampScrollPos = value; },
          setGlobalAgentMode,
          globalAgentMode,
          renderStampPage,
        });
      } else {
        stampScrollPos = 0;
        setGlobalAgentMode(globalAgentMode, 'stamp');
        renderStampPage(content);
      }
      break;
    }
    case 'dtf':
      currentDTFTab = 'dtf';
      renderDTFPage(content);
      break;
    case CAT_GIFT_ITEM:
      renderGiftItemPage(content);
      break;
    case CAT_ASSET:
      renderAssetPage(content);
      break;
    case 'settings':
      renderSettingsPage(content);
      break;
    default:
      content.innerHTML = `<h2>${page.charAt(0).toUpperCase() + page.slice(1)}</h2><p>Calculator coming soon.</p>`;
  }
  // --- [NEW BLOCK] ---
  // This will run every time a page is loaded from the sidebar.
  // It finds the official Flowbite drawer instance and hides it.
  // This correctly removes the drawer AND the backdrop.
  const drawerEl = document.getElementById('drawer-navigation');
  if (drawerEl && typeof FlowbiteInstances !== 'undefined') {
    const drawerInstance = FlowbiteInstances.getInstance('Drawer', 'drawer-navigation');
    if (drawerInstance && drawerInstance.isVisible()) {
      drawerInstance.hide();
    }
  }
  // --- [END OF NEW BLOCK] ---
}

// --- START: STICKER EDITOR HELPER (Fix #7) ---


function toggleStickerDropdown(e) { window.appModules?.sticker?.toggleStickerDropdown?.(e); }
function selectStickerMaterialOption(index) { window.appModules?.sticker?.selectStickerMaterialOption?.(index); }
function getStickerEditorHTML() { return window.appModules?.sticker?.getStickerEditorHTML?.() ?? ''; }
function renderStickerLayoutEditor(container) { window.appModules?.sticker?.renderStickerLayoutEditor?.(container); }


// --- START: EVENT LISTENER HELPER (Fix #9) ---
function attachGridListeners(container) {
  const cards = container.querySelectorAll('.material-card');
  cards.forEach(card => {
    card.addEventListener('click', function () {
      const action = this.dataset.action;
      const index = parseInt(this.dataset.index);

      if (action === 'select-material') {
        const type = this.dataset.type;
        const capturedState = capturePrintingCalculatorState();
        showCalculator(type, index, capturedState);
      } else if (action === 'select-stand') {
        selectStand(index);
      } else if (action === 'select-stamp') {
        selectStamp(index);
      } else if (action === 'select-mug') {
        selectMug(index);
      }
    });
  });
}
// --- END: EVENT LISTENER HELPER ---

function renderMaterialGrid(container, type, forShortcut = false) {
  // --- UPDATED: Use Constants ---
  const sourceArray = type === CAT_LARGE_FORMAT ? materials : signboardMaterials;

  // 1. Build the Grid HTML (Removed onclick, added data attributes)
  let gridHTML = `<div class='material-grid' id='material-grid-${type}'>`;
  sourceArray.forEach((mat, i) => {
    if (mat.agent === undefined) mat.agent = false;
    const displayPrice = mat.agent ? mat.agentPrice : mat.customerPrice;
    const isActive = (i === selectedMaterialIndex) ? ' active' : '';
    const agentActive = mat.agent ? ' agent-active' : '';
    const priceUnit = mat.fixed ? '' : ' / sq ft';

    gridHTML += `
        <div class='material-card${isActive}${agentActive}' data-action="select-material" data-type="${type}" data-index="${i}">
            <div class='material-info'>
                <strong>${mat.name}</strong>
                <span>${currentCurrency.symbol} ${formatCurrency(displayPrice)}${priceUnit}</span>
            </div>
        </div>`;
  });
  gridHTML += "</div>";

  // 2. Wrap in Container
  const containerHTML = `<div class="material-grid-container">${gridHTML}</div>`;
  const toggleHTML = getGlobalToggleHTML(type);

  // 3. Render to Page
  if (!forShortcut) {
    const title = type === 'largeFormat' ? 'Large Format' : 'Signboard';
    container.innerHTML = `
            <h2 class="w-[75%] max-w-[1100px] mx-auto text-center text-2xl font-bold mb-6">
                ${title} - Select Material
            </h2>
            ${toggleHTML}
            ${containerHTML}
        `;
    // --- NEW: Attach Listeners ---
    attachGridListeners(container);
  }

  return `${toggleHTML}${containerHTML}`;
}

function selectMug(index) {
  selectedMugIndex = index;
  renderGiftItemPage(document.getElementById('contentArea'), 'mug');
}

function selectStand(index) {
  window.appModules?.stand?.selectStand?.(index, createStandModuleContext());
}

function renderStandGrid(container) {
  window.appModules?.stand?.renderStandGrid?.(container, createStandModuleContext());
}

// --- NEW HELPER FOR STAND TITLE UPDATES ---
function updateStandQty() {
  window.appModules?.stand?.updateStandQty?.(createStandModuleContext());
}

function createStandModuleContext() {
  return {
    addItemToQuotePad,
    attachGridListeners,
    formatCurrency,
    generateUniversalInvoice,
    getCurrentCurrency: () => currentCurrency,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalTaxPercent: () => globalTaxPercent,
    getGlobalToggleHTML,
    getIsTaxEnabled: () => isTaxEnabled,
    getSelectedMaterialIndex: () => selectedMaterialIndex,
    getStands: () => stands,
    getStandScrollPos: () => standScrollPos,
    setSelectedMaterialIndex: (index) => {
      selectedMaterialIndex = index;
    },
    setStandScrollPos: (scrollPos) => {
      standScrollPos = scrollPos;
    },
    showToast,
  };
}


function getGlobalToggleHTML(category, isAgent = globalAgentMode) {
  const customerActiveClass = !isAgent ? 'active' : '';
  const agentActiveClass = isAgent ? 'active active-agent' : ''; // Use 'active-agent' for the green color
  return `
            <div class="global-toggle-container">
                <div class="size-btn-group">
                    <button class="btn size-btn ${customerActiveClass}" onclick="setGlobalAgentMode(false, '${category}')">
                        <i class="fas fa-user mr-2"></i> Customer Price
                    </button>
                    <button class="btn size-btn ${agentActiveClass}" onclick="setGlobalAgentMode(true, '${category}')">
                        <i class="fas fa-user-shield mr-2"></i> Agent Price
                    </button>
                </div>
            </div>
        `;
}

function setGlobalAgentMode(isAgent, category) {
  globalAgentMode = isAgent;
  // Sync all core material arrays regardless of current category
  materials.forEach(item => item.agent = isAgent);
  signboardMaterials.forEach(item => item.agent = isAgent);

  // Re-render logic
  if (category === 'stamp') {
    const content = document.getElementById('contentArea');
    renderStampPage(content);
  } else if (category === 'idCard') {
    const content = document.getElementById('contentArea');
    renderIDCardCalculator(content);
  } else if (category === 'lanyard') {
    const content = document.getElementById('contentArea');
    renderLanyardCalculator(content);
  } else if (category === 'businessCard') {
    const content = document.getElementById('contentArea');
    renderBusinessCardPage(content);
  } else if (category === 'sublimation') {
    const content = document.getElementById('contentArea');
    renderSublimationCalculator(content);
  } else if (category === 'invitationCard') {
    const content = document.getElementById('contentArea');
    renderInvitationCardCalculator(content);
    // --- Update Global Toggle Visual State ---
    const toggleContainer = document.querySelector('.calculator-panel .global-toggle-container');
    if (toggleContainer) {
      const buttons = toggleContainer.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.classList.remove('active', 'active-agent');
        if (isAgent && btn.innerText.includes('Agent')) {
          btn.classList.add('active', 'active-agent');
        } else if (!isAgent && btn.innerText.includes('Customer')) {
          btn.classList.add('active');
        }
      });
    }
  } else if (category === 'largeFormat' || category === 'signboard') {
    const preservedState = capturePrintingCalculatorState();
    if (selectedMaterialIndex !== null && currentCategory === category) {
      showCalculator(category, selectedMaterialIndex, preservedState);
    } else {
      renderMaterialGrid(document.getElementById('contentArea'), category, false);
    }
  } else if (category === 'stickerLayout') {
    // Re-render price table for Sticker Layout
    calculateLayout();

    // Auto-refresh Smart Finder results if visible
    rerunLastStickerSmartFinder();

    // Update Toggle Buttons Visual State
    const toggleContainer = document.querySelector('.sticker-editor-wrapper .global-toggle-container');
    if (toggleContainer) {
      const buttons = toggleContainer.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.classList.remove('active', 'active-agent');
        if (isAgent && btn.innerText.includes('Agent')) {
          btn.classList.add('active', 'active-agent');
        } else if (!isAgent && btn.innerText.includes('Customer')) {
          btn.classList.add('active');
        }
      });
    }

    // Update Agent Styling on Elements (Preset buttons, DPI toggles, Lock Ratio)
    const stickerEditor = document.querySelector('.sticker-editor-wrapper');
    if (stickerEditor) {
      const dynamicButtons = stickerEditor.querySelectorAll('.preset-button, .size-btn, .active-control');
      dynamicButtons.forEach(btn => {
        // Skip the toggle buttons themselves, as they are handled above
        if (btn.closest('.global-toggle-container')) return;

        if (isAgent) {
          btn.classList.add('agent-active');
        } else {
          btn.classList.remove('agent-active');
        }
      });

      const paperLockBtn = document.getElementById('paperLockRatioBtn');
      if (paperLockBtn) {
        if (isAgent) {
          paperLockBtn.classList.add('agent-active');
        } else {
          paperLockBtn.classList.remove('agent-active');
        }
      }
    }

    applyMainCalcPanelButtonVisual(document.getElementById('stickerArtworkToolsBtn'), window.appModules?.sticker?.getStickerPanelStates?.()?.stickerArtToolsOpen || false);
    applyMainCalcPanelButtonVisual(document.getElementById('stickerDownloadOptionsBtn'), window.appModules?.sticker?.getStickerPanelStates?.()?.stickerDownloadOptionsOpen || false);
    applyMainCalcPanelButtonVisual(document.getElementById('stickerSpacingBtn'), window.appModules?.sticker?.getStickerPanelStates?.()?.stickerSpacingOpen || false);
    applyMainCalcPanelButtonVisual(document.getElementById('stickerSmartFinderBtn'), window.appModules?.sticker?.getStickerPanelStates?.()?.stickerSmartFinderOpen || false);

    const stickerPanelColorDynamic = isAgent ? 'var(--success-color)' : 'var(--primary-color)';
    const sFinalDlBtn = document.getElementById('stickerFinalDownloadBtn');
    if (sFinalDlBtn) {
      sFinalDlBtn.style.setProperty('background', stickerPanelColorDynamic, 'important');
      sFinalDlBtn.style.setProperty('border-color', stickerPanelColorDynamic, 'important');
    }
    const sUploadImgBtn = document.getElementById('stickerUploadImageBtn');
    if (sUploadImgBtn) {
      sUploadImgBtn.style.setProperty('background', stickerPanelColorDynamic, 'important');
      sUploadImgBtn.style.setProperty('border-color', stickerPanelColorDynamic, 'important');
    }
    ['sfFindBtn1', 'sfFindBtn2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.style.setProperty('background', stickerPanelColorDynamic, 'important');
        btn.style.setProperty('border-color', stickerPanelColorDynamic, 'important');
      }
    });
  } else if (category === 'stand') {
    renderStandGrid(document.getElementById('contentArea'));
  } else if (category === 'acrylicCalculator') {
    // Manual update for Acrylic to avoid losing input values (Width/Height)
    handleAcrylicUserToggle(isAgent ? 'agent' : 'customer');
  } else if (category === 'giftItem') {
    renderGiftItemPage(document.getElementById('contentArea'), currentGiftTab);
  } else if (category === 'dtf') {
    // Update toggle buttons visual without re-rendering (preserves user inputs)
    const dtfToggle = document.querySelector('.global-toggle-container');
    if (dtfToggle) {
      const buttons = dtfToggle.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.classList.remove('active', 'active-agent');
        if (isAgent && btn.innerText.includes('Agent')) {
          btn.classList.add('active', 'active-agent');
        } else if (!isAgent && btn.innerText.includes('Customer')) {
          btn.classList.add('active');
        }
      });
    }
    kiraDTF();
  }
  // --- NEW: Handle Missing Categories ---
  else if (category === 'businessCard' || category === 'bc') {
    renderBusinessCardPage(document.getElementById('contentArea'));
    // --- Update Global Toggle Visual State ---
    const toggleContainer = document.querySelector('.calculator-panel .global-toggle-container');
    if (toggleContainer) {
      const buttons = toggleContainer.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.classList.remove('active', 'active-agent');
        if (isAgent && btn.innerText.includes('Agent')) {
          btn.classList.add('active', 'active-agent');
        } else if (!isAgent && btn.innerText.includes('Customer')) {
          btn.classList.add('active');
        }
      });
    }
  } else if (category === 'invitationCard') {
    renderInvitationCardCalculator(document.getElementById('contentArea'));
  } else if (category === 'sublimation') {
    renderSublimationCalculator(document.getElementById('contentArea'));
  } else if (category === 'lanyard') {
    renderLanyardCalculator(document.getElementById('contentArea'));
  }
  // --- Sticker Layout Logic (Manual Toggle) ---
  else if (category === 'stickerLayout') {
    // 1. Manually update button styles to avoid re-rendering (and losing inputs)
    const btns = document.querySelectorAll('.sticker-editor-wrapper .global-toggle-container .size-btn');
    if (btns.length >= 2) {
      if (isAgent) {
        btns[0].classList.remove('active'); // Customer
        btns[1].classList.add('active', 'active-agent'); // Agent
      } else {
        btns[0].classList.add('active'); // Customer
        btns[1].classList.remove('active', 'active-agent'); // Agent
      }
    }
    // 2. Recalculate Price immediately
    calculateLayout();
  }
}

function capturePrintingCalculatorState() {
  return window.appModules?.printShell?.capturePrintingCalculatorState?.(createPrintShellContext()) ?? null;
}

function applyMainCalcPanelButtonVisual(buttonEl, isActive) {
  if (!buttonEl) return;

  // Resolve mode robustly from current material state when possible.
  let isAgentMode = globalAgentMode;
  if ((currentCategory === 'largeFormat' || currentCategory === 'signboard') && selectedMaterialIndex !== null) {
    const currentMaterial = currentCategory === 'largeFormat'
      ? materials[selectedMaterialIndex]
      : signboardMaterials[selectedMaterialIndex];
    if (currentMaterial && typeof currentMaterial.agent === 'boolean') {
      isAgentMode = currentMaterial.agent;
    }
  }

  if (isActive) {
    const activeColor = isAgentMode ? 'var(--success-color)' : 'var(--primary-color)';
    buttonEl.style.setProperty('background', activeColor, 'important');
    buttonEl.style.setProperty('border', `1px solid ${activeColor}`, 'important');
    buttonEl.style.setProperty('color', '#ffffff', 'important');
  } else {
    if (buttonEl.id === 'stickerSpacingBtn' || buttonEl.id === 'stickerSmartFinderBtn') {
        buttonEl.style.removeProperty('background');
    } else {
        buttonEl.style.setProperty('background', 'transparent', 'important');
    }
    buttonEl.style.setProperty('border', '1px solid var(--border-color)', 'important');
    buttonEl.style.setProperty('color', 'var(--text-secondary)', 'important');
  }
}

function restorePrintingCalculatorState(state) {
  window.appModules?.printShell?.restorePrintingCalculatorState?.(state, createPrintShellContext());
}

function showCalculator(category, index, preservedState = null) {
  if (typeof window.appModules?.printShell?.showCalculator === 'function') {
    window.appModules.printShell.showCalculator(category, index, preservedState, createPrintShellContext());
  } else {
    _showCalculatorFallback(category, index, preservedState);
  }
}

function _showCalculatorFallback(category, index, preservedState = null) {
  const gridContainer = document.querySelector('.material-grid-container');
  if (gridContainer) {
    if (category === 'largeFormat') largeFormatScrollPos = gridContainer.scrollTop;
    if (category === 'signboard') signboardScrollPos = gridContainer.scrollTop;
  }
  currentInputUnit = lastUsedUnit;
  selectedMaterialIndex = index;
  currentCategory = category;
  const material = (category === 'largeFormat') ? materials[index] : signboardMaterials[index];
  if (!material) return;
  pricePerSqFt = material.agent ? material.agentPrice : material.customerPrice;
  isStickerOrPolysilk = material.simple;
  const content = document.getElementById('contentArea');
  const gridHTML = (category === 'largeFormat') ? renderMaterialGrid(content, 'largeFormat', true) : renderMaterialGrid(content, 'signboard', true);
  const catName = (category === 'largeFormat') ? 'Large Format' : 'Signboard';
  const defaultWidth = material.fixed ? material.fixedWidth : lastUsedWidth;
  const defaultHeight = material.fixed ? material.fixedHeight : lastUsedHeight;
  const isFixed = material.fixed;
  const titleColor = material.agent ? 'var(--success-color)' : 'var(--primary-color)';
  const agentSuffix = material.agent ? ' - Agent' : '';
  const agentClass = material.agent ? ' agent-active' : '';
  const lockActiveClass = isRatioLocked ? ' active' : '';
  const lockIconClass = isRatioLocked ? 'fa-lock' : 'fa-lock-open';
  const panelPrimaryColor = material.agent ? 'var(--success-color)' : 'var(--primary-color)';
  const priceUnit = material.fixed ? '' : ' / sq ft';
  if (isRatioLocked && defaultWidth > 0 && defaultHeight > 0) {
    currentAspectRatio = defaultWidth / defaultHeight;
  }
  content.innerHTML = `
<h2 style="width: 75%; max-width: 1100px; margin: 0 auto; text-align: center;">${catName} - Select Material</h2>
${gridHTML}
<h2 style="width: 75%; max-width: 1100px; margin: 24px auto 0 auto; text-align: center; color: ${titleColor};">Material: ${material.name} (${currentCurrency.symbol} ${formatCurrency(pricePerSqFt)}${priceUnit})${agentSuffix}</h2>
<div class='calculator-panel'>
<div>
    <label for='itemTitle'>Custom Title (Optional):</label>
    <input type='text' id='itemTitle' placeholder="e.g., Design Title" oninput="kiraHarga()" />
</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 12px; align-items: flex-end; margin-top: 10px;">
        <div>
            <label for='width'>Width:</label>
            <div style="position: relative;">
                <input type='number' id='width' step='0.1' value='${defaultWidth}' oninput='lastClickedASize = null; clearASizeHighlight(); handleDimensionInput("width");' ${isFixed ? 'disabled' : ''} class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" style="padding-right: 35px; box-sizing: border-box;"/>
                <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
            </div>
        </div>
        <div>
            <label for='height'>Height:</label>
            <div style="position: relative;">
                <input type='number' id='height' step='0.1' value='${defaultHeight}' oninput='lastClickedASize = null; clearASizeHighlight(); handleDimensionInput("height");' ${isFixed ? 'disabled' : ''} class="p-2 border rounded-lg h-11 bg-white dark:bg-[#374151] text-gray-900 dark:text-white border-gray-300 dark:border-[#4b5563] w-full" style="padding-right: 35px; box-sizing: border-box;"/>
                <span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span>
            </div>
        </div>
        <button class="btn size-btn${agentClass}" onclick="switchDimensions()" style="height: 44px; width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; flex-grow: 0; border-radius: 0.5rem;" ${isFixed ? 'disabled' : ''}><i class="fas fa-exchange-alt fa-fw"></i></button>
        <button id="toggleRatioLockBtn" class="btn size-btn${agentClass}${lockActiveClass}" onclick="toggleRatioLock()" style="height: 44px; width: 44px; padding: 0; display: flex; align-items: center; justify-content: center; flex-grow: 0; border-radius: 0.5rem;" ${isFixed ? 'disabled' : ''}><i class="fas ${lockIconClass} fa-fw"></i></button>
    </div>
    <div class="options-grid" style="grid-template-columns: 1fr 2fr; align-items: end; gap: 20px; margin-top: 4px;">
        <div>
            <label for='measurementUnit'>Unit:</label>
            <div class="custom-sticker-dropdown" id="measurementUnitWrapper" onclick="toggleGenericStickerDropdown(event, 'measurementUnitWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                    <span class="custom-sticker-dropdown-label" id="measurementUnitLabel">Feet (ft)</span>
                    <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                    <div class="custom-sticker-dropdown-option ${currentInputUnit === 'ft' ? 'selected' : ''}" data-value="ft" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'ft', 'changeUnits')">Feet (ft)</div>
                    <div class="custom-sticker-dropdown-option ${currentInputUnit === 'in' ? 'selected' : ''}" data-value="in" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'in', 'changeUnits')">Inches (in)</div>
                    <div class="custom-sticker-dropdown-option ${currentInputUnit === 'cm' ? 'selected' : ''}" data-value="cm" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'cm', 'changeUnits')">Centimeter (cm)</div>
                    <div class="custom-sticker-dropdown-option ${currentInputUnit === 'mm' ? 'selected' : ''}" data-value="mm" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'mm', 'changeUnits')">Millimeter (mm)</div>
                    <div class="custom-sticker-dropdown-option ${currentInputUnit === 'm' ? 'selected' : ''}" data-value="m" onmousedown="selectGenericStickerDropdownOption('measurementUnit', 'measurementUnitWrapper', 'm', 'changeUnits')">Meter (m)</div>
                </div>
                <select id='measurementUnit' onchange='changeUnits(this.value)' class="hidden-native-select" style="display:none;">
                    <option value='ft' ${currentInputUnit === 'ft' ? 'selected' : ''}>Feet (ft)</option>
                    <option value='in' ${currentInputUnit === 'in' ? 'selected' : ''}>Inches (in)</option>
                    <option value='cm' ${currentInputUnit === 'cm' ? 'selected' : ''}>Centimeter (cm)</option>
                    <option value='mm' ${currentInputUnit === 'mm' ? 'selected' : ''}>Millimeter (mm)</option>
                    <option value='m' ${currentInputUnit === 'm' ? 'selected' : ''}>Meter (m)</option>
                </select>
            </div>
        </div>
        <div><label>Preset A-Sizes:</label><div id="aSizeBtnGroup" class="size-btn-group" style="flex-wrap: wrap;"><button id="btn-A0" class="size-btn${agentClass}" onclick="setASize('A0', 841, 1189)">A0</button><button id="btn-A1" class="size-btn${agentClass}" onclick="setASize('A1', 594, 841)">A1</button><button id="btn-A2" class="size-btn${agentClass}" onclick="setASize('A2', 420, 594)">A2</button><button id="btn-A3" class="size-btn${agentClass}" onclick="setASize('A3', 297, 420)">A3</button><button id="btn-A4" class="size-btn${agentClass}" onclick="setASize('A4', 210, 297)">A4</button><button id="btn-A5" class="size-btn${agentClass}" onclick="setASize('A5', 148, 210)">A5</button><button id="btn-A6" class="size-btn${agentClass}" onclick="setASize('A6', 105, 148)">A6</button></div></div>
    </div>
    <div style="display: grid; grid-template-columns: ${!material.simple ? '1fr 1fr auto' : '1fr auto'}; gap: 12px; margin-top: 10px; align-items: flex-end;">
        ${!material.simple ? `
        <div>
            <label for='eyeletOption'>Finishing:</label>
            <div class="custom-sticker-dropdown" id="eyeletOptionWrapper" onclick="toggleGenericStickerDropdown(event, 'eyeletOptionWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                    <span class="custom-sticker-dropdown-label" id="eyeletOptionLabel">Auto Eyelets</span>
                    <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                    <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'auto', 'updateFinishingOptions')">Auto Eyelets</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'manual', 'updateFinishingOptions')">Manual Eyelets</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'pipe', 'updateFinishingOptions')">Pipe</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('eyeletOption', 'eyeletOptionWrapper', 'none', 'updateFinishingOptions')">No Finishing</div>
                </div>
                <select id='eyeletOption' onchange='updateFinishingOptions()' class="hidden-native-select" style="display:none;">
                    <option value='auto' selected>Auto Eyelets</option>
                    <option value='manual'>Manual Eyelets</option>
                    <option value='pipe'>Pipe</option>
                    <option value='none'>No Finishing</option>
                </select>
            </div>
        </div>` : ''}
        <div>
            <label for='whiteBorderOption'>White Border All Side:</label>
            <div class="custom-sticker-dropdown" id="whiteBorderOptionWrapper" onclick="toggleGenericStickerDropdown(event, 'whiteBorderOptionWrapper')">
                <div class="custom-sticker-dropdown-trigger">
                    <span class="custom-sticker-dropdown-label" id="whiteBorderOptionLabel">None</span>
                    <svg class="custom-sticker-dropdown-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="custom-sticker-dropdown-options">
                    <div class="custom-sticker-dropdown-option selected" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', 'none', 'kiraHarga')">None</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '1', 'kiraHarga')">1 inches</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '2', 'kiraHarga')">2 inches</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '3', 'kiraHarga')">3 inches</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '4', 'kiraHarga')">4 inches</div>
                    <div class="custom-sticker-dropdown-option" onmousedown="selectGenericStickerDropdownOption('whiteBorderOption', 'whiteBorderOptionWrapper', '5', 'kiraHarga')">5 inches</div>
                </div>
                <select id='whiteBorderOption' onchange='kiraHarga()' class="hidden-native-select" style="display:none;">
                    <option value='none'>None</option>
                    <option value='1'>1 inches</option>
                    <option value='2'>2 inches</option>
                    <option value='3'>3 inches</option>
                    <option value='4'>4 inches</option>
                    <option value='5'>5 inches</option>
                </select>
            </div>
        </div>
        <button id="customBorderToggle" class="btn btn-secondary${agentClass}" onclick="toggleCustomBorder()" style="width: auto; padding: 8px 16px; margin-bottom: 0; height: 44px; display: flex; align-items: center; justify-content: center;">Custom</button>
    </div>
    <div id='manualEyeletFields' style='display:none; margin-top: 10px; grid-template-columns: repeat(4, 1fr); gap: 10px;'>
        <div style="grid-column: span 4; font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px dashed var(--border-color); padding-bottom: 2px; margin-bottom: -5px;">Manual Eyelet Position</div>
        <div><label>Top</label><input type='number' id='manualTop' value='0' oninput='kiraHarga()'/></div><div><label>Bottom</label><input type='number' id='manualBottom' value='0' oninput='kiraHarga()'/></div><div><label>Left</label><input type='number' id='manualLeft' value='0' oninput='kiraHarga()'/></div><div><label>Right</label><input type='number' id='manualRight' value='0' oninput='kiraHarga()'/></div>
    </div>
    <div id='customWhiteBorderFields' style='display:none; margin-top: 10px;'>
        <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); border-bottom: 1px dashed var(--border-color); padding-bottom: 2px; margin-bottom: 8px;">Custom White Border Size</div>
        <div style="grid-template-columns: repeat(4, 1fr); gap: 10px; display: grid;">
            <div><label>Top</label><div style="position: relative;"><input type='number' id='customBorderTop' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span></div></div>
            <div><label>Bottom</label><div style="position: relative;"><input type='number' id='customBorderBottom' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span></div></div>
            <div><label>Left</label><div style="position: relative;"><input type='number' id='customBorderLeft' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span></div></div>
            <div><label>Right</label><div style="position: relative;"><input type='number' id='customBorderRight' value='0' step="0.1" oninput='kiraHarga()' style="padding-right: 35px;"/><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">${currentInputUnit}</span></div></div>
        </div>
        <span class="text-xs text-gray-500 dark:text-gray-400 mt-2">*The input size is based on the currently selected measurement unit. During Custom White Border, make sure use Inch.</span>
    </div>
    <div class="modern-checkbox-grid" style="grid-template-columns: 1fr; margin-top: 16px;">
        <div class="checkbox-group">
            <input type='checkbox' id='governmentChk' onchange="kiraHarga()"/>
            <label for='governmentChk'>Add Government ${globalGovSurchargePercent}%</label>
        </div>
    </div>
    <div class='result' id='result'></div>
    <div id='previewCanvasWrapper' style='position: relative; width: fit-content; margin: 0 auto;'>
        <canvas id='previewCanvas' width='760' height='400' style='display: block;'></canvas>
        <div id='dragOverlay' style='display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.85); border: 4px dashed var(--primary-color); z-index: 10; align-items: center; justify-content: center; flex-direction: column; backdrop-filter: blur(2px);'>
            <i class='fas fa-cloud-upload-alt' style='font-size: 48px; color: var(--primary-color); margin-bottom: 10px;'></i>
            <span style='font-weight: 700; color: var(--primary-color); font-size: 18px;'>Drop Artwork Here</span>
        </div>
    </div>
    <div class="preview-action-grid" style="margin-top: 8px;">
      <button class="btn btn-sm btn-secondary preview-action-btn" id="artworkToolsBtn" onclick="toggleArtworkTools()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);"><i class="fas fa-image mr-2"></i> Manage Artwork Design<i class="fas fa-chevron-down ml-1" id="artToggleIcon"></i></button>
      <button class="btn btn-secondary btn-sm preview-action-btn" id="downloadOptionsBtn" onclick="toggleDownloadOptions()" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color);"><i class="fas fa-file-export mr-2"></i> Download Options<i class="fas fa-chevron-down ml-1" id="dlToggleIcon"></i></button>
      <button class="btn btn-secondary btn-sm preview-action-btn preview-action-btn--span" onclick="downloadPreviewCanvas()" style="background: transparent; color: #28a745; border: 1px solid #28a745;"><i class="fas fa-camera mr-2"></i> Download Preview</button>
    </div>
    <div id="artworkToolsPanel" class="panel-collapsible" style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
      <div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center;">
        <input type="file" id="designUpload" accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf" style="display: none;" onchange="handleDesignUpload(this)">
        <button class="btn btn-sm btn-primary" onclick="document.getElementById('designUpload').click()" style="width: auto; margin-top: 0; white-space: nowrap; background: ${panelPrimaryColor}; border-color: ${panelPrimaryColor};"><i class="fas fa-upload mr-2"></i> Upload Image</button>
        <button class="btn btn-sm btn-danger" onclick="clearDesign()" style="width: auto; margin-top: 0; white-space: nowrap;"><i class="fas fa-trash mr-2"></i> Clear</button>
        <div class="artwork-filename-wrapper"><span id="designFileName" class="artwork-filename-text"></span></div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr auto auto auto; gap: 8px; align-items: end;">
        <div><label id="designWLabel" style="font-size: 11px;">Design Width:</label><div style="position: relative;"><input type="number" id="designW" step="0.1" oninput="updateDesignDims('w')" disabled style="padding-right: 30px;"><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">ft</span></div></div>
        <div><label id="designHLabel" style="font-size: 11px;">Design Height:</label><div style="position: relative;"><input type="number" id="designH" step="0.1" oninput="updateDesignDims('h')" disabled style="padding-right: 30px;"><span class="dynamic-unit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 12px; pointer-events: none;">ft</span></div></div>
        <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="rotateDesignImg()" title="Rotate 90°" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;"><i class="fas fa-sync-alt"></i></button>
        <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 active-control ${agentClass}" id="artLockBtn" onclick="toggleArtLock()" title="Lock Ratio" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;"><i class="fas fa-lock"></i></button>
        <button class="btn btn-sm bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="resetArtworkFit()" title="Reset to Fit" style="height: 42px; width: 42px; display: flex; align-items: center; justify-content: center; margin-top: 0;"><i class="fas fa-compress-arrows-alt"></i></button>
      </div>
      <p style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; margin-bottom: 0;">* Design is automatically scaled to fit within material bounds.</p>
    </div>
    <div id="downloadOptionsPanel" class="panel-collapsible" style="background: var(--light-bg); padding-left: 16px; padding-right: 16px; border-radius: 8px;">
        <div style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: end;">
            <div>
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select DPI:</label>
              <div class="size-btn-group" id="dpiBtnGroup">
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(72)">72</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(100)">100</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(150)">150</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(200)">200</button>
                <button class="btn size-btn${agentClass}" onclick="setDownloadDPI(250)">250</button>
                <button class="btn size-btn active${agentClass}" onclick="setDownloadDPI(300)">300</button>
              </div>
            </div>
            <div style="margin-left: 12px;">
              <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Custom:</label>
              <div style="position: relative;"><input type="number" id="customDpiInput" placeholder="300" oninput="setCustomDPI(this.value)" style="padding-right: 10px; width: 80px;"></div>
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: end; gap: 10px;">
            <div>
                <label style="font-size: 11px; font-weight: 700; margin-bottom: 6px; display: block;">Select File Type:</label>
                <div class="size-btn-group" id="fileTypeBtnGroup">
                    <button class="btn size-btn${agentClass}" onclick="setFileType('jpg')">JPG</button>
                    <button class="btn size-btn active${agentClass}" onclick="setFileType('svg')">SVG</button>
                    <button class="btn size-btn${agentClass}" onclick="setFileType('pdf')">PDF</button>
                </div>
            </div>
            <button class="btn btn-primary" onclick="handleFinalDownload()" style="width: auto; padding: 10px 24px; margin-top: 0; background: ${panelPrimaryColor}; border-color: ${panelPrimaryColor};"><i class="fas fa-download mr-2"></i> Download</button>
        </div>
    </div>
    <div style="margin-top: 12px;">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button id="addPrintingToPadBtn" class="btn" onclick="addToQuotePad()" style="flex-grow: 1; width: auto; background-color: var(--success-color); color: white; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">+ Add to Pad</button>
            <button id="copyPrintingInvoiceBtn" class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600" onclick="copyInvoiceText()" style="width: auto; margin-top: 0; padding-top: 6px; padding-bottom: 6px;">Copy</button>
        </div>
        <div class="invoice-copy-area" style="margin-top: 0;">
            <textarea id="invoiceText" readonly rows="6" class="w-full font-mono text-sm border rounded-lg p-3 resize-y bg-[#e9ecef] text-[#495057] border-gray-300 dark:bg-[#1f2937] dark:text-[#e5e7eb] dark:border-gray-600"></textarea>
        </div>
    </div>
</div>`;
  if (lastClickedASize) {
    const presetBtn = document.getElementById(`btn-${lastClickedASize}`);
    if (presetBtn) presetBtn.classList.add('active');
  }
  if (preservedState) {
    restorePrintingCalculatorState(preservedState);
    if (lastClickedASize) {
      const presetBtn = document.getElementById(`btn-${lastClickedASize}`);
      if (presetBtn) presetBtn.classList.add('active');
    }
  }
  const newGridContainer = document.querySelector('.material-grid-container');
  if (newGridContainer) {
    if (category === 'largeFormat') newGridContainer.scrollTop = largeFormatScrollPos;
    if (category === 'signboard') newGridContainer.scrollTop = signboardScrollPos;
    setTimeout(() => {
      const refound = document.querySelector('.material-grid-container');
      if (refound) {
        if (category === 'largeFormat') refound.scrollTop = largeFormatScrollPos;
        if (category === 'signboard') refound.scrollTop = signboardScrollPos;
      }
    }, 0);
  }
  kiraHarga();
  if (document.getElementById('eyeletOption')) {
    updateFinishingOptions();
  }
  attachGridListeners(content);
  initArtworkDragAndDrop();
}

function setASize(sizeName, w_mm, h_mm) {
  window.appModules?.printShell?.setASize?.(sizeName, w_mm, h_mm, createPrintShellContext());
}

function changeUnits(newUnit) {
  window.appModules?.printShell?.changeUnits?.(newUnit, createPrintShellContext());
}

function switchDimensions() {
  window.appModules?.printShell?.switchDimensions?.(createPrintShellContext());
}

// 1. Specific Entry Point for Large Format
function calculateLargeFormat() {
  window.appModules?.printRuntime?.calculateLargeFormat?.(createPrintRuntimeContext());
}

// 2. Specific Entry Point for Signboard
function calculateSignboard() {
  window.appModules?.printRuntime?.calculateSignboard?.(createPrintRuntimeContext());
}

// 3. Router Function (Preserves HTML "oninput" compatibility)
function kiraHarga() {
  window.appModules?.printRuntime?.kiraHarga?.(createPrintRuntimeContext());
}

// 4. The Core Logic Engine (Shared)
function calculatePrintingLogic(materialList, categoryLabel) {
  window.appModules?.printRuntime?.calculatePrintingLogic?.(createPrintRuntimeContext(), materialList, categoryLabel);
}

function toggleCustomBorder() {
  window.appModules?.printRuntime?.toggleCustomBorder?.(createPrintRuntimeContext());
}

function updateFinishingOptions() {
  window.appModules?.printRuntime?.updateFinishingOptions?.(createPrintRuntimeContext());
}

function updatePreview() {
  window.appModules?.printRuntime?.updatePreview?.(createPrintRuntimeContext());
}

function drawPreview(rawW, rawH, unit, w, h, isEx, isSimple, mode = "auto", manual = {}, customBorders = {}) {
  window.appModules?.printRuntime?.drawPreview?.(createPrintRuntimeContext(), rawW, rawH, unit, w, h, isEx, isSimple, mode, manual, customBorders);
}

function createPrintRuntimeContext() {
  return {
    animatePriceTicker,
    autoEyelet,
    changeUnits,
    convertFromMm,
    convertToFeetCalc,
    convertToMm,
    formatCurrency,
    generateUniversalInvoice,
    getArtConfig: () => artConfig,
    getCurrentCategory: () => currentCategory,
    getCurrentCurrency: () => currentCurrency,
    getCurrentInputUnit: () => currentInputUnit,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalEyeletPrice: () => globalEyeletPrice,
    getGlobalGluePrice: () => globalGluePrice,
    getGlobalGovSurchargePercent: () => globalGovSurchargePercent,
    getGlobalPipePrice: () => globalPipePrice,
    getGlobalTaxPercent: () => globalTaxPercent,
    getIsStickerOrPolysilk: () => isStickerOrPolysilk,
    getIsTaxEnabled: () => isTaxEnabled,
    getLastClickedASize: () => lastClickedASize,
    getMaterials: () => materials,
    getPreviousTotalPrice: () => previousTotalPrice,
    getPricePerSqFt: () => pricePerSqFt,
    getSelectedMaterialIndex: () => selectedMaterialIndex,
    getSignboardMaterials: () => signboardMaterials,
    getUploadedArtworkImg: () => uploadedArtworkImg,
    isExceptionSize,
    isGamExemptedSize,
    setIsStickerOrPolysilk: (value) => {
      isStickerOrPolysilk = value;
    },
    setLastUsedDimensions: ({ width, height, unit }) => {
      if (!Number.isNaN(width) && width > 0) {
        lastUsedWidth = width;
      }
      if (!Number.isNaN(height) && height > 0) {
        lastUsedHeight = height;
      }
      lastUsedUnit = unit;
    },
    setPreviousTotalPrice: (value) => {
      previousTotalPrice = value;
    },
    setPricePerSqFt: (value) => {
      pricePerSqFt = value;
    },
    syncStickerDropdownLabel,
  };
}

function downloadLargeFormatSVG() {
  window.appModules?.printExport?.downloadLargeFormatSVG?.(createPrintExportContext());
}

function clearASizeHighlight() {
  window.appModules?.printShell?.clearASizeHighlight?.();
}

function addBusinessCardToPad() {
  window.appModules?.businessCard?.addBusinessCardToPad?.(createBusinessCardModuleContext());
}

function generateBusinessCardPriceListHTML(data, forceAgent = null, compact = false, showHeader = true) {
  return window.appModules?.businessCard?.generateBusinessCardPriceListHTML?.(createBusinessCardModuleContext(), data, forceAgent, compact, showHeader);
}


function openBusinessCardCompareModal() {
  window.appModules?.businessCard?.openBusinessCardCompareModal?.(createBusinessCardModuleContext());
}

function closeBusinessCardCompareModal() {
  window.appModules?.businessCard?.closeBusinessCardCompareModal?.();
}

function attachBusinessCardListeners() {
  window.appModules?.businessCard?.attachBusinessCardListeners?.(createBusinessCardModuleContext());
}

function renderBusinessCardPage(container) {
  window.appModules?.businessCard?.renderBusinessCardPage?.(container, createBusinessCardModuleContext());
}

function createBusinessCardModuleContext() {
  return {
    addItemToQuotePad,
    formatCurrency,
    generateUniversalInvoice,
    getBusinessCardData: () => businessCardData,
    getCurrentCurrency: () => currentCurrency,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalTaxPercent: () => globalTaxPercent,
    getGlobalToggleHTML,
    getIsTaxEnabled: () => isTaxEnabled,
    getSelectedBc: () => selectedBc,
    showToast,
  };
}

function createSublimationContext() {
  return {
    getSublimationData: () => sublimationData,
    setSelectedSublimationQty: (qty) => { selectedSublimationQty = qty; },
    getSelectedSublimationQty: () => selectedSublimationQty,
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    addItemToQuotePad,
    getGlobalToggleHTML,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    showToast,
    getAssetURL,
    getDummyIcon: () => DUMMY_ICON,
  };
}

function createLanyardContext() {
  return {
    getLanyardData: () => lanyardData,
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    addItemToQuotePad,
    getGlobalToggleHTML,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    showToast,
    getAssetURL,
    getDummyIcon: () => DUMMY_ICON,
  };
}

function createIDCardContext() {
  return {
    getIDCardData: () => idCardData,
    getIDCardAddons: () => idCardAddons,
    setIDCardAddons: (arr) => { idCardAddons = arr; },
    getSelectedIdCardQty: () => selectedIdCardQty,
    setSelectedIdCardQty: (qty) => { selectedIdCardQty = qty; },
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    addItemToQuotePad,
    getGlobalToggleHTML,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    showToast,
  };
}

function createAcrylicContext() {
  return {
    getAcrylicPriceTable: () => acrylicPriceTable,
    setAcrylicPriceTable: (val) => { acrylicPriceTable = val; },
    getAcrylicMarkupRules: () => acrylicMarkupRules,
    setAcrylicMarkupRules: (val) => { acrylicMarkupRules = val; },
    getAcrylicState: () => acrylicState,
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    addItemToQuotePad,
    showToast,
    syncStickerDropdownLabel,
    downloadElementAsJPG,
  };
}

function createStampContext() {
  return {
    getStamps: () => stamps,
    getStampCategories: () => stampCategories,
    getStampInkColors: () => stampInkColors,
    getSelectedStampIndex: () => selectedStampIndex,
    setSelectedStampIndex: (idx) => { selectedStampIndex = idx; },
    getStampScrollPos: () => stampScrollPos,
    setStampScrollPos: (pos) => { stampScrollPos = pos; },
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    generateUniversalInvoice,
    addItemToQuotePad,
    showToast,
    attachGridListeners,
    downloadElementAsJPG,
    getGlobalToggleHTML,
  };
}

function createStickerContext() {
  return {
    getGlobalAgentMode: () => globalAgentMode,
    setGlobalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    getMaterials: () => materials,
    addItemToQuotePad,
    showToast,
    applyMainCalcPanelButtonVisual,
  };
}

function createQuotePadContext() {
  return {
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    getIsTaxEnabled: () => isTaxEnabled,
    getGlobalTaxPercent: () => globalTaxPercent,
    showToast,
    showDeleteConfirmationModal,
    formatSavedDate,
  };
}

function createSublimationSettingsContext() {
  return {
    getData: () => sublimationData,
    getEditState: () => sublimationEditState,
    getOriginalData: () => originalSublimationData,
    setOriginalData: (d) => { originalSublimationData = d; },
    replaceData: (d) => {
      sublimationData.basePrices = d.basePrices;
      sublimationData.addons = d.addons;
      sublimationData.extraSizeCost = d.extraSizeCost;
      if (d.agentExtraSizeCost !== undefined) sublimationData.agentExtraSizeCost = d.agentExtraSizeCost;
      globalSublimationData.basePrices = sublimationData.basePrices;
      globalSublimationData.addons = sublimationData.addons;
      globalSublimationData.extraSizeCost = sublimationData.extraSizeCost;
    },
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    getSublimationSizeCost: (size, data, useAgent) => window.appModules?.sublimation?.getSublimationSizeCost?.(size, data, useAgent),
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createInvitationCardSettingsContext() {
  return {
    getData: () => invitationCardData,
    getEditState: () => invitationCardEditState,
    getOriginalData: () => originalInvitationCardData,
    setOriginalData: (d) => { originalInvitationCardData = d; },
    replaceData: (d) => {
      Object.keys(invitationCardData).forEach((key) => { delete invitationCardData[key]; });
      Object.assign(invitationCardData, d);
    },
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    blinkRow,
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createBusinessCardSettingsContext() {
  return {
    getData: () => businessCardData,
    getEditState: () => businessCardEditState,
    getOriginalData: () => originalBusinessCardData,
    setOriginalData: (d) => { originalBusinessCardData = d; },
    replaceData: (d) => {
      Object.keys(businessCardData).forEach((key) => { delete businessCardData[key]; });
      Object.assign(businessCardData, d);
    },
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createLanyardSettingsContext() {
  return {
    getData: () => lanyardData,
    getEditState: () => lanyardEditState,
    getOriginalData: () => originalLanyardData,
    setOriginalData: (d) => { originalLanyardData = d; },
    replaceData: (d) => {
      Object.keys(lanyardData).forEach((key) => { delete lanyardData[key]; });
      Object.assign(lanyardData, d);
    },
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    blinkRow,
    getAssetURL: (assetId) => getAssetURL(assetId),
    getDummyIcon: () => DUMMY_ICON,
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createStampSettingsContext() {
  return {
    getStamps: () => stamps,
    setStamps: (arr) => { stamps = arr; },
    getStampCategories: () => stampCategories,
    setStampCategories: (arr) => { stampCategories = arr; },
    getEditState: () => stampEditState,
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    blinkRow,
    updateSettingsTable: () => updateSettingsTable(),
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createAcrylicSettingsContext() {
  const backups = {};

  return {
    getPriceTable: () => acrylicPriceTable,
    getMarkupRules: () => acrylicMarkupRules,
    getEditState: () => acrylicSettingsEditState,
    getCurrentCurrency: () => currentCurrency,
    replacePriceTable: (d) => { acrylicPriceTable = d; },
    replaceMarkupRules: (d) => { acrylicMarkupRules = d; },
    setBackup: (key, value) => { backups[key] = value; },
    getBackup: (key) => backups[key],
    saveAcrylicSettings: () => saveAcrylicSettings(),
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    getAcrylicBaseLabel: (label) => window.appModules?.acrylic?.getAcrylicBaseLabel?.(label) ?? label,
    formatAcrylicUnitLabel: (name, price) => window.appModules?.acrylic?.formatAcrylicUnitLabel?.(name, price, createAcrylicContext()) ?? `${name} (${formatCurrency(price)})`,
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function createIdCardSettingsContext() {
  return {
    getData: () => idCardData,
    getAddons: () => idCardAddons,
    setAddons: (arr) => { idCardAddons = arr; },
    getEditState: () => idCardEditState,
    getOriginalData: () => originalIdCardData,
    setOriginalData: (d) => { originalIdCardData = d; },
    formatCurrency,
    showToast,
    showDeleteConfirmationModal,
    highlightMoveRow,
    setPendingCallback: (callback) => {
      pendingSaveCallback = callback;
      const modal = document.getElementById('saveConfirmationModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    },
    closeSaveConfirmationModal,
  };
}

function getSublimationBasePrice(qty) {
  return window.appModules?.sublimation?.getSublimationBasePrice?.(qty, createSublimationContext()) ?? 45;
}

// --- 1. DATA MOVED TO GLOBAL SCOPE ---
// Base prices sourced directly from sublimationData â€” no duplication (use getter functions)
function getGlobalSublimationQuantities() { return sublimationData.basePrices; }
function getGlobalSublimationData() {
  return { addons: sublimationData.addons, extraSizeCost: sublimationData.extraSizeCost };
}
// Keep backward compat references (but use functions for live data)
const globalSublimationQuantities = sublimationData.basePrices;

const globalSublimationData = {};
// Reference from sublimationData â€” no duplication
globalSublimationData.addons = sublimationData.addons;
globalSublimationData.extraSizeCost = sublimationData.extraSizeCost;
globalSublimationData.basePrices = sublimationData.basePrices;

// --- 2. NEW HANDLER FUNCTION ---
function handleSublimationCustomQtyChange() {
  window.appModules?.sublimation?.handleSublimationCustomQtyChange?.(createSublimationContext());
}

function generateSublimationVariationsHTML(data) {
  return window.appModules?.sublimation?.generateSublimationVariationsHTML?.(data, createSublimationContext()) ?? '';
}

function generateSublimationPriceListHTML(data, quantities, sizes, forceAgent = null, compact = false, showHeader = true) {
  return window.appModules?.sublimation?.generateSublimationPriceListHTML?.(data, quantities, sizes, forceAgent, compact, showHeader, createSublimationContext()) ?? '';
}
function openSublimationCompareModal() {
  window.appModules?.sublimation?.openSublimationCompareModal?.(createSublimationContext());
}

function closeSublimationCompareModal() {
  window.appModules?.sublimation?.closeSublimationCompareModal?.();
}

function attachSublimationListeners(data) {
  window.appModules?.sublimation?.attachSublimationListeners?.(createSublimationContext());
}

function renderSublimationCalculator(container) {
  window.appModules?.sublimation?.renderSublimationCalculator?.(container, createSublimationContext());
}

function kiraSublimation(sublimationData) {
  window.appModules?.sublimation?.kiraSublimation?.(createSublimationContext());
}

function addSublimationToPad(sublimationData) {
  window.appModules?.sublimation?.addSublimationToPad?.(createSublimationContext());
}

function generateLanyardAddonsHTML(addons) {
  return window.appModules?.lanyard?.generateLanyardAddonsHTML?.(addons, createLanyardContext()) ?? '';
}

function generateLanyardPriceListHTML(data, forceAgent = null, compact = false, showHeader = true) {
  return window.appModules?.lanyard?.generateLanyardPriceListHTML?.(data, forceAgent, compact, showHeader, createLanyardContext()) ?? '';
}

function attachLanyardListeners() {
  window.appModules?.lanyard?.attachLanyardListeners?.(createLanyardContext());
}

function renderLanyardCalculator(container) {
  window.appModules?.lanyard?.renderLanyardCalculator?.(container, createLanyardContext());
}

function openLanyardCompareModal() {
  window.appModules?.lanyard?.openLanyardCompareModal?.(createLanyardContext());
}

function closeLanyardCompareModal() {
  window.appModules?.lanyard?.closeLanyardCompareModal?.();
}

function renderIDCardCalculator(container) {
  window.appModules?.idCard?.renderIDCardCalculator?.(container, createIDCardContext());
}

function getIDCUnitPrice(qty, side = '1') {
  return window.appModules?.idCard?.getIDCUnitPrice?.(qty, side, createIDCardContext()) ?? 0;
}

function handleIdCardCustomQtyChange() {
  window.appModules?.idCard?.handleIdCardCustomQtyChange?.(createIDCardContext());
}

function getSelectedIDCardAddonData() {
  return window.appModules?.idCard?.getSelectedIDCardAddonData?.(createIDCardContext()) ?? { selections: [], totalCost: 0 };
}

function kiraIdCard() {
  window.appModules?.idCard?.kiraIdCard?.(createIDCardContext());
}

function addIdCardToPad() {
  window.appModules?.idCard?.addIdCardToPad?.(createIDCardContext());
}

function copyIdCardInvoice() {
  window.appModules?.idCard?.copyIdCardInvoice?.(createIDCardContext());
}

function generateIDCardPriceListHTML(forceAgent = null, showHeader = true) {
  return window.appModules?.idCard?.generateIDCardPriceListHTML?.(forceAgent, showHeader, createIDCardContext()) ?? '';
}

function openIDCardCompareModal() {
  window.appModules?.idCard?.openIDCardCompareModal?.(createIDCardContext());
}

function closeIDCardCompareModal() {
  window.appModules?.idCard?.closeIDCardCompareModal?.();
}

function attachIDCardListeners() {
  window.appModules?.idCard?.attachIDCardListeners?.(createIDCardContext());
}

function addLanyardToPad() {
  window.appModules?.lanyard?.addLanyardToPad?.(createLanyardContext());
}

function handleLanyardCustomQtyChange() {
  window.appModules?.lanyard?.handleLanyardCustomQtyChange?.(createLanyardContext());
}

function getLanyardPriceTierIndex(customQty) {
  return window.appModules?.lanyard?.getLanyardPriceTierIndex?.(customQty, createLanyardContext()) ?? 0;
}

function kiraLanyard() {
  window.appModules?.lanyard?.kiraLanyard?.(createLanyardContext());
}

function addInvitationCardToPad() {
  window.appModules?.invitationCard?.addInvitationCardToPad?.(createInvitationCardModuleContext());
}

function generateInvitationPriceListHTML(data, forceAgent = null, showHeader = true) {
  return window.appModules?.invitationCard?.generateInvitationPriceListHTML?.(createInvitationCardModuleContext(), data, forceAgent, showHeader);
}

function openInvitationCompareModal() {
  window.appModules?.invitationCard?.openInvitationCompareModal?.(createInvitationCardModuleContext());
}

function closeInvitationCompareModal() {
  window.appModules?.invitationCard?.closeInvitationCompareModal?.();
}

function attachInvitationListeners() {
  window.appModules?.invitationCard?.attachInvitationListeners?.(createInvitationCardModuleContext());
}

function handleInvCardCustomQtyChange() {
  window.appModules?.invitationCard?.handleInvCardCustomQtyChange?.(createInvitationCardModuleContext());
}

function getInvitationPriceTier(customQty) {
  return window.appModules?.invitationCard?.getInvitationPriceTier?.(createInvitationCardModuleContext(), customQty);
}

function kiraInvitationCard() {
  window.appModules?.invitationCard?.kiraInvitationCard?.(createInvitationCardModuleContext());
}

function renderInvitationCardCalculator(container) {
  window.appModules?.invitationCard?.renderInvitationCardCalculator?.(container, createInvitationCardModuleContext());
}

function createInvitationCardModuleContext() {
  return {
    addItemToQuotePad,
    formatCurrency,
    generateUniversalInvoice,
    getCurrentCurrency: () => currentCurrency,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalTaxPercent: () => globalTaxPercent,
    getGlobalToggleHTML,
    getInvitationCardData: () => invitationCardData,
    getIsTaxEnabled: () => isTaxEnabled,
    getSelectedInvCardAddons: () => selectedInvCardAddons,
    getSelectedInvCardMaterial: () => selectedInvCardMaterial,
    setSelectedInvCardAddon: (addonIndex, optionIndex) => {
      selectedInvCardAddons[addonIndex] = optionIndex;
    },
    setSelectedInvCardMaterial: (materialIndex) => {
      selectedInvCardMaterial = materialIndex;
    },
    showToast,
  };
}

// --- START: SETTINGS PAGE HELPER FUNCTIONS (Fix #5) ---

function getSettingsTabsHTML() {
  return `
    <div class="mb-4 border-b border-gray-200 dark:border-gray-700 mx-auto" style="max-width: 1200px; margin-left: auto; margin-right: auto;">
        <ul class="flex flex-wrap -mb-px text-sm font-medium text-center" id="settingsTab" role="tablist">
            <li class="me-2" role="presentation">
                <button class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg gap-2" data-tab-target="#general" type="button" role="tab">
                    <i class="fas fa-cog"></i> General
                </button>
            </li>
            <li class="me-2" role="presentation">
                <button class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg gap-2" data-tab-target="#pricing" type="button" role="tab">
                    <i class="fas fa-dollar-sign"></i> Material Pricing
                </button>
            </li>
            <li class="me-2" role="presentation">
                <button class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg gap-2" data-tab-target="#exceptions" type="button" role="tab">
                    <i class="fas fa-shield-alt"></i> Exceptions
                </button>
            </li>
            <li class="me-2" role="presentation">
                <button class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg gap-2" data-tab-target="#data" type="button" role="tab">
                    <i class="fas fa-database"></i> Data & Backup
                </button>
            </li>
            <li role="presentation">
                <button class="inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg gap-2" data-tab-target="#about" type="button" role="tab">
                    <i class="fas fa-info-circle"></i> About
                </button>
            </li>
        </ul>
    </div>`;
}

function getGeneralSettingsHTML() {
  return `
    <div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="general" role="tabpanel">
        <div class="settings-panel" style="margin-top:0;">
            
            <div>
                <h4>Currency Settings</h4>
                <p class="text-gray-600 dark:text-gray-400 mb-2">Select the currency to be used across all calculators.</p>
                <div class="flex items-center gap-4">
                    <div class="flex items-center p-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                        <img src="https://flagcdn.com/w20/${currentCurrency.country_code}.png" class="mr-3 rounded-sm" alt="${currentCurrency.name} flag">
                        <span>${currentCurrency.name} (${currentCurrency.symbol} - ${currentCurrency.code})</span>
                    </div>
                    <button class="btn btn-secondary" style="width: auto; padding: 10px 20px;" onclick="openCurrencyModal()">Change</button>
                </div>
            </div>

            <div class="mt-8 pt-6 border-t dark:border-gray-700"> <h4>Global Prices</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div><label>Eyelet Price (${currentCurrency.symbol}/pcs):</label><input type="number" id="globalEyeletPrice" step="0.01" value="${globalEyeletPrice.toFixed(2)}"/><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">*Price for each eyelet/hole</p></div>
                    <div><label>Glue Price (${currentCurrency.symbol}/ft):</label><input type="number" id="globalGluePrice" step="0.01" value="${globalGluePrice.toFixed(2)}"/><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">*Price calculate Width + Height = $XX</p></div>
                    <div><label>Pipe Price (${currentCurrency.symbol}/ft):</label><input type="number" id="globalPipePrice" step="0.01" value="${globalPipePrice.toFixed(2)}"/><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">*Price calculate based on width only</p></div>
                </div>
            </div>

            <div class="mt-8 pt-6 border-t dark:border-gray-700"> <h4>Tax & Surcharges</h4>
                <div class="flex items-center justify-between">
                    <div><label for="taxToggle" class="font-bold text-lg">Enable Tax</label><p class="text-sm text-gray-500 dark:text-gray-400">Apply a global tax to all final calculations.</p></div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="taxToggle" class="sr-only peer" ${isTaxEnabled ? 'checked' : ''} onchange="document.getElementById('taxPercentInput').style.display = this.checked ? 'block' : 'none'">
                        <div class="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                <div id="taxPercentInput" style="display: ${isTaxEnabled ? 'block' : 'none'}; margin-top: 1rem;">
                    <label for="globalTaxPercent">Tax Rate (%):</label>
                    <input type="number" id="globalTaxPercent" step="0.1" value="${globalTaxPercent}" class="max-w-xs">
                </div>
                <div class="mt-6 pt-4 border-t dark:border-gray-700">
                        <label for="globalGovSurcharge" class="font-bold text-lg">Government Surcharge</label>
                        <input type="number" id="globalGovSurcharge" step="1" value="${globalGovSurchargePercent}" class="max-w-xs mt-2" />
                </div>
            </div>

            <div class="mt-8 pt-6 border-t dark:border-gray-700"> <h4>Kiosk Mode (Customer-Facing)</h4>
                <p class="text-gray-600 dark:text-gray-400 mb-4">When "On", this mode hides sensitive controls like the Agent/Customer price toggle.</p>
                <div class="size-btn-group" id="kioskModeToggle" style="max-width: 400px;">
                    <button id="btnKioskOff" class="btn size-btn"><i class="fas fa-user-shield mr-2"></i> Kiosk Mode OFF</button>
                    <button id="btnKioskOn" class="btn size-btn"><i class="fas fa-eye mr-2"></i> Kiosk Mode ON</button>
                </div>
            </div>

            <div class="mt-8 pt-6 border-t dark:border-gray-700 flex justify-end">
                <button id="applyGlobalPrices" class="btn btn-secondary" style="width: auto; padding: 10px 20px; margin-top: 0;">Save General Settings</button>
            </div>
        </div>
    </div>`;
}

function getPricingSettingsHTML() {
  return `
    <div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="pricing" role="tabpanel">
        <div class="settings-panel" style="margin-top:0;">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h4 class="mb-0">Material & Rate Management</h4>
                <div class="flex items-center gap-3">
                    <label class="inline-flex items-center cursor-pointer bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                        <span class="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">Show in Menu</span>
                        <input type="checkbox" id="categoryVisibilityToggle" class="sr-only peer" onchange="toggleCurrentCategoryVisibility()">
                        <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>

            <div class="flex gap-2 mb-4">
                <button id="prevCategoryBtn" class="btn btn-secondary" onclick="navigateCategory(-1)" style="width: auto; padding: 10px 14px; margin-top:0;" title="Previous Page"><i class="fas fa-chevron-left"></i></button>
                <div class="custom-sticker-dropdown flex-grow" id="settingsCategoryWrapper" style="margin-bottom: 0;">
                    <div class="custom-sticker-dropdown-trigger" onclick="toggleSettingsCategoryDropdown(event)">
                        <span class="custom-sticker-dropdown-label" id="settingsCategoryLabel">Large Format</span>
                        <i class="fas fa-chevron-down custom-sticker-dropdown-arrow"></i>
                    </div>
                    <div class="custom-sticker-dropdown-list" id="settingsCategoryList">
                        <div class="custom-sticker-dropdown-option selected" data-value="largeFormat" onclick="selectSettingsCategoryOption('largeFormat')">Large Format</div>
                        <div class="custom-sticker-dropdown-option" data-value="signboard" onclick="selectSettingsCategoryOption('signboard')">Signboard</div>
                        <div class="custom-sticker-dropdown-option" data-value="stand" onclick="selectSettingsCategoryOption('stand')">Stand</div>
                        <div class="custom-sticker-dropdown-option" data-value="sublimation" onclick="selectSettingsCategoryOption('sublimation')">Sublimation</div>
                        <div class="custom-sticker-dropdown-option" data-value="invitationCard" onclick="selectSettingsCategoryOption('invitationCard')">Invitation Card</div>
                        <div class="custom-sticker-dropdown-option" data-value="businessCard" onclick="selectSettingsCategoryOption('businessCard')">Business Card</div>
                        <div class="custom-sticker-dropdown-option" data-value="idCard" onclick="selectSettingsCategoryOption('idCard')">ID Card</div>
                        <div class="custom-sticker-dropdown-option" data-value="lanyard" onclick="selectSettingsCategoryOption('lanyard')">Lanyard</div>
                        <div class="custom-sticker-dropdown-option" data-value="dtf" onclick="selectSettingsCategoryOption('dtf')">DTF &amp; UVDTF</div>
                        <div class="custom-sticker-dropdown-option" data-value="stamp" onclick="selectSettingsCategoryOption('stamp')">Stamp</div>
                        <div class="custom-sticker-dropdown-option" data-value="stickerLayout" onclick="selectSettingsCategoryOption('stickerLayout')">Sticker Layout</div>
                        <div class="custom-sticker-dropdown-option" data-value="acrylicCalculator" onclick="selectSettingsCategoryOption('acrylicCalculator')">Acrylic Calculator</div>
                        <div class="custom-sticker-dropdown-option" data-value="giftItem" onclick="selectSettingsCategoryOption('giftItem')">Gift Item</div>
                        <div class="custom-sticker-dropdown-option" data-value="asset" onclick="selectSettingsCategoryOption('asset')">Asset Library</div>
                        <div class="custom-sticker-dropdown-option" data-value="loadQuote" onclick="selectSettingsCategoryOption('loadQuote')">Load Quote</div>
                    </div>
                    <select id="categorySelect" onchange="updateSettingsPage()" style="display:none;">
                        <option value="largeFormat" selected>Large Format</option>
                        <option value="signboard">Signboard</option>
                        <option value="stand">Stand</option>
                        <option value="sublimation">Sublimation</option>
                        <option value="invitationCard">Invitation Card</option>
                        <option value="businessCard">Business Card</option>
                        <option value="idCard">ID Card</option>
                        <option value="lanyard">Lanyard</option>
                        <option value="dtf">DTF &amp; UVDTF</option>
                        <option value="stamp">Stamp</option>
                        <option value="stickerLayout">Sticker Layout</option>
                        <option value="acrylicCalculator">Acrylic Calculator</option>
                        <option value="giftItem">Gift Item</option>
                        <option value="asset">Asset Library</option>
                        <option value="loadQuote">Load Quote</option>
                    </select>
                </div>
                <button id="nextCategoryBtn" class="btn btn-secondary" onclick="navigateCategory(1)" style="width: auto; padding: 10px 14px; margin-top:0;" title="Next Page"><i class="fas fa-chevron-right"></i></button>
            </div>
            
            <div id="settingsTableDiv" style="overflow-x: auto; margin-top: 1rem;"></div>
            <div id="addMaterialForm" style="display: none;">
                <h3 id="formTitle">Add New Material</h3>
                <label for="materialName">Name:</label><input type="text" id="materialName"/>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div><label for="customerPrice">Customer Price (${currentCurrency.symbol}):</label><input type="number" id="customerPrice" step="0.01"/></div>
                    <div><label for="agentPrice">Agent Price (${currentCurrency.symbol}):</label><input type="number" id="agentPrice" step="0.01"/></div>
                </div>
                <div id="extraFields"></div>
                <button class="btn btn-primary" onclick="saveMaterial()"><span id="saveButtonLabel">Add Material</span></button>
            </div>
        </div>
    </div>`;
}


function getExceptionsSettingsHTML() {
  return `
    <div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="exceptions" role="tabpanel">
            <div class="settings-panel" style="margin-top:0;">
            <h2 class="text-xl font-bold mb-4">Exception Rules</h2>
            <div id="glue-exception-heading">
                <button type="button" class="flex items-center justify-between w-full font-bold text-lg text-left text-gray-700 dark:text-gray-400 custom-accordion-toggle" data-accordion-target="#glue-exception-content">
                    <span>Free Glue Exception Sizes</span>
                    <svg class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/></svg>
                </button>
                <div id="glue-exception-content" class="hidden" style="transition: max-height 0.3s ease-out; max-height: 0; overflow: hidden;">
                    <p class="text-sm text-gray-500 my-4 dark:text-gray-400">Define sizes (in feet) exempt from glue charges.</p>
                    <div id="glueExceptionTableContainer"></div>
                    <div class="flex items-end gap-4 mt-4">
                        <div><label>Width (ft):</label><input type="number" id="glueExceptionW" step="0.1" class="p-2"/></div>
                        <div><label>Height (ft):</label><input type="number" id="glueExceptionH" step="0.1" class="p-2"/></div>
                        <button class="btn btn-secondary btn-sm" style="width: auto; margin: 0 0 4px 0;" onclick="addGlueExceptionSize()">Add Size</button>
                    </div>
                </div>
            </div>
            <div class="mt-6 pt-4 border-t dark:border-gray-700">
                <h2 id="eyelet-exception-heading">
                    <button type="button" class="flex items-center justify-between w-full font-bold text-lg text-left text-gray-700 dark:text-gray-400 custom-accordion-toggle" data-accordion-target="#eyelet-exception-content">
                        <span>Auto Eyelet Exception Sizes</span>
                        <svg class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/></svg>
                    </button>
                </h2>
                <div id="eyelet-exception-content" class="hidden" style="transition: max-height 0.3s ease-out; max-height: 0; overflow: hidden;">
                    <p class="text-sm text-gray-500 my-4 dark:text-gray-400">Define sizes (in feet) that should receive a fixed number of 4 eyelets automatically.</p>
                    <div id="eyeletExceptionTableContainer"></div>
                    <div class="flex items-end gap-4 mt-4">
                        <div><label>Width (ft):</label><input type="number" id="eyeletExceptionW" step="0.1" class="p-2"/></div>
                        <div><label>Height (ft):</label><input type="number" id="eyeletExceptionH" step="0.1" class="p-2"/></div>
                        <button class="btn btn-secondary btn-sm" style="width: auto; margin: 0 0 4px 0;" onclick="addEyeletExceptionSize()">Add Size</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

function getDataSettingsHTML() {
  return `
    <div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="data" role="tabpanel">
        <div class="settings-panel" style="margin-top:0;">
            <h4>Data Management</h4>
            <p class="text-gray-600 dark:text-gray-400">Export all your current pricing and settings to a JSON file.</p>
            <div class="flex gap-4 mt-4">
                <button class="btn btn-secondary" style="width: auto;" onclick="exportSettings()"><i class="fas fa-file-export mr-2"></i> Export Settings</button>
                <button class="btn btn-secondary" style="width: auto;" onclick="importSettings()"><i class="fas fa-file-import mr-2"></i> Import Settings</button>
            </div>
            
            <h4 class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">Price List Backup</h4>
            <p class="text-gray-600 dark:text-gray-400">Download a multi-sheet Excel file of your core material, stand, and stamp prices.</p>
            <div class="flex gap-4 mt-4">
                <button class="btn btn-primary" style="width: auto;" onclick="exportMaterialPricesToExcel()"><i class="fas fa-file-excel mr-2"></i> Download Price List (Excel)</button>
            </div>
            <div class="mt-4 p-3 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-700 dark:text-yellow-300" role="alert">
                <span class="font-medium">Warning:</span> Importing a file will overwrite all your existing settings.
            </div>
            <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h2 id="reset-heading">
                    <button type="button" class="flex items-center justify-between w-full font-bold text-lg text-left text-red-500 custom-accordion-toggle" data-accordion-target="#reset-content">
                        <span>RESET DATA</span>
                        <svg class="w-3 h-3 rotate-180 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5 5 1 1 5"/></svg>
                    </button>
                </h2>
                <div id="reset-content" class="hidden" style="transition: max-height 0.3s ease-out; max-height: 0; overflow: hidden;">
                    <div class="mt-4 p-3 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-700 dark:text-red-400" role="alert">
                        <span class="font-medium">Warning:</span> Reverts to original developer hardcoded values.
                    </div>
                    <button class="btn btn-danger" style="width: auto; padding: 10px 20px; margin-top: 16px;" onclick="resetToHardcode()">Reset To Original</button>
                </div>
            </div>
        </div>
    </div>`;
}

function getAboutSettingsHTML() {
  return `
    <div class="hidden p-4 rounded-lg bg-gray-50 dark:bg-gray-800" id="about" role="tabpanel">
        <div class="settings-panel" style="margin-top:0;">
            <h4>About This Application</h4>
            <p class="text-gray-600 dark:text-gray-400">Custom-built tool for printing calculations.</p>
            <h4 class="mt-6">Terms of Use</h4>
            <p class="text-gray-600 dark:text-gray-400">Prices generated are for estimation purposes only.</p>
            <h4 class="mt-6">Data Storage</h4>
            <p class="text-gray-600 dark:text-gray-400">Data is stored locally in your browser. Please export backups regularly.</p>
            <h4 class="mt-6">Contact</h4>
            <p class="text-gray-600 dark:text-gray-400">Email: starverzdesign@gmail.com</p>
        </div>
    </div>`;
}

function attachSettingsListeners() {
  // 1. Tab Switching Logic
  const activeClasses = ['text-blue-600', 'dark:text-blue-500', 'border-blue-600', 'dark:border-blue-500'];
  const inactiveClasses = ['text-gray-500', 'dark:text-gray-400', 'border-transparent', 'hover:border-gray-300', 'dark:hover:text-gray-300'];
  const tabButtons = document.querySelectorAll('#settingsTab button');
  const tabContents = document.querySelectorAll('#settingsTabContent > div');

  const showTab = (targetId) => {
    tabContents.forEach(content => {
      if ('#' + content.id === targetId) content.classList.remove('hidden');
      else content.classList.add('hidden');
    });
    tabButtons.forEach(button => {
      if (button.dataset.tabTarget === targetId) {
        button.classList.add(...activeClasses);
        button.classList.remove(...inactiveClasses);
      } else {
        button.classList.remove(...activeClasses);
        button.classList.add(...inactiveClasses);
      }
    });
  };

  tabButtons.forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.tabTarget));
  });

  // 2. Accordion Logic
  document.querySelectorAll('.custom-accordion-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.accordionTarget;
      const targetContent = document.querySelector(targetId);
      const icon = button.querySelector('svg');
      if (targetContent) {
        if (targetContent.classList.contains('hidden')) {
          targetContent.classList.remove('hidden');
          setTimeout(() => {
            targetContent.style.maxHeight = targetContent.scrollHeight + "px";
            if (icon) icon.style.transform = 'rotate(0deg)';
          }, 10);
        } else {
          targetContent.style.maxHeight = '0';
          if (icon) icon.style.transform = 'rotate(180deg)';
          targetContent.addEventListener('transitionend', () => {
            targetContent.classList.add('hidden');
          }, { once: true });
        }
      }
    });
  });

  // 3. Save General Settings Button
  document.getElementById('applyGlobalPrices').addEventListener('click', () => {
    globalGovSurchargePercent = parseFloat(document.getElementById('globalGovSurcharge').value) || 0;
    isTaxEnabled = document.getElementById('taxToggle').checked;
    globalTaxPercent = parseFloat(document.getElementById('globalTaxPercent').value) || 0;
    localStorage.setItem('isTaxEnabled', isTaxEnabled);
    localStorage.setItem('globalTaxPercent', globalTaxPercent);
    globalEyeletPrice = parseFloat(document.getElementById('globalEyeletPrice').value) || 0;
    globalGluePrice = parseFloat(document.getElementById('globalGluePrice').value) || 0;
    globalPipePrice = parseFloat(document.getElementById('globalPipePrice').value) || 0;
    
    // Kiosk Mode Save Logic
    isKioskMode = document.getElementById('btnKioskOn').classList.contains('active');
    localStorage.setItem('isKioskMode', isKioskMode);

    if (isKioskMode) {
      globalAgentMode = false;
      if (['largeFormat', 'signboard', 'stand'].includes(currentCategory)) {
        setGlobalAgentMode(false, currentCategory);
      }
    }
    applyKioskModeStyling();
    showToast('General settings saved!');
  });

  // 4. Kiosk Toggle Buttons
  const kioskToggle = document.getElementById('kioskModeToggle');
  if (kioskToggle) {
    const btnOn = document.getElementById('btnKioskOn');
    const btnOff = document.getElementById('btnKioskOff');
    // Initial state
    if (isKioskMode) {
      btnOn.classList.add('active');
      btnOff.classList.remove('active');
    } else {
      btnOff.classList.add('active');
      btnOn.classList.remove('active');
    }
    // Listener
    kioskToggle.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        const clickedButton = e.target.closest('button');
        btnOn.classList.remove('active');
        btnOff.classList.remove('active');
        clickedButton.classList.add('active');
      }
    });
  }
}

function renderSettingsPage(container) {
  try {
    let html = `<h2 class="mx-auto" style="max-width: 1200px; margin-left: auto; margin-right: auto; padding: 0 1rem;">Settings</h2>`;

    // 1. Build Page from Helpers
    html += getSettingsTabsHTML();
    html += `<div id="settingsTabContent" class="mx-auto" style="max-width: 1200px;">`;
    html += getGeneralSettingsHTML();
    html += getPricingSettingsHTML();
    html += getExceptionsSettingsHTML();
    html += getDataSettingsHTML();
    html += getAboutSettingsHTML();
    html += `</div>`;

    container.innerHTML = html;

    // 2. Attach Listeners & Init Logic
    attachSettingsListeners();

    // 3. Initialize Specific Sections (Must happen after HTML is in DOM)
    // Default Tab
    const defaultTabBtn = document.querySelector('button[data-tab-target="#pricing"]');
    if (defaultTabBtn) defaultTabBtn.click(); // This triggers the showTab logic inside listeners

    // Initialize Tables
    updateSettingsPage();
    renderGlueExceptionTable();
    renderEyeletExceptionTable();
  } catch (err) {
    console.error("Critical Settings Error:", err);
    container.innerHTML = `
            <div class="p-8 text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h2 class="text-red-700 dark:text-red-400">Settings Load Failed</h2>
                <p class="text-sm text-red-600 dark:text-red-300 mt-2 mb-6">The environment timed out or encountered an execution error. This can happen in AI Studio if the script is very long.</p>
                <button class="btn btn-primary" style="width: auto;" onclick="loadPage('home')">Return Home</button>
            </div>
        `;
  }
}
// --- END: SETTINGS PAGE HELPER FUNCTIONS ---

/**
 * Helper function to create a single worksheet from a material array, including column widths.
 * Handles specialized sheets for complex calculators (Lanyard, Inv Card, etc.).
 * * @param {string} sheetName - Name of the worksheet (e.g., 'Large Format', 'Lanyard')
 * @param {Array|Object} sourceData - The source array (e.g., materials, lanyardData)
 * @param {string} priceField - The unit for pricing (e.g., '/sq ft', '/pcs', '')
 * @returns {Object} A worksheet object including the '!cols' property for column widths.
 */
function _createWorksheet(sheetName, sourceData, priceField = "/sq ft") {
  let sheetData = [];
  let defaultColWidths = [{ wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];

  // --- 1. HANDLE BASIC SHEETS (Large Format, Signboard, Stand, Stamp, Gift Item) ---
  if (sheetName === 'Large Format' || sheetName === 'Signboard' || sheetName === 'Stand' || sheetName === 'Stamp' || sheetName === 'Gift Item') {
    const dataArray = Array.isArray(sourceData) ? sourceData : sourceData.items; // Fallback if needed
    let header = ["#", "Material Name", `Customer Price (${currentCurrency.symbol})`, `Agent Price (${currentCurrency.symbol})`];
    if (sheetName === 'Large Format' || sheetName === 'Signboard') {
      header.push("Simple Material");
    }
    sheetData.push(header);

    dataArray.forEach((item, index) => {
      let row = [
        index + 1,
        item.name,
        `${item.customerPrice.toFixed(2)} ${priceField}`,
        `${item.agentPrice.toFixed(2)} ${priceField}`
      ];

      if (sheetName === 'Large Format' || sheetName === 'Signboard') {
        row.push(item.simple ? "Yes" : "No");
      }
      sheetData.push(row);
    });
  }

  // --- 2. HANDLE LANYARD (Tiered Pricing & Addons) ---
  else if (sheetName === 'Lanyard') {
    const sizes = sourceData.sizes.map(s => s.label);
    let header = ["QTY"];
    sizes.forEach(s => { header.push(`${s} - 1 Side`); header.push(`${s} - 2 Side`); });
    sheetData.push(header);

    sourceData.quantities.forEach(qty => {
      let row = [qty + " pcs"];
      sizes.forEach(size => {
        row.push(sourceData.prices[size]?.[qty]?.[1]?.toFixed(2) || '0.00');
        row.push(sourceData.prices[size]?.[qty]?.[2]?.toFixed(2) || '0.00');
      });
      sheetData.push(row);
    });

    sheetData.push(["", "", "", ""]);
    sheetData.push(["ADD-ONS & EXTRAS (Per Piece)"]);
    sheetData.push(["Add-on Type", "Option Name", "Additional Cost"]);
    sourceData.addons.forEach(addon => {
      addon.options.forEach(opt => {
        sheetData.push([addon.name, opt.name, opt.cost.toFixed(2)]);
      });
    });
    defaultColWidths = [{ wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  }

  // --- 3. HANDLE SUBLIMATION (Base Price & Size Cost & Addons) ---
  else if (sheetName === 'Sublimation') {
    const data = sourceData.data; // Passed sublimationData (which contains basePrices, extraSizeCost, addons)

    sheetData.push(["BASE PRICE PER PIECE"]);
    sheetData.push(["Min. Qty", `Price (${currentCurrency.symbol})`]);
    // âœ… CORRECTED LINE: Ensure we are accessing the 'qty' and 'price' properties of the basePrices objects
    data.basePrices.forEach(p => sheetData.push([p.qty, p.price.toFixed(2)]));

    sheetData.push(["", ""]);
    sheetData.push(["EXTRA SIZE COST PER PIECE"]);
    sheetData.push(["Size", `Customer (${currentCurrency.symbol})`, `Agent (${currentCurrency.symbol})`]);
    Object.entries(data.extraSizeCost).forEach(([size, entry]) => {
      const custCost = typeof entry === 'object' ? (entry.customerPrice || 0) : entry;
      const agentCost = typeof entry === 'object' ? (entry.agentPrice !== undefined ? entry.agentPrice : custCost) : entry;
      sheetData.push([size, custCost.toFixed(2), agentCost.toFixed(2)]);
    });

    sheetData.push(["", ""]);
    sheetData.push(["ADD-ONS & VARIATIONS"]);
    sheetData.push(["Category", "Option Name", "Additional Cost"]);
    data.addons.forEach(addon => {
      addon.options.forEach(opt => {
        sheetData.push([addon.name, opt.name, opt.customerPrice.toFixed(2)]);
      });
    });

    // Define specific column widths for the Sublimation sheet
    defaultColWidths = [{ wch: 15 }, { wch: 20 }, { wch: 25 }];
  }

  // --- 4. HANDLE BUSINESS CARD (Material Tiered) ---
  else if (sheetName === 'Business Card') {
    const data = sourceData.data;
    let header = ["Material Name"];
    data.quantities.forEach(q => { header.push(`${q.label} - 1 Side`); header.push(`${q.label} - 2 Side`); });
    sheetData.push(header);

    data.materials.forEach((mat, matIdx) => {
      let row = [mat.name];
      data.quantities.forEach((q, idx) => {
        const p1Val = mat.prices.customerPrice.p1[idx] || 0;
        const p2Val = mat.prices.customerPrice.p2[idx] || 0;
        row.push(p1Val.toFixed(2));
        row.push(p2Val.toFixed(2));
      });
      sheetData.push(row);
    });

    sheetData.push(["", "", "", ""]);
    sheetData.push(["ADD-ONS (Per Box)"]);
    sheetData.push(["Add-on Type", "Option Name", `Customer Price (${currentCurrency.symbol})`, `Agent Price (${currentCurrency.symbol})`]);
    data.addons.forEach(addon => {
      addon.options.forEach(opt => {
        sheetData.push([addon.name, opt.name || opt.label, opt.customerPrice.toFixed(2), opt.agentPrice.toFixed(2)]);
      });
    });
    defaultColWidths = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  }

  // --- 5. HANDLE INVITATION CARD (Base Price Matrix) ---
  else if (sheetName === 'Invitation Card') {
    const data = sourceData.data;
    let baseHeader = ["QTY"];
    data.sizes.forEach(s => { baseHeader.push(`${s} - 1 Side`); baseHeader.push(`${s} - 2 Side`); });
    sheetData.push(["BASE PRICE (Simili 80gsm)"]);
    sheetData.push(baseHeader);
    data.quantities.forEach(qty => {
      let row = [qty + " pcs"];
      data.sizes.forEach(size => {
        row.push(data.basePrice[size]?.[qty]?.[1]?.toFixed(2) || '0.00');
        row.push(data.basePrice[size]?.[qty]?.[2]?.toFixed(2) || '0.00');
      });
      sheetData.push(row);
    });

    sheetData.push(["", "", "", ""]);
    sheetData.push(["MATERIAL ADD-ONS (Per Piece)"]);
    sheetData.push(["Material Name", ...data.sizes]);
    data.materials.forEach(mat => {
      let row = [mat.name];
      data.sizes.forEach(size => {
        row.push(mat.addOn[size]?.customerPrice?.toFixed(2) || '0.00');
      });
      sheetData.push(row);
    });

    sheetData.push(["", "", "", ""]);
    sheetData.push(["FINISHING ADD-ONS (Per Piece)"]);
    data.addons.forEach(addon => {
      addon.options.forEach(opt => {
        let row = [addon.name + " - " + opt.name];
        data.sizes.forEach(size => {
          row.push(opt.prices[size]?.customerPrice?.toFixed(2) || '0.00');
        });
        sheetData.push(row);
      });
    });
    defaultColWidths = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  }

  // --- 6. HANDLE ID CARD (Rate Card) ---
  else if (sheetName === 'ID Card') {
    // Export 1-sided pricing
    sheetData.push(["UNIT PRICE BY QUANTITY - 1-SIDED (Standard PVC)"]);
    sheetData.push(["Min. Qty", `Customer Price (${currentCurrency.symbol})`, `Agent Price (${currentCurrency.symbol})`]);
    idCardData.quantities.forEach(qty => {
      const priceObj = idCardData.basePrice['1'][qty];
      sheetData.push([qty, priceObj.customerPrice.toFixed(2), priceObj.agentPrice.toFixed(2)]);
    });
    
    // Export 2-sided pricing
    sheetData.push(["", ""]);
    sheetData.push(["UNIT PRICE BY QUANTITY - 2-SIDED (Standard PVC)"]);
    sheetData.push(["Min. Qty", `Customer Price (${currentCurrency.symbol})`, `Agent Price (${currentCurrency.symbol})`]);
    idCardData.quantities.forEach(qty => {
      const priceObj = idCardData.basePrice['2'][qty];
      sheetData.push([qty, priceObj.customerPrice.toFixed(2), priceObj.agentPrice.toFixed(2)]);
    });

    sheetData.push(["", ""]);
    sheetData.push(["ID CARD EXTRAS"]);
    sheetData.push(["Extra", "Customer Price (${currentCurrency.symbol})", "Agent Price (${currentCurrency.symbol})"]);
    sheetData.push(["Punch Hole", idCardData.punchHolePrice['yes'].customerPrice.toFixed(2), idCardData.punchHolePrice['yes'].agentPrice.toFixed(2)]);

    defaultColWidths = [{ wch: 15 }, { wch: 25 }, { wch: 25 }];
  }


  // 7. FINAL SHEET ASSEMBLY
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Default column widths for basic/stamp sheets (Material Name is index 1)
  if (sheetName === 'Large Format' || sheetName === 'Signboard' || sheetName === 'Stand' || sheetName === 'Stamp' || sheetName === 'Gift Item') {
    ws['!cols'] = [
      { wch: 5 },  // A: #
      { wch: 35 }, // B: Material Name
      { wch: 20 }, // C: Customer Price
      { wch: 20 }, // D: Agent Price
      { wch: 15 }  // E: Simple Material
    ];
  } else {
    // Use custom widths for complex sheets
    ws['!cols'] = defaultColWidths;
  }

  return ws;
}

/**
 * Gathers all pricing data and exports a multi-sheet Excel file.
 */
function exportMaterialPricesToExcel() {
  const workbook = XLSX.utils.book_new();

  // --- 1. Standard Price Sheets ---
  const largeFormatSheet = _createWorksheet("Large Format", materials, "/sq ft");
  XLSX.utils.book_append_sheet(workbook, largeFormatSheet, "Lg Format");

  const signboardSheet = _createWorksheet("Signboard", signboardMaterials, "/sq ft");
  XLSX.utils.book_append_sheet(workbook, signboardSheet, "Signboard");

  const standSheet = _createWorksheet("Stand", stands, "/pc");
  XLSX.utils.book_append_sheet(workbook, standSheet, "Stand");

  const stampSheet = _createWorksheet("Stamp", stamps, "/pc");
  XLSX.utils.book_append_sheet(workbook, stampSheet, "Stamp");

  const giftSheet = _createWorksheet("Gift Item", giftItems, "/pc");
  XLSX.utils.book_append_sheet(workbook, giftSheet, "Gift");

  // --- 2. Complex Calculator Sheets ---

  // Lanyard
  const lanyardSheet = _createWorksheet("Lanyard", lanyardData);
  XLSX.utils.book_append_sheet(workbook, lanyardSheet, "Lanyard");

  // Invitation Card
  const invCardSheet = _createWorksheet("Invitation Card", { data: invitationCardData });
  XLSX.utils.book_append_sheet(workbook, invCardSheet, "Inv Card");

  // Business Card
  const bcSheet = _createWorksheet("Business Card", { data: businessCardData });
  XLSX.utils.book_append_sheet(workbook, bcSheet, "Bus Card");

  // Sublimation
  const sublimationSheet = _createWorksheet("Sublimation", {
    data: {
      basePrices: globalSublimationQuantities,
      extraSizeCost: extraSizeCost,
      addons: sublimationData.addons
    }
  });
  XLSX.utils.book_append_sheet(workbook, sublimationSheet, "Sublimation");

  // ID Card
  const idCardSheet = _createWorksheet("ID Card", { idCardData: idCardData });
  XLSX.utils.book_append_sheet(workbook, idCardSheet, "ID Card");


  // 3. Download File
  const date = new Date();
  const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  XLSX.writeFile(workbook, `Material_Price_List_${timestamp}.xlsx`);

  showToast('âœ“ Price list exported to Excel!');
}
// --- END: New functions to export to Excel ---

/**
 * Gathers all settings into a single object and downloads it as a JSON file.
 */
function exportSettings() {
  const settingsToExport = {
    // Pricing data
    materials: materials,
    stands: stands,
    signboardMaterials: signboardMaterials,
    invitationCardData: invitationCardData,
    idCardData: idCardData,
    idCardAddons: idCardAddons,
    businessCardData: businessCardData,
    // Global settings
    globalEyeletPrice: globalEyeletPrice,
    globalGluePrice: globalGluePrice,
    globalPipePrice: globalPipePrice,
    globalGovSurchargePercent: globalGovSurchargePercent,
    isTaxEnabled: isTaxEnabled,
    globalTaxPercent: globalTaxPercent,
    currentCurrencyCode: currentCurrency.code,
    // Exception lists
    glueExceptionSizes: glueExceptionSizes,
    eyeletExceptionSizes: eyeletExceptionSizes,
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settingsToExport, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "calculator-settings.json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  alert("Settings have been exported as 'calculator-settings.json'");
}
/**
 * Imports settings from a user-selected JSON file.
 */
function importSettings() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = readerEvent => {
      try {
        const content = readerEvent.target.result;
        const newSettings = JSON.parse(content);
        // Confirmation before overwriting
        if (!confirm("Are you sure you want to import these settings? This will overwrite all current prices and rules.")) {
          return;
        }
        // Apply imported settings
        // Pricing data
        if (newSettings.materials) materials = newSettings.materials;
        if (newSettings.stands) stands = newSettings.stands;
        if (newSettings.signboardMaterials) signboardMaterials = newSettings.signboardMaterials;
        if (newSettings.invitationCardData) invitationCardData = newSettings.invitationCardData;
        // Handle backward compatibility: if old idCardRates format exists, skip (new idCardData takes precedence)
        if (newSettings.idCardData) {
          idCardData = newSettings.idCardData;
        } else if (newSettings.idCardRates && Array.isArray(newSettings.idCardRates)) {
          // Migration: skip old format, keep current idCardData (prices already embedded in idCardData.basePrice)
        }
        if (newSettings.idCardAddons) idCardAddons = newSettings.idCardAddons;
        ensureIDCardDefaultAddons();
        if (newSettings.businessCardData) businessCardData = newSettings.businessCardData;
        // Global settings
        if (newSettings.globalEyeletPrice) globalEyeletPrice = newSettings.globalEyeletPrice;
        if (newSettings.globalGluePrice) globalGluePrice = newSettings.globalGluePrice;
        if (newSettings.globalPipePrice) globalPipePrice = newSettings.globalPipePrice;
        if (newSettings.globalGovSurchargePercent) globalGovSurchargePercent = newSettings.globalGovSurchargePercent;
        if (newSettings.isTaxEnabled) isTaxEnabled = newSettings.isTaxEnabled;
        if (newSettings.globalTaxPercent) globalTaxPercent = newSettings.globalTaxPercent;
        if (newSettings.currentCurrencyCode) {
          const foundCurrency = currencies.find(c => c.code === newSettings.currentCurrencyCode);
          if (foundCurrency) {
            currentCurrency = foundCurrency;
          }
        }
        // Exception lists
        if (newSettings.glueExceptionSizes) glueExceptionSizes = newSettings.glueExceptionSizes;
        if (newSettings.eyeletExceptionSizes) eyeletExceptionSizes = newSettings.eyeletExceptionSizes;
        alert("Settings imported successfully!");
        renderSettingsPage(document.getElementById('contentArea')); // Refresh the page to show new settings
      } catch (error) {
        alert("Error importing file. Please ensure it is a valid settings file.\n\n" + error);
      }
    }
  };
  input.click();
}

function resetToHardcode() {
  if (confirm("Warning: This will overwrite all your existing settings and revert to the original hardcoded values. Are you sure you want to proceed?")) {
    // List of all localStorage keys used by the app
    const keysToRemove = [
      'selectedCurrency',
      'isTaxEnabled',
      'globalTaxPercent',
      'eyeletExceptionSizes',
    ];
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    alert("All settings have been reset to their original values. The application will now reload.");
    location.reload();
  }
}
// --- START: NEW FUNCTIONS FOR PREVIEW/RENAME/DUPLICATE ---
function formatSavedDate(isoString) { return window.appModules?.helpers?.formatSavedDate?.(isoString) ?? ''; }
function filterSavedQuotes() { window.appModules?.quotePad?.filterSavedQuotes?.(); }
function showQuotePreview(quoteName) { window.appModules?.quotePad?.showQuotePreview?.(quoteName); }
function closeQuotePreviewModal() { window.appModules?.quotePad?.closeQuotePreviewModal?.(); }
function renameSavedQuote(oldName) { window.appModules?.quotePad?.renameSavedQuote?.(oldName); }
function duplicateSavedQuote(quoteName) { window.appModules?.quotePad?.duplicateSavedQuote?.(quoteName); }
function exportQuotes() { window.appModules?.quotePad?.exportQuotes?.(); }
function importQuotes() { window.appModules?.quotePad?.importQuotes?.(); }


function initInputValidation() {
  // 1. Prevent typing invalid characters (-, +, e)
  document.body.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
      if (['-', '+', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
      }
    }
  });

  // 2. Monitor input changes (Sanitize pasted values or spinners)
  document.body.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') {

      // Check if it is a Quantity field (ID contains "qty" or "Qty")
      const isQtyField = /qty/i.test(e.target.id);

      let val = parseFloat(e.target.value);

      // A. Block Negatives (Convert -50 to 50, or reset)
      if (e.target.value.includes('-')) {
        e.target.value = Math.abs(val);
      }

      // B. Logic for Quantity Fields
      if (isQtyField) {
        // If value is 0, force to 1
        if (val === 0) {
          e.target.value = 1;
        }
        // Note: We allow empty string "" while typing, so user can clear "10" to type "20"
        // The 'change' event below handles the empty state.
      }
    }
  });

  // 3. Safety Check on "Blur" (When clicking away)
  document.body.addEventListener('change', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') {
      const isQtyField = /qty/i.test(e.target.id);
      let val = parseFloat(e.target.value);

      // If empty or invalid number
      if (isNaN(val) || e.target.value === '') {
        // Quantities default to 1, Dimensions/Prices default to 0
        e.target.value = isQtyField ? 1 : 0;

        // Force a recalculation event
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initInputValidation();
  initializeKioskMode();
  loadPage('home');
  initializeDock();
  renderQuotePad();
  // Close custom dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-sticker-dropdown')) {
      document.querySelectorAll('.custom-sticker-dropdown.open').forEach(el => el.classList.remove('open'));
    }
  });
});

function getCategoryArray() {
  const category = document.getElementById("categorySelect").value;
  if (category === "largeFormat") return materials;
  if (category === "stand") return stands;
  if (category === "signboard") return signboardMaterials;
  if (category === "stamp") return stamps;
  if (category === "giftItem") return giftItems;
  return [];
}

// --- NEW FUNCTION: Handles Previous/Next clicks ---
function navigateCategory(direction) {
  const select = document.getElementById("categorySelect");
  if (!select) return;

  // Calculate new index
  const newIndex = select.selectedIndex + direction;

  // Safety check (shouldn't be reachable if buttons are disabled, but good practice)
  if (newIndex >= 0 && newIndex < select.options.length) {
    select.selectedIndex = newIndex;
    updateSettingsPage(); // Trigger the page update
  }
}

function toggleSettingsCategoryDropdown(e) {
  e.stopPropagation();
  closeAllStickerDropdowns('settingsCategoryWrapper');
  const wrapper = document.getElementById('settingsCategoryWrapper');
  if (!wrapper) return;
  wrapper.classList.toggle('open');
}

function selectSettingsCategoryOption(value) {
  const select = document.getElementById('categorySelect');
  if (!select) return;
  select.value = value;
  updateSettingsPage();
}

function syncSettingsCategoryDropdown() {
  const select = document.getElementById('categorySelect');
  const wrapper = document.getElementById('settingsCategoryWrapper');
  const list = document.getElementById('settingsCategoryList');
  const label = document.getElementById('settingsCategoryLabel');
  if (!select || !wrapper || !list || !label) return;

  const selectedOption = select.options[select.selectedIndex];
  if (selectedOption) {
    label.textContent = selectedOption.text;
  }

  list.querySelectorAll('.custom-sticker-dropdown-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.value === select.value);
  });

  wrapper.classList.remove('open');
}

// --- UPDATED FUNCTION: Update visual state of buttons ---
function updateSettingsPage() {
  const categorySelect = document.getElementById("categorySelect");
  if (!categorySelect) return;

  const category = categorySelect.value;

  // 1. UPDATE TOGGLE STATE
  const toggleBtn = document.getElementById('categoryVisibilityToggle');
  if (toggleBtn) {
    toggleBtn.checked = pageVisibility[category] !== false;
  }

  // 2. NEW: UPDATE PREV/NEXT BUTTONS STATE
  const prevBtn = document.getElementById("prevCategoryBtn");
  const nextBtn = document.getElementById("nextCategoryBtn");

  if (prevBtn && nextBtn) {
    // Check bounds
    const isFirst = categorySelect.selectedIndex === 0;
    const isLast = categorySelect.selectedIndex === categorySelect.options.length - 1;

    // Update Previous Button
    prevBtn.disabled = isFirst;
    prevBtn.style.opacity = isFirst ? "0.5" : "1";
    prevBtn.style.cursor = isFirst ? "not-allowed" : "pointer";

    // Update Next Button
    nextBtn.disabled = isLast;
    nextBtn.style.opacity = isLast ? "0.5" : "1";
    nextBtn.style.cursor = isLast ? "not-allowed" : "pointer";
  }

  // 3. SHOW/HIDE Settings Pricing Toggle based on Category
  syncSettingsCategoryDropdown();

  updateExtraFields();
  updateSettingsTable();
  resetForm();
}

function renderBusinessCardSettingsTable() { window.appModules?.businessCardSettings?.renderBusinessCardSettingsTable?.(); }

function toggleCurrentCategoryVisibility() {
  const category = document.getElementById("categorySelect").value;
  const toggleBtn = document.getElementById('categoryVisibilityToggle');

  // Update state
  pageVisibility[category] = toggleBtn.checked;

  // Save and Apply immediately
  savePageVisibility();

  // Optional: Feedback
  const status = toggleBtn.checked ? "Enabled" : "Disabled";
  showToast(`${category.replace(/([A-Z])/g, ' $1').trim()} page ${status}`, 'success');
}

function updateExtraFields() {
  const category = document.getElementById("categorySelect").value;
  let extraHTML = "";
  if (category === "largeFormat" || category === "signboard") {
    extraHTML = `<div class="modern-checkbox-grid" style="grid-template-columns: 1fr; margin-top: 16px;"><div class="checkbox-group"><input type="checkbox" id="isSimple"><label for="isSimple">Simple Material (No Eyelet/Pipe)</label></div></div>`;
  }
  document.getElementById("extraFields").innerHTML = extraHTML;
}

function updateSettingsTable() {
  const category = document.getElementById("categorySelect").value;
  const addMaterialForm = document.getElementById("addMaterialForm");

  // Default: Hide the "Add Material" form for complex calculators
  addMaterialForm.style.display = 'none';

  if (category === 'invitationCard') {
    invitationCardEditState = {
      base: false,
      material: false,
      addons: invitationCardData.addons.map(() => false)
    };
    renderInvitationCardSettingsTable();
  } else if (category === 'businessCard') {
    businessCardEditState = {
      materials: false,
      addons: businessCardData.addons.map(() => false)
    };
    renderBusinessCardSettingsTable();
  } else if (category === 'lanyard') {
    lanyardEditState = {
      base: false,
      sizes: false,
      sides: false,
      hooks: false,
      extras: false,
      addonsRulesOpen: lanyardData.addons ? lanyardData.addons.map(() => false) : []
    };
    renderLanyardSettingsTable();
  } else if (category === 'sublimation') {
    sublimationEditState = {
      base: false,
      extraSize: false,
      addons: sublimationData.addons.map(() => false),
      addonsRulesOpen: sublimationData.addons.map(() => false)
    };
    renderSublimationSettingsTable();
  } else if (category === 'idCard') {
    // --- NEW BLOCK FOR ID CARD ---
    idCardEditState = {
      base: false,
      materials: false,
      accessories: false
    };
    renderIDCardSettingsTable();
  } else if (category === 'giftItem') {
    addMaterialForm.style.display = 'block';
    renderStandardSettingsTable();
  } else if (category === 'stamp') {
    addMaterialForm.style.display = 'none';
    renderStampSettingsTable();
  } else if (category === 'acrylicCalculator') {
    addMaterialForm.style.display = 'none';
    renderAcrylicPricingSettingsTable();
  } else {
    // Fallback for Large Format / Signboard / Stand / Acrylic
    addMaterialForm.style.display = 'block';
    renderStandardSettingsTable();
  }
}

function renderStandardSettingsTable() {
  const arr = getCategoryArray();
  const category = document.getElementById("categorySelect").value;
  // Added 'customer-price-col' and 'agent-price-col' classes to center-align prices
  // Different column widths for Stand (no Simple column) vs Large Format/Signboard
  let tableHTML = "<table class='settings-table'><colgroup>";
  if (category === "stand" || category === "giftItem") {
    tableHTML += "<col style='width: 5%;'><col style='width: 50%;'><col style='width: 15%;'><col style='width: 15%;'><col style='width: 15%;'>";
  } else {
    tableHTML += "<col style='width: 5%;'><col style='width: 40%;'><col style='width: 15%;'><col style='width: 15%;'><col style='width: 10%;'><col style='width: 15%;'>";
  }
  tableHTML += "</colgroup><thead><tr><th>#</th><th>Name</th><th class='customer-price-col'>Customer Price</th><th class='agent-price-col'>Agent Price</th>";
  if (category === "largeFormat" || category === "signboard") tableHTML += "<th>Simple</th>";
  tableHTML += "<th>Actions</th></tr></thead><tbody>";
  arr.forEach((item, index) => {
    // Added 'customer-price-col' and 'agent-price-col' classes to center-align prices
    tableHTML += `<tr><td>${index + 1}</td><td>${item.name}</td><td class='customer-price-col'>${currentCurrency.symbol} ${formatCurrency(item.customerPrice)}</td><td class='agent-price-col'>${currentCurrency.symbol} ${formatCurrency(item.agentPrice)}</td>`;
    if (category === "largeFormat" || category === "signboard") {
      tableHTML += `<td>${item.simple ? "Yes" : "No"}</td>`;
    }
    tableHTML += `<td class='action-col'><div class="action-buttons"><button class="btn btn-sm btn-secondary" onclick='editMaterial(${index})'>Edit</button><button class="btn btn-sm btn-danger" onclick='deleteMaterial(${index})'>Delete</button></div></td></tr>`;
  });
  tableHTML += "</tbody></table>";
  { const _s = _saveSettingsScrolls(); document.getElementById("settingsTableDiv").innerHTML = tableHTML; _restoreSettingsScrolls(_s); }
}

function toggleInvitationCardEditMode(section, isEditing, index = null) { window.appModules?.invitationCardSettings?.toggleInvitationCardEditMode?.(section, isEditing, index); }

function renderInvitationCardSettingsTable() { window.appModules?.invitationCardSettings?.renderInvitationCardSettingsTable?.(); }

// --- Delete Confirmation Modal Logic ---
let pendingDeleteCallback = null;

function showDeleteConfirmationModal(title, desc, callback) {
  document.getElementById('deleteConfirmationTitle').innerText = title || "Delete Item?";
  document.getElementById('deleteConfirmationDesc').innerText = desc || "Are you sure you want to delete this item? This action cannot be undone.";
  pendingDeleteCallback = callback;

  const modal = document.getElementById('deleteConfirmationModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeDeleteConfirmationModal() {
  const modal = document.getElementById('deleteConfirmationModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  pendingDeleteCallback = null;
}

function confirmDeleteAction() {
  if (pendingDeleteCallback) {
    pendingDeleteCallback();
  }
  closeDeleteConfirmationModal();
}

// Keyboard shortcuts for confirmation modals:
//   Delete modal  â†’ D = confirm delete,  C = cancel
//   Save modal    â†’ S = confirm save,    C = cancel
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  const key = e.key.toLowerCase();

  const deleteModal = document.getElementById('deleteConfirmationModal');
  const saveModal   = document.getElementById('saveConfirmationModal');
  const deleteOpen  = deleteModal && !deleteModal.classList.contains('hidden');
  const saveOpen    = saveModal   && !saveModal.classList.contains('hidden');

  if (deleteOpen) {
    if (key === 'd') { e.preventDefault(); confirmDeleteAction(); }
    else if (key === 'c') { e.preventDefault(); closeDeleteConfirmationModal(); }
  } else if (saveOpen) {
    if (key === 's') { e.preventDefault(); confirmSaveAction(); }
    else if (key === 'c') { e.preventDefault(); closeSaveConfirmationModal(); }
  }
});

// --- Save Confirmation Modal Logic ---
let pendingSaveSection = null;
let pendingSaveIndex = null;
let pendingSaveCallback = null;

function closeSaveConfirmationModal() {
  const modal = document.getElementById('saveConfirmationModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function confirmSaveAction() {
  if (pendingSaveCallback) {
    pendingSaveCallback();
    pendingSaveCallback = null;
  }
  closeSaveConfirmationModal();
}


function saveInvitationCardSettings(section, index = null) { window.appModules?.invitationCardSettings?.saveInvitationCardSettings?.(section, index); }

function addInvitationCardQty() { window.appModules?.invitationCardSettings?.addInvitationCardQty?.(); }

function addInvitationCardSize() { window.appModules?.invitationCardSettings?.addInvitationCardSize?.(); }



function addInvitationCardMaterialInline() { window.appModules?.invitationCardSettings?.addInvitationCardMaterialInline?.(); }

function moveInvitationCardMaterialUp(index) { window.appModules?.invitationCardSettings?.moveInvitationCardMaterialUp?.(index); }

function moveInvitationCardMaterialDown(index) { window.appModules?.invitationCardSettings?.moveInvitationCardMaterialDown?.(index); }

function removeInvitationCardMaterialByIndex(index) { window.appModules?.invitationCardSettings?.removeInvitationCardMaterialByIndex?.(index); }

function removeInvitationCardQty() { window.appModules?.invitationCardSettings?.removeInvitationCardQty?.(); }


function moveInvitationCardQtyUp(index) { window.appModules?.invitationCardSettings?.moveInvitationCardQtyUp?.(index); }

function moveInvitationCardQtyDown(index) { window.appModules?.invitationCardSettings?.moveInvitationCardQtyDown?.(index); }

function removeInvitationCardQtyByIndex(index) { window.appModules?.invitationCardSettings?.removeInvitationCardQtyByIndex?.(index); }


function removeInvitationCardSize() { window.appModules?.invitationCardSettings?.removeInvitationCardSize?.(); }



// --- Sublimation Settings delegates (module: sublimationSettings) ---
function renderSublimationSettingsTable() { window.appModules?.sublimationSettings?.renderSublimationSettingsTable?.(); }
function saveSublimationSettings(section, addonIndex = null) { window.appModules?.sublimationSettings?.saveSublimationSettings?.(section, addonIndex); }
function addRemoveSublimationAddonOption(action, addonIndex, optionIndex = null) { window.appModules?.sublimationSettings?.addRemoveSublimationAddonOption?.(action, addonIndex, optionIndex); }
function openAddSublimationAddonGroupModal() { window.appModules?.sublimationSettings?.openAddSublimationAddonGroupModal?.(); }
function closeAddSublimationAddonGroupModal() { window.appModules?.sublimationSettings?.closeAddSublimationAddonGroupModal?.(); }
function confirmAddSublimationAddonGroup() { window.appModules?.sublimationSettings?.confirmAddSublimationAddonGroup?.(); }
function addRemoveSublimationAddonType(action, addonIndex = null) { window.appModules?.sublimationSettings?.addRemoveSublimationAddonType?.(action, addonIndex); }
function moveSublimationAddonOptionUp(addonIndex, optionIndex) { window.appModules?.sublimationSettings?.moveSublimationAddonOptionUp?.(addonIndex, optionIndex); }
function moveSublimationAddonOptionDown(addonIndex, optionIndex) { window.appModules?.sublimationSettings?.moveSublimationAddonOptionDown?.(addonIndex, optionIndex); }
function moveSublimationBasePriceUp(index) { window.appModules?.sublimationSettings?.moveSublimationBasePriceUp?.(index); }
function moveSublimationBasePriceDown(index) { window.appModules?.sublimationSettings?.moveSublimationBasePriceDown?.(index); }
function removeSublimationBasePriceByIndex(index) { window.appModules?.sublimationSettings?.removeSublimationBasePriceByIndex?.(index); }
function moveSublimationSizeUp(sizeIndex) { window.appModules?.sublimationSettings?.moveSublimationSizeUp?.(sizeIndex); }
function moveSublimationSizeDown(sizeIndex) { window.appModules?.sublimationSettings?.moveSublimationSizeDown?.(sizeIndex); }
function removeSublimationSizeByIndex(sizeIndex) { window.appModules?.sublimationSettings?.removeSublimationSizeByIndex?.(sizeIndex); }
function addRemoveSublimationQuantity(action) { window.appModules?.sublimationSettings?.addRemoveSublimationQuantity?.(action); }
function addRemoveSublimationSize(action) { window.appModules?.sublimationSettings?.addRemoveSublimationSize?.(action); }
function toggleSubAddonRulesPanel(addonIndex) { window.appModules?.sublimationSettings?.toggleSubAddonRulesPanel?.(addonIndex); }
function _subSetAddonRule(addonIndex, field, value) { window.appModules?.sublimationSettings?._subSetAddonRule?.(addonIndex, field, value); }
function toggleSublimationEditMode(section, isEditing, index = null) { window.appModules?.sublimationSettings?.toggleSublimationEditMode?.(section, isEditing, index); }


// --- Create New Add-on Group Modal ---
function openAddAddonGroupModal() { window.appModules?.invitationCardSettings?.openAddAddonGroupModal?.(); }

function closeAddAddonGroupModal() { window.appModules?.invitationCardSettings?.closeAddAddonGroupModal?.(); }

function confirmAddAddonGroup() { window.appModules?.invitationCardSettings?.confirmAddAddonGroup?.(); }

// --- Manage Sizes Modal ---
let _originalSizes = [];

function openManageSizesModal() { window.appModules?.invitationCardSettings?.openManageSizesModal?.(); }

function closeManageSizesModal() { window.appModules?.invitationCardSettings?.closeManageSizesModal?.(); }

function redoManageSizes() { window.appModules?.invitationCardSettings?.redoManageSizes?.(); }

// --- Create New Business Card Add-on Group Modal ---
function openAddBusinessCardAddonGroupModal() { window.appModules?.businessCardSettings?.openAddBusinessCardAddonGroupModal?.(); }

function closeAddBusinessCardAddonGroupModal() { window.appModules?.businessCardSettings?.closeAddBusinessCardAddonGroupModal?.(); }

function confirmAddBusinessCardAddonGroup() { window.appModules?.businessCardSettings?.confirmAddBusinessCardAddonGroup?.(); }

function addBusinessCardAddonOptionInline(addonIndex) { window.appModules?.businessCardSettings?.addBusinessCardAddonOptionInline?.(addonIndex); }

function moveBusinessCardAddonOptionUp(addonIndex, optionIndex) { window.appModules?.businessCardSettings?.moveBusinessCardAddonOptionUp?.(addonIndex, optionIndex); }

function moveBusinessCardAddonOptionDown(addonIndex, optionIndex) { window.appModules?.businessCardSettings?.moveBusinessCardAddonOptionDown?.(addonIndex, optionIndex); }



function addSizeRowToManageSizes() { window.appModules?.invitationCardSettings?.addSizeRowToManageSizes?.(); }

function moveSizeRowUp(btn) { window.appModules?.invitationCardSettings?.moveSizeRowUp?.(btn); }

function moveSizeRowDown(btn) { window.appModules?.invitationCardSettings?.moveSizeRowDown?.(btn); }

function removeSizeRow(btn) { window.appModules?.invitationCardSettings?.removeSizeRow?.(btn); }

function saveManageSizes() { window.appModules?.invitationCardSettings?.saveManageSizes?.(); }

// --- Lanyard Manage Sizes Modal Functions ---
let _originalLanyardSizes = [];

function openManageLanyardSizesModal() { window.appModules?.lanyardSettings?.openManageLanyardSizesModal?.(); }

function closeManageLanyardSizesModal() { window.appModules?.lanyardSettings?.closeManageLanyardSizesModal?.(); }


function addRowToManageLanyardSizes() { window.appModules?.lanyardSettings?.addRowToManageLanyardSizes?.(); }

function moveLanyardSizeRowUp(btn) { window.appModules?.lanyardSettings?.moveLanyardSizeRowUp?.(btn); }

function moveLanyardSizeRowDown(btn) { window.appModules?.lanyardSettings?.moveLanyardSizeRowDown?.(btn); }

function removeLanyardSizeRow(btn) { window.appModules?.lanyardSettings?.removeLanyardSizeRow?.(btn); }

function redoManageLanyardSizes() { window.appModules?.lanyardSettings?.redoManageLanyardSizes?.(); }

function saveManageLanyardSizes() { window.appModules?.lanyardSettings?.saveManageLanyardSizes?.(); }


// --- Stamp Category Management ---
let stampCategories = [
  { name: 'Pre Ink Rubber Stamp', color: '#22c55e' }, // Green
  { name: 'Flash Stamp', color: '#14b8a6' }, // Teal
  { name: 'Stamp Pad Rubber Stamp', color: '#f97316' } // Orange
];
let _originalStampCategories = [];

function generateRandomColor() { window.appModules?.stampSettings?.generateRandomColor?.(); }

function openManageStampCategoriesModal() { window.appModules?.stampSettings?.openManageStampCategoriesModal?.(); }

function closeManageStampCategoriesModal() { window.appModules?.stampSettings?.closeManageStampCategoriesModal?.(); }

let _colorPickerTarget = null;

function openColorPickerModal(targetElement, currentColor) { window.appModules?.stampSettings?.openColorPickerModal?.(targetElement, currentColor); }

function closeColorPickerModal() { window.appModules?.stampSettings?.closeColorPickerModal?.(); }

function confirmColorPicker() { window.appModules?.stampSettings?.confirmColorPicker?.(); }

// Sync color input and hex input
document.addEventListener('DOMContentLoaded', function() {
  const colorInput = document.getElementById('colorPickerInput');
  const hexInput = document.getElementById('colorPickerHex');
  
  if (colorInput && hexInput) {
    colorInput.addEventListener('input', function() {
      hexInput.value = this.value;
    });
    
    hexInput.addEventListener('change', function() {
      let color = this.value.trim();
      if (!color.startsWith('#')) {
        color = '#' + color;
      }
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        colorInput.value = color;
      }
    });
  }
});

function rgbToHex(rgb) { window.appModules?.stampSettings?.rgbToHex?.(rgb); }


function addRowToManageStampCategories() { window.appModules?.stampSettings?.addRowToManageStampCategories?.(); }

function moveStampCategoryRowUp(btn) { window.appModules?.stampSettings?.moveStampCategoryRowUp?.(btn); }

function moveStampCategoryRowDown(btn) { window.appModules?.stampSettings?.moveStampCategoryRowDown?.(btn); }

function removeStampCategoryRow(btn) { window.appModules?.stampSettings?.removeStampCategoryRow?.(btn); }

function redoManageStampCategories() { window.appModules?.stampSettings?.redoManageStampCategories?.(); }

function saveManageStampCategories() { window.appModules?.stampSettings?.saveManageStampCategories?.(); }


// --- Addon Option Inline Add / Move / helpers ---

function addInvitationCardAddonOptionInline(addonIndex) { window.appModules?.invitationCardSettings?.addInvitationCardAddonOptionInline?.(addonIndex); }

function moveAddonOptionUp(addonIndex, optionIndex) { window.appModules?.invitationCardSettings?.moveAddonOptionUp?.(addonIndex, optionIndex); }

function moveAddonOptionDown(addonIndex, optionIndex) { window.appModules?.invitationCardSettings?.moveAddonOptionDown?.(addonIndex, optionIndex); }

function removeInvitationCardAddonType(addonIndex) { window.appModules?.invitationCardSettings?.removeInvitationCardAddonType?.(addonIndex); }

function removeInvitationCardAddonOption(addonIndex, optionIndex) { window.appModules?.invitationCardSettings?.removeInvitationCardAddonOption?.(addonIndex, optionIndex); }

function toggleBusinessCardEditMode(section, isEditing, index = null) { window.appModules?.businessCardSettings?.toggleBusinessCardEditMode?.(section, isEditing, index); }

function cancelBusinessCardEdit(section, index = null) { window.appModules?.businessCardSettings?.cancelBusinessCardEdit?.(section, index); }

function saveBusinessCardSettings(section, index = null) { window.appModules?.businessCardSettings?.saveBusinessCardSettings?.(section, index); }


function addBusinessCardQty() { window.appModules?.businessCardSettings?.addBusinessCardQty?.(); }

function closeAddQtyModal() { window.appModules?.businessCardSettings?.closeAddQtyModal?.(); }

function confirmAddBusinessCardQty() { window.appModules?.businessCardSettings?.confirmAddBusinessCardQty?.(); }

function removeBusinessCardQty(index) { window.appModules?.businessCardSettings?.removeBusinessCardQty?.(index); }

function addBusinessCardMaterial() { window.appModules?.businessCardSettings?.addBusinessCardMaterial?.(); }

function removeBusinessCardMaterialByIndex(index) { window.appModules?.businessCardSettings?.removeBusinessCardMaterialByIndex?.(index); }

function moveBusinessCardMaterialUp(index) { window.appModules?.businessCardSettings?.moveBusinessCardMaterialUp?.(index); }

function moveBusinessCardMaterialDown(index) { window.appModules?.businessCardSettings?.moveBusinessCardMaterialDown?.(index); }

function addBusinessCardMaterialInline() { window.appModules?.businessCardSettings?.addBusinessCardMaterialInline?.(); }

function removeBusinessCardMaterial() { window.appModules?.businessCardSettings?.removeBusinessCardMaterial?.(); }

function addBusinessCardAddonType() { window.appModules?.businessCardSettings?.addBusinessCardAddonType?.(); }

function removeBusinessCardAddonType(addonIndex) { window.appModules?.businessCardSettings?.removeBusinessCardAddonType?.(addonIndex); }

function addBusinessCardAddonOption(addonIndex) { window.appModules?.businessCardSettings?.addBusinessCardAddonOption?.(addonIndex); }

function removeBusinessCardAddonOption(addonIndex, optionIndex) { window.appModules?.businessCardSettings?.removeBusinessCardAddonOption?.(addonIndex, optionIndex); }

function renderLanyardSettingsTable() { window.appModules?.lanyardSettings?.renderLanyardSettingsTable?.(); }

function toggleLanyardAddonRulesPanel(addonIndex) { window.appModules?.lanyardSettings?.toggleLanyardAddonRulesPanel?.(addonIndex); }

function _lanyardSetAddonRule(addonIndex, field, value) { window.appModules?.lanyardSettings?._lanyardSetAddonRule?.(addonIndex, field, value); }

function toggleLanyardEditMode(section, isEditing, index = null) { window.appModules?.lanyardSettings?.toggleLanyardEditMode?.(section, isEditing, index); }

function saveLanyardSettings(section, addonIndex = null) { window.appModules?.lanyardSettings?.saveLanyardSettings?.(section, addonIndex); }


function addLanyardQuantity() { window.appModules?.lanyardSettings?.addLanyardQuantity?.(); }

function removeLanyardQtyByIndex(qtyIndex) { window.appModules?.lanyardSettings?.removeLanyardQtyByIndex?.(qtyIndex); }

function moveLanyardQtyUp(qtyIndex) { window.appModules?.lanyardSettings?.moveLanyardQtyUp?.(qtyIndex); }

function moveLanyardQtyDown(qtyIndex) { window.appModules?.lanyardSettings?.moveLanyardQtyDown?.(qtyIndex); }

function addLanyardSize() { window.appModules?.lanyardSettings?.addLanyardSize?.(); }

function removeLanyardSizeByIndex(sizeIndex) { window.appModules?.lanyardSettings?.removeLanyardSizeByIndex?.(sizeIndex); }


function addLanyardAddonType() { window.appModules?.lanyardSettings?.addLanyardAddonType?.(); }

function openAddLanyardAddonGroupModal() { window.appModules?.lanyardSettings?.openAddLanyardAddonGroupModal?.(); }

function closeAddLanyardAddonGroupModal() { window.appModules?.lanyardSettings?.closeAddLanyardAddonGroupModal?.(); }

function confirmAddLanyardAddonGroup() { window.appModules?.lanyardSettings?.confirmAddLanyardAddonGroup?.(); }

function removeLanyardAddonType(addonIndex) { window.appModules?.lanyardSettings?.removeLanyardAddonType?.(addonIndex); }

function addLanyardAddonOptionInline(addonIndex) { window.appModules?.lanyardSettings?.addLanyardAddonOptionInline?.(addonIndex); }

function removeLanyardAddonOption(addonIndex, optionIndex) { window.appModules?.lanyardSettings?.removeLanyardAddonOption?.(addonIndex, optionIndex); }

function moveLanyardAddonOptionUp(addonIndex, optionIndex) { window.appModules?.lanyardSettings?.moveLanyardAddonOptionUp?.(addonIndex, optionIndex); }

function moveLanyardAddonOptionDown(addonIndex, optionIndex) { window.appModules?.lanyardSettings?.moveLanyardAddonOptionDown?.(addonIndex, optionIndex); }


function createGiftItemsContext() {
  return {
    getMugData: () => mugData,
    getButtonBadgeData: () => buttonBadgeData,
    getKeychainData: () => keychainData,
    getGlobalAgentMode: () => globalAgentMode,
    getCurrentCurrency: () => currentCurrency,
    formatCurrency,
    generateUniversalInvoice,
    addItemToQuotePad,
    getGlobalToggleHTML,
    attachGridListeners,
  };
}

function copyGiftInvoice(textareaId) {
  const ta = document.getElementById(textareaId);
  if (!ta) return;
  ta.select();
  navigator.clipboard.writeText(ta.value).then(() => showToast('copied!')).catch(console.error);
}

function renderDTFPage(container, activeTab = 'dtf') {
  currentDTFTab = activeTab;
  window.appModules?.dtf?.renderDTFPage?.(container, createDTFContext(), activeTab);
}

function kiraDTF() {
  window.appModules?.dtf?.kiraDTF?.(createDTFContext());
}

function addDTFToPad() {
  window.appModules?.dtf?.addDTFToPad?.(createDTFContext());
}

function openDTFCompareModal() {
  window.appModules?.dtf?.openDTFCompareModal?.(createDTFContext());
}

function closeDTFCompareModal() {
  window.appModules?.dtf?.closeDTFCompareModal?.();
}

function kiraUVDTF() {
  window.appModules?.dtf?.kiraUVDTF?.(createDTFContext());
}

function addUVDTFToPad() {
  window.appModules?.dtf?.addUVDTFToPad?.(createDTFContext());
}

function changeDTFUnits(newUnit) {
  const wEl = document.getElementById('dtfWidthCm');
  const hEl = document.getElementById('dtfHeightCm');
  const precision = (newUnit === 'mm') ? 0 : (newUnit === 'cm') ? 1 : 2;
  if (wEl && hEl) {
    const wMm = convertToMm(parseFloat(wEl.value) || 0, currentDTFUnit);
    const hMm = convertToMm(parseFloat(hEl.value) || 0, currentDTFUnit);
    const newW = convertFromMm(wMm, newUnit);
    const newH = convertFromMm(hMm, newUnit);

    // Capture old display values for animation, then set final values immediately
    // so that kiraDTF() called below reads the correct converted numbers.
    const fromW = parseFloat(wEl.value) || 0;
    const fromH = parseFloat(hEl.value) || 0;
    wEl.value = newW.toFixed(precision);
    hEl.value = newH.toFixed(precision);

    function animateDTFInput(inputEl, fromValue, toValue) {
      const duration = 300;
      const startTime = performance.now();
      inputEl.classList.remove('unit-value-animate');
      void inputEl.offsetWidth;
      inputEl.classList.add('unit-value-animate');
      function update(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        inputEl.value = (fromValue + (toValue - fromValue) * easeOut).toFixed(precision);
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          inputEl.value = toValue.toFixed(precision);
          setTimeout(() => inputEl.classList.remove('unit-value-animate'), 100);
        }
      }
      requestAnimationFrame(update);
    }

    animateDTFInput(wEl, fromW, newW);
    animateDTFInput(hEl, fromH, newH);
  }
  currentDTFUnit = newUnit;
  const unitLabelEl = document.getElementById('dtfUnitLabel');
  const unitLabels = { cm: 'Centimeter (cm)', mm: 'Millimeter (mm)', m: 'Meter (m)' };
  if (unitLabelEl) unitLabelEl.textContent = unitLabels[newUnit] || newUnit;
  document.querySelectorAll('#dtfUnitWrapper .custom-sticker-dropdown-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.value === newUnit);
  });
  document.querySelectorAll('.dtf-unit-badge').forEach(el => { el.textContent = newUnit; });
  kiraDTF();
}

function createDTFContext() {
  return {
    addItemToQuotePad,
    applyMainCalcPanelButtonVisual,
    convertToMm,
    convertFromMm,
    formatCurrency,
    generateUniversalInvoice,
    getArtConfig: () => artConfig,
    getCurrentCurrency: () => currentCurrency,
    getCurrentDTFUnit: () => currentDTFUnit,
    getDTFData: () => dtfData,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalToggleHTML,
    getUploadedArtworkImg: () => uploadedArtworkImg,
    getUVDTFData: () => uvdtfData,
    initArtworkDragAndDrop,
    animatePriceTicker,
    setCurrentDTFUnit: (u) => { currentDTFUnit = u; },
    setUploadedArtworkImg: (img) => { uploadedArtworkImg = img; },
    showToast,
  };
}

function renderGiftItemPage(container, activeTab = 'mug') {
  currentGiftTab = activeTab;
  const activeClass = "text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500";
  const inactiveClass = "text-gray-500 border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300";
  const toggleHTML = getGlobalToggleHTML('giftItem');

  container.innerHTML = `
          <h2 class="text-center text-2xl font-bold mb-6 uppercase tracking-wide"> Gift Item</h2>
            ${toggleHTML}
            <div class="w-full max-w-5xl mx-auto">
              <div class="mb-6 border-b border-gray-200 dark:border-gray-700">
                <ul class="flex justify-center -mb-px text-sm font-medium text-center">
                  <li class="me-2">
                    <button onclick="renderGiftItemPage(document.getElementById('contentArea'), 'mug')" class="inline-flex items-center justify-center p-4 transition-all duration-200 group ${activeTab === 'mug' ? activeClass : inactiveClass}">
                      <i class="fas fa-mug-hot mr-2 ${activeTab === 'mug' ? 'text-blue-600 dark:text-blue-500' : ''}"></i>Mug Printing
                    </button>
                  </li>
                  <li class="me-2">
                    <button onclick="renderGiftItemPage(document.getElementById('contentArea'), 'badge')" class="inline-flex items-center justify-center p-4 transition-all duration-200 group ${activeTab === 'badge' ? activeClass : inactiveClass}">
                      <i class="fas fa-certificate mr-2 ${activeTab === 'badge' ? 'text-blue-600 dark:text-blue-500' : ''}"></i>Button Badge
                    </button>
                  </li>
                  <li class="me-2">
                    <button onclick="renderGiftItemPage(document.getElementById('contentArea'), 'keychain')" class="inline-flex items-center justify-center p-4 transition-all duration-200 group ${activeTab === 'keychain' ? activeClass : inactiveClass}">
                      <i class="fas fa-key mr-2 ${activeTab === 'keychain' ? 'text-blue-600 dark:text-blue-500' : ''}"></i>Acrylic Keychain
                    </button>
                  </li>
                </ul>
              </div>
              <div id="giftTabContent"></div>
            </div>`;

  const tabContent = document.getElementById('giftTabContent');
  if (activeTab === 'mug') renderMugPage(tabContent);
  else if (activeTab === 'badge') renderBadgePage(tabContent);
  else if (activeTab === 'keychain') renderKeychainPage(tabContent);
}

function renderMugPage(container) {
  window.appModules?.mug?.renderMugPage?.(container, createGiftItemsContext());
}

function kiraMug() {
  window.appModules?.mug?.kiraMug?.(createGiftItemsContext());
}

function mugVersionChange(versionIdx) {
  const version = mugData.versions[parseInt(versionIdx)];
  if (!version) return;

  // Rebuild native hidden select
  const mugTypeSelect = document.getElementById('mugType');
  if (mugTypeSelect) {
    mugTypeSelect.innerHTML = version.types.map((t, i) => `<option value="${i}">${t.label}</option>`).join('');
    mugTypeSelect.value = '0';
  }

  // Rebuild custom dropdown options and reset label
  const mugTypeWrapper = document.getElementById('mugTypeWrapper');
  if (mugTypeWrapper) {
    const optionsContainer = mugTypeWrapper.querySelector('.custom-sticker-dropdown-options');
    if (optionsContainer) {
      optionsContainer.innerHTML = version.types.map((t, i) =>
        `<div class="custom-sticker-dropdown-option ${i === 0 ? 'selected' : ''}" onmousedown="selectGenericStickerDropdownOption('mugType', 'mugTypeWrapper', '${i}', 'kiraMug')">${t.label}</div>`
      ).join('');
    }
    const labelEl = mugTypeWrapper.querySelector('.custom-sticker-dropdown-label');
    if (labelEl) labelEl.textContent = version.types[0].label;
  }

  kiraMug();
}

function addMugToPad() {
  window.appModules?.mug?.addMugToPad?.(createGiftItemsContext());
}

function renderBadgePage(container) {
  window.appModules?.badge?.renderBadgePage?.(container, createGiftItemsContext());
}

function kiraBadge() {
  window.appModules?.badge?.kiraBadge?.(createGiftItemsContext());
}

function addBadgeToPad() {
  window.appModules?.badge?.addBadgeToPad?.(createGiftItemsContext());
}

function renderKeychainPage(container) {
  window.appModules?.keychain?.renderKeychainPage?.(container, createGiftItemsContext());
}

function kiraKeychain() {
  window.appModules?.keychain?.kiraKeychain?.(createGiftItemsContext());
}

function addKeychainToPad() {
  window.appModules?.keychain?.addKeychainToPad?.(createGiftItemsContext());
}

function resetForm() {
  const materialName = document.getElementById("materialName");
  const customerPrice = document.getElementById("customerPrice");
  const agentPrice = document.getElementById("agentPrice");
  const isSimpleCheckbox = document.getElementById("isSimple");
  if (materialName) materialName.value = "";
  if (customerPrice) customerPrice.value = "";
  if (agentPrice) agentPrice.value = "";
  if (isSimpleCheckbox) isSimpleCheckbox.checked = false;
  editingIndex = -1;
  const formTitle = document.getElementById("formTitle");
  const saveButtonLabel = document.getElementById("saveButtonLabel");
  if (formTitle) formTitle.innerText = "Add New Material";
  if (saveButtonLabel) saveButtonLabel.innerText = "Add Material";
}

function _syncGiftItemsToSources() {
  // Sync giftItems flat array back to the source data objects so the calculator uses updated prices.
  giftItems.forEach(gi => {
    if (gi._type === 'mug') {
      for (const v of mugData.versions) {
        for (const t of v.types) {
          if (`${v.label} - ${t.label}` === gi.name) {
            t.customerPrice = gi.customerPrice;
            t.agentPrice = gi.agentPrice;
          }
        }
      }
    } else if (gi._type === 'badge') {
      const s = buttonBadgeData.sizes.find(o => `Button Badge: ${o.label}` === gi.name);
      if (s) { s.customerPrice = gi.customerPrice; s.agentPrice = gi.agentPrice; }
    } else if (gi._type === 'keychain') {
      const v = keychainData.variants.find(o => `Keychain: ${o.label}` === gi.name);
      if (v) { v.customerPrice = gi.customerPrice; v.agentPrice = gi.agentPrice; }
    }
  });
}

function saveMaterial() {
  const name = document.getElementById("materialName").value.trim();
  const cust = parseFloat(document.getElementById("customerPrice").value);
  const agent = parseFloat(document.getElementById("agentPrice").value);
  if (name === "" || isNaN(cust) || isNaN(agent)) {
    alert("Please fill all fields.");
    return;
  }
  let newItem = {
    name,
    customerPrice: cust,
    agentPrice: agent,
    agent: false
  };
  const category = document.getElementById("categorySelect").value;
  if (category === "largeFormat" || category === "signboard") {
    newItem.simple = document.getElementById("isSimple").checked;
  }
  let arr = getCategoryArray();
  if (editingIndex >= 0) {
    arr[editingIndex] = newItem;
  } else {
    arr.push(newItem);
  }
  if (category === 'giftItem') _syncGiftItemsToSources();
  updateSettingsTable();
  resetForm();
}

function editMaterial(index) {
  const arr = getCategoryArray();
  const item = arr[index];
  document.getElementById("materialName").value = item.name;
  document.getElementById("customerPrice").value = item.customerPrice;
  document.getElementById("agentPrice").value = item.agentPrice;
  const category = document.getElementById("categorySelect").value;
  if (category === "largeFormat" || category === "signboard") {
    document.getElementById("isSimple").checked = item.simple;
  }
  editingIndex = index;
  document.getElementById("formTitle").innerText = "Edit Material";
  document.getElementById("saveButtonLabel").innerText = "Save Changes";
  document.getElementById("materialName").focus();
}

function deleteMaterial(index) {
  showDeleteConfirmationModal(
    "Delete Item?",
    "Are you sure you want to delete this material?",
    () => {
      let arr = getCategoryArray();
      arr.splice(index, 1);
      const category = document.getElementById('categorySelect').value;
      if (category === 'giftItem') _syncGiftItemsToSources();
      updateSettingsTable();
      showToast("Item deleted.");
    }
  );
}

// --- START: ACRYLIC CALCULATOR HELPER FUNCTIONS (Fix #8) ---

// 1. GLOBAL STATE & CONFIGURATION
let acrylicState = {
  presetActive: null,
  currentUnit: "inch",
  ignoreManualChange: false,
  userMode: "customer",
  printSideMultiplier: 1
};

let acrylicPriceTable = {
  customer: {
    acrylic: [
      { label: "Acrylic Clear 2mm (RM0.32/inÂ²)", price: 0.32 },
      { label: "Acrylic Clear 3mm (RM0.40/inÂ²)", price: 0.40 },
      { label: "Acrylic Clear 5mm (RM0.61/inÂ²)", price: 0.61 },
      { label: "Acrylic Black 3mm (RM0.50/inÂ²)", price: 0.50 },
      { label: "Acrylic White 3mm (RM0.40/inÂ²)", price: 0.40 },
      { label: "Acrylic Mirror 2mm (RM0.78/inÂ²)", price: 0.78 },
      { label: "Wood 3mm (RM0.80/inÂ²)", price: 0.80 },
      { label: "Wood 5mm (RM0.90/inÂ²)", price: 0.90 }
    ],
    print: [{ label: "UV Printing (RM0.40/inÂ²)", price: 0.4 }],
    stand: [
      { label: "1.5in (H)" }, { label: "1.8in (H)" }, { label: "2in (H)" },
      { label: "2.5in (H)" }, { label: "3in (H)" }
    ]
  },
  agent: {
    acrylic: [
      { label: "Acrylic Clear 2mm (RM0.26/inÂ²)", price: 0.26 },
      { label: "Acrylic Clear 3mm (RM0.32/inÂ²)", price: 0.32 },
      { label: "Acrylic Clear 5mm (RM0.48/inÂ²)", price: 0.48 },
      { label: "Acrylic Black 3mm (RM0.40/inÂ²)", price: 0.40 },
      { label: "Acrylic White 3mm (RM0.32/inÂ²)", price: 0.32 },
      { label: "Acrylic Mirror 2mm (RM0.62/inÂ²)", price: 0.62 },
      { label: "Wood 3mm (RM0.70/inÂ²)", price: 0.70 },
      { label: "Wood 5mm (RM0.80/inÂ²)", price: 0.80 }
    ],
    print: [{ label: "UV Printing (RM0.32/inÂ²)", price: 0.32 }],
    stand: [
      { label: "1.5in (H)" }, { label: "1.8in (H)" }, { label: "2in (H)" },
      { label: "2.5in (H)" }, { label: "3in (H)" }
    ]
  }
};

let acrylicMarkupRules = {
  customer: [
    { threshold: 10, multiplier: 1.8 }, { threshold: 20, multiplier: 1.5 },
    { threshold: 30, multiplier: 1.2 }, { threshold: 60, multiplier: 1.0 },
    { threshold: 80, multiplier: 0.9 }, { threshold: 100, multiplier: 0.7 },
    { threshold: 160, multiplier: 0.71 }, { threshold: 199, multiplier: 0.4 },
    { threshold: 299, multiplier: 0.3 }, { threshold: Infinity, multiplier: 0.25 }
  ],
  agent: [
    { threshold: 10, multiplier: 1.7 }, { threshold: 20, multiplier: 1.4 },
    { threshold: 30, multiplier: 1.15 }, { threshold: 60, multiplier: 1.0 },
    { threshold: 80, multiplier: 0.88 }, { threshold: 100, multiplier: 0.68 },
    { threshold: 160, multiplier: 0.69 }, { threshold: 199, multiplier: 0.38 },
    { threshold: 299, multiplier: 0.28 }, { threshold: Infinity, multiplier: 0.23 }
  ]
};

let acrylicSettingsEditState = {
  materials: false,
  printing: false,
  markup: false
};

let originalAcrylicMaterialPriceTable = null;
let originalAcrylicPrintingPriceTable = null;
let originalAcrylicMarkupRules = null;

const ACRYLIC_A_SIZES = {
  'A6': [105, 148], 'A5': [148, 210], 'A4': [210, 297], 'A3': [297, 420], 'A2': [420, 594]
};

// 2. LOGIC HELPERS
function loadAcrylicSettings() {
  const savedPrices = localStorage.getItem('savedPrices');
  if (savedPrices) acrylicPriceTable = JSON.parse(savedPrices);
  const savedMarkup = localStorage.getItem('savedMarkupRules');
  if (savedMarkup) acrylicMarkupRules = JSON.parse(savedMarkup);
}
// Load immediately
loadAcrylicSettings();

function saveAcrylicSettings() {
  localStorage.setItem('savedPrices', JSON.stringify(acrylicPriceTable));
  localStorage.setItem('savedMarkupRules', JSON.stringify(acrylicMarkupRules));
}

function getAcrylicBaseLabel(label) {
  return window.appModules?.acrylic?.getAcrylicBaseLabel?.(label) ?? (label || '').split('(')[0].trim();
}

function formatAcrylicUnitLabel(name, price) {
  return window.appModules?.acrylic?.formatAcrylicUnitLabel?.(name, price, createAcrylicContext()) ?? `${name}`;
}

function syncAcrylicPriceInputsToState(type) { window.appModules?.acrylicSettings?.syncAcrylicPriceInputsToState?.(type); }

function syncAcrylicMarkupInputsToState() { window.appModules?.acrylicSettings?.syncAcrylicMarkupInputsToState?.(); }

function addAcrylicPriceRow(type) { window.appModules?.acrylicSettings?.addAcrylicPriceRow?.(type); }

function moveAcrylicPriceUp(type, index) { window.appModules?.acrylicSettings?.moveAcrylicPriceUp?.(type, index); }

function moveAcrylicPriceDown(type, index) { window.appModules?.acrylicSettings?.moveAcrylicPriceDown?.(type, index); }

function removeAcrylicPriceRow(type, index) { window.appModules?.acrylicSettings?.removeAcrylicPriceRow?.(type, index); }

function addAcrylicMarkupRule() { window.appModules?.acrylicSettings?.addAcrylicMarkupRule?.(); }

function moveAcrylicMarkupRuleUp(index) { window.appModules?.acrylicSettings?.moveAcrylicMarkupRuleUp?.(index); }

function moveAcrylicMarkupRuleDown(index) { window.appModules?.acrylicSettings?.moveAcrylicMarkupRuleDown?.(index); }

function removeAcrylicMarkupRule(index) { window.appModules?.acrylicSettings?.removeAcrylicMarkupRule?.(index); }

function toggleAcrylicSettingsEditMode(section, isEditing) { window.appModules?.acrylicSettings?.toggleAcrylicSettingsEditMode?.(section, isEditing); }

function cancelAcrylicSettingsEdit(section) { window.appModules?.acrylicSettings?.cancelAcrylicSettingsEdit?.(section); }


function saveAcrylicSettingsSection(section) { window.appModules?.acrylicSettings?.saveAcrylicSettingsSection?.(section); }

function adjustAcrylicPrice(original) {
  return window.appModules?.acrylic?.adjustAcrylicPrice?.(original, createAcrylicContext()) ?? { price: original, note: 'Original' };
}

function convertAcrylicValue(val, from, to) {
  return window.appModules?.acrylic?.convertAcrylicValue?.(val, from, to) ?? val;
}

function fillAcrylicDropdown(selectEl, arr, defIndex = 2, noneLabel = "None") {
  window.appModules?.acrylic?.fillAcrylicDropdown?.(selectEl, arr, defIndex, noneLabel, createAcrylicContext());
}
function fillAllAcrylicDropdowns(currentIndices = {}) {
  window.appModules?.acrylic?.fillAllAcrylicDropdowns?.(currentIndices, createAcrylicContext());
}
function setAcrylicASize(size) {
  window.appModules?.acrylic?.setAcrylicASize?.(size, createAcrylicContext());
}
function highlightAcrylicPreset(size) {
  window.appModules?.acrylic?.highlightAcrylicPreset?.(size);
}
function checkAcrylicPresetActive() {
  window.appModules?.acrylic?.checkAcrylicPresetActive?.(createAcrylicContext());
}
function checkAcrylicManualInput() {
  window.appModules?.acrylic?.checkAcrylicManualInput?.(createAcrylicContext());
}
function handleAcrylicUserToggle(newUserMode) {
  window.appModules?.acrylic?.handleAcrylicUserToggle?.(newUserMode, createAcrylicContext());
}
function calculateAcrylicPrice() {
  window.appModules?.acrylic?.calculateAcrylicPrice?.(createAcrylicContext());
}
function drawAcrylicPreview() {
  window.appModules?.acrylic?.drawAcrylicPreview?.(createAcrylicContext());
}
function generateAcrylicSvg() {
  return window.appModules?.acrylic?.generateAcrylicSvg?.() ?? '';
}
function updateCopyableAcrylicInvoice() {
  window.appModules?.acrylic?.updateCopyableAcrylicInvoice?.(createAcrylicContext());
}
function renderAcrylicPriceListHTML(userMode, showCompareBtn = true, showHeader = true) {
  return window.appModules?.acrylic?.renderAcrylicPriceListHTML?.(userMode, showCompareBtn, showHeader, createAcrylicContext()) ?? '';
}
function updateAcrylicPriceList() {
  window.appModules?.acrylic?.updateAcrylicPriceList?.(createAcrylicContext());
}
function openAcrylicCompareModal() {
  window.appModules?.acrylic?.openAcrylicCompareModal?.(createAcrylicContext());
}
function closeAcrylicCompareModal() {
  window.appModules?.acrylic?.closeAcrylicCompareModal?.();
}
function renderAcrylicMarkupRules() {
  window.appModules?.acrylic?.renderAcrylicMarkupRules?.(arguments[0], createAcrylicContext());
}
function populateAcrylicPriceTable(tableBodyId, type) {
  window.appModules?.acrylic?.populateAcrylicPriceTable?.(tableBodyId, type, createAcrylicContext());
}

function getAcrylicCalculatorHTML() {
  return window.appModules?.acrylic?.getAcrylicCalculatorHTML?.() ?? '';
}
function getAcrylicSettingsModalHTML() {
  return window.appModules?.acrylic?.getAcrylicSettingsModalHTML?.() ?? '';
}
function handleAcrylicUnitChange(newUnit) {
  window.appModules?.acrylic?.handleAcrylicUnitChange?.(newUnit, createAcrylicContext());
}
function attachAcrylicListeners() {
  window.appModules?.acrylic?.attachAcrylicListeners?.(createAcrylicContext());
}
function renderAcrylicCalculator(container) {
  window.appModules?.acrylic?.renderAcrylicCalculator?.(container, createAcrylicContext());
}
function addAcrylicToPad() {
  window.appModules?.acrylic?.addAcrylicToPad?.(createAcrylicContext());
}
function renderAcrylicPricingSettingsTable() { window.appModules?.acrylicSettings?.renderAcrylicPricingSettingsTable?.(); }

// 6. HTML GENERATORS
// --- ARTWORK LOGIC FUNCTIONS ---
function toggleArtworkTools() {
  window.appModules?.artworkTools?.toggleArtworkTools?.(createArtworkToolsContext());
}

// --- START: DOWNLOAD OPTIONS LOGIC ---
function toggleDownloadOptions() {
  window.appModules?.printExport?.toggleDownloadOptions?.(createPrintExportContext());
}

// Toast Notification Function

// Saves & restores horizontal scroll of overflow-x containers inside settingsTableDiv
// so that action buttons (delete, move) don't jump the view back to column 1
function _saveSettingsScrolls() {
  const container = document.getElementById('settingsTableDiv');
  if (!container) return [];
  return Array.from(container.querySelectorAll('[style*="overflow-x"]')).map(el => el.scrollLeft);
}
function _restoreSettingsScrolls(positions) {
  if (!positions || !positions.length) return;
  const container = document.getElementById('settingsTableDiv');
  if (!container) return;
  const els = container.querySelectorAll('[style*="overflow-x"]');
  positions.forEach((pos, i) => { if (els[i]) els[i].scrollLeft = pos; });
}
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = toast ? toast.querySelector('i') : null;

  if (toast && toastMessage) {
    // Set background color based on type
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

function setDownloadDPI(val) {
  window.appModules?.printExport?.setDownloadDPI?.(createPrintExportContext(), val);
}

function setCustomDPI(val) {
  window.appModules?.printExport?.setCustomDPI?.(createPrintExportContext(), val);
}

function setFileType(type) {
  window.appModules?.printExport?.setFileType?.(createPrintExportContext(), type);
}

// Download Preview Canvas as JPG image (High Resolution)
function downloadPreviewCanvas() {
  window.appModules?.printExport?.downloadPreviewCanvas?.(createPrintExportContext());
}

async function handleFinalDownload() {
  await window.appModules?.printExport?.handleFinalDownload?.(createPrintExportContext());
}

function createPrintExportContext() {
  return {
    applyMainCalcPanelButtonVisual,
    getArtConfig: () => artConfig,
    getIsStickerOrPolysilk: () => isStickerOrPolysilk,
    getUploadedArtworkImg: () => uploadedArtworkImg,
    isExceptionSize,
    setArtShowTools: (value) => {
      artConfig.showTools = value;
    },
    showToast,
  };
}
// --- END: DOWNLOAD OPTIONS LOGIC ---

// --- NEW: PDF HELPER FUNCTION ---
async function renderPDFToImage(file) {
  return window.appModules?.artworkTools?.renderPDFToImage?.(file);
}

// --- UPDATED: MAIN PROCESSOR ---
async function processArtworkFile(file) {
  await window.appModules?.artworkTools?.processArtworkFile?.(file, createArtworkToolsContext());
}

function handleDesignUpload(input) {
  window.appModules?.artworkTools?.handleDesignUpload?.(input, createArtworkToolsContext());
}

function initArtworkDragAndDrop() {
  window.appModules?.artworkTools?.initArtworkDragAndDrop?.(createArtworkToolsContext());
}

function clearDesign() {
  window.appModules?.artworkTools?.clearDesign?.(createArtworkToolsContext());
}

function toggleArtLock() {
  window.appModules?.artworkTools?.toggleArtLock?.(createArtworkToolsContext());
}

function resetArtworkFit() {
  window.appModules?.artworkTools?.resetArtworkFit?.(createArtworkToolsContext());
}

function updateDesignDims(changed) {
  window.appModules?.artworkTools?.updateDesignDims?.(changed, createArtworkToolsContext());
}

function rotateDesignImg() {
  window.appModules?.artworkTools?.rotateDesignImg?.(createArtworkToolsContext());
}

function createArtworkToolsContext() {
  return {
    applyMainCalcPanelButtonVisual,
    convertToFeetCalc,
    getArtConfig: () => artConfig,
    getUploadedArtworkImg: () => uploadedArtworkImg,
    setUploadedArtworkImg: (image) => {
      uploadedArtworkImg = image;
    },
    updatePreview: currentCategory === 'dtf'
      ? (document.getElementById('uvdtfType') ? kiraUVDTF : kiraDTF)
      : updatePreview,
  };
}

function createPrintShellContext() {
  return {
    applyMainCalcPanelButtonVisual,
    attachGridListeners,
    convertFromMm,
    convertToMm,
    formatCurrency,
    getArtConfig: () => artConfig,
    getCurrentAspectRatio: () => currentAspectRatio,
    getCurrentCurrency: () => currentCurrency,
    getCurrentInputUnit: () => currentInputUnit,
    getGlobalAgentMode: () => globalAgentMode,
    getGlobalGovSurchargePercent: () => globalGovSurchargePercent,
    getIsRatioLocked: () => isRatioLocked,
    getLastClickedASize: () => lastClickedASize,
    getLastUsedDimensions: () => ({ width: lastUsedWidth, height: lastUsedHeight, unit: lastUsedUnit }),
    getMaterials: () => materials,
    getPricePerSqFt: () => pricePerSqFt,
    getScrollPosition: (category) => category === 'largeFormat' ? largeFormatScrollPos : signboardScrollPos,
    getSignboardMaterials: () => signboardMaterials,
    initArtworkDragAndDrop,
    kiraHarga,
    renderMaterialGrid,
    setCurrentAspectRatio: (value) => {
      currentAspectRatio = value;
    },
    setCurrentCategory: (value) => {
      currentCategory = value;
    },
    setCurrentInputUnit: (value) => {
      currentInputUnit = value;
    },
    setIsRatioLocked: (value) => {
      isRatioLocked = value;
    },
    setIsStickerOrPolysilk: (value) => {
      isStickerOrPolysilk = value;
    },
    setLastClickedASize: (value) => {
      lastClickedASize = value;
    },
    setPricePerSqFt: (value) => {
      pricePerSqFt = value;
    },
    setScrollPosition: (category, value) => {
      if (category === 'largeFormat') largeFormatScrollPos = value;
      if (category === 'signboard') signboardScrollPos = value;
    },
    setSelectedMaterialIndex: (value) => {
      selectedMaterialIndex = value;
    },
    syncStickerDropdownLabel,
    updateFinishingOptions,
  };
}

const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const themeToggleBtn = document.getElementById('theme-toggle');
// Function to update icon state
const updateIcons = () => {
  if (document.documentElement.classList.contains('dark')) {
    themeToggleLightIcon.classList.remove('hidden');
    themeToggleDarkIcon.classList.add('hidden');
  } else {
    themeToggleLightIcon.classList.add('hidden');
    themeToggleDarkIcon.classList.remove('hidden');
  }
};
// Check for saved theme in localStorage on page load
if (localStorage.getItem('color-theme') === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  // Default to dark if nothing is saved or it's set to dark
  document.documentElement.classList.add('dark');
}
updateIcons(); // Set the initial icon state
// Add click listener to the toggle button
themeToggleBtn.addEventListener('click', () => {
  // Toggle the class on the <html> element
  document.documentElement.classList.toggle('dark');
  // Update localStorage with the new theme
  if (document.documentElement.classList.contains('dark')) {
    localStorage.setItem('color-theme', 'dark');
  } else {
    localStorage.setItem('color-theme', 'light');
  }
  updateIcons(); // Update the icon after toggling
});
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + S to save quote (prevent default browser save)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (quotePadItems.length > 0) {
      saveQuote();
    } else {
      showToast('Quote pad is empty. Add items first!', 'error');
    }
  }
  // Ctrl/Cmd + P to open/close quote pad
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    const slider = document.getElementById('quotePadSlider');
    const isVisible = slider.classList.contains('visible');
    toggleQuotePad(!isVisible);
  }
  // Escape to close modals
  if (e.key === 'Escape') {
    // Close quote preview modal
    const quotePreviewModal = document.getElementById('quotePreviewModal');
    if (quotePreviewModal && quotePreviewModal.classList.contains('flex')) {
      closeQuotePreviewModal();
    }
    // Close currency modal
    const currencyModal = document.getElementById('currencyModal');
    if (currencyModal && currencyModal.style.display === 'flex') {
      closeCurrencyModal();
    }
    // Close acrylic settings modal
    const acrylicModal = document.getElementById('acrylicSettingsModal');
    if (acrylicModal && !acrylicModal.classList.contains('hidden')) {
      acrylicModal.classList.add('hidden');
    }
    // Close quote pad if open
    const slider = document.getElementById('quotePadSlider');
    if (slider && slider.classList.contains('visible')) {
      toggleQuotePad(false);
    }
  }
});

// =============================================================================
// Lanyard â€“ copy invoice text to clipboard (duplicate removed â€” see top of file)
// =============================================================================

// --- Stamp Settings Table ---
function renderStampSettingsTable() { window.appModules?.stampSettings?.renderStampSettingsTable?.(); }

// Stamp edit state
let stampEditState = {};
let originalStampsData = {}; // Backup for revert on cancel

// Toggle edit mode for a category
function toggleStampCategoryEdit(categoryName, isEditing) { window.appModules?.stampSettings?.toggleStampCategoryEdit?.(categoryName, isEditing); }

// Cancel stamp category edit and revert changes
function cancelStampCategoryEdit(categoryName) { window.appModules?.stampSettings?.cancelStampCategoryEdit?.(categoryName); }

// Add new stamp to category
function addStampToCategory(categoryName) { window.appModules?.stampSettings?.addStampToCategory?.(categoryName); }

// Save stamp category changes
function saveStampCategory(categoryName) { window.appModules?.stampSettings?.saveStampCategory?.(categoryName); }

// Move stamp up
function moveStampUp(categoryName, stampIdx) { window.appModules?.stampSettings?.moveStampUp?.(categoryName, stampIdx); }

// Move stamp down
function moveStampDown(categoryName, stampIdx) { window.appModules?.stampSettings?.moveStampDown?.(categoryName, stampIdx); }

// Delete stamp
function deleteStamp(categoryName, stampIdx) { window.appModules?.stampSettings?.deleteStamp?.(categoryName, stampIdx); }

var originalIdCardData = {};

function renderIDCardSettingsTable() { window.appModules?.idCardSettings?.renderIDCardSettingsTable?.(); }

function toggleIDCardEditMode(section, isEditing, index = null) { window.appModules?.idCardSettings?.toggleIDCardEditMode?.(section, isEditing, index); }

function saveIDCardSettings(section, addonIndex = null) { window.appModules?.idCardSettings?.saveIDCardSettings?.(section, addonIndex); }


function moveIDCardQtyUp(index) { window.appModules?.idCardSettings?.moveIDCardQtyUp?.(index); }

function moveIDCardQtyDown(index) { window.appModules?.idCardSettings?.moveIDCardQtyDown?.(index); }

function removeIDCardQtyByIndex(index) { window.appModules?.idCardSettings?.removeIDCardQtyByIndex?.(index); }

function addIDCardAddonType(action, addonIndex = null) { window.appModules?.idCardSettings?.addIDCardAddonType?.(action, addonIndex); }

function addIDCardAddonOption(action, addonIndex, optionIndex = null) { window.appModules?.idCardSettings?.addIDCardAddonOption?.(action, addonIndex, optionIndex); }

function moveIDCardAddonOptionUp(addonIndex, optionIndex) { window.appModules?.idCardSettings?.moveIDCardAddonOptionUp?.(addonIndex, optionIndex); }

function moveIDCardAddonOptionDown(addonIndex, optionIndex) { window.appModules?.idCardSettings?.moveIDCardAddonOptionDown?.(addonIndex, optionIndex); }

function openAddIDCardAddonGroupModal() { window.appModules?.idCardSettings?.openAddIDCardAddonGroupModal?.(); }

function closeAddIDCardAddonGroupModal() { window.appModules?.idCardSettings?.closeAddIDCardAddonGroupModal?.(); }

function confirmAddIDCardAddonGroup() { window.appModules?.idCardSettings?.confirmAddIDCardAddonGroup?.(); }

