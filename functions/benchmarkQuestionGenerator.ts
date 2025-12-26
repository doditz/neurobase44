import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * NEURONAS Benchmark Question Generator v2.0
 * 
 * Génère des questions de benchmark sophistiquées via:
 * - Hugging Face API (modèles de génération)
 * - LLM InvokeLLM (fallback et hybridation)
 * - Templates spécialisés par composant NEURONAS
 * 
 * Modes: normal, extreme, component_stress, hybrid
 */

const HF_API_URL = "https://api-inference.huggingface.co/models/";

// Templates de génération par type de composant NEURONAS
const COMPONENT_TEMPLATES = {
    D3STIB: {
        focus: "semantic filtering, tier routing, bandwidth optimization",
        stress_scenarios: [
            "information overload with contradictory sources",
            "multi-language semantic ambiguity",
            "technical jargon mixed with colloquial speech"
        ]
    },
    QRONAS: {
        focus: "quantum-inspired routing, superposition of solutions",
        stress_scenarios: [
            "problems with multiple equally valid solutions",
            "time-critical decisions with incomplete information",
            "paradoxes requiring probabilistic reasoning"
        ]
    },
    BRONAS: {
        focus: "ethical validation, bias detection, safety constraints",
        stress_scenarios: [
            "trolley problem variants with cultural context",
            "conflicting ethical frameworks",
            "edge cases in AI safety guidelines"
        ]
    },
    SMAS: {
        focus: "multi-agent debate, persona synthesis, consensus building",
        stress_scenarios: [
            "topics where experts fundamentally disagree",
            "creative vs analytical balance requirements",
            "time-pressured synthesis needs"
        ]
    },
    GC_HARMONIZER: {
        focus: "hemispheric balance, global coherence, integration",
        stress_scenarios: [
            "tasks requiring both creativity and precision",
            "emotional intelligence combined with logical reasoning",
            "cross-domain knowledge synthesis"
        ]
    }
};

// Domaines et leurs caractéristiques
const DOMAINS = {
    physics: { hemisphere: "Left", complexity_boost: 0.2 },
    philosophy: { hemisphere: "Central", complexity_boost: 0.3 },
    ethics: { hemisphere: "Central", complexity_boost: 0.4 },
    creativity: { hemisphere: "Right", complexity_boost: 0.1 },
    mathematics: { hemisphere: "Left", complexity_boost: 0.3 },
    psychology: { hemisphere: "Right", complexity_boost: 0.2 },
    law: { hemisphere: "Left", complexity_boost: 0.25 },
    ai_safety: { hemisphere: "Central", complexity_boost: 0.5 },
    quantum: { hemisphere: "Left", complexity_boost: 0.4 },
    consciousness: { hemisphere: "Central", complexity_boost: 0.45 }
};

const QUESTION_TYPES = [
    "standard_benchmark", "ethics_benchmark", "creativity_benchmark",
    "neuronas_specific", "cultural_context", "technical_deep", "paradox"
];

const COMPLEXITY_LEVELS = ["simple", "modéré", "complexe", "extrême"];

/**
 * Appel à l'API Hugging Face pour génération de texte
 */
async function callHuggingFace(prompt, model = "mistralai/Mixtral-8x7B-Instruct-v0.1") {
    const HF_TOKEN = Deno.env.get("HF_TOKEN");
    if (!HF_TOKEN) {
        throw new Error("HF_TOKEN not configured");
    }

    const response = await fetch(`${HF_API_URL}${model}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: {
                max_new_tokens: 1500,
                temperature: 0.8,
                top_p: 0.95,
                do_sample: true,
                return_full_text: false
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result[0]?.generated_text || result;
}

/**
 * Génère le prompt pour créer des questions de benchmark
 */
function buildGenerationPrompt(config) {
    const {
        mode = "normal",
        domain = "physics",
        complexity = "complexe",
        count = 5,
        target_component = null,
        hybrid_domains = []
    } = config;

    let basePrompt = `You are an expert benchmark question designer for AI evaluation systems.
Generate ${count} unique, challenging questions for AI benchmarking.

OUTPUT FORMAT (JSON array):
[
  {
    "question_id": "unique-id",
    "question_text": "the full question",
    "question_type": "one of: ${QUESTION_TYPES.join(', ')}",
    "domain": "primary domain",
    "facettes_principales": ["facet1", "facet2"],
    "niveau_complexite": "${complexity}",
    "hemisphere_dominant": "Left|Right|Central",
    "ground_truth": "expected answer or key points",
    "expected_key_points": ["point1", "point2"],
    "why_difficult_for_standard_llm": "explanation"
  }
]

`;

    if (mode === "extreme") {
        basePrompt += `
MODE: EXTREME STRESS TEST
Create questions that are:
- Multi-layered paradoxes combining 3+ disciplines
- Designed to expose AI limitations and biases
- Include self-referential or meta-cognitive elements
- Feature genuine philosophical dilemmas without clear answers
- Test edge cases in reasoning and ethics

Examples of extreme patterns:
- Gödel-style self-reference in legal/ethical contexts
- Quantum mechanics + personal identity + ethics
- Time travel paradoxes with moral implications
- AI alignment edge cases
`;
    } else if (mode === "component_stress" && target_component) {
        const template = COMPONENT_TEMPLATES[target_component];
        basePrompt += `
MODE: COMPONENT STRESS TEST - ${target_component}
Focus: ${template.focus}

Create questions specifically designed to stress-test this component:
${template.stress_scenarios.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Questions should isolate and challenge the ${target_component} capabilities.
`;
    } else if (mode === "hybrid" && hybrid_domains.length >= 2) {
        basePrompt += `
MODE: HYBRID DOMAIN SYNTHESIS
Combine these domains: ${hybrid_domains.join(', ')}

Create questions that REQUIRE expertise in ALL listed domains simultaneously.
The question should be impossible to answer well without integrating knowledge from each domain.
`;
    } else {
        basePrompt += `
MODE: STANDARD BENCHMARK
Domain: ${domain}
Complexity: ${complexity}

Create balanced, well-structured questions that fairly evaluate AI capabilities.
Include a mix of factual, analytical, and reasoning questions.
`;
    }

    basePrompt += `
REQUIREMENTS:
- Each question must be self-contained
- Avoid questions that can be answered with simple retrieval
- Include questions that test reasoning, not just knowledge
- Ensure ground_truth is substantive but not exhaustive

Generate the JSON array now:`;

    return basePrompt;
}

/**
 * Parse et valide les questions générées
 */
function parseGeneratedQuestions(rawOutput, sourceTag) {
    try {
        // Extraire le JSON de la réponse
        const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error("No JSON array found in output");
            return [];
        }

        const questions = JSON.parse(jsonMatch[0]);
        
        // Valider et enrichir chaque question
        return questions.map((q, idx) => ({
            question_id: q.question_id || `${sourceTag}-${Date.now()}-${idx}`,
            source_benchmark: sourceTag,
            question_text: q.question_text,
            question_type: QUESTION_TYPES.includes(q.question_type) ? q.question_type : "standard_benchmark",
            facettes_principales: Array.isArray(q.facettes_principales) ? q.facettes_principales : [],
            niveau_complexite: COMPLEXITY_LEVELS.includes(q.niveau_complexite) ? q.niveau_complexite : "complexe",
            hemisphere_dominant: ["Left", "Right", "Central", "Balanced"].includes(q.hemisphere_dominant) 
                ? q.hemisphere_dominant : "Central",
            ground_truth: q.ground_truth || "",
            expected_key_points: Array.isArray(q.expected_key_points) ? q.expected_key_points : [],
            why_difficult_for_standard_llm: q.why_difficult_for_standard_llm || "",
            domain: q.domain || "General",
            neuronas_capabilities_tested: q.neuronas_capabilities_tested || []
        }));
    } catch (error) {
        console.error("Failed to parse questions:", error);
        return [];
    }
}

/**
 * Génération via InvokeLLM (fallback robuste)
 */
async function generateViaInvokeLLM(base44, config) {
    const prompt = buildGenerationPrompt(config);
    
    const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
            type: "object",
            properties: {
                questions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            question_id: { type: "string" },
                            question_text: { type: "string" },
                            question_type: { type: "string" },
                            domain: { type: "string" },
                            facettes_principales: { type: "array", items: { type: "string" } },
                            niveau_complexite: { type: "string" },
                            hemisphere_dominant: { type: "string" },
                            ground_truth: { type: "string" },
                            expected_key_points: { type: "array", items: { type: "string" } },
                            why_difficult_for_standard_llm: { type: "string" }
                        }
                    }
                }
            }
        }
    });

    return result.questions || [];
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            action = "generate",
            mode = "normal",           // normal, extreme, component_stress, hybrid
            domain = "physics",
            complexity = "complexe",
            count = 5,
            target_component = null,   // D3STIB, QRONAS, BRONAS, SMAS, GC_HARMONIZER
            hybrid_domains = [],
            target_entity = "BenchmarkQuestion", // BenchmarkQuestion or DevTestQuestion
            use_huggingface = true
        } = body;

        const log = [];
        log.push(`[${new Date().toISOString()}] Starting generation: mode=${mode}, count=${count}`);

        let generatedQuestions = [];
        const sourceTag = `Generated-${mode.toUpperCase()}-${Date.now()}`;

        if (action === "generate") {
            const config = { mode, domain, complexity, count, target_component, hybrid_domains };

            // Tentative HuggingFace d'abord
            if (use_huggingface) {
                try {
                    log.push(`[HF] Calling HuggingFace API...`);
                    const prompt = buildGenerationPrompt(config);
                    const hfOutput = await callHuggingFace(prompt);
                    generatedQuestions = parseGeneratedQuestions(hfOutput, sourceTag);
                    log.push(`[HF] Generated ${generatedQuestions.length} questions via HuggingFace`);
                } catch (hfError) {
                    log.push(`[HF] HuggingFace failed: ${hfError.message}, falling back to InvokeLLM`);
                }
            }

            // Fallback ou complément via InvokeLLM
            if (generatedQuestions.length < count) {
                log.push(`[LLM] Generating ${count - generatedQuestions.length} additional questions via InvokeLLM...`);
                const llmQuestions = await generateViaInvokeLLM(base44, {
                    ...config,
                    count: count - generatedQuestions.length
                });
                
                const formattedLLM = llmQuestions.map((q, idx) => ({
                    ...q,
                    question_id: q.question_id || `${sourceTag}-LLM-${idx}`,
                    source_benchmark: `${sourceTag}-LLM`
                }));
                
                generatedQuestions = [...generatedQuestions, ...formattedLLM];
                log.push(`[LLM] Total questions now: ${generatedQuestions.length}`);
            }

            // Sauvegarder dans la bonne entité
            if (generatedQuestions.length > 0) {
                const entity = target_entity === "DevTestQuestion" 
                    ? base44.entities.DevTestQuestion 
                    : base44.entities.BenchmarkQuestion;

                // Adapter les champs selon l'entité cible
                const questionsToSave = generatedQuestions.map(q => {
                    if (target_entity === "DevTestQuestion") {
                        return {
                            ...q,
                            source_test: q.source_benchmark,
                            official_test_answer: q.ground_truth
                        };
                    }
                    return q;
                });

                await entity.bulkCreate(questionsToSave);
                log.push(`[DB] Saved ${questionsToSave.length} questions to ${target_entity}`);
            }
        }

        return Response.json({
            success: true,
            questions_generated: generatedQuestions.length,
            questions: generatedQuestions,
            log,
            config: { mode, domain, complexity, count, target_component, hybrid_domains, target_entity }
        });

    } catch (error) {
        console.error("Generator error:", error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});