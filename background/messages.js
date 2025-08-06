md.messages = ({storage, compilers, mathjax, xhr, webrequest}) => {
  // Extract storage properties
  const {defaults, state, set} = storage || {}

  return (req, sender, sendResponse) => {

    // content
    if (req.message === 'ping') {
      sendResponse({message: 'pong', status: 'ok', extension: 'Jupyter Notebook Viewer'})
    } else if (req.message === 'get-config') {
      sendResponse({
        config: {
          theme: state.theme,
          raw: state.raw,
          themes: state.themes,
          content: state.content,
          compiler: state.compiler
        }
      })
    } else if (req.message === 'markdown') {
      var markdown = req.markdown

      if (state.content.mathjax) {
        var jax = mathjax()
        markdown = jax.tokenize(markdown)
      }

      var html = compilers[state.compiler].compile(markdown)

      if (state.content.mathjax) {
        html = jax.detokenize(html)
      }

      sendResponse({message: 'html', html})
    } else if (req.message === 'nbjson') {
      console.log('[Messages] Processing nbjson request');
      console.log('[Messages] Current compiler:', state.compiler);
      console.log('[Messages] Available compilers:', compilers ? Object.keys(compilers) : 'none');
      console.log('[Messages] Notebook cells:', req.nbjson && req.nbjson.cells ? req.nbjson.cells.length : 0);

      var nbjson = req.nbjson
      sendResponse({message: 'html', nbjson: nbjson})

    } else if (req.message === 'autoreload') {
      xhr.get(req.location, (err, body) => {
        sendResponse({err, body})
      })
    }

    // popup
    else if (req.message === 'popup') {
      sendResponse(Object.assign({}, state, {
        options: state[state.compiler],
        description: compilers[state.compiler].description,
        compilers: Object.keys(compilers),
        themes: state.themes,
      }))
    } else if (req.message === 'popup.theme') {
      set({theme: req.theme})
      notifyContent({message: 'theme', theme: req.theme})
      sendResponse()
    } else if (req.message === 'popup.raw') {
      set({raw: req.raw})
      notifyContent({message: 'raw', raw: req.raw})
      sendResponse()
    } else if (req.message === 'popup.themes') {
      set({themes: req.themes})
      notifyContent({message: 'themes', themes: req.themes})
      sendResponse()
    } else if (req.message === 'popup.defaults') {
      var options = Object.assign({}, defaults)
      options.origins = state.origins
      set(options)
      notifyContent({message: 'reload'})
      sendResponse()
    } else if (req.message === 'popup.compiler.name') {
      set({compiler: req.compiler})
      notifyContent({message: 'reload'})
      sendResponse()
    } else if (req.message === 'popup.compiler.options') {
      set({[req.compiler]: req.options})
      notifyContent({message: 'reload'})
      sendResponse()
    } else if (req.message === 'popup.content') {
      set({content: req.content})
      notifyContent({message: 'reload'})
      webrequest()
      sendResponse()
    } else if (req.message === 'popup.advanced') {
      // ff: opens up about:addons with openOptionsPage
      if (/Firefox/.test(navigator.userAgent)) {
        chrome.management.getSelf((extension) => {
          chrome.tabs.create({url: extension.optionsUrl})
        })
      } else {
        chrome.runtime.openOptionsPage()
      }
      sendResponse()
    }

    // options
    else if (req.message === 'options.origins') {
      sendResponse({
        origins: state.origins,
        header: state.header,
        match: state.match,
      })
    } else if (req.message === 'options.header') {
      set({header: req.header})
      sendResponse()
    }

    // origins
    else if (req.message === 'origin.add') {
      state.origins[req.origin] = {
        match: defaults.match,
        csp: false,
        encoding: '',
      }
      set({origins: state.origins})
      sendResponse()
    } else if (req.message === 'origin.remove') {
      delete state.origins[req.origin]
      set({origins: state.origins})
      webrequest()
      sendResponse()
    } else if (req.message === 'origin.update') {
      state.origins[req.origin] = req.options
      set({origins: state.origins})
      webrequest()
      sendResponse()
    }

    return true
  }

  function notifyContent(req, res) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, req, res)
    })
  }
}
