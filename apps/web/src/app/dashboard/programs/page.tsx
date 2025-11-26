'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Users,
  Calendar,
  Dumbbell,
  Copy,
  Edit,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

const mockPrograms = [
  {
    id: '1',
    name: 'Strength Builder',
    description: '12-week progressive overload program for building strength',
    duration: '12 weeks',
    type: 'Strength',
    activeClients: 23,
    totalClients: 45,
    workoutsPerWeek: 4,
    createdAt: 'Dec 15, 2023',
    color: 'bg-accent-blue',
  },
  {
    id: '2',
    name: 'Hypertrophy Focus',
    description: 'Muscle building program with volume-based training',
    duration: '8 weeks',
    type: 'Hypertrophy',
    activeClients: 18,
    totalClients: 32,
    workoutsPerWeek: 5,
    createdAt: 'Jan 10, 2024',
    color: 'bg-accent-purple',
  },
  {
    id: '3',
    name: '12-Week Transformation',
    description: 'Complete body recomposition with diet and training',
    duration: '12 weeks',
    type: 'Fat Loss',
    activeClients: 31,
    totalClients: 67,
    workoutsPerWeek: 5,
    createdAt: 'Nov 1, 2023',
    color: 'bg-accent-coral',
  },
  {
    id: '4',
    name: 'Marathon Prep',
    description: 'Endurance training for marathon preparation',
    duration: '16 weeks',
    type: 'Cardio',
    activeClients: 8,
    totalClients: 12,
    workoutsPerWeek: 6,
    createdAt: 'Feb 1, 2024',
    color: 'bg-accent-green',
  },
  {
    id: '5',
    name: 'Powerlifting Peaking',
    description: 'Competition prep for powerlifting meets',
    duration: '10 weeks',
    type: 'Strength',
    activeClients: 5,
    totalClients: 14,
    workoutsPerWeek: 4,
    createdAt: 'Jan 20, 2024',
    color: 'bg-accent-orange',
  },
];

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const programTypes = ['all', 'Strength', 'Hypertrophy', 'Fat Loss', 'Cardio'];

  const filteredPrograms = mockPrograms.filter((program) => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      program.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || program.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-text-secondary">Create and manage training programs</p>
        </div>
        <Link href="/dashboard/programs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card variant="bordered" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-background-secondary rounded-xl border border-background-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              {programTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Programs Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => (
          <Card key={program.id} variant="elevated" padding="none" className="overflow-hidden">
            <div className={`h-2 ${program.color}`} />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{program.name}</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-background-secondary text-text-secondary">
                    {program.type}
                  </span>
                </div>
                <button className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              <p className="mt-3 text-sm text-text-secondary line-clamp-2">
                {program.description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{program.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Dumbbell className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">{program.workoutsPerWeek}x/week</span>
                </div>
                <div className="flex items-center gap-2 text-sm col-span-2">
                  <Users className="w-4 h-4 text-text-tertiary" />
                  <span className="text-text-secondary">
                    {program.activeClients} active / {program.totalClients} total clients
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-background-tertiary flex gap-2">
                <Link href={`/dashboard/programs/${program.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </Link>
                <Button variant="ghost" size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-accent-red hover:text-accent-red">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <Card variant="bordered" padding="lg" className="text-center">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
          <p className="text-text-secondary">No programs found matching your criteria</p>
          <Link href="/dashboard/programs/new">
            <Button className="mt-4">Create Your First Program</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
