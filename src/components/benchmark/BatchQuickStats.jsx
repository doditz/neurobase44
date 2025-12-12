import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Zap, Cpu, HardDrive, CheckCircle2 } from 'lucide-react';

export default function BatchQuickStats({ summaryData }) {
    if (!summaryData) return null;

    const {
        average_spg = 0,
        pass_rate = 0,
        average_cpu_savings = 0,
        average_ram_savings = 0,
        average_token_savings = 0,
        total_passed = 0,
        total_failed = 0
    } = summaryData;

    const total = total_passed + total_failed;
    const passRatePercent = total > 0 ? (pass_rate * 100) : 0;

    const stats = [
        {
            label: 'SPG Moyen',
            value: (average_spg || 0).toFixed(3),
            icon: TrendingUp,
            color: 'text-green-400',
            bgColor: 'bg-green-900/20'
        },
        {
            label: 'Taux de Réussite',
            value: `${passRatePercent.toFixed(1)}%`,
            icon: CheckCircle2,
            color: passRatePercent >= 80 ? 'text-green-400' : passRatePercent >= 60 ? 'text-yellow-400' : 'text-red-400',
            bgColor: passRatePercent >= 80 ? 'bg-green-900/20' : passRatePercent >= 60 ? 'bg-yellow-900/20' : 'bg-red-900/20'
        },
        {
            label: 'Économie CPU',
            value: `${(average_cpu_savings || 0).toFixed(1)}%`,
            icon: Cpu,
            color: 'text-blue-400',
            bgColor: 'bg-blue-900/20'
        },
        {
            label: 'Économie RAM',
            value: `${(average_ram_savings || 0).toFixed(1)}%`,
            icon: HardDrive,
            color: 'text-purple-400',
            bgColor: 'bg-purple-900/20'
        },
        {
            label: 'Économie Tokens',
            value: `${(average_token_savings || 0).toFixed(1)}%`,
            icon: Zap,
            color: 'text-orange-400',
            bgColor: 'bg-orange-900/20'
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <Card key={idx} className={`${stat.bgColor} border-slate-700`}>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className={`w-4 h-4 ${stat.color}`} />
                                <div className="text-xs text-slate-400">{stat.label}</div>
                            </div>
                            <div className={`text-2xl font-bold ${stat.color}`}>
                                {stat.value}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}