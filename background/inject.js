md.inject = ({storage: {state}}) => (id) => {

  // Inject initial variables using args pattern
  chrome.scripting.executeScript({
    target: {tabId: id},
    args: [{
      theme: state.theme,
      raw: state.raw,
      themes: state.themes,
      content: state.content,
      compiler: state.compiler
    }],
    func: (_args) => {
      // Check if there's a pre element for markdown or if it's a notebook
      const pre = document.querySelector('pre')
      if (pre) {
        pre.style.visibility = 'hidden'
      }
      window.args = _args
    },
    injectImmediately: true
  })

  // Inject CSS files
  chrome.scripting.insertCSS({
    target: {tabId: id},
    files: [
      '/content/index.css',
      '/vendor/prism.min.css',
      '/vendor/katex.min.css'
    ]
  })

  // Inject JavaScript files - filter out conditional files
  chrome.scripting.executeScript({
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
      '/content/index.js'
    ].filter(Boolean),
    injectImmediately: true
  })
}
