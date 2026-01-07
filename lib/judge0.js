import axios from "axios";

export function getJudge0LanguageId(language) {
  const languagesMap = {
    CPP: 54,
    GO: 60,
    JAVA: 62,
    JAVASCRIPT: 63,
    PYTHON: 71,
  };

  return languagesMap[language.toUpperCase()];
}

export async function submitBatch(submissions) {
  //onsubmissiom give tokens
  const { data } = await axios.post(
    `${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`,
    { submissions }
  );

  console.log("Response batch data", data);
  return data;
}

export async function pollBatchResults(tokens) {
  while (true) {
    const { data } = await axios.get(
      `${process.env.JUDGE0_API_URL}/submissions/batch}`,
      {
        params: {
          tokens: tokens.join(","),
          base64_encoded: false,
        },
      }
    );
    console.log("Response batch dataaa", data);
    const results = data.submissions;

    const isAllDone = results.every((result) => {
      return result.status.id !== 1 && result.status.id !== 2;
    });

    if (isAllDone) return results;

    await sleep(1000);
  }
}

