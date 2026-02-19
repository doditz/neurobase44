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

    // UNIFIED CYBERPUNK THEME - Midnight Blue background, Orange/Green/Cyan accents
    const kaomojiStyle = {
        fontFamily: "'Courier New', 'Monaco', 'Consolas', monospace",
        color: '#FFA500', // Orange text default
        backgroundColor: '#0a0a1a', // Deep midnight blue
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid rgba(255, 165, 0, 0.4)',
        boxShadow: '0 0 15px rgba(255, 165, 0, 0.2), 0 0 30px rgba(0, 100, 150, 0.15), inset 0 0 60px rgba(0, 50, 100, 0.1)',
        lineHeight: '1.7'
    };

    const headerStyle = {
        color: '#00FF00', // Bright green for headers
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '0.5rem',
        textShadow: '0 0 8px rgba(0, 255, 0, 0.4)'
    };

    const codeBlockStyle = {
        backgroundColor: '#0d1a2d',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '6px',
        padding: '0.75rem',
        margin: '0.5rem 0',
        overflow: 'auto'
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
                                fontSize: '1.25em', 
                                color: '#00FF00',
                                borderBottom: '2px solid rgba(255, 165, 0, 0.6)',
                                paddingBottom: '0.5rem',
                                marginTop: '1rem',
                                textShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
                            }}>
                                {children}
                            </div>
                        ),
                        h2: ({ children }) => (
                            <div style={{ 
                                ...headerStyle, 
                                color: '#00FFFF', // Cyan
                                fontSize: '1.1em',
                                marginTop: '1rem',
                                marginBottom: '0.5rem',
                                borderLeft: '3px solid #00FFFF',
                                paddingLeft: '0.75rem',
                                textShadow: '0 0 8px rgba(0, 255, 255, 0.4)'
                            }}>
                                {children}
                            </div>
                        ),
                        h3: ({ children }) => (
                            <div style={{ 
                                color: '#FFD700', // Gold
                                fontWeight: 'bold', 
                                marginTop: '0.75rem',
                                marginBottom: '0.25rem',
                                fontSize: '1em',
                                textShadow: '0 0 6px rgba(255, 215, 0, 0.3)'
                            }}>
                                {children}
                            </div>
                        ),
                        p: ({ children }) => (
                            <p style={{ margin: '0.5rem 0', color: '#e0e0e0' }}>{children}</p>
                        ),
                        ul: ({ children }) => (
                            <ul style={{ marginLeft: '1.5rem', listStyle: 'none', color: '#c0c0c0' }}>
                                {React.Children.map(children, child => 
                                    child ? <li style={{ margin: '0.3rem 0', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(255, 165, 0, 0.3)' }}>{child.props?.children}</li> : null
                                )}
                            </ul>
                        ),
                        ol: ({ children }) => (
                            <ol style={{ marginLeft: '1.5rem', color: '#c0c0c0', listStyle: 'decimal' }}>
                                {children}
                            </ol>
                        ),
                        li: ({ children }) => (
                            <li style={{ margin: '0.3rem 0', color: '#d0d0d0' }}>{children}</li>
                        ),
                        strong: ({ children }) => (
                            <strong style={{ 
                                color: '#FF6B6B', // Red for emphasis
                                backgroundColor: 'rgba(255, 107, 107, 0.15)',
                                padding: '0.1rem 0.4rem',
                                borderRadius: '3px',
                                fontWeight: '600'
                            }}>{children}</strong>
                        ),
                        em: ({ children }) => (
                            <em style={{ 
                                color: '#FFD93D', // Yellow/gold for italics
                                fontStyle: 'italic'
                            }}>{children}</em>
                        ),
                        table: ({ children }) => (
                            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    border: '1px solid rgba(0, 255, 255, 0.4)',
                                    backgroundColor: 'rgba(0, 20, 40, 0.5)',
                                    borderRadius: '6px'
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
                                <div style={{ position: 'relative', margin: '0.75rem 0' }}>
                                    <div style={{ 
                                        color: '#00FF00', 
                                        marginBottom: '0.25rem', 
                                        fontSize: '0.75em',
                                        opacity: 0.8 
                                    }}>
                                        ⚡ {match[1].toUpperCase()}
                                    </div>
                                    <div style={codeBlockStyle}>
                                        <pre style={{ margin: 0, color: '#00FF00', fontSize: '0.85em' }}>
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
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    border: '1px solid rgba(0, 255, 0, 0.2)'
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
                        blockquote: ({ children }) => (
                            <blockquote style={{
                                borderLeft: '3px solid #FFA500',
                                paddingLeft: '1rem',
                                marginLeft: '0.5rem',
                                marginTop: '0.5rem',
                                marginBottom: '0.5rem',
                                color: '#FFD93D',
                                fontStyle: 'italic',
                                backgroundColor: 'rgba(255, 165, 0, 0.05)',
                                padding: '0.5rem 1rem',
                                borderRadius: '0 6px 6px 0'
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