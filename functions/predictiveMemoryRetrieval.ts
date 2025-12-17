import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PREDICTIVE MEMORY RETRIEVAL
 * 
 * Anticipe les besoins mémoire avant recherche explicite
 * Utilise: contexte conversationnel + pathways actifs + patterns de co-activation
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[PredictiveRetrieval] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            conversation_id,
            recent_messages = [],
            current_context = '',
            prediction_depth = 3,
            min_confidence = 0.4,
            max_predictions = 10
        } = await req.json();

        addLog('=== PREDICTIVE MEMORY RETRIEVAL START ===', { 
            conversation_id,
            messages_count: recent_messages.length,
            context_length: current_context.length
        });

        const startTime = Date.now();

        // ÉTAPE 1: Identifier mémoires récemment activées
        const recentWindow = new Date(Date.now() - 5 * 60 * 1000); // 5 min
        const recentMemories = await base44.entities.UserMemory.filter({
            created_by: user.email,
            last_accessed: { "$gte": recentWindow.toISOString() }
        });

        addLog('Recent active memories', { count: recentMemories.length });

        if (recentMemories.length === 0) {
            // Fallback: analyser le contexte directement
            return await fallbackContextualPrediction(
                base44, user, current_context, recent_messages, 
                max_predictions, min_confidence, addLog
            );
        }

        // ÉTAPE 2: Charger pathways depuis mémoires actives
        const activeMemoryIds = recentMemories.map(m => m.id);
        const pathwaysQuery = {
            "$or": [
                { source_memory_id: { "$in": activeMemoryIds } },
                { target_memory_id: { "$in": activeMemoryIds } }
            ]
        };
        
        const relevantPathways = await base44.entities.MemoryPathway.filter(pathwaysQuery);
        
        addLog('Pathways loaded', { count: relevantPathways.length });

        // ÉTAPE 3: Construire graphe de co-activation
        const coActivationGraph = new Map();
        
        for (const pathway of relevantPathways) {
            const key = `${pathway.source_memory_id}→${pathway.target_memory_id}`;
            coActivationGraph.set(key, {
                strength: pathway.pathway_strength,
                activations: pathway.activation_count || 0,
                type: pathway.pathway_type,
                last_used: pathway.last_activated
            });
        }

        // ÉTAPE 4: Score prédictif pour chaque mémoire candidate
        const predictionScores = new Map();
        
        for (const pathway of relevantPathways) {
            const candidateId = activeMemoryIds.includes(pathway.source_memory_id) 
                ? pathway.target_memory_id 
                : pathway.source_memory_id;
            
            if (activeMemoryIds.includes(candidateId)) continue; // Déjà active
            
            // Score basé sur:
            // 1. Force du pathway
            // 2. Fréquence d'activation historique
            // 3. Récence de dernière activation
            // 4. Type de connexion
            
            const baseScore = pathway.pathway_strength;
            const frequencyBoost = Math.min(0.2, (pathway.activation_count || 0) * 0.01);
            
            const lastActivated = pathway.last_activated ? new Date(pathway.last_activated) : new Date(0);
            const hoursSince = (Date.now() - lastActivated.getTime()) / (1000 * 60 * 60);
            const recencyBoost = hoursSince < 1 ? 0.15 : hoursSince < 24 ? 0.05 : 0;
            
            const typeMultiplier = pathway.pathway_type === 'semantic_similarity' ? 1.1 :
                                  pathway.pathway_type === 'conceptual_bridge' ? 1.05 : 1.0;
            
            const score = (baseScore + frequencyBoost + recencyBoost) * typeMultiplier;
            
            if (!predictionScores.has(candidateId) || predictionScores.get(candidateId) < score) {
                predictionScores.set(candidateId, score);
            }
        }

        // ÉTAPE 5: Enrichir avec analyse contextuelle si disponible
        if (current_context || recent_messages.length > 0) {
            const contextText = [
                current_context,
                ...recent_messages.map(m => m.content || '')
            ].join(' ').substring(0, 500);
            
            // Générer embedding du contexte
            const { data: embData } = await base44.functions.invoke('generateEmbedding', {
                text: contextText,
                dimension: 384,
                normalize: true
            });
            
            if (embData?.success) {
                const contextEmbedding = embData.embedding;
                const contextLSH = computeLSH(contextEmbedding, 8);
                
                // Charger indices vectoriels des candidats
                const candidateIds = Array.from(predictionScores.keys());
                const indices = await base44.entities.VectorIndex.filter({
                    memory_id: { "$in": candidateIds }
                });
                
                for (const index of indices) {
                    const memEmbedding = JSON.parse(index.embedding_vector);
                    const contextSimilarity = cosineSimilarity(contextEmbedding, memEmbedding);
                    
                    // Boost si même cluster LSH
                    const clusterBoost = index.semantic_cluster === contextLSH ? 0.1 : 0;
                    
                    const currentScore = predictionScores.get(index.memory_id) || 0;
                    const newScore = currentScore + (contextSimilarity * 0.3) + clusterBoost;
                    
                    predictionScores.set(index.memory_id, newScore);
                }
                
                addLog('Context enrichment applied', { context_length: contextText.length });
            }
        }

        // ÉTAPE 6: Sélectionner top prédictions
        const sortedPredictions = Array.from(predictionScores.entries())
            .filter(([_, score]) => score >= min_confidence)
            .sort((a, b) => b[1] - a[1])
            .slice(0, max_predictions);

        addLog('Predictions scored', { candidates: sortedPredictions.length });

        // ÉTAPE 7: Charger mémoires complètes
        const predictedMemoryIds = sortedPredictions.map(([id, _]) => id);
        const predictedMemories = await base44.entities.UserMemory.filter({
            id: { "$in": predictedMemoryIds }
        });
        
        const memoryMap = new Map(predictedMemories.map(m => [m.id, m]));
        
        const predictions = sortedPredictions.map(([id, score]) => ({
            memory: memoryMap.get(id),
            confidence: score,
            prediction_reason: determinePredictionReason(id, coActivationGraph, activeMemoryIds)
        })).filter(p => p.memory);

        // ÉTAPE 8: Pré-charger dans working memory (optionnel)
        const workingMemoryCache = predictions.map(p => ({
            memory_id: p.memory.id,
            content_preview: p.memory.memory_content.substring(0, 200),
            tier: p.memory.source_database_tier,
            confidence: p.confidence,
            cached_at: new Date().toISOString()
        }));

        const retrievalTime = Date.now() - startTime;

        addLog('=== PREDICTIVE RETRIEVAL COMPLETE ===', { 
            time_ms: retrievalTime,
            predictions: predictions.length
        });

        return Response.json({
            success: true,
            predictions,
            working_memory_cache: workingMemoryCache,
            metadata: {
                active_memories_analyzed: activeMemoryIds.length,
                pathways_evaluated: relevantPathways.length,
                total_candidates: predictionScores.size,
                retrieval_time_ms: retrievalTime,
                confidence_threshold: min_confidence,
                average_confidence: predictions.length > 0 
                    ? predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length 
                    : 0
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

// Fallback: prédiction contextuelle sans pathways actifs
async function fallbackContextualPrediction(base44, user, context, messages, maxResults, minConf, addLog) {
    addLog('Using fallback contextual prediction');
    
    const contextText = [context, ...messages.map(m => m.content || '')].join(' ').substring(0, 500);
    
    if (!contextText.trim()) {
        return Response.json({
            success: true,
            predictions: [],
            working_memory_cache: [],
            metadata: { fallback: true, reason: 'no_context' }
        });
    }
    
    const { data: searchData } = await base44.functions.invoke('vectorMemorySearch', {
        query_text: contextText,
        top_k: maxResults,
        use_pathways: false,
        hemisphere_filter: null,
        tier_filter: null
    });
    
    if (searchData?.success) {
        const predictions = searchData.results.map(r => ({
            memory: r.memory,
            confidence: r.similarity_score,
            prediction_reason: 'contextual_similarity_fallback'
        }));
        
        return Response.json({
            success: true,
            predictions,
            working_memory_cache: predictions.map(p => ({
                memory_id: p.memory.id,
                content_preview: p.memory.memory_content.substring(0, 200),
                tier: p.memory.source_database_tier,
                confidence: p.confidence,
                cached_at: new Date().toISOString()
            })),
            metadata: { fallback: true, method: 'vector_search' }
        });
    }
    
    return Response.json({ success: true, predictions: [], metadata: { fallback: true, reason: 'search_failed' } });
}

function determinePredictionReason(memoryId, coActivationGraph, activeIds) {
    for (const [key, data] of coActivationGraph.entries()) {
        if (key.includes(memoryId)) {
            if (data.activations > 10) return 'strong_co_activation_pattern';
            if (data.strength > 0.8) return 'high_pathway_strength';
            if (data.type === 'semantic_similarity') return 'semantic_proximity';
        }
    }
    return 'pathway_connected';
}

function cosineSimilarity(vec1, vec2) {
    let dot = 0, mag1 = 0, mag2 = 0;
    for (let i = 0; i < vec1.length; i++) {
        dot += vec1[i] * vec2[i];
        mag1 += vec1[i] * vec1[i];
        mag2 += vec2[i] * vec2[i];
    }
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function computeLSH(vector, bits = 8) {
    const hash = [];
    for (let i = 0; i < bits; i++) {
        const seed = i * 37;
        let projection = 0;
        for (let j = 0; j < vector.length; j++) {
            projection += vector[j] * Math.sin(seed + j);
        }
        hash.push(projection > 0 ? '1' : '0');
    }
    return hash.join('');
}