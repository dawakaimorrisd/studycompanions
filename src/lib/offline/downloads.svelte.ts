import { browser } from '$app/environment';
import { getDB, keyFor, type ContentKind, type DownloadRecord } from './db';
import { getNote, getAssignment } from '$lib/api/content';

interface DownloadMeta {
	title: string;
	courseName: string;
	courseCode: string;
}

class DownloadsStore {
	records = $state<DownloadRecord[]>([]);
	loaded = $state(false);
	private downloadingKeys = $state<Set<string>>(new Set());

	async ensureLoaded() {
		if (this.loaded || !browser) return;
		const db = await getDB();
		this.records = await db.getAll('downloads');
		this.loaded = true;
	}

	isDownloaded(kind: ContentKind, id: string): boolean {
		return this.records.some((r) => r.key === keyFor(kind, id));
	}

	isDownloading(kind: ContentKind, id: string): boolean {
		return this.downloadingKeys.has(keyFor(kind, id));
	}

	get(kind: ContentKind, id: string): DownloadRecord | undefined {
		return this.records.find((r) => r.key === keyFor(kind, id));
	}

	/** Throws on failure (e.g. offline with nothing cached yet) - callers surface that to the student. */
	async download(kind: ContentKind, id: string, meta: DownloadMeta) {
		if (!browser) return;
		const key = keyFor(kind, id);
		this.downloadingKeys = new Set(this.downloadingKeys).add(key);
		try {
			const content = kind === 'note' ? await getNote(id) : await getAssignment(id);
			const record: DownloadRecord = {
				key,
				kind,
				id,
				title: meta.title,
				courseName: meta.courseName,
				courseCode: meta.courseCode,
				downloadedAt: new Date().toISOString(),
				content
			};
			const db = await getDB();
			await db.put('downloads', record);
			this.records = [...this.records.filter((r) => r.key !== key), record];
		} finally {
			const next = new Set(this.downloadingKeys);
			next.delete(key);
			this.downloadingKeys = next;
		}
	}

	async remove(kind: ContentKind, id: string) {
		if (!browser) return;
		const key = keyFor(kind, id);
		const db = await getDB();
		await db.delete('downloads', key);
		this.records = this.records.filter((r) => r.key !== key);
	}
}

export const downloads = new DownloadsStore();
