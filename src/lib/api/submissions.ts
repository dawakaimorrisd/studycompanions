
import { api } from './client';

import type {
	AssignmentType,
	CreateMyAssignmentResult,
	DistributionDrillStartResult,
	DistributionDrillSubmitResult,
	MySubmissionResponse,
	OptionKey,
	QuestionUnit,
	ReceivedDistribution,
	StudentPickable
} from '$lib/types';

/*
 * ============================================================
 * STUDENT-ORIGINATED HOMEWORK
 * ============================================================
 */

export function getCourseEligibleGroupMembers(
	courseId: string
) {
	return api.get<{ students: StudentPickable[] }>(
		`/api/v1/students/me/courses/${courseId}/eligible-group-members`
	);
}

export interface CreateMyAssignmentParams {
	courseId: string;
	title?: string;
	type: AssignmentType;
	file: File;
	groupName?: string;
	memberStudentIds?: string[];
}

export function createMyAssignment(
	params: CreateMyAssignmentParams
) {
	const formData = new FormData();

	formData.set('type', params.type);
	formData.set('file', params.file);

	if (params.title) {
		formData.set('title', params.title);
	}

	if (params.groupName) {
		formData.set(
			'groupName',
			params.groupName
		);
	}

	if (params.memberStudentIds) {
		for (const id of params.memberStudentIds) {
			formData.append(
				'memberStudentIds',
				id
			);
		}
	}

	return api.post<CreateMyAssignmentResult>(
		`/api/v1/students/me/courses/${params.courseId}/assignments`,
		formData
	);
}

export function getMySubmission(
	assignmentId: string
) {
	return api.get<MySubmissionResponse>(
		`/api/v1/students/me/assignments/${assignmentId}/submission`
	);
}

/*
 * ============================================================
 * GENERATED STUDY MATERIAL
 * ============================================================
 *
 * Generation is a ONE-TIME backend operation.
 *
 * The backend generates and persists:
 * - questionUnits
 * - generatedAt
 * - dictionary/study material derived from the submission
 *
 * The frontend sends only a SAFE key label:
 *
 *   key1 | key2 | key3 | key4 | key5
 *
 * The actual Groq API secrets NEVER reach the browser.
 * The backend resolves the selected label to the configured
 * server-side Groq API key.
 *
 * After generation completes, the frontend reuses the stored
 * questionUnits for local drills.
 */

export type GroqKeyLabel =
	| 'Groq Key 1'
	| 'Groq Key 2'
	| 'Groq Key 3'
	| 'Groq Key 4'
	| 'Groq Key 5';

export function generateSubmission(
	submissionId: string,
	groqKey?: GroqKeyLabel
) {
	return api.post<{
		generated: true;
		generatedAt: string;
		questionUnits: QuestionUnit[];
	}>(
		`/api/v1/students/me/submissions/${submissionId}/generate`,
		groqKey
			? { groqKey }
			: undefined
	);
}

/*
 * ============================================================
 * SHARING
 * ============================================================
 *
 * Sharing is separate from generation.
 *
 * Only the submitter of a GROUP submission can share it.
 */
export function getSubmissionEligibleRecipients(
	submissionId: string
) {
	return api.get<{
		students: StudentPickable[];
	}>(
		`/api/v1/students/me/submissions/${submissionId}/eligible-recipients`
	);
}

export function distributeSubmission(
	submissionId: string,
	recipientStudentIds: string[]
) {
	return api.post<{
		id: string;
		sentCount: number;
		skippedCount: number;
	}>(
		`/api/v1/students/me/submissions/${submissionId}/distribute`,
		{
			recipientStudentIds
		}
	);
}

/*
 * ============================================================
 * RECEIVED SHARED WORK
 * ============================================================
 *
 * A received distribution is different from the owner's
 * personal drill.
 *
 * These drills remain backend-controlled because the shared
 * recipient is consuming another student's distributed work.
 */

export function getReceivedDistributions() {
	return api.get<{
		distributions: ReceivedDistribution[];
	}>(
		'/api/v1/students/me/received-distributions'
	);
}

export function startDistributionDrill(
	distributionId: string
) {
	return api.post<DistributionDrillStartResult>(
		`/api/v1/students/me/distributions/${distributionId}/drill/start`
	);
}

export interface DistributionAnswer {
	questionUnitId: string;
	selectedOption: OptionKey;
}

export function submitDistributionDrill(
	distributionId: string,
	answers: DistributionAnswer[]
) {
	return api.post<DistributionDrillSubmitResult>(
		`/api/v1/students/me/distributions/${distributionId}/drill/submit`,
		{ answers }
	);
}

