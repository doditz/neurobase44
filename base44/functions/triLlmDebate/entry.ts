import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * TRI-LLM SMAS DEBATE ENGINE v1.0 — Base44-native (paid subscription) ONLY
 * ----------------------------------------------------------------------------
 * Used for HIGH-COMPLEXITY tasks (NEURONAS complexity level 4 & 5).
 *
 * THREE-PHASE MULTI-MODEL PROTOCOL:
 *   Phase 1 — INDEPENDENT PRE-DEBATE:
 *     Each of the 3 distinct LLMs (Opus 4.8, Sonnet 4.6, Gemini 3 Flash) runs
 *     its OWN internal tri-hemispheric debate and converges to a single draft.
 *     The models do NOT see each other in this phase (independence preserved).
 *
 *   Phase 2 — CROSS-MODEL ADVERSARIAL DEBATE:
 *     Each model receives the OTHER two models' converged drafts and must
 *     critique/challenge them, defend or revise its own position, and surface
 *     contradictions or blind spots. This is the multi-POV confrontation.
 *
 *   Phase 3 — GROUNDED CONVERGED SYNTHESIS:
 *     A final synthesis pass fuses the three post-cross-examination positions
 *     into the single most plausible / truthful, grounded, multi-POV outcome.
 *
 * All inference is routed exclusively through the user's PAID Base44 sub via
 * Core.InvokeLLM. NO direct provider API keys. NO GPT.
 *
 * CHANGELOG:
 *   v1.0 — Initial tri-LLM 3-phase debate for complexity levels 4 & 5.
 *
 * EXPERT TIP: This runs 3 models across 2 debate phases + 1 synthesis = up to
 * 7 LLM calls. It costs significantly more integration credits and latency.
 * It is gated by the orchestrator to complexity >= 0.6 (L4/L5) only.
 *
 * PITFALL: If a model errors, its draft is marked unavailable and the protocol
 * degrades gracefully to the remaining models (never throws the whole request).
 */

// The three distinct models forming the multi-POV panel (all via paid Base44 sub).
const PANEL = [
    { id: 'opus',   model: 'claude_opus_4_8',   label: 'Opus 4.8 (deep reasoning)' },
    { id: 'sonnet', model: 'claude_sonnet_4_6', label: 'Sonnet 4.6 (balanced analysis)' },
    { id: 'gemini', model: 'gemini_3_flash',    label: 'Gemini 3 Flash (broad/grounded)' }
];

/**
 * Single LLM call via the Base44 built-in model. No API keys, no GPT.
 * @returns {Promise<string>} generated text (empty string on failure-safe paths)
 */
async function invokeLLM(base44, { prompt, model, temperature = 0.7, file_urls }) {
    const params = { prompt, model, temperature };
    if (file_urls?.length > 0) params.file_urls = file_urls;
    const res = await base44.integrations.Core.InvokeLLM(params);
    return typeof res === 'string' ? res : (res?.text || JSON.stringify(res));
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs = [];
    const log = (level, msg) => {
        logs.push({ t: Date.now() - startTime, level, msg });
        console.log(`[TRI-LLM][${level}] ${msg}`);
    };

    try {
        log('START', '=== TRI-LLM SMAS DEBATE v1.0 ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const requestData = await req.json();
        const {
            prompt,                       // full context (incl. grounded web research + history)
            agent_instructions = '',
            temperature = 0.7,
            file_urls = [],
            complexity_level = 4          // 4 or 5 (informational)
        } = requestData;

        if (!prompt?.trim()) {
            return Response.json({ success: false, error: 'prompt required' }, { status: 400 });
        }

        const sysHeader = agent_instructions
            ? `## AGENT INSTRUCTIONS (MUST FOLLOW)\n${agent_instructions}\n\n---\n\n`
            : '';

        // ===== PHASE 1: INDEPENDENT PRE-DEBATE (per model, in parallel) =====
        log('PHASE1', `Independent pre-debate across ${PANEL.length} models (L${complexity_level})`);

        const phase1Prompt = (label) => `${sysHeader}## TASK (full grounded context)
${prompt}

## YOUR ROLE: Independent reasoning model "${label}"
Run your OWN internal tri-hemispheric debate (Analytical vs. Creative/Systems),
cross-examine your own claims, then converge to a SINGLE well-reasoned draft.
- Prioritize verifiable, grounded facts from the context. Flag unverifiable claims.
- Take a clear, defensible position (no neutral fence-sitting).
- This is an INDEPENDENT pass: do not assume any other model's output.
Output your converged draft (~250 words).`;

        const phase1 = await Promise.all(PANEL.map(async (m) => {
            try {
                const draft = await invokeLLM(base44, {
                    prompt: phase1Prompt(m.label),
                    model: m.model,
                    temperature,
                    file_urls
                });
                log('P1_OK', `${m.id}: ${draft.length} chars`);
                return { ...m, draft, ok: true };
            } catch (e) {
                log('P1_FAIL', `${m.id}: ${e.message}`);
                return { ...m, draft: '', ok: false };
            }
        }));

        const available = phase1.filter(p => p.ok && p.draft.length > 20);
        if (available.length === 0) {
            throw new Error('All panel models failed in Phase 1');
        }

        // ===== PHASE 2: CROSS-MODEL ADVERSARIAL DEBATE (per model, in parallel) =====
        log('PHASE2', `Cross-model debate among ${available.length} surviving drafts`);

        const phase2 = await Promise.all(available.map(async (m) => {
            const others = available
                .filter(o => o.id !== m.id)
                .map(o => `### ${o.label} draft:\n${o.draft}`)
                .join('\n\n');

            const p2Prompt = `${sysHeader}## TASK
${prompt}

## YOUR PRIOR DRAFT (${m.label}):
${m.draft}

## COMPETING DRAFTS FROM OTHER MODELS:
${others}

## YOUR JOB (cross-examination round)
1. Explicitly CHALLENGE at least one claim from each competing draft (cite which model).
2. Identify agreements, contradictions, and blind spots across the drafts.
3. Defend OR revise your own position based on the strongest grounded evidence.
4. Conclude with your FINAL position after considering all viewpoints (~220 words).`;

            try {
                const revised = await invokeLLM(base44, {
                    prompt: p2Prompt,
                    model: m.model,
                    temperature: temperature * 0.9
                });
                log('P2_OK', `${m.id}: ${revised.length} chars`);
                return { ...m, revised, ok: true };
            } catch (e) {
                log('P2_FAIL', `${m.id}: ${e.message}`);
                // Fall back to the Phase 1 draft so this POV is not lost.
                return { ...m, revised: m.draft, ok: false };
            }
        }));

        // ===== PHASE 3: GROUNDED CONVERGED SYNTHESIS =====
        log('PHASE3', 'Final grounded multi-POV synthesis');

        const synthInputs = phase2
            .map(m => `### Final position — ${m.label}:\n${m.revised}`)
            .join('\n\n');

        // Synthesis uses the deepest model for the final convergence.
        const synthPrompt = `${sysHeader}## ORIGINAL TASK (full grounded context)
${prompt}

## THREE MODELS' FINAL POSITIONS (after cross-examination)
${synthInputs}

## YOUR TASK — FINAL CONVERGED SYNTHESIS
Produce the SINGLE most plausible, truthful, and GROUNDED multi-POV outcome by:
1. Weighing the three positions by evidence quality and logical rigor (not by vote count).
2. Preserving genuine multi-perspective nuance where the models legitimately diverge.
3. Resolving contradictions in favor of the best-grounded claim; flag remaining uncertainty.
4. Following the AGENT INSTRUCTIONS output structure precisely (audit log + final stance + real source URLs).

Deliver the final answer directly.`;

        const synthesis = await invokeLLM(base44, {
            prompt: synthPrompt,
            model: PANEL[0].model,           // Opus 4.8 for final convergence
            temperature: temperature * 0.85
        });

        log('DONE', `Synthesis: ${synthesis.length} chars in ${Date.now() - startTime}ms`);

        // Build a debate transcript compatible with the chat audit-log UI.
        const debate_history = [
            ...phase1.map(m => ({ round: 1, persona: `[P1] ${m.label}`, response: m.draft || '(model unavailable)' })),
            ...phase2.map(m => ({ round: 2, persona: `[P2] ${m.label}`, response: m.revised || '(model unavailable)' }))
        ];

        return Response.json({
            success: true,
            synthesis,
            method: 'tri_llm_smas',
            models_used: PANEL.map(p => p.label),
            models_succeeded: available.map(p => p.label),
            personas_used: PANEL.map(p => p.label),
            debate_rounds: 2,
            debate_history,
            logs
        });

    } catch (error) {
        log('FATAL', error.message);
        return Response.json({ success: false, error: error.message, logs }, { status: 500 });
    }
});