function getAcceptedFileTypes() {
    const fileInput = document.querySelector('input[data-testid="file-upload"]');
    if (!fileInput) {
        console.warn('File input not found');
        return [];
    }
    const acceptAttribute = fileInput.getAttribute('accept');
    return acceptAttribute ? acceptAttribute.split(',') : [];
}

function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        z-index: 9999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, duration);
}

function injectFolderUploadButton() {
    console.log('Attempting to inject folder upload button...');

    const uploadButton = document.querySelector('button[aria-label="Upload content"]');
    if (!uploadButton) {
        console.log('Upload button not found');
        return;
    }

    if (document.getElementById('claude-folder-upload')) {
        console.log('Folder upload button already exists');
        return;
    }

    console.log('Found upload button, injecting folder button...');

    const folderUploadButton = document.createElement('button');
    folderUploadButton.id = 'claude-folder-upload';
    folderUploadButton.innerHTML = '📁';
    folderUploadButton.title = 'Upload Folder';
    folderUploadButton.setAttribute('aria-label', 'Upload folder');

    folderUploadButton.className = uploadButton.className;
    folderUploadButton.style.marginLeft = '8px';

    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.id = 'claude-folder-input';
    folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';

    folderInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        const acceptedTypes = getAcceptedFileTypes();

        const allowedFiles = files.filter(file =>
            acceptedTypes.some(type => {
                const extension = type.startsWith('.') ? type : `.${type}`;
                return file.name.toLowerCase().endsWith(extension.toLowerCase());
            })
        );

        if (allowedFiles.length === 0) {
            showToast('No compatible files found in the selected folder');
            return;
        }

        const originalInput = document.querySelector('input[data-testid="file-upload"]');
        if (!originalInput) {
            showToast('Could not find file upload input');
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
            showToast(`Successfully added ${fileCount} file${fileCount === 1 ? '' : 's'} from folder`);
        } catch (error) {
            console.error('Error processing files:', error);
            showToast('An error occurred while processing the files. Please try again with fewer files.');
        }
    });

    folderUploadButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderInput.click();
    });

    uploadButton.parentElement.appendChild(folderUploadButton);
    uploadButton.parentElement.appendChild(folderInput);

    console.log('Folder upload button successfully injected');
}

function waitForUploadButton() {
    return new Promise((resolve) => {
        const checkButton = () => {
            const uploadButton = document.querySelector('button[aria-label="Upload content"]');
            if (uploadButton) {
                resolve();
            } else {
                requestAnimationFrame(checkButton);
            }
        };
        checkButton();
    });
}

// Wait for the document to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Document fully loaded, waiting for upload button...');
    await waitForUploadButton();
    injectFolderUploadButton();
});

// Set up a MutationObserver to handle dynamic changes
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
            const uploadButton = document.querySelector('button[aria-label="Upload content"]');
            if (uploadButton && !document.getElementById('claude-folder-upload')) {
                injectFolderUploadButton();
                break;
            }
        }
    }
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
    childList: true,
    subtree: true
});