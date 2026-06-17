import { getSetting, saveSetting } from './db.js';

let accessToken = null;
let tokenClient = null;

/**
 * Initialize Google Identity Services (GIS) client.
 */
export function initGoogleClient(clientId, onStatusChange) {
    if (!window.google) {
        console.error('Google Identity Services client library not found on window.');
        return;
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: async (tokenResponse) => {
            if (tokenResponse.error !== undefined) {
                console.error('OAuth token initialization error:', tokenResponse.error);
                onStatusChange({ connected: false, error: tokenResponse.error });
                return;
            }
            accessToken = tokenResponse.access_token;
            // Cache token locally in IndexedDB
            await saveSetting('gdrive_access_token', accessToken);
            onStatusChange({ connected: true, token: accessToken });
        },
    });
}

/**
 * Request OAuth token consent screen from Google.
 */
export function requestGoogleLogin() {
    if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        throw new Error('Google Client is not initialized. Provide Client ID first.');
    }
}

/**
 * Log out and clear cached credentials.
 */
export async function logoutGoogleDrive() {
    accessToken = null;
    await saveSetting('gdrive_access_token', '');
}

/**
 * Helper: Retrieve or create a folder named resumecrafter in the user's Drive.
 */
async function getOrCreateFolder(folderName) {
    if (!accessToken) {
        accessToken = await getSetting('gdrive_access_token');
    }
    if (!accessToken) {
        throw new Error('Google Drive access is unauthorized. Connect to Google Drive first.');
    }

    // 1. Search for existing folder with folderName
    const query = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
            accessToken = null;
            await saveSetting('gdrive_access_token', '');
            throw new Error('Google Drive authorization token has expired. Please re-authenticate.');
        }
        throw new Error('Failed to search for resumecrafter folder in Google Drive.');
    }

    const searchData = await searchResponse.json();
    if (searchData.files && searchData.files.length > 0) {
        // Folder exists, return ID
        return searchData.files[0].id;
    }

    // 2. Folder does not exist, create it
    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });

    if (!createResponse.ok) {
        throw new Error('Failed to create resumecrafter folder in Google Drive.');
    }

    const folderData = await createResponse.json();
    return folderData.id;
}

/**
 * Upload a text file (Markdown or JSON) to the user's Google Drive.
 * Uses a multipart/related standard API request.
 */
export async function uploadToGoogleDrive(fileName, textContent, mimeType = 'text/markdown') {
    if (!accessToken) {
        accessToken = await getSetting('gdrive_access_token');
    }
    
    if (!accessToken) {
        throw new Error('Google Drive access is unauthorized. Connect to Google Drive first.');
    }

    // Retrieve or create 'resumecrafter' folder
    const folderId = await getOrCreateFolder('resumecrafter');

    const metadata = {
        name: fileName,
        mimeType: mimeType,
        parents: [folderId] // Direct upload into the resumecrafter folder
    };

    const boundary = '-------resumecrafterBoundary3d9f108';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
        textContent +
        closeDelimiter;

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
    });

    if (!response.ok) {
        if (response.status === 401) {
            accessToken = null;
            await saveSetting('gdrive_access_token', '');
            throw new Error('Google Drive authorization token has expired. Please re-authenticate.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Error occurred uploading to Google Drive.');
    }

    const responseData = await response.json();
    const fileId = responseData.id;
    const webViewLink = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

    return {
        fileId,
        webViewLink
    };
}
