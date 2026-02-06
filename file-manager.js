class FileManager {
    constructor() {
        this.currentProject = null;
        this.currentFile = null;
        this.projects = this.loadProjects();
        this.autoSaveInterval = null;
    }

    loadProjects() {
        const stored = localStorage.getItem('javaEditorProjects');
        return stored ? JSON.parse(stored) : [];
    }

    saveProjects() {
        localStorage.setItem('javaEditorProjects', JSON.stringify(this.projects));
    }

    createProject(name) {
        if (!name || name.trim() === '') {
            alert('Please enter a project name');
            return null;
        }

        const project = {
            id: Date.now().toString(),
            name: name.trim(),
            files: [],
            createdAt: new Date().toISOString()
        };

        this.projects.push(project);
        this.saveProjects();
        return project;
    }

    deleteProject(projectId) {
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.saveProjects();
        if (this.currentProject?.id === projectId) {
            this.currentProject = null;
            this.currentFile = null;
        }
    }

    createFile(projectId, fileName) {
        if (!fileName || fileName.trim() === '') {
            alert('Please enter a file name');
            return null;
        }

        if (!fileName.endsWith('.java')) {
            fileName += '.java';
        }

        const project = this.projects.find(p => p.id === projectId);
        if (!project) return null;

        const existingFile = project.files.find(f => f.name === fileName);
        if (existingFile) {
            alert('File already exists');
            return null;
        }

        const file = {
            id: Date.now().toString(),
            name: fileName,
            content: `public class ${fileName.replace('.java', '')} {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}`,
            lastModified: new Date().toISOString()
        };

        project.files.push(file);
        this.saveProjects();
        return file;
    }

    deleteFile(projectId, fileId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        project.files = project.files.filter(f => f.id !== fileId);
        this.saveProjects();

        if (this.currentFile?.id === fileId) {
            this.currentFile = null;
        }
    }

    updateFileContent(projectId, fileId, content) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const file = project.files.find(f => f.id === fileId);
        if (!file) return;

        file.content = content;
        file.lastModified = new Date().toISOString();
        this.saveProjects();
    }

    getFile(projectId, fileId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return null;
        return project.files.find(f => f.id === fileId);
    }

    getAllFiles(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        return project ? project.files : [];
    }

    setCurrentProject(projectId) {
        this.currentProject = this.projects.find(p => p.id === projectId);
    }

    setCurrentFile(fileId) {
        if (!this.currentProject) return null;
        this.currentFile = this.currentProject.files.find(f => f.id === fileId);
        return this.currentFile;
    }

    exportFile(fileId) {
        if (!this.currentProject) return;
        const file = this.getFile(this.currentProject.id, fileId);
        if (!file) return;

        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
    }

    startAutoSave(callback, interval = 3000) {
        this.stopAutoSave();
        this.autoSaveInterval = setInterval(callback, interval);
    }

    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
}

window.fileManager = new FileManager();
