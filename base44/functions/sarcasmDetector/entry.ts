import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SARCASM & NUANCE DETECTOR
 * Detects sarcasm, humor, irony, and implied meanings in text
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            text,
            sensitivity = 'medium',
            conversation_id = null,
            include_meta_commentary = true
        } = await req.json();

        if (!text) {
            return Response.json({ error: 'Text required' }, { status: 400 });
        }

        console.log(`[SarcasmDetector] Analyzing text (sensitivity: ${sensitivity})`);

        // Construct detection prompt based on sensitivity
        const sensitivityConfig = {
            low: {
                threshold: 0.7,
                prompt_modifier: 'Only flag obvious, explicit sarcasm.'
            },
            medium: {
                threshold: 0.5,
                prompt_modifier: 'Flag clear sarcasm and irony.'
            },
            high: {
                threshold: 0.3,
                prompt_modifier: 'Flag any subtle hints of sarcasm, irony, or implied meanings.'
            }
        };

        const config = sensitivityConfig[sensitivity] || sensitivityConfig.medium;

        const detectionPrompt = `You are an expert at detecting sarcasm, humor, irony, and nuanced communication patterns.

Analyze the following text for:
1. Sarcasm (saying opposite of what's meant)
2. Irony (situational or verbal)
3. Humor and jokes
4. Understatement or overstatement
5. Implied meanings that differ from literal meaning
6. Subtle emotional undertones

${config.prompt_modifier}

TEXT TO ANALYZE:
"${text}"

Provide your analysis in the following JSON format:
{
  "is_sarcastic": boolean,
  "sarcasm_confidence": number (0-1),
  "detected_tones": [
    {
      "tone": "sarcasm|irony|humor|deadpan|understatement|overstatement|cynicism",
      "confidence": number (0-1),
      "explanation": "brief explanation"
    }
  ],
  "nuances": ["list", "of", "detected", "nuances"],
  "implied_meaning": "what the speaker really means (if different from literal)",
  "meta_commentary": "brief commentary on the tone and communication style"
}`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: detectionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    is_sarcastic: { type: "boolean" },
                    sarcasm_confidence: { type: "number" },
                    detected_tones: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                tone: { type: "string" },
                                confidence: { type: "number" },
                                explanation: { type: "string" }
                            }
                        }
                    },
                    nuances: {
                        type: "array",
                        items: { type: "string" }
                    },
                    implied_meaning: { type: "string" },
                    meta_commentary: { type: "string" }
                }
            }
        });

        // Filter by sensitivity threshold
        const filteredTones = response.detected_tones.filter(
            t => t.confidence >= config.threshold
        );

        const analysis = {
            ...response,
            detected_tones: filteredTones,
            is_sarcastic: response.sarcasm_confidence >= config.threshold
        };

        // Store analysis
        const toneRecord = await base44.asServiceRole.entities.ToneAnalysis.create({
            text,
            conversation_id,
            detected_tones: analysis.detected_tones,
            is_sarcastic: analysis.is_sarcastic,
            sarcasm_confidence: analysis.sarcasm_confidence,
            nuances: analysis.nuances,
            implied_meaning: analysis.implied_meaning,
            meta_commentary: include_meta_commentary ? analysis.meta_commentary : null,
            sensitivity_level: sensitivity,
            created_by: user.email
        });

        console.log(`[SarcasmDetector] Analysis complete: sarcasm=${analysis.is_sarcastic} (${(analysis.sarcasm_confidence * 100).toFixed(0)}%)`);

        return Response.json({
            success: true,
            analysis,
            analysis_id: toneRecord.id,
            sensitivity_used: sensitivity,
            threshold: config.threshold
        });

    } catch (error) {
        console.error('[SarcasmDetector] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});