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
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session(
    {secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

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