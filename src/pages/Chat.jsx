import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { User } from '@/entities/User';
import { Debate } from '@/entities/Debate';
import ChatInterface from '@/components/chat/ChatInterface';
import ConversationList from '@/components/chat/ConversationList';
import SettingsPanel from '@/components/chat/SettingsPanel';
import WelcomeBackModal from '@/components/chat/WelcomeBackModal';

export default function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        temperature: 0.7,
        selectedPersonas: [],
        hemisphereMode: 'balanced',
        d2Modulation: 0.65,
        ethicalConstraints: 'medium',
        debateRounds: 5, // Changed from 3 to 5 as per another internal change, ensuring consistency.
        consensusThreshold: 0.85,
        maxPersonas: 5,
        mode: 'balanced' // Add default mode
    });
    const [user, setUser] = useState(null);
    const [autoStarted, setAutoStarted] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.log("User not authenticated");
            }
        };
        initUser();
    }, []);

    const handleNewConversation = useCallback(async () => {
        const topic = prompt("Donnez un titre à cette conversation (optionnel):");
        const finalTopic = topic && topic.trim() 
            ? topic.trim() 
            : `Chat du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        
        setIsLoading(true);
        try {
            const newAgentConversation = await base44.agents.createConversation({ 
                agent_name: "smas_debater",
                metadata: { name: finalTopic }
            });
            const conversation_id = newAgentConversation.id;

            const newDebateRecord = await Debate.create({ 
                topic: finalTopic, 
                conversation_id,
                agent_name: "smas_debater"
            });
            
            setConversations(prev => [newDebateRecord, ...prev]);
            setActiveConversation(newDebateRecord);
        } catch (error) {
            console.error("Failed to create conversation:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadConversations = useCallback(async () => {
        if (!user) return;
        
        setIsLoading(true);
        try {
            // Fetch conversations from all relevant agents
            const debates = await Debate.filter({ 
                agent_name: { "$in": ["smas_debater", "suno_prompt_architect"] } 
            }, '-created_date');
            
            const validDebates = debates.filter(debate => 
                debate.conversation_id && 
                debate.conversation_id !== 'pending' &&
                debate.conversation_id.length > 5
            );
            setConversations(validDebates);
            
            const hasSeenWelcome = sessionStorage.getItem('neuronas_welcome_shown');
            
            if (validDebates.length > 0 && !activeConversation && !autoStarted && !hasSeenWelcome) {
                setShowWelcomeModal(true);
                sessionStorage.setItem('neuronas_welcome_shown', 'true');
            } else if (validDebates.length === 0 && !autoStarted) {
                // Do not auto-start a new one, let the user decide.
            } else if (validDebates.length > 0 && !activeConversation && !autoStarted && hasSeenWelcome) {
                setActiveConversation(validDebates[0]);
                setAutoStarted(true);
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
        } finally {
            setIsLoading(false);
        }
    }, [autoStarted, activeConversation, user]);

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user, loadConversations]);

    const updateConversationId = async (tempId, realId) => {
        if (!realId || realId === 'pending' || realId.length < 10) return;

        setConversations(prev => 
            prev.map(conv => 
                conv.id === tempId 
                    ? { ...conv, conversation_id: realId }
                    : conv
            )
        );
        
        if (activeConversation && activeConversation.id === tempId && !String(tempId).startsWith('temp_')) {
            try {
                await Debate.update(tempId, { conversation_id: realId });
                await loadConversations(); 
            } catch (error) {
                console.error("Failed to update conversation ID in database:", error);
            }
        }
    };

    const handleDebateUpdated = (newDebate) => {
        setActiveConversation(newDebate);
        loadConversations();
    };

    const handleSelectConversation = (conversation) => {
        setActiveConversation(conversation);
    };

    const handleSettingsChange = useCallback((newSettings) => {
        setSettings({ ...settings, ...newSettings });
    }, [settings]);

    const handleContinueLastConversation = () => {
        if (conversations.length > 0) {
            setActiveConversation(conversations[0]);
        }
        setShowWelcomeModal(false);
        setAutoStarted(true);
    };

    const handleStartNewFromModal = async () => {
        setShowWelcomeModal(false);
        setAutoStarted(true);
        await handleNewConversation();
    };

    // Expose layout props via window for Layout to pick up
    useEffect(() => {
        window.chatLayoutProps = {
            conversations,
            activeConversation,
            onSelectConversation: handleSelectConversation,
            onNewConversation: handleNewConversation,
            settings,
            onSettingsChange: handleSettingsChange,
            showSettings,
            setShowSettings,
            user,
            isLoading,
            ChatSidebarComponent: ConversationList, // Use the unified ConversationList
            SettingsPanelComponent: SettingsPanel
        };

        return () => {
            window.chatLayoutProps = null;
        };
    }, [conversations, activeConversation, showSettings, settings, user, isLoading, handleNewConversation, handleSettingsChange]);

    return (
        <>
            <WelcomeBackModal
                isOpen={showWelcomeModal}
                onClose={() => {
                    setShowWelcomeModal(false);
                    setAutoStarted(true);
                    if (conversations.length > 0) {
                        setActiveConversation(conversations[0]);
                    }
                }}
                user={user}
                lastConversation={conversations[0]}
                onContinue={handleContinueLastConversation}
                onStartNew={handleStartNewFromModal}
            />

            <ChatInterface
                key={activeConversation?.id || 'no-chat'}
                agentName="smas_debater"
                initialConversationId={activeConversation && activeConversation.conversation_id !== 'pending' ? activeConversation.conversation_id : null}
                onConversationCreated={(conversationId) => updateConversationId(activeConversation?.id, conversationId)}
                welcomeMessage={activeConversation ? `**${activeConversation.topic || activeConversation.title}**\n\nJe suis votre assistant Neuronas AI avec accès à 200+ personas spécialisées. Que souhaitez-vous explorer aujourd'hui ?` : "Je suis votre assistant Neuronas AI. De quoi souhaitez-vous discuter ?"}
                settings={settings}
                autoStart={true}
                debateRecord={activeConversation}
                onDebateUpdated={handleDebateUpdated}
            />
        </>
    );
}