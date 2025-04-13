// src/pages/QuizPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    getQuizDetails,
    startQuizSubmission,
    submitAnswer,
    finalizeSubmission
} from '../services/api';
import { Quiz, Submission, Question as QuestionType, SubmitAnswerPayload, Answer } from '../types'; // Rename imported Question to avoid conflict

import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';

import { AlertCircle, Timer, CheckCircle, Send, ArrowLeft } from 'lucide-react';
import styles from './QuizPage.module.css';

// Debounce hook (simple implementation)
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

// Type for the local answers state
type AnswersState = Record<number, { choiceId?: number | null; text?: string | null }>;

const QuizPage: React.FC = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();

    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [answers, setAnswers] = useState<AnswersState>({}); // Store user's current answers { questionId: { choiceId: number } | { text: string } }
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // For finalize action
    const [isSavingAnswer, setIsSavingAnswer] = useState<number | null>(null); // Track which question's answer is saving
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number | null>(null); // Time left in seconds
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef<boolean>(true); // Track if component is mounted for async operations


    // --- Debounce Answer Submission ---
    const debouncedAnswers = useDebounce(answers, 1500); // Debounce answers state by 1.5 seconds

    // Effect to submit debounced answers
    useEffect(() => {
        // Check if the component is still mounted before proceeding
        if (!isMountedRef.current) return;

        // Only submit if there's a submission ID and the debounced answers are different from initial state
        if (submission?.id && Object.keys(debouncedAnswers).length > 0) {
            // Find which answer actually changed to submit only that one
            // For simplicity, let's submit the last changed one that triggered the debounce.
            // A more robust solution would track dirty flags per question.
            // This simplified approach might re-submit unchanged answers if multiple change rapidly.
            const lastChangedQuestionId = parseInt(Object.keys(debouncedAnswers).pop() || '0', 10); // Simplification
            if (lastChangedQuestionId && debouncedAnswers[lastChangedQuestionId]) {
                submitSingleAnswer(lastChangedQuestionId, debouncedAnswers[lastChangedQuestionId]);
            }
        }
    }, [debouncedAnswers, submission?.id]); // Dependency on debounced value and submission ID


    // --- Initial Data Fetching ---
    const loadQuizAndSubmission = useCallback(async () => {
        if (!quizId || !user) return;

        setIsLoading(true);
        setError(null);
        try {
            console.log(`Fetching quiz details for ID: ${quizId}`);
            const quizData = await getQuizDetails(quizId);
            if (!isMountedRef.current) return; // Check mount status after await
            setQuiz(quizData);

            console.log(`Starting or getting submission for quiz ID: ${quizId}`);
            const submissionData = await startQuizSubmission(quizId);
            if (!isMountedRef.current) return; // Check mount status after await
            setSubmission(submissionData);

            // Initialize answers state from existing submission answers if resuming
            const initialAnswers: AnswersState = {};
            if (submissionData.answers && submissionData.status === 'in_progress') {
                submissionData.answers.forEach((ans: Answer) => {
                    initialAnswers[ans.question.id] = {
                        choiceId: ans.selected_choice?.id ?? null,
                        text: ans.text_answer ?? null,
                    };
                });
                console.log("Resuming quiz, loaded answers:", initialAnswers);
            }
            setAnswers(initialAnswers); // Set initial state

            // Start timer if applicable and submission is in progress
            if (quizData.time_limit_minutes && submissionData.status === 'in_progress') {
                const serverStartTime = new Date(submissionData.started_at).getTime();
                const timeLimitMillis = quizData.time_limit_minutes * 60 * 1000;
                const now = Date.now();
                const elapsedMillis = now - serverStartTime;
                const remainingMillis = Math.max(0, timeLimitMillis - elapsedMillis);
                setTimeLeft(Math.floor(remainingMillis / 1000));
                console.log(`Timer started. Time limit: ${quizData.time_limit_minutes}m, Remaining: ${Math.floor(remainingMillis / 1000)}s`);
            } else {
                setTimeLeft(null); // No time limit or quiz already submitted/graded
                console.log("No timer needed or quiz not in progress.");
            }

        } catch (err: any) {
            if (!isMountedRef.current) return; // Check mount status
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to load quiz.';
            setError(errorMessage);
            console.error("Failed to load quiz or submission:", err.response || err);
            setQuiz(null);
            setSubmission(null);
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [quizId, user]); // Include user dependency

    useEffect(() => {
        isMountedRef.current = true; // Set mounted flag
        if (!isAuthLoading && user) { // Fetch only when auth is ready and user exists
            loadQuizAndSubmission();
        } else if (!isAuthLoading && !user) {
            // Should be handled by ProtectedRoute, but as a fallback:
            setIsLoading(false);
            setError("You must be logged in to take a quiz.");
        }
        // Cleanup function to set mounted flag to false
        return () => { isMountedRef.current = false; };
    }, [loadQuizAndSubmission, isAuthLoading, user]); // Add user and isAuthLoading

    // --- Timer Logic ---
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0 || submission?.status !== 'in_progress' || !isMountedRef.current) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            return;
        }

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft(prevTime => {
                if (!isMountedRef.current) { // Check mount status inside interval
                    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                    return null;
                }
                if (prevTime === null || prevTime <= 1) {
                    clearInterval(timerIntervalRef.current!);
                    console.log("Time's up!");
                    handleTimeUp(); // Call time up handler
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        // Cleanup interval on component unmount or when timeLeft changes drastically
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timeLeft, submission?.status]); // Rerun effect if timeLeft or submission status changes

    // --- Answer Handling ---
    const handleAnswerChange = (questionId: number, value: { choiceId?: number | null, text?: string | null }) => {
        // Prevent changes if quiz is not in progress
        if (submission?.status !== 'in_progress' || isSubmitting) return;

        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
        // The debounced effect will handle submitting this change
    };

    // Function to submit a single answer (called by the debounced effect)
    const submitSingleAnswer = useCallback(async (questionId: number, answerValue: { choiceId?: number | null; text?: string | null }) => {
        if (!submission?.id) return;
        if (!isMountedRef.current) return; // Check mount status

        setIsSavingAnswer(questionId); // Indicate saving for this question
        console.log(`Submitting answer for Q:${questionId}`, answerValue);

        const payload: SubmitAnswerPayload = {
            question_id: questionId,
            selected_choice_id: answerValue.choiceId,
            text_answer: answerValue.text,
        };

        try {
            await submitAnswer(submission.id, payload);
            if (!isMountedRef.current) return; // Check mount status
            console.log(`Answer for Q:${questionId} saved successfully.`);
        } catch (err: any) {
            if (!isMountedRef.current) return; // Check mount status
            console.error(`Failed to save answer for Q:${questionId}:`, err.response || err);
            // Optionally show a temporary error message near the question
            setError(`Failed to save answer for question ${questionId + 1}. Please try again or contact support if persists.`); // Simple global error for now
        } finally {
            if (isMountedRef.current) setIsSavingAnswer(null); // Clear saving indicator
        }
    }, [submission?.id]);


    // --- Finalize Logic ---
    const handleFinalize = async () => {
        if (!submission || submission.status !== 'in_progress' || isSubmitting) return;

        if (!window.confirm("Are you sure you want to finish and submit this quiz? You cannot make further changes.")) {
            return;
        }

        setIsSubmitting(true);
        setError(null);
        console.log("Finalizing submission...");

        try {
            const finalSubmission = await finalizeSubmission(submission.id);
            if (!isMountedRef.current) return; // Check mount status
            setSubmission(finalSubmission); // Update submission state (status, score, etc.)
            alert(`Quiz submitted successfully! Your score: ${finalSubmission.score ?? 'Not graded yet'}`);
            // Navigate to results page or course detail page
            navigate(`/courses/${quiz?.course}`); // Redirect back to course detail for now
            // Or navigate(`/submissions/${finalSubmission.id}`); // If you have a results page
        } catch (err: any) {
            if (!isMountedRef.current) return; // Check mount status
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to finalize quiz.';
            setError(errorMessage);
            console.error("Finalize submission error:", err.response || err);
        } finally {
            if (isMountedRef.current) setIsSubmitting(false);
        }
    };

    // --- Time Up Handler ---
    const handleTimeUp = useCallback(async () => {
        // Ensure component is still mounted and submission exists/is in progress
        if (!isMountedRef.current || !submission || submission.status !== 'in_progress' || isSubmitting) return;

        console.log("Handling time up, finalizing submission automatically...");
        setIsSubmitting(true); // Prevent further interaction
        setError("Time's up! Submitting your quiz automatically..."); // Inform user

        try {
            const finalSubmission = await finalizeSubmission(submission.id);
            if (!isMountedRef.current) return; // Check mount status
            setSubmission(finalSubmission);
            alert(`Time's up! Quiz submitted automatically. Your score: ${finalSubmission.score ?? 'Not graded yet'}`);
            navigate(`/courses/${quiz?.course}`); // Redirect
        } catch (err: any) {
            if (!isMountedRef.current) return; // Check mount status
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to automatically finalize quiz.';
            setError(errorMessage); // Update error message
            console.error("Auto-finalize submission error:", err.response || err);
            // Keep submitting true maybe? Or set to false to allow manual retry?
            // setIsSubmitting(false); // Decide if user should be able to retry finalize
        }
        // isSubmitting might remain true if error occurs, preventing further edits
    }, [submission, isSubmitting, quiz?.course, navigate]); // Dependencies for the callback


    // --- Render Helper Functions ---
    const formatTime = (totalSeconds: number | null): string => {
        if (totalSeconds === null || totalSeconds < 0) return '--:--';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const renderQuestion = (question: QuestionType, index: number) => {
        const currentAnswer = answers[question.id] || {};
        const isSavingThisAnswer = isSavingAnswer === question.id;

        return (
            <li key={question.id} className={styles.questionItem}>
                <div className={styles.questionHeader}>
                    <span className={styles.questionNumber}>Question {index + 1}</span>
                    {isSavingThisAnswer && <span className={styles.savingIndicator}>Saving...</span>}
                </div>
                <p className={styles.questionText}>{question.text}</p>
                <div className={styles.answerArea}>
                    {/* Render based on question type */}
                    {(question.question_type === 'SC' || question.question_type === 'MC' || question.question_type === 'TF') && (
                        <ul className={styles.choicesList}>
                            {question.choices.map(choice => (
                                <li key={choice.id}>
                                    <label className={styles.choiceLabel}>
                                        <input
                                            type="radio"
                                            name={`question_${question.id}`}
                                            value={choice.id}
                                            checked={currentAnswer.choiceId === choice.id}
                                            onChange={() => handleAnswerChange(question.id, { choiceId: choice.id })}
                                            disabled={submission?.status !== 'in_progress' || isSubmitting || isSavingThisAnswer}
                                        />
                                        <span className={styles.choiceText}>{choice.text}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}

                    {question.question_type === 'TEXT' && (
                        <textarea
                            className={styles.textArea}
                            rows={4}
                            placeholder="Type your answer here..."
                            value={currentAnswer.text || ''}
                            onChange={(e) => handleAnswerChange(question.id, { text: e.target.value })}
                            disabled={submission?.status !== 'in_progress' || isSubmitting || isSavingThisAnswer}
                        />
                    )}
                </div>
            </li>
        );
    };

    // --- Main Render ---

    if (isLoading || isAuthLoading) {
        return (
            <div className={styles.loadingErrorContainer}>
                <Spinner />
                <span className={styles.loadingText}>Loading Quiz...</span>
            </div>
        );
    }

    if (error && !quiz) { // Show error if quiz failed to load entirely
        return (
            <div className={styles.loadingErrorContainer}>
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                </div>
                <Button onClick={loadQuizAndSubmission} variant="secondary" size="small">Retry</Button>
                <Link to="/courses" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to Courses
                </Link>
            </div>
        );
    }


    if (!quiz || !submission) {
        // This state might occur briefly or if there's an issue after loading finishes
        return (
            <div className={styles.loadingErrorContainer}>
                <p>Could not load quiz or start submission.</p>
                <Link to="/courses" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to Courses
                </Link>
            </div>
        );
    }

    // If quiz is already submitted or graded, show a message instead of the questions
    if (submission.status === 'submitted' || submission.status === 'graded') {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.quizHeader}>
                    <h1 className={styles.quizTitle}>{quiz.title}</h1>
                </div>
                <div className={styles.loadingErrorContainer} style={{ minHeight: '20vh', padding: '2rem' }}>
                    <CheckCircle size={40} color="var(--success-color)" style={{ marginBottom: '1rem' }} />
                    <p>You have already completed this quiz.</p>
                    {submission.status === 'graded' && submission.score !== null && (
                        <p>Your score: <strong>{parseFloat(submission.score).toFixed(1)}%</strong></p>
                    )}
                    {/* TODO: Add link to view results if available */}
                    {/* <Link to={`/submissions/${submission.id}`}> */}
                    {/* <Button variant="secondary" style={{ marginTop: '1rem' }}>View Results</Button> */}
                    {/* </Link> */}
                    <Link to={`/courses/${quiz.course}`} className={styles.backLink} style={{ marginTop: '2rem' }}>
                        <ArrowLeft size={16} /> Back to Course
                    </Link>
                </div>
            </div>
        );
    }


    // --- Render Active Quiz ---
    return (
        <div className={styles.pageContainer}>
            <div className={styles.quizHeader}>
                <h1 className={styles.quizTitle}>{quiz.title}</h1>
                {quiz.description && <p className={styles.quizDescription}>{quiz.description}</p>}
                {timeLeft !== null && (
                    <div className={`${styles.timerContainer} ${timeLeft <= 60 ? styles.timerExpired : ''}`}>
                        <Timer size={20} />
                        Time Remaining: <strong>{formatTime(timeLeft)}</strong>
                    </div>
                )}
                {/* Show general error messages here */}
                {error && (
                    <div className={styles.errorMessage} style={{ marginTop: '1rem', maxWidth: '100%' }} role="alert">
                        <AlertCircle size={20} aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleFinalize(); }}>
                <ul className={styles.questionList}>
                    {quiz.questions.sort((a, b) => a.order - b.order).map(renderQuestion)}
                </ul>

                <div className={styles.submitButtonContainer}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="large"
                        isLoading={isSubmitting}
                        disabled={isSubmitting || isLoading || timeLeft === 0 || isSavingAnswer !== null}
                        title={timeLeft === 0 ? "Time is up!" : (isSavingAnswer !== null ? "Saving answer..." : "Finish and submit the quiz")}
                    >
                        <Send size={18} style={{ marginRight: '0.5em' }} />
                        Finish Quiz
                    </Button>
                    {isSubmitting && <p className={styles.statusMessage}>Submitting your quiz...</p>}
                </div>
            </form>
        </div>
    );
};

export default QuizPage;
