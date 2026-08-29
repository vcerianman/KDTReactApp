import React from 'react';
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom';
import logo from './logo.svg';
import './App.css';
import NavBar from './NavBar';
import Home from './Home';
import Login from './Login';
import Profile from './Profile';
import Users from './Users';
import Projects from './Projects';
import Settings from './Settings';
import Terms from './Terms';
import Task from './Task';
import CreateProjects from './CreateProjects';
import CreateTasks from './CreateTasks';

// Generic placeholder page component for pages still under construction
function PlaceholderPage({ title, description }) {
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

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainApp />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/profile/:id",
    element: <Profile />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "/projects",
    element: <Projects />,
  },
  {
    path: "/settings",
    element: <Settings />,
  },
  {
    path: "/terms",
    element: <Terms />,
  },
  {
    path: "/tasks",
    element: <Task />,
  },
  {
    path: "/create-projects",
    element: <CreateProjects />,
  },
  {
    path: "/create-project",
    element: <CreateProjects />,
  },
  {
    path: "/create-tasks",
    element: <CreateTasks />,
  },
  {
    path: "/create-task",
    element: <CreateTasks />,
  },
  {
    path: "/help",
    element: <PlaceholderPage title="Help & Support" description="Documentation, FAQs, and support." />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
