/*
 * @name ForgotPassPage
 * @file /docman/frontend/src/pages/ForgotPassPage.jsx
 * @page ForgotPassPage
 * @description Page component for password reset request functionality
 * @author Richard Bakos
 * @version 2.1.22
 * @license UNLICENSED
 */
import React, { useState } from "react";

/**
 * Page component for password reset request functionality
 * @returns {JSX.Element} The forgot password page component
 */
function ForgotPassPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

    /**
     * Handle password reset form submission
     * @param {Event} e - Form submit event
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setMessage(data.message);
    };

    return (
        <form onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
        />
        <button type="submit">Send Reset Link</button>
        <div>{message}</div>
        </form>
    );
}

export default ForgotPassPage;
