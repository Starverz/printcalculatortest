const downloadConfig = {
  dpi: 300,
  type: 'svg',
};

function toInch(value, unit) {
  switch (unit) {
    case 'mm':
      return value / 25.4;
    case 'cm':
      return value / 2.54;
    case 'm':
      return value * 39.3701;
    case 'ft':
      return value * 12;
    case 'in':
      return value;
    default:
      return value;
  }
}

function getPrintInputState() {
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const unitInput = document.getElementById('measurementUnit');

  if (!widthInput || !heightInput || !unitInput) {
    return null;
  }

  const rawW = parseFloat(widthInput.value) || 0;
  const rawH = parseFloat(heightInput.value) || 0;
  const unit = unitInput.value;

  return {
    widthInput,
    heightInput,
    unitInput,
    rawW,
    rawH,
    unit,
  };
}

function getBorderOffsetsInches(unit) {
  const whiteBorderEl = document.getElementById('whiteBorderOption');
  const customBorderToggle = document.getElementById('customBorderToggle');
  const isCustomBorderActive = !!(customBorderToggle && customBorderToggle.classList.contains('btn-primary'));

  let offTop = 0;
  let offBottom = 0;
  let offLeft = 0;
  let offRight = 0;

  if (isCustomBorderActive) {
    offTop = toInch(parseFloat(document.getElementById('customBorderTop').value) || 0, unit);
    offBottom = toInch(parseFloat(document.getElementById('customBorderBottom').value) || 0, unit);
    offLeft = toInch(parseFloat(document.getElementById('customBorderLeft').value) || 0, unit);
    offRight = toInch(parseFloat(document.getElementById('customBorderRight').value) || 0, unit);
  } else if (whiteBorderEl && whiteBorderEl.value !== 'none' && !whiteBorderEl.disabled) {
    const borderValue = parseFloat(whiteBorderEl.value);
    offTop = borderValue;
    offBottom = borderValue;
    offLeft = borderValue;
    offRight = borderValue;
  }

  return {
    offTop,
    offBottom,
    offLeft,
    offRight,
    isCustomBorderActive,
  };
}

function getEyeletPoints({ mode, designWInch, designHInch, isSimple, isExceptionSize }) {
  if (isSimple || mode === 'none' || mode === 'pipe') {
    return [];
  }

  const points = [];
  const margin = 1.0;
  const widthInFeet = designWInch / 12;
  const heightInFeet = designHInch / 12;

  if (mode === 'manual') {
    const topCount = parseInt(document.getElementById('manualTop').value, 10) || 0;
    const bottomCount = parseInt(document.getElementById('manualBottom').value, 10) || 0;
    const leftCount = parseInt(document.getElementById('manualLeft').value, 10) || 0;
    const rightCount = parseInt(document.getElementById('manualRight').value, 10) || 0;

    if (topCount === 1) {
      points.push({ x: designWInch / 2, y: margin });
    } else if (topCount >= 2) {
      const gap = (designWInch - (margin * 2)) / (topCount - 1);
      for (let index = 0; index < topCount; index += 1) {
        points.push({ x: margin + (gap * index), y: margin });
      }
    }

    if (bottomCount === 1) {
      points.push({ x: designWInch / 2, y: designHInch - margin });
    } else if (bottomCount >= 2) {
      const gap = (designWInch - (margin * 2)) / (bottomCount - 1);
      for (let index = 0; index < bottomCount; index += 1) {
        points.push({ x: margin + (gap * index), y: designHInch - margin });
      }
    }

    if (leftCount > 0) {
      const gap = (designHInch - (margin * 2)) / (leftCount + 1);
      for (let index = 1; index <= leftCount; index += 1) {
        points.push({ x: margin, y: margin + (gap * index) });
      }
    }

    if (rightCount > 0) {
      const gap = (designHInch - (margin * 2)) / (rightCount + 1);
      for (let index = 1; index <= rightCount; index += 1) {
        points.push({ x: designWInch - margin, y: margin + (gap * index) });
      }
    }

    return points;
  }

  points.push({ x: margin, y: margin });
  points.push({ x: designWInch - margin, y: margin });
  points.push({ x: margin, y: designHInch - margin });
  points.push({ x: designWInch - margin, y: designHInch - margin });

  if (!isExceptionSize(widthInFeet, heightInFeet)) {
    const topInterior = Math.round(widthInFeet / 2) - 1;
    if (topInterior > 0) {
      const gap = (designWInch - (margin * 2)) / (topInterior + 1);
      for (let index = 1; index <= topInterior; index += 1) {
        points.push({ x: margin + (gap * index), y: margin });
      }
    }

    const bottomInterior = Math.round(widthInFeet / 3) - 1;
    if (bottomInterior > 0) {
      const gap = (designWInch - (margin * 2)) / (bottomInterior + 1);
      for (let index = 1; index <= bottomInterior; index += 1) {
        points.push({ x: margin + (gap * index), y: designHInch - margin });
      }
    }

    const sideEach = (heightInFeet > 2.5 && heightInFeet <= 3) ? 1 : (heightInFeet > 3 && heightInFeet <= 4) ? 2 : (heightInFeet > 4) ? 2 : 0;
    if (sideEach > 0) {
      const gap = (designHInch - (margin * 2)) / (sideEach + 1);
      for (let index = 1; index <= sideEach; index += 1) {
        const yPos = margin + (gap * index);
        points.push({ x: margin, y: yPos });
        points.push({ x: designWInch - margin, y: yPos });
      }
    }
  }

  return points;
}

function embedJpegDPI(dataUrl, dpi) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    array[index] = binary.charCodeAt(index);
  }

  for (let index = 0; index < array.length - 20; index += 1) {
    if (array[index] === 0xFF && array[index + 1] === 0xE0) {
      if (array[index + 4] === 0x4A && array[index + 5] === 0x46 && array[index + 6] === 0x49 && array[index + 7] === 0x46) {
        array[index + 11] = 1;
        array[index + 12] = (dpi >> 8) & 0xFF;
        array[index + 13] = dpi & 0xFF;
        array[index + 14] = (dpi >> 8) & 0xFF;
        array[index + 15] = dpi & 0xFF;
        break;
      }
    }
  }

  let binaryString = '';
  for (let index = 0; index < array.length; index += 1) {
    binaryString += String.fromCharCode(array[index]);
  }

  return `data:image/jpeg;base64,${btoa(binaryString)}`;
}

export function toggleDownloadOptions(context) {
  const dlPanel = document.getElementById('downloadOptionsPanel');
  const dlIcon = document.getElementById('dlToggleIcon');
  const dlBtn = document.getElementById('downloadOptionsBtn');

  const artPanel = document.getElementById('artworkToolsPanel');
  const artIcon = document.getElementById('artToggleIcon');
  const artBtn = document.getElementById('artworkToolsBtn');
  if (artPanel && artPanel.classList.contains('panel-open')) {
    artPanel.classList.remove('panel-open');
    context.setArtShowTools(false);
    if (artIcon) {
      artIcon.classList.remove('fa-chevron-up');
      artIcon.classList.add('fa-chevron-down');
    }
    context.applyMainCalcPanelButtonVisual(artBtn, false);
  }

  const isOpen = dlPanel.classList.contains('panel-open');
  if (!isOpen) {
    dlPanel.classList.add('panel-open');
    dlIcon.classList.remove('fa-chevron-down');
    dlIcon.classList.add('fa-chevron-up');
    context.applyMainCalcPanelButtonVisual(dlBtn, true);
  } else {
    dlPanel.classList.remove('panel-open');
    dlIcon.classList.remove('fa-chevron-up');
    dlIcon.classList.add('fa-chevron-down');
    context.applyMainCalcPanelButtonVisual(dlBtn, false);
  }
}

export function setDownloadDPI(_context, value) {
  downloadConfig.dpi = parseInt(value, 10);
  document.querySelectorAll('#dpiBtnGroup .size-btn').forEach((button) => {
    if (parseInt(button.innerText, 10) === downloadConfig.dpi) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  const customInput = document.getElementById('customDpiInput');
  if (customInput) {
    customInput.value = '';
  }
}

export function setCustomDPI(_context, value) {
  const num = parseInt(value, 10);
  if (num > 0) {
    downloadConfig.dpi = num;
    document.querySelectorAll('#dpiBtnGroup .size-btn').forEach((button) => button.classList.remove('active'));
  }
}

export function setFileType(_context, type) {
  downloadConfig.type = type;
  document.querySelectorAll('#fileTypeBtnGroup .size-btn').forEach((button) => {
    if (button.innerText.toLowerCase() === type) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

export function downloadPreviewCanvas(context) {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) {
    alert('Preview canvas not found');
    return;
  }

  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  const unitInput = document.getElementById('measurementUnit');
  const rawW = widthInput ? widthInput.value : '0';
  const rawH = heightInput ? heightInput.value : '0';
  const unit = unitInput ? unitInput.value : '';

  const scale = 3;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width * scale;
  tempCanvas.height = canvas.height * scale;
  const tempCtx = tempCanvas.getContext('2d');

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = 'high';
  tempCtx.fillStyle = '#FFFFFF';
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.scale(scale, scale);
  tempCtx.drawImage(canvas, 0, 0);

  const link = document.createElement('a');
  link.download = `Preview_${rawW}x${rawH}${unit}.jpg`;
  link.href = tempCanvas.toDataURL('image/jpeg', 0.95);
  link.click();
  context.showToast('✓ Preview downloaded!');
}

export function downloadLargeFormatSVG(context) {
  const state = getPrintInputState();
  if (!state) return;

  const { rawW, rawH, unit } = state;
  if (rawW <= 0 || rawH <= 0) {
    alert('Invalid dimensions.');
    return;
  }

  const designW = toInch(rawW, unit);
  const designH = toInch(rawH, unit);
  const eyeletOption = document.getElementById('eyeletOption');
  const mode = eyeletOption ? eyeletOption.value : 'none';
  const { offTop, offBottom, offLeft, offRight } = getBorderOffsetsInches(unit);
  const totalW = designW + offLeft + offRight;
  const totalH = designH + offTop + offBottom;
  const eyelets = getEyeletPoints({
    mode,
    designWInch: designW,
    designHInch: designH,
    isSimple: context.getIsStickerOrPolysilk(),
    isExceptionSize: context.isExceptionSize,
  });

  let imageTag = '';
  const uploadedArtworkImg = context.getUploadedArtworkImg();
  const artConfig = context.getArtConfig();
  if (uploadedArtworkImg) {
    const widthInchState = artConfig.width * 12;
    const heightInchState = artConfig.height * 12;
    const cx = offLeft + (designW / 2);
    const cy = offTop + (designH / 2);
    const finalImgW = (artConfig.rotation === 90 || artConfig.rotation === 270) ? heightInchState : widthInchState;
    const finalImgH = (artConfig.rotation === 90 || artConfig.rotation === 270) ? widthInchState : heightInchState;
    const imgX = cx - (finalImgW / 2);
    const imgY = cy - (finalImgH / 2);
    const transform = `rotate(${artConfig.rotation}, ${cx}, ${cy})`;
    imageTag = `<image xlink:href="${uploadedArtworkImg.src}" x="${imgX}" y="${imgY}" width="${finalImgW}" height="${finalImgH}" transform="${transform}" preserveAspectRatio="none" />`;
  }

  const hasBorder = (offTop > 0 || offBottom > 0 || offLeft > 0 || offRight > 0);
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="${totalW}in" height="${totalH}in" viewBox="0 0 ${totalW} ${totalH}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <g id="Layer_1">
              ${imageTag}

              <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="none" stroke="#000000" stroke-width="1pt" />
              
              ${hasBorder ? `<rect x="${offLeft}" y="${offTop}" width="${designW}" height="${designH}" fill="none" stroke="#000000" stroke-width="1pt" />` : ''}

              ${eyelets.map((pt) => `<circle cx="${pt.x + offLeft}" cy="${pt.y + offTop}" r="0.15" fill="#FFFFFF" stroke="#000000" stroke-width="1pt" />`).join('\n        ')}
          </g>
      </svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const suffix = uploadedArtworkImg ? '_WithImage' : '';
  link.download = `Outline_${rawW}x${rawH}${unit}_Eyelets${suffix}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  context.showToast('✓ SVG downloaded!');
}

export async function handleFinalDownload(context) {
  const currentEvent = typeof event !== 'undefined' ? event : window.event;
  const btn = currentEvent?.currentTarget || null;
  const originalText = btn ? btn.innerHTML : null;
  if (btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;
  }

  const state = getPrintInputState();
  if (!state) {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
    return;
  }

  const { rawW, rawH, unit } = state;

  try {
    if (downloadConfig.type === 'svg') {
      downloadLargeFormatSVG(context);
    } else {
      const designWInch = toInch(rawW, unit);
      const designHInch = toInch(rawH, unit);
      const { offTop, offBottom, offLeft, offRight } = getBorderOffsetsInches(unit);
      const totalWInch = designWInch + offLeft + offRight;
      const totalHInch = designHInch + offTop + offBottom;
      const pixelW = Math.ceil(totalWInch * downloadConfig.dpi);
      const pixelH = Math.ceil(totalHInch * downloadConfig.dpi);

      if (pixelW * pixelH > 25000000 && !confirm(`This file will be extremely large (${pixelW}x${pixelH} px). It might crash the browser. Continue?`)) {
        if (btn) {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
        return;
      }

      const hrCanvas = document.createElement('canvas');
      hrCanvas.width = pixelW;
      hrCanvas.height = pixelH;
      const ctx = hrCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, pixelW, pixelH);

      const uploadedArtworkImg = context.getUploadedArtworkImg();
      const artConfig = context.getArtConfig();
      if (uploadedArtworkImg) {
        const drawX = offLeft * downloadConfig.dpi;
        const drawY = offTop * downloadConfig.dpi;
        const drawW = designWInch * downloadConfig.dpi;
        const drawH = designHInch * downloadConfig.dpi;
        const cx = drawX + drawW / 2;
        const cy = drawY + drawH / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((artConfig.rotation * Math.PI) / 180);
        if (artConfig.rotation === 90 || artConfig.rotation === 270) {
          ctx.drawImage(uploadedArtworkImg, -drawH / 2, -drawW / 2, drawH, drawW);
        } else {
          ctx.drawImage(uploadedArtworkImg, -drawW / 2, -drawH / 2, drawW, drawH);
        }
        ctx.restore();
      }

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, downloadConfig.dpi / 72);
      ctx.strokeRect(0, 0, pixelW, pixelH);

      if (offTop > 0 || offBottom > 0 || offLeft > 0 || offRight > 0) {
        ctx.strokeRect(offLeft * downloadConfig.dpi, offTop * downloadConfig.dpi, designWInch * downloadConfig.dpi, designHInch * downloadConfig.dpi);
      }

      const eyeletOption = document.getElementById('eyeletOption');
      const mode = eyeletOption ? eyeletOption.value : 'none';
      const eyelets = getEyeletPoints({
        mode,
        designWInch,
        designHInch,
        isSimple: context.getIsStickerOrPolysilk(),
        isExceptionSize: context.isExceptionSize,
      });

      if (eyelets.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, downloadConfig.dpi / 72);
        const radius = 0.15 * downloadConfig.dpi;

        eyelets.forEach((pt) => {
          const cx = (offLeft + pt.x) * downloadConfig.dpi;
          const cy = (offTop + pt.y) * downloadConfig.dpi;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        });
      }

      if (downloadConfig.type === 'jpg') {
        const link = document.createElement('a');
        link.download = `Print_${rawW}x${rawH}_${downloadConfig.dpi} dpi.jpg`;
        const rawJpeg = hrCanvas.toDataURL('image/jpeg', 0.92);
        link.href = embedJpegDPI(rawJpeg, downloadConfig.dpi);
        link.click();
        context.showToast('✓ JPG downloaded!');
      } else if (downloadConfig.type === 'pdf') {
        const { jsPDF } = window.jspdf;
        const orientation = totalWInch >= totalHInch ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'in',
          format: [totalWInch, totalHInch],
        });

        if (uploadedArtworkImg) {
          const tempCanvas = document.createElement('canvas');
          const artPixelW = designWInch * downloadConfig.dpi;
          const artPixelH = designHInch * downloadConfig.dpi;
          tempCanvas.width = artPixelW;
          tempCanvas.height = artPixelH;
          const tempCtx = tempCanvas.getContext('2d');
          const cx = artPixelW / 2;
          const cy = artPixelH / 2;
          tempCtx.translate(cx, cy);
          tempCtx.rotate((artConfig.rotation * Math.PI) / 180);
          if (artConfig.rotation === 90 || artConfig.rotation === 270) {
            tempCtx.drawImage(uploadedArtworkImg, -artPixelH / 2, -artPixelW / 2, artPixelH, artPixelW);
          } else {
            tempCtx.drawImage(uploadedArtworkImg, -artPixelW / 2, -artPixelH / 2, artPixelW, artPixelH);
          }
          pdf.addImage(tempCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', offLeft, offTop, designWInch, designHInch);
        }

        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(1 / 72);
        pdf.rect(0, 0, totalWInch, totalHInch, 'S');
        if (offTop > 0 || offBottom > 0 || offLeft > 0 || offRight > 0) {
          pdf.rect(offLeft, offTop, designWInch, designHInch, 'S');
        }

        if (eyelets.length > 0) {
          const eyeletRadius = 0.15;
          eyelets.forEach((pt) => {
            const cx = offLeft + pt.x;
            const cy = offTop + pt.y;
            pdf.setFillColor(255, 255, 255);
            pdf.circle(cx, cy, eyeletRadius, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(1 / 72);
            pdf.circle(cx, cy, eyeletRadius, 'S');
          });
        }

        pdf.save(`Print_${rawW}x${rawH}_${downloadConfig.dpi} dpi.pdf`);
        context.showToast('✓ PDF downloaded!');
      }
    }
  } catch (error) {
    console.error(error);
    alert('Error generating file.');
  }

  if (btn) {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}