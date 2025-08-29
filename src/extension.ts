// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
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
				arr.push(msg.request);
				await context.globalState.update('basicClientSavedRequests', arr);
				treeDataProvider.refresh();
			} else if (msg.type === 'getRequests') {
				const arr = context.globalState.get<any[]>('basicClientSavedRequests') || [];
				panel.webview.postMessage({ type: 'savedRequests', requests: arr });
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
				const label = `${req.method || 'GET'} ${req.url || ''}`;
				const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
				item.description = req.url;
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
