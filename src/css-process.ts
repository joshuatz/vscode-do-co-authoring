import fs from 'fs';
import https from 'https';
import fetch from 'node-fetch';
import { env } from 'process';
import { normalize } from 'path';

const PROD_PAGE = 'https://www.digitalocean.com/community';
const PROD_CSS_URL_PATT = /<link .+?href="([^"]*?\/assets\/community\/application-[^"]+\.css)"/i;

const EXT_ROOT = `${__dirname}/..`;

const VSCODE_PATCH_CSS_FILEPATH = normalize(`${EXT_ROOT}/vscode-overrides.css`);
const RAW_CSS_FILEPATH = normalize(`${EXT_ROOT}/do-raw.css`);
const TRANSFORMED_CSS_FILEPATH = normalize(`${EXT_ROOT}/do-md.css`);

export function prefixCssLines(cssString: string, prefix: string) {
	// Try to extract selector away from declaration
	return cssString.replace(/([^{}]+?)({[^{}]+?})/gm, (sub, selector, declaration) => {
		return `${prefix} ${selector}${declaration}`;
	});
}

export async function generateCss(regenerate = false) {
	let PROD_CSS_URL = env.PROD_CSS_URL;
	// DO production CSS file should be locally cached
	// if not already downloaded, get fresh copy
	if (!fs.existsSync(RAW_CSS_FILEPATH) || regenerate) {
		if (!PROD_CSS_URL) {
			const PROD_HTML = await (await fetch(PROD_PAGE)).text();

			if (!PROD_CSS_URL_PATT.test(PROD_HTML)) {
				throw new Error(`Could not find CSS URL on ${PROD_PAGE}`);
			}

			PROD_CSS_URL = PROD_CSS_URL_PATT.exec(PROD_HTML)![1];
			if (PROD_CSS_URL.startsWith('/')) {
				PROD_CSS_URL = 'https://www.digitalocean.com' + PROD_CSS_URL;
			}
		}

		await new Promise((resolve) => {
			const rawFile = fs.createWriteStream(RAW_CSS_FILEPATH);
			rawFile.on('finish', () => {
				rawFile.end(resolve);
			});
			https.get(PROD_CSS_URL!, (httpRes) => {
				httpRes.pipe(rawFile);
			});
		});
	} else {
		console.log(`Skipping CSS download from DO - using cached copy`);
	}

	// Transform CSS
	const findAndReplaceArr: Array<[string | RegExp, string]> = [
		[/\.tutorial-single/gi, 'html'],
		[/\.section-content/gi, 'body'],
		[/\.content-body/gi, 'body'],
	];

	const rawCss = fs
		.readFileSync(RAW_CSS_FILEPATH, {
			encoding: 'utf8',
		})
		.toString();
	let fixedCss = rawCss;
	findAndReplaceArr.forEach((replaceTuple) => {
		fixedCss = fixedCss.replace(replaceTuple[0], replaceTuple[1]);
	});

	// Combine patched DO css with VSCode overrides / fixes
	const vscodePatchedCss = fs
		.readFileSync(VSCODE_PATCH_CSS_FILEPATH, {
			encoding: 'utf8',
		})
		.toString();
	fixedCss = '\n\n/* VSCode CSS Patches below: */\n\n' + vscodePatchedCss + '\n\n/* DO CSS */\n\n' + fixedCss;

	// This is hackish, but is the only way (AFAIK) to override the high-specificity rules injected by markdown.css, without using manual !important resets or something like that
	// @see https://github.com/microsoft/vscode/blob/HEAD/extensions/markdown-language-features/media/markdown.css
	fixedCss = prefixCssLines(fixedCss, 'html[style*="--markdown-font-family"]');

	fs.writeFileSync(TRANSFORMED_CSS_FILEPATH, fixedCss, {
		encoding: 'utf8',
	});

	return TRANSFORMED_CSS_FILEPATH;
}
