import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { Ionicons } from "@expo/vector-icons";
import { useMeals, useDailyStats, useGlobalStats } from "@/hooks/useQueries";

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [showGlobalStats, setShowGlobalStats] = useState(false);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // React Query hooks
  const {
    data: meals = [],
    isLoading: mealsLoading,
    refetch: refetchMeals,
  } = useMeals();

  const {
    data: dailyStats,
    isLoading: dailyStatsLoading,
    refetch: refetchDailyStats,
  } = useDailyStats(today);

  const {
    data: globalStats,
    isLoading: globalStatsLoading,
    refetch: refetchGlobalStats,
  } = useGlobalStats();

  const isLoading = mealsLoading || dailyStatsLoading;

  const onRefresh = async () => {
    await Promise.all([
      refetchMeals(),
      refetchDailyStats(),
      showGlobalStats ? refetchGlobalStats() : Promise.resolve(),
    ]);
  };

  const renderGlobalStatistics = () => {
    if (!globalStats) return null;

    return (
      <View style={styles.globalStatsContainer}>
        <Text style={styles.sectionTitle}>📊 Global Insights</Text>

        {/* General Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Community Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {globalStats.generalStats?.averageCaloriesPerMeal || 0}
              </Text>
              <Text style={styles.statLabel}>Avg Calories/Meal</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {globalStats.generalStats?.averageProteinPerMeal || 0}g
              </Text>
              <Text style={styles.statLabel}>Avg Protein/Meal</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {globalStats.generalStats?.mostCommonMealTime || "12:00"}
              </Text>
              <Text style={styles.statLabel}>Peak Meal Time</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {globalStats.generalStats?.averageMealsPerDay || 0}
              </Text>
              <Text style={styles.statLabel}>Meals/Day</Text>
            </View>
          </View>
        </View>

        {/* Health Insights */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Health Insights</Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <Ionicons name="fitness" size={16} color="#4CAF50" />
              <Text style={styles.insightText}>
                {globalStats.healthInsights?.proteinAdequacy || "No data available"}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="restaurant" size={16} color="#FF9800" />
              <Text style={styles.insightText}>
                {globalStats.healthInsights?.calorieDistribution || "No data available"}
              </Text>
            </View>
            <View style={styles.insightItem}>
              <Ionicons name="leaf" size={16} color="#8BC34A" />
              <Text style={styles.insightText}>
                {globalStats.healthInsights?.fiberIntake || "No data available"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Tips */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>💡 Quick Tips</Text>
          <View style={styles.tipsList}>
            {(globalStats.recommendations || [])
              .slice(0, 2)
              .map((tip: string, index: number) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !meals.length && !dailyStats) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.welcome}>Welcome back, {user?.name}!</Text>

      {dailyStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Today's Nutrition</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(dailyStats.calories)}
              </Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(dailyStats.protein)}g
              </Text>
              <Text style={styles.statLabel}>Protein</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(dailyStats.carbs)}g
              </Text>
              <Text style={styles.statLabel}>Carbs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {Math.round(dailyStats.fat)}g
              </Text>
              <Text style={styles.statLabel}>Fat</Text>
            </View>
          </View>
          <Text style={styles.mealCount}>
            {dailyStats.mealCount} meals logged today
          </Text>
        </View>
      )}

      {/* Global Statistics Toggle */}
      <View style={styles.globalStatsToggle}>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowGlobalStats(!showGlobalStats)}
          disabled={globalStatsLoading}
        >
          <Ionicons
            name={showGlobalStats ? "chevron-up" : "chevron-down"}
            size={20}
            color="#007AFF"
          />
          <Text style={styles.toggleButtonText}>
            {showGlobalStats ? "Hide" : "Show"} Community Insights
          </Text>
          {globalStatsLoading && (
            <ActivityIndicator
              size="small"
              color="#007AFF"
              style={styles.toggleLoader}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Global Statistics */}
      {showGlobalStats && renderGlobalStatistics()}

      <View style={styles.recentMeals}>
        <Text style={styles.sectionTitle}>Recent Meals</Text>
        {meals.slice(0, 3).map((meal) => (
          <View key={meal.id} style={styles.mealCard}>
            <Text style={styles.mealName}>{meal.name}</Text>
            <Text style={styles.mealCalories}>
              {Math.round(Number(meal.calories))} cal
            </Text>
          </View>
        ))}
        {meals.length === 0 && (
          <Text style={styles.emptyText}>
            No meals logged yet. Start by analyzing a photo!
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    color: "#333",
  },
  statsContainer: {
    backgroundColor: "white",
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  mealCount: {
    textAlign: "center",
    color: "#666",
    marginTop: 10,
  },
  globalStatsToggle: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginLeft: 8,
  },
  toggleLoader: {
    marginLeft: 10,
  },
  globalStatsContainer: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  statsCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 10,
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "bold",
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  recentMeals: {
    backgroundColor: "white",
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mealName: {
    fontSize: 16,
    color: "#333",
  },
  mealCalories: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    paddingVertical: 20,
  },
});