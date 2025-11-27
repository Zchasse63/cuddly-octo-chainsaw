import Foundation
import ActivityKit

/// Native module to control Live Activities from React Native
@available(iOS 16.1, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {

    private var currentActivity: Activity<WorkoutActivityAttributes>?

    /// Start a new workout Live Activity
    @objc
    func startWorkoutActivity(
        _ workoutId: String,
        workoutName: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            reject("ACTIVITIES_DISABLED", "Live Activities are not enabled", nil)
            return
        }

        let attributes = WorkoutActivityAttributes(
            workoutId: workoutId,
            startTime: Date()
        )

        let initialState = WorkoutActivityAttributes.ContentState(
            workoutName: workoutName,
            currentExercise: "Starting...",
            setNumber: 1,
            totalSets: 0,
            weight: 0,
            weightUnit: "lbs",
            reps: 0,
            elapsedSeconds: 0,
            totalVolume: 0,
            isPaused: false
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                contentState: initialState,
                pushType: nil
            )
            currentActivity = activity
            resolve(["activityId": activity.id])
        } catch {
            reject("START_FAILED", "Failed to start Live Activity: \(error.localizedDescription)", error)
        }
    }

    /// Update the Live Activity with new workout state
    @objc
    func updateWorkoutActivity(
        _ data: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activity = currentActivity else {
            reject("NO_ACTIVITY", "No active Live Activity", nil)
            return
        }

        let state = WorkoutActivityAttributes.ContentState(
            workoutName: data["workoutName"] as? String ?? "Workout",
            currentExercise: data["currentExercise"] as? String ?? "",
            setNumber: data["setNumber"] as? Int ?? 1,
            totalSets: data["totalSets"] as? Int ?? 0,
            weight: data["weight"] as? Double ?? 0,
            weightUnit: data["weightUnit"] as? String ?? "lbs",
            reps: data["reps"] as? Int ?? 0,
            elapsedSeconds: data["elapsedSeconds"] as? Int ?? 0,
            totalVolume: data["totalVolume"] as? Double ?? 0,
            isPaused: data["isPaused"] as? Bool ?? false
        )

        Task {
            await activity.update(using: state)
            resolve(["success": true])
        }
    }

    /// End the Live Activity
    @objc
    func endWorkoutActivity(
        _ finalData: NSDictionary,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activity = currentActivity else {
            reject("NO_ACTIVITY", "No active Live Activity", nil)
            return
        }

        let finalState = WorkoutActivityAttributes.ContentState(
            workoutName: finalData["workoutName"] as? String ?? "Workout Complete",
            currentExercise: "Finished!",
            setNumber: finalData["totalSets"] as? Int ?? 0,
            totalSets: finalData["totalSets"] as? Int ?? 0,
            weight: 0,
            weightUnit: finalData["weightUnit"] as? String ?? "lbs",
            reps: 0,
            elapsedSeconds: finalData["elapsedSeconds"] as? Int ?? 0,
            totalVolume: finalData["totalVolume"] as? Double ?? 0,
            isPaused: false
        )

        Task {
            await activity.end(using: finalState, dismissalPolicy: .default)
            currentActivity = nil
            resolve(["success": true])
        }
    }

    /// Check if Live Activities are available
    @objc
    func isAvailable(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let info = ActivityAuthorizationInfo()
        resolve([
            "enabled": info.areActivitiesEnabled,
            "frequent": info.frequentPushesEnabled
        ])
    }

    /// Required for React Native
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
