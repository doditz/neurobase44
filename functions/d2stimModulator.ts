import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * D2STIM MODULATOR - MODULATE Module v2.0
 * 
 * 🔥 NEW: Tone-aware modulation for conversational vs formal responses
 * 🔥 NEW: Fact-checking and citation influence on modulation parameters
 */
Deno.serve(async (req) => {
    const logs = [];
    const logManager = {
        info: (message, data = {}) => {
            logs.push({ level: 'info', message, data, timestamp: new Date().toISOString() });
            console.log(`[INFO] ${message}`, data);
        },
        warning: (message, data = {}) => {
            logs.push({ level: 'warning', message, data, timestamp: new Date().toISOString() });
            console.warn(`[WARN] ${message}`, data);
        },
        success: (message, data = {}) => {
            logs.push({ level: 'success', message, data, timestamp: new Date().toISOString() });
            console.log(`[SUCCESS] ${message}`, data);
        },
        getLogs: () => logs
    };

    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const requestData = await req.json();
        const { 
            complexity_score = 0.5,
            archetype = 'balanced', // Renamed from archetype_detected
            dominant_hemisphere = 'central',
            user_settings = {}, // Renamed from settings
            needs_conversational_tone = false, // 🔥 NEW parameter
            fact_check_available = false, // NEW
            citation_count = 0 // NEW
        } = requestData;

        logManager.info('D2STIM Modulator invoked', {
            complexity_score,
            archetype,
            fact_check_available,
            citation_count
        });

        let d2_activation; // Renamed from optimal_d2_activation

        // Determine base D2 level from task archetype
        switch (archetype) { // Using new archetype variable
            case 'creative':
                d2_activation = 0.45;
                break;
            case 'analytical':
            case 'technical':
                d2_activation = 0.75;
                break;
            case 'ethical':
                d2_activation = 0.65;
                break;
            default:
                d2_activation = 0.70;
        }

        // Adjust D2 based on complexity
        d2_activation += (complexity_score - 0.5) * 0.1;

        // 🔥 NEW: If conversational tone needed, reduce D2 (more D2Pin = more flexibility/warmth)
        if (needs_conversational_tone) {
            d2_activation = Math.max(0.35, d2_activation - 0.2);
        }

        // Citation-based confidence boost
        if (citation_count > 0) {
            const citation_boost = Math.min(0.15, citation_count * 0.03);
            d2_activation = Math.min(1.0, d2_activation + citation_boost);
            
            logManager.info(`Citation boost applied: +${(citation_boost * 100).toFixed(1)}% d2_activation`, {
                citations: citation_count
            });
        }

        // Final d2_activation with fact-check consideration
        const fact_check_multiplier = fact_check_available ? 1.1 : (complexity_score > 0.5 ? 0.85 : 1.0);
        d2_activation = Math.max(0.0, Math.min(1.0, d2_activation * fact_check_multiplier));

        // Ensure d2_activation is within valid range after all adjustments
        d2_activation = Math.max(0.2, Math.min(0.9, d2_activation));


        // Calculate attention level
        const alpha = 1.2;
        const beta = 0.8;
        const attention_level = alpha * d2_activation * (1 - beta * Math.pow(d2_activation, 2));
        const cognitive_state = attention_level > 0.6 ? 'high_focus' : attention_level > 0.4 ? 'moderate_focus' : 'exploratory';

        // Modulate LLM settings
        const config = { ...user_settings }; // Renamed from dynamic_llm_settings and baseSettings
        
        if (cognitive_state === 'high_focus') {
            config.temperature = user_settings.temperature ? Math.max(0.2, user_settings.temperature - 0.2) : 0.5;
            config.debate_rounds = user_settings.debate_rounds ? Math.min(5, user_settings.debate_rounds + 1) : 4;
            config.max_personas = user_settings.max_personas ? Math.min(7, user_settings.max_personas + 1) : 6;
        } else if (cognitive_state === 'exploratory') {
            config.temperature = user_settings.temperature ? Math.min(1.0, user_settings.temperature + 0.2) : 0.9;
            config.debate_rounds = user_settings.debate_rounds ? Math.max(2, user_settings.debate_rounds - 1) : 2;
        }

        // OPTIMIZED: Resource-aware parameter adjustment
        const baseTemp = config.temperature ?? 0.7;
        const basePersonas = config.max_personas ?? 5;
        const baseRounds = config.debate_rounds ?? 3;
        
        if (fact_check_available) {
            logManager.info('Fact-check available: intelligent boost applied');
            
            // Smarter boosting based on citation count
            const citationFactor = Math.min(1.5, 1 + (citation_count * 0.05));
            
            config.temperature = Math.min(0.95, baseTemp * 1.1);
            config.max_personas = Math.min(10, Math.ceil(basePersonas * citationFactor));
            config.debate_rounds = Math.min(20, Math.ceil(baseRounds * Math.min(1.4, citationFactor)));
            
            logManager.success('Config adjusted for fact-checked context', {
                citation_factor: citationFactor.toFixed(2),
                personas: `${basePersonas} → ${config.max_personas}`,
                rounds: `${baseRounds} → ${config.debate_rounds}`
            });
        } else if (complexity_score > 0.5) {
            // Balanced penalty for complex queries without fact-checking
            logManager.warning('Complex query WITHOUT fact-check: conservative approach');
            
            const penaltyFactor = 0.85 - (complexity_score - 0.5) * 0.2; // More penalty for higher complexity
            
            config.temperature = Math.max(0.3, baseTemp * 0.9);
            config.max_personas = Math.max(3, Math.floor(basePersonas * penaltyFactor));
            config.debate_rounds = Math.max(2, Math.floor(baseRounds * penaltyFactor));
            
            logManager.info('Conservative penalty applied', {
                penalty_factor: penaltyFactor.toFixed(2),
                personas: `${basePersonas} → ${config.max_personas}`,
                rounds: `${baseRounds} → ${config.debate_rounds}`
            });
        } else {
            // Low complexity without fact-check: minimal resources
            logManager.info('Low complexity: lightweight processing');
            config.max_personas = Math.max(2, Math.floor(basePersonas * 0.7));
            config.debate_rounds = Math.max(1, Math.floor(baseRounds * 0.7));
        }

        // 🔥 NEW: Conversational tone boost
        if (needs_conversational_tone) {
            config.temperature = Math.min(0.85, (config.temperature || 0.7) + 0.15);
            config.conversational_mode = true; // Flag for downstream consumers
        }

        logManager.success('D2STIM modulation complete', {
            final_d2_activation: d2_activation.toFixed(3),
            fact_check_multiplier: fact_check_multiplier.toFixed(2),
            final_config: config
        });

        return Response.json({
            success: true,
            config: config,
            d2_activation: parseFloat(d2_activation.toFixed(3)),
            rationale: {
                base_complexity: complexity_score,
                archetype_influence: archetype,
                hemisphere_bias: dominant_hemisphere,
                fact_check_available,
                citation_count,
                fact_check_boost_applied: fact_check_available,
                penalty_for_no_fact_check: !fact_check_available && complexity_score > 0.5,
                conversational_tone_applied: needs_conversational_tone,
                attention_level: parseFloat(attention_level.toFixed(3)),
                cognitive_state,
                adjustments_made: {
                    temperature: config.temperature,
                    debate_rounds: config.debate_rounds,
                    max_personas: config.max_personas,
                }
            },
            logs: logManager.getLogs()
        });

    } catch (error) {
        console.error('[d2stimModulator] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});