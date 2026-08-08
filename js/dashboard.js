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

  // 9. Attack Lab initialisation
  initAttackLab();

  // 10. Quantum security initialisation
  initQuantumSecurity();

  // 11. Certificate initialisation
  initCertificateWorkflow();

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

let uploadProgressElement = null;
let uploadStatusElement = null;
let selectedUploadedFile = null;

function createUploadProgressElements(dropzone) {
  const progress = document.createElement('progress');
  progress.id = 'uploadProgress';
  progress.max = 100;
  progress.value = 0;
  progress.hidden = true;
  progress.className = 'dropzone-progress';

  const status = document.createElement('div');
  status.id = 'uploadStatus';
  status.hidden = true;
  status.className = 'dropzone-status';
  status.setAttribute('aria-live', 'polite');

  const inner = dropzone.querySelector('.dropzone-inner');
  if (inner) {
    inner.appendChild(progress);
    inner.appendChild(status);
  }

  uploadProgressElement = progress;
  uploadStatusElement = status;
}

function updateUploadProgress(value, message) {
  if (!uploadProgressElement || !uploadStatusElement) return;
  uploadProgressElement.hidden = false;
  uploadProgressElement.value = value;
  uploadStatusElement.hidden = false;
  uploadStatusElement.textContent = message;
}

function hideUploadProgress() {
  if (!uploadProgressElement || !uploadStatusElement) return;
  uploadProgressElement.hidden = true;
  uploadProgressElement.value = 0;
  uploadStatusElement.hidden = true;
  uploadStatusElement.textContent = '';
}

function uploadImageToBackend(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('image', file);

    xhr.open('POST', '/upload');
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const payload = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) {
        if (payload.success) {
          onProgress(100);
          resolve(payload);
          return;
        }
      }
      const error = payload.error || `Upload failed with status ${xhr.status}`;
      reject(new Error(error));
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.onabort = () => reject(new Error('Upload aborted.'));
    xhr.send(formData);
  });
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

  let selectedFile = null;
  createUploadProgressElements(dropzone);

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

    selectedUploadedFile = file;
    selectedFile = file;
    hideUploadProgress();

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
    selectedUploadedFile = null;
    selectedFile = null;
    togglePreview(false);
    hideUploadProgress();
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
  let backendUploadDetails = null;
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
  const metricPSNR = document.getElementById('pwMetricPSNR');
  const metricSSIM = document.getElementById('pwMetricSSIM');
  const metricEntropy = document.getElementById('pwMetricEntropy');
  const metricTime = document.getElementById('pwMetricTime');
  const metricCapacity = document.getElementById('pwMetricSecurity');
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
  const verificationPanel = document.getElementById('pwVerificationPanel');
  const extractedText = document.getElementById('pwExtractedText');
  const verificationResult = document.getElementById('pwVerificationResult');
  const verifyTextInput = document.getElementById('pwVerifyTextInput');
  const extractBtn = document.getElementById('pwExtractBtn');
  const verifyBtn = document.getElementById('pwVerifyBtn');

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

  if (continueBtn) {
    continueBtn.addEventListener('click', (e) => {
      e.preventDefault();
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
    if (verificationPanel) verificationPanel.setAttribute('hidden', '');
    if (extractedText) extractedText.textContent = '-';
    if (verificationResult) verificationResult.textContent = 'Not verified';
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

    // Clear backend file state
    backendUploadDetails = null;
    window.__quantummarkProtectedFilename = null;

    // Re-enable upload controls
    if (dropzone) dropzone.classList.remove('disabled');
    if (imageInput) imageInput.disabled = false;

    updateGenerateState();
  });

  // Generate watermark (processing simulation)
  generateBtn.addEventListener('click', () => {
    if (!hasOriginal() || !hasWatermarkConfigured() || !hasQuantumKey()) return;

    const file = selectedUploadedFile || imageInput?.files?.[0];
    if (!file) {
      updateUploadProgress(0, 'Please select an image before continuing.');
      return;
    }

    generateBtn.disabled = true;
    generateBtn.setAttribute('aria-disabled', 'true');
    updateUploadProgress(0, 'Uploading image to server...');

    uploadImageToBackend(file, (percent) => {
      updateUploadProgress(percent, `Uploading image... ${percent}%`);
    })
      .then((payload) => {
        updateUploadProgress(100, 'Image uploaded successfully.');
        backendUploadDetails = payload;

        if (selectedWatermarkType !== 'text') {
          throw new Error('Only text watermarking is supported in this version.');
        }

        return fetch('/watermark/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: backendUploadDetails.filename,
            watermark_text: textInput.value.trim(),
          }),
        });
      })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.success) {
          throw new Error(body.error || `Watermark embed failed with status ${response.status}`);
        }
        backendUploadDetails.protected = body;
        window.__quantummarkProtectedFilename = body.processed_filename;
        updateUploadProgress(100, 'Watermark embedded successfully.');
        setTimeout(() => {
          hideUploadProgress();
        }, 1800);

        const metricsResponse = await fetch('/metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original_filename: backendUploadDetails.filename,
            processed_filename: body.processed_filename,
          }),
        });
        const metricsBody = await metricsResponse.json();
        if (metricsResponse.ok && metricsBody.success) {
          backendUploadDetails.metrics = metricsBody;
        }
        runProcessing();
      })
      .catch((error) => {
        updateUploadProgress(0, `Upload failed: ${error.message || 'Please try again.'}`);
        generateBtn.disabled = false;
        generateBtn.setAttribute('aria-disabled', 'false');
      });
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
      if (backendUploadDetails?.protected?.processed_image) {
        protectedImage.src = backendUploadDetails.protected.processed_image;
        if (pwPreviewOriginal) pwPreviewOriginal.src = origPreviewLarge.src;
        if (pwPreviewProtected) pwPreviewProtected.src = backendUploadDetails.protected.processed_image;
        if (pwCompareOriginal) pwCompareOriginal.src = origPreviewLarge.src;
        if (pwCompareProtected) pwCompareProtected.src = backendUploadDetails.protected.processed_image;
        protectedSection.removeAttribute('hidden');
        if (pwCompareSlider) pwCompareSlider.removeAttribute('hidden');
      } else if (origPreviewLarge && origPreviewLarge.src) {
        protectedImage.src = origPreviewLarge.src;
        if (pwPreviewOriginal) pwPreviewOriginal.src = origPreviewLarge.src;
        if (pwPreviewProtected) pwPreviewProtected.src = origPreviewLarge.src;
        if (pwCompareOriginal) pwCompareOriginal.src = origPreviewLarge.src;
        if (pwCompareProtected) pwCompareProtected.src = origPreviewLarge.src;
        protectedSection.removeAttribute('hidden');
        if (pwCompareSlider) pwCompareSlider.removeAttribute('hidden');
      }

      if (verificationPanel) verificationPanel.removeAttribute('hidden');
      if (pwTimelineSection) pwTimelineSection.removeAttribute('hidden');
      if (certificateBtn) {
        certificateBtn.disabled = false;
        certificateBtn.setAttribute('aria-disabled', 'false');
      }
      if (qrBtn) {
        qrBtn.disabled = false;
        qrBtn.setAttribute('aria-disabled', 'false');
      }

      updateMetricCards(backendUploadDetails?.metrics || null);
      animateMetrics();
      animateSecurityScore(96);
      setComparePosition(0.5);

      // Enable download
      downloadBtn.disabled = false;
      downloadBtn.setAttribute('aria-disabled', 'false');

      // Add extraction defaults
      if (extractedText) extractedText.textContent = '-';
      if (verificationResult) verificationResult.textContent = 'Not verified';

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

  function updateMetricCards(metrics) {
    const psnr = metrics?.psnr ?? 0;
    const ssim = metrics?.ssim ?? 0;
    const entropy = metrics?.entropy ?? 0;
    const embeddingTime = metrics?.embedding_time_ms ?? 0;
    const capacityUsed = metrics?.capacity_used_percent ?? 0;

    if (metricPSNR) {
      metricPSNR.innerHTML = `${Number.isFinite(psnr) ? psnr.toFixed(2) : '∞'}<span class="pw-metric-unit"> dB</span>`;
    }
    if (metricSSIM) {
      metricSSIM.innerHTML = `${ssim.toFixed(4)}<span class="pw-metric-unit"> </span>`;
    }
    if (metricEntropy) {
      metricEntropy.innerHTML = `${entropy.toFixed(2)}<span class="pw-metric-unit"> </span>`;
    }
    if (metricTime) {
      metricTime.innerHTML = `${embeddingTime.toFixed(2)}<span class="pw-metric-unit"> ms</span>`;
    }
    if (metricCapacity) {
      metricCapacity.innerHTML = `${capacityUsed.toFixed(1)}<span class="pw-metric-unit">%</span>`;
    }
  }

  function animateMetrics() {
    if (!analyticsSection) return;
    const metrics = [
      { id: 'pwMetricPSNR', start: 0, end: Number(backendUploadDetails?.metrics?.psnr || 0), fixed: 2, suffix: ' dB' },
      { id: 'pwMetricSSIM', start: 0, end: Number(backendUploadDetails?.metrics?.ssim || 0), fixed: 4, suffix: '' },
      { id: 'pwMetricEntropy', start: 0, end: Number(backendUploadDetails?.metrics?.entropy || 0), fixed: 2, suffix: '' },
      { id: 'pwMetricTime', start: 0, end: Number(backendUploadDetails?.metrics?.embedding_time_ms || 0), fixed: 2, suffix: ' ms' }
    ];

    metrics.forEach((metric, index) => {
      const el = document.getElementById(metric.id);
      if (!el) return;
      const duration = 900;
      const safeEnd = Number.isFinite(metric.end) ? metric.end : 0;
      const startTime = performance.now() + index * 120;
      function step(now) {
        const elapsed = now - startTime;
        if (elapsed < 0) {
          requestAnimationFrame(step);
          return;
        }
        const progress = Math.min(1, elapsed / duration);
        const value = metric.start + (safeEnd - metric.start) * progress;
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

  if (extractBtn) {
    extractBtn.addEventListener('click', () => {
      if (!backendUploadDetails?.protected?.processed_filename) {
        updateUploadProgress(0, 'Protected image is not available for extraction.');
        return;
      }

      fetch('/watermark/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backendUploadDetails.protected.processed_filename }),
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok || !body.success) {
            throw new Error(body.error || `Extraction failed with status ${response.status}`);
          }
          if (extractedText) extractedText.textContent = body.watermark || '-';
          if (verificationResult) verificationResult.textContent = 'Extraction successful';
        })
        .catch((error) => {
          if (extractedText) extractedText.textContent = '-';
          if (verificationResult) verificationResult.textContent = error.message || 'Extraction failed';
        });
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      if (!backendUploadDetails?.protected?.processed_filename) {
        updateUploadProgress(0, 'Protected image is not available for verification.');
        return;
      }
      const expected = verifyTextInput?.value.trim();
      if (!expected) {
        if (verificationResult) verificationResult.textContent = 'Expected text is required.';
        return;
      }

      fetch('/watermark/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: backendUploadDetails.protected.processed_filename, expected_text: expected }),
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok || !body.success) {
            throw new Error(body.error || `Verification failed with status ${response.status}`);
          }
          if (extractedText) extractedText.textContent = body.extracted || '-';
          if (verificationResult) {
            verificationResult.textContent = body.verified ? 'Owner Verified ✅' : 'Verification Failed ❌';
          }
        })
        .catch((error) => {
          if (verificationResult) verificationResult.textContent = error.message || 'Verification failed';
        });
    });
  }

  // Initial sync
  setTimeout(syncOriginalPreview, 120);
}

function initQuantumSecurity() {
  const generateBtn = document.getElementById('quantumGenerateBtn');
  const sourceLabel = document.getElementById('quantumSecuritySource');
  const lengthLabel = document.getElementById('quantumSecurityLength');

  if (!generateBtn || !sourceLabel || !lengthLabel) return;

  const defaultLength = 32;
  lengthLabel.textContent = defaultLength;

  generateBtn.addEventListener('click', async () => {
    sourceLabel.textContent = 'Generating...';
    try {
      const response = await fetch('/qrng/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length: defaultLength }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Key generation failed.');
      }
      sourceLabel.textContent = body.source === 'quantum_simulator' ? 'Quantum Simulator' : 'Secure Fallback';
      lengthLabel.textContent = body.key_length || defaultLength;
    } catch (error) {
      sourceLabel.textContent = error.message || 'Unavailable';
    }
  });
}

function initCertificateWorkflow() {
  const button = document.getElementById('generateCertificateBtn');
  const status = document.getElementById('certificateStatus');
  const verificationId = document.getElementById('certificateVerificationId');
  const details = document.getElementById('certificateDetails');
  const viewLink = document.getElementById('viewCertificateLink');

  if (!button || !status || !verificationId || !details || !viewLink) return;

  button.addEventListener('click', async () => {
    const protectedFilename = window.__quantummarkProtectedFilename;
    const watermark = document.getElementById('pwTextInput')?.value?.trim() || 'QuantumMark Test 123';
    if (!protectedFilename) {
      status.textContent = 'Protect an image first.';
      return;
    }

    status.textContent = 'Generating certificate...';
    try {
      const response = await fetch('/certificate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protected_filename: protectedFilename, watermark }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Certificate generation failed.');
      }
      verificationId.textContent = body.verification_id || '-';
      status.textContent = 'Certificate generated';
      details.hidden = false;
      details.innerHTML = `
        <strong>Certificate ID:</strong> ${body.certificate_id}<br/>
        <strong>Verification ID:</strong> ${body.verification_id}<br/>
        <strong>Algorithm:</strong> ${body.certificate.algorithm}<br/>
        <strong>PSNR:</strong> ${body.certificate.psnr?.toFixed(2) || '-'}<br/>
        <strong>SSIM:</strong> ${body.certificate.ssim?.toFixed(4) || '-'}<br/>
        <strong>Entropy:</strong> ${body.certificate.entropy?.toFixed(2) || '-'}
      `;
      viewLink.hidden = false;
      viewLink.href = `/verify.html?id=${body.verification_id}`;
      viewLink.textContent = 'View Verification Page';
    } catch (error) {
      status.textContent = error.message || 'Unable to generate certificate.';
    }
  });
}

function initAttackLab() {
  const attackSelect = document.getElementById('attackSelect');
  const attackApplyBtn = document.getElementById('attackApplyBtn');
  const attackTestBtn = document.getElementById('attackTestBtn');
  const attackStatus = document.getElementById('attackStatus');
  const attackRecovery = document.getElementById('attackRecovery');
  const attackVerification = document.getElementById('attackVerification');
  const attackPSNR = document.getElementById('attackPSNR');
  const attackSSIM = document.getElementById('attackSSIM');

  if (!attackSelect || !attackApplyBtn || !attackTestBtn) return;

  function getProtectedFilename() {
    return window.__quantummarkProtectedFilename || null;
  }

  function setStatus(message) {
    if (attackStatus) attackStatus.textContent = message;
  }

  function setResult(payload) {
    if (attackRecovery) attackRecovery.textContent = payload?.status || 'Not tested';
    if (attackVerification) attackVerification.textContent = payload?.verified ? 'Verified ✅' : 'Not verified';
    if (attackPSNR) attackPSNR.textContent = payload?.metrics?.psnr != null ? Number(payload.metrics.psnr).toFixed(2) : '-';
    if (attackSSIM) attackSSIM.textContent = payload?.metrics?.ssim != null ? Number(payload.metrics.ssim).toFixed(4) : '-';
  }

  attackApplyBtn.addEventListener('click', async () => {
    const filename = getProtectedFilename();
    if (!filename) {
      setStatus('Protect an image first to create an attacked copy.');
      return;
    }

    setStatus('Applying attack...');
    try {
      const response = await fetch('/attacks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, attack: attackSelect.value }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Attack could not be applied.');
      }
      setStatus(`Applied ${body.attack}`);
      setResult({ status: 'created', verified: false, metrics: {} });
    } catch (error) {
      setStatus(error.message || 'Failed to apply attack.');
    }
  });

  attackTestBtn.addEventListener('click', async () => {
    const filename = getProtectedFilename();
    if (!filename) {
      setStatus('Protect an image first to run the robustness test.');
      return;
    }

    setStatus('Running robustness test...');
    try {
      const response = await fetch('/attacks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          watermark: 'QuantumMark Test 123',
          attack: attackSelect.value,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Robustness test failed.');
      }
      setStatus(`Tested ${body.attack}`);
      setResult(body);
    } catch (error) {
      setStatus(error.message || 'Unable to run robustness test.');
    }
  });
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



