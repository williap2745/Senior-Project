const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { collection: 'UserInfo' });

// Task Schema
const taskSchema = new mongoose.Schema({
    Title: { type: String, required: true },
    Subject: { type: String, required: true }, // will be dropdown menu
    Skill_Level: { type: Number, required: true }, // will be dropdown menu
    Task_Difficulty: { type: Number, required: true }, // will be dropdown menu
    Desired_Grade: { type: Number, required: true }, // will be dropdown menu
    dueDate: { type: Date, required: true },
    startDate: { type: Date, default: Date.now }, // Automatically set to the current date
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

const dailyTaskSchema = new mongoose.Schema({
    Title: { type: String, required: true }, // Title of the task
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true }, // Reference to the original task
    date: { type: Date, required: true }, // The specific date for this task
    startTime: { type: String, required: true }, // Store time as a string (e.g., "09:00")
    endTime: { type: String, required: true },   // Store time as a string (e.g., "11:00")
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Reference to the user
}, { collection: 'DailyTasks' });


// Export both models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const ClassSchedule = mongoose.model('ClassSchedule', ClassScheduleSchema);
const DailyTask = mongoose.model('DailyTask', dailyTaskSchema);

module.exports = { User, Task, ClassSchedule, DailyTask };
