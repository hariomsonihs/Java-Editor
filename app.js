let editor;
let isEditorDirty = false;

window.addEventListener('load', function() {
    setTimeout(() => {
        initializeEditor();
        initializeUI();
        loadSettings();
        renderProjects();
        restoreLastSession();
    }, 100);
});

function initializeEditor() {
    editor = ace.edit('editor');
    editor.setTheme('ace/theme/monokai');
    editor.session.setMode('ace/mode/java');
    editor.setOptions({
        fontSize: 14,
        showPrintMargin: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: false,
        wrap: true,
        scrollPastEnd: 0.5
    });
    
    // Enable touch scrolling for mobile
    editor.setOption('enableMobileMenu', true);
    
    editor.setValue('public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}', -1);
    
    editor.session.on('change', function() {
        isEditorDirty = true;
        updateSaveIndicator(false);
        autoSyncClassAndFilename();
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(() => { if (isEditorDirty) saveCurrentFile(); }, 2000);
    });
    
    setTimeout(() => saveCurrentFile(), 1000);
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

    const menuBtnMobile = document.getElementById('menuBtnMobile');
    if (menuBtnMobile) {
        menuBtnMobile.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    closeSidebar.addEventListener('click', closeSidebarPanel);
    overlay.addEventListener('click', closeSidebarPanel);

    function closeSidebarPanel() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }

    // Initialize resize functionality for mobile
    initializeResizeHandle();

    document.getElementById('newProject').addEventListener('click', () => {
        document.getElementById('projectModal').classList.add('active');
    });

    document.getElementById('newFile').addEventListener('click', () => {
        document.getElementById('fileModal').classList.add('active');
    });

    const practiceBtn = document.getElementById('practiceBtn');
    if (practiceBtn) {
        practiceBtn.addEventListener('click', () => {
            document.getElementById('practiceModal').classList.add('active');
            loadPracticePrograms();
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
                document.getElementById('overlay').classList.remove('active');
            }
        });
    }

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
        const name = document.getElementById('fileName').value.trim();
        if (!name) {
            alert('Please enter a file name');
            return;
        }
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
    const runCodeMobile = document.getElementById('runCodeMobile');
    if (runCodeMobile) {
        runCodeMobile.addEventListener('click', runCode);
    }
    document.getElementById('downloadCode').addEventListener('click', downloadCurrentFile);
    document.getElementById('settingsBtn').addEventListener('click', () => {
        document.getElementById('settingsModal').classList.add('active');
    });
    const refreshBtnMobile = document.getElementById('refreshBtnMobile');
    if (refreshBtnMobile) {
        refreshBtnMobile.addEventListener('click', () => {
            location.reload();
        });
    }

    document.getElementById('closeOutput').addEventListener('click', () => {
        document.getElementById('consoleModal').classList.remove('active');
    });

    document.getElementById('closeConsoleModal').addEventListener('click', () => {
        document.getElementById('consoleModal').classList.remove('active');
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

    // Modal console input handler
    const modalInput = document.getElementById('modalConsoleInput');
    if (modalInput) {
        modalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitModalInput();
            }
        });
    }

    document.getElementById('fontSize').addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        editor.setFontSize(size);
        localStorage.setItem('editorFontSize', size);
    });

    document.getElementById('fontFamily').addEventListener('change', (e) => {
        const family = e.target.value;
        editor.setOption('fontFamily', family);
        localStorage.setItem('editorFontFamily', family);
    });

    document.getElementById('tabSize').addEventListener('change', (e) => {
        const size = parseInt(e.target.value);
        editor.session.setTabSize(size);
        localStorage.setItem('editorTabSize', size);
    });

    document.getElementById('lineHeight').addEventListener('change', (e) => {
        const height = parseFloat(e.target.value);
        document.getElementById('editor').style.lineHeight = height;
        localStorage.setItem('editorLineHeight', height);
    });

    document.getElementById('wordWrap').addEventListener('change', (e) => {
        const wrap = e.target.checked;
        editor.session.setUseWrapMode(wrap);
        localStorage.setItem('editorWordWrap', wrap);
    });

    document.getElementById('showLineNumbers').addEventListener('change', (e) => {
        const show = e.target.checked;
        editor.setOption('showLineNumbers', show);
        localStorage.setItem('editorShowLineNumbers', show);
    });

    document.getElementById('autoComplete').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        editor.setOption('enableBasicAutocompletion', enabled);
        editor.setOption('enableLiveAutocompletion', enabled);
        localStorage.setItem('editorAutoComplete', enabled);
    });

    document.getElementById('highlightActiveLine').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        editor.setOption('highlightActiveLine', enabled);
        localStorage.setItem('editorHighlightActiveLine', enabled);
    });

    document.getElementById('showIndentGuides').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        editor.setOption('displayIndentGuides', enabled);
        localStorage.setItem('editorShowIndentGuides', enabled);
    });

    document.getElementById('cursorStyle').addEventListener('change', (e) => {
        const style = e.target.value;
        editor.setOption('cursorStyle', style);
        localStorage.setItem('editorCursorStyle', style);
    });

    document.getElementById('scrollSpeed').addEventListener('input', (e) => {
        const speed = parseInt(e.target.value);
        document.getElementById('scrollSpeedValue').textContent = speed;
        editor.setOption('scrollSpeed', speed);
        localStorage.setItem('editorScrollSpeed', speed);
    });

    document.getElementById('enableSnippets').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        editor.setOption('enableSnippets', enabled);
        localStorage.setItem('editorEnableSnippets', enabled);
    });

    document.getElementById('bracketMatching').addEventListener('change', (e) => {
        const enabled = e.target.checked;
        editor.setOption('behavioursEnabled', enabled);
        localStorage.setItem('editorBracketMatching', enabled);
    });

    document.getElementById('themeSelect').addEventListener('change', (e) => {
        const theme = e.target.value;
        if (theme === 'vs-light') {
            editor.setTheme('ace/theme/chrome');
        } else if (theme === 'hc-black') {
            editor.setTheme('ace/theme/terminal');
        } else {
            editor.setTheme('ace/theme/monokai');
        }
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
    
    // Prevent default backspace behavior outside editor
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.closest('#editor')) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
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
        case 'practice':
            document.getElementById('practiceModal').classList.add('active');
            loadPracticePrograms();
            break;
        case 'files':
            sidebar.classList.add('active');
            overlay.classList.add('active');
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
    const standaloneProject = fileManager.projects.find(p => p.id === null);
    const allStandaloneFiles = standaloneProject ? standaloneProject.files : [];
    
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
                    <button class="file-action-btn" onclick="event.stopPropagation(); renameFile(null, '${file.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
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
                <button class="file-action-btn" onclick="renameProject('${project.id}')">
                    <i class="fas fa-edit"></i>
                </button>
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
                        <button class="file-action-btn" onclick="event.stopPropagation(); renameFile('${project.id}', '${file.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
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
    if (isEditorDirty) saveCurrentFile();
    const file = fileManager.setCurrentFile(fileId);
    if (!file) return;
    editor.setValue(file.content, -1);
    document.getElementById('currentFileName').textContent = file.name;
    document.getElementById('currentFileNameMobile').textContent = file.name;
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
    if (!fileManager.currentFile) return;
    let projectId = null;
    for (const project of fileManager.projects) {
        if (project.files.find(f => f.id === fileManager.currentFile.id)) {
            projectId = project.id;
            break;
        }
    }
    const content = editor.getValue();
    fileManager.updateFileContent(projectId, fileManager.currentFile.id, content);
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
        const content = editor.getValue();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Main.java';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Auto-sync class name with filename
let lastDetectedClassName = null;

function autoSyncClassAndFilename() {
    if (!fileManager.currentFile) return;
    const code = editor.getValue();
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    if (classMatch) {
        const detectedClassName = classMatch[1];
        const currentFileName = fileManager.currentFile.name.replace('.java', '');
        if (detectedClassName !== lastDetectedClassName && detectedClassName !== currentFileName) {
            lastDetectedClassName = detectedClassName;
            const newFileName = detectedClassName + '.java';
            let projectId = null;
            for (const project of fileManager.projects) {
                if (project.files.find(f => f.id === fileManager.currentFile.id)) {
                    projectId = project.id;
                    break;
                }
            }
            const project = fileManager.projects.find(p => p.id === projectId);
            if (project) {
                const existingFile = project.files.find(f => f.name === newFileName && f.id !== fileManager.currentFile.id);
                if (!existingFile) {
                    fileManager.currentFile.name = newFileName;
                    document.getElementById('currentFileName').textContent = newFileName;
                    document.getElementById('currentFileNameMobile').textContent = newFileName;
                    fileManager.saveToLocalStorage();
                    renderProjects();
                }
            }
        }
    }
}

function renameFile(projectId, fileId) {
    const file = fileManager.projects
        .flatMap(p => p.files)
        .find(f => f.id === fileId);
    
    if (!file) return;
    
    const newName = prompt('Enter new file name:', file.name);
    if (newName && newName.trim() !== '' && newName !== file.name) {
        const finalName = newName.trim().endsWith('.java') ? newName.trim() : newName.trim() + '.java';
        
        // Check for duplicate
        const project = fileManager.projects.find(p => p.id === projectId);
        if (project) {
            const duplicate = project.files.find(f => f.name === finalName && f.id !== fileId);
            if (duplicate) {
                alert(`File "${finalName}" already exists!`);
                return;
            }
        }
        
        file.name = finalName;
        
        if (fileManager.currentFile?.id === fileId) {
            const newClassName = finalName.replace('.java', '');
            const code = editor.getValue();
            const updatedCode = code.replace(/public\s+class\s+\w+/, `public class ${newClassName}`);
            editor.setValue(updatedCode, -1);
            file.content = updatedCode;
            document.getElementById('currentFileName').textContent = file.name;
            document.getElementById('currentFileNameMobile').textContent = file.name;
            lastDetectedClassName = newClassName;
        }
        
        fileManager.saveToLocalStorage();
        renderProjects();
    }
}

function renameProject(projectId) {
    const project = fileManager.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const newName = prompt('Enter new project name:', project.name);
    if (newName && newName.trim() !== '' && newName !== project.name) {
        project.name = newName.trim();
        fileManager.saveToLocalStorage();
        renderProjects();
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
    const code = editor.getValue();
    const consoleModal = document.getElementById('consoleModal');
    const modalOutputContent = document.getElementById('modalOutputContent');
    const modalInputArea = document.getElementById('modalInputArea');
    const theme = localStorage.getItem('editorTheme') || 'vs-dark';
    const successColor = theme === 'vs-light' ? '#2e7d32' : '#4caf50';
    const warningColor = theme === 'vs-light' ? '#f57c00' : '#ff9800';
    const errorColor = theme === 'vs-light' ? '#c62828' : '#f44336';
    
    consoleModal.classList.add('active');
    
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    if (classMatch) {
        const className = classMatch[1];
        const currentFileName = fileManager.currentFile ? fileManager.currentFile.name : 'Main.java';
        const expectedFileName = className + '.java';
        
        if (currentFileName !== expectedFileName) {
            modalOutputContent.innerHTML = `<span style="color: ${errorColor};">❌ Error: Class name "${className}" does not match filename "${currentFileName}"</span>\n`;
            modalOutputContent.innerHTML += `<span style="color: ${warningColor};">Filename must be "${expectedFileName}" (case-sensitive)</span>\n\n`;
            modalOutputContent.innerHTML += `<span style="color: ${successColor};">💡 Tip: Rename the file or change the class name to match.</span>`;
            return;
        }
    }
    
    executionState = {
        inputs: [],
        inputIndex: 0,
        waitingForInput: false,
        isExecuting: true,
        prompts: []
    };
    
    modalOutputContent.innerHTML = `<span style="color: ${successColor};">⏳ Starting execution...</span>\n\n`;
    modalInputArea.style.display = 'none';

    setTimeout(() => {
        if (code.includes('Scanner') || code.includes('BufferedReader')) {
            handleInteractiveExecution(code);
        } else {
            executeWithAPI(code, []);
        }
    }, 100);
}

function handleInteractiveExecution(code) {
    const outputContent = document.getElementById('modalOutputContent');
    
    // Count ALL .next methods including next(), nextLine(), nextInt(), etc.
    const inputCount = (code.match(/\.next\w*\s*\(/g) || []).length;
    
    console.log('DEBUG: Total Scanner inputs detected:', inputCount);
    console.log('DEBUG: Code snippet:', code.substring(0, 500));
    
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
        console.log('DEBUG: Starting input collection for', inputCount, 'inputs');
        promptForInput();
    } else {
        executeWithAPI(code, []);
    }
}

function promptForInput() {
    const inputArea = document.getElementById('modalInputArea');
    const inputField = document.getElementById('modalConsoleInput');
    executionState.waitingForInput = true;
    inputArea.style.display = 'flex';
    const code = editor.getValue();
    const inputCount = (code.match(/\.next\w*\s*\(/g) || []).length;
    console.log('DEBUG: promptForInput - inputIndex:', executionState.inputIndex, 'of', inputCount);
    if (executionState.inputIndex < inputCount) {
        const currentPrompt = executionState.prompts[executionState.inputIndex] || '';
        inputField.placeholder = (currentPrompt || 'Enter input...') + ` (${executionState.inputIndex + 1}/${inputCount})`;
    }
    inputField.focus();
}

function submitModalInput() {
    const inputField = document.getElementById('modalConsoleInput');
    const value = inputField.value;
    const outputContent = document.getElementById('modalOutputContent');
    
    const currentPrompt = executionState.prompts[executionState.inputIndex] || `Input ${executionState.inputIndex + 1}`;
    outputContent.innerHTML += `<span style="color: #00bcd4;">${currentPrompt}</span> <span style="color: #4caf50;">${value}</span>\n`;
    
    console.log('DEBUG: Input received:', value, '- Index:', executionState.inputIndex);
    
    executionState.inputs.push(value);
    executionState.inputIndex++;
    inputField.value = '';
    
    const code = editor.getValue();
    const inputCount = (code.match(/\.next\w*\s*\(/g) || []).length;
    
    if (executionState.inputIndex < inputCount) {
        promptForInput();
    } else {
        document.getElementById('modalInputArea').style.display = 'none';
        executionState.waitingForInput = false;
        outputContent.innerHTML += '\n<span style="color: #2196f3;">--- Execution Output ---</span>\n';
        executeWithAPI(code, executionState.inputs);
    }
}

function submitConsoleInput() {
    // Old function - kept for compatibility
}

function executeWithAPI(code, inputs) {
    const outputContent = document.getElementById('modalOutputContent');
    const runBtn = document.getElementById('runCode');
    const theme = localStorage.getItem('editorTheme') || 'vs-dark';
    const textColor = theme === 'vs-light' ? '#000000' : '#e0e0e0';
    const successColor = theme === 'vs-light' ? '#2e7d32' : '#4caf50';
    const errorColor = theme === 'vs-light' ? '#c62828' : '#f44336';
    const warningColor = theme === 'vs-light' ? '#f57c00' : '#ff9800';
    const infoColor = theme === 'vs-light' ? '#0277bd' : '#2196f3';
    
    if (!navigator.onLine) {
        outputContent.innerHTML += `<span style="color: ${errorColor};">❌ No internet connection!</span>\n`;
        outputContent.innerHTML += `<span style="color: ${warningColor};">⚠️ You need internet to run Java programs.</span>\n`;
        outputContent.innerHTML += `<span style="color: ${infoColor};">💡 Editor works offline, but execution requires server connection.</span>`;
        if (runBtn) runBtn.disabled = false;
        executionState.isExecuting = false;
        return;
    }
    
    outputContent.innerHTML += `<span style="color: ${warningColor};">⚙️ Compiling and executing...</span>\n\n`;
    
    if (runBtn) runBtn.disabled = true;
    
    // Get current filename
    const filename = fileManager.currentFile ? fileManager.currentFile.name : 'Main.java';
    
    const BACKEND_URL = 'https://java-editor-production.up.railway.app';
    
    fetch(`${BACKEND_URL}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            code: code, 
            input: inputs.join('\n'),
            filename: filename
        })
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
            
            outputContent.innerHTML += `<span style="color: ${textColor};">${escapeHtml(result)}</span>`;
            outputContent.innerHTML += `\n<span style="color: ${successColor};">✓ Execution completed</span>`;
        } else if (data.error) {
            outputContent.innerHTML += `<span style="color: ${errorColor};">❌ Error:\n${escapeHtml(data.error)}</span>`;
        } else {
            outputContent.innerHTML += '<span style="color: #888;">(No output)</span>';
        }
    })
    .catch(error => {
        if (runBtn) runBtn.disabled = false;
        executionState.isExecuting = false;
        outputContent.innerHTML += `<span style="color: ${errorColor};">❌ Server not running!</span>\n`;
        outputContent.innerHTML += `<span style="color: ${warningColor};">Start server: python server_python.py</span>`;
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function loadSettings() {
    const fontSize = localStorage.getItem('editorFontSize') || 14;
    const fontFamily = localStorage.getItem('editorFontFamily') || 'Consolas';
    const tabSize = localStorage.getItem('editorTabSize') || 4;
    const lineHeight = localStorage.getItem('editorLineHeight') || 1.6;
    const wordWrap = localStorage.getItem('editorWordWrap') === 'true';
    const showLineNumbers = localStorage.getItem('editorShowLineNumbers') !== 'false';
    const autoComplete = localStorage.getItem('editorAutoComplete') !== 'false';
    const highlightActiveLine = localStorage.getItem('editorHighlightActiveLine') !== 'false';
    const showIndentGuides = localStorage.getItem('editorShowIndentGuides') !== 'false';
    const cursorStyle = localStorage.getItem('editorCursorStyle') || 'ace';
    const scrollSpeed = localStorage.getItem('editorScrollSpeed') || 3;
    const enableSnippets = localStorage.getItem('editorEnableSnippets') !== 'false';
    const bracketMatching = localStorage.getItem('editorBracketMatching') !== 'false';
    const autoSave = localStorage.getItem('autoSaveEnabled') !== 'false';
    const theme = localStorage.getItem('editorTheme') || 'vs-dark';

    document.getElementById('fontSize').value = fontSize;
    document.getElementById('fontFamily').value = fontFamily;
    document.getElementById('tabSize').value = tabSize;
    document.getElementById('lineHeight').value = lineHeight;
    document.getElementById('wordWrap').checked = wordWrap;
    document.getElementById('showLineNumbers').checked = showLineNumbers;
    document.getElementById('autoComplete').checked = autoComplete;
    document.getElementById('highlightActiveLine').checked = highlightActiveLine;
    document.getElementById('showIndentGuides').checked = showIndentGuides;
    document.getElementById('cursorStyle').value = cursorStyle;
    document.getElementById('scrollSpeed').value = scrollSpeed;
    document.getElementById('scrollSpeedValue').textContent = scrollSpeed;
    document.getElementById('enableSnippets').checked = enableSnippets;
    document.getElementById('bracketMatching').checked = bracketMatching;
    document.getElementById('autoSave').checked = autoSave;
    document.getElementById('themeSelect').value = theme;

    editor.setFontSize(parseInt(fontSize));
    editor.setOption('fontFamily', fontFamily);
    editor.session.setTabSize(parseInt(tabSize));
    document.getElementById('editor').style.lineHeight = lineHeight;
    editor.session.setUseWrapMode(wordWrap);
    editor.setOption('showLineNumbers', showLineNumbers);
    editor.setOption('enableBasicAutocompletion', autoComplete);
    editor.setOption('enableLiveAutocompletion', autoComplete);
    editor.setOption('highlightActiveLine', highlightActiveLine);
    editor.setOption('displayIndentGuides', showIndentGuides);
    editor.setOption('cursorStyle', cursorStyle);
    editor.setOption('scrollSpeed', parseInt(scrollSpeed));
    editor.setOption('enableSnippets', enableSnippets);
    editor.setOption('behavioursEnabled', bracketMatching);
    
    if (theme === 'vs-light') {
        editor.setTheme('ace/theme/chrome');
    } else if (theme === 'hc-black') {
        editor.setTheme('ace/theme/terminal');
    } else {
        editor.setTheme('ace/theme/monokai');
    }

    if (autoSave) startAutoSave();
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
    if (lastProjectId) fileManager.setCurrentProject(lastProjectId);
    if (lastFileId) {
        const file = fileManager.setCurrentFile(lastFileId);
        if (file) {
            editor.setValue(file.content, -1);
            document.getElementById('currentFileName').textContent = file.name;
            document.getElementById('currentFileNameMobile').textContent = file.name;
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

// Practice Programs Functionality
let practiceData = { categories: [] };
let currentProgram = null;

async function loadPracticePrograms() {
    if (practiceData.categories.length > 0) {
        renderCategories();
        return;
    }
    
    try {
        // Load config file
        const configResponse = await fetch('./programs-config.json');
        const config = await configResponse.json();
        
        // Load all program files
        const allCategories = [];
        for (const filePath of config.programFiles) {
            try {
                const response = await fetch('./' + filePath);
                const data = await response.json();
                if (data.categories) {
                    allCategories.push(...data.categories);
                }
            } catch (error) {
                console.error(`Error loading ${filePath}:`, error);
            }
        }
        
        practiceData.categories = allCategories;
        renderCategories();
    } catch (error) {
        console.error('Error loading programs:', error);
        document.getElementById('practiceCategories').innerHTML = '<p style="color: #f44336; padding: 20px;">Failed to load programs</p>';
    }
}

function renderCategories() {
    const container = document.getElementById('practiceCategories');
    container.innerHTML = '';
    
    practiceData.categories.forEach(category => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.style.setProperty('--gradient', category.gradient);
        card.innerHTML = `
            <i class="fas ${category.icon} category-icon" style="color: ${category.color};"></i>
            <div class="category-name">${category.name}</div>
            <div class="category-count">${category.programs.length} Programs</div>
        `;
        card.addEventListener('click', () => showPrograms(category));
        container.appendChild(card);
    });
}

function showPrograms(category) {
    document.getElementById('practiceModal').classList.remove('active');
    document.getElementById('programsModal').classList.add('active');
    document.getElementById('programsModalTitle').innerHTML = `<i class="fas ${category.icon}"></i> ${category.name}`;
    
    const container = document.getElementById('programsList');
    container.innerHTML = '';
    
    category.programs.forEach(program => {
        const card = document.createElement('div');
        card.className = 'program-card';
        card.innerHTML = `
            <div class="program-card-title">${program.program_name}</div>
            <div class="program-card-desc">${program.description}</div>
        `;
        card.addEventListener('click', () => showProgramDetail(program));
        container.appendChild(card);
    });
}

function showProgramDetail(program) {
    currentProgram = program;
    document.getElementById('programsModal').classList.remove('active');
    document.getElementById('programDetailModal').classList.add('active');
    
    document.getElementById('programDetailTitle').textContent = program.program_name;
    document.getElementById('programDescription').textContent = program.description;
    document.getElementById('programInstruction').textContent = program.instruction;
    document.getElementById('programCode').textContent = program.code;
    document.getElementById('programOutput').textContent = program.output;
}

document.getElementById('loadProgramBtn').addEventListener('click', () => {
    if (currentProgram) {
        editor.setValue(currentProgram.code, -1);
        document.getElementById('programDetailModal').classList.remove('active');
        
        // Extract class name and update file name
        const classMatch = currentProgram.code.match(/public\s+class\s+(\w+)/);
        if (classMatch) {
            const className = classMatch[1];
            document.getElementById('currentFileName').textContent = className + '.java';
            document.getElementById('currentFileNameMobile').textContent = className + '.java';
        }
        
        isEditorDirty = true;
        updateSaveIndicator(false);
    }
});

// Resize handle functionality for mobile
function initializeResizeHandle() {
    const resizeHandle = document.getElementById('resizeHandle');
    const outputPanel = document.getElementById('outputPanel');
    let startY = 0;
    let startHeight = 0;
    let isResizing = false;
    let hasMoved = false;

    resizeHandle.addEventListener('touchstart', (e) => {
        if (!outputPanel.classList.contains('active')) return;
        
        isResizing = true;
        hasMoved = false;
        startY = e.touches[0].clientY;
        startHeight = outputPanel.offsetHeight;
        resizeHandle.classList.add('dragging');
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        
        hasMoved = true;
        const currentY = e.touches[0].clientY;
        const deltaY = startY - currentY;
        const newHeight = Math.min(Math.max(150, startHeight + deltaY), window.innerHeight * 0.75);
        
        if (!outputPanel.classList.contains('resizable')) {
            outputPanel.classList.add('resizable');
        }
        outputPanel.style.height = newHeight + 'px';
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, { passive: false });

    document.addEventListener('touchcancel', () => {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
        }
    });
}