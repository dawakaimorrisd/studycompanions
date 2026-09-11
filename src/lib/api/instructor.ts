
import { api } from './client';
import type {
	CourseAnalytics,
	InstructorAssignmentSummary,
	InstructorAssignmentsResponse,
	InstructorNoteResults,
	InstructorNoteSummary,
	MyAnalyticsResponse,
	MyCoursesResponse,
	StudentSummary
} from '$lib/types';

/** Phase 10 §2 - now semester-scoped; response carries `semester` alongside `courses`. */
export function getMyCourses() {
	return api.get<MyCoursesResponse>('/api/v1/instructors/me/courses');
}

export function getMyStudents() {
	return api.get<{ students: StudentSummary[] }>('/api/v1/instructors/me/students');
}

export function getCourseContent(courseId: string) {
	return api.get<{ notes: InstructorNoteSummary[] }>(
		`/api/v1/instructors/courses/${courseId}/content`
	);
}

export interface UploadNoteParams {
	courseId: string;
	title?: string;
	/** Upload-time chapter label, e.g. "Chapter 3" (Phase 9) - optional, purely a label. */
	chapterLabel?: string;
	/** Exactly one of pastedText/file - never both, never neither (backend returns bad_request otherwise). */
	pastedText?: string;
	file?: File;
}

export function uploadNote(params: UploadNoteParams) {
	const formData = new FormData();
	formData.set('courseId', params.courseId);
	if (params.title) formData.set('title', params.title);
	if (params.chapterLabel) formData.set('chapterLabel', params.chapterLabel);
	if (params.pastedText !== undefined) {
		formData.set('pastedText', params.pastedText);
	} else if (params.file) {
		formData.set('file', params.file);
	}
	return api.post<{ id: string }>('/api/v1/instructors/notes', formData);
}

// ---- Notes: self-serve generate/publish (Phase 12) ----
// Instructor now owns the whole flow end to end: upload -> generate ->
// review -> publish. No recipient picker anywhere - publish makes it
// visible to every paid+enrolled student in the course/semester
// automatically. There's no unpublish exposed to Instructor via API.

/** 400 with the generation error message on failure - surface `err.message` as-is, it's the actual generation failure reason, not a generic one. */
export function generateNote(noteId: string) {
	return api.post<{ generated: true; generatedAt: string }>(
		`/api/v1/instructors/notes/${noteId}/generate`
	);
}

/** 400 if not generated yet. */
export function publishNote(noteId: string) {
	return api.post<{ published: true }>(`/api/v1/instructors/notes/${noteId}/publish`);
}

// ---- Chapter test controls (Phase 9) - the one narrow exception to
// Instructor's otherwise upload-only/read-only role. ----

/** Idempotent - re-clicking after the test has already started is a no-op. */
export function startNoteTest(noteId: string) {
	return api.post<void>(`/api/v1/notes/${noteId}/test/start`);
}

/** Rejects if the test was never started. Reveals for every student who attempted this chapter at once. */
export function revealNoteTest(noteId: string) {
	return api.post<void>(`/api/v1/notes/${noteId}/test/done`);
}

/**
 * Per-chapter test progress dashboard (build guide §8a) - deliberately NOT
 * gated by test.revealed. This is how an Instructor decides *when* to hit
 * "Reveal Test" (e.g. "8 of 10 submitted, I'll wait" or "everyone's in").
 */
export function getNoteResults(noteId: string) {
	return api.get<InstructorNoteResults>(`/api/v1/instructors/notes/${noteId}/results`);
}

// ---- Assignments: read-only ----
// The current Assignment model is student-originated: an Assignment record
// IS the student's submitted homework. There is no separate nested
// submissions endpoint.

export function getCourseAssignments(courseId: string) {
	return api.get<InstructorAssignmentsResponse>(
		`/api/v1/instructors/courses/${courseId}/assignments`
	);
}

// ---- Analytics (Phase 16) - course-level only, no chapter breakdown; that's
// intentionally not in this API (frontendgurad.md §8's revision). Per-student
// chapter context still exists via getMyStudents' lastStudiedChapterTitle/
// mostStudiedContent.

export type AnalyticsPeriod = 'today' | 'week' | 'month';

export function getCourseAnalytics(courseId: string, period: AnalyticsPeriod = 'week') {
	return api.get<CourseAnalytics>(
		`/api/v1/instructors/courses/${courseId}/analytics?period=${period}`
	);
}

export function getMyAnalytics(period: AnalyticsPeriod = 'week') {
	return api.get<MyAnalyticsResponse>(`/api/v1/instructors/me/analytics?period=${period}`);
}

