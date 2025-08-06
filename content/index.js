// Clean content script based on markdown-viewer patterns
// Simplified Mithril-based rendering

console.log('[Content] Starting Jupyter Notebook Viewer')
console.log('[Content] args available:', !!window.args)
console.log('[Content] Mithril available:', typeof m !== 'undefined')

var $ = document.querySelector.bind(document)

// Check if args is available
if (!window.args) {
  console.error('[Content] window.args not available, extension not properly injected')
  document.body.innerHTML = '<div style="padding:20px;color:red;">Extension initialization failed - window.args not available</div>'
  throw new Error('Extension not properly initialized')
}

console.log('[Content] Args received:', window.args)

var state = {
  theme: window.args.theme,
  raw: window.args.raw,
  themes: window.args.themes,
  content: window.args.content,
  compiler: window.args.compiler,
  html: '',
  notebook: null,
  reload: {
    interval: null,
    ms: 1000,
    nb: false,
  },
  _themes: {
    'github': 'light',
    'github-dark': 'dark',
    'jupyter': 'light',
    'custom': 'auto',
  }
}

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
    state.reload.nb = true
    m.redraw()
  }
  else if (req.message === 'autoreload') {
    clearInterval(state.reload.interval)
  }
})

var oncreate = {
  html: () => {
    update()
  }
}

var onupdate = {
  html: () => {
    if (state.reload.nb) {
      state.reload.nb = false
      update(true)
    }
  },
  theme: () => {
    if (state.content.mathjax) {
      setTimeout(() => {
        if (window.MathJax && MathJax.Hub) {
          MathJax.Hub.Queue(['Typeset', MathJax.Hub, '_html'])
        }
      }, 0)
    }
  }
}

var update = (update) => {
  console.log('[Content] Update function called')
  var markdown = $('#_markdown')
  if (!markdown) {
    console.warn('[Content] #_markdown element not found')
    return
  }
  
  if (state.content.syntax && typeof Prism !== 'undefined') {
    console.log('[Content] Running Prism syntax highlighting')
    Prism.highlightAllUnder(markdown)
  }
  
  // Try both MathJax and KaTeX
  if (state.content.mathjax) {
    if (window.MathJax && MathJax.Hub) {
      console.log('[Content] Running MathJax rendering')
      MathJax.Hub.Queue(['Typeset', MathJax.Hub, '_markdown'])
    } else if (typeof renderMathInElement !== 'undefined') {
      console.log('[Content] Running KaTeX rendering')
      renderMathInElement(markdown, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false},
          {left: '$', right: '$', display: false},
          {left: '\\begin{equation}', right: '\\end{equation}', display: true},
          {left: '\\begin{align}', right: '\\end{align}', display: true},
          {left: '\\begin{alignat}', right: '\\end{alignat}', display: true},
          {left: '\\begin{gather}', right: '\\end{gather}', display: true},
          {left: '\\begin{multline}', right: '\\end{multline}', display: true}
        ]
      })
    } else {
      console.warn('[Content] No math rendering library available')
    }
  }
}

var render = (nbtext) => {
  console.log('[Content] Render function called with notebook text length:', nbtext.length)
  
  try {
    // Parse notebook JSON
    var nbjson = JSON.parse(nbtext)
    console.log('[Content] JSON parsed successfully, cells:', nbjson.cells ? nbjson.cells.length : 0)
    
    // Check if notebook library is available
    if (typeof nb === 'undefined') {
      console.error('[Content] Notebook parsing library (nb) not available')
      state.html = '<div style="padding:20px;color:red;">Notebook parsing library not loaded</div>'
      m.redraw()
      return
    }
    
    // Parse and render notebook
    console.log('[Content] Parsing notebook with nb library')
    state.html = nb.parse(nbjson).render().innerHTML
    console.log('[Content] Notebook parsed successfully, HTML length:', state.html.length)
    
    // Store raw notebook for raw mode
    state.notebook = nbtext
    
    m.redraw()
    
  } catch (e) {
    console.error('[Content] Failed to parse notebook:', e.message)
    state.html = '<div style="padding:20px;color:red;">Failed to parse notebook: ' + e.message + '</div>'
    state.notebook = nbtext
    m.redraw()
  }
}

function mount () {
  console.log('[Content] Mount function called')
  var pre = $('pre')
  if (!pre) {
    console.error('[Content] No <pre> element found')
    return
  }
  
  console.log('[Content] Pre element found, hiding it')
  pre.style.display = 'none'
  var nbtext = pre.innerText
  console.log('[Content] Notebook text length:', nbtext.length)
  
  if (typeof m === 'undefined') {
    console.error('[Content] Mithril not available')
    document.body.innerHTML = '<div style="padding:20px;color:red;">Mithril library not loaded</div>'
    return
  }
  
  console.log('[Content] Mounting Mithril component')
  m.mount($('body'), {
    oninit: () => {
      console.log('[Content] Mithril oninit called, rendering notebook')
      render(nbtext)
    },
    view: () => {
      console.log('[Content] View function called, state.html length:', state.html ? state.html.length : 0)
      
      if (state.html) {
        // Apply CSS classes to body
        var color = state._themes[state.theme] === 'dark' ||
          (state._themes[state.theme] === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
          ? 'dark' : 'light'

        $('body').classList.remove(...Array.from($('body').classList).filter((name) => /^_theme|_color/.test(name)))
        $('body').classList.add(`_theme-${state.theme}`, `_color-${color}`)

        var theme = 'markdown-body notebook-viewer'
        
        if (state.raw) {
          if (state.content.syntax) {
            return m('#_markdown', {oncreate: oncreate.html, onupdate: onupdate.html, class: theme},
              m.trust(`<pre class="language-json"><code class="language-json">${state.notebook}</code></pre>`)
            )
          } else {
            return m('pre#_markdown', {oncreate: oncreate.html, onupdate: onupdate.html}, state.notebook)
          }
        } else {
          return m('#_markdown', {oncreate: oncreate.html, onupdate: onupdate.html, class: theme},
            m.trust(state.html)
          )
        }
      }

      return m('div', 'Loading...')
    }
  })
}

mount()