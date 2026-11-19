import { useState } from 'react';

const localDateTime = (value) => {
  const date = value ? new Date(value) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function AssignmentEditor({ assignment, courses, busy, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    courseId: assignment?.course?._id || assignment?.course || courses[0]?._id || '',
    title: assignment?.title || '',
    description: assignment?.description || '',
    instructions: assignment?.instructions || '',
    references: assignment?.references?.length ? assignment.references : [],
    dueAt: localDateTime(assignment?.dueAt),
    maxMarks: assignment?.maxMarks ?? 100,
    allowLateSubmissions: assignment?.allowLateSubmissions ?? false,
    allowResubmissions: assignment?.allowResubmissions ?? true,
  }));

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setReference = (index, field, value) => {
    setForm((current) => ({
      ...current,
      references: current.references.map((reference, i) => i === index ? { ...reference, [field]: value } : reference),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    onSave({ ...form, dueAt: new Date(form.dueAt).toISOString(), maxMarks: Number(form.maxMarks) });
  };

  return (
    <form className="card space-y-4" onSubmit={submit}>
      <h2 className="text-xl font-semibold">{assignment ? 'Edit assignment' : 'Create assignment'}</h2>
      <div>
        <label className="label" htmlFor="assignment-course">Course</label>
        <select id="assignment-course" className="input" value={form.courseId} onChange={(event) => setField('courseId', event.target.value)} required>
          <option value="" disabled>Select a course</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="assignment-title">Title</label>
          <input id="assignment-title" className="input" value={form.title} maxLength={120} onChange={(event) => setField('title', event.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="assignment-deadline">Deadline</label>
            <input id="assignment-deadline" className="input" type="datetime-local" value={form.dueAt} onChange={(event) => setField('dueAt', event.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="assignment-marks">Maximum marks</label>
            <input id="assignment-marks" className="input" type="number" min="0.01" max="100000" step="0.01" value={form.maxMarks} onChange={(event) => setField('maxMarks', event.target.value)} required />
          </div>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="assignment-description">Description</label>
        <textarea id="assignment-description" className="input min-h-24" value={form.description} maxLength={3000} onChange={(event) => setField('description', event.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="assignment-instructions">Instructions</label>
        <textarea id="assignment-instructions" className="input min-h-28" value={form.instructions} maxLength={10000} onChange={(event) => setField('instructions', event.target.value)} placeholder="Explain what students need to do and how to submit." />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="label mb-0">Reference materials</span>
          <button type="button" className="btn-outline !px-3 !py-1" disabled={form.references.length >= 10} onClick={() => setField('references', [...form.references, { label: '', url: '' }])}>+ Add link</button>
        </div>
        {form.references.map((reference, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input className="input" aria-label="Reference label" placeholder="Label" maxLength={80} value={reference.label} onChange={(event) => setReference(index, 'label', event.target.value)} />
            <input className="input" aria-label="Reference URL" type="url" placeholder="https://..." maxLength={2048} value={reference.url} onChange={(event) => setReference(index, 'url', event.target.value)} />
            <button type="button" className="btn-danger !px-3 !py-1" aria-label="Remove reference" onClick={() => setField('references', form.references.filter((_, i) => i !== index))}>Remove</button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.allowLateSubmissions} onChange={(event) => setField('allowLateSubmissions', event.target.checked)} />
          Accept late submissions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.allowResubmissions} onChange={(event) => setField('allowResubmissions', event.target.checked)} />
          Allow resubmissions
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={busy || !courses.length}>{busy ? 'Saving...' : assignment ? 'Save changes' : 'Create assignment'}</button>
        <button type="button" className="btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
