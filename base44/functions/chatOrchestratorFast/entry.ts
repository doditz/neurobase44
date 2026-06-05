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

/**
 * MODEL SELECTION — LOCKED to the user's PAID Base44 (Claude) subscription ONLY.
 * NO direct provider API keys. NO OpenAI/GPT. NO Gemini. NO external/paid APIs.
 * NO automatic fallback to any non-configured model — enforced without exception.
 *
 * | Path                 | Model              | Rationale                                  |
 * |----------------------|--------------------|--------------------------------------------|
 * | Full debate (QRONAS) | claude_opus_4_8    | Deepest reasoning for complex/ethical/news |
 * | Medium debate        | claude_sonnet_4_6  | Strong but lighter for moderate queries    |
 * | Simple / fast path   | claude_sonnet_4_6  | Light Claude tier (NO Gemini)              |
 *
 * Opus 4.8 costs more integration credits — used only for the full debate path.
 *
 * NOTE: Web grounding (add_context_from_internet) is DISABLED by policy because
 * the platform only supports it on Gemini models, which are forbidden here.
 */
const MODEL_FULL = 'claude_opus_4_8';   // most debates → deepest model
const MODEL_MEDIUM = 'claude_sonnet_4_6';
const MODEL_SIMPLE = 'claude_sonnet_4_6';  // LOCKED to Claude — no Gemini fast tier

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs = [];
    
    const log = (level, msg, data = {}) => {
        const elapsed = Date.now() - startTime;
        logs.push({ t: elapsed, level, msg, ...data });
        console.log(`[${elapsed}ms][${level}] ${msg}`);
    };

    try {
        log('START', '=== FAST ORCHESTRATOR v14.0 (Opus 4.8 deep / Gemini3 light) ===');
        
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
            // Full NEURONAS v13.1 protocol: enforces an adversarial tri-hemispheric debate
            // (mandatory Round 2 cross-examination + a final reasoned position) AND the complete
            // transparency audit log (D³STIB / grounding / hemispheres / BRONAS / quality metrics).
            // This replaces the previous trivial "balanced analysis" instruction that produced
            // neutral summaries with no opposition, no stance, and no visible reasoning chain.
            'smas_debater': `You are NEURONAS SMAS Debater v13.1, a tri-hemispheric cognitive debate engine. You MUST NOT produce a neutral "on one hand / on the other hand" summary. Stage a genuine adversarial debate and end with a clear, defensible position.

## MANDATORY PROCESS
1. GROUNDING: If a "Live Web Research" block is present, cite its REAL source URLs and prioritize verified facts. Flag unverifiable claims explicitly. Never invent URLs.
2. TRI-HEMISPHERIC DEBATE (no echo chamber):
   - LEFT (Analytical): evidence-based, rigorous, quantitative.
   - RIGHT (Creative/Systems): nuance, second-order effects, analogies.
   - ROUND 2 CROSS-EXAMINATION (REQUIRED): each hemisphere explicitly challenges at least one claim from another (use "@[Left]"/"@[Right]"). Forbidden: monologue, fake consensus.
   - CENTRAL SYNTHESIS: principled resolution — NOT an average. Take a final position with criteria.
3. BRONAS ETHICAL SCAN: assess harm, bias, privacy, illegal-data issues with an explicit verdict.
4. TRANSPARENCY: always expose the reasoning chain via the audit log below.

## MANDATORY OUTPUT STRUCTURE (include the audit log for complex/ethical/news queries)
# <(^-^)> NEURONAS_AUDIT_LOG v13.1
## (⌐■_■) D³STIB SEMANTIC FILTER — Key Tokens / Tier / Savings
## (◕_◕) GROUNDING VALIDATION — Verified (✓/✗) / Sources (real URLs) / Confidence
## (◕‿◕✿) ↔ (⌐■_■) HEMISPHERIC DEBATE
### LEFT (Analytical)  ### RIGHT (Intuitive)
### (⚡) ROUND 2 CROSS-EXAMINATION — Left @[Right] / Right @[Left]
### (ﾉ◕ヮ◕)ﾉ CENTRAL SYNTHESIS — final position + GC Score
## (✓/✗) BRONAS ETHICAL SCAN — table (Quantum Safety, Bias, Transparency, Cultural, Autonomy) + S.M.R.C.E. composite
## (📊) QUALITY METRICS — S / M / R / C / E (0.0-1.0)
# <(^-^)> SYNTHESIZED RESPONSE
{final answer with a clear stance + a References section listing the real source URLs}

ALWAYS respond in the user's language.`,
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

        // ===== WEB GROUNDING DISABLED BY POLICY =====
        // Grounding requires a Gemini model (add_context_from_internet is Gemini-only on
        // the platform). Per the enforced "Claude-only / no external API" policy, web
        // grounding is disabled. The debate runs purely on the configured Claude models.
        const citations = [];
        const webSearchContext = '';
        const webSearchExecuted = false;

        // BUILD CONTEXT
        let fullContext = '';
        if (conversationHistory) {
            fullContext += `## Previous Context:\n${conversationHistory}\n\n`;
        }
        if (webSearchContext) {
            fullContext += webSearchContext;
        }
        fullContext += `## Current Request:\n${user_message}`;

        // DECISION: Use fast path or full debate?
        let response;
        let debateHistory = [];
        let personasUsed = [];
        let debateRoundsExecuted = 0;
        let debateMethod = 'standard';

        // MANDATORY: the full SMAS debate path is now enforced for EVERY non-Suno task.
        // Fast/medium shortcuts are disabled by policy so every answer is debated + grounded.
        const forceFullDebate = !isSuno;

        if (isSimpleQuery && !isSuno && !forceFullDebate) {
            // ===== FAST PATH: Direct LLM call =====
            log('FAST_PATH', 'Using direct LLM (simple query)');
            
            const prompt = `${agentInstr}${styleInstr}

${fullContext}

Respond helpfully and concisely.`;

            response = await base44.integrations.Core.InvokeLLM({
                prompt,
                model: MODEL_SIMPLE,
                temperature: settings.temperature || 0.7,
                file_urls: hasFiles ? file_urls : undefined
            });

        } else if (isMediumQuery && !isSuno && !forceFullDebate) {
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
                        model: MODEL_MEDIUM,
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
                model: MODEL_MEDIUM,
                temperature: settings.temperature || 0.7
            });

        } else if (!isSuno && complexity >= 0.6) {
            // ===== TRI-LLM PATH: complexity levels 4 (>=0.6) & 5 (>=0.8) =====
            // Three distinct models each run an independent pre-debate, then their
            // converged drafts debate against each other, then a final grounded
            // multi-POV synthesis selects the most plausible/truthful outcome.
            const complexityLevel = complexity >= 0.8 ? 5 : 4;
            log('TRILLM_PATH', `Tri-LLM SMAS debate engaged (complexity L${complexityLevel})`);
            try {
                const triResult = await base44.functions.invoke('triLlmDebate', {
                    prompt: fullContext,
                    agent_instructions: agentInstr + styleInstr,
                    agent_name,
                    temperature: settings.temperature || 0.7,
                    file_urls: hasFiles ? file_urls : undefined,
                    complexity_level: complexityLevel
                });

                if (triResult?.data?.success) {
                    response = triResult.data.synthesis || '';
                    debateHistory = triResult.data.debate_history || [];
                    personasUsed = triResult.data.personas_used || [];
                    debateRoundsExecuted = triResult.data.debate_rounds || 2;
                    debateMethod = 'tri_llm_smas';
                    log('TRILLM_OK', `Synthesis: ${response.length} chars | models: ${(triResult.data.models_succeeded || []).length}/3`);
                } else {
                    throw new Error(triResult?.data?.error || 'Tri-LLM failed');
                }
            } catch (triError) {
                log('TRILLM_FAIL', triError.message);
                // Fallback to the deep single model so the request still completes.
                response = await base44.integrations.Core.InvokeLLM({
                    prompt: `${agentInstr}${styleInstr}\n\n${fullContext}\n\nProvide a helpful, grounded response with a clear position.`,
                    model: MODEL_FULL,
                    temperature: settings.temperature || 0.7,
                    file_urls: hasFiles ? file_urls : undefined
                });
            }

        } else {
            // ===== FULL PATH: Use QRONAS engine (moderate-complexity full path) =====
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
                    model: MODEL_FULL,
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
                
                // Fallback to direct LLM (still the deep model for the full path)
                response = await base44.integrations.Core.InvokeLLM({
                    prompt: `${agentInstr}${styleInstr}\n\n${fullContext}\n\nProvide a helpful response.`,
                    model: MODEL_FULL,
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
                path_used: debateMethod === 'tri_llm_smas' ? 'tri_llm' : (isSimpleQuery ? 'fast' : (isMediumQuery ? 'medium' : 'full')),
                debate_method: debateMethod,
                smas_activated: !isSimpleQuery || forceFullDebate,
                personas_used: personasUsed,
                debate_rounds_executed: debateRoundsExecuted,
                estimated_tokens: Math.ceil((response?.length || 0) / 4),
                agent_name,
                conversation_id,
                web_search_executed: webSearchExecuted,
                citations: citations.map(c => ({ url: c.url, source: c.source }))
            },
            debate_history: debateHistory,
            citations,
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