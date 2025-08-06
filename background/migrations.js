// Storage migrations for handling version upgrades
md.migrations = {
  // Current schema version
  CURRENT_VERSION: 4,
  
  // Run all necessary migrations
  run: (state) => {
    // Initialize version if not present
    if (!state.version) {
      state.version = 1
    }
    
    console.log(`[Migrations] Current version: ${state.version}, target: ${md.migrations.CURRENT_VERSION}`)
    
    // Run migrations in sequence
    while (state.version < md.migrations.CURRENT_VERSION) {
      const nextVersion = state.version + 1
      const migrationFn = md.migrations[`v${state.version}_to_v${nextVersion}`]
      
      if (migrationFn) {
        console.log(`[Migrations] Running migration v${state.version} -> v${nextVersion}`)
        try {
          migrationFn(state)
          state.version = nextVersion
        } catch (error) {
          console.error(`[Migrations] Failed to migrate to v${nextVersion}:`, error)
          break
        }
      } else {
        console.warn(`[Migrations] No migration found for v${state.version} -> v${nextVersion}`)
        state.version = nextVersion
      }
    }
    
    return state
  },
  
  // Migration from v1 to v2: Update theme structure
  v1_to_v2: (state) => {
    // Convert theme from string to object
    if (typeof state.theme === 'string') {
      state.theme = {
        name: state.theme,
        url: chrome.runtime.getURL(`/themes/${state.theme}.css`)
      }
    }
    
    // Initialize themes array if not present
    if (!Array.isArray(state.themes)) {
      state.themes = []
    }
    
    // Ensure file:// origin has CSP setting
    if (state.origins && state.origins['file://']) {
      if (typeof state.origins['file://'] === 'boolean') {
        state.origins['file://'] = {
          match: '\\.ipynb(?:#.*|\\?.*)?$',
          csp: false,
          encoding: ''
        }
      } else if (typeof state.origins['file://'] === 'object') {
        state.origins['file://'].csp = state.origins['file://'].csp || false
      }
    }
  },
  
  // Migration from v2 to v3: Enhanced content settings
  v2_to_v3: (state) => {
    // Ensure content settings are complete
    if (!state.content) {
      state.content = {}
    }
    
    // Set defaults for content settings
    state.content = {
      emoji: state.content.emoji !== undefined ? state.content.emoji : false,
      scroll: state.content.scroll !== undefined ? state.content.scroll : true,
      toc: state.content.toc !== undefined ? state.content.toc : true,
      mathjax: state.content.mathjax !== undefined ? state.content.mathjax : true,
      autoreload: state.content.autoreload !== undefined ? state.content.autoreload : false,
      mermaid: state.content.mermaid !== undefined ? state.content.mermaid : false
    }
    
    // Clean up deprecated settings
    if (state.marked && state.marked.tables !== undefined) {
      delete state.marked.tables
    }
    
    // Ensure raw format is set for notebooks
    if (!state.raw) {
      state.raw = 'ipynb'
    }
  },
  
  // Migration from v3 to v4: Performance and reliability improvements
  v3_to_v4: (state) => {
    // Add performance settings
    if (!state.performance) {
      state.performance = {
        lazyLoad: true,
        cacheEnabled: true,
        maxCellsPerRender: 50,
        virtualScrolling: false
      }
    }
    
    // Add error recovery settings
    if (!state.errorRecovery) {
      state.errorRecovery = {
        autoRetry: true,
        maxRetries: 3,
        retryDelay: 1000
      }
    }
    
    // Update origin patterns for better matching
    Object.keys(state.origins || {}).forEach(origin => {
      if (typeof state.origins[origin] === 'boolean') {
        state.origins[origin] = {
          match: '\\.ipynb(?:#.*|\\?.*)?$',
          csp: false,
          encoding: ''
        }
      }
    })
    
    // Add debug mode setting
    if (state.debug === undefined) {
      state.debug = false
    }
  },
  
  // Validate state after migrations
  validate: (state) => {
    const requiredFields = [
      'version',
      'theme',
      'compiler',
      'raw',
      'header',
      'match',
      'content',
      'origins'
    ]
    
    const missing = requiredFields.filter(field => state[field] === undefined)
    
    if (missing.length > 0) {
      console.warn('[Migrations] Missing required fields:', missing)
      return false
    }
    
    return true
  },
  
  // Reset to defaults if corruption detected
  reset: () => {
    console.warn('[Migrations] Resetting to defaults due to corruption')
    
    const defaults = {
      version: md.migrations.CURRENT_VERSION,
      theme: {
        name: 'github',
        url: chrome.runtime.getURL('/themes/github.css')
      },
      themes: [],
      compiler: 'marked',
      raw: 'ipynb',
      header: false,
      match: '\\.ipynb(?:#.*|\\?.*)?$',
      content: {
        emoji: false,
        scroll: true,
        toc: true,
        mathjax: true,
        autoreload: false,
        mermaid: false
      },
      performance: {
        lazyLoad: true,
        cacheEnabled: true,
        maxCellsPerRender: 50,
        virtualScrolling: false
      },
      errorRecovery: {
        autoRetry: true,
        maxRetries: 3,
        retryDelay: 1000
      },
      origins: {
        'file://': {
          match: '\\.ipynb(?:#.*|\\?.*)?$',
          csp: false,
          encoding: ''
        }
      },
      debug: false
    }
    
    // Add compiler defaults if available
    if (md.compilers) {
      Object.keys(md.compilers).forEach(compiler => {
        if (md.compilers[compiler].defaults) {
          defaults[compiler] = md.compilers[compiler].defaults
        }
      })
    }
    
    return defaults
  }
}