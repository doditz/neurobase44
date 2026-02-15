import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Debate } from '@/entities/Debate';
import { ResourceUsage } from '@/entities/ResourceUsage';
import { UserBudget } from '@/entities/UserBudget';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, CornerDownLeft, Bot, AlertCircle, RefreshCw, Clock, Paperclip, X, FileText, Image as ImageIcon, FileCode, Eye, Brain, Users, Zap, MessageSquare, Download, Database, ChevronUp, ChevronDown } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { createLogger } from '@/components/core/NeuronasLogger';
import { toast } from 'sonner';
import DebateVisualizationModal from '@/components/benchmark/DebateVisualizationModal';
import DebateFlowVisualization from './DebateFlowVisualization';
import ChatExportPanel from './ChatExportPanel';
import AnalysisContextPanel from './AnalysisContextPanel';
import ResourceMonitorBar from './ResourceMonitorBar';

const MIN_MESSAGE_INTERVAL = 2000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 5000;

export default function ChatInterface({ 
    agentName, 
    initialConversationId = null, 
    onConversationCreated, 
    welcomeMessage, 
    settings = {}, 
    autoStart = false,
    debateRecord = null,
    onDebateUpdated = null
}) {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [lastMessageTime, setLastMessageTime] = useState(0);
    const [processingTime, setProcessingTime] = useState(0);
    const [userBudget, setUserBudget] = useState(null);
    const [lastDebateMetadata, setLastDebateMetadata] = useState(null);
    const [showDebateModal, setShowDebateModal] = useState(false);
    const [liveDebateHistory, setLiveDebateHistory] = useState([]);
    const [currentDebateRound, setCurrentDebateRound] = useState(0);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [showAnalysisContext, setShowAnalysisContext] = useState(false);
    const [injectedContext, setInjectedContext] = useState(null);
    const [lastResponseTokens, setLastResponseTokens] = useState(0);
    const [sessionTokensUsed, setSessionTokensUsed] = useState(0);
    
    const scrollAreaRef = useRef(null);
    const fileInputRef = useRef(null);
    const conversationRef = useRef(null);
    const processingTimerRef = useRef(null);

    useEffect(() => {
        conversationRef.current = conversation;
    }, [conversation]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        }, 100);
    }, []);

    // Initialize conversation and load message history
    useEffect(() => {
        const initConversation = async () => {
            if (initialConversationId) {
                setIsLoading(true);
                try {
                    console.log('[ChatInterface] Loading conversation:', initialConversationId);
                    
                    const debates = await Debate.filter({ conversation_id: initialConversationId });
                    if (debates.length > 0) {
                        setConversation(debates[0]);
                        console.log('[ChatInterface] Debate record loaded:', debates[0]);
                    }
                    
                    // Load conversation history from agent SDK
                    const conversationData = await base44.agents.getConversation(initialConversationId);
                    console.log('[ChatInterface] Conversation data:', conversationData);
                    
                    if (conversationData && conversationData.messages && conversationData.messages.length > 0) {
                        console.log('[ChatInterface] Setting messages:', conversationData.messages.length);
                        setMessages(conversationData.messages);
                        scrollToBottom();
                    } else {
                        console.log('[ChatInterface] No messages in conversation');
                        setMessages([]);
                    }
                } catch (error) {
                    console.error('[ChatInterface] Failed to load conversation:', error);
                    setMessages([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setMessages([]);
            }
        };
        initConversation();
    }, [initialConversationId, scrollToBottom]);

    // Load user budget
    useEffect(() => {
        const loadBudget = async () => {
            try {
                const budgets = await UserBudget.list();
                if (budgets.length > 0) {
                    setUserBudget(budgets[0]);
                }
            } catch (error) {
                console.log('[ChatInterface] No budget found');
            }
        };
        loadBudget();
    }, []);

    // File upload handler
    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            const uploadPromises = files.map(async (file) => {
                const { file_url } = await base44.integrations.Core.UploadFile({ file });
                return {
                    name: file.name,
                    url: file_url,
                    type: file.type,
                    size: file.size
                };
            });

            const uploadedFileData = await Promise.all(uploadPromises);
            setUploadedFiles(prev => [...prev, ...uploadedFileData]);
            toast.success(`${uploadedFileData.length} fichier(s) téléchargé(s)`);
        } catch (error) {
            console.error('[ChatInterface] File upload failed:', error);
            toast.error('Échec du téléchargement des fichiers');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeFile = (index) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
        if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="w-4 h-4" />;
        if (fileType.includes('code') || fileType.includes('text')) return <FileCode className="w-4 h-4" />;
        return <FileText className="w-4 h-4" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Send message via chatOrchestrator
    const handleSendMessage = async () => {
        if ((!input.trim() && uploadedFiles.length === 0) || isSending) return;
        
        const now = Date.now();
        if (now - lastMessageTime < MIN_MESSAGE_INTERVAL) {
            const remainingTime = Math.ceil((MIN_MESSAGE_INTERVAL - (now - lastMessageTime)) / 1000);
            toast.warning(`Veuillez attendre ${remainingTime}s`);
            return;
        }

        if (userBudget && userBudget.tokens_used_today >= userBudget.daily_token_limit) {
            toast.error('Limite quotidienne de tokens atteinte');
            return;
        }

        setIsSending(true);
        setError(null);
        setProcessingTime(0);

        const logger = createLogger('ChatInterface_SendMessage');

        const startTime = Date.now();
        processingTimerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            setProcessingTime(elapsed);
        }, 1000);

        try {
            logger.info('Sending message to chatOrchestrator', { 
                agent: agentName,
                message_length: input.length,
                has_files: uploadedFiles.length > 0
            });

            // Add user message optimistically
            const userMsg = {
                role: 'user',
                content: input || 'Please analyze the uploaded files.',
                files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
                id: `temp-${Date.now()}`
            };
            
            setMessages(prev => [...prev, userMsg]);
            setInput('');
            setUploadedFiles([]);
            setLastMessageTime(now);
            setIsLoading(true);
            setLiveDebateHistory([]);
            setCurrentDebateRound(0);

            // Settings context for agent
            const settingsContext = `\n\n[SYSTEM SETTINGS: Personas: ${settings.maxPersonas || 5}, Temperature: ${settings.temperature || 0.7}, Mode: ${settings.mode || 'balanced'}, Hemisphere: ${settings.hemisphereMode || 'balanced'}, Rounds: ${settings.debateRounds || 5}]`;
            
            // Include injected analysis context if available
            let messageContent = input || 'Please analyze the uploaded files.';
            if (injectedContext) {
                messageContent = injectedContext + '\n\n' + messageContent;
                setInjectedContext(null); // Clear after use
            }
            messageContent += settingsContext;

            // Call chatOrchestrator
            const response = await base44.functions.invoke('chatOrchestrator', {
                conversation_id: conversation?.conversation_id || 'pending',
                agent_name: agentName,
                user_message: messageContent,
                settings: settings,
                file_urls: uploadedFiles.map(f => f.url),
                metadata: {
                    debate_id: debateRecord?.id
                }
            });

            const data = response.data;

            // IMPROVED ERROR HANDLING
            if (!data) {
                throw new Error('Aucune réponse du serveur');
            }

            // Log detailed error info for debugging
            if (data.success === false) {
                console.error('[ChatInterface] chatOrchestrator error:', {
                    error: data.error,
                    logs: data.logs,
                    stack: data.stack
                });
                
                // Properly format logs for display
                let logsDisplay = '';
                if (data.logs && Array.isArray(data.logs)) {
                    logsDisplay = data.logs.map(log => {
                        if (typeof log === 'object') {
                            return `[${log.level?.toUpperCase() || 'LOG'}] ${log.message || JSON.stringify(log)}`;
                        }
                        return String(log);
                    }).slice(-5).join('\n');
                }
                
                const errorMsg = data.error || 'Le moteur a refusé de traiter cette requête.';
                const detailedError = logsDisplay ? 
                    `${errorMsg}\n\nDerniers logs:\n${logsDisplay}` : 
                    errorMsg;
                
                toast.error(errorMsg);
                setError(detailedError);
                
                // Keep user's message but don't add assistant response
                setIsSending(false);
                setIsLoading(false);
                if (processingTimerRef.current) {
                    clearInterval(processingTimerRef.current);
                    processingTimerRef.current = null;
                }
                setProcessingTime(0);
                return;
            }

            logger.info('chatOrchestrator response received', { 
                success: data?.success,
                has_response: !!data?.response
            });

            // Store debate metadata for visualization
            if (data.metadata) {
                const fullDebateData = {
                    debate_metadata: data.metadata,
                    debate_history: data.debate_history || [],
                    personas_used: data.metadata.personas_used || [],
                    complexity_score: data.metadata.complexity_score,
                    d2_activation: data.metadata.d2_activation,
                    debate_rounds_executed: data.metadata.debate_rounds_executed,
                    total_time_ms: data.metadata.total_time_ms
                };
                setLastDebateMetadata(fullDebateData);
                setLiveDebateHistory(data.debate_history || []);
                setCurrentDebateRound(data.metadata.debate_rounds_executed || 0);
                
                // Track token usage
                const tokensUsed = data.metadata.total_tokens || 0;
                setLastResponseTokens(tokensUsed);
                setSessionTokensUsed(prev => prev + tokensUsed);
                
                // Update debate record with full metadata
                if (debateRecord?.id && onDebateUpdated) {
                    try {
                        const updatedDebate = await Debate.update(debateRecord.id, {
                            debate_metadata: data.metadata,
                            last_complexity_score: data.metadata.complexity_score,
                            last_d2_activation: data.metadata.d2_activation,
                            total_messages: (debateRecord.total_messages || 0) + 1
                        });
                        onDebateUpdated(updatedDebate);
                    } catch (updateError) {
                        console.error('Failed to update debate metadata:', updateError);
                    }
                }
            }

            // Add assistant response with progressive reveal
            const assistantMsg = {
                role: 'assistant',
                content: data.response,
                metadata: data.metadata,
                id: `asst-${Date.now()}`,
                progressive: true
            };

            setMessages(prev => prev.filter(m => !m.id?.startsWith('temp-')).concat([userMsg, assistantMsg]));

            logger.success('Message exchange completed', {
                total_time_ms: data.metadata?.total_time_ms,
                tokens: data.metadata?.total_tokens
            });

            toast.success('✅ Réponse générée');

        } catch (error) {
            logger.error(`Failed to send message: ${error.message}`, { stack: error.stack });
            console.error('[ChatInterface] Send error:', error);
            
            // Extract more details from error if available
            let errorMessage = error.message;
            let logsDisplay = '';
            
            if (error.response?.data) {
                const errorData = error.response.data;
                console.error('[ChatInterface] Error response data:', errorData);
                
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
                
                // Properly format logs
                if (errorData.logs && Array.isArray(errorData.logs)) {
                    logsDisplay = errorData.logs.map(log => {
                        if (typeof log === 'object') {
                            return `[${log.level?.toUpperCase() || 'LOG'}] ${log.message || JSON.stringify(log)}`;
                        }
                        return String(log);
                    }).slice(-10).join('\n');
                    
                    console.log('[ChatInterface] Backend logs:\n', logsDisplay);
                }
                
                if (errorData.stack) {
                    console.error('[ChatInterface] Backend stack:', errorData.stack);
                }
            }
            
            const detailedError = logsDisplay ? 
                `${errorMessage}\n\nLogs backend:\n${logsDisplay}` : 
                errorMessage;
            
            toast.error(`Erreur: ${errorMessage}`);
            setError(detailedError);
        } finally {
            setIsSending(false);
            setIsLoading(false);
            if (processingTimerRef.current) {
                clearInterval(processingTimerRef.current);
                processingTimerRef.current = null;
            }
            setProcessingTime(0);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    useEffect(() => {
        return () => {
            if (processingTimerRef.current) {
                clearInterval(processingTimerRef.current);
            }
        };
    }, []);

    const canSendMessage = !isSending && !isLoading && (input.trim() || uploadedFiles.length > 0);

    // Handle optimization suggestions from ResourceMonitorBar
    const handleOptimizeSuggestion = (action) => {
        switch (action) {
            case 'reduce_complexity':
                toast.info('💡 Tip: Reduce debate rounds in settings for faster responses');
                break;
            case 'switch_eco':
                toast.info('💡 Tip: Switch to "eco" mode in settings to conserve tokens');
                break;
            case 'simplify_prompt':
                toast.info('💡 Tip: Try shorter, more focused questions');
                break;
            default:
                break;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-900">
            {/* Resource Monitor Bar */}
            <ResourceMonitorBar
                processingTime={processingTime}
                isProcessing={isLoading || isSending}
                lastResponseTokens={lastResponseTokens}
                onOptimizeSuggestion={handleOptimizeSuggestion}
            />

            {error && (
                <div className="p-2 bg-orange-900/30 border-b border-orange-600/50 text-orange-400 text-sm flex-shrink-0">
                    <div className="flex items-center gap-2 max-w-4xl mx-auto">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {(isLoading || isSending) && processingTime > 0 && (
                <div className="p-2 bg-blue-900/30 border-b border-blue-600/50 text-blue-300 text-sm flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 max-w-4xl mx-auto">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>
                            Traitement en cours... {processingTime}s
                            {processingTime > 30 && processingTime <= 60 && ' (analyse complexe)'}
                            {processingTime > 60 && ' (débat multi-personas)'}
                        </span>
                        {processingTime > 45 && (
                            <Badge variant="outline" className="text-xs py-0 text-yellow-400 border-yellow-600/50">
                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                Long processing
                            </Badge>
                        )}
                    </div>
                </div>
            )}

            {/* Debate Metadata Display with Click to View */}
            {lastDebateMetadata && !isLoading && (
                <div className="p-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <button
                            onClick={() => setShowDebateModal(true)}
                            className="w-full text-xs text-slate-400 flex flex-wrap items-center gap-3 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                        >
                            <span className="flex items-center gap-1">
                                <Brain className="w-3 h-3 text-green-400" />
                                Complexité: <span className="text-green-400 font-semibold">{(lastDebateMetadata.complexity_score * 100).toFixed(0)}%</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-400" />
                                {lastDebateMetadata.personas_used?.length || 0} personas
                            </span>
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-orange-400" />
                                D2: <span className="text-orange-400 font-semibold">{(lastDebateMetadata.d2_activation * 100).toFixed(0)}%</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-purple-400" />
                                {lastDebateMetadata.debate_rounds_executed || 0} rondes
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {(lastDebateMetadata.total_time_ms / 1000).toFixed(1)}s
                            </span>
                            <span className="ml-auto text-blue-400 flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                Voir détails
                            </span>
                        </button>
                    </div>
                </div>
            )}
            
            <ScrollArea className="flex-1 p-2 sm:p-4" ref={scrollAreaRef}>
                <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                    {welcomeMessage && messages.length === 0 && (
                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
                            <p className="text-green-300">{welcomeMessage}</p>
                        </div>
                    )}
                    {messages.map((msg, index) => (
                        <MessageBubble key={msg.id || index} message={msg} />
                    ))}
                    {isLoading && liveDebateHistory.length > 0 && (
                        <DebateFlowVisualization 
                            debateHistory={liveDebateHistory}
                            personas={lastDebateMetadata?.personas_used || []}
                            currentRound={currentDebateRound}
                        />
                    )}
                </div>
            </ScrollArea>
            
            <div className="p-2 sm:p-4 border-t border-slate-700 bg-slate-800 flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                    {/* Context/Export Panels */}
                    {(showExportPanel || showAnalysisContext) && (
                        <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {showExportPanel && (
                                <ChatExportPanel
                                    messages={messages}
                                    conversationId={conversation?.conversation_id}
                                    topic={debateRecord?.topic}
                                    onClose={() => setShowExportPanel(false)}
                                />
                            )}
                            {showAnalysisContext && (
                                <AnalysisContextPanel
                                    onInjectContext={(ctx) => {
                                        setInjectedContext(ctx);
                                        setShowAnalysisContext(false);
                                        toast.info('Context loaded - type your question');
                                    }}
                                    onClose={() => setShowAnalysisContext(false)}
                                />
                            )}
                        </div>
                    )}

                    {/* Injected Context Indicator */}
                    {injectedContext && (
                        <div className="mb-2 p-2 bg-green-900/30 border border-green-600/50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-green-400">
                                <Database className="w-3 h-3" />
                                <span>Analysis context loaded - ask your follow-up question</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setInjectedContext(null)}
                                className="h-5 w-5"
                            >
                                <X className="w-3 h-3 text-green-400" />
                            </Button>
                        </div>
                    )}

                    {uploadedFiles.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                            {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                                    {getFileIcon(file.type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-green-300 truncate max-w-40">{file.name}</p>
                                        <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(index)}
                                        className="text-slate-400 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isSending ? 'Envoi en cours...' : uploadedFiles.length > 0 ? "Ajouter un message..." : "Posez-moi n'importe quoi..."}
                            className="pr-24 min-h-[60px] resize-none text-sm sm:text-base bg-slate-700 border-slate-600 text-green-300 placeholder:text-slate-500"
                            rows={2}
                            disabled={isSending || isLoading}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.csv,.json,.py,.js,.jsx,.ts,.tsx,.html,.css,.md,.png,.jpg,.jpeg,.gif"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSending || isLoading || isUploading}
                                className="h-8 w-8 text-slate-400 hover:text-green-400 hover:bg-slate-600"
                                title="Télécharger fichiers"
                            >
                                {isUploading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Paperclip className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={!canSendMessage}
                                className="h-8 w-8 bg-orange-600 hover:bg-orange-700"
                            >
                                {isSending || isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                            <CornerDownLeft className="h-3 w-3 flex-shrink-0" /> 
                            <span>Shift+Enter pour nouvelle ligne.</span>
                            <Paperclip className="h-3 w-3 flex-shrink-0 ml-2" />
                            <span>Fichiers pour analyse.</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAnalysisContext(!showAnalysisContext)}
                                className={`h-6 px-2 text-xs ${showAnalysisContext ? 'text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                                title="Load analysis context for follow-up questions"
                            >
                                <Database className="w-3 h-3 mr-1" />
                                Context
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowExportPanel(!showExportPanel)}
                                className={`h-6 px-2 text-xs ${showExportPanel ? 'text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                                disabled={messages.length === 0}
                                title="Export chat transcript"
                            >
                                <Download className="w-3 h-3 mr-1" />
                                Export
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Debate Visualization Modal */}
            <DebateVisualizationModal
                isOpen={showDebateModal}
                onClose={() => setShowDebateModal(false)}
                debateData={lastDebateMetadata}
            />
        </div>
    );
}