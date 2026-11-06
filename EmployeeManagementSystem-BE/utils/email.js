const nodemailer = require("nodemailer");

const getCompanyName = () => process.env.COMPANY_NAME || "Employee Management System";
const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")[0].trim().replace(/\/$/, "");

const createMailTransport = () => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
        const error = new Error(
            "Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in the backend .env file, then restart the backend."
        );
        error.status = 503;
        error.code = "EMAIL_NOT_CONFIGURED";
        throw error;
    }
    return nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: SMTP_SECURE === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const sendEmployeeInvite = async (user, employee, code, role = "employee") => {
    const companyName = getCompanyName();
    const accountType = role === "hr" ? "HR" : "employee";
    const workspace = role === "hr" ? "&workspace=hr" : "";
    const setupUrl = `${getFrontendUrl()}/?setup=employee&email=${encodeURIComponent(user.email)}${workspace}`;
    const transporter = createMailTransport();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: `Set up your ${companyName} ${accountType} account`,
            text: `Hello ${user.name},\n\nYour ${accountType} account for ${companyName} has been created.\nName: ${user.name}\nWork email: ${user.email}\nEmployee ID: ${employee.employee_code}\nWorkspace: ${role === "hr" ? "HR" : "Employee"}\n\nOpen this link to go directly to your account setup screen:\n${setupUrl}\n\nEnter the one-time setup code below, then choose your own password:\n${code}\n\nThe code expires in 24 hours and can only be used once. For your security, passwords are never emailed.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;color:#172033"><div style="background:#6258e8;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0"><div style="font-size:12px;opacity:.8">${escapeHtml(companyName)}</div><h1 style="font-size:22px;margin:8px 0 0">Welcome to the team</h1></div><div style="border:1px solid #ececf4;border-top:0;padding:26px;border-radius:0 0 16px 16px"><p>Hello ${escapeHtml(user.name)},</p><p>Your ${escapeHtml(accountType)} account is ready:</p><p><strong>Name:</strong> ${escapeHtml(user.name)}<br><strong>Work email:</strong> ${escapeHtml(user.email)}<br><strong>Employee ID:</strong> ${escapeHtml(employee.employee_code)}<br><strong>Workspace:</strong> ${role === "hr" ? "HR" : "Employee"}</p><p>Open the setup page directly and enter your one-time code:</p><p style="margin:26px 0"><a href="${escapeHtml(setupUrl)}" style="background:#6258e8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">Set up your ${escapeHtml(accountType)} account</a></p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#6258e8">${escapeHtml(code)}</p><p>The code expires in 24 hours and can only be used once. You will create your own password in the app. For your security, passwords are never emailed.</p></div></div>`
        });
    } catch (cause) {
        console.error("Employee invitation email delivery failed:", cause.message);
        const error = new Error(
            cause.code === "EMAIL_NOT_CONFIGURED"
                ? cause.message
                : "Employee account could not be created because the invitation email could not be delivered. Verify SMTP settings and restart the backend."
        );
        error.status = 503;
        throw error;
    }
};

const sendPasswordReset = async (user, token) => {
    const companyName = getCompanyName();
    const resetUrl = `${getFrontendUrl()}/?resetToken=${encodeURIComponent(token)}`;
    const transporter = createMailTransport();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: `Reset your ${companyName} password`,
            text: `Hello ${user.name},\n\nUse this secure link to reset your password. It expires in one hour:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>Hello ${escapeHtml(user.name)},</p><p>Use the secure link below to reset your ${escapeHtml(companyName)} password. It expires in one hour.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
        });
    } catch (cause) {
        console.error("Password reset email delivery failed:", cause.message);
        const error = new Error(
            cause.code === "EMAIL_NOT_CONFIGURED"
                ? cause.message
                : "Password reset email could not be delivered. Verify SMTP settings and restart the backend."
        );
        error.status = 503;
        throw error;
    }
};

const sendPasswordResetOtp = async (user, code) => {
    const companyName = getCompanyName();
    const transporter = createMailTransport();
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: `Your ${companyName} password reset code`,
            text: `Hello ${user.name},\n\nYour password reset verification code is: ${code}\n\nIt expires in 10 minutes and can only be used once. If you did not request this, you can ignore this email.`,
            html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:24px auto;color:#172033"><div style="background:#6258e8;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0"><div style="font-size:12px;opacity:.8">${escapeHtml(companyName)}</div><h1 style="font-size:22px;margin:8px 0 0">Password reset code</h1></div><div style="border:1px solid #ececf4;border-top:0;padding:26px;border-radius:0 0 16px 16px"><p>Hello ${escapeHtml(user.name)},</p><p>Enter this verification code in the password reset page:</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#6258e8">${escapeHtml(code)}</p><p>This code expires in 10 minutes and can only be used once. If you did not request it, you can ignore this email.</p></div></div>`
        });
    } catch (cause) {
        console.error("Password reset code email delivery failed:", cause.message);
        const error = new Error(
            cause.code === "EMAIL_NOT_CONFIGURED"
                ? cause.message
                : "Password reset code could not be delivered. Verify SMTP settings and try again."
        );
        error.status = 503;
        throw error;
    }
};

module.exports = { createMailTransport, getCompanyName, sendEmployeeInvite, sendPasswordReset, sendPasswordResetOtp };
