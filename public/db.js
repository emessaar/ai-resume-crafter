// Data-access helpers connecting the front-end to the SQLite Python server

/**
 * Retrieve the master resume profile.
 */
export async function getMasterResume() {
    try {
        const res = await fetch('/api/resume/master');
        if (!res.ok) {
            console.warn(`getMasterResume: server returned ${res.status}, using empty profile.`);
            return { id: null, personalInfo: {}, experience: [], education: [], projects: [], skills: [], certifications: [], summary: '' };
        }
        return await res.json();
    } catch (err) {
        console.warn('getMasterResume: server unreachable, using empty profile.', err.message);
        return { id: null, personalInfo: {}, experience: [], education: [], projects: [], skills: [], certifications: [], summary: '' };
    }
}

/**
 * Save the master resume profile.
 */
export async function saveMasterResume(resumeData) {
    const res = await fetch('/api/resume/master', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(resumeData)
    });
    if (!res.ok) {
        throw new Error(`Failed to save master resume: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Retrieve a setting from localStorage (respects privacy boundary for keys/settings).
 */
export async function getSetting(key, defaultValue = '') {
    const val = localStorage.getItem(key);
    return val !== null ? val : defaultValue;
}

/**
 * Save a setting to localStorage.
 */
export async function saveSetting(key, value) {
    localStorage.setItem(key, value);
}

/**
 * Fetch all job descriptions, sorted by createdDate descending (done by backend).
 */
export async function getJobs() {
    try {
        const res = await fetch('/api/jobs');
        if (!res.ok) {
            console.warn(`getJobs: server returned ${res.status}`);
            return [];
        }
        return await res.json();
    } catch (err) {
        console.warn('getJobs: server unreachable.', err.message);
        return [];
    }
}

/**
 * Fetch a single job description by ID.
 */
export async function getJob(id) {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch job ${id}: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Add a new job description. Returns the database ID.
 */
export async function addJob(job) {
    const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(job)
    });
    if (!res.ok) {
        throw new Error(`Failed to add job: ${res.statusText}`);
    }
    const data = await res.json();
    return data.id;
}

/**
 * Update a job description.
 */
export async function updateJob(id, job) {
    const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(job)
    });
    if (!res.ok) {
        throw new Error(`Failed to update job ${id}: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Delete a job description.
 */
export async function deleteJob(id) {
    const res = await fetch(`/api/jobs/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        throw new Error(`Failed to delete job ${id}: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Get tailored resume for a specific jobId.
 */
export async function getTailoredResume(jobId) {
    const res = await fetch(`/api/tailored-resumes?jobId=${jobId}`);
    if (!res.ok) {
        throw new Error(`Failed to get tailored resume for job ${jobId}: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Save/upsert a tailored resume.
 */
export async function saveTailoredResume(tailoredRecord) {
    const res = await fetch('/api/tailored-resumes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(tailoredRecord)
    });
    if (!res.ok) {
        throw new Error(`Failed to save tailored resume: ${res.statusText}`);
    }
    return await res.json();
}

/**
 * Delete tailored resume for a specific jobId.
 */
export async function deleteTailoredResume(jobId) {
    const res = await fetch(`/api/tailored-resumes?jobId=${jobId}`, {
        method: 'DELETE'
    });
    if (!res.ok) {
        throw new Error(`Failed to delete tailored resume for job ${jobId}: ${res.statusText}`);
    }
    return await res.json();
}
