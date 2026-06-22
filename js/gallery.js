// ============================================
// CONFIG — must match admin.js
// ============================================
const GALLERY_REPO_OWNER = 'FaizalL3';
const GALLERY_REPO_NAME = 'Faizalillustrations';
const GALLERY_BRANCH = 'main';
const GALLERY_IMAGES_PATH = 'images';

// Raw file base — fastest way to actually serve the image bytes,
// since the GitHub Contents API itself doesn't give a direct CDN url
// for unauthenticated, no-extra-request access.
const RAW_BASE = `https://raw.githubusercontent.com/${GALLERY_REPO_OWNER}/${GALLERY_REPO_NAME}/${GALLERY_BRANCH}/${GALLERY_IMAGES_PATH}`;

const STILL_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];

function splitExt(filename) {
  const idx = filename.lastIndexOf('.');
  if (idx === -1) return { base: filename, ext: '' };
  return { base: filename.slice(0, idx), ext: filename.slice(idx + 1).toLowerCase() };
}

function titleFromBase(base) {
  // strip a trailing "-timelapse" if present (shouldn't be, but safety)
  const cleaned = base.replace(/-timelapse$/i, '');
  const spaced = cleaned.replace(/[-_]+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Untitled';
}

/**
 * Fetches the /images folder listing and groups files into pieces:
 * { key, title, stillUrl, timelapseUrl, updatedAt }
 * Pairing rule: "piece1.png" is the still, "piece1-timelapse.mp4" is its timelapse.
 */
async function loadGalleryPieces() {
  const res = await fetch(
    `https://api.github.com/repos/${GALLERY_REPO_OWNER}/${GALLERY_REPO_NAME}/contents/${GALLERY_IMAGES_PATH}?ref=${GALLERY_BRANCH}`
  );

  if (!res.ok) {
    console.warn('Gallery: could not list /images folder', res.status);
    return [];
  }

  const files = await res.json();
  if (!Array.isArray(files)) return [];

  const stills = new Map(); // key -> { name, ext }
  const timelapses = new Map(); // key -> { name, ext }

  files.forEach((f) => {
    if (f.type !== 'file') return;
    const { base, ext } = splitExt(f.name);

    if (/-timelapse$/i.test(base) && VIDEO_EXTENSIONS.includes(ext)) {
      const key = base.replace(/-timelapse$/i, '').toLowerCase();
      timelapses.set(key, f.name);
    } else if (STILL_EXTENSIONS.includes(ext)) {
      const key = base.toLowerCase();
      stills.set(key, f.name);
    }
  });

  const pieces = [];
  stills.forEach((filename, key) => {
    pieces.push({
      key,
      title: titleFromBase(key),
      stillUrl: `${RAW_BASE}/${filename}`,
      timelapseUrl: timelapses.has(key) ? `${RAW_BASE}/${timelapses.get(key)}` : '',
      // GitHub's contents API doesn't return commit dates per file in this
      // endpoint, so we fall back to filename order. Pieces named with a
      // leading number (piece1, piece2...) will sort newest-last by default;
      // reverse so most recently added (highest number / latest alpha) shows first.
      sortKey: key,
    });
  });

  // best-effort "newest first" — numeric-aware sort, descending
  pieces.sort((a, b) => b.sortKey.localeCompare(a.sortKey, undefined, { numeric: true }));

  return pieces;
}

function buildArtCard(piece) {
  const card = document.createElement('div');
  card.className = 'art-card';
  card.dataset.still = piece.stillUrl;
  card.dataset.timelapse = piece.timelapseUrl;
  card.dataset.title = piece.title;

  card.innerHTML = `
    <img class="art-card__media is-visible" src="${piece.stillUrl}" alt="${piece.title}" />
    <div class="art-card__progress"></div>
    <div class="art-card__caption">${piece.title}</div>
  `;

  return card;
}

/**
 * Renders pieces into a grid container, capped at `limit`.
 * Falls back silently (leaves existing placeholder markup) if no pieces found,
 * so the site never shows a broken empty page before any art is uploaded.
 */
async function renderGallery(containerSelector, limit) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  let pieces;
  try {
    pieces = await loadGalleryPieces();
  } catch (err) {
    console.warn('Gallery: fetch failed, keeping placeholders', err);
    return;
  }

  if (pieces.length === 0) return; // keep static placeholder cards as-is

  const toShow = pieces.slice(0, limit);
  container.innerHTML = '';
  toShow.forEach((piece) => container.appendChild(buildArtCard(piece)));

  // re-attach the same interaction behavior main.js uses
  if (typeof attachArtCardBehavior === 'function') {
    attachArtCardBehavior(container.querySelectorAll('.art-card'));
  }
}
