import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../src/store";
import { fetchCalendarData, addEvent, getStatistics } from "../../src/store/calendarSlice";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CELL_SIZE = (width - 40) / 7; // 7 days per week

interface DayData {
  date: string;
  caloriesGoal: number;
  caloriesActual: number;
  proteinGoal: number;
  proteinActual: number;
  carbsGoal: number;
  carbsActual: number;
  fatGoal: number;
  fatActual: number;
  mealCount: number;
  qualityScore: number;
  events: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

interface CalendarStats {
  monthlyProgress: number;
  streakDays: number;
  bestWeek: string;
  challengingWeek: string;
  improvementPercent: number;
  totalGoalDays: number;
  averageCalories: number;
  averageProtein: number;
  motivationalMessage: string;
}

export default function CalendarScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    calendarData, 
    statistics, 
    isLoading, 
    isAddingEvent 
  } = useSelector((state: RootState) => state.calendar);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("general");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    dispatch(fetchCalendarData({ year, month }));
    dispatch(getStatistics({ year, month }));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarData[dateStr] || {
        date: dateStr,
        caloriesGoal: 2000,
        caloriesActual: 0,
        proteinGoal: 150,
        proteinActual: 0,
        carbsGoal: 250,
        carbsActual: 0,
        fatGoal: 67,
        fatActual: 0,
        mealCount: 0,
        qualityScore: 0,
        events: []
      };
      days.push(dayData);
    }
    
    return days;
  };

  const getProgressPercentage = (actual: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((actual / goal) * 100, 150); // Cap at 150% for display
  };

  const getDayColor = (dayData: DayData) => {
    const caloriesProgress = getProgressPercentage(dayData.caloriesActual, dayData.caloriesGoal);
    
    if (caloriesProgress >= 110) return "#8B0000"; // Dark red for overeating
    if (caloriesProgress >= 100) return "#4CAF50"; // Green for goal achieved
    if (caloriesProgress >= 70) return "#FF9800"; // Orange for close to goal
    return "#F44336"; // Red for not achieved
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDayPress = (dayData: DayData) => {
    setSelectedDay(dayData);
    setShowDayModal(true);
  };

  const handleAddEvent = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEventTitle("");
    setEventType("general");
    setShowEventModal(true);
  };

  const submitEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    try {
      await dispatch(addEvent({
        date: selectedDate,
        title: eventTitle.trim(),
        type: eventType
      })).unwrap();
      
      setShowEventModal(false);
      loadCalendarData(); // Refresh data
      Alert.alert("Success", "Event added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add event");
    }
  };

  const renderDay = (dayData: DayData | null, index: number) => {
    if (!dayData) {
      return <View key={index} style={[styles.dayCell, styles.emptyDay]} />;
    }

    const dayNumber = new Date(dayData.date).getDate();
    const progress = getProgressPercentage(dayData.caloriesActual, dayData.caloriesGoal);
    const dayColor = getDayColor(dayData);
    const hasEvents = dayData.events.length > 0;

    return (
      <TouchableOpacity
        key={dayData.date}
        style={[
          styles.dayCell,
          { backgroundColor: dayColor },
          hasEvents && styles.dayWithEvents
        ]}
        onPress={() => handleDayPress(dayData)}
        onLongPress={() => handleAddEvent(dayData.date)}
      >
        <Text style={styles.dayNumber}>{dayNumber}</Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        {hasEvents && (
          <View style={styles.eventIndicator}>
            <Ionicons name="star" size={8} color="#FFD700" />
          </View>
        )}
        <Text style={styles.caloriesText}>
          {Math.round(dayData.caloriesActual)}cal
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWeekDays = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <View style={styles.statisticsContainer}>
        <Text style={styles.motivationalMessage}>
          {statistics.motivationalMessage}
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.monthlyProgress}%</Text>
            <Text style={styles.statLabel}>Monthly Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.streakDays}</Text>
            <Text style={styles.statLabel}>Streak Days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statistics.totalGoalDays}</Text>
            <Text style={styles.statLabel}>Goal Days</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {statistics.improvementPercent > 0 ? '+' : ''}{statistics.improvementPercent}%
            </Text>
            <Text style={styles.statLabel}>vs Last Month</Text>
          </View>
        </View>

        {statistics.bestWeek && (
          <View style={styles.insightContainer}>
            <Text style={styles.insightTitle}>📈 Best Week</Text>
            <Text style={styles.insightText}>{statistics.bestWeek}</Text>
          </View>
        )}

        {statistics.challengingWeek && (
          <View style={styles.insightContainer}>
            <Text style={styles.insightTitle}>📉 Most Challenging</Text>
            <Text style={styles.insightText}>{statistics.challengingWeek}</Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth(-1)}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity onPress={() => navigateMonth(1)}>
          <Ionicons name="chevron-forward" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      {renderStatistics()}

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        {renderWeekDays()}
        <View style={styles.daysGrid}>
          {getDaysInMonth().map((dayData, index) => renderDay(dayData, index))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendGrid}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#4CAF50" }]} />
            <Text style={styles.legendText}>Goal Achieved</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#FF9800" }]} />
            <Text style={styles.legendText}>Close (70-99%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#F44336" }]} />
            <Text style={styles.legendText}>Below Goal</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#8B0000" }]} />
            <Text style={styles.legendText}>Overeating</Text>
          </View>
        </View>
      </View>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDay && (
              <>
                <Text style={styles.modalTitle}>
                  {new Date(selectedDay.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>

                <View style={styles.dayDetailGrid}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Calories</Text>
                    <Text style={styles.macroValue}>
                      {Math.round(selectedDay.caloriesActual)} / {selectedDay.caloriesGoal}
                    </Text>
                    <View style={styles.macroProgress}>
                      <View 
                        style={[
                          styles.macroProgressBar, 
                          { 
                            width: `${Math.min(getProgressPercentage(selectedDay.caloriesActual, selectedDay.caloriesGoal), 100)}%`,
                            backgroundColor: getDayColor(selectedDay)
                          }
                        ]} 
                      />
                    </View>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={styles.macroValue}>
                      {Math.round(selectedDay.proteinActual)}g / {selectedDay.proteinGoal}g
                    </Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={styles.macroValue}>
                      {Math.round(selectedDay.carbsActual)}g / {selectedDay.carbsGoal}g
                    </Text>
                  </View>

                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={styles.macroValue}>
                      {Math.round(selectedDay.fatActual)}g / {selectedDay.fatGoal}g
                    </Text>
                  </View>
                </View>

                <View style={styles.dayStats}>
                  <Text style={styles.dayStatsText}>
                    Meals logged: {selectedDay.mealCount}
                  </Text>
                  <Text style={styles.dayStatsText}>
                    Quality score: {selectedDay.qualityScore}/10
                  </Text>
                </View>

                {selectedDay.events.length > 0 && (
                  <View style={styles.eventsSection}>
                    <Text style={styles.eventsTitle}>Events</Text>
                    {selectedDay.events.map((event) => (
                      <View key={event.id} style={styles.eventItem}>
                        <Ionicons name="calendar" size={16} color="#007AFF" />
                        <Text style={styles.eventText}>{event.title}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.addEventButton]}
                    onPress={() => {
                      setShowDayModal(false);
                      handleAddEvent(selectedDay.date);
                    }}
                  >
                    <Text style={styles.addEventButtonText}>Add Event</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setShowDayModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Event Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEventModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event</Text>
            
            <TextInput
              style={styles.eventInput}
              placeholder="Event title (e.g., Wedding, Heavy workout, Fasting day)"
              value={eventTitle}
              onChangeText={setEventTitle}
              autoFocus={true}
            />

            <View style={styles.eventTypeContainer}>
              <Text style={styles.eventTypeLabel}>Event Type:</Text>
              <View style={styles.eventTypeButtons}>
                {[
                  { key: 'general', label: 'General', icon: 'calendar' },
                  { key: 'workout', label: 'Workout', icon: 'fitness' },
                  { key: 'social', label: 'Social', icon: 'people' },
                  { key: 'health', label: 'Health', icon: 'medical' }
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.eventTypeButton,
                      eventType === type.key && styles.eventTypeButtonActive
                    ]}
                    onPress={() => setEventType(type.key)}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={16} 
                      color={eventType === type.key ? "#fff" : "#007AFF"} 
                    />
                    <Text style={[
                      styles.eventTypeButtonText,
                      eventType === type.key && styles.eventTypeButtonTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEventModal(false)}
                disabled={isAddingEvent}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitEvent}
                disabled={!eventTitle.trim() || isAddingEvent}
              >
                {isAddingEvent ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Event</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statisticsContainer: {
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
  motivationalMessage: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#007AFF",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statItem: {
    width: "48%",
    alignItems: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  insightContainer: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  insightText: {
    fontSize: 12,
    color: "#666",
  },
  calendarContainer: {
    backgroundColor: "white",
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    width: CELL_SIZE,
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    padding: 4,
    margin: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyDay: {
    backgroundColor: "transparent",
  },
  dayWithEvents: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
  },
  progressContainer: {
    width: "80%",
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 8,
    color: "white",
    fontWeight: "600",
  },
  eventIndicator: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  caloriesText: {
    fontSize: 8,
    color: "white",
  },
  legendContainer: {
    backgroundColor: "white",
    margin: 15,
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: "#666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  dayDetailGrid: {
    marginBottom: 20,
  },
  macroItem: {
    marginBottom: 15,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  macroValue: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 5,
  },
  macroProgress: {
    width: "100%",
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
  },
  macroProgressBar: {
    height: "100%",
    borderRadius: 3,
  },
  dayStats: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  dayStatsText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  eventsSection: {
    marginBottom: 20,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  eventItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    marginBottom: 5,
  },
  eventText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  eventInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  eventTypeContainer: {
    marginBottom: 20,
  },
  eventTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  eventTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  eventTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    backgroundColor: "white",
  },
  eventTypeButtonActive: {
    backgroundColor: "#007AFF",
  },
  eventTypeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    color: "#007AFF",
  },
  eventTypeButtonTextActive: {
    color: "white",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  addEventButton: {
    backgroundColor: "#007AFF",
  },
  addEventButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  closeButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#007AFF",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});