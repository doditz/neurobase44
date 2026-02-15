/**
 * Universal file export utility
 * Centralizes all export logic with robust download handling
 */

const MIME_TYPES = {
    txt: 'text/plain;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    json: 'application/json;charset=utf-8',
    html: 'text/html;charset=utf-8',
    csv: 'text/csv;charset=utf-8'
};

/**
 * Download content as a file with proper encoding and handling
 */
export function downloadFile(content, filename, format = 'txt') {
    const mimeType = MIME_TYPES[format] || MIME_TYPES.txt;
    
    // Handle different content types
    let processedContent = content;
    if (format === 'json' && typeof content === 'object') {
        processedContent = JSON.stringify(content, null, 2);
    }
    
    // Create blob with BOM for UTF-8 text files (helps Excel/Notepad)
    const bom = format === 'csv' ? '\uFEFF' : '';
    const blob = new Blob([bom + processedContent], { type: mimeType });
    
    // Use modern download approach with fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    
    // Trigger download
    try {
        link.click();
    } catch (e) {
        // Fallback for older browsers
        window.open(url, '_blank');
    }
    
    // Cleanup after small delay to ensure download starts
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
    
    return true;
}

/**
 * Generate timestamped filename
 */
export function generateFilename(prefix, format) {
    const timestamp = new Date().toISOString().split('T')[0];
    const safePrefix = (prefix || 'export').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    return `${safePrefix}_${timestamp}.${format}`;
}

/**
 * Export data in multiple formats
 */
export function exportData(data, prefix, format, formatters = {}) {
    const filename = generateFilename(prefix, format);
    
    let content;
    switch (format) {
        case 'json':
            content = formatters.json ? formatters.json(data) : JSON.stringify(data, null, 2);
            break;
        case 'md':
            content = formatters.md ? formatters.md(data) : formatAsMarkdown(data);
            break;
        case 'txt':
            content = formatters.txt ? formatters.txt(data) : formatAsText(data);
            break;
        case 'html':
            content = formatters.html ? formatters.html(data) : formatAsHTML(data);
            break;
        case 'csv':
            content = formatters.csv ? formatters.csv(data) : formatAsCSV(data);
            break;
        default:
            content = typeof data === 'string' ? data : JSON.stringify(data);
    }
    
    return downloadFile(content, filename, format);
}

// Default formatters
function formatAsText(data) {
    if (typeof data === 'string') return data;
    if (Array.isArray(data)) {
        return data.map((item, i) => `[${i + 1}] ${JSON.stringify(item)}`).join('\n\n');
    }
    return JSON.stringify(data, null, 2);
}

function formatAsMarkdown(data) {
    if (typeof data === 'string') return data;
    let md = `# Export\n\n**Date:** ${new Date().toLocaleString()}\n\n---\n\n`;
    if (Array.isArray(data)) {
        data.forEach((item, i) => {
            md += `## Item ${i + 1}\n\n\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`\n\n`;
        });
    } else {
        md += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    }
    return md;
}

function formatAsHTML(data) {
    const content = typeof data === 'string' ? data : `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Export</title>
<style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}pre{background:#f4f4f4;padding:15px;overflow:auto}</style>
</head><body>${content}</body></html>`;
}

function formatAsCSV(data) {
    if (!Array.isArray(data) || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
    return [headers.join(','), ...rows].join('\n');
}

export default { downloadFile, generateFilename, exportData };