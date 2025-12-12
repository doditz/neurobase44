import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SMAS MEMORY MANAGER v3.0 - NEURONAS 7-DATABASE ARCHITECTURE
 * Implements L1-L3 (Left/Analytical) + R1-R3 (Right/Creative) + GC (Genius Central)
 * With QuAC/QDAC dynamic tier routing and LSH semantic indexing
 */

Deno.serve(async (req) => {
    const logs = [];
    
    const logManager = {
        _addLog: (level, message, data = {}) => {
            logs.push({ timestamp: Date.now(), level, message, data });
            console.log(`[SMAS_Memory][${level.toUpperCase()}] ${message}`, data);
        },
        info: (msg, data) => logManager._addLog('info', msg, data),
        success: (msg, data) => logManager._addLog('success', msg, data),
        warning: (msg, data) => logManager._addLog('warning', msg, data),
        error: (msg, data) => logManager._addLog('error', msg, data)
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message, 
            conversation_id = 'pending',
            enable_intent_based_retrieval = true,
            omega_t = 0.5,
            dopamine_t = 0.5,
            flux_integral = 0.0
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                success: false, 
                error: 'user_message is required' 
            }, { status: 400 });
        }

        logManager.info('=== NEURONAS 7-DB MEMORY ARCHITECTURE START ===', {
            omega_t,
            dopamine_t,
            flux_integral
        });

        // STEP 1: Determine hemispheric pathway
        const pathway = determinePathway(user_message, omega_t);
        logManager.info(`Pathway determined: ${pathway.name}`, {
            omega_calculated: pathway.omega,
            hemisphere_primary: pathway.hemisphere
        });

        // STEP 2: PARALLEL TIER RETRIEVAL (L1-L3, R1-R3, GC)
        logManager.info('Retrieving memories from all 7 tiers in parallel');
        
        const [l1, r1, l2, r2, l3, r3, gc, systemMem] = await Promise.all([
            // L1: Immediate analytical facts
            base44.entities.UserMemory.filter({
                tier_level: 1,
                hemisphere: 'left'
            }, '-d2_modulation', 10),
            
            // R1: Intuitive short-term cache
            base44.entities.UserMemory.filter({
                tier_level: 1,
                hemisphere: 'right'
            }, '-d2_modulation', 10),
            
            // L2: Validated logical patterns
            base44.entities.UserMemory.filter({
                tier_level: 2,
                hemisphere: 'left'
            }, '-access_count', 8),
            
            // R2: Associative metaphorical links
            base44.entities.UserMemory.filter({
                tier_level: 2,
                hemisphere: 'right'
            }, '-access_count', 8),
            
            // L3: Long-term ethical archive
            base44.entities.UserMemory.filter({
                tier_level: 3,
                hemisphere: 'left'
            }, '-d2_modulation', 5),
            
            // R3: Holistic user interaction models
            base44.entities.UserMemory.filter({
                tier_level: 3,
                hemisphere: 'right'
            }, '-d2_modulation', 5),
            
            // GC: Genius Central harmonization nucleus
            base44.entities.UserMemory.filter({
                hemisphere: 'central'
            }, '-gc_integration_score', 5),
            
            // System Memory
            base44.entities.SystemMemory.filter({
                tier_level: 1
            }, '-d2_modulation', 5)
        ]);

        logManager.success('7-tier retrieval complete', {
            L1: l1.length,
            R1: r1.length,
            L2: l2.length,
            R2: r2.length,
            L3: l3.length,
            R3: r3.length,
            GC: gc.length,
            System: systemMem.length
        });

        // STEP 3: SEMANTIC SIMILARITY SEARCH (LSH-based)
        let semanticMatches = [];
        
        if (enable_intent_based_retrieval && dopamine_t > 0.5) {
            logManager.info('🔍 LSH-based semantic search activated');
            
            const queryHash = generateSemanticHash(user_message);
            
            // Search across all tiers for semantic matches
            const allMemories = [...l1, ...r1, ...l2, ...r2, ...l3, ...r3, ...gc];
            
            semanticMatches = allMemories.filter(mem => {
                if (!mem.semantic_hash) return false;
                
                // Simple Hamming distance for hash similarity
                const similarity = calculateHashSimilarity(queryHash, mem.semantic_hash);
                return similarity > 0.6;
            }).slice(0, 5);
            
            logManager.success(`Found ${semanticMatches.length} semantic matches`);
        }

        // STEP 4: GC HARMONIZATION (Vector-based integration)
        const leftOutput = harmonizeHemisphere(
            [...l1, ...l2, ...l3],
            pathway.omega,
            'left'
        );
        
        const rightOutput = harmonizeHemisphere(
            [...r1, ...r2, ...r3],
            1 - pathway.omega,
            'right'
        );

        // GC = γL·L + γR·R + λ·∇×SNEN
        const gcWeight = 0.2;
        const harmonizedMemories = [
            ...leftOutput.slice(0, Math.ceil(leftOutput.length * pathway.omega)),
            ...rightOutput.slice(0, Math.ceil(rightOutput.length * (1 - pathway.omega))),
            ...gc,
            ...semanticMatches
        ];

        // Remove duplicates
        const uniqueMemories = harmonizedMemories.filter((mem, idx, arr) =>
            arr.findIndex(m => m.id === mem.id) === idx
        );

        logManager.success('GC Harmonization complete', {
            left_contrib: leftOutput.length,
            right_contrib: rightOutput.length,
            gc_contrib: gc.length,
            total_unique: uniqueMemories.length
        });

        // STEP 5: DOPAMINE GATING (Attention filtering)
        let finalMemories = uniqueMemories;
        
        if (dopamine_t < 0.3) {
            // LOW DOPAMINE: Prune context, economy mode
            logManager.info('⚡ ECONOMY MODE: Low dopamine, pruning context');
            finalMemories = uniqueMemories
                .filter(mem => mem.d2_modulation > 0.7)
                .slice(0, 5);
        } else if (dopamine_t > 0.7) {
            // HIGH DOPAMINE: Expand reasoning, exploration mode
            logManager.info('🌟 EXPLORATION MODE: High dopamine, expanding context');
            finalMemories = uniqueMemories.slice(0, 20);
        } else {
            // BALANCED DOPAMINE
            finalMemories = uniqueMemories.slice(0, 12);
        }

        // STEP 6: BUILD CONTEXT STRING
        let full_context = '';

        // System Memory (Always first)
        if (systemMem.length > 0) {
            full_context += '\n## 🧬 NEURONAS SYSTEM IDENTITY\n\n';
            systemMem.forEach(mem => {
                full_context += `- ${mem.memory_content}\n`;
            });
        }

        // Hemispheric Memory Context
        const leftMemories = finalMemories.filter(m => m.hemisphere === 'left');
        const rightMemories = finalMemories.filter(m => m.hemisphere === 'right');
        const centralMemories = finalMemories.filter(m => m.hemisphere === 'central');

        if (leftMemories.length > 0) {
            full_context += '\n## 🧮 LEFT HEMISPHERE (Analytical Context)\n\n';
            leftMemories.forEach(mem => {
                const tier = mem.source_database_tier || `L${mem.tier_level}`;
                full_context += `- [${tier}] ${mem.memory_content}\n`;
            });
        }

        if (rightMemories.length > 0) {
            full_context += '\n## 🎨 RIGHT HEMISPHERE (Creative Context)\n\n';
            rightMemories.forEach(mem => {
                const tier = mem.source_database_tier || `R${mem.tier_level}`;
                full_context += `- [${tier}] ${mem.memory_content}\n`;
            });
        }

        if (centralMemories.length > 0) {
            full_context += '\n## ⚡ GENIUS CENTRAL (Harmonized Context)\n\n';
            centralMemories.forEach(mem => {
                full_context += `- [GC] ${mem.memory_content}\n`;
            });
        }

        // STEP 7: UPDATE ACCESS PATTERNS (Synaptic strengthening)
        const updatePromises = finalMemories.map(async (mem) => {
            const newD2 = Math.min(1.0, (mem.d2_modulation || 0.5) + 0.05 * dopamine_t);
            
            return base44.entities.UserMemory.update(mem.id, {
                access_count: (mem.access_count || 0) + 1,
                last_accessed: new Date().toISOString(),
                d2_modulation: newD2
            }).catch(() => null);
        });
        
        await Promise.allSettled(updatePromises);

        logManager.success('=== NEURONAS MEMORY RETRIEVAL COMPLETE ===');

        return Response.json({
            success: true,
            full_context,
            memory_stats: {
                total_retrieved: uniqueMemories.length,
                final_selected: finalMemories.length,
                L1: l1.length,
                R1: r1.length,
                L2: l2.length,
                R2: r2.length,
                L3: l3.length,
                R3: r3.length,
                GC: gc.length,
                left_hemisphere: leftMemories.length,
                right_hemisphere: rightMemories.length,
                central_hemisphere: centralMemories.length
            },
            pathway: pathway.name,
            omega_t: pathway.omega,
            dopamine_mode: dopamine_t < 0.3 ? 'ECONOMY' : dopamine_t > 0.7 ? 'EXPLORATION' : 'BALANCED',
            logs
        });

    } catch (error) {
        console.error('[MemoryTierRouter] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            full_context: '',
            logs
        }, { status: 500 });
    }
});

/**
 * Determine cognitive pathway based on query and omega_t
 */
function determinePathway(query, omega_t) {
    const queryLower = query.toLowerCase();
    
    // Analytical indicators
    const analyticalScore = (
        (queryLower.match(/math|logic|calculate|analyze|data|fact|proof|evidence/g) || []).length * 0.15
    );
    
    // Creative indicators
    const creativeScore = (
        (queryLower.match(/imagine|create|story|art|feel|abstract|metaphor|intuition/g) || []).length * 0.15
    );
    
    // Ethical indicators
    const ethicalScore = (
        (queryLower.match(/should|ethical|moral|right|wrong|fair|justice/g) || []).length * 0.1
    );
    
    // Calculate target omega
    let targetOmega = 0.5;
    
    if (analyticalScore > creativeScore + ethicalScore) {
        targetOmega = 0.9; // Strongly analytical
    } else if (creativeScore > analyticalScore + ethicalScore) {
        targetOmega = 0.1; // Strongly creative
    } else if (ethicalScore > 0.2) {
        targetOmega = 0.5; // Ethical requires balance
    }
    
    // Apply inertia: don't switch instantly
    const inertia_factor = 0.6;
    const calculated_omega = omega_t + inertia_factor * (targetOmega - omega_t);
    
    let pathway_name = 'BALANCED';
    let hemisphere = 'central';
    
    if (calculated_omega > 0.7) {
        pathway_name = 'ANALYTICAL';
        hemisphere = 'left';
    } else if (calculated_omega < 0.3) {
        pathway_name = 'CREATIVE';
        hemisphere = 'right';
    }
    
    return {
        name: pathway_name,
        omega: calculated_omega,
        hemisphere,
        scores: { analyticalScore, creativeScore, ethicalScore }
    };
}

/**
 * Harmonize memories from one hemisphere with weighting
 */
function harmonizeHemisphere(memories, weight, hemisphere) {
    return memories
        .map(mem => ({
            ...mem,
            weighted_score: (mem.d2_modulation || 0.5) * weight * (mem.gc_integration_score || 1.0)
        }))
        .sort((a, b) => b.weighted_score - a.weighted_score);
}

/**
 * Generate semantic hash for LSH clustering
 */
function generateSemanticHash(text) {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hashBase = words.slice(0, 10).join('_');
    
    let hash = 0;
    for (let i = 0; i < hashBase.length; i++) {
        const char = hashBase.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return Math.abs(hash).toString(36).substring(0, 8);
}

/**
 * Calculate hash similarity (Hamming distance)
 */
function calculateHashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / hash1.length;
}