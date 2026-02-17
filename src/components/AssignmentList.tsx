import { useMemo, useState } from "react";
import { Assignment, Course, getClassDotColor } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { format, parseISO, startOfWeek } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Props {
  assignments: Assignment[];
  courses: Course[];
  loading: boolean;
  onToggleComplete: (id: string, current: boolean) => void;
}

type AssignmentSection = {
  label: string;
  items: Assignment[];
  sortValue: number;
};

type DaySection = {
  label: string;
  items: Assignment[];
};

type WeeklySection = {
  label: string;
  sortValue: number;
  days: DaySection[];
};

type GroupingMode = "weekly" | "monthly" | "yearly";

const GROUPING_OPTIONS: Array<{ value: GroupingMode; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

function sortAssignmentsByDate(a: Assignment, b: Assignment) {
  const aDate = a.due_date ?? a.posted_date;
  const bDate = b.due_date ?? b.posted_date;

  if (!aDate && !bDate) return a.title.localeCompare(b.title);
  if (!aDate) return 1;
  if (!bDate) return -1;

  return new Date(aDate).getTime() - new Date(bDate).getTime();
}

function buildWeeklySections(assignments: Assignment[]) {
  const weeklyGroups = new Map<string, { label: string; sortValue: number; dayGroups: Record<string, Assignment[]> }>();
  const noDueDate: Assignment[] = [];

  for (const assignment of assignments) {
    const groupingDate = assignment.due_date ?? assignment.posted_date;
    if (!groupingDate) {
      noDueDate.push(assignment);
      continue;
    }

    const date = parseISO(groupingDate);

    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const weekday = format(date, "EEEE");

    const existing = weeklyGroups.get(weekKey);
    if (!existing) {
      const dayGroups = Object.fromEntries(WEEK_DAYS.map((day) => [day, [] as Assignment[]])) as Record<string, Assignment[]>;
      dayGroups[weekday]?.push(assignment);

      weeklyGroups.set(weekKey, {
        label: `WEEK OF ${format(weekStart, "MMM d, yyyy")}`.toUpperCase(),
        sortValue: weekStart.getTime(),
        dayGroups,
      });
    } else {
      if (existing.dayGroups[weekday]) {
        existing.dayGroups[weekday].push(assignment);
      } else {
        noDueDate.push(assignment);
      }
    }
  }

  const weeklySections: WeeklySection[] = Array.from(weeklyGroups.values())
    .sort((a, b) => a.sortValue - b.sortValue)
    .map((week) => ({
      label: week.label,
      sortValue: week.sortValue,
      days: WEEK_DAYS
        .map((day) => ({
          label: day.toUpperCase(),
          items: week.dayGroups[day].sort(sortAssignmentsByDate),
        }))
        .filter((day) => day.items.length > 0),
    }));

  return { weeklySections, noDueDate: noDueDate.sort(sortAssignmentsByDate) };
}

function buildPeriodSections(assignments: Assignment[], groupingMode: Exclude<GroupingMode, "weekly">) {
  const periodGroups = new Map<string, AssignmentSection>();
  const noDueDate: Assignment[] = [];

  for (const assignment of assignments) {
    const groupingDate = assignment.due_date ?? assignment.posted_date;
    if (!groupingDate) {
      noDueDate.push(assignment);
      continue;
    }

    const date = parseISO(groupingDate);

    const periodConfig = groupingMode === "monthly"
      ? {
          key: format(date, "yyyy-MM"),
          label: format(date, "MMMM yyyy"),
          sortValue: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        }
      : {
          key: format(date, "yyyy"),
          label: format(date, "yyyy"),
          sortValue: new Date(date.getFullYear(), 0, 1).getTime(),
        };

    const existing = periodGroups.get(periodConfig.key);
    if (!existing) {
      periodGroups.set(periodConfig.key, {
        label: periodConfig.label.toUpperCase(),
        sortValue: periodConfig.sortValue,
        items: [assignment],
      });
      continue;
    }

    existing.items.push(assignment);
  }

  const sections: AssignmentSection[] = Array.from(periodGroups.values())
    .sort((a, b) => a.sortValue - b.sortValue)
    .map((group) => ({
      label: group.label,
      sortValue: group.sortValue,
      items: group.items.sort(sortAssignmentsByDate),
    }));

  if (noDueDate.length > 0) {
    sections.push({
      label: "NO DATE INFO",
      sortValue: Number.MAX_SAFE_INTEGER,
      items: noDueDate.sort(sortAssignmentsByDate),
    });
  }

  return sections;
}

export default function AssignmentList({ assignments, courses, loading, onToggleComplete }: Props) {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("weekly");
  const courseMap = useMemo(() => Object.fromEntries(courses.map((c) => [c.id, c])), [courses]);
  const weeklyData = useMemo(() => buildWeeklySections(assignments), [assignments]);
  const periodSections = useMemo(
    () => (groupingMode === "weekly" ? [] : buildPeriodSections(assignments, groupingMode)),
    [assignments, groupingMode]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📭</div>
        <p className="text-muted-foreground">No assignments yet. Hit "Sync Now" to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-xl border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Group by</span>
          {GROUPING_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={groupingMode === option.value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setGroupingMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Card>

      {groupingMode === "weekly" ? (
        <>
          {weeklyData.weeklySections.map((weekSection) => (
            <Card key={weekSection.label} className="overflow-hidden rounded-xl border shadow-sm">
              <div className="bg-foreground px-4 py-2">
                <h3 className="text-sm font-bold tracking-wide text-background">{weekSection.label}</h3>
              </div>
              <div>
                {weekSection.days.map((daySection, index) => (
                  <div key={`${weekSection.label}-${daySection.label}`} className={index === 0 ? "" : "border-t"}>
                    <div className="bg-muted/50 px-4 py-2">
                      <h4 className="text-xs font-semibold tracking-wide text-foreground">{daySection.label}</h4>
                    </div>
                    <AssignmentsTable
                      assignments={daySection.items}
                      courseMap={courseMap}
                      onToggleComplete={onToggleComplete}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {weeklyData.noDueDate.length > 0 && (
            <Card className="overflow-hidden rounded-xl border shadow-sm">
              <div className="bg-foreground px-4 py-2">
                <h3 className="text-sm font-bold tracking-wide text-background">NO DATE INFO</h3>
              </div>
              <AssignmentsTable
                assignments={weeklyData.noDueDate}
                courseMap={courseMap}
                onToggleComplete={onToggleComplete}
              />
            </Card>
          )}
        </>
      ) : (
        <>
          {periodSections.map((section) => (
            <Card key={section.label} className="overflow-hidden rounded-xl border shadow-sm">
              <div className="bg-foreground px-4 py-2">
                <h3 className="text-sm font-bold tracking-wide text-background">{section.label}</h3>
              </div>
              <AssignmentsTable
                assignments={section.items}
                courseMap={courseMap}
                onToggleComplete={onToggleComplete}
              />
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

function AssignmentsTable({
  assignments,
  courseMap,
  onToggleComplete,
}: {
  assignments: Assignment[];
  courseMap: Record<string, Course>;
  onToggleComplete: (id: string, current: boolean) => void;
}) {
  return (
    <Table className="text-sm">
      <TableHeader>
        <TableRow className="border-b bg-muted/50 hover:bg-muted/50">
          <TableHead className="h-10 w-[24%] px-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Subject
          </TableHead>
          <TableHead className="h-10 w-[46%] px-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Assignment
          </TableHead>
          <TableHead className="h-10 w-[22%] px-3 text-xs font-semibold uppercase tracking-wide text-foreground">
            Date Due
          </TableHead>
          <TableHead className="h-10 w-[8%] px-3 text-center text-xs font-semibold uppercase tracking-wide text-foreground">
            Done
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <AssignmentRow
            key={assignment.id}
            assignment={assignment}
            course={courseMap[assignment.course_id]}
            onToggle={() => onToggleComplete(assignment.id, assignment.is_completed)}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function AssignmentRow({
  assignment,
  course,
  onToggle,
}: {
  assignment: Assignment;
  course?: Course;
  onToggle: () => void;
}) {
  const dueDateLabel = assignment.due_date
    ? format(parseISO(assignment.due_date), "EEE, MMM d, yyyy, h:mm a")
    : assignment.posted_date
      ? `No due date (posted ${format(parseISO(assignment.posted_date), "EEE, MMM d, yyyy")})`
      : "No due date";

  return (
    <TableRow className={assignment.is_completed ? "opacity-65" : ""}>
      <TableCell className="px-3 py-2 align-top">
        <div className="flex items-center gap-2">
          {course && (
            <span className={`h-2.5 w-2.5 rounded-full ${getClassDotColor(course.color_index)}`} />
          )}
          <span className="line-clamp-2 font-medium text-foreground/85">
            {course?.title ?? "Unknown Subject"}
          </span>
        </div>
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        <p className={`line-clamp-2 font-semibold text-sm ${assignment.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
          {assignment.title}
        </p>
      </TableCell>
      <TableCell className="px-3 py-2 align-top">
        <span className="text-xs font-medium text-foreground/75 dark:text-foreground/80">
          {dueDateLabel}
        </span>
      </TableCell>
      <TableCell className="px-3 py-2 text-center align-top">
        <Checkbox
          checked={assignment.is_completed}
          onCheckedChange={onToggle}
          className="h-5 w-5 rounded-sm"
          aria-label={`Mark ${assignment.title} as done`}
        />
      </TableCell>
    </TableRow>
  );
}
