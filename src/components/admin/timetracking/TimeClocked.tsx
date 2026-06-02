import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, TrendingUp, Calendar } from 'lucide-react';
import { useWorkerTimeEntries } from '@/hooks/useWorkerTimeEntries';
import { TimeCalendarView } from './TimeCalendarView';
import { TimePieChart } from './TimePieChart';
import { TimeEntryTable } from './TimeEntryTable';
import { Loader2 } from 'lucide-react';

function calcHours(entry: { clock_in: string; clock_out: string | null }): number {
  if (!entry.clock_out) return 0;
  return (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000;
}

export function TimeClocked() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: entries = [], isLoading } = useWorkerTimeEntries(currentMonth);

  const totalHours = entries.reduce((sum, e) => sum + calcHours(e), 0);
  const uniqueWorkers = new Set(entries.map(e => e.worker_id)).size;
  const daysWorked = new Set(entries.map(e => new Date(e.clock_in).toDateString())).size;
  const avgPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          Time Clocked
        </h2>
        <p className="text-muted-foreground text-sm">Track worker hours and attendance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Hours</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalHours.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Avg / Day</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgPerDay.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Workers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{uniqueWorkers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Days Worked</span>
            </div>
            <p className="text-2xl font-bold mt-1">{daysWorked}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeCalendarView entries={entries} currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hours Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <TimePieChart entries={entries} />
          </CardContent>
        </Card>
      </div>

      {/* Time Entry Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Time Entry Log</CardTitle>
        </CardHeader>
        <CardContent>
          <TimeEntryTable entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
}

export default TimeClocked;
