/**
* Swagger UI Theme Settings Manager
* Handles theme loading from GitHub repository
*/

class ThemeManager {
  constructor() {
    this.themes = [];
    this.selectedTheme = null;
    this.currentThemeUrl = null;
    this.currentFilter = 'all';
    this.searchQuery = '';
    this.loadErrors = [];
    this.isLoadingThemes = false;

    // GitHub repositories configuration
    this.githubRepos = [
      {
        owner: 'ilyamixaltik',
        repo: 'swagger-themes',
        branch: 'main',
        path: 'themes',
        label: 'ilyamixaltik',
        screenshotPath: 'screenshots',
        screenshotFormat: 'jpeg'
      },
      {
        owner: 'ostranme',
        repo: 'swagger-ui-themes',
        branch: 'master',
        path: 'themes/3.x',
        label: 'ostranme',
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

    refreshBtn.toggleAttribute('aria-busy', isLoading);
    label.textContent = this.t(isLoading ? 'refreshingButton' : 'refreshButton');
  }

  async init() {
    this.localizePage();
    this.setupEventListeners();
    await this.loadSavedTheme();
    await this.loadThemes();
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadThemes({ preserveContent: true, restoreScrollY: window.scrollY });
    });

    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderThemes();
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.renderThemes();
      });
    });
  }

  async loadThemes(options = {}) {
    if (this.isLoadingThemes) {
      return;
    }

    const { preserveContent = false, restoreScrollY } = options;
    try {
      this.isLoadingThemes = true;
      this.setRefreshLoading(true);

      if (!preserveContent || this.themes.length === 0) {
        this.showLoading();
      }

      this.clearStatus();
      this.themes = [];
      this.loadErrors = [];

      // Add default theme
      // this.themes.push({
      //     name: 'Default',
      //     source: 'built-in',
      //     url: 'default',
      //     description: 'Original Swagger UI theme',
      //     screenshot: null
      // });

      // Load GitHub themes
      try {
        await this.loadGitHubThemes();
      } catch (error) {
        console.warn('Unable to load GitHub themes:', error);
        this.addLoadError(this.t('githubNetworkFailed'));
      }

      this.renderThemes();
      this.showLoadErrors();

      if (Number.isFinite(restoreScrollY)) {
        requestAnimationFrame(() => window.scrollTo({ top: restoreScrollY }));
      }
    } finally {
      this.isLoadingThemes = false;
      this.setRefreshLoading(false);
    }
  }

  async loadGitHubThemes() {
    for (const config of this.githubRepos) {
      try {
        // Fetch theme list from GitHub
        const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorBody = await this.parseResponseJson(response);
          throw this.createGitHubApiError(response, errorBody);
        }

        const files = await response.json();

        // Filter CSS files
        const themeFiles = files.filter(file => file.name.endsWith('.css'));

        for (const file of themeFiles) {
          const themeName = file.name.replace('theme-', '').replace('.css', '');
          const screenshotName = `${config.screenshotNamePrefix ? config.screenshotNamePrefix + '-' : ''}${themeName}.${config.screenshotFormat}`;
          const themeUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.path}/${file.name}`;
          const screenshotUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.screenshotPath}/${screenshotName}`;

          this.themes.push({
            name: this.formatThemeName(themeName),
            source: config.owner,
            repository: `${config.owner}/${config.repo}`,
            repositoryLabel: config.label,
            url: themeUrl,
            description: `${config.owner}/${config.repo}`,
            screenshot: screenshotUrl
          });
        }
      } catch (error) {
        console.warn(`Unable to load themes from ${config.owner}/${config.repo}:`, error);
        this.addLoadError(this.getGitHubApiErrorMessage(error));
      }
    }
  }

  addLoadError(message) {
    if (!this.loadErrors.includes(message)) {
      this.loadErrors.push(message);
    }
  }

  async parseResponseJson(response) {
    try {
      return await response.clone().json();
    } catch (_) {
      return null;
    }
  }

  createGitHubApiError(response, body) {
    const error = new Error(`GitHub API returned ${response.status}`);
    error.githubApi = {
      status: response.status,
      body,
      headers: {
        retryAfter: response.headers.get('retry-after'),
        rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
        rateLimitReset: response.headers.get('x-ratelimit-reset')
      }
    };
    return error;
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
    // Convert theme name to title case and replace hyphens/underscores
    return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
  }

  renderThemes() {
    const container = document.getElementById('themesGrid');

    // Filter themes
    let filteredThemes = this.themes;

    if (this.currentFilter !== 'all') {
      filteredThemes = filteredThemes.filter(theme => theme.source === this.currentFilter);
    }

    if (this.searchQuery) {
      filteredThemes = filteredThemes.filter(theme =>
        theme.name.toLowerCase().includes(this.searchQuery) ||
        theme.description.toLowerCase().includes(this.searchQuery)
      );
    }

    if (filteredThemes.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <h3>${this.t('noThemesFoundTitle')}</h3>
                    <p>${this.t('noThemesFoundDescription')}</p>
                </div>
            `;
      return;
    }

    // Render theme cards
    container.innerHTML = filteredThemes.map(theme => this.createThemeCard(theme)).join('');

    // Add click handlers
    container.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', () => this.selectTheme(card.dataset.themeUrl));
    });

    container.querySelectorAll('.theme-screenshot').forEach(image => {
      image.addEventListener('error', () => {
        const preview = image.parentElement;
        preview.classList.add('no-image');
        preview.textContent = this.t('noPreviewAvailable');
      }, { once: true });
    });
  }

  createThemeCard(theme) {
    const isSelected = this.selectedTheme === theme.url;
    const isCurrent = this.currentThemeUrl === theme.url;
    const badges = [];

    if (isCurrent) {
      badges.push(`<span class="theme-badge theme-badge-in-use">${this.t('themeInUseBadge')}</span>`);
    } else if (isSelected) {
      badges.push(`<span class="theme-badge theme-badge-saving">${this.t('themeSavingBadge')}</span>`);
    }

    if (theme.source === 'local') {
      badges.push(`<span class="theme-badge theme-badge-source">${this.t('localBadge')}</span>`);
    } else if (theme.repositoryLabel) {
      badges.push(`<span class="theme-badge theme-badge-source">${theme.repositoryLabel}</span>`);
    }

    const preview = theme.screenshot
    ? `<img class="theme-screenshot" src="${theme.screenshot}" alt="${theme.name}" loading="lazy">`
    : `<div class="no-image">${this.t('noPreviewAvailable')}</div>`;

    return `
            <div class="theme-card ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}" data-theme-url="${theme.url}">
                <div class="theme-preview ${!theme.screenshot ? 'no-image' : ''}">
                    ${preview}
                </div>
                <div class="theme-info">
                    <div class="theme-name">
                        ${theme.name}
                        ${badges.join('')}
                    </div>
                    <div class="theme-source">${theme.description}</div>
                </div>
            </div>
        `;
  }

  async selectTheme(themeUrl) {
    if (themeUrl === this.currentThemeUrl) {
      return;
    }

    this.selectedTheme = themeUrl;

    // Update UI
    this.renderThemes();
    await this.saveTheme(themeUrl);
  }

  async saveTheme(themeUrl) {
    if (!themeUrl) return;

    try {
      if (themeUrl === 'default') {
        // Remove custom theme
        await this.removeStoredTheme();
        this.currentThemeUrl = null;
        this.showSuccess(this.t('themeResetSuccess'));
      } else {
        // Fetch and store theme CSS
        const response = await fetch(themeUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch theme: ${response.status}`);
        }

        const css = await response.text();
        await this.storeTheme(css, themeUrl);
        this.currentThemeUrl = themeUrl;
        this.selectedTheme = themeUrl;
        this.showSuccess(this.t('themeSavedSuccess'));
        chrome.runtime.sendMessage({ type: 'setTheme', theme: css }, (response) => {
          if (chrome.runtime.lastError) {
            console.info('Theme update message was not delivered:', chrome.runtime.lastError.message);
          }
        });
      }
    } catch (error) {
      console.warn('Unable to save theme:', error);
      this.selectedTheme = this.currentThemeUrl;
      this.showError(this.t('themeSaveFailed'));
    } finally {
      this.renderThemes();
    }
  }

  async storeTheme(css, url) {
    // Store in Chrome storage
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        theme: css,
        themeUrl: url
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async removeStoredTheme() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(['theme', 'themeUrl'], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async loadSavedTheme() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['themeUrl'], (result) => {
        if (result.themeUrl) {
          this.currentThemeUrl = result.themeUrl;
          this.selectedTheme = result.themeUrl;
        }
        resolve();
      });
    });
  }

  clearStatus() {
    document.getElementById('statusArea').textContent = '';
  }

  showLoadErrors() {
    if (this.loadErrors.length === 0) {
      return;
    }

    this.showError(this.loadErrors.join('\n'));
  }

  showLoading() {
    document.getElementById('themesGrid').innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>${this.t('loadingThemes')}</p>
            </div>
        `;
  }

  showError(message) {
    const statusArea = document.getElementById('statusArea');
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
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ThemeManager());
} else {
  new ThemeManager();
}
