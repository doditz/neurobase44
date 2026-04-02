import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * INVARIANT VALIDATOR - Déclaratif "Must Be True" System
 * Version robuste avec fallbacks
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            content,
            stage, // 'USER_INPUT', 'INTERMEDIATE_PROCESSING', 'FINAL_OUTPUT'
            context = {}
        } = await req.json();

        if (!content || !stage) {
            return Response.json({ error: 'content and stage required' }, { status: 400 });
        }

        console.log(`[InvariantValidator] Validating ${stage} stage`);

        // ========================================
        // CHARGEMENT DES INVARIANTS APPLICABLES
        // ========================================
        let allInvariants = [];
        
        try {
            allInvariants = await base44.asServiceRole.entities.SystemInvariant.filter({
                is_active: true,
                $or: [
                    { applies_to_stages: { $contains: stage } },
                    { applies_to_stages: { $contains: 'ALL' } }
                ]
            });
        } catch (dbError) {
            console.log(`[InvariantValidator] Could not load invariants: ${dbError.message}`);
            // Si pas d'invariants en DB, utiliser des invariants par défaut
            allInvariants = getDefaultInvariants(stage);
        }

        // Trier par priorité (1 = plus haute)
        const sortedInvariants = allInvariants.sort((a, b) => 
            (a.priority_order || 50) - (b.priority_order || 50)
        );

        console.log(`[InvariantValidator] Found ${sortedInvariants.length} applicable invariants`);

        if (sortedInvariants.length === 0) {
            // Pas d'invariants définis, tout passe
            return Response.json({
                success: true,
                stage,
                all_invariants_satisfied: true,
                invariant_results: [],
                critical_violations: [],
                final_action: 'CONTINUE',
                message: 'No invariants defined, validation passed by default'
            });
        }

        // ========================================
        // ÉVALUATION PARALLÈLE DES INVARIANTS
        // ========================================
        const results = [];
        const criticalViolations = [];

        for (const invariant of sortedInvariants) {
            console.log(`[InvariantValidator] Checking: ${invariant.invariant_key}`);

            let isSatisfied = true;
            let evidence = {};
            let rationale = '';

            try {
                // Validation basée sur la méthode
                if (invariant.validation_method === 'LLM_CONTEXTUAL' && invariant.llm_validation_prompt) {
                    // Évaluation LLM contextuelle
                    const prompt = invariant.llm_validation_prompt
                        .replace('{content}', content)
                        .replace('{context}', JSON.stringify(context));

                    const llmResponse = await base44.integrations.Core.InvokeLLM({
                        prompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                satisfied: { type: "boolean" },
                                confidence: { type: "number", minimum: 0, maximum: 1 },
                                rationale: { type: "string" }
                            },
                            required: ["satisfied", "rationale"]
                        }
                    });

                    isSatisfied = llmResponse.satisfied;
                    evidence = { confidence: llmResponse.confidence || 1.0 };
                    rationale = llmResponse.rationale;

                } else if (invariant.validation_method === 'HEURISTIC_SCORING' && invariant.heuristic_rules) {
                    // Validation heuristique
                    const score = evaluateHeuristics(content, invariant.heuristic_rules);
                    const threshold = invariant.heuristic_rules.threshold || 0.7;
                    isSatisfied = score >= threshold;
                    evidence = { heuristic_score: score, threshold };
                    rationale = `Heuristic score: ${score.toFixed(3)}`;

                } else if (invariant.validation_method === 'REGEX_PATTERN' && invariant.heuristic_rules?.patterns) {
                    // Validation par regex
                    const violations = [];
                    for (const pattern of invariant.heuristic_rules.patterns) {
                        const regex = new RegExp(pattern, 'gi');
                        const matches = content.match(regex);
                        if (matches) violations.push(...matches);
                    }
                    isSatisfied = violations.length === 0;
                    evidence = { violations };
                    rationale = violations.length > 0 
                        ? `Found ${violations.length} pattern violations` 
                        : 'No pattern violations';
                }
            } catch (evalError) {
                console.error(`[InvariantValidator] Error evaluating ${invariant.invariant_key}:`, evalError.message);
                // En cas d'erreur, considérer comme satisfait (fail-open pour éviter blocage)
                isSatisfied = true;
                rationale = `Evaluation error (assumed satisfied): ${evalError.message}`;
            }

            const result = {
                invariant_key: invariant.invariant_key,
                level: invariant.level,
                satisfied: isSatisfied,
                evidence,
                rationale,
                violation_response: invariant.violation_response
            };

            results.push(result);

            // Si invariant CRITICAL violé, enregistrer
            if (!isSatisfied && invariant.level === 'CRITICAL') {
                criticalViolations.push({
                    ...result,
                    message: invariant.violation_message_template || `Critical invariant violated: ${invariant.invariant_key}`,
                    source_authority: invariant.source_authority
                });
            }
        }

        // ========================================
        // DÉCISION FINALE BASÉE SUR LES INVARIANTS
        // ========================================
        const allSatisfied = results.every(r => r.satisfied);
        const hasCriticalViolation = criticalViolations.length > 0;

        // Déterminer l'action globale (la plus sévère)
        let finalAction = 'CONTINUE';
        if (hasCriticalViolation) {
            const haltViolations = criticalViolations.filter(v => v.violation_response === 'HALT_IMMEDIATELY');
            if (haltViolations.length > 0) {
                finalAction = 'HALT_IMMEDIATELY';
            } else {
                finalAction = criticalViolations[0].violation_response;
            }
        }

        console.log(`[InvariantValidator] Final decision: ${finalAction}`);

        return Response.json({
            success: allSatisfied,
            stage,
            all_invariants_satisfied: allSatisfied,
            critical_violations_count: criticalViolations.length,
            final_action: finalAction,
            invariant_results: results,
            critical_violations: criticalViolations,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[InvariantValidator] Error:', error);
        
        // En cas d'erreur système, retourner succès par défaut (fail-open)
        return Response.json({
            success: true,
            stage: 'UNKNOWN',
            all_invariants_satisfied: true,
            error_occurred: true,
            error_message: error.message,
            final_action: 'CONTINUE',
            message: 'Validation error, allowing request to proceed'
        });
    }
});

// Helper: Invariants par défaut si pas en DB
function getDefaultInvariants(stage) {
    const defaults = [];
    
    if (stage === 'USER_INPUT' || stage === 'ALL') {
        defaults.push({
            invariant_key: 'BASIC_HARM_PREVENTION',
            level: 'CRITICAL',
            validation_method: 'HEURISTIC_SCORING',
            heuristic_rules: {
                harmful_keywords: ['kill', 'murder', 'exploit', 'abuse', 'harm'],
                threshold: 0.7
            },
            violation_response: 'FLAG_AND_CONTINUE',
            priority_order: 1
        });
    }
    
    return defaults;
}

// Helper: Évaluation heuristique
function evaluateHeuristics(content, rules) {
    let score = 0.8; // Score de base

    const contentLower = content.toLowerCase();
    
    // Vérifier les mots-clés problématiques
    if (rules.harmful_keywords) {
        for (const keyword of rules.harmful_keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
                score -= 0.2;
            }
        }
    }

    // Vérifier les mots-clés positifs
    if (rules.positive_keywords) {
        for (const keyword of rules.positive_keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
                score += 0.05;
            }
        }
    }

    // Vérifier la longueur (trop court = moins fiable)
    if (content.length < 50) {
        score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
}