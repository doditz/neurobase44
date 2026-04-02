import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PERSONA CLEANUP SERVICE v2 - Nettoyage Agressif des Doublons
 * Détecte et supprime TOUS les doublons exacts par nom (même si handle différent)
 */

Deno.serve(async (req) => {
    const logs = [];
    const addLog = (msg) => {
        logs.push(`[${Date.now()}] ${msg}`);
        console.log(`[PersonaCleanup] ${msg}`);
    };

    try {
        addLog('=== PERSONA CLEANUP SERVICE v2 START ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
        }

        const { 
            similarity_threshold = 0.85,
            dry_run = true,
            aggressive_name_dedup = true
        } = await req.json();

        addLog('Loading all personas...');
        const allPersonas = await base44.asServiceRole.entities.Persona.list();
        addLog(`Loaded ${allPersonas.length} personas`);

        // STRATÉGIE 1: Grouper par NOM (plus agressif que handle)
        const personasByName = {};
        for (const persona of allPersonas) {
            const name = persona.name;
            if (!personasByName[name]) {
                personasByName[name] = [];
            }
            personasByName[name].push(persona);
        }

        const nameDuplicates = [];
        let totalToDelete = 0;

        for (const [name, personas] of Object.entries(personasByName)) {
            if (personas.length > 1) {
                // Critères de tri pour garder le meilleur:
                // 1. Plus récent (created_date)
                // 2. Plus de détails (default_instructions existe)
                // 3. Plus haut expertise_score
                personas.sort((a, b) => {
                    // Préférer ceux avec default_instructions
                    if (a.default_instructions && !b.default_instructions) return -1;
                    if (!a.default_instructions && b.default_instructions) return 1;
                    
                    // Puis par date de création (plus récent)
                    const dateA = new Date(a.created_date).getTime();
                    const dateB = new Date(b.created_date).getTime();
                    if (dateB !== dateA) return dateB - dateA;
                    
                    // Puis par expertise_score
                    return (b.expertise_score || 0) - (a.expertise_score || 0);
                });

                const toKeep = personas[0];
                const toDelete = personas.slice(1);
                
                nameDuplicates.push({
                    name,
                    count: personas.length,
                    keep: {
                        id: toKeep.id,
                        handle: toKeep.handle,
                        created: toKeep.created_date,
                        has_instructions: !!toKeep.default_instructions
                    },
                    delete: toDelete.map(p => ({
                        id: p.id,
                        handle: p.handle,
                        created: p.created_date
                    }))
                });
                
                totalToDelete += toDelete.length;
                addLog(`Found ${personas.length} copies of "${name}" - keeping ${toKeep.handle || toKeep.id.substring(0, 8)}`);
            }
        }

        // STRATÉGIE 2: Grouper par handle identique (sécurité supplémentaire)
        const personasByHandle = {};
        for (const persona of allPersonas) {
            const handle = persona.handle;
            if (handle && !personasByHandle[handle]) {
                personasByHandle[handle] = [];
            }
            if (handle) {
                personasByHandle[handle].push(persona);
            }
        }

        const handleDuplicates = [];
        for (const [handle, personas] of Object.entries(personasByHandle)) {
            if (personas.length > 1) {
                // Éviter de compter deux fois si déjà dans nameDuplicates
                const alreadyCounted = nameDuplicates.find(nd => 
                    nd.name === personas[0].name
                );
                
                if (!alreadyCounted) {
                    personas.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
                    const toKeep = personas[0];
                    const toDelete = personas.slice(1);
                    
                    handleDuplicates.push({
                        handle,
                        count: personas.length,
                        keep: toKeep.id,
                        delete: toDelete.map(p => p.id)
                    });
                    
                    totalToDelete += toDelete.length;
                    addLog(`Found ${personas.length} exact handle duplicates for ${handle}`);
                }
            }
        }

        // NETTOYAGE
        const deletionResults = {
            name_duplicates_deleted: [],
            handle_duplicates_deleted: [],
            errors: []
        };

        if (!dry_run && aggressive_name_dedup) {
            addLog(`Starting AGGRESSIVE cleanup (NOT DRY RUN) - ${totalToDelete} personas to delete...`);
            
            // Supprimer doublons par nom
            for (const duplicate of nameDuplicates) {
                for (const personaToDelete of duplicate.delete) {
                    try {
                        await base44.asServiceRole.entities.Persona.delete(personaToDelete.id);
                        deletionResults.name_duplicates_deleted.push(personaToDelete.id);
                        addLog(`✅ Deleted "${duplicate.name}" duplicate: ${personaToDelete.handle || personaToDelete.id.substring(0, 8)}`);
                    } catch (error) {
                        deletionResults.errors.push({ 
                            id: personaToDelete.id, 
                            name: duplicate.name,
                            error: error.message 
                        });
                        addLog(`❌ Failed to delete ${personaToDelete.id}: ${error.message}`);
                    }
                }
            }

            // Supprimer doublons par handle (si pas déjà supprimés)
            for (const duplicate of handleDuplicates) {
                for (const personaId of duplicate.delete) {
                    if (!deletionResults.name_duplicates_deleted.includes(personaId)) {
                        try {
                            await base44.asServiceRole.entities.Persona.delete(personaId);
                            deletionResults.handle_duplicates_deleted.push(personaId);
                            addLog(`✅ Deleted handle duplicate: ${duplicate.handle}`);
                        } catch (error) {
                            deletionResults.errors.push({ id: personaId, error: error.message });
                            addLog(`❌ Failed to delete ${personaId}: ${error.message}`);
                        }
                    }
                }
            }
        } else {
            addLog('DRY RUN - No deletions performed');
        }

        const stats = {
            total_personas: allPersonas.length,
            unique_names: Object.keys(personasByName).length,
            name_duplicates_found: nameDuplicates.length,
            total_duplicates_to_delete: totalToDelete,
            personas_after_cleanup: allPersonas.length - deletionResults.name_duplicates_deleted.length - deletionResults.handle_duplicates_deleted.length
        };

        addLog(`=== CLEANUP COMPLETE ===`);
        addLog(`Found ${nameDuplicates.length} groups of name duplicates (${totalToDelete} personas to delete)`);
        addLog(`Deleted: ${deletionResults.name_duplicates_deleted.length + deletionResults.handle_duplicates_deleted.length}, Errors: ${deletionResults.errors.length}`);

        return Response.json({
            success: true,
            dry_run,
            stats,
            name_duplicates: nameDuplicates,
            handle_duplicates: handleDuplicates,
            deletion_results: deletionResults,
            logs
        });

    } catch (error) {
        addLog(`FATAL ERROR: ${error.message}`);
        console.error('[PersonaCleanup] Fatal error:', error);
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});