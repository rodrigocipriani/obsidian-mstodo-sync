import { createTimeLine } from "./command/uptimerCommand";
import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { TodoApi, MicrosoftClientProvider } from "./api/todoApi";
import { UptimerApi } from "./api/uptimerApi";
import { Bot } from "mirai-js";

import {
	getSettings,
	updateSettings,
	getGeneralSettingString,
	getGeneralSettingNumber,
	addTaskId,
} from "./gui/Settings";
import { SettingsTab } from "./gui/SettingsTab";
import { log, logging } from "./lib/logging";
import { t } from "./lib/lang";

import { createTodayTasks, postTask } from "./command/msTodoCommand";
import { listenEvents } from "./bot/listenEvents";

export default class MsTodoSync extends Plugin {
	public todoApi: TodoApi;
	public uptimerApi: UptimerApi;
	public bot: Bot;

	async onload() {
		logging.registerConsoleLogger();

		log(
			"info",
			`loading plugin "${this.manifest.name}" v${this.manifest.version}`
		);

		await this.loadSettings();
		// 在右键菜单中注册命令：将选中的文字创建微软待办
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle(t("SyncToTodo")).onClick(async () => {
						var newTask = await postTask(
							this.todoApi,
							getGeneralSettingString("todoListSync_listId"),
							editor,
							this.app.workspace.getActiveFile()?.basename
						);
						if (newTask && newTask.id) {
							addTaskId(newTask.id);
							this.saveSettings();
						}
					});
				});
			})
		);
		// 在右键菜单中注册命令：将选中的文字创建微软待办并替换
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				menu.addItem((item) => {
					item.setTitle(t("SyncToTodoAndReplace")).onClick(
						async () =>
							await postTask(
								this.todoApi,
								getGeneralSettingString("todoListSync_listId"),
								editor,
								this.app.workspace.getActiveFile()?.basename,
								true
							)
					);
				});
			})
		);
		// 注册命令：将选中的文字创建微软待办
		this.addCommand({
			id: "only-create-task",
			name: t("SyncToTodo"),
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				var newTask = await postTask(
					this.todoApi,
					getGeneralSettingString("todoListSync_listId"),
					editor,
					this.app.workspace.getActiveFile()?.basename
				);
				if (newTask && newTask.id) {
					addTaskId(newTask.id);
					this.saveSettings();
				}
			},
		});
		this.addCommand({
			id: "create-task-replace",
			name: t("SyncToTodoAndReplace"),
			editorCallback: async (editor: Editor, view: MarkdownView) =>
				await postTask(
					this.todoApi,
					getGeneralSettingString("todoListSync_listId"),
					editor,
					this.app.workspace.getActiveFile()?.basename,
					true
				),
		});

		// 注册命令：将选中的文字创建微软待办并替换
		this.addCommand({
			id: "add-microsoft-todo",
			name: "获取微软待办 | Get Microsoft Todo",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// TODO 模板化日期
				await createTodayTasks(this.todoApi, editor, "YYYY-MM-DD");
			},
		});

		this.addCommand({
			id: "add-uptimer",
			name: "生成今日时间线 | Create today time line",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				if (!getGeneralSettingString("uptimer_token")) {
					new Notice("请先登录获取token");
					return;
				}
				const timeline = await createTimeLine(this.uptimerApi);
				if (!timeline) return;
				editor.replaceSelection(timeline);
				new Notice("今日时间线已生成");
			},
		});

		this.addCommand({
			id: "open-bot",
			name: "打开机器人 | Open bot",
			callback: async () => {
				if (
					getGeneralSettingString("bot_baseUrl") == "" ||
					getGeneralSettingString("bot_verifyKey") == "" ||
					getGeneralSettingNumber("bot_qq") == 0
				) {
					new Notice("请先配置机器人信息");
					return;
				}
				this.bot = new Bot();
				await this.bot
					.open({
						baseUrl: getGeneralSettingString("bot_baseUrl"),
						verifyKey: getGeneralSettingString("bot_verifyKey"),
						qq: getGeneralSettingNumber("bot_qq"),
					})
					.then(() => {
						new Notice("机器人已开启√");
						const item = this.addStatusBarItem();
						item.setText("机器人运行中");
						this.addCommand({
							id: "to-close-bot",
							name: "关闭机器人",
							callback: () => {
								if (this.bot != undefined) {
									this.bot?.close();
									new Notice("机器人已关闭");
									item.empty();
								}
							},
						});
					});
				this.bot.on(
					"FriendMessage",
					async (data) => await listenEvents(data, this.bot)
				);
			},
		});
		this.addSettingTab(new SettingsTab({ plugin: this }));
		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		if (getGeneralSettingString("uptimer_token") != "") {
			this.uptimerApi = new UptimerApi(
				getGeneralSettingString("uptimer_token")
			);
		}
		this.todoApi = new TodoApi(
			await new MicrosoftClientProvider().getClient()
		);

		// const a = this.app.vault.getAbstractFileByPath('0进行中/00Today/致谢.md')
		// if(a) await this.app.vault.read(a)
		// this.registerInterval(window.setTimeout(() => this.uptimerApi.getTodayActivities(),(window.moment("18:21", "HH:mm") as unknown as number) - (window.moment() as unknown as number)));
		// This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// });
		// Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// console.log(await this.todoApi.getListIdByName("obsidian"))
	}

	onunload() {
		log(
			"info",
			`unloading plugin "${this.manifest.name}" v${this.manifest.version}`
		);

		this.bot?.close();
	}

	async loadSettings() {
		const newSettings = await this.loadData();
		updateSettings(newSettings);
	}

	async saveSettings() {
		await this.saveData(getSettings());
	}
}
