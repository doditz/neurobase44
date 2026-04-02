import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * D3STIB Optimizer - Central orchestration for all optimization strategies
 * Coordinates: Compression, QRONAS, Team Optimization, Adaptive Pruning
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }

        const { prompt, config = {} } = await req.json();
        
        if (!prompt) {
            return Response.json({ 
                error: 'Missing prompt parameter', 
                success: false 
            }, { status: 400 });
        }

        const log = [];
        const addLog = (msg) => {
            const timestamp = new Date().toISOString().substring(11, 23);
            const entry = `[${timestamp}] ${msg}`;
            log.push(entry);
            console.log(`[D3STIB] ${entry}`);
        };

        addLog('='.repeat(60));
        addLog('D3STIB OPTIMIZER - START');
        addLog('='.repeat(60));

        const result = {
            success: true,
            compressed_prompt: prompt,
            compression_stats: null,
            qronas_config: null,
            team_composition: null,
            optimization_applied: [],
            fallbacks_used: [],
            log
        };

        // ====================================================================
        // STEP 1: SEMANTIC COMPRESSION
        // ====================================================================
        addLog('>>> STEP 1: Semantic Compression <<<');
        
        try {
            const compressionResult = await base44.functions.invoke('semanticCompressor', {
                prompt: prompt,
                lang: config.lang || 'fr',
                ratio: config.compression_ratio || 0.4
            });

            if (compressionResult.data?.success) {
                result.compressed_prompt = compressionResult.data.compressed_prompt;
                result.compression_stats = {
                    original_length: compressionResult.data.original_length,
                    compressed_length: compressionResult.data.compressed_length,
                    ratio: compressionResult.data.compression_ratio,
                    tokens_saved: compressionResult.data.tokens_saved_estimated
                };
                result.optimization_applied.push('semantic_compression');
                addLog(`✅ Compression: ${(result.compression_stats.ratio * 100).toFixed(1)}% saved`);
            } else {
                throw new Error('Compression failed');
            }
        } catch (error) {
            addLog(`⚠️ Compression failed: ${error.message}, using original prompt`);
            result.fallbacks_used.push('compression_skipped');
        }

        // ====================================================================
        // STEP 2: QRONAS ROUTING
        // ====================================================================
        addLog('>>> STEP 2: QRONAS Quantum Routing <<<');
        
        try {
            const qronasResult = await base44.functions.invoke('qronasSimulator', {
                prompt: result.compressed_prompt,
                cfg: config.qronas_config || {}
            });

            if (qronasResult.data?.success) {
                result.qronas_config = {
                    complexity_score: qronasResult.data.complexity_score,
                    dominant_hemisphere: qronasResult.data.dominant_hemisphere,
                    tri_hemispheric_weights: qronasResult.data.tri_hemispheric_weights,
                    d2_activation: qronasResult.data.dynamic_llm_settings.d2,
                    temperature: qronasResult.data.dynamic_llm_settings.temp,
                    max_personas: qronasResult.data.dynamic_llm_settings.max_p,
                    debate_rounds: qronasResult.data.dynamic_llm_settings.rounds,
                    archetype: qronasResult.data.archetype_detected
                };
                result.optimization_applied.push('qronas_routing');
                addLog(`✅ QRONAS: ${result.qronas_config.archetype} archetype, complexity ${result.qronas_config.complexity_score.toFixed(2)}`);
            } else {
                throw new Error('QRONAS failed');
            }
        } catch (error) {
            addLog(`⚠️ QRONAS failed: ${error.message}, using defaults`);
            result.qronas_config = {
                complexity_score: 0.65,
                dominant_hemisphere: 'balanced',
                tri_hemispheric_weights: { alpha: 0.4, beta: 0.3, gamma: 0.3 },
                d2_activation: 0.65,
                temperature: 0.7,
                max_personas: 5,
                debate_rounds: 5,
                archetype: 'balanced_exploration'
            };
            result.fallbacks_used.push('qronas_default');
        }

        // ====================================================================
        // STEP 3: TEAM OPTIMIZATION
        // ====================================================================
        addLog('>>> STEP 3: Team Optimization <<<');
        
        try {
            const teamResult = await base44.functions.invoke('personaTeamOptimizer', {
                prompt: result.compressed_prompt,
                complexity_score: result.qronas_config.complexity_score,
                hemisphere: result.qronas_config.dominant_hemisphere,
                max_personas: result.qronas_config.max_personas,
                system: 'SMAS',
                archetype: result.qronas_config.archetype
            });

            if (teamResult.data?.success) {
                result.team_composition = teamResult.data.selected_personas;
                result.optimization_applied.push('team_optimization');
                addLog(`✅ Team: ${result.team_composition.length} personas selected`);
            } else {
                throw new Error('Team optimization failed');
            }
        } catch (error) {
            addLog(`⚠️ Team optimization failed: ${error.message}, using fallback personas`);
            
            // Fallback: Load core personas from database
            try {
                const personas = await base44.asServiceRole.entities.Persona.filter({ status: 'Active' });
                result.team_composition = personas
                    .filter(p => p.priority_level >= 8)
                    .slice(0, result.qronas_config.max_personas)
                    .map(p => ({
                        handle: p.handle,
                        name: p.name,
                        domain: p.domain,
                        hemisphere: p.hemisphere,
                        priority_level: p.priority_level
                    }));
                addLog(`✅ Fallback team: ${result.team_composition.length} personas from DB`);
            } catch (dbError) {
                addLog(`❌ Failed to load personas: ${dbError.message}`);
                result.team_composition = [
                    { name: 'Reasoning Core', handle: 'P003', hemisphere: 'Left', domain: 'Logic' },
                    { name: 'Ethics Core', handle: 'P005', hemisphere: 'Central', domain: 'Ethics' },
                    { name: 'Creative Core', handle: 'P006', hemisphere: 'Right', domain: 'Creativity' }
                ];
                addLog(`✅ Minimal fallback team: 3 core personas`);
            }
            
            result.fallbacks_used.push('team_default');
        }

        addLog('='.repeat(60));
        addLog('D3STIB OPTIMIZER - COMPLETE');
        addLog(`Optimizations: ${result.optimization_applied.join(', ')}`);
        addLog(`Fallbacks: ${result.fallbacks_used.length > 0 ? result.fallbacks_used.join(', ') : 'none'}`);
        addLog('='.repeat(60));

        return Response.json(result);

    } catch (error) {
        console.error('[D3STIB] Fatal error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});