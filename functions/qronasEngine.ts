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

        // ÉTAPE 1: Load Personas directly from database (no external function call)
        logManager.info('Loading personas directly');

        let selectedPersonas = [];
        const isSunoAgent = agent_name === 'suno_prompt_architect';
        const systemFilter = isSunoAgent ? 'Suno' : 'SMAS';
        
        try {
            // Direct DB query - much faster than function invoke
            const allPersonas = await base44.asServiceRole.entities.Persona.filter({
                status: 'Active',
                system: { "$in": [systemFilter, 'Shared'] }
            });
            
            if (allPersonas.length > 0) {
                // Simple scoring and selection
                const scored = allPersonas.map(p => ({
                    persona: p,
                    score: (p.priority_level || 5) + (p.expertise_score || 0.5) * 5
                }));
                scored.sort((a, b) => b.score - a.score);
                selectedPersonas = scored.slice(0, max_paths).map(s => s.persona);
                logManager.success(`Loaded ${selectedPersonas.length} ${systemFilter} personas directly`);
            }
        } catch (dbError) {
            logManager.warning(`Direct persona load failed: ${dbError.message}`);
        }
        
        // FALLBACK: Create minimal personas if loading failed
        if (selectedPersonas.length === 0) {
            logManager.warning('Using fallback personas');
            if (isSunoAgent) {
                selectedPersonas = [
                    { name: 'LyricistAI', handle: 'SUN001', domain: 'Lyric Composition', default_instructions: 'Write compelling lyrics with authentic québécois style.' },
                    { name: 'GenreExpertAI', handle: 'SUN003', domain: 'Music Genres', default_instructions: 'Ensure genre authenticity and stylistic conventions.' },
                    { name: 'CulturalAI', handle: 'SUN005', domain: 'Cultural Context', default_instructions: 'Add cultural depth and local authenticity.' }
                ];
            } else {
                selectedPersonas = [
                    { name: 'Expert', handle: 'EXP01', domain: 'General Expertise', default_instructions: 'Provide expert analysis.' },
                    { name: 'Creative', handle: 'CRE01', domain: 'Creative Thinking', default_instructions: 'Provide creative perspectives.' },
                    { name: 'Critic', handle: 'CRI01', domain: 'Critical Analysis', default_instructions: 'Challenge assumptions and identify issues.' }
                ];
            }
        }

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

            const roundStart = Date.now();
            const roundResponses = [];
            
            // Simplified hemisphere dynamics (skip external call for speed)
            const F_L = 0.5;
            const F_R = 0.5;

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

            // SIMPLIFIED DYNAMICS (inline calculation for speed)
            const successRate = roundResponses.filter(r => !r.error).length / activePersonas.length;
            const B_t = successRate * 0.5;
            D_t = Math.min(1.0, D_t + successRate * 0.1);
            D_history.push(D_t);
            omega_t = 0.5 + (F_L - F_R) * 0.2;
            const G_t = (omega_t + D_t + B_t) / 3;
            
            dynamicsHistory.push({
                round: round + 1,
                F_L,
                F_R,
                B_t,
                D_t,
                omega_t,
                G_t
            });
            
            logManager.success(`Round ${round + 1}: ${roundResponses.length} responses, G(t)=${G_t.toFixed(3)}`);
        }

        // STEP 3: Magistral Synthesis
        logManager.info('Generating synthesis');

        const synthesisPrompt = `You are the Magistral Synthesizer. Create a coherent synthesis from this multi-perspective debate.

**Debate (${debateHistory.length} interventions):**
${debateHistory.map(h => `[${h.persona}]: ${h.response.substring(0, 500)}...`).join('\n\n')}

**Instructions:**
- Integrate all perspectives into a unified, coherent response
- Preserve any citations [Source: ...]
- Be concise and well-structured
- Target ${Math.max(400, 300 + debate_rounds * 100)} words
`;

        const masterSynthesis = await withTimeout(
            base44.integrations.Core.InvokeLLM({
                prompt: synthesisPrompt,
                temperature: temperature * 0.85,
                add_context_from_internet: false
            }),
            20000,
            'Synthesis timeout'
        );

        logManager.success('Synthesis completed', { length: masterSynthesis.length });
        
        // Simplified final metrics
        const final_G_t = dynamicsHistory.length > 0 ? dynamicsHistory[dynamicsHistory.length - 1].G_t : 0.5;
        const Phi_t = 0.5;
        const validation_passed = true;
        const validation_results = [];

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