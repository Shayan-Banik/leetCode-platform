import React from "react";

const AuthLayout = ({ children }) => {
  return (
    <div className="bg-black min-h-screen">
      <div className="flex items-center justify-center min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
