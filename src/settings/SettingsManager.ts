import { Plugin } from 'obsidian';

export interface MemoryPluginSettings {
  miniMaxApiKey: string;
  apiUrl: string;
  model: string;
  pollIntervalSeconds: number;
  autoCapture: boolean;
  defaultTimeFilter: string;
}

export const DEFAULT_SETTINGS: MemoryPluginSettings = {
  miniMaxApiKey: '',
  apiUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2',
  model: 'MiniMax-Text-01',
  pollIntervalSeconds: 30,
  autoCapture: true,
  defaultTimeFilter: 'all'
};

export class SettingsManager {
  private plugin: Plugin;
  settings: MemoryPluginSettings;

  constructor(plugin: Plugin) {
    this.plugin = plugin;
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async load(): Promise<void> {
    const loaded = await this.plugin.loadData();
    if (loaded) {
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
    }
  }

  async save(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  get(key: keyof MemoryPluginSettings): any {
    return this.settings[key];
  }

  async set(key: keyof MemoryPluginSettings, value: any): Promise<void> {
    this.settings[key] = value;
    await this.save();
  }
}