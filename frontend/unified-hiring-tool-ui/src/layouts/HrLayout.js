// src/layouts/HrLayout.js

import React from 'react';
import HrNavbar from '../components/HrNavbar';
import { Outlet } from 'react-router-dom';
import './HrLayout.css'; // Add this line if you’re using custom styles

export default function HrLayout() {
  return (
    <>
      <HrNavbar />
      <div className="hr-outlet-wrapper">
        <Outlet />
      </div>
    </>
  );
}
