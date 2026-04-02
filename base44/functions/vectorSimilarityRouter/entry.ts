import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * VECTOR SIMILARITY ROUTER - Enhanced D²STIB with Embeddings
 * Phase 2 of v4.7 Upgrade: Semantic Vector-based Routing
 * 
 * Replaces keyword matching with cosine similarity for semantic tier detection
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[VectorRouter] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message,
            user_input_embedding = null,
            fallback_to_keywords = true,
            use_hf_embeddings = false // NEW: Option to use HF embeddings
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                error: 'user_message required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== VECTOR SIMILARITY ROUTING START ===');

        // Generate embedding if not provided
        let embedding = user_input_embedding;
        let embeddingSource = 'provided';
        
        if (!embedding) {
            addLog('Generating embedding for user input...');
            
            if (use_hf_embeddings) {
                // Use Hugging Face embeddings
                try {
                    const { data: hfEmbData } = await base44.functions.invoke('huggingFaceEmbeddings', { 
                        text: user_message 
                    });
                    
                    if (hfEmbData && hfEmbData.success) {
                        embedding = hfEmbData.embedding;
                        embeddingSource = 'hugging_face';
                        addLog('✓ HF embedding generated', { dim: embedding.length });
                    } else {
                        throw new Error('HF embedding failed');
                    }
                } catch (hfError) {
                    addLog('⚠️ HF embedding failed, falling back to default', hfError.message);
                    use_hf_embeddings = false;
                }
            }
            
            if (!use_hf_embeddings) {
                // Default embedding generation
                const { data: embData } = await base44.functions.invoke('generateEmbedding', {
                    text: user_message,
                    dimension: 384,
                    normalize: true
                });
                
                if (!embData || !embData.success) {
                    throw new Error('Failed to generate input embedding');
                }
                
                embedding = embData.embedding;
                embeddingSource = 'default';
                addLog('✓ Default embedding generated', { dim: embedding.length });
            }
        }

        // Load active DSTIB config
        const dstibConfigs = await base44.asServiceRole.entities.DSTIBConfig.filter({ 
            is_active: true 
        }, '-created_date', 1);

        if (dstibConfigs.length === 0) {
            throw new Error('No active DSTIB configuration found');
        }

        const config = dstibConfigs[0];
        addLog('Loaded DSTIB config', { name: config.config_name });

        // Pre-computed tier embeddings (should be stored in DSTIBConfig)
        // For now, we'll generate them on-the-fly from keywords
        const tierDefinitions = {
            L1_literal: config.semantic_tier_keywords?.L1_literal || ['fact', 'data', 'define'],
            L2_analytical: config.semantic_tier_keywords?.L2_analytical || ['analyze', 'compare', 'proof'],
            R2_creative: config.semantic_tier_keywords?.R2_creative || ['imagine', 'create', 'story'],
            R3_L3_synthesis: config.semantic_tier_keywords?.R3_L3_synthesis || ['synthesize', 'integrate', 'ethical']
        };

        // Calculate similarity scores for each tier
        const tierScores = {};
        
        for (const [tierName, keywords] of Object.entries(tierDefinitions)) {
            // Generate embedding for tier keywords
            const tierText = keywords.join(' ');
            const { data: tierEmbData } = await base44.functions.invoke('generateEmbedding', {
                text: tierText,
                dimension: 384,
                normalize: true
            });
            
            if (!tierEmbData || !tierEmbData.success) {
                addLog('⚠️ Failed to generate tier embedding', { tier: tierName });
                tierScores[tierName] = 0;
                continue;
            }
            
            const tierEmbedding = tierEmbData.embedding;
            
            // Calculate cosine similarity
            const similarity = calculateCosineSimilarity(embedding, tierEmbedding);
            tierScores[tierName] = similarity;
            
            addLog(`Tier ${tierName} similarity`, { score: similarity.toFixed(3) });
        }

        // Determine winning tier
        const sortedTiers = Object.entries(tierScores).sort((a, b) => b[1] - a[1]);
        const [winningTier, maxSimilarity] = sortedTiers[0];

        addLog('✓ Winning tier detected', { 
            tier: winningTier, 
            similarity: maxSimilarity.toFixed(3) 
        });

        // Confidence threshold
        const CONFIDENCE_THRESHOLD = 0.3;
        let semantic_tier = winningTier;
        let routing_confidence = maxSimilarity;

        if (maxSimilarity < CONFIDENCE_THRESHOLD) {
            addLog('⚠️ Low confidence, fallback to keyword analysis');
            
            if (fallback_to_keywords) {
                // Simple keyword fallback
                const lowerMsg = user_message.toLowerCase();
                if (/what is|who is|define|calculate/.test(lowerMsg)) {
                    semantic_tier = 'L1_literal';
                } else if (/analyze|compare|why|how/.test(lowerMsg)) {
                    semantic_tier = 'L2_analytical';
                } else if (/imagine|create|story|art/.test(lowerMsg)) {
                    semantic_tier = 'R2_creative';
                } else {
                    semantic_tier = 'R3_L3_synthesis';
                }
                routing_confidence = 0.5;
            }
        }

        // Map tier to routing parameters
        const tierConfig = config.query_type_weighting?.[semantic_tier] || {
            omega_target: 0.5,
            d2_profile: 'Balanced',
            routing_layer: 'Moderate'
        };

        const routing_result = {
            semantic_tier,
            routing_layer: tierConfig.routing_layer || 'Moderate',
            target_omega: tierConfig.omega_target || 0.5,
            d2_profile: tierConfig.d2_profile || 'Balanced',
            routing_confidence,
            similarity_scores: tierScores,
            method: maxSimilarity >= CONFIDENCE_THRESHOLD ? 'vector_similarity' : 'keyword_fallback'
        };

        addLog('=== ROUTING COMPLETE ===', routing_result);

        return Response.json({
            success: true,
            routing_result,
            embedding_used: true,
            embedding_source: embeddingSource,
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

// Helper: Cosine Similarity
function calculateCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
        throw new Error('Vectors must have same dimension');
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        mag1 += vec1[i] * vec1[i];
        mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) return 0;
    
    return dotProduct / (mag1 * mag2);
}