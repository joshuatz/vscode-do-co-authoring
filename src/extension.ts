// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import MarkdownIt from 'markdown-it';
import path from 'path';
import * as vscode from 'vscode';
import { getCommandString, PLUGIN_CONFIG_KEY } from './constants';
import { generateCss } from './css-process';
import { ExtensionCodeActionProvider, setupDiagnosticListeners } from './diagnostics';
import { conditionallyExtendMarkdownIt } from './markdown-it-plugin';
import { getFullRangeOfDoc, getShouldBeEnabled, removeDraftArtifacts } from './utils.js';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Make sure there is a cached generated CSS file
	generateCss(false);

	// Commands
	context.subscriptions.push(
		vscode.commands.registerCommand(getCommandString('rebuildCss'), async () => {
			try {
				await generateCss(true);
				vscode.commands.executeCommand('markdown.preview.refresh');
				vscode.window.showInformationMessage(`CSS rebuilt!`);
			} catch (err) {
				vscode.window.showErrorMessage(`Error rebuilding CSS`, err.toString());
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(getCommandString('removeDraftArtifacts'), () => {
			const doc = vscode.window.activeTextEditor?.document;
			if (doc && getShouldBeEnabled(context, doc)) {
				removeDraftArtifacts(doc, getFullRangeOfDoc(doc));
			}
		})
	);

	// Diagnostics
	setupDiagnosticListeners(context);

	// Code Actions
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('markdown', new ExtensionCodeActionProvider(), {
			providedCodeActionKinds: ExtensionCodeActionProvider.providedCodeActionsKinds,
		})
	);

	// Listen for when user changes preferences specific to this extension
	// when it happens, refresh the Markdown preview to reflect changes
	vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration(PLUGIN_CONFIG_KEY)) {
			vscode.commands.executeCommand('markdown.preview.refresh');
		}
	});

	// Since preview Webview will not have access to VSCode APIs, need to pass
	// in the pre-generated URI to the CSS to conditionally load
	const mdCssDiskPath = vscode.Uri.file(path.join(context.extensionPath, 'do-md.css'));
	const mdCssWebviewUri = `https://file+.vscode-resource.vscode-webview.net/${mdCssDiskPath
		.toString()
		.replace(/^file:\/*/, '')}`;

	// VSCode will collect this and call it for MD preview rendering
	return {
		extendMarkdownIt(md: MarkdownIt): MarkdownIt {
			return conditionallyExtendMarkdownIt(md, context, {
				'css-uri': mdCssWebviewUri,
			});
		},
	};
}

// this method is called when your extension is deactivated
export function deactivate() {
	vscode.commands.executeCommand('markdown.preview.refresh');
}
