#!/usr/bin/env node
// @ts-check
import { generateCss } from '../src/css-process';

let REGENERATE = false;

if (Array.isArray(process.argv)) {
	const args = process.argv.slice(2);
	if (args.includes('--regenerate')) {
		REGENERATE = true;
	}
}

generateCss(REGENERATE).then((res) => {
	console.log(res);
});