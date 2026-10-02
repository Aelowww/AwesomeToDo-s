const express = require("express");
const { ObjectId } = require("mongodb");
const { getClasses } = require("./models/index");
const { requireAuth } = require("./auth");

const router = express.Router();
router.use(requireAuth);

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLORS = ["violet", "blue", "teal", "green", "amber", "orange", "rose", "pink"];

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const number = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const normalize = (doc) => ({
  _id: doc._id,
  name: doc.name,
  code: doc.code || "",
  teacher: doc.teacher || "",
  room: doc.room || "",
  color: COLORS.includes(doc.color) ? doc.color : "violet",
  meetings: Array.isArray(doc.meetings) ? doc.meetings : [],
  assessments: Array.isArray(doc.assessments) ? doc.assessments : [],
  targetGrade: number(doc.targetGrade),
  createdAt: doc.createdAt,
});

// Validate the editable fields in a request body. Returns { fields } or { error }.
const readFields = (body, { partial }) => {
  const fields = {};
  const has = (key) => body[key] !== undefined;

  if (has("name") || !partial) {
    const name = text(body.name, 80);
    if (!name) return { error: "Class name is required" };
    fields.name = name;
  }
  if (has("code")) fields.code = text(body.code, 30);
  if (has("teacher")) fields.teacher = text(body.teacher, 80);
  if (has("room")) fields.room = text(body.room, 40);
  if (has("color")) {
    if (!COLORS.includes(body.color)) return { error: "invalid color" };
    fields.color = body.color;
  }
  if (has("meetings")) {
    if (!Array.isArray(body.meetings)) return { error: "invalid meetings" };
    const meetings = [];
    for (const m of body.meetings.slice(0, 14)) {
      if (!m || !Number.isInteger(m.day) || m.day < 0 || m.day > 6) return { error: "invalid meeting day" };
      if (!TIME_RE.test(m.start) || !TIME_RE.test(m.end)) return { error: "Meeting times must be HH:MM" };
      if (m.end <= m.start) return { error: "A class must end after it starts" };
      meetings.push({ day: m.day, start: m.start, end: m.end });
    }
    fields.meetings = meetings;
  }
  if (has("assessments")) {
    if (!Array.isArray(body.assessments)) return { error: "invalid assessments" };
    const assessments = [];
    for (const a of body.assessments.slice(0, 100)) {
      const name = text(a?.name, 80);
      const score = number(a?.score);
      const max = number(a?.max);
      const weight = number(a?.weight);
      if (!name) return { error: "Each grade needs a name" };
      if (score === null || max === null || max <= 0 || score < 0) return { error: "Scores must be numbers and the max must be above 0" };
      if (weight === null || weight < 0 || weight > 100) return { error: "Weight must be between 0 and 100" };
      assessments.push({
        id: typeof a.id === "string" ? a.id.slice(0, 64) : new ObjectId().toString(),
        name,
        score,
        max,
        weight,
      });
    }
    fields.assessments = assessments;
  }
  if (has("targetGrade")) {
    const target = body.targetGrade === null ? null : number(body.targetGrade);
    if (body.targetGrade !== null && (target === null || target < 0 || target > 100)) {
      return { error: "Target grade must be between 0 and 100" };
    }
    fields.targetGrade = target;
  }

  return { fields };
};

const parseId = (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ mssg: "invalid id" });
    return null;
  }
  return new ObjectId(req.params.id);
};

// GET /classes
router.get("/", async (req, res) => {
  const classes = await getClasses().find({ userId: req.userId }).sort({ name: 1 }).toArray();
  res.status(200).json(classes.map(normalize));
});

// POST /classes
router.post("/", async (req, res) => {
  const { fields, error } = readFields(req.body ?? {}, { partial: false });
  if (error) return res.status(400).json({ mssg: error });

  const count = await getClasses().countDocuments({ userId: req.userId });
  if (count >= 30) return res.status(400).json({ mssg: "You can have up to 30 classes" });

  const doc = {
    code: "",
    teacher: "",
    room: "",
    color: COLORS[count % COLORS.length],
    meetings: [],
    assessments: [],
    targetGrade: null,
    ...fields,
    userId: req.userId,
    createdAt: new Date(),
  };
  const result = await getClasses().insertOne(doc);
  res.status(201).json(normalize({ ...doc, _id: result.insertedId }));
});

// PUT /classes/:id  (partial update)
router.put("/:id", async (req, res) => {
  const _id = parseId(req, res);
  if (!_id) return;

  const { fields, error } = readFields(req.body ?? {}, { partial: true });
  if (error) return res.status(400).json({ mssg: error });
  if (Object.keys(fields).length === 0) return res.status(400).json({ mssg: "nothing to update" });

  const updated = await getClasses().findOneAndUpdate(
    { _id, userId: req.userId },
    { $set: fields },
    { returnDocument: "after" }
  );
  if (!updated) return res.status(404).json({ mssg: "class not found" });
  res.status(200).json(normalize(updated));
});

// DELETE /classes/:id
router.delete("/:id", async (req, res) => {
  const _id = parseId(req, res);
  if (!_id) return;

  const result = await getClasses().deleteOne({ _id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ mssg: "class not found" });
  res.status(200).json({ deletedCount: result.deletedCount });
});

module.exports = { classesRouter: router, normalizeClass: normalize };
