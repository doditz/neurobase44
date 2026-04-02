import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Grounded Validation Engine
 * Mandatory web search for claim validation
 * Implements Φ(t) - External Influence/Validation
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            response_text,
            claims_to_validate = [],
            validation_mode = 'strict' // 'strict' or 'moderate'
        } = await req.json();

        console.log('[GroundedValidation] Validating', claims_to_validate.length, 'claims');

        const validation_results = [];
        let Phi_t = 0; // External influence score
        let total_confidence = 0;

        // Extract claims from response if not provided
        let claims = claims_to_validate;
        if (claims.length === 0 && response_text) {
            // Use LLM to extract factual claims
            const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Extract all factual claims from this text that can be verified:

"${response_text}"

Return a JSON array of claims, each with a 'claim' field.`,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        claims: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    claim: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            });

            claims = extraction.claims?.map(c => c.claim) || [];
            console.log('[GroundedValidation] Extracted', claims.length, 'claims');
        }

        // Validate each claim via web search
        for (const claim of claims) {
            try {
                console.log('[GroundedValidation] Validating:', claim);

                // Perform web search
                const searchResults = await base44.asServiceRole.integrations.search_web({
                    query: claim,
                    limit: 3
                });

                // Use LLM to verify claim against search results
                const verification = await base44.asServiceRole.integrations.Core.InvokeLLM({
                    prompt: `Verify this claim against web search results:

CLAIM: "${claim}"

SEARCH RESULTS:
${searchResults.map((r, i) => `${i+1}. ${r.title}: ${r.description}`).join('\n')}

Is the claim supported, contradicted, or uncertain based on these results?
Provide a confidence score (0.0-1.0) and brief reasoning.`,
                    response_json_schema: {
                        type: 'object',
                        properties: {
                            verdict: { 
                                type: 'string',
                                enum: ['supported', 'contradicted', 'uncertain']
                            },
                            confidence: { type: 'number' },
                            reasoning: { type: 'string' }
                        }
                    }
                });

                validation_results.push({
                    claim,
                    verdict: verification.verdict,
                    confidence: verification.confidence,
                    reasoning: verification.reasoning,
                    sources: searchResults.map(r => r.url)
                });

                // Update Phi_t based on validation
                if (verification.verdict === 'supported') {
                    Phi_t += verification.confidence * 0.2; // Positive influence
                } else if (verification.verdict === 'contradicted') {
                    Phi_t -= verification.confidence * 0.3; // Negative influence
                }

                total_confidence += verification.confidence;

            } catch (error) {
                console.warn('[GroundedValidation] Failed to validate claim:', error.message);
                validation_results.push({
                    claim,
                    verdict: 'error',
                    confidence: 0,
                    reasoning: error.message
                });
            }
        }

        // Calculate overall validation score
        const avg_confidence = claims.length > 0 ? total_confidence / claims.length : 0.5;
        const supported_count = validation_results.filter(v => v.verdict === 'supported').length;
        const contradicted_count = validation_results.filter(v => v.verdict === 'contradicted').length;

        // Normalize Phi_t to [-1, 1] range
        Phi_t = Math.max(-1, Math.min(1, Phi_t));

        const validation_passed = validation_mode === 'strict'
            ? contradicted_count === 0 && avg_confidence > 0.6
            : contradicted_count < claims.length * 0.3 && avg_confidence > 0.4;

        console.log('[GroundedValidation] Φ(t):', Phi_t.toFixed(3), 'Validation:', validation_passed ? 'PASS' : 'FAIL');

        return Response.json({
            success: true,
            Phi_t,
            validation_passed,
            validation_results,
            summary: {
                total_claims: claims.length,
                supported: supported_count,
                contradicted: contradicted_count,
                uncertain: claims.length - supported_count - contradicted_count,
                avg_confidence: avg_confidence.toFixed(3)
            }
        });

    } catch (error) {
        console.error('[GroundedValidation] Error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            Phi_t: 0
        }, { status: 500 });
    }
});