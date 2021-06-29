export const PLUGIN_NAME = 'do-authoring-toolkit';

export const COMMANDS = [
	'rebuildCss'
] as const;

export type Command = typeof COMMANDS[number];

export function getCommandString(command: Command) {
	return `${PLUGIN_NAME}.${command}`;
}