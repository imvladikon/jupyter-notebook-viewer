// Clean detection implementation based on markdown-viewer patterns
// Simplified detection logic with better error handling

md.detect = ({storage: {state}, inject}) => {
  
  var onwakeup = true
  
  var tab = (id, info, tab) => {
    if (info.status === 'loading') {
      
      // Execute detection script
      chrome.scripting.executeScript({
        target: {tabId: id},
        func: () => 
          JSON.stringify({
            url: window.location.href,
            header: document.contentType,
            loaded: !!window.state || !!window.args,
          })
      }, (res) => {
        if (chrome.runtime.lastError) {
          // Origin not allowed or other error
          return
        }
        
        try {
          var win = JSON.parse(res[0].result)
          if (!win) return
        } catch (err) {
          return
        }
        
        if (win.loaded) {
          // Already processed
          return  
        }
        
        if (detect(win.header, win.url)) {
          if (onwakeup && chrome.webRequest) {
            onwakeup = false
            chrome.tabs.reload(id)
          } else {
            inject(id)
          }
        }
      })
    }
  }
  
  var detect = (content, url) => {
    var location = new URL(url)
    
    // Check if URL ends with .ipynb
    if (!location.pathname.endsWith('.ipynb')) {
      return false
    }
    
    // Find matching origin
    var origin = 
      state.origins[location.origin] ||
      state.origins[location.protocol + '//' + location.hostname] ||
      state.origins['*://' + location.hostname] ||
      state.origins['*://' + location.host] ||
      state.origins['*://*']
    
    // Default file:// support for .ipynb files
    if (!origin && location.protocol === 'file:') {
      origin = state.origins['file://'] || {match: state.match}
    }
    
    return origin && new RegExp(origin.match || state.match).test(url)
  }
  
  return {tab}
}