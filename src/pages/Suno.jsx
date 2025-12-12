import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Debate } from '@/entities/Debate';
import ChatInterface from '@/components/chat/ChatInterface';
import ConversationList from '@/components/chat/ConversationList';
import SunoSettingsPanel from '@/components/chat/SunoSettingsPanel';
import { agentSDK } from '@/agents';

export default function SunoPage() {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        temperature: 0.8,
        selectedPersonas: [],
        hemisphereMode: 'creative',
        d2Modulation: 0.7,
        ethicalConstraints: 'medium',
        debateRounds: 2,
        consensusThreshold: 0.8,
        maxPersonas: 3,
        mode: 'creative'
    });
    const [user, setUser] = useState(null);
    const [autoStarted, setAutoStarted] = useState(false);
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
        const topic = prompt("Titre de votre composition (optionnel):");
        const finalTopic = topic && topic.trim() 
            ? topic.trim() 
            : `Composition du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        
        setIsLoading(true);
        try {
            const newAgentConversation = await agentSDK.createConversation({ 
                agent_name: "suno_prompt_architect",
                metadata: { topic: finalTopic }
            });
            const conversation_id = newAgentConversation.id;

            const newDebateRecord = await Debate.create({ 
                topic: finalTopic, 
                conversation_id,
                agent_name: "suno_prompt_architect"
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
            const debates = await Debate.filter({ agent_name: "suno_prompt_architect" }, '-created_date');
            
            const validDebates = debates.filter(d => 
                d.conversation_id && 
                d.conversation_id !== 'pending' &&
                d.conversation_id.length > 5
            );
            setConversations(validDebates);
            
            if (validDebates.length === 0 && !autoStarted) {
                handleNewConversation();
                setAutoStarted(true);
            } else if (validDebates.length > 0 && !activeConversation && !autoStarted) {
                setActiveConversation(validDebates[0]);
                setAutoStarted(true);
            }
        } catch (error) {
            console.error("Failed to load conversations:", error);
            if (!autoStarted) {
                handleNewConversation();
                setAutoStarted(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [autoStarted, activeConversation, user, handleNewConversation]);

    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user, loadConversations]);

    const handleSelectConversation = (conversation) => {
        setActiveConversation(conversation);
    };

    const handleSettingsChange = useCallback((newSettings) => {
        setSettings({ ...settings, ...newSettings });
    }, [settings]);

    const handleDebateUpdated = (newDebate) => {
        setActiveConversation(newDebate);
        loadConversations();
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
            ChatSidebarComponent: ConversationList,
            SettingsPanelComponent: SunoSettingsPanel
        };

        return () => {
            window.chatLayoutProps = null;
        };
    }, [conversations, activeConversation, showSettings, settings, user, isLoading, handleNewConversation, handleSettingsChange]);

    return (
        <>
            <ChatInterface
                key={activeConversation?.id || 'no-suno'}
                agentName="suno_prompt_architect"
                initialConversationId={activeConversation && activeConversation.conversation_id !== 'pending' ? activeConversation.conversation_id : null}
                onConversationCreated={(conversationId) => {
                    if (activeConversation?.id && conversationId && conversationId !== 'pending') {
                        Debate.update(activeConversation.id, { conversation_id: conversationId }).then(() => loadConversations());
                    }
                }}
                welcomeMessage="🎵 **Suno AI Prompt Architect**\n\nJe suis spécialisé dans la création de prompts optimisés pour Suno AI 5.0 Beta, avec une expertise particulière en compositions québécoises authentiques.\n\nDécrivez-moi la chanson que vous voulez créer !"
                settings={settings}
                autoStart={true}
                debateRecord={activeConversation}
                onDebateUpdated={handleDebateUpdated}
            />
        </>
    );
}