import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CHAT ORCHESTRATOR FAST v13.0 - Optimized for Speed & Fluidity
 * 
 * OPTIMIZATIONS:
 * 1. Skip heavy analysis for simple queries (< 50 words)
 * 2. Parallel execution of all assessments
 * 3. Single LLM call for simple queries (no debate)
 * 4. Reduced debate rounds based on complexity
 * 5. Inline SMARCE/D2STIM (no external calls)
 * 6. Early response pattern - send partial results fast
 */

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs = [];
    
    const log = (level, msg, data = {}) => {
        const elapsed = Date.now() - startTime;
        logs.push({ t: elapsed, level, msg, ...data });
        console.log(`[${elapsed}ms][${level}] ${msg}`);
    };

    try {
        log('START', '=== FAST ORCHESTRATOR v13.0 ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Non authentifié' }, { status: 401 });
        }

        const requestData = await req.json();
        const { 
            user_message, 
            conversation_id,
            agent_name = 'smas_debater',
            settings = {},
            file_urls = [],
        } = requestData;

        if (!user_message?.trim()) {
            return Response.json({ success: false, error: 'Message requis' }, { status: 400 });
        }

        const responseStyle = settings.responseStyle || 'balanced';
        const hasFiles = file_urls?.length > 0;
        
        // FAST PATH DETECTION - Simple queries get instant response
        const wordCount = user_message.split(/\s+/).length;
        const isSimpleQuery = wordCount < 30 && !hasFiles;
        const isMediumQuery = wordCount < 80;
        
        log('ANALYZE', `Words: ${wordCount}, Simple: ${isSimpleQuery}, Medium: ${isMediumQuery}`);

        // Response style instructions (inline)
        const STYLE_INSTRUCTIONS = {
            balanced: '',
            formal: '\nUse professional, structured tone with precise terminology.',
            creative: '\nUse expressive, imaginative tone with metaphors and varied sentence structures.',
            concise: '\nBe direct, use short sentences, avoid redundancy.',
            pedagogical: '\nExplain progressively, use examples, define technical terms.',
            socratic: '\nAsk guiding questions, encourage critical thinking.'
        };

        // Agent instructions (inline for speed)
        const AGENT_INSTRUCTIONS = {
            'smas_debater': 'You are SMAS debate coordinator. Provide balanced, multi-perspective analysis.',
            'suno_prompt_architect': `You are Suno AI 5.0 Prompt Architect.
OUTPUT FORMAT:
**[STYLE SECTION]:** [Tag1] [Tag2] ... (min 14 individual tags)
**[LYRICS SECTION]:**
[Intro: BPM, Key, Instruments]
[Verse 1: BPM, Key, Instruments]
[Chorus: BPM, Key, Instruments]
RULES: Individual tags only, max 120 chars/tag, NO artist names.`
        };

        const styleInstr = STYLE_INSTRUCTIONS[responseStyle] || '';
        const agentInstr = AGENT_INSTRUCTIONS[agent_name] || '';
        const isSuno = agent_name === 'suno_prompt_architect';

        // FAST: Load conversation history in parallel with other prep
        let conversationHistory = '';
        const historyPromise = (async () => {
            if (conversation_id && conversation_id !== 'pending') {
                try {
                    const conv = await base44.agents.getConversation(conversation_id);
                    if (conv?.messages?.length > 0) {
                        const recent = conv.messages.slice(-6);
                        return recent.map(m => `[${m.role}]: ${m.content?.substring(0, 400) || ''}`).join('\n');
                    }
                } catch (e) { /* ignore */ }
            }
            return '';
        })();

        // INLINE COMPLEXITY ANALYSIS (no external call)
        const hasComplexTerms = /algorithm|neural|quantum|philosophy|ethics|architecture|framework|integration|optimization|synthesis/i.test(user_message);
        const hasQuestions = (user_message.match(/\?/g) || []).length;
        const complexity = Math.min(1, (wordCount / 100) + (hasComplexTerms ? 0.25 : 0) + (hasQuestions * 0.08));
        
        // Determine archetype inline
        let archetype = 'balanced';
        if (/create|imagine|design|art|music|story|creative/i.test(user_message)) archetype = 'creative';
        else if (/analyze|calculate|logic|data|evidence|prove/i.test(user_message)) archetype = 'analytical';
        else if (/ethics|moral|fair|right|wrong|should/i.test(user_message)) archetype = 'ethical';

        log('ASSESSED', `Complexity: ${complexity.toFixed(2)}, Archetype: ${archetype}`);

        // Get conversation history (already loading in parallel)
        conversationHistory = await historyPromise;
        if (conversationHistory) {
            log('HISTORY', `Loaded ${conversationHistory.length} chars`);
        }

        // BUILD CONTEXT
        let fullContext = '';
        if (conversationHistory) {
            fullContext += `## Previous Context:\n${conversationHistory}\n\n`;
        }
        fullContext += `## Current Request:\n${user_message}`;

        // DECISION: Use fast path or full debate?
        let response;
        let debateHistory = [];
        let personasUsed = [];
        let debateRoundsExecuted = 0;

        if (isSimpleQuery && !isSuno) {
            // ===== FAST PATH: Direct LLM call =====
            log('FAST_PATH', 'Using direct LLM (simple query)');
            
            const prompt = `${agentInstr}${styleInstr}

${fullContext}

Respond helpfully and concisely.`;

            response = await base44.integrations.Core.InvokeLLM({
                prompt,
                temperature: settings.temperature || 0.7,
                file_urls: hasFiles ? file_urls : undefined
            });

        } else if (isMediumQuery && !isSuno) {
            // ===== MEDIUM PATH: 1 round, 2 personas =====
            log('MEDIUM_PATH', 'Using light debate (1 round, 2 personas)');
            
            const personas = [
                { name: 'Analyst', instruction: 'Provide factual, structured analysis.' },
                { name: 'Synthesizer', instruction: 'Combine perspectives into actionable insights.' }
            ];
            personasUsed = personas.map(p => p.name);
            
            // Single parallel round
            const roundResults = await Promise.all(personas.map(async (p) => {
                const prompt = `${agentInstr}${styleInstr}

${fullContext}

As ${p.name}: ${p.instruction}
Respond in 100 words max.`;
                
                try {
                    const r = await base44.integrations.Core.InvokeLLM({ 
                        prompt, 
                        temperature: settings.temperature || 0.7 
                    });
                    return { persona: p.name, response: r };
                } catch (e) {
                    return { persona: p.name, response: `Error: ${e.message}` };
                }
            }));

            debateHistory = roundResults.map(r => ({ round: 1, persona: r.persona, response: r.response }));
            debateRoundsExecuted = 1;

            // Quick synthesis
            const synthPrompt = `${agentInstr}${styleInstr}

${fullContext}

## Expert Insights:
${roundResults.map(r => `**${r.persona}**: ${r.response}`).join('\n\n')}

Synthesize these insights into a coherent, helpful response.`;

            response = await base44.integrations.Core.InvokeLLM({
                prompt: synthPrompt,
                temperature: settings.temperature || 0.7
            });

        } else {
            // ===== FULL PATH: Use QRONAS engine =====
            log('FULL_PATH', 'Using QRONAS debate engine');
            
            // Adaptive rounds based on complexity
            const adaptiveRounds = isSuno ? 2 : Math.min(Math.ceil(complexity * 3) + 1, settings.debateRounds || 3);
            const adaptivePersonas = isSuno ? 3 : Math.min(Math.ceil(complexity * 4) + 2, settings.maxPersonas || 5);
            
            log('ADAPTIVE', `Rounds: ${adaptiveRounds}, Personas: ${adaptivePersonas}`);

            try {
                const qronasResult = await base44.functions.invoke('qronasEngine', {
                    prompt: fullContext,
                    agent_name,
                    agent_instructions: agentInstr + styleInstr,
                    max_paths: adaptivePersonas,
                    debate_rounds: adaptiveRounds,
                    temperature: settings.temperature || 0.7,
                    file_urls: hasFiles ? file_urls : undefined,
                    conversation_history: conversationHistory
                });

                if (qronasResult?.data?.success) {
                    response = qronasResult.data.synthesis || '';
                    debateHistory = qronasResult.data.debate_history || [];
                    personasUsed = qronasResult.data.personas_used || [];
                    debateRoundsExecuted = qronasResult.data.debate_rounds || adaptiveRounds;
                    log('QRONAS_OK', `Synthesis: ${response.length} chars`);
                } else {
                    throw new Error(qronasResult?.data?.error || 'QRONAS failed');
                }
            } catch (qronasError) {
                log('QRONAS_FAIL', qronasError.message);
                
                // Fallback to direct LLM
                response = await base44.integrations.Core.InvokeLLM({
                    prompt: `${agentInstr}${styleInstr}\n\n${fullContext}\n\nProvide a helpful response.`,
                    temperature: settings.temperature || 0.7,
                    file_urls: hasFiles ? file_urls : undefined
                });
            }
        }

        const totalTime = Date.now() - startTime;
        log('DONE', `Total: ${totalTime}ms`);

        return Response.json({
            success: true,
            response,
            metadata: {
                total_time_ms: totalTime,
                complexity_score: complexity,
                archetype,
                path_used: isSimpleQuery ? 'fast' : (isMediumQuery ? 'medium' : 'full'),
                smas_activated: !isSimpleQuery,
                personas_used: personasUsed,
                debate_rounds_executed: debateRoundsExecuted,
                estimated_tokens: Math.ceil((response?.length || 0) / 4),
                agent_name,
                conversation_id
            },
            debate_history: debateHistory,
            logs
        });

    } catch (error) {
        log('FATAL', error.message);
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});