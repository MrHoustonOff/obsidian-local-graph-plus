import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalGraphPlugin from './main';

// Define the structure of our settings
export interface LocalGraphSettings {
  rootColor: string;
  outgoingColors: string[];
  incomingColors: string[];
  // Add new settings for graph physics
  nodeSize: number;
  linkDistance: number;
  chargeStrength: number;
  // Add settings for default depth
  defaultOutgoingDepth: number;
  defaultIncomingDepth: number;
}

// Set the default values
export const DEFAULT_SETTINGS: LocalGraphSettings = {
  rootColor: '#ff6600',
  outgoingColors: ['#ffaa00', '#ffd700', '#aaff00', '#00ff88', '#00ccff'],
  incomingColors: ['#9d00ff', '#b357ff', '#c27dff', '#d6a4ff', '#e8ccff'],
  // Add default physics values
  nodeSize: 10,
  linkDistance: 100,
  chargeStrength: -250,
  // Add default depth values
  defaultOutgoingDepth: 2,
  defaultIncomingDepth: 1,
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

        containerEl.createEl('h3', { text: 'Appearance' });
		
        new Setting(containerEl)
            .setName('Root Node Color')
            .addExtraButton(button => button.setIcon('reset').setTooltip('Restore default').onClick(async () => {
                this.plugin.settings.rootColor = DEFAULT_SETTINGS.rootColor;
                await this.plugin.saveSettings(); this.display();
            }))
            .addColorPicker(color => color.setValue(this.plugin.settings.rootColor).onChange(async (value) => {
                this.plugin.settings.rootColor = value; await this.plugin.saveSettings();
            }));

        this.plugin.settings.outgoingColors.forEach((color, index) => {
            new Setting(containerEl)
                .setName(`Outgoing Depth ${index + 1}`)
                .addExtraButton(button => button.setIcon('reset').setTooltip('Restore default').onClick(async () => {
                    this.plugin.settings.outgoingColors[index] = DEFAULT_SETTINGS.outgoingColors[index];
                    await this.plugin.saveSettings(); this.display();
                }))
                .addColorPicker(picker => picker.setValue(color).onChange(async (value) => {
                    this.plugin.settings.outgoingColors[index] = value; await this.plugin.saveSettings();
                }));
        });
        
        this.plugin.settings.incomingColors.forEach((color, index) => {
            new Setting(containerEl)
                .setName(`Incoming Depth ${index + 1}`)
                .addExtraButton(button => button.setIcon('reset').setTooltip('Restore default').onClick(async () => {
                    this.plugin.settings.incomingColors[index] = DEFAULT_SETTINGS.incomingColors[index];
                    await this.plugin.saveSettings(); this.display();
                }))
                .addColorPicker(picker => picker.setValue(color).onChange(async (value) => {
                    this.plugin.settings.incomingColors[index] = value; await this.plugin.saveSettings();
                }));
        });

        containerEl.createEl('h3', { text: 'Default Physics' });
        containerEl.createEl('p', { text: 'These are the default values. You can override them in the local graph view.', cls: 'setting-item-description' });

        new Setting(containerEl).setName('Node size').addSlider(s => s.setLimits(2, 20, 1).setValue(this.plugin.settings.nodeSize).onChange(async(v) => { this.plugin.settings.nodeSize = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl).setName('Link distance').addSlider(s => s.setLimits(20, 200, 10).setValue(this.plugin.settings.linkDistance).onChange(async(v) => { this.plugin.settings.linkDistance = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl).setName('Charge strength').addSlider(s => s.setLimits(-500, -10, 10).setValue(this.plugin.settings.chargeStrength).onChange(async(v) => { this.plugin.settings.chargeStrength = v; await this.plugin.saveSettings(); }));

        containerEl.createEl('h3', { text: 'Default Depth' });

        new Setting(containerEl).setName('Outgoing Depth').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultOutgoingDepth).onChange(async(v) => { this.plugin.settings.defaultOutgoingDepth = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl).setName('Incoming Depth').addSlider(s => s.setLimits(1, 5, 1).setValue(this.plugin.settings.defaultIncomingDepth).onChange(async(v) => { this.plugin.settings.defaultIncomingDepth = v; await this.plugin.saveSettings(); }));
	}
}