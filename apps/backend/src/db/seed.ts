import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { exercises } from './schema/exercises';
import { users, userProfiles, fitnessGoal, fitnessLevel } from './schema/users';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// Exercise database - comprehensive list covering all muscle groups
const exerciseData = [
  // CHEST EXERCISES
  { name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', category: 'compound' },
  { name: 'Incline Barbell Press', muscleGroup: 'chest', equipment: 'barbell', category: 'compound' },
  { name: 'Decline Barbell Press', muscleGroup: 'chest', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell', category: 'compound' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', category: 'compound' },
  { name: 'Decline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', category: 'compound' },
  { name: 'Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Incline Dumbbell Fly', muscleGroup: 'chest', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable', category: 'isolation' },
  { name: 'Low Cable Fly', muscleGroup: 'chest', equipment: 'cable', category: 'isolation' },
  { name: 'High Cable Fly', muscleGroup: 'chest', equipment: 'cable', category: 'isolation' },
  { name: 'Machine Chest Press', muscleGroup: 'chest', equipment: 'machine', category: 'compound' },
  { name: 'Pec Deck', muscleGroup: 'chest', equipment: 'machine', category: 'isolation' },
  { name: 'Push Up', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Diamond Push Up', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Wide Push Up', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Decline Push Up', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Incline Push Up', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Chest Dip', muscleGroup: 'chest', equipment: 'bodyweight', category: 'compound' },
  { name: 'Smith Machine Bench Press', muscleGroup: 'chest', equipment: 'machine', category: 'compound' },
  { name: 'Smith Machine Incline Press', muscleGroup: 'chest', equipment: 'machine', category: 'compound' },
  { name: 'Landmine Press', muscleGroup: 'chest', equipment: 'barbell', category: 'compound' },
  { name: 'Svend Press', muscleGroup: 'chest', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Floor Press', muscleGroup: 'chest', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Floor Press', muscleGroup: 'chest', equipment: 'dumbbell', category: 'compound' },

  // BACK EXERCISES
  { name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Conventional Deadlift', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Sumo Deadlift', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Romanian Deadlift', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'back', equipment: 'dumbbell', category: 'compound' },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Pendlay Row', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', category: 'compound' },
  { name: 'One Arm Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell', category: 'compound' },
  { name: 'T-Bar Row', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Wide Grip Cable Row', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Close Grip Cable Row', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Wide Grip Lat Pulldown', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Close Grip Lat Pulldown', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Reverse Grip Lat Pulldown', muscleGroup: 'back', equipment: 'cable', category: 'compound' },
  { name: 'Pull Up', muscleGroup: 'back', equipment: 'bodyweight', category: 'compound' },
  { name: 'Chin Up', muscleGroup: 'back', equipment: 'bodyweight', category: 'compound' },
  { name: 'Wide Grip Pull Up', muscleGroup: 'back', equipment: 'bodyweight', category: 'compound' },
  { name: 'Neutral Grip Pull Up', muscleGroup: 'back', equipment: 'bodyweight', category: 'compound' },
  { name: 'Inverted Row', muscleGroup: 'back', equipment: 'bodyweight', category: 'compound' },
  { name: 'Face Pull', muscleGroup: 'back', equipment: 'cable', category: 'isolation' },
  { name: 'Straight Arm Pulldown', muscleGroup: 'back', equipment: 'cable', category: 'isolation' },
  { name: 'Cable Pullover', muscleGroup: 'back', equipment: 'cable', category: 'isolation' },
  { name: 'Dumbbell Pullover', muscleGroup: 'back', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Machine Row', muscleGroup: 'back', equipment: 'machine', category: 'compound' },
  { name: 'Chest Supported Row', muscleGroup: 'back', equipment: 'dumbbell', category: 'compound' },
  { name: 'Meadows Row', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Kroc Row', muscleGroup: 'back', equipment: 'dumbbell', category: 'compound' },
  { name: 'Seal Row', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Rack Pull', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Deficit Deadlift', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Good Morning', muscleGroup: 'back', equipment: 'barbell', category: 'compound' },
  { name: 'Back Extension', muscleGroup: 'back', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Hyperextension', muscleGroup: 'back', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Reverse Hyperextension', muscleGroup: 'back', equipment: 'machine', category: 'isolation' },

  // SHOULDER EXERCISES
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Military Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Push Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Seated Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'compound' },
  { name: 'Seated Dumbbell Press', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'compound' },
  { name: 'Arnold Press', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'compound' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Lateral Raise', muscleGroup: 'shoulders', equipment: 'cable', category: 'isolation' },
  { name: 'Machine Lateral Raise', muscleGroup: 'shoulders', equipment: 'machine', category: 'isolation' },
  { name: 'Front Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Front Raise', muscleGroup: 'shoulders', equipment: 'cable', category: 'isolation' },
  { name: 'Barbell Front Raise', muscleGroup: 'shoulders', equipment: 'barbell', category: 'isolation' },
  { name: 'Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'cable', category: 'isolation' },
  { name: 'Machine Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'machine', category: 'isolation' },
  { name: 'Reverse Pec Deck', muscleGroup: 'shoulders', equipment: 'machine', category: 'isolation' },
  { name: 'Upright Row', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Upright Row', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'compound' },
  { name: 'Cable Upright Row', muscleGroup: 'shoulders', equipment: 'cable', category: 'compound' },
  { name: 'Machine Shoulder Press', muscleGroup: 'shoulders', equipment: 'machine', category: 'compound' },
  { name: 'Smith Machine Shoulder Press', muscleGroup: 'shoulders', equipment: 'machine', category: 'compound' },
  { name: 'Handstand Push Up', muscleGroup: 'shoulders', equipment: 'bodyweight', category: 'compound' },
  { name: 'Pike Push Up', muscleGroup: 'shoulders', equipment: 'bodyweight', category: 'compound' },
  { name: 'Lu Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Bus Driver', muscleGroup: 'shoulders', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Plate Front Raise', muscleGroup: 'shoulders', equipment: 'other', category: 'isolation' },
  { name: 'Bradford Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Z Press', muscleGroup: 'shoulders', equipment: 'barbell', category: 'compound' },
  { name: 'Viking Press', muscleGroup: 'shoulders', equipment: 'machine', category: 'compound' },

  // BICEPS EXERCISES
  { name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'EZ Bar Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Alternating Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Concentration Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Preacher Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Dumbbell Preacher Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Machine Preacher Curl', muscleGroup: 'biceps', equipment: 'machine', category: 'isolation' },
  { name: 'Cable Curl', muscleGroup: 'biceps', equipment: 'cable', category: 'isolation' },
  { name: 'Cable Hammer Curl', muscleGroup: 'biceps', equipment: 'cable', category: 'isolation' },
  { name: 'High Cable Curl', muscleGroup: 'biceps', equipment: 'cable', category: 'isolation' },
  { name: 'Spider Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Drag Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Reverse Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Zottman Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cross Body Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', category: 'isolation' },
  { name: '21s Curl', muscleGroup: 'biceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Machine Curl', muscleGroup: 'biceps', equipment: 'machine', category: 'isolation' },
  { name: 'Bayesian Curl', muscleGroup: 'biceps', equipment: 'cable', category: 'isolation' },

  // TRICEPS EXERCISES
  { name: 'Close Grip Bench Press', muscleGroup: 'triceps', equipment: 'barbell', category: 'compound' },
  { name: 'Tricep Dip', muscleGroup: 'triceps', equipment: 'bodyweight', category: 'compound' },
  { name: 'Bench Dip', muscleGroup: 'triceps', equipment: 'bodyweight', category: 'compound' },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: 'barbell', category: 'isolation' },
  { name: 'EZ Bar Skull Crusher', muscleGroup: 'triceps', equipment: 'barbell', category: 'isolation' },
  { name: 'Dumbbell Skull Crusher', muscleGroup: 'triceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Tricep Pushdown', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'Rope Pushdown', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'V-Bar Pushdown', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'triceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Overhead Extension', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'Rope Overhead Extension', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'Tricep Kickback', muscleGroup: 'triceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Cable Kickback', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'Diamond Push Up', muscleGroup: 'triceps', equipment: 'bodyweight', category: 'compound' },
  { name: 'JM Press', muscleGroup: 'triceps', equipment: 'barbell', category: 'compound' },
  { name: 'Tate Press', muscleGroup: 'triceps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Machine Tricep Extension', muscleGroup: 'triceps', equipment: 'machine', category: 'isolation' },
  { name: 'Single Arm Pushdown', muscleGroup: 'triceps', equipment: 'cable', category: 'isolation' },
  { name: 'French Press', muscleGroup: 'triceps', equipment: 'barbell', category: 'isolation' },

  // LEGS - QUADRICEPS
  { name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Front Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Goblet Squat', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Hack Squat', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Leg Press', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Single Leg Press', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Leg Extension', muscleGroup: 'quadriceps', equipment: 'machine', category: 'isolation' },
  { name: 'Lunge', muscleGroup: 'quadriceps', equipment: 'bodyweight', category: 'compound' },
  { name: 'Dumbbell Lunge', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Barbell Lunge', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Walking Lunge', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Reverse Lunge', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Step Up', muscleGroup: 'quadriceps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Box Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Pause Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Tempo Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Safety Bar Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Zercher Squat', muscleGroup: 'quadriceps', equipment: 'barbell', category: 'compound' },
  { name: 'Sissy Squat', muscleGroup: 'quadriceps', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Smith Machine Squat', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Belt Squat', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Pendulum Squat', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'V Squat', muscleGroup: 'quadriceps', equipment: 'machine', category: 'compound' },
  { name: 'Pistol Squat', muscleGroup: 'quadriceps', equipment: 'bodyweight', category: 'compound' },

  // LEGS - HAMSTRINGS
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', category: 'compound' },
  { name: 'Stiff Leg Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', category: 'compound' },
  { name: 'Single Leg Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'dumbbell', category: 'compound' },
  { name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', category: 'isolation' },
  { name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', category: 'isolation' },
  { name: 'Standing Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', category: 'isolation' },
  { name: 'Nordic Hamstring Curl', muscleGroup: 'hamstrings', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Glute Ham Raise', muscleGroup: 'hamstrings', equipment: 'bodyweight', category: 'compound' },
  { name: 'Cable Pull Through', muscleGroup: 'hamstrings', equipment: 'cable', category: 'compound' },
  { name: 'Kettlebell Swing', muscleGroup: 'hamstrings', equipment: 'kettlebell', category: 'compound' },
  { name: 'Good Morning', muscleGroup: 'hamstrings', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Good Morning', muscleGroup: 'hamstrings', equipment: 'dumbbell', category: 'compound' },
  { name: 'Slider Leg Curl', muscleGroup: 'hamstrings', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Swiss Ball Leg Curl', muscleGroup: 'hamstrings', equipment: 'bodyweight', category: 'isolation' },

  // LEGS - GLUTES
  { name: 'Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Hip Thrust', muscleGroup: 'glutes', equipment: 'dumbbell', category: 'compound' },
  { name: 'Single Leg Hip Thrust', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'compound' },
  { name: 'Glute Bridge', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'compound' },
  { name: 'Barbell Glute Bridge', muscleGroup: 'glutes', equipment: 'barbell', category: 'compound' },
  { name: 'Cable Kickback', muscleGroup: 'glutes', equipment: 'cable', category: 'isolation' },
  { name: 'Cable Pull Through', muscleGroup: 'glutes', equipment: 'cable', category: 'compound' },
  { name: 'Donkey Kick', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Fire Hydrant', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Clamshell', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Banded Clamshell', muscleGroup: 'glutes', equipment: 'band', category: 'isolation' },
  { name: 'Hip Abduction Machine', muscleGroup: 'glutes', equipment: 'machine', category: 'isolation' },
  { name: 'Hip Adduction Machine', muscleGroup: 'glutes', equipment: 'machine', category: 'isolation' },
  { name: 'Sumo Deadlift', muscleGroup: 'glutes', equipment: 'barbell', category: 'compound' },
  { name: 'Sumo Squat', muscleGroup: 'glutes', equipment: 'dumbbell', category: 'compound' },
  { name: 'Frog Pump', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Smith Machine Hip Thrust', muscleGroup: 'glutes', equipment: 'machine', category: 'compound' },

  // LEGS - CALVES
  { name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'machine', category: 'isolation' },
  { name: 'Seated Calf Raise', muscleGroup: 'calves', equipment: 'machine', category: 'isolation' },
  { name: 'Leg Press Calf Raise', muscleGroup: 'calves', equipment: 'machine', category: 'isolation' },
  { name: 'Donkey Calf Raise', muscleGroup: 'calves', equipment: 'machine', category: 'isolation' },
  { name: 'Single Leg Calf Raise', muscleGroup: 'calves', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Smith Machine Calf Raise', muscleGroup: 'calves', equipment: 'machine', category: 'isolation' },
  { name: 'Dumbbell Calf Raise', muscleGroup: 'calves', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Barbell Calf Raise', muscleGroup: 'calves', equipment: 'barbell', category: 'isolation' },
  { name: 'Tibialis Raise', muscleGroup: 'calves', equipment: 'bodyweight', category: 'isolation' },

  // CORE - ABS
  { name: 'Crunch', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Sit Up', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Reverse Crunch', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Bicycle Crunch', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Hanging Knee Raise', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Captain Chair Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable', category: 'isolation' },
  { name: 'Rope Cable Crunch', muscleGroup: 'core', equipment: 'cable', category: 'isolation' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'core', equipment: 'other', category: 'isolation' },
  { name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Side Plank', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Mountain Climber', muscleGroup: 'core', equipment: 'bodyweight', category: 'compound' },
  { name: 'Dead Bug', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Bird Dog', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Russian Twist', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Weighted Russian Twist', muscleGroup: 'core', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Medicine Ball Slam', muscleGroup: 'core', equipment: 'other', category: 'compound' },
  { name: 'Pallof Press', muscleGroup: 'core', equipment: 'cable', category: 'isolation' },
  { name: 'Woodchop', muscleGroup: 'core', equipment: 'cable', category: 'compound' },
  { name: 'Toe Touch', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'V Up', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Flutter Kick', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Scissor Kick', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Dragon Flag', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'L Sit', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Hollow Body Hold', muscleGroup: 'core', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Ab Machine Crunch', muscleGroup: 'core', equipment: 'machine', category: 'isolation' },

  // FOREARMS
  { name: 'Wrist Curl', muscleGroup: 'forearms', equipment: 'barbell', category: 'isolation' },
  { name: 'Dumbbell Wrist Curl', muscleGroup: 'forearms', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Reverse Wrist Curl', muscleGroup: 'forearms', equipment: 'barbell', category: 'isolation' },
  { name: 'Reverse Dumbbell Curl', muscleGroup: 'forearms', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Farmer Walk', muscleGroup: 'forearms', equipment: 'dumbbell', category: 'compound' },
  { name: 'Plate Pinch', muscleGroup: 'forearms', equipment: 'other', category: 'isolation' },
  { name: 'Gripper', muscleGroup: 'forearms', equipment: 'other', category: 'isolation' },
  { name: 'Dead Hang', muscleGroup: 'forearms', equipment: 'bodyweight', category: 'isolation' },
  { name: 'Towel Pull Up', muscleGroup: 'forearms', equipment: 'bodyweight', category: 'compound' },
  { name: 'Fat Grip Training', muscleGroup: 'forearms', equipment: 'other', category: 'compound' },

  // CARDIO EXERCISES
  { name: 'Treadmill Run', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Treadmill Walk', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Treadmill Incline Walk', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Outdoor Run', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Sprint', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Stationary Bike', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Spin Class', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Outdoor Cycling', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Elliptical', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Stair Climber', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Rowing Machine', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Jump Rope', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Box Jump', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Burpee', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Jumping Jack', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'High Knees', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Butt Kick', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Battle Ropes', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Assault Bike', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Ski Erg', muscleGroup: 'cardio', equipment: 'machine', category: 'cardio' },
  { name: 'Swimming', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Stair Run', muscleGroup: 'cardio', equipment: 'bodyweight', category: 'cardio' },
  { name: 'Sled Push', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },
  { name: 'Sled Pull', muscleGroup: 'cardio', equipment: 'other', category: 'cardio' },

  // OLYMPIC LIFTS
  { name: 'Clean', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Power Clean', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Hang Clean', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Clean and Jerk', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Snatch', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Power Snatch', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Hang Snatch', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Clean Pull', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Snatch Pull', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Push Jerk', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Split Jerk', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Thruster', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Thruster', muscleGroup: 'full_body', equipment: 'dumbbell', category: 'compound' },
  { name: 'Wall Ball', muscleGroup: 'full_body', equipment: 'other', category: 'compound' },
  { name: 'Dumbbell Snatch', muscleGroup: 'full_body', equipment: 'dumbbell', category: 'compound' },
  { name: 'Kettlebell Snatch', muscleGroup: 'full_body', equipment: 'kettlebell', category: 'compound' },
  { name: 'Turkish Get Up', muscleGroup: 'full_body', equipment: 'kettlebell', category: 'compound' },
  { name: 'Clean High Pull', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Muscle Snatch', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },

  // TRAP EXERCISES
  { name: 'Barbell Shrug', muscleGroup: 'traps', equipment: 'barbell', category: 'isolation' },
  { name: 'Dumbbell Shrug', muscleGroup: 'traps', equipment: 'dumbbell', category: 'isolation' },
  { name: 'Trap Bar Shrug', muscleGroup: 'traps', equipment: 'barbell', category: 'isolation' },
  { name: 'Cable Shrug', muscleGroup: 'traps', equipment: 'cable', category: 'isolation' },
  { name: 'Machine Shrug', muscleGroup: 'traps', equipment: 'machine', category: 'isolation' },
  { name: 'Behind Back Shrug', muscleGroup: 'traps', equipment: 'barbell', category: 'isolation' },
  { name: 'Farmer Carry', muscleGroup: 'traps', equipment: 'dumbbell', category: 'compound' },
  { name: 'Power Shrug', muscleGroup: 'traps', equipment: 'barbell', category: 'compound' },

  // ADDITIONAL COMPOUND MOVEMENTS
  { name: 'Trap Bar Deadlift', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Dumbbell Complex', muscleGroup: 'full_body', equipment: 'dumbbell', category: 'compound' },
  { name: 'Barbell Complex', muscleGroup: 'full_body', equipment: 'barbell', category: 'compound' },
  { name: 'Man Maker', muscleGroup: 'full_body', equipment: 'dumbbell', category: 'compound' },
  { name: 'Devil Press', muscleGroup: 'full_body', equipment: 'dumbbell', category: 'compound' },

  // STRETCHING/MOBILITY
  { name: 'Foam Rolling', muscleGroup: 'full_body', equipment: 'other', category: 'mobility' },
  { name: 'Hip Flexor Stretch', muscleGroup: 'full_body', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Hamstring Stretch', muscleGroup: 'hamstrings', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Quad Stretch', muscleGroup: 'quadriceps', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Shoulder Dislocate', muscleGroup: 'shoulders', equipment: 'other', category: 'mobility' },
  { name: 'Cat Cow', muscleGroup: 'back', equipment: 'bodyweight', category: 'mobility' },
  { name: 'World Greatest Stretch', muscleGroup: 'full_body', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Pigeon Pose', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'mobility' },
  { name: '90/90 Hip Stretch', muscleGroup: 'glutes', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Thoracic Spine Rotation', muscleGroup: 'back', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Ankle Mobility', muscleGroup: 'calves', equipment: 'bodyweight', category: 'mobility' },
  { name: 'Banded Shoulder Stretch', muscleGroup: 'shoulders', equipment: 'band', category: 'mobility' },
];

async function seed() {
  console.log('🌱 Starting database seed...');

  try {
    // Insert exercises
    console.log(`📝 Inserting ${exerciseData.length} exercises...`);

    const exercisesToInsert = exerciseData.map((exercise) => ({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup as any,
      equipment: exercise.equipment as any,
      category: exercise.category as any,
      description: `${exercise.name} - A ${exercise.category} exercise targeting ${exercise.muscleGroup} using ${exercise.equipment}.`,
      instructions: [
        `Set up properly for ${exercise.name}`,
        'Maintain proper form throughout the movement',
        'Control the weight on both concentric and eccentric phases',
        'Focus on mind-muscle connection',
      ],
      aliases: generateAliases(exercise.name),
    }));

    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < exercisesToInsert.length; i += batchSize) {
      const batch = exercisesToInsert.slice(i, i + batchSize);
      await db.insert(exercises).values(batch).onConflictDoNothing();
      console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(exercisesToInsert.length / batchSize)}`);
    }

    // Create a demo coach user
    console.log('👤 Creating demo coach user...');
    const [demoUser] = await db
      .insert(users)
      .values({
        email: 'coach@voicefit.demo',
        passwordHash: '$2b$10$demohashedpassword', // Not a real password
        name: 'Demo Coach',
      })
      .onConflictDoNothing()
      .returning();

    if (demoUser) {
      await db.insert(userProfiles).values({
        userId: demoUser.id,
        age: 35,
        gender: 'male',
        heightCm: 180,
        weightKg: 82,
        fitnessLevel: fitnessLevel.enumValues[2], // intermediate
        fitnessGoal: fitnessGoal.enumValues[0], // strength
        preferredUnit: 'metric',
      }).onConflictDoNothing();
    }

    console.log('✅ Seed completed successfully!');
    console.log(`  - ${exerciseData.length} exercises`);
    console.log(`  - 1 demo user`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

function generateAliases(name: string): string[] {
  const aliases: string[] = [];

  // Add lowercase version
  aliases.push(name.toLowerCase());

  // Add version without spaces
  aliases.push(name.toLowerCase().replace(/\s+/g, ''));

  // Add common abbreviations
  const abbreviations: Record<string, string> = {
    'Barbell': 'BB',
    'Dumbbell': 'DB',
    'Romanian': 'RDL',
    'Deadlift': 'DL',
    'Overhead': 'OH',
    'Standing': 'Std',
    'Seated': 'Std',
    'Machine': 'Mach',
    'Cable': 'Cab',
    'Extension': 'Ext',
    'Pulldown': 'PD',
  };

  let abbreviated = name;
  for (const [full, abbr] of Object.entries(abbreviations)) {
    if (name.includes(full)) {
      abbreviated = abbreviated.replace(full, abbr);
    }
  }
  if (abbreviated !== name) {
    aliases.push(abbreviated.toLowerCase());
  }

  return aliases;
}

// Run seed
seed();
