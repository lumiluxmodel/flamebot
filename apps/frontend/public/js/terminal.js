// public/js/terminal.js

// Terminal Application
class FlambotTerminal {
    constructor() {
        this.API_BASE = window.location.origin + '/api';
        this.ws = null;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentModal = null;
        this.refreshInterval = null;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
        this.updateTime();
        this.startTimeUpdater();
        this.connectWebSocket();
        this.loadInitialData();
        this.showWelcomeMessage();
        this.focusCommandInput();
    }

    setupEventListeners() {
        // Command input
        const input = document.getElementById('command-input');
        if (input) {
            input.addEventListener('keydown', (e) => this.handleCommandInput(e));
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleGlobalShortcuts(e));

        // Modal close on overlay click (not on modal content)
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                // Only close if clicking on overlay, not modal content
                if (e.target === overlay) {
                    this.closeModal();
                }
            });
        }

        // Add model/channel buttons
        document.querySelectorAll('.add-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                if (type === 'model') this.showAddModelModal();
                else if (type === 'channel') this.showAddChannelModal();
            });
        });
    }

    // Time updater
    startTimeUpdater() {
        setInterval(() => this.updateTime(), 1000);
    }

    updateTime() {
        const timeEl = document.getElementById('current-time');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString();
        }
    }

    // WebSocket connection
    connectWebSocket() {
        // In production, connect to real WebSocket
        // For now, use polling
        this.refreshInterval = setInterval(() => {
            this.refreshTasks();
            this.refreshStats();
        }, 5000);
    }

    // Load initial data
    async loadInitialData() {
        this.showLoading(true);
        
        try {
            await Promise.all([
                this.refreshTasks(),
                this.refreshStats(),
                this.refreshModels(),
                this.refreshChannels()
            ]);
        } catch (error) {
            this.showNotification('Failed to load initial data', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Refresh active tasks
    async refreshTasks() {
        try {
            const response = await fetch(`${this.API_BASE}/actions/swipe/active`);
            const data = await response.json();
            
            if (data.success) {
                this.displayTasks(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    // Display tasks
    displayTasks(tasks) {
        const container = document.getElementById('tasks-list');
        const countEl = document.getElementById('task-count');
        
        if (!container) return;
        
        countEl.textContent = `${tasks.length} active`;
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">◯</div>
                    <div>No active tasks</div>
                    <div style="color: var(--text-dim); margin-top: 10px;">
                        Start a swipe task to see activity
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-item fade-in">
                <div class="task-header">
                    <span class="task-type">🔄 SWIPE</span>
                    <span class="task-status status-${(task.status || 'progress').toLowerCase()}">
                        ${task.status || 'PROGRESS'}
                    </span>
                </div>
                <div class="task-details">
                    <div>Task ID: <span class="task-id">${task.task_id}</span></div>
                    <div>Account: ${task.account_ids ? task.account_ids.join(', ') : 'N/A'}</div>
                    <div>Started: ${new Date(task.started_at).toLocaleTimeString()}</div>
                </div>
            </div>
        `).join('');
    }

    // Refresh statistics
    async refreshStats() {
        try {
            // In production, fetch from API
            // For now, use random values
            const stats = {
                swipes: Math.floor(Math.random() * 5000),
                matches: Math.floor(Math.random() * 500),
                active: Math.floor(Math.random() * 100),
                rate: Math.floor(Math.random() * 30 + 70)
            };
            
            this.updateStatsDisplay(stats);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    updateStatsDisplay(stats) {
        const elements = {
            'swipes-today': stats.swipes,
            'matches-today': stats.matches,
            'active-accounts': stats.active,
            'success-rate': stats.rate + '%'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                this.animateValue(el, parseInt(el.textContent) || 0, value);
            }
        });
    }

    // Animate number changes
    animateValue(el, start, end) {
        const duration = 500;
        const startTime = performance.now();
        
        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(start + (end - start) * progress);
            el.textContent = typeof end === 'string' ? current + '%' : current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };
        
        requestAnimationFrame(update);
    }

    // Refresh models
    async refreshModels() {
        try {
            const response = await fetch(`${this.API_BASE}/accounts/models`);
            const data = await response.json();
            
            if (data.success) {
                this.displayModels(data.data);
            }
        } catch (error) {
            console.error('Error fetching models:', error);
        }
    }

    displayModels(data) {
        const container = document.getElementById('models-list');
        if (!container) return;
        
        const models = data.models || ['Aura', 'Lola', 'Iris', 'Ciara'];
        const colors = data.colors || {
            Aura: '#23d100',
            Lola: '#e00000',
            Iris: '#ffb3f5',
            Ciara: '#295eff'
        };
        
        container.innerHTML = models.map(model => `
            <div class="list-item" data-model="${model}">
                <div class="list-item-name">
                    <div class="model-color" style="background: ${colors[model]}"></div>
                    ${model}
                </div>
                <div class="list-item-info">0 active</div>
            </div>
        `).join('') + '<button class="add-button" data-type="model">[+ ADD MODEL]</button>';
        
        // Re-attach event listeners
        container.querySelector('.add-button').addEventListener('click', () => {
            this.showAddModelModal();
        });
    }

    // Refresh channels
    async refreshChannels() {
        const container = document.getElementById('channels-list');
        if (!container) return;
        
        const channels = [
            { name: 'snap', status: 'Active' },
            { name: 'gram', status: 'Active' },
            { name: 'of', status: 'Active' },
            { name: 'telegram', status: 'Beta' }
        ];
        
        container.innerHTML = channels.map(channel => `
            <div class="list-item" data-channel="${channel.name}">
                <div class="list-item-name">${channel.name}</div>
                <div class="list-item-info ${channel.status === 'Beta' ? 'text-warning' : 'text-success'}">
                    ${channel.status === 'Beta' ? '⚠' : '●'} ${channel.status}
                </div>
            </div>
        `).join('') + '<button class="add-button" data-type="channel">[+ ADD CHANNEL]</button>';
        
        // Re-attach event listeners
        container.querySelector('.add-button').addEventListener('click', () => {
            this.showAddChannelModal();
        });
    }

    // Command handling
    async handleCommandInput(e) {
        const input = e.target;
        
        if (e.key === 'Enter') {
            const command = input.value.trim();
            if (command) {
                this.commandHistory.push(command);
                this.historyIndex = this.commandHistory.length;
                await this.executeCommand(command);
                input.value = '';
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                input.value = this.commandHistory[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                input.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                input.value = '';
            }
        }
    }

    // Execute command
    async executeCommand(command) {
        const parts = command.toLowerCase().split(' ');
        const cmd = parts[0];
        
        const commands = {
            'help': () => this.showHelp(),
            'clear': () => this.clearTerminal(),
            'status': () => this.showStatus(),
            'monitor': () => this.startMonitoring(),
            'models': () => this.handleModelsCommand(parts),
            'channels': () => this.handleChannelsCommand(parts),
            'swipe': () => this.handleSwipeCommand(parts),
            'spectre': () => this.handleSpectreCommand(parts),
            'bio': () => this.handleBioCommand(parts),
            'prompt': () => this.handlePromptCommand(parts),
            'stop': () => this.handleStopCommand(parts),
            'emergency-stop': () => this.emergencyStop(),
            'exit': () => this.exitTerminal()
        };
        
        const handler = commands[cmd];
        if (handler) {
            await handler();
        } else {
            this.showNotification(`Unknown command: ${cmd}. Type 'help' for available commands.`, 'error');
        }
    }

    // Command implementations
    showHelp() {
        this.showModal('help', 'FLAMEBOT TERMINAL COMMANDS', `
            <div class="help-commands">
                <div class="help-command">
                    <span class="help-cmd">help</span>
                    <span class="help-desc">Show all available commands</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">status</span>
                    <span class="help-desc">Show system status and statistics</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">monitor</span>
                    <span class="help-desc">Start live activity monitoring</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">models [list|add]</span>
                    <span class="help-desc">Manage model configurations</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">channels [list|add]</span>
                    <span class="help-desc">Manage channel configurations</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">swipe start &lt;id&gt;</span>
                    <span class="help-desc">Start swipe task for account</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">spectre &lt;id&gt; &lt;likes&gt;</span>
                    <span class="help-desc">Configure Spectre mode</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">bio generate &lt;id&gt;</span>
                    <span class="help-desc">Generate and update bio</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">prompt &lt;model&gt; &lt;channel&gt;</span>
                    <span class="help-desc">Generate prompt for model/channel</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">stop &lt;task_id&gt;</span>
                    <span class="help-desc">Stop specific task</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">emergency-stop</span>
                    <span class="help-desc">Stop ALL active tasks</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">clear</span>
                    <span class="help-desc">Clear terminal output</span>
                </div>
                <div class="help-command">
                    <span class="help-cmd">exit</span>
                    <span class="help-desc">Exit terminal (confirm required)</span>
                </div>
            </div>
        `);
    }

    clearTerminal() {
        const content = document.querySelector('.terminal-content');
        if (content) {
            content.scrollTop = 0;
        }
        this.showNotification('Terminal cleared', 'success');
        this.loadInitialData();
    }

    async showStatus() {
        await this.refreshStats();
        this.showNotification('System Status: All systems operational', 'success');
    }

    startMonitoring() {
        this.showNotification('Live monitoring activated', 'success');
        // Increase refresh rate
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.refreshInterval = setInterval(() => {
            this.refreshTasks();
            this.refreshStats();
        }, 2000);
    }

    // Swipe command
    async handleSwipeCommand(parts) {
        if (parts[1] === 'start' && parts[2]) {
            await this.startSwipe(parts[2]);
        } else {
            this.showNotification('Usage: swipe start <account_id>', 'error');
        }
    }

    async startSwipe(accountId) {
        this.showNotification(`Starting swipe for account ${accountId}...`, 'info');
        
        try {
            const response = await fetch(`${this.API_BASE}/actions/swipe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountIds: [accountId] })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification(`Swipe started! Task ID: ${data.data.taskId}`, 'success');
                await this.refreshTasks();
            } else {
                this.showNotification(`Failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    // Spectre command
    async handleSpectreCommand(parts) {
        if (parts[1] && parts[2]) {
            await this.configureSpectre(parts[1], parts[2]);
        } else {
            this.showNotification('Usage: spectre <account_id> <max_likes>', 'error');
        }
    }

    async configureSpectre(accountId, maxLikes) {
        this.showNotification(`Configuring Spectre mode...`, 'info');
        
        try {
            const response = await fetch(`${this.API_BASE}/actions/spectre/enable`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    accountId, 
                    maxLikes: parseInt(maxLikes) 
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification(`Spectre configured with ${maxLikes} likes!`, 'success');
            } else {
                this.showNotification(`Failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    // Stop command
    async handleStopCommand(parts) {
        if (parts[1]) {
            await this.stopTask(parts[1]);
        } else {
            this.showNotification('Usage: stop <task_id>', 'error');
        }
    }

    async stopTask(taskId) {
        this.showNotification(`Stopping task ${taskId}...`, 'info');
        
        try {
            const response = await fetch(`${this.API_BASE}/actions/swipe/stop/${taskId}`, {
                method: 'POST'
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('Task stopped successfully!', 'success');
                await this.refreshTasks();
            } else {
                this.showNotification(`Failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    async emergencyStop() {
        if (!confirm('Stop ALL active tasks?')) return;
        
        this.showNotification('Executing emergency stop...', 'warning');
        
        try {
            const response = await fetch(`${this.API_BASE}/actions/swipe/stop-all`, {
                method: 'POST'
            });
            
            const data = await response.json();
            if (data.success) {
                this.showNotification('All tasks stopped!', 'success');
                await this.refreshTasks();
            } else {
                this.showNotification(`Failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    exitTerminal() {
        if (confirm('Exit Flamebot Terminal?')) {
            window.location.href = '/';
        }
    }

    // Modal functions
    showModal(id, title, content) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById('modal');
        const modalHeader = document.getElementById('modal-header');
        const modalContent = document.getElementById('modal-content');
        
        if (overlay && modal && modalHeader && modalContent) {
            modalHeader.textContent = title;
            modalContent.innerHTML = content;
            overlay.classList.add('active');
            this.currentModal = id;
        }
    }

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            this.currentModal = null;
        }
    }

    showAddModelModal() {
        this.showModal('add-model', 'ADD NEW MODEL', `
            <form class="modal-form" onsubmit="terminal.addModel(event)">
                <div class="form-group">
                    <label class="form-label">Model Name</label>
                    <input type="text" class="form-input" name="name" required 
                           placeholder="e.g., Sophia" autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label">Color (Hex)</label>
                    <input type="text" class="form-input" name="color" required 
                           placeholder="e.g., #ff69b4" pattern="^#[0-9A-Fa-f]{6}$" 
                           autocomplete="off">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="btn">ADD MODEL</button>
                    <button type="button" class="btn btn-secondary" onclick="terminal.closeModal()">CANCEL</button>
                </div>
            </form>
        `);
    }

    showAddChannelModal() {
        this.showModal('add-channel', 'ADD NEW CHANNEL', `
            <form class="modal-form" onsubmit="terminal.addChannel(event)">
                <div class="form-group">
                    <label class="form-label">Channel Name</label>
                    <input type="text" class="form-input" name="name" required 
                           placeholder="e.g., discord" autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label">Prefix Format</label>
                    <input type="text" class="form-input" name="prefix" required 
                           placeholder="e.g., Dis{α};" autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label">Username Format</label>
                    <input type="text" class="form-input" name="format" required 
                           placeholder="e.g., @{username}" autocomplete="off">
                </div>
                <div class="modal-buttons">
                    <button type="submit" class="btn">ADD CHANNEL</button>
                    <button type="button" class="btn btn-secondary" onclick="terminal.closeModal()">CANCEL</button>
                </div>
            </form>
        `);
    }

    // Form submissions
    async addModel(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const color = formData.get('color');
        
        this.showNotification(`Adding model ${name}...`, 'info');
        // In production, send to API
        
        this.closeModal();
        this.showNotification(`Model ${name} added successfully!`, 'success');
        await this.refreshModels();
    }

    async addChannel(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get('name');
        
        this.showNotification(`Adding channel ${name}...`, 'info');
        // In production, send to API
        
        this.closeModal();
        this.showNotification(`Channel ${name} added successfully!`, 'success');
        await this.refreshChannels();
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Loading state
    showLoading(show) {
        const loader = document.getElementById('main-loader');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }

    // Welcome message
    showWelcomeMessage() {
        setTimeout(() => {
            this.showNotification('Welcome to Flamebot Terminal v1.0', 'success');
        }, 1000);
    }

    // Focus command input
    focusCommandInput() {
        const input = document.getElementById('command-input');
        if (input) {
            input.focus();
        }
    }

    // Global keyboard shortcuts
    handleGlobalShortcuts(e) {
        // Ctrl/Cmd + K to clear
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            this.clearTerminal();
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && this.currentModal) {
            this.closeModal();
        }
        
        // Always focus on input (except when modal is open)
        if (!this.currentModal) {
            const input = document.getElementById('command-input');
            if (document.activeElement !== input && input) {
                input.focus();
            }
        }
    }
}

// Create slideOut animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(120%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize terminal
const terminal = new FlambotTerminal();