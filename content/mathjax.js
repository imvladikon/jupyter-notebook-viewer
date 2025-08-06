// MathJax configuration for Jupyter Notebook Viewer
// Based on markdown-viewer's approach but adapted for notebooks

var MathJax = {
  tex: {
    inlineMath: [
      ['$', '$'],
      ['\\(', '\\)'],
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]'],
    ],
    processEscapes: true,
    tags: 'ams',
    packages: {'[+]': ['noerrors', 'noundefined', 'ams', 'newcommand']}
  },
  chtml: {
    scale: 1.0,
    mtextInheritFont: true
  },
  options: {
    ignoreHtmlClass: 'tex2jax-ignore|notebook-viewer-ignore',
    processHtmlClass: 'process-math'
  },
  showMathMenu: false,
  showProcessingMessages: false,
  messageStyle: 'none',
  skipStartupTypeset: true, // disable initial rendering
  positionToHash: false,
  startup: {
    typeset: false,
    ready: () => {
      console.log('[MathJax] MathJax is ready');
      MathJax.startup.defaultReady();
    }
  }
}

var mj = {
  loaded: false,
  render: (container) => {
    mj.loaded = false
    const element = container || document.getElementById('_html') || document.body
    console.log('[MathJax] Rendering math in:', element.tagName, 'with', element.querySelectorAll('[class*="language-latex"], [class*="math"]').length, 'potential math elements')
    
    MathJax.typesetPromise([element]).then(() => {
      console.log('[MathJax] Math rendering completed')
      setTimeout(() => mj.loaded = true, 20)
    }).catch(err => {
      console.warn('[MathJax] Math rendering failed:', err)
      mj.loaded = true
    })
  },
  clear: (container) => {
    const element = container || document.getElementById('_html') || document.body
    MathJax.typesetClear([element])
  }
}