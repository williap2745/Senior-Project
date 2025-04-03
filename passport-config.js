const { authenticate } = require('passport')


const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')


function initialize(passport, getUserByEmail, getUserByID) {
    const authenticateUser = async (email, password, done) => {
        const user = getUserByEmail(email);
        if (user == null) {
            return done(null, false, { message: 'No user with that email' });
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: "Password is incorrect" });
            }
        } catch(e) {
            return done(e);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.serializeUser((user, done) => {
        done(null, user.id); // Serialize user by ID
    })
    passport.deserializeUser((id, done) => {
        // Replace with your user fetching logic
        return done(null, getUserByID(id)) // Example: Replace with actual user object
    });
}

module.exports = initialize