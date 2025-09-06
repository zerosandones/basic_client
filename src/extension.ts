// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const GLOBAL_KEY = 'basicClientSavedRequests';
const WORKSPACE_FILENAME = '.vscode/basic-client-requests.json';

function getWorkspaceFilePath(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return undefined;
    return path.join(folders[0].uri.fsPath, WORKSPACE_FILENAME);
}

async function loadRequests(storage: 'global' | 'workspace', context: vscode.ExtensionContext): Promise<any[]> {
    if (storage === 'workspace') {
        const filePath = getWorkspaceFilePath();
        if (filePath && fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return JSON.parse(content);
            } catch {
                return [];
            }
        }
        return [];
    } else {
        return context.globalState.get(GLOBAL_KEY, []);
    }
}

async function saveRequests(storage: 'global' | 'workspace', context: vscode.ExtensionContext, requests: any[]) {
    if (storage === 'workspace') {
        const filePath = getWorkspaceFilePath();
        if (filePath) {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, JSON.stringify(requests, null, 2), 'utf8');
        }
    } else {
        await context.globalState.update(GLOBAL_KEY, requests);
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {


	// TEMP: Command to clear all saved requests
	const clearAllDisposable = vscode.commands.registerCommand('basic-client.clearAll', async () => {
		await context.globalState.update('basicClientSavedRequests', []);
		vscode.window.showInformationMessage('All saved requests cleared.');
		treeDataProvider.refresh();
	});
	context.subscriptions.push(clearAllDisposable);

	console.log('Congratulations, your extension "basic-client" is now active!');

	const treeDataProvider = new BasicClientTreeDataProvider(context);
	vscode.window.registerTreeDataProvider('basicClientView', treeDataProvider);

	function openRequestPanel(request?: any) {
        console.log('Opening request panel for:', request);
        const panel = vscode.window.createWebviewPanel(
            'basicClientRequestPanel',
            request?.name ? `Edit Request: ${request.name}` : 'New Request',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                /*localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'resources'))
                ]*/
            }
        );

        //const htmlPath = path.join(context.extensionPath, 'resources', 'new-request-panel.html');
        //let html = fs.readFileSync(htmlPath, 'utf8');
        panel.webview.html = getNewRequestWebviewContent();

        // Send request data to webview if editing
        panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.type === 'ready') {
                console.log('Webview is ready');
                if (request) {
                    console.log('Sending request to webview:', request);
                    panel.webview.postMessage({ type: 'loadRequest', request });
                }
            }
            if (msg.type === 'saveRequest') {
                const req = msg.request;
                // Assign an id if not present
                if (!req.id) req.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
                const storage = req.storage || 'global';
                let requests = await loadRequests(storage, context);
                const idx = requests.findIndex((r: any) => r.id === req.id);
                if (idx !== -1) {
                    requests[idx] = req;
                } else {
                    requests.push(req);
                }
                await saveRequests(storage, context, requests);
                vscode.window.showInformationMessage('Request saved.');
                // Optionally refresh your tree view here
            }
            if (msg.type === 'deleteRequest') {
                const id = msg.id;
                let storage: 'global' | 'workspace' = 'global';
                // Try to find which storage this request is in
                let requests = await loadRequests('global', context);
                let idx = requests.findIndex((r: any) => r.id === id);
                if (idx === -1) {
                    requests = await loadRequests('workspace', context);
                    idx = requests.findIndex((r: any) => r.id === id);
                    storage = 'workspace';
                }
                if (idx !== -1) {
                    requests.splice(idx, 1);
                    await saveRequests(storage, context, requests);
                    vscode.window.showInformationMessage('Request deleted.');
                    // Optionally refresh your tree view here
                }
            }
            if (msg.type === 'closePanel') {
                panel.dispose();
            }
        });
    }

    // Example: register a command to open the panel
    context.subscriptions.push(
        vscode.commands.registerCommand('basic-client.newRequest', (request?: any) => openRequestPanel(request))
    );
}

function getNewRequestWebviewContent(): string {
	const htmlPath = path.join(__dirname, '..', 'resources', 'new-request-panel.html');
	try {
		return fs.readFileSync(htmlPath, 'utf8');
	} catch (err) {
		return `<html><body><h2>Could not load panel HTML</h2><pre>${err}</pre></body></html>`;
	}
}

// ...existing imports and code...

class BasicClientTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;
    constructor(private context: vscode.ExtensionContext) {}

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        if (!element) {
            const welcomeItem = new vscode.TreeItem('Welcome to Basic Client FROM Zeros and Ones!', vscode.TreeItemCollapsibleState.None);
            const newRequestItem = new vscode.TreeItem('New Request', vscode.TreeItemCollapsibleState.None);
            newRequestItem.command = {
                command: 'basic-client.newRequest',
                title: 'New Request'
            };
            newRequestItem.iconPath = new vscode.ThemeIcon('add');

            // Load global and workspace requests
            const globalArr = await loadRequests('global', this.context);
            const workspaceArr = await loadRequests('workspace', this.context);
			console.log('Global Requests:', globalArr);
			console.log('Workspace Requests:', workspaceArr);

            const globalHeader = new vscode.TreeItem('Global Requests', vscode.TreeItemCollapsibleState.Expanded);
            globalHeader.contextValue = 'header';
            const workspaceHeader = new vscode.TreeItem('Workspace Requests', vscode.TreeItemCollapsibleState.Expanded);
            workspaceHeader.contextValue = 'header';

            const globalItems = globalArr.map((req) => {
				console.log('Global Request:', req);
                const label = req.name && req.name.trim() ? req.name : `${req.method || 'GET'} ${req.url || ''}`;
                const description = req.name && req.name.trim() ? `${req.method || 'GET'} ${req.url || ''}` : '';
                const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
                item.description = description;
                item.command = {
                    command: 'basic-client.newRequest',
                    title: 'Open Request',
                    arguments: [req]
                };
                item.iconPath = new vscode.ThemeIcon('cloud');
                return item;
            });

            const workspaceItems = workspaceArr.map((req) => {
				console.log('Workspace Request:', req);
                const label = req.name && req.name.trim() ? req.name : `${req.method || 'GET'} ${req.url || ''}`;
                const description = req.name && req.name.trim() ? `${req.method || 'GET'} ${req.url || ''}` : '';
                const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
                item.description = description;
                item.command = {
                    command: 'basic-client.newRequest',
                    title: 'Open Request',
                    arguments: [req]
                };
                item.iconPath = new vscode.ThemeIcon('folder');
                return item;
            });

            // Attach children to headers
            (globalHeader as any).children = globalItems;
            (workspaceHeader as any).children = workspaceItems;

            // Only show headers if there are requests
            const tree: vscode.TreeItem[] = [welcomeItem, newRequestItem];
            if (globalItems.length > 0) tree.push(globalHeader);
            if (workspaceItems.length > 0) tree.push(workspaceHeader);

            return tree;
        } else if ((element as any).children) {
            return (element as any).children;
        }
        return [];
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
