import WidgetKit
import SwiftUI

@main
struct VoiceFitWidgetBundle: WidgetBundle {
    var body: some Widget {
        // Live Activity for active workouts
        if #available(iOS 16.1, *) {
            WorkoutLiveActivity()
        }

        // Home Screen Widgets (future)
        // WorkoutStreakWidget()
        // WeeklyProgressWidget()
    }
}
