const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollection } = require("./models/index");
const { authRouter, requireAuth } = require("./auth");
const { classesRouter } = require("./classes");
const { aiRouter } = require("./ai");

const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ ok: true }));
router.use("/auth", authRouter);
router.use("/classes", classesRouter);
router.use("/ai", aiRouter);

// Every task route below needs a signed-in user and only touches that user's tasks.
router.use("/todos", requireAuth);

const TYPES = ["task", "assignment", "exam", "project", "reading"];
const PRIORITIES = ["low", "medium", "high"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Older todos were saved as JSON strings (e.g. "\"Buy milk\""), so unwrap them.
const parseLegacyText = (value) => {
  if (typeof value !== "string") return String(value ?? "");
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
};

// Fill in defaults so old documents look like new ones to the client.
const normalize = (doc) => ({
  _id: doc._id,
  todo: parseLegacyText(doc.todo),
  status: Boolean(doc.status),
  subject: doc.subject || "",
  type: TYPES.includes(doc.type) ? doc.type : "task",
  priority: PRIORITIES.includes(doc.priority) ? doc.priority : "medium",
  dueDate: doc.dueDate || null,
  notes: doc.notes || "",
  subtasks: Array.isArray(doc.subtasks) ? doc.subtasks : [],
  pomodoros: Number(doc.pomodoros) || 0,
  createdAt: doc.createdAt || doc._id.getTimestamp(),
  completedAt: doc.completedAt || null,
});

// Validate the editable fields in a request body. Returns { fields } or { error }.
const readFields = (body, { partial }) => {
  const fields = {};
  const has = (key) => body[key] !== undefined;

  if (has("todo") || !partial) {
    const todo = typeof body.todo === "string" ? body.todo.trim() : "";
    if (!todo) return { error: "todo text is required" };
    fields.todo = todo.slice(0, 300);
  }
  if (has("status")) {
    if (typeof body.status !== "boolean") return { error: "invalid status" };
    fields.status = body.status;
    fields.completedAt = body.status ? new Date() : null;
  }
  if (has("subject")) {
    if (typeof body.subject !== "string") return { error: "invalid subject" };
    fields.subject = body.subject.trim().slice(0, 60);
  }
  if (has("type")) {
    if (!TYPES.includes(body.type)) return { error: "invalid type" };
    fields.type = body.type;
  }
  if (has("priority")) {
    if (!PRIORITIES.includes(body.priority)) return { error: "invalid priority" };
    fields.priority = body.priority;
  }
  if (has("dueDate")) {
    if (body.dueDate !== null && !DATE_RE.test(body.dueDate)) {
      return { error: "dueDate must be YYYY-MM-DD or null" };
    }
    fields.dueDate = body.dueDate;
  }
  if (has("notes")) {
    if (typeof body.notes !== "string") return { error: "invalid notes" };
    fields.notes = body.notes.slice(0, 5000);
  }
  if (has("subtasks")) {
    if (!Array.isArray(body.subtasks)) return { error: "invalid subtasks" };
    fields.subtasks = body.subtasks
      .filter((s) => s && typeof s.text === "string" && s.text.trim())
      .slice(0, 50)
      .map((s) => ({
        id: typeof s.id === "string" ? s.id : new ObjectId().toString(),
        text: s.text.trim().slice(0, 200),
        done: Boolean(s.done),
      }));
  }
  if (has("pomodoros")) {
    if (!Number.isInteger(body.pomodoros) || body.pomodoros < 0) {
      return { error: "invalid pomodoros" };
    }
    fields.pomodoros = body.pomodoros;
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

// GET /todos
router.get("/todos", async (req, res) => {
  const todos = await getCollection().find({ userId: req.userId }).toArray();
  res.status(200).json(todos.map(normalize));
});

// POST /todos
router.post("/todos", async (req, res) => {
  const { fields, error } = readFields(req.body ?? {}, { partial: false });
  if (error) return res.status(400).json({ mssg: error });

  const doc = {
    status: false,
    subject: "",
    type: "task",
    priority: "medium",
    dueDate: null,
    notes: "",
    subtasks: [],
    pomodoros: 0,
    ...fields,
    completedAt: fields.status ? new Date() : null,
    createdAt: new Date(),
    userId: req.userId,
  };

  const result = await getCollection().insertOne(doc);
  res.status(201).json(normalize({ ...doc, _id: result.insertedId }));
});

// DELETE /todos?status=done  (clear all completed tasks)
router.delete("/todos", async (req, res) => {
  if (req.query.status !== "done") {
    return res.status(400).json({ mssg: "only ?status=done is supported" });
  }
  const result = await getCollection().deleteMany({ status: true, userId: req.userId });
  res.status(200).json({ deletedCount: result.deletedCount });
});

// DELETE /todos/:id
router.delete("/todos/:id", async (req, res) => {
  const _id = parseId(req, res);
  if (!_id) return;

  const result = await getCollection().deleteOne({ _id, userId: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ mssg: "todo not found" });
  res.status(200).json({ deletedCount: result.deletedCount });
});

// PUT /todos/:id  (partial update: send only the fields that changed)
router.put("/todos/:id", async (req, res) => {
  const _id = parseId(req, res);
  if (!_id) return;

  const { fields, error } = readFields(req.body ?? {}, { partial: true });
  if (error) return res.status(400).json({ mssg: error });
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ mssg: "nothing to update" });
  }

  const updated = await getCollection().findOneAndUpdate(
    { _id, userId: req.userId },
    { $set: fields },
    { returnDocument: "after" }
  );
  if (!updated) return res.status(404).json({ mssg: "todo not found" });

  res.status(200).json(normalize(updated));
});

module.exports = router;
