import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * NEURONAS TIERED MEMORY ROUTER
 * Implements QuAC/QDAC cache logic for intelligent tier routing
 * Based on importance, hemisphere, and D2 modulation
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            memory_content,
            memory_key,
            memory_type = 'context',
            importance_score,
            omega_t,
            dopamine_t,
            conversation_id,
            context = '',
            auto_route = true
        } = await req.json();

        if (!memory_content || !memory_key) {
            return Response.json({ 
                success: false, 
                error: 'memory_content and memory_key required' 
            }, { status: 400 });
        }

        // QuAC/QDAC LOGIC: Determine tier based on importance
        let tier_level = 1;
        let compression_type = 'none';
        let source_database_tier = 'L1';
        
        const calculated_importance = importance_score !== undefined 
            ? importance_score 
            : dopamine_t || 0.5;

        if (calculated_importance > 0.9) {
            tier_level = 1;
            compression_type = 'none';
            source_database_tier = omega_t > 0.5 ? 'L1' : 'R1';
        } else if (calculated_importance > 0.6) {
            tier_level = 2;
            compression_type = 'gzip';
            source_database_tier = omega_t > 0.5 ? 'L2' : 'R2';
        } else {
            tier_level = 3;
            compression_type = 'lzma';
            source_database_tier = omega_t > 0.5 ? 'L3' : 'R3';
        }

        // Determine hemisphere based on omega_t
        let hemisphere = 'central';
        if (omega_t !== undefined) {
            if (omega_t > 0.7) {
                hemisphere = 'left';  // Analytical
            } else if (omega_t < 0.3) {
                hemisphere = 'right'; // Creative
            }
        }

        // Generate semantic hash for LSH clustering
        const semantic_hash = await generateSemanticHash(memory_content);

        // Create memory object
        const memoryData = {
            memory_key,
            memory_content,
            memory_type,
            tier_level,
            hemisphere,
            d2_modulation: dopamine_t || 0.5,
            omega_t: omega_t || 0.5,
            importance_score: calculated_importance,
            compression_type,
            source_database_tier,
            semantic_hash,
            conversation_id,
            context,
            access_count: 0,
            last_accessed: new Date().toISOString(),
            pruning_protection: calculated_importance > 0.95,
            push_pull_direction: 'neutral',
            push_pull_priority: Math.round(calculated_importance * 10)
        };

        // Save to UserMemory entity
        const savedMemory = await base44.entities.UserMemory.create(memoryData);

        return Response.json({
            success: true,
            memory_id: savedMemory.id,
            tier_assigned: source_database_tier,
            tier_level,
            compression_type,
            hemisphere,
            d2_modulation: memoryData.d2_modulation,
            importance_score: calculated_importance,
            semantic_hash
        });

    } catch (error) {
        console.error('[MemoryTierRouter] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * Generate semantic hash using LSH-inspired approach
 */
async function generateSemanticHash(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hashBase = words.slice(0, 10).join('_');
    
    // Simple hash function (in production, use real LSH)
    let hash = 0;
    for (let i = 0; i < hashBase.length; i++) {
        const char = hashBase.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 8);
}