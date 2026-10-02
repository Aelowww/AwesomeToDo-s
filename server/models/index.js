const { getConnectedClient } = require("../database");

const db = () => getConnectedClient().db("todosdb");

const getCollection = () => db().collection("todos");

const getUsers = () => db().collection("users");

const getClasses = () => db().collection("classes");

// Emails must be unique, and every task and class lookup filters by its owner.
const ensureIndexes = async () => {
  await getUsers().createIndex({ email: 1 }, { unique: true });
  await getCollection().createIndex({ userId: 1 });
  await getClasses().createIndex({ userId: 1 });
};

module.exports = { getCollection, getUsers, getClasses, ensureIndexes };
