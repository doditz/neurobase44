import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
    Sparkles, Zap, Brain, Target, FlaskConical, 
    Loader2, CheckCircle2, AlertCircle, Layers,
    Atom, Scale, Lightbulb, Shield, GitMerge
} from 'lucide-react';
import { benchmarkQuestionGenerator } from '@/functions/benchmarkQuestionGenerator';
import { toast } from 'sonner';

const MODES = [
    { value: 'normal', label: 'Normal', icon: Target, desc: 'Questions équilibrées et standards' },
    { value: 'extreme', label: 'Extrême', icon: Zap, desc: 'Paradoxes multi-couches, cas limites' },
    { value: 'component_stress', label: 'Stress Composant', icon: Brain, desc: 'Cible un composant NEURONAS spécifique' },
    { value: 'hybrid', label: 'Hybride', icon: GitMerge, desc: 'Fusionne plusieurs domaines' }
];

const COMPONENTS = [
    { value: 'D3STIB', label: 'D3STIB', desc: 'Filtrage sémantique' },
    { value: 'QRONAS', label: 'QRONAS', desc: 'Routage quantique' },
    { value: 'BRONAS', label: 'BRONAS', desc: 'Validation éthique' },
    { value: 'SMAS', label: 'SMAS', desc: 'Débat multi-agents' },
    { value: 'GC_HARMONIZER', label: 'GC Harmonizer', desc: 'Équilibre hémisphérique' }
];

const DOMAINS = [
    'physics', 'philosophy', 'ethics', 'creativity', 'mathematics',
    'psychology', 'law', 'ai_safety', 'quantum', 'consciousness'
];

const COMPLEXITY_LEVELS = [
    { value: 'simple', label: 'Simple', color: 'bg-green-600' },
    { value: 'modéré', label: 'Modéré', color: 'bg-yellow-600' },
    { value: 'complexe', label: 'Complexe', color: 'bg-orange-600' },
    { value: 'extrême', label: 'Extrême', color: 'bg-red-600' }
];

export default function BenchmarkQuestionCreator({ onQuestionsGenerated }) {
    const [mode, setMode] = useState('normal');
    const [domain, setDomain] = useState('physics');
    const [complexity, setComplexity] = useState('complexe');
    const [count, setCount] = useState(5);
    const [targetComponent, setTargetComponent] = useState('D3STIB');
    const [hybridDomains, setHybridDomains] = useState([]);
    const [targetEntity, setTargetEntity] = useState('BenchmarkQuestion');
    const [useHuggingFace, setUseHuggingFace] = useState(true);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResult, setGenerationResult] = useState(null);
    const [generationLog, setGenerationLog] = useState([]);

    const toggleHybridDomain = (d) => {
        setHybridDomains(prev => 
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
        );
    };

    const handleGenerate = async () => {
        if (mode === 'hybrid' && hybridDomains.length < 2) {
            toast.error('Sélectionnez au moins 2 domaines pour le mode Hybride');
            return;
        }

        setIsGenerating(true);
        setGenerationResult(null);
        setGenerationLog([]);

        try {
            const { data } = await benchmarkQuestionGenerator({
                action: 'generate',
                mode,
                domain,
                complexity,
                count,
                target_component: mode === 'component_stress' ? targetComponent : null,
                hybrid_domains: mode === 'hybrid' ? hybridDomains : [],
                target_entity: targetEntity,
                use_huggingface: useHuggingFace
            });

            setGenerationResult(data);
            setGenerationLog(data.log || []);

            if (data.success) {
                toast.success(`✅ ${data.questions_generated} questions générées!`);
                if (onQuestionsGenerated) onQuestionsGenerated();
            } else {
                toast.error(data.error || 'Erreur de génération');
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedMode = MODES.find(m => m.value === mode);

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Générateur de Questions Benchmark
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Génération hybride HuggingFace + LLM pour tests complets
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Mode Selection */}
                <div>
                    <Label className="text-green-300 mb-3 block">Mode de Génération</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {MODES.map(m => (
                            <Button
                                key={m.value}
                                variant={mode === m.value ? 'default' : 'outline'}
                                onClick={() => setMode(m.value)}
                                className={`flex flex-col h-auto py-3 ${
                                    mode === m.value 
                                        ? 'bg-purple-600 hover:bg-purple-700' 
                                        : 'border-slate-600 hover:border-purple-500'
                                }`}
                                disabled={isGenerating}
                            >
                                <m.icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{m.label}</span>
                            </Button>
                        ))}
                    </div>
                    {selectedMode && (
                        <p className="text-xs text-slate-500 mt-2">{selectedMode.desc}</p>
                    )}
                </div>

                {/* Mode-specific options */}
                <div className="grid md:grid-cols-2 gap-4">
                    {/* Domain (for normal mode) */}
                    {mode === 'normal' && (
                        <div>
                            <Label className="text-green-300 mb-2 block">Domaine</Label>
                            <Select value={domain} onValueChange={setDomain} disabled={isGenerating}>
                                <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {DOMAINS.map(d => (
                                        <SelectItem key={d} value={d} className="capitalize">
                                            {d.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Component (for component_stress mode) */}
                    {mode === 'component_stress' && (
                        <div>
                            <Label className="text-green-300 mb-2 block">Composant Cible</Label>
                            <Select value={targetComponent} onValueChange={setTargetComponent} disabled={isGenerating}>
                                <SelectTrigger className="bg-slate-700 border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {COMPONENTS.map(c => (
                                        <SelectItem key={c.value} value={c.value}>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{c.label}</span>
                                                <span className="text-xs text-slate-500">- {c.desc}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Hybrid domains */}
                    {mode === 'hybrid' && (
                        <div className="md:col-span-2">
                            <Label className="text-green-300 mb-2 block">
                                Domaines à Fusionner (min 2)
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map(d => (
                                    <Badge
                                        key={d}
                                        variant={hybridDomains.includes(d) ? 'default' : 'outline'}
                                        className={`cursor-pointer capitalize ${
                                            hybridDomains.includes(d) 
                                                ? 'bg-purple-600' 
                                                : 'border-slate-600 hover:border-purple-500'
                                        }`}
                                        onClick={() => !isGenerating && toggleHybridDomain(d)}
                                    >
                                        {d.replace('_', ' ')}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Complexity */}
                    <div>
                        <Label className="text-green-300 mb-2 block">Complexité</Label>
                        <Select value={complexity} onValueChange={setComplexity} disabled={isGenerating}>
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {COMPLEXITY_LEVELS.map(c => (
                                    <SelectItem key={c.value} value={c.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${c.color}`} />
                                            {c.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Count */}
                    <div>
                        <Label className="text-green-300 mb-2 block">Nombre de Questions</Label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                            className="bg-slate-700 border-slate-600 text-green-300"
                            disabled={isGenerating}
                        />
                    </div>
                </div>

                {/* Target Entity & Options */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Label className="text-green-300">Entité Cible:</Label>
                        <Select value={targetEntity} onValueChange={setTargetEntity} disabled={isGenerating}>
                            <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="BenchmarkQuestion">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-purple-400" />
                                        Benchmark
                                    </div>
                                </SelectItem>
                                <SelectItem value="DevTestQuestion">
                                    <div className="flex items-center gap-2">
                                        <FlaskConical className="w-4 h-4 text-blue-400" />
                                        DevTest
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="useHF"
                            checked={useHuggingFace}
                            onCheckedChange={setUseHuggingFace}
                            disabled={isGenerating}
                        />
                        <Label htmlFor="useHF" className="text-slate-300 text-sm cursor-pointer">
                            Utiliser HuggingFace (HF_TOKEN)
                        </Label>
                    </div>
                </div>

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    size="lg"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Génération en cours...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Générer {count} Questions ({mode})
                        </>
                    )}
                </Button>

                {/* Results */}
                {generationResult && (
                    <div className={`p-4 rounded-lg border-2 ${
                        generationResult.success 
                            ? 'bg-green-900/20 border-green-600' 
                            : 'bg-red-900/20 border-red-600'
                    }`}>
                        <div className="flex items-center gap-2 mb-3">
                            {generationResult.success ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                            )}
                            <span className="font-medium text-white">
                                {generationResult.success 
                                    ? `${generationResult.questions_generated} questions générées!` 
                                    : 'Erreur de génération'}
                            </span>
                        </div>

                        {/* Log */}
                        {generationLog.length > 0 && (
                            <ScrollArea className="h-32 bg-slate-900 rounded p-2 mb-3">
                                <pre className="text-xs text-slate-400 font-mono">
                                    {generationLog.join('\n')}
                                </pre>
                            </ScrollArea>
                        )}

                        {/* Preview questions */}
                        {generationResult.questions && generationResult.questions.length > 0 && (
                            <div>
                                <Label className="text-green-300 text-sm mb-2 block">
                                    Aperçu des Questions Générées:
                                </Label>
                                <ScrollArea className="h-48">
                                    <div className="space-y-2">
                                        {generationResult.questions.slice(0, 5).map((q, idx) => (
                                            <div key={idx} className="bg-slate-800 rounded p-2 border border-slate-700">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {q.question_id}
                                                    </Badge>
                                                    <Badge className={
                                                        q.niveau_complexite === 'extrême' ? 'bg-red-600' :
                                                        q.niveau_complexite === 'complexe' ? 'bg-orange-600' :
                                                        'bg-yellow-600'
                                                    }>
                                                        {q.niveau_complexite}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-slate-300 line-clamp-2">
                                                    {q.question_text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}