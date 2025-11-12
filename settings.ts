import { App, PluginSettingTab, Setting } from 'obsidian';
import LocalGraphPlugin from './main';

// Define the structure of our settings
export interface LocalGraphSettings {
  rootColor: string;
  outgoingColors: string[];
  incomingColors: string[];
}

// Set the default values
export const DEFAULT_SETTINGS: LocalGraphSettings = {
  rootColor: '#ff6600', // Default orange for the root
  outgoingColors: [
    '#ffaa00', // Depth 1
    '#ffd700', // Depth 2
    '#aaff00', // Depth 3
    '#00ff88', // Depth 4
    '#00ccff', // Depth 5
  ],
  incomingColors: [
    '#9d00ff', // Depth 1
    '#b357ff', // Depth 2
    '#c27dff', // Depth 3
    '#d6a4ff', // Depth 4
    '#e8ccff', // Depth 5
  ],
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

        // Setting for the Root Node color
        new Setting(containerEl)
            .setName('Root Node Color')
            .setDesc('The color of the central, active node.')
            .addExtraButton(button => {
                button.setIcon('reset')
                      .setTooltip('Restore default')
                      .onClick(async () => {
                          this.plugin.settings.rootColor = DEFAULT_SETTINGS.rootColor;
                          await this.plugin.saveSettings();
                          this.display(); // Refresh the settings view
                      });
            })
            .addColorPicker(color => {
                color.setValue(this.plugin.settings.rootColor)
                     .onChange(async (value) => {
                         this.plugin.settings.rootColor = value;
                         await this.plugin.saveSettings();
                     });
            });

        containerEl.createEl('h3', { text: 'Outgoing Links' });
        
        // Dynamically create color pickers for each depth level of outgoing links
        this.plugin.settings.outgoingColors.forEach((color, index) => {
            new Setting(containerEl)
                .setName(`Outgoing Depth ${index + 1}`)
                .addExtraButton(button => {
                    button.setIcon('reset')
                          .setTooltip('Restore default')
                          .onClick(async () => {
                              this.plugin.settings.outgoingColors[index] = DEFAULT_SETTINGS.outgoingColors[index];
                              await this.plugin.saveSettings();
                              this.display();
                          });
                })
                .addColorPicker(picker => {
                    picker.setValue(color)
                          .onChange(async (value) => {
                              this.plugin.settings.outgoingColors[index] = value;
                              await this.plugin.saveSettings();
                          });
                });
        });

        containerEl.createEl('h3', { text: 'Incoming Links' });

        // Dynamically create color pickers for each depth level of incoming links
        this.plugin.settings.incomingColors.forEach((color, index) => {
            new Setting(containerEl)
                .setName(`Incoming Depth ${index + 1}`)
                .addExtraButton(button => {
                    button.setIcon('reset')
                          .setTooltip('Restore default')
                          .onClick(async () => {
                              this.plugin.settings.incomingColors[index] = DEFAULT_SETTINGS.incomingColors[index];
                              await this.plugin.saveSettings();
                              this.display();
                          });
                })
                .addColorPicker(picker => {
                    picker.setValue(color)
                          .onChange(async (value) => {
                              this.plugin.settings.incomingColors[index] = value;
                              await this.plugin.saveSettings();
                          });
                });
        });
	}
}