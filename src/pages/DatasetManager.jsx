import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Database, RefreshCw, Loader2, CheckCircle2, AlertCircle, 
    Target, FlaskConical, Trash2, Download, Upload, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import BenchmarkQuestionCreator from '@/components/benchmark/BenchmarkQuestionCreator';

export default function DatasetManager() {
    const [benchmarkQuestions, setBenchmarkQuestions] = useState([]);
    const [devtestQuestions, setDevtestQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [populating, setPopulating] = useState(false);
    const [populationLog, setPopulationLog] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [benchmark, devtest] = await Promise.all([
                base44.entities.BenchmarkQuestion.list('-created_date', 500),
                base44.entities.DevTestQuestion.list('-created_date', 500)
            ]);
            
            // Dédupliquer par question_id
            const dedupeByQuestionId = (questions) => {
                const seen = new Set();
                return questions.filter(q => {
                    const qid = q.question_id;
                    if (seen.has(qid)) return false;
                    seen.add(qid);
                    return true;
                });
            };
            
            setBenchmarkQuestions(dedupeByQuestionId(benchmark));
            setDevtestQuestions(dedupeByQuestionId(devtest));
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const populateDatasets = async (action = 'populate_all', forceRefresh = false) => {
        setPopulating(true);
        setPopulationLog([]);
        
        try {
            toast.info('Population des datasets en cours...');
            
            const { data } = await base44.functions.invoke('populateDatasets', {
                action,
                force_refresh: forceRefresh
            });

            if (data.success) {
                setPopulationLog(data.log || []);
                toast.success(`✅ ${data.benchmark_questions_created} Benchmark + ${data.devtest_questions_created} DevTest questions créées!`);
                await loadData();
            } else {
                toast.error(data.error || 'Erreur de population');
            }
        } catch (error) {
            console.error('Population error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setPopulating(false);
        }
    };

    const exportDataset = (type) => {
        const data = type === 'benchmark' ? benchmarkQuestions : devtestQuestions;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_questions_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Export ${type} terminé`);
    };

    const clearDataset = async (type) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer toutes les questions ${type}?`)) return;
        
        setLoading(true);
        try {
            const questions = type === 'benchmark' ? benchmarkQuestions : devtestQuestions;
            const entity = type === 'benchmark' ? 'BenchmarkQuestion' : 'DevTestQuestion';
            
            for (const q of questions) {
                await base44.entities[entity].delete(q.id);
            }
            
            toast.success(`${questions.length} questions ${type} supprimées`);
            await loadData();
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const QuestionCard = ({ question, type }) => (
        <Card className="bg-slate-700 border-slate-600">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <Badge className={type === 'benchmark' ? 'bg-purple-600' : 'bg-blue-600'}>
                        {question.question_id}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {question.niveau_complexite}
                    </Badge>
                </div>
                <CardTitle className="text-sm text-green-300 mt-2">
                    {question.question_text?.substring(0, 100)}...
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">{question.question_type}</Badge>
                    <Badge variant="outline" className="text-xs">{question.hemisphere_dominant}</Badge>
                    {question.facettes_principales?.slice(0, 2).map((f, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-green-300">Dataset Manager</h1>
                            <p className="text-slate-400 text-sm">Gestion des questions Benchmark & DevTest</p>
                        </div>
                    </div>
                    <Button 
                        onClick={loadData} 
                        variant="outline" 
                        disabled={loading}
                        className="border-green-600 text-green-400"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Rafraîchir
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-slate-400">Benchmark Questions</span>
                            </div>
                            <p className="text-3xl font-bold text-purple-400">{benchmarkQuestions.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <FlaskConical className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">DevTest Questions</span>
                            </div>
                            <p className="text-3xl font-bold text-blue-400">{devtestQuestions.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-slate-400">Total Questions</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">
                                {benchmarkQuestions.length + devtestQuestions.length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 mb-2">
                                {benchmarkQuestions.length > 0 && devtestQuestions.length > 0 ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 text-orange-400" />
                                )}
                                <span className="text-sm text-slate-400">Status</span>
                            </div>
                            <p className="text-lg font-bold text-slate-300">
                                {benchmarkQuestions.length > 0 && devtestQuestions.length > 0 
                                    ? 'Datasets Ready' 
                                    : 'Needs Population'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-300">Actions</CardTitle>
                        <CardDescription className="text-slate-400">
                            Populer, exporter ou réinitialiser les datasets
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={() => populateDatasets('populate_all', false)}
                                disabled={populating}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {populating ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                )}
                                Populer Datasets (si vide)
                            </Button>
                            <Button
                                onClick={() => populateDatasets('populate_all', true)}
                                disabled={populating}
                                variant="outline"
                                className="border-orange-600 text-orange-400"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Force Refresh (Tout Remplacer)
                            </Button>
                            <Button
                                onClick={() => exportDataset('benchmark')}
                                variant="outline"
                                className="border-purple-600 text-purple-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Benchmark
                            </Button>
                            <Button
                                onClick={() => exportDataset('devtest')}
                                variant="outline"
                                className="border-blue-600 text-blue-400"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export DevTest
                            </Button>
                            <Button
                                onClick={() => clearDataset('benchmark')}
                                variant="outline"
                                className="border-red-600 text-red-400"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear Benchmark
                            </Button>
                            <Button
                                onClick={() => clearDataset('devtest')}
                                variant="outline"
                                className="border-red-600 text-red-400"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Clear DevTest
                            </Button>
                        </div>

                        {/* Population Log */}
                        {populationLog.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-green-400 mb-2">Log de Population:</h4>
                                <ScrollArea className="h-32 bg-slate-900 rounded-lg p-3 border border-slate-700">
                                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                                        {populationLog.join('\n')}
                                    </pre>
                                </ScrollArea>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Questions Tabs */}
                <Tabs defaultValue="benchmark" className="space-y-4">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="benchmark" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Target className="w-4 h-4 mr-2" />
                            Benchmark ({benchmarkQuestions.length})
                        </TabsTrigger>
                        <TabsTrigger value="devtest" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
                            <FlaskConical className="w-4 h-4 mr-2" />
                            DevTest ({devtestQuestions.length})
                        </TabsTrigger>
                        <TabsTrigger value="generator" className="data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-400">
                            <Sparkles className="w-4 h-4 mr-2" />
                            Générateur AI
                        </TabsTrigger>
                        </TabsList>

                    <TabsContent value="benchmark">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                            </div>
                        ) : benchmarkQuestions.length === 0 ? (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardContent className="p-12 text-center">
                                    <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-400 mb-2">
                                        Aucune Question Benchmark
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Cliquez sur "Populer Datasets" pour ajouter les questions
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <ScrollArea className="h-[600px]">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                                    {benchmarkQuestions.map((q) => (
                                        <QuestionCard key={q.id} question={q} type="benchmark" />
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </TabsContent>

                    <TabsContent value="devtest">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                            </div>
                        ) : devtestQuestions.length === 0 ? (
                            <Card className="bg-slate-800 border-slate-700">
                                <CardContent className="p-12 text-center">
                                    <FlaskConical className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-400 mb-2">
                                        Aucune Question DevTest
                                    </h3>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Cliquez sur "Populer Datasets" pour ajouter les questions
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <ScrollArea className="h-[600px]">
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
                                    {devtestQuestions.map((q) => (
                                        <QuestionCard key={q.id} question={q} type="devtest" />
                                    ))}
                                </div>
                            </ScrollArea>
                            )}
                            </TabsContent>

                            <TabsContent value="generator">
                            <BenchmarkQuestionCreator onQuestionsGenerated={loadData} />
                            </TabsContent>
                            </Tabs>
                            </div>
                            </div>
    );
}