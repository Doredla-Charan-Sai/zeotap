const express = require("express");
const router = express.Router();
const { initializeDB } = require("../models/rulesModel");

const parseRuleToAST = (ruleString) => {
  try {
    if (!ruleString || typeof ruleString !== 'string') {
      throw new Error("Invalid rule string");
    }

    // Tokenize the rule string to match conditions and operators like AND/OR
    const tokens = ruleString.match(/([a-zA-Z_]+\s*(>|<|=)\s*\d+|\b(AND|OR)\b)/g);

    if (!tokens) {
      throw new Error("Invalid rule structure: no valid tokens");
    }

    let stack = [];
    console.log("Tokens parsed:", tokens); // Debugging: log the tokens

    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      console.log(`Processing token [${index}]: ${token}`); // Debugging: log each token

      if (token === "AND" || token === "OR") {
        // Ensure two operands are present to form a valid operation
        if (stack.length < 2) {
          throw new Error(`Invalid rule structure: insufficient operands for ${token}`);
        }
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ type: "operator", operator: token, left, right });
      } else {
        // Validate the operand format (e.g., age > 30)
        const match = token.match(/^([a-zA-Z_]+)\s*(>|<|=)\s*(\d+)$/);
        if (!match) {
          throw new Error("Invalid operand structure: " + token);
        }
        const [_, key, operator, value] = match;
        stack.push({ type: "operand", key, operator, value: parseInt(value, 10) });
      }

      console.log("Stack after processing:", stack); // Debugging: log the stack after each token
    }

    // Ensure the final stack contains exactly one AST node
    if (stack.length !== 1) {
      throw new Error("Invalid rule structure: unmatched operators or operands");
    }

    return stack.pop(); // Return the final AST node
  } catch (error) {
    console.error("Error creating rule:", error.message);
    throw error; // Rethrow to be caught in the API handler
  }
};



// API to create a rule
router.post("/rules", async (req, res) => {
  const { rule_string } = req.body;

  // Log the incoming rule string for debugging
  console.log("Received rule_string:", rule_string);

  try {
    const ast = JSON.stringify(parseRuleToAST(rule_string));  // Parse the rule to AST
    console.log("Generated AST:", ast);  // Log the parsed AST

    const db = await initializeDB();
    const insertQuery = `INSERT INTO rules (rule_string, ast_structure) VALUES (?, ?)`;
    
    await db.run(insertQuery, [rule_string, ast]);  // Insert rule into the database
    
    res.status(201).send({ message: "Rule created successfully" });
  } catch (error) {
    console.error("Error creating rule:", error.message);  // Log error details
    res.status(500).send({ error: "Failed to create rule" });
  }
});

// API to combine multiple rules
router.post("/rules/combine", async (req, res) => {
  const { rules } = req.body;

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return res.status(400).send({ error: "Rules array is required" });
  }

  try {
    // Combine ASTs using the AND operator for simplicity
    const combinedAST = rules.reduce((combined, currentRule) => {
      const currentAST = parseRuleToAST(currentRule);  // Parse each rule to AST
      if (combined) {
        return { type: "operator", operator: "AND", left: combined, right: currentAST };
      }
      return currentAST;
    }, null);

    res.send({ combinedAST });
  } catch (error) {
    console.error("Error combining rules:", error.message);
    res.status(500).send({ error: "Failed to combine rules" });
  }
});

// Utility function to evaluate the AST against user data
const evaluateAST = (ast, data) => {
  if (ast.type === "operator") {
    const leftResult = evaluateAST(ast.left, data);
    const rightResult = evaluateAST(ast.right, data);

    if (ast.operator === "AND") return leftResult && rightResult;
    if (ast.operator === "OR") return leftResult || rightResult;
  } else if (ast.type === "operand") {
    const { key, operator, value } = ast;
    if (operator === ">") return data[key] > value;
    if (operator === "<") return data[key] < value;
    if (operator === "=") return data[key] === value;
  }
  return false;  // Default case: condition is not met
};

// API to evaluate a rule against user data
router.post("/rules/evaluate", async (req, res) => {
  const { rule_id, user_data } = req.body;

  if (!rule_id || !user_data) {
    return res.status(400).send({ error: "rule_id and user_data are required" });
  }

  try {
    const db = await initializeDB();
    const selectQuery = `SELECT ast_structure FROM rules WHERE rule_id = ?`;

    const rule = await db.get(selectQuery, [rule_id]);

    if (!rule) {
      return res.status(404).send({ error: "Rule not found" });
    }

    // Parse the AST from the JSON string
    const ast = JSON.parse(rule.ast_structure);

    // Evaluate the AST against user data
    const isEligible = evaluateAST(ast, user_data);
    res.send({ isEligible });
  } catch (error) {
    console.error("Error evaluating rule:", error.message);
    res.status(500).send({ error: "Failed to evaluate rule" });
  }
});

module.exports = router;
