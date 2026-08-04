/**
 * QuantumMark — Main Script
 *
 * Responsibilities:
 * 1. Initialize Lucide icons after DOM is ready
 * 2. Sticky navbar: add glass effect on scroll
 * 3. Active nav link highlighting based on scroll position
 * 4. Mobile menu open/close toggle
 * 5. Scroll-reveal animations via IntersectionObserver
 * 6. Smooth scroll for all internal anchor links
 */

/* ============================================================
   DOM-ready entry point
============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Render all Lucide icons
  initIcons();

  // 2. Sticky navbar behaviour
  initNavbarScroll();

  // 3. Active link tracking
  initActiveLinks();

  // 4. Mobile hamburger menu
  initMobileMenu();

  // 5. Scroll-reveal animations
  initReveal();

  // 6. Smooth anchor scroll (closes mobile menu too)
  initSmoothScroll();

});


/* ============================================================
   1. Lucide icon initialisation
   lucide.createIcons() replaces every [data-lucide] element
   with the matching inline SVG from the Lucide library.
============================================================ */
function initIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  } else {
    // Fallback: wait a moment and try again in case CDN is slow
    setTimeout(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }, 500);
  }
}


/* ============================================================
   2. Sticky Navbar — glass effect on scroll
   Adds/removes .navbar--scrolled once the user scrolls
   past a small threshold (10px).
============================================================ */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const SCROLL_THRESHOLD = 10;

  function onScroll() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      navbar.classList.add('navbar--scrolled');
    } else {
      navbar.classList.remove('navbar--scrolled');
    }
  }

  // Apply immediately in case page loaded mid-scroll (e.g. browser refresh)
  onScroll();

  window.addEventListener('scroll', onScroll, { passive: true });
}


/* ============================================================
   3. Active nav link — highlights the section currently in view
   Uses IntersectionObserver on each section; the link whose
   href matches the currently visible section gets .active.
============================================================ */
function initActiveLinks() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;

  // Build a map from section id → nav link element
  const linkMap = {};
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const id = href.slice(1);
      linkMap[id] = link;
    }
  });

  // Options: trigger when ≥30% of a section is visible
  const observerOptions = {
    root: null,
    rootMargin: `-${getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '68px'} 0px -30% 0px`,
    threshold: 0.15,
  };

  let currentActive = null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = linkMap[id];
      if (!link) return;

      if (entry.isIntersecting) {
        // Remove active from previous
        if (currentActive) currentActive.classList.remove('active');
        link.classList.add('active');
        currentActive = link;
      }
    });
  }, observerOptions);

  // Observe every section that has a matching nav link
  Object.keys(linkMap).forEach(id => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}


/* ============================================================
   4. Mobile Menu — hamburger toggle
   Toggles .open on #mobileMenu and aria-expanded on the button.
   Closes automatically when a link inside it is clicked.
============================================================ */
function initMobileMenu() {
  const toggle   = document.getElementById('navToggle');
  const menu     = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    // Swap icon to X
    const icon = toggle.querySelector('[data-lucide]');
    if (icon) {
      icon.setAttribute('data-lucide', 'x');
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon] });
    }
    // Prevent body scroll while menu is open
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isOpen = false;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    // Swap icon back to hamburger
    const icon = toggle.querySelector('[data-lucide], svg');
    if (icon) {
      icon.setAttribute('data-lucide', 'menu');
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon] });
    }
    document.body.style.overflow = '';
  }

  // Toggle on button click
  toggle.addEventListener('click', () => {
    isOpen ? closeMenu() : openMenu();
  });

  // Close when any link inside the menu is clicked
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });
}


/* ============================================================
   5. Scroll Reveal — fade-in-up effect using IntersectionObserver
   Elements with .reveal animate in when they enter the viewport.
   Elements with .reveal-group stagger their children.
============================================================ */
function initReveal() {
  // Feature cards and other individual elements
  const revealEls    = document.querySelectorAll('.reveal');
  // Section headers, timeline steps, etc.
  const revealGroups = document.querySelectorAll('.reveal-group');

  const options = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Once visible we don't need to watch it anymore
        observer.unobserve(entry.target);
      }
    });
  }, options);

  revealEls.forEach(el => observer.observe(el));
  revealGroups.forEach(el => observer.observe(el));
}


/* ============================================================
   6. Smooth Scroll — honour the CSS scroll-behavior setting
   but also close the mobile menu when an anchor is followed.
   Adds an offset so the sticky navbar doesn't overlap headings.
============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      // Calculate navbar height from CSS custom property
      const navHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '68',
        10,
      );

      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    });
  });
}
