const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const client = new MongoClient(process.env.MONGO_URI);

let tasksCollection;

const priorityMap = {
  Low: 1,
  Medium: 2,
  High: 3
};

async function connectDB() {
  await client.connect();

  const db = client.db(process.env.DB_NAME);
  tasksCollection = db.collection(process.env.COLLECTION_NAME);

  await tasksCollection.createIndexes([
    {
      key: { status: 1, priority: -1, deadline: 1 },
      name: 'status_priority_deadline_idx'
    },
    {
      key: { project: 1, status: 1 },
      name: 'project_status_idx'
    }
  ]);

  console.log('Connected to MongoDB');
}

connectDB().catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});

// Find + sort
app.get('/tasks', async (req, res) => {
  try {
    const status = req.query.status || 'all';
    const sortBy = req.query.sortBy || 'priority';
    const sortOrder = req.query.sortOrder || 'desc';

    const query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const allowedSortBy = ['priority', 'deadline'];
    const allowedSortOrder = ['asc', 'desc'];

    const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'priority';
    const safeSortOrder = allowedSortOrder.includes(sortOrder) ? sortOrder : 'desc';

    const sort = {};

    if (safeSortBy === 'deadline') {
      sort.deadline = safeSortOrder === 'asc' ? 1 : -1;
      sort.priority = -1;
    } else {
      sort.priority = safeSortOrder === 'asc' ? 1 : -1;
      sort.deadline = 1;
    }

    const tasks = await tasksCollection
        .find(query)
        .sort(sort)
        .toArray();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

// Add
app.post('/tasks', async (req, res) => {
  try {
    const task = {
      title: req.body.title,
      project: req.body.project,
      priority: priorityMap[req.body.priority] ?? 2,
      priorityLabel: req.body.priority || 'Medium',
      deadline: req.body.deadline ? new Date(req.body.deadline) : null,
      status: 'pending',
      createdAt: new Date()
    };

    const result = await tasksCollection.insertOne(task);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update
app.put('/tasks/:id', async (req, res) => {
  try {
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: req.body.status } }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete
app.delete('/tasks/:id', async (req, res) => {
  try {
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(req.params.id)
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Aggregate
app.get('/stats', async (req, res) => {
  try {
    const stats = await tasksCollection.aggregate([
      {
        $group: {
          _id: '$project',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { totalTasks: -1 }
      }
    ]).toArray();

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});