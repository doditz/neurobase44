import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ═══════════════════════════════════════════════════════════════════════════
// NEURONAS DATASET POPULATOR - Persistent Question Database
// Hardcoded questions to avoid recomputation - stored in DB once populated
// ═══════════════════════════════════════════════════════════════════════════

const BENCHMARK_QUESTIONS = [
    // ═══ STANDARD BENCHMARKS (MMLU-style) ═══
    {
        question_id: "STD-001",
        source_benchmark: "MMLU-Physics",
        question_text: "A spacecraft is traveling at 0.8c relative to Earth. According to special relativity, if 10 years pass on Earth, how much time passes for the astronauts on the spacecraft?",
        question_type: "standard_benchmark",
        facettes_principales: ["physics", "relativity", "calculation"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Left",
        ground_truth: "6 years (time dilation factor γ = 1.67)",
        expected_key_points: ["time dilation", "Lorentz factor", "γ = 1/√(1-v²/c²)", "proper time vs coordinate time"],
        why_difficult_for_standard_llm: "Requires precise mathematical reasoning and physics knowledge",
        domain: "Physics"
    },
    {
        question_id: "STD-002",
        source_benchmark: "MMLU-Philosophy",
        question_text: "Explain the Ship of Theseus paradox and how it relates to personal identity over time. What are the main philosophical positions on this problem?",
        question_type: "standard_benchmark",
        facettes_principales: ["philosophy", "identity", "metaphysics"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Central",
        ground_truth: "The paradox questions whether an object that has had all of its components replaced remains fundamentally the same object",
        expected_key_points: ["material continuity", "form vs matter", "psychological continuity", "4D perdurantism"],
        why_difficult_for_standard_llm: "Requires nuanced philosophical reasoning across multiple traditions",
        domain: "Philosophy"
    },
    {
        question_id: "STD-003",
        source_benchmark: "GSM8K",
        question_text: "A store sells apples at $2 per pound. If a customer buys 3.5 pounds of apples and pays with a $20 bill, and then the store offers a 15% discount on the total, how much change should the customer receive?",
        question_type: "standard_benchmark",
        facettes_principales: ["mathematics", "arithmetic", "multi-step"],
        niveau_complexite: "simple",
        hemisphere_dominant: "Left",
        ground_truth: "$14.05 change (3.5 × $2 = $7, 15% off = $5.95, $20 - $5.95 = $14.05)",
        expected_key_points: ["multiplication", "percentage calculation", "subtraction", "order of operations"],
        why_difficult_for_standard_llm: "Multi-step calculation with percentage",
        domain: "Mathematics"
    },
    {
        question_id: "STD-004",
        source_benchmark: "MMLU-Biology",
        question_text: "Describe the process of CRISPR-Cas9 gene editing, including how the guide RNA functions and what happens at the molecular level when a double-strand break is repaired.",
        question_type: "standard_benchmark",
        facettes_principales: ["biology", "genetics", "molecular"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Left",
        ground_truth: "CRISPR uses guide RNA to direct Cas9 nuclease to specific DNA sequences for precise cutting",
        expected_key_points: ["guide RNA complementarity", "PAM sequence", "double-strand break", "NHEJ vs HDR repair"],
        why_difficult_for_standard_llm: "Requires detailed molecular biology knowledge",
        domain: "Biology"
    },
    {
        question_id: "STD-005",
        source_benchmark: "MMLU-Computer Science",
        question_text: "Explain the difference between P, NP, NP-Complete, and NP-Hard problem classes. Give an example of each and explain why the P vs NP problem matters.",
        question_type: "standard_benchmark",
        facettes_principales: ["computer science", "complexity theory", "algorithms"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Left",
        ground_truth: "P = polynomial time solvable, NP = polynomial time verifiable, NP-Complete = hardest problems in NP, NP-Hard = at least as hard as NP-Complete",
        expected_key_points: ["polynomial time", "verification vs solving", "reduction", "practical implications"],
        why_difficult_for_standard_llm: "Abstract theoretical concepts requiring precise definitions",
        domain: "Computer Science"
    },

    // ═══ ETHICS BENCHMARKS ═══
    {
        question_id: "ETH-001",
        source_benchmark: "ETHICS-Commonsense",
        question_text: "A self-driving car must choose between hitting a group of elderly pedestrians or swerving to hit a single child. How should this dilemma be resolved, and what ethical frameworks apply?",
        question_type: "ethics_benchmark",
        facettes_principales: ["ethics", "trolley problem", "AI ethics", "utilitarianism"],
        niveau_complexite: "extrême",
        hemisphere_dominant: "Central",
        ground_truth: "No single correct answer - requires analysis of utilitarian, deontological, and virtue ethics perspectives",
        expected_key_points: ["trolley problem variant", "utilitarian calculus", "rights-based ethics", "moral luck", "AI responsibility"],
        why_difficult_for_standard_llm: "Genuine moral dilemma with no clear right answer",
        domain: "Ethics"
    },
    {
        question_id: "ETH-002",
        source_benchmark: "ETHICS-Justice",
        question_text: "Is it ethical for a company to use AI to screen job applicants if the AI was trained on historically biased hiring data? Analyze from multiple ethical perspectives.",
        question_type: "ethics_benchmark",
        facettes_principales: ["ethics", "AI bias", "fairness", "discrimination"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "Requires balancing efficiency gains against perpetuation of historical injustice",
        expected_key_points: ["algorithmic bias", "disparate impact", "procedural justice", "remediation strategies"],
        why_difficult_for_standard_llm: "Requires nuanced understanding of systemic bias",
        domain: "AI Ethics"
    },
    {
        question_id: "ETH-003",
        source_benchmark: "ETHICS-Deontology",
        question_text: "A doctor has five patients dying from organ failure and one healthy patient. Would it be ethical to kill the healthy patient to harvest organs and save the five? Justify your answer.",
        question_type: "ethics_benchmark",
        facettes_principales: ["ethics", "medical ethics", "deontology", "utilitarianism"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "Generally considered unethical due to violation of patient autonomy and rights",
        expected_key_points: ["Kantian ethics", "means vs ends", "medical consent", "slippery slope"],
        why_difficult_for_standard_llm: "Tests understanding of why utilitarian calculus alone is insufficient",
        domain: "Medical Ethics"
    },

    // ═══ CREATIVITY BENCHMARKS ═══
    {
        question_id: "CRE-001",
        source_benchmark: "Creative-Writing",
        question_text: "Write a haiku that captures the essence of quantum superposition while also conveying human emotional uncertainty.",
        question_type: "creativity_benchmark",
        facettes_principales: ["creativity", "poetry", "physics metaphor", "emotion"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Right",
        ground_truth: "Open-ended creative response blending scientific concept with emotional resonance",
        expected_key_points: ["5-7-5 syllable structure", "quantum metaphor", "emotional depth", "imagery"],
        why_difficult_for_standard_llm: "Requires creative synthesis of disparate domains",
        domain: "Creative Writing"
    },
    {
        question_id: "CRE-002",
        source_benchmark: "Creative-Problem",
        question_text: "Design a new sport that can be played in zero gravity, is accessible to people with physical disabilities, and promotes international cooperation. Describe the rules and equipment.",
        question_type: "creativity_benchmark",
        facettes_principales: ["creativity", "design", "inclusion", "innovation"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Right",
        ground_truth: "Open-ended creative response with practical constraints",
        expected_key_points: ["zero-G physics", "accessibility features", "team dynamics", "scoring system"],
        why_difficult_for_standard_llm: "Requires creative synthesis with multiple constraints",
        domain: "Design"
    },
    {
        question_id: "CRE-003",
        source_benchmark: "Creative-Narrative",
        question_text: "Write a 100-word story that begins with 'The last human on Earth sat alone' but has an unexpected, hopeful twist that subverts the reader's expectations.",
        question_type: "creativity_benchmark",
        facettes_principales: ["creativity", "narrative", "twist", "hope"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Right",
        ground_truth: "Creative narrative with satisfying subversion of apocalyptic trope",
        expected_key_points: ["narrative hook", "misdirection", "hopeful resolution", "word economy"],
        why_difficult_for_standard_llm: "Requires creative subversion of expectations",
        domain: "Creative Writing"
    },

    // ═══ NEURONAS-SPECIFIC (Original) ═══
    {
        question_id: "NEU-001",
        source_benchmark: "NEURONAS-Original",
        question_text: "Explain how the D3STIB semantic filtering algorithm in NEURONAS differs from traditional attention mechanisms, and why this matters for resource efficiency.",
        question_type: "neuronas_specific",
        facettes_principales: ["NEURONAS", "D3STIB", "attention", "efficiency"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Left",
        ground_truth: "D3STIB uses multi-tier semantic filtering before LLM invocation, reducing unnecessary computation",
        expected_key_points: ["pre-LLM filtering", "semantic tiers", "token savings", "computational efficiency"],
        neuronas_capabilities_tested: ["D3STIB", "architectural knowledge", "efficiency metrics"],
        why_difficult_for_standard_llm: "Requires NEURONAS-specific architectural knowledge",
        domain: "NEURONAS Architecture"
    },
    {
        question_id: "NEU-002",
        source_benchmark: "NEURONAS-Original",
        question_text: "How does the SMAS tri-hemispheric debate system achieve cognitive balance, and what role does D2 modulation play in persona weighting?",
        question_type: "neuronas_specific",
        facettes_principales: ["NEURONAS", "SMAS", "hemispheres", "D2 modulation"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "SMAS balances Left (analytical), Right (creative), and Central (integrative) processing with D2 modulating persona activation thresholds",
        expected_key_points: ["tri-hemispheric model", "persona activation", "D2 receptor analogy", "debate synthesis"],
        neuronas_capabilities_tested: ["SMAS", "D2 modulation", "cognitive architecture"],
        why_difficult_for_standard_llm: "Requires deep NEURONAS knowledge",
        domain: "NEURONAS Architecture"
    },
    {
        question_id: "NEU-003",
        source_benchmark: "NEURONAS-Original",
        question_text: "What is the GC Harmonizer in NEURONAS and how does it synthesize outputs from different cognitive hemispheres?",
        question_type: "neuronas_specific",
        facettes_principales: ["NEURONAS", "GC Harmonizer", "synthesis", "integration"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Central",
        ground_truth: "GC Harmonizer integrates outputs from all hemispheres using weighted synthesis based on task requirements",
        expected_key_points: ["global coherence", "weighted integration", "conflict resolution", "final synthesis"],
        neuronas_capabilities_tested: ["GC Harmonizer", "integration", "coherence"],
        why_difficult_for_standard_llm: "NEURONAS-specific component knowledge",
        domain: "NEURONAS Architecture"
    },

    // ═══ CULTURAL CONTEXT ═══
    {
        question_id: "CUL-001",
        source_benchmark: "Cultural-Context",
        question_text: "Explain the concept of 'Ubuntu' in African philosophy and how it differs from Western individualism. How might this philosophy influence AI ethics?",
        question_type: "cultural_context",
        facettes_principales: ["culture", "philosophy", "ubuntu", "AI ethics"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Right",
        ground_truth: "Ubuntu emphasizes communal identity and interconnectedness: 'I am because we are'",
        expected_key_points: ["communal identity", "interconnectedness", "collective responsibility", "AI implications"],
        why_difficult_for_standard_llm: "Requires cultural sensitivity and cross-cultural reasoning",
        domain: "Cultural Philosophy"
    },
    {
        question_id: "CUL-002",
        source_benchmark: "Cultural-Context",
        question_text: "How does the Japanese concept of 'Ikigai' relate to finding meaning in work, and how might it inform the design of AI assistants that help with career guidance?",
        question_type: "cultural_context",
        facettes_principales: ["culture", "ikigai", "purpose", "AI design"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Right",
        ground_truth: "Ikigai represents the intersection of passion, mission, vocation, and profession",
        expected_key_points: ["four elements of ikigai", "life purpose", "work satisfaction", "AI guidance implications"],
        why_difficult_for_standard_llm: "Requires cultural understanding and practical application",
        domain: "Cultural Philosophy"
    },

    // ═══ TECHNICAL DEEP ═══
    {
        question_id: "TECH-001",
        source_benchmark: "Technical-Deep",
        question_text: "Explain the mathematical foundation of transformer attention mechanisms, including the softmax function's role and why scaled dot-product attention uses √d_k scaling.",
        question_type: "technical_deep",
        facettes_principales: ["transformers", "attention", "mathematics", "deep learning"],
        niveau_complexite: "extrême",
        hemisphere_dominant: "Left",
        ground_truth: "Scaling by √d_k prevents softmax saturation for large dimension values",
        expected_key_points: ["Q, K, V matrices", "dot product", "softmax normalization", "gradient stability"],
        why_difficult_for_standard_llm: "Requires deep mathematical understanding",
        domain: "Machine Learning"
    },
    {
        question_id: "TECH-002",
        source_benchmark: "Technical-Deep",
        question_text: "Compare and contrast RLHF (Reinforcement Learning from Human Feedback) with DPO (Direct Preference Optimization) for LLM alignment. What are the tradeoffs?",
        question_type: "technical_deep",
        facettes_principales: ["RLHF", "DPO", "alignment", "optimization"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Left",
        ground_truth: "DPO eliminates the need for a separate reward model by directly optimizing on preference data",
        expected_key_points: ["reward model", "Bradley-Terry model", "computational efficiency", "stability"],
        why_difficult_for_standard_llm: "Requires current ML research knowledge",
        domain: "Machine Learning"
    },

    // ═══ PARADOX ═══
    {
        question_id: "PAR-001",
        source_benchmark: "Paradox",
        question_text: "If an AI system is programmed to always tell the truth, and you ask it 'Will your next statement be false?', how should it respond? Analyze the paradox.",
        question_type: "paradox",
        facettes_principales: ["logic", "paradox", "self-reference", "AI"],
        niveau_complexite: "extrême",
        hemisphere_dominant: "Central",
        ground_truth: "This is a variant of the liar's paradox with no consistent truth-value assignment",
        expected_key_points: ["self-reference", "liar's paradox", "Gödel incompleteness", "meta-level escape"],
        why_difficult_for_standard_llm: "Self-referential logical trap",
        domain: "Logic"
    },
    {
        question_id: "PAR-002",
        source_benchmark: "Paradox",
        question_text: "Explain Newcomb's Paradox and why it creates a genuine conflict between causal and evidential decision theory. Which approach would you recommend for an AI agent?",
        question_type: "paradox",
        facettes_principales: ["decision theory", "paradox", "causality", "AI"],
        niveau_complexite: "extrême",
        hemisphere_dominant: "Central",
        ground_truth: "Highlights fundamental tension between two rational decision-making frameworks",
        expected_key_points: ["causal decision theory", "evidential decision theory", "predictor problem", "one-box vs two-box"],
        why_difficult_for_standard_llm: "Requires understanding of decision theory foundations",
        domain: "Decision Theory"
    }
];

const DEVTEST_QUESTIONS = [
    // ═══ STANDARD TESTS ═══
    {
        question_id: "DEV-STD-001",
        source_test: "Development-Standard",
        question_text: "Summarize the key differences between supervised, unsupervised, and reinforcement learning in machine learning.",
        question_type: "standard_test",
        facettes_principales: ["ML basics", "learning paradigms"],
        niveau_complexite: "simple",
        hemisphere_dominant: "Left",
        ground_truth: "Supervised uses labeled data, unsupervised finds patterns in unlabeled data, RL learns through reward signals",
        expected_key_points: ["labeled vs unlabeled", "reward signals", "use cases"]
    },
    {
        question_id: "DEV-STD-002",
        source_test: "Development-Standard",
        question_text: "What is the difference between HTTP GET and POST requests? When should each be used?",
        question_type: "standard_test",
        facettes_principales: ["web development", "HTTP"],
        niveau_complexite: "simple",
        hemisphere_dominant: "Left",
        ground_truth: "GET retrieves data (idempotent, cached), POST submits data (not idempotent, not cached)",
        expected_key_points: ["idempotency", "caching", "data in URL vs body", "security"]
    },
    {
        question_id: "DEV-STD-003",
        source_test: "Development-Standard",
        question_text: "Explain the CAP theorem in distributed systems and give examples of systems that prioritize different combinations.",
        question_type: "standard_test",
        facettes_principales: ["distributed systems", "databases"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Left",
        ground_truth: "CAP: Consistency, Availability, Partition tolerance - can only guarantee 2 of 3",
        expected_key_points: ["consistency", "availability", "partition tolerance", "tradeoffs"]
    },

    // ═══ ETHICS TESTS ═══
    {
        question_id: "DEV-ETH-001",
        source_test: "Development-Ethics",
        question_text: "Should AI systems be required to explain their decisions in high-stakes domains like healthcare? Discuss pros and cons.",
        question_type: "ethics_test",
        facettes_principales: ["AI ethics", "explainability", "healthcare"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Central",
        ground_truth: "Balancing accuracy vs interpretability, accountability, trust",
        expected_key_points: ["explainability", "black box problem", "accountability", "trust"]
    },
    {
        question_id: "DEV-ETH-002",
        source_test: "Development-Ethics",
        question_text: "Is it ethical to use deepfakes for entertainment purposes if all parties consent? What safeguards should exist?",
        question_type: "ethics_test",
        facettes_principales: ["AI ethics", "deepfakes", "consent"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Central",
        ground_truth: "Consent is necessary but may not be sufficient - broader societal implications matter",
        expected_key_points: ["informed consent", "misuse potential", "regulation", "watermarking"]
    },

    // ═══ CREATIVITY TESTS ═══
    {
        question_id: "DEV-CRE-001",
        source_test: "Development-Creative",
        question_text: "Invent a new word that describes the feeling of finding exactly what you were looking for on the first try. Provide etymology and example usage.",
        question_type: "creativity_test",
        facettes_principales: ["creativity", "language", "neologism"],
        niveau_complexite: "simple",
        hemisphere_dominant: "Right",
        ground_truth: "Creative neologism with plausible etymology",
        expected_key_points: ["creative word", "etymology", "usage example", "pronunciation"]
    },
    {
        question_id: "DEV-CRE-002",
        source_test: "Development-Creative",
        question_text: "Design a UI for an app that helps people with anxiety. Describe the color scheme, interaction patterns, and key features you would include and why.",
        question_type: "creativity_test",
        facettes_principales: ["UX design", "mental health", "empathy"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Right",
        ground_truth: "Thoughtful design considering user emotional state",
        expected_key_points: ["calming colors", "simple interactions", "breathing exercises", "progress tracking"]
    },

    // ═══ NEURONAS TESTS ═══
    {
        question_id: "DEV-NEU-001",
        source_test: "Development-Neuronas",
        question_text: "How would you optimize the NEURONAS pipeline for a simple factual query versus a complex ethical dilemma?",
        question_type: "neuronas_specific",
        facettes_principales: ["NEURONAS", "optimization", "routing"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "Simple queries use EXPRESS tier, complex dilemmas use FULL_SYNTHESIS with ethics personas",
        expected_key_points: ["tier routing", "persona selection", "efficiency", "ethical oversight"]
    },
    {
        question_id: "DEV-NEU-002",
        source_test: "Development-Neuronas",
        question_text: "What happens when BRONAS detects an ethical violation during SMAS debate? Describe the intervention process.",
        question_type: "neuronas_specific",
        facettes_principales: ["NEURONAS", "BRONAS", "ethics"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "BRONAS can flag, modify, or veto outputs based on ethical rules",
        expected_key_points: ["ethical validation", "intervention levels", "veto power", "audit logging"]
    },

    // ═══ TECHNICAL DEEP TESTS ═══
    {
        question_id: "DEV-TECH-001",
        source_test: "Development-Technical",
        question_text: "Explain how React's virtual DOM works and why it improves performance compared to direct DOM manipulation.",
        question_type: "technical_deep",
        facettes_principales: ["React", "virtual DOM", "performance"],
        niveau_complexite: "modéré",
        hemisphere_dominant: "Left",
        ground_truth: "Virtual DOM enables efficient diffing and batched updates",
        expected_key_points: ["diffing algorithm", "reconciliation", "batched updates", "minimal reflows"]
    },
    {
        question_id: "DEV-TECH-002",
        source_test: "Development-Technical",
        question_text: "What is the difference between async/await and Promises in JavaScript? When would you prefer one over the other?",
        question_type: "technical_deep",
        facettes_principales: ["JavaScript", "async", "promises"],
        niveau_complexite: "simple",
        hemisphere_dominant: "Left",
        ground_truth: "async/await is syntactic sugar over Promises, providing cleaner sequential async code",
        expected_key_points: ["syntactic sugar", "error handling", "readability", "parallel execution"]
    },

    // ═══ PARADOX TESTS ═══
    {
        question_id: "DEV-PAR-001",
        source_test: "Development-Paradox",
        question_text: "Can an AI truly be creative, or is it always just recombining existing patterns? Argue both sides.",
        question_type: "paradox",
        facettes_principales: ["AI", "creativity", "philosophy"],
        niveau_complexite: "complexe",
        hemisphere_dominant: "Central",
        ground_truth: "Depends on definition of creativity - novelty vs intentionality",
        expected_key_points: ["combinatorial creativity", "emergent novelty", "intentionality", "human creativity comparison"]
    }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { action = 'populate_all', force_refresh = false } = body;

        const log = [];
        log.push(`[${new Date().toISOString()}] Starting dataset population...`);
        log.push(`[INFO] Action: ${action}, Force refresh: ${force_refresh}`);

        // Check existing counts
        const existingBenchmark = await base44.entities.BenchmarkQuestion.list('-created_date', 1);
        const existingDevTest = await base44.entities.DevTestQuestion.list('-created_date', 1);

        log.push(`[INFO] Existing BenchmarkQuestions: ${existingBenchmark.length > 0 ? 'Yes' : 'No'}`);
        log.push(`[INFO] Existing DevTestQuestions: ${existingDevTest.length > 0 ? 'Yes' : 'No'}`);

        let benchmarkCreated = 0;
        let devtestCreated = 0;

        // Populate BenchmarkQuestions
        if (action === 'populate_all' || action === 'populate_benchmark') {
            if (existingBenchmark.length === 0 || force_refresh) {
                if (force_refresh && existingBenchmark.length > 0) {
                    log.push(`[WARN] Force refresh - clearing existing BenchmarkQuestions...`);
                    const allExisting = await base44.entities.BenchmarkQuestion.list();
                    for (const q of allExisting) {
                        await base44.entities.BenchmarkQuestion.delete(q.id);
                    }
                }

                log.push(`[INFO] Populating ${BENCHMARK_QUESTIONS.length} BenchmarkQuestions...`);
                
                for (const q of BENCHMARK_QUESTIONS) {
                    try {
                        await base44.entities.BenchmarkQuestion.create(q);
                        benchmarkCreated++;
                    } catch (err) {
                        log.push(`[ERROR] Failed to create ${q.question_id}: ${err.message}`);
                    }
                }
                
                log.push(`[SUCCESS] Created ${benchmarkCreated} BenchmarkQuestions`);
            } else {
                log.push(`[SKIP] BenchmarkQuestions already populated. Use force_refresh=true to overwrite.`);
            }
        }

        // Populate DevTestQuestions
        if (action === 'populate_all' || action === 'populate_devtest') {
            if (existingDevTest.length === 0 || force_refresh) {
                if (force_refresh && existingDevTest.length > 0) {
                    log.push(`[WARN] Force refresh - clearing existing DevTestQuestions...`);
                    const allExisting = await base44.entities.DevTestQuestion.list();
                    for (const q of allExisting) {
                        await base44.entities.DevTestQuestion.delete(q.id);
                    }
                }

                log.push(`[INFO] Populating ${DEVTEST_QUESTIONS.length} DevTestQuestions...`);
                
                for (const q of DEVTEST_QUESTIONS) {
                    try {
                        await base44.entities.DevTestQuestion.create(q);
                        devtestCreated++;
                    } catch (err) {
                        log.push(`[ERROR] Failed to create ${q.question_id}: ${err.message}`);
                    }
                }
                
                log.push(`[SUCCESS] Created ${devtestCreated} DevTestQuestions`);
            } else {
                log.push(`[SKIP] DevTestQuestions already populated. Use force_refresh=true to overwrite.`);
            }
        }

        log.push(`[${new Date().toISOString()}] Population complete!`);

        return Response.json({
            success: true,
            benchmark_questions_created: benchmarkCreated,
            devtest_questions_created: devtestCreated,
            benchmark_total: BENCHMARK_QUESTIONS.length,
            devtest_total: DEVTEST_QUESTIONS.length,
            log
        });

    } catch (error) {
        console.error('Population error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});