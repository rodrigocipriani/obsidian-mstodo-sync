import {
	AttachmentBase,
	AttachmentSession,
	ChecklistItem,
	DateTimeTimeZone,
	Extension,
	Importance,
	ItemBody,
	LinkedResource,
	NullableOption,
	PatternedRecurrence,
	TaskStatus,
	TodoTask,
} from '@microsoft/microsoft-graph-types';
import { MsTodoSyncSettings } from 'src/gui/msTodoSyncSettingTab';
import MsTodoSync from './../main';
import { t } from './../lib/lang';
import { log } from './../lib/logging';

export class ObsidianTodoTask implements TodoTask {
	id?: string;

	// The task body that typically contains information about the task.
	public body?: NullableOption<ItemBody>;
	/**
	 * The date and time when the task body was last modified. By default, it is in UTC. You can provide a custom time zone in
	 * the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan
	 * 1, 2020 would look like this: '2020-01-01T00:00:00Z'.
	 */
	public bodyLastModifiedDateTime?: string;
	/**
	 * The categories associated with the task. Each category corresponds to the displayName property of an outlookCategory
	 * that the user has defined.
	 */
	public categories?: NullableOption<string[]>;
	// The date and time in the specified time zone that the task was finished.
	public completedDateTime?: NullableOption<DateTimeTimeZone>;
	/**
	 * The date and time when the task was created. By default, it is in UTC. You can provide a custom time zone in the
	 * request header. The property value uses ISO 8601 format. For example, midnight UTC on Jan 1, 2020 would look like this:
	 * '2020-01-01T00:00:00Z'.
	 */
	public createdDateTime?: string;
	// The date and time in the specified time zone that the task is to be finished.
	public dueDateTime?: NullableOption<DateTimeTimeZone>;
	public hasAttachments?: NullableOption<boolean>;
	// The importance of the task. Possible values are: low, normal, high.
	public importance?: Importance;
	// Set to true if an alert is set to remind the user of the task.
	public isReminderOn?: boolean;
	/**
	 * The date and time when the task was last modified. By default, it is in UTC. You can provide a custom time zone in the
	 * request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1,
	 * 2020 would look like this: '2020-01-01T00:00:00Z'.
	 */
	public lastModifiedDateTime?: string;
	// The recurrence pattern for the task.
	public recurrence?: NullableOption<PatternedRecurrence>;
	// The date and time in the specified time zone for a reminder alert of the task to occur.
	public reminderDateTime?: NullableOption<DateTimeTimeZone>;
	public startDateTime?: NullableOption<DateTimeTimeZone>;
	/**
	 * Indicates the state or progress of the task. Possible values are: notStarted, inProgress, completed, waitingOnOthers,
	 * deferred.
	 */
	public status?: TaskStatus;
	// A brief description of the task.
	public title?: NullableOption<string>;
	public attachments?: NullableOption<AttachmentBase[]>;
	public attachmentSessions?: NullableOption<AttachmentSession[]>;
	// A collection of checklistItems linked to a task.
	public checklistItems?: NullableOption<ChecklistItem[]>;
	// The collection of open extensions defined for the task. Nullable.
	public extensions?: NullableOption<Extension[]>;
	// A collection of resources linked to the task.
	public linkedResources?: NullableOption<LinkedResource[]>;

	public blockLink?: string;
	public fileName?: string;
	private plugin: MsTodoSync;
	private settings: MsTodoSyncSettings;

	/**
	 *
	 */
	constructor(plugin: MsTodoSync, line: string, fileName: string) {
		this.plugin = plugin;
		this.settings = plugin.settings;
		this.fileName = fileName;

		this.title = line.trim();

		this.checkForBlockLink(line);

		this.checkForImportance(line);

		this.body = {
			content: `${t('displayOptions_CreatedInFile')} [[${this.fileName}]]`,
			contentType: 'text',
		};
	}

	private checkForImportance(line: string) {
		this.importance = 'normal';

		if (line.includes(this.settings.displayOptions_TaskImportance_Low)) {
			this.importance = 'low';
		}

		if (line.includes(this.settings.displayOptions_TaskImportance_High)) {
			this.importance = 'high';
		}
	}

	private checkForBlockLink(line: string) {
		const blocklinkRegex = /\^(?!.*\^)([A-Za-z0-9]+)/gm;
		const blocklinkMatch = blocklinkRegex.exec(line);
		if (blocklinkMatch) {
			this.blockLink = blocklinkMatch[1];

			//FIXME If there's a 'Created at xxxx' replaced line,
			// it's not enough to get a cleanTaskTitle after the next line.
			this.title = line.replace(`^${this.blockLink}`, '');
		}

		if (this.hasBlockLink && this.blockLink) {
			this.id = this.settings.taskIdLookup[this.blockLink];
		}
	}

	public get cleanTitle(): string {
		return '';
	}

	public get hasBlockLink(): boolean {
		return this.blockLink !== undefined && this.blockLink.length > 0;
	}

	/**
	 * Cache the ID internally and generate blocklink.
	 *
	 * @param {string} [id]
	 * @return {*}  {Promise<void>}
	 * @memberof ObsidianTodoTask
	 */
	public async cacheTaskId(id?: string): Promise<void> {
		this.settings.taskIdIndex = this.settings.taskIdIndex + 1;
		const index = `${Math.random().toString(20).substring(2, 6)}${this.settings.taskIdIndex
			.toString()
			.padStart(5, '0')}`;
		this.settings.taskIdLookup[index] = id ?? '';
		await this.plugin.saveSettings();
		this.blockLink = index;
	}

	/**
	 * Takes a set of primitive values and returns a TodoTask object. This
	 * is used in the create and update paths.
	 *
	 * @param {string} title
	 * @param {string} [body]
	 * @param {string} [importance]
	 * @return {*}
	 * @memberof TodoApi
	 */
	getToDoTask(title: string, body?: string, importance?: string) {
		const toDo: TodoTask = {
			title: title,
		};

		if (body && body.length > 0) {
			toDo.body = {
				content: body,
				contentType: 'text',
			};
		}

		if (importance && importance.length > 0) {
			toDo.importance = importance as Importance;
		}
		return toDo;
	}
}
