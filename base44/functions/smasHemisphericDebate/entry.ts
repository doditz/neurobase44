import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SMAS HEMISPHERIC DEBATE v4.3
 * Specialized Modal Arbitration System
 * 
 * Implements true Left vs Right hemisphere confrontation
 * Left attacks Right's hallucinations, Right attacks Left's rigidity
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[SMAS] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message,
            filtered_message,
            complexity_score = 0.5,
            max_personas = 5,
            debate_rounds = 3,
            omega_t = 0.5 // Hemispheric balance
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                error: 'user_message required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== SMAS HEMISPHERIC DEBATE START ===', {
            complexity: complexity_score.toFixed(2),
            omega_t: omega_t.toFixed(2),
            rounds: debate_rounds
        });

        // PHASE 1: SELECT PERSONAS (Hemisphere-based)
        const leftPersonas = await base44.asServiceRole.entities.Persona.filter({
            hemisphere: 'left',
            status: 'Active'
        }, '-expertise_score', Math.ceil(max_personas / 2));

        const rightPersonas = await base44.asServiceRole.entities.Persona.filter({
            hemisphere: 'right',
            status: 'Active'
        }, '-expertise_score', Math.ceil(max_personas / 2));

        addLog('Personas selected', { 
            left: leftPersonas.map(p => p.name),
            right: rightPersonas.map(p => p.name)
        });

        // PHASE 2: DEBATE ROUNDS
        const debateHistory = [];
        let leftArgument = null;
        let rightArgument = null;

        for (let round = 1; round <= debate_rounds; round++) {
            addLog(`--- ROUND ${round} ---`);

            // LEFT HEMISPHERE: Analytical Processing
            addLog('Left hemisphere processing...');
            const leftPrompt = `[LEFT HEMISPHERE - ANALYTICAL MODE]
You are ${leftPersonas[0]?.name || 'LogicalAnalyzer'}. Analyze this query with pure logic and evidence.

Query: ${filtered_message || user_message}

${rightArgument ? `\nCRITIQUE the Right Hemisphere's response for hallucinations or ungrounded claims:\n${rightArgument}` : ''}

Provide ONLY:
1. Factual analysis
2. Logical deductions
3. Evidence-based conclusions
4. Critique of any unverified claims`;

            const { data: leftResponse } = await base44.functions.invoke('base44.integrations.Core.InvokeLLM', {
                prompt: leftPrompt
            });

            leftArgument = leftResponse || "Left hemisphere processing failed";
            debateHistory.push({
                round,
                hemisphere: 'left',
                persona: leftPersonas[0]?.name,
                response: leftArgument
            });
            addLog('✓ Left hemisphere response received');

            // RIGHT HEMISPHERE: Creative Processing
            addLog('Right hemisphere processing...');
            const rightPrompt = `[RIGHT HEMISPHERE - CREATIVE MODE]
You are ${rightPersonas[0]?.name || 'CreativeExplorer'}. Explore this query with intuition and context.

Query: ${filtered_message || user_message}

${leftArgument ? `\nCRITIQUE the Left Hemisphere's response for rigidity or missing nuance:\n${leftArgument}` : ''}

Provide ONLY:
1. Contextual understanding
2. Intuitive insights
3. Analogies and metaphors
4. Critique of overly rigid interpretations`;

            const { data: rightResponse } = await base44.functions.invoke('base44.integrations.Core.InvokeLLM', {
                prompt: rightPrompt
            });

            rightArgument = rightResponse || "Right hemisphere processing failed";
            debateHistory.push({
                round,
                hemisphere: 'right',
                persona: rightPersonas[0]?.name,
                response: rightArgument
            });
            addLog('✓ Right hemisphere response received');
        }

        // PHASE 3: GC HARMONIZATION (Corpus Callosum Integration)
        addLog('GC Harmonization: Synthesizing hemispheres...');
        const harmonizationPrompt = `[GENIUS CENTRAL - GC HARMONIZER]
You are the Corpus Callosum integrating both hemispheres.

LEFT HEMISPHERE (Analytical):
${leftArgument}

RIGHT HEMISPHERE (Creative):
${rightArgument}

TASK: Synthesize a balanced response that:
1. Uses Left's factual grounding
2. Uses Right's contextual nuance
3. Resolves contradictions
4. Produces a coherent, useful answer

Original Query: ${user_message}`;

        const { data: harmonizedResponse } = await base44.functions.invoke('base44.integrations.Core.InvokeLLM', {
            prompt: harmonizationPrompt
        });

        const finalResponse = harmonizedResponse || leftArgument;

        addLog('=== SMAS DEBATE COMPLETE ===');

        return Response.json({
            success: true,
            debate_history: debateHistory,
            hemispheric_outputs: {
                left: leftArgument,
                right: rightArgument
            },
            harmonized_response: finalResponse,
            personas_used: {
                left: leftPersonas.map(p => p.name),
                right: rightPersonas.map(p => p.name)
            },
            debate_rounds_executed: debate_rounds,
            omega_t: omega_t,
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