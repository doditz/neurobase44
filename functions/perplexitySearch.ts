import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Perplexity Search Integration
 * Advanced web search with cited sources for Neuronas debates
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, model = 'llama-3.1-sonar-large-128k-online', max_tokens = 2000, conversation_id } = await req.json();
        
        if (!query) {
            return Response.json({ error: 'Missing query parameter' }, { status: 400 });
        }

        const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
        if (!PERPLEXITY_API_KEY) {
            return Response.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 });
        }

        console.log('[Perplexity] Starting search:', query.substring(0, 100));

        // Call Perplexity API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant de recherche pour Neuronas AI. Fournis des informations factuelles avec sources citées.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: true,
                return_images: false,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Perplexity] API Error:', errorText);
            return Response.json({ 
                error: 'Perplexity API error', 
                details: errorText 
            }, { status: response.status });
        }

        const data = await response.json();
        
        console.log('[Perplexity] Search completed successfully');

        // Extract response and citations
        const searchResult = {
            query,
            answer: data.choices[0].message.content,
            citations: data.citations || [],
            model: data.model,
            usage: data.usage,
            conversation_id
        };

        // Store search result in entity
        try {
            await base44.entities.PerplexitySearch.create({
                query,
                answer: searchResult.answer,
                citations: searchResult.citations,
                model,
                tokens_used: data.usage.total_tokens,
                conversation_id,
                metadata: {
                    prompt_tokens: data.usage.prompt_tokens,
                    completion_tokens: data.usage.completion_tokens
                }
            });
        } catch (storeError) {
            console.error('[Perplexity] Failed to store result:', storeError);
            // Continue anyway
        }

        return Response.json({
            success: true,
            result: searchResult
        });

    } catch (error) {
        console.error('[Perplexity] Fatal error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});