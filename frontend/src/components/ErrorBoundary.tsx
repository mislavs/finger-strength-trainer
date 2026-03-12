import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled UI error", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
          <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                The app hit an unexpected error and could not continue.
              </p>
            </div>
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground break-words">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <Button onClick={this.handleReload} type="button">
              Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
