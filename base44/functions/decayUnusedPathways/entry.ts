import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DECAY UNUSED PATHWAYS
 * 
 * Applique la décroissance temporelle aux pathways non-utilisés
 * Simule l'oubli synaptique: connexions non-activées s'affaiblissent
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[PathwayDecay] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            decay_threshold_hours = 168, // 1 semaine
            min_strength_threshold = 0.1,
            auto_prune = true
        } = await req.json();

        addLog('=== PATHWAY DECAY PROCESS ===', { threshold_hours: decay_threshold_hours });

        const now = new Date();
        const thresholdDate = new Date(now.getTime() - decay_threshold_hours * 3600 * 1000);

        // Charger tous les pathways
        const pathways = await base44.entities.MemoryPathway.filter({
            created_by: user.email
        });

        addLog('Loaded pathways', { count: pathways.length });

        let decayed = 0;
        let pruned = 0;
        let reconsolidated = 0;
        let consolidated = 0;
        const updates = [];
        const pruneIds = [];
        const consolidationCandidates = [];

        for (const pathway of pathways) {
            const lastActivated = pathway.last_activated ? new Date(pathway.last_activated) : new Date(pathway.created_date);
            const daysSinceActivation = (now - lastActivated) / (1000 * 60 * 60 * 24);
            
            // CONSOLIDATION CHECK: pathway très actif devient abstract pathway
            if ((pathway.activation_count || 0) > 50 && pathway.pathway_strength > 0.85) {
                consolidationCandidates.push(pathway);
                continue;
            }
            
            // Si non-activé depuis le seuil, appliquer decay proportionnel
            if (lastActivated < thresholdDate) {
                const baseDecayRate = pathway.decay_rate || 0.995;
                
                // DECAY PROPORTIONNEL: adapté au type et force
                let adjustedDecayRate = baseDecayRate;
                
                // Cross-hemisphere decay plus lent (connexions créatives rares)
                if (pathway.hemisphere_bridge) {
                    adjustedDecayRate = Math.min(0.998, baseDecayRate + 0.003);
                }
                
                // Pathways forts décroissent plus lentement
                const strengthFactor = pathway.pathway_strength;
                adjustedDecayRate = adjustedDecayRate + ((1 - adjustedDecayRate) * strengthFactor * 0.1);
                
                // Decay exponentiel temporel
                const decayPeriods = Math.floor(daysSinceActivation / (decay_threshold_hours / 24));
                let newStrength = pathway.pathway_strength * Math.pow(adjustedDecayRate, decayPeriods);
                
                // SMART DECAY: plateau pour pathways moyennement actifs
                if ((pathway.activation_count || 0) > 10 && newStrength < 0.4) {
                    newStrength = Math.max(newStrength, 0.35); // Plateau protecteur
                }
                
                if (newStrength >= min_strength_threshold) {
                    updates.push({
                        id: pathway.id,
                        pathway_strength: newStrength
                    });
                    decayed++;
                } else if (auto_prune) {
                    if ((pathway.activation_count || 0) > 20) {
                        // Reconsolidation
                        updates.push({
                            id: pathway.id,
                            pathway_strength: min_strength_threshold * 1.5
                        });
                        reconsolidated++;
                    } else {
                        pruneIds.push(pathway.id);
                        pruned++;
                    }
                }
            }
        }

        // CONSOLIDATION: créer abstract pathways
        for (const candidate of consolidationCandidates) {
            // Chercher pathways similaires pour fusion
            const relatedPathways = pathways.filter(p => 
                p.id !== candidate.id &&
                (p.source_memory_id === candidate.source_memory_id || 
                 p.target_memory_id === candidate.target_memory_id) &&
                p.pathway_type === candidate.pathway_type &&
                (p.activation_count || 0) > 30
            );
            
            if (relatedPathways.length >= 2) {
                // Créer abstract pathway (conceptual_bridge de haut niveau)
                const avgStrength = relatedPathways.reduce((sum, p) => sum + p.pathway_strength, candidate.pathway_strength) / (relatedPathways.length + 1);
                
                await base44.entities.MemoryPathway.create({
                    source_memory_id: candidate.source_memory_id,
                    target_memory_id: candidate.target_memory_id,
                    pathway_type: 'conceptual_bridge',
                    similarity_score: avgStrength,
                    activation_count: Math.floor((candidate.activation_count + relatedPathways.reduce((sum, p) => sum + (p.activation_count || 0), 0)) / (relatedPathways.length + 1)),
                    pathway_strength: Math.min(1.0, avgStrength * 1.2),
                    embedding_distance: 0,
                    tier_bridge: candidate.tier_bridge,
                    hemisphere_bridge: candidate.hemisphere_bridge,
                    decay_rate: 0.999,
                    last_activated: new Date().toISOString()
                });
                
                consolidated++;
            }
        }

        // Batch operations
        await Promise.all([
            ...updates.map(update => 
                base44.entities.MemoryPathway.update(update.id, {
                    pathway_strength: update.pathway_strength
                })
            ),
            ...pruneIds.map(id => base44.entities.MemoryPathway.delete(id))
        ]);
        
        addLog('Decay & consolidation complete', { 
            decayed, 
            pruned, 
            reconsolidated,
            consolidated,
            avg_strength_remaining: updates.length > 0 
                ? (updates.reduce((sum, u) => sum + u.pathway_strength, 0) / updates.length).toFixed(3)
                : 0
        });

        addLog('=== DECAY COMPLETE ===');

        return Response.json({
            success: true,
            message: 'Pathway decay applied',
            statistics: {
                total_pathways: pathways.length,
                decayed: decayed,
                pruned: pruned,
                remaining: pathways.length - pruned,
                decay_threshold_hours
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