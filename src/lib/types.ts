import { Tables } from "@/integrations/supabase/types";

export type Course = Tables<"courses">;
export type Assignment = Tables<"assignments"> & {
  courses?: Course;
};

export const CLASS_COLORS = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-sunshine text-foreground",
  "bg-mint text-foreground",
  "bg-coral text-foreground",
  "bg-sky text-foreground",
  "bg-lavender text-foreground",
];

export const CLASS_DOT_COLORS = [
  "bg-primary",
  "bg-secondary",
  "bg-accent",
  "bg-sunshine",
  "bg-mint",
  "bg-coral",
  "bg-sky",
  "bg-lavender",
];

export function getClassColor(colorIndex: number) {
  return CLASS_COLORS[colorIndex % CLASS_COLORS.length];
}

export function getClassDotColor(colorIndex: number) {
  return CLASS_DOT_COLORS[colorIndex % CLASS_DOT_COLORS.length];
}
