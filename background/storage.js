// Enhanced storage module with migrations and error recovery
md.storage = (modules) => {

  var defaults = md.storage.defaults(modules)
  var state = {}
  var initialized = false

  function set(options) {
    try {
      chrome.storage.sync.set(options)
      Object.assign(state, options)
    } catch (error) {
      console.error('[Storage] Failed to set:', error)
      // Try local storage as fallback
      try {
        chrome.storage.local.set(options)
      } catch (localError) {
        console.error('[Storage] Local storage also failed:', localError)
      }
    }
  }

  // Initialize storage with error recovery
  chrome.storage.sync.get((res) => {
    try {
      // Clean up old permissions
      md.storage.bug(res)

      // Use defaults if empty, otherwise use stored data
      Object.assign(state, JSON.parse(JSON.stringify(
        !Object.keys(res).length ? defaults : res)))

      // Run migrations if available
      if (md.migrations) {
        state = md.migrations.run(state)
        
        // Validate state after migrations
        if (!md.migrations.validate(state)) {
          console.warn('[Storage] State validation failed, using defaults')
          state = defaults
        }
      } else {
        // Legacy migrations
        md.storage.migrations(state)
      }

      // Add missing compiler defaults
      if (modules && modules.compilers) {
        Object.keys(modules.compilers).forEach((compiler) => {
          if (!state[compiler] && modules.compilers[compiler] && modules.compilers[compiler].defaults) {
            state[compiler] = modules.compilers[compiler].defaults
          }
        })
      }
      
      // Ensure theme is a valid string
      if (!state.theme || typeof state.theme !== 'string' || state.theme === '*') {
        console.log('[Storage] Invalid theme detected:', state.theme, 'resetting to github')
        state.theme = 'github'
      }
      
      // Ensure raw is a boolean
      if (typeof state.raw !== 'boolean') {
        console.log('[Storage] Invalid raw value detected:', state.raw, 'resetting to false')
        state.raw = false
      }

      set(state)
      initialized = true
      console.log('[Storage] Initialization complete')
      console.log('[Storage] Final state theme:', state.theme)
      console.log('[Storage] Final state compiler:', state.compiler)
      console.log('[Storage] Final state raw:', state.raw)
      console.log('[Storage] Available origins:', Object.keys(state.origins || {}))
      
    } catch (error) {
      console.error('[Storage] Initialization failed:', error)
      state = defaults
      initialized = true
    }
  })

  return {defaults, state, set}
}

md.storage.defaults = (modules) => {
  var match = '\\.ipynb(?:#.*|\\?.*)?$'

  var defaults = {
    theme: 'github',
    compiler: 'marked',
    raw: false,  // Changed from 'ipynb' to false (boolean)
    header: false,
    match,
    themes: {
      wide: true,
    },
    content: {
      emoji: false,
      scroll: true,
      toc: true,
      mathjax: true,
      autoreload: false,
      mermaid: false,
    },
    origins: {
      'file://': {
        match,
        csp: false,
        encoding: '',
      }
    },
    // Add default compiler configurations
    marked: {
      breaks: false,
      gfm: true,
      pedantic: false,
      sanitize: false,
      smartLists: false,
      smartypants: false,
      langPrefix: 'language-'
    },
    remark: {
      breaks: false,
      footnotes: false,
      gfm: true,
      sanitize: false,
    }
  }

  // Add compiler defaults if available
  if (modules && modules.compilers) {
    Object.keys(modules.compilers).forEach((compiler) => {
      if (modules.compilers[compiler] && modules.compilers[compiler].defaults) {
        defaults[compiler] = modules.compilers[compiler].defaults
      }
    })
  }

  return defaults
}

md.storage.bug = (res) => {
  // reload extension bug
  chrome.permissions.getAll((permissions) => {
    var origins = Object.keys(res.origins || {})
    chrome.permissions.remove({
      origins: permissions.origins
        .filter((origin) => origins.indexOf(origin.slice(0, -2)) === -1)
    })
  })
}

// Legacy migrations (kept for compatibility)
md.storage.migrations = (state) => {
  // Only run if new migration system not available
  if (md.migrations) {
    return
  }
  
  // v3.6 -> v3.7
  if (state.origins && typeof state.origins['file://'] === 'object') {
    state.origins['file://'].csp = false
  }
  if (typeof state.theme === 'string') {
    state.theme = {
      name: state.theme,
      url: chrome.runtime.getURL(`/themes/${state.theme}.css`)
    }
  }
  if (state.themes === undefined) {
    state.themes = []
  }
  if (state.marked && state.marked.tables !== undefined) {
    delete state.marked.tables
  }
  // v3.9 -> v4.0
  if (state.remark.commonmark !== undefined) {
    delete state.remark.commonmark
  }
  if (state.remark.pedantic !== undefined) {
    delete state.remark.pedantic
  }
  if (state.content.mermaid === undefined) {
    state.content.mermaid = false
  }
  if (state.themes === undefined || state.themes instanceof Array) {
    state.themes = {wide: false}
  }
  if (typeof state.theme === 'object') {
    state.theme = state.theme.name
  }
}
