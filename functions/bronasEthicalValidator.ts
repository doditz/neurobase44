import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BRONAS ETHICAL VALIDATOR v4.3
 * Bio-Inspired Cognitive Ethics Layer
 * 
 * Implements 5 Asimov-Prime Directives with VETO power
 * Rejects responses that violate ethical thresholds
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[BRONAS] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            response_content,
            user_message,
            debate_context = null,
            strict_mode = true
        } = await req.json();

        if (!response_content) {
            return Response.json({ 
                error: 'response_content required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== BRONAS ETHICAL VALIDATION START ===');

        // Load BRONAS validation rules
        const rules = await base44.asServiceRole.entities.BronasValidationRules.filter({ 
            is_active: true 
        });

        if (rules.length === 0) {
            addLog('⚠️ No active BRONAS rules, applying default Asimov directives');
        }

        // DIRECTIVE 1: Quantum Human Safety (Seuil Nociceptif)
        addLog('Directive 1: Quantum Human Safety');
        const safetyCheck = await checkHumanSafety(response_content, base44);
        
        if (safetyCheck.risk_level === 'CRITICAL' || safetyCheck.risk_level === 'HIGH') {
            addLog('❌ DIRECTIVE 1 VIOLATION', { risk: safetyCheck.risk_level });
            return Response.json({
                success: false,
                status: 'REJECTED',
                directive_violated: 'DIRECTIVE_1_HUMAN_SAFETY',
                risk_level: safetyCheck.risk_level,
                reason: safetyCheck.reason,
                veto_applied: true,
                safe_alternative: 'Je ne peux pas fournir cette information car elle pourrait causer un préjudice. Puis-je vous aider autrement?',
                logs: log
            });
        }
        addLog('✓ Directive 1 passed', { risk: safetyCheck.risk_level });

        // DIRECTIVE 2: Ethical Balance (Bias Detection)
        addLog('Directive 2: Ethical Balance (Bias Detection)');
        const biasCheck = await checkBiasBalance(response_content, user_message, base44);
        
        if (biasCheck.bias_score > 0.12) {
            addLog('❌ DIRECTIVE 2 VIOLATION', { bias_score: biasCheck.bias_score.toFixed(3) });
            return Response.json({
                success: false,
                status: 'REJECTED',
                directive_violated: 'DIRECTIVE_2_ETHICAL_BALANCE',
                bias_score: biasCheck.bias_score,
                bias_categories: biasCheck.detected_biases,
                reason: 'Biais éthique détecté au-delà du seuil acceptable (>0.12)',
                veto_applied: true,
                logs: log
            });
        }
        addLog('✓ Directive 2 passed', { bias_score: biasCheck.bias_score.toFixed(3) });

        // DIRECTIVE 3: Transparency (Epistemic Honesty)
        addLog('Directive 3: Transparency');
        const transparencyCheck = await checkTransparency(response_content, base44);
        
        if (transparencyCheck.hallucination_probability > 0.7) {
            addLog('⚠️ DIRECTIVE 3 WARNING', { hallucination_prob: transparencyCheck.hallucination_probability.toFixed(3) });
            // Inject uncertainty statement
            response_content = `[INCERTAIN - Probabilité d'hallucination: ${(transparencyCheck.hallucination_probability * 100).toFixed(0)}%]\n\n${response_content}`;
        }
        addLog('✓ Directive 3 evaluated', { hallucination_prob: transparencyCheck.hallucination_probability.toFixed(3) });

        // DIRECTIVE 4: Cultural Sensitivity
        addLog('Directive 4: Cultural Sensitivity');
        const culturalCheck = await checkCulturalSensitivity(response_content, base44);
        
        if (culturalCheck.sensitivity_violation) {
            addLog('❌ DIRECTIVE 4 VIOLATION', { violation: culturalCheck.violation_type });
            return Response.json({
                success: false,
                status: 'REJECTED',
                directive_violated: 'DIRECTIVE_4_CULTURAL_SENSITIVITY',
                violation_type: culturalCheck.violation_type,
                reason: culturalCheck.reason,
                veto_applied: true,
                logs: log
            });
        }
        addLog('✓ Directive 4 passed');

        // DIRECTIVE 5: Autonomy Preservation
        addLog('Directive 5: Autonomy Preservation');
        const autonomyCheck = await checkAutonomyPreservation(response_content, base44);
        
        if (autonomyCheck.autonomy_violation) {
            addLog('❌ DIRECTIVE 5 VIOLATION', { violation: autonomyCheck.violation_reason });
            return Response.json({
                success: false,
                status: 'REJECTED',
                directive_violated: 'DIRECTIVE_5_AUTONOMY',
                reason: autonomyCheck.violation_reason,
                veto_applied: true,
                logs: log
            });
        }
        addLog('✓ Directive 5 passed');

        // ALL DIRECTIVES PASSED
        addLog('=== BRONAS VALIDATION COMPLETE: APPROVED ===');

        return Response.json({
            success: true,
            status: 'APPROVED',
            validated_response: response_content,
            ethical_scores: {
                human_safety: safetyCheck.risk_level,
                bias_score: biasCheck.bias_score,
                transparency: transparencyCheck.hallucination_probability,
                cultural_sensitivity: 'PASS',
                autonomy: 'PASS'
            },
            directives_passed: [1, 2, 3, 4, 5],
            veto_applied: false,
            logs: log
        });

    } catch (error) {
        addLog('ERROR', error.message);
        return Response.json({
            error: error.message,
            success: false,
            logs: log
        }, { status: 500 });
    }
});

async function checkHumanSafety(content, base44) {
    const dangerKeywords = [
        'kill', 'murder', 'suicide', 'harm', 'violence', 'weapon', 'bomb', 'poison',
        'tuer', 'assassiner', 'suicide', 'nuire', 'violence', 'arme', 'bombe', 'poison'
    ];
    
    const contentLower = content.toLowerCase();
    const dangerCount = dangerKeywords.filter(kw => contentLower.includes(kw)).length;
    
    if (dangerCount >= 3) {
        return { risk_level: 'CRITICAL', reason: 'Multiple danger keywords detected' };
    } else if (dangerCount >= 1) {
        return { risk_level: 'MEDIUM', reason: 'Danger keyword detected, context unclear' };
    }
    
    return { risk_level: 'LOW', reason: 'No immediate safety concerns' };
}

async function checkBiasBalance(content, userMessage, base44) {
    try {
        // Use simple keyword-based bias detection instead of nested LLM call
        const biasKeywords = {
            gender: ['men are', 'women are', 'males always', 'females always', 'his gender', 'her gender'],
            cultural: ['those people', 'their kind', 'typical of', 'always do'],
            socioeconomic: ['poor people', 'rich people', 'lower class', 'upper class']
        };
        
        const contentLower = content.toLowerCase();
        const detectedBiases = [];
        let biasScore = 0;
        
        for (const [category, keywords] of Object.entries(biasKeywords)) {
            for (const kw of keywords) {
                if (contentLower.includes(kw)) {
                    detectedBiases.push(category);
                    biasScore += 0.05;
                }
            }
        }
        
        return { 
            bias_score: Math.min(1.0, biasScore), 
            detected_biases: [...new Set(detectedBiases)] 
        };
    } catch (error) {
        return { bias_score: 0.0, detected_biases: [] };
    }
}

async function checkTransparency(content, base44) {
    const uncertaintyIndicators = ['je pense', 'peut-être', 'probablement', 'i think', 'maybe', 'probably'];
    const contentLower = content.toLowerCase();
    
    const hasUncertainty = uncertaintyIndicators.some(ind => contentLower.includes(ind));
    
    // Simple heuristic: if content is very long and has no uncertainty markers = potential hallucination
    const wordCount = content.split(/\s+/).length;
    const hallucinationProb = hasUncertainty ? 0.2 : Math.min(0.9, wordCount / 500);
    
    return { hallucination_probability: hallucinationProb };
}

async function checkCulturalSensitivity(content, base44) {
    const offensiveTerms = ['stupid', 'idiot', 'moron', 'con', 'débile', 'imbécile'];
    const contentLower = content.toLowerCase();
    
    for (const term of offensiveTerms) {
        if (contentLower.includes(term)) {
            return { 
                sensitivity_violation: true, 
                violation_type: 'offensive_language',
                reason: `Offensive term detected: "${term}"`
            };
        }
    }
    
    return { sensitivity_violation: false };
}

async function checkAutonomyPreservation(content, base44) {
    const coercivePatterns = ['you must', 'tu dois', 'you have to', 'tu es obligé'];
    const contentLower = content.toLowerCase();
    
    for (const pattern of coercivePatterns) {
        if (contentLower.includes(pattern)) {
            return { 
                autonomy_violation: true, 
                violation_reason: `Coercive language detected: "${pattern}"`
            };
        }
    }
    
    return { autonomy_violation: false };
}