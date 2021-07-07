import * as vscode from 'vscode';
import { PLUGIN_CONFIG_KEY } from './constants';

/**
 * Gets whether or not the extension should be enabled (i.e. *applied*) to the current doc
 *  - Based on settings
 */
export function getShouldBeEnabled(doc?: vscode.TextDocument) {
	let enabled = false;
	const { activeTextEditor } = vscode.window;
	const activeDoc = doc || activeTextEditor?.document;
	if (activeDoc) {
		const config = vscode.workspace.getConfiguration(PLUGIN_CONFIG_KEY, activeDoc.uri);

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

/**
 * "Cleans" a document, removing all "draft artifacts". These would be things that would not appear in published version
 *  - Example: `<$>[draft]` notes
 *  - Example: HTML comments
 */
export function removeDraftArtifacts(doc: vscode.TextDocument, range?: vscode.Range) {
	const docRange = range || getFullRangeOfDoc(doc);
	const originalText = doc.getText(docRange);
	const workspaceEdit = new vscode.WorkspaceEdit();
	let execArr: RegExpExecArray | null = null;
	let removals: Array<{
		start: number;
		end: number;
	}> = [];
	const removalPatterns = [
		// Remove all HTML comments
		/(?:\r\n|\n)?<!--.*?-->(?:\r\n|\n)?/gims,
		// Remove all <$>[draft] notes
		/(?:\r\n|\n)?<\$>\[draft\].+?<\$>(?:\r\n|\n)?/gims,
	];

	for (const removalPatt of removalPatterns) {
		while ((execArr = removalPatt.exec(originalText)) !== null) {
			removals.push({
				start: execArr.index,
				end: execArr.index + execArr[0].length,
			});
		}
	}

	// Try to run removals backwards - starting at end of doc (larger start indexes first)
	removals.sort((a, b) => b.start - a.start);
	removals.forEach((remove) => {
		workspaceEdit.delete(doc.uri, new vscode.Range(doc.positionAt(remove.start), doc.positionAt(remove.end)));
	});

	// apply bulk edits
	return vscode.workspace.applyEdit(workspaceEdit);
}

/**
 * Retrieves the full range of a document
 */
export function getFullRangeOfDoc(doc: vscode.TextDocument) {
	return new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end);
}
