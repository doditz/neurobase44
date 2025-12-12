import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({ 
    currentPage, 
    totalPages, 
    itemsPerPage, 
    totalItems,
    onPageChange, 
    onItemsPerPageChange 
}) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between gap-4 py-4">
            {/* Items per page selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Afficher:</span>
                <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(val) => onItemsPerPageChange(parseInt(val))}
                >
                    <SelectTrigger className="w-20 h-8 bg-slate-700 border-slate-600 text-green-300">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="30">30</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-slate-400">
                    {startItem}-{endItem} sur {totalItems}
                </span>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                    <span className="text-sm text-slate-400">Page</span>
                    <span className="text-sm font-medium text-green-400 min-w-[2ch] text-center">
                        {currentPage}
                    </span>
                    <span className="text-sm text-slate-400">sur {totalPages}</span>
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}