
        
        class Task {
            constructor(id, text, priority = 'medium', created = new Date()) {
                this.id = id;
                this.text = text;
                this.priority = priority;
                this.created = created;
            }
        }

        // Board state management
        class KanbanBoard {
            constructor() {
                this.boardData = this.loadFromStorage() || {
                    todo: [],
                    inProgress: [],
                    done: []
                };
                this.taskIdCounter = this.getMaxTaskId() + 1;
            }

            getMaxTaskId() {
                let maxId = 0;
                Object.values(this.boardData).forEach(column => {
                    column.forEach(task => {
                        maxId = Math.max(maxId, task.id);
                    });
                });
                return maxId;
            }

            addTask(columnId, text, priority = 'medium') {
                const task = new Task(this.taskIdCounter++, text, priority);
                this.boardData[columnId].push(task);
                this.saveToStorage();
                return task;
            }

            moveTask(fromColumn, toColumn, taskId) {
                const task = this.boardData[fromColumn].find(t => t.id === taskId);
                if (task) {
                    this.boardData[fromColumn] = this.boardData[fromColumn].filter(t => t.id !== taskId);
                    this.boardData[toColumn].push(task);
                    this.saveToStorage();
                }
            }

            updateTask(columnId, taskId, newText) {
                const task = this.boardData[columnId].find(t => t.id === taskId);
                if (task) {
                    task.text = newText;
                    this.saveToStorage();
                }
            }

            deleteTask(columnId, taskId) {
                this.boardData[columnId] = this.boardData[columnId].filter(t => t.id !== taskId);
                this.saveToStorage();
            }

            loadFromStorage() {
                const data = localStorage.getItem('kanbanBoard');
                return data ? JSON.parse(data) : null;
            }

            saveToStorage() {
                localStorage.setItem('kanbanBoard', JSON.stringify(this.boardData));
            }

            clear() {
                this.boardData = {
                    todo: [],
                    inProgress: [],
                    done: []
                };
                this.saveToStorage();
            }
        }

        const board = new KanbanBoard();

        // UI Functions
        function initializeBoard() {
            Object.keys(board.boardData).forEach(column => {
                const columnEl = document.querySelector(`[data-column="${column}"] .task-list`);
                columnEl.innerHTML = '';
                board.boardData[column].forEach(task => {
                    createTaskElement(task, columnEl);
                });
                updateTaskCount(column);
            });
        }

        function createTaskElement(task, columnEl) {
            const taskEl = document.createElement('div');
            taskEl.className = 'task task-added';
            taskEl.draggable = true;
            taskEl.setAttribute('ondragstart', 'drag(event)');
            taskEl.setAttribute('data-task-id', task.id);
            
            const priorityIndicator = document.createElement('div');
            priorityIndicator.className = `priority-indicator priority-${task.priority}`;
            
            const taskContent = document.createElement('div');
            taskContent.textContent = task.text;
            
            const taskActions = document.createElement('div');
            taskActions.className = 'task-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'task-btn edit-task';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => editTask(taskEl);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'task-btn delete-task';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteTask(taskEl);
            
            taskActions.appendChild(editBtn);
            taskActions.appendChild(deleteBtn);
            
            taskEl.appendChild(priorityIndicator);
            taskEl.appendChild(taskContent);
            taskEl.appendChild(taskActions);
            
            columnEl.appendChild(taskEl);
        }

        function showAddTask(column) {
            const columnEl = document.querySelector(`[data-column="${column}"] .task-list`);
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'task-input';
            input.placeholder = 'Enter task description';
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && this.value.trim()) {
                    addTask(this.value.trim(), column);
                    this.remove();
                }
            });
            
            input.addEventListener('blur', function() {
                if (this.value.trim()) {
                    addTask(this.value.trim(), column);
                }
                this.remove();
            });
            
            columnEl.appendChild(input);
            input.focus();
        }

        function addTask(text, column) {
            const columnEl = document.querySelector(`[data-column="${column}"] .task-list`);
            const priority = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
            const task = board.addTask(column, text, priority);
            createTaskElement(task, columnEl);
            updateTaskCount(column);
        }

        function editTask(taskEl) {
            const taskContent = taskEl.querySelector('div:not(.task-actions):not(.priority-indicator)');
            const currentText = taskContent.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'task-input';
            input.value = currentText;
            
            taskContent.textContent = '';
            taskContent.appendChild(input);
            input.focus();
            
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    updateTaskText(this);
                }
            });
            
            input.addEventListener('blur', function() {
                updateTaskText(this);
            });
        }
function updateTaskText(input) {
            const newText = input.value.trim();
            const taskEl = input.closest('.task');
            const taskContent = taskEl.querySelector('div:not(.task-actions):not(.priority-indicator)');
            const column = taskEl.closest('.column').dataset.column;
            const taskId = parseInt(taskEl.dataset.taskId);
            
            if (newText) {
                taskContent.textContent = newText;
                board.updateTask(column, taskId, newText);
            } else {
                deleteTask(taskEl);
            }
        }

        function deleteTask(taskEl) {
            const column = taskEl.closest('.column').dataset.column;
            const taskId = parseInt(taskEl.dataset.taskId);
            
            taskEl.style.transform = 'translateX(100px)';
            taskEl.style.opacity = '0';
            
            setTimeout(() => {
                board.deleteTask(column, taskId);
                taskEl.remove();
                updateTaskCount(column);
            }, 200);
        }

        function updateTaskCount(column) {
            const countEl = document.querySelector(`[data-column="${column}"] .task-count`);
            countEl.textContent = board.boardData[column].length;
        }

        // Drag and Drop functions
        function allowDrop(ev) {
            ev.preventDefault();
            highlightDropZone(ev.target);
        }

        function drag(ev) {
            ev.dataTransfer.setData("taskId", ev.target.dataset.taskId);
            ev.target.classList.add('dragging');
        }

        function drop(ev) {
            ev.preventDefault();
            removeHighlights();
            
            const taskId = parseInt(ev.dataTransfer.getData("taskId"));
            const draggedTask = document.querySelector('.dragging');
            const sourceColumn = draggedTask.closest('.column').dataset.column;
            const targetColumn = ev.target.closest('.column').dataset.column;
            
            if (sourceColumn !== targetColumn) {
                board.moveTask(sourceColumn, targetColumn, taskId);
                
                const targetList = document.querySelector(`[data-column="${targetColumn}"] .task-list`);
                targetList.appendChild(draggedTask);
                
                updateTaskCount(sourceColumn);
                updateTaskCount(targetColumn);
            }
            
            draggedTask.classList.remove('dragging');
        }

        function highlightDropZone(element) {
            removeHighlights();
            const taskList = element.closest('.task-list');
            if (taskList) {
                taskList.style.backgroundColor = '#e3f2fd';
            }
        }

        function removeHighlights() {
            document.querySelectorAll('.task-list').forEach(list => {
                list.style.backgroundColor = '';
            });
        }

        // Utility functions
        function clearBoard() {
            if (confirm('Are you sure you want to clear all tasks?')) {
                board.clear();
                initializeBoard();
            }
        }

        function addSampleTasks() {
            const sampleTasks = {
                todo: [
                    { text: 'Research new technologies', priority: 'high' },
                    { text: 'Update documentation', priority: 'medium' },
                    { text: 'Schedule team meeting', priority: 'low' }
                ],
                inProgress: [
                    { text: 'Implement new feature', priority: 'high' },
                    { text: 'Code review', priority: 'medium' }
                ],
                done: [
                    { text: 'Deploy to production', priority: 'high' },
                    { text: 'Bug fixes', priority: 'medium' }
                ]
            };

            board.clear();
            
            Object.keys(sampleTasks).forEach(column => {
                sampleTasks[column].forEach(task => {
                    board.addTask(column, task.text, task.priority);
                });
            });
            
            initializeBoard();
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', () => {
            initializeBoard();
            
            // Add keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'n') {
                    e.preventDefault();
                    showAddTask('todo');
                }
            });
        });
