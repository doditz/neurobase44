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
        const updates = [];

        for (const pathway of pathways) {
            const lastActivated = pathway.last_activated ? new Date(pathway.last_activated) : new Date(pathway.created_date);
            
            // Si non-activé depuis le seuil, appliquer decay
            if (lastActivated < thresholdDate) {
                const decayRate = pathway.decay_rate || 0.995;
                const newStrength = pathway.pathway_strength * decayRate;
                
                if (newStrength >= min_strength_threshold) {
                    // Décroissance simple
                    updates.push({
                        id: pathway.id,
                        pathway_strength: newStrength
                    });
                    decayed++;
                } else if (auto_prune) {
                    // Élagage: supprimer les pathways trop faibles
                    await base44.entities.MemoryPathway.delete(pathway.id);
                    pruned++;
                }
            }
        }

        // Appliquer les mises à jour
        for (const update of updates) {
            await base44.entities.MemoryPathway.update(update.id, {
                pathway_strength: update.pathway_strength
            });
        }

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