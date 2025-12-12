import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Estimate Tokens and Cost - Hybridation Intelligente Core
 * Provides pre-execution cost estimation for intelligent decision-making
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            prompt_text, 
            expected_response_length = 'medium',
            mode = 'balanced',
            personas_count = 5,
            debate_rounds = 3,
            include_context = true,
            context_size = 0
        } = await req.json();

        if (!prompt_text) {
            return Response.json({ error: 'prompt_text required' }, { status: 400 });
        }

        console.log('[TokenEstimator] ========== START ==========');
        console.log(`[TokenEstimator] Mode: ${mode}, Personas: ${personas_count}, Rounds: ${debate_rounds}`);

        // ========================================================================
        // STEP 1: ESTIMATE INPUT TOKENS
        // ========================================================================
        // Simple estimation: ~4 characters per token (Claude/GPT standard)
        const estimateTokens = (text) => Math.ceil(text.length / 4);
        
        const promptTokens = estimateTokens(prompt_text);
        console.log(`[TokenEstimator] User prompt: ${promptTokens} tokens`);

        // System prompt tokens (SMAS/QRONAS instructions)
        const systemPromptTokens = 800; // Average system prompt size
        
        // Context tokens (history, memories, etc.)
        const contextTokens = include_context ? context_size || 2000 : 0;
        
        // Persona instructions (each persona adds ~500 tokens)
        const personaTokens = personas_count * 500;
        
        const totalInputTokens = promptTokens + systemPromptTokens + contextTokens + personaTokens;
        console.log(`[TokenEstimator] Total input tokens: ${totalInputTokens}`);

        // ========================================================================
        // STEP 2: ESTIMATE OUTPUT TOKENS
        // ========================================================================
        const responseLengthMultipliers = {
            'short': 150,
            'medium': 500,
            'long': 1500,
            'very_long': 3000
        };
        
        const baseResponseTokens = responseLengthMultipliers[expected_response_length] || 500;
        
        // Debate rounds multiply output (each persona responds each round)
        const debateOutputTokens = baseResponseTokens * personas_count * debate_rounds;
        
        // Final synthesis
        const synthesisTokens = baseResponseTokens * 1.5;
        
        const totalOutputTokens = debateOutputTokens + synthesisTokens;
        console.log(`[TokenEstimator] Total output tokens: ${totalOutputTokens}`);

        // ========================================================================
        // STEP 3: FETCH PRICING DATA
        // ========================================================================
        const costConfigs = await base44.asServiceRole.entities.APICostConfig.filter({
            is_active: true
        });

        // Default costs if no config found (October 2025 estimated averages)
        let inputCostPer1k = 0.015;  // ~$0.015/1k input tokens
        let outputCostPer1k = 0.03;  // ~$0.03/1k output tokens

        // Use actual config if available
        const defaultProvider = costConfigs.find(c => 
            c.provider === 'openai' && c.model_name.includes('gpt-4o')
        );
        
        if (defaultProvider) {
            inputCostPer1k = defaultProvider.cost_per_1k_input_tokens || inputCostPer1k;
            outputCostPer1k = defaultProvider.cost_per_1k_output_tokens || outputCostPer1k;
            console.log(`[TokenEstimator] Using pricing from ${defaultProvider.model_name}`);
        }

        // ========================================================================
        // STEP 4: CALCULATE COSTS
        // ========================================================================
        const inputCost = (totalInputTokens / 1000) * inputCostPer1k;
        const outputCost = (totalOutputTokens / 1000) * outputCostPer1k;
        const totalCost = inputCost + outputCost;

        console.log(`[TokenEstimator] Input cost: $${inputCost.toFixed(4)}`);
        console.log(`[TokenEstimator] Output cost: $${outputCost.toFixed(4)}`);
        console.log(`[TokenEstimator] Total cost: $${totalCost.toFixed(4)}`);

        // ========================================================================
        // STEP 5: ESTIMATE PROCESSING TIME
        // ========================================================================
        // Base time: ~50ms per 1k tokens output + debate overhead
        const baseProcessingTime = (totalOutputTokens / 1000) * 50;
        const debateOverhead = debate_rounds * personas_count * 200; // ~200ms per persona per round
        const totalProcessingTime = baseProcessingTime + debateOverhead;

        console.log(`[TokenEstimator] Estimated processing time: ${totalProcessingTime}ms`);

        // ========================================================================
        // STEP 6: CHECK USER BUDGET
        // ========================================================================
        const budgets = await base44.asServiceRole.entities.UserBudget.filter({
            created_by: user.email
        });
        
        const userBudget = budgets[0];
        
        let budgetStatus = 'ok';
        let budgetWarning = null;
        
        if (userBudget) {
            const estimatedTokensUsage = totalInputTokens + totalOutputTokens;
            const remainingDaily = userBudget.daily_token_limit - userBudget.tokens_used_today;
            const remainingMonthly = userBudget.monthly_token_limit - userBudget.tokens_used_month;
            
            if (estimatedTokensUsage > remainingDaily) {
                budgetStatus = 'exceeds_daily';
                budgetWarning = `Cette opération dépasserait votre limite quotidienne de ${userBudget.daily_token_limit.toLocaleString()} tokens.`;
            } else if (estimatedTokensUsage > remainingMonthly) {
                budgetStatus = 'exceeds_monthly';
                budgetWarning = `Cette opération dépasserait votre limite mensuelle de ${userBudget.monthly_token_limit.toLocaleString()} tokens.`;
            } else if (estimatedTokensUsage > remainingDaily * 0.8) {
                budgetStatus = 'warning_daily';
                budgetWarning = `Attention: cette opération consommera ${((estimatedTokensUsage / remainingDaily) * 100).toFixed(0)}% de votre budget quotidien restant.`;
            }
            
            console.log(`[TokenEstimator] Budget status: ${budgetStatus}`);
        }

        // ========================================================================
        // STEP 7: SUGGEST OPTIMIZATIONS
        // ========================================================================
        const optimizations = [];
        
        if (mode === 'premium' && totalCost > 0.10) {
            optimizations.push({
                strategy: 'switch_to_balanced',
                description: 'Passer en mode Balanced réduirait le coût de ~40%',
                estimated_savings: totalCost * 0.4,
                impact: 'Légère réduction de qualité, mais toujours excellent'
            });
        }
        
        if (mode === 'balanced' && totalCost > 0.05) {
            optimizations.push({
                strategy: 'switch_to_eco',
                description: 'Passer en mode Eco réduirait le coût de ~60%',
                estimated_savings: totalCost * 0.6,
                impact: 'Qualité réduite mais réponse rapide et économique'
            });
        }
        
        if (personas_count > 5) {
            optimizations.push({
                strategy: 'reduce_personas',
                description: `Réduire à 5 personas économiserait ~${((personas_count - 5) / personas_count * 100).toFixed(0)}% des tokens`,
                estimated_savings: totalCost * ((personas_count - 5) / personas_count),
                impact: 'Moins de perspectives, mais toujours multi-angle'
            });
        }
        
        if (debate_rounds > 3) {
            optimizations.push({
                strategy: 'reduce_rounds',
                description: `Réduire à 3 rondes économiserait ~${((debate_rounds - 3) / debate_rounds * 100).toFixed(0)}% du temps`,
                estimated_savings: totalCost * ((debate_rounds - 3) / debate_rounds),
                impact: 'Convergence plus rapide, légèrement moins approfondie'
            });
        }

        console.log(`[TokenEstimator] Suggested ${optimizations.length} optimizations`);
        console.log('[TokenEstimator] ========== END ==========');

        return Response.json({
            success: true,
            estimation: {
                input_tokens: totalInputTokens,
                output_tokens: totalOutputTokens,
                total_tokens: totalInputTokens + totalOutputTokens,
                input_cost_usd: parseFloat(inputCost.toFixed(6)),
                output_cost_usd: parseFloat(outputCost.toFixed(6)),
                total_cost_usd: parseFloat(totalCost.toFixed(6)),
                processing_time_ms: Math.round(totalProcessingTime)
            },
            budget_status: {
                status: budgetStatus,
                warning: budgetWarning,
                can_proceed: budgetStatus === 'ok' || budgetStatus === 'warning_daily'
            },
            optimizations,
            breakdown: {
                prompt_tokens: promptTokens,
                system_tokens: systemPromptTokens,
                context_tokens: contextTokens,
                persona_tokens: personaTokens,
                debate_output_tokens: debateOutputTokens,
                synthesis_tokens: synthesisTokens
            },
            pricing_info: {
                input_rate: inputCostPer1k,
                output_rate: outputCostPer1k,
                provider: defaultProvider?.provider || 'default',
                model: defaultProvider?.model_name || 'gpt-4o-estimated'
            }
        });

    } catch (error) {
        console.error('[TokenEstimator] Fatal error:', error);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});