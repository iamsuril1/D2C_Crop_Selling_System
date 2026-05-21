import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value?.toLowerCase();
        const googleId  = profile.id;
        const firstName = profile.name?.givenName  || profile.displayName || "User";
        const lastName  = profile.name?.familyName || "";
        let user = await User.findOne({ googleId });
        if (user) return done(null, { user, isNew: false });
        user = await User.findOne({ email });
        if (user) {
          user.googleId = googleId;
          if (!user.profileImage && profile.photos?.[0]?.value) {
            user.profileImage = profile.photos[0].value;
          }
          await user.save();
          return done(null, { user, isNew: false });
        }
        user = await User.create({
          googleId,
          firstName,
          lastName,
          email,
          profileImage: profile.photos?.[0]?.value || "",
          role:         "pending_google",   
        });
        return done(null, { user, isNew: true });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;