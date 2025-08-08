import React, { useState } from "react";

function ForgotPassPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");

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
