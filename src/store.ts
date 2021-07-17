import { ExtensionContext, TextDocument } from 'vscode';
import { STORE_KEYS } from './constants';

export class Store {
	constructor(private context: ExtensionContext) {}

	get isEnabled() {
		return !!this.context.workspaceState.get(STORE_KEYS.enabled) || false;
	}
	set isEnabled(updatedEnabled: boolean) {
		this.context.workspaceState.update(STORE_KEYS.enabled, updatedEnabled);
	}

	get lastMdFile(): TextDocument | undefined {
		return this.context.workspaceState.get(STORE_KEYS.lastMdFile);
	}
	set lastMdFile(doc: TextDocument | undefined) {
		let storeVal: Partial<TextDocument> | undefined = doc;
		if (doc) {
			// Trim off excess before storing. Just need enough for matcher
			storeVal = {
				uri: doc.uri,
				languageId: doc.languageId,
				fileName: doc.fileName,
				isUntitled: doc.isUntitled,
			};
		}
		this.context.workspaceState.update(STORE_KEYS.lastMdFile, storeVal);
	}
}
