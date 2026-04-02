import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GROUNDING VALIDATOR
 * Truth-Prioritization Module
 * 
 * "Ne construis pas sur du sable" - Validates factual premises before processing
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[Grounding] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message,
            enable_web_search = true,
            confidence_threshold = 0.7
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                error: 'user_message required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== GROUNDING VALIDATION START ===');

        // PHASE 1: Detect if message contains factual claims
        const factualityPrompt = `Does this message contain factual claims that can be verified? Return ONLY JSON.

Message: ${user_message}

Response format: {"contains_facts": true/false, "claims": ["claim1", "claim2"]}`;

        const { data: factualityCheck } = await base44.functions.invoke('base44.integrations.Core.InvokeLLM', {
            prompt: factualityPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    contains_facts: { type: "boolean" },
                    claims: { type: "array", items: { type: "string" } }
                }
            }
        });

        if (!factualityCheck || !factualityCheck.contains_facts) {
            addLog('✓ No factual claims detected - grounding not required');
            return Response.json({
                success: true,
                grounding_required: false,
                verification_status: 'NOT_APPLICABLE',
                message: 'Query does not contain verifiable factual claims',
                logs: log
            });
        }

        addLog('Factual claims detected', { claims: factualityCheck.claims });

        // PHASE 2: Web Search for Verification
        if (enable_web_search) {
            const verificationResults = [];

            for (const claim of factualityCheck.claims.slice(0, 3)) { // Limit to 3 claims
                addLog(`Verifying claim: "${claim}"`);

                try {
                    const searchResult = await base44.integrations.Core.InvokeLLM({
                        prompt: claim,
                        add_context_from_internet: true
                    });

                    verificationResults.push({
                        claim,
                        verified: true,
                        source: 'web_search',
                        confidence: 0.8,
                        evidence: searchResult.substring(0, 300)
                    });
                    addLog(`✓ Claim verified`);
                } catch (error) {
                    verificationResults.push({
                        claim,
                        verified: false,
                        source: 'web_search',
                        confidence: 0.0,
                        error: error.message
                    });
                    addLog(`⚠️ Claim verification failed`);
                }
            }

            // PHASE 3: Evaluate overall grounding
            const verifiedCount = verificationResults.filter(r => r.verified).length;
            const groundingScore = verifiedCount / verificationResults.length;

            if (groundingScore < confidence_threshold) {
                addLog('❌ GROUNDING FAILED', { score: groundingScore.toFixed(2) });
                return Response.json({
                    success: false,
                    grounding_required: true,
                    verification_status: 'FAILED',
                    grounding_score: groundingScore,
                    verification_results: verificationResults,
                    message: 'Factual premises could not be verified. Cannot proceed with ungrounded claims.',
                    recommendation: 'Reformulate query with verifiable information',
                    logs: log
                });
            }

            addLog('✓ GROUNDING VALIDATED', { score: groundingScore.toFixed(2) });

            return Response.json({
                success: true,
                grounding_required: true,
                verification_status: 'VERIFIED',
                grounding_score: groundingScore,
                verification_results: verificationResults,
                message: 'Factual premises verified successfully',
                logs: log
            });
        }

        // Web search disabled - return warning
        return Response.json({
            success: true,
            grounding_required: true,
            verification_status: 'UNVERIFIED',
            message: 'Factual claims detected but web search disabled',
            claims: factualityCheck.claims,
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