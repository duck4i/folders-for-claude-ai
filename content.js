// content.js

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
    folderUploadButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-up"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m9 13 3-3 3 3"/></svg>';
    folderUploadButton.title = 'Upload Folder';
    folderUploadButton.setAttribute('aria-label', 'Upload folder');

    // Copy classes and styles from the original upload button
    folderUploadButton.className = uploadButton.className;
    folderUploadButton.style.cssText = uploadButton.style.cssText;

    // Add additional styles to match the original button
    folderUploadButton.style.display = 'inline-flex';
    folderUploadButton.style.alignItems = 'center';
    folderUploadButton.style.justifyContent = 'center';

    const folderInput = document.createElement('input');
    folderInput.type = 'file';
    folderInput.id = 'claude-folder-input';
    folderInput.webkitdirectory = true;
    folderInput.style.display = 'none';

    folderInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        const acceptedTypes = getAcceptedFileTypes();

        let ignoredCount = 0;
        const allowedFiles = files.filter(file => {
            // Exclude files and folders starting with a dot, including .git
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.some(part => part.startsWith('.'))) {
                ignoredCount++;
                return false;
            }

            return acceptedTypes.some(type => {
                const extension = type.startsWith('.') ? type : `.${type}`;
                return file.name.toLowerCase().endsWith(extension.toLowerCase());
            });
        });

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
            let combinedContent = '';
            const rootFolderName = allowedFiles[0].webkitRelativePath.split('/')[0];

            if (allowedFiles.length > 5) {
                // Sort files to maintain folder structure
                allowedFiles.sort((a, b) => a.webkitRelativePath.localeCompare(b.webkitRelativePath));

                let currentPath = '';
                for (const file of allowedFiles) {
                    const relativePath = file.webkitRelativePath.slice(rootFolderName.length + 1);
                    const folderPath = relativePath.split('/').slice(0, -1).join('/');

                    if (folderPath !== currentPath) {
                        if (currentPath !== '') {
                            combinedContent += '\n';
                        }
                        currentPath = folderPath;
                        combinedContent += `\n[Folder]: ${folderPath || '(root)'}\n`;
                    }

                    combinedContent += `\n[File]: ${file.name}\n\n`;

                    if (file.type.startsWith('image/')) {
                        combinedContent += '<image_content>\n';
                    } else {
                        const content = await file.text();
                        combinedContent += `${content}\n`;
                    }
                }

                const combinedFile = new File([combinedContent.trim()], `${rootFolderName}_combined.txt`, { type: 'text/plain' });

                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(combinedFile);
                originalInput.files = dataTransfer.files;
                originalInput.dispatchEvent(new Event('change', { bubbles: true }));

                showToast(`Successfully combined ${allowedFiles.length} files into one .txt file`);
            } else {
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

                showToast(`Successfully added ${allowedFiles.length} file${allowedFiles.length === 1 ? '' : 's'}`);
            }

            if (ignoredCount > 0) {
                showToast(`${ignoredCount} file${ignoredCount === 1 ? '' : 's'} starting with . were ignored for safety.`, 5000);
            }
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