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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class ConfigManager {
    constructor(context, workspaceFolder, outputChannel) {
        this.context = context;
        this.workspaceFolder = workspaceFolder;
        this.outputChannel = outputChannel;
    }
    async ensureSetup() {
        const projectId = path.basename(this.workspaceFolder.uri.fsPath);
        // Get the path to the bundled MCP server
        const serverPath = path.join(this.context.extensionPath, 'out', 'mcp-server', 'server.js');
        const workspacePath = this.workspaceFolder.uri.fsPath;
        // Define MCP server configuration (stdio command format)
        const mcpServerConfig = {
            command: 'node',
            args: [serverPath, projectId, workspacePath]
        };
        // Detect installed agents
        const installedAgents = await this.detectInstalledAgents();
        if (installedAgents.length === 0) {
            this.outputChannel.appendLine('⚠️  No AI coding agents detected. Skipping MCP configuration.');
            return;
        }
        this.outputChannel.appendLine(`📡 Detected agents: ${installedAgents.join(', ')}`);
        // Configure each agent's settings file
        for (const agent of installedAgents) {
            const settingsPath = this.getAgentSettingsPath(agent);
            if (!settingsPath) {
                this.outputChannel.appendLine(`⚠️  Unknown settings path for ${agent}`);
                continue;
            }
            await this.updateAgentMCPSettings(settingsPath, mcpServerConfig, agent);
        }
    }
    /**
     * Get the path to an agent's MCP settings file
     */
    getAgentSettingsPath(agent) {
        const homedir = require('os').homedir();
        const paths = {
            'kilocode': `${homedir}/Library/Application Support/Code/User/globalStorage/kilocode.kilo-code/settings/mcp_settings.json`,
            'cline': `${homedir}/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`,
            'roocode': `${homedir}/Library/Application Support/Code/User/globalStorage/roo-code.roo-code/settings/mcp_settings.json`
        };
        return paths[agent] || null;
    }
    /**
     * Update an agent's MCP settings file with agentMemory server configuration
     */
    async updateAgentMCPSettings(settingsPath, mcpConfig, agentName) {
        try {
            // Ensure directory exists
            await fs.mkdir(path.dirname(settingsPath), { recursive: true });
            // Read existing settings or create new
            let settings = { mcpServers: {} };
            try {
                const content = await fs.readFile(settingsPath, 'utf-8');
                settings = JSON.parse(content);
                if (!settings.mcpServers) {
                    settings.mcpServers = {};
                }
            }
            catch (error) {
                // File doesn't exist, use default structure
                this.outputChannel.appendLine(`📝 Creating new ${agentName} settings file`);
            }
            // Always update agentMemory server (to ensure format is current)
            const wasPresent = !!settings.mcpServers['agentMemory'];
            settings.mcpServers['agentMemory'] = mcpConfig;
            await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
            if (wasPresent) {
                this.outputChannel.appendLine(`🔄 Updated ${agentName} MCP settings`);
            }
            else {
                this.outputChannel.appendLine(`✅ Configured ${agentName} MCP settings`);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to configure ${agentName}: ${error.message}`);
        }
    }
    /**
     * Detect which AI coding agents are installed
     */
    async detectInstalledAgents() {
        const installed = [];
        const agentExtensions = {
            'cline': 'saoudrizwan.claude-dev',
            'roocode': 'roo-code.roo-code',
            'kilocode': 'kilocode.kilo-code',
            'continue': 'continue.continue',
            'cursor': 'cursor.cursor'
        };
        for (const [agent, extensionId] of Object.entries(agentExtensions)) {
            const extension = vscode.extensions.getExtension(extensionId);
            if (extension) {
                installed.push(agent);
            }
        }
        return installed;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config.js.map