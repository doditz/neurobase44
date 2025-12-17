import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap } from 'lucide-react';
import { toast } from "sonner";

/**
 * KaomojiThemedMessage - Renders Neuronas messages with Retro Kaomoji Cyberpunk theming
 */
export default function KaomojiThemedMessage({ content }) {
    const kaomojiStyle = {
        fontFamily: "'Courier New', monospace",
        color: '#FFA500',
        backgroundColor: '#000033',
        padding: '1rem',
        borderRadius: '8px',
        border: '2px solid #FFA500',
        boxShadow: '0 0 10px rgba(255, 165, 0, 0.3)',
        lineHeight: '1.6'
    };

    const headerStyle = {
        color: '#00FF00',
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '0.5rem'
    };

    const codeBlockStyle = {
        backgroundColor: '#001a33',
        border: '1px solid #FFA500',
        borderRadius: '4px',
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
                            <div style={headerStyle}>
                                {'<(^-^)> '}{children}
                            </div>
                        ),
                        h2: ({ children }) => (
                            <div style={{ ...headerStyle, color: '#FFA500', fontSize: '1em' }}>
                                {'(╯°□°)╯ '}{children}
                            </div>
                        ),
                        h3: ({ children }) => (
                            <div style={{ color: '#00FFFF', fontWeight: 'bold', marginTop: '0.5rem' }}>
                                {children}
                            </div>
                        ),
                        p: ({ children }) => (
                            <p style={{ margin: '0.5rem 0' }}>{children}</p>
                        ),
                        ul: ({ children }) => (
                            <ul style={{ marginLeft: '1.5rem', listStyle: 'none' }}>
                                {React.Children.map(children, child => 
                                    child ? <li style={{ margin: '0.25rem 0' }}>- {child.props?.children}</li> : null
                                )}
                            </ul>
                        ),
                        strong: ({ children }) => (
                            <strong style={{ color: '#FF6B6B' }}>{children}</strong>
                        ),
                        em: ({ children }) => (
                            <em style={{ color: '#FFD93D' }}>{children}</em>
                        ),
                        code: ({ inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                                <div style={{ position: 'relative' }}>
                                    <div style={{ color: '#00FF00', marginBottom: '0.25rem' }}>
                                        (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧ {match[1].toUpperCase()}
                                    </div>
                                    <div style={codeBlockStyle}>
                                        <pre style={{ margin: 0, color: '#00FF00' }}>
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
                                            top: '0.5rem',
                                            right: '0.5rem',
                                            color: '#FFA500'
                                        }}
                                        onClick={() => {
                                            navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                            toast.success('Code copied (＾▽＾)');
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <code style={{
                                    backgroundColor: '#001a33',
                                    color: '#00FF00',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '3px',
                                    fontSize: '0.9em'
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
                                    textDecoration: 'underline'
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
                                color: '#FFD93D',
                                fontStyle: 'italic'
                            }}>
                                {children}
                            </blockquote>
                        ),
                        hr: () => (
                            <div style={{
                                borderTop: '1px dashed #FFA500',
                                margin: '1rem 0'
                            }} />
                        )
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        );
    };

    return renderKaomojiContent(content);
}