import { getStudentCourses } from '$lib/api/me';
import { ApiError } from '$lib/api/client';
import type { Course, Semester } from '$lib/types';

/**
 * GET /students/me/courses (Phase 10 §2 / Phase 11) - enrollment/assignment
 * only, not eligibility. A non-empty list here does NOT mean the student
 * can see content - `paid` (checked separately, gated at the layout level)
 * is what actually unlocks anything. This store exists purely to back the
 * "My Courses" screen and any "which course is this" lookups; it is not a
 * gate on its own.
 */
class StudentCoursesStore {
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
			const res = await getStudentCourses();
			this.courses = res.courses;
			this.semester = res.semester;
			this.loaded = true;
		} catch (err) {
			this.error = err instanceof ApiError ? err.message : 'Could not load your courses.';
		} finally {
			this.loading = false;
		}
	}

	/** Called from the student layout whenever GET /students/me reports a different semester.id than last seen. */
	invalidate() {
		this.loaded = false;
		this.courses = [];
		this.semester = null;
	}

	find(courseId: string): Course | null {
		return this.courses.find((c) => c.id === courseId) ?? null;
	}
}

export const studentCourses = new StudentCoursesStore();
