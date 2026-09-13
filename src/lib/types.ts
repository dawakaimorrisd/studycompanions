// Shared types matching FRONTEND_HANDOFF.md's documented API shapes, as
// amended by the Phase 9 backend doc (MCQ pivot, chapter tests, drills)
// and now the Phase 10-17 doc (docs/FRONTEND_HANDOFF_PHASE_10_17.md):
// Semester scoping, paid/enrolled gating, Instructor self-serve
// notes/assignments, submissions, distribution, and analytics.

export type Role = 'student' | 'instructor';

export type ApiErrorCode =
	| 'not_authenticated'
	| 'not_a_student'
	| 'not_an_instructor'
	| 'not_found'
	| 'no_access'
	| 'bad_request'
	| 'conflict'
	| 'rate_limited'
	| 'internal_error';

// ---- Semester (Phase 10 §0) ----
// Every academic response now carries the active semester it was resolved
// against. Never picked client-side - always trust the one on the wire.

export interface Semester {
	id: string;
	name: string;
}

export interface ApiErrorBody {
	error: { code: ApiErrorCode; message: string };
}

// ---- Auth / identity ----

export interface College {
	id: string;
	name: string;
}

export interface StudentIdentity {
	id: string;
	name: string;
	studentCode: string;
	/**
	 * Optional/defensive: not confirmed present on the auth response by
	 * either handoff doc, but the account page (build guide §9) needs to
	 * show college read-only, and signup requires picking one. Render
	 * this row only when present rather than assuming the shape.
	 */
	college?: College | null;
}

export interface InstructorIdentity {
	id: string;
	name: string;
}

export interface StudentAuthResponse {
	token: string;
	expiresAt: string;
	student: StudentIdentity;
}

export interface InstructorLoginResponse {
	token: string;
	expiresAt: string;
	instructor: InstructorIdentity;
}

// ---- "Who am I" (Phase 10 §1) ----
// Called on app load / right after login, before deciding what screen to
// show. `paid: false` is the trigger for the access-pending screen (§3) -
// see src/lib/components/AccessPendingScreen.svelte and the student/
// instructor layout guards.

export interface StudentMeResponse {
	student: StudentIdentity;
	semester: Semester;
	enrolled: boolean;
	paid: boolean;
}

export interface InstructorMeResponse {
	staff: { id: string; name: string; role: string };
	semester: Semester;
	paid: boolean;
}

// ---- Course ----

export interface Course {
	id: string;
	name: string;
	courseCode: string;
}

/** Course subtitle as returned in list-style responses (name/code only, no id). */
export interface CourseSubtitle {
	name: string;
	courseCode: string;
}

/** GET /students/me/courses and GET /instructors/me/courses (Phase 10 §2) - enrollment/assignment only, not eligibility. */
export interface MyCoursesResponse {
	semester: Semester;
	courses: Course[];
}

// ---- Notes / Assignments (reader content) - Phase 9 MCQ pivot ----

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface DictionaryEntry {
	term: string;
	definition: string;
	/** Moved here from QuestionUnit in Phase 9. */
	example: string | null;
}

export interface QuestionUnit {
	id: string;
	order: number;
	question: string;
	optionA: string;
	optionB: string;
	optionC: string;
	optionD: string;
	/**
	 * Gated: null for a student until the Note's chapter test (or the
	 * Assignment's most recent drill attempt) has been revealed. Always
	 * populated for an Instructor viewing their own course.
	 */
	correctOption: OptionKey | null;
	/** Same gating as correctOption. */
	explanation: string | null;
	/** Vestigial from the pre-Phase-9 free-text model - still present on the wire, always false, not used for rendering. */
	isTable: boolean;
	dictionaryEntries: DictionaryEntry[];
}

export interface AssignmentSection {
	order: number;
	heading: string | null;
	content: string;
}

// ---- Notes: chapter test ----

export interface NoteTestStatus {
	started: boolean;
	revealed: boolean;

	/**
	 * Undefined entirely for an Instructor's own request.
	 * Null for a Student who hasn't submitted.
	 *
	 * After submission:
	 * - score remains null until reveal
	 * - answers remain unavailable until reveal
	 *
	 * After reveal:
	 * - score is available
	 * - answers contains the student's submitted option for each question
	 */
	myAttempt?: {
		submittedAt: string;
		score: number | null;
		totalQuestions: number;
		answers: {
			questionUnitId: string;
			selectedOption: OptionKey;
			isCorrect: boolean;
		}[];
	} | null;
}

export interface NoteContent {
	id: string;
	title: string;
	rawText: string;
	course: Course;
	/** Upload-time label, e.g. "Chapter 3" - set by the instructor, not derived. */
	chapterLabel: string | null;
	createdAt: string;
	/** Confirmed in the v3 handoff - the instructor review page reads this straight from here now instead of a second call to the course content list. */
	publishedAt: string | null;
	generatedAt: string | null;
	questionUnits: QuestionUnit[];
	test: NoteTestStatus;
}

// ---- Assignments: self-paced drill ----

export interface AssignmentDrillSummary {
	completedCount: number;
	inProgressAttemptId: string | null;
	bestScore: number | null;
	totalQuestions: number;
}

/**
 * Assignments read as PDF now, for everyone (Student, Instructor,
 * Admin/Moderator alike) - confirmed in the v3 handoff, `pdfUrl` and
 * `pdfConversionError` are real, documented fields on this endpoint
 * (`GET /assignments/:id`), not speculative additions anymore. `sections`
 * is still present structurally but isn't the reading UI; `questionUnits`
 * is what the drill/generation flow uses - PDF reading and drill-taking
 * are two independent things on the same Assignment. `type`/`createdAt`/
 * `publishedAt` are also confirmed present on both the staff and student
 * response branches, so a second call to `students/me/content` just to
 * learn `type` is no longer needed anywhere.
 */

export interface AssignmentDetailContent {
	id: string;
	title: string | null;
	type: AssignmentType;
	groupName: string | null;

	course: Course;

	submittedBy: StudentPickable;
	members: StudentPickable[];

	submittedAt: string;

	generatedAt: string | null;
	generationError: string | null;

	pdfUrl: string | null;
	pdfConversionError: string | null;

	questionUnits: QuestionUnit[];
}


export interface AssignmentContent {
	id: string;
	title: string;
	type: AssignmentType;
	rawText: string;
	pdfUrl: string | null;
	/** Explains a null pdfUrl (rare) - show a clear "PDF unavailable" state instead of a broken embed when this is set. */
	pdfConversionError: string | null;
	course: Course;
	createdAt: string;
	publishedAt: string | null;
	generatedAt: string | null;

	/** Student who submitted this assignment. */
	submittedBy: StudentPickable;

	/** Group name, when this is a GROUP assignment. */
	groupName: string | null;

	/** Tagged group members. Empty for INDIVIDUAL assignments. */
	members: StudentPickable[];

	questionUnits: QuestionUnit[];
	sections: AssignmentSection[];
	drills: AssignmentDrillSummary;
}



// ---- Student home ----

export type ContentSourceType = 'NOTE' | 'ASSIGNMENT';

/**
 * `openedAt` is gone as of Phase 10 (handoff §9): the per-student "opened"
 * write it used to read from no longer exists server-side. The updated
 * handoff (§9, restated) confirms there's still no dedicated "have I
 * started this note before" signal at all - not `openedAt`, and this
 * endpoint's documented shape doesn't carry a `publishedAt` either, so
 * don't reintroduce a recency-based "New" heuristic keyed off a field this
 * endpoint doesn't actually return. ContentListItem's badge is a plain
 * "Not started" indicator based on `test`/`drill` state instead - see that
 * component's comment.
 */
export interface StudentNoteSummary {
	id: string;
	title: string;
	course: CourseSubtitle;
	generated: boolean;
	chapterLabel: string | null;
	test: { started: boolean; revealed: boolean; submitted: boolean; score: number | null };
}

export interface StudentAssignmentSummary {
	id: string;
	title: string;
	type?: 'INDIVIDUAL' | 'GROUP';
	course: CourseSubtitle;
	generated: boolean;
	/** Confirmed in the v3 handoff - present here too now, not just on GET /assignments/:id. */
	pdfUrl?: string | null;
	drill: { inProgress: boolean };
}

/**
 * GET /students/me/content (Phase 10 §8, shape changed) - "everything
 * published in my paid+enrolled courses," not "everything sent to me."
 * When `paid` is false both arrays are always empty; that's the unpaid
 * signal this endpoint carries on its own, redundant with GET /students/me
 * but present so callers of just this endpoint are self-sufficient.
 */
export interface StudentHomeContent {
	semester: Semester;
	paid: boolean;
	notes: StudentNoteSummary[];
	assignments: StudentAssignmentSummary[];
}

// ---- Instructor: course content list ----

/**
 * GET /instructors/courses/:courseId/content (Phase 12). `publishedAt`
 * is new - Instructor is now self-serve end to end (upload -> generate ->
 * publish), so this is what drives the screen's step indicator instead of
 * inferring "ready" from generatedAt alone.
 */
export interface InstructorNoteSummary {
	id: string;
	title: string;
	chapterLabel: string | null;
	createdAt: string;
	generatedAt: string | null;
	publishedAt: string | null;
	uploadedByStaffId: string;
	test: { started: boolean; revealed: boolean };
}

// ---- Instructor: assignments ----

export type AssignmentType = 'INDIVIDUAL' | 'GROUP';

export interface StudentPickable {
	id: string;
	name: string;
	studentCode: string;
}

/**
 * GET /instructors/courses/:courseId/assignments
 *
 * The current Assignment model is student-originated: an Assignment record
 * IS the student's submitted homework. There is no separate instructor-side
 * "assignment" with nested submissions.
 */
export interface InstructorAssignmentSummary {
	id: string;
	title: string;
	type: AssignmentType;
	groupName: string | null;
	submittedBy: StudentPickable;
	members: StudentPickable[];
	submittedAt: string;
	generatedAt: string | null;
	pdfUrl: string | null;
	pdfConversionError: string | null;
	questionUnitCount: number;
}

export interface InstructorAssignmentsResponse {
	assignments: InstructorAssignmentSummary[];
}


// ---- Assignment study distribution (Phase 16, student-only) ----

/** GET /students/me/received-distributions - a complete, ready-to-render drill set. Unlike a Note's test or an Assignment's own drill, correctOption/explanation are NOT gated here. */
/**
 * GET /students/me/received-distributions - REALLY gated as of v3, not
 * the cosmetic version this was originally built against. `correctOption`/
 * `explanation` on each QuestionUnit are null until the recipient finishes
 * a drill attempt on THIS specific distribution - same pattern as an
 * Assignment's own drill (see AssignmentDrillPanel.svelte), driven by
 * startDistributionDrill/submitDistributionDrill in api/submissions.ts.
 */
export interface ReceivedDistribution {
	distributionId: string;
	receivedAt: string;
	sentBy: StudentPickable;
	submission: {
		id: string;
		groupName: string | null;
		fileName: string;
		pdfUrl: string | null;
		pdfConversionError: string | null;
		assignment: { id: string; title: string; course: CourseSubtitle };
	};
	drills: AssignmentDrillSummary;
	questionUnits: QuestionUnit[];
}

// ---- "Did I already submit this?" (real endpoint, replaces the old localStorage stopgap) ----

/**
 * GET /students/me/assignments/:id/submission - the most recent
 * submission where the caller is either the submitter or a tagged group
 * member. `isSubmitter` is what gates showing the Generate/Share entry
 * point at all (on top of `type === 'GROUP'` - see api/submissions.ts).
 * `questionUnits` here is the same ungated, fully-revealed shape as
 * `POST .../generate`'s response (it's the submitter's own work) - empty
 * until `generatedAt` is set.
 */
export interface MySubmission {
	id: string;
	type: AssignmentType;
	processingStatus: 'PROCESSING' | 'READY' | 'FAILED';
	groupName: string | null;
	submittedBy: StudentPickable;
	/** Tagged group members - empty for INDIVIDUAL. */
	members: StudentPickable[];
	isSubmitter: boolean;
	pdfUrl: string | null;
	pdfConversionError: string | null;
	submittedAt: string;
	generatedAt: string | null;
	generationError: string | null;
	questionUnits: QuestionUnit[];
}

export interface MySubmissionResponse {
	submission: MySubmission | null;
}

// ---- Creating homework (student-originated, no pre-existing Assignment -
// this is the NEW endpoint, not yet built server-side; see the backend
// handoff doc's "Student-originated homework" section) ----

/**
 * POST /students/me/courses/:courseId/assignments - a student's own
 * upload creates the Assignment record AND its Submission in one action.
 * There is no separate "assignment" anyone sets up beforehand - what the
 * instructor assigned as homework in class never has a digital form of
 * its own; the app's only job is being the place a student (or their
 * group) turns their completed homework into a PDF, a self-drill, and
 * optionally something to share with classmates.
 */
export interface CreateMyAssignmentResult {
	assignmentId: string;
	submissionId: string;
	title: string;
	type: AssignmentType;
	pdfUrl: string | null;
	pdfConversionError: string | null;
}

// ---- Distribution drill attempt (real gating, v3) - mirrors AssignmentDrillPanel's start/submit pattern exactly ----

export interface DistributionDrillStartResult {
	attemptId: string;
	startedAt: string;
}

export interface DistributionDrillSubmitResult {
	finished: true;
	score: number;
	totalQuestions: number;
	answers: {
		questionUnitId: string;
		selectedOption: OptionKey;
		correctOption: OptionKey;
		isCorrect: boolean;
		explanation: string | null;
	}[];
}

// ---- Instructor: students / analytics ----

export type Engagement = 'engaged' | 'moderate' | 'at-risk';

export interface MostStudiedContent {
	sourceType: ContentSourceType;
	id: string;
	title: string;
	/** Which chapter (a Note's `chapterLabel`), cumulatively - null for an Assignment or a chapter-less Note. */
	chapterTitle: string | null;
	seconds: number;
}

/**
 * Per-chapter score history, revealed attempts only - additive alongside
 * engagement, not a replacement for it (Phase 9's "are they opening the
 * material, AND are they passing the tests" framing).
 */
export interface ChapterTestScore {
	noteId: string;
	noteTitle: string;
	chapterLabel: string | null;
	score: number;
	totalQuestions: number;
	submittedAt: string;
}

export interface StudentSummary {
	id: string;
	name: string;
	studentCode: string;
	totalStudySeconds: number;
	lastStudiedAt: string | null;
	/** Which chapter they were most recently studying - null if never studied, an Assignment, or a chapter-less Note. */
	lastStudiedChapterTitle: string | null;
	mostStudiedContent: MostStudiedContent | null;
	/** index 0 = Sunday ... index 6 = Saturday, seconds studied that weekday, summed across all time */
	weeklyActivityByDay: number[];
	engagement: Engagement;
	chapterTests: ChapterTestScore[];
}

/** GET /students/me/study-summary (Phase 16). */
export interface StudentStudySummary {
	semester: Semester;
	thisWeekSeconds: number;
	coursesStudiedThisWeek: number;
	mostStudiedCourse: { courseId: string; courseName: string; seconds: number } | null;
	currentStreakDays: number;
}

// ---- Instructor analytics (Phase 16) - course-level only, deliberately no
// chapter breakdown (frontendgurad.md §8's revision - a course's chapters
// are its notes, so chapter-level time tracking doesn't add a signal beyond
// note-level, and accuracy is already covered by test/drill scores). ----

export interface CourseAnalytics {
	semester: Semester;
	period: 'today' | 'week' | 'month';
	totalStudySeconds: number;
	activeStudentCount: number;
}

export interface MyAnalyticsResponse {
	semester: Semester;
	period: 'today' | 'week' | 'month';
	courses: { courseId: string; courseName: string; totalStudySeconds: number; activeStudentCount: number }[];
}

export interface NoteResultsSubmission {
	studentId: string;
	studentName: string;
	studentCode: string;
	score: number;
	totalQuestions: number;
	submittedAt: string;
}

export interface NoteResultsPending {
	studentId: string;
	studentName: string;
	studentCode: string;
}

export interface InstructorQuestionAnalytics {
	id: string;
	number: number;
	question: string;
	correctOption: OptionKey;

	answered: number;
	correct: number;
	wrong: number;
	correctPercentage: number;

	performance: 'strong' | 'middle' | 'weak';

	optionCounts: {
		A: number;
		B: number;
		C: number;
		D: number;
	};
}

export interface InstructorNoteResults {
	note: {
		id: string;
		title: string;
		chapterLabel: string | null;
		totalQuestions: number;
		test: {
			started: boolean;
			revealed: boolean;
		};
	};

	summary: {
		totalStudents: number;
		submitted: number;
		notYetSubmitted: number;
		averageScore: number;
		averagePercentage: number;
	};

	questionAnalytics: InstructorQuestionAnalytics[];

	questionGroups: {
		strong: InstructorQuestionAnalytics[];
		middle: InstructorQuestionAnalytics[];
		weak: InstructorQuestionAnalytics[];
	};

	submitted: NoteResultsSubmission[];

	notYetSubmitted: NoteResultsPending[];
}