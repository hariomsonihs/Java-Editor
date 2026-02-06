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
        if (!fileManager.currentProject) {
            const defaultProject = fileManager.createProject('My Project');
            if (defaultProject) {
                renderProjects();
                renderFiles();
            }
        }
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
        const file = fileManager.createFile(fileManager.currentProject.id, name);
        if (file) {
            renderFiles();
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
    projectsList.innerHTML = '';

    fileManager.projects.forEach(project => {
        const div = document.createElement('div');
        div.className = 'project-item' + (fileManager.currentProject?.id === project.id ? ' active' : '');
        div.innerHTML = `
            <i class="fas fa-folder"></i>
            <span>${project.name}</span>
            <div class="file-actions">
                <button class="file-action-btn" onclick="deleteProject('${project.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions')) {
                selectProject(project.id);
            }
        });
        projectsList.appendChild(div);
    });
}

function selectProject(projectId) {
    fileManager.setCurrentProject(projectId);
    renderProjects();
    renderFiles();
}

function renderFiles() {
    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '';

    if (!fileManager.currentProject) {
        filesList.innerHTML = '<p style="padding: 8px; font-size: 12px; color: #888;">No project selected</p>';
        return;
    }

    const files = fileManager.getAllFiles(fileManager.currentProject.id);
    
    if (files.length === 0) {
        filesList.innerHTML = '<p style="padding: 8px; font-size: 12px; color: #888;">No files yet</p>';
        return;
    }

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'file-item' + (fileManager.currentFile?.id === file.id ? ' active' : '');
        div.innerHTML = `
            <i class="fas fa-file-code"></i>
            <span>${file.name}</span>
            <div class="file-actions">
                <button class="file-action-btn" onclick="event.stopPropagation(); downloadFile('${file.id}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="file-action-btn" onclick="event.stopPropagation(); deleteFile('${file.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        div.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions') && !executionState.waitingForInput) {
                openFile(file.id);
            }
        });
        filesList.appendChild(div);
    });
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
    renderFiles();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }
}

function saveCurrentFile() {
    if (!fileManager.currentProject || !fileManager.currentFile) {
        if (fileManager.projects.length === 0) {
            const code = editor.value;
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            const className = classMatch ? classMatch[1] : 'Main';
            
            fileManager.createProject('My Project');
            renderProjects();
            
            const file = fileManager.createFile(fileManager.currentProject.id, className + '.java');
            if (file) {
                fileManager.setCurrentFile(file.id);
                document.getElementById('currentFileName').textContent = file.name;
                renderFiles();
            }
        } else {
            return;
        }
    }

    if (fileManager.currentProject && fileManager.currentFile) {
        const content = editor.value;
        fileManager.updateFileContent(
            fileManager.currentProject.id,
            fileManager.currentFile.id,
            content
        );
        isEditorDirty = false;
        updateSaveIndicator(true);
    }
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
        renderFiles();
        if (!fileManager.currentProject) {
            editor.value = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
            document.getElementById('currentFileName').textContent = 'Untitled.java';
        }
    }
}

function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        fileManager.deleteFile(fileManager.currentProject.id, fileId);
        renderFiles();
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

    document.getElementById('fontSize').value = fontSize;
    document.getElementById('autoSave').checked = autoSave;

    editor.style.fontSize = fontSize + 'px';

    if (autoSave) {
        startAutoSave();
    }
}

function startAutoSave() {
    fileManager.startAutoSave(() => {
        if (isEditorDirty && fileManager.currentFile) {
            saveCurrentFile();
        }
    }, 3000);
}

window.addEventListener('beforeunload', (e) => {
    if (isEditorDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});
