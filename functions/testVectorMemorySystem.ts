import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * TEST VECTOR MEMORY SYSTEM - Robustesse Progressive
 * 
 * Tests complets: indexation → recherche → pathways → decay → pruning
 * Intégré avec neuronasMemoryTierRouter, memoryTierPromotion, adaptivePruner
 */

Deno.serve(async (req) => {
    const log = [];
    const errors = [];
    const warnings = [];
    
    const addLog = (msg, data) => {
        log.push({ ts: new Date().toISOString(), msg, data });
        console.log(`[VectorTest] ${msg}`, data || '');
    };
    
    const addError = (msg, data) => {
        errors.push({ ts: new Date().toISOString(), msg, data });
        console.error(`[VectorTest ERROR] ${msg}`, data || '');
    };
    
    const addWarning = (msg, data) => {
        warnings.push({ ts: new Date().toISOString(), msg, data });
        console.warn(`[VectorTest WARN] ${msg}`, data || '');
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            test_phase = 'all', // 'all', 'indexation', 'search', 'pathways', 'decay', 'integration'
            cleanup_after = false,
            num_test_memories = 20
        } = await req.json();

        addLog('=== TEST VECTOR MEMORY SYSTEM ===', { phase: test_phase, memories: num_test_memories });

        const testResults = {
            phase1_memory_creation: null,
            phase2_vector_indexation: null,
            phase3_pathway_building: null,
            phase4_vector_search: null,
            phase5_hebbian_learning: null,
            phase6_decay_pruning: null,
            phase7_tier_integration: null
        };

        // ========================================
        // PHASE 1: Création de mémoires test
        // ========================================
        if (test_phase === 'all' || test_phase === 'memory_creation') {
            addLog('PHASE 1: Création mémoires test...');
            
            const testMemories = [
                { key: 'physics_gravity', content: 'La gravité est une force fondamentale. F=GMm/r². Applications: satellites, marées, chute libre.', omega_t: 0.9, dopamine_t: 0.85, type: 'technical_capability' },
                { key: 'biology_photosynthesis', content: 'Photosynthèse: 6CO2 + 6H2O → C6H12O6 + 6O2. Chloroplastes captent lumière. Essentiel pour vie.', omega_t: 0.8, dopamine_t: 0.75, type: 'technical_capability' },
                { key: 'math_calculus', content: 'Calcul différentiel: dérivées, limites, continuité. Applications en physique et ingénierie.', omega_t: 0.95, dopamine_t: 0.9, type: 'technical_capability' },
                { key: 'creative_metaphor', content: 'Les métaphores enrichissent langage. "La vie est un voyage" structure pensée abstraite.', omega_t: 0.2, dopamine_t: 0.7, type: 'creative_insight' },
                { key: 'ethical_autonomy', content: 'Autonomie éthique: respecter liberté individuelle. Kant: impératif catégorique. Dignité humaine.', omega_t: 0.5, dopamine_t: 0.95, type: 'ethical_governance' },
                { key: 'physics_thermodynamics', content: 'Thermodynamique: 3 lois. Entropie augmente. Énergie conservée. Applications moteurs, réfrigération.', omega_t: 0.85, dopamine_t: 0.8, type: 'technical_capability' },
                { key: 'creative_storytelling', content: 'Narration: structure héros. Départ, épreuve, retour transformé. Archétypes universels.', omega_t: 0.15, dopamine_t: 0.65, type: 'creative_insight' },
                { key: 'math_algebra', content: 'Algèbre linéaire: matrices, vecteurs, espaces. Transformations géométriques. ML fondations.', omega_t: 0.9, dopamine_t: 0.85, type: 'technical_capability' },
            ];

            const createdIds = [];
            let creationErrors = 0;

            for (const mem of testMemories) {
                try {
                    const { data: routerResult } = await base44.functions.invoke('neuronasMemoryTierRouter', {
                        memory_key: mem.key,
                        memory_content: mem.content,
                        memory_type: mem.type,
                        omega_t: mem.omega_t,
                        dopamine_t: mem.dopamine_t,
                        conversation_id: 'test_vector_system',
                        context: 'Test unitaire système vectoriel'
                    });

                    if (routerResult && routerResult.success) {
                        createdIds.push(routerResult.memory_id);
                        addLog(`✓ Mémoire créée: ${mem.key}`, { 
                            tier: routerResult.tier_assigned,
                            hemisphere: routerResult.hemisphere
                        });
                    } else {
                        addError(`Échec création: ${mem.key}`, routerResult);
                        creationErrors++;
                    }
                } catch (error) {
                    addError(`Exception création: ${mem.key}`, error.message);
                    creationErrors++;
                }
            }

            testResults.phase1_memory_creation = {
                success: creationErrors === 0,
                total: testMemories.length,
                created: createdIds.length,
                errors: creationErrors,
                memory_ids: createdIds
            };

            if (creationErrors > 0) {
                addWarning(`${creationErrors} erreurs création mémoire`);
            }
        }

        // ========================================
        // PHASE 2: Indexation vectorielle
        // ========================================
        if (test_phase === 'all' || test_phase === 'indexation') {
            addLog('PHASE 2: Indexation vectorielle...');

            try {
                const { data: indexResult } = await base44.functions.invoke('buildVectorMemoryIndex', {
                    rebuild: false,
                    batch_size: 10,
                    similarity_threshold: 0.65,
                    max_pathways_per_memory: 4
                });

                testResults.phase2_vector_indexation = {
                    success: indexResult && indexResult.success,
                    indices_created: indexResult?.statistics?.memories_indexed || 0,
                    pathways_created: indexResult?.statistics?.pathways_created || 0,
                    tier_bridges: indexResult?.statistics?.tier_bridges || 0,
                    hemisphere_bridges: indexResult?.statistics?.hemisphere_bridges || 0
                };

                addLog('✓ Indexation terminée', testResults.phase2_vector_indexation);

            } catch (error) {
                addError('Échec indexation', error.message);
                testResults.phase2_vector_indexation = {
                    success: false,
                    error: error.message
                };
            }
        }

        // ========================================
        // PHASE 3: Test recherche vectorielle
        // ========================================
        if (test_phase === 'all' || test_phase === 'search') {
            addLog('PHASE 3: Test recherche vectorielle...');

            const searchQueries = [
                { query: 'Forces physiques et gravitation', expected_hemisphere: 'left' },
                { query: 'Créativité et métaphores narratives', expected_hemisphere: 'right' },
                { query: 'Équations mathématiques et calculs', expected_hemisphere: 'left' }
            ];

            const searchResults = [];

            for (const sq of searchQueries) {
                try {
                    const { data: searchResult } = await base44.functions.invoke('vectorMemorySearch', {
                        query_text: sq.query,
                        top_k: 3,
                        use_pathways: true,
                        pathway_depth: 2
                    });

                    const success = searchResult && searchResult.success && searchResult.results.length > 0;
                    
                    searchResults.push({
                        query: sq.query,
                        success,
                        results_count: searchResult?.results?.length || 0,
                        top_match: searchResult?.results?.[0]?.memory?.memory_key || null,
                        avg_similarity: searchResult?.results?.length > 0
                            ? (searchResult.results.reduce((sum, r) => sum + r.similarity_score, 0) / searchResult.results.length).toFixed(3)
                            : 0
                    });

                    addLog(`✓ Recherche: "${sq.query}"`, {
                        results: searchResult?.results?.length,
                        top: searchResult?.results?.[0]?.memory?.memory_key
                    });

                } catch (error) {
                    addError(`Échec recherche: "${sq.query}"`, error.message);
                    searchResults.push({
                        query: sq.query,
                        success: false,
                        error: error.message
                    });
                }
            }

            testResults.phase4_vector_search = {
                success: searchResults.every(r => r.success),
                queries_tested: searchResults.length,
                successful: searchResults.filter(r => r.success).length,
                details: searchResults
            };
        }

        // ========================================
        // PHASE 4: Test Hebbian Learning
        // ========================================
        if (test_phase === 'all' || test_phase === 'hebbian') {
            addLog('PHASE 4: Test apprentissage Hebbian...');

            try {
                // Recherche répétée pour renforcer pathways
                for (let i = 0; i < 3; i++) {
                    await base44.functions.invoke('vectorMemorySearch', {
                        query_text: 'Force de gravité et physique',
                        top_k: 2,
                        use_pathways: true
                    });
                }

                // Vérifier renforcement
                const pathways = await base44.entities.MemoryPathway.filter({
                    created_by: user.email,
                    activation_count: { "$gte": 1 }
                });

                const avgStrength = pathways.length > 0
                    ? pathways.reduce((sum, p) => sum + (p.pathway_strength || 0), 0) / pathways.length
                    : 0;

                testResults.phase5_hebbian_learning = {
                    success: pathways.length > 0 && avgStrength > 0.5,
                    activated_pathways: pathways.length,
                    avg_strength: parseFloat(avgStrength.toFixed(3)),
                    max_strength: pathways.length > 0 ? Math.max(...pathways.map(p => p.pathway_strength || 0)).toFixed(3) : 0
                };

                addLog('✓ Hebbian learning vérifié', testResults.phase5_hebbian_learning);

            } catch (error) {
                addError('Échec Hebbian test', error.message);
                testResults.phase5_hebbian_learning = {
                    success: false,
                    error: error.message
                };
            }
        }

        // ========================================
        // PHASE 5: Test Decay & Pruning
        // ========================================
        if (test_phase === 'all' || test_phase === 'decay') {
            addLog('PHASE 5: Test decay et pruning...');

            try {
                const { data: decayResult } = await base44.functions.invoke('decayUnusedPathways', {
                    decay_threshold_hours: 0.001, // Test immédiat
                    min_strength_threshold: 0.3,
                    auto_prune: true
                });

                testResults.phase6_decay_pruning = {
                    success: decayResult && decayResult.success,
                    decayed: decayResult?.statistics?.decayed || 0,
                    pruned: decayResult?.statistics?.pruned || 0,
                    remaining: decayResult?.statistics?.remaining || 0
                };

                addLog('✓ Decay/Pruning terminé', testResults.phase6_decay_pruning);

            } catch (error) {
                addError('Échec decay test', error.message);
                testResults.phase6_decay_pruning = {
                    success: false,
                    error: error.message
                };
            }
        }

        // ========================================
        // PHASE 6: Intégration Tier Promotion
        // ========================================
        if (test_phase === 'all' || test_phase === 'integration') {
            addLog('PHASE 6: Test intégration tier promotion...');

            try {
                const { data: promotionResult } = await base44.functions.invoke('memoryTierPromotion', {
                    auto_promote: true,
                    decay_inactive: true,
                    smart_pruning: true,
                    importance_weight: 0.6,
                    recency_weight: 0.4
                });

                testResults.phase7_tier_integration = {
                    success: promotionResult && promotionResult.success,
                    promotions: promotionResult?.promotions || 0,
                    decays: promotionResult?.decays || 0,
                    pruned: promotionResult?.pruned || 0
                };

                addLog('✓ Tier promotion intégré', testResults.phase7_tier_integration);

            } catch (error) {
                addError('Échec tier integration', error.message);
                testResults.phase7_tier_integration = {
                    success: false,
                    error: error.message
                };
            }
        }

        // ========================================
        // CLEANUP (optionnel)
        // ========================================
        if (cleanup_after) {
            addLog('Nettoyage données test...');
            
            const testMemories = await base44.entities.UserMemory.filter({
                conversation_id: 'test_vector_system'
            });

            for (const mem of testMemories) {
                await base44.entities.UserMemory.delete(mem.id);
            }

            const testIndices = await base44.entities.VectorIndex.filter({
                created_by: user.email
            });

            for (const idx of testIndices) {
                if (testMemories.some(m => m.id === idx.memory_id)) {
                    await base44.entities.VectorIndex.delete(idx.id);
                }
            }

            addLog('✓ Nettoyage terminé');
        }

        // ========================================
        // RÉSULTAT FINAL
        // ========================================
        const allPhases = Object.values(testResults).filter(r => r !== null);
        const successfulPhases = allPhases.filter(r => r.success);
        const overallSuccess = successfulPhases.length === allPhases.length;

        addLog('=== TEST TERMINÉ ===', {
            success: overallSuccess,
            phases_tested: allPhases.length,
            phases_passed: successfulPhases.length
        });

        return Response.json({
            success: overallSuccess,
            summary: {
                phases_tested: allPhases.length,
                phases_passed: successfulPhases.length,
                phases_failed: allPhases.length - successfulPhases.length,
                errors: errors.length,
                warnings: warnings.length
            },
            test_results: testResults,
            logs: log,
            errors,
            warnings
        });

    } catch (error) {
        addError('ERREUR CRITIQUE', error.message);
        return Response.json({
            success: false,
            error: error.message,
            stack: error.stack,
            logs: log,
            errors,
            warnings
        }, { status: 500 });
    }
});