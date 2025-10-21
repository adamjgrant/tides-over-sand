class TidesOverSand {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.isEditing = false;
        this.draggedTaskId = null;
        this.user = null;
        this.pendingDeletes = new Map(); // Track multiple pending deletes
        
        // Supabase configuration
        this.supabaseUrl = 'https://osdkeyueeapdaurhacei.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZGtleXVlZWFwZGF1cmhhY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5ODQxMTMsImV4cCI6MjA3NjU2MDExM30.if7zCb2xVgXelIXMBZaJsq4alOnfmg-OvLtOKULsrgw';
        this.supabase = null;
        
        this.initializeApp();
        this.bindEvents();
        this.initializeSupabase();
        this.initializeIcons();
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
                this.renderTasks();
            }
            
            // Update app mode title bar after auth state is determined
            this.updateAppModeTitleBar();
            
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
                
                // Update app mode title bar after auth state changes
                this.updateAppModeTitleBar();
            });
            
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.showSignInUI();
            this.renderTasks();
        }
    }
    
    initializeApp() {
        // No longer need URL-based user identification
        // Authentication will handle user identification
        
        // Check for appmode parameter
        this.checkAppMode();
    }
    
    checkAppMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const appMode = urlParams.get('appmode');
        
        if (appMode === '1') {
            this.enableAppMode();
        }
    }
    
    enableAppMode() {
        // Add appmode class to body and html
        document.body.classList.add('appmode');
        document.documentElement.classList.add('appmode');
        
        // Add title bar to task list container
        this.addAppModeTitleBar();
        
        // Autoselect first task on desktop if not mobile
        if (window.innerWidth > 768 && this.tasks && this.tasks.length > 0) {
            // Small delay to ensure rendering is complete
            setTimeout(() => {
                this.openTaskDetail(this.tasks[0].id);
            }, 100);
        }
    }
    
    disableAppMode() {
        // Remove appmode class from body and html
        document.body.classList.remove('appmode');
        document.documentElement.classList.remove('appmode');
        
        // Remove title bar if it exists
        const titleBar = document.getElementById('appModeTitleBar');
        if (titleBar) {
            titleBar.remove();
        }
    }
    
    addAppModeTitleBar() {
        const taskListContainer = document.querySelector('.task-list-container');
        if (!taskListContainer) return;
        
        // Check if title bar already exists
        if (document.getElementById('appModeTitleBar')) return;
        
        const titleBar = document.createElement('div');
        titleBar.id = 'appModeTitleBar';
        titleBar.className = 'app-mode-title-bar';
        titleBar.innerHTML = `
            <div class="title-bar-left">
                <span class="app-title-text">Tides over Sand</span>
            </div>
            <div class="title-bar-right">
                <button id="appModeExitBtn" class="app-mode-exit-btn">Exit app mode</button>
                <button id="appModeSignOutBtn" class="app-mode-sign-out-btn" style="display: none;">Sign out</button>
            </div>
        `;
        
        // Insert at the top of the task list container
        taskListContainer.insertBefore(titleBar, taskListContainer.firstChild);
        
        // Add event listeners for buttons
        document.getElementById('appModeExitBtn').addEventListener('click', () => {
            this.disableAppMode();
            // Redirect to current URL without appmode parameter
            const url = new URL(window.location);
            url.searchParams.delete('appmode');
            window.location.href = url.toString();
        });
        document.getElementById('appModeSignOutBtn').addEventListener('click', () => this.signOut());
        
        // Show/hide sign out button based on auth state
        this.updateAppModeTitleBar();
    }
    
    updateAppModeTitleBar() {
        const signOutBtn = document.getElementById('appModeSignOutBtn');
        if (signOutBtn) {
            signOutBtn.style.display = this.user ? 'block' : 'none';
        }
    }
    
    checkAppModeAutoselect() {
        // Check if we're in appmode, on desktop, have tasks, and no task is currently selected
        const urlParams = new URLSearchParams(window.location.search);
        const appMode = urlParams.get('appmode');
        
        if (appMode === '1' && 
            window.innerWidth > 768 && 
            this.tasks && 
            this.tasks.length > 0 && 
            !this.currentTaskId) {
            
            // Small delay to ensure rendering is complete
            setTimeout(() => {
                this.openTaskDetail(this.tasks[0].id);
            }, 100);
        }
    }
    
    initializeIcons() {
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
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
        document.getElementById('detailDeleteTaskBtn').addEventListener('click', () => this.deleteTask());
        document.getElementById('detailRenewTaskBtn').addEventListener('click', () => this.renewTask());
        document.getElementById('undoDeleteBtn').addEventListener('click', () => this.undoDelete());
        
        // Close modal when clicking backdrop (mobile)
        document.getElementById('taskDetailPanel').addEventListener('click', (e) => {
            if (e.target.id === 'taskDetailPanel') {
                this.closeDetailPanel();
            }
        });
        
        // Prevent modal content from closing when clicked
        document.getElementById('taskDetailContent').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Auto-save with debouncing
        this.saveTimeout = null;
        document.getElementById('detailTaskTitle').addEventListener('input', () => this.debouncedSave());
        document.getElementById('detailTaskBody').addEventListener('input', () => {
            this.updatePreview();
            this.debouncedSave();
        });
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    async signInWithGitHub() {
        try {
            // Preserve appmode parameter in redirect URL
            let redirectUrl = window.location.origin + window.location.pathname;
            if (window.location.search.includes('appmode=1')) {
                redirectUrl += '?appmode=1';
            }
            
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: redirectUrl
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
            
            // Show add task UI when logged in
            const addTaskContainer = document.querySelector('.add-task-container');
            if (addTaskContainer) {
                addTaskContainer.style.display = 'flex';
            }
            
            // Remove task area sign-in button if it exists
            const taskAreaSignIn = document.getElementById('taskAreaSignIn');
            if (taskAreaSignIn) {
                taskAreaSignIn.remove();
            }
        } else {
            document.getElementById('authStatus').style.display = 'none';
            document.getElementById('signInBtn').style.display = 'none'; // Hide top sign-in button
        }
        
        // Update app mode title bar if in app mode
        this.updateAppModeTitleBar();
    }
    
    showSignInUI() {
        document.getElementById('authStatus').style.display = 'none';
        document.getElementById('signInBtn').style.display = 'none'; // Hide top sign-in button
        
        // Hide add task UI and show sign-in button in its place
        const addTaskContainer = document.querySelector('.add-task-container');
        const signInBtn = document.getElementById('signInBtn');
        
        if (addTaskContainer) {
            addTaskContainer.style.display = 'none';
        }
        
        // Create or update the sign-in button in the task area
        this.createTaskAreaSignInButton();
    }
    
    createTaskAreaSignInButton() {
        // Remove existing task area sign-in button if it exists
        const existingButton = document.getElementById('taskAreaSignIn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Create new sign-in button for the task area
        const addTaskContainer = document.querySelector('.add-task-container');
        if (addTaskContainer) {
            const signInButton = document.createElement('div');
            signInButton.id = 'taskAreaSignIn';
            signInButton.className = 'task-area-signin';
            signInButton.innerHTML = `
                <i data-lucide="github" class="github-icon"></i>
                <span>Sign in with GitHub to add tasks</span>
            `;
            
            // Insert before the add task container
            addTaskContainer.parentNode.insertBefore(signInButton, addTaskContainer);
            
            // Add click handler
            signInButton.addEventListener('click', () => this.signInWithGitHub());
            
            // Initialize icons for the new button
            this.initializeIcons();
        }
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
            renewed_at: new Date().toISOString(),
            sort_order: 0
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
            
            // Auto-select the new task and show detail view
            try {
                this.openTaskDetail(data.id);
            } catch (detailError) {
                console.error('Error showing task detail:', detailError);
                // Don't fail the entire operation if detail view fails
            }
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
        
        // Initialize the preview/textarea state
        const preview = document.getElementById('detailTaskBodyPreview');
        const textarea = document.getElementById('detailTaskBody');
        preview.classList.add('active');
        textarea.classList.remove('active');
        
        // Update lifetime display
        this.updateLifetimeDisplay(task);
        
        // Show/hide renew button
        const renewBtn = document.getElementById('detailRenewTaskBtn');
        const lifetime = this.getTaskLifetime(task);
        const canRenew = this.canRenewTask(task) && lifetime > 0;
        renewBtn.style.display = canRenew ? 'inline-block' : 'none';
        
        document.getElementById('taskDetailPanel').classList.add('active');
        
        // Add detail-open class to content-split for responsive layout
        const contentSplit = document.querySelector('.content-split');
        if (contentSplit && window.innerWidth > 768) {
            contentSplit.classList.add('detail-open');
        }
        
        // Add selected class to the task in the list
        this.updateSelectedTask(taskId);
    }
    
    closeDetailPanel() {
        document.getElementById('taskDetailPanel').classList.remove('active');
        
        // Remove detail-open class from content-split
        const contentSplit = document.querySelector('.content-split');
        if (contentSplit) {
            contentSplit.classList.remove('detail-open');
        }
        
        this.currentTaskId = null;
        this.isEditing = false;
        
        // Remove selected class from all tasks
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('selected');
        });
    }
    
    updateSelectedTask(taskId) {
        // Remove selected class from all tasks
        document.querySelectorAll('.task-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selected class to current task
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('selected');
        }
    }
    
    debouncedSave() {
        if (!this.user || !this.currentTaskId) return;
        
        // Clear existing timeout
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Set new timeout for 300ms
        this.saveTimeout = setTimeout(() => {
            this.saveTask();
        }, 300);
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
                    body: newBody,
                    renewed_at: task.renewed_at
                })
                .eq('id', this.currentTaskId)
                .eq('user_id', this.user.id);
            
            if (error) throw error;
            
            task.title = newTitle;
            task.body = newBody;
            
            this.saveTasksToLocal();
            this.renderTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Failed to save task. Please try again.');
        }
    }
    
    async deleteTask() {
        if (!this.user || !this.currentTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        const taskId = this.currentTaskId;
        
        // Store the deleted task for potential undo
        this.pendingDeletes.set(taskId, { ...task });
        
        // Remove from local array immediately
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.saveTasksToLocal();
        this.renderTasks();
        this.closeDetailPanel();
        
        // Auto-select first remaining task if any exist
        if (this.tasks.length > 0) {
            const firstTask = this.tasks[0];
            this.openTaskDetail(firstTask.id);
        }
        
        // Show notification
        this.showDeleteNotification(taskId);
        
        // Set timeout to actually delete from Supabase after 5 seconds
        const deleteTimeout = setTimeout(() => {
            this.performActualDelete(taskId);
        }, 5000);
        
        // Store the timeout so we can clear it if needed
        this.pendingDeletes.get(taskId).timeout = deleteTimeout;
    }
    
    showDeleteNotification(taskId) {
        const notification = document.getElementById('deleteNotification');
        const message = document.getElementById('deleteMessage');
        message.textContent = 'Task deleted';
        notification.style.display = 'flex';
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
            if (this.pendingDeletes.size === 0) {
                this.hideDeleteNotification();
            }
        }, 5000);
    }
    
    hideDeleteNotification() {
        const notification = document.getElementById('deleteNotification');
        notification.style.display = 'none';
    }
    
    async undoDelete() {
        // Undo the most recent delete
        if (this.pendingDeletes.size === 0) return;
        
        const [taskId, taskData] = this.pendingDeletes.entries().next().value;
        
        // Clear the delete timeout
        if (taskData.timeout) {
            clearTimeout(taskData.timeout);
        }
        
        // Restore the task
        this.tasks.unshift(taskData);
        this.saveTasksToLocal();
        this.renderTasks();
        
        // Remove from pending deletes
        this.pendingDeletes.delete(taskId);
        
        // Update notification or hide if no more pending
        if (this.pendingDeletes.size === 0) {
            this.hideDeleteNotification();
        } else {
            this.showDeleteNotification();
        }
    }
    
    async performActualDelete(taskId) {
        const taskData = this.pendingDeletes.get(taskId);
        if (!taskData) return;
        
        try {
            const { error } = await this.supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('user_id', this.user.id);
            
            if (error) {
                console.error('Error deleting task from Supabase:', error);
            }
        } catch (error) {
            console.error('Error deleting task from Supabase:', error);
        }
        
        // Remove from pending deletes
        this.pendingDeletes.delete(taskId);
        
        // Hide notification if no more pending deletes
        if (this.pendingDeletes.size === 0) {
            this.hideDeleteNotification();
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
            // Keep detail panel open after renewal
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
        } else {
            preview.innerHTML = '<em style="color: #6c757d;">Click to add details...</em>';
        }
    }
    
    focusTextarea() {
        const preview = document.getElementById('detailTaskBodyPreview');
        const textarea = document.getElementById('detailTaskBody');
        
        preview.classList.remove('active');
        textarea.classList.add('active');
        textarea.focus();
    }
    
    blurTextarea() {
        const preview = document.getElementById('detailTaskBodyPreview');
        const textarea = document.getElementById('detailTaskBody');
        
        // Small delay to allow for any pending saves
        setTimeout(() => {
            preview.classList.add('active');
            textarea.classList.remove('active');
            this.updatePreview();
        }, 100);
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
            console.log('Drop event:', {
                draggedId: this.draggedTaskId,
                targetId: taskElement?.dataset.taskId,
                targetElement: taskElement
            });
            if (taskElement && this.draggedTaskId) {
                // Determine if drop is above or below the target
                const rect = taskElement.getBoundingClientRect();
                const dropY = e.clientY;
                const targetCenterY = rect.top + rect.height / 2;
                const dropAbove = dropY < targetCenterY;
                
                this.handleTaskReorder(this.draggedTaskId, taskElement.dataset.taskId, dropAbove);
            }
            taskElement?.classList.remove('drag-over');
        });
    }
    
    async handleTaskReorder(draggedId, targetId, dropAbove = true) {
        console.log('handleTaskReorder called:', { draggedId, targetId, dropAbove });
        if (!this.user || draggedId === targetId) return;
        
        const draggedTask = this.tasks.find(t => t.id === draggedId);
        const targetTask = this.tasks.find(t => t.id === targetId);
        
        console.log('Tasks found:', { draggedTask: !!draggedTask, targetTask: !!targetTask });
        if (!draggedTask || !targetTask) return;
        
        // Get all tasks with the same renewal date as target
        const targetDate = new Date(targetTask.renewed_at);
        targetDate.setHours(0, 0, 0, 0);
        
        const sameDateTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.renewed_at);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === targetDate.getTime();
        }).sort((a, b) => (b.sort_order || 0) - (a.sort_order || 0));
        
        // Find target position in same-date tasks
        const targetIndex = sameDateTasks.findIndex(t => t.id === targetId);
        
        // Calculate new sort order based on drop position
        let newSortOrder;
        let isForceRanking = false;
        
        if (dropAbove) {
            // Dropping above target
            if (targetIndex === 0) {
                // Target is first, put dragged task above it
                newSortOrder = (sameDateTasks[0].sort_order || 0) + 1;
                console.log('Target is first, dropping above, new sort_order:', newSortOrder);
            } else {
                // Put dragged task between target and the task above it
                const taskAbove = sameDateTasks[targetIndex - 1];
                const targetSortOrder = targetTask.sort_order || 0;
                const aboveSortOrder = taskAbove.sort_order || 0;
                
                // Always use force ranking for same-date tasks to ensure proper positioning
                if (true) {
                    // Force ranking: reassign all sort_order values systematically
                    isForceRanking = true;
                    console.log('Performing force ranking for same-date tasks');
                    
                    // Get current visual order of all same-date tasks (ascending)
                    const visualOrder = [...sameDateTasks].sort((a, b) => {
                        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                            return (a.sort_order || 0) - (b.sort_order || 0);
                        }
                        // If sort_order is the same, maintain original order
                        return sameDateTasks.indexOf(a) - sameDateTasks.indexOf(b);
                    });
                    
                    console.log('Current visual order:', visualOrder.map(t => t.id));
                    
                    // Find where to insert the dragged task
                    const insertIndex = visualOrder.findIndex(t => t.id === targetId);
                    console.log(`Inserting ${draggedId} at position ${insertIndex}`);
                    
                    // Reassign sort_order values starting from 0
                    let sortOrder = 0;
                    for (let i = 0; i < visualOrder.length; i++) {
                        if (i === insertIndex) {
                            // This is where we want to insert the dragged task
                            newSortOrder = sortOrder;
                            console.log(`Assigned dragged task ${draggedId} sort_order: ${newSortOrder}`);
                            sortOrder++; // Increment for next item
                        }
                        
                        if (visualOrder[i].id !== draggedId) {
                            visualOrder[i].sort_order = sortOrder;
                            console.log(`Assigned ${visualOrder[i].id} sort_order: ${sortOrder}`);
                            sortOrder++;
                        }
                    }
                } else {
                    // Normal case: put between them
                    newSortOrder = Math.floor((aboveSortOrder + targetSortOrder) / 2);
                    
                    // If they're the same or if newSortOrder equals current dragged task sort_order, increment by 1
                    if (newSortOrder === targetSortOrder || newSortOrder === draggedTask.sort_order) {
                        newSortOrder = Math.max(targetSortOrder, draggedTask.sort_order) + 1;
                    }
                }
                
                console.log('Dropping above target, new sort_order:', newSortOrder, 'above:', aboveSortOrder, 'target:', targetSortOrder);
            }
        } else {
            // Dropping below target
            if (targetIndex === sameDateTasks.length - 1) {
                // Target is last, put dragged task below it
                newSortOrder = (targetTask.sort_order || 0) - 1;
                console.log('Target is last, dropping below, new sort_order:', newSortOrder);
            } else {
                // Put dragged task between target and the task below it
                const taskBelow = sameDateTasks[targetIndex + 1];
                const targetSortOrder = targetTask.sort_order || 0;
                const belowSortOrder = taskBelow.sort_order || 0;
                
                // Always use force ranking for same-date tasks to ensure proper positioning
                if (true) {
                    // Force ranking: reassign all sort_order values systematically
                    isForceRanking = true;
                    console.log('Performing force ranking for same-date tasks (below)');
                    
                    // Get current visual order of all same-date tasks (ascending)
                    const visualOrder = [...sameDateTasks].sort((a, b) => {
                        if ((a.sort_order || 0) !== (b.sort_order || 0)) {
                            return (a.sort_order || 0) - (b.sort_order || 0);
                        }
                        // If sort_order is the same, maintain original order
                        return sameDateTasks.indexOf(a) - sameDateTasks.indexOf(b);
                    });
                    
                    console.log('Current visual order:', visualOrder.map(t => t.id));
                    
                    // Find where to insert the dragged task (after the target)
                    const insertIndex = visualOrder.findIndex(t => t.id === targetId) + 1;
                    console.log(`Inserting ${draggedId} at position ${insertIndex}`);
                    
                    // Reassign sort_order values starting from 0
                    let sortOrder = 0;
                    for (let i = 0; i < visualOrder.length; i++) {
                        if (i === insertIndex) {
                            // This is where we want to insert the dragged task
                            newSortOrder = sortOrder;
                            console.log(`Assigned dragged task ${draggedId} sort_order: ${newSortOrder}`);
                            sortOrder++; // Increment for next item
                        }
                        
                        if (visualOrder[i].id !== draggedId) {
                            visualOrder[i].sort_order = sortOrder;
                            console.log(`Assigned ${visualOrder[i].id} sort_order: ${sortOrder}`);
                            sortOrder++;
                        }
                    }
                } else {
                    // Normal case: put between them
                    newSortOrder = Math.floor((targetSortOrder + belowSortOrder) / 2);
                    
                    // If they're the same or if newSortOrder equals current dragged task sort_order, decrement by 1
                    if (newSortOrder === targetSortOrder || newSortOrder === draggedTask.sort_order) {
                        newSortOrder = Math.min(targetSortOrder, draggedTask.sort_order) - 1;
                    }
                }
                
                console.log('Dropping below target, new sort_order:', newSortOrder, 'target:', targetSortOrder, 'below:', belowSortOrder);
            }
        }
        
        // Additional check: if newSortOrder would create a duplicate, find the next available number
        const existingSortOrders = sameDateTasks.map(t => t.sort_order || 0);
        while (existingSortOrders.includes(newSortOrder)) {
            newSortOrder = dropAbove ? newSortOrder + 1 : newSortOrder - 1;
        }
        
        try {
            // Update in Supabase
            console.log('Updating task in Supabase:', { id: draggedId, sort_order: newSortOrder });
            const { error } = await this.supabase
                .from('tasks')
                .update({ sort_order: newSortOrder })
                .eq('id', draggedId)
                .eq('user_id', this.user.id);
            
            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }
            
            // If we did force ranking, update all affected tasks in Supabase
            if (isForceRanking) {
                console.log('Updating all force-ranked tasks in Supabase');
                const tasksToUpdate = sameDateTasks.filter(t => t.id !== draggedId);
                
                for (const task of tasksToUpdate) {
                    console.log(`Updating ${task.id} with sort_order: ${task.sort_order}`);
                    const { error: updateError } = await this.supabase
                        .from('tasks')
                        .update({ sort_order: task.sort_order })
                        .eq('id', task.id)
                        .eq('user_id', this.user.id);
                    
                    if (updateError) {
                        console.error(`Error updating ${task.id}:`, updateError);
                        throw updateError;
                    }
                }
            } else if (targetTask.sort_order !== (targetTask.sort_order || 0)) {
                // Single target task update
                console.log('Updating target task in Supabase:', { id: targetId, sort_order: targetTask.sort_order });
                const { error: targetError } = await this.supabase
                    .from('tasks')
                    .update({ sort_order: targetTask.sort_order })
                    .eq('id', targetId)
                    .eq('user_id', this.user.id);
                
                if (targetError) {
                    console.error('Target task Supabase update error:', targetError);
                    throw targetError;
                }
            }
            
            console.log('Supabase update successful');
            draggedTask.sort_order = newSortOrder;
            
            console.log('Updated local task sort_order:', draggedTask.sort_order);
            
            this.saveTasksToLocal();
            this.renderTasks();
            console.log('Tasks re-rendered');
        } catch (error) {
            console.error('Error reordering task:', error);
            // If sort_order column doesn't exist, fall back to updating renewed_at
            if (error.message && error.message.includes('sort_order')) {
                console.log('sort_order column not found, falling back to renewed_at update');
                this.fallbackTaskReorder(draggedId, targetId);
            } else {
                alert('Failed to reorder task. Please try again.');
            }
        }
    }
    
    async fallbackTaskReorder(draggedId, targetId) {
        console.log('Using fallback reorder method');
        const draggedTask = this.tasks.find(t => t.id === draggedId);
        const targetTask = this.tasks.find(t => t.id === targetId);
        
        if (!draggedTask || !targetTask) return;
        
        // Update renewal date to be one day before target
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
            console.error('Error in fallback reorder:', error);
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
                .order('renewed_at', { ascending: false })
                .order('sort_order', { ascending: false });
            
            if (error) throw error;
            
            this.tasks = data || [];
            this.saveTasksToLocal();
            this.renderTasks();
            
            // Set up real-time subscription
            this.setupRealtimeSubscription();
            
            // Autoselect first task in appmode on desktop
            this.checkAppModeAutoselect();
            
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
        
        // Autoselect first task in appmode on desktop
        this.checkAppModeAutoselect();
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
    
    renderExampleTasks() {
        const now = new Date();
        const exampleTasks = [
            { title: 'Fix toaster', completed: true, lifetime: 0 },
            { title: 'Call Mom', completed: false, lifetime: 0 },
            { title: 'Set up dentist appointment', completed: false, lifetime: 1 },
            { title: 'Clean keyboard', completed: false, lifetime: 2 },
            { title: 'Get vanity license plate', completed: false, lifetime: 3 },
            { title: 'Air in tires', completed: true, lifetime: 4 },
            { title: 'Organize toothbrushes', completed: false, lifetime: 4 },
            { title: 'Clean up attic', completed: false, lifetime: 4 }
        ];

        // Convert to task objects with proper structure for existing functions
        const taskObjects = exampleTasks.map((task, index) => {
            const renewedAt = new Date(now.getTime() - (task.lifetime * 24 * 60 * 60 * 1000));
            return {
                id: `example_${index}`,
                title: task.title,
                completed: task.completed,
                completed_at: task.completed ? new Date().toISOString() : null,
                renewed_at: renewedAt.toISOString(),
                sort_order: index
            };
        });

        // Use the same rendering logic as real tasks
        return taskObjects.map(task => {
            // Apply fade class to all tasks based on their lifetime
            const fadeClass = this.getTaskFadeClass(task);
            
            // For example tasks, always show icon for completed tasks (can't uncomplete)
            let checkboxElement;
            if (task.completed) {
                checkboxElement = `<div class="task-checkbox-icon">✓</div>`;
            } else {
                checkboxElement = `<div class="task-checkbox"></div>`;
            }
            
            return `
                <div class="task-item ${fadeClass} ${task.completed ? 'completed' : ''}">
                    ${checkboxElement}
                    <div class="task-content">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');
        
        // Sort tasks by renewal date (date only, most recent first), then by sort_order
        const sortedTasks = [...this.tasks].sort((a, b) => {
            // Compare dates only (set time to 00:00:00)
            const dateA = new Date(a.renewed_at);
            dateA.setHours(0, 0, 0, 0);
            const dateB = new Date(b.renewed_at);
            dateB.setHours(0, 0, 0, 0);
            
            const dateDiff = dateB - dateA;
            if (dateDiff !== 0) return dateDiff;
            
            // If dates are equal, use sort_order as secondary sort (ascending)
            const sortOrderA = a.sort_order || 0;
            const sortOrderB = b.sort_order || 0;
            return sortOrderA - sortOrderB;
        });
        
        
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
            taskList.innerHTML = this.renderExampleTasks();
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
        
        const htmlContent = validTasks.map(task => {
            // Apply fade class to all tasks based on their lifetime
            const fadeClass = this.getTaskFadeClass(task);
            
            // Check if task can be uncompleted (within 1 minute)
            const canUncomplete = task.completed && task.completed_at && 
                (new Date() - new Date(task.completed_at)) <= 60000;
            
            let checkboxElement;
            if (task.completed) {
                // For completed tasks, show icon if can't uncomplete, checkbox if can
                checkboxElement = canUncomplete ? 
                    `<div class="task-checkbox checked" 
                         onclick="event.stopPropagation(); app.toggleTaskCompletion('${task.id}')"></div>` :
                    `<div class="task-checkbox-icon">✓</div>`;
            } else {
                // For incomplete tasks, always show clickable checkbox
                checkboxElement = `<div class="task-checkbox" 
                     onclick="event.stopPropagation(); app.toggleTaskCompletion('${task.id}')"></div>`;
            }
            
            return `
                <div class="task-item ${fadeClass} ${task.completed ? 'completed' : ''}" 
                     data-task-id="${task.id}" 
                     draggable="${!task.completed}">
                    ${checkboxElement}
                    <div class="task-content" onclick="app.openTaskDetail('${task.id}')">
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        taskList.innerHTML = htmlContent;
        
        // Reinitialize icons for dynamically generated content
        this.initializeIcons();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    editLifetime() {
        const valueSpan = document.getElementById('detailLifetimeValue');
        const inputField = document.getElementById('detailLifetimeInput');
        
        if (!this.currentTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        const currentLifetime = this.getTaskLifetime(task);
        
        // Hide span, show input
        valueSpan.style.display = 'none';
        inputField.style.display = 'inline-block';
        inputField.value = currentLifetime;
        inputField.focus();
        inputField.select();
    }
    
    saveLifetime() {
        const valueSpan = document.getElementById('detailLifetimeValue');
        const inputField = document.getElementById('detailLifetimeInput');
        
        if (!this.currentTaskId) return;
        
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;
        
        let newLifetime = parseInt(inputField.value);
        
        // Validate input
        if (isNaN(newLifetime) || newLifetime < 0 || newLifetime > 4) {
            newLifetime = this.getTaskLifetime(task); // Reset to current value
        }
        
        // Update task renewal date to reflect new lifetime
        const now = new Date();
        const newRenewalDate = new Date(now.getTime() - (newLifetime * 24 * 60 * 60 * 1000));
        task.renewed_at = newRenewalDate.toISOString();
        
        // Update UI
        valueSpan.textContent = `${newLifetime}d`;
        valueSpan.style.display = 'inline-block';
        inputField.style.display = 'none';
        
        // Save to Supabase
        this.saveTask();
        this.renderTasks();
        this.updateLifetimeDisplay(task);
    }
    
    handleLifetimeKeypress(event) {
        if (event.key === 'Enter') {
            this.saveLifetime();
        } else if (event.key === 'Escape') {
            // Cancel editing
            const valueSpan = document.getElementById('detailLifetimeValue');
            const inputField = document.getElementById('detailLifetimeInput');
            valueSpan.style.display = 'inline-block';
            inputField.style.display = 'none';
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TidesOverSand();
});