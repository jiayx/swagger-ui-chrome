/**
* Swagger UI Theme Settings Manager
* Handles theme loading from GitHub repository
*/

class ThemeManager {
  constructor() {
    this.themes = [];
    this.selectedTheme = null;
    this.currentFilter = 'all';
    this.searchQuery = '';

    // GitHub repositories configuration
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

  async init() {
    this.setupEventListeners();
    await this.loadThemes();
    this.loadSavedTheme();
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => this.saveTheme());

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => this.loadThemes());

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

  async loadThemes() {
    this.showLoading();
    this.themes = [];

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
      console.error('Error loading GitHub themes:', error);
      this.showError('Failed to load themes from GitHub. Please check your network connection.');
    }

    this.renderThemes();
  }

  async loadGitHubThemes() {
    for (const config of this.githubRepos) {
      try {
        // Fetch theme list from GitHub
        const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
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
            url: themeUrl,
            description: `Theme from ${config.owner}/${config.repo}`,
            screenshot: screenshotUrl
          });
        }
      } catch (error) {
        console.error(`Error loading themes from ${config.owner}/${config.repo}:`, error);
      }
    }
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
                    <h3>No themes found</h3>
                    <p>Try adjusting your search or filter criteria</p>
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
  }

  createThemeCard(theme) {
    const isSelected = this.selectedTheme === theme.url;
    const badge = theme.source === 'local' ? '<span class="theme-badge">Local</span>' :
    theme.source === 'github' ? '<span class="theme-badge">GitHub</span>' : '';

    const preview = theme.screenshot
    ? `<img src="${theme.screenshot}" alt="${theme.name}" loading="lazy" onerror="this.parentElement.classList.add('no-image'); this.parentElement.innerHTML='No preview available';">`
    : '<div class="no-image">No preview available</div>';

    return `
            <div class="theme-card ${isSelected ? 'selected' : ''}" data-theme-url="${theme.url}">
                <div class="theme-preview ${!theme.screenshot ? 'no-image' : ''}">
                    ${preview}
                </div>
                <div class="theme-info">
                    <div class="theme-name">
                        ${theme.name}
                        ${badge}
                    </div>
                    <div class="theme-source">${theme.description}</div>
                </div>
            </div>
        `;
  }

  selectTheme(themeUrl) {
    this.selectedTheme = themeUrl;

    // Update UI
    document.querySelectorAll('.theme-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.themeUrl === themeUrl);
    });

    // Enable save button
    document.getElementById('saveBtn').disabled = false;
  }

  async saveTheme() {
    if (!this.selectedTheme) return;

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>⏳</span> Saving...';

    try {
      if (this.selectedTheme === 'default') {
        // Remove custom theme
        await this.removeStoredTheme();
        this.showSuccess('Theme reset to default');
      } else {
        // Fetch and store theme CSS
        const response = await fetch(this.selectedTheme);

        if (!response.ok) {
          throw new Error('Failed to fetch theme');
        }

        const css = await response.text();
        await this.storeTheme(css, this.selectedTheme);
        this.showSuccess('Theme saved successfully');
        chrome.runtime.sendMessage({ type: 'setTheme', theme: css }, (response) => {
          if (chrome.runtime.lastError) {
            console.info('Error sending message:', chrome.runtime.lastError.message);
          }
        });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      this.showError('Failed to save theme. Please try again.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>✅</span> Save Theme';
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
          this.selectedTheme = result.themeUrl;
          // Update UI when themes are rendered
          setTimeout(() => {
            const card = document.querySelector(`[data-theme-url="${result.themeUrl}"]`);
            if (card) {
              card.classList.add('selected');
              document.getElementById('saveBtn').disabled = false;
            }
          }, 100);
        }
        resolve();
      });
    });
  }

  showLoading() {
    document.getElementById('themesGrid').innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading themes...</p>
            </div>
        `;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.getElementById('themesGrid').appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 5000);
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
