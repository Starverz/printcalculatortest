function getPdfJsLib() {
  return window.pdfjsLib;
}

export function toggleArtworkTools(context) {
  const artPanel = document.getElementById('artworkToolsPanel');
  const artIcon = document.getElementById('artToggleIcon');
  const artBtn = document.getElementById('artworkToolsBtn');

  const dlPanel = document.getElementById('downloadOptionsPanel');
  const dlIcon = document.getElementById('dlToggleIcon');
  const dlBtn = document.getElementById('downloadOptionsBtn');
  if (dlPanel && dlPanel.classList.contains('panel-open')) {
    dlPanel.classList.remove('panel-open');
    if (dlIcon) {
      dlIcon.classList.remove('fa-chevron-up');
      dlIcon.classList.add('fa-chevron-down');
    }
    context.applyMainCalcPanelButtonVisual(dlBtn, false);
  }

  const artConfig = context.getArtConfig();
  artConfig.showTools = !artConfig.showTools;
  if (artConfig.showTools) {
    artPanel.classList.add('panel-open');
    artIcon.classList.remove('fa-chevron-down');
    artIcon.classList.add('fa-chevron-up');
    context.applyMainCalcPanelButtonVisual(artBtn, true);
  } else {
    artPanel.classList.remove('panel-open');
    artIcon.classList.remove('fa-chevron-up');
    artIcon.classList.add('fa-chevron-down');
    context.applyMainCalcPanelButtonVisual(artBtn, false);
  }
}

export async function renderPDFToImage(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getPdfJsLib().getDocument(arrayBuffer).promise;
    const page = await pdf.getPage(1);
    const scale = 4.17;
    const viewport = page.getViewport({ scale });

    const hiddenCanvas = document.createElement('canvas');
    const canvasContext = hiddenCanvas.getContext('2d');
    hiddenCanvas.height = viewport.height;
    hiddenCanvas.width = viewport.width;

    await page.render({
      canvasContext,
      viewport,
    }).promise;

    return hiddenCanvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Error rendering PDF:', error);
    alert('Failed to load PDF. Please ensure it is a valid PDF file.');
    return null;
  }
}

export async function processArtworkFile(file, context) {
  if (!file) return;

  let imageSource = null;
  const designFileName = document.getElementById('designFileName');

  if (file.type === 'application/pdf') {
    if (designFileName) {
      designFileName.textContent = `${file.name} (PDF Page 1)`;
    }
    imageSource = await renderPDFToImage(file);
    if (!imageSource) return;
  } else if (file.type.startsWith('image/') || file.type.includes('svg')) {
    if (designFileName) {
      designFileName.textContent = file.name;
    }
    const reader = new FileReader();
    imageSource = await new Promise((resolve) => {
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(file);
    });
  } else {
    alert('Please upload an image file (JPG, PNG, SVG) or a PDF.');
    return;
  }

  const image = new Image();
  image.onload = function onLoad() {
    context.setUploadedArtworkImg(image);
    const artConfig = context.getArtConfig();
    artConfig.ratio = image.width / image.height;
    artConfig.rotation = 0;

    const designWInput = document.getElementById('designW');
    const designHInput = document.getElementById('designH');
    if (designWInput) designWInput.disabled = false;
    if (designHInput) designHInput.disabled = false;

    const panel = document.getElementById('artworkToolsPanel');
    const icon = document.getElementById('artToggleIcon');
    if (panel && panel.style.display === 'none') {
      panel.style.display = 'block';
      if (icon) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
      }
      artConfig.showTools = true;
    }
    resetArtworkFit(context);
  };
  image.src = imageSource;
}

export function handleDesignUpload(input, context) {
  if (input.files && input.files[0]) {
    processArtworkFile(input.files[0], context);
  }
}

export function initArtworkDragAndDrop(context) {
  const dropZone = document.getElementById('previewCanvasWrapper');
  const overlay = document.getElementById('dragOverlay');
  if (!dropZone || !overlay) return;

  let dragCounter = 0;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();
    }, false);
  });

  dropZone.addEventListener('dragenter', () => {
    dragCounter += 1;
    overlay.style.display = 'flex';
  }, false);

  dropZone.addEventListener('dragleave', () => {
    dragCounter -= 1;
    if (dragCounter === 0) {
      overlay.style.display = 'none';
    }
  }, false);

  dropZone.addEventListener('drop', (event) => {
    dragCounter = 0;
    overlay.style.display = 'none';
    const { files } = event.dataTransfer;
    if (files && files[0]) {
      processArtworkFile(files[0], context);
    }
  }, false);
}

export function clearDesign(context) {
  context.setUploadedArtworkImg(null);
  const designUpload = document.getElementById('designUpload');
  const designFileName = document.getElementById('designFileName');
  const designW = document.getElementById('designW');
  const designH = document.getElementById('designH');

  if (designUpload) designUpload.value = '';
  if (designFileName) designFileName.textContent = '';
  if (designW) {
    designW.value = '';
    designW.disabled = true;
  }
  if (designH) {
    designH.value = '';
    designH.disabled = true;
  }

  context.updatePreview();
}

export function toggleArtLock(context) {
  const artConfig = context.getArtConfig();
  artConfig.isLocked = !artConfig.isLocked;
  const btn = document.getElementById('artLockBtn');
  if (!btn) return;

  if (artConfig.isLocked) {
    btn.classList.add('active-control');
    btn.innerHTML = '<i class="fas fa-lock"></i>';
    const width = parseFloat(document.getElementById('designW').value) || 1;
    const height = parseFloat(document.getElementById('designH').value) || 1;
    artConfig.ratio = width / height;
  } else {
    btn.classList.remove('active-control');
    btn.innerHTML = '<i class="fas fa-lock-open"></i>';
  }
}

export function resetArtworkFit(context) {
  if (!context.getUploadedArtworkImg()) return;

  const matRawW = parseFloat(document.getElementById('width').value) || 0;
  const matRawH = parseFloat(document.getElementById('height').value) || 0;
  const unit = document.getElementById('measurementUnit').value;
  const matW = context.convertToFeetCalc(matRawW, unit);
  const matH = context.convertToFeetCalc(matRawH, unit);
  const artConfig = context.getArtConfig();

  let newArtW = matW;
  let newArtH = matW / artConfig.ratio;
  if (newArtH > matH) {
    newArtH = matH;
    newArtW = matH * artConfig.ratio;
  }

  artConfig.width = newArtW;
  artConfig.height = newArtH;

  document.getElementById('designW').value = newArtW.toFixed(2);
  document.getElementById('designH').value = newArtH.toFixed(2);
  context.updatePreview();
}

export function updateDesignDims(changed, context) {
  if (!context.getUploadedArtworkImg()) return;

  const wInput = document.getElementById('designW');
  const hInput = document.getElementById('designH');
  const artConfig = context.getArtConfig();

  if (changed === 'w' && wInput.value === '') {
    artConfig.width = 0;
    return;
  }
  if (changed === 'h' && hInput.value === '') {
    artConfig.height = 0;
    return;
  }

  let width = parseFloat(wInput.value) || 0;
  let height = parseFloat(hInput.value) || 0;

  const matRawW = parseFloat(document.getElementById('width').value) || 0;
  const matRawH = parseFloat(document.getElementById('height').value) || 0;
  const unit = document.getElementById('measurementUnit').value;
  const matW = context.convertToFeetCalc(matRawW, unit);
  const matH = context.convertToFeetCalc(matRawH, unit);

  if (width > matW) width = matW;
  if (height > matH) height = matH;

  if (artConfig.isLocked) {
    if (changed === 'w') {
      height = width / artConfig.ratio;
      if (height > matH) {
        height = matH;
        width = height * artConfig.ratio;
      }
      hInput.value = height.toFixed(2);
    } else {
      width = height * artConfig.ratio;
      if (width > matW) {
        width = matW;
        height = width / artConfig.ratio;
      }
      wInput.value = width.toFixed(2);
    }
  }

  artConfig.width = width;
  artConfig.height = height;
  context.updatePreview();
}

export function rotateDesignImg(context) {
  if (!context.getUploadedArtworkImg()) return;

  const artConfig = context.getArtConfig();
  artConfig.rotation = (artConfig.rotation + 90) % 360;
  artConfig.ratio = 1 / artConfig.ratio;
  resetArtworkFit(context);
}