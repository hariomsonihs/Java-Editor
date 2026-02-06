let editor;
let isEditorDirty = false;

// Initialize after everything loads
window.addEventListener('load', function() {
    console.log('Window loaded, initializing Editor...');
    setTimeout(() => {
        initializeEditor();
        initializeUI();
        loadSettings();
        renderProjects();
        restoreLastSession();
    }, 100);
});

function initializeEditor() {
    console.log('Initializing Textarea Editor...');
    
    editor = document.getElementById('editor');
    if (!editor) {
        console.error('Editor element not found!');
        return;
    }
    
    editor.value = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
    
    editor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + 4;
        }
    });
    
    editor.addEventListener('input', function() {
        isEditorDirty = true;
        updateSaveIndicator(false);
        
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => {
            if (isEditorDirty) {
                saveCurrentFile();
            }
        }, 2000);
    });
    
    console.log('Textarea Editor initialized successfully');
    
    setTimeout(() => {
        saveCurrentFile();
    }, 1000);
}

function initializeUI() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeSidebar = document.getElementById('closeSidebar');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    closeSidebar.addEventListener('click', closeSidebarPanel);
    overlay.addEventListener('click', closeSidebarPanel);

    function closeSidebarPanel() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    document.getElementById('newProject').addEventListener('click', () => {
        document.getElementById('projectModal').classList.add('active');
    });

    document.getElementById('newFile').addEventListener('click', () => {
        document.getElementById('fileModal').classList.add('active');
    });

    document.getElementById('createProject').addEventListener('click', () => {
        const name = document.getElementById('projectName').value;
        const project = fileManager.createProject(name);
        if (project) {
            renderProjects();
            document.getElementById('projectModal').classList.remove('active');
            document.getElementById('projectName').value = '';
        }
    });

    document.getElementById('createFile').addEventListener('click', () => {
        const name = document.getElementById('fileName').value;
        const projectId = fileManager.currentProject ? fileManager.currentProject.id : null;
        const file = fileManager.createFile(projectId, name);
        if (file) {
            renderProjects();
            openFile(file.id);
            document.getElementById('fileModal').classList.remove('active');
            document.getElementById('fileName').value = '';
        }
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.closest('button').dataset.modal;
            document.getElementById(modalId).classList.remove('active');
        });
    });

    document.getElementById('runCode').addEventListener('click', runCode);
    document.getElementById('downloadCode').addEventListener('click', downloadCurrentFile);
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('active');
    });

    document.getElementById('closeOutput').addEventListener('click', () => {
        document.getElementById('outputPanel').classList.remove('active');
    });

    document.getElementById('clearConsole').addEventListener('click', () => {
        document.getElementById('outputContent').innerHTML = '';
        document.getElementById('consoleInputArea').style.display = 'none';
    });

    document.getElementById('submitInput').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        submitConsoleInput();
    });
    
    document.getElementById('consoleInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            submitConsoleInput();
        }
    });

    document.getElementById('fontSize').addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        editor.style.fontSize = size + 'px';
        localStorage.setItem('editorFontSize', size);
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const theme = e.target.value;
        applyTheme(theme);
        localStorage.setItem('editorTheme', theme);
    });

    document.getElementById('autoSave').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('autoSaveEnabled', enabled);
        if (enabled) {
            startAutoSave();
        } else {
            fileManager.stopAutoSave();
        }
    });

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.currentTarget.dataset.action;
            handleBottomNavAction(action);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
        }
    });
}

function handleBottomNavAction(action) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    switch (action) {
        case 'editor':
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            break;
        case 'files':
            sidebar.classList.add('active');
            overlay.classList.add('active');
            break;
        case 'run':
            runCode();
            break;
        case 'settings':
            document.getElementById('settingsModal').classList.add('active');
            break;
    }
}

function renderProjects() {
    const projectsList = document.getElementById('projectsList');
    const standaloneFilesList = document.getElementById('standaloneFilesList');
    projectsList.innerHTML = '';
    standaloneFilesList.innerHTML = '';

    // Render standalone files (files without project)
    const standaloneFiles = fileManager.projects
        .filter(p => p.id === null)
        .flatMap(p => fileManager.getAllFiles(p.id));
    
    const allStandaloneFiles = fileManager.getAllFiles(null);
    
    if (allStandaloneFiles.length === 0) {
        standaloneFilesList.innerHTML = '<p style="padding: 8px; font-size: 12px; color: #888;">No standalone files</p>';
    } else {
        allStandaloneFiles.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item' + (fileManager.currentFile?.id === file.id ? ' active' : '');
            div.innerHTML = `
                <i class="fas fa-file-code"></i>
                <span>${file.name}</span>
                <div class="file-actions">
                    <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile(null, '${file.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions') && !executionState.waitingForInput) {
                    openFile(file.id);
                }
            });
            standaloneFilesList.appendChild(div);
        });
    }

    // Render projects with their files
    const realProjects = fileManager.projects.filter(p => p.id !== null);
    
    if (realProjects.length === 0) {
        projectsList.innerHTML = '<p style="padding: 8px; font-size: 12px; color: #888;">No projects</p>';
        return;
    }

    realProjects.forEach(project => {
        const projectDiv = document.createElement('div');
        projectDiv.className = 'project-item' + (fileManager.currentProject?.id === project.id ? ' active' : '');
        projectDiv.innerHTML = `
            <i class="fas fa-folder"></i>
            <span>${project.name}</span>
            <div class="file-actions">
                <button class="file-action-btn" onclick="deleteProject('${project.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        projectDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions')) {
                selectProject(project.id);
            }
        });
        projectsList.appendChild(projectDiv);
        
        // Render files inside project
        const files = fileManager.getAllFiles(project.id);
        if (files.length > 0) {
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'file-item' + (fileManager.currentFile?.id === file.id ? ' active' : '');
                fileDiv.style.paddingLeft = '30px';
                fileDiv.innerHTML = `
                    <i class="fas fa-file-code"></i>
                    <span>${file.name}</span>
                    <div class="file-actions">
                        <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${project.id}', '${file.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                fileDiv.addEventListener('click', (e) => {
                    if (!e.target.closest('.file-actions') && !executionState.waitingForInput) {
                        openFile(file.id);
                    }
                });
                projectsList.appendChild(fileDiv);
            });
        }
    });
}

function selectProject(projectId) {
    fileManager.setCurrentProject(projectId);
    localStorage.setItem('lastOpenedProjectId', projectId);
    renderProjects();
}

function renderFiles() {
    // This function is no longer needed as files are rendered in renderProjects
}

function openFile(fileId) {
    if (executionState.waitingForInput) return;
    
    if (isEditorDirty) {
        saveCurrentFile();
    }

    const file = fileManager.setCurrentFile(fileId);
    if (!file) return;

    editor.value = file.content;
    document.getElementById('currentFileName').textContent = file.name;
    isEditorDirty = false;
    updateSaveIndicator(true);
    localStorage.setItem('lastOpenedFileId', fileId);
    renderProjects();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }
}

function saveCurrentFile() {
    if (!fileManager.currentFile) {
        return;
    }

    // Find which project contains this file
    let projectId = null;
    for (const project of fileManager.projects) {
        if (project.files.find(f => f.id === fileManager.currentFile.id)) {
            projectId = project.id;
            break;
        }
    }

    const content = editor.value;
    fileManager.updateFileContent(
        projectId,
        fileManager.currentFile.id,
        content
    );
    isEditorDirty = false;
    updateSaveIndicator(true);
}

function updateSaveIndicator(saved) {
    const indicator = document.getElementById('saveIndicator');
    if (saved) {
        indicator.innerHTML = '<i class="fas fa-check-circle"></i> Saved';
        indicator.classList.remove('unsaved');
    } else {
        indicator.innerHTML = '<i class="fas fa-circle"></i> Unsaved';
        indicator.classList.add('unsaved');
    }
}

function deleteProject(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        fileManager.deleteProject(projectId);
        renderProjects();
        if (!fileManager.currentProject) {
            editor.value = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
            document.getElementById('currentFileName').textContent = 'Untitled.java';
        }
    }
}

function deleteFile(projectId, fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        fileManager.deleteFile(projectId, fileId);
        renderProjects();
        if (fileManager.currentFile?.id === fileId) {
            editor.value = '';
            document.getElementById('currentFileName').textContent = 'Untitled.java';
        }
    }
}

function downloadFile(fileId) {
    fileManager.exportFile(fileId);
}

function downloadCurrentFile() {
    if (fileManager.currentFile) {
        saveCurrentFile();
        fileManager.exportFile(fileManager.currentFile.id);
    } else {
        const content = editor.value;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Main.java';
        a.click();
        URL.revokeObjectURL(url);
    }
}

let executionState = {
    inputs: [],
    inputIndex: 0,
    waitingForInput: false,
    isExecuting: false,
    prompts: []
};

function runCode() {
    const code = editor.value;
    const outputPanel = document.getElementById('outputPanel');
    const outputContent = document.getElementById('outputContent');
    const consoleInputArea = document.getElementById('consoleInputArea');
    
    executionState = {
        inputs: [],
        inputIndex: 0,
        waitingForInput: false,
        isExecuting: true,
        prompts: []
    };
    
    outputPanel.style.display = 'flex';
    outputPanel.classList.add('active');
    outputContent.innerHTML = '<span style="color: #4caf50;">⏳ Starting execution...</span>\n\n';
    consoleInputArea.style.display = 'none';

    setTimeout(() => {
        if (code.includes('Scanner') || code.includes('BufferedReader')) {
            outputContent.innerHTML += '<span style="color: #ff9800;">📝 This program requires input.</span>\n\n';
            handleInteractiveExecution(code);
        } else {
            executeWithAPI(code, []);
        }
    }, 100);
}

function handleInteractiveExecution(code) {
    const outputContent = document.getElementById('outputContent');
    
    const inputCount = (code.match(/\.next(Line|Int|Double|Float|Boolean)\s*\(/g) || []).length;
    
    executionState.prompts = [];
    const printMatches = code.match(/System\.out\.print(?:ln)?\s*\([^)]+\)/g) || [];
    printMatches.forEach(match => {
        const textMatch = match.match(/"([^"]*)"/g);
        if (textMatch) {
            const text = textMatch[0].replace(/"/g, '');
            if (text.toLowerCase().includes('enter') || text.includes(':') || text.includes('?')) {
                executionState.prompts.push(text);
            }
        }
    });
    
    if (inputCount > 0) {
        outputContent.innerHTML += `<span style="color: #9c27b0;">ℹ️ Program expects ${inputCount} input(s). Enter them below:</span>\n\n`;
        promptForInput();
    } else {
        executeWithAPI(code, []);
    }
}

function promptForInput() {
    const consoleInputArea = document.getElementById('consoleInputArea');
    const inputField = document.getElementById('consoleInput');
    
    executionState.waitingForInput = true;
    consoleInputArea.style.display = 'flex';
    
    const code = editor.value;
    const inputCount = (code.match(/\.next(Line|Int|Double|Float|Boolean)\s*\(/g) || []).length;
    
    if (executionState.inputIndex < inputCount) {
        const currentPrompt = executionState.prompts[executionState.inputIndex] || '';
        inputField.placeholder = currentPrompt || 'Enter input...';
    }
    
    inputField.focus();
}

function submitConsoleInput() {
    const inputField = document.getElementById('consoleInput');
    const value = inputField.value;
    const outputContent = document.getElementById('outputContent');
    const outputPanel = document.getElementById('outputPanel');
    
    if (value.trim() === '') return false;
    
    const currentPrompt = executionState.prompts[executionState.inputIndex] || `Input ${executionState.inputIndex + 1}`;
    outputContent.innerHTML += `<span style="color: #00bcd4;">${currentPrompt}</span> <span style="color: #4caf50;">${value}</span>\n`;
    
    executionState.inputs.push(value);
    executionState.inputIndex++;
    inputField.value = '';
    
    const code = editor.value;
    const inputCount = (code.match(/\.next(Line|Int|Double|Float|Boolean)\s*\(/g) || []).length;
    
    if (executionState.inputIndex < inputCount) {
        promptForInput();
    } else {
        document.getElementById('consoleInputArea').style.display = 'none';
        executionState.waitingForInput = false;
        outputContent.innerHTML += '\n<span style="color: #2196f3;">--- Execution Output ---</span>\n';
        
        outputPanel.classList.add('active');
        outputPanel.style.display = 'flex';
        
        executeWithAPI(code, executionState.inputs);
    }
    
    return false;
}

function executeWithAPI(code, inputs) {
    const outputContent = document.getElementById('outputContent');
    const runBtn = document.getElementById('runCode');
    
    outputContent.innerHTML += '<span style="color: #ff9800;">⚙️ Compiling and executing...</span>\n\n';
    
    if (runBtn) runBtn.disabled = true;
    
    // Change this URL after deploying backend
    const BACKEND_URL = 'https://java-editor-production.up.railway.app'; // Local: http://localhost:5000
                                                                           // Deployed: https://java-editor-production.up.railway.app
    
    fetch(`${BACKEND_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code, input: inputs.join('\n') })
    })
    .then(response => response.json())
    .then(data => {
        if (runBtn) runBtn.disabled = false;
        executionState.isExecuting = false;
        
        if (data.success && data.output) {
            let result = data.output;
            
            const prompts = result.match(/Enter [^:]+:\s*/g) || [];
            prompts.forEach(prompt => {
                result = result.replace(prompt, '');
            });
            
            outputContent.innerHTML += `<span style="color: #e0e0e0;">${escapeHtml(result)}</span>`;
            outputContent.innerHTML += '\n<span style="color: #4caf50;">✓ Execution completed</span>';
        } else if (data.error) {
            outputContent.innerHTML += `<span style="color: #f44336;">❌ Error:\n${escapeHtml(data.error)}</span>`;
        } else {
            outputContent.innerHTML += '<span style="color: #888;">(No output)</span>';
        }
    })
    .catch(error => {
        if (runBtn) runBtn.disabled = false;
        executionState.isExecuting = false;
        outputContent.innerHTML += `<span style="color: #f44336;">❌ Server not running!</span>\n`;
        outputContent.innerHTML += '<span style="color: #ff9800;">Start server: python server_python.py</span>';
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSettings() {
    const fontSize = localStorage.getItem('editorFontSize') || 14;
    const autoSave = localStorage.getItem('autoSaveEnabled') !== 'false';
    const theme = localStorage.getItem('editorTheme') || 'vs-dark';

    document.getElementById('fontSize').value = fontSize;
    document.getElementById('autoSave').checked = autoSave;
    document.getElementById('themeSelect').value = theme;

    editor.style.fontSize = fontSize + 'px';
    applyTheme(theme);

    if (autoSave) {
        startAutoSave();
    }
}

function applyTheme(theme) {
    const body = document.body;
    const editorEl = document.getElementById('editor');
    const editorContainer = document.querySelector('.editor-container');
    
    if (theme === 'vs-light') {
        body.style.setProperty('--bg-dark', '#f3f3f3');
        body.style.setProperty('--bg-darker', '#ffffff');
        body.style.setProperty('--text-light', '#333333');
        body.style.setProperty('--text-white', '#000000');
        body.style.setProperty('--border-color', '#e0e0e0');
        editorEl.style.background = '#ffffff';
        editorEl.style.color = '#000000';
        editorContainer.style.background = '#ffffff';
        editorContainer.querySelector('::before')?.style?.setProperty('background', '#f3f3f3');
    } else if (theme === 'hc-black') {
        body.style.setProperty('--bg-dark', '#000000');
        body.style.setProperty('--bg-darker', '#000000');
        body.style.setProperty('--text-light', '#ffffff');
        body.style.setProperty('--text-white', '#ffffff');
        body.style.setProperty('--border-color', '#6fc3df');
        editorEl.style.background = '#000000';
        editorEl.style.color = '#ffffff';
        editorContainer.style.background = '#000000';
    } else {
        body.style.setProperty('--bg-dark', '#252526');
        body.style.setProperty('--bg-darker', '#1e1e1e');
        body.style.setProperty('--text-light', '#cccccc');
        body.style.setProperty('--text-white', '#ffffff');
        body.style.setProperty('--border-color', '#3e3e42');
        editorEl.style.background = '#1e1e1e';
        editorEl.style.color = '#d4d4d4';
        editorContainer.style.background = '#1e1e1e';
    }
}

function startAutoSave() {
    fileManager.startAutoSave(() => {
        if (isEditorDirty && fileManager.currentFile) {
            saveCurrentFile();
        }
    }, 3000);
}

function restoreLastSession() {
    const lastFileId = localStorage.getItem('lastOpenedFileId');
    const lastProjectId = localStorage.getItem('lastOpenedProjectId');
    
    if (lastProjectId) {
        fileManager.setCurrentProject(lastProjectId);
    }
    
    if (lastFileId) {
        const file = fileManager.setCurrentFile(lastFileId);
        if (file) {
            editor.value = file.content;
            document.getElementById('currentFileName').textContent = file.name;
            isEditorDirty = false;
            updateSaveIndicator(true);
            renderProjects();
        }
    }
}

window.addEventListener('beforeunload', (e) => {
    if (isEditorDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});
