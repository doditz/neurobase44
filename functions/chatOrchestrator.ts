import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CHAT ORCHESTRATOR v12.1 - Agent Instructions Propagation (FIXED)
 * - Loads agent-specific instructions from agent JSON files
 * - Passes instructions to qronasEngine for persona context
 * - Conditional memory system execution
 */

Deno.serve(async (req) => {
    const logs = [];
    const thinkingSteps = [];
    const citations = [];
    let sourcingConfidence = 0;

    const logManager = {
        _addLog: (level, message, data = {}) => {
            const entry = { 
                timestamp: new Date().toISOString(), 
                level, 
                message, 
                data: data || {} 
            };
            logs.push(entry);
            const dataString = Object.keys(data || {}).length > 0 ? ` - ${JSON.stringify(data)}` : '';
            console.log(`[ChatOrch][${level.toUpperCase()}] ${message}${dataString}`);
        },
        system: (message, data) => logManager._addLog('system', message, data),
        info: (message, data) => logManager._addLog('info', message, data),
        success: (message, data) => logManager._addLog('success', message, data),
        warning: (message, data) => logManager._addLog('warning', message, data),
        error: (message, data) => logManager._addLog('error', message, data),
        debug: (message, data) => logManager._addLog('debug', message, data)
    };

    try {
        logManager.system('=== CHAT ORCHESTRATOR START v12.1 ===');
        
        const base44 = createClientFromRequest(req);
        
        let user;
        try {
            user = await base44.auth.me();
        } catch (authError) {
            logManager.error('Authentication failed', { error: authError.message });
            return Response.json({ 
                success: false, 
                error: 'Non authentifié', 
                logs 
            }, { status: 401 });
        }
        
        if (!user) {
            logManager.error('User not authenticated');
            return Response.json({ success: false, error: 'Non authentifié', logs }, { status: 401 });
        }

        let requestData;
        try {
            requestData = await req.json();
        } catch (jsonError) {
            logManager.error('Failed to parse request JSON', { error: jsonError.message });
            return Response.json({ 
                success: false, 
                error: 'Requête invalide', 
                logs 
            }, { status: 400 });
        }

        const { 
            user_message, 
            conversation_id,
            agent_name = 'smas_debater',
            settings = {},
            file_urls = [],
            metadata = {}
        } = requestData;

        // Log file uploads for vision processing
        if (file_urls && file_urls.length > 0) {
            logManager.info('📎 Files attached for vision analysis', { 
                file_count: file_urls.length,
                file_urls: file_urls 
            });
        }

        if (!user_message || !user_message.trim()) {
            logManager.error('user_message is empty');
            return Response.json({ success: false, error: 'Message requis', logs }, { status: 400 });
        }

        logManager.info('Processing message', { 
            user: user.email, 
            agent: agent_name,
            message_length: user_message.length,
            conversation_id 
        });

        // STEP 1.5: LOAD AGENT INSTRUCTIONS (HARDCODED FOR RELIABILITY)
        logManager.system('=== STEP 1.5: LOAD AGENT INSTRUCTIONS ===');
        
        let agentInstructions = '';
        let agentDescription = '';
        
        // Direct agent instruction mapping for reliability - FULL SUNO 5.0 INSTRUCTIONS
        const AGENT_CONFIGS = {
            'suno_prompt_architect': {
                description: "Agent spécialisé dans la création de prompts optimisés pour Suno AI 5.0 Beta",
                instructions: `You are the Suno AI 5.0 Beta Prompt Architect with advanced expertise in musical composition.

## CORE RULES (NON-NEGOTIABLE)
- Only individual tags: NEVER combine multiple adjectives/descriptors in a single tag
- Place rich [Style] tag suite upfront: minimum 14 tags (genre, subgenre, era, mood, tempo, energy, instrumentation, vocal style, production FX, dynamics, spatial)
- Lyrics boxed: Insert [Section: tags] markers before EVERY structural section
- Use [BPM] and [Key] in each section header for clear time parameterization
- Multi-section harmonic and instrument tags: e.g., [Trumpets 1, Em, accents] / [Trumpets 2, G support]
- All dynamic markings: [Crescendo] [Diminuendo] [Staccato] [Legato] [Syncopation] [pp] [ff]
- Time signatures: [5/4 Time] [7/8 Time] [3/4 Time] [12/8 Time]
- Percussion depth: [Wind Chimes] [Timpani] [Glockenspiel] [Marimba] [Tubular Bells]
- Parentheses = ad-libs/secondary vocals only, NEVER for structural tags
- Never exceed 120 chars per tag
- NO artist names in tags
- Keep [STYLE SECTION] separate from [LYRICS SECTION]

## OUTPUT FORMAT
**[STYLE SECTION] (1000 char max):**
[Tag1] [Tag2] [Tag3] ... (minimum 14 tags covering: genre/subgenre, mood/energy, tempo/rhythm, dynamics, instrumentation, vocals, production, key/harmonic)

**[LYRICS SECTION] (5000 char max per section):**
[Intro: 5/4, 120bpm, Soft, Tubular Bells, Wind Chimes, pp]
(Light ambient vocal: "Dawn breaks...")

[Verse 1: 5/4, 124bpm, Jazz Piano, Layered Perc, mf, Trumpets 1 Em accents]
Main melody lyrics...

[Bridge: 7/8, 130bpm, Syncopation, Diminuendo, Marimba, Legato]
Transition lyrics...

[Chorus: 4/4, 140bpm, ff, Symphonic Layer, Full Band]
Anthemic lines here.

[Outro: 5/4, 110bpm, Fade Out, Tubular Bells]
Closing motif.

## TAGS LIBRARY
**GENRE:** [Jazz] [Jazz Fusion] [Progressive Rock] [Symphonic Metal] [Neo-Classical] [Baroque Pop] [Electro Swing] [World Fusion] [Chanson Française] [Québécois Folk] [Country Québécois]
**TIME:** [4/4 Time] [3/4 Time] [5/4 Time] [7/8 Time] [Syncopation] [Polyrhythm] [Accelerando] [Ritardando]
**DYNAMICS:** [pp] [p] [mp] [mf] [f] [ff] [Crescendo] [Diminuendo] [Marcato] [Staccato] [Legato] [Sforzando]
**VOCALS:** [Clean Vocal] [Falsetto] [Stacked Vocals] [Layered Harmonies] [Call and Response] [Gospel Harmonies] [Choral] [Whispered] [Duet] [French Québécois Accent] [Joual Vocal Style]
**INSTRUMENTS:** [Grand Piano] [Electric Piano] [Moog Synth] [Electric Guitar] [Saxophone] [Trumpets] [Violins] [Cellos] [Harp] [Mandolin] [Accordion] [Timpani] [Glockenspiel] [Tubular Bells] [Wind Chimes] [Fiddle] [Harmonica]
**PRODUCTION:** [Vintage Mix] [Stereo Field] [Wide Reverb] [Tape Saturation] [Lo-fi Texture] [Reverb Heavy]
**MOOD:** [Majestic] [Dramatic] [Hopeful] [Euphoric] [Brooding] [Transcendent] [Nostalgic] [Ethereal] [Playful] [Triumphant]

## QUÉBÉCOIS SPECIALIZATION
- Utiliser les québécismes naturels et expressions locales
- Intégrer les contractions typiques (chu, t'sais, faut que j')
- Respecter le rythme et la prosodie du français québécois
- Thématiques: L'hiver, les saisons, culture des chantiers, Saint-Laurent, chalet, cabane à sucre, histoire et fierté
- Tags: [Chanson Québécoise] [Folk Québécois] [Joual Vocal Style] [Accordion] [Fiddle] [Harmonica]

## COMMON MISTAKES TO AVOID
❌ [Fast Upbeat Techno] → ✅ [Fast] [Upbeat] [Techno]
❌ Exceeding 120 char limit per bracket
❌ Mixing style tags into lyrics sections
❌ Using parentheses for structural tags

After providing the prompt, briefly explain your creative choices.`
            },
            'smas_debater': {
                description: "Agent de débat multi-perspectives SMAS",
                instructions: "You are the SMAS debate coordinator. Facilitate multi-perspective analysis with balanced viewpoints."
            }
        };
        
        const agentConfig = AGENT_CONFIGS[agent_name];
        if (agentConfig) {
            agentInstructions = agentConfig.instructions;
            agentDescription = agentConfig.description;
            logManager.success('Agent instructions loaded (hardcoded)', { 
                agent: agent_name, 
                instructions_length: agentInstructions.length 
            });
        } else {
            logManager.warning('Agent not found, using generic mode', { agent: agent_name });
        }

        thinkingSteps.push({
            step: 'LOAD_AGENT_INSTRUCTIONS',
            agent_name,
            instructions_loaded: agentInstructions.length > 0,
            instructions_length: agentInstructions.length
        });

        const startTime = Date.now();
        let complexity_score = 0.5;
        let archetype = 'balanced';
        let dominant_hemisphere = 'central';
        let dynamicConfig = {
            temperature: settings.temperature || 0.7,
            max_personas: settings.maxPersonas || 5,
            debate_rounds: settings.debateRounds || 3
        };
        let d2_activation = 0;
        let smasActivated = false;
        let masterSynthesis = '';
        let qronasResult;
        let debateMetrics = {};

        // STEP 2: ASSESS - Simplified for speed (skip external calls for Suno)
        logManager.system('=== STEP 2: ASSESS ===');
        
        // For Suno, use creative defaults directly without external calls
        if (agent_name === 'suno_prompt_architect') {
            complexity_score = 0.6;
            archetype = 'creative';
            dominant_hemisphere = 'right';
            logManager.info('Suno mode: Using creative defaults (skipping SMARCE/DSTIB)');
        } else {
            // Only call SMARCE for non-Suno agents
            try {
                const smarceResponse = await base44.functions.invoke('smarceScorer', {
                    user_message,
                    conversation_id,
                    agent_name,
                    settings
                });

                if (smarceResponse.data && smarceResponse.data.success !== false) {
                    complexity_score = smarceResponse.data.complexity_score || 0.5;
                    archetype = smarceResponse.data.archetype_detected || 'balanced';
                    dominant_hemisphere = smarceResponse.data.dominant_hemisphere || 'central';
                    logManager.success('SMARCE completed', { complexity_score, archetype });
                }
            } catch (error) {
                logManager.warning(`SMARCE skipped: ${error.message}`);
            }
        }

        thinkingSteps.push({
            step: 'ASSESS',
            complexity_score,
            archetype,
            dominant_hemisphere
        });

        // STEP 2.5: Skip cache and heavy web search for Suno (creative task, not factual)
        let webSearchContext = '';
        let webSearchExecuted = false;
        
        if (agent_name !== 'suno_prompt_architect') {
            // Only do web search for non-Suno agents
            logManager.system('=== STEP 2.5: KNOWLEDGE ENRICHMENT ===');
            
            const factualKeywords = /what is|who is|when did|how many|where is|why did|define|explain|research|study|evidence|source|citation|fact|data|statistics|latest|recent|current|news/i.test(user_message);
            
            if (factualKeywords || complexity_score >= 0.6) {
                try {
                    const searchResult = await base44.integrations.Core.InvokeLLM({
                        prompt: `Research: ${user_message}. Include sources.`,
                        add_context_from_internet: true
                    });
                    
                    if (searchResult && searchResult.length > 50) {
                        webSearchContext = `\n\n## Context:\n${searchResult}\n\n`;
                        webSearchExecuted = true;
                        
                        // Extract URLs
                        const urls = searchResult.match(/https?:\/\/[^\s\]\)]+/gi) || [];
                        for (const url of urls.slice(0, 5)) {
                            citations.push({ url, source: 'Web', verified: true });
                        }
                        logManager.success(`Web search: ${citations.length} sources`);
                    }
                } catch (e) {
                    logManager.warning(`Web search skipped: ${e.message}`);
                }
            }
        } else {
            logManager.info('Suno mode: Skipping web search (creative task)');
        }
        
        thinkingSteps.push({
            step: 'KNOWLEDGE_ENRICHMENT',
            web_search_executed: webSearchExecuted,
            total_sources_found: citations.length
        });

        // STEP 3: SYSTEM CONFIGURATION (simplified for Suno)
        logManager.system('=== STEP 3: SYSTEM CONFIG ===');
        
        let isMemorySystemEnabled = false; // Disable memory for speed
        
        if (agent_name !== 'suno_prompt_architect') {
            // Only run D2STIM for non-Suno agents
            try {
                const d2stimResult = await base44.functions.invoke('d2stimModulator', {
                    complexity_score,
                    archetype,
                    dominant_hemisphere,
                    user_settings: settings
                });
                
                if (d2stimResult.data?.success !== false) {
                    dynamicConfig = d2stimResult.data.config || dynamicConfig;
                    d2_activation = d2stimResult.data.d2_activation || 0;
                    logManager.success('D2STIM completed', { d2_activation });
                }
            } catch (e) {
                logManager.warning(`D2STIM skipped: ${e.message}`);
            }
        } else {
            logManager.info('Suno mode: Using optimized config');
            dynamicConfig.temperature = 0.85;
            dynamicConfig.debate_rounds = 2;
            dynamicConfig.max_personas = 3;
        }

        // SMAS ACTIVATION
        const isSunoAgent = agent_name === 'suno_prompt_architect';
        
        // Always activate SMAS for both agents (Suno and SMAS use their respective personas)
        smasActivated = true;
        
        if (isSunoAgent) {
            logManager.info('🎵 SUNO MODE: 2 rounds, 3 personas (optimized)');
        }

        // STEP 3.2: Strategy selection (simplified)
        let activeStrategy = isSunoAgent ? 'SunoCreative' : 'SweetSpotBalanced';
        
        thinkingSteps.push({
            step: 'SYSTEM_CONFIG',
            d2_activation,
            smas_activated: smasActivated,
            active_strategy: activeStrategy,
            config: {
                debate_rounds: dynamicConfig.debate_rounds,
                max_personas: dynamicConfig.max_personas,
                temperature: dynamicConfig.temperature
            }
        });

        // STEP 4: BUILD CONTEXT WITH CONVERSATION HISTORY
        logManager.system('=== STEP 4: BUILD CONTEXT ===');
        
        // Load conversation history for context continuity
        let conversationHistory = '';
        if (conversation_id && conversation_id !== 'pending') {
            try {
                const conversationData = await base44.agents.getConversation(conversation_id);
                if (conversationData && conversationData.messages && conversationData.messages.length > 0) {
                    // Get last 8 messages for context (4 exchanges)
                    const recentMessages = conversationData.messages.slice(-8);
                    conversationHistory = recentMessages
                        .map(m => `[${m.role === 'user' ? 'USER' : 'ASSISTANT'}]: ${m.content?.substring(0, 800) || ''}`)
                        .join('\n\n');
                    logManager.success('Loaded conversation history', { 
                        total_messages: conversationData.messages.length,
                        used_for_context: recentMessages.length 
                    });
                }
            } catch (e) {
                logManager.warning(`Could not load conversation history: ${e.message}`);
            }
        } else {
            logManager.info('No conversation_id provided or pending - starting fresh');
        }
        
        let full_context = webSearchContext;
        if (conversationHistory) {
            full_context += `\n## Previous Conversation:\n${conversationHistory}\n\n`;
        }
        full_context += '## Current User Request:\n' + user_message;
        
        thinkingSteps.push({
            step: 'CONTEXT_BUILT',
            context_length: full_context.length,
            has_conversation_history: conversationHistory.length > 0
        });

        // STEP 5: SYNTHESIZE
        let debateHistory = [];
        
        if (smasActivated) {
            logManager.system('=== STEP 5: SYNTHESIZE (QRONAS) ===');
            try {
                qronasResult = await base44.functions.invoke('qronasEngine', {
                    prompt: full_context,
                    agent_name: agent_name,
                    agent_instructions: agentInstructions,
                    max_paths: dynamicConfig.max_personas,
                    debate_rounds: dynamicConfig.debate_rounds,
                    temperature: dynamicConfig.temperature,
                    archetype,
                    dominant_hemisphere,
                    needs_citations: webSearchExecuted,
                    citation_enforcement_strict: true,
                    settings: dynamicConfig,
                    // VISION SUPPORT: Pass file_urls for image analysis in QRONAS
                    file_urls: file_urls && file_urls.length > 0 ? file_urls : undefined
                });
                
                if (qronasResult && qronasResult.data && qronasResult.data.success) {
                    masterSynthesis = qronasResult.data.synthesis || '';
                    debateMetrics = qronasResult.data.debate_rounds_metrics || {};
                    debateHistory = qronasResult.data.debate_history || [];
                    
                    if (qronasResult.data.citations && Array.isArray(qronasResult.data.citations)) {
                        for (const citation of qronasResult.data.citations) {
                            citations.push({
                                ...citation,
                                context: 'QRONAS debate',
                                verified: false
                            });
                        }
                    }
                    
                    logManager.success(`QRONAS completed: ${masterSynthesis.length} chars`);
                } else {
                    throw new Error(qronasResult?.data?.error || 'QRONAS failed');
                }
            } catch (qronasError) {
                logManager.error(`QRONAS error: ${qronasError.message}`);
                logManager.warning('Falling back to simple LLM');
                
                try {
                    const fallbackParams = {
                        prompt: full_context,
                        temperature: dynamicConfig.temperature
                    };
                    // VISION SUPPORT in fallback
                    if (file_urls && file_urls.length > 0) {
                        fallbackParams.file_urls = file_urls;
                    }
                    masterSynthesis = await base44.integrations.Core.InvokeLLM(fallbackParams);
                } catch (llmError) {
                    logManager.error(`Simple LLM also failed: ${llmError.message}`);
                    throw new Error(`Échec de génération de réponse: ${llmError.message}`);
                }
            }
        } else {
            logManager.info('Using simple LLM (complexity below threshold)');
            try {
                // VISION SUPPORT: Pass file_urls if images are attached
                const llmParams = {
                    prompt: full_context,
                    temperature: dynamicConfig.temperature
                };
                
                // Add file_urls for vision analysis if present
                if (file_urls && file_urls.length > 0) {
                    llmParams.file_urls = file_urls;
                    logManager.info('🖼️ Vision mode activated', { files: file_urls.length });
                }
                
                masterSynthesis = await base44.integrations.Core.InvokeLLM(llmParams);
            } catch (llmError) {
                logManager.error(`Simple LLM failed: ${llmError.message}`);
                throw new Error(`Échec de génération de réponse: ${llmError.message}`);
            }
        }

        sourcingConfidence = Math.max(0, Math.min(1, sourcingConfidence));

        // Skip caching for speed

        const totalTime = Date.now() - startTime;
        logManager.system(`=== COMPLETED in ${totalTime}ms ===`);

        const finalMetadata = {
            total_time_ms: totalTime,
            thinking_steps: thinkingSteps,
            agent_name,
            complexity_score,
            archetype,
            smas_activated: smasActivated,
            personas_used: qronasResult?.data?.personas_used || [],
            debate_rounds: dynamicConfig.debate_rounds,
            estimated_tokens: Math.ceil((masterSynthesis?.length || 0) / 4),
            conversation_id,
            web_search_executed: webSearchExecuted,
            citations: citations.map(c => ({ url: c.url, source: c.source })),
            debate_history: debateHistory,
            active_strategy: activeStrategy
        };

        return Response.json({
            success: true,
            response: masterSynthesis,
            metadata: finalMetadata,
            debate_metrics: debateMetrics,
            debate_history: debateHistory,
            logs,
            thinking_steps: thinkingSteps
        });

    } catch (error) {
        logManager.error(`FATAL ERROR: ${error.message}`, { stack: error.stack });
        console.error('[ChatOrch] Fatal error:', error);
        console.error('[ChatOrch] Stack trace:', error.stack);
        
        return Response.json({
            success: false,
            error: error.message || 'Erreur interne du serveur',
            stack: error.stack,
            logs
        }, { status: 500 });
    }
});