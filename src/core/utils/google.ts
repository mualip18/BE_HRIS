
import axios from "axios";

export interface GoogleUserPayload {
  email: string;
  name: string;
  picture?: string;
}

interface GoogleUserInfoResponse {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export const verifyGoogleToken = async (
  accessToken: string
): Promise<GoogleUserPayload> => {
  if (!accessToken || typeof accessToken !== "string") {
    throw new Error("Google access token is required");
  }

  try {
    const { data } = await axios.get<GoogleUserInfoResponse>(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        timeout: 10000,
      }
    );

    if (!data.email) {
      throw new Error("Google email not found");
    }

    if (data.email_verified !== true) {
      throw new Error("Email not verified by Google");
    }

    return {
      email: data.email.trim().toLowerCase(),
      name: data.name?.trim() || "Google User",
      picture: data.picture || "",
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error("[GOOGLE VERIFY ERROR]", {
        status: error.response?.status,
        message: error.message,
      });

      throw new Error(
        error.response?.status === 401
          ? "Google token verification failed"
          : "Unable to verify Google account"
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Google token verification failed");
  }
};
