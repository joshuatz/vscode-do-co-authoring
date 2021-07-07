// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getCommandString } from './constants';
import { generateCss } from './css-process';
import { ExtensionCodeActionProvider, setupDiagnosticListeners } from './diagnostics';
import { extendMarkdownIt } from './markdown-it-plugin';
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
				vscode.window.showInformationMessage(`CSS rebuilt!`);
			} catch (err) {
				vscode.window.showErrorMessage(`Error rebuilding CSS`, err.toString());
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(getCommandString('removeDraftArtifacts'), () => {
			const doc = vscode.window.activeTextEditor?.document;
			if (doc && getShouldBeEnabled(doc)) {
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

	// VSCode will collect this and call it for MD preview rendering
	return {
		extendMarkdownIt,
	};
}

// this method is called when your extension is deactivated
export function deactivate() {}
