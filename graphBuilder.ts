import { App, TFile } from 'obsidian';

// Define the data structures for our graph. We export them so other files can use them.
export interface GraphNode {
    id: string; // The path to the file
    depth: number;
    direction: 'root' | 'outgoing' | 'incoming';
}

export interface GraphEdge {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/**
 * Builds the graph data by traversing links from a root note.
 * @param app The Obsidian App instance.
 * @param rootPath The path of the starting note.
 * @param maxOutDepth The maximum depth for outgoing links.
 * @param maxInDepth The maximum depth for incoming links (backlinks).
 * @returns A GraphData object containing the nodes and edges.
 */
export function buildGraphData(app: App, rootPath: string, maxOutDepth: number, maxInDepth: number): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    const rootFile = app.vault.getAbstractFileByPath(rootPath);
    if (!(rootFile instanceof TFile)) {
        return { nodes: [], edges: [] };
    }

    nodesMap.set(rootPath, { id: rootPath, depth: 0, direction: 'root' });

    // Find outgoing links
    const outgoingQueue: { path: string, depth: number }[] = [{ path: rootPath, depth: 0 }];
    const visitedOutgoing = new Set<string>([rootPath]);

    while (outgoingQueue.length > 0) {
        const { path, depth } = outgoingQueue.shift()!;
        if (depth >= maxOutDepth) continue;

        const resolvedLinks = app.metadataCache.resolvedLinks[path] || {};
        for (const targetPath in resolvedLinks) {
            if (!nodesMap.has(targetPath)) {
                nodesMap.set(targetPath, { id: targetPath, depth: depth + 1, direction: 'outgoing' });
                
                if (!visitedOutgoing.has(targetPath)) {
                    visitedOutgoing.add(targetPath);
                    outgoingQueue.push({ path: targetPath, depth: depth + 1 });
                }
            }
            edges.push({ source: path, target: targetPath });
        }
    }

    // Find incoming links (backlinks)
    const incomingQueue: { path: string, depth: number }[] = [{ path: rootPath, depth: 0 }];
    const visitedIncoming = new Set<string>([rootPath]);

    while (incomingQueue.length > 0) {
        const { path, depth } = incomingQueue.shift()!;
        if (depth >= maxInDepth) continue;

        const currentFile = app.vault.getAbstractFileByPath(path);
        if (!(currentFile instanceof TFile)) continue;
        
        const backlinks = app.metadataCache.getBacklinksForFile(currentFile).data;
        for (const sourcePath in backlinks) {
            // IMPROVEMENT: Ensure the source file actually exists before processing.
            // This prevents errors if the cache contains stale links to deleted files.
            if (!app.vault.getAbstractFileByPath(sourcePath)) {
                continue;
            }

            if (!nodesMap.has(sourcePath)) {
                nodesMap.set(sourcePath, { id: sourcePath, depth: depth + 1, direction: 'incoming' });

                if (!visitedIncoming.has(sourcePath)) {
                    visitedIncoming.add(sourcePath);
                    incomingQueue.push({ path: sourcePath, depth: depth + 1 });
                }
            }
            edges.push({ source: sourcePath, target: path });
        }
    }
    
    return { nodes: Array.from(nodesMap.values()), edges };
}