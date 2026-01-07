"use server";

import { onBoardUser } from "@/modules/auth/actions";
import HomeView from ".";

export default async function Home() {
  await onBoardUser()

  return (
    <div>
      <HomeView />
    </div>
  )
}
