import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * FACTUAL CACHE MANAGER - L3 Immutable Truth Storage
 * Caches verified factual answers to avoid recomputation
 * Stores in L3 (Left Hemisphere) as immutable knowledge
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            operation = 'check', // check | store | invalidate
            query,
            answer,
            sources = [],
            confidence = 1.0
        } = await req.json();

        if (operation === 'check') {
            // Check if we have a cached answer for this query
            const queryHash = generateQueryHash(query);
            
            const cached = await base44.entities.UserMemory.filter({
                memory_type: 'fact',
                tier_level: 3,
                hemisphere: 'left',
                semantic_hash: queryHash,
                pruning_protection: true
            }, '-d2_modulation', 1);

            if (cached.length > 0) {
                const cachedMem = cached[0];
                
                // Check if still valid (not older than 30 days)
                const age = Date.now() - new Date(cachedMem.created_date).getTime();
                const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
                
                if (age < maxAge && cachedMem.d2_modulation > 0.85) {
                    // Update access count
                    await base44.entities.UserMemory.update(cachedMem.id, {
                        access_count: (cachedMem.access_count || 0) + 1,
                        last_accessed: new Date().toISOString()
                    });

                    return Response.json({
                        success: true,
                        cached: true,
                        answer: cachedMem.memory_content,
                        metadata: {
                            sources: JSON.parse(cachedMem.context || '[]'),
                            confidence: cachedMem.d2_modulation,
                            access_count: cachedMem.access_count + 1,
                            created: cachedMem.created_date
                        }
                    });
                }
            }

            return Response.json({
                success: true,
                cached: false
            });
        }

        if (operation === 'store') {
            // Store a verified factual answer in L3
            if (!query || !answer) {
                return Response.json({
                    success: false,
                    error: 'query and answer required'
                }, { status: 400 });
            }

            const queryHash = generateQueryHash(query);
            
            // Check if already exists
            const existing = await base44.entities.UserMemory.filter({
                semantic_hash: queryHash,
                tier_level: 3,
                hemisphere: 'left'
            });

            let memoryId;
            
            if (existing.length > 0) {
                // Update existing
                await base44.entities.UserMemory.update(existing[0].id, {
                    memory_content: answer,
                    d2_modulation: confidence,
                    context: JSON.stringify(sources),
                    last_accessed: new Date().toISOString(),
                    importance_score: confidence
                });
                memoryId = existing[0].id;
            } else {
                // Create new L3 fact
                const memory = await base44.entities.UserMemory.create({
                    memory_key: `fact_${queryHash}`,
                    memory_content: answer,
                    memory_type: 'fact',
                    tier_level: 3,
                    hemisphere: 'left',
                    d2_modulation: confidence,
                    importance_score: confidence,
                    semantic_hash: queryHash,
                    context: JSON.stringify(sources),
                    source_database_tier: 'L3',
                    compression_type: 'lzma',
                    pruning_protection: true,
                    access_count: 0
                });
                memoryId = memory.id;
            }

            return Response.json({
                success: true,
                stored: true,
                memory_id: memoryId
            });
        }

        if (operation === 'invalidate') {
            // Invalidate cached facts (e.g., outdated information)
            const queryHash = generateQueryHash(query);
            
            const toInvalidate = await base44.entities.UserMemory.filter({
                semantic_hash: queryHash,
                tier_level: 3,
                hemisphere: 'left'
            });

            for (const mem of toInvalidate) {
                await base44.entities.UserMemory.update(mem.id, {
                    d2_modulation: 0.3,
                    pruning_protection: false
                });
            }

            return Response.json({
                success: true,
                invalidated: toInvalidate.length
            });
        }

        return Response.json({
            success: false,
            error: 'Invalid operation'
        }, { status: 400 });

    } catch (error) {
        console.error('[FactualCache] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

function generateQueryHash(query) {
    // Normalize query
    const normalized = query
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .sort()
        .join('_');
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 12);
}