import MsTodoSync from "../main";
import { Notice, PluginSettingTab, Setting } from "obsidian";
import { getUptimerToken } from "../api/uptimerApi";

export interface MsTodoSyncSettings {
	todoListSync: {
		listName: string | undefined;
		listId: string | undefined;
		taskIdLookup: { [key: number]: string };
	};
	uptimer: {
		email: string | undefined;
		password: string | undefined;
		token: string | undefined;
	};
	bot:
		| {
				baseUrl: string;
				verifyKey: string;
				qq: number;
		  }
		| undefined;
	diary: {
		folder: string;
		format: string;
		stayWithPN: boolean;
	};
}

export const DEFAULT_SETTINGS: MsTodoSyncSettings = {
	todoListSync: {
		listName: undefined,
		listId: undefined,
		taskIdLookup: { [0]: "0" },
	},
	uptimer: {
		email: undefined,
		password: undefined,
		token: undefined,
	},
	bot: undefined,
	diary: {
		folder: "",
		format: "",
		stayWithPN: false,
	},
};

export class MsTodoSyncSettingTab extends PluginSettingTab {
	plugin: MsTodoSync;
	constructor(plugin: MsTodoSync) {
		super(app, plugin);
		this.plugin = plugin;
		this.plugin.settings.todoListSync.taskIdLookup = { [0]: "0" };
		this.plugin.saveSettings();
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Microsoft Todo设置 | Microsoft Todo Settings",
		});

		new Setting(containerEl)
			.setName(
				"默认的同步微软Todo列表名称 | The default synchronization Microsoft Todo list name"
			)
			.setDesc(
				"如不存在则以该名称创建列表 | If it does not exist, the list is created with that name"
			)
			.addText((text) =>
				text
					// .setPlaceholder('输入Todo列表名称')
					.setValue(this.plugin.settings.todoListSync.listName ?? "")
					.onChange(async (value) => {
						this.plugin.settings.todoListSync.listName = value;
					})
			);

		containerEl.createEl("h2", { text: "Uptimer设置 | Uptimer设置" });

		new Setting(containerEl)
			.setName("uptimer注册邮箱 | uptimer registration email")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.uptimer.email ?? "")
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.uptimer.email = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("uptimer密码 | uptimer password")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.uptimer.password ?? "")
					.onChange(async (value) => {
						this.plugin.settings.uptimer.password = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl("h2", {
			text: "日记格式设置 | Journal formatting",
		});
		new Setting(containerEl)
			.setName(
				"与 Periodic Notes 插件保持一致 | Consistent with the Periodic Notes plugin"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.diary.stayWithPN)
					.onChange(async (value) => {
						if (value) {
							// @ts-ignore
							const PNsetting =
								app.plugins.plugins["periodic-notes"];
							if (PNsetting) {
								const { format, folder } =
									PNsetting.settings.daily;
								this.plugin.settings.diary = {
									format,
									folder,
									stayWithPN: true,
								};
								console.log(
									"🚀 ~ this.plugin.settings.diary",
									this.plugin.settings.diary
								);
								await this.plugin.saveSettings();
								this.display();
							} else {
								new Notice(
									"Periodic Notes 中未设置 | Not set in Periodic Notes"
								);
								this.display();
							}
						} else {
							this.plugin.settings.diary.stayWithPN = false;
							await this.plugin.saveSettings();
							this.display();
						}
					})
			);

		const dateFormat = new Setting(containerEl)
			.setName("日期格式 | Date format")
			.setDesc(
				`当前格式为 | The current format is ${
					!this.plugin.settings.diary.format
						? ""
						: window
								.moment()
								.format(this.plugin.settings.diary.format)
				} |`
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.diary.format)
					.onChange(async (value) => {
						this.plugin.settings.diary.format = value;
						dateFormat.setDesc(
							`当前格式为 | The current format is ${
								!this.plugin.settings.diary.format
									? ""
									: window
											.moment()
											.format(
												this.plugin.settings.diary
													.format
											)
							}`
						);
						await this.plugin.saveSettings();
					})
			)
			.setDisabled(this.plugin.settings.diary.stayWithPN);

		new Setting(containerEl)
			.setName("文件夹 | Folder")
			.setDesc("日记存放的文件夹 | Folder where the diary is stored")
			.addText((text) =>
				text
					.setValue(this.plugin.settings.diary.folder)
					.onChange(async (value) => {
						this.plugin.settings.diary.format = value;
						await this.plugin.saveSettings();
					})
			)
			.setDisabled(this.plugin.settings.diary.stayWithPN);
	}
	async hide() {
		const listName = this.plugin.settings.todoListSync.listName;
		const email = this.plugin.settings.uptimer.email;
		const password = this.plugin.settings.uptimer.password;

		if (
			this.plugin.settings.todoListSync.listId != undefined ||
			!listName
		) {
			if (!listName)
				new Notice("微软同步列表未设置 | Microsoft sync list not set");
		} else {
			let listId = await this.plugin.todoApi.getListIdByName(listName);
			if (!listId) {
				listId = (await this.plugin.todoApi.createTaskList(listName))
					?.id;
			}
			if (!listId) {
				new Notice("创建列表失败 | Failed to create list");
				return;
			} else {
				this.plugin.settings.todoListSync = {
					listName,
					listId,
				};
				new Notice(
					"设置同步列表成功√ | Set the synchronization list successfully √"
				);
				await this.plugin.saveSettings();
			}
		}

		if (!this.plugin.settings.uptimer.token) {
			if (!email || !password)
				new Notice("uptimer未设置 | uptimer not set");
			else {
				const token = await getUptimerToken(email, password);
				if (!token) {
					new Notice("邮箱或密码错误 | Email or password error");
				}
				this.plugin.settings.uptimer.token = token;
				new Notice("uptimer已配置完成√ | uptimer is configured √");
				await this.plugin.saveSettings();
			}
		}
	}
}
