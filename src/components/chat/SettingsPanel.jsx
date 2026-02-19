import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Thermometer, Users, Scale, Shield, MessageSquare, Target, RotateCcw, Zap, DollarSign, Clock, Database, Sparkles, Pen } from 'lucide-react';

const RESPONSE_STYLES = {
    balanced: {
        label: 'Équilibré',
        icon: '⚖️',
        description: 'Ton naturel et adaptatif',
        color: 'bg-blue-100 text-blue-800'
    },
    formal: {
        label: 'Formel',
        icon: '🎩',
        description: 'Professionnel et structuré',
        color: 'bg-slate-100 text-slate-800'
    },
    creative: {
        label: 'Créatif',
        icon: '🎨',
        description: 'Expressif et imaginatif',
        color: 'bg-purple-100 text-purple-800'
    },
    concise: {
        label: 'Concis',
        icon: '⚡',
        description: 'Direct et synthétique',
        color: 'bg-green-100 text-green-800'
    },
    pedagogical: {
        label: 'Pédagogique',
        icon: '📚',
        description: 'Explicatif avec exemples',
        color: 'bg-amber-100 text-amber-800'
    },
    socratic: {
        label: 'Socratique',
        icon: '🤔',
        description: 'Questionne pour approfondir',
        color: 'bg-cyan-100 text-cyan-800'
    }
};

const MODES = {
    eco: {
        label: 'Eco',
        icon: '💰',
        color: 'bg-green-100 text-green-800',
        description: 'Rapide et économique',
        maxPersonas: 3,
        debateRounds: 3,
        temperature: 0.6,
        estimatedCost: 'Faible (~$0.01-0.05)',
        estimatedTime: '3-5s'
    },
    balanced: {
        label: 'Balanced',
        icon: '⚖️',
        color: 'bg-blue-100 text-blue-800',
        description: 'Équilibre qualité/coût',
        maxPersonas: 5,
        debateRounds: 5,
        temperature: 0.7,
        estimatedCost: 'Modéré (~$0.05-0.15)',
        estimatedTime: '10-15s'
    },
    premium: {
        label: 'Premium',
        icon: '💎',
        color: 'bg-purple-100 text-purple-800',
        description: 'Qualité maximale',
        maxPersonas: 12,
        debateRounds: 30,
        temperature: 0.85,
        estimatedCost: 'Élevé (~$0.15-0.50)',
        estimatedTime: '30-60s'
    }
};

export default function SettingsPanel({ settings, onSettingsChange }) {
    const currentMode = MODES[settings.mode] || MODES.balanced;

    const [enableExternalKnowledge, setEnableExternalKnowledge] = useState(settings.enableExternalKnowledge !== false);
    const [enableSarcasmDetection, setEnableSarcasmDetection] = useState(settings.enableSarcasmDetection || false);
    const [sarcasmSensitivity, setSarcasmSensitivity] = useState(settings.sarcasm_sensitivity || 'medium');
    const [responseStyle, setResponseStyle] = useState(settings.responseStyle || 'balanced');

    const handleModeChange = (mode) => {
        const modeConfig = MODES[mode];
        onSettingsChange({
            ...settings,
            mode,
            maxPersonas: modeConfig.maxPersonas,
            debateRounds: modeConfig.debateRounds,
            temperature: modeConfig.temperature
        });
    };

    const handleReset = () => {
        setResponseStyle('balanced');
        onSettingsChange({
            temperature: 0.7,
            selectedPersonas: [],
            hemisphereMode: 'balanced',
            d2Modulation: 0.65,
            ethicalConstraints: 'medium',
            debateRounds: 5,
            consensusThreshold: 0.85,
            maxPersonas: 5,
            mode: 'balanced',
            enableExternalKnowledge: false,
            enableSarcasmDetection: false,
            sarcasm_sensitivity: 'medium',
            responseStyle: 'balanced'
        });
    };

    const handleResponseStyleChange = (style) => {
        setResponseStyle(style);
        onSettingsChange({ ...settings, responseStyle: style });
    };

    const handleExternalKnowledgeChange = (checked) => {
        setEnableExternalKnowledge(checked);
        onSettingsChange({ ...settings, enableExternalKnowledge: checked });
    };

    const hemisphereOptions = [
        { value: 'left', label: 'Analytical', icon: '🧠', description: 'Logical reasoning' },
        { value: 'right', label: 'Creative', icon: '🎨', description: 'Intuitive thinking' },
        { value: 'balanced', label: 'Balanced', icon: '⚖️', description: 'Mixed approach' }
    ];

    const ethicalLevels = [
        { value: 'low', label: 'Low', description: 'Minimal constraints' },
        { value: 'medium', label: 'Medium', description: 'Standard oversight' },
        { value: 'high', label: 'High', description: 'Strict guidelines' }
    ];

    return (
        <div className="p-4 space-y-6 bg-slate-800">
            {/* Reset Button */}
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-green-300">Configuration</h3>
                <Button variant="ghost" size="sm" onClick={handleReset} className="text-green-400 hover:text-green-300 h-7 px-2 text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                </Button>
            </div>

            {/* Mode Selection */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <label className="text-sm font-medium text-green-300">Mode de Performance</label>
                </div>
                
                <div className="space-y-2">
                    {Object.entries(MODES).map(([key, mode]) => (
                        <button
                            key={key}
                            onClick={() => handleModeChange(key)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                settings.mode === key
                                    ? 'border-orange-600 bg-orange-900/20'
                                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{mode.icon}</span>
                                    <div>
                                        <h4 className="font-semibold text-green-300">{mode.label}</h4>
                                        <p className="text-xs text-slate-400">{mode.description}</p>
                                    </div>
                                </div>
                                {settings.mode === key && (
                                    <Badge className="bg-orange-600">Actif</Badge>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-800 rounded p-2">
                                    <div className="text-slate-500">Personas</div>
                                    <div className="font-medium text-green-400">{mode.maxPersonas}</div>
                                </div>
                                <div className="bg-slate-800 rounded p-2">
                                    <div className="text-slate-500">Rondes</div>
                                    <div className="font-medium text-green-400">{mode.debateRounds}</div>
                                </div>
                                <div className="bg-slate-800 rounded p-2">
                                    <div className="text-slate-500 flex items-center gap-1">
                                        <DollarSign className="w-3 h-3" />
                                        Coût
                                    </div>
                                    <div className="font-medium text-green-400">{mode.estimatedCost}</div>
                                </div>
                                <div className="bg-slate-800 rounded p-2">
                                    <div className="text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Temps
                                    </div>
                                    <div className="font-medium text-green-400">{mode.estimatedTime}</div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Response Style Selection */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Pen className="w-4 h-4 text-orange-500" />
                    <label className="text-sm font-medium text-green-300">Style de Réponse</label>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries(RESPONSE_STYLES).map(([key, style]) => (
                        <button
                            key={key}
                            onClick={() => handleResponseStyleChange(key)}
                            className={`text-left p-2 rounded-lg border-2 transition-all ${
                                responseStyle === key
                                    ? 'border-orange-600 bg-orange-900/20'
                                    : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{style.icon}</span>
                                <div>
                                    <h4 className="text-xs font-semibold text-green-300">{style.label}</h4>
                                    <p className="text-[10px] text-slate-400">{style.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                
                {responseStyle && responseStyle !== 'balanced' && (
                    <div className="bg-orange-900/20 border border-orange-600/30 rounded p-2 text-xs text-orange-300">
                        <strong>Style actif:</strong> {RESPONSE_STYLES[responseStyle]?.label} - L'IA adaptera son ton et sa structure.
                    </div>
                )}
            </div>

            {/* NEW: External Knowledge Settings */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-green-300 flex items-center gap-2">
                        <Database className="w-4 h-4 text-orange-500" />
                        Sources Externes
                    </h3>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-green-300">
                                Bases de Connaissances
                            </label>
                            <p className="text-xs text-slate-400 mt-1">
                                Activer la recherche dans Wikipedia, arXiv, GitHub, etc.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={enableExternalKnowledge}
                            onChange={(e) => handleExternalKnowledgeChange(e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500 bg-slate-900 border-slate-500"
                        />
                    </div>
                    
                    {enableExternalKnowledge && (
                        <div className="bg-blue-900/20 border border-blue-600/30 rounded p-3 text-xs text-blue-300">
                            <p className="mb-1">
                                <strong>Sources disponibles:</strong>
                            </p>
                            <ul className="space-y-1 ml-4 list-disc">
                                <li><strong>Wikipedia:</strong> Contexte encyclopédique</li>
                                <li><strong>arXiv:</strong> Articles scientifiques</li>
                                <li><strong>GitHub:</strong> Code et projets open-source</li>
                                <li><strong>CrossRef:</strong> Publications académiques</li>
                                <li><strong>DBpedia:</strong> Données structurées</li>
                            </ul>
                            <p className="mt-2 italic">
                                Toutes gratuites et anonymes (sans compte requis)
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sarcasm Detection Settings */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-green-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-orange-500" />
                        Tone & Sarcasm Detection
                    </h3>
                </div>
                
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
                        <div className="flex-1">
                            <label className="text-sm font-medium text-green-300">
                                Enable Sarcasm Detection
                            </label>
                            <p className="text-xs text-slate-400 mt-1">
                                AI detects sarcasm, irony, and nuanced communication
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={enableSarcasmDetection}
                            onChange={(e) => {
                                setEnableSarcasmDetection(e.target.checked);
                                onSettingsChange({ 
                                    ...settings, 
                                    enableSarcasmDetection: e.target.checked 
                                });
                            }}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500 bg-slate-900 border-slate-500"
                        />
                    </div>
                    
                    {enableSarcasmDetection && (
                        <div className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                            <label className="text-sm font-medium text-green-300 mb-2 block">
                                Detection Sensitivity
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {['low', 'medium', 'high'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            setSarcasmSensitivity(level);
                                            onSettingsChange({ 
                                                ...settings, 
                                                sarcasm_sensitivity: level 
                                            });
                                        }}
                                        className={`px-3 py-2 rounded text-xs font-medium transition-all ${
                                            sarcasmSensitivity === level
                                                ? 'bg-orange-600 text-white'
                                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                        }`}
                                    >
                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {sarcasmSensitivity === 'low' && 'Only obvious sarcasm'}
                                {sarcasmSensitivity === 'medium' && 'Clear sarcasm and irony'}
                                {sarcasmSensitivity === 'high' && 'Subtle hints and nuances'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Settings - Only show if not in preset mode or for fine-tuning */}
            <div className="pt-4 border-t border-slate-700">
                <h4 className="text-xs font-medium text-green-300 mb-3">Personnalisation Avancée</h4>

                {/* Temperature */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Thermometer className="w-4 h-4 text-orange-500" />
                            <label className="text-sm font-medium text-green-300">Temperature</label>
                        </div>
                        <span className="text-sm font-mono text-orange-400">{settings.temperature}</span>
                    </div>
                    <Slider
                        value={[settings.temperature]}
                        onValueChange={([value]) => onSettingsChange({ ...settings, temperature: value })}
                        max={1}
                        min={0}
                        step={0.1}
                        className="w-full"
                    />
                </div>

                {/* Hemisphere Mode */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-orange-500" />
                        <label className="text-sm font-medium text-green-300">Hemisphere</label>
                    </div>
                    <Select 
                        value={settings.hemisphereMode} 
                        onValueChange={(value) => onSettingsChange({ ...settings, hemisphereMode: value })}
                    >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                            {hemisphereOptions.map(option => (
                                <SelectItem key={option.value} value={option.value} className="text-green-300 hover:bg-slate-700">
                                    <div className="flex items-center gap-2">
                                        <span>{option.icon}</span>
                                        <div>
                                            <div>{option.label}</div>
                                            <div className="text-xs text-slate-400">{option.description}</div>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* D2 Modulation */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Scale className="w-4 h-4 text-orange-500" />
                            <label className="text-sm font-medium text-green-300">D2 Modulation</label>
                        </div>
                        <span className="text-sm font-mono text-orange-400">{settings.d2Modulation}</span>
                    </div>
                    <Slider
                        value={[settings.d2Modulation]}
                        onValueChange={([value]) => onSettingsChange({ ...settings, d2Modulation: value })}
                        max={1}
                        min={0}
                        step={0.05}
                        className="w-full"
                    />
                </div>

                {/* Ethical Constraints */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-500" />
                        <label className="text-sm font-medium text-green-300">Ethical Constraints</label>
                    </div>
                    <Select 
                        value={settings.ethicalConstraints} 
                        onValueChange={(value) => onSettingsChange({ ...settings, ethicalConstraints: value })}
                    >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-green-300 h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                            {ethicalLevels.map(level => (
                                <SelectItem key={level.value} value={level.value} className="text-green-300 hover:bg-slate-700">
                                    <div>
                                        <div className="capitalize">{level.label}</div>
                                        <div className="text-xs text-slate-400">{level.description}</div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Consensus Threshold */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-orange-500" />
                            <label className="text-sm font-medium text-green-300">Consensus</label>
                        </div>
                        <span className="text-sm font-mono text-orange-400">{Math.round(settings.consensusThreshold * 100)}%</span>
                    </div>
                    <Slider
                        value={[settings.consensusThreshold]}
                        onValueChange={([value]) => onSettingsChange({ ...settings, consensusThreshold: value })}
                        max={1}
                        min={0.5}
                        step={0.05}
                        className="w-full"
                    />
                </div>
            </div>
        </div>
    );
}