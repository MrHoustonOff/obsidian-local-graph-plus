import { ItemView, WorkspaceLeaf } from 'obsidian';
import * as d3 from 'd3';
import LocalGraphPlugin from './main';
import { buildGraphData, GraphData, GraphNode as DataNode } from './graphBuilder';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-pro-view";

// D3 simulation requires nodes to have x, y, etc.
// We extend our DataNode with D3's SimulationNodeDatum
interface SimNode extends DataNode, d3.SimulationNodeDatum {}

export class LocalGraphView extends ItemView {
    plugin: LocalGraphPlugin;
    private simulation: d3.Simulation<SimNode, any> | null = null;
    private currentFilePath: string | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: LocalGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return LOCAL_GRAPH_VIEW_TYPE;
    }

    getDisplayText(): string {
        // We will make this dynamic later
        return "Local Graph";
    }

    getIcon(): string {
        return "network";
    }

    // This is the primary way for other parts of the plugin to update the view
    async setState(state: any, result: any): Promise<void> {
        this.currentFilePath = state.filePath;
        
        // Use requestAnimationFrame to ensure the DOM is ready for drawing
        requestAnimationFrame(() => {
            this.drawGraph();
        });

        return super.setState(state, result);
    }

    async onOpen(): Promise<void> {
        // The initial drawing will be triggered by setState from the main plugin
    }

    async onClose(): Promise<void> {
        if (this.simulation) {
            this.simulation.stop();
        }
    }

    private drawGraph(): void {
        const container = this.containerEl.children[1];
        container.empty();

        if (!this.currentFilePath) {
            container.createEl("h3", { text: "No file is active." });
            return;
        }

        // We use default depths for now. We will make these configurable later.
        const graphData: GraphData = buildGraphData(this.app, this.currentFilePath, 2, 1);
        
        if (graphData.nodes.length <= 1) {
            container.createEl("h3", { text: "No local links for this file." });
            return;
        }

        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width === 0 || height === 0) return;

        const nodes: SimNode[] = graphData.nodes.map(n => ({...n}));
        const edges = graphData.edges.map(e => ({...e}));

        const svg = d3.select(container).append("svg")
            .attr("width", "100%")
            .attr("height", "100%");

        const g = svg.append("g");

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-250))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g")
            .selectAll("line")
            .data(edges)
            .join("line")
            .attr("stroke", "rgba(160, 160, 160, 0.6)")
            .attr("stroke-width", 1.5);

        const node = g.append("g")
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 10)
            .attr("fill", "#ff6600")
            .call(this.dragHandler());
        
        const labels = g.append("g")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text(d => d.id.split('/').pop()?.replace('.md', '') ?? d.id)
            .attr("font-size", 10)
            .attr("dx", 15)
            .attr("dy", 4)
            .style("fill", "var(--text-normal)");

        this.simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as SimNode).x!)
                .attr("y1", d => (d.source as SimNode).y!)
                .attr("x2", d => (d.target as SimNode).x!)
                .attr("y2", d => (d.target as SimNode).y!);
            node
                .attr("cx", d => d.x!)
                .attr("cy", d => d.y!);
            labels
                .attr("x", d => d.x!)
                .attr("y", d => d.y!);
        });
    }

    private dragHandler() {
        const dragstarted = (event: any, d: SimNode) => {
            if (!event.active && this.simulation) {
                this.simulation.alphaTarget(0.3).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        }

        const dragged = (event: any, d: SimNode) => {
            d.fx = event.x;
            d.fy = event.y;
        }

        const dragended = (event: any, d: SimNode) => {
            if (!event.active && this.simulation) {
                this.simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        }

        return d3.drag<SVGCircleElement, SimNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}