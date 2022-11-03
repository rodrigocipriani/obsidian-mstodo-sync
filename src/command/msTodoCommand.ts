import { TodoTask } from "@microsoft/microsoft-graph-types";
import { Editor, Notice } from "obsidian";
import { Z_VERSION_ERROR } from "zlib";
import { TodoApi } from "../api/todoApi";

export async function postTask(
	todoApi: TodoApi,
	listId: string | undefined,
	editor: Editor,
	fileName: string | undefined,
	replace?: boolean
): Promise<TodoTask | undefined> {
	if (!editor.somethingSelected()) {
		new Notice("好像没有选中什么 | Nothing selected");
		return;
	}
	if (!listId) {
		new Notice("请先设置同步列表 | Please set the list to sync");
		return;
	}
	new Notice("创建待办中... | Create a to-do...", 3000);
	const body = `来自笔记 | From the notes[[${fileName}]]`;
	const formated = editor
		.getSelection()
		.replace(/(- \[ \] )|\*|^> |^#* |- /gm, "")
		.split("\n")
		.filter((s) => s != "");
	Promise.all(
		formated.map(async (s) => {
			const line = s.trim();
			var createdTask = await todoApi.createTask(listId, line, body);
			return [line, createdTask];
		})
	).then((res) => {
		new Notice("创建待办成功√ | Create a to-do success √");
		if (replace) {
			// TODO 格式
			editor.replaceSelection(
				res
					.map(
						(i) =>
							`- [ ] ${i[0]} 创建于${window
								.moment()
								.format("HH:mm")}`
					)
					.join("\n")
			);
		}
		console.log(res[0]);
		console.log(res[0][0]);

		console.log(res[0][1]);
		console.log(res[1]);

		return res[0][1];
	});
}

export async function createTodayTasks(
	todoApi: TodoApi,
	editor: Editor,
	dateFormat: string
) {
	new Notice("获取微软待办中 | Get to do it from Microsoft", 3000);
	const now = window.moment();
	const pattern = `status ne 'completed' or completedDateTime/dateTime ge '${now.format(
		"yyyy-MM-DD"
	)}'`;
	const taskLists = await todoApi.getLists(pattern);
	if (!taskLists || taskLists.length == 0) {
		new Notice("任务列表为空 | Task list is empty");
		return;
	}
	const segments = taskLists.map((taskList) => {
		if (!taskList.tasks || taskList.tasks.length == 0) return;
		taskList.tasks.sort((a, b) => (a.status == "completed" ? 1 : -1));
		const lines = taskList.tasks?.map((task) => {
			const createDate = window
				.moment(task.createdDateTime)
				.format(dateFormat);
			const done = task.status == "completed" ? "x" : " ";
			const date =
				createDate == now.format(dateFormat)
					? ""
					: `🔎[[${createDate}]]`;
			const body = !task.body?.content ? "" : "💡" + task.body.content;

			return `- [${done}] ${task.title}  ${date}  ${body}`;
		});
		return `#### ${taskList.displayName}
${lines?.join("\n")}
`;
	});
	editor.replaceSelection(
		segments.filter((s) => s != undefined).join("\n\n")
	);
	new Notice("待办列表已获取 | Task list has been obtained");
}
