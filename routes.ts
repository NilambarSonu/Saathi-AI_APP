import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import { generateAndPersistAIRecommendation, generateChatResponse, generateSoilAnalysisReport, analyzeSoilFromFile, translateText } from "./services/ai";
import { calculateSoilTestPricing, reportPriceDispute, type PricingResponse } from "./services/service_fees";
import { insertSoilTestSchema, insertChatMessageSchema, insertChatSessionSchema, users, soilTests, aiRecommendations, chatSessions, chatMessages, otps, sendOtpSchema, verifyOtpSchema, registerSchema, loginSchema } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import multer from 'multer';
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyAccessToken, generateAccessToken, generateRefreshToken, verifyRefreshToken } from "./lib/jwt";
import { eq } from "drizzle-orm";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as FacebookStrategy, Profile as FacebookProfile } from "passport-facebook";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { sendOtpEmail, sendContactNotificationEmail } from "./email-service";

const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

function timeout(ms: number): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`AI response timeout after ${ms}ms`)), ms)
  );
}

// Auth constants
const JWT_SECRET = process.env.JWT_SECRET || "saathi-ai-secret-key-change-me";
const SMS_PROVIDER = process.env.SMS_PROVIDER || "MSG91";

// OAuth configuration check
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;

// Dynamic callback URLs based on environment
const isDev = process.env.NODE_ENV === 'development';
const BASE_URL = isDev ? "http://localhost:5000" : "https://saathiai.org";

const GOOGLE_CALLBACK_URL = `${BASE_URL}/api/auth/google/callback`;
const FACEBOOK_CALLBACK_URL = `${BASE_URL}/api/auth/facebook/callback`;
const X_CALLBACK_URL = `${BASE_URL}/api/auth/x/callback`;

// Dual auth middleware
async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // ── METHOD 1: JWT Bearer Token (mobile app) ──
  const authHeader = req.headers["authorization"] as string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    
    if (!token) {
      if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
      }
      return res.status(401).json({ error: "Access token required" });
    }

    const payload = verifyAccessToken(token);
    
    // Fallback if token verified manually with jwt.verify
    if (!payload) {
       jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
         if (err) {
           if (req.isAuthenticated && req.isAuthenticated()) return next();
           return res.status(403).json({ error: "Invalid or expired token" });
         }
         try {
           const user = await storage.getUser(decoded.userId);
           if (!user) return res.status(401).json({ error: "User not found" });
           (req as any).user = user;
           return next();
         } catch { return res.status(500).json({ error: "Database error" }); }
       });
       return;
    }

    try {
      const user = await storage.getUser(payload.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      (req as any).user = user;
      (req as any).authMethod = 'jwt';
      return next();
    } catch (err) {
      console.error('[JWT Auth] DB error:', err);
      return res.status(500).json({ error: "Authentication error" });
    }
  }

  // ── METHOD 2: Session Cookie (web browser) ── KEEP EXACTLY AS IS
  if (req.isAuthenticated && req.isAuthenticated()) {
    // If we use session Passport, user is already populate on req.user
    return next();
  }
  
  return res.status(401).json({ error: "Access token required" });
}

// Generate JWT for user
function generateToken(user: { id: string; username: string }) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Setup Passport strategies
function setupPassport(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialize/deserialize
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google Strategy - only configure if credentials exist
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    }, async (
      accessToken: string,
      refreshToken: string,
      profile: GoogleProfile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email from Google"), undefined);
        }

        // Check if user exists by provider ID first, then by email
        let user = await storage.getUserByProviderId("google", profile.id);

        if (!user) {
          user = await storage.getUserByEmail(email);
        }

        if (!user) {
          // Create new user from Google profile
          user = await storage.createUser({
            username: profile.displayName || email.split("@")[0],
            email,
            phone: null,
            password: "",
            provider: "google",
            providerId: profile.id,
          });
        }

        done(null, user);
      } catch (error: any) {
        console.error(`Google OAuth error: ${error.message}`);
        done(error, undefined);
      }
    }));
    console.log("Google OAuth configured with callback:", GOOGLE_CALLBACK_URL);
  } else {
    console.log("Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }

  // Facebook Strategy
  if (FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET) {
    passport.use(new FacebookStrategy({
      clientID: FACEBOOK_CLIENT_ID,
      clientSecret: FACEBOOK_CLIENT_SECRET,
      callbackURL: FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "displayName", "emails"],
    }, async (
      accessToken: string,
      refreshToken: string,
      profile: FacebookProfile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        console.log("Facebook OAuth profile:", JSON.stringify({ id: profile.id, displayName: profile.displayName, emails: profile.emails }));
        
        // 1. Check if user exists by provider ID
        let user = await storage.getUserByProviderId("facebook", profile.id);
        if (user) {
          console.log("Facebook user found by providerId:", user.id);
          return done(null, user);
        }

        // 2. Try to find by email if available
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            console.log("Facebook user found by email, updating provider:", user.id);
            // Update existing user with Facebook provider info
            try {
              await db.update(users)
                .set({ provider: "facebook", providerId: profile.id })
                .where(eq(users.id, user.id));
              user = await storage.getUser(user.id);
            } catch (e) {
              console.error("Failed to update provider info:", e);
            }
            return done(null, user);
          }
        }

        // 3. Create new user - sanitize username and ensure unique email
        const sanitizedName = (profile.displayName || "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() || `fb_user`;
        const uniqueUsername = `${sanitizedName}_${profile.id.slice(-6)}`;
        const userEmail = email || `fb_${profile.id}@oauth.saathiai.org`;

        user = await storage.createUser({
          username: uniqueUsername,
          email: userEmail,
          phone: null,
          password: "",
          provider: "facebook",
          providerId: profile.id,
        });
        console.log("New Facebook user created:", user.id);

        done(null, user);
      } catch (error: any) {
        console.error(`Facebook OAuth error:`, error);
        done(error);
      }
    }));
    console.log("Facebook OAuth configured with callback:", FACEBOOK_CALLBACK_URL);
  } else {
    console.log("Facebook OAuth not configured - missing FACEBOOK_CLIENT_ID or FACEBOOK_CLIENT_SECRET");
  }

  // X (Twitter) Strategy - OAuth 1.0a
  if (X_CLIENT_ID && X_CLIENT_SECRET) {
    passport.use(new TwitterStrategy({
      consumerKey: X_CLIENT_ID,        // using existing env var names for convenience
      consumerSecret: X_CLIENT_SECRET, // using existing env var names for convenience
      callbackURL: X_CALLBACK_URL,
      includeEmail: true, // Attempt to fetch email
    }, async (
      token: string,
      tokenSecret: string,
      profile: any,
      done: (error: any, user?: any) => void
    ) => {
      try {
        console.log("X OAuth 2.0 profile:", JSON.stringify({ id: profile.id, username: profile.username, displayName: profile.displayName }));
        
        // 1. Check if user exists by provider ID first
        let user = await storage.getUserByProviderId("x", profile.id);
        if (user) {
          console.log("X user found by providerId:", user.id);
          return done(null, user);
        }

        // 2. Try to find by email if available
        const email = profile.emails?.[0]?.value;
        if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
               console.log("X user found by email, updating provider:", user.id);
               // Update existing user with X provider info
               try {
                 await db.update(users)
                   .set({ provider: "x", providerId: profile.id })
                   .where(eq(users.id, user.id));
                 user = await storage.getUser(user.id);
               } catch (e) {
                 console.error("Failed to update provider info:", e);
               }
               return done(null, user);
            }
        }

        // 3. Create new user - sanitize username and ensure unique email
        const baseName = profile.username || profile.displayName || "x_user";
        const sanitizedName = baseName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        const uniqueUsername = `${sanitizedName}_${profile.id.slice(-6)}`;
        const userEmail = email || `x_${profile.id}@oauth.saathiai.org`;

        user = await storage.createUser({
          username: uniqueUsername,
          email: userEmail,
          phone: null,
          password: "",
          provider: "x",
          providerId: profile.id,
        });
        console.log("New X user created:", user.id);

        done(null, user);
      } catch (error: any) {
        console.error(`X OAuth 2.0 error:`, error);
        done(error, undefined);
      }
    }));
    console.log("X OAuth 2.0 configured with callback:", X_CALLBACK_URL);
  } else {
    console.log("X OAuth not configured - missing X_CLIENT_ID or X_CLIENT_SECRET");
  }
}



export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Passport.js OAuth
  setupPassport(app);

  // ==================== AUTH ENDPOINTS ====================

  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const data = sendOtpSchema.parse(req.body);
      const { email, phone, countryCode, purpose, provider } = data;

      // Determine if this is email or phone OTP
      const isEmailOtp = !!email;
      const contactValue = email || phone!;
      const contactType = isEmailOtp ? "email" : "phone";

      // Check if user already exists for registration
      if (purpose === "register") {
        if (isEmailOtp) {
          const existingUser = await storage.getUserByEmail(email!);
          if (existingUser) {
            return res.status(400).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
          }
        } else {
          const existingUser = await storage.getUserByPhone(phone!);
          if (existingUser) {
            return res.status(400).json({ error: "Phone number already registered", code: "PHONE_EXISTS" });
          }
        }
      }

      // Create OTP record
      const { otpId, otpPlain } = await storage.createOtp(
        isEmailOtp ? undefined : phone,
        countryCode,
        purpose,
        provider,
        isEmailOtp ? email : undefined
      );

      // Send OTP via appropriate method
      if (isEmailOtp) {
        const emailSent = await sendOtpEmail(email!, otpPlain, purpose);
        if (!emailSent) {
          return res.status(500).json({ error: "Failed to send email", code: "EMAIL_SEND_FAILED" });
        }
        console.log(`✅ OTP email sent to ${email}`);
      } else {
        // For development, just log the SMS OTP
        console.log(`[DEV] OTP for ${countryCode}${phone}: ${otpPlain}`);
      }

      res.json({
        ok: true,
        otpId,
        expiresIn: 180,
        provider,
        contactType,
      });
    } catch (error: any) {
      console.error(`Send OTP error: ${error.message}`);
      res.status(400).json({ error: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const data = verifyOtpSchema.parse(req.body);
      const { otpId, otp, email, client } = data;
      const isMobileClient = client === 'mobile' || req.headers['x-client-type'] === 'mobile';

      let otpRecord;
      if (isMobileClient && !otpId && email) {
        const result = await db.select().from(otps).where(sql`${otps.email} = ${email}`).orderBy(sql`${otps.createdAt} DESC`).limit(1);
        otpRecord = result[0];
      } else {
        otpRecord = await storage.getOtp(otpId!);
      }
      
      if (!otpRecord) {
        return res.status(400).json({ error: "OTP not found", code: "OTP_NOT_FOUND" });
      }

      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ error: "OTP expired", code: "OTP_EXPIRED" });
      }

      if (otpRecord.usedAt) {
        return res.status(400).json({ error: "OTP already used", code: "OTP_USED" });
      }

      const isValid = isMobileClient && !otpId ? (otpRecord && await bcrypt.compare(otp, otpRecord.otpHash)) : await storage.verifyOtp(otpId!, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid OTP", code: "OTP_INVALID" });
      }

      await storage.markOtpUsed(otpRecord!.id);

      if (isMobileClient) {
        // Mark user as verified in DB
        const user = await storage.getUserByEmail(otpRecord!.email!);
        if (user) {
          const accessToken = generateAccessToken({
            id: user.id,
            email: user.email,
            username: user.username,
          });
          const refreshToken = generateRefreshToken(user.id);
          return res.status(200).json({
            success: true,
            message: 'Email verified successfully.',
            token: accessToken,
            refreshToken: refreshToken,
            expiresIn: 7 * 24 * 60 * 60,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              phone: user.phone,
              location: user.location,
              profile_picture: user.profilePicture,
              preferred_language: user.preferredLanguage,
              provider: user.provider,
              created_at: user.createdAt,
            },
          });
        }
      }

      res.json({
        ok: true,
        phone: otpRecord.phone,
        countryCode: otpRecord.countryCode,
        purpose: otpRecord.purpose,
      });
    } catch (error: any) {
      console.error(`Verify OTP error: ${error.message}`);
      res.status(400).json({ error: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      const { username, email, phone, password, otpId, client } = data;
      const isMobileClient = client === 'mobile' || req.headers['x-client-type'] === 'mobile';

      let otpRecord;
      if (!isMobileClient) {
        if (!otpId) return res.status(400).json({ error: "OTP not verified", code: "OTP_NOT_VERIFIED" });
        otpRecord = await storage.getOtp(otpId);
        if (!otpRecord || !otpRecord.usedAt) {
          return res.status(400).json({ error: "OTP not verified", code: "OTP_NOT_VERIFIED" });
        }
      }

      if (!isMobileClient && otpRecord) {
        if (otpRecord.email && otpRecord.email !== email) {
          return res.status(400).json({ error: "Email mismatch", code: "EMAIL_MISMATCH" });
        }
        if (otpRecord.phone && otpRecord.phone !== phone) {
          return res.status(400).json({ error: "Phone number mismatch", code: "PHONE_MISMATCH" });
        }
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken", code: "USERNAME_EXISTS" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
      }

      // Only check phone existence if phone is provided
      if (phone) {
        const existingPhone = await storage.getUserByPhone(phone);
        if (existingPhone) {
          return res.status(400).json({ error: "Phone number already registered", code: "PHONE_EXISTS" });
        }
      }

      const user = await storage.createUser({
        username,
        email,
        phone: phone || null,
        password,
        provider: "local",
      });

      if (!isMobileClient && otpRecord?.phone) {
        await storage.updateUserPhoneVerified(user.id, true);
      }

      if (isMobileClient) {
        // Send OTP
        const { otpPlain } = await storage.createOtp(undefined, "+91", "register", "EMAIL", email);
        await sendOtpEmail(email, otpPlain, "register");

        return res.status(201).json({
          success: true,
          message: 'Account created. Please verify your email with the OTP sent.',
          email: user.email,
          requiresOTP: true,
        });
      }

      const token = generateToken(user);

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          phoneVerified: otpRecord?.phone ? true : false,
        },
      });
    } catch (error: any) {
      console.error(`Register error: ${error.message}`);
      res.status(400).json({ error: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      const { usernameOrEmail, password } = data;

      const user = await storage.getUserByUsernameOrEmail(usernameOrEmail);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
      }

      // OAuth users can't login with password
      if (user.provider !== "local") {
        return res.status(401).json({
          error: `Please login with ${user.provider}`,
          code: "OAUTH_USER"
        });
      }

      const userPassword = (user as any).password;
      const userPasswordHash = user.passwordHash;

      if (!userPassword && !userPasswordHash) {
        return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
      }

      let validPassword = false;
      if (userPasswordHash) {
        // Use hashed password if available
        validPassword = await bcrypt.compare(password, userPasswordHash);
      } else if (userPassword) {
        // Use plain text password for testing
        validPassword = password === userPassword;
      }

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
      }

      const isMobileClient = req.body.client === 'mobile' || req.headers['x-client-type'] === 'mobile';
      if (isMobileClient) {
        const accessToken = generateAccessToken({
          id: user.id,
          email: user.email,
          username: user.username,
        });
        const refreshToken = generateRefreshToken(user.id);

        return res.status(200).json({
          success: true,
          token: accessToken,
          refreshToken: refreshToken,
          expiresIn: 7 * 24 * 60 * 60,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            location: user.location,
            profile_picture: user.profilePicture,
            preferred_language: user.preferredLanguage,
            provider: user.provider,
            created_at: user.createdAt,
          },
        });
      }

      const token = generateToken(user);

      res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          phoneVerified: user.phoneVerified,
        },
      });
    } catch (error: any) {
      console.error(`Login error: ${error.message}`);
      res.status(400).json({ error: error.message, code: "VALIDATION_ERROR" });
    }
  });

  app.get("/api/auth/google", (req, res, next) => {
    const redirectUri = req.query.redirect_uri as string;
    const prompt = req.query.prompt as string;

    const state = JSON.stringify({ redirectUri });

    passport.authenticate("google", {
      scope: ["profile", "email"],
      state,
      ...(prompt && { prompt })
    })(req, res, next);
  });

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { session: false }),
    (req, res) => {
      try {
        const user = req.user as any;

        const token = generateAccessToken({ id: user.id, email: user.email, username: user.username });
        const refreshToken = generateRefreshToken(user.id);

        // 👇 Get redirectUri from state
        let redirectUri: string | undefined;
        if (req.query.state) {
          try {
            const state = JSON.parse(req.query.state as string);
            redirectUri = state.redirectUri;
          } catch (e) {
            console.error("Error parsing state in Google callback:", e);
          }
        }

        // ✅ MOBILE FLOW
        if (redirectUri && (
          redirectUri.startsWith("saathiai://") ||
          redirectUri.startsWith("exp+saathi-ai://") ||
          redirectUri.includes("://auth/callback")
        )) {
          return res.send(`
            <html>
              <body>
                <script>
                  window.location.href = "${redirectUri}?token=${token}&userId=${user.id}";
                </script>
              </body>
            </html>
          `);
        }

        // ✅ WEB FLOW
        return res.redirect(`${BASE_URL}/?token=${token}&userId=${user.id}&oauth_success=true`);

      } catch (err) {
        console.error(err);
        return res.redirect(`${BASE_URL}/login?error=oauth_failed`);
      }
    }
  );

  // Facebook OAuth
  app.get("/api/auth/facebook", (req, res, next) => {
    const redirectUri = req.query.redirect_uri;
    const state = JSON.stringify({ redirectUri });
    passport.authenticate("facebook", { scope: ["public_profile"], state })(req, res, next);
  });

  app.get("/api/auth/facebook/callback",
    passport.authenticate("facebook", { session: false }),
    (req, res) => {
      try {
        const user = req.user as any;

        const token = generateAccessToken({ id: user.id, email: user.email, username: user.username });
        const refreshToken = generateRefreshToken(user.id);

        // 👇 Get redirectUri from state
        let redirectUri: string | undefined;
        if (req.query.state) {
          try {
            const state = JSON.parse(req.query.state as string);
            redirectUri = state.redirectUri;
          } catch (e) {
            console.error("Error parsing state in Facebook callback:", e);
          }
        }

        // ✅ MOBILE FLOW
        if (redirectUri && (
          redirectUri.startsWith("saathiai://") ||
          redirectUri.startsWith("exp+saathi-ai://") ||
          redirectUri.includes("://auth/callback")
        )) {
          return res.send(`
            <html>
              <body>
                <script>
                  window.location.href = "${redirectUri}?token=${token}&userId=${user.id}";
                </script>
              </body>
            </html>
          `);
        }

        // ✅ WEB FLOW
        return res.redirect(`${BASE_URL}/?token=${token}&userId=${user.id}&oauth_success=true`);

      } catch (err) {
        console.error(err);
        return res.redirect(`${BASE_URL}/login?error=oauth_failed`);
      }
    }
  );

  // X (Twitter) OAuth
  app.get("/api/auth/x", (req, res, next) => {
    console.log("=== X OAUTH INITIATE ===");
    console.log("Query:", req.query);
    console.log("Session ID before redirect:", req.sessionID);
    console.log("Session data:", req.session);
    
    if (req.query.redirect_uri) {
      (req.session as any).redirectUri = req.query.redirect_uri;
    }
    
    // Save session manually before redirect to ensure PKCE state persists
    req.session.save((err) => {
      if (err) console.error("Error saving session before X oauth:", err);
      console.log("Session saved. Redirecting to Twitter...");
      passport.authenticate("twitter")(req, res, next);
    });
  });

  app.get("/api/auth/x/callback", (req, res, next) => {
    console.log("=== X OAUTH CALLBACK ===");
    console.log("Query:", req.query);
    console.log("Session ID at callback:", req.sessionID);
    console.log("Session data at callback:", req.session);

    passport.authenticate("twitter", { session: false }, (err: any, user: any, info: any) => {
      console.log("X OAuth callback passport response - User:", !!user, "Error:", err, "Info:", info);
      if (err) {
        console.error("X OAuth Error details:", err);
        return res.redirect(`${BASE_URL}/login?error=x_auth_failed&msg=${encodeURIComponent(err.message)}`);
      }
      if (!user) {
        console.error("X OAuth No User returned - Info:", info);
        return res.redirect(`${BASE_URL}/login?error=x_auth_failed&msg=${encodeURIComponent(info?.message || "User not found")}`);
      }
      
      try {
        const token = generateAccessToken({ id: user.id, email: user.email, username: user.username });
        const refreshToken = generateRefreshToken(user.id);

        // 👇 Get redirectUri from session or state
        let redirectUri = (req.session as any).redirectUri;
        if (req.query.state && !redirectUri) {
          try {
            const state = JSON.parse(req.query.state as string);
            redirectUri = state.redirectUri;
          } catch (e) {
            console.error("Error parsing state in X callback:", e);
          }
        }

        // ✅ MOBILE FLOW
        if (redirectUri && (
          redirectUri.startsWith("saathiai://") ||
          redirectUri.startsWith("exp+saathi-ai://") ||
          redirectUri.includes("://auth/callback")
        )) {
          return res.send(`
            <html>
              <body>
                <script>
                  window.location.href = "${redirectUri}?token=${token}&userId=${user.id}";
                </script>
              </body>
            </html>
          `);
        }

        // ✅ WEB FLOW
        return res.redirect(`${BASE_URL}/?token=${token}&userId=${user.id}&oauth_success=true`);

      } catch (err) {
        console.error(err);
        return res.redirect(`${BASE_URL}/login?error=oauth_failed`);
      }
    })(req, res, next);
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    try {
      const user = await storage.getUser(payload.userId);

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const newAccessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });
      const newRefreshToken = generateRefreshToken(user.id);

      return res.status(200).json({
        success: true,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      });
    } catch (err) {
      console.error('[Token Refresh] Error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /api/users/device  — register mobile device for push notifications
  app.post('/api/users/device', authenticateToken, async (req, res) => {
    const { expo_push_token, device_type, device_name } = req.body;
    const userId = (req as any).user.id;

    if (!expo_push_token || !device_type) {
      return res.status(400).json({ error: 'expo_push_token and device_type are required' });
    }

    try {
      // Upsert: insert if new token, update last_active if exists
      // Wait, there is no user_devices table in shared/schema.ts that was provided!
      // But the prompt says "The user_devices table has been added to Neon. Do NOT run any SQL or touch the database. All work is code-only."
      // Since it's raw SQL, I'll use db.execute
      await db.execute(sql`
        INSERT INTO user_devices (user_id, expo_push_token, device_type, device_name, last_active)
        VALUES (${userId}, ${expo_push_token}, ${device_type}, ${device_name || null}, now())
        ON CONFLICT (expo_push_token) 
        DO UPDATE SET 
          user_id = ${userId},
          device_type = ${device_type},
          device_name = ${device_name || null},
          last_active = now()
      `);

      return res.status(200).json({ success: true, message: 'Device registered' });
    } catch (err) {
      console.error('[Device Register] Error:', err);
      return res.status(500).json({ error: 'Failed to register device' });
    }
  });

  // Dashboard endpoint (authentication required)
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;

      // Fetch full user details from database
      const fullUser = await storage.getUser(user.id);

      if (!fullUser) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      }

      res.json({
        message: "Welcome to Saathi AI Dashboard",
        user: {
          id: fullUser.id,
          username: fullUser.username,
          email: fullUser.email,
          phone: fullUser.phone,
          location: fullUser.location,
          phoneVerified: fullUser.phoneVerified,
          createdAt: fullUser.createdAt,
          provider: fullUser.provider,
          profilePicture: fullUser.profilePicture
        },
        status: "AI System Online",
        aiStatus: {
          geminiPrimary: !!process.env.GEMINI_API_KEY,
          geminiSecondary: !!process.env.GEMINI_API_KEY_3,
          openai: !!process.env.OPENAI_API_KEY,
          model: "gemini-2.5-flash (optimized)",
          waterfallActive: true
        }
      });
    } catch (error: any) {
      console.error(`Dashboard error: ${error.message}`);
      res.status(500).json({ error: "Failed to fetch dashboard data", code: "DASHBOARD_ERROR" });
    }
  });

  // Get current authenticated user profile
  app.get("/api/user", authenticateToken, async (req, res) => {
    try {
      console.log("🔥 CORRECT USER ROUTE HIT");

      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated", code: "UNAUTHORIZED" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      }

      return res.json({
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          location: user.location,
          phoneVerified: user.phoneVerified,
          profilePicture: user.profilePicture,
          preferredLanguage: user.preferredLanguage,
          provider: user.provider,
          createdAt: user.createdAt,
        },
      });
    } catch (error: any) {
      console.error(`Get user error: ${error.message}`);
      return res.status(500).json({ error: "Failed to fetch user", code: "GET_USER_FAILED" });
    }
  });

  // Update user profile endpoint
  app.put("/api/user", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { username, location } = req.body;

      // Validate input
      if (!username || username.trim().length < 2) {
        return res.status(400).json({ error: "Username must be at least 2 characters", code: "INVALID_USERNAME" });
      }

      // Check if username is already taken by another user
      const existingUser = await storage.getUserByUsername(username.trim());
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Username already taken", code: "USERNAME_EXISTS" });
      }

      // Update user
      const updatedUser = await storage.updateUser(userId, {
        username: username.trim(),
        location: location ? location.trim() : null,
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
      }

      res.json({
        ok: true,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          phone: updatedUser.phone,
          location: updatedUser.location,
          phoneVerified: updatedUser.phoneVerified,
        },
      });
    } catch (error: any) {
      console.error(`Update user error: ${error.message}`);
      res.status(500).json({ error: "Failed to update user", code: "UPDATE_FAILED" });
    }
  });

  // Send OTP for password change
  app.post("/api/auth/send-password-change-otp", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const userEmail = user.email;

      if (!userEmail) {
        return res.status(400).json({ error: "User email not found", code: "EMAIL_NOT_FOUND" });
      }

      // Create OTP for password change
      const { otpId, otpPlain } = await storage.createOtp(
        undefined, // No phone
        "+91", // Default country code
        "password_change",
        "EMAIL",
        userEmail
      );

      // Send OTP via email
      const emailSent = await sendOtpEmail(userEmail, otpPlain, "password_change");
      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send email", code: "EMAIL_SEND_FAILED" });
      }

      console.log(`✅ Password change OTP email sent to ${userEmail}`);

      res.json({
        ok: true,
        otpId,
        expiresIn: 180,
        provider: "EMAIL",
        message: "OTP sent to your email for password change verification"
      });
    } catch (error: any) {
      console.error(`Send password change OTP error: ${error.message}`);
      res.status(500).json({ error: "Failed to send password change OTP", code: "OTP_SEND_FAILED" });
    }
  });

  // Change password with OTP verification
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      const { otpId, otp, newPassword } = req.body;

      if (!otpId || !otp || !newPassword) {
        return res.status(400).json({ error: "Missing required fields", code: "MISSING_FIELDS" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters", code: "WEAK_PASSWORD" });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must contain an uppercase letter", code: "WEAK_PASSWORD" });
      }

      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must contain a lowercase letter", code: "WEAK_PASSWORD" });
      }

      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must contain a number", code: "WEAK_PASSWORD" });
      }

      // Verify OTP
      const otpRecord = await storage.getOtp(otpId);
      if (!otpRecord) {
        return res.status(400).json({ error: "OTP not found", code: "OTP_NOT_FOUND" });
      }

      if (new Date() > otpRecord.expiresAt) {
        return res.status(400).json({ error: "OTP expired", code: "OTP_EXPIRED" });
      }

      if (otpRecord.usedAt) {
        return res.status(400).json({ error: "OTP already used", code: "OTP_USED" });
      }

      const isValid = await storage.verifyOtp(otpId, otp);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid OTP", code: "OTP_INVALID" });
      }

      // Verify that the OTP was sent to the user's email
      if (otpRecord.email !== user.email) {
        return res.status(403).json({ error: "OTP not valid for this user", code: "OTP_USER_MISMATCH" });
      }

      // Update user password
      await storage.updateUserPassword(user.id, newPassword);
      await storage.markOtpUsed(otpId);

      console.log(`✅ Password changed successfully for user ${user.id}`);

      res.json({
        ok: true,
        message: "Password changed successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error(`Change password error: ${error.message}`);
      res.status(500).json({ error: "Failed to change password", code: "PASSWORD_CHANGE_FAILED" });
    }
  });

  // Delete user account endpoint
  app.delete("/api/user", authenticateToken, async (req, res) => {
    try {
      const user = (req as any).user;
      await storage.deleteUser(user.id);
      res.json({ ok: true, message: "Account deleted successfully" });
    } catch (error: any) {
      console.error(`Delete user error: ${error.message}`);
      res.status(500).json({ error: "Failed to delete account", code: "DELETE_FAILED" });
    }
  });

  // Download user data endpoint
  app.get("/api/user/data", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const format = req.query.format as 'csv' | 'json' || 'json';

      // Get user soil tests
      let userSoilTests;
      if (typeof (storage as any).getUserSoilTests === 'function') {
        userSoilTests = await (storage as any).getUserSoilTests(userId);
      } else {
        userSoilTests = await db.select().from(soilTests).where(sql`${soilTests.userId} = ${userId}`);
      }

      if (format === 'csv') {
        // Generate CSV
        const csvHeaders = 'Date,PH,Nitrogen,Phosphorus,Potassium,Moisture,Temperature,Electrical Conductivity,Latitude,Longitude,Location\n';
        const csvRows = userSoilTests.map((test: any) =>
          `${test.testDate},${test.ph},${test.nitrogen},${test.phosphorus},${test.potassium},${test.moisture},${test.temperature},${test.ec || ''},${test.latitude || ''},${test.longitude || ''},${test.location || ''}`
        ).join('\n');

        const csvContent = csvHeaders + csvRows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=saathi-ai-data-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=saathi-ai-data-${new Date().toISOString().split('T')[0]}.json`);
        
        let stats = null;
        if (userSoilTests && userSoilTests.length > 0) {
          const sortedTests = [...userSoilTests].sort((a: any, b: any) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime());
          
          stats = {
            totalTests: userSoilTests.length,
            latestTestDate: sortedTests[0].testDate,
            averages: {
              ph: Number((userSoilTests.reduce((acc: number, curr: any) => acc + (Number(curr.ph) || 0), 0) / userSoilTests.length).toFixed(1)),
              nitrogen: Math.round(userSoilTests.reduce((acc: number, curr: any) => acc + (Number(curr.nitrogen) || 0), 0) / userSoilTests.length),
              phosphorus: Math.round(userSoilTests.reduce((acc: number, curr: any) => acc + (Number(curr.phosphorus) || 0), 0) / userSoilTests.length),
              potassium: Math.round(userSoilTests.reduce((acc: number, curr: any) => acc + (Number(curr.potassium) || 0), 0) / userSoilTests.length),
              moisture: Math.round(userSoilTests.reduce((acc: number, curr: any) => acc + (Number(curr.moisture) || 0), 0) / userSoilTests.length)
            }
          };
        }

        res.json({
          userId,
          exportDate: new Date().toISOString(),
          stats,
          soilTests: userSoilTests
        });
      }
    } catch (error: any) {
      console.error(`Download user data error: ${error.message}`);
      res.status(500).json({ error: "Failed to download data", code: "DOWNLOAD_FAILED" });
    }
  });

  // Config endpoint for frontend
  app.get("/api/config", (req, res) => {
    res.json({
      smsProvider: SMS_PROVIDER,
      personalSimPhone: process.env.PERSONAL_SIM_PHONE || "+917205095602",
      uiAnimLeaves: process.env.UI_ANIM_LEAVES !== "false",
      oauth: {
        google: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
        facebook: !!(FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET),
        x: !!(X_CLIENT_ID && X_CLIENT_SECRET), // Twitter OAuth 2.0 enabled
      },
    });
  });

  // Settings endpoints
  app.get("/api/settings", authenticateToken, (req, res) => {
    try {
      res.json({
        aiPricingEnabled: process.env.AI_PRICING_ENABLED === "true",
      });
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", authenticateToken, (req, res) => {
    try {
      const { aiPricingEnabled } = req.body;

      if (typeof aiPricingEnabled !== 'boolean') {
        return res.status(400).json({ error: "aiPricingEnabled must be a boolean" });
      }

      // Update environment variable (this will persist until server restart)
      process.env.AI_PRICING_ENABLED = aiPricingEnabled.toString();

      console.log(`⚙️ AI Pricing: ${aiPricingEnabled ? 'ENABLED' : 'DISABLED'} by user ${(req as any).user.id}`);

      res.json({
        success: true,
        aiPricingEnabled,
        message: `AI pricing ${aiPricingEnabled ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Privacy Settings endpoints
  app.get("/api/privacy-settings", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        profileVisibility: user.profileVisibility ?? true,
        dataSharing: user.dataSharing ?? false,
        analyticsEnabled: user.analyticsEnabled ?? true,
        emailNotifications: user.emailNotifications ?? true,
        marketingEmails: user.marketingEmails ?? false,
      });
    } catch (error) {
      console.error('Privacy settings fetch error:', error);
      res.status(500).json({ error: "Failed to fetch privacy settings" });
    }
  });

  app.put("/api/privacy-settings", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { profileVisibility, dataSharing, analyticsEnabled, emailNotifications, marketingEmails } = req.body;

      // Validate input
      const updates: any = {};
      if (profileVisibility !== undefined) {
        if (typeof profileVisibility !== 'boolean') {
          return res.status(400).json({ error: "profileVisibility must be a boolean" });
        }
        updates.profileVisibility = profileVisibility;
      }
      if (dataSharing !== undefined) {
        if (typeof dataSharing !== 'boolean') {
          return res.status(400).json({ error: "dataSharing must be a boolean" });
        }
        updates.dataSharing = dataSharing;
      }
      if (analyticsEnabled !== undefined) {
        if (typeof analyticsEnabled !== 'boolean') {
          return res.status(400).json({ error: "analyticsEnabled must be a boolean" });
        }
        updates.analyticsEnabled = analyticsEnabled;
      }
      if (emailNotifications !== undefined) {
        if (typeof emailNotifications !== 'boolean') {
          return res.status(400).json({ error: "emailNotifications must be a boolean" });
        }
        updates.emailNotifications = emailNotifications;
      }
      if (marketingEmails !== undefined) {
        if (typeof marketingEmails !== 'boolean') {
          return res.status(400).json({ error: "marketingEmails must be a boolean" });
        }
        updates.marketingEmails = marketingEmails;
      }

      const updatedUser = await storage.updateUserPrivacySettings(userId, updates);

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`🔒 Privacy settings updated for user ${userId}`);

      res.json({
        success: true,
        message: "Privacy settings updated successfully",
        settings: {
          profileVisibility: updatedUser.profileVisibility,
          dataSharing: updatedUser.dataSharing,
          analyticsEnabled: updatedUser.analyticsEnabled,
          emailNotifications: updatedUser.emailNotifications,
          marketingEmails: updatedUser.marketingEmails,
        }
      });
    } catch (error) {
      console.error('Privacy settings update error:', error);
      res.status(500).json({ error: "Failed to update privacy settings" });
    }
  });

  app.post("/api/start-ble-scan", async (req, res) => {
    try {
      console.log('🚀 BLE scan initiated via API');

      res.json({
        success: true,
        message: "BLE scan initiated via WebSocket",
        note: "Real-time updates will be sent via WebSocket connection"
      });

    } catch (error) {
      console.error('BLE scan API error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to initiate BLE scan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/soil-tests", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const validatedData = insertSoilTestSchema.parse({
        ...req.body,
        userId: userId // Ensure userId is set from authenticated user
      });

      // Check if AI pricing is enabled before calculating
      const aiPricingEnabled = process.env.AI_PRICING_ENABLED === "true";

      let pricing = null;
      let soilTestDataWithPricing;

      if (aiPricingEnabled) {
        // Calculate pricing for the soil test
        const pricingRequest = {
          ph: validatedData.ph,
          nitrogen: validatedData.nitrogen,
          phosphorus: validatedData.phosphorus,
          potassium: validatedData.potassium,
          moisture: validatedData.moisture,
          temperature: validatedData.temperature,
          ec: validatedData.ec || undefined,
          latitude: validatedData.latitude || undefined,
          longitude: validatedData.longitude || undefined,
          location: validatedData.location || undefined,
          timestamp: new Date(),
        };

        console.log(`💰 Calculating pricing for soil test...`);
        console.log(`📊 Soil Data: pH=${pricingRequest.ph}, N=${pricingRequest.nitrogen}, P=${pricingRequest.phosphorus}, K=${pricingRequest.potassium}`);
        pricing = await calculateSoilTestPricing(pricingRequest);

        if (pricing) {
          console.log(`💰 Final Price: ₹${pricing.recommended_price_inr} (${pricing.price_cap_reason})`);

          // Add pricing data to the soil test
          soilTestDataWithPricing = {
            ...validatedData,
            recommendedPriceInr: pricing.recommended_price_inr,
            priceCapReason: pricing.price_cap_reason,
            priceDisplayText: pricing.price_display_text,
            priceLocked: pricing.price_locked,
            testType: pricing.test_type,
            pricingCalculationFactors: pricing.calculation_factors,
          };
        } else {
          // Pricing calculation failed, use basic data
          console.log(`💰 Pricing calculation failed, using basic data`);
          soilTestDataWithPricing = validatedData;
        }
      } else {
        console.log(`💰 AI Pricing: DISABLED - Skipping pricing calculation`);
        // Use basic soil test data without pricing
        soilTestDataWithPricing = validatedData;
      }

      let soilTest;
      if (typeof (storage as any).createSoilTest === 'function') {
        soilTest = await (storage as any).createSoilTest(soilTestDataWithPricing);
      } else {
        // Try to insert with pricing columns, fallback to basic columns if they don't exist
        try {
          const [result] = await db.insert(soilTests).values(soilTestDataWithPricing).returning();
          soilTest = result;
        } catch (dbError: any) {
          // If pricing columns don't exist, insert without them
          if (dbError.message && dbError.message.includes('does not exist')) {
            console.log('⚠️ Pricing columns not yet migrated, inserting basic soil test data');
            const basicSoilTestData = {
              userId: validatedData.userId,
              deviceId: validatedData.deviceId,
              ph: validatedData.ph,
              nitrogen: validatedData.nitrogen,
              phosphorus: validatedData.phosphorus,
              potassium: validatedData.potassium,
              moisture: validatedData.moisture,
              temperature: validatedData.temperature,
              ec: validatedData.ec,
              latitude: validatedData.latitude,
              longitude: validatedData.longitude,
              location: validatedData.location,
              rawData: validatedData.rawData,
            };
            const [result] = await db.insert(soilTests).values(basicSoilTestData).returning();
            soilTest = result;
            console.log('✅ Basic soil test inserted, pricing will be calculated later');
          } else {
            throw dbError;
          }
        }
      }

      try {
        // Use the unified AI pipeline that guarantees persistence
        const aiRecommendation = await generateAndPersistAIRecommendation(
          soilTest.id,
          {
            ph: validatedData.ph,
            nitrogen: validatedData.nitrogen,
            phosphorus: validatedData.phosphorus,
            potassium: validatedData.potassium,
            moisture: validatedData.moisture,
            temperature: validatedData.temperature,
            language: 'en'
          },
          'en'
        );

        // Return soil test with pricing information
        res.json({
          soilTest: {
            ...soilTest,
            pricing: pricing || null
          },
          recommendations: aiRecommendation
        });
      } catch (aiError) {
        console.error('AI recommendation error:', aiError);
        res.json({
          soilTest: {
            ...soilTest,
            pricing: pricing
          },
          recommendations: null
        });
      }
    } catch (error) {
      console.error('Soil test creation error:', error);
      res.status(400).json({ error: "Invalid soil test data" });
    }
  });

  app.get("/api/soil-tests/:userId", authenticateToken, async (req, res) => {
    try {
      const authenticatedUserId = (req as any).user.id;
      const requestedUserId = req.params.userId;

      // Ensure users can only access their own data
      if (authenticatedUserId !== requestedUserId) {
        return res.status(403).json({ error: "Access denied", code: "ACCESS_DENIED" });
      }

      // Add cache headers for better performance
      res.setHeader('Cache-Control', 'private, max-age=60'); // Cache for 1 minute

      let userSoilTests;
      if (typeof (storage as any).getUserSoilTests === 'function') {
        userSoilTests = await (storage as any).getUserSoilTests(requestedUserId);
      } else {
        // Use raw SQL to handle missing columns gracefully
        try {
          userSoilTests = await db.select().from(soilTests).where(sql`${soilTests.userId} = ${requestedUserId}`);
        } catch (dbError: any) {
          // If column doesn't exist, try with a more basic query
          if (dbError.message && dbError.message.includes('does not exist')) {
            console.log('⚠️ Pricing columns not yet migrated, using basic query');
            // Fallback to basic columns that should exist
            userSoilTests = await db.execute(sql`
              SELECT id, user_id, device_id, ph, nitrogen, phosphorus, potassium,
                     moisture, temperature, ec, latitude, longitude, location,
                     raw_data, test_date
              FROM soil_tests
              WHERE user_id = ${requestedUserId}
              ORDER BY test_date DESC
            `);
          } else {
            throw dbError;
          }
        }
      }

      // Optimize recommendation fetching with parallel processing
      const testsWithRecommendations = await Promise.all(
        userSoilTests.map(async (test: any) => {
          let recommendation;
          if (typeof (storage as any).getRecommendationBySoilTestId === 'function') {
            recommendation = await (storage as any).getRecommendationBySoilTestId(test.id);
          } else {
            const [result] = await db.select().from(aiRecommendations).where(sql`${aiRecommendations.soilTestId} = ${test.id}`);
            recommendation = result || null;
          }
          return { ...test, recommendation };
        })
      );

      console.log(`✅ Retrieved ${testsWithRecommendations.length} soil tests for user ${requestedUserId}`);
      res.json(testsWithRecommendations);
    } catch (error) {
      console.error('Error getting soil tests (database connection issue?):', error);
      res.json([]);
    }
  });

  app.get("/api/soil-tests/test/:id", async (req, res) => {
    try {
      let soilTest;
      if (typeof (storage as any).getSoilTest === 'function') {
        soilTest = await (storage as any).getSoilTest(req.params.id);
      } else {
        const [result] = await db.select().from(soilTests).where(sql`${soilTests.id} = ${req.params.id}`);
        soilTest = result || null;
      }

      if (!soilTest) {
        return res.status(404).json({ error: "Soil test not found" });
      }

      let recommendation;
      if (typeof (storage as any).getRecommendationBySoilTestId === 'function') {
        recommendation = await (storage as any).getRecommendationBySoilTestId(soilTest.id);
      } else {
        const [result] = await db.select().from(aiRecommendations).where(sql`${aiRecommendations.soilTestId} = ${soilTest.id}`);
        recommendation = result || null;
      }

      res.json({ ...soilTest, recommendation });
    } catch (error) {
      console.error('Error getting single soil test (database connection issue?):', error);
      res.status(500).json({ error: "Failed to fetch soil test" });
    }
  });

  app.post("/api/recommendations/generate", async (req, res) => {
    try {
      const { soilTestId, language = 'en' } = req.body;

      let soilTest;
      if (typeof (storage as any).getSoilTest === 'function') {
        soilTest = await (storage as any).getSoilTest(soilTestId);
      } else {
        const [result] = await db.select().from(soilTests).where(sql`${soilTests.id} = ${soilTestId}`);
        soilTest = result || null;
      }

      if (!soilTest) {
        return res.status(404).json({ error: "Soil test not found" });
      }

      // Use the unified AI pipeline that guarantees persistence
      const aiRecommendation = await generateAndPersistAIRecommendation(
        soilTest.id,
        {
          ph: soilTest.ph,
          nitrogen: soilTest.nitrogen,
          phosphorus: soilTest.phosphorus,
          potassium: soilTest.potassium,
          moisture: soilTest.moisture,
          temperature: soilTest.temperature,
          language: language as 'en' | 'hi' | 'od'
        },
        language as 'en' | 'hi' | 'od'
      );

      res.json(aiRecommendation);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // DEPRECATED: This endpoint previously generated AI analysis without saving to database
  // All AI analysis must now be associated with soil tests and saved to ai_recommendations
  app.post("/api/soil-analysis", async (req, res) => {
    res.status(410).json({
      error: "This endpoint has been deprecated. All AI analysis must be associated with a soil test.",
      code: "ENDPOINT_DEPRECATED",
      message: "Use /api/soil-tests, /api/recommendations/generate, or file upload endpoints instead."
    });
  });

  // Chat History Endpoints

  // Get all chat sessions for the user
  app.get("/api/chat/sessions", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const sessions = await db.select().from(chatSessions)
        .where(sql`${chatSessions.userId} = ${userId}`)
        .orderBy(sql`${chatSessions.updatedAt} DESC`);

      // Get message count for each session
      const sessionsWithCounts = await Promise.all(sessions.map(async (session) => {
        const countResult = await db.select({ count: sql<number>`count(*)` })
          .from(chatMessages)
          .where(sql`${chatMessages.sessionId} = ${session.id}`);

        const lastMessageResult = await db.select()
          .from(chatMessages)
          .where(sql`${chatMessages.sessionId} = ${session.id}`)
          .orderBy(sql`${chatMessages.timestamp} DESC`)
          .limit(1);

        return {
          ...session,
          messageCount: Number(countResult[0]?.count || 0),
          lastMessageAt: lastMessageResult[0]?.timestamp || session.createdAt
        };
      }));

      res.json(sessionsWithCounts);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  // Create a new chat session
  app.post("/api/chat/sessions", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { title, language } = req.body;

      const newSession = await db.insert(chatSessions).values({
        userId,
        title: title || 'New Chat',
        language: language || 'en',
      }).returning();

      res.json(newSession[0]);
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get messages for a specific session
  app.get("/api/chat/sessions/:id/messages", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.id;

      // Verify session belongs to user
      const session = await db.select().from(chatSessions)
        .where(sql`${chatSessions.id} = ${sessionId} AND ${chatSessions.userId} = ${userId}`);

      if (session.length === 0) {
        return res.status(404).json({ error: "Session not found or access denied" });
      }

      const messages = await db.select({
        id: chatMessages.id,
        text: chatMessages.content,
        sender: chatMessages.role,
        timestamp: chatMessages.timestamp,
        sessionId: chatMessages.sessionId
      })
        .from(chatMessages)
        .where(sql`${chatMessages.sessionId} = ${sessionId}`)
        .orderBy(sql`${chatMessages.timestamp} ASC`);

      res.json(messages);
    } catch (error) {
      console.error('Error fetching session messages:', error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Delete a chat session
  app.delete("/api/chat/sessions/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const sessionId = req.params.id;

      // Verify session belongs to user
      const session = await db.select().from(chatSessions)
        .where(sql`${chatSessions.id} = ${sessionId} AND ${chatSessions.userId} = ${userId}`);

      if (session.length === 0) {
        return res.status(404).json({ error: "Session not found or access denied" });
      }

      // Delete messages first (foreign key constraint)
      await db.delete(chatMessages).where(sql`${chatMessages.sessionId} = ${sessionId}`);

      // Delete session
      await db.delete(chatSessions).where(sql`${chatSessions.id} = ${sessionId}`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting chat session:', error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const startTime = Date.now();
    console.log(`🚀 Chat request started: ${new Date().toISOString()}`);
    try {
      const chatRequestSchema = z.object({
        message: z.string(),
        language: z.string().optional().default('en'),
        userId: z.string().optional(),
        sessionId: z.string().optional()
      });

      const validatedData = chatRequestSchema.parse(req.body);
      const { message, language, sessionId } = validatedData;
      let { userId } = validatedData;

      // Check for authentication token and override userId if authenticated
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          // Use the authenticated user's ID from token
          userId = decoded.userId;
          console.log(`🔐 Chat authenticated for user: ${userId}`);
        } catch (err) {
          console.log(`⚠️ Chat auth token invalid, using provided userId: ${userId}`);
        }
      }

      let currentSessionId = sessionId;

      // Handle session creation/validation if userId is present (authenticated user)
      if (userId && userId !== 'demo-user-id') {
        if (!currentSessionId) {
          // Create new session if properly authenticated
          try {
            // Check if we can verify user existence first? 
            // For now assume userId passed from frontend is valid if we are trusting it here.
            // Ideally this endpoint should be authenticated for persistence, but it seems mixed usage.
            // We'll rely on the frontend passing the correct userId.

            const [newSession] = await db.insert(chatSessions).values({
              userId,
              title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
              language: language
            }).returning();
            currentSessionId = newSession.id;
          } catch (e) {
            console.error("Failed to create auto-session", e);
          }
        }
      }

      let soilContext = null;
      if (userId && userId !== 'demo-user-id') {
        try {
          let userTests;
          if (typeof (storage as any).getUserSoilTests === 'function') {
            userTests = await (storage as any).getUserSoilTests(userId);
          } else {
            userTests = await db.select().from(soilTests).where(sql`${soilTests.userId} = ${userId}`);
          }
          if (userTests.length > 0) {
            soilContext = userTests[userTests.length - 1];
          }
        } catch (error) {
          console.log('⚠️ Could not load soil context (DB issue?), continuing without it:', (error as Error)?.message);
        }
      }

      const aiStart = Date.now();
      let response;
      try {
        response = await Promise.race([
          generateChatResponse(message, language as 'en' | 'hi' | 'od', soilContext),
          timeout(20000)
        ]);
        const aiTime = Date.now() - aiStart;
        console.log(`🤖 AI generation time: ${aiTime}ms`);
      } catch (error) {
        if (error instanceof Error && error.message.includes('timeout')) {
          const aiTime = Date.now() - aiStart;
          console.log(`⏰ AI response timed out after ${aiTime}ms, using fallback`);
          const fallbackResponses = {
            en: "I'm taking a bit longer to generate a comprehensive answer. Please wait a moment longer or try rephrasing your question.",
            hi: "मैं एक व्यापक उत्तर उत्पन्न करने में थोड़ा अधिक समय ले रहा हूं। कृपया थोड़ी देर और प्रतीक्षा करें या अपना प्रश्न फिर से बताएं।",
            od: "ମୁଁ ଏକ ସମ୍ପୂର୍ଣ୍ଣ ଉତ୍ତର ପ୍ରସ୍ତତ କରିବାରେ ଟିକେ ଅଧିକ ସମୟ ନେଉଛି। ଦୟାକରି ଆଉ କିଛି ସମୟ ଅପେକ୍ଷା କରନ୍ତୁ କିମ୍ବା ଆପଣଙ୍କର ପ୍ରଶ୍ନଟି ପୁନର୍ବାର କୁହନ୍ତୁ।"
          };
          response = fallbackResponses[language as keyof typeof fallbackResponses] || fallbackResponses.en;
        } else {
          throw error;
        }
      }

      // Save chat messages if we have a session ID
      if (currentSessionId) {
        try {
          // Save User Message
          await db.insert(chatMessages).values({
            sessionId: currentSessionId,
            role: 'user',
            content: message,
            timestamp: new Date(startTime)
          });

          // Save AI Response
          await db.insert(chatMessages).values({
            sessionId: currentSessionId,
            role: 'ai',
            content: response,
            timestamp: new Date()
          });

          // Update session timestamp
          await db.update(chatSessions)
            .set({ updatedAt: new Date() })
            .where(sql`${chatSessions.id} = ${currentSessionId}`);

          console.log(`✅ Chat messages saved to session ${currentSessionId}`);
        } catch (dbError) {
          console.error('⚠️ Database save failed:', dbError);
        }
      }

      // Deprecated: legacy chat message storage (optional to keep for backward capability if needed, but removing to switch to new system)
      /* 
      try {
        if (typeof (storage as any).createChatMessage === 'function') {
          await (storage as any).createChatMessage({
            userId: userId || 'demo-user-id',
            message,
            response,
            language
          });
        }
      } catch (dbError) {
        console.log('⚠️ Legacy DB save failed:', dbError);
      }
      */

      const totalTime = Date.now() - startTime;
      console.log(`✅ Total response time: ${totalTime}ms`);

      res.json({
        response,
        sessionId: currentSessionId
      });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.log(`❌ Failed after: ${totalTime}ms`);
      console.error('Chat error:', error);
      if (error instanceof Error && error.message.includes('429')) {
        res.status(503).json({ error: "AI service temporarily unavailable. Please check your Gemini API quota and billing." });
      } else if (error instanceof Error && error.message.includes('Gemini API key not configured')) {
        res.status(503).json({ error: "AI service not configured. Please set up your Gemini API key." });
      } else {
        res.status(500).json({ error: "Failed to generate chat response" });
      }
    }
  });

  app.get("/api/chat/:userId", async (req, res) => {
    try {
      let messages;
      if (typeof (storage as any).getUserChatMessages === 'function') {
        messages = await (storage as any).getUserChatMessages(req.params.userId);
      } else {
        messages = [];
      }
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/analyze-soil-file", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      console.log(`🔍 [ANALYZE-SOIL-FILE] Request received from user: ${userId}`);

      const soilFileSchema = z.object({
        soilData: z.object({
          id: z.number().optional(),
          timestamp: z.string().optional(),
          location: z.object({
            latitude: z.number(),
            longitude: z.number(),
            satellites: z.number().optional(),
            hdop: z.number().optional(),
            valid: z.boolean().optional()
          }).optional(),
          ph_category: z.string(),
          ph_value: z.number().optional(),
          conductivity: z.number().optional(),
          parameters: z.object({
            ph_value: z.number().optional(),
            conductivity: z.number().optional(),
            nitrogen: z.number({ required_error: "parameters.nitrogen is required" }),
            phosphorus: z.number({ required_error: "parameters.phosphorus is required" }),
            potassium: z.number({ required_error: "parameters.phosphorus is required" }),
            moisture: z.number({ required_error: "parameters.moisture is required" }),
            temperature: z.number({ required_error: "parameters.temperature is required" })
          }),
          sensor_valid: z.boolean().optional()
        }).refine(
          (data) => data.ph_value !== undefined || data.parameters?.ph_value !== undefined,
          { message: "JSON must contain 'ph_value' at the root or within 'parameters'." }
        ).refine(
          (data) => data.conductivity !== undefined || data.parameters?.conductivity !== undefined,
          { message: "JSON must contain 'conductivity' at the root or within 'parameters'." }
        ),
        language: z.enum(['en', 'hi', 'od', 'mr', 'bn', 'te', 'ta', 'ur', 'gu', 'ml']).default('en'),
        fileName: z.string().optional()
      });

      const { soilData, language, fileName } = soilFileSchema.parse(req.body);

      const ph = soilData.ph_value ?? soilData.parameters?.ph_value;
      const conductivity = soilData.conductivity ?? soilData.parameters?.conductivity;

      if (ph === undefined || ph === null) {
        throw new Error("A valid ph_value is required.");
      }
      if (conductivity === undefined || conductivity === null) {
        throw new Error("A valid conductivity value is required.");
      }

      const normalizedSoilData = {
        ...soilData,
        ph_value: ph,
        conductivity: conductivity,
        parameters: {
          ...soilData.parameters,
          ph_value: ph,
          conductivity: conductivity
        }
      };

      let locationData = null;
      let mappedRecords = 0;
      if (normalizedSoilData.location && normalizedSoilData.location.latitude && normalizedSoilData.location.longitude) {
        locationData = {
          latitude: normalizedSoilData.location.latitude,
          longitude: normalizedSoilData.location.longitude,
          ph: normalizedSoilData.ph_value,
          timestamp: normalizedSoilData.timestamp || new Date().toISOString(),
          ph_category: normalizedSoilData.ph_category,
          conductivity: normalizedSoilData.conductivity
        };
        mappedRecords = 1;
      }

      // Get analysis result immediately for fast response
      const analysisResult = await analyzeSoilFromFile(normalizedSoilData, language);

      // Create a chat session and save messages for persistence
      let chatSessionId: string | null = null;
      console.log(`🔍 [ANALYZE-SOIL-FILE] Analysis complete, creating chat session for user: ${userId}, fileName: ${fileName || 'N/A'}`);
      try {
        const sessionTitle = fileName
          ? `📄 Soil Analysis - ${fileName}`
          : `📄 Soil Analysis - ${new Date().toLocaleString()}`;

        const [newSession] = await db.insert(chatSessions).values({
          userId,
          title: sessionTitle.substring(0, 100),
          language: language,
        }).returning();
        chatSessionId = newSession.id;

        // Save user message (the file name)
        const userMessageText = `📄 ${fileName || 'Soil Data File'}`;
        await db.insert(chatMessages).values({
          sessionId: chatSessionId,
          role: 'user',
          content: userMessageText,
          timestamp: new Date()
        });

        // Save AI response
        await db.insert(chatMessages).values({
          sessionId: chatSessionId,
          role: 'ai',
          content: analysisResult,
          timestamp: new Date()
        });

        // Update session timestamp
        await db.update(chatSessions)
          .set({ updatedAt: new Date() })
          .where(sql`${chatSessions.id} = ${chatSessionId}`);

        console.log(`✅ Chat session ${chatSessionId} created for soil analysis`);
      } catch (sessionError) {
        console.error('⚠️ Failed to create chat session for soil analysis:', sessionError);
      }

      // Handle database storage asynchronously in background
      // This ensures user gets immediate response while data saves in background
      let pricing: any = null;
      setImmediate(async () => {
        try {

          // Calculate pricing for the uploaded soil test (background)
          const aiPricingEnabled = process.env.AI_PRICING_ENABLED === "true";
          if (aiPricingEnabled) {
            const pricingRequest = {
              ph: normalizedSoilData.ph_value,
              nitrogen: normalizedSoilData.parameters.nitrogen,
              phosphorus: normalizedSoilData.parameters.phosphorus,
              potassium: normalizedSoilData.parameters.potassium,
              moisture: normalizedSoilData.parameters.moisture,
              temperature: normalizedSoilData.parameters.temperature,
              ec: normalizedSoilData.conductivity || undefined,
              latitude: normalizedSoilData.location?.latitude || undefined,
              longitude: normalizedSoilData.location?.longitude || undefined,
              location: undefined,
              timestamp: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
            };

            console.log('💰 [BACKGROUND] Calculating pricing for uploaded soil test...');
            pricing = await calculateSoilTestPricing(pricingRequest);
            console.log(`💰 [BACKGROUND] Pricing calculated: ₹${pricing?.recommended_price_inr || 'N/A'}`);
          }

          const soilTestData = {
            userId: userId,
            deviceId: 'file-upload',
            ph: normalizedSoilData.ph_value,
            nitrogen: normalizedSoilData.parameters.nitrogen,
            phosphorus: normalizedSoilData.parameters.phosphorus,
            potassium: normalizedSoilData.parameters.potassium,
            moisture: normalizedSoilData.parameters.moisture,
            temperature: normalizedSoilData.parameters.temperature,
            latitude: normalizedSoilData.location?.latitude || null,
            longitude: normalizedSoilData.location?.longitude || null,
            testDate: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
            ec: normalizedSoilData.conductivity,
            // Add pricing data conditionally
            ...(pricing && {
              recommendedPriceInr: pricing.recommended_price_inr,
              priceCapReason: pricing.price_cap_reason,
              priceDisplayText: pricing.price_display_text,
              priceLocked: pricing.price_locked,
              testType: pricing.test_type,
              pricingCalculationFactors: pricing.calculation_factors,
            }),
          };

          const validatedDbData = insertSoilTestSchema.parse(soilTestData);

          let soilTest = null;
          if (typeof (storage as any).createSoilTest === 'function') {
            soilTest = await (storage as any).createSoilTest(validatedDbData);
          } else {
            try {
              const [result] = await db.insert(soilTests).values(validatedDbData).returning();
              soilTest = result;
              console.log('✅ [BACKGROUND] Soil test saved from file upload');
            } catch (dbError: any) {
              if (dbError.message && dbError.message.includes('does not exist')) {
                console.log('⚠️ [BACKGROUND] Pricing columns not migrated, saving basic data');
                const basicSoilTestData = {
                  userId: userId,
                  deviceId: 'file-upload',
                  ph: normalizedSoilData.ph_value,
                  nitrogen: normalizedSoilData.parameters.nitrogen,
                  phosphorus: normalizedSoilData.parameters.phosphorus,
                  potassium: normalizedSoilData.parameters.potassium,
                  moisture: normalizedSoilData.parameters.moisture,
                  temperature: normalizedSoilData.parameters.temperature,
                  latitude: normalizedSoilData.location?.latitude || null,
                  longitude: normalizedSoilData.location?.longitude || null,
                  testDate: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
                  ec: normalizedSoilData.conductivity,
                };
                const [result] = await db.insert(soilTests).values(basicSoilTestData).returning();
                soilTest = result;
                console.log('✅ [BACKGROUND] Basic soil test saved from file upload');
              } else {
                throw dbError;
              }
            }
          }

          if (soilTest) {
            try {
              // Create AI recommendation directly with the analysis result we already have
              const aiRecommendationData = {
                soilTestId: soilTest.id,
                language: language,
                naturalFertilizers: null,
                chemicalFertilizers: null,
                applicationInstructions: null,
                recommendations: analysisResult,
              };

              if (typeof (storage as any).createAiRecommendation === 'function') {
                await (storage as any).createAiRecommendation(aiRecommendationData);
              } else {
                await db.insert(aiRecommendations).values(aiRecommendationData);
              }

              console.log(`✅ [BACKGROUND] AI recommendation saved for soil_test ${soilTest.id} (using pre-generated analysis)`);
            } catch (aiError) {
              console.error('❌ [BACKGROUND] AI recommendation save failed:', aiError);
            }
          }
        } catch (error) {
          console.error('❌ [BACKGROUND] Database storage failed:', error);
        }
      });

      const response = {
        response: analysisResult,
        locationData,
        sessionId: chatSessionId,
        pricing: pricing || null, // Include pricing data in response
        soilSummary: {
          ph: normalizedSoilData.ph_value,
          nitrogen: normalizedSoilData.parameters.nitrogen,
          phosphorus: normalizedSoilData.parameters.phosphorus,
          potassium: normalizedSoilData.parameters.potassium
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Soil file analysis error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid soil data format. Please ensure the JSON file contains all required fields.",
          details: error.errors.map(e => e.message).join(', ')
        });
      }
      if (error instanceof Error && error.message.includes('429')) {
        res.status(503).json({ error: "AI service temporarily unavailable. Please check your Gemini API quota and billing." });
      } else if (error instanceof Error && error.message.includes('Gemini API key not configured')) {
        res.status(503).json({ error: "AI service not configured. Please set up your Gemini API key." });
      } else {
        if (error instanceof Error && (error.message.includes('503') || error.message.includes('UNAVAILABLE'))) {
          res.status(503).json({ error: "The AI model is temporarily overloaded. Please try again in a moment." });
        } else {
          res.status(500).json({ error: "Failed to analyze soil data" });
        }
      }
    }
  });


  app.post("/api/upload-soil-json", authenticateToken, upload.single('soilFile'), async (req, res) => {
    try {
      const userId = (req as any).user.id;

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded",
          code: "NO_FILE"
        });
      }

      const fileContent = req.file.buffer.toString('utf8');

      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        return res.status(400).json({
          error: "Invalid JSON file format",
          details: "The file is not valid JSON",
          code: "INVALID_JSON"
        });
      }

      const soilDataArray = Array.isArray(jsonData) ? jsonData : [jsonData];

      const results: Array<{ response: string; pricing?: any; error?: string }> = [];
      const locationData = [];

      // Process each record and generate immediate analysis response
      for (let idx = 0; idx < soilDataArray.length; idx++) {
        const soilData = soilDataArray[idx];
        try {
          const ph = soilData.ph_value ?? soilData.parameters?.ph_value;
          const conductivity = soilData.conductivity ?? soilData.parameters?.conductivity;

          if (ph === undefined || ph === null) {
            results.push({
              response: "Skipped: Missing pH value",
              error: "PH_VALUE_MISSING"
            });
            continue;
          }
          if (conductivity === undefined || conductivity === null) {
            results.push({
              response: "Skipped: Missing conductivity value",
              error: "CONDUCTIVITY_MISSING"
            });
            continue;
          }
          if (!soilData.parameters) {
            results.push({
              response: "Skipped: Missing 'parameters' object with nutrients",
              error: "PARAMETERS_MISSING"
            });
            continue;
          }

          const normalizedSoilData = {
            ...soilData,
            ph_value: ph,
            conductivity: conductivity,
            parameters: {
              ...soilData.parameters,
              ph_value: ph,
              conductivity: conductivity
            }
          };

          if (normalizedSoilData.location && normalizedSoilData.location.latitude && normalizedSoilData.location.longitude) {
            const markerData = {
              latitude: normalizedSoilData.location.latitude,
              longitude: normalizedSoilData.location.longitude,
              altitude: normalizedSoilData.location.altitude,
              accuracy: normalizedSoilData.location.accuracy,
              ph: normalizedSoilData.ph_value,
              ph_category: normalizedSoilData.ph_category || 'unknown',
              conductivity: normalizedSoilData.conductivity,
              timestamp: normalizedSoilData.timestamp || new Date().toISOString(),
              sensor_id: normalizedSoilData.sensor_id,
              parameters: normalizedSoilData.parameters
            };
            locationData.push(markerData);
          }

          // Generate analysis immediately for fast response (SINGLE AI CALL)
          let analysis;
          try {
            analysis = await analyzeSoilFromFile(normalizedSoilData, req.body.language || 'en');
            results.push({
              response: analysis,
              pricing: null // Pricing will be calculated in background
            });
          } catch (analysisError: unknown) {
            const errorMessage = analysisError instanceof Error ? analysisError.message : String(analysisError);
            if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE')) {
              results.push({
                response: `❌ AI analysis failed: The AI model is temporarily overloaded. Please try again.`,
                error: "AI_OVERLOADED"
              });
            } else {
              results.push({
                response: `❌ AI analysis failed: ${errorMessage}`,
                error: errorMessage
              });
            }
          }

        } catch (recordError: unknown) {
          const errorMessage = recordError instanceof Error ? recordError.message : String(recordError);
          results.push({
            response: `❌ Error processing soil data record ${idx + 1}: ${errorMessage}`,
            error: errorMessage
          });
        }
      }

      // Return immediate response to user (FAST RESPONSE - NO BACKGROUND AI GENERATION)
      const response = {
        analyses: results,
        locations: locationData,
        totalRecords: soilDataArray.length,
        mappedRecords: locationData.length,
        success: true
      };

      console.log(`📄 JSON file uploaded successfully - ${soilDataArray.length} record(s) processed`);
      res.json(response);

      // Handle database storage and pricing calculation in background
      // This ensures user gets immediate response while data saves securely in background
      setImmediate(async () => {
        for (let idx = 0; idx < soilDataArray.length; idx++) {
          const soilData = soilDataArray[idx];
          try {
            const ph = soilData.ph_value ?? soilData.parameters?.ph_value;
            const conductivity = soilData.conductivity ?? soilData.parameters?.conductivity;

            // Skip records that already failed validation
            if (ph === undefined || ph === null || conductivity === undefined || conductivity === null || !soilData.parameters) {
              continue;
            }

            const normalizedSoilData = {
              ...soilData,
              ph_value: ph,
              conductivity: conductivity,
              parameters: {
                ...soilData.parameters,
                ph_value: ph,
                conductivity: conductivity
              }
            };

            // Check if AI pricing is enabled (AFTER immediate response)
            const aiPricingEnabled = process.env.AI_PRICING_ENABLED === "true";
            let pricingData = null;

            if (aiPricingEnabled) {
              try {
                // Calculate pricing for the uploaded soil test (background)
                const pricingRequest = {
                  ph: normalizedSoilData.ph_value,
                  nitrogen: normalizedSoilData.parameters.nitrogen,
                  phosphorus: normalizedSoilData.parameters.phosphorus,
                  potassium: normalizedSoilData.parameters.potassium,
                  moisture: normalizedSoilData.parameters.moisture,
                  temperature: normalizedSoilData.parameters.temperature,
                  ec: normalizedSoilData.conductivity || undefined,
                  latitude: normalizedSoilData.location?.latitude || undefined,
                  longitude: normalizedSoilData.location?.longitude || undefined,
                  location: undefined, // Location data from file
                  timestamp: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
                };

                console.log(`💰 [BACKGROUND] Calculating pricing for bulk upload record ${idx + 1}...`);
                const pricing = await calculateSoilTestPricing(pricingRequest);
                console.log(`💰 [BACKGROUND] Pricing calculated for bulk upload record ${idx + 1}: ₹${pricing?.recommended_price_inr || 'N/A'}`);
                pricingData = pricing;
              } catch (pricingError) {
                console.error(`❌ [BACKGROUND] Pricing calculation failed for record ${idx + 1}:`, pricingError);
                // Continue without pricing if calculation fails
              }
            } else {
              console.log(`💰 [BACKGROUND] AI Pricing: DISABLED - Skipping pricing calculation for bulk upload record ${idx + 1}`);
            }

            // Prepare soil test data with conditional pricing
            const soilTestData = {
              userId: userId,
              deviceId: 'file-upload',
              ph: normalizedSoilData.ph_value,
              nitrogen: normalizedSoilData.parameters.nitrogen,
              phosphorus: normalizedSoilData.parameters.phosphorus,
              potassium: normalizedSoilData.parameters.potassium,
              moisture: normalizedSoilData.parameters.moisture,
              temperature: normalizedSoilData.parameters.temperature,
              latitude: normalizedSoilData.location?.latitude || null,
              longitude: normalizedSoilData.location?.longitude || null,
              testDate: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
              ec: normalizedSoilData.conductivity,
              // Add pricing data ONLY if AI pricing is enabled
              ...(pricingData && aiPricingEnabled && {
                recommendedPriceInr: pricingData.recommended_price_inr,
                priceCapReason: pricingData.price_cap_reason,
                priceDisplayText: pricingData.price_display_text,
                priceLocked: pricingData.price_locked,
                testType: pricingData.test_type,
                pricingCalculationFactors: pricingData.calculation_factors,
              }),
            };

            const validatedDbData = insertSoilTestSchema.parse(soilTestData);

            let savedSoilTest = null;
            if (typeof (storage as any).createSoilTest === 'function') {
              savedSoilTest = await (storage as any).createSoilTest(validatedDbData);
            } else {
              try {
                const [result] = await db.insert(soilTests).values(validatedDbData).returning();
                savedSoilTest = result;
                console.log(`✅ [BACKGROUND] Soil test saved from bulk upload record ${idx + 1} (${aiPricingEnabled ? 'with' : 'without'} pricing)`);
              } catch (dbError: any) {
                // If pricing columns don't exist, insert without them
                if (dbError.message && dbError.message.includes('does not exist')) {
                  console.log(`⚠️ [BACKGROUND] Pricing columns not yet migrated, inserting basic soil test data from bulk upload record ${idx + 1}`);
                  const basicSoilTestData = {
                    userId: userId,
                    deviceId: 'file-upload',
                    ph: normalizedSoilData.ph_value,
                    nitrogen: normalizedSoilData.parameters.nitrogen,
                    phosphorus: normalizedSoilData.parameters.phosphorus,
                    potassium: normalizedSoilData.parameters.potassium,
                    moisture: normalizedSoilData.parameters.moisture,
                    temperature: normalizedSoilData.parameters.temperature,
                    latitude: normalizedSoilData.location?.latitude || null,
                    longitude: normalizedSoilData.location?.longitude || null,
                    testDate: normalizedSoilData.timestamp ? new Date(normalizedSoilData.timestamp.replace(/T(\d):/, 'T0$1:')) : new Date(),
                    ec: normalizedSoilData.conductivity,
                  };
                  const [result] = await db.insert(soilTests).values(basicSoilTestData).returning();
                  savedSoilTest = result;
                  console.log(`✅ [BACKGROUND] Basic soil test inserted from bulk upload record ${idx + 1}, pricing will be calculated later`);
                } else {
                  throw dbError;
                }
              }
            }

            // Save AI recommendations directly using the analysis result we already have (NO SECOND AI CALL)
            if (savedSoilTest) {
              try {
                // Get the analysis result that was already generated for immediate response
                const analysisResult = results[idx]?.response;

                if (analysisResult && !analysisResult.startsWith('❌') && !analysisResult.startsWith('Skipped:')) {
                  // Create AI recommendation directly with the analysis result we already have
                  const aiRecommendationData = {
                    soilTestId: savedSoilTest.id,
                    language: req.body.language || 'en',
                    naturalFertilizers: null,
                    chemicalFertilizers: null,
                    applicationInstructions: null,
                    recommendations: analysisResult,
                  };

                  if (typeof (storage as any).createAiRecommendation === 'function') {
                    await (storage as any).createAiRecommendation(aiRecommendationData);
                  } else {
                    await db.insert(aiRecommendations).values(aiRecommendationData);
                  }

                  console.log(`✅ [BACKGROUND] AI recommendation saved for soil_test ${savedSoilTest.id} (bulk upload record ${idx + 1}) - reused existing analysis`);
                } else {
                  console.log(`⚠️ [BACKGROUND] Skipping AI recommendation save for record ${idx + 1} - analysis failed or was skipped`);
                }
              } catch (aiError) {
                console.error(`❌ [BACKGROUND] AI recommendation save failed for record ${idx + 1}:`, aiError);
              }
            }

            console.log(`📊 [BACKGROUND] Response for record ${idx + 1}: pricing included = ${!!(pricingData && aiPricingEnabled)}, pricing amount = ${pricingData?.recommended_price_inr || 'N/A'}`);

          } catch (recordError: unknown) {
            console.error(`❌ [BACKGROUND] Error processing record ${idx + 1}:`, recordError);
          }
        }
      });

    } catch (error) {
      console.error('JSON file upload error:', error);
      res.status(500).json({
        error: "Failed to process soil data file",
        details: error instanceof Error ? error.message : "Unknown error",
        code: "SERVER_ERROR"
      });
    }
  });

  app.get("/api/maps-config", async (req, res) => {
    try {
      // Add caching headers for maps config (changes infrequently)
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      res.json({
        apiKey: process.env.GOOGLE_API_KEY || ''
      });
    } catch (error) {
      console.error('Error fetching maps config:', error);
      res.json({ apiKey: '' });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const fallbackStats = {
      farmsAnalyzed: 1685,
      soilTests: 1383,
      recommendations: 1485,
      yearsExperience: 5,
      partnersCount: 50
    };

    try {
      const [soilTestCount] = await db.select({ count: sql<number>`count(*)` }).from(soilTests);
      const [recommendationCount] = await db.select({ count: sql<number>`count(*)` }).from(aiRecommendations);
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);

      const stats = {
        ...fallbackStats,
        soilTests: Number(soilTestCount.count) || fallbackStats.soilTests,
        recommendations: Number(recommendationCount.count) || fallbackStats.recommendations,
      };
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.json(fallbackStats);
    }
  });


  app.post("/api/translate", async (req, res) => {
    try {
      const translateSchema = z.object({
        messages: z.array(z.object({
          id: z.string(),
          text: z.string(),
          sender: z.enum(['user', 'ai']),
        })),
        targetLanguage: z.enum(['en', 'hi', 'od', 'mr', 'bn', 'te', 'ta', 'ur', 'gu', 'ml'])
      });

      const { messages, targetLanguage } = translateSchema.parse(req.body);

      const aiMessages = messages.filter(msg => msg.sender === 'ai');
      const userMessages = messages.filter(msg => msg.sender === 'user');

      if (aiMessages.length === 0) {
        return res.json({ translatedMessages: messages });
      }

      try {
        const translatedAiMessages = await Promise.all(
          aiMessages.map(async (msg) => {
            try {
              const translatedText = await translateText(msg.text, targetLanguage);
              return {
                ...msg,
                text: translatedText
              };
            } catch (error) {
              console.error(`Translation failed for message ${msg.id}:`, error);
              return msg;
            }
          })
        );

        const allTranslatedMessages = [...userMessages, ...translatedAiMessages]
          .sort((a, b) => {
            const aIdx = messages.findIndex(m => m.id === a.id);
            const bIdx = messages.findIndex(m => m.id === b.id);
            return aIdx - bIdx;
          });

        res.json({ translatedMessages: allTranslatedMessages });
      } catch (error) {
        console.error('Batch translation error:', error);
        res.json({ translatedMessages: messages });
      }
    } catch (error) {
      console.error('Translation endpoint error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to translate messages" });
    }
  });

  // Serve PDF files from attached_assets directory
  app.get("/attached_assets/*", (req, res) => {
    const fileName = (req.params as any)[0];
    const filePath = path.join(process.cwd(), "attached_assets", fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Send the file directly
    res.sendFile(filePath, (error) => {
      if (error) {
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
      }
    });
  });

  // Martin X Support Widget - Local Knowledge Base
  app.post("/api/martin-x", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required", code: "MISSING_MESSAGE" });
      }

      const lowerMessage = message.toLowerCase();

      let response = "";

      // Knowledge Base Rules
      if (lowerMessage.includes("founder") || lowerMessage.includes("creator") || lowerMessage.includes("who made")) {
        response = "Saathi AI was founded by Nilambar Sonu Behera (Founder & Hardware Lead) and Sanatan Sethi (Co-Founder & Software Lead). They are BCA students at Bhadrak Autonomous College.";
      } else if (lowerMessage.includes("contact") || lowerMessage.includes("email") || lowerMessage.includes("phone")) {
        response = "You can reach us at support@saathiai.org or call +91-7205095602. Visit us at FMU-TBI, Balasore, Odisha.";
      } else if (lowerMessage.includes("project") || lowerMessage.includes("what is") || lowerMessage.includes("saathi")) {
        response = "Saathi AI is an 'Organic Intelligence' platform combining a hardware Soil Scanner (Agni) with this AI Dashboard to help farmers maximize crop yields.";
      } else if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
        response = "Hello! I am Martin X, your virtual assistant. Ask me about the Team, the Project, or our Contact info!";
      } else {
        response = "I can help with questions about the Team, Contact details, or the Project vision. For real-time soil analysis, please go to the 'AI Chat' tab!";
      }

      res.json({ response });
    } catch (error) {
      console.error('Martin X error:', error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Price dispute reporting endpoint
  app.post("/api/price-dispute", authenticateToken, async (req, res) => {
    try {
      const disputeSchema = z.object({
        testId: z.string(),
        chargedAmount: z.number().min(0),
        expectedAmount: z.number().min(0),
        reason: z.string().min(1, "Reason is required")
      });

      const validatedData = disputeSchema.parse(req.body);
      const user = (req as any).user;

      // Verify the soil test belongs to the user
      let soilTest;
      if (typeof (storage as any).getSoilTest === 'function') {
        soilTest = await (storage as any).getSoilTest(validatedData.testId);
      } else {
        const [result] = await db.select().from(soilTests).where(sql`${soilTests.id} = ${validatedData.testId}`);
        soilTest = result || null;
      }

      if (!soilTest) {
        return res.status(404).json({ error: "Soil test not found", code: "TEST_NOT_FOUND" });
      }

      if (soilTest.userId !== user.id) {
        return res.status(403).json({ error: "Access denied", code: "ACCESS_DENIED" });
      }

      // Report the price dispute
      const dispute = await reportPriceDispute({
        testId: validatedData.testId,
        farmerId: user.id,
        chargedAmount: validatedData.chargedAmount,
        expectedAmount: validatedData.expectedAmount,
        reason: validatedData.reason
      });

      res.json({
        success: true,
        dispute: {
          testId: dispute.testId,
          status: dispute.status,
          createdAt: dispute.timestamp
        },
        message: "Price dispute reported successfully. Our team will investigate and get back to you within 24-48 hours."
      });

    } catch (error) {
      console.error('Price dispute error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to report price dispute" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    const startTime = Date.now();
    console.log(`🚀 Contact form submission started: ${new Date().toISOString()}`);

    try {
      const contactSchema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(1, "Message is required")
      });

      const validatedData = contactSchema.parse(req.body);
      const googleSheetsUrl = process.env.GOOGLE_SHEETS_URL;

      // Prepare data for submissions
      const formData = new URLSearchParams();
      formData.append('Full Name', validatedData.name);
      formData.append('Email Address', validatedData.email);
      formData.append('Message', validatedData.message);

      // Run both operations in parallel with timeout for Google Sheets
      const [googleSheetsResult, emailResult] = await Promise.allSettled([
        // Google Sheets submission with timeout
        googleSheetsUrl ? Promise.race([
          fetch(googleSheetsUrl, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Google Sheets timeout')), 5000)
          )
        ]) : Promise.reject(new Error('Google Sheets URL not configured')),

        // Email notification
        sendContactNotificationEmail(validatedData)
      ]);

      // Process Google Sheets result
      let googleSheetsSuccess = false;
      if (googleSheetsResult.status === 'fulfilled') {
        const response = googleSheetsResult.value as any;
        if (response.ok) {
          googleSheetsSuccess = true;
          console.log('✅ Contact form data successfully submitted to Google Sheets');
        } else {
          console.error('❌ Failed to submit to Google Sheets:', response.status, response.statusText);
        }
      } else {
        const error = googleSheetsResult.reason as Error;
        console.error('❌ Google Sheets submission failed:', error.message);
        // Don't fail the whole request if Google Sheets fails
      }

      // Process email result
      let emailSuccess = false;
      if (emailResult.status === 'fulfilled') {
        emailSuccess = emailResult.value;
        if (emailSuccess) {
          console.log('✅ Contact notification email sent successfully');
        } else {
          console.error('❌ Failed to send contact notification email');
        }
      } else {
        const error = emailResult.reason;
        console.error('❌ Email notification failed:', error);
      }

      // Email is the primary success indicator since it's more reliable
      if (!emailSuccess) {
        console.error('❌ Email notification failed - this is critical');
        return res.status(500).json({
          error: "Failed to send contact notification. Please try again or contact us directly.",
          code: "EMAIL_FAILED"
        });
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ Contact form processed in ${totalTime}ms`);

      // Return success - email worked, Google Sheets is optional
      const warnings = [];
      if (!googleSheetsSuccess) {
        warnings.push("Google Sheets submission failed (optional)");
      }

      res.json({
        success: true,
        message: "Message sent successfully",
        ...(warnings.length > 0 && { warnings })
      });

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.log(`❌ Contact form failed after ${totalTime}ms`);
      console.error('Contact form error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}