import { createUnifiedCoachV2 } from './src/services/unifiedCoachV2.js';
import { db } from './src/db/index.js';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const testUserContext = {
  userId: TEST_USER_ID,
  name: 'Test User',
  experienceLevel: 'intermediate',
  goals: ['strength', 'muscle'],
  injuries: [],
  preferredEquipment: ['barbell', 'dumbbell'],
  preferredWeightUnit: 'lbs',
};

const service = await createUnifiedCoachV2(db);
const result = await service.processMessage('What is my experience level?', testUserContext);

console.log('Result:', JSON.stringify(result, null, 2));
