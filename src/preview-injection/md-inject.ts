/**
 * @file - This code will be injected into the VSCode Markdown preview, regardless of soft-disable status (not possible to avoid this currently with VSCode APIs)
 */

const PLUGIN_CSS_CLASS_NAME = `do-co-authoring-toolkit-wrapper`;

const injectedElem = document.querySelector(`.${PLUGIN_CSS_CLASS_NAME}`);

// If element was injected, that is our sign that the extension is *not* soft-disabled,
// and the CSS should be lazy injected
if (injectedElem) {
	const cssUri = injectedElem.getAttribute('data-css-uri');
	if (cssUri && !document.querySelector(`link[href="${cssUri}"]`)) {
		const linkElem = document.createElement('link');
		linkElem.rel = 'stylesheet';
		linkElem.type = 'text/css';
		linkElem.href = cssUri;
		linkElem.setAttribute('data-is-injected', 'true');
		document.head.appendChild(linkElem);
	}
}
