md.detect = ({storage: {state}, inject}) => {

  var onwakeup = true
  var detectionCache = new Map()
  const CACHE_TTL = 5000 // 5 seconds cache

  var tab = async (id, info, tab) => {
    if (info.status === 'loading') {
      try {
        // Check cache first
        const cacheKey = `${id}:${tab.url}`
        const cached = detectionCache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return
        }
        
        // Try to execute detection script
        const results = await chrome.scripting.executeScript({
          target: {tabId: id},
          func: () => {
            // Check if already loaded
            if (window.notebookViewerLoaded) {
              return JSON.stringify({
                url: window.location.href,
                loaded: true,
                isNotebook: false
              })
            }
            
            // Check for .ipynb extension
            const isIpynbUrl = window.location.pathname.endsWith('.ipynb')
            
            // Try to detect JSON content structure for notebooks
            let isNotebookContent = false
            let contentType = document.contentType || ''
            
            // Check if content looks like a notebook
            if (document.body && isIpynbUrl) {
              const pre = document.querySelector('pre')
              if (pre && pre.textContent) {
                try {
                  const content = JSON.parse(pre.textContent)
                  // Check for notebook structure
                  isNotebookContent = !!(
                    content && 
                    typeof content === 'object' &&
                    (content.cells !== undefined || content.worksheets !== undefined) &&
                    (content.metadata !== undefined || content.nbformat !== undefined)
                  )
                } catch (e) {
                  // Not valid JSON or not a notebook
                }
              }
            }
            
            return JSON.stringify({
              url: window.location.href,
              header: contentType,
              loaded: !!window.notebookViewerLoaded || !!window.state,
              isNotebook: isIpynbUrl || isNotebookContent
            })
          },
          injectImmediately: true
        })

        if (!results || !results[0] || !results[0].result) {
          return
        }

        try {
          var win = JSON.parse(results[0].result)
        } catch (err) {
          console.debug('[Detection] Parse error:', err)
          return
        }
        
        // Cache the result
        detectionCache.set(cacheKey, {
          result: win,
          timestamp: Date.now()
        })
        
        // Clean up old cache entries
        if (detectionCache.size > 100) {
          const oldestKey = detectionCache.keys().next().value
          detectionCache.delete(oldestKey)
        }

        if (win.loaded) {
          console.log('[Detection] Already loaded, skipping tab', id)
          return
        }
        
        // Check if this is a notebook file
        console.log('[Detection] Checking notebook for tab', id, 'isNotebook:', win.isNotebook, 'endsWithIpynb:', win.url.endsWith('.ipynb'))
        if (!win.isNotebook && !win.url.endsWith('.ipynb')) {
          console.log('[Detection] Not a notebook file, skipping tab', id)
          return
        }

        var headerMatch = header(win.header)
        var urlMatch = match(win.url)
        console.log('[Detection] Header match:', headerMatch, 'URL match:', urlMatch, 'for tab', id)
        console.log('[Detection] Current state theme:', state.theme)
        console.log('[Detection] Current state origins count:', Object.keys(state.origins || {}).length)
        
        if (headerMatch || urlMatch) {
          if (onwakeup && chrome.webRequest) {
            onwakeup = false
            console.log('[Detection] Wake-up detected, reloading tab', id)
            chrome.tabs.reload(id)
          } else {
            console.log('[Detection] Injecting scripts for tab', id)
            inject(id)
          }
        } else {
          console.log('[Detection] No match found for tab', id, 'URL:', win.url)
        }
      } catch (err) {
        console.debug('[Detection] Error:', err.message)
        return
      }
    }
  }

  var header = (value) => {
    return state.header && value && /text\/(?:x-)?markdown/i.test(value)
  }

  var match = (url) => {
    var location = new URL(url)
    console.log('[Detection] Matching URL:', url, 'Protocol:', location.protocol, 'Pathname:', location.pathname)

    // Check if URL ends with .ipynb
    if (location.pathname.endsWith('.ipynb')) {
      console.log('[Detection] URL ends with .ipynb, checking origins')
      var origin =
        state.origins[location.origin] ||
        state.origins[location.protocol + '//' + location.hostname] ||
        state.origins['*://' + location.host] ||
        state.origins['*://' + location.hostname] ||
        state.origins['*://*']

      // If no specific origin found but it's a .ipynb file, use file:// origin
      if (!origin && location.protocol === 'file:') {
        console.log('[Detection] No specific origin, using file:// origin')
        origin = state.origins['file://']
        console.log('[Detection] File origin:', origin)
      }

      if (origin) {
        console.log('[Detection] Found origin match:', origin)
        return origin
      } else {
        console.log('[Detection] No origin found for', location.origin)
        console.log('[Detection] Available origins:', Object.keys(state.origins))
      }
    }

    // Legacy match pattern support
    console.log('[Detection] Checking legacy match patterns')
    var origin =
      state.origins[location.origin] ||
      state.origins[location.protocol + '//' + location.hostname] ||
      state.origins['*://' + location.host] ||
      state.origins['*://' + location.hostname] ||
      state.origins['*://*']

    if (origin && origin.match && new RegExp(origin.match).test(location.href)) {
      console.log('[Detection] Legacy match found:', origin)
      return origin
    }
    
    console.log('[Detection] No match found')
    return null
  }

  return {tab, header, match}
}
