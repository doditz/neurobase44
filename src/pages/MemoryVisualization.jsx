import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, GitBranch, Zap, Activity, RefreshCw, Loader2 } from 'lucide-react';
import MemoryGraph from '../components/memory/MemoryGraph';
import MemoryTierStats from '../components/memory/MemoryTierStats';
import MemoryPathwayExplorer from '../components/memory/MemoryPathwayExplorer';

export default function MemoryVisualization() {
    const [memories, setMemories] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('graph');

    useEffect(() => {
        loadMemories();
    }, []);

    const loadMemories = async () => {
        setLoading(true);
        try {
            const allMemories = await base44.entities.UserMemory.list();
            setMemories(allMemories);
            calculateStats(allMemories);
        } catch (error) {
            console.error('Failed to load memories:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (mems) => {
        const tierCounts = {
            L1: mems.filter(m => m.tier_level === 1 && m.hemisphere === 'left').length,
            L2: mems.filter(m => m.tier_level === 2 && m.hemisphere === 'left').length,
            L3: mems.filter(m => m.tier_level === 3 && m.hemisphere === 'left').length,
            R1: mems.filter(m => m.tier_level === 1 && m.hemisphere === 'right').length,
            R2: mems.filter(m => m.tier_level === 2 && m.hemisphere === 'right').length,
            R3: mems.filter(m => m.tier_level === 3 && m.hemisphere === 'right').length,
            GC: mems.filter(m => m.hemisphere === 'central').length
        };

        const avgD2 = mems.reduce((sum, m) => sum + (m.d2_modulation || 0.5), 0) / mems.length;
        const avgImportance = mems.reduce((sum, m) => sum + (m.importance_score || 0.5), 0) / mems.length;
        const avgFlux = mems.reduce((sum, m) => sum + (m.flux_integral || 0), 0) / mems.length;

        setStats({
            tierCounts,
            total: mems.length,
            avgD2,
            avgImportance,
            avgFlux,
            leftHemisphere: tierCounts.L1 + tierCounts.L2 + tierCounts.L3,
            rightHemisphere: tierCounts.R1 + tierCounts.R2 + tierCounts.R3
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-green-400">Memory Architecture Visualization</h1>
                            <p className="text-sm text-slate-400">7-Tier Cognitive Memory System</p>
                        </div>
                    </div>
                    <Button onClick={loadMemories} variant="outline" className="border-slate-600 text-slate-300">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">Total Memories</div>
                            <div className="text-2xl font-bold text-green-400">{stats?.total || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">Avg D2 Modulation</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {stats?.avgD2?.toFixed(3) || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">Avg Importance</div>
                            <div className="text-2xl font-bold text-orange-400">
                                {stats?.avgImportance?.toFixed(3) || 0}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">Left Hemisphere</div>
                            <div className="text-2xl font-bold text-purple-400">{stats?.leftHemisphere || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-4">
                            <div className="text-xs text-slate-400 mb-1">Right Hemisphere</div>
                            <div className="text-2xl font-bold text-pink-400">{stats?.rightHemisphere || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Visualization */}
                <Tabs value={activeView} onValueChange={setActiveView} className="space-y-4">
                    <TabsList className="bg-slate-800 border border-slate-700">
                        <TabsTrigger value="graph" className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-400">
                            <GitBranch className="w-4 h-4 mr-2" />
                            Semantic Graph
                        </TabsTrigger>
                        <TabsTrigger value="tiers" className="data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-400">
                            <Activity className="w-4 h-4 mr-2" />
                            Tier Statistics
                        </TabsTrigger>
                        <TabsTrigger value="pathways" className="data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-400">
                            <Zap className="w-4 h-4 mr-2" />
                            Cognitive Pathways
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="graph" className="space-y-4">
                        <MemoryGraph memories={memories} stats={stats} />
                    </TabsContent>

                    <TabsContent value="tiers" className="space-y-4">
                        <MemoryTierStats memories={memories} stats={stats} />
                    </TabsContent>

                    <TabsContent value="pathways" className="space-y-4">
                        <MemoryPathwayExplorer memories={memories} stats={stats} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}