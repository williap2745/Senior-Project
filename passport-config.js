const { authenticate } = require('passport')


const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')


function initialize(passport, getUserByEmail, getUserByID) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserByEmail(email);
        if (user == null) {
            return done(null, false, { message: 'No user with that email' });
        }
        console.log('User found:', user);

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: "Password is incorrect" });
            }
            
        console.log('Authentication successful for user:', user);
        } catch(e) {
            return done(e);
        }
    };

    passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser));
    passport.serializeUser((user, done) => {
        done(null, user.id); // Serialize user by ID
    })
    passport.deserializeUser(async(id, done) => {
        try{
            const user = await getUserByID(id);
            done(null, user);
        } catch(e) {
            done(e);
        }
    });
}

module.exports = initialize