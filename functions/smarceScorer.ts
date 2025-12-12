import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * SMARCE SCORER - ASSESS Module v2.0 OPTIMIZED
 * 
 * IMPROVEMENTS:
 * - Enhanced complexity scoring with multi-factor analysis
 * - Better archetype detection with weighted scoring
 * - Performance metrics tracking
 * - More nuanced hemisphere detection
 */

Deno.serve(async (req) => {
    const startTime = Date.now();
    
    try {
        const base44 = createClientFromRequest(req);
        await base44.auth.me();

        const { user_message } = await req.json();

        if (!user_message) {
            return Response.json({ error: 'user_message is required' }, { status: 400 });
        }

        const promptLower = user_message.toLowerCase();
        const wordCount = user_message.split(/\s+/).length;
        const hasQuestions = /\?/.test(user_message);
        const hasMultipleSentences = (user_message.match(/[.!?]+/g) || []).length > 1;

        // 1. ENHANCED Archetype Detection (weighted scoring)
        const archetypeScores = {
            creative: (
                (/creat|invent|imagin|innov|design|artis|original|unique|novel/i.test(promptLower) ? 2 : 0) +
                (/story|poem|music|visual|aesthetic/i.test(promptLower) ? 1 : 0)
            ),
            ethical: (
                (/ethic|moral|right|wrong|fair|justice|should|ought/i.test(promptLower) ? 2 : 0) +
                (/value|principle|dilemma|consider/i.test(promptLower) ? 1 : 0)
            ),
            technical: (
                (/code|algorithm|technical|engineer|system|debug|implement|function/i.test(promptLower) ? 2 : 0) +
                (/\bapi\b|class|method|variable|syntax/i.test(promptLower) ? 1 : 0)
            ),
            analytical: (
                (/analyz|compar|evaluat|assess|reason|deduc|logic/i.test(promptLower) ? 2 : 0) +
                (/data|statistic|evidence|proof|conclude/i.test(promptLower) ? 1 : 0)
            )
        };

        const maxScore = Math.max(...Object.values(archetypeScores));
        const archetype_detected = maxScore > 0 
            ? Object.keys(archetypeScores).find(k => archetypeScores[k] === maxScore)
            : 'balanced';

        // 2. ENHANCED Complexity Score (multi-factor)
        const lengthFactor = Math.min(1.0, wordCount / 200); // More realistic threshold
        const structureFactor = (
            (hasQuestions ? 0.1 : 0) +
            (hasMultipleSentences ? 0.15 : 0) +
            (/however|therefore|because|although|furthermore/i.test(promptLower) ? 0.15 : 0)
        );
        const technicalFactor = (
            (/\b[A-Z]{2,}\b/.test(user_message) ? 0.1 : 0) + // Acronyms
            (/\d+%|\d+\.\d+/.test(user_message) ? 0.1 : 0) // Numbers/stats
        );
        
        const complexity_score = Math.min(1.0, 
            lengthFactor * 0.5 + 
            structureFactor + 
            technicalFactor + 
            (maxScore > 2 ? 0.2 : 0) // Archetype confidence boost
        );

        // 3. NUANCED Hemisphere Detection
        let dominant_hemisphere = 'central';
        const hemisphereScore = {
            left: archetypeScores.analytical + archetypeScores.technical,
            right: archetypeScores.creative,
            central: archetypeScores.ethical
        };
        
        const maxHemi = Math.max(...Object.values(hemisphereScore));
        if (maxHemi > 1) {
            dominant_hemisphere = Object.keys(hemisphereScore).find(k => hemisphereScore[k] === maxHemi);
        }

        // 4. ENHANCED S.M.R.C.E. Breakdown
        const smrce_breakdown = {
            sensory: Math.min(1.0, 0.6 + 
                (promptLower.match(/feel|sense|perceiv|experienc|observ/g)?.length * 0.15 || 0)),
            memory: Math.min(1.0, 0.5 + 
                (promptLower.match(/remember|recall|past|history|previous/g)?.length * 0.15 || 0)),
            reasoning: Math.min(1.0, 0.7 + (complexity_score * 0.3)),
            coherence: Math.min(1.0, 0.7 + 
                (hasMultipleSentences ? 0.1 : 0) + 
                (wordCount > 20 ? 0.1 : -0.2)),
            ethics: Math.min(1.0, 0.5 + (archetypeScores.ethical * 0.15))
        };

        const processingTime = Date.now() - startTime;

        // INTEGRATION: Invoke D³STIB for critical concept detection
        let d3stib_result = null;
        try {
            const d3stibResponse = await base44.functions.invoke('d3stibAnalyzer', {
                text: user_message,
                jerk_threshold: 0.4
            });
            
            if (d3stibResponse.data && d3stibResponse.data.success) {
                d3stib_result = d3stibResponse.data;
            }
        } catch (d3stibError) {
            console.warn('[smarceScorer] D³STIB analysis failed, continuing without it:', d3stibError.message);
        }

        return Response.json({
            success: true,
            archetype_detected,
            complexity_score: parseFloat(complexity_score.toFixed(3)),
            dominant_hemisphere,
            smrce_breakdown,
            d3stib_analysis: d3stib_result,
            critical_concepts: d3stib_result?.critical_concepts || [],
            metadata: {
                processing_time_ms: processingTime,
                word_count: wordCount,
                archetype_confidence: parseFloat((maxScore / 4).toFixed(2)),
                enhanced_scoring: true,
                d3stib_enabled: d3stib_result !== null
            }
        });

    } catch (error) {
        console.error('[smarceScorer] Error:', error);
        return Response.json({
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});