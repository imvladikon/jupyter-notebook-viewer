console.log('[Content Script] Starting Jupyter Notebook Viewer content script');

var $ = document.querySelector.bind(document)

// Check if window.args exists (injected by extension)
console.log('[Content Script] Checking for window.args:', !!window.args, 'window.notebookConfig:', !!window.notebookConfig);
if (!window.args && !window.notebookConfig) {
  console.error('Jupyter Notebook Viewer: Extension not properly initialized')
  
  // Try to get defaults or exit gracefully
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('[Content Script] Attempting to get configuration from extension...');
    chrome.runtime.sendMessage({message: 'get-config'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Content Script] Failed to get config:', chrome.runtime.lastError.message);
        showConfigError('Extension communication failed: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.config) {
        console.log('[Content Script] Configuration received, initializing...');
        window.args = response.config
        initializeViewer()
      } else {
        console.error('[Content Script] No configuration received from extension');
        showConfigError('Extension did not provide configuration');
      }
    })
  } else {
    console.error('[Content Script] Chrome runtime not available');
    showConfigError('Chrome extension API not available');
  }
  
  // Set a timeout to show error if config never arrives
  setTimeout(() => {
    if (!window.args && !window.notebookConfig) {
      console.warn('Jupyter Notebook Viewer: Configuration timeout, fallback will handle this');
    }
  }, 2000);
}

// Use args or notebookConfig as fallback
var config = window.args || window.notebookConfig || {}
console.log('[Content Script] Configuration object:', config);
console.log('[Content Script] Config details - theme:', config.theme, 'raw:', config.raw, 'compiler:', config.compiler);

var state = {
  theme: (config.theme && config.theme !== '*') ? config.theme : 'github', // Fix theme if it's invalid
  raw: false, // Force false for notebook rendering (config.raw should not override this for .ipynb files)
  themes: config.themes || {wide: true},
  content: config.content || {
    emoji: false,
    scroll: true,
    toc: true,
    mathjax: true,
    autoreload: false,
    mermaid: false,
  },
  compiler: config.compiler || 'marked',
  html: '',
  markdown: '',
  nbjson: '',
  toc: '',
  interval: null,
  ms: 1000,
}

console.log('[Content Script] State after forcing raw=false:', {
  theme: state.theme,
  raw: state.raw,
  compiler: state.compiler
});

console.log('[Content Script] Initial state:', {
  theme: state.theme,
  raw: state.raw,
  compiler: state.compiler,
  contentKeys: Object.keys(state.content)
});


let mathjaxSettings = `
  // TeX-AMS_HTML
  MathJax.Hub.Config({
    jax: [
      'input/TeX',
      'output/HTML-CSS',
      'output/PreviewHTML',
    ],
    extensions: [
      'tex2jax.js',
      'AssistiveMML.js',
      'a11y/accessibility-menu.js',
    ],
    TeX: {
      extensions: [
        'AMSmath.js',
        'AMSsymbols.js',
        'noErrors.js',
        'noUndefined.js',
      ]
    },
    tex2jax: {
      inlineMath: [
        ['$', '$'],
        ['\\\\(', '\\\\)'],
      ],
      displayMath: [
        ['$$', '$$'],
        ['\\\\[', '\\\\]'],
      ],
      processEscapes: true
    },
    showMathMenu: false,
    showProcessingMessages: false,
    messageStyle: 'none',
    skipStartupTypeset: true, // disable initial rendering
    positionToHash: false
  })
  // set specific container to render, can be delayed too
  MathJax.Hub.Queue(
    ['Typeset', MathJax.Hub, '_html']
  )
`;


chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.message === 'reload') {
    location.reload(true)
  }
  else if (req.message === 'theme') {
    state.theme = req.theme
    m.redraw()
  }
  else if (req.message === 'themes') {
    state.themes = req.themes
    m.redraw()
  }
  else if (req.message === 'raw') {
    state.raw = req.raw
    m.redraw()
  }
  else if (req.message === 'autoreload') {
    clearInterval(state.interval)
  }
})

var oncreate = {
  markdown: () => {
    scroll.body()
  },
  html: () => {
    scroll.body()

    if (state.content.toc && !state.toc) {
      state.toc = toc()
      m.redraw()
    }

    setTimeout(() => Prism.highlightAll(), 20)

    anchors()
  },
  toc: () => {
    scroll.toc()
  }
}

function showConfigError(message) {
  console.error('[Content Script] Configuration error:', message);
  showErrorMessage('Configuration Error', message);
}

function showMountError(message) {
  console.error('[Content Script] Mount error:', message);
  showErrorMessage('Processing Error', message);
}

function showErrorMessage(title, message) {
  // Create a simple error message
  const errorDiv = document.createElement('div');
  errorDiv.innerHTML = `
    <div style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px; 
      margin: 50px auto; 
      padding: 20px; 
      background: #fff3cd; 
      border: 1px solid #ffeaa7; 
      border-radius: 6px;
      color: #856404;
    ">
      <h3 style="margin-top: 0; color: #856404;">⚠️ Jupyter Notebook Viewer ${title}</h3>
      <p><strong>Error:</strong> ${message}</p>
      <p>The extension will provide more detailed troubleshooting guidance in a few seconds.</p>
      <details style="margin-top: 15px;">
        <summary style="cursor: pointer; color: #007bff;">Quick troubleshooting steps</summary>
        <ul style="margin-top: 10px; line-height: 1.5;">
          <li>Go to <code>chrome://extensions/</code> and verify the extension is enabled</li>
          <li>Click "Details" and ensure "Allow access to file URLs" is enabled</li>
          <li>Try reloading the extension and refreshing this page</li>
          <li>Check the browser console (F12) for detailed error messages</li>
        </ul>
      </details>
    </div>
  `;
  document.body.appendChild(errorDiv);
}

function mount () {
  console.log('[Content Script] Mount function called');
  const pre = $('pre');
  if (!pre) {
    console.error('[Content Script] No pre element found');
    showMountError('No content found to process. This might not be a valid notebook file.');
    return;
  }
  
  console.log('[Content Script] Pre element found, hiding it');
  pre.style.display = 'none'
  
  let nbjson;
  try {
    nbjson = JSON.parse(pre.innerText);
    console.log('[Content Script] JSON parsed successfully, cells:', nbjson.cells ? nbjson.cells.length : 0);
  } catch (e) {
    console.error('[Content Script] JSON parse error:', e.message);
    showMountError('Invalid notebook format: ' + e.message);
    pre.style.display = 'block'; // Show raw content if JSON is invalid
    return;
  }
  
  // Validate notebook structure
  if (!nbjson.cells && !nbjson.worksheets) {
    console.error('[Content Script] Invalid notebook: no cells or worksheets');
    showMountError('Invalid notebook structure: missing cells or worksheets');
    pre.style.display = 'block';
    return;
  }

  console.log('[Content Script] Attempting to mount Mithril component');
  console.log('[Content Script] Mithril available:', typeof m !== 'undefined');
  console.log('[Content Script] notebook library available:', typeof nb !== 'undefined');
  
  m.mount($('body'), {
    oninit: () => {
      console.log('[Content Script] Mithril oninit called, sending message to background');
      chrome.runtime.sendMessage({
        message: 'nbjson',
        compiler: state.compiler,
        nbjson: nbjson
      }, (res) => {
        console.log('[Content Script] Received response from background:', res);
        if (chrome.runtime.lastError) {
          console.error('[Content Script] Runtime error:', chrome.runtime.lastError.message);
          showMountError('Failed to communicate with extension: ' + chrome.runtime.lastError.message);
          return;
        }
        
        if (!res || !res.nbjson) {
          console.error('[Content Script] No notebook data in response');
          showMountError('Extension did not return notebook data');
          return;
        }
        
        try {
          console.log('[Content Script] Parsing notebook with nb library');
          if (typeof nb === 'undefined') {
            throw new Error('Notebook parsing library (nb) not available');
          }
          
          state.html = nb.parse(res.nbjson).render().innerHTML;
          console.log('[Content Script] Notebook parsed successfully, HTML length:', state.html.length);
          m.redraw();
        } catch (e) {
          console.error('[Content Script] Notebook parsing error:', e.message);
          showMountError('Failed to parse notebook: ' + e.message);
        }
      })
    },
    view: () => {
      console.log('[Content Script] Mithril view function called');
      console.log('[Content Script] State.raw:', state.raw, 'State.html length:', state.html ? state.html.length : 0);
      
      var dom = []

      if (state.raw) {
        console.log('[Content Script] Rendering raw markdown');
        dom.push(m('pre#_markdown', {oncreate: oncreate.markdown}, state.markdown))
        $('body').classList.remove('_toc-left', '_toc-right')
      }
      else {
        console.log('[Content Script] Rendering HTML notebook');
        if (state.theme) {
          dom.push(m('link#_theme', {
            rel: 'stylesheet', type: 'text/css',
            href: chrome.runtime.getURL(`/themes/${state.theme}.css`),
          }))
        }
        if (state.html) {
          dom.push(m('#_html', {oncreate: oncreate.html,
            class: (/github(-dark)?/.test(state.theme) ? 'markdown-body' : 'markdown-theme') +
            (state.themes.wide ? ' wide-theme' : '')
          },
            m.trust(state.html)
          ))
          if (state.content.toc && state.toc) {
            dom.push(m('#_toc', {oncreate: oncreate.toc},
              m.trust(state.toc)
            ))
            $('body').classList.add('_toc-left')
          }
          if (state.content.mathjax) {
            dom.push(m('script', {type: 'text/x-mathjax-config'}, mathjaxSettings))
            dom.push(m('script', {
              src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js'
            }))
          }
          if (state.content.mermaid) {
            dom.push(m('script', {
              src: 'https://cdnjs.cloudflare.com/ajax/libs/mermaid/8.8.4/mermaid.min.js'
            }))
            dom.push(m('script', {type: 'text/javascript'}, `
              ;(() => {
                var timeout = setInterval(() => {
                  if (!!(window.mermaid && mermaid.init)) {
                    clearInterval(timeout)
                    mermaid.init({}, 'code.language-mmd, code.language-mermaid')
                  }
                }, 50)
              })()
            `))
          }
        }
      }

      return (dom.length ? dom : m('div'))
    }
  })
}

var scroll = (() => {
  function race (done) {
    Promise.race([
      Promise.all([
        new Promise((resolve) => {
          var diagrams = Array.from(document.querySelectorAll('code.language-mmd, code.language-mermaid'))
          if (!state.content.mermaid || !diagrams.length) {
            resolve()
          }
          else {
            var timeout = setInterval(() => {
              var svg = Array.from(document.querySelectorAll('code.language-mmd svg, code.language-mermaid svg'))
              if (diagrams.length === svg.length) {
                clearInterval(timeout)
                resolve()
              }
            }, 50)
          }
        }),
        new Promise((resolve) => {
          var images = Array.from(document.querySelectorAll('img'))
          if (!images.length) {
            resolve()
          }
          else {
            var loaded = 0
            images.forEach((img) => {
              img.addEventListener('load', () => {
                if (++loaded === images.length) {
                  resolve()
                }
              }, {once: true})
            })
          }
        }),
      ]),
      new Promise((resolve) => setTimeout(resolve, 500))
    ])
    .then(done)
  }
  function debounce (container, done) {
    var listener = /html/i.test(container.nodeName) ? window : container
    var timeout = null
    listener.addEventListener('scroll', () => {
      clearTimeout(timeout)
      timeout = setTimeout(done, 100)
    })
  }
  function listen (container, prefix) {
    var key = prefix + location.origin + location.pathname
    try {
      container.scrollTop = parseInt(localStorage.getItem(key))
      debounce(container, () => {
        localStorage.setItem(key, container.scrollTop)
      })
    }
    catch (err) {
      chrome.storage.local.get(key, (res) => {
        container.scrollTop = parseInt(res[key])
      })
      debounce(container, () => {
        chrome.storage.local.set({[key]: container.scrollTop})
      })
    }
  }
  return {
    body: () => {
      var loaded
      race(() => {
        if (!loaded) {
          loaded = true
          if (state.content.scroll) {
            listen($('html'), 'md-')
          }
          else if (location.hash && $(location.hash)) {
            $('html').scrollTop = $(location.hash).offsetTop
          }
        }
      })
    },
    toc: () => {
      listen($('#_toc'), 'md-toc-')
    }
  }
})()

function anchors () {
  Array.from($('#_html').childNodes)
  .filter((node) => /h[1-6]/i.test(node.tagName))
  .forEach((node) => {
    var a = document.createElement('a')
    a.className = 'anchor'
    a.name = node.id
    a.href = '#' + node.id
    a.innerHTML = '<span class="octicon octicon-link"></span>'
    node.prepend(a)
  })
}

var toc = (
  link = (header) => '<a href="#' + header.id + '">' + header.title + '</a>') => {
  const headers = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .filter((node) => /h[1-6]/i.test(node.tagName))
    .map((node) => ({
      id: node.getAttribute('id'),
      level: parseInt(node.tagName.replace('H', '')),
      title: node.innerText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }))
  
  if (!headers.length) return ''
  
  let html = '<div class="_ul">'
  let currentLevel = 0
  
  headers.forEach((header) => {
    if (header.level > currentLevel) {
      // Open new nested levels
      while (currentLevel < header.level) {
        if (currentLevel > 0) html += '<div class="_ul">'
        currentLevel++
      }
    } else if (header.level < currentLevel) {
      // Close nested levels
      while (currentLevel > header.level) {
        html += '</div>'
        currentLevel--
      }
    }
    html += link(header)
  })
  
  // Close remaining open divs
  while (currentLevel > 0) {
    html += '</div>'
    currentLevel--
  }
  
  return html
}

function initializeViewer() {
  if (document.readyState === 'complete') {
    mount()
  }
  else {
    var timeout = setInterval(() => {
      if (document.readyState === 'complete') {
        clearInterval(timeout)
        mount()
      }
    }, 0)
  }
}

// Start initialization if configuration is available
if (window.args || window.notebookConfig) {
  initializeViewer()
}

if (state.content.autoreload) {
  ;(() => {
    var initial = ''

    var response = (body) => {
      if (!initial) {
        initial = body
      }
      else if (initial !== body) {
        location.reload(true)
      }
    }

    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        response(xhr.responseText)
      }
    }

    var get = () => {
      if (location.protocol === 'file:') {
        chrome.runtime.sendMessage({
          message: 'autoreload',
          location: location.href
        }, (res) => {
          if (res.err) {
            console.error(res.err)
            clearInterval(state.interval)
          }
          else {
            response(res.body)
          }
        })
      }
      else {
        xhr.open('GET', location.href + '?preventCache=' + Date.now(), true)
        try {
          xhr.send()
        }
        catch (err) {
          console.error(err)
          clearInterval(state.interval)
        }
      }
    }

    get()
    state.interval = setInterval(get, state.ms)
  })()
}
