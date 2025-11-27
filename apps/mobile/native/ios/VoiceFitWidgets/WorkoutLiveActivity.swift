import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes

/// Defines the static and dynamic data for the workout Live Activity
struct WorkoutActivityAttributes: ActivityAttributes {
    /// Static content that doesn't change during the activity
    public struct ContentState: Codable, Hashable {
        var workoutName: String
        var currentExercise: String
        var setNumber: Int
        var totalSets: Int
        var weight: Double
        var weightUnit: String
        var reps: Int
        var elapsedSeconds: Int
        var totalVolume: Double
        var isPaused: Bool
    }

    /// Static data set when activity starts
    var workoutId: String
    var startTime: Date
}

// MARK: - Live Activity Widget

@available(iOS 16.1, *)
struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 4) {
                        Image(systemName: "dumbbell.fill")
                            .foregroundColor(.blue)
                        Text(context.state.currentExercise)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .lineLimit(1)
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatDuration(context.state.elapsedSeconds))
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundColor(.secondary)
                }

                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 4) {
                        Text("Set \(context.state.setNumber) of \(context.state.totalSets)")
                            .font(.headline)

                        HStack(spacing: 16) {
                            VStack {
                                Text("\(Int(context.state.weight))")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text(context.state.weightUnit)
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }

                            Text("×")
                                .font(.title3)
                                .foregroundColor(.secondary)

                            VStack {
                                Text("\(context.state.reps)")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("reps")
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Label("\(formatVolume(context.state.totalVolume)) total", systemImage: "scalemass")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Spacer()

                        if context.state.isPaused {
                            Label("Paused", systemImage: "pause.fill")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "dumbbell.fill")
                    .foregroundColor(.blue)
            } compactTrailing: {
                Text("Set \(context.state.setNumber)")
                    .font(.caption)
                    .fontWeight(.semibold)
            } minimal: {
                Image(systemName: "dumbbell.fill")
                    .foregroundColor(.blue)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.1, *)
struct LockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "dumbbell.fill")
                    .foregroundColor(.blue)
                Text(context.state.workoutName)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                Text(formatDuration(context.state.elapsedSeconds))
                    .font(.subheadline)
                    .monospacedDigit()
                    .foregroundColor(.secondary)
            }

            // Current Exercise
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.currentExercise)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text("Set \(context.state.setNumber) of \(context.state.totalSets)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Weight × Reps
                HStack(spacing: 8) {
                    VStack {
                        Text("\(Int(context.state.weight))")
                            .font(.title)
                            .fontWeight(.bold)
                        Text(context.state.weightUnit)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }

                    Text("×")
                        .font(.title2)
                        .foregroundColor(.secondary)

                    VStack {
                        Text("\(context.state.reps)")
                            .font(.title)
                            .fontWeight(.bold)
                        Text("reps")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.gray.opacity(0.3))
                        .frame(height: 4)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.blue)
                        .frame(width: geo.size.width * progress, height: 4)
                }
            }
            .frame(height: 4)

            // Footer stats
            HStack {
                Label("\(formatVolume(context.state.totalVolume))", systemImage: "scalemass")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Spacer()

                if context.state.isPaused {
                    Label("Paused", systemImage: "pause.fill")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }
        }
        .padding()
        .background(Color(UIColor.systemBackground))
    }

    var progress: Double {
        guard context.state.totalSets > 0 else { return 0 }
        return Double(context.state.setNumber - 1) / Double(context.state.totalSets)
    }
}

// MARK: - Helpers

func formatDuration(_ seconds: Int) -> String {
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    let secs = seconds % 60

    if hours > 0 {
        return String(format: "%d:%02d:%02d", hours, minutes, secs)
    }
    return String(format: "%d:%02d", minutes, secs)
}

func formatVolume(_ volume: Double) -> String {
    if volume >= 1000 {
        return String(format: "%.1fk lbs", volume / 1000)
    }
    return String(format: "%.0f lbs", volume)
}

// MARK: - Preview

@available(iOS 16.1, *)
struct WorkoutLiveActivity_Previews: PreviewProvider {
    static let attributes = WorkoutActivityAttributes(
        workoutId: "preview-123",
        startTime: Date()
    )

    static let contentState = WorkoutActivityAttributes.ContentState(
        workoutName: "Push Day",
        currentExercise: "Bench Press",
        setNumber: 2,
        totalSets: 4,
        weight: 185,
        weightUnit: "lbs",
        reps: 8,
        elapsedSeconds: 1234,
        totalVolume: 4520,
        isPaused: false
    )

    static var previews: some View {
        Group {
            attributes
                .previewContext(contentState, viewKind: .content)
                .previewDisplayName("Lock Screen")

            attributes
                .previewContext(contentState, viewKind: .dynamicIsland(.expanded))
                .previewDisplayName("Dynamic Island Expanded")

            attributes
                .previewContext(contentState, viewKind: .dynamicIsland(.compact))
                .previewDisplayName("Dynamic Island Compact")

            attributes
                .previewContext(contentState, viewKind: .dynamicIsland(.minimal))
                .previewDisplayName("Dynamic Island Minimal")
        }
    }
}
