import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * DSTIB-HEBDEN ROUTER v1.0 - Dopaminergic Semantic-Tiered Input Bridge
 * Routes queries to optimal semantic tiers (L1-L3, R1-R3, GC) based on entropy and cognitive load
 */

Deno.serve(async (req) => {
    const logs = [];
    const log = (level, msg, data = {}) => {
        logs.push({ level, message: msg, data, timestamp: new Date().toISOString() });
        console.log(`[DSTIB-Hebden][${level.toUpperCase()}] ${msg}`, data);
    };

    try {
        log('system', '=== DSTIB-HEBDEN ROUTER START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized', logs }, { status: 401 });
        }

        const { user_message, context = null } = await req.json();
        
        if (!user_message || !user_message.trim()) {
            return Response.json({ success: false, error: 'user_message required', logs }, { status: 400 });
        }

        log('info', 'Analyzing semantic properties', { message_length: user_message.length });

        // Load DSTIB config
        const configRecords = await base44.asServiceRole.entities.DSTIBConfig.filter({ is_active: true });
        const config = configRecords.length > 0 ? configRecords[0] : null;
        
        if (!config) {
            log('warning', 'No active DSTIB config found, using defaults');
        }

        const thresholds = config?.input_entropy_thresholds || { low_entropy: 0.3, medium_entropy: 0.6, high_entropy: 0.9 };
        const tierKeywords = config?.semantic_tier_keywords || {};
        
        // STEP 1: Calculate Input Entropy
        const input_entropy = calculateInputEntropy(user_message);
        log('info', 'Input entropy calculated', { input_entropy });

        // STEP 2: Detect Query Type and Semantic Tier
        const { query_type, semantic_tier, tier_confidence } = detectSemanticTier(user_message, tierKeywords);
        log('info', 'Semantic tier detected', { query_type, semantic_tier, tier_confidence });

        // STEP 3: Calculate Target Omega (hemispheric balance)
        const target_omega = calculateTargetOmega(query_type, semantic_tier, config);
        log('info', 'Target omega calculated', { target_omega });

        // STEP 4: Determine D2 Modulation Profile
        const d2_profile = determineD2Profile(semantic_tier, input_entropy, config);
        log('info', 'D2 profile determined', { d2_profile });

        // STEP 5: Suggest Persona Pre-filtering
        const suggested_personas = suggestPersonas(semantic_tier, query_type, target_omega);
        log('info', 'Personas suggested', { count: suggested_personas.length });

        // STEP 6: Determine Routing Layer (Fast/Moderate/Deep)
        const routing_layer = determineRoutingLayer(input_entropy, thresholds);
        log('info', 'Routing layer determined', { routing_layer });

        log('success', '=== DSTIB-HEBDEN ROUTING COMPLETE ===');

        return Response.json({
            success: true,
            routing_result: {
                input_entropy,
                query_type,
                semantic_tier,
                tier_confidence,
                target_omega,
                d2_profile,
                routing_layer,
                suggested_personas,
                hebden_density_weight: config?.hebden_density_weights?.[semantic_tier] || 0.5
            },
            logs
        });

    } catch (error) {
        log('error', `DSTIB-Hebden error: ${error.message}`, { stack: error.stack });
        return Response.json({ success: false, error: error.message, logs }, { status: 500 });
    }
});

function calculateInputEntropy(text) {
    // Simplified entropy calculation based on text characteristics
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
    const totalWords = text.split(/\s+/).length;
    const questionMarks = (text.match(/\?/g) || []).length;
    const technicalTerms = (text.match(/\b(algorithm|function|data|system|process|calculate)\b/gi) || []).length;
    const abstractTerms = (text.match(/\b(feel|imagine|create|art|beauty|emotion|story)\b/gi) || []).length;
    
    // Entropy factors
    const lexicalDiversity = uniqueWords / Math.max(totalWords, 1);
    const questionComplexity = Math.min(questionMarks * 0.1, 0.3);
    const technicalWeight = Math.min(technicalTerms * 0.05, 0.3);
    const abstractWeight = Math.min(abstractTerms * 0.05, 0.3);
    
    const entropy = Math.min(1.0, lexicalDiversity + questionComplexity + technicalWeight + abstractWeight);
    return parseFloat(entropy.toFixed(3));
}

function detectSemanticTier(text, tierKeywords) {
    const lowerText = text.toLowerCase();
    
    const scores = {
        'L1_literal': 0,
        'L2_analytical': 0,
        'R2_creative': 0,
        'R3_L3_synthesis': 0
    };

    // Score each tier based on keyword matches
    for (const [tier, keywords] of Object.entries(tierKeywords)) {
        if (Array.isArray(keywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    scores[tier]++;
                }
            }
        }
    }

    // Determine dominant tier
    let maxScore = 0;
    let dominantTier = 'L2_analytical'; // default
    let query_type = 'analytical';
    
    for (const [tier, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            dominantTier = tier;
        }
    }

    // Map tier to query type
    if (dominantTier === 'L1_literal') {
        query_type = 'factual';
    } else if (dominantTier === 'L2_analytical') {
        query_type = 'analytical';
    } else if (dominantTier === 'R2_creative') {
        query_type = 'creative';
    } else if (dominantTier === 'R3_L3_synthesis') {
        query_type = 'synthesis';
    }

    const totalMatches = Object.values(scores).reduce((a, b) => a + b, 0);
    const tier_confidence = totalMatches > 0 ? maxScore / totalMatches : 0.5;

    return { query_type, semantic_tier: dominantTier, tier_confidence };
}

function calculateTargetOmega(query_type, semantic_tier, config) {
    // Default omega targets based on query type
    const defaults = {
        'factual': 0.9,      // Highly analytical
        'analytical': 0.8,   // Analytical
        'creative': 0.2,     // Highly creative
        'synthesis': 0.5     // Balanced
    };

    // Try to get from config
    const configMapping = {
        'L1_literal': 'factual_L1',
        'L2_analytical': 'analytical_L2',
        'R2_creative': 'creative_R2',
        'R3_L3_synthesis': 'synthesis_R3_L3'
    };

    const configKey = configMapping[semantic_tier];
    if (config?.query_type_weighting?.[configKey]) {
        return config.query_type_weighting[configKey].omega_target;
    }

    return defaults[query_type] || 0.5;
}

function determineD2Profile(semantic_tier, input_entropy, config) {
    // D2Stim = focused, analytical, fast (Left-brain)
    // D2Pin = flexible, creative, exploratory (Right-brain)
    // Balanced = harmonized
    
    if (semantic_tier === 'L1_literal' || semantic_tier === 'L2_analytical') {
        return 'D2Stim';
    } else if (semantic_tier === 'R2_creative') {
        return 'D2Pin';
    } else if (semantic_tier === 'R3_L3_synthesis') {
        return 'Balanced';
    }
    
    // Fallback based on entropy
    return input_entropy > 0.7 ? 'Balanced' : 'D2Stim';
}

function suggestPersonas(semantic_tier, query_type, target_omega) {
    // Suggest personas based on semantic tier and omega
    const suggestions = [];
    
    if (semantic_tier.startsWith('L')) {
        // Left-brain biased
        suggestions.push('TechnicalAI', 'ScientificAI', 'AnalyticalAI');
    } else if (semantic_tier.startsWith('R')) {
        // Right-brain biased
        suggestions.push('CreativeAI', 'ArtisticAI', 'PhilosophicalAI');
    }
    
    // Always include central harmonizer for synthesis
    if (semantic_tier.includes('R3_L3') || target_omega > 0.4 && target_omega < 0.6) {
        suggestions.push('EthicalAI', 'IntegratorAI');
    }
    
    return suggestions;
}

function determineRoutingLayer(input_entropy, thresholds) {
    if (input_entropy < thresholds.low_entropy) {
        return 'Fast';
    } else if (input_entropy < thresholds.medium_entropy) {
        return 'Moderate';
    } else {
        return 'Deep';
    }
}