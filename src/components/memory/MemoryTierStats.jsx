import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function MemoryTierStats({ memories, stats }) {
    const tierData = [
        { tier: 'L1', count: stats?.tierCounts.L1 || 0, hemisphere: 'Left', level: 1 },
        { tier: 'L2', count: stats?.tierCounts.L2 || 0, hemisphere: 'Left', level: 2 },
        { tier: 'L3', count: stats?.tierCounts.L3 || 0, hemisphere: 'Left', level: 3 },
        { tier: 'R1', count: stats?.tierCounts.R1 || 0, hemisphere: 'Right', level: 1 },
        { tier: 'R2', count: stats?.tierCounts.R2 || 0, hemisphere: 'Right', level: 2 },
        { tier: 'R3', count: stats?.tierCounts.R3 || 0, hemisphere: 'Right', level: 3 },
        { tier: 'GC', count: stats?.tierCounts.GC || 0, hemisphere: 'Central', level: 2 }
    ];

    const d2Distribution = tierData.map(t => {
        const tierMems = memories.filter(m => {
            if (t.tier === 'GC') return m.hemisphere === 'central';
            return m.tier_level === t.level && m.hemisphere === t.hemisphere.toLowerCase();
        });
        const avgD2 = tierMems.reduce((sum, m) => sum + (m.d2_modulation || 0.5), 0) / (tierMems.length || 1);
        return { ...t, avgD2 };
    });

    const importanceDistribution = tierData.map(t => {
        const tierMems = memories.filter(m => {
            if (t.tier === 'GC') return m.hemisphere === 'central';
            return m.tier_level === t.level && m.hemisphere === t.hemisphere.toLowerCase();
        });
        const avgImp = tierMems.reduce((sum, m) => sum + (m.importance_score || 0.5), 0) / (tierMems.length || 1);
        return { ...t, avgImportance: avgImp };
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tier Distribution */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-green-400 text-base">Memory Distribution Across Tiers</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tierData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="tier" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="count" fill="#22c55e" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* D2 Modulation by Tier */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-blue-400 text-base">D2 Modulation by Tier</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={d2Distribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="tier" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" domain={[0, 1]} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line type="monotone" dataKey="avgD2" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Importance Distribution */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-orange-400 text-base">Importance Score by Tier</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={importanceDistribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="tier" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" domain={[0, 1]} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="avgImportance" fill="#f97316" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Hemispheric Balance */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-purple-400 text-base">Hemispheric Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Left Hemisphere (Analytical)</span>
                                <span className="text-blue-400 font-mono">{stats?.leftHemisphere || 0}</span>
                            </div>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{
                                        width: `${((stats?.leftHemisphere || 0) / (stats?.total || 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Right Hemisphere (Creative)</span>
                                <span className="text-pink-400 font-mono">{stats?.rightHemisphere || 0}</span>
                            </div>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-pink-500 transition-all"
                                    style={{
                                        width: `${((stats?.rightHemisphere || 0) / (stats?.total || 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400">Genius Central (Harmonized)</span>
                                <span className="text-purple-400 font-mono">{stats?.tierCounts.GC || 0}</span>
                            </div>
                            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 transition-all"
                                    style={{
                                        width: `${((stats?.tierCounts.GC || 0) / (stats?.total || 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}