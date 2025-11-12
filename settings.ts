import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalGraphPlugin from './main';

export interface LocalGraphSettings {
  rootColor: string;
  outgoingColors: string[];
  incomingColors: string[];
  nodeSize: number;
  linkDistance: number;
  chargeStrength: number;
  defaultOutgoingDepth: number;
  defaultIncomingDepth: number;
  showNeighborLinks: boolean;
  // NEW: Global and default settings for new features
  maxLabelLength: number;
  labelFadeThreshold: number;
  zoomOnClickStrength: number;
}

export const DEFAULT_SETTINGS: LocalGraphSettings = {
  rootColor: '#ff6600',
  outgoingColors: ['#ffaa00', '#ffd700', '#aaff00', '#00ff88', '#00ccff'],
  incomingColors: ['#9d00ff', '#b357ff', '#c27dff', '#d6a4ff', '#e8ccff'],
  nodeSize: 10,
  linkDistance: 100,
  chargeStrength: -250,
  defaultOutgoingDepth: 2,
  defaultIncomingDepth: 1,
  showNeighborLinks: true,
  // NEW: Default values
  maxLabelLength: 10,
  labelFadeThreshold: 0.5,
  zoomOnClickStrength: 2.5,
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
		containerEl.createEl('h2', {text: 'Local Graph Pro - Global Settings'});

        containerEl.createEl('p', {text: 'These are global settings that affect all local graphs. More specific visual settings can be found in the graph view itself.'});

        new Setting(containerEl)
            .setName('Max label length')
            .setDesc('How many characters to show on a node label before truncating.')
            .addSlider(slider =>
                slider.setLimits(5, 50, 1)
                      .setValue(this.plugin.settings.maxLabelLength)
                      .setDynamicTooltip()
                      .onChange(async (value) => {
                          this.plugin.settings.maxLabelLength = value;
                          await this.plugin.saveSettings();
                      })
            );
	}
}