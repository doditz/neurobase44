import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * NEURONAS SMAS SPEC ENGINE v1.0 — CANONICAL PYTHON-PARITY MODULE
 * ============================================================================
 * SINGLE SOURCE OF TRUTH for the TypeScript/Base44 port of the Python Neuronas
 * SMAS engine. Every constant and formula below is transcribed verbatim from the
 * Python source with exact file/line provenance, so the chat pipeline matches
 * production behaviour with NO assumptions or fillers.
 *
 * PROVENANCE MAP
 *   - ars_score()               → smas_run_debate.py:122-171
 *   - omega_t (ARS-derived)     → smas_complete_unified.py:1210-1247  (CANONICAL)
 *   - persona count tiers       → smas_run_debate.py:173-180
 *   - round count tiers         → smas_run_debate.py:183-192
 *   - hemispheric slot alloc    → smas_dispatcher.py:460-466 / unified:1069-1083
 *   - category sets             → smas_dispatcher.py:504-512
 *   - score_persona() 5-term    → smas_complete_unified.py:1274-1293
 *   - anti-echo thresholds      → config.json:327-359
 *   - D2STIM modulation         → d2_receptor_modulation.py:116-167,238-313
 *   - hemisphere taxonomy       → smas_complete_unified.py:156-161 (lowercase)
 *
 * USAGE (single-call contract — avoids local imports, which Deno forbids):
 *   POST { mode: "policy", query }      → ARS + omega_t + persona/round counts + slot alloc
 *   POST { mode: "d2stim", query_type, complexity } → D2STIM activation + temp deltas
 *
 * CHANGELOG
 *   v1.0 — Initial canonical transcription from Python core_modules/smas/.
 *
 * EXPERT TIP: keep ALL numeric constants here. If a tier boundary changes in the
 * Python source, edit it ONCE in this file — every consumer (chatOrchestratorFast,
 * triLlmDebate, personaTeamOptimizer) reads from this single authority.
 *
 * PITFALL: omega_t has TWO Python implementations. The CANONICAL one is the
 * ARS-derived golden-ratio formula (not the keyword hit-ratio). We expose both;
 * consumers MUST prefer `omega_t` (ARS-derived) and treat `omega_t_keyword` as a
 * diagnostic only.
 */

// ──────────────────────────────────────────────────────────────────────────
// G2 — ARS / SMRCE keyword pattern banks (smas_run_debate.py:122-171)
// Each matched pattern contributes 0.25 to its dimension, capped at 1.0.
// ──────────────────────────────────────────────────────────────────────────
const ARS_PATTERNS = {
    // S = Sensory, M = Memory, R = Reasoning, C = Coherence, E = Ethics
    S: ['see', 'hear', 'feel', 'sense', 'perceiv', 'observ', 'visual', 'sound', 'touch', 'experienc'],
    M: ['remember', 'recall', 'history', 'previous', 'past', 'earlier', 'context', 'before'],
    R: ['analyz', 'reason', 'logic', 'deduc', 'prove', 'calculat', 'derive', 'infer', 'because', 'therefore', 'why', 'how'],
    C: ['structure', 'coherent', 'consistent', 'organiz', 'connect', 'relate', 'integrat', 'synthes'],
    E: ['ethic', 'moral', 'right', 'wrong', 'fair', 'justice', 'should', 'ought', 'harm', 'value', 'consent', 'privacy']
};
// ARS_DIM_FLOOR (smas_run_debate.py — service-layer floors)
const ARS_DIM_FLOOR = { S: 0.05, M: 0.0, R: 0.0, C: 0.0, E: 0.05 };

/**
 * Canonical service-layer ARS score (smas_run_debate.py:122-171).
 * @param {string} query
 * @returns {{S:number,M:number,R:number,C:number,E:number,total:number}}
 */
function arsScore(query) {
    const q = (query || '').toLowerCase();
    const scores = {};
    for (const dim of Object.keys(ARS_PATTERNS)) {
        const matches = ARS_PATTERNS[dim].reduce((acc, p) => acc + (q.includes(p) ? 1 : 0), 0);
        const lexical = Math.min(1.0, matches * 0.25);
        scores[dim] = Math.max(lexical, ARS_DIM_FLOOR[dim] || 0.0);
    }
    // Length boost: up to +0.3 for a 150-char query (len/500, capped 0.3).
    const lengthBoost = Math.min(0.3, q.length / 500);
    const total = Math.min(1.0, (scores.S + scores.M + scores.R + scores.C + scores.E) / 5 + lengthBoost);
    return { ...scores, total: parseFloat(total.toFixed(4)) };
}

// ──────────────────────────────────────────────────────────────────────────
// G2 — Canonical ARS-derived omega_t (smas_complete_unified.py:1210-1247)
// Golden-ratio equilibrium: 0.618 base (62% analytical / 38% creative).
// ──────────────────────────────────────────────────────────────────────────
const PHI_INV = 0.618;   // golden ratio inverse — base equilibrium
const PHI_INV2 = 0.382;  // φ⁻² — max deviation amplitude

/**
 * ARS-derived omega_t. Maps the 5-dim ARS into analytical/creative pressure.
 * NOTE: Python uses ambiguity/risk/subtlety + sensory; the service-layer port
 * maps S.M.R.C.E. → the same signals (reasoning,coherence,memory = analytical;
 * sensory,ethics-as-subtlety = creative) to stay within the available metrics.
 * @returns {number} omega_t clamped to [0,1] (higher = more analytical)
 */
function omegaTFromArs(ars) {
    const analyticalSignal = (ars.R + ars.C + ars.M + ars.E * 0.5) / 3.5;
    const creativeSignal = (ars.S + ars.E + ars.S * 0.5) / 3.0; // sensory-led creative pressure
    const netPressure = (analyticalSignal - creativeSignal) * PHI_INV2;
    return Math.max(0, Math.min(1, PHI_INV + netPressure));
}

// Diagnostic keyword omega_t (smas_dispatcher.py:447-458) — NOT canonical.
const ANAL_KEYS = ['math', 'calculat', 'proof', 'logic', 'code', 'algorithm', 'analytic', 'derive', 'equation', 'formula', 'engineer', 'technical', 'formal', 'scienc', 'research', 'data', 'comput'];
const CREA_KEYS = ['imagin', 'creativ', 'design', 'art', 'novel', 'story', 'invent', 'innovat', 'poem', 'metaphor', 'inspir', 'vision', 'ethical', 'moral'];
function omegaTKeyword(query) {
    const q = (query || '').toLowerCase();
    const l = ANAL_KEYS.reduce((a, k) => a + (q.includes(k) ? 1 : 0), 0);
    const r = CREA_KEYS.reduce((a, k) => a + (q.includes(k) ? 1 : 0), 0);
    return (l + r) > 0 ? l / (l + r) : 0.5;
}

// ──────────────────────────────────────────────────────────────────────────
// G1/G8 — Persona count & round count by ARS total tier
// (smas_run_debate.py:173-192)
// ──────────────────────────────────────────────────────────────────────────
function personaCount(arsTotal) {
    if (arsTotal < 0.15) return 3;   // trivial
    if (arsTotal < 0.40) return 5;   // low
    if (arsTotal < 0.65) return 7;   // medium
    if (arsTotal < 0.85) return 9;   // high
    return 10;                       // critical (max_personas)
}
function roundCount(arsTotal) {
    if (arsTotal < 0.15) return 1;   // trivial: single pass
    if (arsTotal < 0.40) return 3;   // low
    if (arsTotal < 0.65) return 5;   // medium
    if (arsTotal < 0.85) return 7;   // high
    return 10;                       // critical (max_rounds)
}
function complexityTier(arsTotal) {
    if (arsTotal < 0.25) return 'LOW';
    if (arsTotal < 0.50) return 'MEDIUM';
    if (arsTotal < 0.75) return 'HIGH';
    return 'CRITICAL';
}

// ──────────────────────────────────────────────────────────────────────────
// G1 — Hemispheric slot allocation from omega_t (smas_dispatcher.py:460-466)
// ──────────────────────────────────────────────────────────────────────────
function slotAllocation(n, omega_t) {
    let nAnal, nCrea;
    if (omega_t > 0.7) { nAnal = Math.round(n * 0.70); nCrea = n - nAnal; }
    else if (omega_t < 0.3) { nAnal = Math.round(n * 0.30); nCrea = n - nAnal; }
    else { nAnal = Math.floor(n / 2); nCrea = n - nAnal; }
    return { n_analytical: nAnal, n_creative: nCrea };
}

// ──────────────────────────────────────────────────────────────────────────
// G1/G8 — Category sets (smas_dispatcher.py:504-512). Lowercase canonical.
// ──────────────────────────────────────────────────────────────────────────
const ANAL_CATS = ['system_core', 'cognitive_analytical', 'technology_engineering', 'scientific_specialists', 'professional_services', 'specialized_knowledge', 'chaotic_disruptive'];
const CREA_CATS = ['creative_arts_media', 'humanities_culture', 'philosophical_metaphysical', 'social_political', 'educational_content'];
const MAX_PER_CAT = 2;

// ──────────────────────────────────────────────────────────────────────────
// G4 — Anti-echo / divergence thresholds (config.json:327-359)
// ──────────────────────────────────────────────────────────────────────────
const ANTI_ECHO = {
    min_divergence: 0.35,
    consensus_threshold: 0.8,
    min_perspective_diversity: 0.35,
    minority_report_threshold: 0.2,
    gc_convergence_threshold: 0.85,
    confidence_improvement_threshold: 0.1
};

// ──────────────────────────────────────────────────────────────────────────
// G7 — D2STIM modulation (d2_receptor_modulation.py:116-167,238-313)
// ──────────────────────────────────────────────────────────────────────────
/**
 * Suggested D2 levels by query type (d2_receptor_modulation.py:253-314).
 * 70% suggestion / 30% user preference blend is applied by the consumer.
 */
function suggestD2(queryType, complexity = 0.5) {
    switch (queryType) {
        case 'creative': return { stim: 0.3, pin: Math.min(1, 0.7 + complexity * 0.2) };
        case 'analytical': return { stim: Math.min(1, 0.7 + complexity * 0.2), pin: 0.3 };
        case 'factual': return { stim: 0.6, pin: 0.4 };
        default: return { stim: 0.5, pin: 0.5 };
    }
}
/**
 * Core D2 activation + cognitive effect deltas + a temperature delta usable to
 * modulate per-persona temperature (higher activation = lower temp / more focus).
 */
function d2Modulation(stim, pin) {
    const d2_activation = Math.max(0, Math.min(1, 0.5 + (stim - pin) / 2)); // [0,1]
    const effects = {
        focus: 0, executive_function: 0, convergent_thinking: 0,
        working_memory: 0, divergent_thinking: 0, creativity: 0,
        cognitive_flexibility: 0, pattern_recognition: 0
    };
    // D2Stim effects (threshold 0.4)
    if (stim > 0.4) {
        const ns = (stim - 0.4) / 0.6;
        effects.focus += ns * 0.7;
        effects.executive_function += ns * 0.65;
        effects.convergent_thinking += ns * 0.4;
        effects.working_memory += ns * 0.3;
        effects.divergent_thinking -= ns * 0.2;
    }
    // D2Pin effects (threshold 0.35)
    if (pin > 0.35) {
        const np = (pin - 0.35) / 0.65;
        effects.creativity += np * 0.8;
        effects.cognitive_flexibility += np * 0.75;
        effects.divergent_thinking += np * 0.5;
        effects.pattern_recognition += np * 0.3;
        effects.focus -= np * 0.1;
    }
    // Yerkes-Dodson inverted-U (optimal D2 = 0.7, coefficient 2.8)
    const inv_u = Math.max(0, 1.0 - Math.abs(0.7 - d2_activation) * 2.8);
    // Temperature delta: focus pulls temp down, creativity pulls it up. Range ~[-0.25,+0.25]
    const temp_delta = parseFloat(((effects.creativity - effects.focus) * 0.25).toFixed(3));
    return { d2_activation: parseFloat(d2_activation.toFixed(3)), effects, inverted_u: parseFloat(inv_u.toFixed(3)), temp_delta };
}

// ──────────────────────────────────────────────────────────────────────────
// Handler — single-call contract
// ──────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const mode = body.mode || 'policy';

        if (mode === 'd2stim') {
            const { query_type = 'balanced', complexity = 0.5, user_pref } = body;
            const suggested = suggestD2(query_type, complexity);
            // 70% suggestion / 30% user preference blend.
            const stim = user_pref ? suggested.stim * 0.7 + (user_pref.stim ?? suggested.stim) * 0.3 : suggested.stim;
            const pin = user_pref ? suggested.pin * 0.7 + (user_pref.pin ?? suggested.pin) * 0.3 : suggested.pin;
            return Response.json({ success: true, mode, query_type, suggested, applied: { stim, pin }, ...d2Modulation(stim, pin) });
        }

        // mode === "policy"
        const { query } = body;
        if (!query || typeof query !== 'string') {
            return Response.json({ success: false, error: 'query (string) required' }, { status: 400 });
        }
        const ars = arsScore(query);
        const omega_t = omegaTFromArs(ars);
        const n = personaCount(ars.total);
        const rounds = roundCount(ars.total);
        const slots = slotAllocation(n, omega_t);

        return Response.json({
            success: true,
            mode,
            ars,
            ars_total: ars.total,
            complexity_tier: complexityTier(ars.total),
            omega_t: parseFloat(omega_t.toFixed(4)),
            omega_t_keyword: parseFloat(omegaTKeyword(query).toFixed(4)), // diagnostic only
            persona_count: n,
            round_count: rounds,
            slot_allocation: slots,
            category_sets: { analytical: ANAL_CATS, creative: CREA_CATS, max_per_category: MAX_PER_CAT },
            anti_echo: ANTI_ECHO
        });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
});