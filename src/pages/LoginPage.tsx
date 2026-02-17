import { motion } from "framer-motion";
import { BookOpen, CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <ThemeToggle className="absolute right-4 top-4 border border-border bg-card/80 backdrop-blur-sm hover:bg-card" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-6"
        >
          📚
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-display mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          The Plans
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your homework, automatically organized. Sync with Google Classroom and never miss an assignment again!
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: BookOpen, label: "Auto-sync assignments", color: "text-primary" },
            { icon: CalendarDays, label: "Calendar & list views", color: "text-secondary" },
            { icon: CheckCircle2, label: "Track completion", color: "text-accent" },
          ].map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex flex-col items-center gap-2"
            >
              <feature.icon className={`w-8 h-8 ${feature.color}`} />
              <span className="text-xs text-muted-foreground text-center">{feature.label}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button
            onClick={signInWithGoogle}
            size="lg"
            className="rounded-full px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
