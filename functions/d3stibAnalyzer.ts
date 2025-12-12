import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * D³STIB - Differential Semantic Token Importance with Jerk Detection
 * 
 * Implements the full D³STIB algorithm for identifying "Critical Concepts":
 * - Weight(token) = Abs(Hash(token) % 1000) / 1000
 * - Velocity[i] = Weight[i] - Weight[i-1]
 * - Acceleration[i] = Velocity[i] - Velocity[i-1]
 * - Jerk[i] = Acceleration[i] - Acceleration[i-1]
 * - If Abs(Jerk) > 0.4 -> Priority: FULL (Add to Memory)
 */

function stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

function calculateWeight(token) {
    const hash = stringToHash(token.toLowerCase());
    return (hash % 1000) / 1000;
}

function calculateDerivatives(weights) {
    const velocity = [];
    const acceleration = [];
    const jerk = [];

    // Calculate velocity (1st derivative)
    for (let i = 1; i < weights.length; i++) {
        velocity.push(weights[i] - weights[i - 1]);
    }

    // Calculate acceleration (2nd derivative)
    for (let i = 1; i < velocity.length; i++) {
        acceleration.push(velocity[i] - velocity[i - 1]);
    }

    // Calculate jerk (3rd derivative)
    for (let i = 1; i < acceleration.length; i++) {
        jerk.push(acceleration[i] - acceleration[i - 1]);
    }

    return { velocity, acceleration, jerk };
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    const logs = [];

    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { text, jerk_threshold = 0.4 } = await req.json();

        if (!text) {
            return Response.json({ error: 'text is required' }, { status: 400 });
        }

        logs.push(`[D³STIB] Processing text: ${text.substring(0, 100)}...`);

        // Tokenize (simple word-based)
        const tokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 2); // Filter out very short tokens

        logs.push(`[D³STIB] Extracted ${tokens.length} tokens`);

        // Calculate weights for each token
        const weights = tokens.map(token => calculateWeight(token));

        // Calculate derivatives
        const { velocity, acceleration, jerk } = calculateDerivatives(weights);

        logs.push(`[D³STIB] Derivatives computed: Velocity[${velocity.length}], Acceleration[${acceleration.length}], Jerk[${jerk.length}]`);

        // Identify critical concepts (high jerk)
        const criticalConcepts = [];
        const tokenAnalysis = [];

        for (let i = 0; i < tokens.length; i++) {
            const jerkIndex = i - 3; // Jerk starts 3 positions after token
            const jerkValue = jerkIndex >= 0 && jerkIndex < jerk.length ? jerk[jerkIndex] : null;
            const absJerk = jerkValue !== null ? Math.abs(jerkValue) : 0;

            const priority = absJerk > jerk_threshold ? 'FULL' : absJerk > jerk_threshold * 0.5 ? 'MEDIUM' : 'LOW';

            const analysis = {
                token: tokens[i],
                weight: weights[i].toFixed(4),
                velocity: i >= 1 && velocity[i - 1] ? velocity[i - 1].toFixed(4) : null,
                acceleration: i >= 2 && acceleration[i - 2] ? acceleration[i - 2].toFixed(4) : null,
                jerk: jerkValue !== null ? jerkValue.toFixed(4) : null,
                abs_jerk: absJerk.toFixed(4),
                priority,
                is_critical: priority === 'FULL'
            };

            tokenAnalysis.push(analysis);

            if (priority === 'FULL') {
                criticalConcepts.push({
                    token: tokens[i],
                    jerk_value: absJerk,
                    weight: weights[i],
                    position: i
                });
            }
        }

        logs.push(`[D³STIB] Identified ${criticalConcepts.length} critical concepts with |Jerk| > ${jerk_threshold}`);

        const processingTime = Date.now() - startTime;

        return Response.json({
            success: true,
            critical_concepts: criticalConcepts,
            full_analysis: tokenAnalysis,
            summary: {
                total_tokens: tokens.length,
                critical_count: criticalConcepts.length,
                critical_percentage: ((criticalConcepts.length / tokens.length) * 100).toFixed(1),
                jerk_threshold,
                processing_time_ms: processingTime
            },
            logs
        });

    } catch (error) {
        console.error('[d3stibAnalyzer] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack,
            logs
        }, { status: 500 });
    }
});