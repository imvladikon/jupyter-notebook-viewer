md.inject = ({storage: {state}}) => {
  // Track injection state to prevent double injection
  const injectionState = new Map()
  
  // Clean up injection state for a tab
  const cleanup = (tabId) => {
    injectionState.delete(tabId)
  }
  
  // Listen for tab removal to clean up state
  if (chrome.tabs && chrome.tabs.onRemoved) {
    chrome.tabs.onRemoved.addListener((tabId) => {
      cleanup(tabId)
    })
  }
  
  return async (id) => {
    // Check if already injecting or injected
    const currentState = injectionState.get(id)
    if (currentState === 'injecting' || currentState === 'injected') {
      console.log(`[Inject] Tab ${id} already ${currentState}, skipping...`)
      return false
    }
    
    injectionState.set(id, 'injecting')
    
    try {
      // Inject initial variables using args pattern
      const config = {
        theme: state.theme,
        raw: state.raw,
        themes: state.themes,
        content: state.content,
        compiler: state.compiler
      };
      console.log('[Inject] Injecting configuration:', config);
      
      await chrome.scripting.executeScript({
        target: {tabId: id},
        args: [config],
        func: (_args) => {
          // Prevent multiple injections
          if (window.notebookViewerLoaded || window.notebookViewerLoading) {
            throw new Error('Already loaded')
          }
          
          // Mark as loading
          window.notebookViewerLoading = true
          
          // Store configuration
          window.args = _args
          window.notebookConfig = _args
          
          // Hide original content while loading
          const pre = document.querySelector('pre')
          if (pre) {
            pre.style.visibility = 'hidden'
            pre.style.position = 'absolute'
            pre.style.left = '-9999px'
          }
          
          // Add loading indicator
          const loader = document.createElement('div')
          loader.className = 'notebook-viewer-loading'
          loader.textContent = 'Loading notebook...'
          loader.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            color: #666;
            z-index: 9999;
          `
          document.body.appendChild(loader)
        },
        injectImmediately: true
      })

      // Inject CSS files
      await chrome.scripting.insertCSS({
        target: {tabId: id},
        files: [
          '/content/index.css',
          '/vendor/prism.min.css',
          '/vendor/katex.min.css'
        ]
      })
      
      // Inject theme if specified
      if (state.theme) {
        const themePath = typeof state.theme === 'string' 
          ? `/themes/${state.theme}.css`
          : state.theme.url
          
        if (themePath) {
          try {
            await chrome.scripting.insertCSS({
              target: {tabId: id},
              files: [themePath.replace(chrome.runtime.getURL(''), '')]
            })
          } catch (error) {
            console.warn(`[Inject] Failed to load theme:`, error)
          }
        }
      }

      // Inject JavaScript files - filter out conditional files
      await chrome.scripting.executeScript({
        target: {tabId: id},
        files: [
          '/vendor/mithril.min.js',
          '/vendor/es5-shim.min.js',
          '/vendor/marked.min.js',
          '/vendor/ansi_up.min.js',
          '/vendor/prism.min.js',
          '/vendor/katex.min.js',
          '/vendor/katex-auto-render.min.js',
          '/vendor/notebook.min.js',
          state.content.emoji && '/content/emoji.js',
          '/content/index.js',
          '/content/fallback.js'
        ].filter(Boolean),
        injectImmediately: true
      })
      
      // Mark as fully loaded
      await chrome.scripting.executeScript({
        target: {tabId: id},
        func: () => {
          window.notebookViewerLoaded = true
          window.notebookViewerLoading = false
          
          // Remove loading indicator
          const loader = document.querySelector('.notebook-viewer-loading')
          if (loader) {
            loader.remove()
          }
        },
        injectImmediately: true
      })
      
      injectionState.set(id, 'injected')
      console.log(`[Inject] Successfully injected into tab ${id}`)
      return true
      
    } catch (error) {
      console.error(`[Inject] Failed to inject into tab ${id}:`, error)
      injectionState.set(id, 'failed')
      
      // Try to show error to user
      try {
        await chrome.scripting.executeScript({
          target: {tabId: id},
          func: () => {
            const loader = document.querySelector('.notebook-viewer-loading')
            if (loader) {
              loader.textContent = 'Failed to load notebook viewer'
              loader.style.color = '#d32f2f'
            }
          },
          injectImmediately: true
        })
      } catch (e) {
        // Ignore error display failure
      }
      
      // Clear state for retry after delay
      setTimeout(() => {
        injectionState.delete(id)
      }, 1000)
      
      throw error
    }
  }
}
