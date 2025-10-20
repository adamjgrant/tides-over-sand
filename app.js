class TidesOverSand {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.isEditing = false;
        this.draggedTaskId = null;
        this.user = null;
        
        // Supabase configuration
        this.supabaseUrl = 'https://osdkeyueeapdaurhacei.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZGtleXVlZWFwZGF1cmhhY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODQxMTMsImV4cCI6MjA3NjU2MDExM30.if7zCb2xVgXelIXMBZaJsq4alOnfmg-OvLtOKULsrgw';
        this.supabase = null;
        
        this.initializeApp();
        this.bindEvents();
        this.initializeSupabase();
    }
    
    async initializeSupabase() {
        try {
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
            
            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.user = session.user;
                this.updateAuthUI();
                await this.loadTasks();
            } else {
                this.showSignInUI();
            }
            
            // Listen for auth changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    this.user = session.user;
                    this.updateAuthUI();
                    this.loadTasks();
                } else if (event === 'SIGNED_OUT') {
                    this.user = null;
                    this.showSignInUI();
                    this.tasks = [];
                    this.renderTasks();
                }
            });
            
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.showSignInUI();
        }
    }
    
    initializeApp() {
        // No longer need URL-based user identification
        // Authentication will handle user identification
    }
    
    bindEvents() {
        // Add task
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
        document.getElementById('newTaskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        
        // Authentication
        document.getElementById('signInBtn').addEventListener('click', () => this.signInWithGitHub());
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());
        
        // Detail panel events
        document.getElementById('closeDetailPanel').addEventListener('click', () => this.closeDetailPanel());
        document.getElementById('detailSaveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('detailDeleteTaskBtn').addEventListener('click', () => this.deleteTask());
        document.getElementById('detailRenewTaskBtn').addEventListener('click', () => this.renewTask());
        
        // Task body preview toggle
        document.getElementById('detailTaskBody').addEventListener('input', () => this.updatePreview());
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    async signInWithGitHub() {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin
                }
            });
            
            if (error) {
                console.error('GitHub sign-in error:', error);
                alert('Failed to sign in with GitHub. Please try again.');
            }
        } catch (error) {
            console.error('GitHub sign-in error:', error);
            alert('Failed to sign in with GitHub. Please try again.');
        }
    }
    
    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                console.error('Sign out error:', error);
            }
        } catch (error) {
            console.error('Sign out error:', error);
        }
    }
    
    updateAuthUI() {
        if (this.user) {
            document.getElementById('authStatus').style.display = 'flex';
            document.getElementById('signInBtn').style.display = 'none';
            
            const userInfo = document.getElementById('userInfo');
            const userName = this.user.user_metadata?.full_name || this.user.user_metadata?.user_name || this.user.email || 'User';
            userInfo.textContent = `Signed in as ${userName}`;
        } else {
            document.getElementById('authStatus').style.display = 'none';
            document.getElementById('signInBtn').style.display = 'block';
        }
    }
    
    showSignInUI() {
        document.getElementById('authStatus').style.display = 'none';
        document.getElementById('signInBtn').style.display = 'block';
    }
    
    async addTask() {
        if (!this.user) {
            alert('Please sign in to add tasks. We store your tasks in Supabase so you can access them from any computer by logging in with GitHub.');
            return;
        }
        
        const input = document.getElementById('newTaskInput');
        const title = input.value.trim();
        
        if (!title) return;
        
        const task = {
            title: title,
            body: '',
            completed: false,
            completed_at: null,
            created_at: new Date().toISOString(),
            renewed_at: new Date().toISOString()
        };
        
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .insert([{ ...task, user_id: this.user.id }])
                .select()
                .single();
            
            if (error) throw error;
            
            this.tasks.unshift(data);
            this.saveTasksToLocal();
            this.renderTasks();
            input.value = '';
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task. Please try again.');
        }
    }
    
    generateTaskId() {
        return 'task_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    openTaskDetail(taskId) {
        if (!this.user) {
            alert('Please sign in to view task details. We store your tasks in Supabase so you can access them from any computer by logging in with GitHub.');
            return;
        }
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        this.currentTaskId = taskId;
        this.isEditing = true;
        
        document.getElementById('detailTaskTitle').value = task.title;
        document.getElementById('detailTaskBody').value = task.body || '';
        this.updatePreview();
        
        // Update lifetime display
        this.updateLifetimeDisplay(task);
        
        // Show/hide renew button
        const renewBtn = document.getElementById('detailRenewTaskBtn');
        const canRenew = this.canRenewTask(task);
        renewBtn.style.display = canRenew ? 'inline-block' : 'none';
        
        document.getElementById('taskDetailPanel').classList.add('active');
    }
    
    closeDetailPanel() {
        document.getElementById('taskDetailPanel').classList.remove('active');
        this.currentTaskId = null;
        this.isEditing = false;
    }
    
    async saveTask() {
        if (!this.user || !this.currentTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        const newTitle = document.getElementById('detailTaskTitle').value.trim();
        const newBody = document.getElementById('detailTaskBody').value;
        
        if (!newTitle) {
            alert('Task title cannot be empty');
            return;
        }
        
        try {
            const { error } = await this.supabase
                .from('tasks')
                .update({
                    title: newTitle,
                    body: newBody
                })
                .eq('id', this.currentTaskId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            task.title = newTitle;
            task.body = newBody;
            
            this.saveTasksToLocal();
            this.renderTasks();
            this.closeDetailPanel();
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Failed to save task. Please try again.');
        }
    }
    
    async deleteTask() {
        if (!this.user || !this.currentTaskId) return;
        
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                const { error } = await this.supabase
                    .from('tasks')
                    .delete()
                    .eq('id', this.currentTaskId)
                    .eq('user_id', this.user.id);
                
                if (error) throw error;
                
                this.tasks = this.tasks.filter(t => t.id !== this.currentTaskId);
                this.saveTasksToLocal();
                this.renderTasks();
                this.closeModal();
            } catch (error) {
                console.error('Error deleting task:', error);
                alert('Failed to delete task. Please try again.');
            }
        }
    }
    
    async renewTask() {
        if (!this.user || !this.currentTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        // Find the task to renew before
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTaskId);
        const nextTask = this.tasks[taskIndex + 1];
        
        let renewalDate;
        if (nextTask) {
            // Set renewal date to one day before the next task
            const nextTaskDate = new Date(nextTask.renewed_at);
            const renewal = new Date(nextTaskDate);
            renewal.setDate(renewal.getDate() - 1);
            
            // If the next task was created today, set renewal to today
            const today = new Date();
            const nextTaskCreatedToday = nextTaskDate.toDateString() === today.toDateString();
            
            renewalDate = nextTaskCreatedToday ? today.toISOString() : renewal.toISOString();
        } else {
            // Only task in list, renew to today
            renewalDate = new Date().toISOString();
        }
        
        try {
            const { error } = await this.supabase
                .from('tasks')
                .update({ renewed_at: renewalDate })
                .eq('id', this.currentTaskId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            task.renewed_at = renewalDate;
            
            // Move task to top
            this.tasks = this.tasks.filter(t => t.id !== this.currentTaskId);
            this.tasks.unshift(task);
            
            this.saveTasksToLocal();
            this.renderTasks();
            this.closeDetailPanel();
        } catch (error) {
            console.error('Error renewing task:', error);
            alert('Failed to renew task. Please try again.');
        }
    }
    
    canRenewTask(task) {
        // Can renew if it's the only task or if there are other tasks
        return this.tasks.length === 1 || this.tasks.length > 1;
    }
    
    async toggleTaskCompletion(taskId) {
        if (!this.user) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        if (task.completed) {
            // Check if within 1 minute of completion
            if (!task.completed_at) {
                alert('Cannot uncomplete task - no completion time recorded');
                return;
            }
            
            const completedAt = new Date(task.completed_at);
            const now = new Date();
            const timeDiff = now - completedAt;
            
            if (timeDiff > 60000) { // 1 minute in milliseconds
                alert('Cannot uncomplete task after 1 minute');
                return;
            }
            
            task.completed = false;
            task.completed_at = null;
        } else {
            task.completed = true;
            task.completed_at = new Date().toISOString();
        }
        
        try {
            const { error } = await this.supabase
                .from('tasks')
                .update({
                    completed: task.completed,
                    completed_at: task.completed_at
                })
                .eq('id', taskId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            this.saveTasksToLocal();
            this.renderTasks();
        } catch (error) {
            console.error('Error updating task completion:', error);
            alert('Failed to update task. Please try again.');
        }
    }
    
    getTaskLifetime(task) {
        const renewedAt = new Date(task.renewed_at);
        const now = new Date();
        const diffTime = now - renewedAt;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.min(4, diffDays); // 0d to 4d (5d = deleted)
    }
    
    getTaskFadeClass(task) {
        const lifetime = this.getTaskLifetime(task);
        if (lifetime >= 4) return 'fade-4'; // 4d = faintest but readable
        if (lifetime >= 3) return 'fade-3';
        if (lifetime >= 2) return 'fade-2';
        if (lifetime >= 1) return 'fade-1';
        return ''; // 0d = full opacity
    }
    
    getLifetimeBadgeClass(task) {
        const lifetime = this.getTaskLifetime(task);
        if (lifetime <= 1) return 'critical';
        if (lifetime <= 2) return 'fading';
        return '';
    }
    
    updateLifetimeDisplay(task) {
        const lifetime = this.getTaskLifetime(task);
        const lifetimeElement = document.getElementById('detailLifetimeValue');
        lifetimeElement.textContent = `${lifetime}d`;
        lifetimeElement.className = `lifetime-value ${this.getLifetimeBadgeClass(task)}`;
    }
    
    updatePreview() {
        const body = document.getElementById('detailTaskBody').value;
        const preview = document.getElementById('detailTaskBodyPreview');
        
        if (body.trim()) {
            preview.innerHTML = this.parseMarkdown(body);
            preview.classList.add('active');
        } else {
            preview.classList.remove('active');
        }
    }
    
    parseMarkdown(text) {
        return text
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/gim, '<br>');
    }
    
    setupDragAndDrop() {
        const taskList = document.getElementById('taskList');
        
        taskList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('task-checkbox')) return;
            this.draggedTaskId = e.target.dataset.taskId;
            e.target.classList.add('dragging');
        });
        
        taskList.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            this.draggedTaskId = null;
        });
        
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const taskElement = e.target.closest('.task-item');
            if (taskElement && taskElement.dataset.taskId !== this.draggedTaskId) {
                taskElement.classList.add('drag-over');
            }
        });
        
        taskList.addEventListener('dragleave', (e) => {
            const taskElement = e.target.closest('.task-item');
            if (taskElement) {
                taskElement.classList.remove('drag-over');
            }
        });
        
        taskList.addEventListener('drop', (e) => {
            e.preventDefault();
            const taskElement = e.target.closest('.task-item');
            if (taskElement && this.draggedTaskId) {
                this.handleTaskReorder(this.draggedTaskId, taskElement.dataset.taskId);
            }
            taskElement?.classList.remove('drag-over');
        });
    }
    
    async handleTaskReorder(draggedId, targetId) {
        if (!this.user || draggedId === targetId) return;
        
        const draggedTask = this.tasks.find(t => t.id === draggedId);
        const targetTask = this.tasks.find(t => t.id === targetId);
        
        if (!draggedTask || !targetTask) return;
        
        // Remove dragged task
        this.tasks = this.tasks.filter(t => t.id !== draggedId);
        
        // Find target position
        const targetIndex = this.tasks.findIndex(t => t.id === targetId);
        
        // Insert before target
        this.tasks.splice(targetIndex, 0, draggedTask);
        
        // Update renewal date
        const targetRenewedAt = new Date(targetTask.renewed_at);
        const renewalDate = new Date(targetRenewedAt);
        renewalDate.setDate(renewalDate.getDate() - 1);
        
        // If target was created today, set renewal to today
        const today = new Date();
        const targetCreatedToday = targetRenewedAt.toDateString() === today.toDateString();
        
        const newRenewalDate = targetCreatedToday ? today.toISOString() : renewalDate.toISOString();
        
        try {
            const { error } = await this.supabase
                .from('tasks')
                .update({ renewed_at: newRenewalDate })
                .eq('id', draggedId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            draggedTask.renewed_at = newRenewalDate;
            
            this.saveTasksToLocal();
            this.renderTasks();
        } catch (error) {
            console.error('Error reordering task:', error);
            alert('Failed to reorder task. Please try again.');
        }
    }
    
    async loadTasks() {
        if (!this.user) {
            this.tasks = [];
            this.renderTasks();
            return;
        }
        
        try {
            const { data, error } = await this.supabase
                .from('tasks')
                .select('*')
                .eq('user_id', this.user.id)
                .order('renewed_at', { ascending: false });
            
            if (error) throw error;
            
            this.tasks = data || [];
            this.saveTasksToLocal();
            this.renderTasks();
            
            // Set up real-time subscription
            this.setupRealtimeSubscription();
            
        } catch (error) {
            console.error('Error loading tasks:', error);
            // Fallback to local storage
            this.loadTasksFromLocal();
        }
    }
    
    setupRealtimeSubscription() {
        if (!this.user) return;
        
        this.supabase
            .channel('tasks')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'tasks',
                    filter: `user_id=eq.${this.user.id}`
                }, 
                (payload) => {
                    console.log('Real-time update:', payload);
                    this.loadTasks(); // Reload all tasks on any change
                }
            )
            .subscribe();
    }
    
    saveTasksToLocal() {
        if (this.user) {
            localStorage.setItem(`tides-over-sand-${this.user.id}`, JSON.stringify(this.tasks));
        }
    }
    
    loadTasksFromLocal() {
        if (this.user) {
            const saved = localStorage.getItem(`tides-over-sand-${this.user.id}`);
            if (saved) {
                try {
                    this.tasks = JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to load tasks from local storage:', e);
                    this.tasks = [];
                }
            }
        }
        this.renderTasks();
    }
    
    async deleteExpiredTasks(expiredTasks) {
        try {
            const taskIds = expiredTasks.map(task => task.id);
            const { error } = await this.supabase
                .from('tasks')
                .delete()
                .in('id', taskIds)
                .eq('user_id', this.user.id);
            
            if (error) {
                console.error('Error deleting expired tasks:', error);
            }
        } catch (error) {
            console.error('Error deleting expired tasks:', error);
        }
    }
    
    renderTasks() {
        const taskList = document.getElementById('taskList');
        
        // Sort tasks by renewal date (most recent first)
        const sortedTasks = [...this.tasks].sort((a, b) => 
            new Date(b.renewed_at) - new Date(a.renewed_at)
        );
        
        // Remove expired tasks (5d+ old)
        const validTasks = sortedTasks.filter(task => {
            const lifetime = this.getTaskLifetime(task);
            return lifetime <= 4; // Keep 0d to 4d, delete 5d+
        });
        
        // Update tasks array if any were removed
        if (validTasks.length !== this.tasks.length) {
            const expiredTasks = this.tasks.filter(task => {
                const lifetime = this.getTaskLifetime(task);
                return lifetime > 4; // 5d+ old
            });
            
            this.tasks = validTasks;
            this.saveTasksToLocal();
            
            // Delete expired tasks from Supabase
            if (expiredTasks.length > 0 && this.user) {
                this.deleteExpiredTasks(expiredTasks);
            }
        }
        
        if (!this.user) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h3>Sign in to get started</h3>
                    <p>Sign in with GitHub to create and manage your tasks</p>
                </div>
            `;
            return;
        }
        
        if (validTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <h3>No tasks yet</h3>
                    <p>Add a task above to get started</p>
                </div>
            `;
            return;
        }
        
        taskList.innerHTML = validTasks.map(task => {
            // Only apply fade class to non-completed tasks
            const fadeClass = task.completed ? '' : this.getTaskFadeClass(task);
            
            return `
                <div class="task-item ${fadeClass} ${task.completed ? 'completed' : ''}" 
                     data-task-id="${task.id}" 
                     draggable="${!task.completed}">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                         onclick="event.stopPropagation(); app.toggleTaskCompletion('${task.id}')"></div>
                    <div class="task-content" onclick="app.openTaskDetail('${task.id}')">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TidesOverSand();
});