export const PLUGIN_NAME = 'do-co-authoring-toolkit';
export const PLUGIN_CONFIG_KEY = 'jtz-do-co-authoring-toolkit';

export const COMMANDS = ['rebuildCss', 'removeDraftArtifacts'] as const;

export type Command = typeof COMMANDS[number];

export function getCommandString(command: Command) {
	return `${PLUGIN_NAME}.${command}`;
}
