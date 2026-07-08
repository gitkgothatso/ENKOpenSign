import React from "react";
import { Navigate, Outlet } from "react-router";
import { isAuthenticated } from "../api/session";

const DEFAULT_LANDING = "/documents";

// Guards the pre-login routes (login, add-admin) — bounces an
// already-authenticated user straight to their dashboard.
const ValidateRoute = () => {
  if (isAuthenticated()) {
    return <Navigate to={DEFAULT_LANDING} replace />;
  }
  return <Outlet />;
};

export default ValidateRoute;
