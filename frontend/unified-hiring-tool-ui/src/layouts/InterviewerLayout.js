import React from "react";
import InterviewerNavbar from "../components/InterviewerNavbar";
import { Outlet } from "react-router-dom";

export default function InterviewerLayout() {
  return (
    <>
      <InterviewerNavbar />
      <div className="container mt-4">
        <Outlet />
      </div>
    </>
  );
}
