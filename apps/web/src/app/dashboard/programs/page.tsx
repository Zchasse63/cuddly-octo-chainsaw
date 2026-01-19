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
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

const programTypeColors: Record<string, string> = {
  strength: 'bg-accent-blue',
  running: 'bg-accent-green',
  hybrid: 'bg-accent-purple',
  crossfit: 'bg-accent-coral',
  custom: 'bg-accent-orange',
};

export default function ProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const programTypes = ['all', 'strength', 'running', 'hybrid', 'crossfit', 'custom'];

  // Fetch program templates from tRPC
  const { data: programs = [], isLoading, error } = trpc.coachDashboard.getProgramTemplates.useQuery({
    programType: filterType !== 'all' ? (filterType as 'strength' | 'running' | 'hybrid' | 'crossfit' | 'custom') : undefined,
  });

  const filteredPrograms = programs.filter((program) => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (program.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

      {/* Error State */}
      {error && (
        <Card variant="bordered" padding="md" className="border-accent-red/50 bg-accent-red/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-accent-red">Failed to load programs</p>
              <p className="text-sm text-text-secondary mt-1">
                {error.message || 'An error occurred while fetching your programs. Please try again.'}
              </p>
            </div>
          </div>
        </Card>
      )}

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
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} variant="elevated" padding="none" className="overflow-hidden">
              <div className="h-2 bg-background-tertiary animate-pulse" />
              <div className="p-6 space-y-4">
                <div className="h-5 bg-background-tertiary rounded animate-pulse w-3/4" />
                <div className="h-6 bg-background-tertiary rounded animate-pulse w-16" />
                <div className="space-y-2">
                  <div className="h-4 bg-background-tertiary rounded animate-pulse w-full" />
                  <div className="h-4 bg-background-tertiary rounded animate-pulse w-5/6" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="h-4 bg-background-tertiary rounded animate-pulse" />
                  <div className="h-4 bg-background-tertiary rounded animate-pulse" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Programs Grid */}
      {!isLoading && (
        <>
          {filteredPrograms.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrograms.map((program) => (
                <Card key={program.id} variant="elevated" padding="none" className="overflow-hidden">
                  <div className={`h-2 ${programTypeColors[program.programType] || 'bg-accent-blue'}`} />
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{program.name}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-background-secondary text-text-secondary">
                          {program.programType.charAt(0).toUpperCase() + program.programType.slice(1)}
                        </span>
                      </div>
                      <button aria-label="More actions" className="p-2 hover:bg-background-secondary rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5 text-text-secondary" />
                      </button>
                    </div>

                    <p className="mt-3 text-sm text-text-secondary line-clamp-2">
                      {program.description || 'No description provided'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-secondary">{program.durationWeeks || 0} weeks</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Dumbbell className="w-4 h-4 text-text-tertiary" />
                        <span className="text-text-secondary">{program.daysPerWeek || 0}x/week</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm col-span-2">
                        <span className="text-text-secondary text-xs">
                          Created {program.createdAt ? new Date(program.createdAt).toLocaleDateString() : 'Recently'}
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
                      <Button variant="ghost" size="sm" aria-label="Copy program">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Delete program" className="text-accent-red hover:text-accent-red">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card variant="bordered" padding="lg" className="text-center">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
              <p className="text-text-secondary mb-2">
                {programs.length === 0
                  ? "You don't have any program templates yet"
                  : "No programs found matching your criteria"}
              </p>
              <p className="text-sm text-text-tertiary mb-4">
                Create program templates to use with your clients
              </p>
              <Link href="/dashboard/programs/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Program
                </Button>
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
