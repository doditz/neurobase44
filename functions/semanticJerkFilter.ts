import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * D³STIB SEMANTIC JERK FILTER - v4.7 Core Upgrade
 * Phase 3: 3rd Derivative Analysis (Semantic Jerk Detection)
 * 
 * Detects abrupt changes in semantic direction (jerks) to filter:
 * - Topic drift / non-sequiturs
 * - Logical fallacies
 * - Semantic noise / filler
 * - Adversarial prompt injections
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[JerkFilter] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message,
            conversation_history = [],
            sensitivity = 0.7, // 0.0-1.0 (higher = more sensitive to jerks)
            window_size = 3 // Number of previous messages to analyze
        } = await req.json();

        if (!user_message || user_message.trim().length === 0) {
            return Response.json({ 
                error: 'user_message required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== D³STIB JERK FILTER START ===', { sensitivity, window_size });

        // Step 1: Generate embeddings for current message + conversation history
        const messages = [...conversation_history.slice(-window_size), user_message];
        const embeddings = [];

        for (const msg of messages) {
            const { data: embData } = await base44.functions.invoke('generateEmbedding', {
                text: typeof msg === 'string' ? msg : msg.content || '',
                dimension: 384,
                normalize: true
            });

            if (!embData || !embData.success) {
                addLog('⚠️ Failed to generate embedding for message', { msg: msg.substring(0, 50) });
                continue;
            }

            embeddings.push(embData.embedding);
        }

        if (embeddings.length < 2) {
            // Not enough data for jerk analysis
            return Response.json({
                success: true,
                jerk_detected: false,
                jerk_magnitude: 0,
                reason: 'Insufficient history for jerk analysis',
                filtered_message: user_message,
                logs: log
            });
        }

        addLog('✓ Generated embeddings', { count: embeddings.length });

        // Step 2: Calculate semantic velocities (1st derivative)
        const velocities = [];
        for (let i = 1; i < embeddings.length; i++) {
            const velocity = vectorSubtract(embeddings[i], embeddings[i-1]);
            velocities.push(velocity);
        }

        addLog('✓ Calculated velocities (1st derivative)', { count: velocities.length });

        // Step 3: Calculate semantic accelerations (2nd derivative)
        const accelerations = [];
        for (let i = 1; i < velocities.length; i++) {
            const acceleration = vectorSubtract(velocities[i], velocities[i-1]);
            accelerations.push(acceleration);
        }

        addLog('✓ Calculated accelerations (2nd derivative)', { count: accelerations.length });

        // Step 4: Calculate semantic jerks (3rd derivative)
        const jerks = [];
        for (let i = 1; i < accelerations.length; i++) {
            const jerk = vectorSubtract(accelerations[i], accelerations[i-1]);
            const jerkMagnitude = vectorMagnitude(jerk);
            jerks.push({ jerk, magnitude: jerkMagnitude });
        }

        addLog('✓ Calculated jerks (3rd derivative)', { count: jerks.length });

        // Step 5: Analyze jerk patterns
        const avgJerkMagnitude = jerks.reduce((sum, j) => sum + j.magnitude, 0) / Math.max(jerks.length, 1);
        const maxJerkMagnitude = Math.max(...jerks.map(j => j.magnitude));

        // Adaptive threshold based on sensitivity
        const jerkThreshold = 0.1 * (1 - sensitivity) + 0.5 * sensitivity; // 0.1-0.5 range

        const jerkDetected = maxJerkMagnitude > jerkThreshold;

        addLog(jerkDetected ? '⚠️ JERK DETECTED' : '✓ No significant jerk', {
            max_magnitude: maxJerkMagnitude.toFixed(4),
            avg_magnitude: avgJerkMagnitude.toFixed(4),
            threshold: jerkThreshold.toFixed(4)
        });

        // Step 6: Classify jerk type
        let jerkType = 'none';
        let filteringAction = 'pass';
        let explanation = '';

        if (jerkDetected) {
            // Analyze the pattern to determine jerk type
            const lastJerk = jerks[jerks.length - 1];
            
            if (maxJerkMagnitude > jerkThreshold * 2) {
                jerkType = 'severe_discontinuity';
                filteringAction = 'flag_for_review';
                explanation = 'Severe semantic discontinuity detected - possible topic hijacking or non-sequitur';
            } else if (avgJerkMagnitude > jerkThreshold * 0.8) {
                jerkType = 'high_noise';
                filteringAction = 'apply_noise_reduction';
                explanation = 'High semantic noise - message may contain excessive filler or tangential information';
            } else {
                jerkType = 'moderate_drift';
                filteringAction = 'monitor';
                explanation = 'Moderate semantic drift detected - conversation direction changing';
            }

            addLog(`Jerk classified: ${jerkType}`, { action: filteringAction });
        }

        // Step 7: Apply filtering action
        let filtered_message = user_message;
        let routing_adjustment = {};

        switch (filteringAction) {
            case 'flag_for_review':
                // Increase routing depth for more careful analysis
                routing_adjustment = {
                    routing_layer: 'Deep',
                    debate_rounds: 4, // More rounds for complex cases
                    enable_bronas_strict: true
                };
                break;
            
            case 'apply_noise_reduction':
                // Use LLM to extract core semantic content
                try {
                    const cleanedMsg = await base44.integrations.Core.InvokeLLM({
                        prompt: `Extract ONLY the core semantic content from this message, removing filler words, tangents, and noise. Preserve the main question or statement.\n\nMessage: "${user_message}"\n\nCore content:`,
                        temperature: 0.3
                    });
                    filtered_message = cleanedMsg || user_message;
                    addLog('✓ Noise reduction applied');
                } catch (error) {
                    addLog('⚠️ Noise reduction failed, using original', error.message);
                }
                routing_adjustment = {
                    routing_layer: 'Moderate',
                    enable_semantic_compression: true
                };
                break;
            
            case 'monitor':
                routing_adjustment = {
                    routing_layer: 'Moderate',
                    track_coherence: true
                };
                break;
        }

        addLog('=== JERK FILTER COMPLETE ===');

        return Response.json({
            success: true,
            jerk_detected: jerkDetected,
            jerk_type: jerkType,
            jerk_magnitude: maxJerkMagnitude,
            avg_jerk_magnitude: avgJerkMagnitude,
            threshold: jerkThreshold,
            filtering_action: filteringAction,
            explanation,
            filtered_message,
            routing_adjustment,
            analysis_window: embeddings.length,
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

// Vector math utilities
function vectorSubtract(v1, v2) {
    return v1.map((val, idx) => val - v2[idx]);
}

function vectorMagnitude(v) {
    return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}