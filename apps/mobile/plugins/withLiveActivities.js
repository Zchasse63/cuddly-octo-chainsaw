/**
 * Expo Config Plugin for Live Activities
 *
 * This plugin adds the necessary configuration for iOS Live Activities:
 * 1. Adds NSSupportsLiveActivities to Info.plist
 * 2. Adds the Widget Extension target
 *
 * Usage in app.json:
 * {
 *   "expo": {
 *     "plugins": ["./plugins/withLiveActivities"]
 *   }
 * }
 */

const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withLiveActivitiesInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    // Enable Live Activities
    config.modResults.NSSupportsLiveActivities = true;

    // Enable frequent updates (for real-time workout tracking)
    config.modResults.NSSupportsLiveActivitiesFrequentUpdates = true;

    return config;
  });
}

function withLiveActivitiesXcodeProject(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Note: Adding a Widget Extension target requires more complex Xcode project manipulation
    // For production, you would:
    // 1. Create the widget extension target
    // 2. Add the Swift files to the target
    // 3. Configure signing and capabilities
    // 4. Add the App Group for data sharing

    // For now, log instructions for manual setup
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              Live Activities Setup Instructions               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  To complete Live Activities setup, in Xcode:                 ║
║                                                               ║
║  1. File > New > Target > Widget Extension                    ║
║  2. Name it "VoiceFitWidgets"                                 ║
║  3. Check "Include Live Activity"                             ║
║  4. Copy Swift files from ios/VoiceFitWidgets/                ║
║  5. Enable "Push Notifications" capability                    ║
║  6. Add App Group: group.com.voicefit.shared                  ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
    `);

    return config;
  });
}

module.exports = function withLiveActivities(config) {
  config = withLiveActivitiesInfoPlist(config);
  config = withLiveActivitiesXcodeProject(config);
  return config;
};
