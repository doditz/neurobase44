import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
        }
        
        // Parse and validate request
        let requestData;
        try {
            requestData = await req.json();
        } catch (parseError) {
            return Response.json({ 
                error: 'Invalid JSON payload', 
                success: false 
            }, { status: 400 });
        }

        const { prompt, query_type, complexity, cfg = {} } = requestData;
        
        if (!prompt || typeof prompt !== 'string') {
            return Response.json({ 
                error: 'prompt required as string', 
                success: false,
                received: { prompt, type: typeof prompt }
            }, { status: 400 });
        }
        
        // Default config
        const defaultCfg = {
            temp: 0.7,
            max_p: 5,
            hemi: 'balanced',
            rounds: 5,
            d2: 0.65,
            eth: 'medium'
        };
        
        const settings = { ...defaultCfg, ...cfg };
        
        // Keyword analysis
        const promptLower = prompt.toLowerCase();
        const len = prompt.length;
        
        const keywords = {
            ethical: /ethic|moral|right|wrong|harm|fair|justice|ought|should|dignity|unesco/i.test(prompt),
            creative: /creat|invent|imagin|innov|design|artis|compose|music|novel|paint/i.test(prompt),
            analytical: /analyz|calculat|comput|logic|reason|mathematic|proof|theorem|deduc|groupe|sous-groupe/i.test(prompt),
            complex: /complex|multilayer|nuanc|paradox|dilemma|contradic|tension|tradeoff/i.test(prompt),
            technical: /code|algorithm|api|function|debug|optimize|architect|system/i.test(prompt),
            cultural: /cultur|tradition|indigenou|multicultural|perspective|worldview|belief/i.test(prompt),
            mathematical: /mathematic|equation|formula|theorem|proof|algebr|geometr|topolog|group|field|ring/i.test(prompt)
        };
        
        // Dynamic adjustments (Base44 QRONAS logic)
        if (keywords.creative) {
            settings.temp = Math.min(0.95, settings.temp + 0.2);
            settings.hemi = 'right';
            settings.max_p = Math.min(8, settings.max_p + 2);
        }
        
        if (keywords.analytical || keywords.mathematical) {
            settings.temp = Math.max(0.4, settings.temp - 0.2);
            settings.hemi = 'left';
            settings.max_p = Math.min(10, settings.max_p + 2);
        }
        
        if (keywords.complex || len > 500) {
            settings.max_p = Math.min(12, settings.max_p + 3);
            settings.rounds = Math.min(10, settings.rounds + 3);
            settings.d2 = 0.8;
        }
        
        if (keywords.ethical || keywords.cultural) {
            settings.eth = 'high';
            settings.max_p = Math.max(7, settings.max_p + 2);
            settings.rounds = Math.min(8, settings.rounds + 2);
        }
        
        if (keywords.technical) {
            settings.max_p = Math.max(6, settings.max_p + 1);
        }
        
        // Complexity score
        let complexity_score = 0.5;
        if (len > 200) complexity_score += 0.1;
        if (len > 500) complexity_score += 0.15;
        if (keywords.complex) complexity_score += 0.15;
        if (keywords.ethical) complexity_score += 0.1;
        if (keywords.cultural) complexity_score += 0.1;
        if (keywords.mathematical) complexity_score += 0.15;
        complexity_score = Math.min(1.0, complexity_score);
        
        // Tri-hemispheric weights (alpha=left, beta=right, gamma=central)
        let alpha = 0.33, beta = 0.33, gamma = 0.34;
        
        if (settings.hemi === 'left') {
            alpha = 0.6;
            beta = 0.2;
            gamma = 0.2;
        } else if (settings.hemi === 'right') {
            alpha = 0.2;
            beta = 0.6;
            gamma = 0.2;
        } else if (keywords.ethical || keywords.complex) {
            gamma = 0.5;
            alpha = 0.25;
            beta = 0.25;
        }
        
        // Determine archetype
        let archetype = 'balanced_exploration';
        if (keywords.mathematical || keywords.analytical) archetype = 'analytical';
        if (keywords.creative) archetype = 'creative';
        if (keywords.ethical) archetype = 'ethical';
        if (keywords.technical) archetype = 'technical';
        if (keywords.cultural) archetype = 'cultural';
        
        return Response.json({
            success: true,
            dynamic_llm_settings: settings,
            complexity_score: parseFloat(complexity_score.toFixed(3)),
            tri_hemispheric_weights: {
                alpha: parseFloat(alpha.toFixed(3)),
                beta: parseFloat(beta.toFixed(3)),
                gamma: parseFloat(gamma.toFixed(3))
            },
            dominant_hemisphere: settings.hemi,
            archetype_detected: archetype,
            keywords_detected: Object.keys(keywords).filter(k => keywords[k]),
            adjustments_applied: {
                temp_adjusted: settings.temp !== defaultCfg.temp,
                personas_adjusted: settings.max_p !== defaultCfg.max_p,
                hemisphere_adjusted: settings.hemi !== defaultCfg.hemi,
                rounds_adjusted: settings.rounds !== defaultCfg.rounds,
                d2_adjusted: settings.d2 !== defaultCfg.d2
            },
            reasoning: [
                keywords.creative && 'Creative detected → ↑temp, right hemisphere, +personas',
                keywords.analytical && 'Analytical detected → ↓temp, left hemisphere',
                keywords.mathematical && 'Mathematical detected → left hemisphere, +personas',
                keywords.complex && 'Complex detected → ↑personas, ↑rounds, ↑d2',
                keywords.ethical && 'Ethical detected → high constraints, +personas',
                keywords.cultural && 'Cultural detected → high ethics, +diversity',
                len > 500 && 'Long prompt → increased depth'
            ].filter(Boolean),
            tokens_saved_estimate: (defaultCfg.max_p - settings.max_p) * 50 + (defaultCfg.rounds - settings.rounds) * 100
        });

    } catch (error) {
        console.error('QRONAS Simulator error:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});