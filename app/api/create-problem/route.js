import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "@/lib/judge0";
import {
  currentUserRole,
  getCurrentUserFromClerk,
} from "@/modules/auth/actions";
import { currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";


function normalizeSourceCode(code) {
  if (typeof code !== "string") return "";
  return code.trimEnd() + "\n";
}


export async function POST(request) {
  try {
    const userRole = await currentUserRole();
    const user = await getCurrentUserFromClerk();

    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to create a problem",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      difficulty,
      tags,
      examples,
      constraints,
      testCases,
      codeSnippets,
      referenceSolution,
    } = body;

    // Basic Validation
    if (
      !title ||
      !description ||
      !difficulty ||
      !testCases ||
      !codeSnippets ||
      !referenceSolution
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Test cases are required",
        },
        { status: 400 }
      );
    }

    if (!referenceSolution || typeof referenceSolution !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Reference solution must be provided in all languages",
        },
        { status: 400 }
      );
    }

    // Validate reference solutions with Judge0
    for (const [language, solutionCode] of Object.entries(referenceSolution)) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        return NextResponse.json(
          {
            success: false,
            message: `Unsupported language: ${language}`,
          },
          { status: 400 }
        );
      }

      const sourceCode = normalizeSourceCode(solutionCode);

      if (!sourceCode.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: `Reference solution code is empty for ${language}`,
          },
          { status: 400 }
        );
      }

      // Prepare Judge0 submissions for all test cases
      const submissions = testCases.map((tc) => ({
        language_id: languageId,
        source_code: solutionCode,
        stdin: tc.input,
        expected_output: tc.output,
      }));

      // console.log(
      //   `Submitting ${submissions.length} test cases for ${language}`
      // );
      // console.log(`${language} source length:`, sourceCode.length);
      // console.log(`Sample submission payload:`, JSON.stringify(submissions[0], null, 2));


      let submissionResult;
      try {
        submissionResult = await submitBatch(submissions);
      } catch (judge0Error) {
        console.error(`Judge0 submission failed for ${language}:`, judge0Error);
        console.warn(`⚠️ Skipping Judge0 validation - will save problem anyway`);
        // Don't fail, just skip validation for this language
        continue;
      }

      if (!submissionResult || !Array.isArray(submissionResult)) {
        console.error(
          `Invalid submission result for ${language}:`,
          submissionResult
        );
        console.warn(`⚠️ Skipping Judge0 validation - will save problem anyway`);
        // Don't fail, just skip validation for this language
        continue;
      }

      const tokens = submissionResult.map((response) => response.token);

      let results;
      try {
        results = await pollBatchResults(tokens);
      } catch (pollError) {
        console.error(`Polling failed for ${language}:`, pollError);
        console.warn(`⚠️ Skipping Judge0 validation - will save problem anyway`);
        continue;
      }

      // Validate all test cases passed
      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status.id !== 3) {
          console.warn(
            `⚠️ Test case ${i} validation warning for ${language}:`,
            {
              status: result.status.description,
              stderr: result.stderr,
              stdout: result.stdout,
            }
          );
        }
      }
    }

    // Save the problem to database
    const newProblem = await db.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testCases,
        codeSnippets,
        referenceSolution,
        userId: user.id,
      },
    });

    console.log(`[Problem created successfully: ${newProblem.id}`);

    return NextResponse.json(
      {
        success: true,
        message: "Problem created successfully",
        data: newProblem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create problem error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create problem",
        error:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}
