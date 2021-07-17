/**
 * @file This handles loading the actual Markdown-it rules needed for special DO-CO processing (from `markdown-it-do-co-pack`)
 */

import { DoAuthoringMdItPlugin, DoPluginOptions, OrderedRules } from 'markdown-it-do-co-pack';
import { getShouldBeEnabled } from './utils';
import MarkdownIt = require('markdown-it');
import Token = require('markdown-it/lib/token');
import { PLUGIN_CSS_CLASS_NAME } from './constants';
import { ExtensionContext } from 'vscode';

/**
 * This is a workaround, since Markdown-its `.disable()` function does not handle multiple rules with the same name - it will just disable the first one that matches. This function disables ***all*** rules on the given `Ruler`(s) that match the given `ruleName`
 */
function toggleAllRulesByName(
	md: MarkdownIt,
	ruleName: string,
	updatedEnabledStatus: boolean,
	scopes: Array<'core' | 'block' | 'inline'> = ['core'],
	silent = false
) {
	try {
		scopes.forEach((scope) => {
			let matched = false;

			// @ts-ignore - Private APIs
			md[scope].ruler.__rules__.forEach((r) => {
				if (r.name === ruleName) {
					if (r.enabled !== updatedEnabledStatus) {
						r.enabled = updatedEnabledStatus;
						matched = true;
					}
				}
			});

			if (matched) {
				// @ts-ignore - Private API
				md.inline.ruler.__cache__ = null;
			}
		});
	} catch (e) {
		if (!silent) {
			console.warn(`Failed to disable rules via __rules__, has an internal API changed in Markdown-it?`, e);
		}
	}
}

/**
 * Conditionally loads rules into Markdown-it instance, injects HTML element, and data attributes
 * @param md Instance of Markdown-it
 * @param injectData Key-Pair data to be injected via `data-key="val"` html attributes, on highest level injected element
 */
export function conditionallyExtendMarkdownIt(
	md: MarkdownIt,
	context: ExtensionContext,
	injectData?: Record<string, string>
): MarkdownIt {
	let isEnabled = false;

	/**
	 * Conditionally load (or back-out) rules
	 */
	const conditionallyApply = () => {
		if (getShouldBeEnabled(context)) {
			if (!isEnabled) {
				// There are some math rules that interfere with parts of DOCO syntax
				// I feel it is fine to disable these since
				//    A) User has to explicitly enable this extension
				//    B) These are not supported by DOCO, so pretending they would be in the preview
				//       pane would be misleading
				// One math rules interferes with the variable highlighter rule (e.g. `<^>myVar<^>`). Treats it as superscript
				// Also interferes with `<$>...<$>` for notes, because math rule interprets as KaTeX
				toggleAllRulesByName(md, 'math_inline', false, ['inline']);

				// Load all DOCO rules
				md.use<DoPluginOptions>(DoAuthoringMdItPlugin, {
					rules: 'all',
				});
				isEnabled = true;
			}
		} else {
			if (isEnabled) {
				OrderedRules.forEach((rule) => {
					md.disable(rule.name);
				});
				isEnabled = false;
			}
		}
	};

	// Override default MDIT parse() and render() calls, so extension always
	// has a chance to load (or unload) rule sets based on open file
	const { parse, render } = md;

	// parse is going to be called here: https://github.com/microsoft/vscode/blob/4b6444d73bb7ae2c9ba0c1bda37e574e8c232fd4/extensions/markdown-language-features/src/markdownEngine.ts#L152-L156
	// Token array returned here eventually gets turned into HTML used for preview
	md.parse = (src, env) => {
		conditionallyApply();
		if (getShouldBeEnabled(context)) {
			let dataAttrString = '';
			if (injectData) {
				dataAttrString = Object.entries(injectData)
					.map((p) => `data-${p[0]}="${p[1]}"`)
					.join(' ');
			}

			// Construct <div> wrapper around content
			// I'm using this so that JS / CSS that is loaded into the preview 100% of the time can detect if the extension is soft-disabled
			// @see https://github.com/joshuatz/vscode-do-co-authoring/issues/1
			const htmlBlock = new Token('html_block', '', 0);
			htmlBlock.block = true;
			return [
				{
					...htmlBlock,
					content: `<div class="${PLUGIN_CSS_CLASS_NAME}" ${dataAttrString}>`,
				},
				...parse.call(md, src, env),
				{
					...htmlBlock,
					content: `</div>`,
				},
			] as Token[];
		} else {
			return parse.call(md, src, env);
		}
	};

	// This is actually not called by VSCode currently - they use parse to get tokens, then use own render instance separately
	md.render = (src, env) => {
		conditionallyApply();
		return render.call(md, src, env);
	};

	return md;
}
