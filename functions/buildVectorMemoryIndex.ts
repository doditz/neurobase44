import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * BUILD VECTOR MEMORY INDEX
 * 
 * Construit l'index vectoriel des mémoires et établit les pathways initiaux
 * Utilise embeddings + similarité cosine pour créer des connexions sémantiques
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[VectorIndex] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            rebuild = false,
            batch_size = 50,
            similarity_threshold = 0.7,
            max_pathways_per_memory = 5
        } = await req.json();

        addLog('=== BUILDING VECTOR MEMORY INDEX ===', { rebuild, batch_size, similarity_threshold });

        // Charger toutes les mémoires non-indexées
        let memories;
        if (rebuild) {
            memories = await base44.entities.UserMemory.filter({
                created_by: user.email
            });
            addLog('Rebuild mode: processing all memories', { count: memories.length });
        } else {
            // Trouver les mémoires déjà indexées
            const indexed = await base44.entities.VectorIndex.filter({
                created_by: user.email
            });
            const indexedIds = new Set(indexed.map(i => i.memory_id));
            
            memories = (await base44.entities.UserMemory.filter({
                created_by: user.email
            })).filter(m => !indexedIds.has(m.id));
            
            addLog('Incremental mode: new memories only', { count: memories.length });
        }

        if (memories.length === 0) {
            return Response.json({
                success: true,
                message: 'No memories to index',
                logs: log
            });
        }

        const vectorIndices = [];
        const pathways = [];

        // Traiter par batch
        for (let i = 0; i < memories.length; i += batch_size) {
            const batch = memories.slice(i, i + batch_size);
            addLog(`Processing batch ${Math.floor(i/batch_size) + 1}`, { memories: batch.length });

            for (const memory of batch) {
                // Générer embedding
                const textToEmbed = `${memory.memory_key}: ${memory.memory_content}`;
                const { data: embData } = await base44.functions.invoke('generateEmbedding', {
                    text: textToEmbed,
                    dimension: 384,
                    normalize: true
                });

                if (!embData || !embData.success) {
                    addLog('⚠️ Embedding failed', { memory_id: memory.id });
                    continue;
                }

                const embedding = embData.embedding;

                // Calculer LSH hash pour clustering
                const lshHash = computeLSH(embedding, 8);

                vectorIndices.push({
                    memory_id: memory.id,
                    embedding_vector: JSON.stringify(embedding),
                    embedding_dimension: embedding.length,
                    memory_tier: memory.source_database_tier || 'L1',
                    hemisphere: memory.hemisphere || 'central',
                    semantic_cluster: lshHash,
                    access_frequency: memory.access_count || 0,
                    last_accessed: memory.last_accessed || new Date().toISOString(),
                    indexing_timestamp: new Date().toISOString()
                });
            }
        }

        // Créer les indices vectoriels
        if (vectorIndices.length > 0) {
            await base44.entities.VectorIndex.bulkCreate(vectorIndices);
            addLog('✓ Vector indices created', { count: vectorIndices.length });
        }

        // Construire les pathways (connexions entre mémoires similaires)
        addLog('Building memory pathways...');
        
        for (let i = 0; i < vectorIndices.length; i++) {
            const sourceIndex = vectorIndices[i];
            const sourceEmbedding = JSON.parse(sourceIndex.embedding_vector);
            const candidatePathways = [];

            // Comparer avec toutes les autres mémoires du même cluster
            for (let j = 0; j < vectorIndices.length; j++) {
                if (i === j) continue;

                const targetIndex = vectorIndices[j];
                
                // Priorité aux pathways du même cluster
                if (sourceIndex.semantic_cluster !== targetIndex.semantic_cluster) continue;

                const targetEmbedding = JSON.parse(targetIndex.embedding_vector);
                const similarity = cosineSimilarity(sourceEmbedding, targetEmbedding);

                if (similarity >= similarity_threshold) {
                    candidatePathways.push({
                        target: targetIndex,
                        similarity,
                        distance: euclideanDistance(sourceEmbedding, targetEmbedding)
                    });
                }
            }

            // Garder les top N pathways
            candidatePathways.sort((a, b) => b.similarity - a.similarity);
            const topPathways = candidatePathways.slice(0, max_pathways_per_memory);

            for (const pw of topPathways) {
                const isTierBridge = sourceIndex.memory_tier !== pw.target.memory_tier;
                const isHemisphereBridge = sourceIndex.hemisphere !== pw.target.hemisphere;
                
                pathways.push({
                    source_memory_id: sourceIndex.memory_id,
                    target_memory_id: pw.target.memory_id,
                    pathway_type: determinePathwayType(sourceIndex, pw.target, pw.similarity),
                    similarity_score: pw.similarity,
                    activation_count: 0,
                    pathway_strength: pw.similarity, // Force initiale = similarité
                    embedding_distance: pw.distance,
                    tier_bridge: isTierBridge,
                    hemisphere_bridge: isHemisphereBridge,
                    decay_rate: isHemisphereBridge ? 0.99 : 0.995
                });
            }
        }

        // Créer les pathways
        if (pathways.length > 0) {
            await base44.entities.MemoryPathway.bulkCreate(pathways);
            addLog('✓ Memory pathways created', { count: pathways.length });
        }

        // Mettre à jour les counts de pathways
        for (const idx of vectorIndices) {
            const connectedCount = pathways.filter(p => 
                p.source_memory_id === idx.memory_id || p.target_memory_id === idx.memory_id
            ).length;
            
            await base44.entities.VectorIndex.update(idx.id, {
                connected_pathways_count: connectedCount
            });
        }

        addLog('=== VECTOR INDEX BUILD COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Vector memory index built successfully',
            statistics: {
                memories_indexed: vectorIndices.length,
                pathways_created: pathways.length,
                avg_pathways_per_memory: (pathways.length / vectorIndices.length).toFixed(2),
                tier_bridges: pathways.filter(p => p.tier_bridge).length,
                hemisphere_bridges: pathways.filter(p => p.hemisphere_bridge).length
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

function euclideanDistance(vec1, vec2) {
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        sum += Math.pow(vec1[i] - vec2[i], 2);
    }
    return Math.sqrt(sum);
}

function computeLSH(vector, bits = 8) {
    // Simple LSH: projet sur des plans aléatoires
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

function determinePathwayType(source, target, similarity) {
    if (source.hemisphere !== target.hemisphere) {
        return 'hemispheric_cross';
    }
    if (similarity > 0.9) {
        return 'semantic_similarity';
    }
    if (source.memory_tier !== target.memory_tier) {
        return 'conceptual_bridge';
    }
    return 'semantic_similarity';
}