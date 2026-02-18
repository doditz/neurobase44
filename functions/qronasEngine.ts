import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * QRONAS - Quantum-Symbolic Reasoning Core v6.0 (Agent Instructions Integration)
 *
 * NEW: Integrates agent-specific instructions into persona prompts
 * - Receives agent_name and agent_instructions from chatOrchestrator
 * - Passes agent instructions to personaTeamOptimizer for context-aware selection
 * - Prepends agent instructions to each persona prompt for compliance
 */

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function withTimeout(promise, timeoutMs, errorMessage) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
}

// ===================================================================
// MAIN DENO SERVE FUNCTION
// ===================================================================

Deno.serve(async (req) => {
    const log = [];
    const logManager = {
        _log: log,
        _formatEntry: (level, msg, data) => {
            let entry = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
            if (data) {
                try {
                    entry += ` - ${JSON.stringify(data)}`;
                } catch (e) {
                    entry += ` - (Failed to stringify data)`;
                }
            }
            return entry;
        },
        system: (msg, data) => {
            const entry = logManager._formatEntry('SYSTEM', msg, data);
            logManager._log.push(entry);
            console.log(`[QRONAS] ${entry}`);
        },
        info: (msg, data) => {
            const entry = logManager._formatEntry('INFO', msg, data);
            logManager._log.push(entry);
            console.log(`[QRONAS] ${entry}`);
        },
        warning: (msg, data) => {
            const entry = logManager._formatEntry('WARNING', msg, data);
            logManager._log.push(entry);
            console.log(`[QRONAS] ${entry}`);
        },
        success: (msg, data) => {
            const entry = logManager._formatEntry('SUCCESS', msg, data);
            logManager._log.push(entry);
            console.log(`[QRONAS] ${entry}`);
        },
        error: (msg, data) => {
            const entry = logManager._formatEntry('ERROR', msg, data);
            logManager._log.push(entry);
            console.error(`[QRONAS] ${entry}`);
        },
        getFormattedLogs: () => logManager._log,
        getLogs: () => logManager._log
    };

    try {
        logManager.system('=== QRONAS ENGINE START v6.0 ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            logManager.error('Unauthorized');
            return Response.json({ error: 'Unauthorized', success: false, logs: logManager.getFormattedLogs() }, { status: 401 });
        }

        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            logManager.error(`Invalid JSON - ${parseError.message}`);
            return Response.json({ error: 'Invalid JSON', success: false, logs: logManager.getFormattedLogs() }, { status: 400 });
        }

        const {
            prompt,
            agent_name = 'smas_debater',
            agent_instructions = '',
            max_paths = 5,
            debate_rounds = 3,
            temperature = 0.7,
            archetype = 'balanced',
            dominant_hemisphere = 'central',
            needs_citations = false,
            citation_enforcement_strict = false,
            settings = {},
            file_urls = []  // VISION SUPPORT: Accept file URLs for image analysis
        } = requestData;

        logManager.info(`User: ${user.email}, Agent: ${agent_name}, Prompt: "${prompt.substring(0, 50)}..."`);
        logManager.info('Agent instructions received', {
            has_instructions: agent_instructions.length > 0,
            instructions_length: agent_instructions.length,
            preview: agent_instructions.substring(0, 150) + '...'
        });
        logManager.info('Configuration', {
            max_personas: max_paths,
            debate_rounds,
            temperature,
            archetype,
            dominant_hemisphere,
            citation_enforcement_strict,
            has_vision_files: file_urls && file_urls.length > 0,
            vision_file_count: file_urls?.length || 0
        });

        // Validation du nombre minimum de personas
        const MIN_PERSONAS_FOR_DEBATE = 3;
        if (max_paths < MIN_PERSONAS_FOR_DEBATE) {
            logManager.warning(`Insufficient personas (${max_paths} < ${MIN_PERSONAS_FOR_DEBATE}) - Debate may be suboptimal`);
        }

        // ÉTAPE 0.5: DSTIB-Hebden Semantic Routing (if not provided by caller)
        let dstib_routing = settings.dstib_routing || null;
        if (!dstib_routing) {
            try {
                const dstibResponse = await base44.functions.invoke('dstibHebdenRouter', {
                    user_message: prompt
                });
                if (dstibResponse.data && dstibResponse.data.success) {
                    dstib_routing = dstibResponse.data.routing_result;
                    logManager.success('DSTIB routing obtained', {
                        semantic_tier: dstib_routing.semantic_tier,
                        routing_layer: dstib_routing.routing_layer
                    });
                }
            } catch (dstibError) {
                logManager.warning(`DSTIB routing skipped: ${dstibError.message}`);
            }
        }

        // ÉTAPE 1: Sélection des Personas (with agent context + DSTIB suggestions)
        logManager.info('Selecting personas with agent context + DSTIB');

        const personaSelectionResult = await base44.functions.invoke('personaTeamOptimizer', {
            prompt: prompt,
            agent_name: agent_name,
            archetype,
            dominant_hemisphere,
            max_personas: max_paths,
            settings: {
                ...settings,
                dstib_routing,
                suggested_personas: dstib_routing?.suggested_personas || []
            }
        });

        if (!personaSelectionResult.data || !personaSelectionResult.data.success) {
            throw new Error(`Persona selection failed: ${personaSelectionResult.data?.error || 'Unknown error'}`);
        }

        const selectedPersonas = personaSelectionResult.data.team;

        logManager.success(`Selected ${selectedPersonas.length} personas`, {
            personas: selectedPersonas.map(p => p.name),
            min_required: MIN_PERSONAS_FOR_DEBATE,
            meets_minimum: selectedPersonas.length >= MIN_PERSONAS_FOR_DEBATE
        });

        if (selectedPersonas.length < MIN_PERSONAS_FOR_DEBATE) {
            logManager.warning(`⚠️ BELOW MINIMUM PERSONAS: Only ${selectedPersonas.length} personas selected (minimum: ${MIN_PERSONAS_FOR_DEBATE})`);
        }

        // STEP 2: Initialize SMAS Dynamics
        logManager.info('Initializing SMAS dynamics (hemispheric forces, dopamine, etc.)');
        
        let D_t = settings.d2_activation || 0.5; // Initial dopamine level
        let D_history = [D_t];
        let omega_t = 0.5; // Initial hemispheric balance
        const D_events = []; // Track significant events
        
        // STEP 3: Multi-Round Debate with Agent Instructions Integration
        const debateHistory = [];
        const extractedCitations = [];
        const dynamicsHistory = [];
        let activePersonas = [...selectedPersonas]; // Track active personas
        const personaAdjustments = []; // Track all adjustments made

        for (let round = 0; round < debate_rounds; round++) {
            logManager.info(`Starting debate round ${round + 1}/${debate_rounds}`);

            // DYNAMIC ADAPTATION: Check personas after round 1
            if (round > 0) {
                logManager.info('🔄 Activating Dynamic Persona Adapter');
                try {
                    const adapterResult = await base44.functions.invoke('dynamicPersonaAdapter', {
                        current_personas: activePersonas,
                        debate_history: debateHistory,
                        current_round: round,
                        prompt,
                        archetype,
                        dominant_hemisphere,
                        agent_name
                    });

                    if (adapterResult.data && adapterResult.data.success) {
                        const { adjustments, summary } = adapterResult.data;

                        logManager.success(`Adapter: ${summary.adjusting} adjusted, ${summary.removing} removed, ${summary.adding} added`);

                        // Apply adjustments
                        for (const adjustment of adjustments) {
                            if (adjustment.type === 'REMOVE') {
                                activePersonas = activePersonas.filter(p => p.handle !== adjustment.handle);
                                logManager.warning(`Removed ${adjustment.persona}: ${adjustment.reason}`);
                            } else if (adjustment.type === 'ADJUST') {
                                const persona = activePersonas.find(p => p.handle === adjustment.handle);
                                if (persona) {
                                    persona.instructions_for_system = adjustment.adjusted_instructions;
                                    logManager.success(`Adjusted ${adjustment.persona}: ${adjustment.reason}`);
                                }
                            } else if (adjustment.type === 'ADD') {
                                activePersonas.push(adjustment.persona_data);
                                logManager.success(`Added ${adjustment.persona}: ${adjustment.reason}`);
                            }

                            personaAdjustments.push({
                                round,
                                ...adjustment
                            });
                        }
                    }
                } catch (adapterError) {
                    logManager.warning(`Dynamic adapter failed: ${adapterError.message}`);
                }
            }

            const roundStart = Date.now();
            const roundResponses = [];

            // Calculate hemisphere dynamics for this round (using ACTIVE personas)
            const hemisphereDynamics = await base44.functions.invoke('hemisphereDynamics', {
                personas_active: activePersonas.map(p => p.handle),
                prompt_complexity: settings.complexity_score || 0.5,
                debate_history: debateHistory,
                current_time: Date.now()
            });
            
            const { F_L, F_R } = hemisphereDynamics.data || { F_L: 0.5, F_R: 0.5 };

            // PARALLEL EXECUTION: Run all personas simultaneously for speed
            const personaPromises = activePersonas.map(async (persona) => {
                // CRITICAL: Prepend agent instructions to ensure compliance
                const agentInstructionsBlock = agent_instructions ? `
## 🎯 AGENT MISSION & GUIDELINES (${agent_name.toUpperCase()})

${agent_instructions}

**YOUR ROLE:** You MUST strictly follow the above agent guidelines while applying your persona expertise below.

---

` : '';

                const personaPrompt = `${agentInstructionsBlock}## 📋 CONTEXT AND QUESTION

${prompt}

## 👤 YOUR ROLE: ${persona.name} (${persona.domain})

**Your specific instructions:**
${persona.instructions_for_system || persona.default_instructions || 'Apply your domain expertise to address the question comprehensively.'}

**Debate History:**
${debateHistory.map(h => `- [R${h.round} ${h.persona}]: ${h.response.substring(0, 200)}...`).join('\n')}

${citation_enforcement_strict ? `
**⚠️ STRICT CITATION RULES (MANDATORY):**
1. EVERY factual claim MUST be followed by [Source: URL or context]
2. If no source available, prefix claim with "HYPOTHESIS:" or "REASONING:"
3. Unsourced claims will be heavily penalized
4. Perfect example: "AI progressed 40% in 2024 [Source: UNESCO 2024 report]"
5. If concept repeated, CITE it first time then reference without re-citing
` : needs_citations ? `
**Citation Guidelines (Strongly Recommended):**
Cite your sources when available with [Source: URL or context] to strengthen your arguments.
` : `
**Guidelines:**
Provide your unique perspective and argue clearly.
`}

Provide your unique perspective in ${Math.max(100, 300 - round * 50)} words.
This is Round ${round + 1} of the debate.
`;

                try {
                    // VISION SUPPORT: Include file_urls for personas to analyze images
                    const llmParams = {
                        prompt: personaPrompt,
                        temperature,
                        add_context_from_internet: false
                    };
                    
                    // Add file_urls for vision analysis if present (only first round to save time)
                    if (file_urls && file_urls.length > 0 && round === 0) {
                        llmParams.file_urls = file_urls;
                        logManager.info(`🖼️ ${persona.name} analyzing ${file_urls.length} image(s)`);
                    }
                    
                    const response = await base44.integrations.Core.InvokeLLM(llmParams);

                    // Extract citations from response
                    const citationMatches = response.match(/\[Source:\s*([^\]]+)\]/g) || [];
                    citationMatches.forEach(match => {
                        const source = match.replace(/\[Source:\s*/, '').replace(/\]/, '');
                        extractedCitations.push({
                            source,
                            persona: persona.name,
                            round: round + 1,
                            context: `Debate round ${round + 1}`
                        });
                    });

                    return {
                        success: true,
                        persona: persona.name,
                        response,
                        citations_count: citationMatches.length,
                        time_ms: Date.now() - roundStart
                    };
                } catch (personaError) {
                    logManager.error(`Persona ${persona.name} failed in round ${round + 1}: ${personaError.message}`);
                    return {
                        success: false,
                        persona: persona.name,
                        response: `(Error: ${personaError.message.substring(0, 100)})`,
                        citations_count: 0,
                        time_ms: Date.now() - roundStart,
                        error: true
                    };
                }
            });
            
            // Wait for all personas to complete in parallel
            const personaResults = await Promise.all(personaPromises);
            
            // Process results
            for (const result of personaResults) {
                roundResponses.push({
                    persona: result.persona,
                    response: result.response,
                    citations_count: result.citations_count
                });
                
                debateHistory.push({
                    round: round + 1,
                    persona: result.persona,
                    response: result.response,
                    time_ms: result.time_ms,
                    error: result.error || false
                });
            }

            // PARALLEL DYNAMICS: Calculate bias, dopamine, and global state simultaneously
            const successRate = roundResponses.filter(r => !r.error).length / activePersonas.length;
            
            const [biasResult, dopamineResult] = await Promise.all([
                base44.functions.invoke('biasRewardCalculator', {
                    personas_active: activePersonas.map(p => p.handle),
                    debate_round_contributions: roundResponses.map(r => ({
                        persona_handle: activePersonas.find(p => p.name === r.persona)?.handle,
                        quality_score: 0.7,
                        relevance: 0.8
                    }))
                }).catch(() => ({ data: { B_t: 0 } })),
                base44.functions.invoke('dopamineModulator', {
                    D_current: D_t,
                    D_history,
                    events: [...D_events, { time: Date.now(), magnitude: successRate, type: 'debate_round_completed' }],
                    current_time: Date.now()
                }).catch(() => ({ data: { D_t, D_history } }))
            ]);
            
            const B_t = biasResult.data?.B_t || 0;
            D_t = dopamineResult.data?.D_t || D_t;
            D_history = dopamineResult.data?.D_history || D_history;
            D_events.push({ time: Date.now(), magnitude: successRate, type: 'debate_round_completed' });
            
            // Calculate global state G(t)
            const globalState = await base44.functions.invoke('globalStateCalculator', {
                F_L,
                F_R,
                B_t,
                D_t,
                omega_current: omega_t,
                Phi_t: 0
            }).catch(() => ({ data: { omega: omega_t, G_t: 0.5 } }));
            
            omega_t = globalState.data?.omega || omega_t;
            const G_t = globalState.data?.G_t || 0.5;
            
            dynamicsHistory.push({
                round: round + 1,
                F_L,
                F_R,
                B_t,
                D_t,
                omega_t,
                G_t,
                breakdown: globalState.data?.breakdown
            });
            
            logManager.success(`Round ${round + 1} completed: ${roundResponses.length} responses (parallel), ${roundResponses.reduce((sum, r) => sum + r.citations_count, 0)} citations.`);
            logManager.info(`Dynamics: G(t)=${G_t.toFixed(3)}, D(t)=${D_t.toFixed(3)}, ω(t)=${omega_t.toFixed(3)}`);
        }

        // STEP 3: Magistral Synthesis with Citation Preservation
        logManager.info('Generating magistral synthesis with citations');

        const synthesisPrompt = `You are the Magistral Synthesizer. Analyze this multi-perspective debate and create a masterful, coherent, and engaging synthesis based on the interventions of different personas.

**Complete Debate (${debateHistory.length} interventions):**
${debateHistory.map(h => `
---
[${h.persona} - Round ${h.round}]
${h.response}
`).join('\n')}
---

${needs_citations ? `
**CITATION AND STRUCTURE IMPERATIVES:**
- Preserve ALL citations [Source: ...] exactly as provided in the debate. Do not modify them.
- Integrate them fluidly into the synthesis.
- Start with a clear introduction, followed by thematic sections that integrate and contrast persona perspectives.
- Conclude with key points and implications.
- The synthesis must reflect all arguments and evidence presented.
` : `
**Synthesis Objectives:**
- Create a coherent synthesis integrating all perspectives.
- Summarize key arguments and points of disagreement/consensus.
- The synthesis should be informative and well-structured.
`}

**Conciseness and Fluidity Guidelines:**
- Avoid repetition. Each point should be made once.
- Maintain argumentative richness while being concise.
- Structure text with clear titles and subtitles.
- Limit length to approximately ${Math.max(600, 400 + debate_rounds * 100)} words for quality synthesis.
`;

        const masterSynthesis = await withTimeout(
            base44.integrations.Core.InvokeLLM({
                prompt: synthesisPrompt,
                temperature: temperature * 0.85,
                add_context_from_internet: false
            }),
            30000,
            'Final synthesis timeout'
        );

        logManager.success('Synthesis completed', {
            length: masterSynthesis.length,
            total_citations: extractedCitations.length
        });
        
        // MANDATORY: Grounded Validation with Web Search
        logManager.info('Performing mandatory grounded validation');
        const groundedValidation = await base44.functions.invoke('groundedValidationEngine', {
            response_text: masterSynthesis,
            validation_mode: citation_enforcement_strict ? 'strict' : 'moderate'
        });
        
        const { Phi_t, validation_passed, validation_results } = groundedValidation.data || { 
            Phi_t: 0, 
            validation_passed: true,
            validation_results: []
        };
        
        logManager.success('Grounded validation completed', {
            Phi_t: Phi_t.toFixed(3),
            validation_passed,
            claims_validated: validation_results?.length || 0
        });
        
        // Recalculate final G(t) with Phi_t from validation
        const finalGlobalState = await base44.functions.invoke('globalStateCalculator', {
            F_L: dynamicsHistory[dynamicsHistory.length - 1]?.F_L || 0.5,
            F_R: dynamicsHistory[dynamicsHistory.length - 1]?.F_R || 0.5,
            B_t: dynamicsHistory[dynamicsHistory.length - 1]?.B_t || 0,
            D_t,
            omega_current: omega_t,
            Phi_t
        });
        
        const final_G_t = finalGlobalState.data?.G_t || 0.5;

        return Response.json({
            success: true,
            synthesis: masterSynthesis,
            agent_name,
            agent_instructions_used: agent_instructions.length > 0,
            personas_used: selectedPersonas.map(p => p.name),
            personas_initially_selected: selectedPersonas.length,
            personas_final_active: activePersonas.length,
            personas_count: activePersonas.length,
            rounds_executed: debate_rounds,
            meets_min_personas: activePersonas.length >= MIN_PERSONAS_FOR_DEBATE,
            persona_adjustments: personaAdjustments,
            dynamic_adaptation_enabled: true,
            citations: extractedCitations,
            citation_enforcement: citation_enforcement_strict,
            debate_history: debateHistory,
            smas_dynamics: {
                final_G_t,
                final_D_t: D_t,
                final_omega_t: omega_t,
                final_Phi_t: Phi_t,
                dynamics_history: dynamicsHistory,
                validation_passed,
                validation_results
            },
            logs: logManager.getLogs()
        });

    } catch (error) {
        logManager.error(`FATAL ERROR in qronasEngine: ${error.message}`, { stack: error.stack });
        return Response.json({
            error: error.message,
            success: false,
            logs: logManager.getFormattedLogs(),
            stack: error.stack
        }, { status: 500 });
    }
});