import { Plugin, WorkspaceLeaf } from 'obsidian';
import { LocalGraphSettings, DEFAULT_SETTINGS, LocalGraphSettingTab } from './settings';
import { LocalGraphView, LOCAL_GRAPH_VIEW_TYPE } from './LocalGraphView';

export default class LocalGraphPlugin extends Plugin {
	settings: LocalGraphSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			LOCAL_GRAPH_VIEW_TYPE,
			(leaf) => new LocalGraphView(leaf)
		);

		this.addRibbonIcon('network', 'Open Local Graph', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-local-graph-pro',
			name: 'Open Local Graph',
			callback: () => {
				this.activateView();
			},
		});

		this.addSettingTab(new LocalGraphSettingTab(this.app, this));
	}

	onunload() {
    // Clean up any resources
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		// Detach any existing leaves of our view type
		this.app.workspace.detachLeavesOfType(LOCAL_GRAPH_VIEW_TYPE);
	
		// Get the right leaf, creating one if it doesn't exist
		let leaf: WorkspaceLeaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			leaf = this.app.workspace.getLeaf('split', 'vertical');
		}
	
		// Set the view state for our custom view
		await leaf.setViewState({
			type: LOCAL_GRAPH_VIEW_TYPE,
			active: true,
		});
	
		// Reveal the leaf to make sure it is visible
		this.app.workspace.revealLeaf(leaf);
	}
}