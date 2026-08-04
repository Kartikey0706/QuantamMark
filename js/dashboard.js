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
  const openUploadLinks = document.querySelectorAll('a[href="#upload"]');
  const workspace = document.getElementById('protectWorkspace');
  const origPreview = document.getElementById('origPreviewLarge');
  const origSmallPreview = document.getElementById('previewImage'); // existing original preview
  const watermarkDrop = document.getElementById('watermarkDrop');
  const watermarkInput = document.getElementById('watermarkInput');
  const watermarkPreview = document.getElementById('watermarkPreview');
  const watermarkPreviewImg = document.getElementById('watermarkPreviewImg');
  const wmName = document.getElementById('wmName');
  const wmSize = document.getElementById('wmSize');
  const removeWmBtn = document.getElementById('removeWmBtn');
  const genBtn = document.getElementById('genBtn');
  const resetBtn = document.getElementById('resetBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const continueBtn = document.getElementById('continueBtn');
  const imageInput = document.getElementById('imageInput');
  const quantumKeyInput = document.getElementById('quantumKey');
  const genQuantumBtn = document.getElementById('genQuantumBtn');

  if (!workspace) return;

  // Helper to reveal workspace
  function showWorkspace() {
    if (workspace.hasAttribute('hidden')) workspace.removeAttribute('hidden');
    workspace.classList.add('visible');
  }

  // Bind welcome Upload link(s) to open workspace
  openUploadLinks.forEach(link => link.addEventListener('click', (e) => {
    // allow default anchor navigation but also reveal workspace
    setTimeout(showWorkspace, 50);
  }));

  // When an original image is loaded in the main dropzone, copy preview into the left panel and show workspace
  function syncOriginalPreview() {
    if (!origSmallPreview) return;
    if (origSmallPreview.src) {
      origPreview.src = origSmallPreview.src;
      showWorkspace();
      updateGenerateState();
    }
  }

  // Also watch for changes to the existing image input used earlier
  if (imageInput) {
    imageInput.addEventListener('change', () => {
      syncOriginalPreview();
    });
  }

  // Watermark dropzone behaviour
  let wmDragCounter = 0;
  watermarkDrop.addEventListener('dragenter', (e) => { e.preventDefault(); wmDragCounter++; watermarkDrop.classList.add('drag-over'); });
  watermarkDrop.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  watermarkDrop.addEventListener('dragleave', () => { wmDragCounter--; if (wmDragCounter<=0){ wmDragCounter=0; watermarkDrop.classList.remove('drag-over'); } });
  watermarkDrop.addEventListener('drop', (e) => { e.preventDefault(); wmDragCounter=0; watermarkDrop.classList.remove('drag-over'); handleWmFiles(e.dataTransfer.files); });
  watermarkDrop.addEventListener('click', () => watermarkInput.click());
  watermarkInput.addEventListener('change', () => handleWmFiles(watermarkInput.files));

  function handleWmFiles(files) {
    if (!files || !files.length) return;
    const file = files[0];
    const types = ['image/png','image/jpeg'];
    if (!types.includes(file.type)) return;
    const obj = URL.createObjectURL(file);
    watermarkPreviewImg.onload = () => URL.revokeObjectURL(obj);
    watermarkPreviewImg.src = obj;
    wmName.textContent = file.name;
    wmSize.textContent = formatBytes(file.size);
    watermarkPreview.hidden = false;
    showWorkspace();
    updateGenerateState();
  }

  removeWmBtn.addEventListener('click', (e) => { e.stopPropagation(); watermarkInput.value=''; watermarkPreviewImg.src=''; watermarkPreview.hidden = true; updateGenerateState(); });

  // Generate quantum key
  genQuantumBtn.addEventListener('click', () => {
    quantumKeyInput.value = generateHexKey(32);
  });

  // Generate watermark button enabled only if both original + watermark exist
  function hasOriginal() {
    return !!(origSmallPreview && origSmallPreview.src && origSmallPreview.src.indexOf('data:')!==-1 || (origSmallPreview && origSmallPreview.src && origSmallPreview.src.startsWith('blob:')));
  }
  function hasWatermark() {
    return !!(watermarkPreviewImg && watermarkPreviewImg.src && (watermarkPreviewImg.src.startsWith('blob:') || watermarkPreviewImg.src.indexOf('data:')!==-1));
  }

  function updateGenerateState() {
    const enabled = hasOriginal() && hasWatermark();
    genBtn.disabled = !enabled;
    if (enabled) genBtn.removeAttribute('aria-disabled'); else genBtn.setAttribute('aria-disabled','true');
  }


  // Reset
  resetBtn.addEventListener('click', () => {
    // Clear watermark
    watermarkInput.value=''; watermarkPreviewImg.src=''; watermarkPreview.hidden=true;
    // Clear original (clear small preview and left big preview)
    if (origSmallPreview) { origSmallPreview.src = ''; }
    if (origPreview) { origPreview.src = ''; }
    // Clear quantum key
    if (quantumKeyInput) quantumKeyInput.value = '';
    // Reset outputs
    document.getElementById('outProtected').textContent = 'Not generated';
    document.getElementById('outCert').textContent = 'Pending';
    document.getElementById('mPsnr').textContent = '--';
    document.getElementById('mSsim').textContent = '--';
    document.getElementById('mEntropy').textContent = '--';
    document.getElementById('mEmbeddingTime') && (document.getElementById('mEmbeddingTime').textContent = '--');
    document.getElementById('mKeyLength') && (document.getElementById('mKeyLength').textContent = '--');
    document.getElementById('mSecurity').textContent = 'Waiting...';
    // Hide protected preview and success badge
    const protectedPreviewEl = document.getElementById('protectedPreviewLarge');
    const pwProtectedWrap = document.getElementById('pwProtected');
    const pwSuccess = document.getElementById('pwSuccess');
    if (protectedPreviewEl) protectedPreviewEl.src = '';
    if (pwProtectedWrap) pwProtectedWrap.hidden = true;
    if (pwSuccess) pwSuccess.hidden = true;

    // Re-enable upload controls
    const dropzoneEl = document.getElementById('dropzone');
    const watermarkDropEl = document.getElementById('watermarkDrop');
    const imageInputEl = document.getElementById('imageInput');
    const watermarkInputEl = document.getElementById('watermarkInput');
    const removeImageBtnEl = document.getElementById('removeImageBtn');
    const removeWmBtnEl = document.getElementById('removeWmBtn');
    if (dropzoneEl) dropzoneEl.classList.remove('disabled');
    if (watermarkDropEl) watermarkDropEl.classList.remove('disabled');
    if (imageInputEl) imageInputEl.disabled = false;
    if (watermarkInputEl) watermarkInputEl.disabled = false;
    if (removeImageBtnEl) removeImageBtnEl.disabled = false;
    if (removeWmBtnEl) removeWmBtnEl.disabled = false;

    // Keep download disabled
    if (downloadBtn) downloadBtn.disabled = true;
    // Disable cert/qr
    const genCertBtn = document.getElementById('genCertBtn');
    const qrBtn = document.getElementById('qrBtn');
    if (genCertBtn) genCertBtn.disabled = true;
    if (qrBtn) qrBtn.disabled = true;

    updateGenerateState();
  });

  // Utility: generate hex key
  function generateHexKey(len) {
    const arr = new Uint8Array(len/2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  // If user already has original preview, sync it in on load
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

    // initial render
    renderHistory();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
