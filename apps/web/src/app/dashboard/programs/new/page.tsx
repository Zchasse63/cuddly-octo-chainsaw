'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Dumbbell,
  Calendar,
  Clock,
  Copy,
  Save,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
}

interface WorkoutDay {
  id: string;
  name: string;
  dayOfWeek: number;
  exercises: Exercise[];
  isExpanded: boolean;
}

interface ProgramWeek {
  id: string;
  weekNumber: number;
  days: WorkoutDay[];
}

const EXERCISE_DATABASE = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Dips',
  'Lunges',
  'Romanian Deadlift',
  'Leg Press',
  'Lat Pulldown',
  'Cable Rows',
  'Incline Bench Press',
  'Front Squat',
  'Hip Thrust',
  'Face Pulls',
  'Tricep Pushdown',
  'Bicep Curls',
  'Lateral Raises',
  'Leg Curls',
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function NewProgramPage() {
  const router = useRouter();
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [weeks, setWeeks] = useState<ProgramWeek[]>([
    {
      id: '1',
      weekNumber: 1,
      days: [
        { id: 'd1', name: 'Upper Body A', dayOfWeek: 0, exercises: [], isExpanded: true },
        { id: 'd2', name: 'Lower Body A', dayOfWeek: 2, exercises: [], isExpanded: false },
        { id: 'd3', name: 'Upper Body B', dayOfWeek: 4, exercises: [], isExpanded: false },
      ],
    },
  ]);
  const [showExerciseSearch, setShowExerciseSearch] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  const addWeek = () => {
    const newWeekNumber = weeks.length + 1;
    const baseWeek = weeks[weeks.length - 1];
    setWeeks([
      ...weeks,
      {
        id: Date.now().toString(),
        weekNumber: newWeekNumber,
        days: baseWeek.days.map((day) => ({
          ...day,
          id: `w${newWeekNumber}_${day.id}`,
          exercises: day.exercises.map((ex) => ({ ...ex, id: `w${newWeekNumber}_${ex.id}` })),
          isExpanded: false,
        })),
      },
    ]);
  };

  const addDay = (weekId: string) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: [
              ...week.days,
              {
                id: Date.now().toString(),
                name: 'New Workout',
                dayOfWeek: week.days.length,
                exercises: [],
                isExpanded: true,
              },
            ],
          };
        }
        return week;
      })
    );
  };

  const addExercise = (weekId: string, dayId: string, exerciseName: string) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: week.days.map((day) => {
              if (day.id === dayId) {
                return {
                  ...day,
                  exercises: [
                    ...day.exercises,
                    {
                      id: Date.now().toString(),
                      name: exerciseName,
                      sets: 3,
                      reps: '8-12',
                      rest: 90,
                    },
                  ],
                };
              }
              return day;
            }),
          };
        }
        return week;
      })
    );
    setShowExerciseSearch(null);
    setExerciseSearch('');
  };

  const removeExercise = (weekId: string, dayId: string, exerciseId: string) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: week.days.map((day) => {
              if (day.id === dayId) {
                return {
                  ...day,
                  exercises: day.exercises.filter((ex) => ex.id !== exerciseId),
                };
              }
              return day;
            }),
          };
        }
        return week;
      })
    );
  };

  const updateExercise = (
    weekId: string,
    dayId: string,
    exerciseId: string,
    updates: Partial<Exercise>
  ) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: week.days.map((day) => {
              if (day.id === dayId) {
                return {
                  ...day,
                  exercises: day.exercises.map((ex) =>
                    ex.id === exerciseId ? { ...ex, ...updates } : ex
                  ),
                };
              }
              return day;
            }),
          };
        }
        return week;
      })
    );
  };

  const toggleDayExpanded = (weekId: string, dayId: string) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: week.days.map((day) =>
              day.id === dayId ? { ...day, isExpanded: !day.isExpanded } : day
            ),
          };
        }
        return week;
      })
    );
  };

  const updateDayName = (weekId: string, dayId: string, name: string) => {
    setWeeks(
      weeks.map((week) => {
        if (week.id === weekId) {
          return {
            ...week,
            days: week.days.map((day) => (day.id === dayId ? { ...day, name } : day)),
          };
        }
        return week;
      })
    );
  };

  const filteredExercises = EXERCISE_DATABASE.filter((ex) =>
    ex.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  const handleSave = () => {
    console.log('Saving program:', { name: programName, description: programDescription, weeks });
    router.push('/dashboard/programs');
  };

  const getTotalExercises = () => {
    return weeks[0]?.days.reduce((sum, day) => sum + day.exercises.length, 0) || 0;
  };

  const getTotalWorkouts = () => {
    return weeks[0]?.days.length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Create Program</h1>
            <p className="text-text-secondary">Build a custom training program</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Generate
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Program
          </Button>
        </div>
      </div>

      {/* Program Info */}
      <Card variant="bordered" padding="lg">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Program Name *</label>
            <Input
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="e.g., 12-Week Strength Builder"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Duration</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-background-secondary rounded-xl">
                <Calendar className="w-4 h-4 text-text-tertiary" />
                <span className="font-medium">{weeks.length} weeks</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Sessions/Week</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-background-secondary rounded-xl">
                <Dumbbell className="w-4 h-4 text-text-tertiary" />
                <span className="font-medium">{getTotalWorkouts()}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Exercises</label>
              <div className="flex items-center gap-2 px-4 py-2 bg-background-secondary rounded-xl">
                <Clock className="w-4 h-4 text-text-tertiary" />
                <span className="font-medium">{getTotalExercises()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={programDescription}
            onChange={(e) => setProgramDescription(e.target.value)}
            placeholder="Describe the program goals and structure..."
            rows={2}
            className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
          />
        </div>
      </Card>

      {/* Week Builder */}
      {weeks.map((week) => (
        <Card key={week.id} variant="default" padding="none">
          <div className="p-4 border-b border-background-tertiary flex items-center justify-between">
            <h2 className="text-lg font-semibold">Week {week.weekNumber}</h2>
            <Button variant="ghost" size="sm" onClick={() => addDay(week.id)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Day
            </Button>
          </div>

          <div className="p-4 space-y-4">
            {week.days.map((day) => (
              <div
                key={day.id}
                className="border border-background-tertiary rounded-xl overflow-hidden"
              >
                {/* Day Header */}
                <div
                  className="p-4 bg-background-secondary flex items-center gap-4 cursor-pointer"
                  onClick={() => toggleDayExpanded(week.id, day.id)}
                >
                  <GripVertical className="w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={day.name}
                    onChange={(e) => updateDayName(week.id, day.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent font-medium focus:outline-none"
                  />
                  <span className="text-sm text-text-secondary">
                    {day.exercises.length} exercises
                  </span>
                  {day.isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-text-tertiary" />
                  )}
                </div>

                {/* Day Exercises */}
                {day.isExpanded && (
                  <div className="p-4 space-y-3">
                    {day.exercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        className="flex items-center gap-4 p-3 bg-background-secondary rounded-lg"
                      >
                        <span className="text-sm text-text-tertiary w-6">{index + 1}</span>
                        <div className="flex-1">
                          <p className="font-medium">{exercise.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={exercise.sets}
                            onChange={(e) =>
                              updateExercise(week.id, day.id, exercise.id, {
                                sets: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-12 px-2 py-1 bg-background-tertiary rounded text-center text-sm"
                          />
                          <span className="text-text-tertiary">×</span>
                          <input
                            type="text"
                            value={exercise.reps}
                            onChange={(e) =>
                              updateExercise(week.id, day.id, exercise.id, { reps: e.target.value })
                            }
                            className="w-16 px-2 py-1 bg-background-tertiary rounded text-center text-sm"
                          />
                        </div>
                        <button
                          onClick={() => removeExercise(week.id, day.id, exercise.id)}
                          className="p-1 hover:bg-background-tertiary rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-text-tertiary hover:text-accent-red" />
                        </button>
                      </div>
                    ))}

                    {/* Add Exercise */}
                    {showExerciseSearch === day.id ? (
                      <div className="relative">
                        <Input
                          value={exerciseSearch}
                          onChange={(e) => setExerciseSearch(e.target.value)}
                          placeholder="Search exercises..."
                          autoFocus
                          onBlur={() => setTimeout(() => setShowExerciseSearch(null), 200)}
                        />
                        {exerciseSearch && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-background-primary border border-background-tertiary rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                            {filteredExercises.slice(0, 8).map((ex) => (
                              <button
                                key={ex}
                                onClick={() => addExercise(week.id, day.id, ex)}
                                className="w-full px-4 py-2 text-left hover:bg-background-secondary transition-colors"
                              >
                                {ex}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowExerciseSearch(day.id)}
                        className="w-full py-3 border-2 border-dashed border-background-tertiary rounded-lg text-text-secondary hover:text-accent-blue hover:border-accent-blue transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Add Week Button */}
      <button
        onClick={addWeek}
        className="w-full py-4 border-2 border-dashed border-background-tertiary rounded-xl text-text-secondary hover:text-accent-blue hover:border-accent-blue transition-colors flex items-center justify-center gap-2"
      >
        <Copy className="w-4 h-4" />
        Duplicate Week {weeks.length} → Week {weeks.length + 1}
      </button>
    </div>
  );
}
