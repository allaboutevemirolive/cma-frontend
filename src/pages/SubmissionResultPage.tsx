// src/pages/SubmissionResultPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom'; // Removed unused useNavigate
import { getSubmissionDetails } from '../services/api';
// Import necessary types - removed unused Choice and QuestionType alias
// **ASSUMES Submission type in api.ts now defines 'quiz' as an object**
import { Submission, Answer } from '../types';

import Spinner from '../components/Common/Spinner/Spinner';
import Button from '../components/Common/Button/Button';

// Icons needed for feedback and navigation
import { AlertCircle, ArrowLeft, CheckCircle, XCircle, HelpCircle, Clock, Calendar } from 'lucide-react';
import styles from './SubmissionResultPage.module.css';

const SubmissionResultPage: React.FC = () => {
    const { submissionId } = useParams<{ submissionId: string }>();
    // Removed unused navigate variable

    const [submission, setSubmission] = useState<Submission | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- Fetching Logic ---
    const fetchSubmissionDetails = useCallback(async () => {
        if (!submissionId || isNaN(Number(submissionId))) {
            setError("Invalid Submission ID provided in URL.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            console.log(`Fetching submission details for ID: ${submissionId}`);
            const data = await getSubmissionDetails(submissionId);

            // Sort answers based on question order (handle potential missing question/order)
            if (data.answers) {
                data.answers.sort((a, b) => (a.question?.order ?? Infinity) - (b.question?.order ?? Infinity));
            }
            setSubmission(data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to load submission details.';
            if (err.response?.status === 404) {
                setError("Submission not found. It might have been deleted or the ID is incorrect.");
            } else {
                setError(errorMessage);
            }
            console.error("Fetch submission details error:", err.response || err);
            setSubmission(null); // Clear data on error
        } finally {
            setIsLoading(false);
        }
    }, [submissionId]);

    // --- Initial Fetch ---
    useEffect(() => {
        fetchSubmissionDetails();
    }, [fetchSubmissionDetails]);

    // --- Helper Functions ---
    const formatDate = (dateString?: string | null): string => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString(navigator.language || 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        } catch (e) {
            console.error("Date formatting error:", e);
            return 'Invalid Date';
        }
    };

    const getScoreColor = (score: string | null): string => {
        if (score === null) return '';
        const numericScore = parseFloat(score);
        if (isNaN(numericScore)) return '';
        if (numericScore >= 80) return styles.high;
        if (numericScore >= 50) return styles.medium;
        return styles.low;
    };

    // --- Answer Feedback Renderer ---
    // **FIX:** Added index parameter to signature
    const renderAnswerFeedback = (answer: Answer, index: number) => {
        if (!answer || !answer.question) {
            console.warn("Skipping rendering answer feedback due to missing data:", answer);
            return <li key={`missing-answer-${index}`} className={styles.answerItem}>Question data unavailable for this answer.</li>;
        }

        const question = answer.question;
        const userAnswerChoice = answer.selected_choice;
        const userAnswerText = answer.text_answer;

        let isCorrect: boolean | null = null;
        let feedbackIcon = <HelpCircle className={styles.feedbackNeedsReview} size={18} />;
        // **FIX:** Removed unused feedbackText variable
        let userDisplayAnswer: React.ReactNode = <span className={styles.notAnswered}>No answer provided</span>;

        if (question.question_type === 'TEXT') {
            isCorrect = null;
            feedbackIcon = <span title="Needs Manual Review"><HelpCircle className={styles.feedbackNeedsReview} size={18} /></span>;
            if (userAnswerText) {
                userDisplayAnswer = userAnswerText;
            }
        } else if (userAnswerChoice) {
            isCorrect = userAnswerChoice.is_correct;
            feedbackIcon = isCorrect
                ? <span title="Correct"><CheckCircle className={styles.feedbackCorrect} size={18} /></span>
                : <span title="Incorrect"><XCircle className={styles.feedbackIncorrect} size={18} /></span>;
            userDisplayAnswer = userAnswerChoice.text;
        }
        // **FIX:** Simplified condition (TS2367 fix)
        else if (!userAnswerChoice) { // Only applies if not TEXT and no choice was selected
            isCorrect = false;
            feedbackIcon = <span title="Incorrect (No Answer)"><XCircle className={styles.feedbackIncorrect} size={18} /></span>;
        }

        const correctChoices = question.choices?.filter(c => c.is_correct) ?? [];

        return (
            <li key={answer.id} className={styles.answerItem}>
                {/* **FIX:** Added index + 1 for display */}
                <h3 className={styles.questionText}>{index + 1}. {question.text}</h3>
                <div className={styles.answerDetail}>
                    {/* User's Answer Block */}
                    <div className={styles.userAnswerBlock}>
                        <span className={styles.answerLabel}>
                            Your Answer: {feedbackIcon}
                        </span>
                        <div className={styles.userAnswerText}>
                            {userDisplayAnswer}
                        </div>
                    </div>

                    {/* Correct Answer Block */}
                    {(isCorrect === false || (question.question_type === 'TEXT' && correctChoices.length > 0)) && (
                        <div className={styles.correctAnswerBlock}>
                            <span className={styles.answerLabel}>
                                {isCorrect === false ? `Correct Answer${correctChoices.length > 1 ? 's' : ''}:` : "Model Answer:"}
                            </span>
                            {correctChoices.length > 0 ? (
                                correctChoices.map(choice => (
                                    <div key={choice.id} className={styles.correctAnswerText}>
                                        {choice.text}
                                    </div>
                                ))
                            ) : (
                                question.question_type === 'TEXT' && <span className={styles.correctAnswerText}>(No model answer provided)</span>
                            )}
                        </div>
                    )}
                </div>
            </li>
        );
    };


    // --- Render Logic ---

    if (isLoading) {
        return (
            <div className={styles.loadingErrorContainer}>
                <Spinner />
                <span className={styles.loadingText}>Loading Submission Results...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.loadingErrorContainer}>
                <div className={styles.errorMessage} role="alert">
                    <AlertCircle size={20} aria-hidden="true" />
                    <span>{error}</span>
                </div>
                <Button onClick={fetchSubmissionDetails} variant="secondary" size="small" style={{ marginBottom: '1rem' }}>Retry</Button>
                <Link to="/courses" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to Courses
                </Link>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className={styles.loadingErrorContainer}>
                <p>Submission data could not be loaded.</p>
                <Link to="/courses" className={styles.backLink}>
                    <ArrowLeft size={16} /> Back to Courses
                </Link>
            </div>
        );
    }

    // --- Display Submission Details ---
    const score = submission.score !== null ? `${parseFloat(submission.score).toFixed(1)}%` : 'Not Graded';
    const scoreColorClass = submission.score !== null ? getScoreColor(submission.score) : '';
    // **FIX:** Safely access nested properties assuming 'quiz' is now an object in the type
    const courseIdForLink = typeof submission.quiz === 'object' ? submission.quiz?.course : undefined;
    const quizTitleForDisplay = typeof submission.quiz === 'object' ? submission.quiz?.title : 'Quiz';

    return (
        <div className={styles.pageContainer}>
            {/* Corrected Link: Use courseIdForLink */}
            <Link to={courseIdForLink ? `/courses/${courseIdForLink}` : '/courses'} className={styles.backLink}>
                <ArrowLeft size={16} /> Back to Course
            </Link>

            <header className={styles.resultHeader}>
                {/* Corrected Title: Use quizTitleForDisplay */}
                <h1 className={styles.quizTitle}>Results for: {quizTitleForDisplay}</h1>
                <div className={styles.summaryGrid}>
                    {/* ... summary items remain the same ... */}
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Status</span>
                        <span className={`${styles.summaryValue} ${styles[submission.status]}`}>
                            {submission.status_display}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Score</span>
                        <span className={`${styles.summaryValue} ${styles.scoreValue} ${scoreColorClass}`}>
                            {score}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Started</span>
                        <span className={styles.summaryValue}>
                            <Calendar size={14} style={{ marginRight: '0.3em', verticalAlign: 'bottom' }} />
                            {formatDate(submission.started_at)}
                        </span>
                    </div>
                    <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Submitted</span>
                        <span className={styles.summaryValue}>
                            <Clock size={14} style={{ marginRight: '0.3em', verticalAlign: 'bottom' }} />
                            {formatDate(submission.submitted_at)}
                        </span>
                    </div>
                </div>
            </header>

            <section>
                <h2 className={styles.resultsSectionTitle}>Your Answers</h2>
                {submission.answers && submission.answers.length > 0 ? (
                    <ul className={styles.answerList}>
                        {/* Corrected map call passes index */}
                        {submission.answers.map((answer, index) => renderAnswerFeedback(answer, index))}
                    </ul>
                ) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-color-secondary)', marginTop: '2rem' }}>
                        No answers were recorded for this submission.
                    </p>
                )}
            </section>

        </div>
    );
};

export default SubmissionResultPage;
