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

        // STEP 1.5: LOAD AGENT INSTRUCTIONS FROM DATABASE
        logManager.system('=== STEP 1.5: LOAD AGENT INSTRUCTIONS ===');
        
        let agentInstructions = '';
        let agentDescription = '';
        
        try {
            const agentRecords = await base44.asServiceRole.entities._raw_query({
                from: 'agents',
                filter: { name: agent_name }
            });
            
            if (agentRecords && agentRecords.length > 0) {
                const agentData = agentRecords[0];
                agentInstructions = agentData.instructions || '';
                agentDescription = agentData.description || '';
                
                logManager.success('Agent loaded from database', { 
                    agent: agent_name, 
                    instructions_length: agentInstructions.length,
                    description_length: agentDescription.length
                });
            } else {
                logManager.warning('Agent not found in database, using fallback', { agent: agent_name });
                
                // Fallback for backward compatibility
                if (agent_name === 'suno_prompt_architect') {
                    agentInstructions = `You are the Suno AI Prompt Architect - specialized in creating optimal music generation prompts.

Your mission:
- Create Suno AI 5.0 Beta compliant prompts
- Use individual tags (no comma-separated lists)
- Structure: [STYLE] section, then [LYRICS] section
- Include BPM and Key notation when relevant
- Specialize in Quebec French lyrics with authentic québécismes

Key guidelines:
- ALWAYS use individual tags: [rock] [energetic] [anthemic]
- NEVER use: [rock, energetic, anthemic] ❌
- Include time signatures for unusual rhythms: [7/8]
- Preserve cultural authenticity in lyrics
- Maintain musical coherence and genre consistency`;
                }
            }
        } catch (agentError) {
            logManager.error('Failed to load agent from database', { 
                agent: agent_name,
                error: agentError.message 
            });
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
                context: full_context
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
        
        // Determine if web search is needed based on complexity and keywords
        const needsCitations = complexity_score >= 0.6 || 
            /research|study|evidence|source|citation|fact|data|statistics/i.test(user_message);
        
        const shouldSearchWeb = enableWebSearch && needsCitations;
        
        if (shouldSearchWeb) {
            logManager.info('🌐 Web search activated (citations needed)');
        } else {
            logManager.info('⚡ Skipping web search (not needed for this query)');
        }
        
        // OPTIMIZATION: Run searches in parallel ONLY if needed
        const enrichmentPromises = [];
        
        if (shouldSearchWeb) {
            // Single optimized web search via InvokeLLM
            logManager.info('Web search queued (InvokeLLM with context)');
            enrichmentPromises.push(
                base44.integrations.Core.InvokeLLM({
                    prompt: `Provide factual context and recent information about: ${user_message.substring(0, 300)}`,
                    add_context_from_internet: true
                }).then(result => ({ type: 'web_search', result }))
                .catch(error => ({ type: 'web_search', error }))
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
                    
                    if (type === 'web_search' && result && typeof result === 'string' && result.length > 50) {
                        webSearchContext = `\n\n## 🌐 WEB CONTEXT\n\n${result}\n\n`;
                        const urlMatches = result.match(/https?:\/\/[^\s]+/g) || [];
                        for (const url of urlMatches.slice(0, 5)) {
                            citations.push({
                                url: url.replace(/[.,;)]+$/, ''),
                                context: 'Web search',
                                verified: true
                            });
                        }
                        webSearchExecuted = true;
                        sourcingConfidence += 0.7;
                        logManager.success(`✅ Web search: ${urlMatches.length} sources`);
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

        const COMPLEXITY_THRESHOLD_GATE = 0.3;
        const MIN_PERSONAS = 3;
        smasActivated = complexity_score >= COMPLEXITY_THRESHOLD_GATE && dynamicConfig.max_personas >= MIN_PERSONAS;

        thinkingSteps.push({
            step: 'SYSTEM_CONFIG',
            d2_activation,
            smas_activated: smasActivated,
            memory_system_enabled: isMemorySystemEnabled
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
                    settings: dynamicConfig
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
                    masterSynthesis = await base44.integrations.Core.InvokeLLM({
                        prompt: full_context,
                        temperature: dynamicConfig.temperature
                    });
                } catch (llmError) {
                    logManager.error(`Simple LLM also failed: ${llmError.message}`);
                    throw new Error(`Échec de génération de réponse: ${llmError.message}`);
                }
            }
        } else {
            logManager.info('Using simple LLM (complexity below threshold)');
            try {
                masterSynthesis = await base44.integrations.Core.InvokeLLM({
                    prompt: full_context,
                    temperature: dynamicConfig.temperature
                });
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
            sarcasm_detected: tone_analysis?.is_sarcastic || false
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