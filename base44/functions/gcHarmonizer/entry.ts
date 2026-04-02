import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * GC HARMONIZER v2.0 - ANALYSIS Module
 * 
 * This module no longer synthesizes. It ANALYZES the final output
 * from QRONAS to ensure hemispheric balance.
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { final_synthesis, structured_debate } = await req.json();

        if (!final_synthesis || !structured_debate) {
            return Response.json({ 
                error: 'final_synthesis and structured_debate are required' 
            }, { status: 400 });
        }

        // Placeholder logic for analyzing balance
        const left_contributions = structured_debate.opening_statements.filter(s => s.hemisphere === 'Left').length;
        const right_contributions = structured_debate.opening_statements.filter(s => s.hemisphere === 'Right').length;
        const central_contributions = structured_debate.opening_statements.filter(s => s.hemisphere === 'Central').length;
        const total = left_contributions + right_contributions + central_contributions;

        const weights = {
            left: total > 0 ? left_contributions / total : 0,
            right: total > 0 ? right_contributions / total : 0,
            central: total > 0 ? central_contributions / total : 0,
        };

        // Simple similarity score based on keywords in final synthesis
        const analytical_keywords = ['logical', 'data', 'analysis', 'quantitative'];
        const creative_keywords = ['innovative', 'perspective', 'feel', 'imagine'];
        
        let analytical_score = 0;
        analytical_keywords.forEach(k => {
            if (final_synthesis.toLowerCase().includes(k)) analytical_score++;
        });

        let creative_score = 0;
        creative_keywords.forEach(k => {
            if (final_synthesis.toLowerCase().includes(k)) creative_score++;
        });

        const similarity_score = 1 - Math.abs(analytical_score - creative_score) / (analytical_score + creative_score || 1);
        const consensus_reached = similarity_score > 0.7;

        return Response.json({
            success: true,
            analysis: {
                weights,
                similarity_score: parseFloat(similarity_score.toFixed(3)),
                consensus_reached,
                is_balanced: Math.abs(weights.left - weights.right) < 0.3
            }
        });

    } catch (error) {
        console.error('[gcHarmonizer] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});