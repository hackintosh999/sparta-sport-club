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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const config_1 = require("./config");
const interceptor_1 = require("./interceptor");
const api_1 = require("./api");
const security_1 = require("./security");
const path = __importStar(require("path"));
let mcpServerProcess = null;
let statusBarItem;
let outputChannel;
function activate(context) {
    // Create output channel for logging
    outputChannel = vscode.window.createOutputChannel('agentMemory');
    context.subscriptions.push(outputChannel);
    outputChannel.appendLine('🧠 agentMemory extension is now active');
    outputChannel.appendLine(`Version: 0.1.0`);
    outputChannel.appendLine(`Activated at: ${new Date().toLocaleString()}`);
    outputChannel.appendLine('');
    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(database) Memory: Initializing...';
    statusBarItem.tooltip = 'agentMemory - Persistent Memory for AI Agents';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    // Get workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('agentMemory: No workspace folder found. Extension will not activate.');
        statusBarItem.text = '$(database) Memory: No Workspace';
        return;
    }
    // Initialize configuration manager
    const configManager = new config_1.ConfigManager(context, workspaceFolder, outputChannel);
    // Initialize interceptor manager
    const interceptorManager = new interceptor_1.InterceptorManager(workspaceFolder, outputChannel);
    // Auto-configure all agents
    configManager.ensureSetup()
        .then(() => {
        outputChannel.appendLine('✅ Agent configuration complete');
        return interceptorManager.injectRules();
    })
        .then(() => {
        outputChannel.appendLine('✅ Behavior injection complete');
        outputChannel.appendLine('');
        statusBarItem.text = '$(database) Memory: Active';
        statusBarItem.tooltip = 'agentMemory - Memory bank active for this workspace';
    })
        .catch((error) => {
        outputChannel.appendLine('❌ Setup failed: ' + error.message);
        vscode.window.showErrorMessage(`agentMemory setup failed: ${error.message}`);
        statusBarItem.text = '$(database) Memory: Error';
    });
    // Start bundled MCP server
    startMCPServer(context, workspaceFolder.uri.fsPath);
    // Register commands
    const statsCommand = vscode.commands.registerCommand('agentMemory.showStats', () => {
        vscode.window.showInformationMessage('agentMemory Stats - Coming soon!');
    });
    context.subscriptions.push(statsCommand);
    // Register dashboard command
    const { DashboardManager } = require('./dashboard');
    const dashboardManager = new DashboardManager(context);
    const dashboardCommand = vscode.commands.registerCommand('agentMemory.openDashboard', () => {
        dashboardManager.openDashboard();
    });
    context.subscriptions.push(dashboardCommand);
    // Initialize dashboard HTTP server (for debugging)
    const { DashboardServer } = require('./dashboard-server');
    const dashboardServer = new DashboardServer(context, outputChannel);
    // Register command to start dashboard server
    const serverCommand = vscode.commands.registerCommand('agentMemory.startDashboardServer', () => {
        dashboardServer.start();
    });
    context.subscriptions.push(serverCommand);
    // Auto-start server in development mode (optional)
    // dashboardServer.start();
    // Initialize SecurityManager
    const securityManager = new security_1.SecurityManager(context);
    // Initialize and export the public API
    const projectId = path.basename(workspaceFolder.uri.fsPath);
    const api = new api_1.MemoryAPI('agentmemory', projectId, securityManager, null);
    // Return API for other extensions to use
    return api;
}
function startMCPServer(context, workspacePath) {
    // Get project ID from workspace path
    const projectId = path.basename(workspacePath);
    // Path to bundled MCP server
    const serverPath = path.join(context.extensionPath, 'out', 'mcp-server', 'server.js');
    outputChannel.appendLine(`\n🚀 Starting MCP server for project: ${projectId}`);
    outputChannel.appendLine(`   Server path: ${serverPath}`);
    mcpServerProcess = (0, child_process_1.spawn)('node', [serverPath, projectId, workspacePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PROJECT_ID: projectId, WORKSPACE_PATH: workspacePath }
    });
    mcpServerProcess.stdout?.on('data', (data) => {
        outputChannel.appendLine(`[MCP Server] ${data.toString().trim()}`);
    });
    mcpServerProcess.stderr?.on('data', (data) => {
        outputChannel.appendLine(`[MCP Server Error] ${data.toString().trim()}`);
    });
    mcpServerProcess.on('exit', (code) => {
        outputChannel.appendLine(`[MCP Server] Exited with code ${code}`);
        statusBarItem.text = '$(database) Memory: Offline';
    });
}
/**
 * Import existing memory bank files from all agents
 */
async function importExistingMemoryBanks(workspaceFolder) {
    const { MemoryBankSync } = await Promise.resolve().then(() => __importStar(require('./mcp-server/memory-bank-sync')));
    const syncEngine = new MemoryBankSync(workspaceFolder.uri.fsPath);
    outputChannel?.appendLine('[Import] Checking for existing memory bank files...');
    try {
        await syncEngine.importAll();
        outputChannel?.appendLine('[Import] ✅ Initial import complete');
        // Start file watching
        syncEngine.startWatching().catch(err => {
            outputChannel?.appendLine(`[Import] ⚠️  Watching: ${err.message}`);
        });
    }
    catch (error) {
        outputChannel?.appendLine(`[Import] ❌ Error: ${error.message}`);
        throw error;
    }
}
function deactivate() {
    if (mcpServerProcess) {
        mcpServerProcess.kill();
        mcpServerProcess = null;
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
//# sourceMappingURL=extension.js.map