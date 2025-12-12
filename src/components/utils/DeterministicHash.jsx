/**
 * Deterministic Hashing Utilities
 * 
 * Ensures that the same text always generates the same visual structure
 * (node positions, colors) for UI consistency.
 */

export function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

export function hashToColor(str) {
    const hash = stringToHash(str);
    
    // Generate consistent HSL color from hash
    const hue = hash % 360;
    const saturation = 60 + (hash % 20); // 60-80%
    const lightness = 45 + (hash % 15); // 45-60%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function hashToPosition(str, index, total, width = 800, height = 600) {
    const hash = stringToHash(str + index);
    
    // Create deterministic but well-distributed positions
    const angle = (hash % 360) * (Math.PI / 180);
    const radius = 100 + ((hash % 100) / 100) * 150; // Radius between 100-250
    
    const centerX = width / 2;
    const centerY = height / 2;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    return { x, y };
}

export function hashToSize(str, minSize = 20, maxSize = 60) {
    const hash = stringToHash(str);
    const range = maxSize - minSize;
    const size = minSize + (hash % range);
    return size;
}

export function contentToVisualProps(content, index = 0, total = 1) {
    return {
        color: hashToColor(content),
        position: hashToPosition(content, index, total),
        size: hashToSize(content),
        id: stringToHash(content).toString()
    };
}