import { LogOptions, log } from "./../lib/logging";
import { Feature, FeatureFlag } from "./Feature";

interface SettingsMap {
	[key: string]: string | number | boolean;
}

type HeadingState = {
	[id: string]: boolean;
};

export interface Settings {
	// Collection of feature flag IDs and their state.
	features: FeatureFlag;

	// Settings are moved to a more general map to allow the settings UI to be
	// dynamically generated.
	generalSettings: SettingsMap;

	// Tracks the stage of the headings in the settings UI.
	headingOpened: HeadingState;

	// Logging options.
	loggingOptions: LogOptions;

	// Private configuration updated by the plugin and not user.
	taskIdLookup: { [key: number]: string };
}

const defaultSettings: Settings = {
	features: Feature.settingsFlags,
	generalSettings: {
		todoListSync_listName: "",
		todoListSync_listId: "",

		uptimer_email: "",
		uptimer_password: "",
		uptimer_token: "",

		bot_baseUrl: "",
		bot_verifyKey: "",
		bot_qq: 0,

		diary_folder: "",
		diary_format: "",
		diary_stayWithPN: false,
	},
	headingOpened: {}, //;  { 'Documentation and Support': true },
	loggingOptions: {
		minLevels: {
			"": "info",
		},
	},
	taskIdLookup: { [0]: "0" },
};

let settings: Settings = { ...defaultSettings };

export const getSettings = (): Settings => {
	// Check to see if there is a new flag and if so add it to the users settings.
	for (const flag in Feature.settingsFlags) {
		if (settings.features[flag] === undefined) {
			settings.features[flag] = Feature.settingsFlags[flag];
		}
	}

	return { ...settings };
};

export const updateSettings = (newSettings: Partial<Settings>): Settings => {
	log("debug", `updateSettings ${JSON.stringify(newSettings)}`);

	settings = { ...settings, ...newSettings };

	return getSettings();
};

export const updateGeneralSetting = (
	name: string,
	value: string | number | boolean
): Settings => {
	settings.generalSettings[name] = value;

	return getSettings();
};

export const getGeneralSetting = (name: string): string | number | boolean => {
	return settings.generalSettings[name];
};

export const getGeneralSettingString = (name: string): string => {
	return settings.generalSettings[name] as string;
};

export const getGeneralSettingNumber = (name: string): number => {
	return settings.generalSettings[name] as number;
};

export const getGeneralSettingBoolean = (name: string): boolean => {
	return settings.generalSettings[name] as boolean;
};

export const isFeatureEnabled = (internalName: string): boolean => {
	return settings.features[internalName] ?? false;
};

export const toggleFeature = (
	internalName: string,
	enabled: boolean
): FeatureFlag => {
	settings.features[internalName] = enabled;
	return settings.features;
};

// Plugin non generic settings
export const addTaskId = (id: string) => {
	// Get next ID.
	let max = Math.max(...Object.keys(settings.taskIdLookup).map(Number));
	settings.taskIdLookup[max + 1] = id === undefined ? "" : id;
};
