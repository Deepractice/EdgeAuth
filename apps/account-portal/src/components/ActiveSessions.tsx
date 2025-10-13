import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessions, logoutSession, logoutAllSessions } from "../lib/api";
import { getToken } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../lib/time";

export default function ActiveSessions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = getToken();

  const {
    data: sessions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      if (!token) {
        throw new Error("No token found");
      }
      return getSessions(token);
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!token) {
        throw new Error("No token found");
      }
      return logoutSession(token, sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      if ((error as Error).message === "Unauthorized") {
        navigate("/login");
      }
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error("No token found");
      }
      return logoutAllSessions(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      if ((error as Error).message === "Unauthorized") {
        navigate("/login");
      }
    },
  });

  if (error) {
    if ((error as Error).message === "Unauthorized") {
      navigate("/login");
      return null;
    }
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">
          Failed to load sessions: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!sessions) {
    return null;
  }

  // Ensure sessions is an array
  if (!Array.isArray(sessions)) {
    console.error("Sessions is not an array:", sessions);
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">
          Invalid session data format. Please try logging in again.
        </div>
      </div>
    );
  }

  const truncateId = (id: string) => {
    if (id.length <= 13) return id;
    return `${id.slice(0, 6)}...${id.slice(-6)}`;
  };

  const handleLogout = (sessionId: string) => {
    if (window.confirm("Are you sure you want to logout this session?")) {
      logoutMutation.mutate(sessionId);
    }
  };

  const handleLogoutAll = () => {
    if (
      window.confirm(
        "Are you sure you want to logout all other sessions? This will keep your current session active.",
      )
    ) {
      logoutAllMutation.mutate();
    }
  };

  // Show message if no sessions found
  if (sessions.length === 0) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Active Sessions
        </h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <svg
              className="w-5 h-5 text-blue-600 mr-3 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 mb-1">
                No active sessions found
              </h3>
              <p className="text-sm text-blue-700">
                Please log out and log back in to enable session tracking.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Active Sessions</h1>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* Session ID */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-600">
                    {truncateId(session.id)}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                    Active
                  </span>
                  {session.isCurrent && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Current
                    </span>
                  )}
                </div>

                {/* Session Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {formatRelativeTime(session.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Last accessed:</span>
                    <span className="ml-2 text-gray-900">
                      {formatRelativeTime(session.lastAccessedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Expires:</span>
                    <span className="ml-2 text-gray-900">
                      {formatRelativeTime(session.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => handleLogout(session.id)}
                disabled={session.isCurrent || logoutMutation.isPending}
                className="ml-4 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {session.isCurrent ? "Current Session" : "Logout Session"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
        <div className="text-gray-700">
          <span className="font-medium">Total:</span>{" "}
          <span className="text-lg">{sessions.length}</span>{" "}
          <span>active session{sessions.length !== 1 ? "s" : ""}</span>
        </div>
        <button
          onClick={handleLogoutAll}
          disabled={sessions.length <= 1 || logoutAllMutation.isPending}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {logoutAllMutation.isPending
            ? "Logging out..."
            : "Logout All Other Sessions"}
        </button>
      </div>
    </div>
  );
}
