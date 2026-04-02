import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * COGNITIVE VALIDATOR v2.0 - LLM Validation System
 * Orchestrates full cognitive validation pipeline: DSTIB → Personas → SMAS → GC → BRONAS → Verdict
 */

Deno.serve(async (req) => {
    const logs = [];
    const log = (level, msg, data = {}) => {
        logs.push({ level, message: msg, data, timestamp: new Date().toISOString() });
        console.log(`[CognitiveValidator][${level.toUpperCase()}] ${msg}`, data);
    };

    try {
        log('system', '=== COGNITIVE VALIDATOR START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized', logs }, { status: 401 });
        }

        const { 
            response_text,
            debate_history = [],
            personas_used = [],
            gc_score = null,
            omega_t = 0.5,
            dopamine_t = 0.5,
            flux_integral = 0.0,
            complexity_score = 0.5
        } = await req.json();
        
        if (!response_text) {
            return Response.json({ success: false, error: 'response_text required', logs }, { status: 400 });
        }

        log('info', 'Validating response', { 
            response_length: response_text.length,
            personas_count: personas_used.length,
            gc_score 
        });

        // Load validation metrics and thresholds
        const metricsRecords = await base44.asServiceRole.entities.ValidationMetrics.list('-created_date', 10);
        const thresholds = calculateDynamicThresholds(metricsRecords);
        log('info', 'Thresholds loaded', thresholds);

        // STEP 1: GC Score Validation
        const gc_validation = validateGCScore(gc_score, thresholds);
        log('info', 'GC Score validation', gc_validation);

        // STEP 2: Debate Convergence Check
        const debate_convergence = calculateDebateConvergence(debate_history);
        const convergence_validation = debate_convergence >= thresholds.min_debate_convergence;
        log('info', 'Debate convergence', { debate_convergence, passed: convergence_validation });

        // STEP 3: Entropy Divergence Check
        const entropy_divergence = calculateEntropyDivergence(debate_history);
        const entropy_validation = entropy_divergence <= thresholds.max_entropy_divergence;
        log('info', 'Entropy divergence', { entropy_divergence, passed: entropy_validation });

        // STEP 4: Persona Utilization Check
        const persona_utilization = personas_used.length / Math.max(1, thresholds.expected_personas);
        const persona_validation = persona_utilization >= thresholds.min_persona_utilization;
        log('info', 'Persona utilization', { persona_utilization, passed: persona_validation });

        // STEP 5: BRONAS Ethical Validation
        let bronas_result;
        try {
            const { data: bronasData } = await base44.functions.invoke('bronasValidator', {
                response_text,
                debate_history,
                omega_t,
                dopamine_t
            });
            bronas_result = bronasData;
            log('info', 'BRONAS validation complete', { bronas_score: bronasData?.bronas_score });
        } catch (bronasError) {
            log('error', `BRONAS validation failed: ${bronasError.message}`);
            bronas_result = { success: false, error: bronasError.message };
        }

        const bronas_validation = bronas_result?.success && bronas_result?.bronas_score >= thresholds.min_bronas_score;

        // STEP 6: Ethical Balance Index
        const ethical_balance = calculateEthicalBalance(bronas_result, omega_t);
        const ethical_validation = ethical_balance >= thresholds.min_ethical_balance;
        log('info', 'Ethical balance', { ethical_balance, passed: ethical_validation });

        // STEP 7: Aggregate Validation Verdict
        const all_checks = [
            gc_validation,
            convergence_validation,
            entropy_validation,
            persona_validation,
            bronas_validation,
            ethical_validation
        ];

        const passed_count = all_checks.filter(Boolean).length;
        const total_checks = all_checks.length;
        const validation_score = passed_count / total_checks;

        let verdict = 'rejected';
        if (validation_score >= 0.9) {
            verdict = 'validated';
        } else if (validation_score >= 0.7) {
            verdict = 'refinement_suggested';
        } else if (validation_score >= 0.5) {
            verdict = 'flagged';
        }

        log('success', `Validation verdict: ${verdict.toUpperCase()}`, { validation_score });

        // STEP 8: Store Validation Metrics
        try {
            await base44.asServiceRole.entities.ValidationMetrics.create({
                metric_name: 'cognitive_validation_run',
                metric_category: 'qronas',
                observed_value: validation_score,
                threshold_min: 0.7,
                threshold_max: 1.0,
                is_passing: validation_score >= 0.7,
                measurement_timestamp: new Date().toISOString(),
                metadata: {
                    verdict,
                    gc_score,
                    debate_convergence,
                    entropy_divergence,
                    persona_utilization,
                    bronas_score: bronas_result?.bronas_score,
                    ethical_balance
                }
            });
            log('info', 'Validation metrics stored');
        } catch (storeError) {
            log('warning', `Failed to store metrics: ${storeError.message}`);
        }

        log('system', '=== COGNITIVE VALIDATOR COMPLETE ===');

        return Response.json({
            success: true,
            validation_result: {
                verdict,
                validation_score,
                checks: {
                    gc_validation,
                    convergence_validation,
                    entropy_validation,
                    persona_validation,
                    bronas_validation,
                    ethical_validation
                },
                metrics: {
                    gc_score,
                    debate_convergence,
                    entropy_divergence,
                    persona_utilization,
                    bronas_score: bronas_result?.bronas_score,
                    ethical_balance
                },
                thresholds
            },
            logs
        });

    } catch (error) {
        log('error', `Cognitive Validator error: ${error.message}`, { stack: error.stack });
        return Response.json({ success: false, error: error.message, logs }, { status: 500 });
    }
});

function calculateDynamicThresholds(metricsRecords) {
    // Default thresholds
    const defaults = {
        min_gc_score: 0.7,
        min_debate_convergence: 0.6,
        max_entropy_divergence: 0.4,
        min_persona_utilization: 0.6,
        expected_personas: 5,
        min_bronas_score: 0.8,
        min_ethical_balance: 0.7
    };

    // TODO: Calculate adaptive thresholds based on historical performance
    // For now, return defaults
    return defaults;
}

function validateGCScore(gc_score, thresholds) {
    if (gc_score === null || gc_score === undefined) {
        return false;
    }
    return gc_score >= thresholds.min_gc_score;
}

function calculateDebateConvergence(debate_history) {
    if (!debate_history || debate_history.length === 0) {
        return 0.5; // neutral
    }

    // Simple convergence: measure how similar consecutive rounds are
    // Higher convergence = responses becoming more aligned
    let convergenceSum = 0;
    let count = 0;

    for (let i = 1; i < debate_history.length; i++) {
        const prev = debate_history[i - 1]?.response || '';
        const curr = debate_history[i]?.response || '';
        
        if (prev && curr) {
            const similarity = calculateTextSimilarity(prev, curr);
            convergenceSum += similarity;
            count++;
        }
    }

    return count > 0 ? convergenceSum / count : 0.5;
}

function calculateEntropyDivergence(debate_history) {
    if (!debate_history || debate_history.length < 2) {
        return 0.0; // no divergence
    }

    // Measure entropy (disorder) in debate rounds
    const leftBrain = debate_history.filter(r => r.hemisphere === 'left');
    const rightBrain = debate_history.filter(r => r.hemisphere === 'right');

    if (leftBrain.length === 0 || rightBrain.length === 0) {
        return 0.0;
    }

    // Simple divergence: compare average response lengths
    const avgLeftLength = leftBrain.reduce((sum, r) => sum + (r.response?.length || 0), 0) / leftBrain.length;
    const avgRightLength = rightBrain.reduce((sum, r) => sum + (r.response?.length || 0), 0) / rightBrain.length;

    const divergence = Math.abs(avgLeftLength - avgRightLength) / Math.max(avgLeftLength, avgRightLength, 1);
    return Math.min(1.0, divergence);
}

function calculateEthicalBalance(bronas_result, omega_t) {
    if (!bronas_result || !bronas_result.success) {
        return 0.0;
    }

    const bronas_score = bronas_result.bronas_score || 0;
    const ethics_component = bronas_result.smrce_breakdown?.ethics || 0;
    
    // Balance = (ethical score * hemispheric balance factor)
    const balance_factor = 1 - Math.abs(omega_t - 0.5) * 2; // 1.0 at omega=0.5, 0.0 at extremes
    const ethical_balance = (bronas_score + ethics_component) / 2 * balance_factor;
    
    return Math.min(1.0, ethical_balance);
}

function calculateTextSimilarity(text1, text2) {
    // Simple Jaccard similarity on words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
}