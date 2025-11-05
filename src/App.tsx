import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { ChatInterface } from "./ChatInterface";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Devil's Advocate</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl mx-auto h-full">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-section h-full">
      <Authenticated>
        <ChatInterface />
      </Authenticated>

      <Unauthenticated>
        <div className="flex flex-col items-center justify-center gap-8 h-full">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-primary mb-4">Devil's Advocate</h1>
            <p className="text-xl text-secondary mb-2">
              Get thoughtful counterpoints to your ideas
            </p>
            <p className="text-gray-600 max-w-md mx-auto">
              A chatbot that helps you see the other side of things - not to discourage you, 
              but to help you make better-informed decisions.
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
