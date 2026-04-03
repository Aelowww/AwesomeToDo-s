require("dotenv").config();
const dns = require("dns");
const { MongoClient, ServerApiVersion } = require("mongodb");

// Work around local DNS providers that block MongoDB SRV lookups.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
  console.log("Unable to set custom DNS servers:", error.message);
}

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/";

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client;
const connectToMongoDB = async () => {
  if (!client) {
    try {
      client = await MongoClient.connect(uri, options);
      console.log("Connected to MongoDB");
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  return client;
};

const getConnectedClient = () => client;

module.exports = { connectToMongoDB, getConnectedClient };