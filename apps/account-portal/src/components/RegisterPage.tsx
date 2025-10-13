import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { register } from "~/lib/api";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      setSuccess(true);
      setError(null);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (email: string, username: string, password: string) => {
    setError(null);
    registerMutation.mutate({ email, username, password });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                Check Your Email
              </h1>
              <p className="text-gray-600 mt-2">
                We've sent a verification link to your email address
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-4 text-sm text-gray-600">
              <p>To complete your registration:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Check your email inbox</li>
                <li>Click the verification link</li>
                <li>Sign in to your account</li>
              </ol>
            </div>

            {/* Back to Login */}
            <div className="mt-8">
              <a
                href="/login"
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                Back to Sign In
              </a>
            </div>
          </div>

          {/* Deepractice Footer */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              Powered by{" "}
              <a
                href="https://deepractice.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Deepractice
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Sign up for EdgeAuth</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Register Form */}
          <RegisterForm
            onSubmit={handleSubmit}
            isLoading={registerMutation.isPending}
          />

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              Already have an account?{" "}
              <a
                href="/login"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in
              </a>
            </p>
          </div>
        </div>

        {/* Deepractice Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Powered by{" "}
            <a
              href="https://deepractice.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Deepractice
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
