const TOKEN_KEY  = 'github_token';
const REPO_KEY   = 'github_repo';
const PREFIX_KEY = 'github_prefix';
const BRANCH     = 'main';

function toBase64(str) {
  // UTF-8 safe base64 encoding
  return btoa(unescape(encodeURIComponent(str)));
}

export class GitHub {
  getToken()  { return localStorage.getItem(TOKEN_KEY)  || ''; }
  getRepo()   { return localStorage.getItem(REPO_KEY)   || ''; }
  getPrefix() { return localStorage.getItem(PREFIX_KEY) || ''; }
  getFilePath() { return `assets/data/${this.getPrefix()}-WorkoutLog.txt`; }
  isConfigured() { return !!(this.getToken() && this.getRepo() && this.getPrefix()); }

  saveConfig(token, repo, prefix) {
    localStorage.setItem(TOKEN_KEY,  token.trim());
    localStorage.setItem(REPO_KEY,   repo.trim());
    localStorage.setItem(PREFIX_KEY, prefix.trim());
  }

  async upload(content) {
    const token = this.getToken();
    const repo  = this.getRepo();
    if (!token || !repo) throw new Error('GitHub not configured');

    const [owner, repoName] = repo.split('/');
    const url     = `https://api.github.com/repos/${owner}/${repoName}/contents/${this.getFilePath()}`;
    const headers = {
      'Authorization': `token ${token}`,
      'Accept':        'application/vnd.github.v3+json',
      'Content-Type':  'application/json',
    };

    // Fetch current SHA so GitHub accepts the update
    let sha = null;
    const getRes = await fetch(`${url}?ref=${BRANCH}`, { headers });
    if (getRes.ok) {
      sha = (await getRes.json()).sha;
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub GET failed: ${getRes.status}`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const body  = {
      message: `Update workout log ${today}`,
      content: toBase64(content),
      branch:  BRANCH,
    };
    if (sha) body.sha = sha;

    const putRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `GitHub PUT failed: ${putRes.status}`);
    }
  }

  // Show a modal to enter/update the token and repo slug.
  // Returns a Promise that resolves true if saved, false if cancelled.
  showConfigModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.maxWidth = '420px';

      const header = document.createElement('div');
      header.className = 'modal-header';
      header.textContent = 'GitHub Settings';
      modal.appendChild(header);

      const makeRow = (labelText, inputEl) => {
        const row = document.createElement('div');
        row.style.cssText = 'margin-bottom:var(--spacing-md)';
        const lbl = document.createElement('label');
        lbl.style.cssText = 'display:block;margin-bottom:var(--spacing-xs);font-weight:500';
        lbl.textContent = labelText;
        inputEl.style.cssText = 'width:100%;padding:var(--spacing-sm) var(--spacing-md);border:2px solid var(--medium-gray);border-radius:var(--radius-md);font-size:1rem;box-sizing:border-box';
        row.appendChild(lbl);
        row.appendChild(inputEl);
        modal.appendChild(row);
        return inputEl;
      };

      const tokenInput = makeRow('Personal Access Token (repo scope)', document.createElement('input'));
      tokenInput.type        = 'password';
      tokenInput.placeholder = 'ghp_…';
      tokenInput.value       = this.getToken();

      const repoInput = makeRow('Repository (owner/repo)', document.createElement('input'));
      repoInput.type        = 'text';
      repoInput.placeholder = 'blairfraser/WorkoutLog';
      repoInput.value       = this.getRepo();

      const prefixInput = makeRow('Prefix  (produces {Prefix}-WorkoutLog.txt)', document.createElement('input'));
      prefixInput.type        = 'text';
      prefixInput.placeholder = 'Blair';
      prefixInput.value       = this.getPrefix();

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const saveBtn = document.createElement('button');
      saveBtn.className   = 'btn-primary';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.className   = 'btn-secondary';
      cancelBtn.textContent = 'Cancel';

      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      modal.appendChild(actions);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      saveBtn.addEventListener('click', () => {
        const t = tokenInput.value.trim();
        const r = repoInput.value.trim();
        const p = prefixInput.value.trim();
        if (!t || !r || !r.includes('/') || !p) {
          alert('Please enter a valid token, repo (owner/repo), and prefix.');
          return;
        }
        this.saveConfig(t, r, p);
        overlay.remove();
        resolve(true);
      });

      const cancel = () => { overlay.remove(); resolve(false); };
      cancelBtn.addEventListener('click', cancel);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
    });
  }
}
