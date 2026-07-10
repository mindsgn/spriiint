import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/store/user.store";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import SwipeButton from "@/components/swipe-button";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

export default function WorkoutScreen() {
  const {
    currentWorkout,
    todayCompleted,
    // Progress
    currentExerciseIndex,
    currentSetIndex,
    isResting,
    // Actions
    loadTodayStatus,
    completeSet,
    skipRest,
  } = useStore();

  const translateX = useSharedValue(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Initialize data
  useEffect(() => {
    loadTodayStatus();
  }, []);

  // Timer Logic: Initialize when entering rest state
  useEffect(() => {
    if (isResting && currentWorkout) {
      const exercise = currentWorkout.exercises[currentExerciseIndex];
      // Set the timer to the rest duration defined in the workout structure
      // We look at the exercise we just finished (or are currently "on" in the array)
      setTimeLeft(exercise.structure.rest_seconds);
    }
  }, [isResting, currentWorkout, currentExerciseIndex]);

  // Timer Logic: Countdown
  useEffect(() => {
    if (!isResting) return;

    if (timeLeft <= 0) {
      skipRest();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, timeLeft]);

  // Swipe Handler
  const SWIPE_THRESHOLD = 250;

  const handleCompleteSwipe = () => {
    completeSet();
    translateX.value = 0;
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (todayCompleted || isResting) return;
      translateX.value = Math.max(0, Math.min(e.translationX, SWIPE_THRESHOLD));
    })
    .onEnd(() => {
      if (translateX.value >= SWIPE_THRESHOLD - 20) {
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(handleCompleteSwipe)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const sliderAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const trackStyle = useAnimatedStyle(() => ({
    opacity: 1,
  }));

  // Loading State
  if (!currentWorkout) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const isRestDay = currentWorkout.status === "rest";

  // --- Render Helpers ---

  const renderCompleted = () => (
    <View style={styles.centerContent}>
      <Text style={styles.completedTitle}>✓ DONE</Text>
      <Text style={styles.completedSubtitle}>Good work today.</Text>
      <Text style={styles.completedSubtitle}>See you tomorrow.</Text>
    </View>
  );

  const renderRestDay = () => (
    <View style={styles.centerContent}>
      <Text style={styles.restTitle}>REST DAY</Text>
      <Text style={styles.restSubtitle}>
        {currentWorkout.note || "Take it easy and recover."}
      </Text>
      <Text style={[styles.label, { marginTop: 40 }]}>SWIPE TO COMPLETE</Text>
    </View>
  );

  const renderRestTimer = () => (
    <View style={styles.centerContent}>
      <Text style={styles.label}>REST</Text>
      <Text style={styles.timerText}>{timeLeft}</Text>
      <Text style={styles.subTimerText}>seconds</Text>
      <TouchableOpacity onPress={() => skipRest()} style={styles.skipButton}>
        <Text style={styles.skipButtonText}>SKIP REST</Text>
      </TouchableOpacity>
    </View>
  );

  const renderActiveSet = () => {
    const exercise = currentWorkout.exercises[currentExerciseIndex];
    return (
      <View style={styles.centerContent}>
        <Text style={styles.label}>
          SET {currentSetIndex + 1} OF {exercise.structure.sets}
        </Text>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.repsText}>{exercise.structure.reps_per_set}</Text>
        <Text style={styles.repsLabel}>REPS</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.phaseText}>
            {currentWorkout.phase?.toUpperCase()}
          </Text>
          <Text style={styles.dayText}>DAY {currentWorkout.day}</Text>
        </View>

        {/* Dynamic Content */}
        <View style={styles.contentContainer}>
          {todayCompleted
            ? renderCompleted()
            : isRestDay
              ? renderRestDay()
              : isResting
                ? renderRestTimer()
                : renderActiveSet()}
        </View>

        {/* Footer / Slider */}
        <View style={styles.footer}>
          {!todayCompleted && !isResting && (
            <SwipeButton
              panGesture={panGesture}
              trackStyle={trackStyle}
              animatedStyle={sliderAnimatedStyle}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 20,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginTop: 20,
    alignItems: "center",
  },
  phaseText: {
    color: "#666",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "600",
    marginBottom: 4,
  },
  dayText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  // Typography
  text: {
    color: "#fff",
  },
  label: {
    color: "#666",
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 10,
    textAlign: "center",
  },
  exerciseName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  repsText: {
    color: "#fff",
    fontSize: 100,
    fontWeight: "200",
    lineHeight: 100,
    fontVariant: ["tabular-nums"],
  },
  repsLabel: {
    color: "#666",
    fontSize: 20,
    marginTop: 10,
    fontWeight: "500",
  },
  // Timer Styles
  timerText: {
    color: "#4ade80",
    fontSize: 120,
    fontWeight: "200",
    lineHeight: 120,
    fontVariant: ["tabular-nums"],
  },
  subTimerText: {
    color: "#666",
    fontSize: 24,
  },
  skipButton: {
    marginTop: 40,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
  },
  skipButtonText: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
  },
  // Rest Day Styles
  restTitle: {
    color: "#4ade80",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 16,
  },
  restSubtitle: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 26,
    opacity: 0.8,
  },
  // Completed Styles
  completedTitle: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
  },
  completedSubtitle: {
    color: "#666",
    fontSize: 18,
    marginBottom: 5,
  },
  // Footer
  footer: {
    marginBottom: 40,
    minHeight: 80, // Reserve space so layout doesn't jump too much
    justifyContent: "flex-end",
  },
});
