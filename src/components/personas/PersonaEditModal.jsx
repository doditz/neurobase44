import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Persona } from '@/entities/Persona';
import { toast } from 'sonner';
import { Save, X } from 'lucide-react';

export default function PersonaEditModal({ persona, isOpen, onClose, onUpdate }) {
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        capabilities: '',
        hemisphere: 'Left',
        category: 'Standard',
        priority_level: 5,
        expertise_score: 0.7,
        status: 'Enabled',
        ethical_constraints: 'Medium',
        processing_bias: 'Analytical',
        temperature_range_min: 0.3,
        temperature_range_max: 0.9,
        d2_sensitivity: 0.0
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (persona) {
            setFormData({
                name: persona.name || '',
                domain: persona.domain || '',
                capabilities: persona.capabilities || '',
                hemisphere: persona.hemisphere || 'Left',
                category: persona.category || 'Standard',
                priority_level: persona.priority_level || 5,
                expertise_score: persona.expertise_score || 0.7,
                status: persona.status || 'Enabled',
                ethical_constraints: persona.ethical_constraints || 'Medium',
                processing_bias: persona.processing_bias || 'Analytical',
                temperature_range_min: persona.temperature_range_min || 0.3,
                temperature_range_max: persona.temperature_range_max || 0.9,
                d2_sensitivity: persona.d2_sensitivity || 0.0
            });
        }
    }, [persona]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Persona.update(persona.id, formData);
            toast.success('Persona updated successfully');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Failed to update persona:', error);
            toast.error('Failed to update persona');
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Persona: {persona?.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Persona name"
                            />
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Enabled">Enabled</SelectItem>
                                    <SelectItem value="Disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label>Domain</Label>
                        <Input
                            value={formData.domain}
                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            placeholder="Domain of expertise"
                        />
                    </div>

                    <div>
                        <Label>Capabilities</Label>
                        <Textarea
                            value={formData.capabilities}
                            onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                            placeholder="Describe the persona's capabilities"
                            rows={3}
                        />
                    </div>

                    {/* Configuration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Hemisphere</Label>
                            <Select value={formData.hemisphere} onValueChange={(value) => setFormData({ ...formData, hemisphere: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Left">Left (Analytical)</SelectItem>
                                    <SelectItem value="Right">Right (Creative)</SelectItem>
                                    <SelectItem value="Central">Central (Integration)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Core">Core</SelectItem>
                                    <SelectItem value="Standard">Standard</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                    <SelectItem value="Experimental">Experimental</SelectItem>
                                    <SelectItem value="Expert">Expert</SelectItem>
                                    <SelectItem value="Theorist">Theorist</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Processing Bias</Label>
                            <Select value={formData.processing_bias} onValueChange={(value) => setFormData({ ...formData, processing_bias: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Analytical">Analytical</SelectItem>
                                    <SelectItem value="Creative">Creative</SelectItem>
                                    <SelectItem value="Integrative">Integrative</SelectItem>
                                    <SelectItem value="Disruptive">Disruptive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Ethical Constraints</Label>
                            <Select value={formData.ethical_constraints} onValueChange={(value) => setFormData({ ...formData, ethical_constraints: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Sliders */}
                    <div>
                        <Label>Priority Level: {formData.priority_level}</Label>
                        <Slider
                            value={[formData.priority_level]}
                            onValueChange={([value]) => setFormData({ ...formData, priority_level: value })}
                            max={10}
                            min={1}
                            step={1}
                            className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Low (1)</span>
                            <span>High (10)</span>
                        </div>
                    </div>

                    <div>
                        <Label>Expertise Score: {Math.round(formData.expertise_score * 100)}%</Label>
                        <Slider
                            value={[formData.expertise_score]}
                            onValueChange={([value]) => setFormData({ ...formData, expertise_score: value })}
                            max={1}
                            min={0}
                            step={0.05}
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label>D2 Sensitivity: {formData.d2_sensitivity.toFixed(2)}</Label>
                        <Slider
                            value={[formData.d2_sensitivity]}
                            onValueChange={([value]) => setFormData({ ...formData, d2_sensitivity: value })}
                            max={1}
                            min={-1}
                            step={0.05}
                            className="mt-2"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Inhibitory (-1)</span>
                            <span>Facilitatory (+1)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Temperature Min: {formData.temperature_range_min}</Label>
                            <Slider
                                value={[formData.temperature_range_min]}
                                onValueChange={([value]) => setFormData({ ...formData, temperature_range_min: value })}
                                max={1}
                                min={0}
                                step={0.1}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label>Temperature Max: {formData.temperature_range_max}</Label>
                            <Slider
                                value={[formData.temperature_range_max]}
                                onValueChange={([value]) => setFormData({ ...formData, temperature_range_max: value })}
                                max={1}
                                min={0}
                                step={0.1}
                                className="mt-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}