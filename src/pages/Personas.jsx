
import React, { useState, useEffect, useCallback } from 'react';
import { Persona } from '@/entities/Persona';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, Filter, Users, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PersonaCard from '@/components/personas/PersonaCard';
import PersonaEditModal from '@/components/personas/PersonaEditModal';

export default function PersonasPage() {
    const [personas, setPersonas] = useState([]);
    const [filteredPersonas, setFilteredPersonas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [hemisphereFilter, setHemisphereFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, left: 0, right: 0, central: 0 });
    const [editingPersona, setEditingPersona] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const calculateStats = useCallback((personaList) => {
        const stats = {
            total: personaList.length,
            active: personaList.filter(p => p.status === 'Active').length,
            left: personaList.filter(p => p.hemisphere === 'Left').length,
            right: personaList.filter(p => p.hemisphere === 'Right').length,
            central: personaList.filter(p => p.hemisphere === 'Central').length
        };
        setStats(stats);
    }, []);

    const loadPersonas = useCallback(async () => {
        setIsLoading(true);
        const fetchedPersonas = await Persona.list('-priority_level');
        setPersonas(fetchedPersonas);
        calculateStats(fetchedPersonas);
        setIsLoading(false);
    }, [calculateStats]);

    const filterPersonas = useCallback(() => {
        let filtered = personas;

        if (searchTerm) {
            filtered = filtered.filter(persona => 
                persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                persona.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                persona.capabilities?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (hemisphereFilter !== 'all') {
            filtered = filtered.filter(persona => persona.hemisphere === hemisphereFilter);
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(persona => persona.category === categoryFilter);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(persona => persona.status === statusFilter);
        }

        if (priorityFilter !== 'all') {
            filtered = filtered.filter(persona => {
                const priority = persona.priority_level;
                switch (priorityFilter) {
                    case 'high': return priority >= 8;
                    case 'medium': return priority >= 5 && priority < 8;
                    case 'low': return priority < 5;
                    default: return true;
                }
            });
        }

        setFilteredPersonas(filtered);
    }, [personas, searchTerm, hemisphereFilter, categoryFilter, priorityFilter, statusFilter]);

    useEffect(() => {
        loadPersonas();
    }, [loadPersonas]);

    useEffect(() => {
        filterPersonas();
    }, [filterPersonas]);

    const resetFilters = () => {
        setSearchTerm('');
        setHemisphereFilter('all');
        setCategoryFilter('all');
        setPriorityFilter('all');
        setStatusFilter('all');
    };

    const handleEditPersona = (persona) => {
        setEditingPersona(persona);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingPersona(null);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
                <div className="text-center">
                    <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-200">Loading personas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Brain className="w-8 h-8 text-indigo-400" />
                            <h1 className="text-3xl font-bold text-slate-50">Neuronas AI Personas</h1>
                        </div>
                        <Button onClick={loadPersonas} variant="outline" size="sm" className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-slate-50">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                    <p className="text-slate-300 mb-6">
                        Comprehensive ecosystem of specialized AI personas for advanced multi-agent debate and reasoning.
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">Total</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-50">{stats.total}</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-slate-400">Active</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-50">{stats.active}</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-slate-400">Analytical</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-50">{stats.left}</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-pink-400" />
                                <span className="text-sm text-slate-400">Creative</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-50">{stats.right}</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                <span className="text-sm text-slate-400">Integration</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-50">{stats.central}</p>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-64">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                                    <Input
                                        placeholder="Search personas by name, domain, or capabilities..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            <Select value={hemisphereFilter} onValueChange={setHemisphereFilter}>
                                <SelectTrigger className="w-48 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                                    <SelectValue placeholder="Hemisphere" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="all">All Hemispheres</SelectItem>
                                    <SelectItem value="Left">Left (Analytical)</SelectItem>
                                    <SelectItem value="Right">Right (Creative)</SelectItem>
                                    <SelectItem value="Central">Central (Integration)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="Core">Core</SelectItem>
                                    <SelectItem value="Standard">Standard</SelectItem>
                                    <SelectItem value="Advanced">Advanced</SelectItem>
                                    <SelectItem value="Experimental">Experimental</SelectItem>
                                    <SelectItem value="Expert">Expert</SelectItem>
                                    <SelectItem value="Theorist">Theorist</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Enabled">Enabled</SelectItem>
                                    <SelectItem value="Disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-32 bg-slate-900 border-slate-700 text-slate-100 hover:bg-slate-800">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100">
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="high">High (8-10)</SelectItem>
                                    <SelectItem value="medium">Medium (5-7)</SelectItem>
                                    <SelectItem value="low">Low (1-4)</SelectItem>
                                </SelectContent>
                            </Select>

                            {(searchTerm || hemisphereFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all') && (
                                <button
                                    onClick={resetFilters}
                                    className="px-3 py-2 text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                >
                                    <Filter className="w-4 h-4" />
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Results */}
                <div className="mb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-slate-50">
                            Personas ({filteredPersonas.length})
                        </h2>
                        {filteredPersonas.length !== personas.length && (
                            <Badge variant="secondary" className="bg-slate-700 text-slate-200 border-slate-600">
                                Showing {filteredPersonas.length} of {personas.length}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Persona Grid */}
                {filteredPersonas.length === 0 ? (
                    <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
                        <Brain className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                        <h3 className="text-lg font-semibold text-slate-50 mb-2">No personas found</h3>
                        <p className="text-slate-300 mb-4">Try adjusting your search or filter criteria.</p>
                        <button
                            onClick={resetFilters}
                            className="text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                            Reset filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredPersonas.map((persona) => (
                            <PersonaCard 
                                key={persona.id} 
                                persona={persona} 
                                onUpdate={loadPersonas}
                                onEdit={handleEditPersona}
                            />
                        ))}
                    </div>
                )}

                {/* Edit Modal */}
                {editingPersona && (
                    <PersonaEditModal
                        persona={editingPersona}
                        isOpen={isEditModalOpen}
                        onClose={handleCloseEditModal}
                        onUpdate={loadPersonas}
                    />
                )}
            </div>
        </div>
    );
}
