import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileText, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportAllButton({ limit = 100 }) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState(null);

    const handleExport = async (format) => {
        setIsExporting(true);
        setExportingFormat(format);

        try {
            toast.info(`Génération de l'export ${format.toUpperCase()}...`);

            const response = await base44.functions.invoke('exportAllDevTests', {
                format,
                limit
            });

            if (!response.data) {
                throw new Error('No data received');
            }

            // Créer un blob et télécharger
            const blob = new Blob([response.data], { 
                type: format === 'json' ? 'application/json' : 
                      format === 'md' ? 'text/markdown' : 
                      format === 'pdf' ? 'text/html' : 'text/plain' 
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `neuronas_devtests_${Date.now()}.${format === 'pdf' ? 'html' : format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            toast.success(`✅ Export ${format.toUpperCase()} téléchargé avec succès !`);
        } catch (error) {
            console.error('[Export All] Error:', error);
            toast.error(`Erreur lors de l'export: ${error.message}`);
        } finally {
            setIsExporting(false);
            setExportingFormat(null);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    disabled={isExporting}
                    className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-slate-50"
                >
                    {isExporting ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Export {exportingFormat?.toUpperCase()}...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4 mr-2" />
                            Exporter Tout
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700">
                <DropdownMenuLabel className="text-green-400">
                    Choisir le format
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                
                <DropdownMenuItem 
                    onClick={() => handleExport('json')}
                    className="text-slate-200 hover:bg-slate-700 hover:text-green-400 cursor-pointer"
                >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON (Données complètes)
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => handleExport('md')}
                    className="text-slate-200 hover:bg-slate-700 hover:text-green-400 cursor-pointer"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Markdown (Lisible)
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => handleExport('txt')}
                    className="text-slate-200 hover:bg-slate-700 hover:text-green-400 cursor-pointer"
                >
                    <FileType className="w-4 h-4 mr-2" />
                    TXT (Simple)
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                    onClick={() => handleExport('pdf')}
                    className="text-slate-200 hover:bg-slate-700 hover:text-green-400 cursor-pointer"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF (Imprimer HTML)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}