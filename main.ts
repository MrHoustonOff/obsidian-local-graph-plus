import { Plugin, WorkspaceLeaf, TFile } from 'obsidian';
import { LocalGraphSettings, DEFAULT_SETTINGS, LocalGraphSettingTab } from './settings';
import { LocalGraphView, LOCAL_GRAPH_VIEW_TYPE } from './LocalGraphView';

export default class LocalGraphPlugin extends Plugin {
	settings: LocalGraphSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(
			LOCAL_GRAPH_VIEW_TYPE,
			// Pass `this` plugin instance to the view
			(leaf) => new LocalGraphView(leaf, this)
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

		this.addCommand({
			id: 'update-local-graph-pro',
			name: 'Update Local Graph',
			callback: () => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					this.updateGraphView(file);
				}
			},
		});

		// Register the event listener for file changes
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf) => {
				if (leaf?.view.getViewType() === 'markdown') {
					const file = this.app.workspace.getActiveFile();
					if (file) {
						// Here we will later check for the auto-update setting
						this.updateGraphView(file);
					}
				}
			})
		);

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
		this.app.workspace.detachLeavesOfType(LOCAL_GRAPH_VIEW_TYPE);
	
		let leaf: WorkspaceLeaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) {
			leaf = this.app.workspace.getLeaf('split', 'vertical');
		}
	
		await leaf.setViewState({
			type: LOCAL_GRAPH_VIEW_TYPE,
			active: true,
		});
	
		// After activating, immediately update it with the current file
		const file = this.app.workspace.getActiveFile();
		if (file) {
			this.updateGraphView(file);
		}

		this.app.workspace.revealLeaf(leaf);
	}

	// Helper function to update any open graph views
	private updateGraphView(file: TFile) {
		const leaves = this.app.workspace.getLeavesOfType(LOCAL_GRAPH_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof LocalGraphView) {
				leaf.view.setState({ filePath: file.path }, {});
			}
		}
	}
}