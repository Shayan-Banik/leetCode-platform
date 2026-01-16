"use server";

import { db } from "@/lib/db";
import { getLanguageName, pollBatchResults, submitBatch } from "@/lib/judge0";
import { currentUser } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";


export const getAllProblems = async () => {
  try {
    const user = await currentUser();
    let userId = null;

    if (user) {
      const dbUser = await db.user.findUnique({
        where: { clerkId: user.id },
        select: { id: true },
      });

      userId = dbUser?.id ?? null;
    }

    const problems = await db.problem.findMany({
      include: {
        solvedBy: userId
          ? {
              where: { userId },
              select: { id: true },
            }
          : false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: problems,
      message: "Problems fetched successfully",
    };
  } catch (error) {
    console.error("❌ Error fetching problems:", error);
    return {
      success: false,
      data: [],
      message: "Error fetching problems",
    };
  }
};

export const getProblemById = async (id) => {
  try {
    const problem = await db.problem.findUnique({
      where: {
        id: id,
      },
    });

    return {
      success: true,
      data: problem,
    };
  } catch (error) {
    console.error("❌ Error fetching problem:", error);
    return {
      success: false,
      message: "Error fetching problem",
    };
  }
};

export const deleteByID = async (problemId) => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error("User not found ");
    }

    const dbUser = await db.user.findUnique({
      where: {
        clerkId: user.id,
      },
      select: {
        role: true,
      },
    });

    if (dbUser?.role !== UserRole.ADMIN) {
      throw new Error("You are not authorized to delete this problem");
    }

    await db.problem.delete({
      where: {
        id: problemId,
      },
    });

    revalidatePath("/problems");

    return {
      success: true,
      message: "Problem deleted successfully",
    };
  } catch (error) {
    console.error("❌ Error deleting problem:", error);
    return {
      success: false,
      message: "Error deleting problem",
    };
  }
};

export const executeCode = async (
  source_code,
  language_id,
  stdin,
  expected_output,
  id
) => {
  const user = await currentUser();

  const dbUser = await db.user.findUnique({
    where: {
      clerkId: user.id,
    },
  });

  if (
    !Array.isArray(stdin) ||
    stdin.length === 0 ||
    !Array.isArray(expected_output) ||
    expected_output.length === 0
  ) {
    return {
      success: false,
      error: "Invalid test case format",
    };
  }

  const submissions = stdin.map((input) => ({
    source_code,
    language_id,
    stdin: input,
    base64_encoded: false,
    wait: false,
  }));

  const submitResponse = await submitBatch(submissions);
  const tokens = submitResponse.map((submission) => submission.token);
  const results = await pollBatchResults(tokens); // Poll for results(array)

  let allPassed = true;

    const detailedResults = results.map((result, index) => {
    const stdout = result.stdout?.trim() || null;
    const expectedOutput = String(expected_output[index]).trim();

    const passed = stdout === expected_output;

    if (!passed) {
      allPassed = false;
    }

    return {
      testCase: index + 1,
      passed,
      stdout,
      expected: expectedOutput,
      stderr: result.stderr?.trim() || null,
      compile_output: result.compile_output?.trim() || null,
      status: result.status.description,
      memory: result.memory ? `${result.memory} KB` : undefined,
      time: result.time ? `${result.time} s` : undefined,
    };
  });

  const submission = await db.submission.create({
    data: {
      userId: dbUser.id,
      problemId: id,
      sourceCode: source_code,
      language: getLanguageName(language_id),
      stdin: stdin.join("\n"),
      stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
      stderr: detailedResults.some((r) => r.stderr)
        ? JSON.stringify(detailedResults.map((r) => r.stderr))
        : null,
      compileOutput: detailedResults.some((r) => r.compile_output)
        ? JSON.stringify(detailedResults.map((r) => r.compile_output))
        : null,
      status: allPassed ? "Accepted" : "Wrong Answer",
      memory: detailedResults.some((r) => r.memory)
        ? JSON.stringify(detailedResults.map((r) => r.memory))
        : null,
      time: detailedResults.some((r) => r.time)
        ? JSON.stringify(detailedResults.map((r) => r.time))
        : null,
    },
  });

  // 🏆  Mark problem as solved if all test cases passed
  if (allPassed) {
    await db.problemSolved.upsert({
      where: {
        userId_problemId: { userId: dbUser.id, problemId: id },
      },
      update: {},
      create: { userId: dbUser.id, problemId: id },
    });
  }

  const testCaseResults = detailedResults.map((result) => ({
    submissionId: submission.id,
    testCase: result.testCase,
    passed: result.passed,
    stdout: result.stdout,
    expected: result.expected,
    stderr: result.stderr,
    compileOutput: result.compile_output,
    status: result.status,
    memory: result.memory,
    time: result.time,
  }));

  await db.testCaseResult.createMany({ data: testCaseResults });

  const submissionWithTestCases = await db.submission.findUnique({
    where: { id: submission.id },
    include: { testCases: true },
  });

  return { success: true, submission: submissionWithTestCases };
};
