// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import MarkdownIt = require("markdown-it");
import {DoAuthoringMdItPlugin, DoPluginOptions} from "markdown-it-do-co-pack";
import * as vscode from "vscode";
import { getCommandString } from "./constants";
import { generateCss } from "./css-process";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(getCommandString("rebuildCss"), async () => {
			try {
				await generateCss(true);
				vscode.window.showInformationMessage(`CSS rebuilt!`);
			} catch (err) {
				vscode.window.showErrorMessage(`Error rebuilding CSS`, err.toString());
			}
		})
	);

	return {
		extendMarkdownIt(md: MarkdownIt) {
			// This interferes with the variable highlighter rule (e.g. `<^>myVar<^>`)
			md.disable("math_inline", true);
			md.use<DoPluginOptions>(DoAuthoringMdItPlugin, {
				rules: "all"
			});
			return md;
		},
	};
}

// this method is called when your extension is deactivated
export function deactivate() {}
