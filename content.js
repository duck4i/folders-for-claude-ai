// content.js
const ALLOWED_TYPES = [
    '.txt', '.js', '.py', '.html', '.css', '.json', '.csv',
    '.md', '.yml', '.yaml', '.xml', '.svg', '.pdf'
];

function injectFolderUploadButton() {
    console.log('Attempting to inject folder upload button...'); // Debug log

    // Updated selector to find the upload button
    const uploadButton = document.querySelector('button[aria-label="Upload content"]');
    if (!uploadButton) {
        console.log('Upload button not found'); // Debug log
        return;
    }

    // Check if our button already exists
    if (document.getElementById('claude-folder-upload')) {
        console.log('Folder upload button already exists'); // Debug log
        return;
    }

    console.log('Found upload button, injecting folder button...'); // Debug log

    // Create folder upload button
    const folderUploadButton = document.createElement('button');
    folderUploadButton.id = 'claude-folder-upload';
    folderUploadButton.innerHTML = '📁';
    folderUploadButton.title = 'Upload Folder';
    folderUploadButton.setAttribute('aria-label', 'Upload folder');

    // Match Claude's button styling
    folderUploadButton.className = uploadButton.className;
    folderUploadButton.style.marginLeft = '8px';

    // Create hidden folder input
    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.id = 'claude-folder-input';
    folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';

    // Handle folder selection
    folderInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);

        const allowedFiles = files.filter(file =>
            ALLOWED_TYPES.some(type => file.name.toLowerCase().endsWith(type))
        );

        if (allowedFiles.length === 0) {
            alert('No compatible files found in the selected folder');
            return;
        }

        const originalInput = document.querySelector('input[type="file"]');
        if (!originalInput) {
            alert('Could not find file upload input');
            return;
        }

        try {
            const dataTransfer = new DataTransfer();

            allowedFiles.forEach(file => {
                try {
                    dataTransfer.items.add(file);
                } catch (e) {
                    console.warn('Failed to add file:', file.name, e);
                }
            });

            originalInput.files = dataTransfer.files;
            originalInput.dispatchEvent(new Event('change', { bubbles: true }));

            const fileCount = allowedFiles.length;
            alert(`Successfully added ${fileCount} file${fileCount === 1 ? '' : 's'} from folder`);
        } catch (error) {
            console.error('Error processing files:', error);
            alert('An error occurred while processing the files. Please try again with fewer files.');
        }
    });

    // Handle folder button click
    folderUploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderInput.click();
    });

    // Add elements to page
    uploadButton.parentElement.appendChild(folderUploadButton);
    uploadButton.parentElement.appendChild(folderInput);

    console.log('Folder upload button successfully injected'); // Debug log
}

// Try to inject immediately in case the button already exists
injectFolderUploadButton();

// Watch for changes and inject button when possible
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            injectFolderUploadButton();
        }
    }
});

// Start observing with a more comprehensive configuration
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});

// Also try to inject periodically for the first few seconds
const MAX_RETRIES = 10;
let retryCount = 0;
const retryInterval = setInterval(() => {
    if (retryCount >= MAX_RETRIES) {
        clearInterval(retryInterval);
        return;
    }
    injectFolderUploadButton();
    retryCount++;
}, 1000);