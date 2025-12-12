import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    Brain, Database, TrendingUp, Cpu, Zap, Shield,
    Trash2, RefreshCw, Loader2, ChevronDown, ChevronRight,
    BarChart3, Lock, Unlock
} from 'lucide-react';
import { toast } from 'sonner';

export default function MemoryExplorerPage() {
    const [user, setUser] = useState(null);
    const [memories, setMemories] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTier, setSelectedTier] = useState('all');
    const [selectedHemisphere, setSelectedHemisphere] = useState('all');
    const [expandedMemory, setExpandedMemory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (user) {
            loadMemories();
        }
    }, [user, selectedTier, selectedHemisphere]);

    const loadUser = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to load user:', error);
        }
    };

    const loadMemories = async () => {
        setIsLoading(true);
        try {
            let query = {};
            
            if (selectedTier !== 'all') {
                query.tier_level = parseInt(selectedTier);
            }
            
            if (selectedHemisphere !== 'all') {
                query.hemisphere = selectedHemisphere;
            }

            const results = await base44.entities.UserMemory.filter(query, '-d2_modulation', 100);
            setMemories(results);
        } catch (error) {
            console.error('Failed to load memories:', error);
            toast.error('Erreur de chargement');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePromoteMemory = async (memoryId) => {
        try {
            const { data } = await base44.functions.invoke('memoryTierPromotion', {
                auto_promote: true
            });
            
            toast.success(`${data.promotions} mémoire(s) promue(s)`);
            loadMemories();
        } catch (error) {
            toast.error('Erreur de promotion');
        }
    };

    const handleToggleProtection = async (memory) => {
        try {
            await base44.entities.UserMemory.update(memory.id, {
                pruning_protection: !memory.pruning_protection
            });
            
            toast.success(memory.pruning_protection ? 'Protection désactivée' : 'Protection activée');
            loadMemories();
        } catch (error) {
            toast.error('Erreur');
        }
    };

    const handleDeleteMemory = async (memoryId) => {
        if (!confirm('Supprimer cette mémoire?')) return;
        
        try {
            await base44.entities.UserMemory.delete(memoryId);
            toast.success('Mémoire supprimée');
            loadMemories();
        } catch (error) {
            toast.error('Erreur de suppression');
        }
    };

    const filteredMemories = memories.filter(m => {
        if (!searchTerm) return true;
        return m.memory_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
               m.memory_key.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Group by tier
    const tierGroups = {
        L1: filteredMemories.filter(m => m.source_database_tier === 'L1'),
        R1: filteredMemories.filter(m => m.source_database_tier === 'R1'),
        L2: filteredMemories.filter(m => m.source_database_tier === 'L2'),
        R2: filteredMemories.filter(m => m.source_database_tier === 'R2'),
        L3: filteredMemories.filter(m => m.source_database_tier === 'L3'),
        R3: filteredMemories.filter(m => m.source_database_tier === 'R3'),
        GC: filteredMemories.filter(m => m.source_database_tier === 'GC')
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-green-400 flex items-center gap-3">
                            <Brain className="w-8 h-8" />
                            Neuronas 7-DB Memory Explorer
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {filteredMemories.length} mémoires actives
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handlePromoteMemory()}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Auto-Promotion
                        </Button>
                        <Button
                            onClick={loadMemories}
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                        <Input
                            placeholder="Rechercher mémoires..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-900 border-slate-600 text-slate-200"
                        />
                    </CardContent>
                </Card>

                {/* Tier Statistics */}
                <div className="grid grid-cols-7 gap-2">
                    {Object.entries(tierGroups).map(([tier, mems]) => (
                        <Card key={tier} className={`bg-slate-800 border-slate-700 ${
                            tier.startsWith('L') ? 'border-l-4 border-l-blue-500' :
                            tier.startsWith('R') ? 'border-l-4 border-l-purple-500' :
                            'border-l-4 border-l-green-500'
                        }`}>
                            <CardContent className="p-3">
                                <div className="text-xs text-slate-400">{tier}</div>
                                <div className="text-2xl font-bold text-green-400">{mems.length}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {tier.includes('1') ? 'NVMe' : tier.includes('2') ? 'RAM' : tier === 'GC' ? 'Core' : 'RAID'}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Memory List */}
                <div className="space-y-2">
                    {isLoading ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-green-400 mx-auto" />
                        </div>
                    ) : filteredMemories.length === 0 ? (
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-12 text-center">
                                <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400">Aucune mémoire trouvée</p>
                            </CardContent>
                        </Card>
                    ) : (
                        filteredMemories.map((memory) => (
                            <Card key={memory.id} className="bg-slate-800 border-slate-700 hover:border-green-600 transition-colors">
                                <CardContent className="p-4">
                                    <button
                                        onClick={() => setExpandedMemory(expandedMemory === memory.id ? null : memory.id)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                {expandedMemory === memory.id ? (
                                                    <ChevronDown className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                                                )}
                                                
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <Badge className={
                                                            memory.source_database_tier?.startsWith('L') ? 'bg-blue-900/50 text-blue-400' :
                                                            memory.source_database_tier?.startsWith('R') ? 'bg-purple-900/50 text-purple-400' :
                                                            'bg-green-900/50 text-green-400'
                                                        }>
                                                            {memory.source_database_tier || `T${memory.tier_level}`}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {memory.hemisphere}
                                                        </Badge>
                                                        <Badge variant="outline" className="font-mono">
                                                            D2: {(memory.d2_modulation || 0.5).toFixed(2)}
                                                        </Badge>
                                                        {memory.omega_t !== undefined && (
                                                            <Badge variant="outline" className="font-mono">
                                                                Ω: {memory.omega_t.toFixed(2)}
                                                            </Badge>
                                                        )}
                                                        {memory.compression_type && (
                                                            <Badge className="bg-slate-700 text-slate-300">
                                                                {memory.compression_type}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    
                                                    <p className="text-sm text-slate-300 line-clamp-2">
                                                        {memory.memory_content}
                                                    </p>
                                                    
                                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                        <span>Accès: {memory.access_count || 0}</span>
                                                        {memory.importance_score && (
                                                            <span>Importance: {(memory.importance_score * 100).toFixed(0)}%</span>
                                                        )}
                                                        {memory.semantic_hash && (
                                                            <span className="font-mono">Hash: {memory.semantic_hash}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleProtection(memory);
                                                    }}
                                                    className="w-8 h-8"
                                                >
                                                    {memory.pruning_protection ? (
                                                        <Lock className="w-4 h-4 text-green-400" />
                                                    ) : (
                                                        <Unlock className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteMemory(memory.id);
                                                    }}
                                                    className="w-8 h-8 text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </button>
                                    
                                    {expandedMemory === memory.id && (
                                        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Contenu Complet:</div>
                                                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                                                    {memory.memory_content}
                                                </p>
                                            </div>
                                            
                                            {memory.context && (
                                                <div>
                                                    <div className="text-xs text-slate-500 mb-1">Contexte:</div>
                                                    <p className="text-xs text-slate-400">{memory.context}</p>
                                                </div>
                                            )}
                                            
                                            <div className="grid grid-cols-3 gap-3 text-xs">
                                                <div className="bg-slate-900 p-2 rounded">
                                                    <div className="text-slate-500">Tier Level</div>
                                                    <div className="text-green-400 font-semibold">{memory.tier_level}</div>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded">
                                                    <div className="text-slate-500">Decay Factor</div>
                                                    <div className="text-green-400 font-mono">{(memory.decay_factor || 0.995).toFixed(3)}</div>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded">
                                                    <div className="text-slate-500">Push/Pull Priority</div>
                                                    <div className="text-green-400">{memory.push_pull_priority || 5}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}