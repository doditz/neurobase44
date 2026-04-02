import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FETCH UNESCO ETHICS DATASET - UNESCO AI Ethics Principles for BRONAS
 * 
 * Fetches UNESCO ethical framework scenarios from HF ktiyab/ethical-framework-UNESCO-Ethics-of-AI
 * for BRONAS ethical validation grounding
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[FetchUNESCO] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            limit = 50,
            offset = 0
        } = await req.json();

        addLog('=== FETCHING UNESCO ETHICS DATASET ===', { limit, offset });

        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set');
        }

        // Fetch from Hugging Face Datasets API
        const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=ktiyab/ethical-framework-UNESCO-Ethics-of-AI&config=default&split=train&offset=${offset}&length=${limit}`;
        
        addLog('Fetching from HF API', { url: apiUrl });

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${hfToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HF API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.rows || !Array.isArray(data.rows)) {
            throw new Error('Unexpected response format from HF API');
        }

        addLog('✓ UNESCO ethics data fetched', { 
            rows_fetched: data.rows.length 
        });

        // Transform data for BRONAS grounding
        const unescoGrounding = data.rows.map((row, idx) => ({
            id: row.row.id,
            principle: row.row.principle,
            instruction: row.row.instruction,
            response: row.row.response,
            source: 'UNESCO/ktiyab',
            row_idx: row.row_idx
        }));

        // Extract unique principles
        const principles = [...new Set(unescoGrounding.map(g => g.principle))];

        addLog('✓ Data transformed for BRONAS', { 
            total_scenarios: unescoGrounding.length,
            unique_principles: principles.length,
            principles
        });

        return Response.json({
            success: true,
            dataset_info: {
                name: 'ktiyab/ethical-framework-UNESCO-Ethics-of-AI',
                source: 'UNESCO Recommendation on AI Ethics (2021)',
                offset,
                limit,
                total_fetched: unescoGrounding.length,
                total_in_dataset: 487
            },
            unesco_principles: principles,
            ethics_grounding: unescoGrounding,
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