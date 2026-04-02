import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * HUGGING FACE SEMANTIC ANALYSIS - v4.7 Enhancement
 * Performs general semantic analysis (e.g., classification, summarization) 
 * using a Hugging Face model based on provided model_id and task.
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[HF_SemanticAnalysis] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requestData = await req.json();
        const { 
            text,
            model = 'facebook/bart-large-cnn',
            task = 'summarization'
        } = requestData;

        if (!text) {
            return Response.json({ 
                error: 'text parameter required',
                success: false 
            }, { status: 400 });
        }

        addLog(`Performing Hugging Face ${task}`, { text_length: text.length, model });

        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set in environment variables');
        }

        let apiUrl = `https://api-inference.huggingface.co/models/${model}`;
        let body = {};

        switch (task) {
            case 'summarization':
                body = { inputs: text };
                break;
            case 'text-classification':
                body = { inputs: text };
                break;
            case 'question-answering':
                const { question, context } = requestData;
                if (!question || !context) {
                    return Response.json({
                        error: 'question and context required for question-answering task',
                        success: false
                    }, { status: 400 });
                }
                body = { inputs: { question, context } };
                break;
            default:
                throw new Error(`Unsupported task: ${task}`);
        }

        const response = await fetch(apiUrl, {
            headers: { Authorization: `Bearer ${hfToken}` },
            method: "POST",
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();

        addLog(`✓ Hugging Face ${task} complete`, { result_preview: JSON.stringify(result).substring(0, 100) });

        return Response.json({
            success: true,
            result,
            model,
            task,
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