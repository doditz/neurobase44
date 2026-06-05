import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * PERSONA TEAM OPTIMIZER v4.0 — PYTHON-PARITY (smas_dispatcher.select_for_debate)
 * ============================================================================
 * Rewired to match the Python Neuronas selection algorithm exactly:
 *   - 5-term score_persona() linear model (smas_complete_unified.py:1274-1293)
 *   - Two-phase category-constrained fill (smas_dispatcher.py:558-622):
 *       PHASE A: analytical slots from analytical-category personas
 *       PHASE B: creative slots from creative-category personas
 *       MANDATORY: force Devil's Advocate (chaotic_disruptive) when n >= 3
 *       PHASE C: diversity fill, no category restriction, MAX_PER_CAT = 2
 *   - Hemispheric slot counts driven by omega_t (from neuronasSmasSpec policy)
 *
 * The TS Persona entity uses CAPITALIZED categories (Core, Scientific, Creative…)
 * while Python uses snake_case (system_core, scientific_specialists…). CATEGORY_MAP
 * below bridges the two so the canonical analytical/creative pools apply.
 *
 * CHANGELOG
 *   v4.0 — Replaced ad-hoc +5/+4/+3 boosts with the canonical 5-term model and
 *          two-phase category-constrained fill + mandatory Devil's Advocate.
 *   v3.0 — Agent-aware selection (deprecated scoring).
 *
 * PITFALL: hemisphere strings differ in case across the stack — always compare
 * lowercased (G6 canonical taxonomy).
 */

// Bridge TS capitalized categories → Python analytical/creative pools.
const ANALYTICAL_TS_CATS = ['Core', 'Theorist', 'Scientific', 'Engineering', 'Professional', 'Specialized', 'Disruptive', 'Advanced', 'Expert'];
const CREATIVE_TS_CATS = ['Creative', 'Innovator', 'Experimental', 'Standard'];
// Devil's Advocate marker — TS "Disruptive" category ≙ Python "chaotic_disruptive".
const DEVILS_ADVOCATE_CAT = 'Disruptive';
// G4 — no single category dominates the panel (smas_dispatcher.py:562).
const MAX_PER_CAT = 2;

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }

        // Parse and validate request
        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON payload', 
                success: false 
            }, { status: 400 });
        }

        const { 
            prompt, 
            agent_name = 'smas_debater',
            query_type,
            complexity_score = 0.5, 
            complexity,
            hemisphere = 'balanced',
            max_personas = 5,
            system = 'SMAS',
            archetype
        } = requestData;

        if (!prompt || typeof prompt !== 'string') {
            return Response.json({ 
                error: 'prompt required as string', 
                success: false,
                received: { prompt, type: typeof prompt }
            }, { status: 400 });
        }

        // Map agent_name to system filter
        const systemFilter = agent_name === 'suno_prompt_architect' ? 'Suno' : 
                           agent_name === 'smas_debater' ? 'SMAS' :
                           system;

        console.log(`[PersonaTeamOptimizer] Agent: ${agent_name}, System filter: ${systemFilter}`);

        // Fetch personas compatible with this agent/system
        let allPersonas;
        try {
            // First try to get personas for specific system, fallback to shared
            allPersonas = await base44.asServiceRole.entities.Persona.filter({
                status: 'Active',
                system: { "$in": [systemFilter, 'Shared'] }
            });
            
            console.log(`[PersonaTeamOptimizer] Found ${allPersonas.length} personas for system ${systemFilter}`);
            
            // If no personas found for this system, fallback to all active
            if (allPersonas.length === 0) {
                console.log(`[PersonaTeamOptimizer] No personas for ${systemFilter}, trying all active`);
                allPersonas = await base44.asServiceRole.entities.Persona.filter({
                    status: 'Active'
                });
            }
        } catch (personaError) {
            // Ultimate fallback
            try {
                allPersonas = await base44.asServiceRole.entities.Persona.filter({
                    status: 'Active'
                });
            } catch (fallbackError) {
                return Response.json({ 
                    error: 'Failed to fetch personas',
                    success: false,
                    details: fallbackError.message
                }, { status: 503 });
            }
        }

        if (allPersonas.length === 0) {
            return Response.json({ 
                error: 'No active personas found',
                success: false,
                agent_name,
                system_filter: systemFilter
            }, { status: 404 });
        }

        // Determine archetype (kept for response metadata; not used for ad-hoc boosts now)
        let detectedArchetype = archetype || query_type || 'analytical';
        if (agent_name === 'suno_prompt_architect' || systemFilter === 'Suno') {
            detectedArchetype = 'creative';
        } else if (/creat|invent|imagin|innov|design|artis|music|song|lyric|composi/i.test(prompt)) {
            detectedArchetype = 'creative';
        } else if (/ethic|moral|right|wrong|fair|justice/i.test(prompt)) {
            detectedArchetype = 'ethical';
        } else if (/code|algorithm|technical|engineer|system|debug/i.test(prompt)) {
            detectedArchetype = 'technical';
        } else if (/mathematic|equation|proof|theorem|group|algebr/i.test(prompt)) {
            detectedArchetype = 'mathematical';
        }

        // ===== CANONICAL 5-TERM score_persona() (smas_complete_unified.py:1274-1293) =====
        // priority*100 + tag_score*20 + meta_weight*10 + synap*15 − usage*5
        const promptLowerWords = prompt.toLowerCase().split(/\W+/).filter(Boolean);
        const scorePersona = (p) => {
            const priorityScore = (p.priority_level || 5) * 100;
            // tag_score: matching domain tags in query × 20 (domain + semantic_bias as tags)
            const tags = `${p.domain || ''} ${p.semantic_bias || ''} ${p.dominant_cognitive_trait || ''}`.toLowerCase();
            const tagMatches = promptLowerWords.reduce((a, w) => a + (w.length > 3 && tags.includes(w) ? 1 : 0), 0);
            const tagScore = tagMatches * 20;
            // meta_weight ≈ expertise_score mapped to [0.5,2.0] → ×10
            const metaWeight = Math.max(0.5, Math.min(2.0, 0.5 + (p.expertise_score || 0.5) * 1.5));
            const metaScore = metaWeight * 10;
            // synaptomap co-activation ≈ activation_weight × 15
            const synapBonus = (p.activation_weight ?? 0.5) * 15;
            // anti-echo usage penalty: recent activation frequency × 5
            const usagePenalty = (p.recent_activation_frequency || 0) * 5;
            return priorityScore + tagScore + metaScore + synapBonus - usagePenalty;
        };

        // Pre-rank all personas by canonical score (desc).
        const ranked = allPersonas
            .map(p => ({ persona: p, score: scorePersona(p) }))
            .sort((a, b) => b.score - a.score);

        // ===== Hemispheric slot counts from canonical omega_t (neuronasSmasSpec) =====
        let nAnal, nCrea;
        try {
            const policyRes = await base44.functions.invoke('neuronasSmasSpec', { mode: 'policy', query: prompt });
            const pol = policyRes?.data;
            if (pol?.success) {
                const n = Math.min(max_personas, pol.persona_count);
                const alloc = pol.slot_allocation;
                // Re-derive slots for the capped n to respect max_personas.
                const ratio = alloc.n_analytical / (alloc.n_analytical + alloc.n_creative || 1);
                nAnal = Math.round(n * ratio); nCrea = n - nAnal;
            }
        } catch (_e) { /* fall through to balanced default */ }
        if (nAnal === undefined) { nAnal = Math.floor(max_personas / 2); nCrea = max_personas - nAnal; }

        const isAnalCat = (c) => ANALYTICAL_TS_CATS.includes(c);
        const isCreaCat = (c) => CREATIVE_TS_CATS.includes(c);

        // ===== TWO-PHASE CATEGORY-CONSTRAINED FILL (smas_dispatcher.py:558-622) =====
        const selected = [];
        const usedIds = new Set();
        const catCount = {};
        const tryPick = (predicate, limit) => {
            for (const { persona: p } of ranked) {
                if (selected.length >= max_personas) break;
                if (limit !== null && countInPool(predicate) >= limit) break;
                if (usedIds.has(p.id)) continue;
                if (!predicate(p)) continue;
                if ((catCount[p.category] || 0) >= MAX_PER_CAT) continue;
                selected.push(p); usedIds.add(p.id);
                catCount[p.category] = (catCount[p.category] || 0) + 1;
            }
        };
        const countInPool = (predicate) => selected.filter(predicate).length;

        // PHASE A: analytical slots from analytical-category personas
        tryPick((p) => isAnalCat(p.category), nAnal);
        // PHASE B: creative slots from creative-category personas
        tryPick((p) => isCreaCat(p.category), nAnal + nCrea); // cumulative cap = full team

        // MANDATORY DEVIL'S ADVOCATE (chaotic_disruptive) when team >= 3
        if (max_personas >= 3 && !selected.some(p => p.category === DEVILS_ADVOCATE_CAT)) {
            const advocate = ranked.find(({ persona: p }) => p.category === DEVILS_ADVOCATE_CAT && !usedIds.has(p.id));
            if (advocate) {
                if (selected.length >= max_personas) { // replace last slot if at capacity
                    const removed = selected.pop();
                    if (removed) { usedIds.delete(removed.id); catCount[removed.category]--; }
                }
                selected.push(advocate.persona); usedIds.add(advocate.persona.id);
                catCount[advocate.persona.category] = (catCount[advocate.persona.category] || 0) + 1;
            }
        }

        // PHASE C: diversity fill — no category restriction (still honor MAX_PER_CAT)
        for (const { persona: p } of ranked) {
            if (selected.length >= max_personas) break;
            if (usedIds.has(p.id)) continue;
            if ((catCount[p.category] || 0) >= MAX_PER_CAT) continue;
            selected.push(p); usedIds.add(p.id);
            catCount[p.category] = (catCount[p.category] || 0) + 1;
        }

        const finalPersonas = selected.slice(0, max_personas);
        const lc = (h) => (h || '').toLowerCase(); // G6: lowercase hemisphere compare

        return Response.json({
            success: true,
            team: finalPersonas,
            selected_personas: finalPersonas.map(p => ({
                handle: p.handle, name: p.name, category: p.category,
                hemisphere: p.hemisphere, expertise_score: p.expertise_score,
                domain: p.domain, system: p.system
            })),
            archetype_detected: detectedArchetype,
            agent_name,
            system_filter: systemFilter,
            total_personas_selected: finalPersonas.length,
            slot_allocation: { n_analytical: nAnal, n_creative: nCrea },
            devils_advocate_present: finalPersonas.some(p => p.category === DEVILS_ADVOCATE_CAT),
            reasoning: `5-term canonical scoring + two-phase fill. Archetype: ${detectedArchetype}, slots A/C: ${nAnal}/${nCrea}`,
            selection_diversity: {
                left_hemisphere: finalPersonas.filter(p => lc(p.hemisphere) === 'left').length,
                right_hemisphere: finalPersonas.filter(p => lc(p.hemisphere) === 'right').length,
                central_hemisphere: finalPersonas.filter(p => lc(p.hemisphere) === 'central').length
            }
        });

    } catch (error) {
        console.error('PersonaTeamOptimizer error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});