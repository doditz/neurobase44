import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * TRI-LLM SMAS DEBATE ENGINE v2.0 — 213-PERSONA + SMRCE, CLAUDE-ONLY
 * ----------------------------------------------------------------------------
 * Used for HIGH-COMPLEXITY tasks (NEURONAS complexity level 4 & 5).
 *
 * v2.1 (per enforced policy — Base44 INTERNAL models only, no external paid API):
 *   - The debate is driven by the USER'S 213-PERSONA LIBRARY (Persona entity)
 *     selected by `personaTeamOptimizer` (ARS / SMRCE-weighted), NOT a fixed
 *     3-model panel.
 *   - SMRCE metrics (`smarceScorer`) drive complexity, archetype, hemisphere and
 *     the dynamic team size / temperature.
 *   - triLlmDebate serves the HIGH/EXTREME complexity tier. Model routing:
 *       deep convergence (synthesis) → claude_opus_4_8 ;
 *       persona debate turns        → claude_opus_4_6.
 *     These are Base44 INTERNAL models (no external paid API key). Internal
 *     Gemini 3.1 Pro is reserved for web grounding upstream in the orchestrator.
 *
 * THREE-PHASE PERSONA PROTOCOL:
 *   Phase 1 — INDEPENDENT PERSONA DRAFTS: each selected persona reasons
 *             independently in its own voice/domain (parallel).
 *   Phase 2 — CROSS-EXAMINATION: each persona challenges other personas' drafts
 *             (anti-echo, mandatory).
 *   Phase 3 — GROUNDED CONVERGED SYNTHESIS on the deepest configured model.
 *
 * CHANGELOG:
 *   v2.0 — Replaced fixed 3-model panel with the 213-persona ARS/SMRCE engine;
 *          locked all routing to Claude; removed Gemini.
 *   v1.0 — Initial tri-LLM 3-phase debate (deprecated).
 *
 * PITFALL: If a persona turn errors, its draft is marked unavailable and the
 * protocol degrades gracefully to the remaining personas (never throws).
 */

// Base44 INTERNAL model routing — no external paid API key.
// triLlmDebate = HIGH/EXTREME tier: Opus 4.6 persona turns, Opus 4.8 synthesis.
const MODEL_PERSONA = 'claude_opus_4_6';  // persona debate turns (medium-deep tier)
const MODEL_SYNTH = 'claude_opus_4_8';    // deepest model for final convergence

/**
 * Single LLM call — LOCKED to the configured Claude models via Core.InvokeLLM.
 * No API keys, no GPT, no Gemini. The `model` MUST be one of the locked tiers.
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
        log('START', '=== TRI-LLM SMAS DEBATE v2.1 (canonical ARS policy + D2STIM) ===');

        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const requestData = await req.json();
        const {
            prompt,                       // full context (incl. history)
            agent_instructions = '',
            agent_name = 'smas_debater',
            temperature = 0.7,
            file_urls = [],
            complexity_level = 4,         // 4 or 5 (informational)
            smas_policy = null            // canonical ARS policy from neuronasSmasSpec
        } = requestData;

        if (!prompt?.trim()) {
            return Response.json({ success: false, error: 'prompt required' }, { status: 400 });
        }

        const sysHeader = agent_instructions
            ? `## AGENT INSTRUCTIONS (MUST FOLLOW)\n${agent_instructions}\n\n---\n\n`
            : '';

        // ===== STEP 0: SMRCE SCORING (real metrics drive the debate) =====
        // Uses the existing smarceScorer (archetype, complexity, hemisphere, S.M.R.C.E.).
        let smrce = {
            archetype_detected: 'analytical',
            complexity_score: complexity_level >= 5 ? 0.85 : 0.65,
            dominant_hemisphere: 'central',
            smrce_breakdown: null
        };
        try {
            const smrceRes = await base44.functions.invoke('smarceScorer', { user_message: prompt });
            if (smrceRes?.data?.success) {
                smrce = smrceRes.data;
                log('SMRCE', `archetype=${smrce.archetype_detected} complexity=${smrce.complexity_score} hemi=${smrce.dominant_hemisphere}`);
            }
        } catch (e) {
            log('SMRCE_FAIL', `falling back to defaults: ${e.message}`);
        }

        // ===== CANONICAL team/round counts (smas_run_debate.py:173-192) =====
        // Prefer the ARS policy passed from the orchestrator; fall back to SMRCE.
        const arsTotal = smas_policy?.ars_total ?? smrce.complexity_score;
        const maxPersonas = smas_policy?.persona_count
            ?? Math.min(10, Math.max(3, Math.ceil(3 + arsTotal * 7)));
        const canonicalRounds = smas_policy?.round_count
            ?? (arsTotal < 0.65 ? 5 : (arsTotal < 0.85 ? 7 : 10));
        const omegaT = smas_policy?.omega_t ?? 0.5;
        const minDivergence = smas_policy?.anti_echo?.min_divergence ?? 0.35;
        log('POLICY', `ARS=${arsTotal} personas=${maxPersonas} rounds=${canonicalRounds} omega_t=${omegaT} minDiv=${minDivergence}`);

        // ===== STEP 1: SELECT TEAM FROM THE 213-PERSONA LIBRARY (ARS/SMRCE) =====
        log('TEAM', `Selecting up to ${maxPersonas} personas via personaTeamOptimizer`);
        let personas = [];
        try {
            const teamRes = await base44.functions.invoke('personaTeamOptimizer', {
                prompt,
                agent_name,
                archetype: smrce.archetype_detected,
                complexity_score: smrce.complexity_score,
                hemisphere: smrce.dominant_hemisphere,
                max_personas: maxPersonas,
                system: 'SMAS'
            });
            if (teamRes?.data?.success && Array.isArray(teamRes.data.team)) {
                personas = teamRes.data.team;
                log('TEAM_OK', `${personas.length} personas: ${personas.map(p => p.name).join(', ')}`);
            }
        } catch (e) {
            log('TEAM_FAIL', e.message);
        }

        if (personas.length === 0) {
            throw new Error('No personas available from the 213-persona library (personaTeamOptimizer returned none).');
        }

        // ===== D2STIM per-hemisphere temperature deltas (G7) =====
        // Fetch once per hemisphere type; apply to each persona's temperature so
        // analytical personas run cooler (focus) and creative ones warmer (divergence).
        const d2Cache = {};
        const getD2Delta = async (queryType) => {
            if (d2Cache[queryType] !== undefined) return d2Cache[queryType];
            let delta = 0;
            try {
                const r = await base44.functions.invoke('neuronasSmasSpec', { mode: 'd2stim', query_type: queryType, complexity: arsTotal });
                if (r?.data?.success) delta = r.data.temp_delta || 0;
            } catch (_e) { /* neutral on failure */ }
            d2Cache[queryType] = delta;
            return delta;
        };

        // ===== PHASE 1: INDEPENDENT PERSONA DRAFTS (parallel) =====
        log('PHASE1', `Independent drafts across ${personas.length} personas (L${complexity_level})`);

        const phase1 = await Promise.all(personas.map(async (p, idx) => {
            // G6: normalize hemisphere to lowercase before mapping to D2 query type.
            const hemi = (p.hemisphere || 'central').toLowerCase();
            const d2QueryType = hemi === 'left' ? 'analytical' : hemi === 'right' ? 'creative' : 'factual';
            const d2Delta = await getD2Delta(d2QueryType);
            // Persona temp = midpoint of its range (smas_dispatcher _temp) + D2 delta, clamped.
            const tr = (p.temperature_range_min != null && p.temperature_range_max != null)
                ? (p.temperature_range_min + p.temperature_range_max) / 2 : temperature;
            const personaTemp = Math.max(0.1, Math.min(1.5, tr + d2Delta));
            const persona = {
                id: p.handle || `P${idx}`,
                label: `${p.name} (${p.domain || p.category || 'SMAS'})`,
                instructions: p.default_instructions || 'Provide your expert perspective.',
                temp: personaTemp
            };
            const p1Prompt = `${sysHeader}## TASK (full context)
${prompt}

## YOUR ROLE: ${persona.label}
${persona.instructions}

Reason independently in your own voice and domain. Take a clear, defensible
position (no neutral fence-sitting). Flag any unverifiable claims.
This is an INDEPENDENT pass: do not assume other personas' output.
Output your draft (~220 words).`;
            try {
                const draft = await invokeLLM(base44, {
                    prompt: p1Prompt,
                    model: MODEL_PERSONA,
                    temperature: persona.temp,   // D2STIM-modulated per-persona temp (G7)
                    file_urls
                });
                log('P1_OK', `${persona.id}: ${draft.length} chars`);
                return { ...persona, draft, ok: true };
            } catch (e) {
                log('P1_FAIL', `${persona.id}: ${e.message}`);
                return { ...persona, draft: '', ok: false };
            }
        }));

        const available = phase1.filter(p => p.ok && p.draft.length > 20);
        if (available.length === 0) {
            throw new Error('All personas failed in Phase 1');
        }

        // ===== PHASE 2: CROSS-EXAMINATION (anti-echo, parallel) =====
        log('PHASE2', `Cross-examination among ${available.length} persona drafts`);

        const phase2 = await Promise.all(available.map(async (m) => {
            const others = available
                .filter(o => o.id !== m.id)
                .map(o => `### ${o.label} draft:\n${o.draft}`)
                .join('\n\n');

            const p2Prompt = `${sysHeader}## TASK
${prompt}

## YOUR PRIOR DRAFT (${m.label}):
${m.draft}

## COMPETING DRAFTS FROM OTHER PERSONAS:
${others}

## YOUR JOB (cross-examination — anti-echo, REQUIRED; min_divergence=${minDivergence})
1. Explicitly CHALLENGE at least one claim from another persona (cite which one).
2. Maintain genuine divergence: do NOT collapse into agreement. If perspectives
   converge below ${minDivergence} divergence, surface a MINORITY REPORT — the
   strongest counter-position even if you are the only one holding it.
3. Identify agreements, contradictions, and blind spots.
4. Defend OR revise your own position based on the strongest evidence.
5. Conclude with your FINAL position after considering all viewpoints (~200 words).`;

            try {
                const revised = await invokeLLM(base44, {
                    prompt: p2Prompt,
                    model: MODEL_PERSONA,
                    temperature: temperature * 0.9
                });
                log('P2_OK', `${m.id}: ${revised.length} chars`);
                return { ...m, revised, ok: true };
            } catch (e) {
                log('P2_FAIL', `${m.id}: ${e.message}`);
                return { ...m, revised: m.draft, ok: false };
            }
        }));

        // ===== PHASE 3: GROUNDED CONVERGED SYNTHESIS (deepest Claude model) =====
        log('PHASE3', 'Final converged synthesis (Opus 4.8)');

        const synthInputs = phase2
            .map(m => `### Final position — ${m.label}:\n${m.revised}`)
            .join('\n\n');

        const synthPrompt = `${sysHeader}## ORIGINAL TASK (full context)
${prompt}

## PERSONA FINAL POSITIONS (after cross-examination)
${synthInputs}

## YOUR TASK — FINAL CONVERGED SYNTHESIS
Produce the SINGLE most plausible and well-reasoned multi-perspective outcome by:
1. Weighing positions by evidence quality and logical rigor (not by vote count).
2. Preserving genuine multi-perspective nuance where personas legitimately diverge.
3. Resolving contradictions in favor of the best-supported claim; flag remaining uncertainty.
4. Following the AGENT INSTRUCTIONS output structure precisely (audit log + final stance).

Deliver the final answer directly.`;

        const synthesis = await invokeLLM(base44, {
            prompt: synthPrompt,
            model: MODEL_SYNTH,              // Opus 4.8 for final convergence
            temperature: temperature * 0.85
        });

        log('DONE', `Synthesis: ${synthesis.length} chars in ${Date.now() - startTime}ms`);

        // Build a debate transcript compatible with the chat audit-log UI.
        const debate_history = [
            ...phase1.map(m => ({ round: 1, persona: `[P1] ${m.label}`, response: m.draft || '(persona unavailable)' })),
            ...phase2.map(m => ({ round: 2, persona: `[P2] ${m.label}`, response: m.revised || '(persona unavailable)' }))
        ];

        return Response.json({
            success: true,
            synthesis,
            method: 'persona_smrce_smas',
            personas_used: personas.map(p => p.name),
            personas_succeeded: available.map(p => p.label),
            smrce: {
                archetype: smrce.archetype_detected,
                complexity_score: smrce.complexity_score,
                dominant_hemisphere: smrce.dominant_hemisphere,
                smrce_breakdown: smrce.smrce_breakdown || null
            },
            // Canonical policy echoed back for the audit log / UI.
            smas_policy: {
                ars_total: arsTotal,
                persona_count: maxPersonas,
                canonical_round_count: canonicalRounds,
                omega_t: omegaT,
                min_divergence: minDivergence
            },
            debate_rounds: 2,            // physical LLM phases (draft + cross-exam)
            debate_history,
            logs
        });

    } catch (error) {
        log('FATAL', error.message);
        return Response.json({ success: false, error: error.message, logs }, { status: 500 });
    }
});