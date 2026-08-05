/**
 * QuantumMark — Dashboard Script
 *
 * Responsibilities:
 * 1. Initialise Lucide icons
 * 2. Mobile sidebar toggle (open / close / overlay click)
 * 3. Sidebar active-link state based on click
 * 4. Drag-over visual feedback on the dropzone (UI only — no real upload)
 * 5. Upload config tabs — activity tab switching (UI only)
 * 6. Scroll-reveal animations via IntersectionObserver
 * 7. Animate metric bar fills on first reveal
 */

document.addEventListener('DOMContentLoaded', () => {

  // 1. Render all Lucide icons
  initIcons();

  // 2 & 3. Sidebar toggle + active links
  initSidebar();

  // 4. Dropzone drag-over feedback
  initDropzone();

  // 5. Activity tab switching
  initActivityTabs();

  // 6. Scroll-reveal
  initReveal();

  // 7. Metric bar animation (on reveal)
  initMetricBars();

  // 8. Protect workspace initialisation
  initProtectWorkspace();

});


/* ============================================================
   1. Lucide icon initialisation
   lucide.createIcons() replaces every [data-lucide] with an SVG.
============================================================ */
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    // CDN may still be loading — retry after a short pause
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 600);
  }
}


/* ============================================================
   2 & 3. Sidebar — mobile toggle + active link state
   On small screens the sidebar is off-canvas and toggled with
   the hamburger button in the top nav bar.
============================================================ */
function initSidebar() {
  const sidebar        = document.getElementById('sidebar');
  const toggleBtn      = document.getElementById('sidebarToggle');
  const overlay        = document.getElementById('sidebarOverlay');
  const sidebarLinks   = document.querySelectorAll('.sidebar-link');
  if (!sidebar || !toggleBtn || !overlay) return;

  let isOpen = false;

  /* ── Open / close helpers ── */
  function openSidebar() {
    isOpen = true;
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    // Swap hamburger → X
    swapIcon(toggleBtn, 'x');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    isOpen = false;
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    toggleBtn.setAttribute('aria-expanded', 'false');
    // Swap X → hamburger
    swapIcon(toggleBtn, 'menu');
    document.body.style.overflow = '';
  }

  /* Toggle button */
  toggleBtn.addEventListener('click', () => {
    isOpen ? closeSidebar() : openSidebar();
  });

  /* Overlay click closes sidebar */
  overlay.addEventListener('click', closeSidebar);

  /* Escape key closes sidebar */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeSidebar();
  });

  /* ── Active link state on click ──
     Removes .active from the current active link and applies it to the clicked one.
     Note: the links are empty (#) so this is purely visual. */
  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Remove active from all
      sidebarLinks.forEach(l => {
        l.classList.remove('active');
        l.removeAttribute('aria-current');
      });
      // Apply to clicked
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');

      // Close sidebar on mobile after navigation
      if (isOpen) closeSidebar();
    });
  });
}

/**
 * swapIcon — replaces the data-lucide attribute on the first icon inside
 * a button and re-renders it, without disturbing surrounding elements.
 *
 * @param {HTMLElement} parentEl - The button containing the icon
 * @param {string}      iconName - Lucide icon name to switch to
 */
function swapIcon(parentEl, iconName) {
  // After createIcons() the <i> may have been replaced by <svg>;
  // try both selectors.
  const icon = parentEl.querySelector('[data-lucide], svg');
  if (!icon) return;
  icon.setAttribute('data-lucide', iconName);
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({ nodes: [icon] });
  }
}


/* ============================================================
   4. Dropzone — drag-over visual feedback and file preview
============================================================ */
function initDropzone() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('imageInput');
  const continueBtn = document.getElementById('continueBtn');
  const previewContainer = document.getElementById('dropzonePreview');
  const previewImage = document.getElementById('previewImage');
  const previewName = document.getElementById('previewName');
  const previewResolution = document.getElementById('previewResolution');
  const previewSize = document.getElementById('previewSize');
  const removeBtn = document.getElementById('removeImageBtn');
  const dropzoneCopy = dropzone ? dropzone.querySelector('.dropzone-copy') : null;
  const dropzoneFormats = dropzone ? dropzone.querySelector('.dropzone-formats') : null;
  const dropzoneNote = dropzone ? dropzone.querySelector('.dropzone-note') : null;

  if (!dropzone || !fileInput || !continueBtn || !previewContainer || !previewImage || !previewName || !previewResolution || !previewSize || !removeBtn || !dropzoneCopy || !dropzoneFormats || !dropzoneNote) {
    return;
  }

  let dragCounter = 0; // track nested drag events

  function togglePreview(visible) {
    previewContainer.hidden = !visible;
    dropzoneCopy.hidden = visible;
    dropzoneFormats.hidden = visible;
    dropzoneNote.hidden = visible;
    if (visible) {
      dropzone.classList.add('has-file');
      continueBtn.disabled = false;
      continueBtn.removeAttribute('aria-disabled');
    } else {
      dropzone.classList.remove('has-file');
      continueBtn.disabled = true;
      continueBtn.setAttribute('aria-disabled', 'true');
      previewImage.src = '';
      previewName.textContent = '-';
      previewResolution.textContent = '-';
      previewSize.textContent = '-';
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  function showFile(file) {
    const acceptedTypes = ['image/png', 'image/jpeg'];
    if (!acceptedTypes.includes(file.type)) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      previewImage.onload = () => URL.revokeObjectURL(objectUrl);
      previewImage.src = objectUrl;
      previewName.textContent = file.name;
      previewResolution.textContent = `${img.width} × ${img.height}`;
      previewSize.textContent = formatBytes(file.size);
      togglePreview(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
  }

  function handleFiles(files) {
    if (!files || !files.length) return;
    const file = files[0];
    showFile(file);
  }

  function resetSelection() {
    fileInput.value = '';
    togglePreview(false);
  }

  dropzone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropzone.classList.add('drag-over');
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  dropzone.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      dropzone.classList.remove('drag-over');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropzone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetSelection();
  });

  togglePreview(false);
}


/* ============================================================
   8. Protect Workspace — premium UI and interactions
   ============================================================ */
function initProtectWorkspace() {
  // Elements
  const workspace = document.getElementById('protectWorkspace');
  const origPreviewLarge = document.getElementById('origPreviewLarge');
  const origSmallPreview = document.getElementById('previewImage');
  const typeRadios = document.querySelectorAll('input[name="pwWatermarkType"]');
  const configSection = document.getElementById('pwConfigSection');
  const textPanel = document.getElementById('pwTextPanel');
  const textInput = document.getElementById('pwTextInput');
  const logoPanel = document.getElementById('pwLogoPanel');
  const qrPanel = document.getElementById('pwQRPanel');
  const logoDrop = document.getElementById('pwLogoDrop');
  const logoInput = document.getElementById('pwLogoInput');
  const logoPreview = document.getElementById('pwLogoPreview');
  const logoPreviewImg = document.getElementById('pwLogoPreviewImg');
  const removeLogoBtn = document.getElementById('pwRemoveLogoBtn');
  const strengthRadios = document.querySelectorAll('input[name="pwStrength"]');
  const quantumKeyInput = document.getElementById('pwQuantumKey');
  const genQuantumBtn = document.getElementById('pwGenQuantumBtn');
  const generateBtn = document.getElementById('pwGenerateBtn');
  const resetBtn = document.getElementById('pwResetBtn');
  const downloadBtn = document.getElementById('pwDownloadBtn');
  const analyticsSection = document.getElementById('pwAnalyticsSection');
  const protectedSection = document.getElementById('pwProtectedSection');
  const protectedImage = document.getElementById('pwProtectedImage');
  const overlay = document.getElementById('pwOverlay');
  const steps = document.getElementById('pwSteps');
  const successBadge = document.getElementById('pwSuccess');
  const continueBtn = document.getElementById('continueBtn');
  const imageInput = document.getElementById('imageInput');
  const dropzone = document.getElementById('dropzone');
  const pwPreviewOriginal = document.getElementById('pwPreviewOriginal');
  const pwPreviewProtected = document.getElementById('pwPreviewProtected');
  const pwCompareOriginal = document.getElementById('pwCompareOriginal');
  const pwCompareProtected = document.getElementById('pwCompareProtected');
  const pwCompareSlider = document.getElementById('pwCompareSlider');
  const pwCompareOverlay = document.getElementById('pwCompareOverlay');
  const pwCompareHandle = document.getElementById('pwCompareHandle');
  const pwTimelineSection = document.getElementById('pwTimelineSection');
  const pwScoreRing = document.getElementById('pwScoreRing');
  const pwScoreValue = document.getElementById('pwScoreValue');
  const certificateBtn = document.getElementById('pwCertificateBtn');
  const qrBtn = document.getElementById('pwQrBtn');

  if (!workspace) return;

  // State
  let selectedWatermarkType = null;
  let logoFile = null;

  // Show workspace when original image is loaded
  function showWorkspace() {
    if (workspace.hasAttribute('hidden')) workspace.removeAttribute('hidden');
    workspace.classList.add('visible');
  }

  function syncOriginalPreview() {
    if (origSmallPreview && origSmallPreview.src) {
      origPreviewLarge.src = origSmallPreview.src;
      showWorkspace();
      updateGenerateState();
    }
  }

  if (imageInput) {
    imageInput.addEventListener('change', () => {
      syncOriginalPreview();
    });
  }

  // Watermark type selector
  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      selectedWatermarkType = e.target.value;
      configSection.removeAttribute('hidden');
      
      // Show/hide conditional panels
      textPanel.setAttribute('hidden', '');
      logoPanel.setAttribute('hidden', '');
      qrPanel.setAttribute('hidden', '');

      if (selectedWatermarkType === 'text') {
        textPanel.removeAttribute('hidden');
        textInput.focus();
      } else if (selectedWatermarkType === 'logo') {
        logoPanel.removeAttribute('hidden');
      } else if (selectedWatermarkType === 'qrcode') {
        qrPanel.removeAttribute('hidden');
      }

      updateGenerateState();
    });
  });

  // Logo dropzone
  let logoDragCounter = 0;
  logoDrop.addEventListener('dragenter', (e) => {
    e.preventDefault();
    logoDragCounter++;
    logoDrop.classList.add('drag-over');
  });
  logoDrop.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  logoDrop.addEventListener('dragleave', () => {
    logoDragCounter--;
    if (logoDragCounter <= 0) {
      logoDragCounter = 0;
      logoDrop.classList.remove('drag-over');
    }
  });
  logoDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    logoDragCounter = 0;
    logoDrop.classList.remove('drag-over');
    handleLogoFiles(e.dataTransfer.files);
  });
  logoDrop.addEventListener('click', () => logoInput.click());
  logoInput.addEventListener('change', () => handleLogoFiles(logoInput.files));

  function handleLogoFiles(files) {
    if (!files || !files.length) return;
    const file = files[0];
    const acceptedTypes = ['image/png', 'image/jpeg'];
    if (!acceptedTypes.includes(file.type)) return;

    logoFile = file;
    const objectUrl = URL.createObjectURL(file);
    logoPreviewImg.onload = () => URL.revokeObjectURL(objectUrl);
    logoPreviewImg.src = objectUrl;
    logoPreview.removeAttribute('hidden');
    updateGenerateState();
  }

  removeLogoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    logoFile = null;
    logoInput.value = '';
    logoPreviewImg.src = '';
    logoPreview.setAttribute('hidden', '');
    updateGenerateState();
  });

  // Quantum key generation
  genQuantumBtn.addEventListener('click', () => {
    quantumKeyInput.value = generateHexKey(256);
  });

  // Generate state logic
  function hasOriginal() {
    return origSmallPreview && origSmallPreview.src && (origSmallPreview.src.startsWith('blob:') || origSmallPreview.src.indexOf('data:') !== -1);
  }

  function hasWatermarkConfigured() {
    if (!selectedWatermarkType) return false;
    
    if (selectedWatermarkType === 'text') {
      return textInput.value.trim().length > 0;
    } else if (selectedWatermarkType === 'logo') {
      return logoFile !== null;
    } else if (selectedWatermarkType === 'qrcode') {
      return true; // Always configured for QR
    }
    return false;
  }

  function hasQuantumKey() {
    return quantumKeyInput.value.trim().length > 0;
  }

  function updateGenerateState() {
    const canGenerate = hasOriginal() && hasWatermarkConfigured() && hasQuantumKey();
    generateBtn.disabled = !canGenerate;
    generateBtn.setAttribute('aria-disabled', canGenerate ? 'false' : 'true');
  }

  // Reset workspace
  resetBtn.addEventListener('click', () => {
    // Clear original image
    if (origSmallPreview) origSmallPreview.src = '';
    if (origPreviewLarge) origPreviewLarge.src = '';

    // Clear watermark type selection
    typeRadios.forEach(r => r.checked = false);
    selectedWatermarkType = null;
    configSection.setAttribute('hidden', '');
    textPanel.setAttribute('hidden', '');
    logoPanel.setAttribute('hidden', '');
    qrPanel.setAttribute('hidden', '');

    // Clear text input
    textInput.value = '';

    // Clear logo
    logoFile = null;
    logoInput.value = '';
    logoPreviewImg.src = '';
    logoPreview.setAttribute('hidden', '');

    // Reset strength to medium
    strengthRadios.forEach(r => {
      r.checked = r.value === 'medium';
    });

    // Clear quantum key
    quantumKeyInput.value = '';

    // Hide results
    analyticsSection.setAttribute('hidden', '');
    protectedSection.setAttribute('hidden', '');
    if (protectedImage) protectedImage.src = '';
    successBadge.setAttribute('hidden', '');
      if (pwCompareSlider) pwCompareSlider.setAttribute('hidden', '');
      if (pwTimelineSection) pwTimelineSection.setAttribute('hidden', '');
      if (pwScoreRing) pwScoreRing.style.setProperty('--score', 0);
      if (pwScoreValue) pwScoreValue.textContent = '0';
      if (certificateBtn) certificateBtn.disabled = true;
      if (certificateBtn) certificateBtn.setAttribute('aria-disabled', 'true');
      if (qrBtn) qrBtn.disabled = true;
      if (qrBtn) qrBtn.setAttribute('aria-disabled', 'true');
    generateBtn.disabled = true;
    downloadBtn.disabled = true;
    generateBtn.setAttribute('aria-disabled', 'true');
    downloadBtn.setAttribute('aria-disabled', 'true');

    // Re-enable upload controls
    if (dropzone) dropzone.classList.remove('disabled');
    if (imageInput) imageInput.disabled = false;

    updateGenerateState();
  });

  // Generate watermark (processing simulation)
  generateBtn.addEventListener('click', () => {
    if (!hasOriginal() || !hasWatermarkConfigured() || !hasQuantumKey()) return;

    runProcessing();
  });

  function runProcessing() {
    overlay.removeAttribute('hidden');
    successBadge.setAttribute('hidden', '');
    downloadBtn.disabled = true;

    const processingSteps = [
      'Initializing...',
      'Generating Quantum Key...',
      'Embedding Watermark...',
      'Running Quality Analysis...',
      'Preparing Protected Image...',
      'Completed Successfully'
    ];

    // Render steps
    steps.innerHTML = '';
    processingSteps.forEach((label, i) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'pw-step';
      stepEl.dataset.index = i;
      stepEl.innerHTML = `
        <div class="dot"><span class="check">✓</span></div>
        <div class="label">${label}</div>
      `;
      steps.appendChild(stepEl);
    });

    // Disable upload controls
    if (dropzone) dropzone.classList.add('disabled');
    if (imageInput) imageInput.disabled = true;
    typeRadios.forEach(r => r.disabled = true);
    strengthRadios.forEach(r => r.disabled = true);
    genQuantumBtn.disabled = true;
    generateBtn.disabled = true;

    // Durations sum to ~4200ms (about 4 seconds)
    const durations = [600, 700, 800, 700, 600, 700];
    let currentStep = 0;

    function runStep(index) {
      if (index >= processingSteps.length) {
        finishProcessing();
        return;
      }

      const stepEl = steps.children[index];
      const dot = stepEl.querySelector('.dot');
      const duration = durations[index];
      const overlayNote = document.getElementById('pwOverlayNote');

      overlayNote.textContent = processingSteps[index];

      let start = null;
      function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;

        if (progress >= 1) {
          stepEl.classList.add('completed');
          dot.innerHTML = '<span class="check">✓</span>';
          setTimeout(() => runStep(index + 1), 200);
        } else {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
    }

    runStep(0);
  }

  function finishProcessing() {
    setTimeout(() => {
      overlay.setAttribute('hidden', '');
      successBadge.removeAttribute('hidden');

      // Show analytics
      analyticsSection.removeAttribute('hidden');

      // Show protected preview
      if (origPreviewLarge && origPreviewLarge.src) {
        protectedImage.src = origPreviewLarge.src;
        if (pwPreviewOriginal) pwPreviewOriginal.src = origPreviewLarge.src;
        if (pwPreviewProtected) pwPreviewProtected.src = origPreviewLarge.src;
        if (pwCompareOriginal) pwCompareOriginal.src = origPreviewLarge.src;
        if (pwCompareProtected) pwCompareProtected.src = origPreviewLarge.src;
        protectedSection.removeAttribute('hidden');
        if (pwCompareSlider) pwCompareSlider.removeAttribute('hidden');
      }

      if (pwTimelineSection) pwTimelineSection.removeAttribute('hidden');
      if (certificateBtn) {
        certificateBtn.disabled = false;
        certificateBtn.setAttribute('aria-disabled', 'false');
      }
      if (qrBtn) {
        qrBtn.disabled = false;
        qrBtn.setAttribute('aria-disabled', 'false');
      }

      animateMetrics();
      animateSecurityScore(96);
      setComparePosition(0.5);

      // Enable download
      downloadBtn.disabled = false;
      downloadBtn.setAttribute('aria-disabled', 'false');

      // Re-enable some controls
      genQuantumBtn.disabled = false;
      typeRadios.forEach(r => r.disabled = false);
      strengthRadios.forEach(r => r.disabled = false);

      // Add to history
      addHistoryRecord();
    }, 400);
  }

  // Comparison slider interaction
  if (pwCompareSlider && pwCompareHandle && pwCompareOverlay) {
    let dragging = false;

    function setComparePosition(ratio) {
      const clamped = Math.min(1, Math.max(0, ratio));
      pwCompareOverlay.style.width = `${clamped * 100}%`;
      pwCompareHandle.style.left = `calc(${clamped * 100}% - 16px)`;
    }

    function updateCompareFromEvent(event) {
      const rect = pwCompareSlider.getBoundingClientRect();
      const x = event.clientX !== undefined ? event.clientX : event.touches[0].clientX;
      const ratio = (x - rect.left) / rect.width;
      setComparePosition(ratio);
    }

    pwCompareHandle.addEventListener('pointerdown', (event) => {
      dragging = true;
      event.preventDefault();
      pwCompareHandle.setPointerCapture(event.pointerId);
    });

    pwCompareSlider.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      updateCompareFromEvent(event);
    });

    pwCompareSlider.addEventListener('pointerup', () => {
      dragging = false;
    });

    pwCompareSlider.addEventListener('pointerleave', () => {
      dragging = false;
    });

    pwCompareSlider.addEventListener('click', (event) => {
      updateCompareFromEvent(event);
    });
  }

  // Download protected image
  downloadBtn.addEventListener('click', () => {
    if (!origPreviewLarge || !origPreviewLarge.src) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Apply watermark effect (simple overlay)
      const strength = Array.from(strengthRadios).find(r => r.checked)?.value || 'medium';
      const alphaMap = { low: 0.15, medium: 0.30, high: 0.45 };
      ctx.globalAlpha = alphaMap[strength];
      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;

      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'quantummark_protected_image.png';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 'image/png');
    };
    img.src = origPreviewLarge.src;
  });

  function animateMetrics() {
    if (!analyticsSection) return;
    const metrics = [
      { id: 'pwMetricPSNR', start: 0, end: 42.81, fixed: 2, suffix: ' dB' },
      { id: 'pwMetricSSIM', start: 0, end: 0.993, fixed: 3, suffix: '' },
      { id: 'pwMetricEntropy', start: 0, end: 7.91, fixed: 2, suffix: '' },
      { id: 'pwMetricTime', start: 0, end: 0.42, fixed: 2, suffix: ' s' }
    ];

    metrics.forEach((metric, index) => {
      const el = document.getElementById(metric.id);
      if (!el) return;
      const duration = 900;
      const startTime = performance.now() + index * 120;
      function step(now) {
        const elapsed = now - startTime;
        if (elapsed < 0) {
          requestAnimationFrame(step);
          return;
        }
        const progress = Math.min(1, elapsed / duration);
        const value = metric.start + (metric.end - metric.start) * progress;
        el.textContent = value.toFixed(metric.fixed) + metric.suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });

    const revealGroup = analyticsSection.querySelector('.reveal-group');
    if (revealGroup) {
      revealGroup.classList.add('visible');
    }
  }

  function animateSecurityScore(value) {
    if (!pwScoreRing || !pwScoreValue) return;
    const target = Math.min(100, Math.max(0, value));
    const duration = 1200;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const currentScore = Math.round(target * progress);
      pwScoreValue.textContent = currentScore;
      pwScoreRing.style.setProperty('--score', currentScore);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function setComparePosition(ratio) {
    if (!pwCompareOverlay || !pwCompareHandle) return;
    const clamped = Math.min(1, Math.max(0, ratio));
    pwCompareOverlay.style.width = `${clamped * 100}%`;
    pwCompareHandle.style.left = `calc(${clamped * 100}% - 16px)`;
  }

  function generateHexKey(bits) {
    const bytes = bits / 8;
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  function addHistoryRecord() {
    try {
      const history = JSON.parse(localStorage.getItem('qm_processing_history') || '[]');
      const imageName = origSmallPreview ? (document.getElementById('previewName')?.textContent || 'Unknown') : 'Unknown';
      history.unshift({
        time: new Date().toLocaleString(),
        image: imageName,
        security: 'HIGH',
        status: 'Success'
      });
      while (history.length > 5) history.pop();
      localStorage.setItem('qm_processing_history', JSON.stringify(history));
    } catch (e) {}
  }

  // Certificate and QR button placeholders
  if (certificateBtn) {
    certificateBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      const text = `QuantumMark Certificate\nImage: ${document.getElementById('previewName')?.textContent || 'Unknown'}\nStatus: Secure\nScore: 96/100`;
      const blob = new Blob([text], { type: 'text/plain' });
      a.href = URL.createObjectURL(blob);
      a.download = 'quantummark_certificate.txt';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    });
  }
  if (qrBtn) {
    qrBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      const text = `QM-QR|${document.getElementById('previewName')?.textContent || 'Unknown'}|SCORE:96`;
      const blob = new Blob([text], { type: 'text/plain' });
      a.href = URL.createObjectURL(blob);
      a.download = 'quantummark_qr.txt';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(a.href);
      a.remove();
    });
  }

  // Initial sync
  setTimeout(syncOriginalPreview, 120);
}


/* ============================================================
   5. Activity Tabs — visual tab switching (UI only)
   Clicking a tab marks it active. No content changes.
============================================================ */
function initActivityTabs() {
  const tabGroup = document.querySelector('.activity-tabs');
  if (!tabGroup) return;

  const tabs = tabGroup.querySelectorAll('.activity-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      // Activate clicked
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
    });
  });
}


/* ============================================================
   6. Scroll-Reveal — fade-in-up via IntersectionObserver
   Elements with .reveal animate in on entering the viewport.
============================================================ */
function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (!revealEls.length) return;

  const options = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.08,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, options);

  revealEls.forEach(el => observer.observe(el));
}


/* ============================================================
   7. Metric Bar Animation
   Bar widths are set inline in HTML but start at 0 via JS so
   they animate to their target on first reveal.
============================================================ */
function initMetricBars() {
  const analyticsCard = document.querySelector('.analytics-card');
  if (!analyticsCard) return;

  // Capture the target widths from inline styles, then zero them out
  const bars = analyticsCard.querySelectorAll('.metric-bar-fill');
  const targets = [];

  bars.forEach(bar => {
    // Read the inline width (e.g. "85%") set in the HTML
    targets.push(bar.style.width || '0%');
    bar.style.width = '0%';
  });

  // Watch the analytics card; once it becomes visible, animate bars
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Small delay so the card fade-in finishes first
        setTimeout(() => {
          bars.forEach((bar, i) => {
            bar.style.transition = `width 1s cubic-bezier(0, 0, 0.2, 1) ${i * 120}ms`;
            bar.style.width = targets[i];
          });
        }, 350);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  observer.observe(analyticsCard);
}


/* ============================================================
   8b. Processing simulation & history
   ============================================================ */
(function attachProcessingFeatures(){
  // Wait until DOM is ready (should already be) then wire up elements
  function init() {
    const genBtn = document.getElementById('genBtn');
    const pwOverlay = document.getElementById('pwOverlay');
    const pwSteps = document.getElementById('pwSteps');
    const pwOverlayNote = document.getElementById('pwOverlayNote');
    const pwSuccess = document.getElementById('pwSuccess');
    const downloadBtn = document.getElementById('downloadBtn');
    const outProtected = document.getElementById('outProtected');
    const outCert = document.getElementById('outCert');
    const outQr = document.getElementById('outQr');
    const mPsnr = document.getElementById('mPsnr');
    const mSsim = document.getElementById('mSsim');
    const mEntropy = document.getElementById('mEntropy');
    const mSecurity = document.getElementById('mSecurity');
    const historyList = document.getElementById('historyList');
    const previewNameEl = document.getElementById('previewName');
    const quantumKeyInput = document.getElementById('quantumKey');

    if (!genBtn || !pwOverlay || !pwSteps) return;

    const steps = [
      'Initializing...',
      'Generating Quantum Random Key...',
      'Embedding Invisible Watermark...',
      'Running Image Quality Analysis...',
      'Preparing Protected Image...',
      'Completed Successfully'
    ];

    function renderSteps() {
      pwSteps.innerHTML = '';
      steps.forEach((label,i) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'pw-step';
        stepEl.dataset.index = i;
        stepEl.innerHTML = `
          <div class="dot"><span class="check">✓</span></div>
          <div class="label">${label}</div>
          <div class="bar"><div class="fill"></div></div>
        `;
        pwSteps.appendChild(stepEl);
      });
    }

    function showOverlay() { pwOverlay.hidden = false; pwOverlay.setAttribute('aria-hidden','false'); }
    function hideOverlay() { pwOverlay.hidden = true; pwOverlay.setAttribute('aria-hidden','true'); }

    function runSimulation() {
      renderSteps();
      showOverlay();
      pwSuccess.hidden = true;
      let total = 0;
      // durations roughly sum to ~4300-4800ms (total ~4.5s)
      const durations = [500, 800, 900, 800, 600, 600];
      // disable upload controls while processing
      const dropzoneEl = document.getElementById('dropzone');
      const watermarkDropEl = document.getElementById('watermarkDrop');
      const imageInputEl = document.getElementById('imageInput');
      const watermarkInputEl = document.getElementById('watermarkInput');
      const removeImageBtnEl = document.getElementById('removeImageBtn');
      const removeWmBtnEl = document.getElementById('removeWmBtn');
      if (dropzoneEl) dropzoneEl.classList.add('disabled');
      if (watermarkDropEl) watermarkDropEl.classList.add('disabled');
      if (imageInputEl) imageInputEl.disabled = true;
      if (watermarkInputEl) watermarkInputEl.disabled = true;
      if (removeImageBtnEl) removeImageBtnEl.disabled = true;
      if (removeWmBtnEl) removeWmBtnEl.disabled = true;
      const elems = Array.from(pwSteps.querySelectorAll('.pw-step'));

      function runStep(i) {
        if (i >= elems.length) {
          finishProcessing();
          return;
        }
        const el = elems[i];
        const fill = el.querySelector('.fill');
        const duration = durations[i];
        pwOverlayNote.textContent = el.querySelector('.label').textContent;
        // animate fill from 0 to 100%
        let start = null;
        function frame(ts) {
          if (!start) start = ts;
          const progress = Math.min(1, (ts - start) / duration);
          fill.style.width = (progress * 100) + '%';
          if (progress < 1) {
            requestAnimationFrame(frame);
          } else {
            // mark completed
            el.classList.add('completed');
            // show check
            const dot = el.querySelector('.dot');
            dot.innerHTML = '<span class="check">✓</span>';
            setTimeout(() => runStep(i+1), 220);
          }
        }
        requestAnimationFrame(frame);
      }

      runStep(0);
    }

    function finishProcessing() {
      // hide overlay after short pause
      setTimeout(() => {
        hideOverlay();
        pwSuccess.hidden = false;

        // update sample metrics (latest requested values)
        mPsnr.textContent = '42.83 dB';
        mSsim.textContent = '0.994';
        mEntropy.textContent = '7.89';
        mSecurity.textContent = 'HIGH';
        // embedding time and key length
        const embedTimeEl = document.getElementById('mEmbeddingTime');
        if (embedTimeEl) embedTimeEl.textContent = '0.41 s';
        const keyLenEl = document.getElementById('mKeyLength');
        if (keyLenEl) keyLenEl.textContent = '256-bit';

        // show protected preview (use original as placeholder)
        const origImg = document.getElementById('origPreviewLarge');
        const protectedPreviewEl = document.getElementById('protectedPreviewLarge');
        const pwProtectedWrap = document.getElementById('pwProtected');
        if (origImg && protectedPreviewEl) {
          protectedPreviewEl.src = origImg.src || '';
          if (pwProtectedWrap) pwProtectedWrap.hidden = false;
        }

        // Enable outputs
        if (downloadBtn) downloadBtn.disabled = false;
        if (outProtected) outProtected.textContent = 'Protected Image Available';
        if (outCert) outCert.textContent = 'Ready';
        if (outQr) outQr.textContent = 'Available';
        // enable cert + qr buttons if present
        const genCertBtn = document.getElementById('genCertBtn');
        const qrBtn = document.getElementById('qrBtn');
        if (genCertBtn) genCertBtn.disabled = false;
        if (qrBtn) qrBtn.disabled = false;

        // Add to processing history
        addHistoryRecord({
          time: new Date().toLocaleString(),
          image: (previewNameEl && previewNameEl.textContent) ? previewNameEl.textContent : 'Unknown',
          security: 'HIGH',
          status: 'Success'
        });
      }, 420);
    }

    // On click: validate and run

    // On click: validate and run
    genBtn.addEventListener('click', (e) => {
      // validate original + watermark
      const origOk = !!document.getElementById('previewImage') && document.getElementById('previewImage').src;
      const wmOk = !!document.getElementById('watermarkPreviewImg') && document.getElementById('watermarkPreviewImg').src;
      if (!origOk || !wmOk) return; // guard; button should be disabled otherwise
      runSimulation();
    });

    // Download will produce a simple composite canvas (original + watermark blended) so users can download a protected image
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        // Compose canvas from original and watermark
        const origImg = document.getElementById('origPreviewLarge');
        const wmImg = document.getElementById('watermarkPreviewImg');
        if (!origImg || !wmImg || !origImg.src || !wmImg.src) return;
        const canvas = document.createElement('canvas');
        const w = origImg.naturalWidth || 800;
        const h = origImg.naturalHeight || 600;
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        // draw original
        ctx.drawImage(origImg, 0, 0, w, h);
        // draw watermark scaled to 25% width and centered with alpha depending on strength input
        const wmStrength = document.getElementById('wmStrength');
        const alpha = wmStrength ? (0.4 * (wmStrength.value / 100) + 0.2) : 0.4; // between 0.2-0.6
        const targetW = Math.floor(w * 0.25);
        const aspect = (wmImg.naturalWidth && wmImg.naturalHeight) ? (wmImg.naturalHeight / wmImg.naturalWidth) : 1;
        const targetH = Math.floor(targetW * aspect);
        const x = Math.floor((w - targetW)/2);
        const y = Math.floor((h - targetH)/2);
        ctx.globalAlpha = alpha;
        ctx.drawImage(wmImg, x, y, targetW, targetH);
        ctx.globalAlpha = 1;
        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'quantummark_protected.png';
          document.body.appendChild(a);
          a.click();
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 'image/png');
      });
    }

    // Certificate and QR handlers
    const genCertBtnEl = document.getElementById('genCertBtn');
    const qrBtnEl = document.getElementById('qrBtn');
    if (genCertBtnEl) {
      genCertBtnEl.addEventListener('click', () => {
        // create a simple certificate text and trigger download
        const previewName = (previewNameEl && previewNameEl.textContent) ? previewNameEl.textContent : 'Unknown';
        const key = quantumKeyInput ? quantumKeyInput.value : '';
        const certText = `QuantumMark Ownership Certificate\n\nImage: ${previewName}\nTime: ${new Date().toLocaleString()}\nSecurity Level: HIGH\nKey: ${key || 'N/A'}\nSignature: (simulated)`;
        const blob = new Blob([certText], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'quantummark_certificate.txt';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        const outCertEl = document.getElementById('outCert'); if (outCertEl) outCertEl.textContent = 'Certificate Generated';
      });
    }
    if (qrBtnEl) {
      qrBtnEl.addEventListener('click', () => {
        const previewName = (previewNameEl && previewNameEl.textContent) ? previewNameEl.textContent : 'Unknown';
        const qrData = `QM-VERIFY|${previewName}|${new Date().toISOString()}|SEC=HIGH`;
        const blob = new Blob([qrData], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'quantummark_qr_verification.txt';
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(a.href);
        a.remove();
        const outQrEl = document.getElementById('outQr'); if (outQrEl) outQrEl.textContent = 'Available';
      });
    }

    // Processing history localStorage
    function loadHistory() {
      try {
        const raw = localStorage.getItem('qm_processing_history');
        return raw ? JSON.parse(raw) : [];
      } catch (e) { return []; }
    }
    function saveHistory(arr) {
      try { localStorage.setItem('qm_processing_history', JSON.stringify(arr)); } catch(e){}
    }
    function renderHistory() {
      const rows = loadHistory();
      historyList.innerHTML = '';
      if (!rows.length) {
        historyList.innerHTML = '<div class="history-empty">No processing history yet</div>';
        return;
      }
      rows.forEach(r => {
        const el = document.createElement('div'); el.className='history-row';
        el.innerHTML = `<div class="time">${r.time}</div><div class="name">${r.image}</div><div class="status">${r.status}</div><div class="sec">${r.security}</div>`;
        historyList.appendChild(el);
      });
    }
    function addHistoryRecord(rec) {
      const arr = loadHistory();
      arr.unshift(rec);
      while (arr.length > 5) arr.pop();
      saveHistory(arr);
      renderHistory();
    }

    // initial render - history is now handled in initProtectWorkspace
  }

  // Function removed - all functionality moved to initProtectWorkspace
})();
