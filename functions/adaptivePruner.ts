import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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
            debate_history = [],
            active_personas = [],
            target_quality_threshold = 0.85,
            max_rounds = 10,
            current_round = 1,
            complexity_score = 0.5
        } = requestData;

        // DSTIB thresholds
        const ACCELERATION_THRESHOLD = 0.15; // Quality improvement rate
        const JERK_THRESHOLD = 0.10; // Rate of change of acceleration
        const CONVERGENCE_THRESHOLD = 0.85; // Semantic similarity

        // Calculate base rounds based on complexity
        const baseRounds = Math.max(3, Math.ceil(max_rounds * complexity_score));
        
        // Check for convergence
        let convergenceDetected = false;
        let acceleration = 0;
        let jerk = 0;
        
        if (debate_history.length >= 3) {
            const recentRounds = debate_history.slice(-3);
            
            // Calculate quality trajectory
            const qualities = recentRounds.map(r => r.ars_score || 0.5);
            
            // Velocity (first derivative) = change in quality
            const velocity1 = qualities[1] - qualities[0];
            const velocity2 = qualities[2] - qualities[1];
            
            // Acceleration (second derivative) = change in velocity
            acceleration = velocity2 - velocity1;
            
            // Jerk (third derivative) - only if we have enough data
            if (debate_history.length >= 4) {
                const prevQualities = debate_history.slice(-4, -1).map(r => r.ars_score || 0.5);
                const prevVelocity1 = prevQualities[1] - prevQualities[0];
                const prevVelocity2 = prevQualities[2] - prevQualities[1];
                const prevAcceleration = prevVelocity2 - prevVelocity1;
                jerk = acceleration - prevAcceleration;
            }
            
            // Check for convergence (semantic similarity)
            const lastResponse = recentRounds[recentRounds.length - 1]?.response || '';
            const prevResponse = recentRounds[recentRounds.length - 2]?.response || '';
            
            const similarity = calculateSimpleSimilarity(lastResponse, prevResponse);
            
            // Convergence conditions (DSTIB)
            if (similarity > CONVERGENCE_THRESHOLD) {
                convergenceDetected = true;
            }
            
            // Quality plateau detection
            if (Math.abs(acceleration) < ACCELERATION_THRESHOLD && Math.abs(jerk) < JERK_THRESHOLD) {
                convergenceDetected = true;
            }
        }

        // Calculate if we should prune
        const shouldPrune = convergenceDetected || current_round >= baseRounds;
        
        let prunedRounds = 0;
        if (shouldPrune && current_round < max_rounds) {
            prunedRounds = max_rounds - current_round;
        }

        // Persona pruning (if too many are inactive/redundant)
        const prunedPersonas = [];
        if (active_personas.length > 8) {
            // Keep only top priority and most relevant
            prunedPersonas.push(...active_personas.slice(8));
        }

        const tokensSaved = prunedRounds * 150 + prunedPersonas.length * 50;

        return Response.json({
            success: true,
            should_stop_debate: shouldPrune,
            pruned_rounds: prunedRounds,
            pruned_personas: prunedPersonas.map(p => p.handle || p.name),
            tokens_saved_estimated: tokensSaved,
            convergence_detected: convergenceDetected,
            recommended_total_rounds: baseRounds,
            dstib_metrics: {
                acceleration: parseFloat(acceleration.toFixed(4)),
                jerk: parseFloat(jerk.toFixed(4)),
                acceleration_threshold: ACCELERATION_THRESHOLD,
                jerk_threshold: JERK_THRESHOLD,
                convergence_threshold: CONVERGENCE_THRESHOLD
            },
            reasoning: convergenceDetected 
                ? `Convergence detected: acceleration=${acceleration.toFixed(3)}, jerk=${jerk.toFixed(3)}` 
                : `Complexity-based pruning: ${complexity_score.toFixed(2)} → ${baseRounds} rounds`,
            debug: {
                current_round,
                max_rounds,
                base_rounds: baseRounds,
                debate_history_length: debate_history.length
            }
        });

    } catch (error) {
        console.error('AdaptivePruner error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});

// Simple similarity calculation (Jaccard index on words)
function calculateSimpleSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
}