import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	MarkdownView,
	debounce,
} from "obsidian";

interface EditCountSettings {
	charThreshold: number;
	timeoutSeconds: number;
}

const DEFAULT_SETTINGS: EditCountSettings = {
	charThreshold: 50,
	timeoutSeconds: 180,
};

interface SessionState {
	initialCharCount: number;
	evaluated: boolean;
}

export default class EditCountPlugin extends Plugin {
	settings: EditCountSettings = DEFAULT_SETTINGS;
	sessions: Map<string, SessionState> = new Map();
	timeoutId: ReturnType<typeof setTimeout> | null = null;
	currentFilePath: string | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new EditCountSettingTab(this.app, this));

		// Start tracking the currently active file
		this.app.workspace.onLayoutReady(() => {
			this.startTrackingActiveFile();
		});

		// When switching files: evaluate the previous file, start tracking the new one
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.evaluateCurrentSession();
				this.startTrackingActiveFile();
			})
		);

		// On any editor change: reset the inactivity timer
		this.registerEvent(
			this.app.workspace.on(
				"editor-change",
				this.debouncedResetTimer
			)
		);
	}

	onunload() {
		// Evaluate whatever is open when the plugin unloads
		this.evaluateCurrentSession();
		this.clearTimer();
		this.sessions.clear();
	}

	// --- Session lifecycle ---

	private startTrackingActiveFile() {
		const view =
			this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file) {
			this.currentFilePath = null;
			this.clearTimer();
			return;
		}

		const path = view.file.path;
		this.currentFilePath = path;

		// Only snapshot if we don't already have an unevaluated session
		if (!this.sessions.has(path)) {
			const charCount = view.editor.getValue().length;
			this.sessions.set(path, {
				initialCharCount: charCount,
				evaluated: false,
			});
		}

		this.resetTimer();
	}

	private evaluateCurrentSession() {
		if (!this.currentFilePath) return;

		const session = this.sessions.get(this.currentFilePath);
		if (!session || session.evaluated) return;

		const view =
			this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view?.file || view.file.path !== this.currentFilePath) {
			// File is no longer active — try to get content from cache
			const file = this.app.vault.getAbstractFileByPath(
				this.currentFilePath
			);
			if (file instanceof TFile) {
				this.evaluateFromCache(file, session);
			}
			return;
		}

		const currentCharCount = view.editor.getValue().length;
		const diff = Math.abs(currentCharCount - session.initialCharCount);

		session.evaluated = true;
		this.sessions.delete(this.currentFilePath);
		this.clearTimer();

		if (diff >= this.settings.charThreshold) {
			this.incrementEditCount(view.file);
		}
	}

	private async evaluateFromCache(file: TFile, session: SessionState) {
		const content = await this.app.vault.cachedRead(file);
		const currentCharCount = content.length;
		const diff = Math.abs(currentCharCount - session.initialCharCount);

		session.evaluated = true;
		this.sessions.delete(file.path);

		if (diff >= this.settings.charThreshold) {
			this.incrementEditCount(file);
		}
	}

	// --- Timer management ---

	private resetTimer() {
		this.clearTimer();
		this.timeoutId = setTimeout(() => {
			this.evaluateCurrentSession();
			// After evaluation, start a fresh session for the same file
			this.startTrackingActiveFile();
		}, this.settings.timeoutSeconds * 1000);
	}

	private debouncedResetTimer = debounce(() => {
		this.resetTimer();
	}, 1000);

	private clearTimer() {
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	// --- Frontmatter update ---

	private incrementEditCount(file: TFile) {
		this.app.fileManager.processFrontMatter(file, (fm) => {
			const current =
				typeof fm.edit_count === "number" ? fm.edit_count : 0;
			fm.edit_count = current + 1;
		});
	}

	// --- Settings ---

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class EditCountSettingTab extends PluginSettingTab {
	plugin: EditCountPlugin;

	constructor(app: App, plugin: EditCountPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Character threshold")
			.setDesc(
				"Minimum character count difference to count as a meaningful edit (default: 50)"
			)
			.addText((text) =>
				text
					.setPlaceholder("50")
					.setValue(String(this.plugin.settings.charThreshold))
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.charThreshold = num;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl)
			.setName("Inactivity timeout (seconds)")
			.setDesc(
				"Time without edits before the session is evaluated (default: 180)"
			)
			.addText((text) =>
				text
					.setPlaceholder("180")
					.setValue(
						String(this.plugin.settings.timeoutSeconds)
					)
					.onChange(async (value) => {
						const num = parseInt(value, 10);
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.timeoutSeconds = num;
							await this.plugin.saveSettings();
						}
					})
			);
	}
}
