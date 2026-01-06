"use server";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        message: "No authenticated user found",
      };
    }

    const { id, firstName, lastName, imageUrl, emailAddresses } = user;

    const newUser = await db.user.upsert({
      where: {
        clerkId: id,
      },
      update: {
        firstName: firstName || null,
        lastName: lastName || null,
        imageUrl: imageUrl || null,
        email: emailAddresses[0]?.emailAddress,
      },
      create: {
        clerkId: id,
        firstName: firstName || null,
        lastName: lastName || null,
        imageUrl: imageUrl || null,
        email: emailAddresses[0]?.emailAddress,
      },
    });

    return {
      success: true,
      data: newUser,
      message: "User created(onBoarded) successfully ✅",
    };
  } catch (error) {
    console.error("❌ Error onBoarding user", error);
    return {
      success: false,
      message: "Error onBoarding user",
    };
  }
};

export const currentUserRole = async () => {
  try {
    const user = await currentUser();
    if(!user){
      return {
        success: false,
        message: "No authenticated user found",
      };
    }
    const {id} = user;
    const userRole = await db.user.findUnique({
      where: {
        clerkId: id,
      },
      select: {
        role: true,
      },
    });

    if (!userRole) {
      return {
        success: false,
        message: "User role not found",
      };
    }
    return userRole.role


  } catch (error) {
    console.error(" ❌ Error onBoarding user", error);
    return {
      success: false,
      message: "Error onBoarding user",
    };
  }
}