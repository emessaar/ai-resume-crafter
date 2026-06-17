#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError
from http.server import SimpleHTTPRequestHandler, HTTPServer
from html.parser import HTMLParser

PORT = 8000
PUBLIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')

class MLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []
        self.in_ignored_tag = False
        self.ignored_tags = {'script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg', 'iframe'}

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.ignored_tags:
            self.in_ignored_tag = True

    def handle_endtag(self, tag):
        if tag.lower() in self.ignored_tags:
            self.in_ignored_tag = False

    def handle_data(self, d):
        if not self.in_ignored_tag:
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

class ResumeBuilderRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Initialize SimpleHTTPRequestHandler serving from 'public' directory
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        
        # Intercept API route for job description URL scraping
        if parsed_url.path == '/api/scrape':
            self.handle_scrape(parsed_url.query)
        else:
            # Fallback to serving static files from PUBLIC_DIR
            super().do_GET()

    def handle_scrape(self, query_string):
        params = urllib.parse.parse_qs(query_string)
        url_list = params.get('url')
        
        if not url_list or not url_list[0]:
            self.send_error_json(400, "Missing 'url' query parameter.")
            return

        target_url = url_list[0]
        
        # Parse the URL and ensure it has a schema
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

    def send_error_json(self, status_code, message):
        try:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": message}).encode('utf-8'))
        except Exception as e:
            print(f"Error sending error response: {e}")

def run_server():
    # Ensure the public directory exists
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    
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
