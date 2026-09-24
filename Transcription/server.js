const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Fact checking server is running!");
});

app.post("/fact-check", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text was provided.",
      });
    }

    console.log("Checking:", text);

    const response = await openai.responses.create({
      model: "gpt-5.6-terra",

      tools: [
        {
          type: "web_search",
        },
      ],

      input: `
You are a live fact-checking assistant.

Analyze the following spoken statement:

"${text}"

First determine whether it contains a factual claim that can reasonably
be verified.

If it is only an opinion, greeting, personal feeling, question,
or something that does not need fact checking, respond:

NO FACTUAL CLAIM

If it contains a factual claim:

1. Identify the main factual claim.
2. Search the web for reliable and current evidence.
3. Prefer authoritative sources such as:
   - government agencies
   - universities
   - scientific organizations
   - official company websites
   - major established news organizations

Then provide:

VERDICT: True, False, Misleading, Unverified, or Needs Context

CLAIM:
The claim being checked.

EXPLANATION:
A short explanation written for a normal user.

SOURCES:
List the most important sources used.

Do not claim something is false merely because you cannot find evidence.
`,
    });

    res.json({
      factCheck: response.output_text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Fact checking failed.",
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});