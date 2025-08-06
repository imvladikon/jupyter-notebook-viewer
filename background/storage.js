// Clean storage implementation based on markdown-viewer patterns
// Simplified async pattern and cleaner state management

md.storage = ({compilers}) => {
  var defaults = md.storage.defaults(compilers)
  var state = {}
  
  async function set(options) {
    try {
      await chrome.storage.sync.set(options)
      Object.assign(state, options)
    } catch (error) {
      console.error('[Storage] Set failed:', error)
      // Fallback to local storage
      try {
        await chrome.storage.local.set(options)
        Object.assign(state, options)
      } catch (localError) {
        console.error('[Storage] Local storage failed:', localError)
      }
    }
  }
  
  chrome.storage.sync.get((res) => {
    // Clean up old permissions
    md.storage.bug(res)
    
    // Use defaults if empty, otherwise stored data
    Object.assign(state, JSON.parse(JSON.stringify(
      !Object.keys(res).length ? defaults : res)))
    
    // Add missing compiler defaults
    Object.keys(compilers).forEach((compiler) => {
      if (!state[compiler]) {
        state[compiler] = compilers[compiler].defaults
      }
    })
    
    // Run migrations
    if (md.migrations) {
      state = md.migrations.run(state)
    }
    
    // Ensure valid theme (fix "*" issue)
    if (!state.theme || typeof state.theme !== 'string' || state.theme === '*') {
      state.theme = 'github'
    }
    
    // Ensure raw is boolean
    if (typeof state.raw !== 'boolean') {
      state.raw = false
    }
    
    set(state)
  })
  
  return {defaults, state, set}
}

md.storage.defaults = (compilers) => {
  var match = '\\.ipynb(?:#.*|\\?.*)?$'
  
  var defaults = {
    theme: 'github',
    compiler: 'marked', 
    raw: false,
    match,
    themes: {
      wide: true,
    },
    content: {
      emoji: false,
      mathjax: true,
      mermaid: false,
      syntax: true,
      toc: true,
      autoreload: false,
    },
    origins: {
      'file://': {
        match,
        csp: false,
        encoding: '',
      }
    }
  }
  
  // Add compiler defaults
  Object.keys(compilers).forEach((compiler) => {
    if (compilers[compiler].defaults) {
      defaults[compiler] = compilers[compiler].defaults
    }
  })
  
  return defaults
}

md.storage.bug = (res) => {
  // Clean up old permissions
  chrome.permissions.getAll((permissions) => {
    var origins = Object.keys(res.origins || {})
    chrome.permissions.remove({
      origins: permissions.origins
        .filter((origin) => origins.indexOf(origin.slice(0, -2)) === -1)
    })
  })
}