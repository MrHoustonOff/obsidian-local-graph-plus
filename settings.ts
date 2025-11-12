import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalGraphPlugin from './main';

// Define the structure of our settings
export interface LocalGraphSettings {
  rootColor: string;
  outgoingColors: string[];
  incomingColors: string[];
  nodeSize: number;
  linkDistance: number;
  chargeStrength: number;
  defaultOutgoingDepth: number;
  defaultIncomingDepth: number;
  // NEW: Setting for neighbor links
  showNeighborLinks: boolean;
}

// Set the default values
export const DEFAULT_SETTINGS: LocalGraphSettings = {
  rootColor: '#ff6600',
  outgoingColors: ['#ffaa00', '#ffd700', '#aaff00', '#00ff88', '#00ccff'],
  incomingColors: ['#9d00ff', '#b357ff', '#c27dff', '#d6a4ff', '#e8ccff'],
  nodeSize: 10,
  linkDistance: 100,
  chargeStrength: -250,
  defaultOutgoingDepth: 2,
  defaultIncomingDepth: 1,
  // NEW: Default value for neighbor links
  showNeighborLinks: true,
};

// ... (The PluginSettingTab class remains unchanged as we moved all local settings to the view)
export class LocalGraphSettingTab extends PluginSettingTab {
	plugin: LocalGraphPlugin;

	constructor(app: App, plugin: LocalGraphPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();
		containerEl.createEl('h2', {text: 'Local Graph Pro Settings'});
        // We can add global settings here in the future, like the auto-update toggle.
	}
}