md.detect = ({storage: {state}, inject}) => {

  var onwakeup = true

  var code = `
    JSON.stringify({
      url: window.location.href,
      header: document.contentType,
      loaded: !!window.state,
    })
  `

  var tab = async (id, info, tab) => {
    if (info.status === 'loading') {
      try {
        // Try to execute detection script
        const results = await chrome.scripting.executeScript({
          target: {tabId: id},
          func: () => {
            return JSON.stringify({
              url: window.location.href,
              header: document.contentType,
              loaded: !!window.state,
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
          // JSON parse error
          return
        }

        if (win.loaded) {
          // anchor
          return
        }

        if (header(win.header) || match(win.url)) {
          if (onwakeup && chrome.webRequest) {
            onwakeup = false
            chrome.tabs.reload(id)
          } else {
            inject(id)
          }
        }
      } catch (err) {
        // origin not allowed or other error
        return
      }
    }
  }

  var header = (value) => {
    return state.header && value && /text\/(?:x-)?markdown/i.test(value)
  }

  var match = (url) => {
    var location = new URL(url)

    // Check if URL ends with .ipynb
    if (location.pathname.endsWith('.ipynb')) {
      var origin =
        state.origins[location.origin] ||
        state.origins[location.protocol + '//' + location.hostname] ||
        state.origins['*://' + location.host] ||
        state.origins['*://' + location.hostname] ||
        state.origins['*://*']

      // If no specific origin found but it's a .ipynb file, use file:// origin
      if (!origin && location.protocol === 'file:') {
        origin = state.origins['file://']
      }

      if (origin) {
        return origin
      }
    }

    // Legacy match pattern support
    var origin =
      state.origins[location.origin] ||
      state.origins[location.protocol + '//' + location.hostname] ||
      state.origins['*://' + location.host] ||
      state.origins['*://' + location.hostname] ||
      state.origins['*://*']

    if (origin && origin.match && new RegExp(origin.match).test(location.href)) {
      return origin
    }
  }

  return {tab, header, match}
}
