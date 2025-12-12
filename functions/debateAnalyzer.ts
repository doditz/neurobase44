import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * DEBATE ANALYZER
 * Analyse post-débat des interactions, arguments, fallacies logiques et consensus
 */

Deno.serve(async (req) => {
    const logs = [];
    
    const logManager = {
        _addLog: (level, message, data = {}) => {
            const entry = { timestamp: Date.now(), level, message, data };
            logs.push(entry);
            console.log(`[DebateAnalyzer][${level.toUpperCase()}] ${message}`, data);
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
            debate_history = [],
            final_synthesis = '',
            conversation_id = '',
            personas_used = [],
            debate_rounds = 0
        } = await req.json();

        if (!debate_history || debate_history.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'No debate history provided' 
            }, { status: 400 });
        }

        logManager.info('Starting debate analysis', {
            rounds: debate_rounds,
            personas: personas_used.length,
            history_entries: debate_history.length
        });

        // ÉTAPE 1: Extraire les arguments clés avec scoring
        logManager.info('Extracting key arguments');
        
        const argumentExtractionPrompt = `Analysez ce débat multi-personas et extrayez les arguments clés.

**Historique du débat:**
${debate_history.map(h => `[${h.persona} - Round ${h.round}]\n${h.response}`).join('\n\n---\n\n')}

**Instructions:**
1. Identifiez les 5-10 arguments les plus importants
2. Pour chaque argument, donnez:
   - La persona qui l'a présenté
   - L'argument lui-même (concis)
   - Un score de force (0-1)
   - Les preuves/raisonnement supportant l'argument

Retournez un JSON structuré.`;

        const keyArgumentsResult = await base44.integrations.Core.InvokeLLM({
            prompt: argumentExtractionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    arguments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                persona: { type: "string" },
                                argument: { type: "string" },
                                strength_score: { type: "number" },
                                supporting_evidence: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const keyArguments = keyArgumentsResult?.arguments || [];
        logManager.success(`Extracted ${keyArguments.length} key arguments`);

        // ÉTAPE 2: Détecter les fallacies logiques
        logManager.info('Detecting logical fallacies');
        
        const fallacyDetectionPrompt = `Analysez ce débat pour détecter des erreurs logiques (logical fallacies).

**Historique du débat:**
${debate_history.slice(0, 10).map(h => `[${h.persona}]\n${h.response.substring(0, 500)}`).join('\n\n---\n\n')}

**Types de fallacies à détecter:**
- Ad hominem (attaques personnelles)
- Straw man (déformer argument adverse)
- False dichotomy (faux dilemme)
- Hasty generalization (généralisation hâtive)
- Circular reasoning (raisonnement circulaire)
- Appeal to authority (appel à l'autorité)
- Slippery slope (pente glissante)
- Red herring (diversion)
- Appeal to emotion (appel à l'émotion)

Pour chaque fallacy détectée, donnez:
- Type exact
- Persona responsable
- Extrait textuel
- Explication
- Sévérité (minor/moderate/major)

Si aucune fallacy: retournez array vide.`;

        const fallaciesResult = await base44.integrations.Core.InvokeLLM({
            prompt: fallacyDetectionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    fallacies: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                fallacy_type: { type: "string" },
                                persona: { type: "string" },
                                excerpt: { type: "string" },
                                explanation: { type: "string" },
                                severity: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const fallaciesDetected = fallaciesResult?.fallacies || [];
        logManager.success(`Detected ${fallaciesDetected.length} logical fallacies`);

        // ÉTAPE 3: Identifier affirmations non supportées
        logManager.info('Identifying unsupported claims');
        
        const unsupportedClaimsPrompt = `Analysez ce débat pour identifier les affirmations factuelles qui manquent de support ou preuves.

**Historique:**
${debate_history.slice(0, 10).map(h => `[${h.persona}]\n${h.response.substring(0, 500)}`).join('\n\n')}

Identifiez les affirmations factuelles qui:
1. N'ont pas de source citée
2. Sont présentées comme faits mais sont opinions
3. Nécessitent vérification

Pour chaque claim:
- La claim exacte
- Persona qui l'a faite
- Niveau de confiance (no_evidence/weak_evidence/needs_verification)`;

        const unsupportedClaimsResult = await base44.integrations.Core.InvokeLLM({
            prompt: unsupportedClaimsPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    claims: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                claim: { type: "string" },
                                persona: { type: "string" },
                                confidence_level: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const unsupportedClaims = unsupportedClaimsResult?.claims || [];
        logManager.success(`Identified ${unsupportedClaims.length} unsupported claims`);

        // ÉTAPE 4: Analyser consensus et désaccords
        logManager.info('Analyzing consensus and disagreements');
        
        const consensusAnalysisPrompt = `Analysez le débat pour identifier:
1. Points de CONSENSUS (où toutes les personas s'accordent)
2. Points de DÉSACCORD (divergences persistantes)

**Débat:**
${debate_history.map(h => `[${h.persona}] ${h.response.substring(0, 300)}`).join('\n')}

**Synthèse finale:**
${final_synthesis}

Retournez:
- consensus_points: array de strings (points d'accord)
- disagreement_points: array d'objets avec {topic, positions, resolution_achieved}`;

        const consensusResult = await base44.integrations.Core.InvokeLLM({
            prompt: consensusAnalysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    consensus_points: {
                        type: "array",
                        items: { type: "string" }
                    },
                    disagreement_points: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                topic: { type: "string" },
                                positions: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            persona: { type: "string" },
                                            position: { type: "string" }
                                        }
                                    }
                                },
                                resolution_achieved: { type: "boolean" }
                            }
                        }
                    }
                }
            }
        });

        const consensusPoints = consensusResult?.consensus_points || [];
        const disagreementPoints = consensusResult?.disagreement_points || [];
        
        logManager.success(`Found ${consensusPoints.length} consensus points, ${disagreementPoints.length} disagreements`);

        // ÉTAPE 5: Calculer scores de qualité
        logManager.info('Calculating debate quality scores');
        
        const debateQualityScore = Math.max(0, Math.min(1, 
            0.8 - (fallaciesDetected.length * 0.1) - (unsupportedClaims.length * 0.05)
        ));

        const argumentDiversityScore = Math.min(1, keyArguments.length / 10);
        
        const reasoningDepthScore = keyArguments.reduce((sum, arg) => 
            sum + (arg.strength_score || 0), 0
        ) / Math.max(1, keyArguments.length);

        // ÉTAPE 6: Analyser contributions des personas
        const personaContributions = personas_used.map(personaName => {
            const personaArgs = keyArguments.filter(arg => arg.persona === personaName);
            const personaFallacies = fallaciesDetected.filter(f => f.persona === personaName);
            
            const contributionQuality = personaArgs.length > 0
                ? personaArgs.reduce((sum, arg) => sum + (arg.strength_score || 0), 0) / personaArgs.length
                : 0.5;
            
            return {
                persona_name: personaName,
                contribution_quality: Math.max(0, contributionQuality - (personaFallacies.length * 0.1)),
                unique_insights: personaArgs.length,
                interaction_quality: contributionQuality
            };
        });

        // ÉTAPE 7: Calculer alignement synthesis
        const synthesisAlignmentScore = consensusPoints.length > 0 ? 0.8 : 0.6;

        // ÉTAPE 8: Générer résumé global et recommandations
        logManager.info('Generating overall summary and recommendations');
        
        const summaryPrompt = `Générez un résumé concis de cette analyse de débat et des recommandations.

**Métriques:**
- ${keyArguments.length} arguments clés
- ${fallaciesDetected.length} fallacies logiques
- ${unsupportedClaims.length} affirmations non supportées
- ${consensusPoints.length} points de consensus
- ${disagreementPoints.length} désaccords
- Qualité: ${(debateQualityScore * 100).toFixed(0)}%

**Personas:** ${personas_used.join(', ')}

Donnez:
1. Un résumé global (2-3 phrases)
2. 3-5 recommandations concrètes pour améliorer futurs débats`;

        const summaryResult = await base44.integrations.Core.InvokeLLM({
            prompt: summaryPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    recommendations: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        const overallSummary = summaryResult?.summary || 'Analysis completed';
        const recommendations = summaryResult?.recommendations || [];

        // ÉTAPE 9: Sauvegarder l'analyse
        const analysisData = {
            conversation_id,
            analysis_timestamp: new Date().toISOString(),
            personas_participated: personas_used,
            total_rounds: debate_rounds,
            key_arguments: keyArguments,
            logical_fallacies_detected: fallaciesDetected,
            unsupported_claims: unsupportedClaims,
            consensus_points: consensusPoints,
            disagreement_points: disagreementPoints,
            debate_quality_score: debateQualityScore,
            argument_diversity_score: argumentDiversityScore,
            reasoning_depth_score: reasoningDepthScore,
            persona_contributions: personaContributions,
            synthesis_alignment_score: synthesisAlignmentScore,
            overall_summary: overallSummary,
            recommendations
        };

        try {
            await base44.entities.DebateAnalysis.create(analysisData);
            logManager.success('Debate analysis saved to database');
        } catch (dbError) {
            logManager.warning(`Failed to save to DB: ${dbError.message}`);
        }

        logManager.success('Debate analysis completed');

        return Response.json({
            success: true,
            analysis: analysisData,
            logs
        });

    } catch (error) {
        logManager.error(`Fatal error: ${error.message}`, { stack: error.stack });
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});