import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';

// Initialize the database
export const db = new Dexie('ResumeBuilderDB');

db.version(1).stores({
    resumes: '++id, title, updatedAt',
    jobDescriptions: '++id, jobTitle, companyName, status, createdDate',
    tailoredResumes: '++id, jobId, resumeId, createdAt',
    settings: 'key'
});

/**
 * Retrieve the master resume profile, creating a default profile if none exists.
 */
export async function getMasterResume() {
    let master = await db.resumes.filter(r => r.title === 'Master Resume').first();
    if (!master) {
        const defaultResume = {
            title: 'Master Resume',
            updatedAt: new Date(),
            personalInfo: {
                fullName: '',
                email: '',
                phone: '',
                location: '',
                website: '',
                linkedin: '',
                github: '',
                summary: ''
            },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: []
        };
        const id = await db.resumes.add(defaultResume);
        master = await db.resumes.get(id);
    }
    return master;
}

/**
 * Save the master resume profile to the database.
 */
export async function saveMasterResume(resumeData) {
    const master = await getMasterResume();
    resumeData.updatedAt = new Date();
    await db.resumes.update(master.id, resumeData);
}

/**
 * Retrieve a setting from the settings table.
 */
export async function getSetting(key, defaultValue = '') {
    const record = await db.settings.get(key);
    return record ? record.value : defaultValue;
}

/**
 * Save a setting to the settings table.
 */
export async function saveSetting(key, value) {
    await db.settings.put({ key, value });
}
