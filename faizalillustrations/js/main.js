// ============================================
// Mobile nav toggle
// ============================================
const navToggle = document.querySelector('.nav__toggle');
const navLinks = document.querySelector('.nav__links');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('is-open');
  });

  // close menu when a link is tapped
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => navLinks.classList.remove('is-open'));
  });
}

// ============================================
// Art card data
// Each card can carry: data-still (final drawing image)
// and data-timelapse (video of it being drawn).
// Both are left empty until real assets are uploaded —
// the placeholder text shows until a src is set.
// ============================================

// ============================================
// Lightbox
// ============================================
const lightbox = document.getElementById('lightbox');
const lightboxFrame = lightbox ? lightbox.querySelector('.lightbox__frame') : null;
const lightboxClose = lightbox ? lightbox.querySelector('.lightbox__close') : null;

function buildLightboxContent(card) {
  const still = card.dataset.still;
  const timelapse = card.dataset.timelapse;
  const title = card.dataset.title || 'Untitled piece';

  lightboxFrame.innerHTML = '';

  if (!still && !timelapse) {
    lightboxFrame.innerHTML = `<span class="lightbox__placeholder">Artwork coming soon — ${title}</span>`;
    return;
  }

  if (still) {
    const img = document.createElement('img');
    img.src = still;
    img.alt = title;
    img.className = 'lightbox__media';
    lightboxFrame.appendChild(img);
  }

  if (timelapse) {
    const playBtn = document.createElement('button');
    playBtn.className = 'lightbox__play';
    playBtn.setAttribute('aria-label', `Play timelapse of ${title}`);
    playBtn.innerHTML = `
      <span class="lightbox__play-icon">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M5 3L19 11L5 19V3Z" fill="#16151A"/>
        </svg>
      </span>
    `;

    playBtn.addEventListener('click', () => {
      const video = document.createElement('video');
      video.src = timelapse;
      video.className = 'lightbox__media';
      video.controls = true;
      video.autoplay = true;
      lightboxFrame.innerHTML = '';
      lightboxFrame.appendChild(video);
    });

    lightboxFrame.appendChild(playBtn);
  }

  const caption = document.createElement('span');
  caption.className = 'lightbox__caption';
  caption.textContent = title;
  lightboxFrame.appendChild(caption);
}

function openLightbox(card) {
  if (!lightbox) return;
  buildLightboxContent(card);
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
  // stop any playing video
  const video = lightboxFrame.querySelector('video');
  if (video) video.pause();
}

document.querySelectorAll('.art-card').forEach((card) => {
  card.addEventListener('click', () => openLightbox(card));

  // keyboard support
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox(card);
    }
  });

  // hover-to-play after 5s (matches the CSS sketch-reveal timing)
  let hoverTimer = null;

  card.addEventListener('mouseenter', () => {
    hoverTimer = setTimeout(() => {
      const timelapse = card.dataset.timelapse;
      const mediaEl = card.querySelector('.art-card__media');
      if (timelapse && mediaEl && mediaEl.tagName === 'VIDEO') {
        mediaEl.currentTime = 0;
        mediaEl.play();
      }
    }, 5000);
  });

  card.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    const mediaEl = card.querySelector('.art-card__media');
    if (mediaEl && mediaEl.tagName === 'VIDEO') {
      mediaEl.pause();
      mediaEl.currentTime = 0;
    }
  });
});

if (lightboxClose) {
  lightboxClose.addEventListener('click', closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}
