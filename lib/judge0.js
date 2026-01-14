import axios from "axios";
// import { setTimeout as sleep } from "timers/promises";

const JUDGE0_HOST = process.env.JUDGE0_API_URL || "http://localhost:2358";
const JUDGE0_RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JUDGE0_RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

// Check if using RapidAPI
const isUsingRapidAPI = JUDGE0_HOST.includes("rapidapi");

export function getJudge0LanguageId(language) {
   if (!language || typeof language !== "string") return null;
  const languageMap = {
    PYTHON: 71,
    JAVASCRIPT: 63,
    JAVA: 62,
    CPP: 54,
    GO: 60,
  };
  return languageMap[language.toUpperCase()] || null;
}

export function getLanguageName(languageId) {
  const LANGUAGE_NAMES = {
    74: "TypeScript",
    63: "JavaScript",
    71: "Python",
    62: "Java",
  };
  return LANGUAGE_NAMES[languageId] || "Unknown";
}

export async function getJudge0Result(token) {
  let result;
  while (true) {
    const response = await axios.get(
      `${process.env.JUDGE0_API_URL}/submissions/${token}`);
    result = response.data;
    if (result.status.id !== 1 && result.status.id !== 2) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return result;
}


// Utility: split into chunks of max 20 for Judge0 batch
export function chunkArray(arr, size = 20) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Submit batch of submissions to Judge0
export async function submitBatch(submissions) {
  try {
    if (!submissions || submissions.length === 0)
      throw new Error("No submissions provided");

    const axiosConfig = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Add RapidAPI headers if using RapidAPI
    if (isUsingRapidAPI && JUDGE0_RAPIDAPI_KEY) {
      axiosConfig.headers["x-rapidapi-key"] = JUDGE0_RAPIDAPI_KEY;
      axiosConfig.headers["x-rapidapi-host"] = JUDGE0_RAPIDAPI_HOST;
    }

    // Add redirect_stderr to ensure all output goes to stdout
    const enrichedSubmissions = submissions.map(sub => ({
      ...sub,
      redirect_stderr: true, // Redirect stderr to stdout
    }));

    const { data } = await axios.post(
      `${JUDGE0_HOST}/submissions/batch`,
      { submissions: enrichedSubmissions, base64_encoded: false },
      axiosConfig
    );

    console.log("Raw Judge0 response:", data);

    // Handle both array response (wait=true) and object response (wait=false)
    if (Array.isArray(data)) {
      return data; // wait=true response - direct array of submissions
    }

    if (Array.isArray(data.submissions)) {
      return data.submissions; // non-wait response - wrapped in object
    }

    console.error("Unexpected Judge0 response format:", data);
    throw new Error("Unexpected Judge0 response format");
  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    throw error;
  }
}

// Poll all tokens until they are done
// Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4=Wrong Answer, 5=Time Limit, 6=Compilation Error, 7=Runtime Error, 8=Internal Error
export async function pollBatchResults(tokens) {
  let attempts = 0;
  const maxAttempts = 60; // Maximum 60 attempts = 2 minutes with 2s delay
  
  while (attempts < maxAttempts) {
    const axiosConfig = {
      params: {
        tokens: tokens.join(","),
        base64_encoded: false,
      },
    };

    // Add RapidAPI headers if using RapidAPI
    if (isUsingRapidAPI && JUDGE0_RAPIDAPI_KEY) {
      axiosConfig.headers = {
        "x-rapidapi-key": JUDGE0_RAPIDAPI_KEY,
        "x-rapidapi-host": JUDGE0_RAPIDAPI_HOST,
      };
    }

    const { data } = await axios.get(
      `${JUDGE0_HOST}/submissions/batch`,
      axiosConfig
    );

    console.log("Poll attempt", attempts + 1, ":", JSON.stringify(data, null, 2));
    const results = data.submissions;

    // Check if all submissions are done processing (status id 1 or 2 means still processing)
    const isAllDone = results.every(
      (r) => r.status && r.status.id !== 1 && r.status.id !== 2
    );
    
    if (isAllDone) {
      console.log("All submissions completed!");
      return results;
    }

    attempts++;
    console.log(`Still processing... waiting before next poll (attempt ${attempts}/${maxAttempts})`);
    await sleep(2000); // Wait 2 seconds between polls
  }
  
  throw new Error(`Polling timeout: Results not received after ${maxAttempts} attempts`);
}
