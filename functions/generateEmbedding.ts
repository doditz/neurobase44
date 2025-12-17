import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * GENERATE EMBEDDING - Vector Embedding Service
 * Phase 2 of v4.7 Upgrade: Semantic Vector Generation
 * 
 * Uses LLM-based embedding generation for semantic understanding
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[Embedding] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            text,
            dimension = 384, // Standard embedding dimension
            normalize = true
        } = await req.json();

        if (!text || text.trim().length === 0) {
            return Response.json({ 
                error: 'Text input required',
                success: false 
            }, { status: 400 });
        }

        addLog('Generating embedding', { length: text.length, dimension });

        // Use Core.InvokeLLM to generate semantic embedding
        // We'll ask the LLM to produce a dense vector representation
        const embeddingPrompt = `Generate a ${dimension}-dimensional semantic embedding vector for the following text.
Return ONLY a JSON array of ${dimension} floating-point numbers between -1.0 and 1.0, representing the semantic meaning.

Text to embed: "${text.substring(0, 500)}"

Requirements:
- Output MUST be a valid JSON array of exactly ${dimension} numbers
- Each number should be between -1.0 and 1.0
- Capture semantic meaning, not just keywords
- Example format: [0.234, -0.567, 0.891, ...]`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: embeddingPrompt,
            temperature: 0.1, // Low temperature for consistency
            response_json_schema: {
                type: "object",
                properties: {
                    embedding: {
                        type: "array",
                        items: { type: "number" }
                    }
                }
            }
        });

        let embedding = response.embedding || [];

        // Validation
        if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Failed to generate valid embedding array');
        }

        // Pad or truncate to exact dimension
        if (embedding.length < dimension) {
            embedding = [...embedding, ...Array(dimension - embedding.length).fill(0)];
        } else if (embedding.length > dimension) {
            embedding = embedding.slice(0, dimension);
        }

        // Normalize to unit vector if requested
        if (normalize) {
            const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
            if (magnitude > 0) {
                embedding = embedding.map(val => val / magnitude);
            }
        }

        addLog('✓ Embedding generated', { 
            dimension: embedding.length,
            normalized: normalize,
            sample: embedding.slice(0, 5).map(v => v.toFixed(3))
        });

        return Response.json({
            success: true,
            embedding,
            metadata: {
                dimension: embedding.length,
                normalized: normalize,
                text_length: text.length
            },
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