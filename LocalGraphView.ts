import { ItemView, WorkspaceLeaf, Setting } from 'obsidian';
import * as d3 from 'd3';
import LocalGraphPlugin from './main';
import { buildGraphData, GraphData, GraphNode as DataNode } from './graphBuilder';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-pro-view";

interface SimNode extends DataNode, d3.SimulationNodeDatum {}

export class LocalGraphView extends ItemView {
    plugin: LocalGraphPlugin;
    private simulation: d3.Simulation<SimNode, any> | null = null;
    private currentFilePath: string | null = null;
    // Property to hold the dynamic display name for the header
    private currentDisplayName: string = "Local Graph";

    constructor(leaf: WorkspaceLeaf, plugin: LocalGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return LOCAL_GRAPH_VIEW_TYPE;
    }

    getDisplayText(): string {
        // Now returns our dynamic property
        return this.currentDisplayName;
    }

    getIcon(): string {
        return "network";
    }

    async setState(state: any, result: any): Promise<void> {
        this.currentFilePath = state.filePath;
        if (this.currentFilePath) {
            const fileName = this.currentFilePath.split('/').pop()?.replace('.md', '') || 'Local Graph';
            // Update the display name
            this.currentDisplayName = `Graph of ${fileName}`;
            // IMPORTANT: Command Obsidian to update the view header
            this.leaf.updateHeader();
        }
        
        requestAnimationFrame(() => {
            this.drawGraph();
        });

        return super.setState(state, result);
    }

    async onOpen(): Promise<void> {
        // Add the settings cog icon to the view actions
        this.addAction('cog', 'Open graph settings', () => {
            this.toggleSettingsPanel();
        });
    }

    async onClose(): Promise<void> {
        if (this.simulation) {
            this.simulation.stop();
        }
    }

    private getNodeColor(d: SimNode): string {
        const { settings } = this.plugin;
        const fallbackColor = '#888888';

        switch (d.direction) {
            case 'root':
                return settings.rootColor;
            case 'outgoing':
                return settings.outgoingColors[d.depth - 1] || fallbackColor;
            case 'incoming':
                return settings.incomingColors[d.depth - 1] || fallbackColor;
            default:
                return fallbackColor;
        }
    }

    drawGraph(): void {
        const container = this.containerEl.children[1];
        container.empty();

        if (!this.currentFilePath) {
            container.createEl("h3", { text: "No file is active." });
            return;
        }

        const graphData: GraphData = buildGraphData(this.app, this.currentFilePath, this.plugin.settings.defaultOutgoingDepth, this.plugin.settings.defaultIncomingDepth);
        
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

        // Use settings for physics
        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(this.plugin.settings.linkDistance))
            .force("charge", d3.forceManyBody().strength(this.plugin.settings.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g").selectAll("line").data(edges).join("line").attr("stroke", "rgba(160, 160, 160, 0.6)").attr("stroke-width", 1.5);
        
        // Use settings for node size
        const node = g.append("g").selectAll("circle").data(nodes).join("circle")
            .attr("r", this.plugin.settings.nodeSize)
            .attr("fill", d => this.getNodeColor(d))
            .call(this.dragHandler());
        
        const labels = g.append("g").selectAll("text").data(nodes).join("text")
            .text(d => d.id.split('/').pop()?.replace('.md', '') ?? d.id)
            .attr("font-size", 10).attr("dx", 15).attr("dy", 4).style("fill", "var(--text-normal)");

        this.simulation.on("tick", () => {
            link.attr("x1", d => (d.source as SimNode).x!).attr("y1", d => (d.source as SimNode).y!)
                .attr("x2", d => (d.target as SimNode).x!).attr("y2", d => (d.target as SimNode).y!);
            node.attr("cx", d => d.x!).attr("cy", d => d.y!);
            labels.attr("x", d => d.x!).attr("y", d => d.y!);
        });
    }

    private toggleSettingsPanel(): void {
        const existingPanel = this.contentEl.querySelector('.graph-settings-panel');
        if (existingPanel) {
            existingPanel.remove();
        } else {
            this.buildSettingsPanel();
        }
    }

    private buildSettingsPanel(): void {
        const panel = this.contentEl.createDiv({ cls: 'graph-settings-panel' });
        
        const redraw = async () => {
            await this.plugin.saveSettings();
            this.drawGraph();
        };
        
        panel.createEl('h4', { text: 'Local Graph Settings' });
        
        new Setting(panel).setName('Outgoing Depth').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultOutgoingDepth).onChange(v => { this.plugin.settings.defaultOutgoingDepth = v; redraw(); }));
        new Setting(panel).setName('Incoming Depth').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultIncomingDepth).onChange(v => { this.plugin.settings.defaultIncomingDepth = v; redraw(); }));
        panel.createEl('hr');
        new Setting(panel).setName('Node Size').addSlider(s => s.setLimits(2, 20, 1).setValue(this.plugin.settings.nodeSize).onChange(v => { this.plugin.settings.nodeSize = v; redraw(); }));
        new Setting(panel).setName('Link Distance').addSlider(s => s.setLimits(20, 200, 10).setValue(this.plugin.settings.linkDistance).onChange(v => { this.plugin.settings.linkDistance = v; redraw(); }));
        new Setting(panel).setName('Charge Strength').addSlider(s => s.setLimits(-500, -10, 10).setValue(this.plugin.settings.chargeStrength).onChange(v => { this.plugin.settings.chargeStrength = v; redraw(); }));
    }

    private dragHandler() {
        // ... (this function remains unchanged)
        const dragstarted = (event: any, d: SimNode) => { if (!event.active && this.simulation) { this.simulation.alphaTarget(0.3).restart(); } d.fx = d.x; d.fy = d.y; }
        const dragged = (event: any, d: SimNode) => { d.fx = event.x; d.fy = event.y; }
        const dragended = (event: any, d: SimNode) => { if (!event.active && this.simulation) { this.simulation.alphaTarget(0); } d.fx = null; d.fy = null; }
        return d3.drag<SVGCircleElement, SimNode>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
}