import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FETCH ETHICS DATASET - Hendrycks Ethics Grounding for BRONAS
 * 
 * Fetches ethics scenarios from HF hendrycks/ethics dataset
 * for BRONAS ethical validation grounding
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[FetchEthics] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            subset = 'commonsense',
            split = 'train',
            limit = 100,
            offset = 0
        } = await req.json();

        addLog('=== FETCHING ETHICS DATASET ===', { subset, split, limit, offset });

        const hfToken = Deno.env.get("HF_TOKEN");

        if (!hfToken) {
            throw new Error('HF_TOKEN not set');
        }

        // Fetch from Hugging Face Datasets API
        const apiUrl = `https://datasets-server.huggingface.co/rows?dataset=hendrycks/ethics&config=${subset}&split=${split}&offset=${offset}&length=${limit}`;
        
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

        addLog('✓ Ethics data fetched', { 
            subset, 
            split, 
            rows_fetched: data.rows.length 
        });

        // Transform data for BRONAS grounding
        const ethicsGrounding = data.rows.map((row, idx) => ({
            id: `${subset}_${split}_${offset + idx}`,
            subset,
            split,
            input: row.row.input,
            label: row.row.label, // 0 = acceptable, 1 = unacceptable
            is_ethical: row.row.label === 0,
            source: 'hendrycks/ethics',
            row_idx: row.row_idx
        }));

        addLog('✓ Data transformed for BRONAS', { 
            total_scenarios: ethicsGrounding.length,
            ethical_count: ethicsGrounding.filter(e => e.is_ethical).length,
            unethical_count: ethicsGrounding.filter(e => !e.is_ethical).length
        });

        return Response.json({
            success: true,
            dataset_info: {
                name: 'hendrycks/ethics',
                subset,
                split,
                offset,
                limit,
                total_fetched: ethicsGrounding.length
            },
            ethics_grounding: ethicsGrounding,
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