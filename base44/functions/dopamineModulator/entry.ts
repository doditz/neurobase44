import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Dopamine Modulation Calculator
 * Implements D(t) formula with exponential decay
 * 
 * D(t) = D_0 + η Σ exp(-(t - t_i)²/(2σ²)) - κ ∫ D(s) ds
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            D_current = null,
            D_history = [],
            events = [], // {time, magnitude, type}
            current_time = Date.now(),
            D_0 = 0.5, // Baseline
            eta = 0.3, // Boost magnitude
            sigma = 5000, // Time spread (ms)
            kappa = 0.0001 // Decay rate
        } = await req.json();

        console.log('[DopamineModulator] Calculating D(t) with', events.length, 'events');

        // Calculate exponential boost from recent events
        let event_boost = 0;
        for (const event of events) {
            const time_diff = current_time - event.time;
            const gaussian = Math.exp(-(time_diff * time_diff) / (2 * sigma * sigma));
            event_boost += eta * gaussian * (event.magnitude || 1);
        }

        // Calculate decay term (simplified integral approximation)
        const decay_term = kappa * D_history.reduce((sum, d) => sum + d, 0);

        // D(t) = D_0 + event_boost - decay
        let D_t = D_0 + event_boost - decay_term;

        // Clamp to [0, 1]
        D_t = Math.max(0, Math.min(1, D_t));

        // Update history (keep last 50 entries)
        const updated_history = [...D_history, D_t].slice(-50);

        console.log('[DopamineModulator] D(t):', D_t.toFixed(3), 'boost:', event_boost.toFixed(3), 'decay:', decay_term.toFixed(3));

        return Response.json({
            success: true,
            D_t,
            event_boost,
            decay_term,
            D_history: updated_history,
            baseline: D_0
        });

    } catch (error) {
        console.error('[DopamineModulator] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});