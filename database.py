import os
import json
import sqlite3

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resumecrafter.db')

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. resumes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT UNIQUE,
            data TEXT,
            updatedAt TEXT
        )
    ''')
    
    # Rename any existing "Master Resume" to "Base Resume" for backward compatibility
    cursor.execute('UPDATE resumes SET title = ? WHERE title = ?', ('Base Resume', 'Master Resume'))
    
    # Pre-populate Base Resume if missing
    cursor.execute('SELECT id FROM resumes WHERE title = ?', ('Base Resume',))
    if not cursor.fetchone():
        default_resume = {
            "title": "Base Resume",
            "personalInfo": {
                "fullName": "",
                "email": "",
                "phone": "",
                "location": "",
                "website": "",
                "linkedin": "",
                "github": "",
                "customSubline": "",
                "summary": ""
            },
            "experience": [],
            "education": [],
            "skills": [],
            "projects": [],
            "certifications": []
        }
        cursor.execute(
            'INSERT INTO resumes (title, data, updatedAt) VALUES (?, ?, ?)',
            ('Base Resume', json.dumps(default_resume), '2026-06-18T00:00:00Z')
        )
    
    # 2. job_descriptions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS job_descriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jobTitle TEXT,
            companyName TEXT,
            jdUrl TEXT,
            rawJdText TEXT,
            extractedKeywords TEXT,
            status TEXT,
            notes TEXT,
            createdDate TEXT,
            matchScore INTEGER,
            matchedKeywords TEXT,
            missingKeywords TEXT,
            aiSuggestions TEXT,
            generatedCoverLetter TEXT,
            targetCoverLetterWordCount INTEGER
        )
    ''')
    
    # 3. tailored_resumes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tailored_resumes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            jobId INTEGER UNIQUE,
            resumeSnapshot TEXT,
            createdAt TEXT,
            FOREIGN KEY (jobId) REFERENCES job_descriptions (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def deserialize_job(row):
    j = dict(row)
    for field in ['extractedKeywords', 'matchedKeywords', 'missingKeywords', 'aiSuggestions']:
        if j.get(field):
            try:
                j[field] = json.loads(j[field])
            except Exception:
                j[field] = []
        else:
            j[field] = []
    return j
