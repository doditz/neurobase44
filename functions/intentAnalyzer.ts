import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * INTENT ANALYZER
 * Analyse l'intention de l'utilisateur pour récupération contextuelle de mémoire
 */

Deno.serve(async (req) => {
    const logs = [];
    
    const logManager = {
        _addLog: (level, message, data = {}) => {
            logs.push({ timestamp: Date.now(), level, message, data });
            console.log(`[IntentAnalyzer][${level.toUpperCase()}] ${message}`, data);
        },
        info: (msg, data) => logManager._addLog('info', msg, data),
        success: (msg, data) => logManager._addLog('success', msg, data),
        error: (msg, data) => logManager._addLog('error', msg, data)
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { user_message = '' } = await req.json();

        if (!user_message.trim()) {
            return Response.json({ 
                success: false, 
                error: 'user_message is required' 
            }, { status: 400 });
        }

        logManager.info('Analyzing user intent', { message_length: user_message.length });

        // ÉTAPE 1: Détection d'intention principale
        const intentDetectionPrompt = `Analysez cette requête utilisateur et identifiez son intention principale.

**Requête:** "${user_message}"

**Catégories d'intention possibles:**
1. INFORMATION_SEEKING (cherche des informations/faits)
2. PROBLEM_SOLVING (cherche une solution à un problème)
3. CREATIVE_EXPLORATION (exploration créative, brainstorming)
4. TECHNICAL_ASSISTANCE (aide technique/code)
5. DECISION_MAKING (aide à prendre une décision)
6. LEARNING (apprendre un concept/skill)
7. DISCUSSION (discussion philosophique/éthique)
8. CONTINUATION (continue une conversation précédente)

Retournez:
- primary_intent: catégorie principale
- secondary_intents: array de catégories secondaires
- confidence_score: 0-1
- key_topics: array de sujets clés (max 5)
- temporal_context: "past" (référence historique), "present" (actuel), "future" (planification)
- requires_memory: boolean (si contexte passé nécessaire)
- domain_hints: array de domaines (tech, ethics, creative, business, etc.)`;

        const intentResult = await base44.integrations.Core.InvokeLLM({
            prompt: intentDetectionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    primary_intent: { type: "string" },
                    secondary_intents: {
                        type: "array",
                        items: { type: "string" }
                    },
                    confidence_score: { type: "number" },
                    key_topics: {
                        type: "array",
                        items: { type: "string" }
                    },
                    temporal_context: { type: "string" },
                    requires_memory: { type: "boolean" },
                    domain_hints: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        const primaryIntent = intentResult.primary_intent || 'INFORMATION_SEEKING';
        const keyTopics = intentResult.key_topics || [];
        const requiresMemory = intentResult.requires_memory || false;
        const domainHints = intentResult.domain_hints || [];

        logManager.success('Intent detected', {
            primary: primaryIntent,
            topics: keyTopics.length,
            requires_memory: requiresMemory
        });

        // ÉTAPE 2: Extraction d'entités et concepts
        const entityExtractionPrompt = `Extrayez les entités et concepts importants de cette requête.

**Requête:** "${user_message}"

Identifiez:
- named_entities: noms propres, marques, lieux, personnes
- technical_terms: termes techniques spécifiques
- abstract_concepts: concepts abstraits (justice, éthique, etc.)
- action_verbs: verbes d'action principaux
- modifiers: qualificatifs importants`;

        const entitiesResult = await base44.integrations.Core.InvokeLLM({
            prompt: entityExtractionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    named_entities: {
                        type: "array",
                        items: { type: "string" }
                    },
                    technical_terms: {
                        type: "array",
                        items: { type: "string" }
                    },
                    abstract_concepts: {
                        type: "array",
                        items: { type: "string" }
                    },
                    action_verbs: {
                        type: "array",
                        items: { type: "string" }
                    },
                    modifiers: {
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        const extractedEntities = {
            named: entitiesResult.named_entities || [],
            technical: entitiesResult.technical_terms || [],
            concepts: entitiesResult.abstract_concepts || [],
            actions: entitiesResult.action_verbs || [],
            modifiers: entitiesResult.modifiers || []
        };

        logManager.success('Entities extracted', {
            total: Object.values(extractedEntities).flat().length
        });

        // ÉTAPE 3: Génération de semantic fingerprint
        const semanticFingerprint = {
            primary_intent: primaryIntent,
            secondary_intents: intentResult.secondary_intents || [],
            key_topics: keyTopics,
            entities: extractedEntities,
            domain_hints: domainHints,
            temporal_context: intentResult.temporal_context || 'present',
            confidence: intentResult.confidence_score || 0.7
        };

        // ÉTAPE 4: Suggestions de personas pertinentes
        const personaSuggestionPrompt = `Basé sur cette intention et ces topics, suggérez les personas NEURONAS les plus pertinentes.

**Intention:** ${primaryIntent}
**Topics:** ${keyTopics.join(', ')}
**Domaines:** ${domainHints.join(', ')}

Suggérez 3-5 personas qui seraient les plus utiles.
Types de personas disponibles: Analyste, Créatif, Éthicien, Technique, Culturel, Stratégique, etc.

Pour chaque persona suggérée:
- persona_type: type de persona
- relevance_score: 0-1
- reasoning: pourquoi cette persona`;

        const personaSuggestions = await base44.integrations.Core.InvokeLLM({
            prompt: personaSuggestionPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    suggested_personas: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                persona_type: { type: "string" },
                                relevance_score: { type: "number" },
                                reasoning: { type: "string" }
                            }
                        }
                    }
                }
            }
        });

        const suggestedPersonas = personaSuggestions.suggested_personas || [];

        logManager.success('Analysis complete', {
            intent: primaryIntent,
            personas_suggested: suggestedPersonas.length
        });

        return Response.json({
            success: true,
            intent_analysis: {
                primary_intent: primaryIntent,
                secondary_intents: intentResult.secondary_intents || [],
                confidence_score: intentResult.confidence_score || 0.7,
                key_topics: keyTopics,
                requires_memory: requiresMemory,
                temporal_context: intentResult.temporal_context || 'present',
                domain_hints: domainHints,
                extracted_entities: extractedEntities,
                semantic_fingerprint: semanticFingerprint,
                suggested_personas: suggestedPersonas
            },
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