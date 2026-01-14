"use server";

import { db } from "@/lib/db";
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

