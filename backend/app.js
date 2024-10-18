const express = require("express");
const app = express();
const ruleRoutes = require("./routes/ruleRoutes");
const createDatabase = require("./models/rulesModel"); // Import createDatabase

app.use(express.json()); // Middleware to parse JSON

// Use the routes
app.use("/api", ruleRoutes);

// Ensure that the database and table are created when the server starts
createDatabase().then(() => {
  console.log("Database initialized and table created successfully");
}).catch(err => {
  console.error("Error initializing database:", err);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}/`);
});
