const crypto = require("crypto");
const { promisify } = require("util");
const express = require("express");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getUsers, getCollection, getClasses } = require("./models/index");
const mailer = require("./mailer");

const scrypt = promisify(crypto.scrypt);
const router = express.Router();

const COOKIE_NAME = "todo_session";
const SESSION_DAYS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isProduction = process.env.NODE_ENV === "production";

// Without JWT_SECRET, sessions only last until the server restarts.
const secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("JWT_SECRET is not set. Using a temporary secret; everyone will be signed out on restart.");
}

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
};

const verifyPassword = async (password, stored) => {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
};

// Used when an email has no account, so a login takes the same time either way.
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

const publicUser = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  school: user.school || "",
  program: user.program || "",
  yearLevel: user.yearLevel || "",
  avatar: user.avatar || null,
  createdAt: user.createdAt,
});

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

// Profile photos are small JPEG/PNG/WebP data URLs, resized in the browser before upload.
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const AVATAR_MAX_LENGTH = 90_000;

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

const startSession = (res, userId) => {
  const token = jwt.sign({ sub: userId.toString() }, secret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const endSession = (res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
};

// Blocks a request unless it carries a valid session, and sets req.userId.
const requireAuth = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ mssg: "Please sign in" });
  try {
    const { sub } = jwt.verify(token, secret);
    if (!ObjectId.isValid(sub)) throw new Error("bad subject");
    req.userId = new ObjectId(sub);
    next();
  } catch {
    endSession(res);
    res.status(401).json({ mssg: "Your session expired. Please sign in again." });
  }
};

// Simple in-memory limits per IP address. Sign-in only counts wrong passwords, so signing
// in and out normally never locks anyone out; sign-up counts every new account.
const LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LIMIT_MAX = 10;

const createLimiter = () => {
  const hits = new Map();
  const recent = (key) => (hits.get(key) || []).filter((time) => Date.now() - time < LIMIT_WINDOW_MS);
  return {
    blocked: (key) => recent(key).length >= LIMIT_MAX,
    record: (key) => {
      if (hits.size > 10000) hits.clear();
      hits.set(key, [...recent(key), Date.now()]);
    },
    clear: (key) => hits.delete(key),
  };
};

const failedLogins = createLimiter();
const signups = createLimiter();

const tooMany = (res) =>
  res.status(429).json({ mssg: "Too many attempts. Please wait 15 minutes and try again." });

const readCredentials = (body) => {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  return { email, password };
};

// POST /auth/register
router.post("/register", async (req, res) => {
  if (signups.blocked(req.ip)) return tooMany(res);
  const { email, password } = readCredentials(req.body ?? {});
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : "";

  if (!name) return res.status(400).json({ mssg: "Please enter your name" });
  if (!EMAIL_RE.test(email) || email.length > 254) return res.status(400).json({ mssg: "Please enter a valid email" });
  if (password.length < 8) return res.status(400).json({ mssg: "Password must be at least 8 characters" });
  if (password.length > 200) return res.status(400).json({ mssg: "Password is too long" });

  const user = { name, email, passwordHash: await hashPassword(password), createdAt: new Date() };
  try {
    const result = await getUsers().insertOne(user);
    user._id = result.insertedId;
    signups.record(req.ip);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mssg: "An account with this email already exists" });
    throw error;
  }

  startSession(res, user._id);
  res.status(201).json(publicUser(user));
});

// POST /auth/login
router.post("/login", async (req, res) => {
  if (failedLogins.blocked(req.ip)) return tooMany(res);
  const { email, password } = readCredentials(req.body ?? {});
  if (!email || !password) return res.status(400).json({ mssg: "Please enter your email and password" });

  const user = await getUsers().findOne({ email });
  const valid = await verifyPassword(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !valid) {
    failedLogins.record(req.ip);
    return res.status(401).json({ mssg: "Incorrect email or password" });
  }

  failedLogins.clear(req.ip);
  startSession(res, user._id);
  res.status(200).json(publicUser(user));
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  endSession(res);
  res.status(204).end();
});

// GET /auth/me  (returns null when nobody is signed in, so a first visit isn't an error)
router.get("/me", async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  let userId = null;
  try {
    const { sub } = jwt.verify(token || "", secret);
    if (ObjectId.isValid(sub)) userId = new ObjectId(sub);
  } catch {
    if (token) endSession(res);
  }

  const user = userId && (await getUsers().findOne({ _id: userId }));
  if (!user) {
    if (userId) endSession(res);
    return res.status(200).json(null);
  }
  res.status(200).json(publicUser(user));
});

// Wrong "current password" attempts on account changes, per user.
const failedPasswordChecks = createLimiter();

// Loads the signed-in user and checks their password. Sends the error response itself and returns null on failure.
const checkPassword = async (req, res, password) => {
  const key = req.userId.toString();
  if (failedPasswordChecks.blocked(key)) {
    tooMany(res);
    return null;
  }
  const user = await getUsers().findOne({ _id: req.userId });
  if (!user) {
    res.status(401).json({ mssg: "Please sign in" });
    return null;
  }
  if (typeof password !== "string" || !(await verifyPassword(password, user.passwordHash))) {
    failedPasswordChecks.record(key);
    res.status(400).json({ mssg: "Your current password is incorrect" });
    return null;
  }
  failedPasswordChecks.clear(key);
  return user;
};

// PUT /auth/me  (update profile: name, school, program, yearLevel, avatar)
router.put("/me", requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const fields = {};

  if (body.name !== undefined) {
    fields.name = text(body.name, 60);
    if (!fields.name) return res.status(400).json({ mssg: "Please enter your name" });
  }
  if (body.avatar !== undefined) {
    if (body.avatar !== null && (typeof body.avatar !== "string" || !AVATAR_RE.test(body.avatar) || body.avatar.length > AVATAR_MAX_LENGTH)) {
      return res.status(400).json({ mssg: "That photo couldn't be used. Try a different image." });
    }
    fields.avatar = body.avatar;
  }
  if (body.school !== undefined) fields.school = text(body.school, 100);
  if (body.program !== undefined) fields.program = text(body.program, 100);
  if (body.yearLevel !== undefined) fields.yearLevel = text(body.yearLevel, 40);
  if (Object.keys(fields).length === 0) return res.status(400).json({ mssg: "nothing to update" });

  const updated = await getUsers().findOneAndUpdate(
    { _id: req.userId },
    { $set: fields },
    { returnDocument: "after" }
  );
  if (!updated) return res.status(401).json({ mssg: "Please sign in" });
  res.status(200).json(publicUser(updated));
});

// PUT /auth/email  { email, password }
router.put("/email", requireAuth, async (req, res) => {
  const email = text(req.body?.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ mssg: "Please enter a valid email" });

  const user = await checkPassword(req, res, req.body?.password);
  if (!user) return;
  if (email === user.email) return res.status(400).json({ mssg: "That's already your email" });

  try {
    const updated = await getUsers().findOneAndUpdate(
      { _id: user._id },
      { $set: { email } },
      { returnDocument: "after" }
    );
    res.status(200).json(publicUser(updated));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ mssg: "Another account already uses this email" });
    throw error;
  }
});

// PUT /auth/password  { currentPassword, newPassword }
router.put("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ mssg: "Your new password needs at least 8 characters" });
  }
  if (newPassword.length > 200) return res.status(400).json({ mssg: "Password is too long" });

  const user = await checkPassword(req, res, currentPassword);
  if (!user) return;

  await getUsers().updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(newPassword) } });
  res.status(200).json({ ok: true });
});

// DELETE /auth/me  { password }  (deletes the account and all of its tasks and classes)
router.delete("/me", requireAuth, async (req, res) => {
  const user = await checkPassword(req, res, req.body?.password);
  if (!user) return;

  await Promise.all([
    getCollection().deleteMany({ userId: user._id }),
    getClasses().deleteMany({ userId: user._id }),
  ]);
  await getUsers().deleteOne({ _id: user._id });
  endSession(res);
  res.status(200).json({ deleted: true });
});

// Forgot password: email a one-time link that expires in 30 minutes.
const RESET_MINUTES = 30;
const resetRequests = createLimiter();

// POST /auth/forgot  { email }
router.post("/forgot", async (req, res) => {
  if (resetRequests.blocked(req.ip)) return tooMany(res);
  resetRequests.record(req.ip);

  const email = text(req.body?.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ mssg: "Please enter a valid email" });

  const canEmail = mailer.isConfigured();
  if (!canEmail && isProduction) {
    return res.status(503).json({ mssg: "Password reset by email isn't available yet. Please contact your admin." });
  }

  // Same answer whether or not the account exists, so this can't be used to find accounts.
  const reply = {
    ok: true,
    mssg: "If an account uses that email, we sent a link to reset the password. Check your inbox and spam folder.",
  };

  const user = await getUsers().findOne({ email });
  if (!user) return res.status(200).json(reply);

  const token = crypto.randomBytes(32).toString("hex");
  await getUsers().updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_MINUTES * 60 * 1000) } }
  );
  const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
  const url = `${appUrl.replace(/\/$/, "")}/?reset=${token}`;

  if (!canEmail) {
    // Local development without an email service: hand the link back so the flow still works.
    return res.status(200).json({
      ok: true,
      mssg: "Email sending isn't set up on this server yet, so here is your reset link.",
      devResetUrl: url,
    });
  }

  try {
    await mailer.sendPasswordReset({ to: user.email, name: user.name, url });
  } catch (error) {
    console.error("Couldn't send the password reset email:", error.message);
    return res.status(502).json({ mssg: "We couldn't send the email right now. Please try again later." });
  }
  res.status(200).json(reply);
});

// POST /auth/reset  { token, password }  (sets the new password and signs in)
router.post("/reset", async (req, res) => {
  if (failedLogins.blocked(req.ip)) return tooMany(res);

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = req.body?.password;
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ mssg: "Your new password needs at least 8 characters" });
  }
  if (password.length > 200) return res.status(400).json({ mssg: "Password is too long" });

  const user = /^[a-f0-9]{64}$/.test(token)
    ? await getUsers().findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } })
    : null;
  if (!user) {
    failedLogins.record(req.ip);
    return res.status(400).json({ mssg: "This reset link is invalid or has expired. Please ask for a new one." });
  }

  await getUsers().updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(password) }, $unset: { resetTokenHash: "", resetTokenExpires: "" } }
  );
  failedLogins.clear(req.ip);
  startSession(res, user._id);
  res.status(200).json(publicUser(user));
});

module.exports = { authRouter: router, requireAuth };
