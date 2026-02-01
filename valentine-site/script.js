/**
 * Valentine single-page site
 * - Screen A: Ask (Yes/No). NO button runs away when pointer is near.
 * - Screen B: 14-day calendar; tap to reveal image; lightbox. No persistence (resets on refresh).
 */

(function () {
  'use strict';

  // --- DOM refs ---
  const screenAsk = document.getElementById('screen-ask');
  const screenCalendar = document.getElementById('screen-calendar');
  const btnYes = document.getElementById('btn-yes');
  const btnNo = document.getElementById('btn-no');
  const niceTryMsg = document.getElementById('nice-try-msg');
  const celebrationContainer = document.getElementById('celebration-container');
  const calendarGrid = document.getElementById('calendar-grid');
  const revealedCountEl = document.getElementById('revealed-count');
  const finalMessage = document.getElementById('final-message');
  const finalLinkWrap = document.getElementById('final-link-wrap');
  const btnReset = document.getElementById('btn-reset');
  const btnBack = document.getElementById('btn-back');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');

  const RUNWAY_PROXIMITY = 80;       // px; move NO when pointer within this
  const RUNWAY_DEBOUNCE_MS = 150;   // avoid jitter
  const NUM_DAYS = 14;
  const IMAGE_BASE = 'images/';
  const IMAGE_EXT = '.jpg';

  let lastRunawayTime = 0;
  let pointerX = 0, pointerY = 0;

  // --- Screen swap ---
  function showScreen(screenElement) {
    document.querySelectorAll('.screen').forEach(function (el) {
      el.classList.remove('active');
      el.hidden = true;
    });
    screenElement.classList.add('active');
    screenElement.hidden = false;
    document.body.classList.toggle('calendar-page', screenElement === screenCalendar);
  }

  // --- Runaway NO button: keep inside card, never overlap YES, avoid jitter ---
  function getNoButtonBounds() {
    const wrap = document.querySelector('.buttons-wrap');
    if (!wrap) return null;
    const wrapRect = wrap.getBoundingClientRect();
    const yesRect = btnYes.getBoundingClientRect();
    const noWidth = btnNo.offsetWidth;
    const noHeight = btnNo.offsetHeight;
    const padding = 8;
    // All coordinates relative to .buttons-wrap (offsetParent of btnNo)
    return {
      wrapRect,
      noWidth,
      noHeight,
      minX: padding,
      maxX: wrapRect.width - noWidth - padding,
      minY: padding,
      maxY: wrapRect.height - noHeight - padding,
      yesLeft: yesRect.left - wrapRect.left,
      yesTop: yesRect.top - wrapRect.top,
      yesRight: yesRect.right - wrapRect.left,
      yesBottom: yesRect.bottom - wrapRect.top,
    };
  }

  function isOverlappingYes(left, top, w, h, b) {
    const noRight = left + w;
    const noBottom = top + h;
    return !(noRight <= b.yesLeft || left >= b.yesRight || noBottom <= b.yesTop || top >= b.yesBottom);
  }

  function isTooCloseToPointer(left, top, b) {
    const wrapRect = b.wrapRect;
    const centerX = wrapRect.left + left + b.noWidth / 2;
    const centerY = wrapRect.top + top + b.noHeight / 2;
    const dx = pointerX - centerX;
    const dy = pointerY - centerY;
    return (dx * dx + dy * dy) < RUNWAY_PROXIMITY * RUNWAY_PROXIMITY;
  }

  function randomPosition(b) {
    const { minX, maxX, minY, maxY, noWidth, noHeight } = b;
    let left, top;
    let attempts = 0;
    do {
      left = minX + Math.random() * Math.max(0, maxX - minX);
      top = minY + Math.random() * Math.max(0, maxY - minY);
      attempts++;
    } while (attempts < 30 && (isOverlappingYes(left, top, noWidth, noHeight, b) || isTooCloseToPointer(left, top, b)));
    return { left, top };
  }

  function moveNoButton() {
    const b = getNoButtonBounds();
    if (!b || b.maxX <= b.minX || b.maxY <= b.minY) return;
    const pos = randomPosition(b);
    btnNo.style.left = pos.left + 'px';
    btnNo.style.top = pos.top + 'px';
    lastRunawayTime = Date.now();
  }

  function checkProximityAndRun() {
    if (!screenAsk.classList.contains('active')) return;
    const now = Date.now();
    if (now - lastRunawayTime < RUNWAY_DEBOUNCE_MS) return;
    const b = getNoButtonBounds();
    if (!b) return;
    const noRect = btnNo.getBoundingClientRect();
    const noCenterX = noRect.left + noRect.width / 2;
    const noCenterY = noRect.top + noRect.height / 2;
    const dx = pointerX - noCenterX;
    const dy = pointerY - noCenterY;
    if (dx * dx + dy * dy < RUNWAY_PROXIMITY * RUNWAY_PROXIMITY) {
      moveNoButton();
    }
  }

  function initRunawayNo() {
    btnNo.style.position = 'absolute';
    moveNoButton();

    function updatePointer(e) {
      const t = e.touches ? e.touches[0] : e;
      pointerX = t.clientX;
      pointerY = t.clientY;
    }

    btnNo.addEventListener('mouseenter', checkProximityAndRun);
    document.addEventListener('mousemove', function (e) {
      pointerX = e.clientX;
      pointerY = e.clientY;
      checkProximityAndRun();
    });
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length) updatePointer(e);
    }, { passive: true });
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length) updatePointer(e);
      checkProximityAndRun();
    });
  }

  // --- Nice try (NO clicked) — show gif instead of text ---
  const NICE_TRY_GIF = 'images/emoji-disintegrating.gif';
  btnNo.addEventListener('click', function () {
    niceTryMsg.hidden = false;
    niceTryMsg.innerHTML = '<img class="nice-try-gif" src="' + NICE_TRY_GIF + '" alt="Nice try">';
    setTimeout(function () {
      niceTryMsg.hidden = true;
      niceTryMsg.textContent = '';
      moveNoButton();
    }, 2500);
  });

  // --- Celebration (lightweight hearts) ---
  function triggerCelebration() {
    const hearts = ['❤️', '💕', '💗', '💖', '💘'];
    const count = 20;
    for (let i = 0; i < count; i++) {
      setTimeout(function () {
        const el = document.createElement('span');
        el.className = 'heart-float';
        el.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        el.style.left = Math.random() * 100 + '%';
        el.style.top = (80 + Math.random() * 20) + '%';
        el.style.setProperty('--delay', Math.random() * 0.5 + 's');
        celebrationContainer.appendChild(el);
        setTimeout(function () {
          el.remove();
        }, 2600);
      }, i * 80);
    }
  }

  const bgMusic = document.getElementById('bg-music');

  btnYes.addEventListener('click', function () {
    if (bgMusic) {
      bgMusic.play().catch(function () { /* autoplay blocked */ });
    }
    triggerCelebration();
    setTimeout(function () {
      showScreen(screenCalendar);
      renderCalendar();
      updateRevealedUI();
    }, 800);
  });

  // --- Calendar: in-memory only (no localStorage; resets on refresh) ---
  let revealedDays = [];

  function getRevealed() {
    return revealedDays;
  }

  function setRevealed(dayNumbers) {
    revealedDays = dayNumbers.slice().sort(function (a, b) { return a - b; });
  }

  function getImagePath(day) {
    const num = String(day).padStart(2, '0');
    return IMAGE_BASE + num + IMAGE_EXT;
  }

  function getDayLabel(day) {
    return 'Feb ' + day;
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const revealed = getRevealed();
    for (let day = 1; day <= NUM_DAYS; day++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile' + (revealed.indexOf(day) !== -1 ? ' revealed' : '');
      tile.setAttribute('aria-label', getDayLabel(day) + (revealed.indexOf(day) !== -1 ? ', revealed' : ', tap to reveal'));
      tile.dataset.day = day;
      tile.setAttribute('role', 'gridcell');

      const front = document.createElement('div');
      front.className = 'tile-front';
      front.innerHTML = '<span class="tile-heart">❤️</span>' + getDayLabel(day);
      tile.appendChild(front);

      const back = document.createElement('div');
      back.className = 'tile-back';
      if (revealed.indexOf(day) !== -1) {
        const img = document.createElement('img');
        img.src = getImagePath(day);
        img.alt = getDayLabel(day);
        img.onerror = function () {
          back.innerHTML = '<span class="tile-fallback">Photo not found</span>';
        };
        back.appendChild(img);
      }
      tile.appendChild(back);

      tile.addEventListener('click', function () {
        handleTileClick(day, tile);
      });
      calendarGrid.appendChild(tile);
    }
  }

  function handleTileClick(day, tile) {
    const revealed = getRevealed();
    if (revealed.indexOf(day) !== -1) {
      openLightbox(day);
      return;
    }
    const newRevealed = revealed.concat([day]);
    setRevealed(newRevealed);
    tile.classList.add('revealed');
    const back = tile.querySelector('.tile-back');
    back.innerHTML = '';
    const img = document.createElement('img');
    img.src = getImagePath(day);
    img.alt = getDayLabel(day);
    img.onerror = function () {
      back.innerHTML = '<span class="tile-fallback">Photo not found</span>';
    };
    back.appendChild(img);
    tile.setAttribute('aria-label', getDayLabel(day) + ', revealed');
    updateRevealedUI();
    if (newRevealed.length === NUM_DAYS) {
      finalMessage.hidden = false;
      if (finalLinkWrap) finalLinkWrap.hidden = false;
    }
  }

  function updateRevealedUI() {
    const revealed = getRevealed();
    revealedCountEl.textContent = 'Revealed: ' + revealed.length + ' / ' + NUM_DAYS;
  }

  function openLightbox(day) {
    lightboxImg.src = getImagePath(day);
    lightboxImg.alt = getDayLabel(day);
    lightbox.setAttribute('data-open', 'true');
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.setAttribute('data-open', 'false');
    lightbox.hidden = true;
    lightboxImg.removeAttribute('src');
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox.getAttribute('data-open') === 'true') closeLightbox();
  });

  btnReset.addEventListener('click', function () {
    revealedDays = [];
    finalMessage.hidden = true;
    if (finalLinkWrap) finalLinkWrap.hidden = true;
    renderCalendar();
    updateRevealedUI();
  });

  if (btnBack) {
    btnBack.addEventListener('click', function () {
      showScreen(screenAsk);
    });
  }

  // --- Init ---
  initRunawayNo();
  renderCalendar();
  updateRevealedUI();
  var initialRevealed = getRevealed();
  if (initialRevealed.length === NUM_DAYS) {
    finalMessage.hidden = false;
    if (finalLinkWrap) finalLinkWrap.hidden = false;
  }
})();
