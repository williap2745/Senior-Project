const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { collection: 'UserInfo' });

// Task Schema
const taskSchema = new mongoose.Schema({
    Subject: { type: String, required: true }, // will be dropdown menu
    Skill_level: { type: Number, required: true }, // will be dropdown menu
    Task_Difficulty: { type: Number, required: true }, // will be dropdown menu
    dueDate: { type: Date, required: true },
    Days: { type: Number, default: 0 },
    Hours: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the User model
}, { collection: 'Tasks' });

// Export both models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

module.exports = { User, Task };
