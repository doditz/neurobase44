import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * EXTERNAL KNOWLEDGE SEARCH
 * Interroge des sources de connaissances ouvertes et gratuites (sans clé API)
 * - Wikipedia pour contexte général
 * - arXiv pour recherche académique
 * - GitHub API publique pour code/projets
 * - CrossRef pour articles scientifiques
 * - DBpedia pour données structurées
 */

Deno.serve(async (req) => {
    const logs = [];
    
    const logManager = {
        _addLog: (level, message, data = {}) => {
            logs.push({ timestamp: Date.now(), level, message, data });
            console.log(`[ExternalKnowledge][${level.toUpperCase()}] ${message}`, data);
        },
        info: (msg, data) => logManager._addLog('info', msg, data),
        success: (msg, data) => logManager._addLog('success', msg, data),
        warning: (msg, data) => logManager._addLog('warning', msg, data),
        error: (msg, data) => logManager._addLog('error', msg, data)
    };

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            query,
            sources = ['wikipedia', 'arxiv', 'github'], // Sources par défaut
            max_results = 5
        } = await req.json();

        if (!query || !query.trim()) {
            return Response.json({ 
                success: false, 
                error: 'query is required' 
            }, { status: 400 });
        }

        logManager.info('Starting external knowledge search', {
            query: query.substring(0, 100),
            sources,
            max_results
        });

        const results = {
            query,
            sources_queried: [],
            total_results: 0,
            knowledge_items: [],
            citations: []
        };

        // WIKIPEDIA SEARCH (anonyme, gratuit)
        if (sources.includes('wikipedia')) {
            logManager.info('Querying Wikipedia');
            try {
                const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${max_results}&namespace=0&format=json`;
                
                const wikiResponse = await fetch(wikiUrl);
                const wikiData = await wikiResponse.json();
                
                if (wikiData && wikiData.length >= 4) {
                    const titles = wikiData[1];
                    const descriptions = wikiData[2];
                    const urls = wikiData[3];
                    
                    for (let i = 0; i < titles.length; i++) {
                        results.knowledge_items.push({
                            source: 'wikipedia',
                            type: 'encyclopedia',
                            title: titles[i],
                            description: descriptions[i],
                            url: urls[i],
                            relevance: 'high'
                        });
                        
                        results.citations.push({
                            source: 'Wikipedia',
                            title: titles[i],
                            url: urls[i],
                            accessed: new Date().toISOString()
                        });
                    }
                    
                    results.sources_queried.push('wikipedia');
                    logManager.success(`Wikipedia: ${titles.length} results`);
                }
            } catch (wikiError) {
                logManager.warning(`Wikipedia search failed: ${wikiError.message}`);
            }
        }

        // ARXIV SEARCH (recherche académique, anonyme)
        if (sources.includes('arxiv')) {
            logManager.info('Querying arXiv');
            try {
                const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${max_results}`;
                
                const arxivResponse = await fetch(arxivUrl);
                const arxivXml = await arxivResponse.text();
                
                // Parse XML simplement (pas de librairie XML pour rester léger)
                const entries = arxivXml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
                
                for (const entry of entries.slice(0, max_results)) {
                    const titleMatch = entry.match(/<title>(.*?)<\/title>/);
                    const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/);
                    const linkMatch = entry.match(/<id>(.*?)<\/id>/);
                    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
                    
                    if (titleMatch && linkMatch) {
                        const title = titleMatch[1].replace(/\s+/g, ' ').trim();
                        const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().substring(0, 300) : '';
                        const url = linkMatch[1].trim();
                        const published = publishedMatch ? publishedMatch[1].trim().split('T')[0] : '';
                        
                        results.knowledge_items.push({
                            source: 'arxiv',
                            type: 'academic_paper',
                            title,
                            description: summary,
                            url,
                            published_date: published,
                            relevance: 'high'
                        });
                        
                        results.citations.push({
                            source: 'arXiv',
                            title,
                            url,
                            published_date: published,
                            accessed: new Date().toISOString()
                        });
                    }
                }
                
                results.sources_queried.push('arxiv');
                logManager.success(`arXiv: ${entries.length} results`);
            } catch (arxivError) {
                logManager.warning(`arXiv search failed: ${arxivError.message}`);
            }
        }

        // GITHUB SEARCH (API publique, anonyme)
        if (sources.includes('github')) {
            logManager.info('Querying GitHub');
            try {
                const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${max_results}`;
                
                const githubResponse = await fetch(githubUrl, {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'Neuronas-AI-App'
                    }
                });
                
                const githubData = await githubResponse.json();
                
                if (githubData.items) {
                    for (const repo of githubData.items) {
                        results.knowledge_items.push({
                            source: 'github',
                            type: 'code_repository',
                            title: repo.full_name,
                            description: repo.description || 'No description',
                            url: repo.html_url,
                            stars: repo.stargazers_count,
                            language: repo.language,
                            updated: repo.updated_at,
                            relevance: repo.stargazers_count > 1000 ? 'high' : 'medium'
                        });
                        
                        results.citations.push({
                            source: 'GitHub',
                            title: repo.full_name,
                            url: repo.html_url,
                            stars: repo.stargazers_count,
                            accessed: new Date().toISOString()
                        });
                    }
                    
                    results.sources_queried.push('github');
                    logManager.success(`GitHub: ${githubData.items.length} results`);
                }
            } catch (githubError) {
                logManager.warning(`GitHub search failed: ${githubError.message}`);
            }
        }

        // CROSSREF SEARCH (articles scientifiques, anonyme)
        if (sources.includes('crossref')) {
            logManager.info('Querying CrossRef');
            try {
                const crossrefUrl = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${max_results}`;
                
                const crossrefResponse = await fetch(crossrefUrl);
                const crossrefData = await crossrefResponse.json();
                
                if (crossrefData.message && crossrefData.message.items) {
                    for (const item of crossrefData.message.items) {
                        const title = item.title ? item.title[0] : 'Untitled';
                        const authors = item.author ? item.author.map(a => `${a.given} ${a.family}`).join(', ') : 'Unknown';
                        const doi = item.DOI;
                        const url = doi ? `https://doi.org/${doi}` : '';
                        const published = item.published ? item.published['date-parts'][0].join('-') : '';
                        
                        results.knowledge_items.push({
                            source: 'crossref',
                            type: 'scientific_article',
                            title,
                            authors,
                            description: item.abstract || `Published in ${item['container-title'] ? item['container-title'][0] : 'journal'}`,
                            url,
                            doi,
                            published_date: published,
                            relevance: item.score > 10 ? 'high' : 'medium'
                        });
                        
                        results.citations.push({
                            source: 'CrossRef',
                            title,
                            authors,
                            url,
                            doi,
                            published_date: published,
                            accessed: new Date().toISOString()
                        });
                    }
                    
                    results.sources_queried.push('crossref');
                    logManager.success(`CrossRef: ${crossrefData.message.items.length} results`);
                }
            } catch (crossrefError) {
                logManager.warning(`CrossRef search failed: ${crossrefError.message}`);
            }
        }

        // DBPEDIA SEARCH (données structurées, anonyme)
        if (sources.includes('dbpedia')) {
            logManager.info('Querying DBpedia');
            try {
                const dbpediaUrl = `https://lookup.dbpedia.org/api/search?query=${encodeURIComponent(query)}&maxResults=${max_results}&format=json`;
                
                const dbpediaResponse = await fetch(dbpediaUrl, {
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const dbpediaData = await dbpediaResponse.json();
                
                if (dbpediaData.docs) {
                    for (const doc of dbpediaData.docs) {
                        results.knowledge_items.push({
                            source: 'dbpedia',
                            type: 'structured_data',
                            title: doc.label ? doc.label[0] : 'Unknown',
                            description: doc.comment ? doc.comment[0].substring(0, 300) : '',
                            url: doc.resource ? doc.resource[0] : '',
                            categories: doc.category || [],
                            relevance: 'medium'
                        });
                        
                        results.citations.push({
                            source: 'DBpedia',
                            title: doc.label ? doc.label[0] : 'Unknown',
                            url: doc.resource ? doc.resource[0] : '',
                            accessed: new Date().toISOString()
                        });
                    }
                    
                    results.sources_queried.push('dbpedia');
                    logManager.success(`DBpedia: ${dbpediaData.docs.length} results`);
                }
            } catch (dbpediaError) {
                logManager.warning(`DBpedia search failed: ${dbpediaError.message}`);
            }
        }

        results.total_results = results.knowledge_items.length;

        // Générer un résumé contextuel
        let contextualSummary = '';
        if (results.total_results > 0) {
            contextualSummary = `## 📚 Sources Externes de Connaissances\n\n`;
            contextualSummary += `Recherche: "${query}"\n`;
            contextualSummary += `Sources interrogées: ${results.sources_queried.join(', ')}\n`;
            contextualSummary += `Résultats trouvés: ${results.total_results}\n\n`;
            
            results.knowledge_items.slice(0, 10).forEach((item, idx) => {
                contextualSummary += `### [${idx + 1}] ${item.title}\n`;
                contextualSummary += `**Source:** ${item.source} (${item.type})\n`;
                if (item.authors) contextualSummary += `**Auteurs:** ${item.authors}\n`;
                if (item.published_date) contextualSummary += `**Date:** ${item.published_date}\n`;
                contextualSummary += `**Description:** ${item.description}\n`;
                contextualSummary += `**URL:** ${item.url}\n\n`;
            });
        }

        logManager.success('External knowledge search completed', {
            total_results: results.total_results,
            sources: results.sources_queried.length
        });

        return Response.json({
            success: true,
            results,
            contextual_summary: contextualSummary,
            logs
        });

    } catch (error) {
        logManager.error(`Fatal error: ${error.message}`, { stack: error.stack });
        
        return Response.json({
            success: false,
            error: error.message,
            logs
        }, { status: 500 });
    }
});