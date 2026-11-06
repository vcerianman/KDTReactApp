import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './queryClient';
import logo from './logo.svg';
import './App.css';
import NavBar from './NavBar';

// Lazy-loaded route
const Home = lazy(() => import('./Home'));
const Login = lazy(() => import('./Login'));
const Profile = lazy(() => import('./Profile'));
const Users = lazy(() => import('./Users'));
const Projects = lazy(() => import('./Projects'));
const Settings = lazy(() => import('./Settings'));
const Terms = lazy(() => import('./Terms'));
const Task = lazy(() => import('./Task'));
const SignUp = lazy(() => import('./SignUp'));
const CreateProjects = lazy(() => import('./CreateProjects'));
const CreateTasks = lazy(() => import('./CreateTasks'));
const Example = lazy(() => import('./Example'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const Appeal = lazy(() => import('./Appeal'));
const Communication = lazy(() => import('./Communication'));
const Report = lazy(() => import('./Report'));
const Help = lazy(() => import('./Help'));

// Generic placeholder page
export function PlaceholderPage({ title, description }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f2f4f5', fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif" }}>
      <div id="navbar-root">
        <NavBar userId="?" fullName="?" userName="?" userImg="/ProfilePic/0.jpg" />
      </div>
      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '40px',
          border: '1px solid #d6d6d6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '32px', color: '#393b3d', marginBottom: '12px' }}>{title}</h1>
          <p style={{ color: '#666666', fontSize: '16px', marginBottom: '24px' }}>
            {description || 'This page is currently under development.'}
          </p>
          <Link
            to="/home"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: '#00a2ff',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Component rendered at "/"
function MainApp() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Welcome to <code>Taskflow</code>
        </p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link
            to="/home"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#00a2ff",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Home
          </Link>
          <Link
            to="/login"
            style={{
              padding: "10px 20px",
              color: "black",
              backgroundColor: "#61dafb",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Login
          </Link>
          <Link
            to="/projects"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#e67e22",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Projects
          </Link>
          <Link
            to="/users"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#9b59b6",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Users
          </Link>
          <Link
            to="/settings"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#34495e",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Settings
          </Link>
          <Link
            to="/tasks"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#2980b9",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Tasks
          </Link>
          <Link
            to="/create-projects"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#d35400",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Create Project
          </Link>
          <Link
            to="/create-tasks"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#8e44ad",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Assign Task
          </Link>
          <Link
            to="/terms"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#16a085",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Terms
          </Link>
          <Link
            to="/profile/1"
            style={{
              padding: "10px 20px",
              color: "white",
              backgroundColor: "#2ecc71",
              textDecoration: "none",
              borderRadius: "5px",
              fontWeight: "600"
            }}
          >
            Go to Profile
          </Link>
        </div>
      </header>
    </div>
  );
}

// Elegant suspense loader fallback component (Dark Mode aware)
function PageLoader() {
  const isDark = typeof window !== 'undefined' && (
    document.body.classList.contains('dark-mode') ||
    localStorage.getItem('taskflow_theme') === 'dark'
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1a1c1e' : '#f2f4f5',
      color: isDark ? '#ffffff' : '#393b3d',
      fontFamily: "'GothamSSm', Helvetica Neue, Calibri, sans-serif"
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '14px'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          border: `3px solid ${isDark ? '#383c40' : '#d6d6d6'}`,
          borderTopColor: '#00a2ff',
          borderRadius: '50%',
          animation: 'taskflowSpin 0.75s linear infinite'
        }} />
        <span style={{ color: isDark ? '#b0b3b8' : '#666666', fontSize: '14px', fontWeight: '500' }}>
          Loading...
        </span>
        <style>{`
          @keyframes taskflowSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

// Higher-order helper to wrap lazy components in Suspense
const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainApp />,
  },
  {
    path: "/home",
    element: withSuspense(Home),
  },
  {
    path: "/login",
    element: withSuspense(Login),
  },
  {
    path: "/signup",
    element: withSuspense(SignUp),
  },
  {
    path: "/sign-up",
    element: withSuspense(SignUp),
  },
  {
    path: "/profile",
    element: withSuspense(Profile),
  },
  {
    path: "/profile/:id",
    element: withSuspense(Profile),
  },
  {
    path: "/users",
    element: withSuspense(Users),
  },
  {
    path: "/projects",
    element: withSuspense(Projects),
  },
  {
    path: "/settings",
    element: withSuspense(Settings),
  },
  {
    path: "/terms",
    element: withSuspense(Terms),
  },
  {
    path: "/tasks",
    element: withSuspense(Task),
  },
  {
    path: "/create-projects",
    element: withSuspense(CreateProjects),
  },
  {
    path: "/create-project",
    element: withSuspense(CreateProjects),
  },
  {
    path: "/create-tasks",
    element: withSuspense(CreateTasks),
  },
  {
    path: "/create-task",
    element: withSuspense(CreateTasks),
  },
  {
    path: "/example",
    element: withSuspense(Example),
  },
  {
    path: "/admin",
    element: withSuspense(AdminPanel),
  },
  {
    path: "/communication",
    element: withSuspense(Communication),
  },
  {
    path: "/help",
    element: withSuspense(Help),
  },
  {
    path: "/report",
    element: withSuspense(Report),
  },
  {
    path: "/appeal",
    element: withSuspense(Appeal),
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}