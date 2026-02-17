import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, RefreshCw, List, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";
import AssignmentList from "@/components/AssignmentList";
import AssignmentCalendar from "@/components/AssignmentCalendar";
import { useAssignments } from "@/hooks/useAssignments";
import ThemeToggle from "@/components/ThemeToggle";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { assignments, courses, loading, syncing, syncAssignments, toggleComplete } = useAssignments();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Student";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <h1 className="text-xl font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              The Plans
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={syncAssignments}
              disabled={syncing}
              className="rounded-full"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
            <ThemeToggle className="h-9 w-9" />
            <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-display">Hey {firstName}! 👋</h2>
          <p className="text-muted-foreground text-sm">
            {assignments.filter((a) => !a.is_completed).length} assignments pending
          </p>
        </motion.div>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="w-full rounded-full bg-muted p-1 mb-4">
            <TabsTrigger value="list" className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <List className="w-4 h-4 mr-1" /> List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CalendarDays className="w-4 h-4 mr-1" /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
            <AssignmentList
              assignments={assignments}
              courses={courses}
              loading={loading}
              onToggleComplete={toggleComplete}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <AssignmentCalendar
              assignments={assignments}
              courses={courses}
              onToggleComplete={toggleComplete}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
