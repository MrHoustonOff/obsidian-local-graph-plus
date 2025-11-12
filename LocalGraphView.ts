import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as d3 from 'd3';
import { buildGraphData } from './graphBuilder';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-pro-view";

// Define interfaces for our graph data for type safety
interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
}

interface GraphEdge {
    source: string;
    target: string;
}

interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export class LocalGraphView extends ItemView {
    private simulation: d3.Simulation<GraphNode, GraphEdge> | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return LOCAL_GRAPH_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Local Graph";
    }

    getIcon(): string {
        return "network";
    }

    async onOpen(): Promise<void> {
        // Use requestAnimationFrame to wait for the container to be properly sized
        requestAnimationFrame(() => {
            this.drawGraph();
        });
    }

    async onClose(): Promise<void> {
        // Stop the simulation when the view is closed to save resources
        if (this.simulation) {
            this.simulation.stop();
        }
    }

    private drawGraph(): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
            console.log(`[Local Graph Pro] Building graph for: ${activeFile.path}`);
            // We temporarily hardcode the depth for testing purposes
            const graphData = buildGraphData(this.app, activeFile.path, 2, 1);
            console.log("[Local Graph Pro] Collected Data:", graphData);
        }
        const container = this.containerEl.children[1];
        container.empty();

        const staticData: GraphData = {
            nodes: [
                { id: 'Root Note' },
                { id: 'Outgoing Lvl 1' },
                { id: 'Outgoing Lvl 2' },
                { id: 'Incoming Lvl 1' },
                { id: 'Another Outgoing' },
            ],
            edges: [
                { source: 'Root Note', target: 'Outgoing Lvl 1' },
                { source: 'Outgoing Lvl 1', target: 'Outgoing Lvl 2' },
                { source: 'Incoming Lvl 1', target: 'Root Note' },
                { source: 'Root Note', target: 'Another Outgoing' },
            ]
        };

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) {
            return;
        }

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        const g = svg.append("g");

        // The simulation must be initialized before we attach the drag handler
        // so that the handler can reference it.
        this.simulation = d3.forceSimulation(staticData.nodes)
            .force("link", d3.forceLink<GraphNode, GraphEdge>(staticData.edges).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-250))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g")
            .selectAll("line")
            .data(staticData.edges)
            .join("line")
            .attr("stroke", "rgba(160, 160, 160, 0.6)")
            .attr("stroke-width", 1.5);

        const node = g.append("g")
            .selectAll("circle")
            .data(staticData.nodes)
            .join("circle")
            .attr("r", 10)
            .attr("fill", "#ff6600")
            // CHANGE: We now call the drag handler which will correctly reference this.simulation
            .call(this.dragHandler());

        const labels = g.append("g")
            .selectAll("text")
            .data(staticData.nodes)
            .join("text")
            .text(d => d.id)
            .attr("font-size", 10)
            .attr("dx", 15)
            .attr("dy", 4)
            .style("fill", "var(--text-normal)");

        this.simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as GraphNode).x!)
                .attr("y1", d => (d.source as GraphNode).y!)
                .attr("x2", d => (d.target as GraphNode).x!)
                .attr("y2", d => (d.target as GraphNode).y!);
            node
                .attr("cx", d => d.x!)
                .attr("cy", d => d.y!);
            labels
                .attr("x", d => d.x!)
                .attr("y", d => d.y!);
        });
    }

    // CHANGE: The drag handler now directly references `this.simulation`
    // and doesn't need any arguments. We use arrow functions to ensure
    // `this` refers to the LocalGraphView class instance.
    private dragHandler() {
        const dragstarted = (event: any, d: GraphNode) => {
            if (!event.active && this.simulation) {
                this.simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }

        const dragged = (event: any, d: GraphNode) => {
            d.fx = event.x;
            d.fy = event.y;
        }

        const dragended = (event: any, d: GraphNode) => {
            if (!event.active && this.simulation) {
                this.simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        }

        return d3.drag<SVGCircleElement, GraphNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}