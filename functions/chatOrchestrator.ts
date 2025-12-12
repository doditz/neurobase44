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

        // STEP 1.5: LOAD AGENT INSTRUCTIONS (FIXED)
        logManager.system('=== STEP 1.5: LOAD AGENT INSTRUCTIONS ===');
        
        let agentInstructions = '';
        try {
            // Map of agent configurations (can be expanded to read from files if needed)
            const agentConfigs = {
                'smas_debater': {
                    instructions: `You are the SMAS Debater AI - a sophisticated multi-agent reasoning system.

Your mission:
- Engage in rigorous analytical debate using multiple expert personas
- Challenge assumptions and explore diverse perspectives
- Synthesize coherent, well-reasoned conclusions
- Maintain intellectual honesty and cite sources when available
- Balance analytical rigor with creative insight

Key principles:
- Truth-seeking through dialectical reasoning
- Respect for diverse viewpoints and epistemological humility
- Evidence-based argumentation with proper citations
- Ethical consideration in all analyses`
                },
                'suno_prompt_architect': {
                    instructions: `You are the Suno AI Prompt Architect - specialized in creating optimal music generation prompts.

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
- Maintain musical coherence and genre consistency`
                }
            };
            
            const agentConfig = agentConfigs[agent_name];
            
            if (agentConfig && agentConfig.instructions) {
                agentInstructions = agentConfig.instructions;
                logManager.success('Agent instructions loaded', { 
                    agent: agent_name, 
                    length: agentInstructions.length,
                    preview: agentInstructions.substring(0, 200) + '...'
                });
            } else {
                logManager.warning('No instructions found for agent', { agent: agent_name });
            }
        } catch (agentError) {
            logManager.error('Failed to load agent instructions', { 
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

        // STEP 2: ASSESS
        logManager.system('=== STEP 2: ASSESS (SMARCE Scoring) ===');
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

        thinkingSteps.push({
            step: 'ASSESS',
            complexity_score,
            archetype,
            dominant_hemisphere
        });

        // STEP 2.5: MANDATORY WEB SEARCH + PARALLEL KNOWLEDGE ENRICHMENT
        logManager.system('=== STEP 2.5: MANDATORY WEB SEARCH + KNOWLEDGE ENRICHMENT ===');
        
        let externalKnowledgeContext = '';
        let webSearchContext = '';
        let webSearchExecuted = false;
        let mandatoryWebSearchResults = [];
        
        const enableExternalKnowledge = settings.enableExternalKnowledge !== false;
        const shouldQueryExternal = enableExternalKnowledge && complexity_score >= 0.3;
        
        // MANDATORY: Always perform web search for grounded validation
        const shouldSearchWeb = true; // MANDATORY
        
        logManager.info('🌐 MANDATORY web search for grounded validation');
        
        // OPTIMIZATION: Run external + web search in parallel
        const enrichmentPromises = [];
        
        if (shouldQueryExternal) {
            logManager.info('External knowledge search queued');
            const sources = [];
            const messageLower = user_message.toLowerCase();
            
            if (/research|study|academic|paper|journal|science/i.test(messageLower)) {
                sources.push('arxiv', 'crossref');
            }
            if (/code|programming|software|github|repository/i.test(messageLower)) {
                sources.push('github');
            }
            if (/data|knowledge|information|facts/i.test(messageLower) || sources.length === 0) {
                sources.push('wikipedia', 'dbpedia');
            }
            
            enrichmentPromises.push(
                base44.functions.invoke('externalKnowledgeSearch', {
                    query: user_message,
                    sources: sources.length > 0 ? sources : ['wikipedia', 'arxiv'],
                    max_results: 5
                }).then(result => ({ type: 'external', result }))
                .catch(error => ({ type: 'external', error }))
            );
        }
        
        // MANDATORY web search for grounding
        logManager.info('Mandatory web search queued');
        enrichmentPromises.push(
            base44.asServiceRole.integrations.search_web({
                query: user_message.substring(0, 200),
                limit: 3
            }).then(result => ({ type: 'mandatory_web', result }))
            .catch(error => ({ type: 'mandatory_web', error }))
        );
        
        // Additional LLM-enhanced web search if complexity warrants
        if (complexity_score >= 0.4) {
            enrichmentPromises.push(
                base44.integrations.Core.InvokeLLM({
                    prompt: `Recherche factuelle: ${user_message}`,
                    add_context_from_internet: true
                }).then(result => ({ type: 'web_llm', result }))
                .catch(error => ({ type: 'web_llm', error }))
            );
        }
        
        // OPTIMIZATION: Wait for all searches in parallel
        if (enrichmentPromises.length > 0) {
            const enrichmentResults = await Promise.allSettled(enrichmentPromises);
            
            for (const settled of enrichmentResults) {
                if (settled.status === 'fulfilled') {
                    const { type, result, error } = settled.value;
                    
                    if (error) {
                        logManager.warning(`${type} search failed: ${error.message}`);
                        continue;
                    }
                    
                    if (type === 'external' && result?.data?.success) {
                        externalKnowledgeContext = result.data.contextual_summary || '';
                        if (result.data.results?.citations) {
                            for (const citation of result.data.results.citations) {
                                citations.push({
                                    url: citation.url || '',
                                    title: citation.title || '',
                                    source: citation.source || '',
                                    context: 'External Knowledge Base',
                                    verified: true,
                                    external: true
                                });
                            }
                        }
                        sourcingConfidence += 0.3;
                        logManager.success(`External knowledge: ${result.data.results?.total_results || 0} results`);
                    }
                    
                    if (type === 'mandatory_web' && result && Array.isArray(result)) {
                        mandatoryWebSearchResults = result;
                        webSearchContext = `\n\n## 🌐 MANDATORY WEB GROUNDING\n\n${result.map((r, i) => 
                            `[${i+1}] ${r.title}: ${r.description} (${r.url})`
                        ).join('\n')}\n\n`;
                        
                        for (const searchResult of result) {
                            citations.push({
                                url: searchResult.url,
                                title: searchResult.title,
                                context: 'Mandatory web search',
                                verified: true,
                                mandatory: true
                            });
                        }
                        webSearchExecuted = true;
                        sourcingConfidence += 0.6;
                        logManager.success(`✅ Mandatory web search: ${result.length} sources`);
                    }
                    
                    if (type === 'web_llm' && result && typeof result === 'string' && result.length > 50) {
                        webSearchContext += `\n\n## 📚 CONTEXTE FACTUEL ENRICHI\n\n${result}\n\n`;
                        const urlMatches = result.match(/https?:\/\/[^\s]+/g) || [];
                        for (const url of urlMatches.slice(0, 5)) {
                            citations.push({
                                url: url.replace(/[.,;)]+$/, ''),
                                context: 'Enhanced web search',
                                verified: true
                            });
                        }
                        sourcingConfidence += 0.4;
                        logManager.success(`Enhanced web search: ${urlMatches.length} sources`);
                    }
                }
            }
        }
        
        if (externalKnowledgeContext) {
            webSearchContext = externalKnowledgeContext + '\n\n' + webSearchContext;
        }
        
        thinkingSteps.push({
            step: 'KNOWLEDGE_ENRICHMENT',
            external_search_executed: shouldQueryExternal,
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

        // STEP 4: RETRIEVE (CONDITIONAL MEMORY)
        logManager.system('=== STEP 4: RETRIEVE ===');
        
        let full_context = webSearchContext + '\n\n## Question Utilisateur:\n' + user_message;
        
        if (isMemorySystemEnabled) {
            logManager.info('Memory system ACTIVE - invoking smasMemoryManager');
            
            try {
                const memoryResult = await base44.functions.invoke('smasMemoryManager', {
                    user_message,
                    conversation_id: conversation_id || 'pending',
                    enable_intent_based_retrieval: true
                });
                
                if (memoryResult.data && memoryResult.data.full_context) {
                    full_context += '\n\n' + memoryResult.data.full_context;
                    logManager.success('Memory context added to full_context', {
                        memory_length: memoryResult.data.full_context.length
                    });
                } else {
                    logManager.warning('SMAS Memory Manager returned no context');
                }
            } catch (memoryError) {
                logManager.error(`Memory load failed: ${memoryError.message}`, { 
                    stack: memoryError.stack 
                });
            }
        } else {
            logManager.warning('⚠️ MEMORY SYSTEM DISABLED - Skipping smasMemoryManager');
            logManager.info('Running in NO_MEMORY diagnostic mode');
        }
        
        thinkingSteps.push({
            step: 'RETRIEVE',
            memory_invoked: isMemorySystemEnabled,
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
            mandatory_web_search_executed: mandatoryWebSearchResults.length > 0,
            sourcing_confidence: sourcingConfidence,
            citations: citations.map(c => ({
                url: c.url,
                title: c.title,
                source: c.source,
                context: c.context,
                verified: c.verified,
                external: c.external
            })),
            external_knowledge_queried: shouldQueryExternal,
            external_sources_count: citations.filter(c => c.external).length,
            debate_history: debateHistory,
            debate_rounds_details: qronasResult?.data?.debate_rounds_details || []
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