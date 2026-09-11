import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AssignmentContent, NoteContent } from '$lib/types';

export type ContentKind = 'note' | 'assignment';

export interface DownloadRecord {
	key: string; // `${kind}:${id}` - matches how notes/assignments are keyed everywhere else here
	kind: ContentKind;
	id: string;
	title: string;
	courseName: string;
	courseCode: string;
	downloadedAt: string;
	content: NoteContent | AssignmentContent;
}

export interface PendingStudySession {
	id?: number; // autoincrement
	kind: ContentKind;
	contentId: string;
	durationSeconds: number;
	queuedAt: string;
}

export interface PendingOpen {
	id?: number; // autoincrement
	kind: ContentKind;
	contentId: string;
	queuedAt: string;
}

/**
 * Aggressive client-side PDF caching (backend handoff §2.1's frontend
 * counterpart): the raw bytes, not just the URL, keyed by `pdfUrl` itself
 * so any two references to the same file (the assignment's own read view,
 * the student's own submission view, a received distribution) share one
 * cached copy. See pdf-cache.ts.
 */
export interface CachedPdf {
	url: string; // keyPath
	blob: Blob;
	cachedAt: string;
	sizeBytes: number;
}

interface StudyCompanionDB extends DBSchema {
	downloads: { key: string; value: DownloadRecord };
	'pending-study-sessions': { key: number; value: PendingStudySession };
	'pending-opens': { key: number; value: PendingOpen };
	'pdf-cache': { key: string; value: CachedPdf };
}

let dbPromise: Promise<IDBPDatabase<StudyCompanionDB>> | null = null;

export function getDB() {
	if (!dbPromise) {
		dbPromise = openDB<StudyCompanionDB>('study-companion', 2, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					db.createObjectStore('downloads', { keyPath: 'key' });
					db.createObjectStore('pending-study-sessions', { keyPath: 'id', autoIncrement: true });
					db.createObjectStore('pending-opens', { keyPath: 'id', autoIncrement: true });
				}
				if (oldVersion < 2) {
					db.createObjectStore('pdf-cache', { keyPath: 'url' });
				}
			}
		});
	}
	return dbPromise;
}

export function keyFor(kind: ContentKind, id: string): string {
	return `${kind}:${id}`;
}

// ---- Offline activity-tracking queue ----
// Reuses the `pending-study-sessions` store from schema v1 (unused since
// the Start/End rebuild) for the NEW activity-based tracker's offline
// fallback: `durationSeconds` here is a client-accumulated *active* time
// for one contiguous offline study interval, not a duration the old
// single-shot endpoint ever saw. See src/lib/activity-tracking.svelte.ts
// and the backend handoff doc's "Activity-based study tracking" section -
// flushing this queue needs a NEW backend endpoint that doesn't exist yet.

export async function queuePendingStudySession(entry: Omit<PendingStudySession, 'id'>) {
	const db = await getDB();
	await db.add('pending-study-sessions', entry);
}

export async function getAllPendingStudySessions() {
	const db = await getDB();
	return db.getAll('pending-study-sessions');
}

export async function deletePendingStudySession(id: number) {
	const db = await getDB();
	await db.delete('pending-study-sessions', id);
}
