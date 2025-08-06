// Clean Service Worker based on markdown-viewer patterns
// Simplified architecture with clear dependency injection

importScripts('/vendor/marked.min.js')
importScripts('/vendor/remark.min.js')

importScripts('/background/compilers/marked.js')  
importScripts('/background/compilers/remark.js')

importScripts('/background/migrations.js')
importScripts('/background/storage.js')
importScripts('/background/webrequest.js')
importScripts('/background/detect.js')
importScripts('/background/inject.js')
importScripts('/background/messages.js')
importScripts('/background/mathjax.js')
importScripts('/background/xhr.js')

;(() => {
  console.log('[Service Worker] Initializing Jupyter Notebook Viewer...')
  
  // Initialize compilers first
  var compilers = Object.keys(md.compilers)
    .reduce((all, compiler) => (
      all[compiler] = md.compilers[compiler],
      all
    ), {})
  
  // Clean initialization with clear dependency chain
  var storage = md.storage({compilers})
  var inject = md.inject({storage})
  var detect = md.detect({storage, inject})
  var webrequest = md.webrequest({storage})
  var mathjax = md.mathjax()
  var xhr = md.xhr()
  
  // Initialize compilers with storage
  Object.keys(compilers).forEach((compiler) => {
    compilers[compiler] = md.compilers[compiler]({storage})
  })
  
  var messages = md.messages({storage, compilers, mathjax, xhr, webrequest})
  
  // Register event listeners  
  chrome.tabs.onUpdated.addListener(detect.tab)
  chrome.runtime.onMessage.addListener(messages)
  
  // Initialize webRequest handling
  if (chrome.webRequest) {
    webrequest.init()
  }
  
  console.log('[Service Worker] Initialization complete')
})()