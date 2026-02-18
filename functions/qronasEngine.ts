import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * QRONAS Engine v7.0 - Optimized for Speed
 * - Direct DB access for personas
 * - Parallel LLM calls
 * - Inline dynamics calculations
 */

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs = [];
    const log = (level, msg) => {
        logs.push(`[${Date.now() - startTime}ms] [${level}] ${msg}`);
        console.log(`[QRONAS] ${msg}`);
    };

    try {
        log('INFO', '=== QRONAS v7.0 START ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }

        const requestData = await req.json();
        const {
            prompt,
            agent_name = 'smas_debater',
            agent_instructions = '',
            max_paths = 3,
            debate_rounds = 2,
            temperature = 0.7,
            file_urls = [],
            conversation_history = ''
        } = requestData;
        
        // Log if we have conversation history for context
        if (conversation_history) {
            log('INFO', `Conversation history loaded: ${conversation_history.length} chars`);
        }

        // Store agent instructions for synthesis phase
        const hasAgentInstructions = agent_instructions && agent_instructions.length > 0;
        const hasConversationHistory = conversation_history && conversation_history.length > 0;

        log('INFO', `Agent: ${agent_name}, Rounds: ${debate_rounds}, MaxPersonas: ${max_paths}`);

        // STEP 1: Load personas directly (no external function call)
        const isSunoAgent = agent_name === 'suno_prompt_architect';
        let personas = [];
        
        try {
            const systemFilter = isSunoAgent ? 'Suno' : 'SMAS';
            const dbPersonas = await base44.asServiceRole.entities.Persona.filter({
                status: 'Active',
                system: { "$in": [systemFilter, 'Shared'] }
            });
            
            if (dbPersonas.length > 0) {
                personas = dbPersonas
                    .sort((a, b) => (b.priority_level || 5) - (a.priority_level || 5))
                    .slice(0, max_paths);
                log('SUCCESS', `Loaded ${personas.length} personas from DB`);
            }
        } catch (e) {
            log('WARNING', `DB load failed: ${e.message}`);
        }
        
        // Fallback personas
        if (personas.length === 0) {
            personas = isSunoAgent ? [
                { name: 'LyricistAI', domain: 'Lyrics', default_instructions: 'Write compelling lyrics.' },
                { name: 'GenreExpertAI', domain: 'Genres', default_instructions: 'Ensure genre authenticity.' },
                { name: 'CulturalAI', domain: 'Culture', default_instructions: 'Add cultural depth.' }
            ] : [
                { name: 'Expert', domain: 'Analysis', default_instructions: 'Provide expert analysis.' },
                { name: 'Creative', domain: 'Ideas', default_instructions: 'Provide creative perspectives.' },
                { name: 'Critic', domain: 'Review', default_instructions: 'Challenge assumptions.' }
            ];
            log('WARNING', 'Using fallback personas');
        }

        // STEP 2: Multi-round debate with PARALLEL execution
        const debateHistory = [];
        const dynamicsHistory = [];
        let D_t = 0.5;

        for (let round = 0; round < debate_rounds; round++) {
            log('INFO', `Round ${round + 1}/${debate_rounds} - ${personas.length} personas in parallel`);
            
            // Build prompts for all personas - INJECT SUNO INSTRUCTIONS + CONVERSATION HISTORY INTO DEBATE TOPIC
            const personaPromises = personas.map(async (persona) => {
                // Build conversation context prefix if we have history
                const historyContext = hasConversationHistory ? 
                    `## CONVERSATION HISTORY (IMPORTANT - maintain continuity with previous exchanges):\n${conversation_history}\n\n---\n\n` : '';

                // For Suno agent, create specialized debate prompt with format requirements
                let debateTopic;
                if (isSunoAgent && agent_instructions) {
                    debateTopic = `${historyContext}## SUNO 5.0 PROMPT CREATION TASK

### CRITICAL SUNO 5.0 FORMAT RULES (MUST FOLLOW):
${agent_instructions}

### CURRENT USER REQUEST:
${prompt}

### YOUR MISSION as ${persona.name}:
Contribute to creating a Suno-compatible prompt following the EXACT format above.
- Style tags must be INDIVIDUAL (never combine multiple concepts in one bracket)
- Lyrics must include [Section: BPM, Key, Instruments, Dynamics] headers
- NO artist names allowed
- Each bracket max 120 characters
- IMPORTANT: If this is a follow-up request, BUILD ON the previous context!`;
                } else {
                    debateTopic = `${historyContext}## CONTEXT\n${prompt}`;
                }

                const personaPrompt = `${debateTopic}

## YOUR ROLE: ${persona.name} (${persona.domain})
${persona.default_instructions || 'Provide your unique perspective.'}

${debateHistory.length > 0 ? `## Previous contributions:\n${debateHistory.slice(-3).map(h => `- ${h.persona}: ${h.response.substring(0, 150)}...`).join('\n')}` : ''}

Provide your perspective in ${150 - round * 30} words. Round ${round + 1}.`;

                try {
                    const llmParams = { prompt: personaPrompt, temperature };
                    if (file_urls?.length > 0 && round === 0) {
                        llmParams.file_urls = file_urls;
                    }
                    
                    const response = await base44.integrations.Core.InvokeLLM(llmParams);
                    return { persona: persona.name, response, success: true };
                } catch (e) {
                    return { persona: persona.name, response: `Error: ${e.message}`, success: false };
                }
            });

            // Execute all personas in parallel
            const results = await Promise.all(personaPromises);
            
            // Process results
            for (const r of results) {
                debateHistory.push({ round: round + 1, persona: r.persona, response: r.response });
            }

            // Simple dynamics
            const successRate = results.filter(r => r.success).length / personas.length;
            D_t = Math.min(1.0, D_t + successRate * 0.1);
            dynamicsHistory.push({ round: round + 1, D_t, successRate });
            
            log('SUCCESS', `Round ${round + 1}: ${results.filter(r => r.success).length}/${personas.length} success`);
        }

        // STEP 3: Final synthesis WITH AGENT INSTRUCTIONS
        log('INFO', 'Generating synthesis');
        
        // For Suno agent, use specialized synthesis prompt that enforces format
        let synthesisPrompt;
        
        if (isSunoAgent) {
            synthesisPrompt = `You are the Suno AI 5.0 Beta Prompt Architect. You MUST produce a Suno-compatible prompt.

## STRICT OUTPUT FORMAT REQUIRED

**[STYLE SECTION]** (minimum 14 individual tags):
[Genre] [Subgenre] [Mood] [Energy] [Tempo] [Dynamics] [Instrument1] [Instrument2] [Vocal Style] [Production] [Era] [Key] [Time Signature] [More tags...]

**[LYRICS SECTION]**:
[Intro: BPM, Key, Instruments, Dynamics]
Lyrics here...

[Verse 1: BPM, Key, Instruments, Dynamics]
Lyrics here...

[Chorus: BPM, Key, Instruments, Dynamics]
Lyrics here...

[Outro: BPM, Fade Out]
Lyrics here...

---

## USER REQUEST
${prompt}

## DEBATE INSIGHTS TO INTEGRATE
${debateHistory.map(h => `${h.persona}: ${h.response.substring(0, 300)}`).join('\n\n')}

---

## CRITICAL RULES
- Each tag in brackets must be INDIVIDUAL (never [Fast Upbeat] → use [Fast] [Upbeat])
- Never exceed 120 chars per bracket
- NO artist names
- Include [BPM] and [Key] in EVERY section header
- For Québécois: use [Chanson Québécoise] [Folk Québécois] [Joual Vocal Style] [Accordion] [Fiddle]

NOW PRODUCE THE COMPLETE SUNO PROMPT:`;
        } else {
            synthesisPrompt = `${hasAgentInstructions ? `## AGENT INSTRUCTIONS (MUST FOLLOW)\n${agent_instructions}\n\n---\n\n` : ''}## DEBATE CONTRIBUTIONS
${debateHistory.map(h => `[${h.persona}]: ${h.response}`).join('\n\n')}

## USER REQUEST
${prompt}

## YOUR TASK
Create the FINAL response by:
1. Following the AGENT INSTRUCTIONS above precisely
2. Integrating the best insights from all debate contributions
3. Producing a complete, well-structured output

Respond directly with the final output (no meta-commentary).`;
        }

        const synthesis = await base44.integrations.Core.InvokeLLM({
            prompt: synthesisPrompt,
            temperature: isSunoAgent ? 0.8 : temperature * 0.9
        });

        log('SUCCESS', `Synthesis complete: ${synthesis.length} chars`);
        log('INFO', `=== QRONAS COMPLETE in ${Date.now() - startTime}ms ===`);

        return Response.json({
            success: true,
            synthesis,
            agent_name,
            personas_used: personas.map(p => p.name),
            rounds_executed: debate_rounds,
            debate_history: debateHistory,
            smas_dynamics: { final_D_t: D_t, dynamics_history: dynamicsHistory },
            logs
        });

    } catch (error) {
        log('ERROR', `FATAL: ${error.message}`);
        return Response.json({
            error: error.message,
            success: false,
            logs
        }, { status: 500 });
    }
});