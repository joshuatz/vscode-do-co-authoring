export const PLUGIN_NAME = 'do-co-authoring-toolkit';
export const PLUGIN_CONFIG_KEY = 'jtz-do-co-authoring-toolkit';
export const PLUGIN_CSS_CLASS_NAME = `${PLUGIN_NAME}-wrapper`;
export const STORE_KEYS = {
	enabled: 'is_enabled',
	lastMdFile: 'last_md_file',
};

export const COMMANDS = ['rebuildCss', 'removeDraftArtifacts'] as const;

export type Command = typeof COMMANDS[number];

export function getCommandString(command: Command) {
	return `${PLUGIN_NAME}.${command}`;
}
