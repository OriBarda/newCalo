import axios from "axios";
import { SignInData, SignUpData, MealAnalysisData, Meal } from "../types";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Get the correct API URL based on platform
const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    // For web development, use localhost
    return "http://localhost:5000/api";
  } else {
    // For mobile devices, use your computer's IP address
    // Updated with your correct IP address
    return "http://192.168.1.70:5000/api";
  }
};

const API_BASE_URL = getApiBaseUrl();

console.log("🌐 API Base URL:", API_BASE_URL);
console.log("📱 Platform:", Platform.OS);

// Create axios instance with optimizations
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: Platform.OS === "web", // Only enable credentials for web (cookies)
  maxRedirects: 3,
});

// Request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Helper function to create request key for deduplication
const createRequestKey = (config: any): string => {
  return `${config.method?.toUpperCase()}-${config.url}-${JSON.stringify(
    config.params || {}
  )}-${JSON.stringify(config.data || {})}`;
};

// SECURE TOKEN STORAGE - Use SecureStore for mobile, cookies for web
const STORAGE_KEY = "auth_token_secure";

// Helper function to get token - Use SecureStore for mobile, cookies for web
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "web") {
      // For web, cookies are handled automatically by withCredentials
      console.log("🌐 Web platform - cookies handled automatically");
      return null; // Don't need to manually handle tokens on web
    } else {
      // For mobile, use SecureStore
      console.log("📱 Mobile platform - getting token from SecureStore");

      try {
        const token = await SecureStore.getItemAsync(STORAGE_KEY);
        console.log(
          "🔐 Token retrieved from SecureStore:",
          token ? "Found" : "Not found"
        );
        return token;
      } catch (secureStoreError) {
        console.error("💥 SecureStore get failed:", secureStoreError);
        return null;
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to get auth token:", error);
    return null;
  }
};

// Helper function to store token - Use SecureStore for mobile
const storeAuthToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      // For web, cookies are handled by the server
      console.log("🌐 Web token will be stored via server cookie");
    } else {
      // For mobile, use SecureStore
      console.log("📱 Mobile platform - storing token in SecureStore");

      try {
        await SecureStore.setItemAsync(STORAGE_KEY, token);
        console.log("🔐 Token stored in SecureStore successfully");
      } catch (secureStoreError) {
        console.error("💥 SecureStore storage failed:", secureStoreError);
        throw new Error("Failed to store authentication token securely");
      }
    }
    console.log("🔐 Token stored securely");
  } catch (error) {
    console.error("⚠️ Failed to store auth token:", error);
    throw error;
  }
};

// Helper function to clear token - Use SecureStore for mobile
const clearAuthToken = async (): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      // For web, cookies are cleared by server
      console.log("🌐 Web token will be cleared by server");
    } else {
      // For mobile, clear SecureStore
      console.log("📱 Mobile platform - clearing token from SecureStore");

      try {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
        console.log("🔐 Token cleared from SecureStore successfully");
      } catch (secureStoreError) {
        console.warn(
          "⚠️ SecureStore clear failed (non-critical):",
          secureStoreError
        );
      }
    }
    console.log("🗑️ Token cleared securely");
  } catch (error) {
    console.warn("⚠️ Failed to clear auth token:", error);
  }
};

// Helper function to transform server meal data to client format
const transformMealData = (serverMeal: any): Meal => {
  console.log("🔄 Transforming meal data:", serverMeal);

  const transformed = {
    // Server fields (keep as-is)
    meal_id: serverMeal.meal_id,
    user_id: serverMeal.user_id,
    image_url: serverMeal.image_url,
    upload_time: serverMeal.upload_time,
    analysis_status: serverMeal.analysis_status,
    meal_name: serverMeal.meal_name,
    calories: serverMeal.calories,
    protein_g: serverMeal.protein_g,
    carbs_g: serverMeal.carbs_g,
    fats_g: serverMeal.fats_g,
    fiber_g: serverMeal.fiber_g,
    sugar_g: serverMeal.sugar_g,
    sodium_mg: serverMeal.sodium_mg,
    createdAt: serverMeal.createdAt,

    // Computed fields for compatibility
    id: serverMeal.meal_id?.toString() || serverMeal.id,
    name: serverMeal.meal_name || "Unknown Meal",
    description: serverMeal.meal_name,
    imageUrl: serverMeal.image_url,
    protein: serverMeal.protein_g || 0,
    carbs: serverMeal.carbs_g || 0,
    fat: serverMeal.fats_g || 0,
    fiber: serverMeal.fiber_g || 0,
    sugar: serverMeal.sugar_g || 0,
    sodium: serverMeal.sodium_mg || 0,
    userId: serverMeal.user_id,

    // History features
    isFavorite: serverMeal.isFavorite || false,
    tasteRating: serverMeal.tasteRating || 0,
    satietyRating: serverMeal.satietyRating || 0,
    energyRating: serverMeal.energyRating || 0,
    heavinessRating: serverMeal.heavinessRating || 0,

    // Optional fields
    saturated_fats_g: serverMeal.saturated_fats_g,
    polyunsaturated_fats_g: serverMeal.polyunsaturated_fats_g,
    monounsaturated_fats_g: serverMeal.monounsaturated_fats_g,
    omega_3_g: serverMeal.omega_3_g,
    omega_6_g: serverMeal.omega_6_g,
    soluble_fiber_g: serverMeal.soluble_fiber_g,
    insoluble_fiber_g: serverMeal.insoluble_fiber_g,
    cholesterol_mg: serverMeal.cholesterol_mg,
    alcohol_g: serverMeal.alcohol_g,
    caffeine_mg: serverMeal.caffeine_mg,
    liquids_ml: serverMeal.liquids_ml,
    serving_size_g: serverMeal.serving_size_g,
    allergens_json: serverMeal.allergens_json,
    vitamins_json: serverMeal.vitamins_json,
    micronutrients_json: serverMeal.micronutrients_json,
    glycemic_index: serverMeal.glycemic_index,
    insulin_index: serverMeal.insulin_index,
    food_category: serverMeal.food_category,
    processing_level: serverMeal.processing_level,
    cooking_method: serverMeal.cooking_method,
    additives_json: serverMeal.additives_json,
    health_risk_notes: serverMeal.health_risk_notes,
  };

  console.log("✅ Transformed meal:", transformed);
  return transformed;
};

// Request interceptor with deduplication and auth token
api.interceptors.request.use(
  async (config) => {
    try {
      console.log("🔄 Making request to:", config.url);
      console.log("📱 Platform:", Platform.OS);

      // Add request deduplication for GET requests
      if (config.method?.toLowerCase() === "get") {
        const requestKey = createRequestKey(config);
        if (pendingRequests.has(requestKey)) {
          console.log("⚡ Using deduplicated request for:", config.url);
          return pendingRequests.get(requestKey);
        }
      }

      if (Platform.OS !== "web") {
        // Only add Authorization header for mobile
        const token = await getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("🔐 Added auth token to mobile request");
        } else {
          console.log("⚠️ No auth token found for mobile request");
        }
      } else {
        console.log("🌐 Web request - cookies will be sent automatically");
      }
    } catch (error) {
      console.warn("⚠️ Failed to get auth token for request:", error);
    }
    return config;
  },
  (error) => {
    console.error("🚨 Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor with deduplication cleanup and error handling
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response success:", response.config.url);

    // Clean up pending request for GET requests
    if (response.config.method?.toLowerCase() === "get") {
      const requestKey = createRequestKey(response.config);
      pendingRequests.delete(requestKey);
    }

    return response;
  },
  async (error) => {
    console.error("🚨 API Response Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
    });

    // Clean up pending request on error
    if (error.config?.method?.toLowerCase() === "get") {
      const requestKey = createRequestKey(error.config);
      pendingRequests.delete(requestKey);
    }

    // Check for network errors
    if (error.code === "NETWORK_ERROR" || error.message === "Network Error") {
      console.error("🌐 Network connectivity issue detected");
      console.error("💡 Check if your server is running and accessible");
      console.error("💡 Verify your IP address in the API configuration");
    }

    if (error.response?.status === 401) {
      // Token expired or invalid - clear stored token
      try {
        await clearAuthToken();
        console.log("🗑️ Cleared invalid token");
      } catch (clearError) {
        console.warn("⚠️ Failed to clear token:", clearError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  signIn: async (data: SignInData) => {
    try {
      console.log("🔑 Attempting sign in...");
      console.log("🌐 API URL:", `${API_BASE_URL}/auth/signin`);

      const response = await api.post("/auth/signin", data);

      // Store token for mobile only (web uses cookies)
      if (
        Platform.OS !== "web" &&
        response.data.success &&
        response.data.token
      ) {
        await storeAuthToken(response.data.token);
        console.log("✅ Sign in successful, token stored securely for mobile");
      } else if (Platform.OS === "web") {
        console.log("✅ Sign in successful, cookie set by server for web");
      }

      return response.data;
    } catch (error: any) {
      console.error("💥 Sign in error:", error);

      // Provide more specific error messages
      if (error.code === "NETWORK_ERROR" || error.message === "Network Error") {
        throw new Error(
          "Cannot connect to server. Please check your internet connection and ensure the server is running."
        );
      }

      throw error;
    }
  },

  signUp: async (data: SignUpData) => {
    try {
      console.log("📝 Attempting sign up...");
      console.log("🌐 API URL:", `${API_BASE_URL}/auth/signup`);

      const response = await api.post("/auth/signup", data);

      // Store token for mobile only (web uses cookies)
      if (
        Platform.OS !== "web" &&
        response.data.success &&
        response.data.token
      ) {
        await storeAuthToken(response.data.token);
        console.log("✅ Sign up successful, token stored securely for mobile");
      } else if (Platform.OS === "web") {
        console.log("✅ Sign up successful, cookie set by server for web");
      }

      return response.data;
    } catch (error: any) {
      console.error("💥 Sign up error:", error);

      // Provide more specific error messages
      if (error.code === "NETWORK_ERROR" || error.message === "Network Error") {
        throw new Error(
          "Cannot connect to server. Please check your internet connection and ensure the server is running."
        );
      }

      throw error;
    }
  },

  signOut: async () => {
    try {
      // Call server signout endpoint to clear server-side session and cookie
      await api.post("/auth/signout");

      // Clear local storage
      await clearAuthToken();
      console.log("🔓 Auth token cleared securely");
    } catch (error) {
      console.error("💥 Sign out error:", error);
      // Even if server call fails, clear local storage
      await clearAuthToken();
      throw error;
    }
  },

  getStoredToken: async () => {
    try {
      return await getAuthToken();
    } catch (error) {
      console.error("💥 Get stored token error:", error);
      return null;
    }
  },
};

export const nutritionAPI = {
  analyzeMeal: async (
    imageBase64: string
  ): Promise<{ success: boolean; data?: MealAnalysisData; error?: string }> => {
    try {
      console.log("🔍 Making analyze meal API request...");
      console.log("📊 Base64 length:", imageBase64.length);

      const response = await api.post("/nutrition/analyze", {
        imageBase64: imageBase64,
        language: "english",
        date: new Date().toISOString().split("T")[0],
      });

      console.log("🎯 RAW ANALYZE API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      return response.data;
    } catch (error: any) {
      console.error("💥 Analyze meal API error:", error);

      if (error.response) {
        console.error("Error response:", error.response.data);
        return {
          success: false,
          error: error.response.data?.error || "Server error occurred",
        };
      } else if (error.request) {
        console.error("Network error:", error.request);
        return {
          success: false,
          error: "Network error - please check your connection and server IP",
        };
      } else {
        console.error("Request setup error:", error.message);
        return {
          success: false,
          error: error.message || "Failed to make request",
        };
      }
    }
  },

  updateMeal: async (
    meal_id: string,
    updateText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      console.log("🔄 Making update meal API request...");
      console.log("🆔 Meal ID:", meal_id);
      console.log("📝 Update text:", updateText);

      const response = await api.put("/nutrition/update", {
        meal_id,
        updateText,
        language: "english",
      });

      console.log("🎯 RAW UPDATE API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success && response.data.data) {
        // Transform the meal data
        const transformedMeal = transformMealData(response.data.data);
        return {
          success: true,
          data: transformedMeal,
        };
      }

      return response.data;
    } catch (error: any) {
      console.error("💥 Update meal API error:", error);

      if (error.response) {
        console.error("Error response:", error.response.data);
        return {
          success: false,
          error: error.response.data?.error || "Server error occurred",
        };
      } else if (error.request) {
        console.error("Network error:", error.request);
        return {
          success: false,
          error: "Network error - please check your connection and server IP",
        };
      } else {
        console.error("Request setup error:", error.message);
        return {
          success: false,
          error: error.message || "Failed to make request",
        };
      }
    }
  },

  saveMeal: async (
    mealData: MealAnalysisData,
    imageBase64?: string
  ): Promise<Meal> => {
    try {
      console.log("📤 Making save meal API request...");

      const response = await api.post("/nutrition/save", {
        mealData,
        imageBase64,
      });

      console.log("🎯 RAW SAVE API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success && response.data.data) {
        return transformMealData(response.data.data);
      } else {
        throw new Error(response.data.error || "Failed to save meal");
      }
    } catch (error: any) {
      console.error("💥 Save meal API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to save meal");
      }
    }
  },

  getMeals: async (offset = 0, limit = 100): Promise<Meal[]> => {
    try {
      console.log("📥 Making get meals API request...");

      const response = await api.get("/nutrition/meals", {
        params: { offset, limit },
      });

      console.log("🎯 RAW GET MEALS API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success) {
        const meals = response.data.data || [];
        console.log("🔄 Transforming", meals.length, "meals...");

        // Transform each meal to match our interface
        const transformedMeals = meals.map((meal: any) =>
          transformMealData(meal)
        );

        console.log("✅ Transformed meals:", transformedMeals.length);
        return transformedMeals;
      } else {
        throw new Error(response.data.error || "Failed to fetch meals");
      }
    } catch (error: any) {
      console.error("💥 Get meals API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to fetch meals");
      }
    }
  },

  getDailyStats: async (date: string) => {
    try {
      console.log("📊 Making get daily stats API request for date:", date);

      const response = await api.get(`/nutrition/stats/${date}`);

      console.log("🎯 RAW DAILY STATS API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to fetch daily stats");
      }
    } catch (error: any) {
      console.error("💥 Get daily stats API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to fetch daily stats");
      }
    }
  },

  // NEW API METHODS FOR HISTORY FEATURES
  saveMealFeedback: async (
    mealId: string,
    feedback: {
      tasteRating?: number;
      satietyRating?: number;
      energyRating?: number;
      heavinessRating?: number;
    }
  ) => {
    try {
      console.log("💬 Making save meal feedback API request...");
      console.log("🆔 Meal ID:", mealId);
      console.log("📊 Feedback:", feedback);

      const response = await api.post(
        `/nutrition/meals/${mealId}/feedback`,
        feedback
      );

      console.log("✅ Save feedback response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("💥 Save feedback API error:", error);
      throw error;
    }
  },

  toggleMealFavorite: async (mealId: string) => {
    try {
      console.log("❤️ Making toggle meal favorite API request...");
      console.log("🆔 Meal ID:", mealId);

      const response = await api.post(`/nutrition/meals/${mealId}/favorite`);

      console.log("✅ Toggle favorite response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("💥 Toggle favorite API error:", error);
      throw error;
    }
  },

  duplicateMeal: async (mealId: string, newDate?: string) => {
    try {
      console.log("📋 Making duplicate meal API request...");
      console.log("🆔 Meal ID:", mealId);
      console.log("📅 New date:", newDate);

      // Ensure we're sending the correct meal ID format
      const requestData = {
        newDate: newDate || new Date().toISOString().split("T")[0],
      };

      console.log("📤 Request data:", requestData);
      console.log("🔗 Request URL:", `/nutrition/meals/${mealId}/duplicate`);

      const response = await api.post(
        `/nutrition/meals/${mealId}/duplicate`,
        requestData
      );

      console.log("✅ Duplicate meal response:", response.data);

      if (response.data.success && response.data.data) {
        return {
          success: true,
          data: transformMealData(response.data.data),
        };
      }

      return response.data;
    } catch (error: any) {
      console.error("💥 Duplicate meal API error:", error);
      console.error("💥 Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
      });
      throw error;
    }
  },
};

// NEW CALENDAR API
export const calendarAPI = {
  getCalendarData: async (year: number, month: number) => {
    try {
      console.log("📅 Making get calendar data API request...");
      console.log("📊 Year:", year, "Month:", month);

      const response = await api.get(`/calendar/data/${year}/${month}`);

      console.log("🎯 RAW CALENDAR DATA API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to fetch calendar data");
      }
    } catch (error: any) {
      console.error("💥 Get calendar data API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to fetch calendar data");
      }
    }
  },

  getStatistics: async (year: number, month: number) => {
    try {
      console.log("📊 Making get statistics API request...");
      console.log("📊 Year:", year, "Month:", month);

      const response = await api.get(`/calendar/statistics/${year}/${month}`);

      console.log("🎯 RAW STATISTICS API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to fetch statistics");
      }
    } catch (error: any) {
      console.error("💥 Get statistics API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to fetch statistics");
      }
    }
  },

  addEvent: async (date: string, title: string, type: string) => {
    try {
      console.log("📝 Making add event API request...");
      console.log("📅 Date:", date, "Title:", title, "Type:", type);

      const response = await api.post("/calendar/events", {
        date,
        title,
        type,
      });

      console.log("✅ Add event response:", response.data);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "Failed to add event");
      }
    } catch (error: any) {
      console.error("💥 Add event API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to add event");
      }
    }
  },
};

// NEW USER API METHODS
export const userAPI = {
  getGlobalStatistics: async () => {
    try {
      console.log("📊 Making get global statistics API request...");

      const response = await api.get("/user/global-statistics");

      console.log("🎯 RAW GLOBAL STATISTICS API RESPONSE:");
      console.log("=====================================");
      console.log("📋 Full Response:", JSON.stringify(response.data, null, 2));
      console.log("=====================================");

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(
          response.data.error || "Failed to fetch global statistics"
        );
      }
    } catch (error: any) {
      console.error("💥 Get global statistics API error:", error);

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to fetch global statistics");
      }
    }
  },
};