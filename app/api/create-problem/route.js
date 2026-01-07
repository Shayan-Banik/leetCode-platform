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

export async function POST(request) {
  try {
    const userRole = await currentUserRole();
    // const user = await currentUser();
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
      userId,
      examples,
      constrains,
      hints,
      editorial,
      testCases,
      codeSnippets,
      referenceSolution,
    } = body;

    //Basic Validation
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

    //validate reference solution
    if (!referenceSolution || typeof referenceSolution !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Reference solution must be provided in all languges",
        },
        { status: 400 }
      );
    }

    for (const [language, solutionCode] of Object.entries(referenceSolution)) {
      //get judge0 id for the current language
      const languageId = getJudge0LanguageId();

      if (!languageId) {
        return NextResponse.json(
          {
            success: false,
            message: `Unsupported language ${language}`,
          },
          { status: 400 }
        );
      }

      //prepare judge0 submission for all the testCases
      const submissions = testCases.map((input, output) => {
        return {
          language_id: languageId,
          source_code: solutionCode,
          stdin: input,
          expected_output: output,
        };
      });
      //submit all the test cases in one batch
      const submissionResult = await submitBatch(submissions);

      const tokens = submissionResult.map((response) => response.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.status.id !== 3) {
          return NextResponse.json(
            {
              success: false,
              message: `Validate failed for ${language}}`,
              testCases: {
                input: submissions[i].stdin,
                expectedOutput: submissions[i].expected_output,
                actualOutput: result.stdout,
                errorMessage: result.stderr || result.compile_output,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    //step-3 save the problem into database
    const newProblem = await db.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constrains,
        testCases,
        codeSnippets,
        referenceSolution,
      },
      userId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Problem created successfully",
        data: newProblem,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(" ❌ Database error", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to save problem in database",
      },
      { status: 500 }
    );
  }
}
