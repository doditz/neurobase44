import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Hemisphere Dynamics Calculator
 * Implements F_L(t) and F_R(t) formulas
 * 
 * F_L(t) = ∫ α_L(s) · ∇C_L(s) × A_L(s) ds
 * F_R(t) = ∫ α_R(s) · ∇C_R(s) × A_R(s) ds
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            personas_active,
            prompt_complexity,
            debate_history = [],
            current_time = Date.now()
        } = await req.json();

        console.log('[HemisphereDynamics] Calculating forces for', personas_active?.length, 'personas');

        // Load active personas
        const personas = [];
        for (const handle of (personas_active || [])) {
            try {
                const p = await base44.asServiceRole.entities.Persona.filter({ handle });
                if (p.length > 0) personas.push(p[0]);
            } catch (error) {
                console.warn('[HemisphereDynamics] Failed to load persona:', handle);
            }
        }

        // Separate personas by hemisphere
        const leftPersonas = personas.filter(p => p.hemisphere === 'Left');
        const rightPersonas = personas.filter(p => p.hemisphere === 'Right');
        const centralPersonas = personas.filter(p => p.hemisphere === 'Central');

        // Calculate α (learning rate/adaptation coefficient) based on complexity
        const alpha_L = 0.5 + (prompt_complexity * 0.3); // 0.5-0.8 range
        const alpha_R = 0.5 + ((1 - prompt_complexity) * 0.3); // Inverse for balance

        // Calculate ∇C (complexity gradient) - how complexity changes over debate
        const complexity_gradient_L = debate_history.length > 1 
            ? (debate_history[debate_history.length - 1]?.complexity_score || prompt_complexity) - prompt_complexity
            : 0;
        const complexity_gradient_R = -complexity_gradient_L; // Opposite for right hemisphere

        // Calculate A (activation strength) - weighted by expertise
        const activation_L = leftPersonas.reduce((sum, p) => 
            sum + (p.expertise_score || 0.5) * (p.priority_level || 5) / 10, 0
        ) / Math.max(leftPersonas.length, 1);

        const activation_R = rightPersonas.reduce((sum, p) => 
            sum + (p.expertise_score || 0.5) * (p.priority_level || 5) / 10, 0
        ) / Math.max(rightPersonas.length, 1);

        // Central personas contribute to both
        const central_contribution = centralPersonas.reduce((sum, p) => 
            sum + (p.expertise_score || 0.5) * (p.priority_level || 5) / 10, 0
        ) / Math.max(centralPersonas.length, 1);

        // F_L(t) = α_L · ∇C_L × A_L (cross product approximated as multiplication + central)
        const F_L = alpha_L * Math.abs(complexity_gradient_L) * activation_L + (central_contribution * 0.5);

        // F_R(t) = α_R · ∇C_R × A_R
        const F_R = alpha_R * Math.abs(complexity_gradient_R) * activation_R + (central_contribution * 0.5);

        // Normalize to [0, 1]
        const total = F_L + F_R;
        const F_L_normalized = total > 0 ? F_L / total : 0.5;
        const F_R_normalized = total > 0 ? F_R / total : 0.5;

        console.log('[HemisphereDynamics] F_L:', F_L_normalized.toFixed(3), 'F_R:', F_R_normalized.toFixed(3));

        return Response.json({
            success: true,
            F_L: F_L_normalized,
            F_R: F_R_normalized,
            alpha_L,
            alpha_R,
            activation_L,
            activation_R,
            complexity_gradient_L,
            complexity_gradient_R,
            left_personas_count: leftPersonas.length,
            right_personas_count: rightPersonas.length,
            central_personas_count: centralPersonas.length
        });

    } catch (error) {
        console.error('[HemisphereDynamics] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});