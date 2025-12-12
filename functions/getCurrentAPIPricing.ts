import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Get Current API Pricing - October 2025
 * Fetches real-time pricing data for major LLM APIs
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
        if (!PERPLEXITY_API_KEY) {
            return Response.json({ error: 'PERPLEXITY_API_KEY not configured' }, { status: 500 });
        }

        console.log('[API Pricing] Fetching current pricing data for October 2025...');

        const query = `What are the current API pricing rates (per 1000 tokens) for October 2025 for:
- OpenAI GPT-4o, GPT-4o-mini, GPT-3.5-turbo
- Anthropic Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- Google Gemini 1.5 Pro, Gemini 1.5 Flash
- Perplexity API (sonar models)
- Mistral Large, Mistral Medium
- Meta Llama 3.1 (via cloud providers)
- HuggingFace Inference API

Please provide input and output token costs separately where applicable, and indicate if there are any recent price changes in October 2025.`;

        // Call Perplexity API for web search
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant spécialisé dans la recherche de tarifs API actuels. Fournis des données précises avec sources.'
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                max_tokens: 3000,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: true,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[API Pricing] Perplexity API Error:', errorText);
            return Response.json({ 
                error: 'Failed to fetch pricing data', 
                details: errorText 
            }, { status: response.status });
        }

        const data = await response.json();
        const pricingInfo = data.choices[0].message.content;
        const citations = data.citations || [];

        console.log('[API Pricing] Successfully fetched pricing data');

        // Store the search result
        try {
            await base44.entities.PerplexitySearch.create({
                query,
                answer: pricingInfo,
                citations,
                model: 'llama-3.1-sonar-large-128k-online',
                tokens_used: data.usage.total_tokens,
                metadata: {
                    prompt_tokens: data.usage.prompt_tokens,
                    completion_tokens: data.usage.completion_tokens,
                    purpose: 'api_pricing_research'
                }
            });
        } catch (storeError) {
            console.error('[API Pricing] Failed to store search result:', storeError);
        }

        return Response.json({
            success: true,
            pricing_info: pricingInfo,
            citations,
            fetched_at: new Date().toISOString(),
            usage: data.usage
        });

    } catch (error) {
        console.error('[API Pricing] Fatal error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});