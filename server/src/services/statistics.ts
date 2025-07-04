import { prisma } from "../lib/database";

export interface NutritionStatistics {
  averageCaloriesDaily: number;
  calorieGoalAchievementPercent: number;
  averageProteinDaily: number;
  averageCarbsDaily: number;
  averageFatsDaily: number;
  averageFiberDaily: number;
  averageSodiumDaily: number;
  averageSugarDaily: number;
  averageFluidsDaily: number;
  processedFoodPercentage: number;
  alcoholCaffeineIntake: number;
  vegetableFruitIntake: number;
  fullLoggingPercentage: number;
  allergenAlerts: string[];
  healthRiskPercentage: number;
  averageEatingHours: { start: string; end: string };
  intermittentFastingHours: number;
  missedMealsAlert: number;
  nutritionScore: number;
  weeklyTrends: {
    calories: number[];
    protein: number[];
    carbs: number[];
    fats: number[];
  };
  insights: string[];
  recommendations: string[];
  generalStats: {
    averageCaloriesPerMeal: number;
    averageProteinPerMeal: number;
    mostCommonMealTime: string;
    averageMealsPerDay: number;
  };
  healthInsights: {
    proteinAdequacy: string;
    calorieDistribution: string;
    fiberIntake: string;
  };
}

export class StatisticsService {
  static async getNutritionStatistics(
    userId: string,
    period: "week" | "month" | "custom" = "week"
  ): Promise<NutritionStatistics> {
    try {
      console.log(`📊 Generating statistics for user ${userId}, period: ${period}`);

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setDate(endDate.getDate() - 30);
          break;
        case "custom":
          startDate.setDate(endDate.getDate() - 14); // Default to 2 weeks
          break;
      }

      // Fetch user's meals for the period
      const meals = await prisma.meal.findMany({
        where: {
          user_id: userId,
          upload_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          upload_time: "asc",
        },
      });

      console.log(`📈 Found ${meals.length} meals for analysis`);

      if (meals.length === 0) {
        return this.getDefaultStatistics();
      }

      // Calculate basic nutrition averages
      const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      const totals = meals.reduce(
        (acc, meal) => ({
          calories: acc.calories + (meal.calories || 0),
          protein: acc.protein + (meal.protein_g || 0),
          carbs: acc.carbs + (meal.carbs_g || 0),
          fats: acc.fats + (meal.fats_g || 0),
          fiber: acc.fiber + (meal.fiber_g || 0),
          sodium: acc.sodium + (meal.sodium_mg || 0),
          sugar: acc.sugar + (meal.sugar_g || 0),
          fluids: acc.fluids + (meal.liquids_ml || 0),
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          fiber: 0,
          sodium: 0,
          sugar: 0,
          fluids: 0,
        }
      );

      // Calculate daily averages
      const averageCaloriesDaily = totals.calories / totalDays;
      const averageProteinDaily = totals.protein / totalDays;
      const averageCarbsDaily = totals.carbs / totalDays;
      const averageFatsDaily = totals.fats / totalDays;
      const averageFiberDaily = totals.fiber / totalDays;
      const averageSodiumDaily = totals.sodium / totalDays;
      const averageSugarDaily = totals.sugar / totalDays;
      const averageFluidsDaily = totals.fluids / totalDays;

      // Calculate goal achievement (assuming 2000 cal goal)
      const calorieGoal = 2000;
      const calorieGoalAchievementPercent = Math.min(100, (averageCaloriesDaily / calorieGoal) * 100);

      // Calculate processed food percentage
      const processedFoodCount = meals.filter(meal => 
        meal.processing_level === "HIGHLY_PROCESSED" || 
        meal.processing_level === "PROCESSED"
      ).length;
      const processedFoodPercentage = meals.length > 0 ? (processedFoodCount / meals.length) * 100 : 0;

      // Calculate weekly trends
      const weeklyTrends = this.calculateWeeklyTrends(meals, startDate, endDate);

      // Calculate nutrition score
      const nutritionScore = this.calculateNutritionScore({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        processedFoodPercentage,
        calorieGoalAchievementPercent,
      });

      // Generate insights and recommendations
      const insights = this.generateInsights({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        processedFoodPercentage,
        nutritionScore,
        mealCount: meals.length,
        totalDays,
      });

      const recommendations = this.generateRecommendations({
        averageCaloriesDaily,
        averageProteinDaily,
        averageFiberDaily,
        processedFoodPercentage,
        nutritionScore,
      });

      // Calculate eating patterns
      const eatingHours = this.calculateEatingHours(meals);
      const intermittentFastingHours = this.calculateIntermittentFasting(eatingHours);

      // Calculate general stats
      const averageCaloriesPerMeal = meals.length > 0 ? totals.calories / meals.length : 0;
      const averageProteinPerMeal = meals.length > 0 ? totals.protein / meals.length : 0;
      const mostCommonMealTime = this.getMostCommonMealTime(meals);
      const averageMealsPerDay = meals.length / totalDays;

      const statistics: NutritionStatistics = {
        averageCaloriesDaily: Math.round(averageCaloriesDaily),
        calorieGoalAchievementPercent: Math.round(calorieGoalAchievementPercent),
        averageProteinDaily: Math.round(averageProteinDaily),
        averageCarbsDaily: Math.round(averageCarbsDaily),
        averageFatsDaily: Math.round(averageFatsDaily),
        averageFiberDaily: Math.round(averageFiberDaily),
        averageSodiumDaily: Math.round(averageSodiumDaily),
        averageSugarDaily: Math.round(averageSugarDaily),
        averageFluidsDaily: Math.round(averageFluidsDaily),
        processedFoodPercentage: Math.round(processedFoodPercentage),
        alcoholCaffeineIntake: this.calculateAlcoholCaffeine(meals),
        vegetableFruitIntake: this.calculateVegetableFruitIntake(meals),
        fullLoggingPercentage: this.calculateFullLoggingPercentage(meals, totalDays),
        allergenAlerts: this.extractAllergenAlerts(meals),
        healthRiskPercentage: this.calculateHealthRiskPercentage(meals),
        averageEatingHours: eatingHours,
        intermittentFastingHours,
        missedMealsAlert: this.calculateMissedMeals(totalDays, meals.length),
        nutritionScore,
        weeklyTrends,
        insights,
        recommendations,
        generalStats: {
          averageCaloriesPerMeal: Math.round(averageCaloriesPerMeal),
          averageProteinPerMeal: Math.round(averageProteinPerMeal),
          mostCommonMealTime,
          averageMealsPerDay: Math.round(averageMealsPerDay * 10) / 10,
        },
        healthInsights: {
          proteinAdequacy: this.getProteinAdequacyInsight(averageProteinDaily),
          calorieDistribution: this.getCalorieDistributionInsight(averageCaloriesDaily),
          fiberIntake: this.getFiberIntakeInsight(averageFiberDaily),
        },
      };

      console.log("✅ Statistics generated successfully");
      return statistics;
    } catch (error) {
      console.error("💥 Error generating statistics:", error);
      throw new Error("Failed to generate nutrition statistics");
    }
  }

  private static getDefaultStatistics(): NutritionStatistics {
    return {
      averageCaloriesDaily: 0,
      calorieGoalAchievementPercent: 0,
      averageProteinDaily: 0,
      averageCarbsDaily: 0,
      averageFatsDaily: 0,
      averageFiberDaily: 0,
      averageSodiumDaily: 0,
      averageSugarDaily: 0,
      averageFluidsDaily: 0,
      processedFoodPercentage: 0,
      alcoholCaffeineIntake: 0,
      vegetableFruitIntake: 0,
      fullLoggingPercentage: 0,
      allergenAlerts: [],
      healthRiskPercentage: 0,
      averageEatingHours: { start: "08:00", end: "20:00" },
      intermittentFastingHours: 12,
      missedMealsAlert: 0,
      nutritionScore: 50,
      weeklyTrends: {
        calories: [0, 0, 0, 0, 0, 0, 0],
        protein: [0, 0, 0, 0, 0, 0, 0],
        carbs: [0, 0, 0, 0, 0, 0, 0],
        fats: [0, 0, 0, 0, 0, 0, 0],
      },
      insights: ["Start logging meals to see personalized insights!"],
      recommendations: ["Begin by logging your meals regularly to get personalized recommendations."],
      generalStats: {
        averageCaloriesPerMeal: 0,
        averageProteinPerMeal: 0,
        mostCommonMealTime: "12:00",
        averageMealsPerDay: 0,
      },
      healthInsights: {
        proteinAdequacy: "Start logging meals to track protein intake",
        calorieDistribution: "Begin meal logging to analyze calorie patterns",
        fiberIntake: "Track your meals to monitor fiber consumption",
      },
    };
  }

  private static calculateWeeklyTrends(meals: any[], startDate: Date, endDate: Date) {
    const days = 7;
    const trends = {
      calories: new Array(days).fill(0),
      protein: new Array(days).fill(0),
      carbs: new Array(days).fill(0),
      fats: new Array(days).fill(0),
    };

    const dayTotals = new Array(days).fill(null).map(() => ({
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      count: 0,
    }));

    meals.forEach(meal => {
      const mealDate = new Date(meal.upload_time);
      const dayIndex = Math.floor((mealDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayIndex >= 0 && dayIndex < days) {
        dayTotals[dayIndex].calories += meal.calories || 0;
        dayTotals[dayIndex].protein += meal.protein_g || 0;
        dayTotals[dayIndex].carbs += meal.carbs_g || 0;
        dayTotals[dayIndex].fats += meal.fats_g || 0;
        dayTotals[dayIndex].count++;
      }
    });

    dayTotals.forEach((day, index) => {
      trends.calories[index] = Math.round(day.calories);
      trends.protein[index] = Math.round(day.protein);
      trends.carbs[index] = Math.round(day.carbs);
      trends.fats[index] = Math.round(day.fats);
    });

    return trends;
  }

  private static calculateNutritionScore(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    processedFoodPercentage: number;
    calorieGoalAchievementPercent: number;
  }): number {
    let score = 50; // Base score

    // Calorie goal achievement (max 20 points)
    if (data.calorieGoalAchievementPercent >= 90 && data.calorieGoalAchievementPercent <= 110) {
      score += 20;
    } else if (data.calorieGoalAchievementPercent >= 80 && data.calorieGoalAchievementPercent <= 120) {
      score += 15;
    } else if (data.calorieGoalAchievementPercent >= 70 && data.calorieGoalAchievementPercent <= 130) {
      score += 10;
    }

    // Protein intake (max 15 points)
    if (data.averageProteinDaily >= 120) {
      score += 15;
    } else if (data.averageProteinDaily >= 80) {
      score += 10;
    } else if (data.averageProteinDaily >= 50) {
      score += 5;
    }

    // Fiber intake (max 10 points)
    if (data.averageFiberDaily >= 25) {
      score += 10;
    } else if (data.averageFiberDaily >= 15) {
      score += 7;
    } else if (data.averageFiberDaily >= 10) {
      score += 5;
    }

    // Processed food penalty (max -15 points)
    if (data.processedFoodPercentage <= 10) {
      score += 5;
    } else if (data.processedFoodPercentage <= 20) {
      score += 0;
    } else if (data.processedFoodPercentage <= 40) {
      score -= 5;
    } else {
      score -= 15;
    }

    return Math.max(1, Math.min(100, Math.round(score)));
  }

  private static generateInsights(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    processedFoodPercentage: number;
    nutritionScore: number;
    mealCount: number;
    totalDays: number;
  }): string[] {
    const insights: string[] = [];

    if (data.nutritionScore >= 80) {
      insights.push("Excellent nutrition habits! You're maintaining a well-balanced diet.");
    } else if (data.nutritionScore >= 60) {
      insights.push("Good nutrition foundation with room for improvement.");
    } else {
      insights.push("Your nutrition could benefit from some adjustments.");
    }

    if (data.averageProteinDaily >= 120) {
      insights.push("Great protein intake! This supports muscle maintenance and satiety.");
    } else if (data.averageProteinDaily < 80) {
      insights.push("Consider increasing protein intake for better muscle support and satiety.");
    }

    if (data.processedFoodPercentage > 30) {
      insights.push("High processed food intake detected. Try incorporating more whole foods.");
    } else if (data.processedFoodPercentage < 15) {
      insights.push("Excellent focus on whole foods! This supports overall health.");
    }

    const mealsPerDay = data.mealCount / data.totalDays;
    if (mealsPerDay < 2) {
      insights.push("Consider logging more meals for better nutrition tracking.");
    } else if (mealsPerDay > 5) {
      insights.push("Frequent eating pattern detected. Ensure portion control.");
    }

    return insights;
  }

  private static generateRecommendations(data: {
    averageCaloriesDaily: number;
    averageProteinDaily: number;
    averageFiberDaily: number;
    processedFoodPercentage: number;
    nutritionScore: number;
  }): string[] {
    const recommendations: string[] = [];

    if (data.averageProteinDaily < 100) {
      recommendations.push("Add lean proteins like chicken, fish, or legumes to your meals.");
    }

    if (data.averageFiberDaily < 20) {
      recommendations.push("Increase fiber intake with vegetables, fruits, and whole grains.");
    }

    if (data.processedFoodPercentage > 25) {
      recommendations.push("Replace processed foods with whole food alternatives when possible.");
    }

    if (data.averageCaloriesDaily < 1500) {
      recommendations.push("Consider if you're eating enough to meet your energy needs.");
    } else if (data.averageCaloriesDaily > 2500) {
      recommendations.push("Monitor portion sizes to align with your calorie goals.");
    }

    recommendations.push("Stay hydrated and maintain regular meal timing for optimal metabolism.");

    return recommendations;
  }

  private static calculateEatingHours(meals: any[]): { start: string; end: string } {
    if (meals.length === 0) {
      return { start: "08:00", end: "20:00" };
    }

    const hours = meals.map(meal => {
      const date = new Date(meal.upload_time);
      return date.getHours() + date.getMinutes() / 60;
    });

    const earliestHour = Math.min(...hours);
    const latestHour = Math.max(...hours);

    const formatHour = (hour: number) => {
      const h = Math.floor(hour);
      const m = Math.round((hour - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    return {
      start: formatHour(earliestHour),
      end: formatHour(latestHour),
    };
  }

  private static calculateIntermittentFasting(eatingHours: { start: string; end: string }): number {
    const [startH, startM] = eatingHours.start.split(':').map(Number);
    const [endH, endM] = eatingHours.end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    let fastingMinutes;
    if (endMinutes > startMinutes) {
      fastingMinutes = (24 * 60) - (endMinutes - startMinutes);
    } else {
      fastingMinutes = startMinutes - endMinutes;
    }

    return Math.round(fastingMinutes / 60);
  }

  private static getMostCommonMealTime(meals: any[]): string {
    if (meals.length === 0) return "12:00";

    const hourCounts: { [key: number]: number } = {};

    meals.forEach(meal => {
      const hour = new Date(meal.upload_time).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostCommonHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b
    );

    return `${mostCommonHour.padStart(2, '0')}:00`;
  }

  private static calculateAlcoholCaffeine(meals: any[]): number {
    return meals.reduce((total, meal) => {
      return total + (meal.alcohol_g || 0) + (meal.caffeine_mg || 0) / 100; // Convert mg to g equivalent
    }, 0);
  }

  private static calculateVegetableFruitIntake(meals: any[]): number {
    const vegetableFruitMeals = meals.filter(meal => 
      meal.food_category?.toLowerCase().includes('vegetable') ||
      meal.food_category?.toLowerCase().includes('fruit') ||
      meal.meal_name?.toLowerCase().includes('salad') ||
      meal.meal_name?.toLowerCase().includes('fruit')
    ).length;

    return meals.length > 0 ? Math.round((vegetableFruitMeals / meals.length) * 100) : 0;
  }

  private static calculateFullLoggingPercentage(meals: any[], totalDays: number): number {
    const expectedMeals = totalDays * 3; // Assuming 3 meals per day
    return Math.min(100, Math.round((meals.length / expectedMeals) * 100));
  }

  private static extractAllergenAlerts(meals: any[]): string[] {
    const allergens = new Set<string>();

    meals.forEach(meal => {
      if (meal.allergens_json && Array.isArray(meal.allergens_json)) {
        meal.allergens_json.forEach((allergen: string) => allergens.add(allergen));
      }
    });

    return Array.from(allergens);
  }

  private static calculateHealthRiskPercentage(meals: any[]): number {
    const riskMeals = meals.filter(meal => 
      meal.health_risk_notes && meal.health_risk_notes.length > 0
    ).length;

    return meals.length > 0 ? Math.round((riskMeals / meals.length) * 100) : 0;
  }

  private static calculateMissedMeals(totalDays: number, mealCount: number): number {
    const expectedMeals = totalDays * 3; // Assuming 3 meals per day
    return Math.max(0, expectedMeals - mealCount);
  }

  private static getProteinAdequacyInsight(averageProtein: number): string {
    if (averageProtein >= 120) {
      return "Excellent protein intake supporting muscle health and satiety";
    } else if (averageProtein >= 80) {
      return "Good protein levels, consider slight increase for optimal benefits";
    } else {
      return "Protein intake below recommended levels - focus on lean proteins";
    }
  }

  private static getCalorieDistributionInsight(averageCalories: number): string {
    if (averageCalories >= 1800 && averageCalories <= 2200) {
      return "Calorie intake appears well-balanced for most adults";
    } else if (averageCalories < 1500) {
      return "Calorie intake may be too low - ensure adequate energy for daily needs";
    } else {
      return "Higher calorie intake - monitor portion sizes and activity levels";
    }
  }

  private static getFiberIntakeInsight(averageFiber: number): string {
    if (averageFiber >= 25) {
      return "Excellent fiber intake supporting digestive health";
    } else if (averageFiber >= 15) {
      return "Good fiber levels, aim for 25g daily for optimal benefits";
    } else {
      return "Low fiber intake - increase vegetables, fruits, and whole grains";
    }
  }

  static async generatePDFReport(userId: string): Promise<Buffer> {
    // This would generate a PDF report of the user's nutrition statistics
    // For now, return a placeholder
    throw new Error("PDF generation not implemented yet");
  }

  static async generateInsights(userId: string): Promise<any> {
    // This would generate AI-powered insights
    // For now, return basic insights
    const statistics = await this.getNutritionStatistics(userId, "month");
    return {
      insights: statistics.insights,
      recommendations: statistics.recommendations,
    };
  }
}