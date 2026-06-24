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
            primaryColor: '#111827',
            secondaryColor: '#374151',
            textColor: '#4b5563',
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
            primaryColor: '#1f2937',
            secondaryColor: '#4b5563',
            textColor: '#525252',
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
            primaryColor: '#111827',
            secondaryColor: '#374151',
            textColor: '#4b5563',
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
    element.style.setProperty('--preview-primary-color', styles.primaryColor || '#111827');
    element.style.setProperty('--preview-secondary-color', styles.secondaryColor || '#374151');
    element.style.setProperty('--preview-text-color', styles.textColor || '#4b5563');
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

    // Helper: format date range nicely without stray hyphens
    const formatDateRange = (start, end, isCurrent) => {
        const formattedStart = formatDate(start);
        const formattedEnd = isCurrent ? 'Present' : formatDate(end);
        
        if (formattedStart && formattedEnd) {
            return `${formattedStart} – ${formattedEnd}`;
        } else if (formattedStart) {
            return formattedStart;
        } else if (formattedEnd) {
            return formattedEnd;
        }
        return '';
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
            ${personalInfo.customSubline ? `
            <div class="resume-preview-custom-subline" style="margin-top: 0.5rem; font-size: 9.5pt; text-align: center; color: var(--preview-text-color); font-weight: 500;">
                ${personalInfo.customSubline}
            </div>` : ''}
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
                                    <span>${formatDateRange(exp.startDate, exp.endDate, exp.current)}</span>
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
                                    <span>${formatDateRange(edu.startDate, edu.endDate)}</span>
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
                                    <span>${formatDateRange(proj.startDate, proj.endDate)}</span>
                                </div>
                                <div class="resume-preview-item-desc">
                                    ${window.marked ? window.marked.parse(proj.description || '') : proj.description}
                                    ${proj.technologies && proj.technologies.length > 0 ? `<div style="margin-top:0.25rem;font-size:9pt;color:#555555;"><strong>Tech Stack:</strong> ${proj.technologies.join(', ')}</div>` : ''}
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
                    ${personalInfo.customSubline ? `
                    <div class="resume-preview-custom-subline" style="margin-top: 0.5rem; font-size: 8.5pt; color: var(--preview-text-color); font-weight: 500; text-align: left;">
                        ${personalInfo.customSubline}
                    </div>` : ''}
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

    // Helper: format date range nicely without stray hyphens
    const formatDateRange = (start, end, isCurrent) => {
        const formattedStart = formatDate(start);
        const formattedEnd = isCurrent ? 'Present' : formatDate(end);
        
        if (formattedStart && formattedEnd) {
            return `${formattedStart} – ${formattedEnd}`;
        } else if (formattedStart) {
            return formattedStart;
        } else if (formattedEnd) {
            return formattedEnd;
        }
        return '';
    };

    const primaryColor = styles.primaryColor || '#111827';
    const secondaryColor = styles.secondaryColor || '#374151';
    const textColor = styles.textColor || '#4b5563';
    const backgroundColor = styles.backgroundColor || '#ffffff';
    const fontFamily = styles.fontFamily || 'Inter, sans-serif';
    const fontSize = styles.fontSize || '11pt';
    const lineHeight = styles.lineHeight || '1.4';

    // Simple markdown compiler fallback if marked is not available
    const parseMarkdown = (text) => {
        if (!text) return '';
        let parsed = '';
        if (window.marked && window.marked.parse) {
            parsed = window.marked.parse(text);
        } else {
            // Basic fallback replacements for bold, italic, and lists
            parsed = text
                .replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\r?\n/g, '<br>');
        }
        
        // Wrap any generated list items and paragraphs in inline styled span tags for Google Docs style preservation
        return parsed
            .replace(/<ul>/g, `<ul style="margin: 0 0 0.5rem 0; padding-left: 20px; font-family: ${fontFamily}; font-size: 10pt; color: ${textColor};">`)
            .replace(/<\/ul>/g, `</ul>`)
            .replace(/<ol>/g, `<ol style="margin: 0 0 0.5rem 0; padding-left: 20px; font-family: ${fontFamily}; font-size: 10pt; color: ${textColor};">`)
            .replace(/<\/ol>/g, `</ol>`)
            .replace(/<li>/g, `<li style="margin-bottom: 0.25rem; font-family: ${fontFamily}; font-size: 10pt; color: ${textColor};"><span style="font-family: ${fontFamily}; font-size: 10pt; color: ${textColor};">`)
            .replace(/<\/li>/g, `</span></li>`)
            .replace(/<p>/g, `<p style="margin: 0 0 0.25rem 0; font-family: ${fontFamily}; font-size: 10pt; color: ${textColor}; line-height: ${lineHeight};"><span style="font-family: ${fontFamily}; font-size: 10pt; color: ${textColor};">`)
            .replace(/<\/p>/g, `</span></p>`);
    };

    // Sub-compilers for Google Doc format
    const renderHeader = () => {
        const contactItems = [
            personalInfo.email ? `✉ ${personalInfo.email}` : null,
            personalInfo.phone ? `📞 ${personalInfo.phone}` : null,
            personalInfo.location ? `📍 ${personalInfo.location}` : null,
            personalInfo.website ? `🌐 <a href="${personalInfo.website}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none; font-family: ${fontFamily}; font-size: 9.5pt;">${personalInfo.website.replace(/^https?:\/\//, '')}</span></a>` : null,
            personalInfo.linkedin ? `🔗 <a href="${personalInfo.linkedin}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none; font-family: ${fontFamily}; font-size: 9.5pt;">LinkedIn</span></a>` : null,
            personalInfo.github ? `💻 <a href="${personalInfo.github}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none; font-family: ${fontFamily}; font-size: 9.5pt;">GitHub</span></a>` : null
        ].filter(Boolean);

        return `
            <div class="resume-preview-header" style="border-bottom: 2px solid ${primaryColor}; padding-bottom: 0.5rem; margin-bottom: 1.5rem; text-align: center;">
                <h1 style="margin: 0 0 0.5rem 0; line-height: 1.1; text-align: center;">
                    <span style="color: ${primaryColor}; font-size: 26pt; font-weight: bold; font-family: ${fontFamily};">${personalInfo.fullName || 'Your Name'}</span>
                </h1>
                <p style="text-align: center; margin: 0 0 1rem 0; font-family: ${fontFamily}; font-size: 9.5pt; color: ${textColor}; line-height: 1.4;">
                    <span style="font-family: ${fontFamily}; font-size: 9.5pt; color: ${textColor};">
                        ${contactItems.join('   |   ')}
                    </span>
                </p>
                ${personalInfo.customSubline ? `
                <p style="text-align: center; margin: 0 0 1rem 0; font-family: ${fontFamily}; font-size: 9.5pt; color: ${textColor}; line-height: 1.4; font-weight: bold;">
                    <span style="font-family: ${fontFamily}; font-size: 9.5pt; color: ${textColor}; font-weight: bold;">${personalInfo.customSubline}</span>
                </p>` : ''}
            </div>
        `;
    };

    const renderSection = (secKey) => {
        switch (secKey) {
            case 'summary':
                if (!personalInfo.summary) return '';
                return `
                    <div class="resume-preview-section resume-preview-summary" style="margin-bottom: 1.5rem;">
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Professional Summary</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        <p style="margin: 0; line-height: ${lineHeight};">
                            <span style="font-size: 10pt; color: ${textColor}; font-family: ${fontFamily};">${personalInfo.summary}</span>
                        </p>
                    </div>
                `;
            case 'experience':
                if (experience.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-experience" style="margin-bottom: 1.5rem;">
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Professional Experience</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        ${experience.map(exp => `
                            <div class="resume-preview-item" style="margin-bottom: 1.25rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${secondaryColor}; font-size: 11.5pt; font-weight: bold; font-family: ${fontFamily};">${exp.company}</span></td>
                                        <td style="text-align: right; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-family: ${fontFamily};">${exp.location || ''}</span></td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.25rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-weight: bold; font-style: italic; font-family: ${fontFamily};">${exp.position}</span></td>
                                        <td style="text-align: right; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-style: italic; font-family: ${fontFamily};">${formatDateRange(exp.startDate, exp.endDate, exp.current)}</span></td>
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
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Education</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        ${education.map(edu => `
                            <div class="resume-preview-item" style="margin-bottom: 1.25rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${secondaryColor}; font-size: 11.5pt; font-weight: bold; font-family: ${fontFamily};">${edu.school}</span></td>
                                        <td style="text-align: right; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-family: ${fontFamily};">${edu.location || ''}</span></td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.25rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-weight: bold; font-style: italic; font-family: ${fontFamily};">${edu.degree} in ${edu.fieldOfStudy}</span></td>
                                        <td style="text-align: right; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-style: italic; font-family: ${fontFamily};">${formatDateRange(edu.startDate, edu.endDate)}</span></td>
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
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Skills & Expertise</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        <p style="margin: 0; line-height: 1.4;">
                            <span style="font-size: 10pt; font-family: ${fontFamily}; color: ${textColor};"><strong>Technical Skills:</strong> ${skills.join(', ')}</span>
                        </p>
                    </div>
                `;
            case 'projects':
                if (projects.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-projects" style="margin-bottom: 1.5rem;">
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Key Projects</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        ${projects.map(proj => `
                            <div class="resume-preview-item" style="margin-bottom: 1.25rem;">
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.15rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${secondaryColor}; font-size: 11.5pt; font-weight: bold; font-family: ${fontFamily};">${proj.name}</span></td>
                                        <td style="text-align: right; padding: 0;">
                                            ${proj.link ? `<a href="${proj.link}" style="color: ${secondaryColor}; text-decoration: none;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${secondaryColor};">🔗 Project Link</span></a>` : ''}
                                        </td>
                                    </tr>
                                </table>
                                <table style="width: 100%; border-collapse: collapse; border: none; font-family: ${fontFamily}; margin-bottom: 0.25rem;">
                                    <tr>
                                        <td style="text-align: left; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-weight: bold; font-style: italic; font-family: ${fontFamily};">${proj.role || 'Contributor'}</span></td>
                                        <td style="text-align: right; padding: 0;"><span style="color: ${textColor}; font-size: 10pt; font-style: italic; font-family: ${fontFamily};">${formatDateRange(proj.startDate, proj.endDate)}</span></td>
                                    </tr>
                                </table>
                                <div class="resume-preview-item-desc" style="font-size: 10pt; line-height: ${lineHeight}; color: ${textColor}; font-family: ${fontFamily};">
                                    ${parseMarkdown(proj.description || '')}
                                    ${proj.technologies && proj.technologies.length > 0 ? `<p style="margin: 0.25rem 0 0 0;"><span style="font-size: 9pt; color: #555555; font-family: ${fontFamily};"><strong>Tech Stack:</strong> ${proj.technologies.join(', ')}</span></p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            case 'certifications':
                if (certifications.length === 0) return '';
                return `
                    <div class="resume-preview-section resume-preview-certifications" style="margin-bottom: 1.5rem;">
                        <h2 style="margin-top: 1.5rem; margin-bottom: 0.25rem;">
                            <span style="color: ${primaryColor}; font-size: 14pt; font-weight: bold; font-family: ${fontFamily}; text-transform: uppercase; letter-spacing: 0.5px;">Certifications</span>
                        </h2>
                        <hr style="border: none; border-top: 1px solid ${primaryColor}; margin-top: 2px; margin-bottom: 8px;" />
                        <p style="margin: 0; line-height: 1.4;">
                            <span style="font-size: 10pt; font-family: ${fontFamily}; color: ${textColor};">${certifications.join('  •  ')}</span>
                        </p>
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
                    <td style="width: 30%; vertical-align: top; background-color: #f5f5f5; border-right: 1px solid #e0e0e0; padding: 10px 10px 10px 10px;">
                        <div class="resume-preview-header" style="text-align: left; border-bottom: none; margin-bottom: 1.5rem; padding-bottom: 0;">
                            <h1 style="margin: 0 0 1rem 0; line-height: 1.2;">
                                <span style="color: ${primaryColor}; font-size: 22pt; font-weight: bold; font-family: ${fontFamily};">${personalInfo.fullName || 'Your Name'}</span>
                            </h1>
                            <div class="resume-preview-contacts" style="margin-bottom: 1rem;">
                                ${personalInfo.email ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">✉ ${personalInfo.email}</span></p>` : ''}
                                ${personalInfo.phone ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">📞 ${personalInfo.phone}</span></p>` : ''}
                                ${personalInfo.location ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">📍 ${personalInfo.location}</span></p>` : ''}
                                ${personalInfo.website ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">🌐 <a href="${personalInfo.website}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none;">Website</span></a></span></p>` : ''}
                                ${personalInfo.linkedin ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">🔗 <a href="${personalInfo.linkedin}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none;">LinkedIn</span></a></span></p>` : ''}
                                ${personalInfo.github ? `<p style="margin: 0 0 0.25rem 0; line-height: 1.4;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor};">💻 <a href="${personalInfo.github}" style="color: ${secondaryColor}; text-decoration: none;"><span style="color: ${secondaryColor}; text-decoration: none;">GitHub</span></a></span></p>` : ''}
                            </div>
                            ${personalInfo.customSubline ? `<p style="margin: 0.5rem 0 0.25rem 0; line-height: 1.4; font-weight: bold;"><span style="font-size: 9pt; font-family: ${fontFamily}; color: ${textColor}; font-weight: bold;">${personalInfo.customSubline}</span></p>` : ''}
                        </div>
                        ${leftColContent}
                    </td>
                    <td style="width: 3%; min-width: 15px; vertical-align: top; padding: 0;"></td>
                    <td style="width: 67%; vertical-align: top; padding: 10px 0 0 0;">
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
            padding: 0; /* Google Docs will apply its own page margins */
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

