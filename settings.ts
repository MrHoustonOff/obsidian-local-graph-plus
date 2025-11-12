import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalGraphPlugin from './main';

export interface LocalGraphSettings {
  // We will add settings here in later stages
}

export const DEFAULT_SETTINGS: LocalGraphSettings = {
  // We will add default values here
};

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
	}
}