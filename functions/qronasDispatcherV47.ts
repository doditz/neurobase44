import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * QRONAS CENTRAL GENIUS DISPATCHER v4.7
 * Phase 3: Enhanced routing with D³STIB Jerk Filter integration
 * 
 * Orchestrates:
 * 1. Semantic Jerk Filtering (D³STIB)
 * 2. Vector-based Semantic Routing
 * 3. SMAS Dynamics-aware Persona Selection
 * 4. Adaptive Pipeline Configuration
 */

Deno.serve(async (req) => {
    const log = [];
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[QRONAS_v47] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            user_message,
            conversation_history = [],
            settings = {}
        } = await req.json();

        if (!user_message) {
            return Response.json({ 
                error: 'user_message required',
                success: false 
            }, { status: 400 });
        }

        addLog('=== QRONAS DISPATCHER v4.7 START ===');
        addLog('=== NEURONAS COGNITIVE PIPELINE ACTIVATION ===');
        addLog('Input', { msg_length: user_message.length, history_count: conversation_history.length });

        const startTime = Date.now();

        // ═══════════════════════════════════════════════════════
        // PHASE 0: GROUNDING VALIDATION (Truth Before Noise)
        // ═══════════════════════════════════════════════════════
        addLog('PHASE 0: Grounding Validation...');
        const groundingResult = await base44.functions.invoke('groundingValidator', {
            user_message,
            enable_web_search: settings.enable_web_search !== false,
            confidence_threshold: 0.7
        });

        if (!groundingResult.data || !groundingResult.data.success) {
            addLog('⚠️ Grounding validation failed or unavailable');
        } else if (groundingResult.data.verification_status === 'FAILED') {
            addLog('❌ GROUNDING FAILURE - Unverified factual claims');
            return Response.json({
                success: false,
                error: 'Factual premises could not be verified',
                grounding_report: groundingResult.data,
                message: 'Je ne peux pas répondre car les prémisses factuelles ne sont pas vérifiées. Veuillez reformuler avec des informations vérifiables.',
                logs: log
            });
        }
        addLog('✓ Grounding validated or not applicable', { 
            status: groundingResult.data?.verification_status 
        });

        // ═══════════════════════════════════════════════════════
        // PHASE 1: D²STIB SEMANTIC PROCESSING (Filter Noise)
        // ═══════════════════════════════════════════════════════
        addLog('PHASE 1: D²STIB Semantic Processing...');

        const dstibResult = await base44.functions.invoke('dstibSemanticProcessor', {
            user_message,
            sensitivity_1st: 0.03,
            sensitivity_2nd: 0.12,
            sensitivity_3rd: 0.10,
            use_hf_embeddings: settings.use_hf_embeddings || false
        });

        const filteredMessage = dstibResult.data?.filtered_message || user_message;
        const keyTokens = dstibResult.data?.key_tokens || [];
        const computationalSavings = dstibResult.data?.metrics?.computational_savings || 0;

        addLog('✓ D²STIB complete', {
            original_length: user_message.length,
            filtered_length: filteredMessage.length,
            key_tokens: keyTokens.length,
            savings: computationalSavings.toFixed(1) + '%'
        });

        // STEP 1.5: Legacy Jerk Filter (kept for backwards compatibility)
        addLog('Applying legacy Semantic Jerk Filter...');
        
        // Step 1.5: Perform sentiment analysis if enabled
        let sentimentAnalysis = null;
        if (settings.enable_hf_sentiment) {
            addLog('Performing Hugging Face sentiment analysis...');
            try {
                const sentModel = settings.hf_sentiment_model || 'distilbert/distilbert-base-uncased-finetuned-sst-2-english';
                const { data: hfSentimentData } = await base44.functions.invoke('huggingFaceSentiment', { 
                    text: user_message,
                    model: sentModel
                });
                if (hfSentimentData && hfSentimentData.success) {
                    sentimentAnalysis = hfSentimentData.sentiment;
                    addLog('✓ Hugging Face sentiment analysis complete', { sentiment: sentimentAnalysis });
                }
            } catch (hfSentimentError) {
                addLog('⚠️ Hugging Face sentiment analysis failed', hfSentimentError.message);
            }
        }

        const jerkResult = await base44.functions.invoke('semanticJerkFilter', {
            user_message,
            conversation_history,
            sensitivity: settings.jerk_sensitivity || 0.7,
            window_size: 3
        });

        if (!jerkResult.data || !jerkResult.data.success) {
            addLog('⚠️ Jerk filter failed, proceeding with original message');
        }

        const jerkData = jerkResult.data || {};
        const filteredMessage = jerkData.filtered_message || user_message;
        const routingAdjustment = jerkData.routing_adjustment || {};

        addLog('✓ Jerk filter complete', {
            jerk_detected: jerkData.jerk_detected,
            jerk_type: jerkData.jerk_type,
            action: jerkData.filtering_action
        });

        // ═══════════════════════════════════════════════════════
        // PHASE 2: SEMANTIC ROUTING (Pathway Selection)
        // ═══════════════════════════════════════════════════════
        addLog('PHASE 2: Vector Semantic Routing...');
        const routeResult = await base44.functions.invoke('vectorSimilarityRouter', {
            user_message: filteredMessage,
            fallback_to_keywords: true,
            use_hf_embeddings: settings.use_hf_embeddings || false
        });

        if (!routeResult.data || !routeResult.data.success) {
            throw new Error('Vector routing failed');
        }

        const routing = routeResult.data.routing_result;
        
        addLog('✓ Semantic routing complete', {
            tier: routing.semantic_tier,
            layer: routing.routing_layer,
            confidence: routing.routing_confidence?.toFixed(3)
        });

        // STEP 3: Merge routing adjustments (Jerk filter overrides if needed)
        const finalRouting = {
            semantic_tier: routing.semantic_tier,
            routing_layer: routingAdjustment.routing_layer || routing.routing_layer,
            target_omega: routing.target_omega,
            d2_profile: routing.d2_profile,
            confidence: routing.routing_confidence,
            jerk_adjusted: jerkData.jerk_detected || false
        };

        // STEP 4: Calculate complexity & determine if SMAS needed
        addLog('STEP 3: Complexity analysis...');
        const complexityFactors = {
            semantic_tier: routing.semantic_tier === 'R3_L3_synthesis' ? 0.9 : 
                           routing.semantic_tier === 'L2_analytical' ? 0.7 :
                           routing.semantic_tier === 'R2_creative' ? 0.6 : 0.4,
            jerk_magnitude: jerkData.jerk_magnitude || 0,
            routing_layer: routing.routing_layer === 'Deep' ? 0.8 :
                           routing.routing_layer === 'Moderate' ? 0.5 : 0.3,
            message_length: Math.min(filteredMessage.length / 500, 1.0)
        };

        const complexity_score = (
            complexityFactors.semantic_tier * 0.4 +
            complexityFactors.jerk_magnitude * 0.2 +
            complexityFactors.routing_layer * 0.3 +
            complexityFactors.message_length * 0.1
        );

        addLog('✓ Complexity calculated', { 
            score: complexity_score.toFixed(3),
            factors: complexityFactors
        });

        // STEP 5: Determine pipeline configuration
        const COMPLEXITY_GATE = 0.3;
        const smasRequired = complexity_score >= COMPLEXITY_GATE || 
                            jerkData.jerk_detected ||
                            routing.routing_layer === 'Deep';

        const pipelineConfig = {
            use_smas: smasRequired,
            max_personas: smasRequired ? Math.ceil(3 + complexity_score * 3) : 1,
            debate_rounds: routingAdjustment.debate_rounds || 
                          (routing.routing_layer === 'Deep' ? 4 :
                           routing.routing_layer === 'Moderate' ? 3 : 2),
            temperature: routing.d2_profile === 'D2Pin' ? 0.8 :
                        routing.d2_profile === 'D2Stim' ? 0.5 : 0.7,
            enable_citations: routing.semantic_tier.includes('L') || complexity_score > 0.6,
            enable_bronas_strict: routingAdjustment.enable_bronas_strict || false
        };

        addLog('✓ Pipeline configured', pipelineConfig);

        const totalTime = Date.now() - startTime;

        // ═══════════════════════════════════════════════════════
        // PHASE 6: PREPARE NEURONAS CONTEXT
        // ═══════════════════════════════════════════════════════
        const neuronasContext = {
            dstib_filtering: {
                original_message: user_message,
                filtered_message: filteredMessage,
                key_tokens: keyTokens,
                computational_savings: computationalSavings
            },
            grounding: {
                status: groundingResult.data?.verification_status || 'NOT_CHECKED',
                verified_claims: groundingResult.data?.verification_results || []
            },
            routing: finalRouting,
            complexity: {
                score: complexity_score,
                factors: complexityFactors
            },
            pipeline_config: pipelineConfig,
            sentiment: sentimentAnalysis,
            requires_smas_debate: pipelineConfig.use_smas,
            requires_bronas_validation: true
        };

        addLog('=== QRONAS DISPATCHER COMPLETE ===', { duration_ms: totalTime });

        return Response.json({
            success: true,
            dispatcher_version: '4.7',
            neuronas_context: neuronasContext,
            filtered_message: filteredMessage,
            routing: finalRouting,
            complexity_score,
            complexity_factors: complexityFactors,
            pipeline_config: pipelineConfig,
            jerk_analysis: {
                detected: jerkData.jerk_detected,
                type: jerkData.jerk_type,
                magnitude: jerkData.jerk_magnitude,
                action_taken: jerkData.filtering_action
            },
            processing_time_ms: totalTime,
            logs: log,
            sentiment_analysis: sentimentAnalysis
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