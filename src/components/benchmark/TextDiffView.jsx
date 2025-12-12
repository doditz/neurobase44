import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
    SplitSquareHorizontal, 
    List, 
    Lightbulb, 
    Plus, 
    Minus,
    Equal,
    TrendingUp,
    Brain,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

/**
 * Simple word-based diff algorithm
 */
const computeWordDiff = (textA, textB) => {
    const wordsA = textA.split(/(\s+)/);
    const wordsB = textB.split(/(\s+)/);
    
    const diff = [];
    let i = 0, j = 0;
    
    while (i < wordsA.length || j < wordsB.length) {
        if (i >= wordsA.length) {
            diff.push({ type: 'added', text: wordsB[j] });
            j++;
        } else if (j >= wordsB.length) {
            diff.push({ type: 'removed', text: wordsA[i] });
            i++;
        } else if (wordsA[i] === wordsB[j]) {
            diff.push({ type: 'equal', text: wordsA[i] });
            i++;
            j++;
        } else {
            // Simple heuristic: check if next words match
            const nextAMatchesB = i + 1 < wordsA.length && wordsA[i + 1] === wordsB[j];
            const nextBMatchesA = j + 1 < wordsB.length && wordsB[j + 1] === wordsA[i];
            
            if (nextAMatchesB && !nextBMatchesA) {
                diff.push({ type: 'removed', text: wordsA[i] });
                i++;
            } else if (nextBMatchesA && !nextAMatchesB) {
                diff.push({ type: 'added', text: wordsB[j] });
                j++;
            } else {
                diff.push({ type: 'changed', textA: wordsA[i], textB: wordsB[j] });
                i++;
                j++;
            }
        }
    }
    
    return diff;
};

/**
 * Extract sentences for key points analysis
 */
const extractSentences = (text) => {
    return text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20);
};

/**
 * Analyze key points differences
 */
const analyzeKeyPoints = (textA, textB) => {
    const sentencesA = extractSentences(textA);
    const sentencesB = extractSentences(textB);
    
    const onlyInA = sentencesA.filter(sA => 
        !sentencesB.some(sB => {
            const similarity = calculateSimilarity(sA.toLowerCase(), sB.toLowerCase());
            return similarity > 0.6;
        })
    );
    
    const onlyInB = sentencesB.filter(sB => 
        !sentencesA.some(sA => {
            const similarity = calculateSimilarity(sA.toLowerCase(), sB.toLowerCase());
            return similarity > 0.6;
        })
    );
    
    return { onlyInA, onlyInB };
};

/**
 * Simple similarity calculation (Jaccard)
 */
const calculateSimilarity = (str1, str2) => {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
};

export default function TextDiffView({ textA, textB, labelA = "Mode A", labelB = "Mode B" }) {
    const [viewMode, setViewMode] = useState('side-by-side');
    
    const diffData = useMemo(() => computeWordDiff(textA, textB), [textA, textB]);
    const keyPointsAnalysis = useMemo(() => analyzeKeyPoints(textA, textB), [textA, textB]);
    
    const stats = useMemo(() => {
        const added = diffData.filter(d => d.type === 'added').length;
        const removed = diffData.filter(d => d.type === 'removed').length;
        const changed = diffData.filter(d => d.type === 'changed').length;
        const equal = diffData.filter(d => d.type === 'equal').length;
        const total = diffData.length;
        
        return {
            added,
            removed,
            changed,
            equal,
            total,
            similarityPercent: total > 0 ? ((equal / total) * 100).toFixed(1) : 0
        };
    }, [diffData]);

    const renderDiffInline = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
                <Badge className="bg-green-600">
                    <Plus className="w-3 h-3 mr-1" />
                    {stats.added} ajouts
                </Badge>
                <Badge className="bg-red-600">
                    <Minus className="w-3 h-3 mr-1" />
                    {stats.removed} retraits
                </Badge>
                <Badge className="bg-orange-600">
                    <Equal className="w-3 h-3 mr-1" />
                    {stats.changed} modifications
                </Badge>
                <Badge className="bg-blue-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {stats.similarityPercent}% similaire
                </Badge>
            </div>
            
            <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {diffData.map((item, idx) => {
                        if (item.type === 'equal') {
                            return <span key={idx} className="text-slate-300">{item.text}</span>;
                        } else if (item.type === 'added') {
                            return (
                                <span key={idx} className="bg-green-900/40 text-green-300 border-b-2 border-green-500">
                                    {item.text}
                                </span>
                            );
                        } else if (item.type === 'removed') {
                            return (
                                <span key={idx} className="bg-red-900/40 text-red-300 line-through border-b-2 border-red-500">
                                    {item.text}
                                </span>
                            );
                        } else if (item.type === 'changed') {
                            return (
                                <span key={idx}>
                                    <span className="bg-red-900/40 text-red-300 line-through border-b-2 border-red-500">
                                        {item.textA}
                                    </span>
                                    <span className="bg-green-900/40 text-green-300 border-b-2 border-green-500">
                                        {item.textB}
                                    </span>
                                </span>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        </div>
    );

    const renderSideBySide = () => (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <div className="bg-orange-900/20 rounded-t-lg px-4 py-2 border border-orange-600/50">
                    <h4 className="text-sm font-semibold text-orange-400">{labelA}</h4>
                </div>
                <div className="bg-slate-800 rounded-b-lg p-4 border border-slate-700 border-t-0 max-h-96 overflow-y-auto">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {textA}
                    </p>
                </div>
            </div>
            
            <div>
                <div className="bg-green-900/20 rounded-t-lg px-4 py-2 border border-green-600/50">
                    <h4 className="text-sm font-semibold text-green-400">{labelB}</h4>
                </div>
                <div className="bg-slate-800 rounded-b-lg p-4 border border-slate-700 border-t-0 max-h-96 overflow-y-auto">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {textB}
                    </p>
                </div>
            </div>
        </div>
    );

    const renderKeyPointsAnalysis = () => (
        <div className="space-y-4">
            {keyPointsAnalysis.onlyInA.length > 0 && (
                <Card className="bg-red-900/20 border-red-600/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                            <Minus className="w-4 h-4" />
                            Points Clés Absents en Mode B ({keyPointsAnalysis.onlyInA.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {keyPointsAnalysis.onlyInA.slice(0, 5).map((point, idx) => (
                            <div key={idx} className="bg-slate-800 rounded p-3 text-sm text-slate-300">
                                <AlertCircle className="w-3 h-3 inline mr-2 text-red-400" />
                                {point.length > 200 ? point.substring(0, 200) + '...' : point}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            
            {keyPointsAnalysis.onlyInB.length > 0 && (
                <Card className="bg-green-900/20 border-green-600/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Points Clés Ajoutés en Mode B ({keyPointsAnalysis.onlyInB.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {keyPointsAnalysis.onlyInB.slice(0, 5).map((point, idx) => (
                            <div key={idx} className="bg-slate-800 rounded p-3 text-sm text-slate-300">
                                <CheckCircle2 className="w-3 h-3 inline mr-2 text-green-400" />
                                {point.length > 200 ? point.substring(0, 200) + '...' : point}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            
            {keyPointsAnalysis.onlyInA.length === 0 && keyPointsAnalysis.onlyInB.length === 0 && (
                <Card className="bg-blue-900/20 border-blue-600/50">
                    <CardContent className="p-6 text-center">
                        <Brain className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                        <p className="text-sm text-blue-300">
                            Les deux réponses couvrent des points similaires avec des formulations différentes
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );

    return (
        <div className="space-y-4">
            <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="bg-slate-800">
                    <TabsTrigger value="side-by-side" className="flex items-center gap-2">
                        <SplitSquareHorizontal className="w-4 h-4" />
                        Côte à Côte
                    </TabsTrigger>
                    <TabsTrigger value="diff" className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        Vue Diff
                    </TabsTrigger>
                    <TabsTrigger value="key-points" className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Points Clés
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="side-by-side" className="mt-4">
                    {renderSideBySide()}
                </TabsContent>
                
                <TabsContent value="diff" className="mt-4">
                    {renderDiffInline()}
                </TabsContent>
                
                <TabsContent value="key-points" className="mt-4">
                    {renderKeyPointsAnalysis()}
                </TabsContent>
            </Tabs>
        </div>
    );
}