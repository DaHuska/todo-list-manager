const API = 'http://localhost:3000';

async function loadTasks(status = 'all', sortBy = 'priority', sortOrder = 'desc') {
  const response = await fetch(`${API}/tasks?status=${status}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
  const tasks = await response.json();

  const tasksDiv = document.getElementById('tasks');
  const emptyState = document.getElementById('emptyState');
  tasksDiv.innerHTML = '';

  document.getElementById('totalCount').textContent = tasks.length;
  document.getElementById('pendingCount').textContent = tasks.filter(t => t.status === 'pending').length;
  document.getElementById('completedCount').textContent = tasks.filter(t => t.status === 'completed').length;

  if (!tasks.length) {
    emptyState.classList.remove('d-none');
    return;
  }

  emptyState.classList.add('d-none');

  tasksDiv.innerHTML = tasks.map(task => `
    <div class="task-card">
      <div class="task-top">
        <div>
          <h3 class="task-title">${task.title}</h3>
          <div class="task-meta">
            <span class="task-pill accent">${task.project}</span>
            <span class="task-pill">Priority: ${task.priority}</span>
            <span class="task-pill">Deadline: ${task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : 'N/A'}</span>
          </div>
        </div>

        <span class="badge-status ${task.status === 'completed' ? 'status-completed' : 'status-pending'}">
          ${task.status}
        </span>
      </div>

      <div class="task-actions">
        <button class="btn-done" onclick="updateTask('${task._id}', '${task.status === 'completed' ? 'pending' : 'completed'}')">
          ${task.status === 'completed' ? 'Mark Pending' : 'Complete'}
        </button>
        <button class="btn-del" onclick="deleteTask('${task._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

async function loadStats() {
  const response = await fetch(`${API}/stats`);
  const stats = await response.json();

  const statsDiv = document.getElementById('stats');

  if (!stats.length) {
    statsDiv.innerHTML = `<p class="text-secondary-soft mb-0">No aggregation data yet.</p>`;
    return;
  }

  statsDiv.innerHTML = stats.map(item => `
    <div class="task-card">
      <div class="task-top">
        <div>
          <h3 class="task-title">${item._id || 'Unassigned'}</h3>
          <div class="task-meta">
            <span class="task-pill accent">Total: ${item.totalTasks}</span>
            <span class="task-pill">Completed: ${item.completedTasks}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const title = document.getElementById('title').value.trim();
  const project = document.getElementById('project').value.trim();
  const priority = document.getElementById('priority').value;
  const deadline = document.getElementById('deadline').value;

  const response = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, project, priority, deadline })
  });

  if (!response.ok) {
    const err = await response.json();
    alert(err.error || 'Validation failed');
    return;
  }

  form.reset();
  form.classList.remove('was-validated');
  loadTasks();
});

async function updateTask(id, status) {
  await fetch(`${API}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  loadTasks();
}

async function deleteTask(id) {
  await fetch(`${API}/tasks/${id}`, {
    method: 'DELETE'
  });

  loadTasks();
}

loadTasks();
loadStats();