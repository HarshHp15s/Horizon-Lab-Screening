import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle2, Plus, FileText, AlertTriangle, Edit2, Trash2, Calendar, Circle, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import { v4 as uuidv4 } from 'uuid';

// cn helper function (Shadcn-UI)
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Custom hook to handle the countdown timer logic
const useTimer = (initialTime: number) => {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const timerRef = useRef<number | null>(null);

  const startTimer = () => {
    if (timerRef.current) return;
    setIsTimeUp(false);
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current as number);
          setIsTimeUp(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(initialTime);
    setIsTimeUp(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  return { timeRemaining, isTimeUp, formatTime, startTimer, resetTimer };
};

// Define proper TypeScript interfaces for Task and Priority
type Priority = 'high' | 'medium' | 'low';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

// Badge Component (Updated with new variants)
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom variants for priority colors
        success: "bg-success/20 text-success border-success",
        warning: "bg-warning/20 text-warning border-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
};
Badge.displayName = "Badge";

// A helper object to map priorities to the new badge variants
const priorityVariantMap: Record<Priority, 'destructive' | 'warning' | 'success'> = {
  high: "destructive",
  medium: "warning",
  low: "success",
};

// TaskCard Component (Refactored to use the variant prop)
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const TaskCard = ({ task, onEdit, onDelete, onToggleComplete }: TaskCardProps) => {
  return (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 transition-shadow hover:shadow-lg">
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
            onClick={() => onToggleComplete(task)}
            className="focus:outline-none"
          >
            {task.completed ? (
              <CheckCircle2 className="text-success w-5 h-5" />
            ) : (
              <Circle className="text-muted-foreground w-5 h-5" />
            )}
          </button>
          <h3 className={`font-semibold text-lg truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
          <Badge variant={priorityVariantMap[task.priority]} className="ml-2 border">
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>
        </div>
        {task.description && (
          <p className={`text-sm text-muted-foreground ${task.completed ? 'line-through' : ''}`}>{task.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Calendar className="w-4 h-4" />
          <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
        </div>
      </div>
      <div className="flex gap-2 mt-2 sm:mt-0">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)} aria-label="Edit task">
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(task)} aria-label="Delete task">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

// TaskForm Component
interface TaskFormProps {
  onSave: (task: Task) => void;
  onCancel: () => void;
  initialTask?: Task | null;
}

const TaskForm = ({ onSave, onCancel, initialTask }: TaskFormProps) => {
  const [title, setTitle] = useState(initialTask?.title || "");
  const [description, setDescription] = useState(initialTask?.description || "");
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || "medium");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate ? initialTask.dueDate.substring(0, 10) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = "Title is required.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newTask: Task = {
      id: initialTask?.id || uuidv4(),
      title,
      description,
      priority,
      completed: initialTask?.completed || false,
      dueDate: dueDate || undefined,
      createdAt: initialTask?.createdAt || new Date().toISOString(),
    };
    onSave(newTask);
    onCancel();
  };

  return (
    <Card className="animate-in fade-in slide-in-from-top-4">
      <CardHeader>
        <CardTitle>{initialTask ? "Edit Task" : "Add New Task"}</CardTitle>
        <CardDescription>
          {initialTask ? "Update the details for this task." : "Create a new task to manage your work."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Complete project report"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && <p className="text-destructive text-sm mt-1">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details about the task..."
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <RadioGroup
              defaultValue={priority}
              onValueChange={(value: Priority) => setPriority(value)}
              className="flex items-center gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="low-priority" />
                <Label htmlFor="low-priority">Low</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="medium-priority" />
                <Label htmlFor="medium-priority">Medium</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="high-priority" />
                <Label htmlFor="high-priority">High</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {initialTask ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};


const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [testStarted, setTestStarted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { timeRemaining, isTimeUp, formatTime, startTimer, resetTimer } = useTimer(3600); // 60 minutes
  
  // Load tasks from localStorage on initial render
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('tasks');
      if (storedTasks) {
        const loadedTasks: Task[] = JSON.parse(storedTasks);
        setTasks(loadedTasks);
      }
    } catch (error) {
      console.error("Failed to load tasks from localStorage:", error);
    }
  }, []);

  // Save tasks to localStorage whenever the tasks state changes
  useEffect(() => {
    try {
      localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks to localStorage:", error);
    }
  }, [tasks]);

  // Filter tasks based on search query whenever tasks or query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const newFilteredTasks = tasks.filter(task => 
        task.title.toLowerCase().includes(lowerCaseQuery) ||
        (task.description && task.description.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredTasks(newFilteredTasks);
    }
  }, [tasks, searchQuery]);


  const handleStartTest = () => {
    setTestStarted(true);
    startTimer();
  };
  
  const handleResetTest = () => {
    setTestStarted(false);
    resetTimer();
    setTasks([]);
    setShowForm(false);
  };

  const handleAddTask = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
    setShowForm(false);
  };

  const handleEditTask = (taskToEdit: Task) => {
    setEditingTask(taskToEdit);
    setShowForm(true);
  };

  const handleSaveEditedTask = (editedTask: Task) => {
    setTasks(tasks.map(task => task.id === editedTask.id ? editedTask : task));
    setEditingTask(null);
    setShowForm(false);
  };

  const handleDeleteTask = (taskToDelete: Task) => {
    setTasks(tasks.filter(task => task.id !== taskToDelete.id));
  };

  const handleToggleComplete = (taskToToggle: Task) => {
    setTasks(
      tasks.map(task => 
        task.id === taskToToggle.id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">
                60-Minute Frontend Test
              </h1>
              <p className="text-muted-foreground mt-2">
                Build a Task Management Application
              </p>
            </div>
            <div className="flex items-center gap-4">
              {!testStarted ? (
                <Button onClick={handleStartTest} size="lg" className="bg-primary hover:bg-primary/90">
                  Start Test
                </Button>
              ) : (
                <>
                  <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1 rounded-full ${
                    timeRemaining <= 300 ? 'bg-destructive/20 text-destructive' : 
                    timeRemaining <= 900 ? 'bg-warning/20 text-warning' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    <Clock className="w-4 h-4" />
                    <span>Time Remaining: {formatTime(timeRemaining)}</span>
                  </div>
                  <Button onClick={handleResetTest} variant="outline" size="sm">
                    Reset Test
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Time Up Alert */}
        {isTimeUp && (
          <Alert className="mb-6 border-destructive bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium">
              Time's up! The 60-minute test period has ended. Please stop coding and review your work.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Test Not Started State */}
        {!testStarted && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Ready to Start Your 60-Minute Test?</CardTitle>
                <CardDescription className="text-lg">
                  Once you click "Start Test", the timer will begin and you'll have exactly 60 minutes to complete the task management application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">What you'll be building:</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• TaskCard component with proper TypeScript interfaces</li>
                    <li>• CRUD operations with localStorage persistence</li>
                    <li>• Validated task form with error handling</li>
                    <li>• Responsive design with smooth animations</li>
                    <li>• One advanced feature (search, sort, or drag & drop)</li>
                  </ul>
                </div>
                <div className="flex justify-center pt-4">
                  <Button onClick={handleStartTest} size="lg" className="bg-primary hover:bg-primary/90">
                    <Clock className="w-4 h-4 mr-2" />
                    Start 60-Minute Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Test Content - Only show when test is started */}
        {testStarted && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Requirements Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Test Requirements
                  </CardTitle>
                  <CardDescription>
                    Complete these features within 60 minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ Project Setup (5min)</h4>
                    <p className="text-xs text-muted-foreground">Understanding the codebase and technologies</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ TaskCard Component (15min)</h4>
                    <p className="text-xs text-muted-foreground">Create reusable task display component</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ State Management (10min)</h4>
                    <p className="text-xs text-muted-foreground">CRUD operations with localStorage</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ Task Form (15min)</h4>
                    <p className="text-xs text-muted-foreground">Form with validation and error handling</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ Styling & UX (10min)</h4>
                    <p className="text-xs text-muted-foreground">Animations, responsive design, accessibility</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">✅ Advanced Feature (5min)</h4>
                    <p className="text-xs text-muted-foreground">Search, sort, or drag & drop</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Application Area */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold">My Tasks</h2>
                    <p className="text-muted-foreground">
                      {filteredTasks.length === 0 ? "No tasks found" : `${filteredTasks.length} tasks`}
                    </p>
                  </div>
                  <div className="flex items-center w-full sm:w-auto gap-2">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingTask(null);
                        setShowForm(!showForm);
                      }}
                      className="bg-primary hover:bg-primary/90"
                      disabled={isTimeUp}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>

                {/* TaskForm component */}
                {showForm && (
                  <TaskForm
                    onSave={editingTask ? handleSaveEditedTask : handleAddTask}
                    onCancel={() => setShowForm(false)}
                    initialTask={editingTask}
                  />
                )}

                {/* Task List Area */}
                <div className="space-y-4">
                  {filteredTasks.length === 0 ? (
                    <Card className="border-dashed animate-in fade-in">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <CheckCircle2 className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                        <p className="text-muted-foreground text-center max-w-sm">
                          {searchQuery.trim() === "" ? "Get started by creating your first task. Click the 'Add Task' button above." : `No tasks matching "${searchQuery}"`}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {filteredTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={handleEditTask}
                          onDelete={handleDeleteTask}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
    </div>
  );
}

export default Index;
