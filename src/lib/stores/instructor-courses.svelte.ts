import { getMyCourses } from '$lib/api/instructor';
import { ApiError } from '$lib/api/client';
import type { Course, Semester } from '$lib/types';

/**
 * Phase 10 §0: course lists are semester-scoped and the active semester can
 * change under a logged-in user with no action on their part. This store
 * remembers which semester its cached `courses` belong to, so
 * session.svelte.ts's semester-change check can force a `reload()` instead
 * of letting a stale list (from the semester that just rolled over) sit in
 * memory.
 */
class InstructorCoursesStore {
	courses = $state<Course[]>([]);
	semester = $state<Semester | null>(null);
	loading = $state(false);
	loaded = $state(false);
	error = $state<string | null>(null);

	async ensureLoaded() {
		if (this.loaded || this.loading) return;
		await this.reload();
	}

	async reload() {
		this.loading = true;
		this.error = null;
		try {
			const res = await getMyCourses();
			this.courses = res.courses;
			this.semester = res.semester;
			this.loaded = true;
		} catch (err) {
			this.error = err instanceof ApiError ? err.message : 'Could not load your courses.';
		} finally {
			this.loading = false;
		}
	}

	/** Called from the instructor layout whenever GET /instructors/me reports a different semester.id than last seen. */
	invalidate() {
		this.loaded = false;
		this.courses = [];
		this.semester = null;
	}

	find(courseId: string): Course | null {
		return this.courses.find((c) => c.id === courseId) ?? null;
	}
}

export const instructorCourses = new InstructorCoursesStore();
