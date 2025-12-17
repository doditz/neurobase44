import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Brain, Sparkles, Save, TestTube } from 'lucide-react';
import { toast } from 'sonner';

export default function HuggingFaceSettings() {
    const [settings, setSettings] = useState({
        enable_hf_sentiment: false,
        enable_hf_embeddings: false,
        hf_sentiment_model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
        hf_embedding_model: 'sentence-transformers/all-MiniLM-L6-v2'
    });
    const [testing, setTesting] = useState(false);
    const [testResults, setTestResults] = useState(null);

    const presetModels = {
        sentiment: [
            { id: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english', name: 'DistilBERT SST-2 (Fast)', free: true },
            { id: 'cardiffnlp/twitter-roberta-base-sentiment', name: 'Twitter RoBERTa (Social)', free: true }
        ],
        embeddings: [
            { id: 'sentence-transformers/all-MiniLM-L6-v2', name: 'all-MiniLM-L6-v2 (Fast)', free: true },
            { id: 'sentence-transformers/all-mpnet-base-v2', name: 'all-mpnet-base-v2 (Quality)', free: true }
        ]
    };

    const saveSettings = async () => {
        try {
            localStorage.setItem('hf_settings', JSON.stringify(settings));
            toast.success('Settings saved successfully');
        } catch (error) {
            toast.error('Failed to save settings');
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem('hf_settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, []);

    const testSentiment = async () => {
        setTesting(true);
        setTestResults(null);
        try {
            const { data } = await base44.functions.invoke('huggingFaceSentiment', {
                text: 'This is amazing! Neuronas AI is incredible.',
                model: settings.hf_sentiment_model
            });
            setTestResults({ type: 'sentiment', ...data });
            toast.success('Sentiment test completed');
        } catch (error) {
            toast.error(`Test failed: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    const testEmbeddings = async () => {
        setTesting(true);
        setTestResults(null);
        try {
            const { data } = await base44.functions.invoke('huggingFaceEmbeddings', {
                text: 'Neuronas AI cognitive architecture',
                model: settings.hf_embedding_model
            });
            setTestResults({ type: 'embeddings', ...data });
            toast.success('Embeddings test completed');
        } catch (error) {
            toast.error(`Test failed: ${error.message}`);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-green-400 flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Hugging Face Integration Settings
                        </CardTitle>
                        <p className="text-sm text-slate-400 mt-2">
                            Configure HF models for enhanced semantic analysis
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Sentiment Analysis */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-200 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                    Enable HF Sentiment Analysis
                                </Label>
                                <Switch
                                    checked={settings.enable_hf_sentiment}
                                    onCheckedChange={(checked) => 
                                        setSettings({...settings, enable_hf_sentiment: checked})
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Sentiment Model</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={settings.hf_sentiment_model}
                                        onChange={(e) => setSettings({...settings, hf_sentiment_model: e.target.value})}
                                        className="bg-slate-900 text-slate-200 border-slate-600"
                                        disabled={!settings.enable_hf_sentiment}
                                    />
                                    <Button 
                                        onClick={testSentiment}
                                        disabled={testing || !settings.enable_hf_sentiment}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <TestTube className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {presetModels.sentiment.map(model => (
                                        <Badge
                                            key={model.id}
                                            className="cursor-pointer bg-purple-900 hover:bg-purple-800"
                                            onClick={() => setSettings({...settings, hf_sentiment_model: model.id})}
                                        >
                                            {model.name} {model.free && '✓'}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Embeddings */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-slate-200 flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-cyan-400" />
                                    Enable HF Embeddings
                                </Label>
                                <Switch
                                    checked={settings.enable_hf_embeddings}
                                    onCheckedChange={(checked) => 
                                        setSettings({...settings, enable_hf_embeddings: checked})
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-400">Embedding Model</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={settings.hf_embedding_model}
                                        onChange={(e) => setSettings({...settings, hf_embedding_model: e.target.value})}
                                        className="bg-slate-900 text-slate-200 border-slate-600"
                                        disabled={!settings.enable_hf_embeddings}
                                    />
                                    <Button 
                                        onClick={testEmbeddings}
                                        disabled={testing || !settings.enable_hf_embeddings}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <TestTube className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {presetModels.embeddings.map(model => (
                                        <Badge
                                            key={model.id}
                                            className="cursor-pointer bg-cyan-900 hover:bg-cyan-800"
                                            onClick={() => setSettings({...settings, hf_embedding_model: model.id})}
                                        >
                                            {model.name} {model.free && '✓'}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Button 
                            onClick={saveSettings}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </Button>
                    </CardContent>
                </Card>

                {testResults && (
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-orange-400">Test Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="text-sm text-slate-300">
                                    <span className="text-slate-500">Type:</span> {testResults.type}
                                </div>
                                {testResults.type === 'sentiment' && (
                                    <>
                                        <div className="text-sm text-slate-300">
                                            <span className="text-slate-500">Sentiment:</span> {testResults.sentiment}
                                        </div>
                                        <div className="text-sm text-slate-300">
                                            <span className="text-slate-500">Score:</span> {testResults.score?.toFixed(4)}
                                        </div>
                                    </>
                                )}
                                {testResults.type === 'embeddings' && (
                                    <>
                                        <div className="text-sm text-slate-300">
                                            <span className="text-slate-500">Embedding Length:</span> {testResults.embedding?.length}
                                        </div>
                                        <div className="text-xs text-slate-500 font-mono max-h-20 overflow-y-auto">
                                            {testResults.embedding?.slice(0, 10).map(v => v.toFixed(4)).join(', ')}...
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}