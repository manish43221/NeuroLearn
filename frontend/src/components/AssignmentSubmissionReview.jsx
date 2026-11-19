import { useState } from 'react';

const dateLabel = (value) => value ? new Date(value).toLocaleString() : '—';

export default function AssignmentSubmissionReview({ assignment, submissions, loading, error, onRetry, onDownload, onEvaluate, busyId }) {
  if (loading) return <div className="card mt-3 text-center text-sm text-slate-500">Loading submissions...</div>;
  if (error) {
    return <div className="card mt-3 text-sm text-red-600" role="alert">
      Could not load submissions: {error}
      <button type="button" className="btn-outline ml-3" onClick={onRetry}>Try again</button>
    </div>;
  }
  if (!submissions.length) return <div className="card mt-3 text-center text-sm text-slate-500">No student submissions yet.</div>;

  return (
    <div className="card mt-3 overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Submitted</th>
            <th className="px-4 py-3">File</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Evaluation</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <SubmissionRow
              key={submission._id}
              assignment={assignment}
              submission={submission}
              onDownload={onDownload}
              onEvaluate={onEvaluate}
              busy={busyId === submission._id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionRow({ assignment, submission, onDownload, onEvaluate, busy }) {
  const [marks, setMarks] = useState(submission.marks ?? '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const statusClass = submission.status === 'late'
    ? 'text-amber-700 dark:text-amber-300'
    : submission.status === 'evaluated'
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-sky-700 dark:text-sky-300';

  return (
    <tr className="border-t border-slate-100 align-top dark:border-slate-800">
      <td className="px-4 py-3">
        <div className="font-medium">{submission.student?.name || 'Student'}</div>
        <div className="text-xs text-slate-500">{submission.student?.email}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">{dateLabel(submission.submittedAt)}</td>
      <td className="px-4 py-3">
        <button type="button" className="text-left font-medium text-brand-600 underline" onClick={() => onDownload(assignment._id, submission)}>{submission.file.name}</button>
        <div className="text-xs text-slate-500">{(submission.file.size / 1024 / 1024).toFixed(2)} MB</div>
      </td>
      <td className={`px-4 py-3 font-medium capitalize ${statusClass}`}>{submission.status}</td>
      <td className="min-w-60 px-4 py-3">
        <form className="space-y-2" onSubmit={(event) => {
          event.preventDefault();
          onEvaluate(assignment._id, submission._id, marks, feedback);
        }}>
          <div className="flex items-center gap-2">
            <input className="input !w-24" type="number" min="0" max={assignment.maxMarks} step="0.01" value={marks} onChange={(event) => setMarks(event.target.value)} aria-label="Marks" required />
            <span className="text-xs text-slate-500">/ {assignment.maxMarks}</span>
            <button type="submit" className="btn-primary !px-3 !py-1" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
          </div>
          <textarea className="input min-h-16" placeholder="Feedback" maxLength={5000} value={feedback} onChange={(event) => setFeedback(event.target.value)} aria-label="Feedback" />
        </form>
      </td>
    </tr>
  );
}
