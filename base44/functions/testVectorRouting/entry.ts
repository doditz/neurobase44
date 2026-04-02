import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TEST VECTOR ROUTING - Phase 2 Validation
 * Tests embedding generation + vector-based semantic routing
 */

Deno.serve(async (req) => {
    const testLog = [];
    const log = (msg, data) => {
        testLog.push({ timestamp: new Date().toISOString(), msg, data });
        console.log(`[TEST_PHASE2] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        log('=== PHASE 2: VECTOR ROUTING TEST START ===');

        const testQueries = [
            { text: 'What is the capital of France?', expected_tier: 'L1_literal' },
            { text: 'Compare the economic systems of capitalism and socialism', expected_tier: 'L2_analytical' },
            { text: 'Imagine a world where humans can fly', expected_tier: 'R2_creative' },
            { text: 'How can we ethically integrate AI into healthcare?', expected_tier: 'R3_L3_synthesis' }
        ];

        const results = [];
        let passed = 0;
        let failed = 0;

        for (const query of testQueries) {
            log(`Testing: "${query.text.substring(0, 50)}..."`);

            try {
                // TEST 1: Generate Embedding
                const { data: embData } = await base44.functions.invoke('generateEmbedding', {
                    text: query.text,
                    dimension: 384,
                    normalize: true
                });

                if (!embData || !embData.success) {
                    throw new Error('Embedding generation failed');
                }

                log('✓ Embedding generated', { 
                    dim: embData.embedding.length,
                    sample: embData.embedding.slice(0, 3).map(v => v.toFixed(3))
                });

                // TEST 2: Vector Similarity Routing
                const { data: routeData } = await base44.functions.invoke('vectorSimilarityRouter', {
                    user_message: query.text,
                    user_input_embedding: embData.embedding
                });

                if (!routeData || !routeData.success) {
                    throw new Error('Vector routing failed');
                }

                const detected = routeData.routing_result.semantic_tier;
                const confidence = routeData.routing_result.routing_confidence;
                const method = routeData.routing_result.method;

                log('✓ Routing complete', {
                    detected,
                    expected: query.expected_tier,
                    confidence: confidence.toFixed(3),
                    method
                });

                // Validate result
                const isCorrect = detected === query.expected_tier;
                if (isCorrect) {
                    passed++;
                    log('✅ TEST PASSED');
                } else {
                    failed++;
                    log('❌ TEST FAILED - Tier mismatch');
                }

                results.push({
                    query: query.text,
                    expected: query.expected_tier,
                    detected,
                    confidence,
                    method,
                    passed: isCorrect
                });

            } catch (error) {
                failed++;
                log('❌ TEST ERROR', error.message);
                results.push({
                    query: query.text,
                    error: error.message,
                    passed: false
                });
            }
        }

        const successRate = (passed / testQueries.length * 100).toFixed(1);

        log('=== PHASE 2 TEST COMPLETE ===', {
            passed,
            failed,
            total: testQueries.length,
            success_rate: `${successRate}%`
        });

        return Response.json({
            success: true,
            phase: 'PHASE 2: Vector Embeddings',
            test_results: {
                passed,
                failed,
                total: testQueries.length,
                success_rate: successRate
            },
            detailed_results: results,
            logs: testLog,
            recommendation: passed === testQueries.length
                ? '✅ Phase 2 operational - Vector routing working correctly'
                : `⚠️ ${failed} tests failed - Review routing logic`
        });

    } catch (error) {
        log('FATAL ERROR', error.message);
        return Response.json({
            success: false,
            error: error.message,
            logs: testLog
        }, { status: 500 });
    }
});