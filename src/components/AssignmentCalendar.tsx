import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Assignment, Course, getClassDotColor, getClassColor } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO, isSameDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  assignments: Assignment[];
  courses: Course[];
  onToggleComplete: (id: string, current: boolean) => void;
}

export default function AssignmentCalendar({ assignments, courses, onToggleComplete }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]));

  const assignmentDates = assignments
    .filter((a) => a.due_date && !a.is_completed)
    .map((a) => parseISO(a.due_date!));

  const selectedAssignments = selectedDate
    ? assignments.filter((a) => a.due_date && isSameDay(parseISO(a.due_date), selectedDate))
    : [];

  return (
    <div className="space-y-4">
      <Card className="rounded-xl p-2 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ hasAssignment: assignmentDates }}
          modifiersStyles={{
            hasAssignment: {
              fontWeight: "bold",
              textDecoration: "underline",
              textDecorationColor: "hsl(var(--primary))",
              textUnderlineOffset: "4px",
            },
          }}
        />
      </Card>

      {selectedDate && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-2">
            {format(selectedDate, "EEEE, MMM d")}
          </h3>
          <AnimatePresence>
            {selectedAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assignments due this day 🎉</p>
            ) : (
              <div className="space-y-2">
                {selectedAssignments.map((a) => {
                  const course = courseMap[a.course_id];
                  const colorClass = course ? getClassColor(course.color_index) : "bg-muted text-muted-foreground";
                  return (
                    <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Card className="p-3 rounded-xl flex items-start gap-3">
                        <Checkbox
                          checked={a.is_completed}
                          onCheckedChange={() => onToggleComplete(a.id, a.is_completed)}
                          className="mt-1 h-5 w-5 rounded-full"
                        />
                        <div className="flex-1">
                          {course && (
                            <Badge className={`${colorClass} text-xs rounded-full mb-1`}>
                              {course.title}
                            </Badge>
                          )}
                          <p className={`font-semibold text-sm ${a.is_completed ? "line-through text-muted-foreground" : ""}`}>
                            {a.title}
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
