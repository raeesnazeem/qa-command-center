import React from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "@/layouts/AppLayout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import {
  LoginPage,
  RegisterPage,
  DashboardPage,
  ProjectsPage,
  ProjectDetailPage,
  RunDetailPage,
  SettingsPage,
  TestPage,
} from "@/pages"
import { AuthenticateWithRedirectCallback } from "@clerk/react"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/test",
            element: <TestPage />,
          },
          {
            path: "/sso-callback",
            element: <AuthenticateWithRedirectCallback />,
          },
          // If Clerk is specifically sending to /login/sso-callback, use this:
          {
            path: "/login/sso-callback",
            element: <AuthenticateWithRedirectCallback />,
          },

          {
            path: "/projects",
            element: <ProjectsPage />,
          },
          {
            path: "/projects/:id",
            element: <ProjectDetailPage />,
          },
          {
            path: "/projects/:id/runs/:runId",
            element: <RunDetailPage />,
          },
          {
            path: "/settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
])
