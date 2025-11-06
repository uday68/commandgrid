"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardView = void 0;
// src/views/dashboardView.ts
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class DashboardView {
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(webviewView, _context, _token) {
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
    render(project) {
        this.currentProject = project;
        if (this.view) {
            this.view.webview.html = this.getHtml(this.view.webview);
            this.view.show(true);
        }
    }
    refresh() {
        if (this.view && this.currentProject) {
            this.view.webview.postMessage({
                type: 'refresh',
                project: this.currentProject
            });
        }
    }
    showSuggestions(suggestions) {
        if (this.view) {
            this.view.webview.postMessage({
                type: 'suggestions',
                data: suggestions
            });
        }
    }
    refreshGitHubStatus() {
        if (this.view && this.currentProject) {
            this.view.webview.postMessage({
                type: 'github-status',
                project: this.currentProject
            });
        }
    }
    getHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'dashboard.js')));
        const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, 'media', 'dashboard.css')));
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
    handleMessage(message) {
        switch (message.command) {
            case 'updateTask':
                // Handle task updates
                break;
            case 'requestRefresh':
                this.refresh();
                break;
        }
    }
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
exports.DashboardView = DashboardView;
//# sourceMappingURL=dashboardView.js.map