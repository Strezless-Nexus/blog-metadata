(() => {
  const state = { releases: [], currentId: null };

  const releaseList = document.getElementById('releaseList');
  const emptyState = document.getElementById('emptyState');
  const form = document.getElementById('releaseForm');
  const formTitle = document.getElementById('formTitle');
  const trackRows = document.getElementById('trackRows');
  const coverInput = document.getElementById('coverInput');
  const coverPreview = document.getElementById('coverPreview');
  const saveStatus = document.getElementById('saveStatus');

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o || {})[k], obj);
  }
  function setPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  async function api(path, opts) {
    const res = await fetch(path, opts);
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }

  async function loadReleases() {
    state.releases = await api('/api/releases');
    renderList();
  }

  function renderList() {
    releaseList.innerHTML = '';
    state.releases.forEach((r) => {
      const li = document.createElement('li');
      li.className = r.id === state.currentId ? 'active' : '';
      li.innerHTML = `<div class="r-title">${escapeHtml(r.title || 'Untitled release')}</div><div class="r-artist">${escapeHtml(r.artist || '')}</div>`;
      li.addEventListener('click', () => selectRelease(r.id));
      releaseList.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function blankRelease() {
    return {
      title: '', artist: '', featuredArtists: '', releaseType: 'Single',
      genre: '', secondaryGenre: '', moodTags: '', releaseDate: '', label: 'Independent',
      upc: '', copyrightLine: '', publishingLine: '', language: '', explicit: false,
      coverUrl: '', bio: '', pitch: '',
      links: { website: '', instagram: '', tiktok: '', twitter: '', spotify: '', appleMusic: '' },
      contactEmail: '', tracks: [],
    };
  }

  function selectRelease(id) {
    state.currentId = id;
    const release = id ? state.releases.find((r) => r.id === id) : blankRelease();
    renderList();
    emptyState.hidden = true;
    form.hidden = false;
    formTitle.textContent = id ? 'Edit Release' : 'New Release';
    fillForm(release || blankRelease());
  }

  function fillForm(release) {
    form.reset();
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      const value = getPath(release, el.name);
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value || '';
    });
    coverPreview.hidden = !release.coverUrl;
    if (release.coverUrl) coverPreview.src = release.coverUrl;

    trackRows.innerHTML = '';
    if (!document.getElementById('trackRowLabels')) {
      const labels = document.createElement('div');
      labels.id = 'trackRowLabels';
      labels.className = 'track-row-labels';
      labels.innerHTML = '<div>#</div><div>Title</div><div>Duration</div><div>ISRC</div><div>Writer(s)</div><div>Producer(s)</div><div>Performer(s)</div><div>Explicit</div><div></div>';
      trackRows.before(labels);
    }
    (release.tracks && release.tracks.length ? release.tracks : [blankTrack(1)]).forEach(addTrackRow);
  }

  function blankTrack(n) {
    return { trackNumber: n, title: '', duration: '', isrc: '', songwriters: '', producers: '', performers: '', explicit: false };
  }

  function addTrackRow(track) {
    const row = document.createElement('div');
    row.className = 'track-row';
    row.innerHTML = `
      <input data-f="trackNumber" type="number" min="1" value="${track.trackNumber || ''}">
      <input data-f="title" placeholder="Track title" value="${escapeAttr(track.title)}">
      <input data-f="duration" placeholder="mm:ss" value="${escapeAttr(track.duration)}">
      <input data-f="isrc" placeholder="Optional" value="${escapeAttr(track.isrc)}">
      <input data-f="songwriters" placeholder="Name(s)" value="${escapeAttr(track.songwriters)}">
      <input data-f="producers" placeholder="Name(s)" value="${escapeAttr(track.producers)}">
      <input data-f="performers" placeholder="Name(s)" value="${escapeAttr(track.performers)}">
      <label class="checkbox"><input type="checkbox" data-f="explicit" ${track.explicit ? 'checked' : ''}></label>
      <button type="button" class="remove-track" title="Remove track">&times;</button>
    `;
    row.querySelector('.remove-track').addEventListener('click', () => row.remove());
    trackRows.appendChild(row);
  }

  function escapeAttr(s) { return escapeHtml(s); }

  function collectForm() {
    const release = id_or_blank();
    [...form.elements].forEach((el) => {
      if (!el.name) return;
      setPath(release, el.name, el.type === 'checkbox' ? el.checked : el.value);
    });
    release.tracks = [...trackRows.querySelectorAll('.track-row')].map((row) => {
      const t = {};
      row.querySelectorAll('[data-f]').forEach((el) => {
        t[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
      });
      t.trackNumber = Number(t.trackNumber) || 0;
      t.explicit = !!t.explicit;
      return t;
    });
    return release;
  }

  function id_or_blank() {
    return state.currentId ? { ...state.releases.find((r) => r.id === state.currentId) } : blankRelease();
  }

  document.getElementById('newReleaseBtn').addEventListener('click', () => selectRelease(null));

  document.getElementById('addTrackBtn').addEventListener('click', () => {
    addTrackRow(blankTrack(trackRows.children.length + 1));
  });

  coverInput.addEventListener('change', async () => {
    const file = coverInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('cover', file);
    saveStatus.textContent = 'Uploading cover...';
    try {
      const { url } = await api('/api/upload', { method: 'POST', body: fd });
      form.elements['coverUrl'].value = url;
      coverPreview.src = url;
      coverPreview.hidden = false;
      saveStatus.textContent = 'Cover uploaded.';
    } catch (err) {
      saveStatus.textContent = 'Upload failed: ' + err.message;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const release = collectForm();
    try {
      let saved;
      if (state.currentId) {
        saved = await api(`/api/releases/${state.currentId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(release),
        });
      } else {
        saved = await api('/api/releases', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(release),
        });
      }
      await loadReleases();
      state.currentId = saved.id;
      renderList();
      saveStatus.textContent = 'Saved.';
      setTimeout(() => (saveStatus.textContent = ''), 2000);
    } catch (err) {
      saveStatus.textContent = 'Error: ' + err.message;
    }
  });

  document.getElementById('deleteBtn').addEventListener('click', async () => {
    if (!state.currentId) { form.hidden = true; emptyState.hidden = false; return; }
    if (!confirm('Delete this release? This cannot be undone.')) return;
    await api(`/api/releases/${state.currentId}`, { method: 'DELETE' });
    state.currentId = null;
    await loadReleases();
    form.hidden = true;
    emptyState.hidden = false;
  });

  document.getElementById('exportJsonBtn').addEventListener('click', () => {
    const release = collectForm();
    downloadBlob(JSON.stringify(release, null, 2), `${slug(release.title)}.json`, 'application/json');
  });

  document.getElementById('exportCsvBtn').addEventListener('click', async () => {
    if (!state.currentId) { alert('Save the release first.'); return; }
    window.location.href = `/api/releases/${state.currentId}/csv`;
  });

  document.getElementById('copyEpkBtn').addEventListener('click', async () => {
    const r = collectForm();
    const lines = [
      `${r.title || 'Untitled'} — ${r.artist || ''}`,
      r.releaseDate ? `Release date: ${r.releaseDate}` : null,
      r.genre ? `Genre: ${r.genre}${r.secondaryGenre ? ' / ' + r.secondaryGenre : ''}` : null,
      '',
      r.bio || '',
      '',
      r.pitch ? `Pitch: ${r.pitch}` : null,
      '',
      'Links:',
      r.links.spotify ? `Spotify: ${r.links.spotify}` : null,
      r.links.appleMusic ? `Apple Music: ${r.links.appleMusic}` : null,
      r.links.website ? `Website: ${r.links.website}` : null,
      r.links.instagram ? `Instagram: ${r.links.instagram}` : null,
      r.links.tiktok ? `TikTok: ${r.links.tiktok}` : null,
      r.links.twitter ? `Twitter/X: ${r.links.twitter}` : null,
      r.contactEmail ? `Contact: ${r.contactEmail}` : null,
    ].filter((l) => l !== null).join('\n');
    try {
      await navigator.clipboard.writeText(lines);
      saveStatus.textContent = 'EPK text copied to clipboard.';
    } catch {
      downloadBlob(lines, `${slug(r.title)}-epk.txt`, 'text/plain');
    }
    setTimeout(() => (saveStatus.textContent = ''), 2500);
  });

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function slug(s) { return (s || 'release').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  document.querySelectorAll('.help-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = document.querySelector(`[data-help-text="${btn.dataset.help}"]`);
      text.classList.toggle('open');
    });
  });

  loadReleases();
})();
