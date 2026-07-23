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
exports.SocketBridge = void 0;
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
/**
 * Unix Socket Server - bridges mezi KiloCode and stdio MCP server
 * This allows KiloCode to connect via socket while our server uses stdio
 */
class SocketBridge {
    constructor(projectId) {
        this.server = null;
        this.socketPath = process.platform === 'win32'
            ? `\\\\.\\pipe\\mcp-memory-${projectId}`
            : `/tmp/mcp-memory-${projectId}.sock`;
    }
    start(handleRequest) {
        // Remove existing socket if it exists (not applicable for Windows named pipes)
        if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
        }
        this.server = net.createServer((socket) => {
            console.error(`[Socket Bridge] Client connected`);
            let buffer = '';
            socket.on('data', async (chunk) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.trim())
                        continue;
                    try {
                        const request = JSON.parse(line);
                        console.error(`[Socket Bridge] ${request.method}`);
                        const response = await handleRequest(request);
                        socket.write(JSON.stringify(response) + '\n');
                    }
                    catch (error) {
                        console.error(`[Socket Bridge] Error:`, error);
                        socket.write(JSON.stringify({
                            jsonrpc: '2.0',
                            error: { code: -32700, message: 'Parse error', data: error.message }
                        }) + '\n');
                    }
                }
            });
            socket.on('end', () => {
                console.error(`[Socket Bridge] Client disconnected`);
            });
            socket.on('error', (err) => {
                console.error(`[Socket Bridge] Socket error:`, err);
            });
        });
        this.server.listen(this.socketPath, () => {
            console.error(`[Socket Bridge] Listening at ${this.socketPath}`);
        });
        this.server.on('error', (err) => {
            console.error(`[Socket Bridge] Server error:`, err);
        });
        // Cleanup on exit
        process.on('exit', () => {
            this.cleanup();
        });
        process.on('SIGINT', () => {
            this.cleanup();
            process.exit(0);
        });
    }
    cleanup() {
        if (process.platform !== 'win32' && fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
        }
    }
}
exports.SocketBridge = SocketBridge;
//# sourceMappingURL=socket-bridge.js.map