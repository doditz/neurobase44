import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VECTOR MEMORY SEARCH
 * 
 * Recherche rapide par similarité vectorielle avec pathways auto-renforçants
 * Implémente le Hebbian learning: pathways utilisés deviennent plus forts
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[VectorSearch] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            query_text,
            top_k = 5,
            use_pathways = true,
            pathway_depth = 2,
            hemisphere_filter = null,
            tier_filter = null
        } = await req.json();

        if (!query_text) {
            return Response.json({ error: 'query_text required' }, { status: 400 });
        }

        addLog('=== VECTOR MEMORY SEARCH ===', { query_length: query_text.length, top_k, use_pathways });

        const startTime = Date.now();

        // Générer embedding de la requête
        const { data: embData } = await base44.functions.invoke('generateEmbedding', {
            text: query_text,
            dimension: 384,
            normalize: true
        });

        if (!embData || !embData.success) {
            throw new Error('Failed to generate query embedding');
        }

        const queryEmbedding = embData.embedding;
        const queryLSH = computeLSH(queryEmbedding, 8);

        addLog('✓ Query embedding generated', { dimension: queryEmbedding.length, lsh: queryLSH });

        // Charger les indices vectoriels (avec filtres optionnels)
        let indices = await base44.entities.VectorIndex.filter({
            created_by: user.email
        });

        if (hemisphere_filter) {
            indices = indices.filter(i => i.hemisphere === hemisphere_filter);
        }
        if (tier_filter) {
            indices = indices.filter(i => i.memory_tier === tier_filter);
        }

        addLog('Loaded vector indices', { count: indices.length });

        // Calcul de similarité
        const similarities = [];
        for (const index of indices) {
            const embedding = JSON.parse(index.embedding_vector);
            const similarity = cosineSimilarity(queryEmbedding, embedding);
            
            // Boost pour même cluster LSH
            const clusterBoost = index.semantic_cluster === queryLSH ? 0.1 : 0;
            
            // Boost pour accès fréquents (mémoire chaude)
            const frequencyBoost = Math.min(0.05, (index.access_frequency || 0) * 0.001);
            
            similarities.push({
                index,
                similarity: similarity + clusterBoost + frequencyBoost,
                raw_similarity: similarity
            });
        }

        // Trier par similarité
        similarities.sort((a, b) => b.similarity - a.similarity);
        const topMatches = similarities.slice(0, top_k);

        addLog('✓ Initial matches found', { count: topMatches.length });

        // Si pathways activés, étendre la recherche avec Hebbian reinforcement
        let expandedResults = [...topMatches];
        const reinforcementUpdates = [];
        
        if (use_pathways && topMatches.length > 0) {
            addLog('Expanding via memory pathways...');
            const visited = new Set(topMatches.map(m => m.index.memory_id));
            
            for (const match of topMatches) {
                // Chercher bidirectionnel: source→target ET target→source
                const [outbound, inbound] = await Promise.all([
                    base44.entities.MemoryPathway.filter({
                        source_memory_id: match.index.memory_id
                    }),
                    base44.entities.MemoryPathway.filter({
                        target_memory_id: match.index.memory_id
                    })
                ]);

                const allPathways = [...outbound, ...inbound];

                // Trier par force pondérée par type
                allPathways.sort((a, b) => {
                    const scoreA = a.pathway_strength * (a.tier_bridge ? 0.9 : 1.0);
                    const scoreB = b.pathway_strength * (b.tier_bridge ? 0.9 : 1.0);
                    return scoreB - scoreA;
                });
                
                for (const pathway of allPathways.slice(0, pathway_depth)) {
                    const targetId = pathway.source_memory_id === match.index.memory_id 
                        ? pathway.target_memory_id 
                        : pathway.source_memory_id;
                        
                    if (visited.has(targetId)) continue;
                    
                    const targetIndex = indices.find(i => i.memory_id === targetId);
                    if (!targetIndex) continue;
                    
                    const targetEmbedding = JSON.parse(targetIndex.embedding_vector);
                    const targetSimilarity = cosineSimilarity(queryEmbedding, targetEmbedding);
                    
                    // Score avec boost pour pathways forts
                    const strengthBoost = pathway.pathway_strength > 0.8 ? 1.1 : 1.0;
                    const pathwayScore = targetSimilarity * pathway.pathway_strength * strengthBoost;
                    
                    if (pathwayScore > 0.3) { // Seuil minimum pour pertinence
                        expandedResults.push({
                            index: targetIndex,
                            similarity: pathwayScore,
                            raw_similarity: targetSimilarity,
                            via_pathway: true,
                            pathway_strength: pathway.pathway_strength,
                            pathway_type: pathway.pathway_type
                        });
                        
                        visited.add(targetId);
                        
                        // Hebbian learning: renforcement progressif
                        const newActivationCount = (pathway.activation_count || 0) + 1;
                        const reinforcementFactor = Math.min(1.1, 1.0 + (0.02 * Math.log(newActivationCount + 1)));
                        const newStrength = Math.min(1.0, pathway.pathway_strength * reinforcementFactor);
                        
                        reinforcementUpdates.push({
                            id: pathway.id,
                            activation_count: newActivationCount,
                            pathway_strength: newStrength,
                            last_activated: new Date().toISOString()
                        });
                    }
                }
            }
            
            // Batch update des pathways
            await Promise.all(reinforcementUpdates.map(update => 
                base44.entities.MemoryPathway.update(update.id, {
                    activation_count: update.activation_count,
                    pathway_strength: update.pathway_strength,
                    last_activated: update.last_activated
                })
            ));
            
            // Re-trier les résultats étendus
            expandedResults.sort((a, b) => b.similarity - a.similarity);
            expandedResults = expandedResults.slice(0, top_k * 2);
            
            addLog('✓ Pathways expanded', { 
                total_results: expandedResults.length,
                via_pathways: expandedResults.filter(r => r.via_pathway).length,
                pathways_reinforced: reinforcementUpdates.length
            });
        }

        // Charger les mémoires complètes
        const memoryIds = expandedResults.map(r => r.index.memory_id);
        const memories = await base44.entities.UserMemory.filter({
            created_by: user.email
        });
        const memoryMap = new Map(memories.map(m => [m.id, m]));

        const results = expandedResults.map(r => {
            const memory = memoryMap.get(r.index.memory_id);
            return {
                memory,
                similarity_score: r.similarity,
                raw_similarity: r.raw_similarity,
                via_pathway: r.via_pathway || false,
                pathway_strength: r.pathway_strength,
                memory_tier: r.index.memory_tier,
                hemisphere: r.index.hemisphere
            };
        }).filter(r => r.memory); // Filtrer les nulls

        // Mettre à jour access_frequency
        for (const result of results) {
            const idx = indices.find(i => i.memory_id === result.memory.id);
            if (idx) {
                await base44.entities.VectorIndex.update(idx.id, {
                    access_frequency: (idx.access_frequency || 0) + 1,
                    last_accessed: new Date().toISOString()
                });
            }
            
            await base44.entities.UserMemory.update(result.memory.id, {
                access_count: (result.memory.access_count || 0) + 1,
                last_accessed: new Date().toISOString()
            });
        }

        const searchTime = Date.now() - startTime;

        addLog('=== SEARCH COMPLETE ===', { time_ms: searchTime, results: results.length });

        return Response.json({
            success: true,
            results,
            search_metadata: {
                query_text,
                total_results: results.length,
                search_time_ms: searchTime,
                pathways_used: use_pathways,
                direct_matches: results.filter(r => !r.via_pathway).length,
                pathway_matches: results.filter(r => r.via_pathway).length
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

// Helpers
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