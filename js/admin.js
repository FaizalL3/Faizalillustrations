// ============================================
// CONFIG — adjust these to match your repo
// ============================================
const REPO_OWNER = 'FaizalL3';
const REPO_NAME = 'Faizalillustrations';
const REPO_BRANCH = 'main';
const IMAGES_PATH = 'images'; // folder in the repo where uploads land

// ============================================
// Admin page password gate
// NOTE: this is NOT real security. It only hides the upload UI from
// casual visitors poking around your site. Anyone who opens dev tools
// and reads admin.js can see the check below. The actual protection on
// your repo is the GitHub token itself — keep that private.
// ============================================
const ADMIN_PASSWORD = 'Cheetahskurin45!'; // ← change this before you publish

const gate = document.getElementById('admin-gate');
const gateInput = document.getElementById('gate-input');
const gateError = document.getElementById('gate-error');
const gateForm = document.getElementById('gate-form');
const adminMain = document.getElementById('admin-main');

gateForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (gateInput.value === ADMIN_PASSWORD) {
    gate.style.display = 'none';
    adminMain.classList.add('is-visible');
    if (typeof loadManageList === 'function') loadManageList();
  } else {
    gateError.textContent = 'Incorrect password.';
    gateInput.value = '';
  }
});

// ============================================
// Token handling (client-side, local storage)
// ============================================
const TOKEN_KEY = 'faizal_admin_gh_token';

const tokenInput = document.getElementById('token-input');
const tokenSave = document.getElementById('token-save');
const tokenClear = document.getElementById('token-clear');
const tokenStatus = document.getElementById('token-status');

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function verifyToken(token) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

async function refreshTokenStatus() {
  const token = getToken();
  if (!token) {
    tokenStatus.textContent = 'No token saved.';
    tokenStatus.className = 'token-status';
    return;
  }
  tokenStatus.textContent = 'Checking…';
  const ok = await verifyToken(token);
  if (ok) {
    tokenStatus.textContent = 'Connected to repo.';
    tokenStatus.className = 'token-status is-connected';
  } else {
    tokenStatus.textContent = 'Token invalid or lacks access — check it and try again.';
    tokenStatus.className = 'token-status is-error';
  }
}

tokenSave.addEventListener('click', () => {
  const value = tokenInput.value.trim();
  if (!value) return;
  setToken(value);
  tokenInput.value = '';
  refreshTokenStatus();
});

tokenClear.addEventListener('click', () => {
  clearToken();
  refreshTokenStatus();
});

// run once on load (in case admin page reloads with main already visible — won't normally happen since gate resets, but harmless)
refreshTokenStatus();

// ============================================
// Drag & drop queue
// ============================================
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const queueEl = document.getElementById('queue');
const uploadAllBtn = document.getElementById('upload-all');
const logEl = document.getElementById('log');

let queue = []; // { id, file, filename, status }

function logLine(text, kind = '') {
  const line = document.createElement('div');
  line.className = `log__line ${kind}`;
  const time = new Date().toLocaleTimeString();
  line.textContent = `[${time}] ${text}`;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function sanitizeFilename(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');
}

function renderQueue() {
  queueEl.innerHTML = '';
  queue.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'queue__item';

    const isVideo = item.file.type.startsWith('video/');
    const thumb = document.createElement(isVideo ? 'video' : 'img');
    thumb.className = 'queue__thumb';
    thumb.src = item.previewUrl;
    if (isVideo) {
      thumb.muted = true;
    } else {
      thumb.alt = '';
    }

    const info = document.createElement('div');
    info.className = 'queue__info';

    const filenameRow = document.createElement('div');
    filenameRow.className = 'queue__filename-row';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.filename;
    nameInput.addEventListener('input', (e) => {
      item.filename = sanitizeFilename(e.target.value);
    });

    const stateSpan = document.createElement('span');
    stateSpan.className = `queue__state is-${item.status}`;
    stateSpan.textContent = labelForStatus(item.status);

    filenameRow.appendChild(nameInput);
    filenameRow.appendChild(stateSpan);

    const meta = document.createElement('div');
    meta.className = 'queue__meta';
    meta.textContent = `${(item.file.size / 1024).toFixed(0)} KB`;

    info.appendChild(filenameRow);
    info.appendChild(meta);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'queue__remove';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      queue = queue.filter((q) => q.id !== item.id);
      renderQueue();
    });

    row.appendChild(thumb);
    row.appendChild(info);
    if (item.status === 'pending') row.appendChild(removeBtn);

    queueEl.appendChild(row);
  });

  uploadAllBtn.disabled = queue.length === 0 || queue.every((q) => q.status !== 'pending');
}

function labelForStatus(status) {
  switch (status) {
    case 'pending': return 'Ready';
    case 'uploading': return 'Uploading…';
    case 'done': return 'Uploaded';
    case 'error': return 'Failed';
    default: return '';
  }
}

function addFilesToQueue(fileList) {
  Array.from(fileList).forEach((file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      logLine(`Skipped "${file.name}" — not an image or video.`, 'is-error');
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    queue.push({
      id,
      file,
      filename: sanitizeFilename(file.name),
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
    });
  });
  renderQueue();
}

dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  addFilesToQueue(e.target.files);
  fileInput.value = '';
});

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) {
    addFilesToQueue(e.dataTransfer.files);
  }
});

// ============================================
// GitHub API commit
// ============================================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function commitFileToRepo(token, path, base64Content, message) {
  // Check if a file already exists at this path to decide create vs update
  let sha = null;
  const checkRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (checkRes.ok) {
    const data = await checkRes.json();
    sha = data.sha;
  }

  const body = {
    message,
    content: base64Content,
    branch: REPO_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const errBody = await putRes.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub API error (${putRes.status})`);
  }

  return putRes.json();
}

async function uploadItem(item, token) {
  item.status = 'uploading';
  renderQueue();
  logLine(`Uploading ${item.filename}…`);

  try {
    const base64 = await fileToBase64(item.file);
    const path = `${IMAGES_PATH}/${item.filename}`;
    await commitFileToRepo(token, path, base64, `Add ${item.filename} via admin upload`);
    item.status = 'done';
    logLine(`Uploaded ${item.filename} → ${path}`, 'is-success');
  } catch (err) {
    item.status = 'error';
    logLine(`Failed to upload ${item.filename}: ${err.message}`, 'is-error');
  }

  renderQueue();
}

uploadAllBtn.addEventListener('click', async () => {
  const token = getToken();
  if (!token) {
    logLine('No GitHub token saved — paste one above first.', 'is-error');
    return;
  }

  const ok = await verifyToken(token);
  if (!ok) {
    logLine('Token check failed — verify it has Contents: Read and write access to this repo.', 'is-error');
    return;
  }

  const pending = queue.filter((q) => q.status === 'pending');
  if (pending.length === 0) {
    logLine('Nothing to upload.');
    return;
  }

  uploadAllBtn.disabled = true;
  logLine(`Starting upload of ${pending.length} file(s)…`);

  // sequential, not parallel — avoids GitHub API rate/conflict issues
  for (const item of pending) {
    await uploadItem(item, token);
  }

  logLine('Batch complete.');
  uploadAllBtn.disabled = queue.every((q) => q.status !== 'pending');
});

// ============================================
// Manage / Delete existing files
// ============================================
const manageList = document.getElementById('manage-list');
const manageStatus = document.getElementById('manage-status');
const refreshManageBtn = document.getElementById('refresh-manage');

const RAW_BASE_FOR_THUMBS = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${IMAGES_PATH}`;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;

async function fetchImagesFolder(token) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${IMAGES_PATH}?ref=${REPO_BRANCH}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) {
    throw new Error(`Could not list /${IMAGES_PATH} (status ${res.status})`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data.filter((f) => f.type === 'file' && f.name !== '.gitkeep') : [];
}

async function deleteFileFromRepo(token, path, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sha,
        branch: REPO_BRANCH,
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub API error (${res.status})`);
  }
  return res.json();
}

function renderManageList(files) {
  manageList.innerHTML = '';

  if (files.length === 0) {
    manageStatus.textContent = 'No files in /images yet.';
    manageStatus.className = 'token-status';
    return;
  }

  manageStatus.textContent = '';

  files.forEach((file) => {
    const row = document.createElement('div');
    row.className = 'manage-item';

    const isImage = IMAGE_EXT_RE.test(file.name);
    const thumb = document.createElement(isImage ? 'img' : 'video');
    thumb.className = 'manage-item__thumb';
    thumb.src = `${RAW_BASE_FOR_THUMBS}/${file.name}`;
    if (!isImage) thumb.muted = true;

    const info = document.createElement('div');
    info.className = 'manage-item__info';

    const name = document.createElement('div');
    name.className = 'manage-item__name';
    name.textContent = file.name;

    const meta = document.createElement('div');
    meta.className = 'manage-item__meta';
    meta.textContent = file.size ? `${(file.size / 1024).toFixed(0)} KB` : '';

    info.appendChild(name);
    info.appendChild(meta);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'manage-item__delete';
    deleteBtn.textContent = 'Delete';

    let armed = false;
    deleteBtn.addEventListener('click', async () => {
      if (!armed) {
        armed = true;
        deleteBtn.textContent = 'Confirm delete?';
        deleteBtn.classList.add('is-confirm');
        // disarm automatically after a few seconds so it can't be
        // accidentally confirmed by a later unrelated click
        setTimeout(() => {
          if (armed) {
            armed = false;
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.remove('is-confirm');
          }
        }, 4000);
        return;
      }

      const token = getToken();
      if (!token) {
        logLine('No GitHub token saved — paste one above first.', 'is-error');
        return;
      }

      deleteBtn.classList.add('is-deleting');
      deleteBtn.textContent = 'Deleting…';
      logLine(`Deleting ${file.name}…`);

      try {
        await deleteFileFromRepo(token, file.path, file.sha, `Remove ${file.name} via admin panel`);
        logLine(`Deleted ${file.name}`, 'is-success');
        row.remove();
        if (manageList.children.length === 0) {
          manageStatus.textContent = 'No files in /images yet.';
          manageStatus.className = 'token-status';
        }
      } catch (err) {
        logLine(`Failed to delete ${file.name}: ${err.message}`, 'is-error');
        deleteBtn.classList.remove('is-deleting');
        deleteBtn.textContent = 'Delete';
        deleteBtn.classList.remove('is-confirm');
        armed = false;
      }
    });

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(deleteBtn);
    manageList.appendChild(row);
  });
}

async function loadManageList() {
  const token = getToken();
  manageStatus.textContent = 'Loading…';
  manageStatus.className = 'token-status';

  try {
    const files = await fetchImagesFolder(token);
    renderManageList(files);
  } catch (err) {
    manageStatus.textContent = `Could not load files: ${err.message}`;
    manageStatus.className = 'token-status is-error';
  }
}

refreshManageBtn.addEventListener('click', loadManageList);
