import Navbar from "@/modules/home/components/Navbar";
import React from "react";
import { currentUserRole } from "@/modules/auth/actions";

const RootLayout = async ({ children }) => {
  const currUserRole = await currentUserRole();
  return (
    <main className="flex flex-col min-h-screen max-h-screen">
      <div className="relative flex-1 flex flex-col px-4 pb-4">
        {/* Navbar */}
        <Navbar userRole={currUserRole} />
        {/* Background dots */}
        <div
          className="absolute inset-0 -z-10 h-full w-full
          bg-[radial-gradient(#dadde2_1px,transparent_1px)]
          bg-[size:16px_16px]
          dark:bg-[radial-gradient(#393e4a_1px,transparent_1px)]"
        />
        
        {children}
      </div>
    </main>
  );
};

export default RootLayout;
