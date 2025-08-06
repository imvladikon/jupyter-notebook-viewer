// Clean injection implementation based on markdown-viewer patterns
// Conditional script injection and simplified logic

md.inject = ({storage: {state}}) => (id) => {
  
  console.log('[Inject] Injecting into tab', id, 'with state:', {
    theme: state.theme,
    content: state.content
  })

  chrome.scripting.executeScript({
    target: {tabId: id},
    args: [{
      theme: state.theme,
      raw: false, // Force false for notebook rendering
      themes: state.themes,
      content: state.content,
      compiler: state.compiler,
    }],
    func: (_args) => {
      document.querySelector('pre').style.visibility = 'hidden'
      window.args = _args
    },
    injectImmediately: true
  })

  var cssFiles = [
    '/content/index.css',
    '/vendor/prism.min.css',
    '/vendor/katex.min.css',
    state.theme && `/themes/${state.theme}.css`,
  ].filter(Boolean)
  
  console.log('[Inject] Inserting CSS files:', cssFiles)
  
  chrome.scripting.insertCSS({
    target: {tabId: id},
    files: cssFiles
  })

  chrome.scripting.executeScript({
    target: {tabId: id},
    files: [
      '/vendor/mithril.min.js',
      '/vendor/marked.min.js',
      '/vendor/ansi_up.min.js',
      '/vendor/katex.min.js',
      '/vendor/katex-auto-render.min.js',
      '/vendor/notebook.min.js',
      state.content.syntax && '/vendor/prism.min.js',
      state.content.emoji && '/content/emoji.js',
      state.content.mathjax && ['/vendor/mathjax/tex-mml-chtml.js', '/content/mathjax.js'],
      '/content/index.js',
      state.content.autoreload && '/content/autoreload.js',
    ].filter(Boolean).flat(),
    injectImmediately: true
  })

}