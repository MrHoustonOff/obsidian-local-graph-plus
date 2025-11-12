import { ItemView, WorkspaceLeaf, Setting, setIcon, IconName } from 'obsidian';
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
    
    private zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    private g: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;

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

    async onOpen(): Promise<void> { this.buildUI(); }
    async onClose(): Promise<void> { if (this.simulation) this.simulation.stop(); }
    
    private createControlButton(container: HTMLElement, icon: IconName, tooltip: string, onClick: (e: MouseEvent) => void): void {
        const button = container.createDiv({ cls: 'graph-control-button' });
        button.setAttribute('aria-label', tooltip);
        setIcon(button, icon);
        button.addEventListener('click', onClick);
    }

    private buildUI(): void {
        const container = this.containerEl.children[1];
        container.empty();
        this.mainContainer = container.createDiv({ cls: 'local-graph-pro-container' });
        this.headerEl = this.mainContainer.createEl('h2', { cls: "graph-view-header" });
        this.canvasEl = this.mainContainer.createDiv({ cls: 'graph-canvas' });
        const controlsEl = this.mainContainer.createDiv({ cls: 'graph-controls' });
        this.createControlButton(controlsEl, 'cog', 'Open settings', () => this.toggleSettingsPanel());
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
        
        const graphData = buildGraphData(this.app, this.currentFilePath, this.plugin.settings.defaultOutgoingDepth, this.plugin.settings.defaultIncomingDepth, this.plugin.settings.showNeighborLinks);
        if (graphData.nodes.length <= 1) {
            this.canvasEl.createEl("p", { text: "No local links for this file." });
            return;
        }

        const width = this.canvasEl.clientWidth;
        const height = this.canvasEl.clientHeight;
        if (width === 0 || height === 0) return;

        const nodes: SimNode[] = graphData.nodes.map(n => ({...n}));
        const edges = graphData.edges.map(e => ({...e}));

        this.svg = d3.select(this.canvasEl).append("svg").attr("width", "100%").attr("height", "100%");
        this.g = this.svg.append("g");
        
        this.zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 8])
            .interpolate(d3.interpolate)
            .on('zoom', (event) => {
                const { transform } = event;
                this.g?.attr('transform', transform);
                
                const k = transform.k;
                const scaledRadius = k < 1 ? this.plugin.settings.nodeSize / k : this.plugin.settings.nodeSize;
                this.g?.selectAll('circle').attr('r', scaledRadius);
                this.g?.selectAll('text').style('display', k < this.plugin.settings.labelFadeThreshold ? 'none' : 'block');
            });
        
        this.svg.call(this.zoom);

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id((d: any) => d.id).distance(this.plugin.settings.linkDistance))
            .force("charge", d3.forceManyBody().strength(this.plugin.settings.chargeStrength))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = this.g.append("g").attr('class', 'links').selectAll("line").data(edges).join("line")
            .attr("stroke", "rgba(160, 160, 160, 0.6)").attr("stroke-width", 1.5);
        
        const nodeG = this.g.append("g").attr('class', 'nodes').selectAll("g").data(nodes).join("g")
            .call(this.dragHandler())
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('mouseover', (event, d) => this.handleNodeMouseOver(event, d))
            .on('mouseout', (event, d) => this.handleNodeMouseOut(event, d));

        nodeG.append("circle")
            .attr("r", this.plugin.settings.nodeSize)
            .attr("fill", d => this.getNodeColor(d));
        
        // --- THE FIX: Text wrapping and sizing ---
        const labels = nodeG.append("text")
            .attr("font-size", 5) // Halved text size
            .attr("dx", 8)      // Adjusted offset
            .attr("dy", 3)       // Adjusted offset
            .style("fill", "var(--text-normal)");

        const wrap = (text: d3.Selection<d3.BaseType | SVGTextElement, SimNode, SVGGElement, unknown>, lineLength: number) => {
            text.each(function(d) {
                const textNode = d3.select(this);
                const fullText = d.id.split('/').pop()?.replace('.md', '') ?? d.id;
                const words = fullText.split(/\s+/).reverse();
                let word;
                let line: string[] = [];
                let lineNumber = 0;
                const dy = 1.2; // Line height
                
                textNode.text(null); // Clear existing text
                
                let tspan = textNode.append("tspan").attr("x", 0).attr("dy", dy + "em");
                
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if ((tspan.node() as SVGTextElement).getComputedTextLength() > (lineLength * 5)) { // Heuristic for width
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = textNode.append("tspan").attr("x", 0).attr("dy", dy + "em").text(word);
                    }
                }
            });
        }
        labels.call(wrap, this.plugin.settings.maxLabelLength);


        this.simulation.on("tick", () => {
            link.attr("x1", d => (d.source as SimNode).x!).attr("y1", d => (d.source as SimNode).y!)
               .attr("x2", d => (d.target as SimNode).x!).attr("y2", d => (d.target as SimNode).y!);
            nodeG.attr("transform", d => `translate(${d.x}, ${d.y})`);
        });
    }

    private toggleSettingsPanel(): void {
        const isOpen = this.settingsEl.classList.toggle('is-open');
        if (isOpen) this.buildSettingsPanel();
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
        this.createControlButton(headerControls, 'x', 'Close', () => this.settingsEl.classList.remove('is-open'));

        const content = this.settingsEl.createDiv({ cls: 'settings-panel-content' });
        const redraw = async () => { await this.plugin.saveSettings(); this.drawGraph(); };
        
        new Setting(content).setHeading().setName("Display");
        new Setting(content).setName("Show neighbor links").addToggle(t => t.setValue(this.plugin.settings.showNeighborLinks).onChange(v => { this.plugin.settings.showNeighborLinks = v; redraw(); }));
        new Setting(content).setName('Label fade threshold').setDesc('Labels disappear when zoomed out beyond this level.').addSlider(s => s.setLimits(0.1, 2, 0.1).setValue(this.plugin.settings.labelFadeThreshold).setDynamicTooltip().onChange(async v => { this.plugin.settings.labelFadeThreshold = v; await this.plugin.saveSettings(); }));
        
        new Setting(content).setHeading().setName("Interaction");
        new Setting(content).setName('Zoom on click').setDesc('How much to zoom in when clicking a node.').addSlider(s => s.setLimits(1, 8, 0.5).setValue(this.plugin.settings.zoomOnClickStrength).setDynamicTooltip().onChange(async v => { this.plugin.settings.zoomOnClickStrength = v; await this.plugin.saveSettings(); }));
        
        new Setting(content).setHeading().setName("Depth");
        new Setting(content).setName('Outgoing').addSlider(s => s.setLimits(0, 5, 1).setValue(this.plugin.settings.defaultOutgoingDepth).setDynamicTooltip().onChange(v => { this.plugin.settings.defaultOutgoingDepth = v; redraw(); }));
        new Setting(content).setName('Incoming').addSlider(s => s.setLimits(0, 5, 1).setValue(this.plugin.settings.defaultIncomingDepth).setDynamicTooltip().onChange(v => { this.plugin.settings.defaultIncomingDepth = v; redraw(); }));
        
        new Setting(content).setHeading().setName("Forces");
        new Setting(content).setName('Node Size').addSlider(s => s.setLimits(2, 20, 1).setValue(this.plugin.settings.nodeSize).setDynamicTooltip().onChange(async v => { this.plugin.settings.nodeSize = v; await this.plugin.saveSettings(); this.drawGraph(); }));
        new Setting(content).setName('Link Distance').addSlider(s => s.setLimits(20, 200, 10).setValue(this.plugin.settings.linkDistance).setDynamicTooltip().onChange(v => { this.plugin.settings.linkDistance = v; redraw(); }));
        new Setting(content).setName('Charge Strength').addSlider(s => s.setLimits(-500, -10, 10).setValue(this.plugin.settings.chargeStrength).setDynamicTooltip().onChange(v => { this.plugin.settings.chargeStrength = v; redraw(); }));
        
        new Setting(content).setHeading().setName("Colors");
        const createColorSetting = (name: string, colorValue: string, onChange: (newColor: string) => void) => {
            const row = content.createDiv({ cls: 'color-setting-row' });
            row.createEl('span', { text: name });
            const swatch = row.createDiv({ cls: 'color-swatch' });
            swatch.style.backgroundColor = colorValue;
            const colorInput = row.createEl('input', { type: 'color', cls: 'color-input-handler' });
            colorInput.value = colorValue;
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

    private handleNodeClick(event: MouseEvent, d: SimNode): void {
        if (event.ctrlKey || event.metaKey) {
            this.app.workspace.openLinkText(d.id, this.currentFilePath || '', false);
        } else {
            if (!this.svg || !this.zoom) return;
            const transform = d3.zoomIdentity
                .translate(this.canvasEl.clientWidth / 2, this.canvasEl.clientHeight / 2)
                .scale(this.plugin.settings.zoomOnClickStrength)
                .translate(-d.x!, -d.y!);
            this.svg.transition().duration(750).call(this.zoom.transform, transform);
        }
    }

    private handleNodeMouseOver(event: MouseEvent, d: SimNode): void {
        if (!this.g || !this.svg) return;
        
        const currentGroup = d3.select(event.currentTarget as Element);
        // --- THE FIX: Displaying full text ---
        currentGroup.select('text').selectAll('tspan').remove(); // Remove wrapped lines
        currentGroup.select('text').append('tspan').text(d.id.split('/').pop()?.replace('.md', '') ?? d.id);
        
        currentGroup.raise();
        
        const currentZoom = d3.zoomTransform(this.svg.node()!).k;
        // --- THE FIX: Restoring highlight logic ---
        const allNodeGroups = this.g.selectAll(".nodes > g");
        const allLinks = this.g.selectAll('.links > line');

        const linkedNodes = new Set<string>([d.id]);
        allLinks.each(function(edge: any) {
            if (edge.source.id === d.id) linkedNodes.add(edge.target.id);
            if (edge.target.id === d.id) linkedNodes.add(edge.source.id);
        });

        allNodeGroups.transition().duration(200)
            .style('opacity', (node_d: any) => linkedNodes.has(node_d.id) ? 1.0 : 0.2);
        
        const scaledRadius = currentZoom < 1 ? this.plugin.settings.nodeSize / currentZoom : this.plugin.settings.nodeSize;
        
        allNodeGroups.select('circle')
            .transition().duration(200)
            .attr('r', (node_d: any) => node_d.id === d.id ? scaledRadius * 1.5 : scaledRadius);
        
        allLinks.transition().duration(200)
            .style('opacity', (link_d: any) => (link_d.source.id === d.id || link_d.target.id === d.id) ? 1.0 : 0.1);
    }

    private handleNodeMouseOut(event: MouseEvent, d: SimNode): void {
        if (!this.g || !this.svg) return;
        
        const currentGroup = d3.select(event.currentTarget as Element);
        // --- THE FIX: Re-wrapping the text on mouseout ---
        currentGroup.select('text').call(wrap => this.wrapText(wrap, this.plugin.settings.maxLabelLength));

        const currentZoom = d3.zoomTransform(this.svg.node()!).k;
        const scaledRadius = currentZoom < 1 ? this.plugin.settings.nodeSize / currentZoom : this.plugin.settings.nodeSize;

        this.g.selectAll(".nodes > g").transition().duration(200).style('opacity', 1.0);
        this.g.selectAll('circle').transition().duration(200).attr('r', scaledRadius);
        this.g.selectAll('.links > line').transition().duration(200).style('opacity', 1.0);
    }
    
    // Helper function for text wrapping
    private wrapText(text: d3.Selection<d3.BaseType | SVGTextElement, SimNode, SVGGElement, unknown>, lineLength: number) {
        text.each(function(d) {
            const textNode = d3.select(this);
            const fullText = d.id.split('/').pop()?.replace('.md', '') ?? d.id;
            const words = fullText.split(/\s+/).reverse();
            let word;
            let line: string[] = [];
            const dy = 1.2; // Line height relative to font size
            
            textNode.text(null); // Clear existing text
            
            let tspan = textNode.append("tspan").attr("x", 0).attr("dy", "0em");
            
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (line.join(" ").length > lineLength && line.length > 1) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = textNode.append("tspan").attr("x", 0).attr("dy", dy + "em").text(word);
                }
            }
        });
    }

    private dragHandler() {
        return d3.drag<SVGGElement, SimNode>()
            .on("start", (event: any, d: SimNode) => {
                if (!event.active && this.simulation) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event: any, d: SimNode) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event: any, d: SimNode) => {
                if (!event.active && this.simulation) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
}