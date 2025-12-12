import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SMAS MEMORY MANAGER v2.0
 * Avec Intent-Based Contextual Retrieval
 */

Deno.serve(async (req) => {
    const logs = [];
    
    const logManager = {
        _addLog: (level, message, data = {}) => {
            logs.push({ timestamp: Date.now(), level, message, data });
            console.log(`[SMAS_Memory][${level.toUpperCase()}] ${message}`, data);
        },
        info: (msg, data) => logManager._addLog('info', msg, data),
        success: (msg, data) => logManager._addLog('success', msg, data),
        warning: (msg, data) => logManager._addLog('warning', msg, data),
        error: (msg, data) => logManager._addLog('error', msg, data)
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message, 
            conversation_id = 'pending',
            enable_intent_based_retrieval = true
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                success: false, 
                error: 'user_message is required' 
            }, { status: 400 });
        }

        logManager.info('SMAS Memory Manager started', {
            intent_based: enable_intent_based_retrieval
        });

        let intentAnalysis = null;
        let relevantMemories = [];
        let contextualSnippets = [];

        // ÉTAPE 1: Analyse d'intention (si activée)
        if (enable_intent_based_retrieval) {
            logManager.info('🧠 Analyzing user intent for contextual retrieval');
            
            try {
                const intentResponse = await base44.functions.invoke('intentAnalyzer', {
                    user_message
                });

                if (intentResponse.data && intentResponse.data.success) {
                    intentAnalysis = intentResponse.data.intent_analysis;
                    
                    logManager.success('Intent analysis completed', {
                        primary: intentAnalysis.primary_intent,
                        confidence: intentAnalysis.confidence_score,
                        requires_memory: intentAnalysis.requires_memory
                    });
                } else {
                    logManager.warning('Intent analysis failed, continuing with basic retrieval');
                }
            } catch (intentError) {
                logManager.warning(`Intent analysis error: ${intentError.message}`);
            }
        }

        // ÉTAPE 2: Chargement mémoire L1 (immédiate - toujours)
        logManager.info('Loading L1 memory (immediate context)');
        
        const l1Memories = await base44.entities.UserMemory.filter({
            tier_level: 1
        }, '-last_accessed', 50);

        logManager.success(`Loaded ${l1Memories.length} L1 memories`);

        // ÉTAPE 3: Chargement mémoire L2 (session)
        logManager.info('Loading L2 memory (session context)');
        
        const l2Memories = await base44.entities.UserMemory.filter({
            tier_level: 2
        }, '-access_count', 30);

        logManager.success(`Loaded ${l2Memories.length} L2 memories`);

        // ÉTAPE 4: Récupération contextuelle intelligente L3 (long-term)
        if (intentAnalysis && intentAnalysis.requires_memory) {
            logManager.info('🎯 Intent-based L3 memory retrieval activated');
            
            const keyTopics = intentAnalysis.key_topics || [];
            const domainHints = intentAnalysis.domain_hints || [];
            const extractedEntities = intentAnalysis.extracted_entities || {};
            
            // Construire requête de recherche sémantique
            const searchTerms = [
                ...keyTopics,
                ...domainHints,
                ...(extractedEntities.technical || []),
                ...(extractedEntities.concepts || [])
            ].filter(Boolean);

            logManager.info(`Searching L3 with ${searchTerms.length} semantic terms`);

            // Recherche par correspondance de contenu
            const l3MemoriesPromises = searchTerms.slice(0, 5).map(async (term) => {
                try {
                    const memories = await base44.entities.UserMemory.filter({
                        tier_level: 3,
                        memory_content: { "$regex": term, "$options": "i" }
                    }, '-d2_modulation', 5);
                    return memories;
                } catch (e) {
                    return [];
                }
            });

            const l3Results = await Promise.all(l3MemoriesPromises);
            const l3Memories = l3Results.flat().filter((mem, idx, arr) => 
                arr.findIndex(m => m.id === mem.id) === idx
            );

            logManager.success(`Retrieved ${l3Memories.length} contextually relevant L3 memories`);
            relevantMemories = l3Memories;
        } else {
            // Fallback: récupération L3 standard (plus récents)
            logManager.info('Standard L3 memory retrieval');
            
            const l3Memories = await base44.entities.UserMemory.filter({
                tier_level: 3
            }, '-last_accessed', 20);

            relevantMemories = l3Memories;
        }

        // ÉTAPE 5: Scoring et tri des mémoires pertinentes
        const allMemories = [...l1Memories, ...l2Memories, ...relevantMemories];
        
        if (intentAnalysis) {
            logManager.info('Scoring memories based on intent relevance');
            
            // Simple scoring basé sur correspondance de mots-clés
            const scoredMemories = allMemories.map(mem => {
                let relevanceScore = mem.d2_modulation || 0.5;
                
                // Boost si topics correspondants
                const memContent = mem.memory_content.toLowerCase();
                const keyTopics = intentAnalysis.key_topics || [];
                
                keyTopics.forEach(topic => {
                    if (memContent.includes(topic.toLowerCase())) {
                        relevanceScore += 0.1;
                    }
                });
                
                // Boost si type de mémoire correspond à l'intention
                if (intentAnalysis.primary_intent === 'TECHNICAL_ASSISTANCE' && 
                    mem.memory_type === 'project') {
                    relevanceScore += 0.15;
                }
                
                if (intentAnalysis.primary_intent === 'LEARNING' && 
                    mem.memory_type === 'learning_point') {
                    relevanceScore += 0.15;
                }
                
                return {
                    ...mem,
                    computed_relevance: Math.min(1, relevanceScore)
                };
            });
            
            // Trier par pertinence
            scoredMemories.sort((a, b) => b.computed_relevance - a.computed_relevance);
            
            contextualSnippets = scoredMemories.slice(0, 15);
            
            logManager.success(`Selected ${contextualSnippets.length} most relevant memories`);
        } else {
            // Sans analyse d'intention, prendre les plus récents/importants
            contextualSnippets = allMemories.slice(0, 15);
        }

        // ÉTAPE 6: Récupération de snippets de conversations passées pertinentes
        let relevantConversationSnippets = [];
        
        if (intentAnalysis && intentAnalysis.requires_memory) {
            logManager.info('Searching relevant past conversations');
            
            try {
                const debates = await base44.entities.Debate.list('-created_date', 20);
                
                if (debates.length > 0) {
                    // Filtrer conversations pertinentes basé sur topics
                    const keyTopics = intentAnalysis.key_topics || [];
                    
                    relevantConversationSnippets = debates
                        .filter(debate => {
                            const topic = (debate.topic || '').toLowerCase();
                            return keyTopics.some(kw => topic.includes(kw.toLowerCase()));
                        })
                        .slice(0, 3)
                        .map(debate => ({
                            conversation_id: debate.conversation_id,
                            topic: debate.topic,
                            created: debate.created_date,
                            relevance: 'topic_match'
                        }));
                    
                    logManager.success(`Found ${relevantConversationSnippets.length} relevant past conversations`);
                }
            } catch (debateError) {
                logManager.warning(`Failed to retrieve past conversations: ${debateError.message}`);
            }
        }

        // ÉTAPE 7: Charger System Memory (toujours)
        logManager.info('Loading System Memory');
        
        const systemMemories = await base44.entities.SystemMemory.filter({
            tier_level: 1
        }, '-d2_modulation', 10);

        logManager.success(`Loaded ${systemMemories.length} system memories`);

        // ÉTAPE 8: Construire contexte complet
        let full_context = '';

        // System Memory (toujours en premier)
        if (systemMemories.length > 0) {
            full_context += '\n## 🧬 Mémoire Système (Identité Neuronas)\n\n';
            systemMemories.forEach(mem => {
                full_context += `- ${mem.memory_content}\n`;
            });
        }

        // Contextual User Memories
        if (contextualSnippets.length > 0) {
            full_context += '\n## 💾 Contexte Pertinent de l\'Utilisateur\n\n';
            contextualSnippets.slice(0, 10).forEach(mem => {
                const relevanceLabel = mem.computed_relevance 
                    ? ` (pertinence: ${(mem.computed_relevance * 100).toFixed(0)}%)`
                    : '';
                full_context += `- [${mem.memory_type}]${relevanceLabel} ${mem.memory_content}\n`;
            });
        }

        // Past Conversations Snippets
        if (relevantConversationSnippets.length > 0) {
            full_context += '\n## 🔗 Conversations Passées Pertinentes\n\n';
            relevantConversationSnippets.forEach(snippet => {
                full_context += `- "${snippet.topic}" (${new Date(snippet.created).toLocaleDateString()})\n`;
            });
        }

        // Intent-based guidance for personas
        if (intentAnalysis && intentAnalysis.suggested_personas) {
            full_context += '\n## 🎭 Personas Suggérées pour ce Contexte\n\n';
            intentAnalysis.suggested_personas.slice(0, 5).forEach(persona => {
                full_context += `- ${persona.persona_type} (pertinence: ${(persona.relevance_score * 100).toFixed(0)}%): ${persona.reasoning}\n`;
            });
        }

        // ÉTAPE 9: Mise à jour access_count sur les mémoires utilisées
        logManager.info('Updating memory access counts');
        
        const updatePromises = contextualSnippets.slice(0, 10).map(async (mem) => {
            try {
                await base44.entities.UserMemory.update(mem.id, {
                    access_count: (mem.access_count || 0) + 1,
                    last_accessed: new Date().toISOString()
                });
            } catch (e) {
                // Silently fail
            }
        });
        
        await Promise.allSettled(updatePromises);

        logManager.success('SMAS Memory Manager completed', {
            total_context_length: full_context.length,
            memories_used: contextualSnippets.length,
            intent_based: !!intentAnalysis
        });

        return Response.json({
            success: true,
            full_context,
            memory_stats: {
                l1_count: l1Memories.length,
                l2_count: l2Memories.length,
                l3_count: relevantMemories.length,
                system_count: systemMemories.length,
                contextual_snippets: contextualSnippets.length,
                past_conversations: relevantConversationSnippets.length
            },
            intent_analysis: intentAnalysis,
            logs
        });

    } catch (error) {
        logManager.error(`Fatal error: ${error.message}`, { stack: error.stack });
        
        return Response.json({
            success: false,
            error: error.message,
            full_context: '',
            logs
        }, { status: 500 });
    }
});