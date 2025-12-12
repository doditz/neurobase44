import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Activity, Wrench, Zap, TrendingUp, Shield, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function SystemDocumentationPage() {
    const [expandedSection, setExpandedSection] = useState('overview');

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const Section = ({ id, title, icon: Icon, badge, children }) => {
        const isExpanded = expandedSection === id;
        
        return (
            <Card className="bg-slate-800 border-slate-700 mb-4">
                <CardHeader>
                    <button
                        onClick={() => toggleSection(id)}
                        className="flex items-center justify-between w-full text-left"
                    >
                        <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-green-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            <Icon className="w-5 h-5 text-green-400" />
                            <CardTitle className="text-green-400">{title}</CardTitle>
                            {badge && <Badge className="ml-2 bg-orange-600">{badge}</Badge>}
                        </div>
                    </button>
                </CardHeader>
                {isExpanded && (
                    <CardContent className="pt-0">
                        {children}
                    </CardContent>
                )}
            </Card>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-green-400 mb-2 flex items-center justify-center gap-3">
                        <BookOpen className="w-10 h-10" />
                        System Documentation
                    </h1>
                    <p className="text-slate-400">
                        Guide complet du système de diagnostic autonome Neuronas
                    </p>
                </div>

                {/* Quick Links */}
                <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap gap-3 justify-center">
                            <Link to={createPageUrl('SystemHealth')}>
                                <Button variant="outline" className="border-green-600 text-green-400">
                                    <Activity className="w-4 h-4 mr-2" />
                                    System Health
                                </Button>
                            </Link>
                            <Link to={createPageUrl('AutoOptimization')}>
                                <Button variant="outline" className="border-blue-600 text-blue-400">
                                    <Zap className="w-4 h-4 mr-2" />
                                    Auto-Optimization
                                </Button>
                            </Link>
                            <Link to={createPageUrl('Benchmark')}>
                                <Button variant="outline" className="border-purple-600 text-purple-400">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Benchmarks
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Overview Section */}
                <Section id="overview" title="Vue d'Ensemble" icon={Info}>
                    <div className="space-y-4 text-slate-300">
                        <p>Le système comprend trois composants principaux:</p>
                        
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <Activity className="w-8 h-8 text-green-400 mb-2" />
                                    <h4 className="font-semibold text-green-400 mb-2">Health Monitor</h4>
                                    <p className="text-sm text-slate-400">
                                        Surveillance continue et détection d'anomalies
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <Wrench className="w-8 h-8 text-orange-400 mb-2" />
                                    <h4 className="font-semibold text-orange-400 mb-2">Auto-Repair</h4>
                                    <p className="text-sm text-slate-400">
                                        Réparation automatique des problèmes
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <TrendingUp className="w-8 h-8 text-blue-400 mb-2" />
                                    <h4 className="font-semibold text-blue-400 mb-2">Performance Optimizer</h4>
                                    <p className="text-sm text-slate-400">
                                        Analyse et recommandations d'optimisation
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </Section>

                {/* Health Section */}
                <Section id="health" title="System Health Monitor" icon={Activity} badge="Monitoring">
                    <div className="space-y-4 text-slate-300">
                        <h4 className="font-semibold text-green-400">Fonctionnalités</h4>
                        <ul className="space-y-2 ml-4">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-1" />
                                <span>Détection des batch runs bloqués (plus de 30min)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-1" />
                                <span>Vérification d'intégrité des données</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-1" />
                                <span>Détection des verrous système obsolètes (supérieur à 1 heure)</span>
                            </li>
                        </ul>

                        <div className="bg-blue-900/20 border border-blue-600 p-4 rounded-lg mt-4">
                            <h5 className="font-semibold text-blue-400 mb-2">Best Practices</h5>
                            <ul className="space-y-1 text-sm">
                                <li>• Vérifiez le dashboard au moins une fois par jour</li>
                                <li>• Activez l'auto-refresh pendant le développement</li>
                                <li>• Traitez les problèmes high severity en priorité</li>
                            </ul>
                        </div>
                    </div>
                </Section>

                {/* Repair Section */}
                <Section id="repair" title="Auto-Repair Service" icon={Wrench} badge="Automation">
                    <div className="space-y-4 text-slate-300">
                        <h4 className="font-semibold text-orange-400">Types de Réparations</h4>
                        
                        <div className="space-y-3">
                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <h5 className="font-semibold text-orange-400 mb-2">1. Batch Runs Bloqués</h5>
                                    <p className="text-sm">Marque comme failed les batch runs bloqués</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <h5 className="font-semibold text-orange-400 mb-2">2. Verrous Système</h5>
                                    <p className="text-sm">Libère les verrous actifs depuis plus d'1 heure</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-slate-700 border-slate-600">
                                <CardContent className="p-4">
                                    <h5 className="font-semibold text-orange-400 mb-2">3. SPG Manquants</h5>
                                    <p className="text-sm">Recalcule les SPG pour les benchmarks</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </Section>

                {/* Troubleshooting */}
                <Section id="troubleshooting" title="Dépannage" icon={AlertTriangle} badge="Help">
                    <div className="space-y-4 text-slate-300">
                        <Card className="bg-slate-700 border-slate-600">
                            <CardContent className="p-4">
                                <h5 className="font-semibold text-red-400 mb-2">Entity not found après création</h5>
                                <p className="text-sm mb-2"><strong>Cause:</strong> Délai de propagation DB</p>
                                <p className="text-sm"><strong>Solution:</strong> Attendre 2-3s puis réessayer</p>
                            </CardContent>
                        </Card>

                        <div className="bg-red-900/20 border border-red-600 p-4 rounded-lg">
                            <h5 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                En Cas d'Urgence
                            </h5>
                            <ol className="text-sm space-y-1 ml-4">
                                <li>1. Aller sur System Health Dashboard</li>
                                <li>2. Noter les problèmes critiques</li>
                                <li>3. Exécuter Auto-Repair All</li>
                                <li>4. Contacter l'équipe si échec</li>
                            </ol>
                        </div>
                    </div>
                </Section>

                {/* Footer */}
                <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-600">
                    <CardContent className="p-6 text-center">
                        <h3 className="text-xl font-semibold text-green-400 mb-2">
                            Prêt à Optimiser
                        </h3>
                        <p className="text-slate-300 mb-4">
                            Commencez par vérifier la santé de votre système
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link to={createPageUrl('SystemHealth')}>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <Activity className="w-4 h-4 mr-2" />
                                    Ouvrir System Health
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}