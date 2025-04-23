if (process.env.NODE_ENV !== 'production')
{
    require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const mongoose = require('mongoose');
const {User} = require('./models/User'); // Import the User model
const {Task} = require('./models/User'); // Import the Task model
const {ClassSchedule} = require('./models/User'); // Import the ClassSchedule model
const {DailyTask} = require('./models/User'); // Import the DailyTask model


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

const initializePassport = require('./passport-config');
initializePassport(
    passport,
    async email => await User.findOne({ email: email }), // Fetch user by email
    async id => await User.findById(id) // Fetch user by ID
);

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: true }))
app.use(flash())
app.use(session(
    {secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.json()) //needed for calender events

app.get('/', checkAuthenticated, (req, res) => {
    console.log(req.user)
    res.render('Home.ejs', {name: req.user.name}) //sends the name here to the site
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs', {name: 'Perry'}) //sends the name here to the site
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', 
    {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
    }))

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs', {name: 'Perry'}) //sends the name here to the site
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({
            name: req.body.Name,
            email: req.body.Email_Address,
            password: hashedPassword
        });
        await user.save(); // Save user to the database
        res.redirect('/login');
    } catch {
        res.redirect('/register');
    }
});

app.get('/addTask', checkAuthenticated, (req, res) => {
    res.render('addTask.ejs', { name: req.user.name }); // Render addTask.ejs
});

app.get('/addTask/school', checkAuthenticated, async (req, res) => {
    res.render('addTaskSchool.ejs', { name: req.user.name }); // Render addTaskSchool.ejs
});

app.get('/addTask/Org', checkAuthenticated, async (req, res) => {
    res.render('addTaskOrg.ejs', { name: req.user.name }); // Render addTaskSchool.ejs
});

app.get('/addTask/ClassSchedule', checkAuthenticated, async (req, res) => {
    res.render('addClassSchedule.ejs', { name: req.user.name }); // Render addTaskSchool.ejs
});

// saving class data to mongoDB
app.post('/addTask/ClassSchedule', async (req, res) => {
    try {
        // Extract data from the form
        const { Title, startDate, endDate, days, startTime, endTime } = req.body;

        // Create a new ClassSchedule document
        const newSchedule = new ClassSchedule({
            Title: req.body.Title, // Assuming you have a Title field in your form
            StartDate: new Date(startDate),
            EndDate: new Date(endDate),
            Days: days, // Array of selected days
            StartTime: startTime,
            EndTime: endTime,
            userId: req.user._id // Assuming user authentication is implemented
        });

        // Save the document to the database
        await newSchedule.save();

        // Redirect or send a success response
        res.redirect('/addTask'); // Redirect to a schedule page or send a success message
    } catch (error) {
        console.error('Error saving schedule:', error);
        res.status(500).send('An error occurred while saving the schedule.');
    }
});

module.exports = app;

// Fetching CLass information in order to be displayed on the Calender
app.get('/schedule/events', checkAuthenticated, async (req, res) => {
    try {
                // Define the dayMap object
        const dayMap = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6
        };
        // Fetch schedules for the logged-in user
        const schedules = await ClassSchedule.find({ userId: req.user._id });

        // Map schedules to FullCalendar event format
        const events = schedules.flatMap(schedule => {
            const startDate = new Date(schedule.StartDate);
            const endDate = new Date(schedule.EndDate);
            return schedule.Days.map(day => {
                const dayOfWeek = dayMap[day];

                // Find the first occurrence of the day within the date range
                let currentDate = new Date(startDate);

                //Adjust for timezone offset to ensure the correct local date
                //currentDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000);

                while (currentDate.getDay() !== dayOfWeek) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                // Subtract one day to fix the off-by-one issue
                // Temporary fix if I can not find root cause of issue
                currentDate.setDate(currentDate.getDate() - 1);

                // Generate events for all occurrences of the day within the date range
                const dayEvents = [];
                while (currentDate <= endDate) {
                    const localDate = currentDate.toISOString().split('T')[0]; // Extract local date in YYYY-MM-DD format
                    dayEvents.push({
                        title: schedule.Title,
                        start: `${currentDate.toISOString().split('T')[0]}T${schedule.StartTime}`, // Combine date and startTime
                        end: `${currentDate.toISOString().split('T')[0]}T${schedule.EndTime}`,   // Combine date and endTime
                    });

                    // Move to the next week
                    currentDate.setDate(currentDate.getDate() + 7);
                }

                return dayEvents;
            }).flat();
        });
        console.log('Class Schedule Events:', events); // Debugging

        // Send the events as JSON
        res.json(events);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).send('An error occurred while fetching schedules.');
    }
});

// Adding Functionality to prevent events from overlapping.
// Have to check if the time slot is available before and provide way to find a time slot
// I also want to prevent the time slot from overlapping with sleeping hours (12 AM - 9 AM)
function isTimeSlotAvailable(startTime, endTime, existingEvents) {
    for (const event of existingEvents) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        // Check if the new time slot overlaps with the existing event
        if (
            (startTime >= eventStart && startTime < eventEnd) || // New start overlaps with existing event
            (endTime > eventStart && endTime <= eventEnd) ||    // New end overlaps with existing event
            (startTime <= eventStart && endTime >= eventEnd)    // New event fully overlaps existing event
        ) {
            return false; // Conflict found
        }
    }
    return true; // No conflicts
}

// Adjusted findAvailableTimeSlot to distribute tasks more evenly throughout the day
function findAvailableTimeSlot(startDate, hoursPerDay, existingEvents) {
    let startTime = new Date(startDate);
    startTime.setHours(9, 0, 0, 0); // Start from 9 AM by default
    let endTime = new Date(startTime.getTime() + hoursPerDay * 60 * 60 * 1000);

    // Ensure the time slot stays within the same day
    const dayEnd = new Date(startTime);
    dayEnd.setHours(23, 59, 59, 999);

    // Helper function to check if the time is within sleeping hours
    function isWithinSleepingHours(startTime, endTime) {
        const startHour = startTime.getHours();
        const endHour = endTime.getHours();
        return (
            (startHour >= 0 && startHour < 9) || 
            (endHour > 0 && endHour <= 9) || 
            (startHour < 0 && endHour >= 9)
        );
    }

    // Check for conflicts and adjust the time slot if needed
    while (
        !isTimeSlotAvailable(startTime, endTime, existingEvents) || 
        isWithinSleepingHours(startTime, endTime)
    ) {
        startTime.setMinutes(startTime.getMinutes() + 30);
        endTime = new Date(startTime.getTime() + hoursPerDay * 60 * 60 * 1000);

        // Ensure the time slot does not exceed the end of the day
        if (endTime > dayEnd) {
            throw new Error('No available time slot within the day.');
        }
    }

    return { startTime, endTime };
}

// FUnctionality for predicting hours for task and displaying them over a number of days on the calender
const { spawn } = require('child_process');
app.post('/addTask/school', checkAuthenticated, async (req, res) => {
    try {
        const {Title, Subject, Skill_Level, Task_Difficulty, Grade, dueDate } = req.body;

        //fetch existing tasks
        const tasks = await DailyTask.find({ userId: req.user._id });
        console.log('Fetched Tasks:', tasks); // Debugging

        const schedules = await ClassSchedule.find({ userId: req.user._id });
        console.log('Fetched Schedules:', schedules); // Debugging

        // Combine tasks and schedules into a single list of events
        const existingEvents = [
            ...tasks.map(task => {
                // Combine the date and time fields into a single local datetime
                const taskDate = new Date(task.date); // Convert date to local time
                const [startHour, startMinute] = task.startTime.split(':').map(Number);
                const [endHour, endMinute] = task.endTime.split(':').map(Number);

                // Construct local datetime for start and end
                const start = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), startHour, startMinute);
                const end = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), endHour, endMinute);

                return { start, end };
            }),
            ...schedules.flatMap(schedule => {
                const dayMap = {
                    Sunday: 0,
                    Monday: 1,
                    Tuesday: 2,
                    Wednesday: 3,
                    Thursday: 4,
                    Friday: 5,
                    Saturday: 6
                };

                const startDate = new Date(schedule.StartDate);
                const endDate = new Date(schedule.EndDate);

                return schedule.Days.map(day => {
                    const dayOfWeek = dayMap[day];
                    let currentDate = new Date(startDate);

                    // Find the first occurrence of the day within the date range
                    while (currentDate.getDay() !== dayOfWeek) {
                        currentDate.setDate(currentDate.getDate() + 1);
                    }

                    const dayEvents = [];
                    while (currentDate <= endDate) {
                        const [startHour, startMinute] = schedule.StartTime.split(':').map(Number);
                        const [endHour, endMinute] = schedule.EndTime.split(':').map(Number);

                        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute);
                        const end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute);

                        dayEvents.push({ start, end });

                        // Move to the next occurrence of the same day
                        currentDate.setDate(currentDate.getDate() + 7);
                    }

                    return dayEvents;
                }).flat();
            })
        ];
        console.log('Constructed Existing Events:', existingEvents); // Debugging

        // Prepare data for prediction
        const inputData = JSON.stringify({
            Subject: req.body.Subject,
            Skill_Level: parseInt(req.body.Skill_Level),
            Task_Difficulty: parseInt(req.body.Task_Difficulty),
            Score: parseInt(req.body.Score)
        });

        // Call predict.py using child_process
        const pythonProcess = spawn('python3', ['predict.py']);
        pythonProcess.stdin.write(inputData);
        pythonProcess.stdin.end();

        let predictedHours = '';
        pythonProcess.stdout.on('data', (data) => {
            predictedHours += data.toString();
            console.log(`Raw output from Python script: "${predictedHours}"`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Error from Python script: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error(`Python script exited with code ${code}`);
                return res.status(500).send('Error predicting task hours.');
            }
            // Parse the predicted hours
            const hours = parseFloat(predictedHours.trim());
            if (isNaN(hours)) {
                console.error('Predicted hours is not a valid number:', predictedHours);
                return res.status(500).send('Error: Invalid predicted hours.');
            }

            const startDate = new Date();
            const endDate = new Date(dueDate);
            const timeDifference = endDate - startDate;
            const days = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
            const hoursPerDay = days > 0 ? hours / days : hours;

            const newTask = new Task({
                Title: req.body.Title,
                Subject,
                Skill_Level: parseInt(Skill_Level),
                Task_Difficulty: parseInt(Task_Difficulty),
                Desired_Grade: parseInt(Grade),
                dueDate: endDate,
                startDate: startDate,
                Days: days,
                Hours: hoursPerDay,
                userId: req.user._id
            });

            const savedTask = await newTask.save();

            let currentDate = new Date(startDate);
            for (let i = 0; i < days; i++) {
                const { startTime: dailyStartTime, endTime: dailyEndTime } = findAvailableTimeSlot(
                    currentDate,
                    hoursPerDay,
                    existingEvents
                );

                const formattedStartTime = dailyStartTime.toTimeString().slice(0, 5);
                const formattedEndTime = dailyEndTime.toTimeString().slice(0, 5);

                const dailyTask = new DailyTask({
                    Title: savedTask.Title,
                    taskId: savedTask._id,
                    date: new Date(currentDate),
                    startTime: formattedStartTime,
                    endTime: formattedEndTime,
                    userId: req.user._id
                });

                await dailyTask.save();

                existingEvents.push({
                    start: new Date(`${currentDate.toISOString().split('T')[0]}T${formattedStartTime}`),
                    end: new Date(`${currentDate.toISOString().split('T')[0]}T${formattedEndTime}`)
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            res.redirect('/addTask');
        });
    } catch (error) {
        console.error('Error saving task:', error);
        res.status(500).send('An error occurred while saving the task.');
    }
});

// Fetching task information in order to be displayed on the Calender
app.get('/calendar', checkAuthenticated, async (req, res) => {
    try {
        // Fetch daily tasks
        const dailyTasks = await DailyTask.find({ userId: req.user._id });
        const taskEvents = dailyTasks.map(dailyTask => ({
            title: dailyTask.Title,
            start: new Date(`${dailyTask.date.toISOString().split('T')[0]}T${dailyTask.startTime}`), // Combine date and startTime
            end: new Date(`${dailyTask.date.toISOString().split('T')[0]}T${dailyTask.endTime}`),   // Combine date and endTime
            extendedProps: {
                taskId: dailyTask.taskId
            }
        }));
        console.log('Task Events:', taskEvents); // Debugging

        res.json(taskEvents);
    } catch (error) {
        console.error('Error fetching daily tasks:', error);
        res.status(500).send('Internal Server Error');
    }
});

// trying to combine both of the gets into one for display on Home screen here
// This is the one that will be used for the calendar
app.get('/calendar/all', checkAuthenticated, async (req, res) => {
    try {
        // Fetch daily tasks
        const dailyTasks = await DailyTask.find({ userId: req.user._id });
        const taskEvents = dailyTasks.map(dailyTask => ({
            id: dailyTask._id,
            title: dailyTask.Title,
            start: new Date(`${dailyTask.date.toISOString().split('T')[0]}T${dailyTask.startTime}`), // Combine date and startTime
            end: new Date(`${dailyTask.date.toISOString().split('T')[0]}T${dailyTask.endTime}`),   // Combine date and endTime
            extendedProps: {
                taskId: dailyTask.taskId
            }
        }));
        console.log('Task Events:', taskEvents); // Debugging
        // Fetch class schedules
        const dayMap = {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6
        };
        const schedules = await ClassSchedule.find({ userId: req.user._id });
        const scheduleEvents = schedules.flatMap(schedule => {
            const startDate = new Date(schedule.StartDate);
            const endDate = new Date(schedule.EndDate);

            // Generate events for each day in the schedule
            return schedule.Days.map(day => {
                const dayOfWeek = dayMap[day];

                // Find the first occurrence of the day within the date range
                let currentDate = new Date(startDate);
                while (currentDate.getDay() !== dayOfWeek) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                // Subtract one day to fix the off-by-one issue
                // Temporary fix if I can not find root cause of issue
                currentDate.setDate(currentDate.getDate() - 1);
                // Generate events for all occurrences of the day within the date range
                const dayEvents = [];
                while (currentDate <= endDate) {
                    dayEvents.push({
                        title: schedule.Title,
                        start: `${currentDate.toISOString().split('T')[0]}T${schedule.StartTime}`, // Combine date and startTime
                        end: `${currentDate.toISOString().split('T')[0]}T${schedule.EndTime}`    // Combine date and endTime
                    });

                    // Move to the next week
                    currentDate.setDate(currentDate.getDate() + 7);
                }

                return dayEvents;
            }).flat();
        });

        // Combine task and schedule events
        const events = [...taskEvents, ...scheduleEvents];
        console.log('Combined Events:', events); // Debugging

        res.json(events);
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        res.status(500).send('Internal Server Error');
    }
});

//Adding path for editing times within the calender
app.post('/calendar/update', checkAuthenticated, async (req, res) => {
    try {
        const { id, start, end } = req.body;

        // Update the event in the database
        const updatedTask = await DailyTask.findByIdAndUpdate(
            id,
            { date: new Date(start.split('T')[0]), startTime: start.split('T')[1], endTime: end ? end.split('T')[1] : null },
            { new: true }
        );

        if (!updatedTask) {
            return res.status(404).send('Event not found');
        }

        res.status(200).send('Event updated successfully');
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send('An error occurred while updating the event');
    }
});


app.delete('/logout', (req, res) => {
    req.logOut((err) => {
        if (err) {
            return next(err)
        }
        res.redirect('/login')
    })
})
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}
app.listen(3000)
