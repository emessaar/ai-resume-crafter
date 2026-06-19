import re
import html
import urllib.request
import urllib.parse
from urllib.error import URLError, HTTPError
from html.parser import HTMLParser

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

def extract_meta_from_title(title_text):
    if not title_text:
        return None, None
        
    # Clean up common prefixes like "Job Application for " (case-insensitive)
    title = re.sub(r'(?i)^\s*job\s+application\s+for\s+', '', title_text)
    
    # Clean up title: remove trailing portal names (e.g. | LinkedIn, - Indeed, etc.)
    title = re.sub(r'(?i)\s*\|\s*(linkedin|indeed|glassdoor|ziprecruiter|workable|greenhouse|lever|simplihired|careerbuilder).*$', '', title)
    title = re.sub(r'(?i)\s*-\s*(indeed|glassdoor|ziprecruiter).*$', '', title)
    title = title.strip()
    
    # Check "Job Title at Company" pattern
    at_match = re.search(r'^(.*?)\s+at\s+(.*?)$', title, re.IGNORECASE)
    if at_match:
        job = at_match.group(1).strip()
        company = at_match.group(2).strip()
        # Clean location suffix from company
        company = re.sub(r'(?i)\s+in\s+.*$', '', company)
        return job, company
        
    # Check common separators: " - ", " | ", " – ", " — "
    separators = [r'\s+-\s+', r'\s+\|\s+', r'\s+–\s+', r'\s+—\s+']
    for sep in separators:
        parts = re.split(sep, title)
        if len(parts) >= 2:
            job_keywords = {'engineer', 'developer', 'manager', 'analyst', 'lead', 'director', 'specialist', 'intern', 'associate', 'architect', 'designer', 'administrator', 'operator', 'coordinator', 'officer', 'scientist'}
            part_0_lower = parts[0].lower()
            part_1_lower = parts[1].lower()
            
            p0_has_job = any(kw in part_0_lower for kw in job_keywords)
            p1_has_job = any(kw in part_1_lower for kw in job_keywords)
            
            if p0_has_job and not p1_has_job:
                return parts[0].strip(), parts[1].strip()
            elif p1_has_job and not p0_has_job:
                return parts[1].strip(), parts[0].strip()
            else:
                return parts[0].strip(), parts[1].strip()
                
    return title, None

def scrape_url(url: str) -> dict:
    parsed_target = urllib.parse.urlparse(url)
    if not parsed_target.scheme or not parsed_target.netloc:
        raise ValueError("Invalid URL format.")

    req = urllib.request.Request(
        url,
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
        
        title_match = re.search(r'(?i)<title[^>]*>(.*?)</title>', html_content, re.DOTALL)
        extracted_job = None
        extracted_company = None
        if title_match:
            page_title = html.unescape(title_match.group(1)).strip()
            page_title = re.sub(r'\s+', ' ', page_title)
            extracted_job, extracted_company = extract_meta_from_title(page_title)
        
        return {
            "url": url,
            "text": cleaned_text,
            "extractedJobTitle": extracted_job,
            "extractedCompany": extracted_company
        }
