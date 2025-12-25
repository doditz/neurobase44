import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Database, Loader2, CheckCircle2, AlertCircle, 
    Brain, Wrench, Download, RefreshCw, Shield, BookOpen,
    Sparkles, Zap, Target
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevTestDatasetBuilder() {
    const [user, setUser] = useState(null);
    const [existingQuestions, setExistingQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [buildProgress, setBuildProgress] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);

            // Load existing questions
            const questions = await base44.entities.DevTestQuestion.list('-created_date', 500);
            setExistingQuestions(questions);
            
            console.log(`[DevTestDatasetBuilder] Loaded ${questions.length} existing questions`);
        } catch (error) {
            console.error('[DevTestDatasetBuilder] Load error:', error);
            toast.error('Échec du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFixDatasets = async () => {
        setIsLoading(true);
        try {
            const { data } = await base44.functions.invoke('fixDatasetLoading');
            
            if (data.success) {
                toast.success(`✅ ${data.message}`);
                await loadData();
            } else {
                toast.error('❌ Fix failed');
            }
        } catch (error) {
            console.error('[DevTestDatasetBuilder] Fix error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const buildCompleteDataset = async () => {
        setIsLoading(true);
        setBuildProgress({ phase: 'init', message: 'Initialisation...', progress: 0 });

        try {
            // Phase 1: Standard Benchmarks
            setBuildProgress({ phase: 'standard', message: 'Recherche de benchmarks standards...', progress: 10 });
            
            const standardPrompt = `Search for 60 high-quality benchmark questions from:
- MMLU (Massive Multitask Language Understanding)
- GSM8K (Grade School Math)
- ARC-Challenge (AI2 Reasoning Challenge)
- LogiQA (Logical Reasoning)

Return a structured JSON array with questions that test analytical reasoning, mathematical ability, and logical deduction.`;

            const standardData = await base44.integrations.Core.InvokeLLM({
                prompt: standardPrompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question_id: { type: "string" },
                                    source_test: { type: "string" },
                                    question_text: { type: "string" },
                                    official_test_answer: { type: "string" },
                                    ground_truth: { type: "string" },
                                    expected_key_points: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            });

            // Phase 2: Ethics Benchmarks
            setBuildProgress({ phase: 'ethics', message: 'Recherche de benchmarks éthiques...', progress: 30 });

            const ethicsPrompt = `Search for 60 ethics and moral reasoning benchmark questions from:
- ETHICS benchmark dataset
- Moral Machine scenarios
- UNESCO AI ethics cases

Return structured questions testing moral reasoning, ethical dilemmas, and value-based decisions.`;

            const ethicsData = await base44.integrations.Core.InvokeLLM({
                prompt: ethicsPrompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question_id: { type: "string" },
                                    source_test: { type: "string" },
                                    question_text: { type: "string" },
                                    ground_truth: { type: "string" },
                                    expected_key_points: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            });

            // Phase 3: Creative Benchmarks
            setBuildProgress({ phase: 'creative', message: 'Recherche de benchmarks créatifs...', progress: 50 });

            const creativePrompt = `Search for 60 creative reasoning and innovation benchmark questions from:
- Creative Writing prompts
- Lateral thinking puzzles
- Design thinking challenges

Return questions that test creativity, metaphor, analogical reasoning, and innovative problem-solving.`;

            const creativeData = await base44.integrations.Core.InvokeLLM({
                prompt: creativePrompt,
                add_context_from_internet: true,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question_id: { type: "string" },
                                    source_test: { type: "string" },
                                    question_text: { type: "string" },
                                    ground_truth: { type: "string" },
                                    expected_key_points: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            });

            // Phase 4: NEURONAS-Specific Questions
            setBuildProgress({ phase: 'neuronas', message: 'Génération de questions NEURONAS originales...', progress: 70 });

            const neuronasPrompt = `Generate 57 original NEURONAS-specific test questions based on the arXiv v13.1 architecture:

Focus on capabilities that test:
- D³STIB semantic derivative filtering
- SMAS tri-hemispheric debate
- BRONAS ethical governance
- QRONAS probabilistic collapse
- Multi-framework paradoxes
- Cultural context sensitivity
- Sudden semantic reversals (sarcasm, irony, plot twists)

Return questions designed to stress-test cognitive architecture, not just LLM knowledge.`;

            const neuronasData = await base44.integrations.Core.InvokeLLM({
                prompt: neuronasPrompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question_id: { type: "string" },
                                    source_test: { type: "string" },
                                    question_text: { type: "string" },
                                    ground_truth: { type: "string" },
                                    expected_key_points: { type: "array", items: { type: "string" } },
                                    why_difficult_for_standard_llm: { type: "string" },
                                    neuronas_capabilities_tested: { type: "array", items: { type: "string" } }
                                }
                            }
                        }
                    }
                }
            });

            // Compile and save
            setBuildProgress({ phase: 'compile', message: 'Compilation et sauvegarde...', progress: 90 });

            const allQuestions = [
                ...standardData.questions.map(q => ({ 
                    ...q, 
                    question_type: 'standard_test',
                    niveau_complexite: 'modéré',
                    hemisphere_dominant: 'Left',
                    facettes_principales: ['analytical', 'reasoning']
                })),
                ...ethicsData.questions.map(q => ({ 
                    ...q, 
                    question_type: 'ethics_test',
                    niveau_complexite: 'complexe',
                    hemisphere_dominant: 'Central',
                    facettes_principales: ['ethical', 'moral_reasoning']
                })),
                ...creativeData.questions.map(q => ({ 
                    ...q, 
                    question_type: 'creativity_test',
                    niveau_complexite: 'modéré',
                    hemisphere_dominant: 'Right',
                    facettes_principales: ['creative', 'divergent_thinking']
                })),
                ...neuronasData.questions.map(q => ({ 
                    ...q, 
                    question_type: 'neuronas_specific',
                    niveau_complexite: 'extrême',
                    hemisphere_dominant: 'Balanced',
                    facettes_principales: ['multi_framework', 'paradox', 'architecture_test']
                }))
            ];

            // Bulk create
            await base44.entities.DevTestQuestion.bulkCreate(allQuestions);

            setBuildProgress({ phase: 'complete', message: `✅ Dataset complet: ${allQuestions.length} questions créées`, progress: 100 });
            toast.success(`Dataset créé: ${allQuestions.length} questions`);

            await loadData();

        } catch (error) {
            console.error('[DevTestDatasetBuilder] Build error:', error);
            toast.error(`Erreur: ${error.message}`);
            setBuildProgress({ phase: 'error', message: error.message, progress: 0 });
        } finally {
            setIsLoading(false);
        }
    };

    const exportDataset = () => {
        const dataStr = JSON.stringify(existingQuestions, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devtest_dataset_${existingQuestions.length}_questions.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    const isAdmin = user.role === 'admin';

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Card className="bg-slate-800 border-orange-600 max-w-md">
                    <CardHeader>
                        <CardTitle className="text-orange-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Accès Réservé Administrateur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-300">
                            Cette page est réservée aux administrateurs système.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const byType = existingQuestions.reduce((acc, q) => {
        acc[q.question_type] = (acc[q.question_type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Database className="w-8 h-8" />
                            Dev Test Dataset Builder
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Construction et gestion du dataset de tests de développement
                        </p>
                    </div>
                    <Badge className="bg-orange-600 px-4 py-2">Admin Mode</Badge>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-800">
                        <TabsTrigger value="overview">
                            <BookOpen className="w-4 h-4 mr-2" />
                            Vue d'ensemble
                        </TabsTrigger>
                        <TabsTrigger value="build">
                            <Wrench className="w-4 h-4 mr-2" />
                            Construire
                        </TabsTrigger>
                        <TabsTrigger value="questions">
                            <Target className="w-4 h-4 mr-2" />
                            Questions ({existingQuestions.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid md:grid-cols-4 gap-4">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400">Total Questions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-green-400">
                                        {existingQuestions.length}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400">Standard Tests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-blue-400">
                                        {byType['standard_test'] || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400">Ethics Tests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-orange-400">
                                        {byType['ethics_test'] || 0}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm text-slate-400">Creative Tests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-purple-400">
                                        {byType['creativity_test'] || 0}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    onClick={loadData}
                                    variant="outline"
                                    className="w-full border-green-600 text-green-400"
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                    Rafraîchir les Données
                                </Button>

                                <Button
                                    onClick={handleFixDatasets}
                                    variant="outline"
                                    className="w-full border-orange-600 text-orange-400"
                                    disabled={isLoading}
                                >
                                    <Wrench className="w-4 h-4 mr-2" />
                                    Fix Dataset Loading Issues
                                </Button>

                                <Button
                                    onClick={exportDataset}
                                    variant="outline"
                                    className="w-full border-blue-600 text-blue-400"
                                    disabled={existingQuestions.length === 0}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Exporter Dataset ({existingQuestions.length} questions)
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Build Tab */}
                    <TabsContent value="build" className="space-y-6">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400">Construire le Dataset Complet</CardTitle>
                                <CardDescription className="text-slate-400">
                                    Génération automatique de ~237 questions via LLM avec recherche web
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-green-400">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="font-semibold">Phases de Construction:</span>
                                    </div>
                                    <ul className="space-y-1 text-slate-300 ml-6 list-disc">
                                        <li>~60 questions standards (MMLU, GSM8K, ARC-Challenge, LogiQA)</li>
                                        <li>~60 questions éthiques (ETHICS, Moral Machine, UNESCO)</li>
                                        <li>~60 questions créatives (Creative Writing, Lateral Thinking)</li>
                                        <li>~57 questions NEURONAS-specific (architecture stress-test)</li>
                                    </ul>
                                </div>

                                <Button
                                    onClick={buildCompleteDataset}
                                    disabled={isLoading}
                                    className="w-full bg-purple-600 hover:bg-purple-700"
                                    size="lg"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Construction en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-5 h-5 mr-2" />
                                            Construire Dataset Complet
                                        </>
                                    )}
                                </Button>

                                {buildProgress && (
                                    <div className={`p-4 rounded-lg border-2 ${
                                        buildProgress.phase === 'complete' ? 'bg-green-900/30 border-green-600' :
                                        buildProgress.phase === 'error' ? 'bg-red-900/30 border-red-600' :
                                        'bg-blue-900/30 border-blue-600'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {buildProgress.phase === 'complete' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
                                             buildProgress.phase === 'error' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                                             <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                                            <span className="text-sm text-white font-medium">
                                                {buildProgress.message}
                                            </span>
                                        </div>
                                        {buildProgress.progress > 0 && buildProgress.progress < 100 && (
                                            <Progress value={buildProgress.progress} className="h-2" />
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Questions Tab */}
                    <TabsContent value="questions">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-green-400 flex items-center justify-between">
                                    <span>Questions Existantes</span>
                                    <Button
                                        onClick={loadData}
                                        variant="ghost"
                                        size="sm"
                                        disabled={isLoading}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[600px]">
                                    <div className="space-y-2">
                                        {existingQuestions.map((q, idx) => (
                                            <div key={q.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <div className="font-medium text-green-300 text-sm">
                                                            {q.question_id}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {q.source_test}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Badge className="text-xs bg-indigo-600">
                                                            {q.question_type}
                                                        </Badge>
                                                        <Badge className="text-xs bg-purple-600">
                                                            {q.niveau_complexite}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-2">
                                                    {q.question_text}
                                                </p>
                                            </div>
                                        ))}

                                        {existingQuestions.length === 0 && (
                                            <div className="text-center py-12">
                                                <Database className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                                <h3 className="text-lg font-semibold text-slate-400 mb-2">
                                                    Aucune Question
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    Utilisez l'onglet "Construire" pour générer le dataset
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}