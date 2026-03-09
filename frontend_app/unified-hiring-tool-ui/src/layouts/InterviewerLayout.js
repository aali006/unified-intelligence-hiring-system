// import React from "react";
// import InterviewerNavbar from "../components/InterviewerNavbar";
// import { Outlet } from "react-router-dom";

// export default function InterviewerLayout() {
//   return (
//     <>
//       <InterviewerNavbar />
//       <div className="container mt-4">
//         <Outlet />
//       </div>
//     </>
//   );
// }

import React from "react";
import InterviewerNavbar from "../components/InterviewerNavbar";
import { Outlet, useLocation } from "react-router-dom";

export default function InterviewerLayout() {
  const location = useLocation();
  
  // Check if the current URL ends with /assistant
  const isAssistantPage = location.pathname.endsWith("assistant");

  return (
    <>
      <InterviewerNavbar />
      {/* If it's the assistant page, we use a div with NO classes.
          Otherwise, we use the standard Bootstrap container for other pages.
      */}
      <div className={isAssistantPage ? "full-screen-wrapper" : "container mt-4"}>
        <Outlet />
      </div>
    </>
  );
}