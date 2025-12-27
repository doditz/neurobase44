import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, AlertTriangle, AlertCircle, Info, Check } from 'lucide-react';
import { toast } from 'sonner';

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-900/50 border-red-600',
        icon: AlertCircle,
        iconColor: 'text-red-400'
    },
    warning: {
        bg: 'bg-orange-900/50 border-orange-600',
        icon: AlertTriangle,
        iconColor: 'text-orange-400'
    },
    info: {
        bg: 'bg-blue-900/50 border-blue-600',
        icon: Info,
        iconColor: 'text-blue-400'
    }
};

export default function AlertNotificationBanner({ alerts = [], onAcknowledge, onDismiss }) {
    const [visibleAlerts, setVisibleAlerts] = useState([]);

    useEffect(() => {
        // Filter to show only unacknowledged alerts
        const unacked = alerts.filter(a => !a.acknowledged).slice(0, 3);
        setVisibleAlerts(unacked);
    }, [alerts]);

    const handleAcknowledge = async (alertId) => {
        try {
            await base44.entities.AlertHistory.update(alertId, {
                acknowledged: true,
                acknowledged_at: new Date().toISOString()
            });
            if (onAcknowledge) onAcknowledge(alertId);
            setVisibleAlerts(prev => prev.filter(a => a.id !== alertId));
            toast.success('Alert acknowledged');
        } catch (error) {
            toast.error('Failed to acknowledge alert');
        }
    };

    const handleDismiss = (alertId) => {
        setVisibleAlerts(prev => prev.filter(a => a.id !== alertId));
        if (onDismiss) onDismiss(alertId);
    };

    if (visibleAlerts.length === 0) return null;

    return (
        <div className="space-y-2 mb-4">
            {visibleAlerts.map(alert => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const Icon = style.icon;
                
                return (
                    <div 
                        key={alert.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${style.bg} animate-pulse`}
                    >
                        <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${style.iconColor}`} />
                            <div>
                                <div className="text-sm font-medium text-white">
                                    {alert.message}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {alert.metric_name}: {alert.metric_value?.toFixed(3)} 
                                    {alert.strategy_affected && ` • ${alert.strategy_affected}`}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={`${style.bg.replace('/50', '')} text-xs`}>
                                {alert.severity}
                            </Badge>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleAcknowledge(alert.id)}
                                className="h-7 text-green-400 hover:text-green-300"
                            >
                                <Check className="w-4 h-4" />
                            </Button>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleDismiss(alert.id)}
                                className="h-7 text-slate-400 hover:text-slate-300"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}