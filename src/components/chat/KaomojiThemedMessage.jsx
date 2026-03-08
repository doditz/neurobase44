import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap } from 'lucide-react';
import { toast } from "sonner";

/**
 * KaomojiThemedMessage - Renders ALL Neuronas messages with Retro Kaomoji Cyberpunk theming
 * UNIFIED MIDNIGHT BLUE / ORANGE / GREEN / RED THEME
 */
export default function KaomojiThemedMessage({ content }) {
    // Enhance content with kaomoji formatting (only for audit logs)
    const hasAuditLog = content.includes('NEURONAS_AUDIT_LOG') || content.includes('<(^-^)>');
    
    const enhancedContent = hasAuditLog ? content
        .replace(/\[NEURONAS_AUDIT_LOG/g, '# <(^-^)> NEURONAS_AUDIT_LOG')
        .replace(/\[D²STIB/g, '## (⌐■_■) D²STIB')
        .replace(/\[GROUNDING/g, '## (◕_◕) GROUNDING')
        .replace(/\[HEMISPHERIC/g, '## (◕‿◕✿) ↔ (⌐■_■) HEMISPHERIC')
        .replace(/\[BRONAS/g, '## (✓/✗) BRONAS')
        .replace(/\[SMARCE/g, '## (📊) SMARCE')
        .replace(/\[SYNTHESIZED RESPONSE\]/g, '# <(^-^)> SYNTHESIZED RESPONSE')
    : content;

    // UNIFIED CYBERPUNK THEME - Android-safe with px units (rem unreliable on Android monospace)
    const kaomojiStyle = {
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#FFA500',
        backgroundColor: '#0a0a1a',
        padding: '10px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 165, 0, 0.4)',
        boxShadow: '0 0 10px rgba(255, 165, 0, 0.15)',
        lineHeight: '1.5',
        fontSize: '14px',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
    };

    const headerStyle = {
        color: '#00FF00',
        fontWeight: 'bold',
        fontSize: '15px',
        marginBottom: '4px',
        textShadow: '0 0 6px rgba(0, 255, 0, 0.3)',
        wordBreak: 'break-word'
    };

    const codeBlockStyle = {
        backgroundColor: '#0d1a2d',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '6px',
        padding: '8px',
        margin: '6px 0',
        overflow: 'auto',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px'
    };

    // Parse content to identify special kaomoji blocks
    const renderKaomojiContent = (text) => {
        // Split by major sections
        const sections = text.split(/(<\(\^-\^\)>.*?|(\(╯°□°\)╯.*?))/g).filter(Boolean);
        
        return (
            <div style={kaomojiStyle}>
                <ReactMarkdown
                    components={{
                        h1: ({ children }) => (
                            <div style={{ 
                                ...headerStyle, 
                                fontSize: '16px', 
                                color: '#00FF00',
                                borderBottom: '1px solid rgba(255, 165, 0, 0.5)',
                                paddingBottom: '4px',
                                marginTop: '8px'
                            }}>
                                {children}
                            </div>
                        ),
                        h2: ({ children }) => (
                            <div style={{ 
                                ...headerStyle, 
                                color: '#00FFFF',
                                fontSize: '15px',
                                marginTop: '6px',
                                marginBottom: '3px',
                                borderLeft: '2px solid #00FFFF',
                                paddingLeft: '6px'
                            }}>
                                {children}
                            </div>
                        ),
                        h3: ({ children }) => (
                            <div style={{ 
                                color: '#FFD700',
                                fontWeight: 'bold', 
                                marginTop: '4px',
                                marginBottom: '2px',
                                fontSize: '14px'
                            }}>
                                {children}
                            </div>
                        ),
                        p: ({ children }) => (
                            <p style={{ margin: '4px 0', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.5' }}>{children}</p>
                        ),
                        ul: ({ children }) => (
                            <ul style={{ marginLeft: '8px', listStyle: 'none', color: '#c0c0c0', fontSize: '14px' }}>
                                {React.Children.map(children, child => 
                                    child ? <li style={{ margin: '3px 0', paddingLeft: '6px', borderLeft: '2px solid rgba(255, 165, 0, 0.3)' }}>{child.props?.children}</li> : null
                                )}
                            </ul>
                        ),
                        ol: ({ children }) => (
                            <ol style={{ marginLeft: '8px', color: '#c0c0c0', listStyle: 'decimal', fontSize: '14px' }}>
                                {children}
                            </ol>
                        ),
                        li: ({ children }) => (
                            <li style={{ margin: '3px 0', color: '#d0d0d0', fontSize: '14px' }}>{children}</li>
                        ),
                        strong: ({ children }) => (
                            <strong style={{ 
                                color: '#FF6B6B',
                                backgroundColor: 'rgba(255, 107, 107, 0.15)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                fontWeight: '600'
                            }}>{children}</strong>
                        ),
                        em: ({ children }) => (
                            <em style={{ 
                                color: '#FFD93D',
                                fontStyle: 'italic'
                            }}>{children}</em>
                        ),
                        table: ({ children }) => (
                            <div style={{ overflowX: 'auto', margin: '8px 0', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    border: '1px solid rgba(0, 255, 255, 0.4)',
                                    backgroundColor: 'rgba(0, 20, 40, 0.5)',
                                    borderRadius: '6px',
                                    fontSize: '13px'
                                }}>
                                    {children}
                                </table>
                            </div>
                        ),
                        thead: ({ children }) => (
                            <thead style={{ 
                                backgroundColor: 'rgba(0, 255, 255, 0.15)',
                                color: '#FFA500',
                                fontWeight: 'bold'
                            }}>
                                {children}
                            </thead>
                        ),
                        tbody: ({ children }) => (
                            <tbody>{children}</tbody>
                        ),
                        tr: ({ children }) => (
                            <tr style={{ borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
                                {children}
                            </tr>
                        ),
                        th: ({ children }) => (
                            <th style={{ 
                                padding: '0.6rem', 
                                textAlign: 'left',
                                borderRight: '1px solid rgba(0, 255, 255, 0.2)',
                                color: '#FFA500'
                            }}>
                                {children}
                            </th>
                        ),
                        td: ({ children }) => (
                            <td style={{ 
                                padding: '0.5rem',
                                color: '#00FFFF',
                                borderRight: '1px solid rgba(0, 255, 255, 0.15)'
                            }}>
                                {children}
                            </td>
                        ),
                        code: ({ inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div style={{ position: 'relative', margin: '6px 0', maxWidth: '100%' }}>
                                    <div style={{ 
                                        color: '#00FF00', 
                                        marginBottom: '2px', 
                                        fontSize: '11px',
                                        opacity: 0.8 
                                    }}>
                                        ⚡ {match[1].toUpperCase()}
                                    </div>
                                    <div style={codeBlockStyle}>
                                        <pre style={{ margin: 0, color: '#00FF00', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            <code className={className} {...props}>
                                                {children}
                                            </code>
                                        </pre>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        style={{
                                            position: 'absolute',
                                            top: '1.5rem',
                                            right: '0.5rem',
                                            color: '#FFA500',
                                            backgroundColor: 'rgba(0,0,0,0.3)'
                                        }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                            toast.success('Code copied ✓');
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <code style={{
                                    backgroundColor: 'rgba(0, 100, 150, 0.25)',
                                    color: '#00FF00',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    fontSize: '13px',
                                    fontFamily: "'Courier New', monospace",
                                    border: '1px solid rgba(0, 255, 0, 0.2)',
                                    wordBreak: 'break-all'
                                }}>
                                    {children}
                                </code>
                            );
                        },
                        a: ({ children, href }) => (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: '#00FFFF',
                                    textDecoration: 'none',
                                    borderBottom: '1px dashed #00FFFF',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {children}
                            </a>
                        ),
                        img: ({ src, alt }) => (
                            <img
                                src={src}
                                alt={alt || ''}
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 165, 0, 0.3)',
                                    margin: '6px 0',
                                    display: 'block'
                                }}
                            />
                        ),
                        blockquote: ({ children }) => (
                            <blockquote style={{
                                borderLeft: '2px solid #FFA500',
                                paddingLeft: '8px',
                                marginLeft: '0',
                                marginRight: '0',
                                marginTop: '4px',
                                marginBottom: '4px',
                                color: '#FFD93D',
                                fontStyle: 'italic',
                                backgroundColor: 'rgba(255, 165, 0, 0.05)',
                                padding: '6px 10px',
                                borderRadius: '0 6px 6px 0',
                                fontSize: '14px',
                                boxSizing: 'border-box'
                            }}>
                                {children}
                            </blockquote>
                        ),
                        hr: () => (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                margin: '1.25rem 0',
                                gap: '0.75rem'
                            }}>
                                <div style={{ flex: 1, borderTop: '1px solid rgba(255, 165, 0, 0.4)' }} />
                                <span style={{ color: '#FFA500', fontSize: '0.7em', opacity: 0.7 }}>◆</span>
                                <div style={{ flex: 1, borderTop: '1px solid rgba(255, 165, 0, 0.4)' }} />
                            </div>
                        )
                    }}
                >
                    {enhancedContent}
                </ReactMarkdown>
            </div>
        );
    };

    return renderKaomojiContent(content);
}