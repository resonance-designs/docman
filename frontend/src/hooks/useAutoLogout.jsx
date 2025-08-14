/*
 * @author Richard Bakos
 * @version 1.1.10
 * @license UNLICENSED
 */
// hooks/useAutoLogout.js
import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

const useAutoLogout = (isAuthenticated, onLogout, timeoutMinutes = 15, debugId = 'unknown', enableDebug = false) => {
    const timeoutRef = useRef(null);
    const warningTimeoutRef = useRef(null);
    const TIMEOUT_DURATION = timeoutMinutes * 60 * 1000; // Convert to milliseconds
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before logout

    // Debug logging helper
    const debugLog = (message, data = null) => {
        if (enableDebug) {
            if (data) {
                console.log(message, data);
            } else {
                console.log(message);
            }
        }
    };

    const logout = useCallback(() => {
        if (isAuthenticated) {
            onLogout();
            toast.error('Session expired due to inactivity');
        }
    }, [isAuthenticated, onLogout]);

    const showWarning = useCallback(() => {
        if (isAuthenticated) {
            toast((t) => (
                <div className="flex flex-col gap-2">
                    <span>Your session will expire in 5 minutes due to inactivity.</span>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-sm bg-resdes-orange text-slate-950 hover:opacity-80"
                            onClick={() => {
                                toast.dismiss(t.id);
                                resetTimer();
                                toast.success('Session extended');
                            }}
                        >
                            Stay Logged In
                        </button>
                        <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                                toast.dismiss(t.id);
                                logout();
                            }}
                        >
                            Logout Now
                        </button>
                    </div>
                </div>
            ), {
                duration: Infinity,
                id: 'session-warning'
            });
        }
    }, [isAuthenticated, logout]);

    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningTimeoutRef.current) {
            clearTimeout(warningTimeoutRef.current);
        }

        // Dismiss any existing warning toasts
        toast.dismiss('session-warning');

        // Only set timers if user is authenticated
        if (isAuthenticated) {
            const warningTime = TIMEOUT_DURATION - WARNING_TIME;

            // Debug logging
            debugLog(`🕐 AutoLogout Timer Reset [${debugId}]:`, {
                timeoutMinutes: TIMEOUT_DURATION / (60 * 1000),
                warningInMinutes: warningTime / (60 * 1000),
                logoutInMinutes: TIMEOUT_DURATION / (60 * 1000),
                timestamp: new Date().toLocaleTimeString()
            });

            // Set warning timer (show warning 5 minutes before logout)
            warningTimeoutRef.current = setTimeout(() => {
                debugLog(`⚠️ Showing session warning [${debugId}] at:`, new Date().toLocaleTimeString());
                showWarning();
            }, warningTime);

            // Set logout timer
            timeoutRef.current = setTimeout(() => {
                debugLog(`🚪 Auto logout triggered [${debugId}] at:`, new Date().toLocaleTimeString());
                logout();
            }, TIMEOUT_DURATION);
        }
    }, [isAuthenticated, TIMEOUT_DURATION, WARNING_TIME, showWarning, logout]);

    useEffect(() => {
        if (!isAuthenticated) {
            // Clear timers if user is not authenticated
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
            toast.dismiss('session-warning');
            return;
        }

        // List of events that indicate user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

        // Reset timer on any activity
        const resetOnActivity = (event) => {
            debugLog(`🔄 User activity detected [${debugId}]:`, `${event.type} at ${new Date().toLocaleTimeString()}`);
            resetTimer();
        };

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, resetOnActivity, true);
        });

        // Initial timer setup
        resetTimer();

        // Cleanup function
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, resetOnActivity, true);
            });
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (warningTimeoutRef.current) {
                clearTimeout(warningTimeoutRef.current);
            }
            toast.dismiss('session-warning');
        };
    }, [isAuthenticated, resetTimer]);

    return { resetTimer };
};

export default useAutoLogout;