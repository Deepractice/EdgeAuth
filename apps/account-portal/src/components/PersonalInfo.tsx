import { useQuery } from "@tanstack/react-query";
import { getProfile } from "../lib/api";
import { getToken } from "../lib/auth";
import { useNavigate } from "react-router-dom";

export default function PersonalInfo() {
  const navigate = useNavigate();
  const token = getToken();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      if (!token) {
        throw new Error("No token found");
      }
      return getProfile(token);
    },
    retry: false,
  });

  if (error) {
    if ((error as Error).message === "Unauthorized") {
      navigate("/login");
      return null;
    }
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600">
          Failed to load profile: {(error as Error).message}
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

  if (!profile) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Personal Info</h1>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Username */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Username
            </label>
            <p className="text-lg text-gray-900 mt-1">{profile.username}</p>
          </div>
          <button
            disabled
            className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
          >
            Edit
          </button>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg text-gray-900">{profile.email}</p>
              {profile.emailVerified && (
                <span className="inline-flex items-center text-green-600">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm ml-1">Verified</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Registration Date */}
        <div>
          <label className="text-sm font-medium text-gray-500">
            Member Since
          </label>
          <p className="text-lg text-gray-900 mt-1">
            {formatDate(profile.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
