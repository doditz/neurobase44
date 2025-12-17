import React, { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, Download, CheckCircle2, Database, Shield, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

export default function BenchmarkDatasetBuilder() {
    const [loading, setLoading] = useState(false);
    const [currentPhase, setCurrentPhase] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [results, setResults] = useState({
        phase1: null,
        phase2: null,
        phase3: null,
        phase4: null,
        finalDataset: []
    });

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        setIsLoading(true);
        try {
            const data = await base44.entities.BenchmarkQuestion.list();
            setQuestions(data);
        } catch (error) {
            console.error('Failed to load questions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoFix = async () => {
        try {
            toast.info('🔧 Running auto-fix...');
            const { data } = await base44.functions.invoke('fixDatasetLoading');
            if (data.success) {
                toast.success(data.message);
                await loadQuestions();
            } else {
                toast.error('Auto-fix failed');
            }
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        }
    };

    // Phase 2.1: Recherche des Benchmarks LLM Standards
    const searchStandardBenchmarks = async () => {
        setLoading(true);
        setCurrentPhase("phase2.1");
        
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Recherche les principaux datasets et benchmarks utilisés pour évaluer les LLM en 2024-2025, en particulier:

1. MMLU (Massive Multitask Language Understanding)
2. GSM8K (Grade School Math 8K)  
3. TruthfulQA
4. HellaSwag
5. BIG-Bench
6. HELM (Holistic Evaluation of Language Models)

Pour chacun:
- Description du benchmark
- Types de questions incluses
- Format des questions (QCM, ouvert, etc.)
- Domaines couverts
- Comment accéder au dataset (Hugging Face, GitHub, etc.)
- Exemples de 5 questions représentatives avec leurs réponses

Fournis des liens directs vers les datasets quand disponibles.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        benchmarks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    question_types: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    domains: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    access_link: { type: "string" },
                                    format: { type: "string" },
                                    example_questions: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                question: { type: "string" },
                                                answer: { type: "string" },
                                                domain: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setResults(prev => ({ ...prev, phase1: response }));
        } catch (error) {
            console.error("Erreur Phase 2.1:", error);
            alert(`Erreur Phase 2.1: ${error.message}`);
        } finally {
            setLoading(false);
            setCurrentPhase(null);
        }
    };

    // Phase 2.2: Recherche Benchmarks Éthique & Biais
    const searchEthicsBenchmarks = async () => {
        setLoading(true);
        setCurrentPhase("phase2.2");
        
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Recherche les datasets et benchmarks spécifiques à l'éthique, aux biais et à l'équité dans l'IA:

1. ETHICS (Hendrycks et al.)
2. BOLD (Bias in Open-ended Language Generation Dataset)
3. BBQ (Bias Benchmark for QA)
4. StereoSet
5. Moral Machine Dataset
6. Scruples (moral reasoning)

Pour chacun:
- Description et objectif du benchmark
- Types de dilemmes/scénarios éthiques testés
- Biais ciblés (genre, race, religion, culture, etc.)
- Format des questions
- Liens d'accès
- 5 exemples de questions/scénarios représentatifs avec contexte éthique

Focus particulier sur les questions qui nécessitent une analyse multi-perspective et une conscience des valeurs culturelles.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        ethics_benchmarks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    bias_types: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    access_link: { type: "string" },
                                    example_scenarios: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                scenario: { type: "string" },
                                                ethical_dimensions: { 
                                                    type: "array", 
                                                    items: { type: "string" } 
                                                },
                                                key_considerations: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setResults(prev => ({ ...prev, phase2: response }));
        } catch (error) {
            console.error("Erreur Phase 2.2:", error);
            alert(`Erreur Phase 2.2: ${error.message}`);
        } finally {
            setLoading(false);
            setCurrentPhase(null);
        }
    };

    // Phase 2.3: Recherche Benchmarks Créativité & Raisonnement Complexe
    const searchCreativityBenchmarks = async () => {
        setLoading(true);
        setCurrentPhase("phase2.3");
        
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Recherche les benchmarks et tests pour évaluer la créativité, le raisonnement complexe et la résolution de problèmes ouverts dans les LLM:

1. BIG-Bench Creative Writing tasks
2. GPQA (Graduate-Level Google-Proof Q&A)
3. ARC (AI2 Reasoning Challenge)
4. CommonsenseQA
5. PuzzleBench / Logic Puzzles
6. Tests de créativité Torrance adaptés pour IA

Pour chacun:
- Description
- Types de problèmes (créatifs, logiques, contre-intuitifs)
- 5 exemples de questions qui nécessitent pensée latérale ou innovation
- Critères d'évaluation de la créativité/originalité

Focus sur les questions sans réponse unique, nécessitant exploration de possibilités.`,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        creativity_benchmarks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    problem_types: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    access_link: { type: "string" },
                                    example_problems: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                problem: { type: "string" },
                                                type: { type: "string" },
                                                evaluation_criteria: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setResults(prev => ({ ...prev, phase3: response }));
        } catch (error) {
            console.error("Erreur Phase 2.3:", error);
            alert(`Erreur Phase 2.3: ${error.message}`);
        } finally {
            setLoading(false);
            setCurrentPhase(null);
        }
    };

    // Phase 3: Génération de Questions Originales NEURONAS
    const generateNeuronasQuestions = async () => {
        setLoading(true);
        setCurrentPhase("phase3");
        
        try {
            const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Génère 30 questions originales spécifiquement conçues pour tester les capacités uniques de NEURONAS (système biomimétique avec débat multi-personas, validation éthique UNESCO, sensibilité culturelle québécoise).

Ces questions doivent être IMPOSSIBLES ou TRÈS DIFFICILES pour un LLM standard, mais gérables par NEURONAS grâce à son architecture Système 2.

Catégories (5 questions par catégorie):

1. **Dilemmes Éthiques Extrêmes** - Paradoxes moraux sans solution claire, nécessitant intégration de perspectives religieuses/culturelles mondiales
2. **Créativité Disruptive Contextualisée** - Innovation radicale ancrée dans le contexte québécois/canadien
3. **Complexité Multi-Domaines** - Problèmes nécessitant synthèse de science, art, philosophie, économie simultanément
4. **Sensibilité Culturelle Pointue** - Questions nécessitant compréhension fine des nuances québécoises, autochtones, francophones
5. **Paradoxes et Irrésoluble** - Questions intrinsèquement contradictoires, où la meilleure réponse est de documenter le désaccord respectueux
6. **Raisonnement Adaptatif Profond** - Problèmes nécessitant ajustement dynamique de stratégie cognitive

Pour chaque question, fournis:
- La question complète
- Pourquoi elle est difficile pour un LLM standard
- Quelles capacités NEURONAS elle teste
- Les facettes cognitives principales sollicitées
- Les points clés attendus dans une bonne réponse`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        neuronas_questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    category: { type: "string" },
                                    question: { type: "string" },
                                    why_difficult_for_standard_llm: { type: "string" },
                                    neuronas_capabilities_tested: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    cognitive_facets: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    },
                                    expected_key_points: { 
                                        type: "array", 
                                        items: { type: "string" } 
                                    }
                                }
                            }
                        }
                    }
                }
            });

            setResults(prev => ({ ...prev, phase4: response }));
        } catch (error) {
            console.error("Erreur Phase 3:", error);
            alert(`Erreur Phase 3: ${error.message}`);
        } finally {
            setLoading(false);
            setCurrentPhase(null);
        }
    };

    // Compilation finale du dataset
    const compileDataset = () => {
        const dataset = [];
        
        // Ajouter les questions des benchmarks standards
        if (results.phase1?.benchmarks) {
            results.phase1.benchmarks.forEach((benchmark, bidx) => {
                benchmark.example_questions?.forEach((q, qidx) => {
                    dataset.push({
                        id: `STD-${bidx}-${qidx}`,
                        source: benchmark.name,
                        question_text: q.question,
                        ground_truth: q.answer,
                        domain: q.domain,
                        facettes_principales: ["Raisonnement Logique"],
                        niveau_complexite: "modéré",
                        type: "standard_benchmark"
                    });
                });
            });
        }

        // Ajouter les scénarios éthiques
        if (results.phase2?.ethics_benchmarks) {
            results.phase2.ethics_benchmarks.forEach((benchmark, bidx) => {
                benchmark.example_scenarios?.forEach((s, sidx) => {
                    dataset.push({
                        id: `ETH-${bidx}-${sidx}`,
                        source: benchmark.name,
                        question_text: s.scenario,
                        ethical_dimensions: s.ethical_dimensions,
                        key_considerations: s.key_considerations,
                        facettes_principales: ["Éthique & Valeurs"],
                        niveau_complexite: "complexe",
                        type: "ethics_benchmark"
                    });
                });
            });
        }

        // Ajouter les problèmes créatifs
        if (results.phase3?.creativity_benchmarks) {
            results.phase3.creativity_benchmarks.forEach((benchmark, bidx) => {
                benchmark.example_problems?.forEach((p, pidx) => {
                    dataset.push({
                        id: `CRE-${bidx}-${pidx}`,
                        source: benchmark.name,
                        question_text: p.problem,
                        problem_type: p.type,
                        evaluation_criteria: p.evaluation_criteria,
                        facettes_principales: ["Créativité & Innovation"],
                        niveau_complexite: "complexe",
                        type: "creativity_benchmark"
                    });
                });
            });
        }

        // Ajouter les questions NEURONAS originales
        if (results.phase4?.neuronas_questions) {
            results.phase4.neuronas_questions.forEach((q, idx) => {
                dataset.push({
                    id: `NEU-${idx}`,
                    source: "NEURONAS Original",
                    question_text: q.question,
                    category: q.category,
                    why_difficult: q.why_difficult_for_standard_llm,
                    capabilities_tested: q.neuronas_capabilities_tested,
                    facettes_principales: q.cognitive_facets,
                    expected_key_points: q.expected_key_points,
                    niveau_complexite: "extrême",
                    type: "neuronas_specific"
                });
            });
        }

        setResults(prev => ({ ...prev, finalDataset: dataset }));
    };

    // Export du dataset en JSON
    const exportDataset = () => {
        const dataStr = JSON.stringify(results.finalDataset, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'neuronas_benchmark_dataset.json';
        link.click();
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6"> {/* Added space-y-6 */}
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Database className="w-8 h-8" />
                            Constructeur de Dataset de Tests
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Créez et gérez des questions pour les tests d'efficacité Neuronas • {questions.length} questions chargées
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-orange-600 px-4 py-2">Admin Only</Badge>
                        {questions.length === 0 && !isLoading && (
                            <Button
                                onClick={handleAutoFix}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Wrench className="w-4 h-4 mr-2" />
                                Auto-Fix Datasets
                            </Button>
                        )}
                    </div>
                </div>

                {/* Phase 1: Définition (Déjà complétée) */}
                <Card className="mb-6 border-green-600 bg-slate-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            Phase 1: Définition des Facettes & Critères ARS
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-slate-300 space-y-2">
                            <p>✅ 8 facettes cognitives identifiées</p>
                            <p>✅ Sous-critères ARS détaillés pour chaque facette</p>
                            <p>✅ Grille de métadonnées structurée</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Phase 2: Recherche Benchmarks Existants */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Phase 2: Recherche de Questions Pré-existantes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Étape 2.1 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-200">
                                    2.1 - Benchmarks LLM Standards (MMLU, GSM8K, etc.)
                                </h3>
                                <Button 
                                    onClick={searchStandardBenchmarks}
                                    disabled={loading}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {loading && currentPhase === "phase2.1" ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Recherche...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4 mr-2" />
                                            Lancer Recherche
                                        </>
                                    )}
                                </Button>
                            </div>
                            {results.phase1 && (
                                <div className="bg-slate-700 rounded p-3 text-sm">
                                    <p className="text-green-400 font-medium mb-2">
                                        ✅ {results.phase1.benchmarks?.length} benchmarks trouvés
                                    </p>
                                    {results.phase1.benchmarks?.map((b, idx) => (
                                        <div key={idx} className="mb-2">
                                            <Badge variant="outline" className="bg-slate-600 text-green-400">{b.name}</Badge>
                                            <span className="ml-2 text-slate-400">
                                                {b.example_questions?.length} questions exemples
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Étape 2.2 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-200">
                                    2.2 - Benchmarks Éthique & Biais
                                </h3>
                                <Button 
                                    onClick={searchEthicsBenchmarks}
                                    disabled={loading}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {loading && currentPhase === "phase2.2" ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Recherche...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4 mr-2" />
                                            Lancer Recherche
                                        </>
                                    )}
                                </Button>
                            </div>
                            {results.phase2 && (
                                <div className="bg-slate-700 rounded p-3 text-sm">
                                    <p className="text-green-400 font-medium mb-2">
                                        ✅ {results.phase2.ethics_benchmarks?.length} benchmarks éthiques trouvés
                                    </p>
                                    {results.phase2.ethics_benchmarks?.map((b, idx) => (
                                        <div key={idx} className="mb-2">
                                            <Badge variant="outline" className="bg-slate-600 text-green-400">{b.name}</Badge>
                                            <span className="ml-2 text-slate-400">
                                                {b.example_scenarios?.length} scénarios
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Étape 2.3 */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-200">
                                    2.3 - Benchmarks Créativité & Raisonnement Complexe
                                </h3>
                                <Button 
                                    onClick={searchCreativityBenchmarks}
                                    disabled={loading}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700"
                                >
                                    {loading && currentPhase === "phase2.3" ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Recherche...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="h-4 w-4 mr-2" />
                                            Lancer Recherche
                                        </>
                                    )}
                                </Button>
                            </div>
                            {results.phase3 && (
                                <div className="bg-slate-700 rounded p-3 text-sm">
                                    <p className="text-green-400 font-medium mb-2">
                                        ✅ {results.phase3.creativity_benchmarks?.length} benchmarks créativité trouvés
                                    </p>
                                    {results.phase3.creativity_benchmarks?.map((b, idx) => (
                                        <div key={idx} className="mb-2">
                                            <Badge variant="outline" className="bg-slate-600 text-green-400">{b.name}</Badge>
                                            <span className="ml-2 text-slate-400">
                                                {b.example_problems?.length} problèmes
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Phase 3: Questions Originales NEURONAS */}
                <Card className="mb-6 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Phase 3: Génération de Questions Originales NEURONAS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-slate-400">
                                30 questions spécifiques testant les capacités uniques de NEURONAS
                            </p>
                            <Button 
                                onClick={generateNeuronasQuestions}
                                disabled={loading}
                                className="bg-orange-600 hover:bg-orange-700"
                            >
                                {loading && currentPhase === "phase3" ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Génération...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4 mr-2" />
                                        Générer Questions
                                    </>
                                )}
                            </Button>
                        </div>
                        {results.phase4 && (
                            <div className="bg-slate-700 rounded p-3 text-sm">
                                <p className="text-green-400 font-medium mb-2">
                                    ✅ {results.phase4.neuronas_questions?.length} questions NEURONAS générées
                                </p>
                                <div className="space-y-2">
                                    {results.phase4.neuronas_questions?.slice(0, 3).map((q, idx) => (
                                        <div key={idx} className="border-l-2 border-orange-600 pl-3">
                                            <Badge className="mb-1 bg-orange-600">{q.category}</Badge>
                                            <p className="text-slate-300 text-xs">{q.question.substring(0, 100)}...</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Compilation et Export */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400">Phase 4: Compilation & Export du Dataset Final</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Button 
                                onClick={compileDataset}
                                disabled={!results.phase1 && !results.phase2 && !results.phase3 && !results.phase4}
                                className="w-full bg-green-600 hover:bg-green-700"
                            >
                                Compiler le Dataset Final
                            </Button>
                            
                            {results.finalDataset.length > 0 && (
                                <div className="space-y-3">
                                    <div className="bg-green-900/30 border border-green-600 rounded p-4">
                                        <p className="text-green-400 font-semibold text-lg">
                                            ✅ Dataset Compilé: {results.finalDataset.length} questions
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                                            <div>
                                                <span className="text-slate-400">Standards:</span>
                                                <span className="ml-2 font-medium text-green-400">
                                                    {results.finalDataset.filter(q => q.type === 'standard_benchmark').length}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Éthique:</span>
                                                <span className="ml-2 font-medium text-green-400">
                                                    {results.finalDataset.filter(q => q.type === 'ethics_benchmark').length}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Créativité:</span>
                                                <span className="ml-2 font-medium text-green-400">
                                                    {results.finalDataset.filter(q => q.type === 'creativity_benchmark').length}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">NEURONAS:</span>
                                                <span className="ml-2 font-medium text-green-400">
                                                    {results.finalDataset.filter(q => q.type === 'neuronas_specific').length}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <Button 
                                        onClick={exportDataset}
                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Télécharger Dataset (JSON)
                                    </Button>

                                    <div className="bg-slate-700 rounded p-3 max-h-96 overflow-y-auto">
                                        <p className="font-medium text-sm mb-2 text-green-400">Aperçu du Dataset:</p>
                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap">
                                            {JSON.stringify(results.finalDataset.slice(0, 3), null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}