import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { getAllProblems } from "@/modules/problem/actions";
import ProblemTable from "@/modules/problem/components/CreateTable";

const ProblemsPage = async () => {
  const user = await currentUser();

  let dbUser = null;

  if (user) {
    dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, role: true },
    });
  }

  const res = await getAllProblems();

  if (!res.success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">{res.message}</p>
      </div>
    );
  }

  const problems = res.data;

  return (
    <div className="container mx-auto py-32">
      <ProblemTable problems={problems} user={dbUser} />
    </div>
  );
};

export default ProblemsPage;
