const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

const { AzureOpenAI } = require("openai");


// import { AzureOpenAI } from "openai";

const app = express();
app.use(cors());
app.use(express.json());


const endpoint = 'https://eppireasoning.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview'

const modelName = "gpt-4o-mini";

const deployment = "gpt-4o-mini";

const apiKey = process.env.AZURE_OPENAI_KEY;
const apiVersion = "2024-08-01-preview";
const options = { endpoint, apiKey, deployment, apiVersion }
const client = new AzureOpenAI(options);

function getTransferabilityVerdictWeighted(json) {
  const weights = {
    problem_alignment: 3,
    policy_alignment: 3,
    delivery_feasibility: 2.5,
    cultural_fit: 2,
    crisis_relevance: 2,
    local_evidence: 1,
    timeliness:1.5
  };

  const scoreMap = { High: 1, Medium: 0.5, Low: 0 };

  let total = 0;
  let max = 0;

  for (const key in weights) {
    const relevance = json[key] || "Low";
    const weight = weights[key];
    total += scoreMap[relevance] * weight;
    max += weight;
  }

  const threshold = max * 0.6; // at least 60% of max score to be relevant

  return {
    ...json,
    weighted_score: total.toFixed(2),
    max_score: max,
    relevant: total >= threshold ? "Yes" : "No",
  };
}


// Initialize OpenAI with v4 syntax
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API endpoint to evaluate research relevance
app.post("/api/evaluate", async (req, res) => {
  const { title, abstract, year } = req.body;

  // let timeliness = "Low";
  // if (year) {
  //   const currentYear = new Date().getFullYear();
  //   const age = currentYear - parseInt(year, 10);
  //   if (age <= 5) timeliness = "High";
  //   else if (age <= 10) timeliness = "Medium";
  // }
  
  //add prompt to explain findings, show it in a box
  const prompt = `
  You are a machine reading expert tasked with evaluating the **relevance of a research paper** for Cameroon, using predefined national and contextual criteria.
  
  ### Step 1: Relevance Criteria
  
  Evaluate the intervention using these **seven criteria**:
  
  1. **Problem Alignment**: Does the paper describe a problem that matches national/local priorities in Cameroon? Example priority problems include:
     - Maternal and child mortality
     - Malaria
     - HIV/AIDS
     - Malnutrition
     - Access to primary healthcare
     - Low literacy rates
     - Girls' access to education
     - Conflict-disrupted education
     - Poor quality of teaching
     - Low secondary/tertiary enrollment
     - Flooding, drought, deforestation, and food insecurity
  
  2. **Policy Alignment**: Does the intervention explicitly align with national policies or global development targets?
     - Examples: Health Sector Strategy 2016–2027, Education Sector Plan 2020–2030, SDG 3 (Health), SDG 4 (Education), African Union Agenda 2063.
  
  3. **Cultural Fit**: Does the paper describe adaptations to Cameroon's cultural context? Check for:
     - Use of French/local languages
     - Respect for Christian or Muslim religious practices
     - Gender roles and expectations
     - Engagement of community elders, family structures, local leaders
     - Educational or health delivery norms (e.g. community health workers)
  
  4. **Delivery Feasibility**: Could the intervention realistically be implemented in Cameroon? Consider:
     - Infrastructure and rural access
     - Human resource capacity (e.g., availability of trained workers)
     - Logistical simplicity and scalability
  
  5. **Crisis Relevance**: Does the paper mention topics related to active/recent crises in Cameroon?
     - Example crises: COVID-19, conflict and displacement in the NW/SW regions, floods, malnutrition spikes
  
  6. **Local Evidence**: Does the paper reference data, studies, or pilot tests done in Cameroon or neighboring countries?
  
  ---
  
  ### Step 2: Output Format
  
  Return your evaluation as **structured JSON** with scores ("High", "Medium", "Low"): and a string for the justification field
  
  {
    "problem_alignment": "",
    "policy_alignment": "",
    "cultural_fit": "",
    "delivery_feasibility": "",
    "crisis_relevance": "",
    "local_evidence": "",
    "justification":""
  }
  
  Only return the JSON — no preamble, no explanation.

  Do not include timeliness as part of the JSON output
  
  ---
  
  ### Input
  
  TITLE: ${title}
  
  ABSTRACT: ${abstract || "Not provided"}
  `;
  

  try {
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: "system",
          content: "You are an assistant that evaluates research relevance for African policy makers.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });
    const responseText = completion.choices[0].message.content;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in GPT response.");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    // parsed.timeliness = timeliness;
    
    const verdict = getTransferabilityVerdictWeighted(parsed);

    // verdict.timeliness = timeliness;

    res.json(verdict);
  } catch (error) {
    console.error("Error from OpenAI:", error.message);
    if (error.response) {
      console.error("OpenAI API Error:", error.response.data);
    }
    res.status(500).json({ error: "Failed to evaluate relevance." });
  }
});

app.listen(3001, () => {
  console.log("✅ Backend running at http://localhost:3000");
});



