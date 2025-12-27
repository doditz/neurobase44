import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Plus, Trash2, Settings, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const METRIC_OPTIONS = [
    { value: 'spg', label: 'SPG Score', defaultThreshold: 0.7, defaultType: 'below' },
    { value: 'pass_rate', label: 'Pass Rate (%)', defaultThreshold: 60, defaultType: 'below' },
    { value: 'latency_ms', label: 'Latency (ms)', defaultThreshold: 5000, defaultType: 'above' },
    { value: 'cpu_savings', label: 'CPU Savings (%)', defaultThreshold: 0, defaultType: 'below' },
    { value: 'token_savings', label: 'Token Savings (%)', defaultThreshold: 0, defaultType: 'below' },
    { value: 'quality_improvement', label: 'Quality Improvement (%)', defaultThreshold: 0, defaultType: 'below' }
];

const SEVERITY_COLORS = {
    info: 'bg-blue-600',
    warning: 'bg-orange-600',
    critical: 'bg-red-600'
};

export default function AlertConfigPanel({ onAlertChange }) {
    const [thresholds, setThresholds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newThreshold, setNewThreshold] = useState({
        metric_name: 'spg',
        threshold_type: 'below',
        threshold_value: 0.7,
        severity: 'warning',
        notification_type: 'toast',
        is_active: true,
        cooldown_minutes: 15
    });

    useEffect(() => {
        loadThresholds();
    }, []);

    const loadThresholds = async () => {
        try {
            const data = await base44.entities.AlertThreshold.list();
            setThresholds(data);
            if (onAlertChange) onAlertChange(data);
        } catch (error) {
            console.error('Failed to load thresholds:', error);
        } finally {
            setLoading(false);
        }
    };

    const createThreshold = async () => {
        try {
            await base44.entities.AlertThreshold.create(newThreshold);
            toast.success('Alert threshold created');
            setShowAddForm(false);
            setNewThreshold({
                metric_name: 'spg',
                threshold_type: 'below',
                threshold_value: 0.7,
                severity: 'warning',
                notification_type: 'toast',
                is_active: true,
                cooldown_minutes: 15
            });
            loadThresholds();
        } catch (error) {
            toast.error('Failed to create threshold');
        }
    };

    const toggleThreshold = async (id, isActive) => {
        try {
            await base44.entities.AlertThreshold.update(id, { is_active: !isActive });
            loadThresholds();
        } catch (error) {
            toast.error('Failed to update threshold');
        }
    };

    const deleteThreshold = async (id) => {
        if (!confirm('Delete this alert threshold?')) return;
        try {
            await base44.entities.AlertThreshold.delete(id);
            toast.success('Threshold deleted');
            loadThresholds();
        } catch (error) {
            toast.error('Failed to delete threshold');
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
            default: return <Info className="w-4 h-4 text-blue-400" />;
        }
    };

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-green-300 flex items-center gap-2 text-sm">
                        <Bell className="w-4 h-4" />
                        Alert Thresholds
                    </CardTitle>
                    <Button 
                        size="sm" 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="h-7 bg-green-600 hover:bg-green-700"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {showAddForm && (
                    <div className="bg-slate-700 rounded-lg p-3 space-y-3 border border-green-600/50">
                        <div className="grid grid-cols-2 gap-2">
                            <Select 
                                value={newThreshold.metric_name} 
                                onValueChange={(v) => {
                                    const metric = METRIC_OPTIONS.find(m => m.value === v);
                                    setNewThreshold({
                                        ...newThreshold, 
                                        metric_name: v,
                                        threshold_value: metric?.defaultThreshold || 0,
                                        threshold_type: metric?.defaultType || 'below'
                                    });
                                }}
                            >
                                <SelectTrigger className="bg-slate-600 border-slate-500 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    {METRIC_OPTIONS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <Select 
                                value={newThreshold.threshold_type} 
                                onValueChange={(v) => setNewThreshold({...newThreshold, threshold_type: v})}
                            >
                                <SelectTrigger className="bg-slate-600 border-slate-500 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="below">Below</SelectItem>
                                    <SelectItem value="above">Above</SelectItem>
                                    <SelectItem value="deviation">Deviation %</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <Input 
                                type="number"
                                step="0.01"
                                value={newThreshold.threshold_value}
                                onChange={(e) => setNewThreshold({...newThreshold, threshold_value: parseFloat(e.target.value)})}
                                className="bg-slate-600 border-slate-500 h-8 text-xs"
                                placeholder="Threshold value"
                            />
                            
                            <Select 
                                value={newThreshold.severity} 
                                onValueChange={(v) => setNewThreshold({...newThreshold, severity: v})}
                            >
                                <SelectTrigger className="bg-slate-600 border-slate-500 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="flex gap-2">
                            <Button size="sm" onClick={createThreshold} className="flex-1 h-7 bg-green-600">
                                Create
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="h-7">
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
                
                <ScrollArea className="h-48">
                    <div className="space-y-2">
                        {thresholds.map(threshold => (
                            <div 
                                key={threshold.id} 
                                className={`flex items-center justify-between bg-slate-700 rounded p-2 border ${
                                    threshold.is_active ? 'border-slate-600' : 'border-slate-700 opacity-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {getSeverityIcon(threshold.severity)}
                                    <div>
                                        <div className="text-xs text-green-300">
                                            {METRIC_OPTIONS.find(m => m.value === threshold.metric_name)?.label}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {threshold.threshold_type} {threshold.threshold_value}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className={`${SEVERITY_COLORS[threshold.severity]} text-xs`}>
                                        {threshold.severity}
                                    </Badge>
                                    <Switch 
                                        checked={threshold.is_active}
                                        onCheckedChange={() => toggleThreshold(threshold.id, threshold.is_active)}
                                        className="scale-75"
                                    />
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => deleteThreshold(threshold.id)}
                                        className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        
                        {thresholds.length === 0 && (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                No alert thresholds configured
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}