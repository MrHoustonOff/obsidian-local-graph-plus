import { ItemView, WorkspaceLeaf } from 'obsidian';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-pro-view";

export class LocalGraphView extends ItemView {
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
        return "network"; // Or "diagram-venn" from your example
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", { text: "Local Graph Pro" });
        container.createEl("p", { text: "The graph for the active file will be displayed here." });
    }

    async onClose(): Promise<void> {
        // Any cleanup logic goes here
    }
}