import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * CROSS-HEMISPHERE PATHWAY GENERATOR
 * 
 * Crée des ponts créatifs entre hémisphères L↔R
 * Déclenché par contexte spécifique ou patterns de co-activation
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[CrossHemisphere] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            trigger_context = null,
            omega_t = null, // Si proche de 0.5 = contexte intégratif
            min_similarity = 0.6,
            max_bridges = 20,
            force_generation = false
        } = await req.json();

        addLog('=== CROSS-HEMISPHERE PATHWAY GENERATION ===', { 
            has_context: !!trigger_context,
            omega_t,
            force: force_generation
        });

        // TRIGGER CONDITIONS
        const shouldTrigger = force_generation || 
                             (omega_t !== null && omega_t >= 0.4 && omega_t <= 0.6) ||
                             (trigger_context && /creative|innovative|synthesis|integrate/.test(trigger_context.toLowerCase()));

        if (!shouldTrigger) {
            return Response.json({
                success: true,
                message: 'Cross-hemisphere trigger conditions not met',
                bridges_created: 0,
                trigger_omega: omega_t
            });
        }

        addLog('✓ Trigger conditions met', { omega_t, context_match: !!trigger_context });

        // Charger mémoires des deux hémisphères
        const [leftMemories, rightMemories] = await Promise.all([
            base44.entities.UserMemory.filter({
                created_by: user.email,
                hemisphere: 'left'
            }),
            base44.entities.UserMemory.filter({
                created_by: user.email,
                hemisphere: 'right'
            })
        ]);

        addLog('Memories loaded', { left: leftMemories.length, right: rightMemories.length });

        if (leftMemories.length === 0 || rightMemories.length === 0) {
            return Response.json({
                success: true,
                message: 'Insufficient memories for cross-hemisphere bridging',
                bridges_created: 0
            });
        }

        // Charger indices vectoriels
        const leftIds = leftMemories.map(m => m.id);
        const rightIds = rightMemories.map(m => m.id);
        
        const [leftIndices, rightIndices] = await Promise.all([
            base44.entities.VectorIndex.filter({
                memory_id: { "$in": leftIds }
            }),
            base44.entities.VectorIndex.filter({
                memory_id: { "$in": rightIds }
            })
        ]);

        const leftIndexMap = new Map(leftIndices.map(i => [i.memory_id, i]));
        const rightIndexMap = new Map(rightIndices.map(i => [i.memory_id, i]));

        // Chercher ponts potentiels
        const bridgeCandidates = [];

        for (const leftMem of leftMemories) {
            const leftIdx = leftIndexMap.get(leftMem.id);
            if (!leftIdx) continue;

            const leftEmb = JSON.parse(leftIdx.embedding_vector);

            for (const rightMem of rightMemories) {
                const rightIdx = rightIndexMap.get(rightMem.id);
                if (!rightIdx) continue;

                const rightEmb = JSON.parse(rightIdx.embedding_vector);
                const similarity = cosineSimilarity(leftEmb, rightEmb);

                if (similarity >= min_similarity) {
                    // Calculer potentiel créatif
                    const tierDiff = Math.abs(
                        parseInt(leftMem.source_database_tier?.substring(1) || '1') -
                        parseInt(rightMem.source_database_tier?.substring(1) || '1')
                    );
                    
                    // Boost si tiers différents (connexion profondeur/intuition)
                    const creativePotential = similarity * (1 + (tierDiff * 0.1));
                    
                    bridgeCandidates.push({
                        leftMemory: leftMem,
                        rightMemory: rightMem,
                        similarity,
                        creativePotential,
                        tierDiff
                    });
                }
            }
        }

        // Trier par potentiel créatif
        bridgeCandidates.sort((a, b) => b.creativePotential - a.creativePotential);
        const topBridges = bridgeCandidates.slice(0, max_bridges);

        addLog('Bridge candidates identified', { candidates: bridgeCandidates.length, selected: topBridges.length });

        // Créer pathways bidirectionnels L↔R
        const newPathways = [];
        
        for (const bridge of topBridges) {
            // Vérifier si pont existe déjà
            const existing = await base44.entities.MemoryPathway.filter({
                source_memory_id: bridge.leftMemory.id,
                target_memory_id: bridge.rightMemory.id,
                hemisphere_bridge: true
            });

            if (existing.length > 0) continue;

            // L→R pathway
            newPathways.push({
                source_memory_id: bridge.leftMemory.id,
                target_memory_id: bridge.rightMemory.id,
                pathway_type: 'hemispheric_cross',
                similarity_score: bridge.similarity,
                activation_count: 0,
                pathway_strength: bridge.creativePotential * 0.7, // Force initiale modérée
                embedding_distance: euclideanDistance(
                    JSON.parse(leftIndexMap.get(bridge.leftMemory.id).embedding_vector),
                    JSON.parse(rightIndexMap.get(bridge.rightMemory.id).embedding_vector)
                ),
                tier_bridge: bridge.tierDiff > 0,
                hemisphere_bridge: true,
                decay_rate: 0.998, // Decay très lent pour ponts créatifs
                last_activated: new Date().toISOString()
            });

            // R→L pathway (symétrique)
            newPathways.push({
                source_memory_id: bridge.rightMemory.id,
                target_memory_id: bridge.leftMemory.id,
                pathway_type: 'hemispheric_cross',
                similarity_score: bridge.similarity,
                activation_count: 0,
                pathway_strength: bridge.creativePotential * 0.7,
                embedding_distance: euclideanDistance(
                    JSON.parse(rightIndexMap.get(bridge.rightMemory.id).embedding_vector),
                    JSON.parse(leftIndexMap.get(bridge.leftMemory.id).embedding_vector)
                ),
                tier_bridge: bridge.tierDiff > 0,
                hemisphere_bridge: true,
                decay_rate: 0.998,
                last_activated: new Date().toISOString()
            });
        }

        // Créer pathways en batch
        if (newPathways.length > 0) {
            await base44.entities.MemoryPathway.bulkCreate(newPathways);
        }

        addLog('=== CROSS-HEMISPHERE GENERATION COMPLETE ===');

        return Response.json({
            success: true,
            bridges_created: newPathways.length / 2, // Division par 2 (bidirectionnel)
            pathways_total: newPathways.length,
            statistics: {
                avg_similarity: topBridges.length > 0 
                    ? (topBridges.reduce((sum, b) => sum + b.similarity, 0) / topBridges.length).toFixed(3)
                    : 0,
                avg_creative_potential: topBridges.length > 0
                    ? (topBridges.reduce((sum, b) => sum + b.creativePotential, 0) / topBridges.length).toFixed(3)
                    : 0,
                tier_bridges: topBridges.filter(b => b.tierDiff > 0).length
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