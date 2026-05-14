import { App, PluginSettingTab, Setting } from 'obsidian';
import { SettingsManager } from './SettingsManager';
import type ObsidianMemoryPlugin from '../main';

export class MemorySettingsTab extends PluginSettingTab {
  private manager: SettingsManager;
  private plugin: ObsidianMemoryPlugin;

  constructor(app: App, manager: SettingsManager) {
    super(app, manager.plugin as any);
    this.manager = manager;
    this.plugin = manager.plugin as ObsidianMemoryPlugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '记忆插件设置' });

    // API Key
    new Setting(containerEl)
      .setName('API Key')
      .setDesc('用于 AI 生成记忆描述的 API Key')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.manager.settings.miniMaxApiKey)
        .onChange(async (value) => {
          await this.manager.set('miniMaxApiKey', value);
        }));

    // API URL
    new Setting(containerEl)
      .setName('API URL')
      .setDesc('AI API 的端点地址（可选，默认为 MiniMax）')
      .addText(text => text
        .setPlaceholder('https://api.minimax.chat/v1/text/chatcompletion_v2')
        .setValue(this.manager.settings.apiUrl)
        .onChange(async (value) => {
          await this.manager.set('apiUrl', value);
        }));

    // Model
    new Setting(containerEl)
      .setName('Model')
      .setDesc('AI 模型名称')
      .addText(text => text
        .setPlaceholder('MiniMax-Text-01')
        .setValue(this.manager.settings.model)
        .onChange(async (value) => {
          await this.manager.set('model', value);
        }));

    // Poll Interval
    new Setting(containerEl)
      .setName('自动刷新间隔')
      .setDesc('设置记忆自动扫描的时间间隔（秒）')
      .addText(text => text
        .setPlaceholder('30')
        .setValue(String(this.manager.settings.pollIntervalSeconds))
        .onChange(async (value) => {
          const num = parseInt(value, 10);
          if (num > 0) {
            await this.manager.set('pollIntervalSeconds', num);
            this.applyRuntimeSettings();
          }
        }));

    // Auto Capture Toggle
    new Setting(containerEl)
      .setName('自动捕获')
      .setDesc('是否自动捕获 vault 中的文件变化')
      .addToggle(toggle => toggle
        .setValue(this.manager.settings.autoCapture)
        .onChange(async (value) => {
          await this.manager.set('autoCapture', value);
          this.applyRuntimeSettings();
        }));

    // Default Time Filter
    new Setting(containerEl)
      .setName('默认时间过滤')
      .setDesc('记忆列表的默认时间过滤')
      .addDropdown(dropdown => dropdown
        .addOption('all', '全部')
        .addOption('day', '今天')
        .addOption('week', '本周')
        .addOption('month', '本月')
        .setValue(this.manager.settings.defaultTimeFilter)
        .onChange(async (value) => {
          await this.manager.set('defaultTimeFilter', value);
        }));
  }

  private applyRuntimeSettings(): void {
    if (this.plugin.lifecycleManager) {
      const pollInterval = this.manager.get('pollIntervalSeconds');
      const autoCapture = this.manager.get('autoCapture');
      this.plugin.lifecycleManager.updateSettings(pollInterval, autoCapture);
    }
  }
}