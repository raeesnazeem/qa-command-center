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
  TasksPage,
  TestPage,
  Week1TestPage,
} from "@/pages"
import { AuthenticateWithRedirectCallback } from "@clerk/react"

export const router = createBrowserRouter(
  [
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
              path: "/week1-test",
              element: <Week1TestPage />,
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
              path: "/tasks",
              element: <TasksPage />,
            },
            {
              path: "/settings",
              element: <SettingsPage />,
            },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  },
)
