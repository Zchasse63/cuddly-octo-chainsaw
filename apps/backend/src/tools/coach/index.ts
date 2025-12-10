/**
 * Coach Tools Index
 *
 * Exports all 25 coach-specific tools for the AI coach system.
 */

// Client Management Tools (9 tools)
export {
  getClientList,
  getClientProfile,
  getClientWorkouts,
  getClientProgress,
  getClientHealthData,
  getClientProgram,
  getClientCheckIns,
  getCoachNotes,
  getClientInjuries,
  clientTools,
} from './clients';

// Program Management Tools (5 tools)
export {
  getProgramTemplates,
  assignProgramToClient,
  getProgramAdherence,
  getBulkAssignmentStatus,
  getCSVImportStatus,
  programTools,
} from './programs';

// Messaging Tools (3 tools)
export {
  getClientConversations,
  getConversationMessages,
  sendMessageToClient,
  messagingTools,
} from './messaging';

// Analytics Tools (2 tools)
export {
  getClientAnalyticsSummary,
  getAtRiskClients,
  analyticsTools,
} from './analytics';

// Profile Tools (2 tools)
export {
  getCoachProfile,
  getPendingInvitations,
  profileTools,
} from './profile';

// Future Tools (4 tools)
export {
  getWatchSyncStatus,
  analyzeFormVideo,
  detectPlateau,
  getRecoveryPrediction,
  futureTools,
} from './future';

// Collect all coach tools for registration
import { clientTools } from './clients';
import { programTools } from './programs';
import { messagingTools } from './messaging';
import { analyticsTools } from './analytics';
import { profileTools } from './profile';
import { futureTools } from './future';

export const getAllCoachTools = () => ({
  ...clientTools,
  ...programTools,
  ...messagingTools,
  ...analyticsTools,
  ...profileTools,
  ...futureTools,
});

// Tool count verification
export const COACH_TOOL_COUNT = 25;

