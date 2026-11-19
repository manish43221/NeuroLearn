const path = require('path');
const ApiError = require('./ApiError');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const FILE_TYPES = {
  '.pdf': { mimeType: 'application/pdf', signature: (data) => data.subarray(0, 5).toString() === '%PDF-' },
  '.docx': {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: isZip,
  },
  '.zip': { mimeType: 'application/zip', signature: isZip },
  '.txt': { mimeType: 'text/plain', signature: () => true },
};

function isZip(data) {
  return (
    data.length >= 4 &&
    data[0] === 0x50 &&
    data[1] === 0x4b &&
    [[0x03, 0x04], [0x05, 0x06], [0x07, 0x08]].some(([third, fourth]) => data[2] === third && data[3] === fourth)
  );
}

function validateAssignmentInput(body, partial = false) {
  const input = {};
  const required = ['title', 'description', 'dueAt', 'maxMarks'];
  for (const field of required) {
    if (!partial && body[field] === undefined) throw new ApiError(400, `${field} is required`);
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120) {
      throw new ApiError(400, 'Title must be between 1 and 120 characters');
    }
    input.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || !body.description.trim() || body.description.trim().length > 3000) {
      throw new ApiError(400, 'Description must be between 1 and 3000 characters');
    }
    input.description = body.description.trim();
  }

  if (body.instructions !== undefined) {
    if (typeof body.instructions !== 'string' || body.instructions.length > 10000) {
      throw new ApiError(400, 'Instructions must be 10000 characters or fewer');
    }
    input.instructions = body.instructions.trim();
  }

  if (body.references !== undefined) {
    if (!Array.isArray(body.references) || body.references.length > 10) {
      throw new ApiError(400, 'Provide no more than 10 reference links');
    }
    input.references = body.references.map((reference) => {
      if (!reference || typeof reference.url !== 'string') throw new ApiError(400, 'Each reference needs a URL');
      const url = reference.url.trim();
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        throw new ApiError(400, 'Reference URLs must be valid HTTP or HTTPS links');
      }
      if (!['http:', 'https:'].includes(parsed.protocol) || url.length > 2048) {
        throw new ApiError(400, 'Reference URLs must be valid HTTP or HTTPS links');
      }
      const label = typeof reference.label === 'string' && reference.label.trim()
        ? reference.label.trim()
        : parsed.hostname;
      if (label.length > 80) throw new ApiError(400, 'Reference labels must be 80 characters or fewer');
      return { label, url };
    });
  }

  if (body.dueAt !== undefined) {
    const dueAt = new Date(body.dueAt);
    if (!Number.isFinite(dueAt.getTime())) throw new ApiError(400, 'Deadline must be a valid date');
    input.dueAt = dueAt;
  }

  if (body.maxMarks !== undefined) {
    const maxMarks = Number(body.maxMarks);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 100000) {
      throw new ApiError(400, 'Maximum marks must be greater than 0 and no more than 100000');
    }
    input.maxMarks = maxMarks;
  }

  for (const field of ['allowLateSubmissions', 'allowResubmissions']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'boolean') throw new ApiError(400, `${field} must be true or false`);
      input[field] = body[field];
    }
  }

  return input;
}

function validateSubmissionFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length) throw new ApiError(400, 'Choose a file to submit');
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'Files must be 10 MB or smaller');

  const originalName = path.basename(String(file.originalname || '').replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const extension = path.extname(originalName).toLowerCase();
  const allowed = FILE_TYPES[extension];
  if (!allowed) throw new ApiError(400, 'Supported file formats are PDF, DOCX, ZIP, and TXT');
  if (file.mimetype !== allowed.mimeType && !(extension === '.zip' && file.mimetype === 'application/x-zip-compressed')) {
    throw new ApiError(400, 'The file type does not match its extension');
  }
  if (!allowed.signature(file.buffer)) throw new ApiError(400, 'The uploaded file content is invalid for this format');

  return {
    data: file.buffer,
    originalName: originalName.slice(0, 180) || `submission${extension}`,
    mimeType: allowed.mimeType,
    size: file.size,
  };
}

function submissionStatus(submission, dueAt) {
  if (!submission) return 'pending';
  if (submission.evaluatedAt || submission.marks !== null && submission.marks !== undefined) return 'evaluated';
  return new Date(submission.submittedAt) > new Date(dueAt) ? 'late' : 'submitted';
}

function canManageAssignment(user, assignment) {
  return user.role === 'admin' || String(assignment.teacher) === String(user._id);
}

module.exports = {
  MAX_UPLOAD_BYTES,
  validateAssignmentInput,
  validateSubmissionFile,
  submissionStatus,
  canManageAssignment,
};
