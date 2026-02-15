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
import { downloadFile, generateFilename } from '@/components/utils/FileExporter';

export default function ExportAllButton({ limit = 100 }) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportingFormat, setExportingFormat] = useState(null);

    const handleExport = async (format) => {
        setIsExporting(true);
        setExportingFormat(format);

        try {
            toast.info(`Generating ${format.toUpperCase()} export...`);

            const response = await base44.functions.invoke('exportAllDevTests', { format, limit });

            if (!response.data) throw new Error('No data received');

            const content = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
            const ext = format === 'pdf' ? 'html' : format;
            downloadFile(content, generateFilename('neuronas_devtests', ext), ext);

            toast.success(`${format.toUpperCase()} export downloaded!`);
        } catch (error) {
            console.error('[Export All] Error:', error);
            toast.error(`Export error: ${error.message}`);
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