import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Global State Calculator
 * Implements G(t) and ω(t) formulas
 * 
 * G(t) = ω(t) · F_L(t) + (1 - ω(t)) · F_R(t) - λ_B B(t) + Φ(t)
 * dω/dt = α_D · (D(t) - D_0) - β_D · ω(t)
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            F_L,
            F_R,
            B_t,
            D_t,
            omega_current = 0.5,
            Phi_t = 0, // External influence (from web search, context)
            D_0 = 0.5,
            lambda_B = 0.1, // Bias penalty coefficient
            alpha_D = 0.3, // D influence on omega
            beta_D = 0.1, // Omega decay
            delta_t = 1 // Time step
        } = await req.json();

        console.log('[GlobalStateCalculator] Calculating G(t) and ω(t)');

        // Calculate dω/dt = α_D · (D(t) - D_0) - β_D · ω(t)
        const d_omega_dt = alpha_D * (D_t - D_0) - beta_D * omega_current;

        // Update ω(t) using Euler method: ω(t+Δt) = ω(t) + dω/dt · Δt
        let omega_next = omega_current + d_omega_dt * delta_t;

        // Clamp ω to [0, 1]
        omega_next = Math.max(0, Math.min(1, omega_next));

        // Calculate G(t) = ω(t) · F_L + (1 - ω(t)) · F_R - λ_B · B(t) + Φ(t)
        const G_t = omega_next * F_L + (1 - omega_next) * F_R - lambda_B * B_t + Phi_t;

        console.log('[GlobalStateCalculator] G(t):', G_t.toFixed(3), 'ω(t):', omega_next.toFixed(3));

        return Response.json({
            success: true,
            G_t,
            omega: omega_next,
            d_omega_dt,
            breakdown: {
                left_contribution: (omega_next * F_L).toFixed(3),
                right_contribution: ((1 - omega_next) * F_R).toFixed(3),
                bias_penalty: (-lambda_B * B_t).toFixed(3),
                external_influence: Phi_t.toFixed(3)
            }
        });

    } catch (error) {
        console.error('[GlobalStateCalculator] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});