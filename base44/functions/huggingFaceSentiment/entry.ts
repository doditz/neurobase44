import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HUGGING FACE SENTIMENT ANALYSIS - v4.7 Enhancement
 * Performs sentiment analysis on text using a Hugging Face model.
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[HF_Sentiment] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text, model = 'distilbert/distilbert-base-uncased-finetuned-sst-2-english' } = await req.json();

        if (!text) {
            return Response.json({ 
                error: 'text parameter required',
                success: false 
            }, { status: 400 });
        }

        addLog('Performing Hugging Face sentiment analysis', { text_length: text.length, model });

        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set in environment variables');
        }

        const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
                headers: { Authorization: `Bearer ${hfToken}` },
                method: "POST",
                body: JSON.stringify({ inputs: text })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        if (!Array.isArray(result) || result.length === 0 || !Array.isArray(result[0])) {
            throw new Error('Unexpected response format from Hugging Face API');
        }

        const sentiment = result[0].reduce((prev, current) => (
            current.score > prev.score ? current : prev
        ));

        addLog('✓ Sentiment analysis complete', { label: sentiment.label, score: sentiment.score.toFixed(4) });

        return Response.json({
            success: true,
            sentiment: sentiment.label,
            score: sentiment.score,
            details: result[0],
            model,
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