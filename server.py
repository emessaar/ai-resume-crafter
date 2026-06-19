#!/usr/bin/env python3
import os
import sys
import json

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, Query, Body, Path, Response
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse

from database import init_db, get_db_connection, deserialize_job, DB_FILE
from scraper import scrape_url, URLError, HTTPError

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

# Create FastAPI app
app = FastAPI(title="ResumeCrafter Server")

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom caching middleware to match stdlib headers
@app.middleware("http")
async def add_no_cache_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Startup database initialization
@app.on_event("startup")
def startup_event():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    try:
        init_db()
        print(f"SQLite DB initialized successfully at: {DB_FILE}")
    except Exception as e:
        print(f"Error initializing SQLite database: {e}")
        sys.exit(1)

# --- API Routes ---

@app.get("/api/scrape")
def handle_scrape(url: str = Query(...)):
    try:
        result = scrape_url(url)
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except HTTPError as e:
        return JSONResponse(status_code=e.code, content={"error": f"HTTP Error {e.code}: {e.reason}"})
    except URLError as e:
        return JSONResponse(status_code=500, content={"error": f"URL Error: {e.reason}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to scrape: {str(e)}"})

@app.get("/api/resume/base")
@app.get("/api/resume/master")
def handle_get_base_resume():
    try:
        conn = get_db_connection()
        row = conn.execute('SELECT data FROM resumes WHERE title = ?', ('Base Resume',)).fetchone()
        conn.close()
        if row:
            return json.loads(row['data'])
        else:
            return JSONResponse(status_code=404, content={"error": "Base Resume not found."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/resume/base")
@app.post("/api/resume/master")
def handle_post_base_resume(body: dict = Body(...)):
    try:
        conn = get_db_connection()
        conn.execute('UPDATE resumes SET data = ?, updatedAt = ? WHERE title = ?', 
                     (json.dumps(body), body.get('updatedAt', ''), 'Base Resume'))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/jobs")
def handle_get_jobs():
    try:
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM job_descriptions ORDER BY createdDate DESC').fetchall()
        conn.close()
        return [deserialize_job(row) for row in rows]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/jobs/{job_id}")
def handle_get_job(job_id: int = Path(...)):
    try:
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM job_descriptions WHERE id = ?', (job_id,)).fetchone()
        conn.close()
        if row:
            return deserialize_job(row)
        else:
            return JSONResponse(status_code=404, content={"error": f"Job with ID {job_id} not found."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/jobs", status_code=201)
def handle_post_job(body: dict = Body(...)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO job_descriptions (
                jobTitle, companyName, jdUrl, rawJdText, extractedKeywords, status, notes, createdDate,
                matchScore, matchedKeywords, missingKeywords, aiSuggestions, generatedCoverLetter, targetCoverLetterWordCount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            body.get('jobTitle', 'New Job Role'),
            body.get('companyName', 'Company Name'),
            body.get('jdUrl', ''),
            body.get('rawJdText', ''),
            json.dumps(body.get('extractedKeywords', [])),
            body.get('status', 'Draft'),
            body.get('notes', ''),
            body.get('createdDate', ''),
            body.get('matchScore', None),
            json.dumps(body.get('matchedKeywords', [])),
            json.dumps(body.get('missingKeywords', [])),
            json.dumps(body.get('aiSuggestions', [])),
            body.get('generatedCoverLetter', ''),
            body.get('targetCoverLetterWordCount', 300)
        ))
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"id": new_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.put("/api/jobs/{job_id}")
def handle_put_job(job_id: int = Path(...), body: dict = Body(...)):
    try:
        conn = get_db_connection()
        conn.execute('''
            UPDATE job_descriptions SET
                jobTitle = ?,
                companyName = ?,
                jdUrl = ?,
                rawJdText = ?,
                extractedKeywords = ?,
                status = ?,
                notes = ?,
                createdDate = ?,
                matchScore = ?,
                matchedKeywords = ?,
                missingKeywords = ?,
                aiSuggestions = ?,
                generatedCoverLetter = ?,
                targetCoverLetterWordCount = ?
            WHERE id = ?
        ''', (
            body.get('jobTitle'),
            body.get('companyName'),
            body.get('jdUrl'),
            body.get('rawJdText'),
            json.dumps(body.get('extractedKeywords', [])),
            body.get('status'),
            body.get('notes'),
            body.get('createdDate'),
            body.get('matchScore'),
            json.dumps(body.get('matchedKeywords', [])),
            json.dumps(body.get('missingKeywords', [])),
            json.dumps(body.get('aiSuggestions', [])),
            body.get('generatedCoverLetter'),
            body.get('targetCoverLetterWordCount'),
            job_id
        ))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/api/jobs/{job_id}")
def handle_delete_job(job_id: int = Path(...)):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM job_descriptions WHERE id = ?', (job_id,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/tailored-resumes")
def handle_get_tailored_resume(jobId: int = Query(...)):
    try:
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM tailored_resumes WHERE jobId = ?', (jobId,)).fetchone()
        conn.close()
        if row:
            res = dict(row)
            res['resumeSnapshot'] = json.loads(res['resumeSnapshot'])
            return res
        else:
            return None
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/tailored-resumes")
def handle_post_tailored_resume(body: dict = Body(...)):
    try:
        job_id = body.get('jobId')
        resume_snapshot = body.get('resumeSnapshot')
        created_at = body.get('createdAt')
        
        conn = get_db_connection()
        conn.execute('''
            INSERT OR REPLACE INTO tailored_resumes (jobId, resumeSnapshot, createdAt)
            VALUES (?, ?, ?)
        ''', (job_id, json.dumps(resume_snapshot), created_at))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/api/tailored-resumes")
def handle_delete_tailored_resume(jobId: int = Query(...)):
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM tailored_resumes WHERE jobId = ?', (jobId,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Mount static files at root "/"
# Must be defined AFTER all API routes to ensure it doesn't intercept API paths
app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="static")

def run_server():
    import uvicorn
    print(f"==================================================")
    print(f" Resume Builder Server starting (FastAPI)...")
    print(f" Static files folder: {PUBLIC_DIR}")
    print(f" Listening at: http://localhost:{PORT}")
    print(f" Press Ctrl+C to stop the server.")
    print(f"==================================================")
    uvicorn.run("server:app", host="127.0.0.1", port=PORT, log_level="info")

if __name__ == '__main__':
    run_server()
