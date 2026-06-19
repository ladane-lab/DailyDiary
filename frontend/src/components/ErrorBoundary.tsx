"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "var(--bg-primary, #fdfbf7)",
          color: "var(--text-primary, #1c1917)",
          fontFamily: "var(--font-sans, sans-serif)"
        }}>
          <div style={{
            fontSize: "4rem",
            marginBottom: "1rem"
          }}>
            ⚠️
          </div>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem", fontWeight: "700" }}>Something went wrong</h2>
          <p style={{ color: "var(--text-secondary, #78716c)", marginBottom: "1.5rem", maxWidth: "500px" }}>
            We encountered an unexpected error. Please try reloading the page.
          </p>
          {this.state.error && process.env.NODE_ENV !== "production" && (
            <pre style={{
              backgroundColor: "var(--bg-secondary, rgba(0,0,0,0.05))",
              padding: "1rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              textAlign: "left",
              maxWidth: "600px",
              overflowX: "auto",
              marginBottom: "1.5rem",
              border: "1px solid var(--border, rgba(0,0,0,0.1))"
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--accent, #e76f51)",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "600",
              cursor: "pointer",
              transition: "opacity 0.2s"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
