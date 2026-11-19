import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import AssignmentEditor from '../components/AssignmentEditor';
import AssignmentSubmissionReview from '../components/AssignmentSubmissionReview';

const dateLabel = (value) => new Date(value).toLocaleString();
const isPast = (value) => new Date(value).getTime() < Date.now();

export default function Assignments() {
  const { user } = useAuth();
  const isTeacher = user.role !== 'student';
  const [assignments, setAssignments] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [courses, setCourses] = useState(isTeacher ? null : []);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [files, setFiles] = useState({});
  const [reviews, setReviews] = useState({});
  const [reviewBusyId, setReviewBusyId] = useState('');

  const loadAssignments = useCallback(async () => {
    setLoadError('');
    try {
      const { data } = await api.get('/assignments');
      setAssignments(data);
    } catch (error) {
      setLoadError(errMsg(error));
      throw error;
    }
  }, []);

  const loadCourses = useCallback(async () => {
    const { data } = await api.get('/courses', { params: { mine: 'true' } });
    setCourses(data);
  }, []);

  useEffect(() => {
    loadAssignments().catch((error) => toast.error(errMsg(error)));
    if (isTeacher) loadCourses().catch((error) => {
      setCourses([]);
      toast.error(errMsg(error));
    });
  }, [isTeacher, loadAssignments, loadCourses]);

  const saveAssignment = async (payload) => {
    setSaving(true);
    try {
      if (editing?._id) {
        await api.put(`/assignments/${editing._id}`, payload);
        toast.success('Assignment updated');
      } else {
        await api.post('/assignments', payload);
        toast.success('Assignment created');
      }
      setEditing(null);
      await loadAssignments();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignment) => {
    if (!window.confirm(`Delete "${assignment.title}" and all its submissions?`)) return;
    try {
      await api.delete(`/assignments/${assignment._id}`);
      toast.success('Assignment deleted');
      await loadAssignments();
      setReviews((current) => {
        const next = { ...current };
        delete next[assignment._id];
        return next;
      });
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  const loadReviews = async (assignmentId) => {
    setReviews((current) => ({ ...current, [assignmentId]: { loading: true, items: [] } }));
    try {
      const { data } = await api.get(`/assignments/${assignmentId}/submissions`);
      setReviews((current) => ({ ...current, [assignmentId]: { loading: false, items: data } }));
    } catch (error) {
      setReviews((current) => ({ ...current, [assignmentId]: { loading: false, items: [], error: errMsg(error) } }));
    }
  };

  const toggleReviews = (assignmentId) => {
    if (reviews[assignmentId]) {
      setReviews((current) => {
        const next = { ...current };
        delete next[assignmentId];
        return next;
      });
    } else {
      loadReviews(assignmentId);
    }
  };

  const submitAssignment = async (assignmentId) => {
    const file = files[assignmentId];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(assignmentId);
    try {
      await api.post(`/assignments/${assignmentId}/submissions`, formData);
      toast.success('Assignment submitted');
      setFiles((current) => ({ ...current, [assignmentId]: null }));
      await loadAssignments();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setUploadingId('');
    }
  };

  const evaluateSubmission = async (assignmentId, submissionId, marks, feedback) => {
    setReviewBusyId(submissionId);
    try {
      await api.patch(`/assignments/${assignmentId}/submissions/${submissionId}/evaluate`, { marks, feedback });
      toast.success('Evaluation saved');
      await loadReviews(assignmentId);
      await loadAssignments();
    } catch (error) {
      toast.error(errMsg(error));
    } finally {
      setReviewBusyId('');
    }
  };

  const downloadFile = async (assignmentId, submission) => {
    try {
      const endpoint = isTeacher
        ? `/assignments/${assignmentId}/submissions/${submission._id}/file`
        : `/assignments/${assignmentId}/submissions/me/file`;
      const { data } = await api.get(endpoint, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = submission.file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errMsg(error));
    }
  };

  if (assignments === null && loadError) {
    return <div className="page"><div className="card text-center text-sm text-red-600" role="alert">Could not load assignments: {loadError}<button type="button" className="btn-outline ml-3" onClick={() => loadAssignments().catch((error) => toast.error(errMsg(error)))}>Try again</button></div></div>;
  }
  if (assignments === null || isTeacher && courses === null) return <Loader text="Loading assignments..." />;

  return (
    <div className="page space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isTeacher ? 'Assignments' : 'My Assignments'}</h1>
          <p className="mt-1 text-sm text-slate-500">{isTeacher ? 'Create coursework and review student submissions.' : 'Coursework from courses you are enrolled in.'}</p>
        </div>
        {isTeacher && !editing && courses.length > 0 && <button type="button" className="btn-primary" onClick={() => setEditing({})}>+ New assignment</button>}
      </div>

      {isTeacher && courses.length === 0 && <div className="card text-sm text-slate-500">Create a course before adding assignments. <Link to="/manage/course/new" className="font-semibold text-brand-600 underline">Create a course</Link></div>}

      {editing && isTeacher && (
        <AssignmentEditor
          key={editing._id || 'new'}
          assignment={editing._id ? editing : null}
          courses={courses}
          busy={saving}
          onCancel={() => setEditing(null)}
          onSave={saveAssignment}
        />
      )}

      {isTeacher ? (
        <TeacherAssignments
          assignments={assignments}
          reviews={reviews}
          onEdit={setEditing}
          onDelete={deleteAssignment}
          onToggleReviews={toggleReviews}
          onRetryReviews={loadReviews}
          onDownload={downloadFile}
          onEvaluate={evaluateSubmission}
          busyId={reviewBusyId}
        />
      ) : (
        <StudentAssignments assignments={assignments} files={files} setFiles={setFiles} uploadingId={uploadingId} onSubmit={submitAssignment} onDownload={downloadFile} />
      )}
    </div>
  );
}

function TeacherAssignments({ assignments, reviews, onEdit, onDelete, onToggleReviews, onRetryReviews, onDownload, onEvaluate, busyId }) {
  if (!assignments.length) {
    return <div className="card py-10 text-center text-slate-500">No assignments yet. Create one to get started.</div>;
  }
  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <article className="card space-y-4" key={assignment._id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="chip">{assignment.course?.title || 'Course'}</span>
              <h2 className="mt-2 text-lg font-semibold">{assignment.title}</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">{assignment.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline !px-3 !py-1" onClick={() => onEdit(assignment)}>Edit</button>
              <button type="button" className="btn-danger !px-3 !py-1" onClick={() => onDelete(assignment)}>Delete</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
            <span>Due {dateLabel(assignment.dueAt)}</span>
            <span>{assignment.maxMarks} marks</span>
            <span>{assignment.submissionCount} submissions</span>
          </div>
          {(assignment.instructions || assignment.references?.length > 0) && <details className="text-sm"><summary className="cursor-pointer font-medium">Instructions and references</summary><p className="mt-2 whitespace-pre-wrap text-slate-500">{assignment.instructions}</p><ReferenceLinks references={assignment.references} /></details>}
          <button type="button" className="btn-outline" onClick={() => onToggleReviews(assignment._id)}>{reviews[assignment._id] ? 'Hide submissions' : 'View submissions'}</button>
          {reviews[assignment._id] && (
            <AssignmentSubmissionReview
              assignment={assignment}
              submissions={reviews[assignment._id].items || []}
              loading={reviews[assignment._id].loading}
              error={reviews[assignment._id].error}
              onRetry={() => onRetryReviews(assignment._id)}
              onDownload={onDownload}
              onEvaluate={onEvaluate}
              busyId={busyId}
            />
          )}
        </article>
      ))}
    </div>
  );
}

function StudentAssignments({ assignments, files, setFiles, uploadingId, onSubmit, onDownload }) {
  if (!assignments.length) return <div className="card py-10 text-center text-slate-500">No assignments found for your enrolled courses.</div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {assignments.map((assignment) => {
        const submission = assignment.submission;
        const deadlinePassed = isPast(assignment.dueAt);
        const canSubmit = (!deadlinePassed || assignment.allowLateSubmissions) && (!submission || assignment.allowResubmissions);
        const status = assignment.status || 'pending';
        const statusClass = status === 'late'
          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
          : status === 'evaluated'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
            : status === 'submitted'
              ? 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300'
              : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
        return (
          <article className="card flex flex-col gap-4" key={assignment._id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="chip">{assignment.course?.title || 'Course'}</span>
                <h2 className="mt-2 text-lg font-semibold">{assignment.title}</h2>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>{status}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-500">{assignment.description}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
              <span>Due {dateLabel(assignment.dueAt)}</span>
              <span>Maximum {assignment.maxMarks} marks</span>
            </div>
            {assignment.instructions && <details className="text-sm"><summary className="cursor-pointer font-medium">Read instructions</summary><p className="mt-2 whitespace-pre-wrap text-slate-500">{assignment.instructions}</p></details>}
            <ReferenceLinks references={assignment.references} />
            {submission && (
              <div className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><span className="text-slate-500">Submitted file: </span><span className="font-medium">{submission.file.name}</span></div>
                  <button type="button" className="text-brand-600 underline" onClick={() => onDownload(assignment._id, submission)}>Download</button>
                </div>
                <p className="mt-1 text-slate-500">Submitted {dateLabel(submission.submittedAt)}</p>
                {submission.status === 'evaluated' && (
                  <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <p className="font-semibold">Marks: {submission.marks} / {assignment.maxMarks}</p>
                    {submission.feedback && <p className="mt-1 whitespace-pre-wrap text-slate-500">Feedback: {submission.feedback}</p>}
                  </div>
                )}
              </div>
            )}
            {canSubmit ? (
              <div className="mt-auto space-y-2">
                <label className="label" htmlFor={`file-${assignment._id}`}>{submission ? 'Choose a file to resubmit' : 'Upload your work'}</label>
                <input id={`file-${assignment._id}`} className="input" type="file" accept=".pdf,.docx,.zip,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,text/plain" onChange={(event) => setFiles((current) => ({ ...current, [assignment._id]: event.target.files?.[0] || null }))} />
                <p className="text-xs text-slate-500">PDF, DOCX, ZIP, or TXT · 10 MB maximum</p>
                <button type="button" className="btn-primary w-full" disabled={!files[assignment._id] || uploadingId === assignment._id} onClick={() => onSubmit(assignment._id)}>{uploadingId === assignment._id ? 'Uploading...' : submission ? 'Resubmit assignment' : 'Submit assignment'}</button>
              </div>
            ) : (
              <p className="mt-auto text-sm text-slate-500">{deadlinePassed && !assignment.allowLateSubmissions ? 'The submission deadline has passed.' : 'Resubmissions are disabled for this assignment.'}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReferenceLinks({ references = [] }) {
  if (!references.length) return null;
  return <ul className="mt-2 space-y-1 text-sm">{references.map((reference) => <li key={reference.url}><a href={reference.url} target="_blank" rel="noreferrer" className="text-brand-600 underline">{reference.label}</a></li>)}</ul>;
}
