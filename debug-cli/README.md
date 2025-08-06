# Jupyter Notebook Debug CLI

A Node.js CLI tool for debugging and converting Jupyter Notebook files (.ipynb) to various formats.

## Installation

```bash
npm install
chmod +x index.js
```

## Usage

### Basic Usage
```bash
# Convert notebook to HTML (default)
node index.js path/to/notebook.ipynb

# Convert to specific format
node index.js path/to/notebook.ipynb -f html
node index.js path/to/notebook.ipynb -f md
node index.js path/to/notebook.ipynb -f json

# Save to file
node index.js path/to/notebook.ipynb -o output.html

# Verbose debugging
node index.js path/to/notebook.ipynb -v
```

### Examples

```bash
# Convert sample notebook to HTML with debugging info
node index.js ../assets/Llama3_1_\(8B\)_GRPO.ipynb -f html -o output.html -v

# Convert to Markdown for easy reading
node index.js ../assets/Llama3_1_\(8B\)_GRPO.ipynb -f md -o output.md

# Extract structured JSON for inspection
node index.js ../assets/Llama3_1_\(8B\)_GRPO.ipynb -f json -o output.json -v
```

## Features

- **Multiple Output Formats**: HTML, Markdown, JSON
- **Notebook Structure Analysis**: Displays cell count, metadata, format version
- **Error Handling**: Graceful handling of malformed notebooks
- **Verbose Mode**: Detailed processing information for debugging
- **Cell Type Support**: Markdown, code, and raw cells
- **Output Rendering**: Handles code outputs, streams, and display data

## Debugging Extension Issues

This tool helps debug extension problems by:

1. **Validating Notebook Structure**: Checks if the notebook file is valid JSON with proper structure
2. **Cell Processing**: Shows how each cell would be processed
3. **Output Generation**: Demonstrates the conversion process the extension should perform
4. **Format Compatibility**: Tests both nbformat 3 and 4 notebooks

## Command Line Options

- `-f, --format <type>`: Output format (html, md, json) - default: html
- `-o, --output <file>`: Output file path (default: stdout)
- `-v, --verbose`: Enable verbose debugging output
- `-V, --version`: Show version number
- `-h, --help`: Show help information

## Troubleshooting

### Common Issues

1. **"Invalid JSON"**: The notebook file is corrupted or not valid JSON
2. **"No cells found"**: The notebook structure is missing required fields
3. **Markdown rendering errors**: Some markdown syntax may not render perfectly

### Debug Steps

1. First, test with JSON output to see the raw structure:
   ```bash
   node index.js notebook.ipynb -f json -v
   ```

2. Check if specific cells cause issues by examining the verbose output:
   ```bash
   node index.js notebook.ipynb -f html -v
   ```

3. Compare with a known working notebook to identify structural differences.

## Dependencies

- `commander`: CLI argument parsing
- `marked`: Markdown to HTML conversion
- `prismjs`: Syntax highlighting (planned)
- `katex`: Math rendering (planned)