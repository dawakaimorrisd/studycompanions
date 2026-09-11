import { api } from './client';
import type {
	AssignmentContent,
	NoteContent,
	OptionKey,
	StudentHomeContent
} from '$lib/types';

export function getStudentHome() {
	return api.get<StudentHomeContent>(
		'/api/v1/students/me/content'
	);
}

export function getNote(id: string) {
	return api.get<NoteContent>(
		`/api/v1/notes/${id}`
	);
}

export function getAssignment(id: string) {
	return api.get<AssignmentContent>(
		`/api/v1/assignments/${id}`
	);
}

export interface SubmitAnswer {
	questionUnitId: string;
	selectedOption: OptionKey;
}

export function submitNoteTest(
	noteId: string,
	answers: SubmitAnswer[]
) {
	return api.post<{ submitted: true }>(
		`/api/v1/notes/${noteId}/test/submit`,
		{ answers }
	);
}