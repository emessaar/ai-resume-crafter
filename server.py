#!/usr/bin/env python3
import os
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError
from http.server import SimpleHTTPRequestHandler, HTTPServer
from html.parser import HTMLParser

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resumecrafter.db')

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []
        self.ignored_stack = []
        self.ignored_tags = {'script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg', 'iframe'}

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower in self.ignored_tags:
            self.ignored_stack.append(tag_lower)

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in self.ignored_tags:
            if tag_lower in self.ignored_stack:
                for i in range(len(self.ignored_stack) - 1, -1, -1):
                    if self.ignored_stack[i] == tag_lower:
                        self.ignored_stack.pop(i)
                        break

    def handle_data(self, d):
        if not self.ignored_stack:
            self.fed.append(d)

    def get_data(self):
        return ''.join(self.fed)

def strip_tags(html_content):
    s = MLStripper()
    s.feed(html_content)
    text = s.get_data()
    
    # Clean up excess whitespace and blank lines
    lines = [line.strip() for line in text.splitlines()]
    clean_lines = [line for line in lines if line]
    return '\n'.join(clean_lines)

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

class ResumeBuilderRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')
        
        if path == '/api/scrape':
            self.handle_scrape(parsed_url.query)
        elif path in ('/api/resume/master', '/api/resume/base'):
            self.handle_get_base_resume()
        elif path == '/api/jobs':
            self.handle_get_jobs()
        elif path.startswith('/api/jobs/'):
            self.handle_get_job(path)
        elif path == '/api/tailored-resumes':
            self.handle_get_tailored_resume(parsed_url.query)
        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')
        
        if path in ('/api/resume/master', '/api/resume/base'):
            self.handle_post_base_resume()
        elif path == '/api/jobs':
            self.handle_post_job()
        elif path == '/api/tailored-resumes':
            self.handle_post_tailored_resume()
        else:
            self.send_error_json(404, "Not Found")

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')
        
        if path.startswith('/api/jobs/'):
            self.handle_put_job(path)
        else:
            self.send_error_json(404, "Not Found")

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path.rstrip('/')
        
        if path.startswith('/api/jobs/'):
            self.handle_delete_job(path)
        elif path == '/api/tailored-resumes':
            self.handle_delete_tailored_resume(parsed_url.query)
        else:
            self.send_error_json(404, "Not Found")

    def get_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        try:
            return json.loads(body.decode('utf-8'))
        except Exception as e:
            print(f"JSON parsing error: {e}")
            return {}

    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_json(self, status_code, message):
        try:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": message}).encode('utf-8'))
        except Exception as e:
            print(f"Error sending error response: {e}")

    # --- API Request Handlers ---

    def handle_get_base_resume(self):
        try:
            conn = get_db_connection()
            row = conn.execute('SELECT data FROM resumes WHERE title = ?', ('Base Resume',)).fetchone()
            conn.close()
            if row:
                self.send_json_response(200, json.loads(row['data']))
            else:
                self.send_error_json(404, "Base Resume not found.")
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_post_base_resume(self):
        try:
            body = self.get_json_body()
            conn = get_db_connection()
            conn.execute('UPDATE resumes SET data = ?, updatedAt = ? WHERE title = ?', 
                         (json.dumps(body), body.get('updatedAt', ''), 'Base Resume'))
            conn.commit()
            conn.close()
            self.send_json_response(200, {"success": True})
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_get_jobs(self):
        try:
            conn = get_db_connection()
            rows = conn.execute('SELECT * FROM job_descriptions ORDER BY createdDate DESC').fetchall()
            conn.close()
            jobs = [deserialize_job(row) for row in rows]
            self.send_json_response(200, jobs)
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_get_job(self, path):
        try:
            parts = path.split('/')
            job_id = int(parts[-1])
            conn = get_db_connection()
            row = conn.execute('SELECT * FROM job_descriptions WHERE id = ?', (job_id,)).fetchone()
            conn.close()
            if row:
                self.send_json_response(200, deserialize_job(row))
            else:
                self.send_error_json(404, f"Job with ID {job_id} not found.")
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_post_job(self):
        try:
            body = self.get_json_body()
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
            self.send_json_response(201, {"id": new_id})
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_put_job(self, path):
        try:
            parts = path.split('/')
            job_id = int(parts[-1])
            body = self.get_json_body()
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
            self.send_json_response(200, {"success": True})
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_delete_job(self, path):
        try:
            parts = path.split('/')
            job_id = int(parts[-1])
            conn = get_db_connection()
            conn.execute('DELETE FROM job_descriptions WHERE id = ?', (job_id,))
            conn.commit()
            conn.close()
            self.send_json_response(200, {"success": True})
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_get_tailored_resume(self, query_string):
        try:
            params = urllib.parse.parse_qs(query_string)
            job_id_list = params.get('jobId')
            if job_id_list:
                job_id = int(job_id_list[0])
                conn = get_db_connection()
                row = conn.execute('SELECT * FROM tailored_resumes WHERE jobId = ?', (job_id,)).fetchone()
                conn.close()
                if row:
                    res = dict(row)
                    res['resumeSnapshot'] = json.loads(res['resumeSnapshot'])
                    self.send_json_response(200, res)
                else:
                    self.send_json_response(200, None)
            else:
                self.send_error_json(400, "Missing jobId parameter")
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_post_tailored_resume(self):
        try:
            body = self.get_json_body()
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
            self.send_json_response(200, {"success": True})
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_delete_tailored_resume(self, query_string):
        try:
            params = urllib.parse.parse_qs(query_string)
            job_id_list = params.get('jobId')
            if job_id_list:
                job_id = int(job_id_list[0])
                conn = get_db_connection()
                conn.execute('DELETE FROM tailored_resumes WHERE jobId = ?', (job_id,))
                conn.commit()
                conn.close()
                self.send_json_response(200, {"success": True})
            else:
                self.send_error_json(400, "Missing jobId parameter")
        except Exception as e:
            self.send_error_json(500, str(e))

    def handle_scrape(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        url_list = params.get('url')
        
        if not url_list or not url_list[0]:
            self.send_error_json(400, "Missing 'url' query parameter.")
            return

        target_url = url_list[0]
        
        parsed_target = urllib.parse.urlparse(target_url)
        if not parsed_target.scheme or not parsed_target.netloc:
            self.send_error_json(400, "Invalid URL format.")
            return

        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    'User-Agent': (
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                        'AppleWebKit/537.36 (KHTML, like Gecko) '
                        'Chrome/120.0.0.0 Safari/537.36'
                    ),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                }
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                charset = response.headers.get_content_charset() or 'utf-8'
                html_bytes = response.read()
                
                try:
                    html_content = html_bytes.decode(charset, errors='replace')
                except Exception:
                    html_content = html_bytes.decode('utf-8', errors='replace')
                
                cleaned_text = strip_tags(html_content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response_data = {
                    "url": target_url,
                    "text": cleaned_text
                }
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
                
        except HTTPError as e:
            self.send_error_json(e.code, f"HTTP Error {e.code}: {e.reason}")
        except URLError as e:
            self.send_error_json(500, f"URL Error: {e.reason}")
        except Exception as e:
            self.send_error_json(500, f"Failed to scrape: {str(e)}")

def run_server():
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
    try:
        init_db()
        print(f"SQLite DB initialized successfully at: {DB_FILE}")
    except Exception as e:
        print(f"Error initializing SQLite database: {e}")
        sys.exit(1)

    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, ResumeBuilderRequestHandler)
    print(f"==================================================")
    print(f" Resume Builder Server started successfully!")
    print(f" Static files folder: {PUBLIC_DIR}")
    print(f" Listening at: http://localhost:{PORT}")
    print(f" Press Ctrl+C to stop the server.")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()
        print("Server stopped.")

if __name__ == '__main__':
    run_server()
