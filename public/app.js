import { 
    db, 
    getMasterResume, 
    saveMasterResume, 
    getSetting, 
    saveSetting 
} from './db.js';
import { 
    BUILTIN_TEMPLATES, 
    applyStyleVariables, 
    compileResumeHtml,
    compileGoogleDocHtml
} from './templates.js';
import { 
    extractKeywords, 
    analyzeMatch,
    analyzeMatchLLM,
    testLLMConnection,
    rewriteTextLLM
} from './parser.js';
import { 
    initGoogleClient, 
    requestGoogleLogin, 
    logoutGoogleDrive, 
    uploadToGoogleDrive,
    uploadAsGoogleDoc
} from './gdrive.js';

// State Variables
let activeResume = null;          // Holds active resume data being edited (master or tailored snapshot)
let masterResumeId = null;        // Holds the primary ID of the master resume
let activeJobId = null;           // Database ID of selected job tracker item
let isTailoredMode = false;       // True if editing a job-specific resume version
let currentTailoredRecord = null; // Holds the active tailoredResume database entry
let activeRewriteTarget = null;   // Active target textarea for the AI rewrite modal
let templateStyles = null;        // Visual styling configuration variables
let sectionOrdering = ['summary', 'experience', 'projects', 'education', 'skills', 'certifications'];
let gdriveConnected = false;
let geminiApiKey = '';
let matcherMode = 'local';
let isLlmRunning = false;
let aiProvider = 'gemini';
let litellmBaseUrl = 'http://localhost:4000/v1';
let litellmModelName = 'ollama/llama3';
let litellmApiKey = '';

const DEFAULT_CLIENT_ID = '707905781971-5ga82j7roqbih3vrcscd5hkj696q51o4.apps.googleusercontent.com';

// DOM Element Registry
const DOM = {
    // Navigation
    tabs: document.querySelectorAll('.workspace-tab'),
    navBtns: document.querySelectorAll('.nav-btn:not(#btn-collapse-sidebar)'),
    gdriveBadge: document.getElementById('gdrive-status-badge'),
    sidebar: document.getElementById('app-sidebar'),
    btnCollapseSidebar: document.getElementById('btn-collapse-sidebar'),
    workspace: document.getElementById('app-workspace'),
    resizer: document.getElementById('workspace-preview-resizer'),
    
    // Master Forms
    inputFullName: document.getElementById('input-full-name'),
    inputEmail: document.getElementById('input-email'),
    inputPhone: document.getElementById('input-phone'),
    inputLocation: document.getElementById('input-location'),
    inputWebsite: document.getElementById('input-website'),
    inputLinkedin: document.getElementById('input-linkedin'),
    inputGithub: document.getElementById('input-github'),
    inputSummary: document.getElementById('input-summary'),
    btnAiRewriteSummary: document.getElementById('btn-ai-rewrite-summary'),
    experienceList: document.getElementById('experience-list'),
    educationList: document.getElementById('education-list'),
    projectsList: document.getElementById('projects-list'),
    btnAddExperience: document.getElementById('btn-add-experience'),
    btnAddEducation: document.getElementById('btn-add-education'),
    btnAddProject: document.getElementById('btn-add-project'),
    inputNewSkill: document.getElementById('input-new-skill'),
    btnAddSkill: document.getElementById('btn-add-skill'),
    skillsTags: document.getElementById('skills-tags'),
    inputNewCert: document.getElementById('input-new-cert'),
    btnAddCert: document.getElementById('btn-add-cert'),
    certTags: document.getElementById('cert-tags'),

    // Job Tracker Forms
    jobsContainer: document.getElementById('jobs-container'),
    btnNewJob: document.getElementById('btn-new-job'),
    jobEmptyState: document.getElementById('job-detail-empty'),
    jobEditorPanel: document.getElementById('job-detail-editor'),
    btnDeleteJob: document.getElementById('btn-delete-job'),
    jobInputTitle: document.getElementById('job-input-title'),
    jobInputCompany: document.getElementById('job-input-company'),
    jobInputStatus: document.getElementById('job-input-status'),
    jobInputUrl: document.getElementById('job-input-url'),
    btnScrapeJd: document.getElementById('btn-scrape-jd'),
    jobInputText: document.getElementById('job-input-text'),
    jobInputNotes: document.getElementById('job-input-notes'),
    
    // Tailoring banners
    btnGenerateTailored: document.getElementById('btn-generate-tailored'),
    btnEditTailored: document.getElementById('btn-edit-tailored'),
    btnResetTailored: document.getElementById('btn-reset-tailored'),

    // Template designer
    selectTemplate: document.getElementById('select-layout-template'),
    inputFontFamily: document.getElementById('input-style-font'),
    inputFontSize: document.getElementById('input-style-fontsize'),
    inputLineHeight: document.getElementById('input-style-lineheight'),
    inputMargins: document.getElementById('input-style-margin'),
    colorPickerPrimary: document.getElementById('color-style-primary'),
    colorPickerText: document.getElementById('color-style-text'),
    colorTextPrimary: document.getElementById('color-text-primary'),
    colorTextText: document.getElementById('color-text-text'),
    sectionOrderContainer: document.getElementById('section-order-container'),

    // Google Drive
    inputGdriveClientId: document.getElementById('gdrive-client-id'),
    btnGdriveLogin: document.getElementById('btn-gdrive-login'),
    btnGdriveLogout: document.getElementById('btn-gdrive-logout'),
    cloudIcon: document.getElementById('cloud-icon-state'),
    connectionHeading: document.getElementById('gdrive-connection-heading'),
    connectionDesc: document.getElementById('gdrive-connection-desc'),

    // Preview
    resumeSheet: document.getElementById('resume-preview-sheet'),
    viewport: document.getElementById('sheet-viewport'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    btnExportMd: document.getElementById('btn-export-md'),
    btnExportJson: document.getElementById('btn-export-json'),
    btnSyncGdrive: document.getElementById('btn-sync-gdrive'),
    btnSyncGdoc: document.getElementById('btn-sync-gdoc'),

    // Keyword Matcher
    jdScoreBadge: document.getElementById('jd-score-badge'),
    statMatches: document.getElementById('stat-matches'),
    statMissing: document.getElementById('stat-missing'),
    tagsMatched: document.getElementById('tags-matched'),
    tagsMissing: document.getElementById('tags-missing'),
    btnToggleDrawer: document.getElementById('btn-toggle-drawer'),
    keywordPanel: document.getElementById('keyword-panel'),
    inputGeminiApiKey: document.getElementById('gemini-api-key'),
    btnModeLocal: document.getElementById('btn-mode-local'),
    btnModeLlm: document.getElementById('btn-mode-llm'),
    aiModelBadge: document.getElementById('ai-model-badge'),
    aiSuggestionsContainer: document.getElementById('ai-suggestions-container'),
    aiSuggestionsList: document.getElementById('ai-suggestions-list'),
    selectAiProvider: document.getElementById('select-ai-provider'),
    inputLitellmBaseUrl: document.getElementById('litellm-base-url'),
    inputLitellmModelName: document.getElementById('litellm-model-name'),
    inputLitellmApiKey: document.getElementById('litellm-api-key'),
    sectionConfigGemini: document.getElementById('section-config-gemini'),
    sectionConfigLitellm: document.getElementById('section-config-litellm'),
    btnTestLlm: document.getElementById('btn-test-llm'),
    llmTestResult: document.getElementById('llm-test-result')
};

/* ==========================================================================
   PAGE TITLE HELPER
   ========================================================================== */

function updatePageTitle(name) {
    const displayName = (name || '').trim();
    document.title = displayName ? `Resume: ${displayName}` : 'Resume: ResumeCrafter';
}

/* ==========================================================================
   INITIALIZATION & SETUP
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize icons & marked configurations
    lucide.createIcons();
    if (window.marked) {
        window.marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // 2. Setup Navigation tabs
    setupNavigation();

    // 3. Load DB settings
    await loadSettings();

    // 4. Load Master Resume
    const master = await getMasterResume();
    masterResumeId = master.id;
    activeResume = master;
    updatePageTitle(master.personalInfo?.fullName);
    
    // 5. Populate Editor Forms
    populateEditorForms();

    // 6. Draw Repeater Cards
    renderExperienceList();
    renderEducationList();
    renderProjectList();
    renderSkillsTags();
    renderCertTags();

    // 7. Load Jobs Tracker
    await loadJobsList();

    // 8. Bind Accordions
    setupAccordions();

    // 9. Bind Auto-Save listeners
    setupAutoSaveListeners();

    // 10. Load and Bind Styles
    await initializeTemplateStyles();

    // 11. Bind Exporters and Actions
    setupActionListeners();

    // 12. Check Google API Connection status
    await setupGoogleApi();

    // 13. Setup Gemini API configuration settings
    await setupGeminiApi();

    // 14. Refresh Preview sheet
    refreshPreviewSheet();

    // 15. Setup Resizable Split View
    setupResizableView();

    // 16. Setup Collapsible Sidebar
    await setupCollapsibleSidebar();

    // 17. Setup AI Rewrite Modal listeners & Summary button
    setupRewriteModalListeners();
    DOM.btnAiRewriteSummary.addEventListener('click', () => {
        openRewriteModal(DOM.inputSummary);
    });
});

/* ==========================================================================
   TAB NAVIGATION HANDLER
   ========================================================================== */

function setupNavigation() {
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Remove active classes
            DOM.navBtns.forEach(b => b.classList.remove('active'));
            DOM.tabs.forEach(t => t.classList.remove('active'));
            
            // Set active classes
            btn.classList.add('active');
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.add('active');
            
            // Re-render Lucide icons just in case
            lucide.createIcons();
        });
    });

    // Accordion UI expansion
    DOM.btnToggleDrawer.addEventListener('click', () => {
        DOM.keywordPanel.classList.toggle('collapsed');
    });
}

function setupAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(acc => {
        const trigger = acc.querySelector('.accordion-trigger');
        trigger.addEventListener('click', () => {
            const isExpanded = acc.classList.contains('expanded');
            
            // Close other accordions
            accordions.forEach(a => a.classList.remove('expanded'));
            
            // Toggle clicked
            if (!isExpanded) {
                acc.classList.add('expanded');
            }
        });
    });
}

/* ==========================================================================
   DATABASE SETTINGS LOADING
   ========================================================================== */

async function loadSettings() {
    const templateId = await getSetting('active_template', 'modern');
    DOM.selectTemplate.value = templateId;

    const font = await getSetting('style_font', 'Inter, sans-serif');
    DOM.inputFontFamily.value = font;

    const size = await getSetting('style_fontsize', '11pt');
    DOM.inputFontSize.value = size;

    const line = await getSetting('style_lineheight', '1.4');
    DOM.inputLineHeight.value = line;

    const margin = await getSetting('style_margin', '0.75in');
    DOM.inputMargins.value = margin;

    const primary = await getSetting('color_primary', '#4f46e5');
    DOM.colorPickerPrimary.value = primary;
    DOM.colorTextPrimary.value = primary;

    const textCol = await getSetting('color_text', '#1f2937');
    DOM.colorPickerText.value = textCol;
    DOM.colorTextText.value = textCol;

    const client = await getSetting('gdrive_client_id', DEFAULT_CLIENT_ID);
    DOM.inputGdriveClientId.value = client;

    geminiApiKey = await getSetting('gemini_api_key', '');
    DOM.inputGeminiApiKey.value = geminiApiKey;

    aiProvider = await getSetting('ai_provider', 'gemini');
    DOM.selectAiProvider.value = aiProvider;

    litellmBaseUrl = await getSetting('litellm_base_url', 'http://localhost:4000/v1');
    DOM.inputLitellmBaseUrl.value = litellmBaseUrl;

    litellmModelName = await getSetting('litellm_model_name', 'ollama/llama3');
    DOM.inputLitellmModelName.value = litellmModelName;

    litellmApiKey = await getSetting('litellm_api_key', '');
    DOM.inputLitellmApiKey.value = litellmApiKey;

    toggleAiConfigSections(aiProvider);

    matcherMode = await getSetting('matcher_mode', 'local');
    updateMatcherModeUI();

    const orderStr = await getSetting('section_order', JSON.stringify(sectionOrdering));
    sectionOrdering = JSON.parse(orderStr);
    renderSectionOrderingUI();
}

async function initializeTemplateStyles() {
    templateStyles = {
        primaryColor: DOM.colorPickerPrimary.value,
        secondaryColor: '#4f46e5', // secondary
        textColor: DOM.colorPickerText.value,
        backgroundColor: '#ffffff',
        fontFamily: DOM.inputFontFamily.value,
        fontSize: DOM.inputFontSize.value,
        lineHeight: DOM.inputLineHeight.value,
        margins: DOM.inputMargins.value
    };
    
    // Bind template design panels
    DOM.selectTemplate.addEventListener('change', async (e) => {
        const templateId = e.target.value;
        await saveSetting('active_template', templateId);
        
        // Auto apply defaults of template
        const defaults = BUILTIN_TEMPLATES[templateId]?.defaults;
        if (defaults) {
            DOM.inputFontFamily.value = defaults.fontFamily;
            DOM.inputFontSize.value = defaults.fontSize;
            DOM.inputLineHeight.value = defaults.lineHeight;
            DOM.inputMargins.value = defaults.margins;
            DOM.colorPickerPrimary.value = defaults.secondaryColor;
            DOM.colorTextPrimary.value = defaults.secondaryColor;
            DOM.colorPickerText.value = defaults.textColor;
            DOM.colorTextText.value = defaults.textColor;

            templateStyles.fontFamily = defaults.fontFamily;
            templateStyles.fontSize = defaults.fontSize;
            templateStyles.lineHeight = defaults.lineHeight;
            templateStyles.margins = defaults.margins;
            templateStyles.primaryColor = defaults.primaryColor;
            templateStyles.textColor = defaults.textColor;

            await saveSetting('style_font', defaults.fontFamily);
            await saveSetting('style_fontsize', defaults.fontSize);
            await saveSetting('style_lineheight', defaults.lineHeight);
            await saveSetting('style_margin', defaults.margins);
            await saveSetting('color_primary', defaults.secondaryColor);
            await saveSetting('color_text', defaults.textColor);
        }
        refreshPreviewSheet();
    });

    const bindStyleProp = (element, pickerText, styleKey, dbKey) => {
        element.addEventListener('input', async (e) => {
            let val = e.target.value;
            if (pickerText) pickerText.value = val;
            templateStyles[styleKey] = val;
            await saveSetting(dbKey, val);
            refreshPreviewSheet();
        });
    };

    bindStyleProp(DOM.inputFontFamily, null, 'fontFamily', 'style_font');
    bindStyleProp(DOM.inputFontSize, null, 'fontSize', 'style_fontsize');
    bindStyleProp(DOM.inputLineHeight, null, 'lineHeight', 'style_lineheight');
    bindStyleProp(DOM.inputMargins, null, 'margins', 'style_margin');
    bindStyleProp(DOM.colorPickerPrimary, DOM.colorTextPrimary, 'secondaryColor', 'color_primary');
    bindStyleProp(DOM.colorPickerText, DOM.colorTextText, 'textColor', 'color_text');

    // Text overrides
    DOM.colorTextPrimary.addEventListener('change', async (e) => {
        let val = e.target.value;
        DOM.colorPickerPrimary.value = val;
        templateStyles.secondaryColor = val;
        await saveSetting('color_primary', val);
        refreshPreviewSheet();
    });
    DOM.colorTextText.addEventListener('change', async (e) => {
        let val = e.target.value;
        DOM.colorPickerText.value = val;
        templateStyles.textColor = val;
        await saveSetting('color_text', val);
        refreshPreviewSheet();
    });
}

function renderSectionOrderingUI() {
    DOM.sectionOrderContainer.innerHTML = '';
    const nameMap = {
        summary: 'Summary Block',
        experience: 'Professional Experience',
        education: 'Education Background',
        skills: 'Skills & Tech Stack',
        projects: 'Projects Portfolio',
        certifications: 'Certifications'
    };
    
    sectionOrdering.forEach((key, index) => {
        const item = document.createElement('div');
        item.className = 'section-order-item';
        item.setAttribute('data-section', key);
        item.innerHTML = `
            <i data-lucide="grip-vertical" class="grip-handle"></i>
            <span>${nameMap[key] || key}</span>
            <div style="margin-left: auto; display: flex; gap: 0.25rem;">
                <button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem;" onclick="moveSection(${index}, -1)" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
                <button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem;" onclick="moveSection(${index}, 1)" ${index === sectionOrdering.length - 1 ? 'disabled' : ''}>&darr;</button>
            </div>
        `;
        DOM.sectionOrderContainer.appendChild(item);
    });
    lucide.createIcons();
}

// Global scope helper for quick ordering buttons
window.moveSection = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sectionOrdering.length) return;
    
    const temp = sectionOrdering[index];
    sectionOrdering[index] = sectionOrdering[targetIndex];
    sectionOrdering[targetIndex] = temp;
    
    await saveSetting('section_order', JSON.stringify(sectionOrdering));
    renderSectionOrderingUI();
    refreshPreviewSheet();
};

/* ==========================================================================
   FORM POPULATORS & CARD RENDERERS
   ========================================================================== */

function populateEditorForms() {
    DOM.inputFullName.value = activeResume.personalInfo.fullName || '';
    DOM.inputEmail.value = activeResume.personalInfo.email || '';
    DOM.inputPhone.value = activeResume.personalInfo.phone || '';
    DOM.inputLocation.value = activeResume.personalInfo.location || '';
    DOM.inputWebsite.value = activeResume.personalInfo.website || '';
    DOM.inputLinkedin.value = activeResume.personalInfo.linkedin || '';
    DOM.inputGithub.value = activeResume.personalInfo.github || '';
    DOM.inputSummary.value = activeResume.personalInfo.summary || '';
}

// Markdown toolbar helper
function setupMarkdownToolbar(card, textareaSelector, boldSelector, italicSelector, bulletSelector) {
    const textarea = card.querySelector(textareaSelector);
    const btnBold = card.querySelector(boldSelector);
    const btnItalic = card.querySelector(italicSelector);
    const btnBullet = card.querySelector(bulletSelector);

    const insertMarkdown = (syntaxBefore, syntaxAfter = '') => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const replacement = syntaxBefore + selectedText + syntaxAfter;
        
        textarea.value = text.substring(0, start) + replacement + text.substring(end);
        
        textarea.dispatchEvent(new Event('input'));
        textarea.focus();
        
        const newCursorPos = start + syntaxBefore.length + selectedText.length + syntaxAfter.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    };

    btnBold.addEventListener('click', (e) => {
        e.preventDefault();
        insertMarkdown('**', '**');
    });
    btnItalic.addEventListener('click', (e) => {
        e.preventDefault();
        insertMarkdown('*', '*');
    });
    btnBullet.addEventListener('click', (e) => {
        e.preventDefault();
        insertMarkdown('- ');
    });
}

// RENDER EXPERIENCE FORM CARDS
function renderExperienceList() {
    DOM.experienceList.innerHTML = '';
    const experiences = activeResume.experience || [];
    
    experiences.forEach((exp, idx) => {
        const card = document.createElement('div');
        card.className = 'repeater-card';
        card.innerHTML = `
            <div class="repeater-card-header">
                <span class="repeater-card-title">Experience ${idx + 1}: ${exp.company || 'New Company'}</span>
                <button class="btn-card-remove" data-idx="${idx}"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Company</label>
                    <input type="text" class="form-input exp-company" value="${exp.company || ''}" placeholder="Acme Inc.">
                </div>
                <div class="form-group">
                    <label>Job Title</label>
                    <input type="text" class="form-input exp-position" value="${exp.position || ''}" placeholder="Software Engineer">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" class="form-input exp-location" value="${exp.location || ''}" placeholder="New York, NY">
                </div>
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label>Dates (Start & End)</label>
                        <div style="display:flex; align-items:center; gap:0.25rem;">
                            <input type="checkbox" class="exp-current" ${exp.current ? 'checked' : ''} id="exp-curr-${idx}">
                            <label for="exp-curr-${idx}" style="font-size: 0.75rem; text-transform:none;">Current</label>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="date" class="form-input exp-start" value="${exp.startDate || ''}" style="width:50%;">
                        <input type="date" class="form-input exp-end" value="${exp.endDate || ''}" style="width:50%;" ${exp.current ? 'disabled' : ''}>
                    </div>
                </div>
                <div class="form-group col-span-2">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.25rem;">
                        <label style="margin-bottom:0;">Job Description (Supports Markdown)</label>
                        <div class="markdown-toolbar" style="display:flex; gap:0.35rem; align-items:center;">
                            <button type="button" class="btn-md-bold" title="Bold" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-weight:bold;">B</button>
                            <button type="button" class="btn-md-italic" title="Italic" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-style:italic;">I</button>
                            <button type="button" class="btn-md-bullet" title="Bullet List" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;">• List</button>
                            <span style="color: var(--ui-border-color); font-size: 0.8rem;">|</span>
                            <button type="button" class="btn btn-secondary btn-sm btn-md-ai-rewrite" title="Rewrite with AI" style="padding:2px 8px; font-size:0.75rem; border-radius:4px; display:flex; align-items:center; gap:2px;">
                                <i data-lucide="sparkles" style="width:10px;height:10px;"></i> AI Rewrite
                            </button>
                        </div>
                    </div>
                    <textarea class="form-input exp-desc" rows="4" placeholder="- Built scalable APIs using Node.js\\n- Led team of 3 engineers...">${exp.description || ''}</textarea>
                </div>
            </div>
        `;
        
        // Bind Card Deletion
        card.querySelector('.btn-card-remove').addEventListener('click', () => {
            activeResume.experience.splice(idx, 1);
            saveActiveResume();
            renderExperienceList();
            refreshPreviewSheet();
        });

        // Bind Inputs change directly to object array without re-rendering forms
        const updateField = (selector, field) => {
            card.querySelector(selector).addEventListener('input', (e) => {
                exp[field] = e.target.value;
                if (field === 'company') {
                    card.querySelector('.repeater-card-title').innerText = `Experience ${idx + 1}: ${e.target.value || 'New Company'}`;
                }
                saveActiveResume();
                refreshPreviewSheet();
            });
        };

        updateField('.exp-company', 'company');
        updateField('.exp-position', 'position');
        updateField('.exp-location', 'location');
        updateField('.exp-desc', 'description');

        setupMarkdownToolbar(card, '.exp-desc', '.btn-md-bold', '.btn-md-italic', '.btn-md-bullet');

        card.querySelector('.btn-md-ai-rewrite').addEventListener('click', (e) => {
            e.preventDefault();
            openRewriteModal(card.querySelector('.exp-desc'));
        });

        const startInput = card.querySelector('.exp-start');
        const endInput = card.querySelector('.exp-end');
        const currentCheck = card.querySelector('.exp-current');

        startInput.addEventListener('change', (e) => {
            exp.startDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });
        endInput.addEventListener('change', (e) => {
            exp.endDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });
        currentCheck.addEventListener('change', (e) => {
            exp.current = e.target.checked;
            endInput.disabled = e.target.checked;
            if (e.target.checked) exp.endDate = '';
            saveActiveResume();
            refreshPreviewSheet();
        });

        DOM.experienceList.appendChild(card);
    });
    lucide.createIcons();
}

// RENDER EDUCATION FORM CARDS
function renderEducationList() {
    DOM.educationList.innerHTML = '';
    const education = activeResume.education || [];

    education.forEach((edu, idx) => {
        const card = document.createElement('div');
        card.className = 'repeater-card';
        card.innerHTML = `
            <div class="repeater-card-header">
                <span class="repeater-card-title">Education ${idx + 1}: ${edu.school || 'New Institution'}</span>
                <button class="btn-card-remove" data-idx="${idx}"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>School / University</label>
                    <input type="text" class="form-input edu-school" value="${edu.school || ''}" placeholder="Stanford University">
                </div>
                <div class="form-group">
                    <label>Degree</label>
                    <input type="text" class="form-input edu-degree" value="${edu.degree || ''}" placeholder="B.S.">
                </div>
                <div class="form-group">
                    <label>Field of Study</label>
                    <input type="text" class="form-input edu-field" value="${edu.fieldOfStudy || ''}" placeholder="Computer Science">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" class="form-input edu-location" value="${edu.location || ''}" placeholder="Stanford, CA">
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-input edu-start" value="${edu.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>End Date (or Expected)</label>
                    <input type="date" class="form-input edu-end" value="${edu.endDate || ''}">
                </div>
                <div class="form-group col-span-2">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.25rem;">
                        <label style="margin-bottom:0;">Additional Notes / Honors (Optional)</label>
                        <div class="markdown-toolbar" style="display:flex; gap:0.35rem; align-items:center;">
                            <button type="button" class="btn-md-bold" title="Bold" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-weight:bold;">B</button>
                            <button type="button" class="btn-md-italic" title="Italic" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-style:italic;">I</button>
                            <button type="button" class="btn-md-bullet" title="Bullet List" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;">• List</button>
                            <span style="color: var(--ui-border-color); font-size: 0.8rem;">|</span>
                            <button type="button" class="btn btn-secondary btn-sm btn-md-ai-rewrite" title="Rewrite with AI" style="padding:2px 8px; font-size:0.75rem; border-radius:4px; display:flex; align-items:center; gap:2px;">
                                <i data-lucide="sparkles" style="width:10px;height:10px;"></i> AI Rewrite
                            </button>
                        </div>
                    </div>
                    <textarea class="form-input edu-desc" rows="2" placeholder="GPA: 3.9/4.0, Honors Thesis on AI">${edu.description || ''}</textarea>
                </div>
            </div>
        `;

        card.querySelector('.btn-card-remove').addEventListener('click', () => {
            activeResume.education.splice(idx, 1);
            saveActiveResume();
            renderEducationList();
            refreshPreviewSheet();
        });

        const updateField = (selector, field) => {
            card.querySelector(selector).addEventListener('input', (e) => {
                edu[field] = e.target.value;
                if (field === 'school') {
                    card.querySelector('.repeater-card-title').innerText = `Education ${idx + 1}: ${e.target.value || 'New Institution'}`;
                }
                saveActiveResume();
                refreshPreviewSheet();
            });
        };

        updateField('.edu-school', 'school');
        updateField('.edu-degree', 'degree');
        updateField('.edu-field', 'fieldOfStudy');
        updateField('.edu-location', 'location');
        updateField('.edu-desc', 'description');

        setupMarkdownToolbar(card, '.edu-desc', '.btn-md-bold', '.btn-md-italic', '.btn-md-bullet');

        card.querySelector('.btn-md-ai-rewrite').addEventListener('click', (e) => {
            e.preventDefault();
            openRewriteModal(card.querySelector('.edu-desc'));
        });

        card.querySelector('.edu-start').addEventListener('change', (e) => {
            edu.startDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });
        card.querySelector('.edu-end').addEventListener('change', (e) => {
            edu.endDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });

        DOM.educationList.appendChild(card);
    });
    lucide.createIcons();
}

// RENDER PROJECTS FORM CARDS
function renderProjectList() {
    DOM.projectsList.innerHTML = '';
    const projects = activeResume.projects || [];

    projects.forEach((proj, idx) => {
        const card = document.createElement('div');
        card.className = 'repeater-card';
        card.innerHTML = `
            <div class="repeater-card-header">
                <span class="repeater-card-title">Project ${idx + 1}: ${proj.name || 'New Project'}</span>
                <button class="btn-card-remove" data-idx="${idx}"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Project Name</label>
                    <input type="text" class="form-input proj-name" value="${proj.name || ''}" placeholder="E-commerce Engine">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <input type="text" class="form-input proj-role" value="${proj.role || ''}" placeholder="Lead Developer">
                </div>
                <div class="form-group col-span-2">
                    <label>Project URL</label>
                    <input type="url" class="form-input proj-link" value="${proj.link || ''}" placeholder="https://github.com/johndoe/myproject">
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input type="date" class="form-input proj-start" value="${proj.startDate || ''}">
                </div>
                <div class="form-group">
                    <label>End Date</label>
                    <input type="date" class="form-input proj-end" value="${proj.endDate || ''}">
                </div>
                <div class="form-group col-span-2">
                    <label>Technologies Used (Comma-separated)</label>
                    <input type="text" class="form-input proj-tech" value="${(proj.technologies || []).join(', ')}" placeholder="React, Node.js, GraphQL">
                </div>
                <div class="form-group col-span-2">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.25rem;">
                        <label style="margin-bottom:0;">Project Description</label>
                        <div class="markdown-toolbar" style="display:flex; gap:0.35rem; align-items:center;">
                            <button type="button" class="btn-md-bold" title="Bold" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-weight:bold;">B</button>
                            <button type="button" class="btn-md-italic" title="Italic" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer; font-style:italic;">I</button>
                            <button type="button" class="btn-md-bullet" title="Bullet List" style="background:rgba(255,255,255,0.03); border:1px solid var(--ui-border-color); color:var(--ui-text-title); border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;">• List</button>
                            <span style="color: var(--ui-border-color); font-size: 0.8rem;">|</span>
                            <button type="button" class="btn btn-secondary btn-sm btn-md-ai-rewrite" title="Rewrite with AI" style="padding:2px 8px; font-size:0.75rem; border-radius:4px; display:flex; align-items:center; gap:2px;">
                                <i data-lucide="sparkles" style="width:10px;height:10px;"></i> AI Rewrite
                            </button>
                        </div>
                    </div>
                    <textarea class="form-input proj-desc" rows="3" placeholder="- Designed core shopping cart layout\\n- Deployed onto AWS EC2">${proj.description || ''}</textarea>
                </div>
            </div>
        `;

        card.querySelector('.btn-card-remove').addEventListener('click', () => {
            activeResume.projects.splice(idx, 1);
            saveActiveResume();
            renderProjectList();
            refreshPreviewSheet();
        });

        const updateField = (selector, field) => {
            card.querySelector(selector).addEventListener('input', (e) => {
                if (field === 'technologies') {
                    proj.technologies = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                } else {
                    proj[field] = e.target.value;
                }
                if (field === 'name') {
                    card.querySelector('.repeater-card-title').innerText = `Project ${idx + 1}: ${e.target.value || 'New Project'}`;
                }
                saveActiveResume();
                refreshPreviewSheet();
            });
        };

        updateField('.proj-name', 'name');
        updateField('.proj-role', 'role');
        updateField('.proj-link', 'link');
        updateField('.proj-tech', 'technologies');
        updateField('.proj-desc', 'description');

        setupMarkdownToolbar(card, '.proj-desc', '.btn-md-bold', '.btn-md-italic', '.btn-md-bullet');

        card.querySelector('.btn-md-ai-rewrite').addEventListener('click', (e) => {
            e.preventDefault();
            openRewriteModal(card.querySelector('.proj-desc'));
        });

        card.querySelector('.proj-start').addEventListener('change', (e) => {
            proj.startDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });
        card.querySelector('.proj-end').addEventListener('change', (e) => {
            proj.endDate = e.target.value;
            saveActiveResume();
            refreshPreviewSheet();
        });

        DOM.projectsList.appendChild(card);
    });
    lucide.createIcons();
}

// RENDER SKILLS tags
function renderSkillsTags() {
    DOM.skillsTags.innerHTML = '';
    const skills = activeResume.skills || [];
    skills.forEach((skill, idx) => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `
            <span>${skill}</span>
            <button class="tag-remove" data-idx="${idx}"><i data-lucide="x"></i></button>
        `;
        badge.querySelector('.tag-remove').addEventListener('click', () => {
            activeResume.skills.splice(idx, 1);
            saveActiveResume();
            renderSkillsTags();
            refreshPreviewSheet();
        });
        DOM.skillsTags.appendChild(badge);
    });
    lucide.createIcons();
}

// RENDER CERTIFICATION tags
function renderCertTags() {
    DOM.certTags.innerHTML = '';
    const certs = activeResume.certifications || [];
    certs.forEach((cert, idx) => {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.innerHTML = `
            <span>${cert}</span>
            <button class="tag-remove" data-idx="${idx}"><i data-lucide="x"></i></button>
        `;
        badge.querySelector('.tag-remove').addEventListener('click', () => {
            activeResume.certifications.splice(idx, 1);
            saveActiveResume();
            renderCertTags();
            refreshPreviewSheet();
        });
        DOM.certTags.appendChild(badge);
    });
    lucide.createIcons();
}

/* ==========================================================================
   AUTO-SAVE STATE LOGIC
   ========================================================================== */

function setupAutoSaveListeners() {
    // Save personal info triggers
    const bindSaveInput = (element, field) => {
        element.addEventListener('input', (e) => {
            activeResume.personalInfo[field] = e.target.value;
            if (field === 'fullName') updatePageTitle(e.target.value);
            saveActiveResume();
            refreshPreviewSheet();
        });
    };

    bindSaveInput(DOM.inputFullName, 'fullName');
    bindSaveInput(DOM.inputEmail, 'email');
    bindSaveInput(DOM.inputPhone, 'phone');
    bindSaveInput(DOM.inputLocation, 'location');
    bindSaveInput(DOM.inputWebsite, 'website');
    bindSaveInput(DOM.inputLinkedin, 'linkedin');
    bindSaveInput(DOM.inputGithub, 'github');
    bindSaveInput(DOM.inputSummary, 'summary');

    // Repeater additions
    DOM.btnAddExperience.addEventListener('click', () => {
        if (!activeResume.experience) activeResume.experience = [];
        activeResume.experience.push({
            company: '',
            position: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: ''
        });
        saveActiveResume();
        renderExperienceList();
        refreshPreviewSheet();
    });

    DOM.btnAddEducation.addEventListener('click', () => {
        if (!activeResume.education) activeResume.education = [];
        activeResume.education.push({
            school: '',
            degree: '',
            fieldOfStudy: '',
            location: '',
            startDate: '',
            endDate: '',
            description: ''
        });
        saveActiveResume();
        renderEducationList();
        refreshPreviewSheet();
    });

    DOM.btnAddProject.addEventListener('click', () => {
        if (!activeResume.projects) activeResume.projects = [];
        activeResume.projects.push({
            name: '',
            role: '',
            link: '',
            startDate: '',
            endDate: '',
            technologies: [],
            description: ''
        });
        saveActiveResume();
        renderProjectList();
        refreshPreviewSheet();
    });

    // Skill Tag additions
    const addSkillAction = () => {
        const value = DOM.inputNewSkill.value.trim();
        if (value) {
            if (!activeResume.skills) activeResume.skills = [];
            if (!activeResume.skills.includes(value)) {
                activeResume.skills.push(value);
                saveActiveResume();
                renderSkillsTags();
                refreshPreviewSheet();
            }
            DOM.inputNewSkill.value = '';
        }
    };
    DOM.btnAddSkill.addEventListener('click', addSkillAction);
    DOM.inputNewSkill.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkillAction();
        }
    });

    // Cert Tag additions
    const addCertAction = () => {
        const value = DOM.inputNewCert.value.trim();
        if (value) {
            if (!activeResume.certifications) activeResume.certifications = [];
            if (!activeResume.certifications.includes(value)) {
                activeResume.certifications.push(value);
                saveActiveResume();
                renderCertTags();
                refreshPreviewSheet();
            }
            DOM.inputNewCert.value = '';
        }
    };
    DOM.btnAddCert.addEventListener('click', addCertAction);
    DOM.inputNewCert.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCertAction();
        }
    });
}

// Database save wrapper
async function saveActiveResume() {
    if (isTailoredMode && currentTailoredRecord) {
        // Saving job specific version
        currentTailoredRecord.resumeSnapshot = activeResume;
        await db.tailoredResumes.put(currentTailoredRecord);
    } else {
        // Saving master
        await saveMasterResume(activeResume);
    }
}

/* ==========================================================================
   LIVE PREVIEW RENDER COMPILER
   ========================================================================== */

function refreshPreviewSheet() {
    const templateId = DOM.selectTemplate.value;
    
    // Compile content
    const html = compileResumeHtml(activeResume, templateId, sectionOrdering);
    DOM.resumeSheet.className = `resume-sheet template-${templateId}`;
    DOM.resumeSheet.innerHTML = html;
    
    // Apply styling rules
    applyStyleVariables(DOM.resumeSheet, templateStyles);
    
    // Re-render Lucide icons injected inside template
    lucide.createIcons();
    
    // Refresh match results if we have an active job selected
    triggerKeywordAnalysis();
}

/* ==========================================================================
   JOB TRACKER CONTROLLER
   ========================================================================== */

async function loadJobsList() {
    DOM.jobsContainer.innerHTML = '';
    const jobs = await db.jobDescriptions.orderBy('createdDate').reverse().toArray();
    
    if (jobs.length === 0) {
        DOM.jobsContainer.innerHTML = `<p class="help-text" style="text-align:center; padding:1rem;">No jobs registered yet.</p>`;
        return;
    }
    
    for (const job of jobs) {
        const card = document.createElement('div');
        card.className = `job-card ${job.id === activeJobId ? 'active' : ''}`;
        
        const formattedDate = new Date(job.createdDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Scan for customized status
        const tailored = await db.tailoredResumes.where('jobId').equals(job.id).first();
        const customizeIndicator = tailored ? `<span style="font-size:0.7rem; color:var(--color-purple); font-weight:600;"><i data-lucide="file-signature" style="width:10px;height:10px;vertical-align:middle;display:inline-block;"></i> Custom</span>` : '';
        
        card.innerHTML = `
            <div class="job-card-title">${job.jobTitle || 'Untitled Role'}</div>
            <div class="job-card-company">${job.companyName || 'Unknown Company'}</div>
            <div class="job-card-meta">
                <span class="job-status-badge ${job.status.toLowerCase()}">${job.status}</span>
                <span class="job-card-date">${formattedDate}</span>
            </div>
            <div style="margin-top:0.4rem; display:flex; justify-content:space-between;">
                ${customizeIndicator}
            </div>
        `;
        
        card.addEventListener('click', async () => {
            activeJobId = job.id;
            await selectActiveJob(job);
        });
        
        DOM.jobsContainer.appendChild(card);
    }
    lucide.createIcons();
}

// Add Job Trigger
DOM.btnNewJob.addEventListener('click', async () => {
    const newJob = {
        jobTitle: 'New Job Role',
        companyName: 'Company Name',
        jdUrl: '',
        rawJdText: '',
        extractedKeywords: [],
        status: 'Draft',
        notes: '',
        createdDate: new Date()
    };
    const id = await db.jobDescriptions.add(newJob);
    activeJobId = id;
    await loadJobsList();
    
    const job = await db.jobDescriptions.get(id);
    await selectActiveJob(job);
});

// Select active job
async function selectActiveJob(job) {
    // Highlight active card
    const cards = DOM.jobsContainer.querySelectorAll('.job-card');
    cards.forEach((c, idx) => {
        const matchId = (DOM.jobsContainer.children[idx] === c); // Simple selection logic
    });
    
    // Load job data into UI
    DOM.jobEmptyState.classList.add('hidden');
    DOM.jobEditorPanel.classList.remove('hidden');
    
    // Set UI values
    DOM.jobInputTitle.value = job.jobTitle;
    DOM.jobInputCompany.value = job.companyName;
    DOM.jobInputStatus.value = job.status;
    DOM.jobInputUrl.value = job.jdUrl;
    DOM.jobInputText.value = job.rawJdText;
    DOM.jobInputNotes.value = job.notes;
    
    // Bind Job input triggers.
    // IMPORTANT: we clone each element to strip old event listeners when switching jobs.
    // After cloning, we MUST update the DOM registry with the correct camelCase key —
    // element.id is hyphenated (e.g. 'job-input-url') which does NOT match the camelCase
    // DOM keys (e.g. DOM.jobInputUrl), so we map them explicitly below.
    const bindJobUpdate = (domKey, field) => {
        const element = DOM[domKey];
        const clone = element.cloneNode(true);
        element.parentNode.replaceChild(clone, element);
        DOM[domKey] = clone; // Re-register under the correct camelCase key
        
        clone.addEventListener('input', async (e) => {
            job[field] = e.target.value;
            if (field === 'jobTitle' || field === 'companyName' || field === 'status') {
                await loadJobsList();
            }
            await db.jobDescriptions.update(job.id, job);
            if (field === 'rawJdText') {
                // Extract keywords dynamically on typing JD
                job.extractedKeywords = extractKeywords(e.target.value);
                await db.jobDescriptions.update(job.id, job);
                triggerKeywordAnalysis();
            }
        });
        return clone;
    };
    
    bindJobUpdate('jobInputTitle', 'jobTitle');
    bindJobUpdate('jobInputCompany', 'companyName');
    bindJobUpdate('jobInputStatus', 'status');
    bindJobUpdate('jobInputUrl', 'jdUrl');
    bindJobUpdate('jobInputNotes', 'notes');
    
    // Custom binding for the JD textarea (also needs clone + correct DOM key update)
    const textClone = DOM.jobInputText.cloneNode(true);
    DOM.jobInputText.parentNode.replaceChild(textClone, DOM.jobInputText);
    DOM.jobInputText = textClone;
    textClone.addEventListener('input', async (e) => {
        job.rawJdText = e.target.value;
        job.extractedKeywords = extractKeywords(e.target.value);
        await db.jobDescriptions.update(job.id, job);
        triggerKeywordAnalysis();
    });

    // Check tailored version linkage
    await refreshTailorBanner(job.id);
    
    // Extract keywords on load
    triggerKeywordAnalysis();
    
    // Repaint sidebar list active item classes
    await loadJobsList();
}

// Delete Active Job
DOM.btnDeleteJob.addEventListener('click', async () => {
    if (activeJobId) {
        if (confirm('Are you sure you want to delete this job application? This will also remove any tailored resumes linked to it.')) {
            // Delete tailored snapshot if exists
            await db.tailoredResumes.where('jobId').equals(activeJobId).delete();
            await db.jobDescriptions.delete(activeJobId);
            
            activeJobId = null;
            isTailoredMode = false;
            currentTailoredRecord = null;
            
            // Revert back to Master resume in editor
            const master = await getMasterResume();
            activeResume = master;
            populateEditorForms();
            renderExperienceList();
            renderEducationList();
            renderProjectList();
            renderSkillsTags();
            renderCertTags();
            
            DOM.jobEmptyState.classList.remove('hidden');
            DOM.jobEditorPanel.classList.add('hidden');
            
            await loadJobsList();
            refreshPreviewSheet();
        }
    }
});

// URL Scraper Trigger
DOM.btnScrapeJd.addEventListener('click', async () => {
    // Use getElementById as a live-DOM fallback in case DOM.jobInputUrl reference is stale
    const urlInput = document.getElementById('job-input-url') || DOM.jobInputUrl;
    let url = urlInput.value.trim();
    if (!url) {
        alert('Please enter a URL first.');
        return;
    }

    // Auto-prepend https:// if no protocol is present
    if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
        urlInput.value = url;
    }

    // Basic sanity check before hitting the server
    try {
        new URL(url);
    } catch {
        alert('The URL doesn\'t look valid. Make sure it starts with https:// and points to a real page.');
        return;
    }

    DOM.btnScrapeJd.disabled = true;
    DOM.btnScrapeJd.innerText = 'Scraping...';
    
    try {
        const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server error occurred during scraping.');
        }
        
        const data = await response.json();
        if (data.text) {
            DOM.jobInputText.value = data.text;
            
            // Update DB
            const job = await db.jobDescriptions.get(activeJobId);
            job.rawJdText = data.text;
            job.jdUrl = url;
            job.extractedKeywords = extractKeywords(data.text);
            await db.jobDescriptions.update(activeJobId, job);
            
            triggerKeywordAnalysis();
            alert('Job description scraped successfully!');
        } else {
            throw new Error('No text returned from scraping.');
        }
    } catch (err) {
        alert(`Failed to scrape: ${err.message}. Please paste the JD manually.`);
    } finally {
        DOM.btnScrapeJd.disabled = false;
        DOM.btnScrapeJd.innerText = 'Scrape';
    }
});

/* ==========================================================================
   RESUME TAILORING STATE MANAGER
   ========================================================================== */

async function refreshTailorBanner(jobId) {
    const tailored = await db.tailoredResumes.where('jobId').equals(jobId).first();
    
    // Setup listeners on buttons
    const wireBtn = (btn, action) => {
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        DOM[btn.id] = clone;
        clone.addEventListener('click', action);
    };

    if (tailored) {
        // A tailored resume version exists
        currentTailoredRecord = tailored;
        
        DOM.btnGenerateTailored.classList.add('hidden');
        DOM.btnEditTailored.classList.remove('hidden');
        DOM.btnResetTailored.classList.remove('hidden');
        
        // Show status header in workspace editor
        const header = document.querySelector('#tab-master .tab-header');
        
        // If not already editing tailored, let's wire actions
        wireBtn(DOM.btnEditTailored, async () => {
            isTailoredMode = true;
            activeResume = tailored.resumeSnapshot;
            populateEditorForms();
            renderExperienceList();
            renderEducationList();
            renderProjectList();
            renderSkillsTags();
            renderCertTags();
            
            // Add visual banner warning the user
            removeTailorAlert();
            const bannerAlert = document.createElement('div');
            bannerAlert.id = 'tailor-warning-alert';
            bannerAlert.className = 'tailor-banner';
            bannerAlert.style.backgroundColor = 'var(--color-warning-soft)';
            bannerAlert.style.borderColor = 'var(--color-warning)';
            bannerAlert.style.marginTop = '1rem';
            bannerAlert.innerHTML = `
                <div class="tailor-banner-info">
                    <h5 style="color:var(--color-warning);"><i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;display:inline-block;"></i> Custom Mode</h5>
                    <p style="color:var(--ui-text-body)">You are editing the tailored copy of your resume for this specific job posting.</p>
                </div>
                <button class="btn btn-secondary btn-sm" id="btn-alert-exit-tailor">Exit Custom Mode</button>
            `;
            header.appendChild(bannerAlert);
            lucide.createIcons();
            
            document.getElementById('btn-alert-exit-tailor').addEventListener('click', async () => {
                isTailoredMode = false;
                currentTailoredRecord = null;
                const master = await getMasterResume();
                activeResume = master;
                populateEditorForms();
                renderExperienceList();
                renderEducationList();
                renderProjectList();
                renderSkillsTags();
                renderCertTags();
                removeTailorAlert();
                refreshPreviewSheet();
            });

            // Redirect back to master tab so they see editing forms
            document.getElementById('nav-btn-master').click();
            refreshPreviewSheet();
        });
    } else {
        // No tailored version exists yet
        currentTailoredRecord = null;
        DOM.btnGenerateTailored.classList.remove('hidden');
        DOM.btnEditTailored.classList.add('hidden');
        DOM.btnResetTailored.classList.add('hidden');
        
        removeTailorAlert();
        
        wireBtn(DOM.btnGenerateTailored, async () => {
            // Create a tailored copy from master
            const master = await getMasterResume();
            const newTailored = {
                jobId: jobId,
                resumeSnapshot: JSON.parse(JSON.stringify(master)), // Deep clone master
                createdAt: new Date()
            };
            
            await db.tailoredResumes.add(newTailored);
            alert('Customized copy created! Click "Edit Customized Resume" to modify details for this job.');
            await refreshTailorBanner(jobId);
            
            // Force click edit
            DOM.btnEditTailored.click();
        });
    }

    wireBtn(DOM.btnResetTailored, async () => {
        if (confirm('Are you sure you want to delete this custom version? All customizations for this job will be lost and reverted to your Master resume.')) {
            await db.tailoredResumes.where('jobId').equals(jobId).delete();
            isTailoredMode = false;
            currentTailoredRecord = null;
            
            const master = await getMasterResume();
            activeResume = master;
            populateEditorForms();
            renderExperienceList();
            renderEducationList();
            renderProjectList();
            renderSkillsTags();
            renderCertTags();
            
            removeTailorAlert();
            await refreshTailorBanner(jobId);
            refreshPreviewSheet();
        }
    });
}

function removeTailorAlert() {
    const alertEl = document.getElementById('tailor-warning-alert');
    if (alertEl) alertEl.remove();
}

/* ==========================================================================
   KEYWORD DETECTOR & ANALYSIS SCROLL
   ========================================================================== */

async function triggerKeywordAnalysis() {
    if (!activeJobId) {
        DOM.jdScoreBadge.innerText = '0% Match';
        DOM.statMatches.innerText = '0';
        DOM.statMissing.innerText = '0';
        DOM.tagsMatched.innerHTML = '';
        DOM.tagsMissing.innerHTML = '';
        DOM.aiSuggestionsContainer.classList.add('hidden');
        return;
    }
    
    const job = await db.jobDescriptions.get(activeJobId);
    if (!job || !job.rawJdText) {
        DOM.jdScoreBadge.innerText = '0% Match';
        DOM.statMatches.innerText = '0';
        DOM.statMissing.innerText = '0';
        DOM.tagsMatched.innerHTML = `<p class="help-text" style="grid-column: span 2;">Paste JD or click scrape to analyze keywords.</p>`;
        DOM.tagsMissing.innerHTML = '';
        DOM.aiSuggestionsContainer.classList.add('hidden');
        return;
    }

    if (matcherMode === 'local') {
        // Hide LLM recommendations
        DOM.aiSuggestionsContainer.classList.add('hidden');
        
        // Run regex analysis
        if (!job.extractedKeywords || job.extractedKeywords.length === 0) {
            job.extractedKeywords = extractKeywords(job.rawJdText);
            await db.jobDescriptions.update(job.id, job);
        }
        
        const analysis = analyzeMatch(activeResume, job.extractedKeywords);
        
        DOM.jdScoreBadge.innerText = `${analysis.score}% Match`;
        DOM.statMatches.innerText = analysis.matched.length;
        DOM.statMissing.innerText = analysis.missing.length;
        
        DOM.tagsMatched.innerHTML = analysis.matched.map(tag => `
            <span class="keyword-tag matched">${tag}</span>
        `).join('') || '<span class="help-text">None detected.</span>';
        
        DOM.tagsMissing.innerHTML = analysis.missing.map(tag => `
            <span class="keyword-tag missing">${tag}</span>
        `).join('') || '<span class="help-text">Perfect keyword match!</span>';
        
    } else if (matcherMode === 'llm') {
        if (aiProvider === 'gemini' && !geminiApiKey) {
            runLocalFallback(job, "Configure your Gemini API Key in the Integrations tab to enable AI analysis.");
            return;
        }
        if (aiProvider === 'litellm' && !litellmBaseUrl) {
            runLocalFallback(job, "Configure your API Base URL in the Integrations tab to enable AI analysis.");
            return;
        }

        // Show loading state
        DOM.jdScoreBadge.innerText = 'Thinking...';
        DOM.aiSuggestionsContainer.classList.remove('hidden');
        DOM.aiSuggestionsList.innerHTML = `
            <div class="ai-suggestion-card" style="border-left-color: var(--color-warning) !important; text-align:center;">
                <p><i data-lucide="loader" class="spinner"></i> Fetching AI analysis (${aiProvider === 'gemini' ? 'Gemini' : 'OpenAI Compatible'})...</p>
            </div>
        `;
        lucide.createIcons();

        if (isLlmRunning) return; // Prevent concurrent calls
        isLlmRunning = true;

        const config = {
            provider: aiProvider,
            apiKey: aiProvider === 'gemini' ? geminiApiKey : litellmApiKey,
            baseUrl: litellmBaseUrl,
            model: litellmModelName
        };

        try {
            const analysis = await analyzeMatchLLM(activeResume, job.rawJdText, config);
            
            DOM.jdScoreBadge.innerText = `${analysis.score}% Match`;
            DOM.statMatches.innerText = analysis.matched.length;
            DOM.statMissing.innerText = analysis.missing.length;

            DOM.tagsMatched.innerHTML = analysis.matched.map(tag => `
                <span class="keyword-tag matched">${tag}</span>
            `).join('') || '<span class="help-text">None detected.</span>';
            
            DOM.tagsMissing.innerHTML = analysis.missing.map(tag => `
                <span class="keyword-tag missing">${tag}</span>
            `).join('') || '<span class="help-text">Perfect keyword match!</span>';

            DOM.aiSuggestionsList.innerHTML = analysis.suggestions.map(s => `
                <div class="ai-suggestion-card">
                    <p>${s}</p>
                </div>
            `).join('') || '<div class="help-text">No recommendations.</div>';

        } catch (err) {
            console.error('LLM match analysis error:', err);
            runLocalFallback(job, `AI Matcher failed: ${err.message}. Showing local match instead.`);
        } finally {
            isLlmRunning = false;
        }
    }
}

function runLocalFallback(job, message) {
    if (!job.extractedKeywords || job.extractedKeywords.length === 0) {
        job.extractedKeywords = extractKeywords(job.rawJdText);
    }
    const analysis = analyzeMatch(activeResume, job.extractedKeywords);
    
    DOM.jdScoreBadge.innerText = `${analysis.score}% Match`;
    DOM.statMatches.innerText = analysis.matched.length;
    DOM.statMissing.innerText = analysis.missing.length;
    
    DOM.tagsMatched.innerHTML = analysis.matched.map(tag => `
        <span class="keyword-tag matched">${tag}</span>
    `).join('') || '<span class="help-text">None detected.</span>';
    
    DOM.tagsMissing.innerHTML = analysis.missing.map(tag => `
        <span class="keyword-tag missing">${tag}</span>
    `).join('') || '<span class="help-text">Perfect keyword match!</span>';

    DOM.aiSuggestionsContainer.classList.remove('hidden');
    DOM.aiSuggestionsList.innerHTML = `
        <div class="ai-suggestion-card" style="border-left-color: var(--color-danger) !important; background-color: rgba(239, 68, 68, 0.05);">
            <p style="color:var(--color-danger); font-weight:600;"><i data-lucide="alert-circle" style="width:14px;height:14px;vertical-align:middle;display:inline-block;"></i> AI Analysis Unavailable</p>
            <p style="margin-top:0.25rem; font-size:0.75rem;">${message}</p>
        </div>
    `;
    lucide.createIcons();
}

/* ==========================================================================
   EXPORTERS: PDF, MARKDOWN, AND JSON
   ========================================================================== */

function setupActionListeners() {
    // PDF Export — temporarily set document.title to the resume name so the
    // browser uses it as the PDF filename and document title, then restore.
    DOM.btnExportPdf.addEventListener('click', () => {
        const name = (activeResume?.personalInfo?.fullName || 'Resume').trim();
        let printTitle = name;
        if (isTailoredMode && activeJobId) {
            const comp = (document.getElementById('job-input-company') || DOM.jobInputCompany)?.value?.trim();
            if (comp) printTitle = `${name} – ${comp}`;
        }

        document.title = printTitle;

        // Restore to "Resume: <Name>" format after print dialog closes
        const restoreTitle = () => {
            updatePageTitle(activeResume?.personalInfo?.fullName);
            window.removeEventListener('afterprint', restoreTitle);
        };
        window.addEventListener('afterprint', restoreTitle);

        window.print();
    });

    // Markdown Export
    DOM.btnExportMd.addEventListener('click', () => {
        const mdText = generateMarkdown(activeResume);
        const fileName = getExportFileName('.md');
        downloadFile(fileName, mdText, 'text/markdown');
    });

    // JSON Export
    DOM.btnExportJson.addEventListener('click', () => {
        const jsonText = JSON.stringify(activeResume, null, 2);
        const fileName = getExportFileName('.json');
        downloadFile(fileName, jsonText, 'application/json');
    });
    
    // Gdrive Sync Action
    DOM.btnSyncGdrive.addEventListener('click', async () => {
        if (!gdriveConnected) {
            alert('Google Drive is not linked. Please configure your Client ID in the Google Drive tab and login.');
            document.getElementById('nav-btn-gdrive').click();
            return;
        }
        
        DOM.btnSyncGdrive.disabled = true;
        DOM.btnSyncGdrive.innerHTML = `<i data-lucide="loader" class="spinner"></i> Syncing...`;
        lucide.createIcons();
        
        try {
            const mdText = generateMarkdown(activeResume);
            const fileName = getExportFileName('.md');
            
            const result = await uploadToGoogleDrive(fileName, mdText, 'text/markdown');
            
            if (isTailoredMode && currentTailoredRecord) {
                // Save link to DB against this tailored snapshot
                currentTailoredRecord.gdriveFileId = result.fileId;
                currentTailoredRecord.gdriveLink = result.webViewLink;
                await db.tailoredResumes.put(currentTailoredRecord);
            }
            
            alert(`Uploaded successfully to Google Drive!\nFile Link: ${result.webViewLink}`);
            
            // Open drive link in a new tab
            window.open(result.webViewLink, '_blank');
        } catch (err) {
            alert(`GDrive Sync Failed: ${err.message}`);
        } finally {
            DOM.btnSyncGdrive.disabled = false;
            DOM.btnSyncGdrive.innerHTML = `<i data-lucide="cloud-upload"></i> <span>Sync MD</span>`;
            lucide.createIcons();
        }
    });

    // Gdoc Sync Action
    DOM.btnSyncGdoc.addEventListener('click', async () => {
        if (!gdriveConnected) {
            alert('Google Drive is not linked. Please configure your Client ID in the Google Drive tab and login.');
            document.getElementById('nav-btn-gdrive').click();
            return;
        }
        
        DOM.btnSyncGdoc.disabled = true;
        DOM.btnSyncGdoc.innerHTML = `<i data-lucide="loader" class="spinner"></i> Syncing...`;
        lucide.createIcons();
        
        try {
            const templateId = DOM.selectTemplate.value;
            const htmlContent = compileGoogleDocHtml(activeResume, templateId, sectionOrdering, templateStyles);
            
            let docName = activeResume.personalInfo.fullName || 'Resume';
            if (isTailoredMode && activeJobId) {
                const comp = DOM.jobInputCompany.value || 'Custom';
                docName = `Resume - ${docName} (for ${comp})`;
            } else {
                docName = `Resume - ${docName}`;
            }
            
            const result = await uploadAsGoogleDoc(docName, htmlContent);
            
            if (isTailoredMode && currentTailoredRecord) {
                // Save link to DB against this tailored snapshot
                currentTailoredRecord.gdriveFileId = result.fileId;
                currentTailoredRecord.gdriveLink = result.webViewLink;
                await db.tailoredResumes.put(currentTailoredRecord);
            }
            
            alert(`Uploaded and converted successfully to Google Doc!\nFile Link: ${result.webViewLink}`);
            
            // Open docs edit link in a new tab
            window.open(result.webViewLink, '_blank');
        } catch (err) {
            alert(`Google Doc Sync Failed: ${err.message}`);
        } finally {
            DOM.btnSyncGdoc.disabled = false;
            DOM.btnSyncGdoc.innerHTML = `<i data-lucide="file-text"></i> <span>Sync Doc</span>`;
            lucide.createIcons();
        }
    });
}

function getExportFileName(extension) {
    const name = activeResume.personalInfo.fullName || 'Resume';
    const cleanName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (isTailoredMode && activeJobId) {
        // Append company
        const comp = DOM.jobInputCompany.value || 'Custom';
        const cleanComp = comp.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        return `resume_${cleanName}_for_${cleanComp}${extension}`;
    }
    
    return `resume_${cleanName}${extension}`;
}

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Generate Raw Markdown Format
function generateMarkdown(resumeData) {
    const { personalInfo = {}, experience = [], education = [], skills = [], projects = [], certifications = [] } = resumeData;
    
    let md = `# ${personalInfo.fullName || 'Professional Resume'}\n\n`;
    
    const contacts = [];
    if (personalInfo.email) contacts.push(`Email: ${personalInfo.email}`);
    if (personalInfo.phone) contacts.push(`Phone: ${personalInfo.phone}`);
    if (personalInfo.location) contacts.push(`Location: ${personalInfo.location}`);
    if (personalInfo.website) contacts.push(`Website: ${personalInfo.website}`);
    if (personalInfo.linkedin) contacts.push(`LinkedIn: ${personalInfo.linkedin}`);
    if (personalInfo.github) contacts.push(`GitHub: ${personalInfo.github}`);
    
    md += contacts.join(' | ') + '\n\n';
    
    if (personalInfo.summary) {
        md += `## Professional Summary\n${personalInfo.summary}\n\n`;
    }
    
    if (experience.length > 0) {
        md += `## Professional Experience\n\n`;
        experience.forEach(exp => {
            const dates = `${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`;
            md += `### ${exp.position} | ${exp.company} (${dates})\n`;
            if (exp.location) md += `*Location: ${exp.location}*\n\n`;
            md += `${exp.description}\n\n`;
        });
    }
    
    if (projects.length > 0) {
        md += `## Key Projects\n\n`;
        projects.forEach(proj => {
            const dates = `${proj.startDate} - ${proj.endDate}`;
            const title = proj.link ? `[${proj.name}](${proj.link})` : proj.name;
            md += `### ${title} | ${proj.role} (${dates})\n`;
            if (proj.technologies && proj.technologies.length > 0) {
                md += `*Technologies: ${proj.technologies.join(', ')}*\n\n`;
            }
            md += `${proj.description}\n\n`;
        });
    }
    
    if (education.length > 0) {
        md += `## Education\n\n`;
        education.forEach(edu => {
            const dates = `${edu.startDate} - ${edu.endDate}`;
            md += `### ${edu.school} (${dates})\n`;
            md += `${edu.degree} in ${edu.fieldOfStudy}\n`;
            if (edu.location) md += `*Location: ${edu.location}*\n`;
            if (edu.description) md += `${edu.description}\n`;
            md += `\n`;
        });
    }
    
    if (skills.length > 0) {
        md += `## Skills\n${skills.join(', ')}\n\n`;
    }
    
    if (certifications.length > 0) {
        md += `## Certifications\n${certifications.join(', ')}\n\n`;
    }
    
    return md;
}

/* ==========================================================================
   GOOGLE DRIVE INTEGRATION HANDLER
   ========================================================================== */

async function setupGoogleApi() {
    // Check if client ID is already provided
    const clientId = DOM.inputGdriveClientId.value.trim();
    
    // Save client ID on update
    DOM.inputGdriveClientId.addEventListener('change', async (e) => {
        const cId = e.target.value.trim();
        await saveSetting('gdrive_client_id', cId);
        
        if (cId) {
            initGoogleClient(cId, onGdriveStatusChanged);
        }
    });

    DOM.btnGdriveLogin.addEventListener('click', () => {
        try {
            requestGoogleLogin();
        } catch (err) {
            alert(err.message);
        }
    });

    DOM.btnGdriveLogout.addEventListener('click', async () => {
        await logoutGoogleDrive();
        onGdriveStatusChanged({ connected: false });
    });

    // Check if token cached and valid
    const cachedToken = await getSetting('gdrive_access_token');
    if (cachedToken && clientId) {
        // Quick verify with a simple endpoint request or assume connected for now
        gdriveConnected = true;
        onGdriveStatusChanged({ connected: true, token: cachedToken });
    }

    if (clientId) {
        initGoogleClient(clientId, onGdriveStatusChanged);
    }
}

function onGdriveStatusChanged(status) {
    if (status.connected) {
        gdriveConnected = true;
        DOM.gdriveBadge.className = 'connection-status online';
        DOM.gdriveBadge.querySelector('.status-text').innerText = 'Drive Linked';
        
        DOM.btnGdriveLogin.classList.add('hidden');
        DOM.btnGdriveLogout.classList.remove('hidden');
        
        DOM.cloudIcon.className = 'cloud-hero-icon connected';
        DOM.connectionHeading.innerText = 'Connected to Google Drive';
        DOM.connectionDesc.innerText = 'All set! Your resumes can now be synced directly to your Google Drive account.';
    } else {
        gdriveConnected = false;
        DOM.gdriveBadge.className = 'connection-status offline';
        DOM.gdriveBadge.querySelector('.status-text').innerText = 'Drive Disconnected';
        
        DOM.btnGdriveLogin.classList.remove('hidden');
        DOM.btnGdriveLogout.classList.add('hidden');
        
        DOM.cloudIcon.className = 'cloud-hero-icon disconnected';
        DOM.connectionHeading.innerText = 'Drive Account Access';
        DOM.connectionDesc.innerText = 'Integrate directly with Google Drive using a client-side OAuth flow.';
        
        if (status.error) {
            console.error('Google API error status changed:', status.error);
        }
    }
}

/* ==========================================================================
   GEMINI AI SETUP HANDLER
   ========================================================================== */

async function setupGeminiApi() {
    // Bind API key changes
    DOM.inputGeminiApiKey.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        geminiApiKey = val;
        await saveSetting('gemini_api_key', val);
        triggerKeywordAnalysis();
    });

    // Bind Provider Dropdown changes
    DOM.selectAiProvider.addEventListener('change', async (e) => {
        const val = e.target.value;
        aiProvider = val;
        await saveSetting('ai_provider', val);
        toggleAiConfigSections(val);
        updateMatcherModeUI();
        triggerKeywordAnalysis();
    });

    // Bind LiteLLM settings changes
    DOM.inputLitellmBaseUrl.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        litellmBaseUrl = val;
        await saveSetting('litellm_base_url', val);
        triggerKeywordAnalysis();
    });

    DOM.inputLitellmModelName.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        litellmModelName = val;
        await saveSetting('litellm_model_name', val);
        updateMatcherModeUI();
        triggerKeywordAnalysis();
    });

    DOM.inputLitellmApiKey.addEventListener('change', async (e) => {
        const val = e.target.value.trim();
        litellmApiKey = val;
        await saveSetting('litellm_api_key', val);
        triggerKeywordAnalysis();
    });

    // Bind mode selector toggle clicks
    const setMode = async (mode) => {
        if (mode === 'llm') {
            if (aiProvider === 'gemini' && !geminiApiKey) {
                alert('Please input your Gemini API Key in the Integrations tab.');
                document.getElementById('nav-btn-gdrive').click();
                DOM.inputGeminiApiKey.focus();
                return;
            }
            if (aiProvider === 'litellm' && !litellmBaseUrl) {
                alert('Please input your API Base URL in the Integrations tab.');
                document.getElementById('nav-btn-gdrive').click();
                DOM.inputLitellmBaseUrl.focus();
                return;
            }
        }
        
        matcherMode = mode;
        await saveSetting('matcher_mode', mode);
        updateMatcherModeUI();
        triggerKeywordAnalysis();
    };

    DOM.btnModeLocal.addEventListener('click', () => setMode('local'));
    DOM.btnModeLlm.addEventListener('click', () => setMode('llm'));

    // Bind Test Connection click
    DOM.btnTestLlm.addEventListener('click', async () => {
        DOM.llmTestResult.style.display = 'inline-block';
        DOM.llmTestResult.style.color = 'var(--ui-text-muted)';
        DOM.llmTestResult.innerHTML = `<i data-lucide="loader" class="spinner" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i> Testing Connection...`;
        lucide.createIcons();
        DOM.btnTestLlm.disabled = true;

        try {
            const provider = DOM.selectAiProvider.value;
            const config = { provider };

            if (provider === 'litellm') {
                config.baseUrl = DOM.inputLitellmBaseUrl.value.trim();
                config.model = DOM.inputLitellmModelName.value.trim();
                config.apiKey = DOM.inputLitellmApiKey.value.trim();
            } else {
                config.apiKey = DOM.inputGeminiApiKey.value.trim();
            }

            const response = await testLLMConnection(config);
            DOM.llmTestResult.style.color = '#10b981'; // Success green
            DOM.llmTestResult.textContent = `✓ Success: Connection verified!`;
        } catch (err) {
            console.error('LLM Connection Test Failed:', err);
            DOM.llmTestResult.style.color = '#ef4444'; // Error red
            DOM.llmTestResult.textContent = `✗ Failed: ${err.message}`;
        } finally {
            DOM.btnTestLlm.disabled = false;
        }
    });
}

function toggleAiConfigSections(provider) {
    if (provider === 'litellm') {
        DOM.sectionConfigGemini.classList.add('hidden');
        DOM.sectionConfigLitellm.classList.remove('hidden');
    } else {
        DOM.sectionConfigGemini.classList.remove('hidden');
        DOM.sectionConfigLitellm.classList.add('hidden');
    }
}

function updateMatcherModeUI() {
    if (matcherMode === 'llm') {
        DOM.btnModeLocal.classList.remove('active');
        DOM.btnModeLlm.classList.add('active');
        const modelDisplay = aiProvider === 'litellm' ? litellmModelName : 'gemini-1.5-flash';
        DOM.aiModelBadge.textContent = `(${modelDisplay})`;
        DOM.aiModelBadge.style.display = 'block';
    } else {
        DOM.btnModeLocal.classList.add('active');
        DOM.btnModeLlm.classList.remove('active');
        DOM.aiModelBadge.style.display = 'none';
    }
}

function setupResizableView() {
    let isDragging = false;

    DOM.resizer.addEventListener('mousedown', (e) => {
        isDragging = true;
        DOM.resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const sidebarWidth = DOM.sidebar.getBoundingClientRect().width;
        let newWidth = e.clientX - sidebarWidth;

        const minWidth = 350;
        const maxWidth = window.innerWidth - sidebarWidth - 350;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        DOM.workspace.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            DOM.resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.dispatchEvent(new Event('resize'));
        }
    });

    // Touch support
    DOM.resizer.addEventListener('touchstart', (e) => {
        isDragging = true;
        DOM.resizer.classList.add('dragging');
        e.preventDefault();
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        if (e.touches.length === 0) return;

        const touch = e.touches[0];
        const sidebarWidth = DOM.sidebar.getBoundingClientRect().width;
        let newWidth = touch.clientX - sidebarWidth;

        const minWidth = 350;
        const maxWidth = window.innerWidth - sidebarWidth - 350;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        DOM.workspace.style.width = `${newWidth}px`;
    });

    document.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            DOM.resizer.classList.remove('dragging');
            window.dispatchEvent(new Event('resize'));
        }
    });

    // Keep workspace sized within screen limits on resize
    window.addEventListener('resize', () => {
        const sidebarWidth = DOM.sidebar.getBoundingClientRect().width;
        const currentWidth = DOM.workspace.getBoundingClientRect().width;
        const maxWidth = window.innerWidth - sidebarWidth - 350;
        
        if (currentWidth > maxWidth) {
            DOM.workspace.style.width = `${maxWidth}px`;
        }
    });
}

async function setupCollapsibleSidebar() {
    const isCollapsed = (await getSetting('sidebar_collapsed', 'false')) === 'true';
    if (isCollapsed) {
        DOM.sidebar.classList.add('collapsed');
    }

    DOM.btnCollapseSidebar.addEventListener('click', async () => {
        const currentlyCollapsed = DOM.sidebar.classList.toggle('collapsed');
        await saveSetting('sidebar_collapsed', currentlyCollapsed ? 'true' : 'false');
        
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300);
    });
}

function openRewriteModal(textareaElement) {
    if (aiProvider === 'gemini' && !geminiApiKey) {
        alert('Please configure your Gemini API Key in the Integrations tab first.');
        document.getElementById('nav-btn-gdrive').click();
        DOM.inputGeminiApiKey.focus();
        return;
    }
    if (aiProvider === 'litellm' && !litellmBaseUrl) {
        alert('Please configure your API Base URL in the Integrations tab first.');
        document.getElementById('nav-btn-gdrive').click();
        DOM.inputLitellmBaseUrl.focus();
        return;
    }

    activeRewriteTarget = textareaElement;
    
    document.getElementById('ai-rewrite-before').value = textareaElement.value;
    document.getElementById('ai-rewrite-after').value = '';
    document.getElementById('ai-rewrite-instructions').value = '';
    document.getElementById('btn-apply-rewrite').disabled = true;
    
    const modelDisplay = aiProvider === 'litellm' ? litellmModelName : 'gemini-1.5-flash';
    document.getElementById('ai-rewrite-status').innerHTML = `Optimizing segment using <strong>${aiProvider === 'gemini' ? 'Gemini AI' : 'OpenAI Compatible'}</strong> (${modelDisplay})`;
    
    document.getElementById('ai-rewrite-modal').style.display = 'flex';
    document.getElementById('ai-rewrite-instructions').focus();
    lucide.createIcons();
}

function setupRewriteModalListeners() {
    const modal = document.getElementById('ai-rewrite-modal');
    const closeBtn = document.getElementById('btn-close-rewrite-modal');
    const cancelBtn = document.getElementById('btn-cancel-rewrite');
    const applyBtn = document.getElementById('btn-apply-rewrite');
    const executeBtn = document.getElementById('btn-execute-rewrite');
    const instructionsInput = document.getElementById('ai-rewrite-instructions');
    const spinner = document.getElementById('ai-rewrite-spinner');

    const closeModal = () => {
        modal.style.display = 'none';
        activeRewriteTarget = null;
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    executeBtn.addEventListener('click', async () => {
        const text = document.getElementById('ai-rewrite-before').value;
        const instructions = instructionsInput.value.trim();
        
        let activeJd = '';
        if (activeJobId) {
            const job = await db.jobs.get(activeJobId);
            if (job) activeJd = job.description || '';
        }

        executeBtn.disabled = true;
        spinner.style.display = 'inline-block';
        lucide.createIcons();

        try {
            const config = {
                provider: aiProvider,
                apiKey: aiProvider === 'litellm' ? litellmApiKey : geminiApiKey,
                baseUrl: litellmBaseUrl,
                model: litellmModelName
            };

            const result = await rewriteTextLLM(text, instructions, activeJd, config);
            document.getElementById('ai-rewrite-after').value = result;
            applyBtn.disabled = false;
        } catch (err) {
            alert(`Rewrite Failed: ${err.message}`);
        } finally {
            executeBtn.disabled = false;
            spinner.style.display = 'none';
        }
    });

    applyBtn.addEventListener('click', () => {
        if (activeRewriteTarget) {
            activeRewriteTarget.value = document.getElementById('ai-rewrite-after').value;
            activeRewriteTarget.dispatchEvent(new Event('input'));
            closeModal();
        }
    });
}
