// src/views/dashboardView.ts
import * as vscode from 'vscode';
import * as path from 'path';

import { Project } from '../models/project';

export class DashboardView implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private currentProject?: Project;

  constructor(private context: vscode.ExtensionContext) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
      ]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(message => {
      this.handleMessage(message);
    });
  }

  public render(project: Project): void {
    this.currentProject = project;
    if (this.view) {
      this.view.webview.html = this.getHtml(this.view.webview);
      this.view.show(true);
    }
  }

  public refresh(): void {
    if (this.view && this.currentProject) {
      this.view.webview.postMessage({
        type: 'refresh',
        project: this.currentProject
      });
    }
  }
  
  public showSuggestions(suggestions: string[]): void {
    if (this.view) {
      this.view.webview.postMessage({
        type: 'suggestions',
        data: suggestions
      });
    }
  }
  
  public refreshGitHubStatus(): void {
    if (this.view && this.currentProject) {
      this.view.webview.postMessage({
        type: 'github-status',
        project: this.currentProject
      });
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'dashboard.js'))
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'dashboard.css'))
    );

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Project Dashboard</title>
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div id="app">
    <header class="dashboard-header">
      <h1>${this.currentProject?.name || 'Project Dashboard'}</h1>
    </header>
    
    <div class="dashboard-container">
      <section class="timeline-view">
        <h2>Project Timeline</h2>
        <div id="timeline"></div>
      </section>
      
      <section class="task-view">
        <h2>Tasks</h2>
        <div id="task-list"></div>
      </section>
      
      <section class="insights-view">
        <h2>AI Insights</h2>
        <div id="ai-suggestions"></div>
      </section>
    </div>
  </div>
  
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private handleMessage(message: any): void {
    switch (message.command) {
      case 'updateTask':
        // Handle task updates
        break;
      case 'requestRefresh':
        this.refresh();
        break;
    }
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}