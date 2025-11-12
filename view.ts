import { ItemView, WorkspaceLeaf } from 'obsidian';

export const LOCAL_GRAPH_VIEW_TYPE = "local-graph-plus-view";

export class LocalGraphView extends ItemView {

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return LOCAL_GRAPH_VIEW_TYPE;
  }

  getDisplayText() {
    return "Local Graph";
  }

  getIcon() {
    return "venn-diagram";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h2", { text: "Local Graph View" });
    container.createEl("p", { text: "Graph rendering will be implemented here." });
  }

  async onClose() {
    // Any cleanup logic goes here
  }
}