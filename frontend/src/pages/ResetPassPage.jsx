/*
 * @name ResetPassPage
 * @file /docman/frontend/src/pages/ResetPassPage.jsx
 * @page ResetPassPage
 * @description Password reset page for updating user passwords with secure token validation
 * @author Richard Bakos
 * @version 2.1.9
 * @license UNLICENSED
 */
// ResetPasswordForm.jsx
import { useState } from "react";
import PropTypes from "prop-types";

function ResetPassPage({ token }) {
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        });
        const data = await res.json();
        setMessage(data.message);
    };

    return (
        <form onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter new password"
            required
        />
        <button type="submit">Reset Password</button>
        <div>{message}</div>
        </form>
    );
}
ResetPassPage.propTypes = {
    token: PropTypes.string.isRequired,
};

export default ResetPassPage;