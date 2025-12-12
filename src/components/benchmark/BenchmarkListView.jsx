import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import BenchmarkCard from './BenchmarkCard';
import PaginationControls from './PaginationControls';

export default function BenchmarkListView({ 
    benchmarks = [],
    title = "Historique des Benchmarks",
    icon: Icon = null,
    onViewDetails,
    onDownload,
    selectedBenchmarkId = null,
    showCategory = true,
    isLoading = false
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const totalPages = Math.ceil(benchmarks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentBenchmarks = benchmarks.slice(startIndex, endIndex);

    const handlePageChange = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const handleItemsPerPageChange = (value) => {
        setItemsPerPage(value);
        setCurrentPage(1);
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                    <div className="text-slate-400">Chargement...</div>
                </CardContent>
            </Card>
        );
    }

    if (benchmarks.length === 0) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">Aucun benchmark disponible</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
                <CardTitle className="text-green-400 flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5" />}
                    {title} ({benchmarks.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Benchmark Cards */}
                <div className="space-y-3">
                    {currentBenchmarks.map((benchmark) => (
                        <BenchmarkCard
                            key={benchmark.id}
                            benchmark={benchmark}
                            onView={onViewDetails}
                            onDownload={onDownload}
                            isSelected={selectedBenchmarkId === benchmark.id}
                            showCategory={showCategory}
                        />
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        itemsPerPage={itemsPerPage}
                        totalItems={benchmarks.length}
                        onPageChange={handlePageChange}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                )}
            </CardContent>
        </Card>
    );
}