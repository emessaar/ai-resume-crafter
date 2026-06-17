/**
 * Keyword Extractor & Match Analyzer
 */

// A comprehensive dictionary of common industry terms, technologies, and methodologies.
const SKILL_DICTIONARY = [
    // Frontend
    'react', 'angular', 'vue', 'svelte', 'javascript', 'typescript', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite', 'next.js', 'nuxt.js', 'gatsby', 'redux', 'mobx', 'graphql',
    // Backend & Languages
    'node.js', 'express', 'koa', 'nest.js', 'python', 'django', 'flask', 'fastapi', 'ruby', 'rails', 'php', 'laravel', 'go', 'golang', 'rust', 'java', 'spring boot', 'c++', 'c#', 'dotnet', 'perl',
    // Database
    'sql', 'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis', 'cassandra', 'dynamodb', 'firebase', 'supabase', 'prisma', 'sequelize', 'orm',
    // Cloud & DevOps
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'jenkins', 'github actions', 'gitlab ci', 'circleci', 'terraform', 'ansible', 'linux', 'unix', 'serverless', 'lambda',
    // Methodologies & Soft Skills
    'agile', 'scrum', 'kanban', 'jira', 'confluence', 'git', 'github', 'gitlab', 'ci/cd', 'tdd', 'testing', 'jest', 'cypress', 'playwright', 'mocha', 'chai', 'apis', 'rest', 'soap', 'microservices', 'system design',
    // Domain Expertise
    'project management', 'product management', 'product development', 'saas', 'machine learning', 'artificial intelligence', 'ai', 'deep learning', 'nlp', 'data science', 'analytics', 'ux', 'ui', 'user experience', 'design patterns'
];

/**
 * Extract keywords from job description text.
 */
export function extractKeywords(jdText) {
    if (!jdText) return [];
    
    const textLower = jdText.toLowerCase();
    const extracted = new Set();
    
    // 1. Scan against dictionary
    for (const skill of SKILL_DICTIONARY) {
        // Use word boundary to avoid partial matches (e.g. "go" in "good")
        // Escaping special characters in skill name for regex safety
        const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        let regexStr = `\\b${escapedSkill}\\b`;
        
        // Handling special cases like "C++", ".NET", "Node.js"
        if (skill.includes('+') || skill.startsWith('.') || skill.includes('.')) {
            regexStr = `(?:^|\\s|\\b)${escapedSkill}(?:$|\\s|\\b)`;
        }
        
        const regex = new RegExp(regexStr, 'gi');
        if (regex.test(textLower)) {
            extracted.add(skill);
        }
    }
    
    // 2. Extra: Find sequences of consecutive capital letters or title-case words (2-3 words max)
    // representing potential custom technologies or names.
    const customRegex = /\b[A-Z][a-zA-Z0-9\+\#\.\-]{1,15}\b/g;
    const matches = jdText.match(customRegex) || [];
    for (const m of matches) {
        const wordLower = m.toLowerCase();
        // Ignore common English words if capitalized at beginning of sentences
        const commonIgnores = ['the', 'this', 'that', 'with', 'from', 'your', 'have', 'must', 'will', 'work', 'team', 'join', 'role', 'we', 'our', 'you', 'are'];
        if (wordLower.length > 1 && !commonIgnores.includes(wordLower) && wordLower.length < 12) {
            extracted.add(wordLower);
        }
    }
    
    // Return sorted array
    return Array.from(extracted).sort();
}

/**
 * Analyze resume content against extracted job description keywords.
 * Computes matching percentage, list of matched skills, and missing suggestions.
 */
export function analyzeMatch(resumeData, jdKeywords) {
    if (!jdKeywords || jdKeywords.length === 0) {
        return {
            score: 0,
            matched: [],
            missing: []
        };
    }
    
    // Flatten all resume text to scan for keyword hits
    const resumeTextParts = [];
    
    // Add personal summary
    if (resumeData.personalInfo && resumeData.personalInfo.summary) {
        resumeTextParts.push(resumeData.personalInfo.summary);
    }
    
    // Add skills tags
    if (resumeData.skills && resumeData.skills.length > 0) {
        resumeTextParts.push(...resumeData.skills);
    }
    
    // Add certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
        resumeTextParts.push(...resumeData.certifications);
    }
    
    // Add job descriptions and titles
    if (resumeData.experience && resumeData.experience.length > 0) {
        for (const exp of resumeData.experience) {
            resumeTextParts.push(exp.company, exp.position, exp.description);
        }
    }
    
    // Add project descriptions and names
    if (resumeData.projects && resumeData.projects.length > 0) {
        for (const proj of resumeData.projects) {
            resumeTextParts.push(proj.name, proj.role, proj.description);
            if (proj.technologies) {
                resumeTextParts.push(...proj.technologies);
            }
        }
    }
    
    // Add education fields
    if (resumeData.education && resumeData.education.length > 0) {
        for (const edu of resumeData.education) {
            resumeTextParts.push(edu.school, edu.degree, edu.fieldOfStudy, edu.description || '');
        }
    }
    
    const flatResumeText = resumeTextParts.join(' ').toLowerCase();
    
    const matched = [];
    const missing = [];
    
    for (const keyword of jdKeywords) {
        // Escaping regex characters
        const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        let regexStr = `\\b${escapedKeyword}\\b`;
        if (keyword.includes('+') || keyword.startsWith('.') || keyword.includes('.')) {
            regexStr = `(?:^|\\s|\\b)${escapedKeyword}(?:$|\\s|\\b)`;
        }
        
        const regex = new RegExp(regexStr, 'i');
        if (regex.test(flatResumeText)) {
            // Capitalize first letters of keyword for display
            matched.push(capitalizeKeyword(keyword));
        } else {
            missing.push(capitalizeKeyword(keyword));
        }
    }
    
    const matchedCount = matched.length;
    const totalCount = jdKeywords.length;
    const score = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;
    
    return {
        score,
        matched,
        missing
    };
}

function capitalizeKeyword(str) {
    // Preserve tech structures like "Node.js", "C++", "SaaS"
    const preserves = {
        'aws': 'AWS',
        'gcp': 'GCP',
        'saas': 'SaaS',
        'sql': 'SQL',
        'ui': 'UI',
        'ux': 'UX',
        'api': 'API',
        'apis': 'APIs',
        'ci/cd': 'CI/CD',
        'tdd': 'TDD',
        'css': 'CSS',
        'html': 'HTML',
        'nlp': 'NLP',
        'ai': 'AI',
        'pmp': 'PMP',
        'github': 'GitHub',
        'gitlab': 'GitLab',
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'node.js': 'Node.js',
        'next.js': 'Next.js',
        'vue.js': 'Vue.js',
        'nuxt.js': 'Nuxt.js',
        'gatsby.js': 'Gatsby.js'
    };
    
    if (preserves[str.toLowerCase()]) {
        return preserves[str.toLowerCase()];
    }
    
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Helper to clean resume details for LLM prompt context
 */
function getCleanedResume(resumeData) {
    return {
        personalInfo: {
            fullName: resumeData.personalInfo?.fullName || '',
            summary: resumeData.personalInfo?.summary || ''
        },
        experience: (resumeData.experience || []).map(exp => ({
            company: exp.company,
            position: exp.position,
            description: exp.description
        })),
        education: (resumeData.education || []).map(edu => ({
            school: edu.school,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy
        })),
        skills: resumeData.skills || [],
        projects: (resumeData.projects || []).map(proj => ({
            name: proj.name,
            role: proj.role,
            description: proj.description,
            technologies: proj.technologies
        })),
        certifications: resumeData.certifications || []
    };
}

/**
 * Helper to generate prompt text
 */
function getPromptText(cleanedResume, jdText) {
    return `You are a professional ATS resume optimizer and career coach.
Analyze the following Resume and Job Description (JD).

Resume JSON:
${JSON.stringify(cleanedResume, null, 2)}

Job Description:
${jdText}

Identify:
1. "matched": Array of specific technical or industry keywords/skills (e.g., "React", "Python", "Agile") found in both.
2. "missing": Array of specific technical or industry keywords/skills found in the Job Description but absent or weak in the resume.
3. "score": An integer (0-100) representing how well the resume matches the Job Description.
4. "suggestions": An array of EXACTLY 3 specific, action-oriented bullet points or tailoring rephrasings showing the user how to integrate the missing keywords into their experience or summary sections.

You MUST respond in clean, valid JSON matching this schema:
{
  "score": number,
  "matched": [string, ...],
  "missing": [string, ...],
  "suggestions": [string, ...]
}`;
}

/**
 * Dispatcher: routes matching requests to active LLM providers
 */
export async function analyzeMatchLLM(resumeData, jdText, config) {
    if (config.provider === 'litellm') {
        return await analyzeMatchLiteLLM(resumeData, jdText, config);
    } else {
        return await analyzeMatchGemini(resumeData, jdText, config.apiKey);
    }
}

/**
 * Asynchronously call the Gemini API.
 */
async function analyzeMatchGemini(resumeData, jdText, apiKey) {
    if (!apiKey) {
        throw new Error('Missing Gemini API Key.');
    }
    if (!jdText) {
        return { score: 0, matched: [], missing: [], suggestions: [] };
    }

    const cleanedResume = getCleanedResume(resumeData);
    const prompt = getPromptText(cleanedResume, jdText);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                responseMimeType: 'application/json'
            }
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to query Gemini API.');
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
        throw new Error('Empty response from Gemini API.');
    }

    try {
        const result = JSON.parse(responseText.trim());
        return {
            score: typeof result.score === 'number' ? result.score : 0,
            matched: Array.isArray(result.matched) ? result.matched : [],
            missing: Array.isArray(result.missing) ? result.missing : [],
            suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
        };
    } catch (e) {
        console.error('Failed to parse Gemini JSON output. Raw output:', responseText);
        throw new Error('AI response format was invalid.');
    }
}

/**
 * Asynchronously call the LiteLLM/OpenAI Compatible API.
 */
async function analyzeMatchLiteLLM(resumeData, jdText, config) {
    const { baseUrl, model, apiKey } = config;
    const cleanUrl = baseUrl || 'http://localhost:4000/v1';
    
    if (!jdText) {
        return { score: 0, matched: [], missing: [], suggestions: [] };
    }

    const cleanedResume = getCleanedResume(resumeData);
    const prompt = getPromptText(cleanedResume, jdText);

    // Call OpenAI compatible chat completions
    const url = cleanUrl.endsWith('/') ? `${cleanUrl}chat/completions` : `${cleanUrl}/chat/completions`;
    
    const headers = {
        'Content-Type': 'application/json'
    };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a professional ATS resume optimizer. Respond only in clean JSON matching the requested schema." },
                { role: "user", content: prompt }
            ]
        })
    });

    if (!response.ok) {
        let errMsg = 'Failed to query LiteLLM API.';
        try {
            const err = await response.json();
            errMsg = err.error?.message || err.message || errMsg;
        } catch {}
        throw new Error(errMsg);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content;
    
    if (!responseText) {
        throw new Error('Empty response from LiteLLM.');
    }

    try {
        const result = JSON.parse(responseText.trim());
        return {
            score: typeof result.score === 'number' ? result.score : 0,
            matched: Array.isArray(result.matched) ? result.matched : [],
            missing: Array.isArray(result.missing) ? result.missing : [],
            suggestions: Array.isArray(result.suggestions) ? result.suggestions : []
        };
    } catch (e) {
        console.error('Failed to parse LiteLLM JSON output. Raw output:', responseText);
        throw new Error('AI response format was invalid.');
    }
}

/**
 * Test connectivity for either Google Gemini or LiteLLM endpoints.
 */
export async function testLLMConnection(config) {
    if (config.provider === 'litellm') {
        const { baseUrl, model, apiKey } = config;
        const cleanUrl = baseUrl || 'http://localhost:4000/v1';
        const url = cleanUrl.endsWith('/') ? `${cleanUrl}chat/completions` : `${cleanUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: "user", content: "ping" }
                ],
                max_tokens: 5
            })
        });

        if (!response.ok) {
            let errMsg = 'Failed to query LiteLLM API.';
            try {
                const err = await response.json();
                errMsg = err.error?.message || err.message || errMsg;
            } catch {}
            throw new Error(errMsg);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Empty response from LiteLLM.');
        }
        return 'Connection successful! Received reply from model.';
    } else {
        // Gemini
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error('Missing Gemini API Key.');
        }
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: "ping"
                    }]
                }]
            })
        });

        if (!response.ok) {
            let errMsg = 'Failed to query Gemini API.';
            try {
                const err = await response.json();
                errMsg = err.error?.message || err.message || errMsg;
            } catch {}
            throw new Error(errMsg);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error('Empty response from Gemini API.');
        }
        return 'Connection successful! Received reply from Gemini.';
    }
}

/**
 * Request LLM to rewrite a segment of text based on instructions and target JD.
 */
export async function rewriteTextLLM(text, instructions, jdText, config) {
    const prompt = `You are a professional resume writer and career coach.
Your task is to rewrite or improve the following segment of a resume.

Current Segment Text:
${text}

User Instructions:
${instructions || 'Improve the grammar, impact, and professionalism of the text, making it punchy and action-oriented.'}

Target Job Description (if applicable, use to align keywords and experience):
${jdText || '(No target job description provided)'}

You MUST return ONLY the rewritten text segment.
- Do NOT include any quotes around the text.
- Do NOT include any explanations, markdown headers, introduction, or notes.
- Do NOT state what changes you made.
- Keep the same formatting (e.g., keep bullet points if the input had bullet points).
`;

    if (config.provider === 'litellm') {
        const { baseUrl, model, apiKey } = config;
        const cleanUrl = baseUrl || 'http://localhost:4000/v1';
        const url = cleanUrl.endsWith('/') ? `${cleanUrl}chat/completions` : `${cleanUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: "You are a professional resume rewriter. Respond only with the rewritten segment text." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            let errMsg = 'Failed to query LiteLLM API.';
            try {
                const err = await response.json();
                errMsg = err.error?.message || err.message || errMsg;
            } catch {}
            throw new Error(errMsg);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error('Empty response from LiteLLM.');
        }
        return responseText.trim();
    } else {
        // Gemini
        const apiKey = config.apiKey;
        if (!apiKey) {
            throw new Error('Missing Gemini API Key.');
        }
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            let errMsg = 'Failed to query Gemini API.';
            try {
                const err = await response.json();
                errMsg = err.error?.message || err.message || errMsg;
            } catch {}
            throw new Error(errMsg);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error('Empty response from Gemini API.');
        }
        return responseText.trim();
    }
}
