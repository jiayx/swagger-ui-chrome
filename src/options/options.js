class ThemeManager {
  constructor() {
    this.themes = [];
    this.selectedTheme = 'default';
    this.currentThemeUrl = 'default';
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.loadErrors = [];
    this.isLoadingThemes = false;
    this.isSavingTheme = false;
    this.previewThemeUrl = null;

    this.githubRepos = [
      {
        owner: 'ilyamixaltik',
        repo: 'swagger-themes',
        branch: 'main',
        path: 'themes',
        screenshotPath: 'screenshots',
        screenshotFormat: 'jpeg'
      },
      {
        owner: 'ostranme',
        repo: 'swagger-ui-themes',
        branch: 'master',
        path: 'themes/3.x',
        screenshotPath: 'screenshots/3.x',
        screenshotNamePrefix: '3.x',
        screenshotFormat: 'png'
      }
    ];

    this.init();
  }

  t(messageName, substitutions) {
    const message = chrome.i18n.getMessage(messageName, substitutions);
    return message || messageName;
  }

  localizePage() {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.title = this.t('optionsTitle');

    document.querySelectorAll('[data-i18n]').forEach(element => {
      element.textContent = this.t(element.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      element.placeholder = this.t(element.dataset.i18nPlaceholder);
    });
  }

  setRefreshLoading(isLoading) {
    const refreshBtn = document.getElementById('refreshBtn');
    const label = refreshBtn.querySelector('.btn-label');

    refreshBtn.setAttribute('aria-busy', String(isLoading));
    refreshBtn.disabled = isLoading;
    document.getElementById('loading-status').hidden = !isLoading;
    document.getElementById('themesGrid').setAttribute('aria-busy', String(isLoading));
    label.textContent = this.t(isLoading ? 'refreshingButton' : 'refreshButton');
  }

  async init() {
    this.localizePage();
    this.setupEventListeners();
    await this.loadSavedTheme();
    await this.loadThemes();
  }

  setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadThemes({ restoreScrollY: window.scrollY });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderThemes();
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-pressed', 'false');
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.setAttribute('aria-pressed', 'true');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.renderThemes();
      });
    });
    document.getElementById('resetThemeBtn').addEventListener('click', () => this.selectTheme('default'));
    const dialog = document.getElementById('themePreview');
    document.getElementById('closePreview').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const bounds = dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      const trigger = Array.from(document.querySelectorAll('.preview-button')).find(button => button.dataset.themeUrl === this.previewThemeUrl);
      trigger?.focus();
    });
    document.getElementById('applyPreview').addEventListener('click', () => this.selectTheme(this.previewThemeUrl));
    for (const [imageId, fallbackId] of [['current-theme-image', 'current-preview-fallback'], ['preview-image', 'preview-fallback']]) {
      document.getElementById(imageId).addEventListener('error', event => {
        event.target.hidden = true;
        document.getElementById(fallbackId).hidden = false;
      });
    }

  }

  defaultTheme() {
    return {
      name: this.t('defaultTheme'), source: 'built-in', url: 'default',
      description: this.t('defaultThemeDescription'), screenshot: './default-theme.png'
    };
  }

  findTheme(url) {
    return url === 'default' ? this.defaultTheme() : this.themes.find(theme => theme.url === url);
  }

  updateCurrentTheme() {
    const theme = this.findTheme(this.currentThemeUrl);
    const name = document.getElementById('current-theme-name');
    if (!name) return;
    // A cached CSS theme can outlive the remote catalog entry.
    name.textContent = theme?.name || this.formatThemeName(this.currentThemeUrl.split('/').pop().replace(/^theme-/, '').replace(/\.css$/, ''));
    document.getElementById('current-theme-description').textContent = theme?.description || this.t('savedTheme');
    const image = document.getElementById('current-theme-image');
    const screenshot = theme?.screenshot || '';
    if (image.getAttribute('src') !== screenshot) {
      image.hidden = !screenshot;
      document.getElementById('current-preview-fallback').hidden = !!screenshot;
      if (screenshot) image.src = screenshot;
      else image.removeAttribute('src');
    }
    const reset = document.getElementById('resetThemeBtn');
    reset.disabled = this.isSavingTheme || this.currentThemeUrl === 'default';
    reset.setAttribute('aria-busy', String(this.isSavingTheme && this.selectedTheme === 'default'));
    const dialogButton = document.getElementById('applyPreview');
    dialogButton.disabled = this.isSavingTheme || this.currentThemeUrl === this.previewThemeUrl;
    dialogButton.textContent = this.t(this.isSavingTheme ? 'savingButton' : this.currentThemeUrl === this.previewThemeUrl ? 'themeInUseBadge' : 'useTheme');
  }

  openPreview(themeUrl) {
    const theme = this.findTheme(themeUrl);
    if (!theme) return;
    this.previewThemeUrl = themeUrl;
    document.getElementById('preview-status').textContent = '';
    document.getElementById('preview-title').textContent = theme.name;
    const image = document.getElementById('preview-image');
    image.alt = theme.name;
    image.hidden = !theme.screenshot;
    document.getElementById('preview-fallback').hidden = !!theme.screenshot;
    if (theme.screenshot) image.src = theme.screenshot;
    else image.removeAttribute('src');
    this.updateCurrentTheme();
    document.getElementById('themePreview').showModal();
  }

  async loadThemes({ restoreScrollY } = {}) {
    if (this.isLoadingThemes) {
      return;
    }

    try {
      this.isLoadingThemes = true;
      this.setRefreshLoading(true);

      this.clearStatus();
      this.loadErrors = [];

      await this.loadGitHubThemes();

      this.renderThemes();
      if (this.loadErrors.length) this.showError(this.loadErrors.join('\n'));

      if (Number.isFinite(restoreScrollY)) {
        requestAnimationFrame(() => window.scrollTo({ top: restoreScrollY }));
      }
    } finally {
      this.isLoadingThemes = false;
      this.setRefreshLoading(false);
    }
  }

  async loadGitHubThemes() {
    const previousThemes = this.themes;
    const results = await Promise.all(this.githubRepos.map(async config => {
      try {
        const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
        const files = await this.fetchResource(apiUrl, 'json');

        const themeFiles = files.filter(file => file.name.endsWith('.css'));

        return themeFiles.map(file => {
          const themeName = file.name.replace('theme-', '').replace('.css', '');
          const screenshotName = `${config.screenshotNamePrefix ? config.screenshotNamePrefix + '-' : ''}${themeName}.${config.screenshotFormat}`;
          const themeUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.path}/${file.name}`;
          const screenshotUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.screenshotPath}/${screenshotName}`;

          return {
            name: this.formatThemeName(themeName),
            source: config.owner,
            url: themeUrl,
            description: `${config.owner}/${config.repo}`,
            screenshot: screenshotUrl
          };
        });
      } catch (error) {
        console.warn(`Unable to load themes from ${config.owner}/${config.repo}:`, error);
        const message = this.getGitHubApiErrorMessage(error);
        if (!this.loadErrors.includes(message)) this.loadErrors.push(message);
        return previousThemes.filter(theme => theme.source === config.owner);
      }
    }));
    this.themes = results.flat();
    try {
      await chrome.storage.local.set({ themeCatalog: this.themes });
    } catch (error) {
      console.warn('Unable to cache theme catalog:', error);
    }
  }

  async fetchResource(url, format) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        const error = new Error(`GitHub returned ${response.status}`);
        error.githubApi = {
          status: response.status,
          body: await response.json().catch(() => null),
          headers: {
            retryAfter: response.headers.get('retry-after'),
            rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
            rateLimitReset: response.headers.get('x-ratelimit-reset')
          }
        };
        throw error;
      }
      return await response[format]();
    } finally {
      clearTimeout(timeout);
    }
  }

  getGitHubApiErrorMessage(error) {
    const apiError = error.githubApi;

    if (!apiError) {
      return this.t('githubNetworkFailed');
    }

    const { status, headers, body } = apiError;
    const message = String(body?.message || '');

    if ((status === 403 || status === 429) && headers.rateLimitRemaining === '0') {
      const resetAt = this.formatResetTime(headers.rateLimitReset);
      return this.t('githubRateLimitPrimary', [resetAt]);
    }

    if ((status === 403 || status === 429) && /secondary rate limit/i.test(message)) {
      const waitTime = headers.retryAfter
        ? this.t('seconds', [headers.retryAfter])
        : this.t('aboutOneMinute');
      return this.t('githubRateLimitSecondary', [waitTime]);
    }

    if (status === 403 && /rate limit/i.test(message)) {
      return this.t('githubRateLimitGeneric');
    }

    if (status === 401) {
      return this.t('githubAuthInvalid');
    }

    if (status === 403) {
      return this.t('githubPermissionDenied');
    }

    return this.t('githubNetworkFailed');
  }

  formatResetTime(resetEpochSeconds) {
    if (!resetEpochSeconds) {
      return this.t('later');
    }

    const resetAt = new Date(Number(resetEpochSeconds) * 1000);
    if (Number.isNaN(resetAt.getTime())) {
      return this.t('later');
    }

    return new Intl.DateTimeFormat(chrome.i18n.getUILanguage(), {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(resetAt);
  }

  formatThemeName(name) {
    return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  }

  renderThemes() {
    const container = document.getElementById('themesGrid');
    const focusedButton = document.activeElement;
    const focusedUrl = focusedButton?.dataset?.themeUrl;
    const focusedAction = focusedButton?.classList?.contains('preview-button') ? '.preview-button' : '.apply-theme';
    const allThemes = [this.defaultTheme(), ...this.themes];
    let filteredThemes = allThemes;
    if (this.currentFilter !== 'all') filteredThemes = filteredThemes.filter(theme => theme.source === this.currentFilter);
    if (this.searchQuery) {
      filteredThemes = filteredThemes.filter(theme => `${theme.name} ${theme.description}`.toLowerCase().includes(this.searchQuery));
    }
    this.updateCurrentTheme();
    const count = document.getElementById('results-count');
    if (count) count.textContent = this.t('themeResultsCount', [String(filteredThemes.length), String(allThemes.length)]);
    const total = document.getElementById('all-count');
    if (total) total.textContent = String(allThemes.length);
    container.innerHTML = filteredThemes.length
      ? filteredThemes.map(theme => this.createThemeCard(theme)).join('')
      : `<div class="empty-state"><h3>${this.t('noThemesFoundTitle')}</h3><p>${this.t('noThemesFoundDescription')}</p><button type="button" class="button secondary" id="clearFilters">${this.t('clearFilters')}</button></div>`;
    container.querySelector('#clearFilters')?.addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      this.searchQuery = '';
      document.querySelector('.filter-tab[data-filter="all"]').click();
      document.getElementById('searchInput').focus();
    });
    container.querySelectorAll('.apply-theme').forEach(button => button.addEventListener('click', () => this.selectTheme(button.dataset.themeUrl)));
    container.querySelectorAll('.preview-button').forEach(button => button.addEventListener('click', () => this.openPreview(button.dataset.themeUrl)));
    if (focusedUrl) {
      Array.from(container.querySelectorAll(focusedAction)).find(button => button.dataset.themeUrl === focusedUrl)?.focus();
    }
    container.querySelectorAll('.theme-screenshot').forEach(image => {
      image.addEventListener('error', () => {
        image.hidden = true;
        image.parentElement.querySelector('.no-image').hidden = false;
      }, { once: true });
    });
  }

  createThemeCard(theme) {
    const escape = value => String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const isCurrent = this.currentThemeUrl === theme.url;
    const isSaving = this.isSavingTheme && this.selectedTheme === theme.url;
    const badge = isCurrent || isSaving
      ? `<span class="theme-badge ${isSaving ? 'theme-badge-saving' : ''}">${this.t(isSaving ? 'themeSavingBadge' : 'themeInUseBadge')}</span>` : '';
    const source = theme.source === 'built-in' ? this.t('builtInTheme') : theme.source;
    return `<article class="theme-card ${isCurrent ? 'current' : ''} ${isSaving ? 'selected' : ''}">
      <button type="button" class="preview-button" data-theme-url="${escape(theme.url)}" aria-label="${escape(this.t('previewTheme') + ': ' + theme.name)}">
        ${theme.screenshot ? `<img class="theme-screenshot" src="${escape(theme.screenshot)}" alt="" loading="lazy">` : ''}
        <span class="no-image" ${theme.screenshot ? 'hidden' : ''}>${this.t('noPreviewAvailable')}</span>
        <span class="preview-label">${this.t('previewTheme')}</span>${badge}
      </button>
      <div class="theme-info"><div><h3 class="theme-name">${escape(theme.name)}</h3><div class="theme-source">${escape(source)}</div></div>
        <button type="button" class="apply-theme" data-theme-url="${escape(theme.url)}" aria-label="${escape(this.t('useTheme') + ': ' + theme.name)}" aria-pressed="${isCurrent}" ${this.isSavingTheme || isCurrent ? 'disabled' : ''}>${this.t(isSaving ? 'savingButton' : isCurrent ? 'themeInUseBadge' : 'useTheme')}</button>
      </div></article>`;
  }

  async selectTheme(themeUrl) {
    if (!themeUrl || this.isSavingTheme || themeUrl === this.currentThemeUrl) {
      return;
    }

    this.clearStatus();
    this.isSavingTheme = true;
    this.selectedTheme = themeUrl;

    this.renderThemes();

    try {
      if (themeUrl === 'default') {
        await chrome.storage.local.remove(['theme', 'themeUrl']);
        this.currentThemeUrl = 'default';
        this.selectedTheme = 'default';
        this.showSuccess(this.t('themeResetSuccess'));
      } else {
        const css = await this.fetchResource(themeUrl, 'text');
        await chrome.storage.local.set({ theme: css, themeUrl });
        this.currentThemeUrl = themeUrl;
        this.selectedTheme = themeUrl;
        this.showSuccess(this.t('themeSavedSuccess'));
      }
    } catch (error) {
      console.warn('Unable to save theme:', error);
      this.selectedTheme = this.currentThemeUrl;
      this.showError(this.t('themeSaveFailed'));
    } finally {
      this.isSavingTheme = false;
      this.renderThemes();
    }
  }

  async loadSavedTheme() {
    try {
      const result = await chrome.storage.local.get(['themeUrl', 'themeCatalog']);
      this.themes = Array.isArray(result?.themeCatalog) ? result.themeCatalog.filter(theme =>
        theme && typeof theme.name === 'string' && typeof theme.url === 'string' &&
        typeof theme.source === 'string') : [];
      if (typeof result?.themeUrl === 'string' && result.themeUrl) {
        this.currentThemeUrl = result.themeUrl;
        this.selectedTheme = result.themeUrl;
      }
    } catch (_) {
      console.warn('Unable to read saved theme; loading the default theme catalog.');
    }
    this.renderThemes();
  }

  clearStatus() {
    document.getElementById('statusArea').textContent = '';
    const previewStatus = document.getElementById('preview-status');
    if (previewStatus) previewStatus.textContent = '';
  }

  showError(message) {
    const statusArea = document.getElementById(document.getElementById('themePreview')?.open ? 'preview-status' : 'statusArea');
    statusArea.textContent = '';

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    message.split('\n').forEach((line, index) => {
      if (index > 0) {
        errorDiv.appendChild(document.createElement('br'));
      }
      errorDiv.appendChild(document.createTextNode(line));
    });
    statusArea.appendChild(errorDiv);
  }

  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.setAttribute('role', 'status');
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ThemeManager());
} else {
  new ThemeManager();
}
