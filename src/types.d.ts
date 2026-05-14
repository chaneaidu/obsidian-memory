// Obsidian Plugin API Type Declarations

declare module 'obsidian' {
  export class Plugin {
    app: any;
    manifest: any;
    constructor(app: any, manifest: any);
    onload(): Promise<void>;
    onunload(): void;
    addCommand(command: any): void;
    addRibbonIcon(icon: string, title: string, callback: () => void): void;
    registerView(type: string, viewCreator: (leaf: any) => any): void;
  }

  export interface Command {
    id: string;
    name: string;
    callback: () => void | Promise<void>;
  }

  export class WorkspaceLeaf {
    containerEl: any;
    view: any;
  }

  export class View {
    containerEl: any;
  }

  export class ItemView extends View {
    leaf: WorkspaceLeaf;
    contentEl: any;
    constructor(leaf: WorkspaceLeaf);
    getViewType(): string;
    getDisplayText(): string;
    onOpen(): Promise<void>;
    onClose(): Promise<void>;
  }

  export interface Vault {
    getName(): string;
    getFullPath(path: string): string;
    getAbstractFileByPath(path: string): any;
    createFolder(path: string): Promise<any>;
    create(path: string, content: string): Promise<any>;
    modify(file: any, content: string): Promise<void>;
    process(file: any, fn: (content: string) => string | Promise<string>): Promise<void>;
    on(event: string, callback: (file: any) => void | Promise<void>): void;
    read(file: any): Promise<string>;
  }

  export interface App {
    vault: Vault;
    workspace: any;
  }

  export class Notice {
    constructor(message: string);
  }

  export type HTMLElement = globalThis.HTMLElement;
}