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
            return schedule.Days.map(day => ({
                title: schedule.Title,
                startTime: schedule.StartTime,
                endTime: schedule.EndTime,
                daysOfWeek: [dayMap[day]] // Map day to FullCalendar's day numbers
            }));
        });

        // Send the events as JSON
        res.json(events);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).send('An error occurred while fetching schedules.');
    }
});

app.get('/addTask', checkAuthenticated, (req, res) => {
    res.render('addTask.ejs', { name: req.user.name }); // Render addTask.ejs
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