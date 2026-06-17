/**
 * Resume Templates and Render Compiler
 */

export const BUILTIN_TEMPLATES = {
    modern: {
        id: 'modern',
        name: 'Modern Professional',
        cssClass: 'template-modern',
        layout: 'single-column',
        defaults: {
            primaryColor: '#1e293b',
            secondaryColor: '#4f46e5',
            textColor: '#334155',
            backgroundColor: '#ffffff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.4',
            margins: '0.75in'
        }
    },
    minimal: {
        id: 'minimal',
        name: 'Minimalist Elegance',
        cssClass: 'template-minimal',
        layout: 'single-column',
        defaults: {
            primaryColor: '#0f172a',
            secondaryColor: '#2563eb',
            textColor: '#334155',
            backgroundColor: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '10.5pt',
            lineHeight: '1.35',
            margins: '0.6in'
        }
    },
    split: {
        id: 'split',
        name: 'Split Columns (Left Bar)',
        cssClass: 'template-split',
        layout: 'split',
        defaults: {
            primaryColor: '#0f172a',
            secondaryColor: '#6366f1',
            textColor: '#334155',
            backgroundColor: '#ffffff',
            fontFamily: "'Outfit', sans-serif",
            fontSize: '11pt',
            lineHeight: '1.4',
            margins: '0.75in'
        }
    }
};

/**
 * Apply template visual style custom properties to the preview sheet DOM element.
 */
export function applyStyleVariables(element, styles) {
    if (!element) return;
    element.style.setProperty('--preview-primary-color', styles.primaryColor || '#1e293b');
    element.style.setProperty('--preview-secondary-color', styles.secondaryColor || '#4f46e5');
    element.style.setProperty('--preview-text-color', styles.textColor || '#334155');
    element.style.setProperty('--preview-bg-color', styles.backgroundColor || '#ffffff');
    element.style.setProperty('--preview-font-family', styles.fontFamily || 'Inter, sans-serif');
    element.style.setProperty('--preview-font-size', styles.fontSize || '11pt');
    element.style.setProperty('--preview-line-height', styles.lineHeight || '1.4');
    element.style.setProperty('--preview-margin', styles.margins || '0.75in');
}

/**
 * Compile resume data into raw HTML based on layout templates and section ordering.
 */
export function compileResumeHtml(resumeData, templateId, sectionOrder = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications']) {
    const { personalInfo, experience = [], education = [], skills = [], projects = [], certifications = [] } = resumeData;
    const template = BUILTIN_TEMPLATES[templateId] || BUILTIN_TEMPLATES.modern;

    // Helper: format dates nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    // Sub-compilers for sections
    const renderHeader = () => `
        <div class="resume-preview-header">
            <h1>${personalInfo.fullName || 'Your Name'}</h1>
            <div class="resume-preview-contacts">
                ${personalInfo.email ? `<span><i data-lucide="mail" style="width:12px;height:12px;"></i> ${personalInfo.email}</span>` : ''}
                ${personalInfo.phone ? `<span><i data-lucide="phone" style="width:12px;height:12px;"></i> ${personalInfo.phone}</span>` : ''}
                ${personalInfo.location ? `<span><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${personalInfo.location}</span>` : ''}
                ${personalInfo.website ? `<span><i data-lucide="globe" style="width:12px;height:12px;"></i> <a href="${personalInfo.website}" target="_blank">${personalInfo.website.replace(/^https?:\/\//, '')}</a></span>` : ''}
                ${personalInfo.linkedin ? `<span><i data-lucide="linkedin" style="width:12px;height:12px;"></i> <a href="${personalInfo.linkedin}" target="_blank">LinkedIn</a></span>` : ''}
                ${personalInfo.github ? `<span><i data-lucide="github" style="width:12px;height:12px;"></i> <a href="${personalInfo.github}" target="_blank">GitHub</a></span>` : ''}
            </div>
        </div>
    `;

    const renderSection = (secKey) => {
        switch (secKey) {
            case 'summary':
                if (!personalInfo.summary) return '';
                return `
                    <div class="resume-preview-section resume-preview-summary">
                        <h2>Professional Summary</h2>
                        <p>${personalInfo.summary}</p>
                    </div>
                `;
            case 'experience':
                if (experience.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-experience">
                        <h2>Professional Experience</h2>
                        ${experience.map(exp => `
                            <div class="resume-preview-item">
                                <div class="resume-preview-item-header">
                                    <span class="resume-preview-item-company">${exp.company}</span>
                                    <span class="resume-preview-item-location">${exp.location || ''}</span>
                                </div>
                                <div class="resume-preview-item-sub">
                                    <span>${exp.position}</span>
                                    <span>${formatDate(exp.startDate)} &ndash; ${exp.current ? 'Present' : formatDate(exp.endDate)}</span>
                                </div>
                                <div class="resume-preview-item-desc">
                                    ${window.marked ? window.marked.parse(exp.description || '') : exp.description}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'education':
                if (education.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-education">
                        <h2>Education</h2>
                        ${education.map(edu => `
                            <div class="resume-preview-item">
                                <div class="resume-preview-item-header">
                                    <span class="resume-preview-item-company">${edu.school}</span>
                                    <span class="resume-preview-item-location">${edu.location || ''}</span>
                                </div>
                                <div class="resume-preview-item-sub">
                                    <span>${edu.degree} in ${edu.fieldOfStudy}</span>
                                    <span>${formatDate(edu.startDate)} &ndash; ${formatDate(edu.endDate)}</span>
                                </div>
                                ${edu.description ? `<div class="resume-preview-item-desc">${window.marked ? window.marked.parse(edu.description) : edu.description}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'skills':
                if (skills.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-skills">
                        <h2>Skills & Expertise</h2>
                        <div class="resume-preview-skills-list">
                            <strong>Technical Skills:</strong> ${skills.join(', ')}
                        </div>
                    </div>
                `;
            case 'projects':
                if (projects.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-projects">
                        <h2>Key Projects</h2>
                        ${projects.map(proj => `
                            <div class="resume-preview-item">
                                <div class="resume-preview-item-header">
                                    <span class="resume-preview-item-company">${proj.name}</span>
                                    <span>${proj.link ? `<a href="${proj.link}" target="_blank" style="font-size: 9pt; font-weight: normal;"><i data-lucide="link" style="width:10px;height:10px;vertical-align:middle;"></i> Project Link</a>` : ''}</span>
                                </div>
                                <div class="resume-preview-item-sub">
                                    <span>${proj.role || 'Contributor'}</span>
                                    <span>${formatDate(proj.startDate)} &ndash; ${formatDate(proj.endDate)}</span>
                                </div>
                                <div class="resume-preview-item-desc">
                                    ${window.marked ? window.marked.parse(proj.description || '') : proj.description}
                                    ${proj.technologies && proj.technologies.length > 0 ? `<div style="margin-top:0.25rem;font-size:9pt;color:#475569;"><strong>Tech Stack:</strong> ${proj.technologies.join(', ')}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'certifications':
                if (certifications.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-certifications">
                        <h2>Certifications</h2>
                        <div class="resume-preview-skills-list">
                            ${certifications.join(' &bull; ')}
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    };

    // Render logic by template layouts
    if (template.layout === 'split') {
        // Render split layout: Left side columns (personal, contacts, skills, certifications, education)
        // Right side columns (summary, experience, projects)
        const leftSections = ['skills', 'certifications', 'education'];
        const rightSections = ['summary', 'experience', 'projects'];

        const leftColContent = leftSections
            .filter(sec => sectionOrder.includes(sec))
            .map(sec => renderSection(sec))
            .join('');

        const rightColContent = rightSections
            .filter(sec => sectionOrder.includes(sec))
            .map(sec => renderSection(sec))
            .join('');

        return `
            <div class="split-sidebar">
                <div class="resume-preview-header" style="text-align: left; border-bottom: none; margin-bottom: 1.5rem;">
                    <h1 style="font-size: 18pt; line-height: 1.2;">${personalInfo.fullName || 'Your Name'}</h1>
                    <div class="resume-preview-contacts" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; margin-top: 1rem; font-size: 8.5pt;">
                        ${personalInfo.email ? `<span><i data-lucide="mail" style="width:10px;height:10px;"></i> ${personalInfo.email}</span>` : ''}
                        ${personalInfo.phone ? `<span><i data-lucide="phone" style="width:10px;height:10px;"></i> ${personalInfo.phone}</span>` : ''}
                        ${personalInfo.location ? `<span><i data-lucide="map-pin" style="width:10px;height:10px;"></i> ${personalInfo.location}</span>` : ''}
                        ${personalInfo.website ? `<span><i data-lucide="globe" style="width:10px;height:10px;"></i> <a href="${personalInfo.website}" target="_blank">Website</a></span>` : ''}
                        ${personalInfo.linkedin ? `<span><i data-lucide="linkedin" style="width:10px;height:10px;"></i> <a href="${personalInfo.linkedin}" target="_blank">LinkedIn</a></span>` : ''}
                        ${personalInfo.github ? `<span><i data-lucide="github" style="width:10px;height:10px;"></i> <a href="${personalInfo.github}" target="_blank">GitHub</a></span>` : ''}
                    </div>
                </div>
                ${leftColContent}
            </div>
            <div class="split-main">
                ${rightColContent}
            </div>
        `;
    } else {
        // Render single column layout
        const mainContent = sectionOrder.map(sec => renderSection(sec)).join('');
        return `
            ${renderHeader()}
            ${mainContent}
        `;
    }
}

/**
 * Compile resume data into fully resolved standalone HTML designed specifically for Google Docs import.
 * This converts grid columns into standard HTML tables, resolves CSS variables to explicit styles,
 * and strips/replaces SVG icons with Google-doc-compatible Unicode characters.
 */
export function compileGoogleDocHtml(resumeData, templateId, sectionOrder = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'], styles = {}) {
    const { personalInfo, experience = [], education = [], skills = [], projects = [], certifications = [] } = resumeData;

    // Helper: format dates nicely
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const primaryColor = styles.primaryColor || '#1e293b';
    const secondaryColor = styles.secondaryColor || '#4f46e5';
    const textColor = styles.textColor || '#334155';
    const backgroundColor = styles.backgroundColor || '#ffffff';
    const fontFamily = styles.fontFamily || 'Inter, sans-serif';
    const fontSize = styles.fontSize || '11pt';
    const lineHeight = styles.lineHeight || '1.4';
    const margins = styles.margins || '0.75in';

    // Simple markdown compiler fallback if marked is not available
    const parseMarkdown = (text) => {
        if (!text) return '';
        if (window.marked && window.marked.parse) {
            return window.marked.parse(text);
        }
        // Basic fallback replacements for bold, italic, and lists
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\r?\n/g, '<br>');
        return html;
    };

    // Sub-compilers for Google Doc format
    const renderHeader = () => `
        <div class="resume-preview-header" style="border-bottom: 2px solid ${primaryColor}; padding-bottom: 0.5rem; margin-bottom: 1.5rem; text-align: center;">
            <h1 style="color: ${primaryColor}; font-size: 24pt; margin: 0 0 0.5rem 0; font-family: ${fontFamily};">${personalInfo.fullName || 'Your Name'}</h1>
            <div class="resume-preview-contacts" style="text-align: center; font-size: 9pt; font-family: ${fontFamily}; margin-bottom: 1rem; color: ${textColor};">
                ${personalInfo.email ? `<span style="margin: 0 10px; display: inline-block;">✉ ${personalInfo.email}</span>` : ''}
                ${personalInfo.phone ? `<span style="margin: 0 10px; display: inline-block;">📞 ${personalInfo.phone}</span>` : ''}
                ${personalInfo.location ? `<span style="margin: 0 10px; display: inline-block;">📍 ${personalInfo.location}</span>` : ''}
                ${personalInfo.website ? `<span style="margin: 0 10px; display: inline-block;">🌐 <a href="${personalInfo.website}" style="color: ${secondaryColor}; text-decoration: none;">${personalInfo.website.replace(/^https?:\/\//, '')}</a></span>` : ''}
                ${personalInfo.linkedin ? `<span style="margin: 0 10px; display: inline-block;">🔗 <a href="${personalInfo.linkedin}" style="color: ${secondaryColor}; text-decoration: none;">LinkedIn</a></span>` : ''}
                ${personalInfo.github ? `<span style="margin: 0 10px; display: inline-block;">💻 <a href="${personalInfo.github}" style="color: ${secondaryColor}; text-decoration: none;">GitHub</a></span>` : ''}
            </div>
        </div>
    `;

    const renderSection = (secKey) => {
        switch (secKey) {
            case 'summary':
                if (!personalInfo.summary) return '';
                return `
                    <div class="resume-preview-section resume-preview-summary" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Professional Summary</h2>
                        <p style="margin: 0; line-height: ${lineHeight}; color: ${textColor}; font-family: ${fontFamily};">${personalInfo.summary}</p>
                    </div>
                `;
            case 'experience':
                if (experience.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-experience" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Professional Experience</h2>
                        ${experience.map(exp => `
                            <div class="resume-preview-item" style="margin-bottom: 1rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 11pt; font-family: ${fontFamily}; font-weight: bold; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; color: ${secondaryColor}; padding: 0;">${exp.company}</td>
                                        <td style="text-align: right; font-weight: normal; color: ${textColor}; padding: 0;">${exp.location || ''}</td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; font-family: ${fontFamily}; font-style: italic; margin-bottom: 0.25rem; color: ${textColor};">
                                    <tr>
                                        <td style="text-align: left; padding: 0;">${exp.position}</td>
                                        <td style="text-align: right; padding: 0;">${formatDate(exp.startDate)} &ndash; ${exp.current ? 'Present' : formatDate(exp.endDate)}</td>
                                    </tr>
                                </table>
                                <div class="resume-preview-item-desc" style="font-size: 10pt; line-height: ${lineHeight}; color: ${textColor}; font-family: ${fontFamily};">
                                    ${parseMarkdown(exp.description || '')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'education':
                if (education.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-education" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Education</h2>
                        ${education.map(edu => `
                            <div class="resume-preview-item" style="margin-bottom: 1rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 11pt; font-family: ${fontFamily}; font-weight: bold; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; color: ${secondaryColor}; padding: 0;">${edu.school}</td>
                                        <td style="text-align: right; font-weight: normal; color: ${textColor}; padding: 0;">${edu.location || ''}</td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; font-family: ${fontFamily}; font-style: italic; margin-bottom: 0.25rem; color: ${textColor};">
                                    <tr>
                                        <td style="text-align: left; padding: 0;">${edu.degree} in ${edu.fieldOfStudy}</td>
                                        <td style="text-align: right; padding: 0;">${formatDate(edu.startDate)} &ndash; ${formatDate(edu.endDate)}</td>
                                    </tr>
                                </table>
                                ${edu.description ? `<div class="resume-preview-item-desc" style="font-size: 10pt; line-height: ${lineHeight}; color: ${textColor}; font-family: ${fontFamily};">${parseMarkdown(edu.description)}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'skills':
                if (skills.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-skills" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Skills & Expertise</h2>
                        <div class="resume-preview-skills-list" style="font-size: 10pt; line-height: 1.6; color: ${textColor}; font-family: ${fontFamily};">
                            <strong>Technical Skills:</strong> ${skills.join(', ')}
                        </div>
                    </div>
                `;
            case 'projects':
                if (projects.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-projects" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Key Projects</h2>
                        ${projects.map(proj => `
                            <div class="resume-preview-item" style="margin-bottom: 1rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 11pt; font-family: ${fontFamily}; font-weight: bold; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; color: ${secondaryColor}; padding: 0;">${proj.name}</td>
                                        <td style="text-align: right; padding: 0;">
                                            ${proj.link ? `<a href="${proj.link}" style="font-size: 9pt; font-weight: normal; color: ${secondaryColor}; text-decoration: none;">🔗 Project Link</a>` : ''}
                                        </td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-size: 10pt; font-family: ${fontFamily}; font-style: italic; margin-bottom: 0.25rem; color: ${textColor};">
                                    <tr>
                                        <td style="text-align: left; padding: 0;">${proj.role || 'Contributor'}</td>
                                        <td style="text-align: right; padding: 0;">${formatDate(proj.startDate)} &ndash; ${formatDate(proj.endDate)}</td>
                                    </tr>
                                </table>
                                <div class="resume-preview-item-desc" style="font-size: 10pt; line-height: ${lineHeight}; color: ${textColor}; font-family: ${fontFamily};">
                                    ${parseMarkdown(proj.description || '')}
                                    ${proj.technologies && proj.technologies.length > 0 ? `<div style="margin-top:0.25rem;font-size:9pt;color:#475569;"><strong>Tech Stack:</strong> ${proj.technologies.join(', ')}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'certifications':
                if (certifications.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-certifications" style="margin-bottom: 1.5rem;">
                        <h2 style="color: ${primaryColor}; font-size: 13pt; border-bottom: 1px solid ${primaryColor}; padding-bottom: 3px; margin-top: 0; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-family: ${fontFamily};">Certifications</h2>
                        <div class="resume-preview-skills-list" style="font-size: 10pt; line-height: 1.6; color: ${textColor}; font-family: ${fontFamily};">
                            ${certifications.join(' &bull; ')}
                        </div>
                    </div>
                `;
            default:
                return '';
        }
    };

    // Body content builder
    let bodyContent = '';
    if (templateId === 'split') {
        const leftSections = ['skills', 'certifications', 'education'];
        const rightSections = ['summary', 'experience', 'projects'];

        const leftColContent = leftSections
            .filter(sec => sectionOrder.includes(sec))
            .map(sec => renderSection(sec))
            .join('');

        const rightColContent = rightSections
            .filter(sec => sectionOrder.includes(sec))
            .map(sec => renderSection(sec))
            .join('');

        bodyContent = `
            <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; table-layout: fixed;">
                <tr>
                    <td style="width: 32%; vertical-align: top; background-color: #f8fafc; border-right: 1px solid #e2e8f0; padding: 0 20px 0 0;">
                        <div class="resume-preview-header" style="text-align: left; border-bottom: none; margin-bottom: 1.5rem; padding-bottom: 0;">
                            <h1 style="color: ${primaryColor}; font-size: 18pt; line-height: 1.2; margin: 0 0 1rem 0; font-family: ${fontFamily};">${personalInfo.fullName || 'Your Name'}</h1>
                            <div class="resume-preview-contacts" style="text-align: left; font-size: 8.5pt; color: ${textColor}; line-height: 1.4; margin-bottom: 1rem;">
                                ${personalInfo.email ? `<div style="margin-bottom: 0.25rem;">✉ ${personalInfo.email}</div>` : ''}
                                ${personalInfo.phone ? `<div style="margin-bottom: 0.25rem;">📞 ${personalInfo.phone}</div>` : ''}
                                ${personalInfo.location ? `<div style="margin-bottom: 0.25rem;">📍 ${personalInfo.location}</div>` : ''}
                                ${personalInfo.website ? `<div style="margin-bottom: 0.25rem;">🌐 <a href="${personalInfo.website}" style="color: ${secondaryColor}; text-decoration: none;">Website</a></div>` : ''}
                                ${personalInfo.linkedin ? `<div style="margin-bottom: 0.25rem;">🔗 <a href="${personalInfo.linkedin}" style="color: ${secondaryColor}; text-decoration: none;">LinkedIn</a></div>` : ''}
                                ${personalInfo.github ? `<div style="margin-bottom: 0.25rem;">💻 <a href="${personalInfo.github}" style="color: ${secondaryColor}; text-decoration: none;">GitHub</a></div>` : ''}
                            </div>
                        </div>
                        ${leftColContent}
                    </td>
                    <td style="width: 68%; vertical-align: top; padding: 0 0 0 25px;">
                        ${rightColContent}
                    </td>
                </tr>
            </table>
        `;
    } else {
        // Stacked single column layout
        const mainContent = sectionOrder.map(sec => renderSection(sec)).join('');
        bodyContent = `
            ${renderHeader()}
            ${mainContent}
        `;
    }

    // Wrap in standard full HTML template document
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${personalInfo.fullName || 'Resume'}</title>
    <style>
        body {
            background-color: ${backgroundColor};
            color: ${textColor};
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: ${lineHeight};
            margin: 0;
            padding: 0;
        }
        .resume-sheet {
            background-color: ${backgroundColor};
            color: ${textColor};
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: ${lineHeight};
            padding: ${margins};
        }
        strong {
            color: ${primaryColor};
        }
    </style>
</head>
<body>
    <div class="resume-sheet template-${templateId}">
        ${bodyContent}
    </div>
</body>
</html>`;
}

