import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SYSTEM ENTROPY CALCULATOR v1.0
 * 
 * Implements the System Entropy formula for "Realtime Metrics" UI:
 * Entropy = (CPU_Load_Normalized * 0.5) + (Network_Latency_Normalized * 0.3) + (Complexity_Score * 0.2)
 * 
 * This metric drives the UI to look "alive" while grounded in reality.
 */

function normalizeValue(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const {
            cpu_load_percentage = 0,
            network_latency_ms = 0,
            complexity_score = 0,
            processing_active = false,
            personas_active = 0,
            debate_round_current = 0
        } = await req.json();

        // Normalize CPU Load (0-100% -> 0-1)
        const cpu_normalized = normalizeValue(cpu_load_percentage, 0, 100);

        // Normalize Network Latency (0-5000ms -> 0-1, where 5000ms = max expected)
        const latency_normalized = normalizeValue(network_latency_ms, 0, 5000);

        // Complexity Score already 0-1

        // Base Entropy Formula
        let entropy = (cpu_normalized * 0.5) + (latency_normalized * 0.3) + (complexity_score * 0.2);

        // Add dynamic processing boost if system is actively working
        if (processing_active) {
            entropy += 0.1;
        }

        // Persona activity boost (more personas = more "busy")
        if (personas_active > 0) {
            const personaBoost = Math.min(0.15, personas_active * 0.02);
            entropy += personaBoost;
        }

        // Debate round progression boost
        if (debate_round_current > 0) {
            const roundBoost = Math.min(0.1, debate_round_current * 0.03);
            entropy += roundBoost;
        }

        // Clamp entropy to [0, 1]
        entropy = Math.max(0, Math.min(1, entropy));

        // Determine system state based on entropy
        let system_state;
        let state_color;
        if (entropy < 0.3) {
            system_state = 'idle';
            state_color = 'green';
        } else if (entropy < 0.6) {
            system_state = 'moderate_load';
            state_color = 'yellow';
        } else if (entropy < 0.85) {
            system_state = 'high_load';
            state_color = 'orange';
        } else {
            system_state = 'critical_load';
            state_color = 'red';
        }

        return Response.json({
            success: true,
            entropy: parseFloat(entropy.toFixed(3)),
            system_state,
            state_color,
            breakdown: {
                cpu_contribution: parseFloat((cpu_normalized * 0.5).toFixed(3)),
                latency_contribution: parseFloat((latency_normalized * 0.3).toFixed(3)),
                complexity_contribution: parseFloat((complexity_score * 0.2).toFixed(3)),
                processing_boost: processing_active ? 0.1 : 0,
                persona_boost: personas_active > 0 ? parseFloat((Math.min(0.15, personas_active * 0.02)).toFixed(3)) : 0,
                round_boost: debate_round_current > 0 ? parseFloat((Math.min(0.1, debate_round_current * 0.03)).toFixed(3)) : 0
            },
            inputs: {
                cpu_load_percentage,
                network_latency_ms,
                complexity_score,
                processing_active,
                personas_active,
                debate_round_current
            },
            normalized: {
                cpu: parseFloat(cpu_normalized.toFixed(3)),
                latency: parseFloat(latency_normalized.toFixed(3)),
                complexity: parseFloat(complexity_score.toFixed(3))
            }
        });

    } catch (error) {
        console.error('[systemEntropyCalculator] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});