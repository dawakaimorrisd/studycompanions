import { api } from './client';
import type {
	InstructorMeResponse,
	MyCoursesResponse,
	StudentMeResponse,
	StudentStudySummary
} from '$lib/types';

/**
 * Phase 10 §1 - call on app load / right after login, before deciding what
 * screen to show. `paid: false` is the trigger for the access-pending
 * screen; `semester` is the source of truth for "has the active semester
 * changed under me" checks (see session.svelte.ts's `refresh`).
 */
export function getStudentMe() {
	return api.get<StudentMeResponse>('/api/v1/students/me');
}

export function getInstructorMe() {
	return api.get<InstructorMeResponse>('/api/v1/instructors/me');
}

/**
 * Phase 10 §2 - enrollment/assignment only, not eligibility. A student can
 * come back non-empty here and still see zero content if `paid` is false
 * (checked separately via getStudentMe/getStudentHome) - never infer access
 * from a non-empty course list alone.
 */
export function getStudentCourses() {
	return api.get<MyCoursesResponse>('/api/v1/students/me/courses');
}

/** GET /students/me/study-summary (Phase 16) - the student dashboard's weekly-activity widget. */
export function getStudentStudySummary() {
	return api.get<StudentStudySummary>('/api/v1/students/me/study-summary');
}
