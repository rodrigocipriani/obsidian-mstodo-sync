import { Notice, PluginSettingTab, Setting, debounce } from "obsidian";
import MsTodoSync from "../main";
import { log } from "./../lib/logging";
import { Feature } from "./Feature";
import { t } from "./../lib/lang";

import {
	getSettings,
	isFeatureEnabled,
	toggleFeature,
	updateGeneralSetting,
	updateSettings,
} from "./Settings";
import settingsJson from "./settingsConfiguration.json";

export class SettingsTab extends PluginSettingTab {
	// If the UI needs a more complex setting you can create a
	// custom function and specify it from the json file. It will
	// then be rendered instead of a normal checkbox or text box.
	customFunctions: { [K: string]: Function } = {
		insertFeatureFlags: this.insertFeatureFlags,
	};

	private readonly plugin: MsTodoSync;
	private readonly cssClassPrefix: string = "mstodo-sync";

	constructor({ plugin }: { plugin: MsTodoSync }) {
		super(plugin.app, plugin);

		this.plugin = plugin;
	}

	public async saveSettings(update?: boolean): Promise<void> {
		log("debug", `Saving settings with update: ${update}`);

		await this.plugin.saveSettings();

		if (update) {
			this.display();
		}
	}

	public display(): void {
		const { containerEl } = this;
		const { headingOpened } = getSettings();

		this.containerEl.empty();
		this.containerEl.addClass(`${this.cssClassPrefix}-settings`);
		settingsJson.forEach((heading) => {
			const detailsContainer = containerEl.createEl("details", {
				cls: `${this.cssClassPrefix}-nested-settings`,
				attr: {
					...(heading.open || headingOpened[heading.text]
						? { open: true }
						: {}),
				},
			});
			detailsContainer.empty();
			detailsContainer.ontoggle = () => {
				headingOpened[heading.text] = detailsContainer.open;
				updateSettings({ headingOpened: headingOpened });
				this.plugin.saveSettings();
			};
			const summary = detailsContainer.createEl("summary");
			new Setting(summary).setHeading().setName(t(heading.text));
			summary.createDiv("collapser").createDiv("handle");

			if (heading.notice !== undefined && heading["notice"] !== null) {
				console.log(heading);
				console.log(heading.notice);

				const notice = detailsContainer.createEl("div", {
					cls: this.cssClassPrefix + "-" + heading.notice.class,
					text: t(heading.notice.text),
				});
				if (heading.notice.html !== null) {
					notice.insertAdjacentHTML(
						"beforeend",
						t(heading.notice.html)
					);
				}
			}

			// This will process all the settings from settingsConfiguration.json and render
			// them out reducing the duplication of the code in this file. This will become
			// more important as features are being added over time.
			heading.settings.forEach((setting) => {
				if (
					setting.featureFlag !== "" &&
					!isFeatureEnabled(setting.featureFlag)
				) {
					// The settings configuration has a featureFlag set and the user has not
					// enabled it. Skip adding the settings option.
					return;
				}
				if (setting.type === "checkbox") {
					new Setting(detailsContainer)
						.setName(t(setting.name))
						.setDesc(t(setting.description))
						.addToggle((toggle) => {
							const settings = getSettings();
							if (
								!settings.generalSettings[setting.settingName]
							) {
								updateGeneralSetting(
									setting.settingName,
									setting.initialValue
								);
							}
							toggle
								.setValue(
									<boolean>(
										settings.generalSettings[
											setting.settingName
										]
									)
								)
								.onChange(async (value) => {
									updateGeneralSetting(
										setting.settingName,
										value
									);
									await this.plugin.saveSettings();
								});
						});
				} else if (setting.type === "text") {
					new Setting(detailsContainer)
						.setName(t(setting.name))
						.setDesc(t(setting.description))
						.addText((text) => {
							const settings = getSettings();
							if (
								!settings.generalSettings[setting.settingName]
							) {
								updateGeneralSetting(
									setting.settingName,
									setting.initialValue
								);
							}

							const onChange = async (value: string) => {
								updateGeneralSetting(
									setting.settingName,
									value
								);
								await this.plugin.saveSettings();
							};

							text.setPlaceholder(setting.placeholder.toString())
								.setValue(
									settings.generalSettings[
										setting.settingName
									].toString()
								)
								.onChange(debounce(onChange, 500, true));
						});
				} else if (setting.type === "textarea") {
					new Setting(detailsContainer)
						.setName(t(setting.name))
						.setDesc(t(setting.description))
						.addTextArea((text) => {
							const settings = getSettings();
							if (
								!settings.generalSettings[setting.settingName]
							) {
								updateGeneralSetting(
									setting.settingName,
									setting.initialValue
								);
							}

							const onChange = async (value: string) => {
								updateGeneralSetting(
									setting.settingName,
									value
								);
								await this.plugin.saveSettings();
							};

							text.setPlaceholder(setting.placeholder.toString())
								.setValue(
									settings.generalSettings[
										setting.settingName
									].toString()
								)
								.onChange(debounce(onChange, 500, true));

							text.inputEl.rows = 8;
							text.inputEl.cols = 40;
						});
				} else if (setting.type === "function") {
					this.customFunctions[setting.settingName](
						detailsContainer,
						this
					);
				}

				if (
					setting["notice"] !== undefined &&
					setting["notice"] !== null
				) {
					const notice = detailsContainer.createEl("p", {
						cls:
							this.cssClassPrefix + "-" + setting.notice["class"],
						text: t(setting.notice["text"]),
					});
					if (
						setting.notice["html"] !== undefined &&
						setting.notice["html"] !== null
					) {
						notice.insertAdjacentHTML(
							"beforeend",
							t(setting.notice["html"])
						);
					}
				}
			});
		});
	}

	/**
	 * This renders the Features section of the settings tab. As it is more
	 * complex it has a function specified from the json file.
	 *
	 * @param {HTMLElement} containerEl
	 * @param {SettingsTab} settings
	 * @memberof SettingsTab
	 */
	insertFeatureFlags(containerEl: HTMLElement, settings: SettingsTab) {
		Feature.values.forEach((feature) => {
			new Setting(containerEl)
				.setName(feature.displayName)
				.setDesc(feature.description + " Is Stable? " + feature.stable)
				.addToggle((toggle) => {
					toggle
						.setValue(isFeatureEnabled(feature.internalName))
						.onChange(async (value) => {
							const updatedFeatures = toggleFeature(
								feature.internalName,
								value
							);
							updateSettings({ features: updatedFeatures });

							await settings.saveSettings(true);
						});
				});
		});
	}
}
