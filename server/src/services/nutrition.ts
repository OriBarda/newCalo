import { prisma } from "../lib/database";
import { OpenAIService, MealAnalysisResult } from "./openai";
import { MealAnalysisInput, MealUpdateInput } from "../types/nutrition";

interface SaveMealData {
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  confidence?: number;
  ingredients?: string[];
  servingSize?: string;
  cookingMethod?: string;
  healthNotes?: string;
}

export class NutritionService {
  static async analyzeMeal(user_id: string, data: MealAnalysisInput) {
    try {
      console.log("🔍 Starting meal analysis for user:", user_id);

      // Check user's AI request limits
      const user = await prisma.user.findUnique({
        where: { user_id },
        select: {
          aiRequestsCount: true,
          aiRequestsResetAt: true,
          subscription_type: true,
        },
      });

      if (user) {
        // Check if we need to reset daily limits
        const now = new Date();
        const resetTime = new Date(user.aiRequestsResetAt);
        const hoursSinceReset =
          (now.getTime() - resetTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
          await prisma.user.update({
            where: { user_id },
            data: {
              aiRequestsCount: 0,
              aiRequestsResetAt: now,
            },
          });
          user.aiRequestsCount = 0;
        }

        // Check limits based on subscription
        const limits = {
          FREE: 10,
          BASIC: 50,
          PREMIUM: 200,
        };

        const userLimit =
          limits[user.subscription_type as keyof typeof limits] || limits.FREE;

        if (user.aiRequestsCount >= userLimit) {
          throw new Error(
            `Daily AI analysis limit reached (${userLimit}). Upgrade your subscription for more analyses.`
          );
        }

        // Increment AI request count
        await prisma.user.update({
          where: { user_id },
          data: {
            aiRequestsCount: user.aiRequestsCount + 1,
          },
        });
      }

      // Analyze with OpenAI
      const analysis = await OpenAIService.analyzeMealImage(
        data.imageBase64,
        data.language,
        data.updateText
      );

      console.log("✅ Meal analysis completed successfully");

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      console.error("💥 Meal analysis error:", error);
      throw error;
    }
  }

  static async updateMeal(user_id: string, data: MealUpdateInput) {
    try {
      console.log("🔄 Updating meal for user:", user_id);

      // Find the meal
      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(data.meal_id),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      // Get original analysis data
      const originalAnalysis: MealAnalysisResult = {
        name: meal.meal_name || "Unknown Meal",
        description: meal.meal_name || "",
        calories: meal.calories || 0,
        protein: meal.protein_g || 0,
        carbs: meal.carbs_g || 0,
        fat: meal.fats_g || 0,
        fiber: meal.fiber_g || undefined,
        sugar: meal.sugar_g || undefined,
        sodium: meal.sodium_mg || undefined,
        confidence: 85, // Default confidence
        ingredients: [],
        servingSize: "1 serving",
        cookingMethod: "Unknown",
        healthNotes: "",
      };

      // Update analysis with OpenAI
      const updatedAnalysis = await OpenAIService.updateMealAnalysis(
        originalAnalysis,
        data.updateText,
        data.language
      );

      // Update meal in database
      const updatedMeal = await prisma.meal.update({
        where: { meal_id: parseInt(data.meal_id) },
        data: {
          meal_name: updatedAnalysis.name,
          calories: updatedAnalysis.calories,
          protein_g: updatedAnalysis.protein,
          carbs_g: updatedAnalysis.carbs,
          fats_g: updatedAnalysis.fat,
          fiber_g: updatedAnalysis.fiber,
          sugar_g: updatedAnalysis.sugar,
          sodium_mg: updatedAnalysis.sodium,
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(updatedMeal);

      console.log("✅ Meal updated successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Meal update error:", error);
      throw error;
    }
  }

  static async saveMeal(
    user_id: string,
    mealData: SaveMealData,
    imageBase64?: string
  ) {
    try {
      console.log("💾 Saving meal for user:", user_id);

      // Create meal record
      const meal = await prisma.meal.create({
        data: {
          user_id,
          image_url: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : "",
          analysis_status: "COMPLETED",
          meal_name: mealData.name,
          calories: mealData.calories,
          protein_g: mealData.protein,
          carbs_g: mealData.carbs,
          fats_g: mealData.fat,
          fiber_g: mealData.fiber,
          sugar_g: mealData.sugar,
          sodium_mg: mealData.sodium,
          upload_time: new Date(),
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(meal);

      console.log("✅ Meal saved successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Save meal error:", error);
      throw error;
    }
  }

  static async getUserMeals(user_id: string) {
    try {
      console.log("📥 Getting meals for user:", user_id);

      const meals = await prisma.meal.findMany({
        where: { user_id },
        orderBy: { upload_time: "desc" },
        take: 100, // Limit to recent 100 meals
      });

      // Transform to client format
      const transformedMeals = meals.map((meal) => this.transformMealData(meal));

      console.log("✅ Retrieved", transformedMeals.length, "meals");
      return transformedMeals;
    } catch (error) {
      console.error("💥 Get meals error:", error);
      throw error;
    }
  }

  static async getDailyStats(user_id: string, date: string) {
    try {
      console.log("📊 Getting daily stats for user:", user_id, "date:", date);

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const meals = await prisma.meal.findMany({
        where: {
          user_id,
          upload_time: {
            gte: startDate,
            lt: endDate,
          },
        },
      });

      // Calculate totals
      const stats = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein_g || 0),
          carbs: acc.carbs + (meal.carbs_g || 0),
          fat: acc.fat + (meal.fats_g || 0),
          fiber: acc.fiber + (meal.fiber_g || 0),
          sugar: acc.sugar + (meal.sugar_g || 0),
          mealCount: acc.mealCount + 1,
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          mealCount: 0,
        }
      );

      console.log("✅ Daily stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("💥 Get daily stats error:", error);
      throw error;
    }
  }

  // NEW METHODS FOR HISTORY FEATURES

  static async saveMealFeedback(
    user_id: string,
    mealId: string,
    feedback: {
      tasteRating?: number;
      satietyRating?: number;
      energyRating?: number;
      heavinessRating?: number;
    }
  ) {
    try {
      console.log("💬 Saving meal feedback for meal:", mealId);

      // Verify meal belongs to user
      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      // For now, store feedback in meal's additives_json field
      // In a production app, you might want a separate feedback table
      const updatedMeal = await prisma.meal.update({
        where: { meal_id: parseInt(mealId) },
        data: {
          additives_json: {
            ...((meal.additives_json as any) || {}),
            feedback: {
              tasteRating: feedback.tasteRating,
              satietyRating: feedback.satietyRating,
              energyRating: feedback.energyRating,
              heavinessRating: feedback.heavinessRating,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      });

      console.log("✅ Meal feedback saved successfully");
      return { success: true, meal: this.transformMealData(updatedMeal) };
    } catch (error) {
      console.error("💥 Save feedback error:", error);
      throw error;
    }
  }

  static async toggleMealFavorite(user_id: string, mealId: string) {
    try {
      console.log("❤️ Toggling favorite for meal:", mealId);

      // Verify meal belongs to user
      const meal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!meal) {
        throw new Error("Meal not found");
      }

      const currentFavorite =
        ((meal.additives_json as any)?.isFavorite as boolean) || false;
      const newFavoriteStatus = !currentFavorite;

      const updatedMeal = await prisma.meal.update({
        where: { meal_id: parseInt(mealId) },
        data: {
          additives_json: {
            ...((meal.additives_json as any) || {}),
            isFavorite: newFavoriteStatus,
            favoriteUpdatedAt: new Date().toISOString(),
          },
        },
      });

      console.log("✅ Meal favorite status toggled successfully");
      return {
        success: true,
        isFavorite: newFavoriteStatus,
        meal: this.transformMealData(updatedMeal),
      };
    } catch (error) {
      console.error("💥 Toggle favorite error:", error);
      throw error;
    }
  }

  static async duplicateMeal(
    user_id: string,
    mealId: string,
    newDate?: string
  ) {
    try {
      console.log("📋 Duplicating meal:", mealId, "for user:", user_id);

      // Find the original meal
      const originalMeal = await prisma.meal.findFirst({
        where: {
          meal_id: parseInt(mealId),
          user_id,
        },
      });

      if (!originalMeal) {
        throw new Error("Original meal not found");
      }

      // Create duplicate meal
      const duplicatedMeal = await prisma.meal.create({
        data: {
          user_id,
          image_url: originalMeal.image_url,
          analysis_status: "COMPLETED",
          meal_name: originalMeal.meal_name,
          calories: originalMeal.calories,
          protein_g: originalMeal.protein_g,
          carbs_g: originalMeal.carbs_g,
          fats_g: originalMeal.fats_g,
          saturated_fats_g: originalMeal.saturated_fats_g,
          polyunsaturated_fats_g: originalMeal.polyunsaturated_fats_g,
          monounsaturated_fats_g: originalMeal.monounsaturated_fats_g,
          omega_3_g: originalMeal.omega_3_g,
          omega_6_g: originalMeal.omega_6_g,
          fiber_g: originalMeal.fiber_g,
          soluble_fiber_g: originalMeal.soluble_fiber_g,
          insoluble_fiber_g: originalMeal.insoluble_fiber_g,
          sugar_g: originalMeal.sugar_g,
          cholesterol_mg: originalMeal.cholesterol_mg,
          sodium_mg: originalMeal.sodium_mg,
          alcohol_g: originalMeal.alcohol_g,
          caffeine_mg: originalMeal.caffeine_mg,
          liquids_ml: originalMeal.liquids_ml,
          serving_size_g: originalMeal.serving_size_g,
          allergens_json: originalMeal.allergens_json,
          vitamins_json: originalMeal.vitamins_json,
          micronutrients_json: originalMeal.micronutrients_json,
          glycemic_index: originalMeal.glycemic_index,
          insulin_index: originalMeal.insulin_index,
          food_category: originalMeal.food_category,
          processing_level: originalMeal.processing_level,
          cooking_method: originalMeal.cooking_method,
          additives_json: {
            ...((originalMeal.additives_json as any) || {}),
            duplicatedFrom: originalMeal.meal_id,
            duplicatedAt: new Date().toISOString(),
          },
          health_risk_notes: originalMeal.health_risk_notes,
          upload_time: newDate ? new Date(newDate) : new Date(),
        },
      });

      // Transform to client format
      const transformedMeal = this.transformMealData(duplicatedMeal);

      console.log("✅ Meal duplicated successfully");
      return transformedMeal;
    } catch (error) {
      console.error("💥 Duplicate meal error:", error);
      throw error;
    }
  }

  // Helper method to transform database meal to client format
  private static transformMealData(meal: any) {
    const additives = (meal.additives_json as any) || {};
    const feedback = additives.feedback || {};

    return {
      // Server fields (keep as-is)
      meal_id: meal.meal_id,
      user_id: meal.user_id,
      image_url: meal.image_url,
      upload_time: meal.upload_time?.toISOString(),
      analysis_status: meal.analysis_status,
      meal_name: meal.meal_name,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fats_g: meal.fats_g,
      fiber_g: meal.fiber_g,
      sugar_g: meal.sugar_g,
      sodium_mg: meal.sodium_mg,
      createdAt: meal.createdAt?.toISOString(),

      // Computed fields for compatibility
      id: meal.meal_id?.toString(),
      name: meal.meal_name || "Unknown Meal",
      description: meal.meal_name,
      imageUrl: meal.image_url,
      protein: meal.protein_g || 0,
      carbs: meal.carbs_g || 0,
      fat: meal.fats_g || 0,
      fiber: meal.fiber_g || 0,
      sugar: meal.sugar_g || 0,
      sodium: meal.sodium_mg || 0,
      userId: meal.user_id,

      // History features
      isFavorite: additives.isFavorite || false,
      tasteRating: feedback.tasteRating || 0,
      satietyRating: feedback.satietyRating || 0,
      energyRating: feedback.energyRating || 0,
      heavinessRating: feedback.heavinessRating || 0,

      // Optional fields
      saturated_fats_g: meal.saturated_fats_g,
      polyunsaturated_fats_g: meal.polyunsaturated_fats_g,
      monounsaturated_fats_g: meal.monounsaturated_fats_g,
      omega_3_g: meal.omega_3_g,
      omega_6_g: meal.omega_6_g,
      soluble_fiber_g: meal.soluble_fiber_g,
      insoluble_fiber_g: meal.insoluble_fiber_g,
      cholesterol_mg: meal.cholesterol_mg,
      alcohol_g: meal.alcohol_g,
      caffeine_mg: meal.caffeine_mg,
      liquids_ml: meal.liquids_ml,
      serving_size_g: meal.serving_size_g,
      allergens_json: meal.allergens_json,
      vitamins_json: meal.vitamins_json,
      micronutrients_json: meal.micronutrients_json,
      glycemic_index: meal.glycemic_index,
      insulin_index: meal.insulin_index,
      food_category: meal.food_category,
      processing_level: meal.processing_level,
      cooking_method: meal.cooking_method,
      additives_json: meal.additives_json,
      health_risk_notes: meal.health_risk_notes,
    };
  }
}