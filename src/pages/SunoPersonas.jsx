
import React, { useState, useEffect, useCallback } from 'react';
import { Persona } from '@/entities/Persona';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Music, Search, Filter, Users, Zap, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PersonaCard from '@/components/personas/PersonaCard';
import PersonaEditModal from '@/components/personas/PersonaEditModal';
import { toast } from 'sonner';

export default function SunoPersonasPage() {
    const [personas, setPersonas] = useState([]);
    const [filteredPersonas, setFilteredPersonas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [hemisphereFilter, setHemisphereFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
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
        try {
            const allPersonas = await Persona.list('-priority_level');
            const sunoPersonas = allPersonas.filter(p => p.system === 'Suno' || p.system === 'Shared');
            setPersonas(sunoPersonas);
            calculateStats(sunoPersonas);
        } catch (error) {
            console.error('Failed to load Suno personas:', error);
            toast.error('Failed to load personas');
        }
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

        setFilteredPersonas(filtered);
    }, [personas, searchTerm, hemisphereFilter, categoryFilter, statusFilter]);

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

    const createDefaultSunoPersonas = async () => {
        const defaultPersonas = [
            {
                handle: "SUN001",
                name: "LyricistAI",
                system: "Suno",
                category: "Creative",
                hemisphere: "Right",
                domain: "Lyric Composition",
                capabilities: "Expert in writing compelling lyrics, storytelling through song, rhyme schemes, and emotional resonance. Specializes in Quebec French lyrics with authentic québécismes.",
                expertise_score: 0.95,
                priority_level: 10,
                status: "Active",
                processing_bias: "Creative",
                ethical_constraints: "Medium"
            },
            {
                handle: "SUN002",
                name: "MusicTheoryAI",
                system: "Suno",
                category: "Expert",
                hemisphere: "Left",
                domain: "Music Theory & Structure",
                capabilities: "Deep understanding of chord progressions, song structure, tempo, rhythm, and musical arrangements. Optimizes technical aspects of composition.",
                expertise_score: 0.9,
                priority_level: 9,
                status: "Active",
                processing_bias: "Analytical",
                ethical_constraints: "Low"
            },
            {
                handle: "SUN003",
                name: "GenreExpertAI",
                system: "Suno",
                category: "Specialized",
                hemisphere: "Central",
                domain: "Music Genres & Styles",
                capabilities: "Expert knowledge of music genres (folk, rock, rap, pop, country, etc.), cultural context, and stylistic conventions. Ensures authenticity.",
                expertise_score: 0.88,
                priority_level: 8,
                status: "Active",
                processing_bias: "Integrative",
                ethical_constraints: "Medium"
            },
            {
                handle: "SUN004",
                name: "ProductionAI",
                system: "Suno",
                category: "Advanced",
                hemisphere: "Left",
                domain: "Audio Production",
                capabilities: "Expertise in instrumentation choices, mixing considerations, vocal styles, and production techniques. Optimizes for Suno AI generation.",
                expertise_score: 0.85,
                priority_level: 7,
                status: "Active",
                processing_bias: "Analytical",
                ethical_constraints: "Low"
            },
            {
                handle: "SUN005",
                name: "CulturalAI",
                system: "Suno",
                category: "Specialized",
                hemisphere: "Right",
                domain: "Cultural Context",
                capabilities: "Deep knowledge of Quebec culture, references, colloquialisms, and cultural authenticity. Ensures lyrics resonate with local audiences.",
                expertise_score: 0.92,
                priority_level: 9,
                status: "Active",
                processing_bias: "Creative",
                ethical_constraints: "High"
            },
            {
                handle: "SUN006",
                name: "SunoModerator",
                system: "Suno",
                category: "Expert",
                hemisphere: "Central",
                domain: "Debate Moderation & Suno Compliance",
                capabilities: "Moderates creative debates, ensures strict adherence to Suno 5.0 Beta guidelines (individual tags, structure, BPM/Key notation). Activates web search to gather context, technical solutions, genre references, and cultural/musical knowledge when needed. Keeps the debate focused on producing optimal Suno prompts.",
                default_instructions: "You are SunoModerator. Your role is to:\n1. **Keep the debate centered**: Ensure all personas stay focused on creating the best Suno prompt for the user's request\n2. **Enforce Suno 5.0 Beta rules**: Verify individual tags, [STYLE]/[LYRICS] structure, BPM/Key notation, time signatures\n3. **Activate web search intelligently**: When technical details are missing (e.g., BPM of a genre, cultural context, instrument specifics), trigger web search to enrich the prompt creation\n4. **Resolve conflicts**: Mediate when personas disagree on stylistic choices\n5. **Ensure completeness**: Check that all required elements are present before finalizing\n\nYou MUST call for web search when:\n- Genre-specific technical details needed (BPM ranges, typical instruments)\n- Cultural/historical context required (Quebec references, era-specific sounds)\n- Technical problems encountered (unusual time signatures, rare instruments)\n- User mentions a specific artist style (research without naming in tags)\n\nFormat your interventions clearly and cite sources when using web-retrieved information.",
                expertise_score: 0.93,
                priority_level: 10,
                status: "Active",
                processing_bias: "Integrative",
                ethical_constraints: "High"
            }
        ];

        setIsLoading(true);
        try {
            for (const persona of defaultPersonas) {
                await Persona.create(persona);
            }
            toast.success('Default Suno personas created successfully!');
            loadPersonas();
        } catch (error) {
            console.error('Failed to create default personas:', error);
            toast.error('Failed to create default personas');
        }
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Music className="w-12 h-12 animate-pulse mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600">Loading Suno personas...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Music className="w-8 h-8 text-purple-600" />
                                <h1 className="text-3xl font-bold text-slate-900">Suno AI Personas</h1>
                            </div>
                            <div className="flex gap-2">
                                {personas.length === 0 && (
                                    <Button onClick={createDefaultSunoPersonas} className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Default Personas
                                    </Button>
                                )}
                                <Button onClick={loadPersonas} variant="outline" size="sm">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                        <p className="text-slate-600 mb-6">
                            Specialized AI personas for music composition and lyric generation with Suno AI.
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <div className="bg-white rounded-lg p-4 border">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm text-slate-600">Total</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-slate-600">Active</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border">
                                <div className="flex items-center gap-2">
                                    <Music className="w-5 h-5 text-blue-600" />
                                    <span className="text-sm text-slate-600">Analytical</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.left}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border">
                                <div className="flex items-center gap-2">
                                    <Music className="w-5 h-5 text-pink-600" />
                                    <span className="text-sm text-slate-600">Creative</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.right}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border">
                                <div className="flex items-center gap-2">
                                    <Music className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm text-slate-600">Integration</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{stats.central}</p>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-lg border p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-64">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search Suno personas..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <Select value={hemisphereFilter} onValueChange={setHemisphereFilter}>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Hemisphere" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Hemispheres</SelectItem>
                                        <SelectItem value="Left">Left (Analytical)</SelectItem>
                                        <SelectItem value="Right">Right (Creative)</SelectItem>
                                        <SelectItem value="Central">Central (Integration)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        <SelectItem value="Creative">Creative</SelectItem>
                                        <SelectItem value="Expert">Expert</SelectItem>
                                        <SelectItem value="Specialized">Specialized</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Enabled">Enabled</SelectItem>
                                        <SelectItem value="Disabled">Disabled</SelectItem>
                                    </SelectContent>
                                </Select>

                                {(searchTerm || hemisphereFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all') && (
                                    <button
                                        onClick={resetFilters}
                                        className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
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
                            <h2 className="text-xl font-semibold text-slate-900">
                                Suno Personas ({filteredPersonas.length})
                            </h2>
                            {filteredPersonas.length !== personas.length && (
                                <Badge variant="secondary">
                                    Showing {filteredPersonas.length} of {personas.length}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Persona Grid */}
                    {filteredPersonas.length === 0 ? (
                        <div className="text-center py-12">
                            <Music className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Suno personas found</h3>
                            <p className="text-slate-600 mb-4">
                                {personas.length === 0 
                                    ? "Create default personas to get started with Suno AI composition."
                                    : "Try adjusting your search or filter criteria."
                                }
                            </p>
                            {personas.length === 0 ? (
                                <Button onClick={createDefaultSunoPersonas} className="bg-purple-600 hover:bg-purple-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Default Personas
                                </Button>
                            ) : (
                                <button
                                    onClick={resetFilters}
                                    className="text-purple-600 hover:text-purple-700 font-medium"
                                >
                                    Reset filters
                                </button>
                            )}
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
                </div>
            </div>

            {/* Edit Modal */}
            {editingPersona && (
                <PersonaEditModal
                    persona={editingPersona}
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onUpdate={loadPersonas}
                />
            )}
        </>
    );
}
