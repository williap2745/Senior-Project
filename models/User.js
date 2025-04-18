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

const ClassScheduleSchema = new mongoose.Schema({
    Title: { type: String, required: true },
    StartDate: { type: Date, required: true }, 
    EndDate: { type: Date, required: true },
    Days: { type: [String], required: true }, // Array of days
    StartTime: { type: String, required: true }, // Time in HH:MM format
    EndTime: { type: String, required: true }, // Time in HH:MM format
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the User model
}, { collection: 'ClassSchedule' });

// Export both models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const ClassSchedule = mongoose.model('ClassSchedule', ClassScheduleSchema);

module.exports = { User, Task, ClassSchedule };
