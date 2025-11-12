import { App, TFile } from 'obsidian';

export interface GraphNode {
    id: string;
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

export function buildGraphData(app: App, rootPath: string, maxOutDepth: number, maxInDepth: number, showNeighborLinks: boolean): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    const rootFile = app.vault.getAbstractFileByPath(rootPath);
    if (!(rootFile instanceof TFile)) return { nodes: [], edges: [] };

    nodesMap.set(rootPath, { id: rootPath, depth: 0, direction: 'root' });
    
    // --- Outgoing Links ---
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

    // --- Incoming Links ---
    const incomingQueue: { path: string, depth: number }[] = [{ path: rootPath, depth: 0 }];
    const visitedIncoming = new Set<string>([rootPath]);

    while (incomingQueue.length > 0) {
        const { path, depth } = incomingQueue.shift()!;
        if (depth >= maxInDepth) continue;
        
        const currentFile = app.vault.getAbstractFileByPath(path);
        if (!(currentFile instanceof TFile)) continue;
        
        const backlinks = app.metadataCache.getBacklinksForFile(currentFile).data;
        for (const sourcePath of backlinks.keys()) {
            if (!app.vault.getAbstractFileByPath(sourcePath)) continue;
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
    
    // --- Filter Edges if showNeighborLinks is false ---
    let finalEdges = edges;
    if (!showNeighborLinks) {
        finalEdges = edges.filter(edge => {
            const sourceNode = nodesMap.get(edge.source);
            const targetNode = nodesMap.get(edge.target);
            // An edge is valid if it connects to the root, or if it connects nodes of different depths.
            // This filters out edges between nodes at the same depth level (neighbors).
            return sourceNode?.depth !== targetNode?.depth || sourceNode?.direction === 'root' || targetNode?.direction === 'root';
        });
    }

    return { nodes: Array.from(nodesMap.values()), edges: finalEdges };
}