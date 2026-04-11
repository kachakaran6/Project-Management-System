/**
 * Transactional Email Templates
 */

export const getInviteTemplate = (orgName, inviteUrl) => ({
  subject: `You've been invited to join ${orgName} on Antigravity`,
  html: `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <h2>Hello!</h2>
      <p>You have been invited to join the <strong>${orgName}</strong> organization on Antigravity PMS.</p>
      <p>Click the button below to accept your invitation and get started:</p>
      <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a>
      <p>If the button doesn't work, you can copy and paste this link:</p>
      <p>${inviteUrl}</p>
      <hr />
      <p>If you weren't expecting this invite, you can safely ignore this email.</p>
    </div>
  `
});

export const getWelcomeTemplate = (userName) => ({
  subject: 'Welcome to Antigravity!',
  html: `
    <div style="font-family: sans-serif;">
      <h2>Welcome aboard, ${userName}!</h2>
      <p>We're excited to have you with us. Explore your workspaces and start collaborating today.</p>
    </div>
  `
});
