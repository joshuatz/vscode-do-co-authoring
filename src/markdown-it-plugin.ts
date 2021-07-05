/**
 * @file This handles loading the actual Markdown-it rules needed for special DO-CO processing (from `markdown-it-do-co-pack`)
 */

import { DoAuthoringMdItPlugin, DoPluginOptions, OrderedRules } from 'markdown-it-do-co-pack';
import { getShouldBeEnabled } from './utils';
import MarkdownIt = require('markdown-it');

export function extendMarkdownIt(md: MarkdownIt) {
	let isEnabled = false;

	const conditionallyApply = () => {
		if (getShouldBeEnabled()) {
			if (!isEnabled) {
				// This interferes with the variable highlighter rule (e.g. `<^>myVar<^>`)
				md.disable('math_inline', true);
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
