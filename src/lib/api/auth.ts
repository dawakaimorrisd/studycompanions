import { api } from './client';
import type { College, InstructorLoginResponse, StudentAuthResponse } from '$lib/types';

/**
 * The only unauthenticated route in the whole API besides login/signup
 * themselves (handoff §2) - a Student needs this to populate the college
 * dropdown before they have an account. Assuming the same
 * `{ <plural>: [...] }` envelope every other list endpoint in the handoff
 * uses; trivial to adjust if the backend returns a bare array instead.
 */
export async function fetchColleges(): Promise<College[]> {
	const res = await api.get<{ colleges: College[] }>('/api/v1/colleges', { auth: false });
	return res.colleges;
}

export function instructorLogin(name: string, password: string) {
	return api.post<InstructorLoginResponse>(
		'/api/v1/instructors/login',
		{ name, password },
		{ auth: false }
	);
}

export function studentLogin(studentCode: string, password: string) {
	return api.post<StudentAuthResponse>(
		'/api/v1/students/login',
		{ studentCode, password },
		{ auth: false }
	);
}

export interface StudentSignupParams {
	name: string;
	studentCode: string;
	password: string;
	collegeId: string;
}

export function studentSignup(params: StudentSignupParams) {
	return api.post<StudentAuthResponse>('/api/v1/students/signup', params, { auth: false });
}

// ---- Change password (build guide §7/§9) ----
// Requires currentPassword even though the session already proves login -
// changing a password is worth re-confirming identity for. Invalidates
// *other* sessions server-side, not the one making this request, so no
// local session handling is needed after a successful call.

export function changeStudentPassword(currentPassword: string, newPassword: string) {
	return api.post<void>('/api/v1/students/me/password', { currentPassword, newPassword });
}

export function changeInstructorPassword(currentPassword: string, newPassword: string) {
	return api.post<void>('/api/v1/instructors/me/password', { currentPassword, newPassword });
}
