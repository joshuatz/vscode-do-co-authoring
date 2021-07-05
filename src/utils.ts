import * as vscode from 'vscode';
import { PLUGIN_CONFIG_KEY } from './constants';

export function getShouldBeEnabled() {
	let enabled = false;
	const { activeTextEditor } = vscode.window;
	if (activeTextEditor) {
		const activeDoc = activeTextEditor.document;
		const config = vscode.workspace.getConfiguration(PLUGIN_CONFIG_KEY, activeDoc.uri);
		console.log({ config, activeTextEditor });

		// Check for project-wide enabling
		if (config.get('enabled')) {
			return true;
		}

		const globPatterns = config.get<null | any[]>('enabledPatterns');
		if (Array.isArray(globPatterns)) {
			for (const glob of globPatterns) {
				if (typeof glob === 'string') {
					const docFilter: vscode.DocumentFilter = {
						pattern: glob,
					};
					if (vscode.languages.match(docFilter, activeDoc)) {
						return true;
					}
				}
			}
		}
	}
	return enabled;
}
