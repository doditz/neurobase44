import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SESSION CONTEXT SUMMARIZER + MEMORY FORECASTING
 * 
 * Fournit résumés contextuels temps-réel + prédictions mémoire proactives
 * Analyse trajectoire conversation pour anticiper besoins futurs
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[SessionSummarizer] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            conversation_id,
            messages = [],
            session_duration_minutes = 30,
            include_forecasting = true,
            forecast_horizon = 5 // Prédire 5 prochains besoins
        } = await req.json();

        addLog('=== SESSION SUMMARIZER + FORECASTING START ===', { 
            conversation_id,
            messages_count: messages.length,
            session_duration: session_duration_minutes
        });

        const startTime = Date.now();

        // ÉTAPE 1: CHARGER CONTEXTE DE SESSION
        const sessionStart = new Date(Date.now() - session_duration_minutes * 60 * 1000);
        
        const [recentMemories, activeDebates] = await Promise.all([
            base44.entities.UserMemory.filter({
                created_by: user.email,
                last_accessed: { "$gte": sessionStart.toISOString() }
            }),
            base44.entities.Debate.filter({
                created_by: user.email,
                status: 'active'
            })
        ]);

        addLog('Session context loaded', { 
            memories: recentMemories.length,
            debates: activeDebates.length
        });

        // ÉTAPE 2: ANALYSER TRAJECTOIRE CONVERSATIONNELLE
        const conversationText = messages.map(m => m.content || '').join('\n').substring(0, 2000);
        
        let trajectoryAnalysis = null;
        if (conversationText.length > 100) {
            const analysisPrompt = `Analyze this conversation trajectory and identify:
1. Main topics discussed
2. Cognitive pattern (analytical, creative, exploratory, problem-solving)
3. Knowledge domains activated
4. Likely next information needs

Conversation:
${conversationText}

Return ONLY JSON:`;

            const { data: aiAnalysis } = await base44.functions.invoke('base44.integrations.Core.InvokeLLM', {
                prompt: analysisPrompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        main_topics: { type: "array", items: { type: "string" } },
                        cognitive_pattern: { type: "string" },
                        knowledge_domains: { type: "array", items: { type: "string" } },
                        predicted_needs: { type: "array", items: { type: "string" } }
                    }
                }
            });

            trajectoryAnalysis = aiAnalysis || {
                main_topics: [],
                cognitive_pattern: 'exploratory',
                knowledge_domains: [],
                predicted_needs: []
            };

            addLog('✓ Trajectory analysis complete', trajectoryAnalysis);
        }

        // ÉTAPE 3: GÉNÉRER RÉSUMÉ CONTEXTUEL
        const memoryTierDistribution = {
            L1: recentMemories.filter(m => m.source_database_tier === 'L1').length,
            L2: recentMemories.filter(m => m.source_database_tier === 'L2').length,
            L3: recentMemories.filter(m => m.source_database_tier === 'L3').length,
            R1: recentMemories.filter(m => m.source_database_tier === 'R1').length,
            R2: recentMemories.filter(m => m.source_database_tier === 'R2').length,
            R3: recentMemories.filter(m => m.source_database_tier === 'R3').length,
            GC: recentMemories.filter(m => m.source_database_tier === 'GC').length
        };

        const hemisphereBalance = {
            left: recentMemories.filter(m => m.hemisphere === 'left').length,
            right: recentMemories.filter(m => m.hemisphere === 'right').length,
            central: recentMemories.filter(m => m.hemisphere === 'central').length
        };

        const omega_t_avg = recentMemories.length > 0
            ? recentMemories.reduce((sum, m) => sum + (m.omega_t || 0.5), 0) / recentMemories.length
            : 0.5;

        const contextualSummary = {
            session_duration_minutes,
            messages_analyzed: messages.length,
            active_memories: recentMemories.length,
            memory_tier_distribution: memoryTierDistribution,
            hemisphere_balance: hemisphereBalance,
            omega_t_session_avg: parseFloat(omega_t_avg.toFixed(3)),
            cognitive_mode: omega_t_avg > 0.6 ? 'analytical' : omega_t_avg < 0.4 ? 'creative' : 'integrative',
            active_debates: activeDebates.map(d => ({
                topic: d.topic,
                message_count: d.total_messages || 0,
                complexity: d.last_complexity_score
            })),
            trajectory_pattern: trajectoryAnalysis?.cognitive_pattern || 'unknown'
        };

        // ÉTAPE 4: MEMORY FORECASTING
        let memoryForecasts = [];
        
        if (include_forecasting) {
            addLog('Starting memory forecasting...');

            // Prédictions basées sur pathways actifs
            const { data: predictiveData } = await base44.functions.invoke('predictiveMemoryRetrieval', {
                conversation_id,
                recent_messages: messages.slice(-5),
                current_context: conversationText.substring(0, 500),
                prediction_depth: 2,
                min_confidence: 0.3,
                max_predictions: forecast_horizon
            });

            if (predictiveData?.success && predictiveData.predictions) {
                memoryForecasts = predictiveData.predictions.map((pred, idx) => ({
                    rank: idx + 1,
                    memory_preview: pred.memory.memory_content.substring(0, 150) + '...',
                    memory_tier: pred.memory.source_database_tier,
                    confidence: pred.confidence,
                    reasoning: pred.prediction_reason,
                    suggested_action: determineSuggestedAction(pred.memory, trajectoryAnalysis)
                }));
            }

            // Enrichir avec prédictions IA
            if (trajectoryAnalysis?.predicted_needs?.length > 0) {
                for (const need of trajectoryAnalysis.predicted_needs.slice(0, 3)) {
                    memoryForecasts.push({
                        rank: memoryForecasts.length + 1,
                        memory_preview: `Predicted need: ${need}`,
                        memory_tier: 'FORECAST',
                        confidence: 0.6,
                        reasoning: 'trajectory_based_prediction',
                        suggested_action: 'proactive_search'
                    });
                }
            }

            addLog('✓ Memory forecasting complete', { forecasts: memoryForecasts.length });
        }

        // ÉTAPE 5: GÉNÉRER MEMORY PRE-LOADS
        const preLoadSuggestions = memoryForecasts.slice(0, 3).map(forecast => ({
            type: 'memory_preload',
            content: forecast.memory_preview,
            tier: forecast.memory_tier,
            confidence: forecast.confidence,
            ui_hint: forecast.confidence > 0.7 ? 'highlight' : 'subtle'
        }));

        const processingTime = Date.now() - startTime;

        addLog('=== SESSION SUMMARIZER COMPLETE ===', { time_ms: processingTime });

        return Response.json({
            success: true,
            contextual_summary: contextualSummary,
            trajectory_analysis: trajectoryAnalysis,
            memory_forecasts: memoryForecasts,
            preload_suggestions: preLoadSuggestions,
            metadata: {
                processing_time_ms: processingTime,
                forecasting_enabled: include_forecasting,
                forecast_count: memoryForecasts.length
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

function determineSuggestedAction(memory, trajectoryAnalysis) {
    if (!memory || !trajectoryAnalysis) return 'retrieve';
    
    const memoryContent = memory.memory_content.toLowerCase();
    const pattern = trajectoryAnalysis.cognitive_pattern?.toLowerCase() || '';
    
    if (pattern.includes('analytical') && memory.hemisphere === 'left') {
        return 'validate_with_source';
    }
    if (pattern.includes('creative') && memory.hemisphere === 'right') {
        return 'explore_connections';
    }
    if (pattern.includes('problem') && memory.source_database_tier?.includes('L2')) {
        return 'apply_methodology';
    }
    
    return 'retrieve_and_integrate';
}