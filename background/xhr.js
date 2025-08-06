md.xhr = () => {
  var get = async (url, done) => {
    try {
      const response = await fetch(url + '?preventCache=' + Date.now())
      if (response.ok) {
        const text = await response.text()
        done(null, text)
      } else {
        done(new Error(`HTTP ${response.status}: ${response.statusText}`))
      }
    } catch (err) {
      console.error('[XHR] Fetch error:', err)
      done(err)
    }
  }

  return {get}
}
