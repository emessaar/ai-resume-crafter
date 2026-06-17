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
