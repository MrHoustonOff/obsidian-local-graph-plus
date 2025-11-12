import { ItemView, WorkspaceLeaf, Setting, addIcon, IconName } from 'obsidian';
import * as d3 from 'd3';
import LocalGraphPlugin from './main';
import { buildGraphData, GraphData, GraphNode as DataNode } from './graphBuilder';
import { DEFAULT_SETTINGS } from './settings';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-pro-view";

interface SimNode extends DataNode, d3.SimulationNodeDatum {}

export class LocalGraphView extends ItemView {
    plugin: LocalGraphPlugin;
    private simulation: d3.Simulation<SimNode, any> | null = null;
    private currentFilePath: string | null = null;
    
    private mainContainer: HTMLDivElement;
    private headerEl: HTMLHeadElement;
    private canvasEl: HTMLDivElement;
    private settingsEl: HTMLDivElement;

    constructor(leaf: WorkspaceLeaf, plugin: LocalGraphPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string { return LOCAL_GRAPH_VIEW_TYPE; }
    getDisplayText(): string { return "Local Graph"; }
    getIcon(): string { return "network"; }

    async setState(state: any, result: any): Promise<void> {
        this.currentFilePath = state.filePath;
        requestAnimationFrame(() => this.drawGraph());
        return super.setState(state, result);
    }

    async onOpen(): Promise<void> {
        this.buildUI();
    }

    async onClose(): Promise<void> {
        if (this.simulation) this.simulation.stop();
    }
    
    /**
     * Creates a reliable, styled control button.
     * @param container The parent element.
     * @param icon The name of the icon to use.
     * @param tooltip The tooltip text.
     * @param onClick The function to call on click.
     * @returns The created button element.
     */
    private createControlButton(container: HTMLElement, icon: IconName, tooltip: string, onClick: () => void): HTMLDivElement {
        const button = container.createDiv({ cls: 'graph-control-button' });
        button.setAttribute('aria-label', tooltip);
        addIcon(button, icon);
        button.addEventListener('click', onClick);
        return button;
    }

    private buildUI(): void {
        const container = this.containerEl.children[1];
        container.empty();

        this.mainContainer = container.createDiv({ cls: 'local-graph-pro-container' });
        this.headerEl = this.mainContainer.createEl('h2', { cls: "graph-view-header" });
        this.canvasEl = this.mainContainer.createDiv({ cls: 'graph-canvas' });
        
        const controlsEl = this.mainContainer.createDiv({ cls: 'graph-controls' });
        this.createControlButton(controlsEl, 'cog', 'Open settings', () => {
            this.toggleSettingsPanel();
        });

        this.settingsEl = this.mainContainer.createDiv({ cls: 'graph-settings-panel' });
    }

    private getNodeColor(d: SimNode): string {
        const { settings } = this.plugin;
        const fallbackColor = '#888888';

        switch (d.direction) {
            case 'root': return settings.rootColor;
            case 'outgoing': return settings.outgoingColors[d.depth - 1] || fallbackColor;
            case 'incoming': return settings.incomingColors[d.depth - 1] || fallbackColor;
            default: return fallbackColor;
        }
    }

    drawGraph(): void {
        this.canvasEl.empty();
        if (!this.currentFilePath) {
            this.headerEl.setText("No file is active.");
            return;
        }

        const fileName = this.currentFilePath.split('/').pop()?.replace('.md', '') || 'Active File';
        this.headerEl.setText(`Graph of ${fileName}`);
        const graphData = buildGraphData(this.app, this.currentFilePath, this.plugin.settings.defaultOutgoingDepth, this.plugin.settings.defaultIncomingDepth);
        
        if (graphData.nodes.length <= 1) {
            this.canvasEl.createEl("p", { text: "No local links for this file." });
            return;
        }

        const width = this.canvasEl.clientWidth;
        const height = this.canvasEl.clientHeight;
        if (width === 0 || height === 0) return;

        const nodes: SimNode[] = graphData.nodes.map(n => ({...n}));
        const edges = graphData.edges.map(e => ({...e}));

        const svg = d3.select(this.canvasEl).append("svg").attr("width", "100%").attr("height", "100%");
        const g = svg.append("g");

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(this.plugin.settings.linkDistance))
            .force("charge", d3.forceManyBody().strength(this.plugin.settings.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = g.append("g").selectAll("line").data(edges).join("line").attr("stroke", "rgba(160, 160, 160, 0.6)").attr("stroke-width", 1.5);
        const node = g.append("g").selectAll("circle").data(nodes).join("circle").attr("r", this.plugin.settings.nodeSize).attr("fill", d => this.getNodeColor(d)).call(this.dragHandler());
        const labels = g.append("g").selectAll("text").data(nodes).join("text").text(d => d.id.split('/').pop()?.replace('.md', '') ?? d.id).attr("font-size", 10).attr("dx", 15).attr("dy", 4).style("fill", "var(--text-normal)");

        this.simulation.on("tick", () => {
            link.attr("x1", d => (d.source as SimNode).x!).attr("y1", d => (d.source as SimNode).y!).attr("x2", d => (d.target as SimNode).x!).attr("y2", d => (d.target as SimNode).y!);
            node.attr("cx", d => d.x!).attr("cy", d => d.y!);
            labels.attr("x", d => d.x!).attr("y", d => d.y!);
        });
    }

    private toggleSettingsPanel(): void {
        const isOpen = this.settingsEl.classList.toggle('is-open');
        if (isOpen) {
            this.buildSettingsPanel();
        }
    }

    private buildSettingsPanel(): void {
        this.settingsEl.empty();
        
        const header = this.settingsEl.createDiv({ cls: 'settings-panel-header' });
        header.createEl('h4', { text: 'Settings' });
        const headerControls = header.createDiv({ cls: 'header-controls-container' });
        
        this.createControlButton(headerControls, 'refresh-cw', 'Reset to defaults', async () => {
            Object.assign(this.plugin.settings, DEFAULT_SETTINGS);
            await this.plugin.saveSettings();
            this.drawGraph();
            this.buildSettingsPanel();
        });
        this.createControlButton(headerControls, 'x', 'Close', () => {
            this.settingsEl.classList.remove('is-open');
        });

        const content = this.settingsEl.createDiv({ cls: 'settings-panel-content' });
        const redraw = async () => { await this.plugin.saveSettings(); this.drawGraph(); };
        
        content.createEl('h5', { text: 'Depth', cls: 'settings-section-header' });
        new Setting(content).setName('Outgoing').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultOutgoingDepth).setDynamicTooltip().onChange(v => { this.plugin.settings.defaultOutgoingDepth = v; redraw(); }));
        new Setting(content).setName('Incoming').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultIncomingDepth).setDynamicTooltip().onChange(v => { this.plugin.settings.defaultIncomingDepth = v; redraw(); }));
        
        content.createEl('h5', { text: 'Forces', cls: 'settings-section-header' });
        new Setting(content).setName('Node Size').addSlider(s => s.setLimits(2, 20, 1).setValue(this.plugin.settings.nodeSize).setDynamicTooltip().onChange(v => { this.plugin.settings.nodeSize = v; redraw(); }));
        new Setting(content).setName('Link Distance').addSlider(s => s.setLimits(20, 200, 10).setValue(this.plugin.settings.linkDistance).setDynamicTooltip().onChange(v => { this.plugin.settings.linkDistance = v; redraw(); }));
        new Setting(content).setName('Charge Strength').addSlider(s => s.setLimits(-500, -10, 10).setValue(this.plugin.settings.chargeStrength).setDynamicTooltip().onChange(v => { this.plugin.settings.chargeStrength = v; redraw(); }));
        
        content.createEl('h5', { text: 'Colors', cls: 'settings-section-header' });
        const createColorSetting = (name: string, colorValue: string, onChange: (newColor: string) => void) => {
            const row = content.createDiv({ cls: 'color-setting-row' });
            row.createEl('span', { text: name });
            const swatch = row.createDiv({ cls: 'color-swatch' });
            swatch.style.backgroundColor = colorValue;
            const colorInput = row.createEl('input', { type: 'color', cls: 'color-input-hidden' });
            colorInput.value = colorValue;
            swatch.addEventListener('click', () => colorInput.click());
            colorInput.addEventListener('input', () => {
                const newColor = colorInput.value;
                swatch.style.backgroundColor = newColor;
                onChange(newColor);
            });
        };
        createColorSetting('Root Node', this.plugin.settings.rootColor, (v) => { this.plugin.settings.rootColor = v; redraw(); });
        this.plugin.settings.outgoingColors.forEach((color, index) => createColorSetting(`Outgoing Lvl ${index + 1}`, color, (v) => { this.plugin.settings.outgoingColors[index] = v; redraw(); }));
        this.plugin.settings.incomingColors.forEach((color, index) => createColorSetting(`Incoming Lvl ${index + 1}`, color, (v) => { this.plugin.settings.incomingColors[index] = v; redraw(); }));
    }

    private dragHandler() {
        // ... (this function remains unchanged)
        const dragstarted = (event: any, d: SimNode) => { if (!event.active && this.simulation) { this.simulation.alphaTarget(0.3).restart(); } d.fx = d.x; d.fy = d.y; }
        const dragged = (event: any, d: SimNode) => { d.fx = event.x; d.fy = event.y; }
        const dragended = (event: any, d: SimNode) => { if (!event.active && this.simulation) { this.simulation.alphaTarget(0); } d.fx = null; d.fy = null; }
        return d3.drag<SVGCircleElement, SimNode>().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
}