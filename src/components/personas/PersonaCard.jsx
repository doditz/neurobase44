import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Cpu, Heart, Shield, Lightbulb, Zap, Edit, Check, X } from 'lucide-react';
import { Persona } from '@/entities/Persona';
import { toast } from 'sonner';

const hemisphereIcons = {
    'Left': Brain,
    'Right': Heart, 
    'Central': Zap
};

const hemisphereColors = {
    'Left': 'bg-blue-100 text-blue-800',
    'Right': 'bg-pink-100 text-pink-800',
    'Central': 'bg-purple-100 text-purple-800'
};

const categoryColors = {
    'Core': 'bg-green-100 text-green-800',
    'Standard': 'bg-gray-100 text-gray-800',
    'Advanced': 'bg-orange-100 text-orange-800',
    'Experimental': 'bg-yellow-100 text-yellow-800',
    'Expert': 'bg-indigo-100 text-indigo-800',
    'Theorist': 'bg-cyan-100 text-cyan-800'
};

export default function PersonaCard({ persona, onUpdate, onEdit }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const HemisphereIcon = hemisphereIcons[persona.hemisphere] || Cpu;
    const expertisePercent = Math.round(persona.expertise_score * 100);
    
    const toggleStatus = async () => {
        setIsUpdating(true);
        try {
            const newStatus = persona.status === 'Active' ? 'Disabled' : 'Active';
            await Persona.update(persona.id, { status: newStatus });
            toast.success(`Persona ${newStatus === 'Active' ? 'activated' : 'disabled'}`);
            onUpdate();
        } catch (error) {
            console.error('Failed to update persona status:', error);
            toast.error('Failed to update persona status');
        }
        setIsUpdating(false);
    };
    
    return (
        <Card className={`h-full hover:shadow-lg transition-shadow ${persona.status === 'Disabled' ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg font-semibold">{persona.name}</CardTitle>
                            <HemisphereIcon className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="text-xs text-slate-500">{persona.handle}</span>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEdit(persona)}
                            className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Edit persona"
                        >
                            <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={toggleStatus}
                            disabled={isUpdating}
                            className={`h-7 w-7 ${
                                persona.status === 'Active' 
                                    ? 'text-green-600 hover:text-green-700 hover:bg-green-50' 
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                            title={persona.status === 'Active' ? 'Disable persona' : 'Activate persona'}
                        >
                            {isUpdating ? (
                                <Zap className="w-3.5 h-3.5 animate-spin" />
                            ) : persona.status === 'Active' ? (
                                <Check className="w-3.5 h-3.5" />
                            ) : (
                                <X className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={hemisphereColors[persona.hemisphere]}>
                        {persona.hemisphere} Brain
                    </Badge>
                    <Badge className={categoryColors[persona.category] || 'bg-gray-100 text-gray-800'}>
                        {persona.category}
                    </Badge>
                    <Badge variant="outline">
                        Priority: {persona.priority_level}
                    </Badge>
                    {persona.status && (
                        <Badge 
                            variant={persona.status === 'Active' ? 'default' : 'secondary'}
                            className={persona.status === 'Active' ? 'bg-green-600' : 'bg-slate-400'}
                        >
                            {persona.status}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-3">
                    <div>
                        <h4 className="font-medium text-sm text-slate-700 mb-1">Domain</h4>
                        <p className="text-sm text-slate-600">{persona.domain}</p>
                    </div>
                    
                    <div>
                        <h4 className="font-medium text-sm text-slate-700 mb-1">Capabilities</h4>
                        <p className="text-xs text-slate-500 line-clamp-3">{persona.capabilities}</p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-xs font-medium text-slate-700">Expertise</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${expertisePercent}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-600">{expertisePercent}%</span>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className="flex items-center gap-1 mb-1">
                                <Shield className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">{persona.ethical_constraints}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Lightbulb className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-600">{persona.processing_bias}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}