import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSnackBar } from '../context/SnackBarContext';
import {
    loadProjectTasks,
    loadTaskDetails,
    createNewTask,
    updateExistingTask,
    updateTaskCompletionStatus,
    startTimer,
    stopTimer,
    groupTasksByStatus,
    calculateTaskStats
} from '../services/taskService';

/**
 * Hook for managing task state and operations
 */
export function useTask(projectId = null) {
    // State management
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [timerRecords, setTimerRecords] = useState([]);
    const [taskNotes, setTaskNotes] = useState([]);
    const [taskLinks, setTaskLinks] = useState([]);
    const [stats, setStats] = useState(null);
    const [timer, setTimer] = useState({
        recordId: null,
        TimeStart: null,
        isPaused: false,
        pauseStartTime: null,
        totalPauseTime: 0,
        adjustment: 0
    });

    const { showError } = useSnackBar();

    // Load tasks when projectId changes
    useEffect(() => {
        if (projectId) {
            loadTasks(projectId);
        }
    }, [projectId]);

    // Update stats when tasks or timer records change
    useEffect(() => {
        setStats(calculateTaskStats(tasks, timerRecords));
    }, [tasks, timerRecords]);

    // Task operations
    const loadTasks = useCallback(async (projId) => {
        try {
            setLoading(true);
            setError(null);
            const result = await loadProjectTasks(projId);
            setTasks(result || []);
        } catch (err) {
            showError('Failed to load tasks. Please try refreshing the page.');
            console.error('Error loading tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [showError]);

    const handleTaskSelect = useCallback(async (taskId) => {
        try {
            setLoading(true);
            setError(null);
            
            const task = tasks.find(t => t.id === taskId);
            if (!task) {
                showError('Task not found');
                return null;
            }
            
            const details = await loadTaskDetails(taskId);
            setTimerRecords(details.timers);
            setTaskNotes(details.notes);
            setTaskLinks(details.links);
            setSelectedTask(task);

            return { task, ...details };
        } catch (err) {
            showError('Failed to load task details. Please try refreshing the page.');
            console.error('Error selecting task:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [tasks, showError]);

    const handleTaskCreate = useCallback(async (taskData) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await createNewTask(taskData);
            if (result) {
                await loadTasks(projectId);
            }
            return result;
        } catch (err) {
            showError(err.message);
            console.error('Error creating task:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [projectId, loadTasks, showError]);

    const handleTaskUpdate = useCallback(async (taskId, taskData) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await updateExistingTask(taskId, taskData);
            if (result) {
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === taskId
                            ? { ...task, ...taskData }
                            : task
                    )
                );
                
                if (selectedTask?.id === taskId) {
                    setSelectedTask(prev => ({ ...prev, ...taskData }));
                }
            }
            return result;
        } catch (err) {
            showError(err.message);
            console.error('Error updating task:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [selectedTask, showError]);

    const handleTaskStatusChange = useCallback(async (taskId, completed) => {
        try {
            setLoading(true);
            setError(null);
            
            const result = await updateTaskCompletionStatus(taskId, completed);
            if (result) {
                setTasks(prevTasks =>
                    prevTasks.map(task =>
                        task.id === taskId
                            ? { ...task, isCompleted: completed }
                            : task
                    )
                );
                
                if (selectedTask?.id === taskId) {
                    setSelectedTask(prev => ({ ...prev, isCompleted: completed }));
                }
            }
            return result;
        } catch (err) {
            showError(err.message);
            console.error('Error updating task status:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, [selectedTask, showError]);

    const handleTimerStart = useCallback(async (task = null) => {
        try {
            const taskToUse = task || selectedTask;
            const result = await startTimer(taskToUse);
            
            if (result) {
                setTimer({
                    recordId: result.recordId,
                    TimeStart: new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    }),
                    isPaused: false,
                    pauseStartTime: null,
                    totalPauseTime: 0,
                    adjustment: 0
                });
            }
        } catch (err) {
            showError(err.message);
            console.error('Error starting timer:', err);
        }
    }, [selectedTask, showError]);

    const handleTimerStop = useCallback(async (saveImmediately = false, description = '') => {
        try {
            if (!timer?.recordId) {
                showError('No active timer');
                return;
            }

            const totalPauseTime = Math.round(timer.totalPauseTime + 
                (timer.isPaused && timer.pauseStartTime 
                    ? (new Date() - timer.pauseStartTime) / 1000 
                    : 0)
            );

            await stopTimer({
                recordId: timer.recordId,
                description,
                saveImmediately,
                totalPauseTime,
                adjustment: timer.adjustment || 0
            });

            if (selectedTask) {
                const details = await loadTaskDetails(selectedTask.id);
                setTimerRecords(details.timers);
            }

            setTimer({
                recordId: null,
                startTime: null,
                isPaused: false,
                pauseStartTime: null,
                totalPauseTime: 0,
                adjustment: 0
            });
        } catch (err) {
            showError(err.message);
            console.error('Error stopping timer:', err);
        }
    }, [timer, selectedTask, showError]);

    const handleTimerPause = useCallback(() => {
        if (!timer?.recordId) {
            showError('No active timer');
            return;
        }

        setTimer(prev => {
            if (prev.isPaused) {
                const pauseDuration = (new Date() - prev.pauseStartTime) / 1000;
                return {
                    ...prev,
                    isPaused: false,
                    pauseStartTime: null,
                    totalPauseTime: prev.totalPauseTime + pauseDuration
                };
            } else {
                return {
                    ...prev,
                    isPaused: true,
                    pauseStartTime: new Date()
                };
            }
        });
    }, [timer, showError]);

    const handleTimerAdjust = useCallback((minutes) => {
        if (!timer?.recordId) {
            showError('No active timer');
            return;
        }

        setTimer(prev => ({
            ...prev,
            adjustment: prev.adjustment + (minutes * 60)
        }));
    }, [timer, showError]);

    // Get grouped tasks
    const { activeTasks, completedTasks } = useMemo(() => {
        //console.log('Tasks in useTask:', tasks);
        const grouped = groupTasksByStatus(tasks || []);
        //console.log('Grouped tasks:', grouped);
        return {
            activeTasks: grouped.active || [],
            completedTasks: grouped.completed || []
        };
    }, [tasks]);

    return {
        // State
        loading,
        error,
        tasks,
        selectedTask,
        timer,
        timerRecords,
        taskNotes,
        taskLinks,
        stats,
        activeTasks,
        completedTasks,
        
        // Task operations
        loadTasks,
        handleTaskSelect,
        handleTaskCreate,
        handleTaskUpdate,
        handleTaskStatusChange,
        
        // Timer operations
        handleTimerStart,
        handleTimerStop,
        handleTimerPause,
        handleTimerAdjust,
        
        // Utilities
        clearError: () => setError(null),
        clearSelectedTask: () => {
            setSelectedTask(null);
            setTimerRecords([]);
            setTaskNotes([]);
            setTaskLinks([]);
            if (timer?.recordId) {
                handleTimerStop(true);
            }
        }
    };
}