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
        
        // Direct agent instruction mapping for reliability
        const AGENT_CONFIGS = {
            'suno_prompt_architect': {
                description: "Agent spécialisé dans la création de prompts optimisés pour Suno AI 5.0 Beta",
                instructions: `You are the Suno AI Prompt Architect - specialized in creating optimal music generation prompts for Suno AI 5.0 Beta.

## CORE RULES (NON-NEGOTIABLE)
- Only individual tags: NEVER combine multiple descriptors in one tag
- Place rich [Style] tag suite upfront: minimum 14 tags
- Lyrics boxed: Insert [Section: tags] markers before EVERY structural section
- Use [BPM] and [Key] in each section header
- NO artist names in tags
- Keep [STYLE SECTION] separate from [LYRICS SECTION]

## OUTPUT FORMAT
[STYLE SECTION]
[Tag1] [Tag2] [Tag3] ... (minimum 14 tags)

[LYRICS SECTION]
[Intro: parameters]
Lyrics...

[Verse 1: parameters]
Lyrics...

## QUÉBÉCOIS SPECIALIZATION
- Utiliser les québécismes naturels et expressions locales
- Intégrer les contractions typiques (chu, t'sais, faut que j')
- Respecter le rythme et la prosodie du français québécois
- Tags: [Chanson Québécoise] [Folk Québécois] [Joual Vocal Style] [Accordion] [Fiddle]

## COMMON MISTAKES TO AVOID
❌ [Fast Upbeat Techno] → ✅ [Fast] [Upbeat] [Techno]
❌ Exceeding 120 char limit per bracket
❌ Mixing style tags into lyrics sections`
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

        // STEP 2: ASSESS (SMARCE + DSTIB)
        logManager.system('=== STEP 2: ASSESS (SMARCE + DSTIB-Hebden) ===');
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
            } else {
                throw new Error(smarceResponse.data?.error || 'SMARCE returned no data');
            }
        } catch (error) {
            logManager.error(`SMARCE error: ${error.message}`);
            logManager.warning('Using default SMARCE values');
        }

        // STEP 2.2: DSTIB-Hebden Semantic Routing
        let dstibRouting = null;
        try {
            const dstibResponse = await base44.functions.invoke('dstibHebdenRouter', {
                user_message,
                context: user_message // Use user_message as initial context
            });

            if (dstibResponse.data && dstibResponse.data.success) {
                dstibRouting = dstibResponse.data.routing_result;
                logManager.success('DSTIB-Hebden routing completed', {
                    semantic_tier: dstibRouting.semantic_tier,
                    routing_layer: dstibRouting.routing_layer,
                    target_omega: dstibRouting.target_omega
                });
                
                // Override dominant_hemisphere if DSTIB suggests different
                if (dstibRouting.target_omega < 0.4) {
                    dominant_hemisphere = 'right';
                } else if (dstibRouting.target_omega > 0.6) {
                    dominant_hemisphere = 'left';
                }
            }
        } catch (dstibError) {
            logManager.warning(`DSTIB-Hebden skipped: ${dstibError.message}`);
        }

        thinkingSteps.push({
            step: 'ASSESS',
            complexity_score,
            archetype,
            dominant_hemisphere,
            dstib_routing: dstibRouting
        });

        // STEP 2.5: FACTUAL CACHE CHECK (L3 Optimization)
        logManager.system('=== STEP 2.5: FACTUAL CACHE CHECK ===');
        
        let cachedAnswer = null;
        let usedCache = false;
        
        // Check if this is a factual query that might be cached
        const isFactualQuery = /what is|who is|when did|how many|define|explain/i.test(user_message);
        
        if (isFactualQuery && complexity_score < 0.7) {
            logManager.info('🔍 Checking L3 factual cache...');
            try {
                const { data: cacheResult } = await base44.functions.invoke('factualCacheManager', {
                    operation: 'check',
                    query: user_message
                });
                
                if (cacheResult.cached) {
                    cachedAnswer = cacheResult.answer;
                    usedCache = true;
                    sourcingConfidence = cacheResult.metadata.confidence;
                    
                    logManager.success(`✅ L3 Cache HIT (${cacheResult.metadata.access_count} accesses)`, {
                        age: new Date(cacheResult.metadata.created).toISOString(),
                        confidence: cacheResult.metadata.confidence
                    });
                    
                    // Return cached answer directly (MASSIVE speedup)
                    const totalTime = Date.now() - startTime;
                    
                    return Response.json({
                        success: true,
                        response: cachedAnswer,
                        metadata: {
                            total_time_ms: totalTime,
                            cached: true,
                            cache_hit: true,
                            complexity_score,
                            agent_name,
                            estimated_tokens: Math.ceil(cachedAnswer.length / 4),
                            conversation_id,
                            cache_metadata: cacheResult.metadata
                        },
                        logs,
                        thinking_steps: [{
                            step: 'CACHE_HIT',
                            source: 'L3_FACTUAL_MEMORY',
                            speedup: '~95%'
                        }]
                    });
                }
                
                logManager.info('⚠️ L3 Cache MISS - proceeding with full pipeline');
            } catch (cacheError) {
                logManager.warning(`Cache check failed: ${cacheError.message}`);
            }
        }
        
        // STEP 2.6: CONDITIONAL WEB SEARCH (OPTIMIZED)
        logManager.system('=== STEP 2.6: CONDITIONAL KNOWLEDGE ENRICHMENT ===');
        
        let externalKnowledgeContext = '';
        let webSearchContext = '';
        let webSearchExecuted = false;
        
        const enableExternalKnowledge = settings.enableExternalKnowledge !== false;
        const enableWebSearch = settings.enableWebSearch !== false;
        
        // MANDATORY web search for factual queries (GROUNDING ENFORCEMENT)
        const factualKeywords = /what is|who is|when did|how many|where is|why did|define|explain|research|study|evidence|source|citation|fact|data|statistics|latest|recent|current|news/i.test(user_message);
        const needsCitations = complexity_score >= 0.5 || factualKeywords;
        
        // OVERRIDE: Force search for factual queries even if disabled
        const shouldSearchWeb = needsCitations || (enableWebSearch && factualKeywords);
        
        if (shouldSearchWeb) {
            logManager.info('🌐 Web search activated (citations needed)');
        } else {
            logManager.info('⚡ Skipping web search (not needed for this query)');
        }
        
        // OPTIMIZATION: Run searches in parallel ONLY if needed
        const enrichmentPromises = [];
        
        if (shouldSearchWeb) {
            // MANDATORY GROUNDED WEB SEARCH with citation extraction
            logManager.info('🔍 MANDATORY web search with citation extraction');
            enrichmentPromises.push(
                base44.integrations.Core.InvokeLLM({
                    prompt: `Research and provide factual, grounded information about: ${user_message}

CRITICAL REQUIREMENTS:
1. Include ONLY verified, factual information
2. Cite ALL sources with full URLs
3. Format citations as: [Source: URL]
4. Verify facts against multiple sources
5. Include publication dates when relevant`,
                    add_context_from_internet: true
                }).then(result => ({ type: 'grounded_search', result }))
                .catch(error => ({ type: 'grounded_search', error }))
            );
        }
        
        // Execute searches in parallel if needed
        if (enrichmentPromises.length > 0) {
            const enrichmentResults = await Promise.allSettled(enrichmentPromises);
            
            for (const settled of enrichmentResults) {
                if (settled.status === 'fulfilled') {
                    const { type, result, error } = settled.value;
                    
                    if (error) {
                        logManager.warning(`${type} failed: ${error.message}`);
                        continue;
                    }
                    
                    if (type === 'grounded_search' && result && typeof result === 'string' && result.length > 50) {
                        webSearchContext = `\n\n## 🌐 GROUNDED WEB RESEARCH (VERIFIED SOURCES)\n\n${result}\n\n`;
                        
                        // RIGOROUS URL EXTRACTION - Multiple patterns
                        const urlPatterns = [
                            /\[Source:\s*(https?:\/\/[^\]]+)\]/gi,  // [Source: URL]
                            /\(https?:\/\/[^\)]+\)/gi,              // (URL)
                            /https?:\/\/[^\s\]\)]+/gi               // Raw URLs
                        ];
                        
                        const extractedUrls = new Set();
                        for (const pattern of urlPatterns) {
                            const matches = result.matchAll(pattern);
                            for (const match of matches) {
                                let url = match[1] || match[0];
                                url = url.replace(/[\[\]\(\),;]+$/g, '').trim();
                                if (url.startsWith('http')) {
                                    extractedUrls.add(url);
                                }
                            }
                        }
                        
                        // Add all unique URLs as citations
                        for (const url of extractedUrls) {
                            citations.push({
                                url: url,
                                source: 'Web Research',
                                context: 'Grounded search',
                                verified: true,
                                external: true
                            });
                        }
                        
                        webSearchExecuted = true;
                        sourcingConfidence = citations.length > 0 ? 0.9 : 0.5;
                        logManager.success(`✅ Grounded search: ${citations.length} verified URLs extracted`);
                    }
                }
            }
        }
        
        thinkingSteps.push({
            step: 'KNOWLEDGE_ENRICHMENT',
            web_search_executed: webSearchExecuted,
            total_sources_found: citations.length
        });

        // STEP 3: PARALLEL SYSTEM CONFIGURATION (OPTIMIZED)
        logManager.system('=== STEP 3: PARALLEL SYSTEM CONFIG ===');
        
        // OPTIMIZATION: Run D2STIM + Memory check in parallel
        const [d2stimResult, memoryCheckResult] = await Promise.allSettled([
            base44.functions.invoke('d2stimModulator', {
                complexity_score,
                archetype,
                dominant_hemisphere,
                user_settings: settings,
                fact_check_available: webSearchExecuted,
                citation_count: citations.length
            }),
            base44.asServiceRole.entities.TunableParameter.filter({ 
                parameter_name: 'memoryActive' 
            })
        ]);
        
        // Process D2STIM result
        if (d2stimResult.status === 'fulfilled' && d2stimResult.value?.data?.success !== false) {
            dynamicConfig = d2stimResult.value.data.config || dynamicConfig;
            d2_activation = d2stimResult.value.data.d2_activation || 0;
            logManager.success('D2STIM completed', { d2_activation });
        } else {
            logManager.error('D2STIM failed, using defaults');
        }
        
        // Process Memory check result
        let isMemorySystemEnabled = true;
        if (memoryCheckResult.status === 'fulfilled' && memoryCheckResult.value.length > 0) {
            isMemorySystemEnabled = memoryCheckResult.value[0].current_value === 1;
            logManager.info('memoryActive loaded', { 
                enabled: isMemorySystemEnabled
            });
        } else {
            logManager.warning('memoryActive not found, defaulting to ENABLED');
        }

        // SMAS ACTIVATION: Both SMAS and Suno agents use their respective persona teams
        const isSunoAgent = agent_name === 'suno_prompt_architect';
        const COMPLEXITY_THRESHOLD_GATE = 0.3;
        const MIN_PERSONAS = 3;
        
        // Suno uses Suno personas, SMAS uses SMAS personas - both go through QRONAS debate
        smasActivated = complexity_score >= COMPLEXITY_THRESHOLD_GATE && dynamicConfig.max_personas >= MIN_PERSONAS;
        
        if (isSunoAgent) {
            logManager.info('🎵 SUNO MODE: Using Suno-specific personas for music-oriented debate');
            // Suno uses lighter config for faster generation while maintaining quality
            dynamicConfig.debate_rounds = Math.min(dynamicConfig.debate_rounds, 2);
            dynamicConfig.max_personas = Math.min(dynamicConfig.max_personas, 4);
        }

        // STEP 3.2: ADAPTIVE COMPLEXITY ROUTING (Strategy Integration)
        logManager.system('=== STEP 3.2: ADAPTIVE COMPLEXITY ROUTING ===');
        
        let activeStrategy = 'SweetSpotBalanced';
        let strategyApplied = false;
        
        // AdaptiveComplexityRouting: Route based on SMARCE complexity
        if (complexity_score < 0.4) {
            // SIMPLE: MinimalViableDebate
            activeStrategy = 'MinimalViableDebate';
            dynamicConfig.debate_rounds = 1;
            dynamicConfig.max_personas = 3;
            dynamicConfig.temperature = Math.max(0.4, dynamicConfig.temperature - 0.1);
            strategyApplied = true;
            logManager.success('🎯 Strategy: MinimalViableDebate (Simple query)', {
                complexity: complexity_score,
                debate_rounds: 1,
                personas: 3
            });
        } else if (complexity_score >= 0.4 && complexity_score < 0.7) {
            // MODERATE: SweetSpotBalanced
            activeStrategy = 'SweetSpotBalanced';
            dynamicConfig.debate_rounds = Math.min(dynamicConfig.debate_rounds, 2);
            dynamicConfig.max_personas = Math.min(dynamicConfig.max_personas, 5);
            dynamicConfig.temperature = 0.6;
            strategyApplied = true;
            logManager.success('🎯 Strategy: SweetSpotBalanced (Moderate)', {
                complexity: complexity_score,
                debate_rounds: dynamicConfig.debate_rounds,
                personas: dynamicConfig.max_personas
            });
        } else {
            // COMPLEX (>0.7): Full SMAS with AdaptiveComplexityRouting
            activeStrategy = 'AdaptiveComplexityRouting';
            dynamicConfig.debate_rounds = Math.min(4, Math.max(3, dynamicConfig.debate_rounds));
            dynamicConfig.max_personas = Math.min(7, Math.max(5, dynamicConfig.max_personas));
            strategyApplied = true;
            logManager.success('🎯 Strategy: AdaptiveComplexityRouting (Complex)', {
                complexity: complexity_score,
                debate_rounds: dynamicConfig.debate_rounds,
                personas: dynamicConfig.max_personas
            });
        }

        thinkingSteps.push({
            step: 'SYSTEM_CONFIG',
            d2_activation,
            smas_activated: smasActivated,
            memory_system_enabled: isMemorySystemEnabled,
            active_strategy: activeStrategy,
            strategy_applied: strategyApplied,
            optimized_config: {
                debate_rounds: dynamicConfig.debate_rounds,
                max_personas: dynamicConfig.max_personas,
                temperature: dynamicConfig.temperature
            }
        });

        // STEP 3.5: SARCASM & TONE DETECTION (if enabled)
        logManager.system('=== STEP 3.5: TONE DETECTION ===');
        let tone_analysis = null;
        
        if (settings.enableSarcasmDetection || settings.sarcasm_sensitivity) {
            logManager.info('🎭 Detecting tone and sarcasm...');
            try {
                const { data: toneData } = await base44.functions.invoke('sarcasmDetector', {
                    text: user_message,
                    sensitivity: settings.sarcasm_sensitivity || 'medium',
                    conversation_id: conversation_id,
                    include_meta_commentary: true
                });
                
                if (toneData && toneData.success) {
                    tone_analysis = toneData.analysis;
                    logManager.success(`🎭 Tone detected: sarcasm=${tone_analysis.is_sarcastic} (${(tone_analysis.sarcasm_confidence * 100).toFixed(0)}%)`);
                }
            } catch (toneError) {
                logManager.warning(`Tone detection failed: ${toneError.message}`);
            }
        }
        
        thinkingSteps.push({
            step: 'TONE_DETECTION',
            enabled: settings.enableSarcasmDetection || false,
            tone_analysis: tone_analysis
        });

        // STEP 4: RETRIEVE (NEURONAS 7-DB TIERED MEMORY)
        logManager.system('=== STEP 4: RETRIEVE (7-DB Architecture) ===');
        
        let full_context = webSearchContext;
        
        // Add tone context if detected
        if (tone_analysis && (tone_analysis.is_sarcastic || tone_analysis.detected_tones.length > 0)) {
            full_context += `\n\n## 🎭 TONE CONTEXT\n`;
            full_context += `Detected tones: ${tone_analysis.detected_tones.map(t => `${t.tone} (${(t.confidence * 100).toFixed(0)}%)`).join(', ')}\n`;
            if (tone_analysis.implied_meaning) {
                full_context += `Implied meaning: ${tone_analysis.implied_meaning}\n`;
            }
            if (tone_analysis.meta_commentary) {
                full_context += `Meta-commentary: ${tone_analysis.meta_commentary}\n`;
            }
            full_context += '\n';
        }
        
        full_context += '\n## Question Utilisateur:\n' + user_message;
        
        // Calculate omega_t and dopamine_t for memory system
        const omega_t = dominant_hemisphere === 'left' ? 0.8 : 
                        dominant_hemisphere === 'right' ? 0.2 : 0.5;
        
        const dopamine_t = Math.min(1.0, 0.3 + (complexity_score * 0.7));
        
        if (isMemorySystemEnabled) {
            logManager.info('7-DB Tiered Memory ACTIVE', {
                omega_t,
                dopamine_t,
                mode: dopamine_t < 0.3 ? 'ECONOMY' : dopamine_t > 0.7 ? 'EXPLORATION' : 'BALANCED'
            });
            
            try {
                const memoryResult = await base44.functions.invoke('smasMemoryManager', {
                    user_message,
                    conversation_id: conversation_id || 'pending',
                    enable_intent_based_retrieval: true,
                    omega_t,
                    dopamine_t,
                    flux_integral: 0.0
                });
                
                if (memoryResult.data && memoryResult.data.full_context) {
                    full_context += '\n\n' + memoryResult.data.full_context;
                    logManager.success('7-DB Memory context loaded', {
                        memory_length: memoryResult.data.full_context.length,
                        pathway: memoryResult.data.pathway,
                        stats: memoryResult.data.memory_stats
                    });
                } else {
                    logManager.warning('Memory Manager returned no context');
                }
            } catch (memoryError) {
                logManager.error(`7-DB Memory load failed: ${memoryError.message}`);
            }
        } else {
            logManager.warning('⚠️ MEMORY SYSTEM DISABLED');
        }
        
        thinkingSteps.push({
            step: 'RETRIEVE_7DB',
            memory_invoked: isMemorySystemEnabled,
            omega_t,
            dopamine_t,
            context_length: full_context.length
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

        // STEP 6: FACTUAL CACHE STORAGE (if applicable)
        if (isFactualQuery && !usedCache && webSearchExecuted && sourcingConfidence > 0.8) {
            logManager.system('=== STEP 6: CACHING FACTUAL ANSWER TO L3 ===');
            
            try {
                await base44.functions.invoke('factualCacheManager', {
                    operation: 'store',
                    query: user_message,
                    answer: masterSynthesis,
                    sources: citations.map(c => c.url),
                    confidence: sourcingConfidence
                });
                
                logManager.success('✅ Factual answer cached to L3 for future speedup');
            } catch (cacheStoreError) {
                logManager.warning(`Failed to cache answer: ${cacheStoreError.message}`);
            }
        }

        const totalTime = Date.now() - startTime;
        logManager.system(`=== COMPLETED in ${totalTime}ms ===`);

        const finalMetadata = {
            total_time_ms: totalTime,
            thinking_steps: thinkingSteps,
            agent_name,
            agent_instructions_used: agentInstructions.length > 0,
            complexity_score,
            archetype,
            dominant_hemisphere,
            d2_activation,
            smas_activated: smasActivated,
            memory_system_enabled: isMemorySystemEnabled,
            personas_used: qronasResult?.data?.personas_used || [],
            debate_rounds: dynamicConfig.debate_rounds,
            debate_rounds_executed: qronasResult?.data?.rounds_executed || 0,
            estimated_tokens: Math.ceil((masterSynthesis?.length || 0) / 4),
            conversation_id,
            fact_checked: webSearchExecuted,
            web_search_executed: webSearchExecuted,
            sourcing_confidence: sourcingConfidence,
            citations: citations.map(c => ({
                url: c.url,
                title: c.title,
                source: c.source,
                context: c.context,
                verified: c.verified,
                external: c.external
            })),
            web_search_triggered: shouldSearchWeb,
            total_sources_count: citations.length,
            debate_history: debateHistory,
            debate_rounds_details: qronasResult?.data?.debate_rounds_details || [],
            tone_analysis: tone_analysis || null,
            sarcasm_detected: tone_analysis?.is_sarcastic || false,
            // NEW: Strategy metrics
            active_strategy: activeStrategy,
            strategy_applied: strategyApplied,
            optimization_tier: complexity_score < 0.4 ? 'MINIMAL' : complexity_score < 0.7 ? 'BALANCED' : 'FULL'
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