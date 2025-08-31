// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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


	const newRequestDisposable = vscode.commands.registerCommand('basic-client.newRequest', (requestData?: any) => {
		const panel = vscode.window.createWebviewPanel(
			'basicClientRequest',
			'New Request',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);
		panel.webview.html = getNewRequestWebviewContent();

		// Listen for messages from the webview to update saved requests
		panel.webview.onDidReceiveMessage(async (msg) => {
			if (msg.type === 'saveRequest' && msg.request) {
				const arr = context.globalState.get<any[]>('basicClientSavedRequests') || [];
				// Assign a unique id if not present
				if (!msg.request.id) {
					msg.request.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
				}
				// Find by id
				const idx = arr.findIndex(r => r.id === msg.request.id);
				if (idx >= 0) {
					arr[idx] = { ...msg.request };
				} else {
					arr.push(msg.request);
				}
				await context.globalState.update('basicClientSavedRequests', arr);
				treeDataProvider.refresh();
			} else if (msg.type === 'deleteRequest' && msg.id) {
				let arr = context.globalState.get<any[]>('basicClientSavedRequests') || [];
				arr = arr.filter(r => r.id !== msg.id);
				await context.globalState.update('basicClientSavedRequests', arr);
				treeDataProvider.refresh();
			} else if (msg.type === 'clearAllRequests') {
				await context.globalState.update('basicClientSavedRequests', []);
				treeDataProvider.refresh();
			} else if (msg.type === 'getRequests') {
				const arr = context.globalState.get<any[]>('basicClientSavedRequests') || [];
				panel.webview.postMessage({ type: 'savedRequests', requests: arr });
			} else if (msg.type === 'closePanel') {
				panel.dispose();
			}
		});

		// When the webview loads, request the saved requests and send requestData if provided
		panel.webview.onDidReceiveMessage((msg) => {
			if (msg.type === 'ready') {
				const arr = context.globalState.get<any[]>('basicClientSavedRequests') || [];
				panel.webview.postMessage({ type: 'savedRequests', requests: arr });
				if (requestData) {
					panel.webview.postMessage({ type: 'loadRequest', request: requestData });
				}
			}
		});
	});
	context.subscriptions.push(newRequestDisposable);
}

function getNewRequestWebviewContent(): string {
	const htmlPath = path.join(__dirname, '..', 'resources', 'new-request-panel.html');
	try {
		return fs.readFileSync(htmlPath, 'utf8');
	} catch (err) {
		return `<html><body><h2>Could not load panel HTML</h2><pre>${err}</pre></body></html>`;
	}
}

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

	getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
		if (!element) {
			const welcomeItem = new vscode.TreeItem('Welcome to Basic Client FROM Zeros and Ones!', vscode.TreeItemCollapsibleState.None);
			const newRequestItem = new vscode.TreeItem('New Request', vscode.TreeItemCollapsibleState.None);
			newRequestItem.command = {
				command: 'basic-client.newRequest',
				title: 'New Request'
			};
			newRequestItem.iconPath = new vscode.ThemeIcon('add');

			// Load saved requests from globalState
			const arr = this.context.globalState.get<any[]>('basicClientSavedRequests') || [];
			const savedItems = arr.map((req, idx) => {
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
			return [welcomeItem, newRequestItem, ...savedItems];
		}
		return [];
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
