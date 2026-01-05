
import { onBoardUser } from "@/modules/auth/actions";
import { UserButton } from "@clerk/nextjs";
export default async function Home() {
  await onBoardUser();
  return (
    <div className="flex bg-black min-h-screen items-center justify-center font-sans dark:bg-black">
      <div className="flex flex-col">
        <h1 className="text-3xl mb-3 text-green-500">Hello leetCode</h1>
        <UserButton />
      </div>
    </div>
  );
}
