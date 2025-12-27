import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const REPORT_SECTIONS = [
    { id: 'summary', label: 'Résumé Exécutif', default: true },
    { id: 'kpis', label: 'KPIs Principaux', default: true },
    { id: 'strategy_analysis', label: 'Analyse Stratégies', default: true },
    { id: 'trends', label: 'Tendances Temporelles', default: true },
    { id: 'quality_comparison', label: 'Comparaison Qualité', default: false },
    { id: 'recommendations', label: 'Recommandations AI', default: false },
    { id: 'raw_data', label: 'Données Brutes', default: false }
];

const PERIOD_OPTIONS = [
    { value: '24h', label: 'Dernières 24h', filter: () => subDays(new Date(), 1) },
    { value: '7d', label: '7 jours', filter: () => subDays(new Date(), 7) },
    { value: '30d', label: '30 jours', filter: () => subMonths(new Date(), 1) },
    { value: '90d', label: '90 jours', filter: () => subMonths(new Date(), 3) }
];

export default function PerformanceReportGenerator({ benchmarks, strategies, tunableParams }) {
    const [selectedPeriod, setSelectedPeriod] = useState('7d');
    const [selectedSections, setSelectedSections] = useState(
        REPORT_SECTIONS.filter(s => s.default).map(s => s.id)
    );
    const [generating, setGenerating] = useState(false);
    const [generatedReport, setGeneratedReport] = useState(null);

    const toggleSection = (sectionId) => {
        setSelectedSections(prev => 
            prev.includes(sectionId)
                ? prev.filter(s => s !== sectionId)
                : [...prev, sectionId]
        );
    };

    const generateReport = async () => {
        setGenerating(true);
        
        try {
            const periodFilter = PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.filter();
            const filteredBenchmarks = benchmarks.filter(b => 
                new Date(b.created_date) >= periodFilter
            );

            // Calculate metrics
            const totalTests = filteredBenchmarks.length;
            const passedTests = filteredBenchmarks.filter(b => b.passed).length;
            const avgSPG = totalTests > 0 
                ? filteredBenchmarks.reduce((sum, b) => sum + (b.global_score_performance || 0), 0) / totalTests 
                : 0;
            const avgLatency = totalTests > 0
                ? filteredBenchmarks.reduce((sum, b) => sum + (b.mode_b_time_ms || 0), 0) / totalTests
                : 0;
            const avgTokenSavings = totalTests > 0
                ? filteredBenchmarks.reduce((sum, b) => sum + (b.token_savings_percentage || 0), 0) / totalTests
                : 0;

            // Strategy breakdown
            const strategyBreakdown = {};
            filteredBenchmarks.forEach(b => {
                const strategy = b.spg_breakdown?.active_strategy || 'default';
                if (!strategyBreakdown[strategy]) {
                    strategyBreakdown[strategy] = { count: 0, totalSPG: 0, wins: 0 };
                }
                strategyBreakdown[strategy].count++;
                strategyBreakdown[strategy].totalSPG += b.global_score_performance || 0;
                if (b.winner === 'mode_b') strategyBreakdown[strategy].wins++;
            });

            // Build report
            const report = {
                metadata: {
                    generated_at: new Date().toISOString(),
                    period: selectedPeriod,
                    total_benchmarks: totalTests,
                    sections_included: selectedSections
                },
                sections: {}
            };

            if (selectedSections.includes('summary')) {
                report.sections.summary = {
                    title: 'Résumé Exécutif',
                    content: `Durant la période sélectionnée (${selectedPeriod}), ${totalTests} tests ont été exécutés avec un taux de réussite de ${((passedTests/totalTests)*100).toFixed(1)}%. Le SPG moyen atteint ${avgSPG.toFixed(3)}, avec des économies de tokens de ${avgTokenSavings.toFixed(1)}%.`
                };
            }

            if (selectedSections.includes('kpis')) {
                report.sections.kpis = {
                    title: 'KPIs Principaux',
                    metrics: {
                        spg_moyen: avgSPG.toFixed(3),
                        pass_rate: `${((passedTests/totalTests)*100).toFixed(1)}%`,
                        latence_moyenne: `${(avgLatency/1000).toFixed(2)}s`,
                        token_savings: `${avgTokenSavings.toFixed(1)}%`,
                        total_tests: totalTests
                    }
                };
            }

            if (selectedSections.includes('strategy_analysis')) {
                report.sections.strategy_analysis = {
                    title: 'Analyse des Stratégies',
                    strategies: Object.entries(strategyBreakdown).map(([name, data]) => ({
                        name,
                        tests: data.count,
                        avg_spg: (data.totalSPG / data.count).toFixed(3),
                        win_rate: `${((data.wins / data.count) * 100).toFixed(1)}%`
                    }))
                };
            }

            if (selectedSections.includes('recommendations')) {
                report.sections.recommendations = {
                    title: 'Recommandations',
                    items: [
                        avgSPG < 0.7 ? '⚠️ SPG sous-optimal - Considérer augmenter les rounds de débat' : '✅ SPG satisfaisant',
                        avgTokenSavings < 30 ? '⚠️ Économies tokens faibles - Activer compression sémantique' : '✅ Économies tokens optimales',
                        passedTests/totalTests < 0.5 ? '⚠️ Taux de réussite faible - Revoir la configuration D2STIM' : '✅ Taux de réussite acceptable'
                    ]
                };
            }

            if (selectedSections.includes('raw_data')) {
                report.sections.raw_data = {
                    title: 'Données Brutes',
                    benchmarks: filteredBenchmarks.slice(0, 50).map(b => ({
                        id: b.id,
                        scenario: b.scenario_name,
                        spg: b.global_score_performance,
                        winner: b.winner,
                        created: b.created_date
                    }))
                };
            }

            setGeneratedReport(report);
            toast.success('Rapport généré avec succès!');
        } catch (error) {
            toast.error(`Erreur: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const downloadReport = (format) => {
        if (!generatedReport) return;

        let content, filename, mimeType;

        if (format === 'json') {
            content = JSON.stringify(generatedReport, null, 2);
            filename = `neuronas_report_${selectedPeriod}_${Date.now()}.json`;
            mimeType = 'application/json';
        } else {
            // Markdown format
            let md = `# Rapport de Performance NEURONAS\n\n`;
            md += `**Généré le:** ${format(new Date(), 'PPpp', { locale: fr })}\n`;
            md += `**Période:** ${selectedPeriod}\n\n`;

            Object.values(generatedReport.sections).forEach(section => {
                md += `## ${section.title}\n\n`;
                if (section.content) {
                    md += `${section.content}\n\n`;
                }
                if (section.metrics) {
                    md += '| Métrique | Valeur |\n|---|---|\n';
                    Object.entries(section.metrics).forEach(([key, value]) => {
                        md += `| ${key.replace(/_/g, ' ')} | ${value} |\n`;
                    });
                    md += '\n';
                }
                if (section.strategies) {
                    md += '| Stratégie | Tests | SPG Moy. | Win Rate |\n|---|---|---|---|\n';
                    section.strategies.forEach(s => {
                        md += `| ${s.name} | ${s.tests} | ${s.avg_spg} | ${s.win_rate} |\n`;
                    });
                    md += '\n';
                }
                if (section.items) {
                    section.items.forEach(item => {
                        md += `- ${item}\n`;
                    });
                    md += '\n';
                }
            });

            content = md;
            filename = `neuronas_report_${selectedPeriod}_${Date.now()}.md`;
            mimeType = 'text/markdown';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Configuration */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="pb-2">
                    <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Générateur de Rapport Personnalisé
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Period Selection */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">Période:</span>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-green-300">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {PERIOD_OPTIONS.map(p => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Section Selection */}
                    <div>
                        <span className="text-sm text-slate-400 block mb-2">Sections à inclure:</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {REPORT_SECTIONS.map(section => (
                                <div 
                                    key={section.id}
                                    className="flex items-center gap-2 bg-slate-700 rounded p-2 cursor-pointer"
                                    onClick={() => toggleSection(section.id)}
                                >
                                    <Checkbox 
                                        checked={selectedSections.includes(section.id)}
                                        className="border-slate-500"
                                    />
                                    <span className="text-xs text-slate-300">{section.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <Button 
                        onClick={generateReport}
                        disabled={generating || selectedSections.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Génération en cours...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Générer le Rapport
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Generated Report Preview */}
            {generatedReport && (
                <Card className="bg-slate-800 border-green-600">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-green-300 text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Rapport Généré
                            </CardTitle>
                            <div className="flex gap-2">
                                <Button onClick={() => downloadReport('json')} size="sm" variant="outline" className="border-blue-600 text-blue-400">
                                    <Download className="w-3 h-3 mr-1" />
                                    JSON
                                </Button>
                                <Button onClick={() => downloadReport('md')} size="sm" variant="outline" className="border-purple-600 text-purple-400">
                                    <Download className="w-3 h-3 mr-1" />
                                    Markdown
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64">
                            <div className="space-y-4 text-sm">
                                {Object.entries(generatedReport.sections).map(([key, section]) => (
                                    <div key={key} className="bg-slate-700 rounded p-3">
                                        <h4 className="font-semibold text-green-400 mb-2">{section.title}</h4>
                                        {section.content && (
                                            <p className="text-slate-300 text-xs">{section.content}</p>
                                        )}
                                        {section.metrics && (
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                {Object.entries(section.metrics).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between">
                                                        <span className="text-slate-400 text-xs">{k.replace(/_/g, ' ')}:</span>
                                                        <span className="text-green-300 text-xs font-medium">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {section.items && (
                                            <ul className="mt-2 space-y-1">
                                                {section.items.map((item, i) => (
                                                    <li key={i} className="text-xs text-slate-300">{item}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}