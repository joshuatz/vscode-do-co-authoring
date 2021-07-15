/**
 * @file This handles loading the actual Markdown-it rules needed for special DO-CO processing (from `markdown-it-do-co-pack`)
 */

import { DoAuthoringMdItPlugin, DoPluginOptions, OrderedRules } from 'markdown-it-do-co-pack';
import { getShouldBeEnabled } from './utils';
import MarkdownIt = require('markdown-it');

/**
 * This is a workaround, since Markdown-its `.disable()` function does not handle multiple rules with the same name - it will just disable the first one that matches. This function disables ***all*** rules on the given `Ruler`(s) that match the given `ruleName`
 */
function toggleAllRulesByName(md: MarkdownIt, ruleName: string, updatedEnabledStatus: boolean, scopes: Array<'core' | 'block' | 'inline'> = ['core'], silent = false) {
	try {
		scopes.forEach(scope => {
			let matched = false;

			// @ts-ignore - Private APIs
			md[scope].ruler.__rules__.forEach(r => {
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

export function extendMarkdownIt(md: MarkdownIt) {
	let isEnabled = false;

	const conditionallyApply = () => {
		if (getShouldBeEnabled()) {
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
	md.parse = (src, env) => {
		conditionallyApply();
		return parse.call(md, src, env);
	};

	md.render = (src, env) => {
		conditionallyApply();
		return render.call(md, src, env);
	};

	return md;
}
