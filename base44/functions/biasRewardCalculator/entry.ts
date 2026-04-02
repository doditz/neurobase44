import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Bias/Reward Mechanism Calculator
 * Implements B(t) formula
 * 
 * B(t) = Σ ω_j · tanh((δ_j(t) - θ_j)/η_j) · R_j(t)
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
            debate_round_contributions = [], // {persona_handle, quality_score, relevance}
            user_feedback_history = []
        } = await req.json();

        console.log('[BiasRewardCalculator] Calculating B(t) for', debate_round_contributions.length, 'contributions');

        // Load recent user memory for reward signals
        const recentMemories = await base44.asServiceRole.entities.UserMemory.filter({
            created_by: user.email,
            outcome_type: { $in: ['success', 'failure'] }
        }, '-created_date', 10);

        let B_t = 0;
        const component_details = [];

        for (const contribution of debate_round_contributions) {
            const { persona_handle, quality_score = 0.5, relevance = 0.5 } = contribution;

            // Load persona to get bias parameters
            const personas = await base44.asServiceRole.entities.Persona.filter({ handle: persona_handle });
            if (personas.length === 0) continue;

            const persona = personas[0];

            // ω_j: weight based on persona priority and expertise
            const omega_j = (persona.priority_level || 5) / 10 * (persona.expertise_score || 0.5);

            // δ_j(t): deviation from expected (quality * relevance)
            const delta_j = quality_score * relevance;

            // θ_j: threshold (persona's optimal performance level)
            const theta_j = 0.6; // Could be dynamic based on persona's historical performance

            // η_j: sensitivity parameter
            const eta_j = 0.2;

            // R_j(t): reward signal from user feedback
            const matching_feedback = recentMemories.filter(m => 
                m.context?.includes(persona_handle) || m.memory_content?.includes(persona_handle)
            );
            const R_j = matching_feedback.length > 0
                ? matching_feedback.reduce((sum, m) => sum + (m.feedback_score || 0), 0) / matching_feedback.length
                : 0;

            // Calculate component: ω_j · tanh((δ_j - θ_j)/η_j) · R_j
            const tanh_component = Math.tanh((delta_j - theta_j) / eta_j);
            const component = omega_j * tanh_component * (R_j + 0.5); // Add 0.5 to avoid zero reward

            B_t += component;

            component_details.push({
                persona_handle,
                omega_j: omega_j.toFixed(3),
                delta_j: delta_j.toFixed(3),
                tanh_component: tanh_component.toFixed(3),
                R_j: R_j.toFixed(3),
                component: component.toFixed(3)
            });
        }

        // Normalize B(t)
        B_t = B_t / Math.max(debate_round_contributions.length, 1);

        console.log('[BiasRewardCalculator] B(t):', B_t.toFixed(3));

        return Response.json({
            success: true,
            B_t,
            component_details
        });

    } catch (error) {
        console.error('[BiasRewardCalculator] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});