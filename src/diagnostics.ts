import * as vscode from 'vscode';
import { PLUGIN_NAME } from './constants.js';
import { getShouldBeEnabled } from './utils';

const DIAG_CODES = {
	FIRST_PERSON_I: {
		code: 'FIRST_PERSON_I',
		msg: `Try to avoid the use of the first-person "I".`,
		severity: vscode.DiagnosticSeverity.Warning,
	},
};

/**
 * Scan document for issues, and update diagnostics collection to findings
 */
export function refreshDiagnostics(
	context: vscode.ExtensionContext,
	doc: vscode.TextDocument,
	docoDiagnostics: vscode.DiagnosticCollection
): void {
	const diagnostics: vscode.Diagnostic[] = [];

	if (getShouldBeEnabled(context)) {
		// For right now, just go line-by-line
		// if more rules are added in future, this will likely need refactoring
		for (let y = 0; y < doc.lineCount; y++) {
			const text = doc.lineAt(y).text;
			const patt = / i |^i | i$/gim;
			let execArr: RegExpExecArray | null;
			while ((execArr = patt.exec(text)) !== null) {
				const range = new vscode.Range(y, execArr.index, y, execArr.index + execArr[0].length);
				diagnostics.push(
					createDiagnostic(
						range,
						DIAG_CODES.FIRST_PERSON_I.msg,
						DIAG_CODES.FIRST_PERSON_I.code,
						DIAG_CODES.FIRST_PERSON_I.severity
					)
				);
			}
		}
	}

	docoDiagnostics.set(doc.uri, diagnostics);
}

/**
 * Wrapper around new vscode.Diagnostic to assign .code in one-shot
 */
export function createDiagnostic(
	range: vscode.Range,
	msg: string,
	code?: vscode.Diagnostic['code'],
	severity = vscode.DiagnosticSeverity.Information
): vscode.Diagnostic {
	const diagnostic = new vscode.Diagnostic(range, msg, severity);
	diagnostic.code = code;
	return diagnostic;
}

/**
 * Ensures that diagnostics are refreshed (or deleted) based on file activity
 */
export function setupDiagnosticListeners(context: vscode.ExtensionContext) {
	const docoDiagnostics = vscode.languages.createDiagnosticCollection(PLUGIN_NAME);
	context.subscriptions.push(docoDiagnostics);

	// On load, only run diagnostics if open doc
	if (vscode.window.activeTextEditor) {
		refreshDiagnostics(context, vscode.window.activeTextEditor.document, docoDiagnostics);
	}

	// Listen for doc change, doc edit, or doc close
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				refreshDiagnostics(context, editor.document, docoDiagnostics);
			}
		})
	);
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument((e) => refreshDiagnostics(context, e.document, docoDiagnostics))
	);

	context.subscriptions.push(vscode.workspace.onDidCloseTextDocument((doc) => docoDiagnostics.delete(doc.uri)));
}

/**
 * Provides code actions, linked up to diagnostics
 */
export class ExtensionCodeActionProvider implements vscode.CodeActionProvider {
	public static readonly providedCodeActionsKinds = [vscode.CodeActionKind.QuickFix];

	provideCodeActions(
		doc: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): Array<vscode.CodeAction | vscode.Command> {
		let actions: (vscode.CodeAction | vscode.Command)[] = [];

		// Find diagnostics that have quick fixes and map back
		context.diagnostics.forEach((diag) => {
			if (diag.code === DIAG_CODES.FIRST_PERSON_I.code) {
				const action = new vscode.CodeAction(`Replace with 'you'`, vscode.CodeActionKind.QuickFix);
				action.edit = new vscode.WorkspaceEdit();

				// Build quick-fix action, which replaces "I" in text
				const originalText = doc.getText(range);
				// Upper case, start of sentence
				let fixedText = originalText.replace(/^[ ]*i /gim, (sub) => sub.replace(/i/i, 'You'));
				// lower case, middle of sentence
				fixedText = fixedText.replace(/ i | i$/gim, (sub) => sub.replace(/i/i, 'you'));
				action.edit.replace(doc.uri, range, fixedText);

				actions.push(action);
			}
		});

		return actions;
	}
}
