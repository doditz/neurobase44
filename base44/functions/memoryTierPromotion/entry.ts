import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * MEMORY TIER PROMOTION ENGINE
 * Implements automatic tier promotion based on D2 modulation thresholds
 * Simulates SQL triggers: L1→L2→L3 and R1→R2→R3
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            auto_promote = true,
            decay_inactive = true,
            pruning_threshold = 0.2,
            smart_pruning = true,
            importance_weight = 0.6,
            recency_weight = 0.4
        } = await req.json();

        const promotionLog = [];
        const decayLog = [];
        const pruneLog = [];

        // STEP 1: PROMOTION - L1→L2→L3 and R1→R2→R3
        if (auto_promote) {
            // Promote L1→L2 if d2_modulation > 0.8
            const l1Candidates = await base44.entities.UserMemory.filter({
                tier_level: 1,
                hemisphere: 'left',
                d2_modulation: { "$gte": 0.8 }
            });

            for (const mem of l1Candidates) {
                await base44.entities.UserMemory.update(mem.id, {
                    tier_level: 2,
                    source_database_tier: 'L2',
                    compression_type: 'gzip',
                    push_pull_direction: 'push'
                });
                
                promotionLog.push({
                    memory_id: mem.id,
                    from: 'L1',
                    to: 'L2',
                    d2: mem.d2_modulation
                });
            }

            // Promote L2→L3 if access_count > 10 AND d2_modulation > 0.85
            const l2Candidates = await base44.entities.UserMemory.filter({
                tier_level: 2,
                hemisphere: 'left',
                d2_modulation: { "$gte": 0.85 },
                access_count: { "$gte": 10 }
            });

            for (const mem of l2Candidates) {
                await base44.entities.UserMemory.update(mem.id, {
                    tier_level: 3,
                    source_database_tier: 'L3',
                    compression_type: 'lzma',
                    pruning_protection: true
                });
                
                promotionLog.push({
                    memory_id: mem.id,
                    from: 'L2',
                    to: 'L3',
                    d2: mem.d2_modulation,
                    access_count: mem.access_count
                });
            }

            // Same for Right Hemisphere (R1→R2→R3)
            const r1Candidates = await base44.entities.UserMemory.filter({
                tier_level: 1,
                hemisphere: 'right',
                d2_modulation: { "$gte": 0.8 }
            });

            for (const mem of r1Candidates) {
                await base44.entities.UserMemory.update(mem.id, {
                    tier_level: 2,
                    source_database_tier: 'R2',
                    compression_type: 'gzip',
                    push_pull_direction: 'push'
                });
                
                promotionLog.push({
                    memory_id: mem.id,
                    from: 'R1',
                    to: 'R2',
                    d2: mem.d2_modulation
                });
            }

            const r2Candidates = await base44.entities.UserMemory.filter({
                tier_level: 2,
                hemisphere: 'right',
                d2_modulation: { "$gte": 0.85 },
                access_count: { "$gte": 10 }
            });

            for (const mem of r2Candidates) {
                await base44.entities.UserMemory.update(mem.id, {
                    tier_level: 3,
                    source_database_tier: 'R3',
                    compression_type: 'lzma',
                    pruning_protection: true
                });
                
                promotionLog.push({
                    memory_id: mem.id,
                    from: 'R2',
                    to: 'R3',
                    d2: mem.d2_modulation,
                    access_count: mem.access_count
                });
            }
        }

        // STEP 2: INTELLIGENT DECAY - Importance-weighted decay
        if (decay_inactive) {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const inactiveMemories = await base44.entities.UserMemory.filter({
                last_accessed: { "$lt": thirtyDaysAgo },
                pruning_protection: false
            });

            for (const mem of inactiveMemories) {
                const importance = mem.importance_score || 0.5;
                const baseFactor = mem.decay_factor || 0.995;
                
                // Higher importance = slower decay
                const importanceMultiplier = 0.5 + (importance * 0.5); // 0.5-1.0
                const adjustedDecay = 1 - ((1 - baseFactor) * importanceMultiplier);
                
                const newD2 = (mem.d2_modulation || 0.5) * adjustedDecay;
                
                await base44.entities.UserMemory.update(mem.id, {
                    d2_modulation: Math.max(0.1, newD2)
                });
                
                decayLog.push({
                    memory_id: mem.id,
                    old_d2: mem.d2_modulation,
                    new_d2: newD2,
                    importance,
                    decay_rate: adjustedDecay
                });
            }
        }

        // STEP 3: SMART PRUNING - Multi-factor scoring
        if (smart_pruning) {
            const allT1Memories = await base44.entities.UserMemory.filter({
                tier_level: 1,
                pruning_protection: false
            });
            
            // Calculate composite score for each memory
            const scoredMemories = allT1Memories.map(mem => {
                const importance = mem.importance_score || 0.5;
                const d2 = mem.d2_modulation || 0.5;
                const recency = calculateRecencyScore(mem.last_accessed || mem.created_date);
                
                // Composite score: weighted combination
                const compositeScore = (
                    (importance * importance_weight) +
                    (recency * recency_weight) +
                    (d2 * (1 - importance_weight - recency_weight))
                );
                
                return { ...mem, compositeScore };
            });
            
            // Sort by composite score and prune bottom 20%
            scoredMemories.sort((a, b) => a.compositeScore - b.compositeScore);
            const pruneCount = Math.max(1, Math.floor(scoredMemories.length * 0.2));
            const pruneCandidates = scoredMemories.slice(0, pruneCount);
            
            for (const mem of pruneCandidates) {
                if (mem.compositeScore < pruning_threshold) {
                    await base44.entities.UserMemory.delete(mem.id);
                    
                    pruneLog.push({
                        memory_id: mem.id,
                        tier: mem.source_database_tier,
                        d2: mem.d2_modulation,
                        importance: mem.importance_score,
                        composite_score: mem.compositeScore,
                        reason: 'low_composite_score'
                    });
                }
            }
        } else {
            // Simple pruning (legacy)
            const pruneCandidates = await base44.entities.UserMemory.filter({
                d2_modulation: { "$lt": pruning_threshold },
                pruning_protection: false,
                tier_level: 1
            });

            for (const mem of pruneCandidates) {
                await base44.entities.UserMemory.delete(mem.id);
                
                pruneLog.push({
                    memory_id: mem.id,
                    tier: mem.source_database_tier,
                    d2: mem.d2_modulation,
                    reason: 'low_attention'
                });
            }
        }

        return Response.json({
            success: true,
            promotions: promotionLog.length,
            decays: decayLog.length,
            pruned: pruneLog.length,
            details: {
                promotionLog,
                decayLog,
                pruneLog
            }
        });

    } catch (error) {
        console.error('[MemoryTierPromotion] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * Calculate recency score (0-1) based on last access
 */
function calculateRecencyScore(lastAccessed) {
    const now = Date.now();
    const accessed = new Date(lastAccessed).getTime();
    const daysSince = (now - accessed) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: 1.0 at day 0, 0.5 at day 30, 0.1 at day 90
    return Math.max(0.1, Math.exp(-daysSince / 30));
}