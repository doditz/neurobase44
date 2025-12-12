import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Highlighter, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AnnotationPanel({ targetType, targetId }) {
    const [annotations, setAnnotations] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        annotation_text: '',
        highlight_text: '',
        tags: [],
        color: 'yellow'
    });

    useEffect(() => {
        loadAnnotations();
    }, [targetType, targetId]);

    const loadAnnotations = async () => {
        try {
            const data = await base44.entities.Annotation.filter({
                target_type: targetType,
                target_id: targetId
            }, '-created_date');
            setAnnotations(data);
        } catch (error) {
            console.error('Failed to load annotations:', error);
        }
    };

    const handleCreate = async () => {
        try {
            await base44.entities.Annotation.create({
                target_type: targetType,
                target_id: targetId,
                ...formData
            });
            
            setFormData({ annotation_text: '', highlight_text: '', tags: [], color: 'yellow' });
            setShowForm(false);
            await loadAnnotations();
            toast.success('Annotation added');
        } catch (error) {
            toast.error('Failed to add annotation');
        }
    };

    const handleDelete = async (id) => {
        try {
            await base44.entities.Annotation.delete(id);
            await loadAnnotations();
            toast.success('Annotation deleted');
        } catch (error) {
            toast.error('Failed to delete annotation');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Highlighter className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-orange-400">
                        Annotations ({annotations.length})
                    </h3>
                </div>
                <Button
                    onClick={() => setShowForm(!showForm)}
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                >
                    {showForm ? 'Cancel' : '+ Annotate'}
                </Button>
            </div>

            {showForm && (
                <div className="bg-slate-800 p-4 rounded-lg border border-orange-600/30 space-y-3">
                    <Input
                        placeholder="Highlighted text (optional)"
                        value={formData.highlight_text}
                        onChange={(e) => setFormData({...formData, highlight_text: e.target.value})}
                        className="bg-slate-700 border-slate-600"
                    />
                    <Textarea
                        placeholder="Your annotation..."
                        value={formData.annotation_text}
                        onChange={(e) => setFormData({...formData, annotation_text: e.target.value})}
                        className="bg-slate-700 border-slate-600"
                    />
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-400">Color:</label>
                        {['yellow', 'green', 'blue', 'red', 'purple'].map(c => (
                            <button
                                key={c}
                                onClick={() => setFormData({...formData, color: c})}
                                className={`w-6 h-6 rounded border-2 ${
                                    formData.color === c ? 'border-white' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c === 'yellow' ? '#fbbf24' : c }}
                            />
                        ))}
                    </div>
                    <Button onClick={handleCreate} className="w-full bg-orange-600 hover:bg-orange-700">
                        Create Annotation
                    </Button>
                </div>
            )}

            <div className="space-y-2">
                {annotations.map((ann) => (
                    <div
                        key={ann.id}
                        className="p-3 rounded-lg border"
                        style={{
                            backgroundColor: `${ann.color === 'yellow' ? '#fbbf24' : ann.color}20`,
                            borderColor: `${ann.color === 'yellow' ? '#fbbf24' : ann.color}40`
                        }}
                    >
                        {ann.highlight_text && (
                            <div className="text-xs text-slate-500 mb-1 italic">
                                "{ann.highlight_text}"
                            </div>
                        )}
                        <p className="text-sm text-slate-300">{ann.annotation_text}</p>
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-1">
                                {ann.tags && ann.tags.map((tag, i) => (
                                    <Badge key={i} className="text-xs bg-slate-700">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(ann.id)}
                                className="h-6 w-6"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}