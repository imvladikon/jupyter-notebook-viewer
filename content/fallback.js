// Fallback script that runs if main extension fails
// This provides user-friendly error messages and troubleshooting guidance

(function createFallbackUI() {
  // Only run if we detect this is a notebook page that hasn't been processed
  if (!window.location.pathname.endsWith('.ipynb')) {
    return;
  }

  // Wait a bit to see if the main extension loads
  setTimeout(() => {
    // Check if extension has already processed the page
    if (window.notebookViewerLoaded || document.querySelector('#_html') || document.querySelector('.notebook-viewer-loading')) {
      return; // Extension is working, don't interfere
    }

    const pre = document.querySelector('pre');
    if (!pre || !pre.textContent.trim()) {
      return; // Not a valid notebook page
    }

    // Try to detect if this is actually a notebook
    let isNotebook = false;
    try {
      const json = JSON.parse(pre.textContent);
      isNotebook = !!(json.cells || json.worksheets) && (json.metadata || json.nbformat);
    } catch (e) {
      // Not valid JSON, probably not our concern
      return;
    }

    if (!isNotebook) {
      return; // Not a notebook file
    }

    // Create helpful error page
    createErrorPage(pre);
  }, 3000); // Wait 3 seconds for extension to load

  function createErrorPage(pre) {
    console.log('[Fallback] Creating error page for unprocessed notebook');
    
    // Hide the raw JSON
    pre.style.display = 'none';

    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
      <style>
        .notebook-error {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .error-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .error-icon {
          font-size: 48px;
          color: #ff6b35;
          margin-right: 15px;
        }
        .error-title {
          font-size: 24px;
          color: #333;
          margin: 0;
        }
        .error-subtitle {
          font-size: 16px;
          color: #666;
          margin: 5px 0 0 0;
        }
        .troubleshoot {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          border-left: 4px solid #007bff;
          margin: 20px 0;
        }
        .troubleshoot h3 {
          margin-top: 0;
          color: #007bff;
        }
        .step {
          margin: 15px 0;
          padding: 12px;
          background: white;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }
        .step-number {
          display: inline-block;
          background: #007bff;
          color: white;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          text-align: center;
          line-height: 24px;
          font-size: 14px;
          margin-right: 10px;
          font-weight: bold;
        }
        .step-title {
          font-weight: bold;
          color: #333;
        }
        .step-desc {
          margin-top: 5px;
          color: #666;
          line-height: 1.5;
        }
        .code {
          background: #f1f3f4;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
        }
        .show-raw {
          margin-top: 20px;
          padding: 15px;
          background: #fff3cd;
          border-radius: 6px;
          border-left: 4px solid #ffc107;
        }
        .show-raw button {
          background: #ffc107;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          color: #333;
        }
        .show-raw button:hover {
          background: #ffca2c;
        }
        .extension-check {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
          border-left: 4px solid #0066cc;
        }
        .status-check {
          margin: 10px 0;
          padding: 8px;
          border-radius: 4px;
        }
        .status-ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .status-unknown { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
      </style>

      <div class="notebook-error">
        <div class="error-header">
          <div class="error-icon">📓</div>
          <div>
            <h1 class="error-title">Jupyter Notebook Not Loading</h1>
            <p class="error-subtitle">The Jupyter Notebook Viewer extension couldn't process this file</p>
          </div>
        </div>

        <div class="extension-check">
          <h3>🔍 Extension Status Check</h3>
          <div id="status-checks">
            <!-- Status checks will be inserted here -->
          </div>
        </div>

        <div class="troubleshoot">
          <h3>🛠️ Troubleshooting Steps</h3>
          
          <div class="step">
            <span class="step-number">1</span>
            <div class="step-title">Check Extension Installation</div>
            <div class="step-desc">
              Go to <span class="code">chrome://extensions/</span> and verify that "Jupyter Notebook Viewer" is installed and enabled.
            </div>
          </div>

          <div class="step">
            <span class="step-number">2</span>
            <div class="step-title">Enable File Access Permission</div>
            <div class="step-desc">
              In <span class="code">chrome://extensions/</span>, click "Details" on Jupyter Notebook Viewer, then enable <strong>"Allow access to file URLs"</strong>. This is required for local files.
            </div>
          </div>

          <div class="step">
            <span class="step-number">3</span>
            <div class="step-title">Check File Extension</div>
            <div class="step-desc">
              Ensure your file ends with <span class="code">.ipynb</span> and contains valid JSON notebook data.
            </div>
          </div>

          <div class="step">
            <span class="step-number">4</span>
            <div class="step-title">Reload Extension</div>
            <div class="step-desc">
              In <span class="code">chrome://extensions/</span>, click the reload button on Jupyter Notebook Viewer, then refresh this page.
            </div>
          </div>

          <div class="step">
            <span class="step-number">5</span>
            <div class="step-title">Check Browser Console</div>
            <div class="step-desc">
              Press <span class="code">F12</span> → Console tab to see detailed error messages. Look for messages starting with <span class="code">[Detection]</span> or <span class="code">[Content Script]</span>.
            </div>
          </div>
        </div>

        <div class="show-raw">
          <h3>📄 View Raw Content</h3>
          <p>If the extension continues to have issues, you can view the raw notebook JSON:</p>
          <button onclick="showRawContent()">Show Raw JSON</button>
        </div>
      </div>
    `;

    // Insert after body
    document.body.appendChild(errorContainer);

    // Perform status checks
    performStatusChecks();

    // Add show raw content function
    window.showRawContent = function() {
      pre.style.display = 'block';
      pre.style.background = '#f8f9fa';
      pre.style.padding = '20px';
      pre.style.borderRadius = '6px';
      pre.style.overflow = 'auto';
      pre.style.fontSize = '12px';
      pre.style.lineHeight = '1.4';
      pre.style.whiteSpace = 'pre-wrap';
      pre.style.wordBreak = 'break-word';
      errorContainer.scrollIntoView({ behavior: 'smooth' });
    };
  }

  function performStatusChecks() {
    const statusContainer = document.getElementById('status-checks');
    if (!statusContainer) return;

    const checks = [
      {
        name: 'Chrome Extension API',
        test: () => typeof chrome !== 'undefined' && !!chrome.runtime,
        okMessage: 'Extension API is available',
        errorMessage: 'Extension API not available - extension may not be installed'
      },
      {
        name: 'Extension Runtime',
        test: () => {
          if (typeof chrome === 'undefined' || !chrome.runtime) return false;
          try {
            return !!chrome.runtime.id;
          } catch (e) {
            return false;
          }
        },
        okMessage: 'Extension runtime is active',
        errorMessage: 'Extension runtime is not responding'
      },
      {
        name: 'File Protocol Access',
        test: () => window.location.protocol === 'file:',
        okMessage: 'Accessing via file:// protocol',
        errorMessage: 'Not using file:// protocol',
        unknownMessage: 'Using web protocol (file access permission not needed)'
      },
      {
        name: 'Valid Notebook Structure',
        test: () => {
          try {
            const pre = document.querySelector('pre');
            if (!pre) return false;
            const json = JSON.parse(pre.textContent);
            return !!(json.cells || json.worksheets) && (json.metadata || json.nbformat);
          } catch (e) {
            return false;
          }
        },
        okMessage: 'Valid notebook JSON structure detected',
        errorMessage: 'Invalid or missing notebook structure'
      }
    ];

    checks.forEach(check => {
      const result = check.test();
      const div = document.createElement('div');
      div.className = 'status-check';
      
      if (result === true) {
        div.className += ' status-ok';
        div.innerHTML = `✅ <strong>${check.name}:</strong> ${check.okMessage}`;
      } else if (result === false) {
        div.className += ' status-error';
        div.innerHTML = `❌ <strong>${check.name}:</strong> ${check.errorMessage}`;
      } else {
        div.className += ' status-unknown';
        div.innerHTML = `⚠️ <strong>${check.name}:</strong> ${check.unknownMessage || 'Status unknown'}`;
      }
      
      statusContainer.appendChild(div);
    });

    // Try to ping extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({message: 'ping'}, (response) => {
        const pingDiv = document.createElement('div');
        pingDiv.className = 'status-check';
        
        if (chrome.runtime.lastError) {
          pingDiv.className += ' status-error';
          pingDiv.innerHTML = `❌ <strong>Extension Communication:</strong> ${chrome.runtime.lastError.message}`;
        } else if (response) {
          pingDiv.className += ' status-ok';
          pingDiv.innerHTML = `✅ <strong>Extension Communication:</strong> Extension responded successfully`;
        } else {
          pingDiv.className += ' status-error';
          pingDiv.innerHTML = `❌ <strong>Extension Communication:</strong> Extension not responding (may need restart)`;
        }
        
        statusContainer.appendChild(pingDiv);
      });
    }
  }

})();