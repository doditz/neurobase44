import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap } from 'lucide-react';

export default function MemoryGraph({ memories, stats }) {
    const [hoveredNode, setHoveredNode] = useState(null);
    const [selectedTier, setSelectedTier] = useState(null);

    const graphData = useMemo(() => {
        const tiers = ['L1', 'L2', 'L3', 'R1', 'R2', 'R3', 'GC'];
        const nodes = tiers.map(tier => {
            const tierMemories = memories.filter(m => {
                if (tier === 'GC') return m.hemisphere === 'central';
                const level = parseInt(tier[1]);
                const hemi = tier[0] === 'L' ? 'left' : 'right';
                return m.tier_level === level && m.hemisphere === hemi;
            });

            return {
                id: tier,
                label: tier,
                count: tierMemories.length,
                avgD2: tierMemories.reduce((sum, m) => sum + (m.d2_modulation || 0.5), 0) / (tierMemories.length || 1),
                avgImportance: tierMemories.reduce((sum, m) => sum + (m.importance_score || 0.5), 0) / (tierMemories.length || 1),
                memories: tierMemories
            };
        });

        // Generate edges based on semantic similarity
        const edges = [];
        nodes.forEach((node1, i) => {
            nodes.slice(i + 1).forEach(node2 => {
                const similarity = calculateTierSimilarity(node1.memories, node2.memories);
                if (similarity > 0.3) {
                    edges.push({
                        from: node1.id,
                        to: node2.id,
                        strength: similarity
                    });
                }
            });
        });

        return { nodes, edges };
    }, [memories]);

    const tierPositions = {
        L1: { x: 100, y: 100 },
        L2: { x: 150, y: 250 },
        L3: { x: 200, y: 400 },
        GC: { x: 400, y: 250 },
        R1: { x: 700, y: 100 },
        R2: { x: 650, y: 250 },
        R3: { x: 600, y: 400 }
    };

    const getTierColor = (tier) => {
        if (tier === 'GC') return '#a78bfa'; // purple
        return tier.startsWith('L') ? '#60a5fa' : '#f472b6'; // blue or pink
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    7-Tier Semantic Network
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative bg-slate-900 rounded-lg" style={{ height: '600px' }}>
                    <svg width="100%" height="100%" className="absolute inset-0">
                        {/* Render edges */}
                        {graphData.edges.map((edge, idx) => {
                            const from = tierPositions[edge.from];
                            const to = tierPositions[edge.to];
                            return (
                                <line
                                    key={idx}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke="#475569"
                                    strokeWidth={edge.strength * 3}
                                    opacity={0.5}
                                />
                            );
                        })}

                        {/* Render nodes */}
                        {graphData.nodes.map(node => {
                            const pos = tierPositions[node.id];
                            const radius = 30 + (node.count * 2);
                            const isHovered = hoveredNode === node.id;
                            const isSelected = selectedTier === node.id;

                            return (
                                <g
                                    key={node.id}
                                    onMouseEnter={() => setHoveredNode(node.id)}
                                    onMouseLeave={() => setHoveredNode(null)}
                                    onClick={() => setSelectedTier(node.id === selectedTier ? null : node.id)}
                                    className="cursor-pointer"
                                >
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={radius}
                                        fill={getTierColor(node.id)}
                                        opacity={isHovered || isSelected ? 0.9 : 0.6}
                                        stroke={isSelected ? '#22c55e' : 'transparent'}
                                        strokeWidth={3}
                                    />
                                    <text
                                        x={pos.x}
                                        y={pos.y - 5}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="14"
                                        fontWeight="bold"
                                    >
                                        {node.label}
                                    </text>
                                    <text
                                        x={pos.x}
                                        y={pos.y + 10}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="10"
                                    >
                                        {node.count}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Legend */}
                    <div className="absolute bottom-4 left-4 bg-slate-800/90 p-3 rounded-lg border border-slate-700">
                        <div className="text-xs text-slate-400 mb-2">Legend</div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                <span className="text-xs text-slate-300">Left (Analytical)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-pink-400"></div>
                                <span className="text-xs text-slate-300">Right (Creative)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                                <span className="text-xs text-slate-300">Genius Central</span>
                            </div>
                        </div>
                    </div>

                    {/* Hover info */}
                    {hoveredNode && (
                        <div className="absolute top-4 right-4 bg-slate-800/95 p-4 rounded-lg border border-slate-700 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-green-600">{hoveredNode}</Badge>
                            </div>
                            {graphData.nodes.find(n => n.id === hoveredNode) && (
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Memories:</span>
                                        <span className="text-slate-200 font-mono">
                                            {graphData.nodes.find(n => n.id === hoveredNode).count}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Avg D2:</span>
                                        <span className="text-blue-400 font-mono">
                                            {graphData.nodes.find(n => n.id === hoveredNode).avgD2.toFixed(3)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Importance:</span>
                                        <span className="text-orange-400 font-mono">
                                            {graphData.nodes.find(n => n.id === hoveredNode).avgImportance.toFixed(3)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Selected tier details */}
                {selectedTier && (
                    <div className="mt-4 p-4 bg-slate-900 rounded-lg border border-green-600/50">
                        <h4 className="text-sm font-semibold text-green-400 mb-3">
                            {selectedTier} Tier Memories
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {graphData.nodes.find(n => n.id === selectedTier)?.memories.slice(0, 5).map((mem, idx) => (
                                <div key={idx} className="text-xs bg-slate-800 p-2 rounded">
                                    <div className="text-slate-300 truncate">{mem.memory_content}</div>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                            D2: {(mem.d2_modulation || 0).toFixed(2)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            Imp: {(mem.importance_score || 0).toFixed(2)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function calculateTierSimilarity(memories1, memories2) {
    if (memories1.length === 0 || memories2.length === 0) return 0;
    
    let similarCount = 0;
    memories1.forEach(m1 => {
        memories2.forEach(m2 => {
            if (m1.semantic_hash && m2.semantic_hash) {
                const similarity = calculateHashSimilarity(m1.semantic_hash, m2.semantic_hash);
                if (similarity > 0.5) similarCount++;
            }
        });
    });
    
    return Math.min(1.0, similarCount / Math.max(memories1.length, memories2.length));
}

function calculateHashSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] === hash2[i]) matches++;
    }
    return matches / hash1.length;
}