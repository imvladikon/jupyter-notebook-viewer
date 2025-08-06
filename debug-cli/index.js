#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const program = new Command();

program
  .name('ipynb-debug')
  .description('Debug CLI tool for Jupyter Notebook conversion')
  .version('1.0.0')
  .argument('<file>', 'path to .ipynb file')
  .option('-f, --format <type>', 'output format: html, md, json', 'html')
  .option('-o, --output <file>', 'output file (default: stdout)')
  .option('-v, --verbose', 'verbose output for debugging')
  .action((file, options) => {
    try {
      convertNotebook(file, options);
    } catch (error) {
      console.error('Error:', error.message);
      if (options.verbose) {
        console.error('Stack trace:', error.stack);
      }
      process.exit(1);
    }
  });

function convertNotebook(filePath, options) {
  const { format, output, verbose } = options;
  
  if (verbose) {
    console.log(`Processing: ${filePath}`);
    console.log(`Format: ${format}`);
    console.log(`Output: ${output || 'stdout'}`);
  }

  // Read and parse notebook file
  const content = fs.readFileSync(filePath, 'utf8');
  let notebook;
  
  try {
    notebook = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in notebook file: ${error.message}`);
  }

  if (verbose) {
    console.log(`Notebook format: ${notebook.nbformat || 'unknown'}.${notebook.nbformat_minor || 'x'}`);
    console.log(`Number of cells: ${notebook.cells ? notebook.cells.length : 0}`);
    console.log(`Metadata keys: ${Object.keys(notebook.metadata || {}).join(', ')}`);
  }

  // Validate notebook structure
  if (!notebook.cells && !notebook.worksheets) {
    throw new Error('Invalid notebook: no cells or worksheets found');
  }

  let result;
  switch (format) {
    case 'json':
      result = convertToJson(notebook, verbose);
      break;
    case 'md':
      result = convertToMarkdown(notebook, verbose);
      break;
    case 'html':
    default:
      result = convertToHtml(notebook, verbose);
      break;
  }

  // Output result
  if (output) {
    fs.writeFileSync(output, result, 'utf8');
    console.log(`Output written to: ${output}`);
  } else {
    console.log(result);
  }
}

function convertToJson(notebook, verbose) {
  if (verbose) {
    console.log('Converting to structured JSON...');
  }
  
  return JSON.stringify({
    nbformat: notebook.nbformat,
    nbformat_minor: notebook.nbformat_minor,
    metadata: notebook.metadata,
    cells: getCells(notebook).map(cell => ({
      cell_type: cell.cell_type,
      source: Array.isArray(cell.source) ? cell.source.join('') : cell.source,
      metadata: cell.metadata,
      outputs: cell.outputs || []
    }))
  }, null, 2);
}

function convertToMarkdown(notebook, verbose) {
  if (verbose) {
    console.log('Converting to Markdown...');
  }

  let markdown = '';
  const cells = getCells(notebook);
  
  // Add notebook title from metadata
  if (notebook.metadata && notebook.metadata.title) {
    markdown += `# ${notebook.metadata.title}\\n\\n`;
  }

  cells.forEach((cell, index) => {
    if (verbose && index % 10 === 0) {
      console.log(`Processing cell ${index + 1}/${cells.length}`);
    }

    const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
    
    switch (cell.cell_type) {
      case 'markdown':
        markdown += source + '\\n\\n';
        break;
      case 'code':
        if (source.trim()) {
          markdown += '```' + (getLanguage(notebook) || 'python') + '\\n';
          markdown += source;
          if (!source.endsWith('\\n')) markdown += '\\n';
          markdown += '```\\n\\n';
        }
        
        // Add outputs
        if (cell.outputs && cell.outputs.length > 0) {
          cell.outputs.forEach(output => {
            if (output.output_type === 'stream' && output.text) {
              const text = Array.isArray(output.text) ? output.text.join('') : output.text;
              markdown += '```\\n' + text + '\\n```\\n\\n';
            } else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
              if (output.data && output.data['text/plain']) {
                const text = Array.isArray(output.data['text/plain']) ? 
                  output.data['text/plain'].join('') : output.data['text/plain'];
                markdown += '```\\n' + text + '\\n```\\n\\n';
              }
            }
          });
        }
        break;
      case 'raw':
        if (source.trim()) {
          markdown += '```\\n' + source + '\\n```\\n\\n';
        }
        break;
    }
  });

  return markdown;
}

function convertToHtml(notebook, verbose) {
  if (verbose) {
    console.log('Converting to HTML...');
  }

  const cells = getCells(notebook);
  let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${notebook.metadata?.title || 'Jupyter Notebook'}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .notebook-cell { margin-bottom: 1em; }
        .cell-input { background: #f8f8f8; padding: 10px; border-left: 3px solid #306998; }
        .cell-output { background: #fff; padding: 10px; border-left: 3px solid #ccc; margin-top: 5px; }
        .cell-markdown { line-height: 1.6; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        .cell-type { font-size: 0.8em; color: #666; margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>${notebook.metadata?.title || 'Jupyter Notebook'}</h1>
`;

  cells.forEach((cell, index) => {
    if (verbose && index % 10 === 0) {
      console.log(`Processing cell ${index + 1}/${cells.length}`);
    }

    const source = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
    
    html += `    <div class="notebook-cell">\\n`;
    html += `        <div class="cell-type">Cell ${index + 1}: ${cell.cell_type}</div>\\n`;
    
    switch (cell.cell_type) {
      case 'markdown':
        html += `        <div class="cell-markdown">\\n`;
        try {
          html += marked(source);
        } catch (error) {
          html += `<p><em>Error rendering markdown: ${error.message}</em></p>`;
        }
        html += `        </div>\\n`;
        break;
        
      case 'code':
        if (source.trim()) {
          html += `        <div class="cell-input">\\n`;
          html += `            <pre><code>${escapeHtml(source)}</code></pre>\\n`;
          html += `        </div>\\n`;
        }
        
        // Add outputs
        if (cell.outputs && cell.outputs.length > 0) {
          cell.outputs.forEach(output => {
            html += `        <div class="cell-output">\\n`;
            if (output.output_type === 'stream' && output.text) {
              const text = Array.isArray(output.text) ? output.text.join('') : output.text;
              html += `            <pre>${escapeHtml(text)}</pre>\\n`;
            } else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
              if (output.data) {
                if (output.data['text/html']) {
                  const htmlData = Array.isArray(output.data['text/html']) ? 
                    output.data['text/html'].join('') : output.data['text/html'];
                  html += `            <div>${htmlData}</div>\\n`;
                } else if (output.data['text/plain']) {
                  const text = Array.isArray(output.data['text/plain']) ? 
                    output.data['text/plain'].join('') : output.data['text/plain'];
                  html += `            <pre>${escapeHtml(text)}</pre>\\n`;
                }
              }
            } else if (output.output_type === 'error') {
              html += `            <pre style="color: red;">${escapeHtml(output.traceback ? output.traceback.join('\\n') : output.ename + ': ' + output.evalue)}</pre>\\n`;
            }
            html += `        </div>\\n`;
          });
        }
        break;
        
      case 'raw':
        if (source.trim()) {
          html += `        <div class="cell-input">\\n`;
          html += `            <pre>${escapeHtml(source)}</pre>\\n`;
          html += `        </div>\\n`;
        }
        break;
    }
    
    html += `    </div>\\n`;
  });

  html += `</body>\\n</html>`;
  return html;
}

function getCells(notebook) {
  // Handle both nbformat 3 and 4
  if (notebook.cells) {
    return notebook.cells; // nbformat 4
  } else if (notebook.worksheets && notebook.worksheets[0] && notebook.worksheets[0].cells) {
    return notebook.worksheets[0].cells; // nbformat 3
  }
  return [];
}

function getLanguage(notebook) {
  if (notebook.metadata && notebook.metadata.kernelspec && notebook.metadata.kernelspec.language) {
    return notebook.metadata.kernelspec.language;
  }
  return 'python';
}

function escapeHtml(text) {
  const div = { innerHTML: text };
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

program.parse();