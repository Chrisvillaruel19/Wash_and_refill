import {UserRepository} from "../../repositories/user.repository.js";
import {TokenRepository} from "../../repositories/token.repository.js";
import {hashPassword} from "../../utils/password.js";
import {prisma} from "../../lib/prisma.js";


const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

export async function resetPasswordService(
    token: string, 
    newPassword: string) {

    try {
        const resetToken = await tokenRepository.findActiveResetToken(token);

        if (!resetToken) {
            return {
                code: 400,
                status: "error",
                message: "Invalid or expired reset token"
            };
        }
        // No separate expiresAt check here — findActiveResetToken already
        // filters to expiresAt > now in its query, so a token reaching this
        // point can never be expired.

        const hashedPassword = hashPassword(newPassword);

        // Password update, token consumption, and refresh-token revocation
        // must all commit together — if any fails, the token must NOT be
        // left in a used-but-unconsumed state (a replayable reset token),
        // and a changed password must never leave a stale session still
        // valid, or vice versa.
        await prisma.$transaction(async (tx) => {
            await userRepository.updatePassword(
                resetToken.userId,
                hashedPassword,
                tx
            );

            await tokenRepository.consumeToken(resetToken.id, tx);

            // A password reset is exactly the scenario (a possibly-
            // compromised account) where any already-issued session should
            // not silently keep working — same revocation this repository
            // already performs on refresh-token reuse detection (see
            // refresh-token.service.ts).
            await tokenRepository.revokeAllActiveRefreshTokensForUser(
                resetToken.userId,
                tx
            );
        });

        return{
            code:200,
            status:"success",
            message: "Password reset successfully"
        };
    }catch (error) {
        console.error("ResetPasswordService error:", error);

        return{
            code: 500,
            status: "error",
            message: "Unable to reset password"
        };
    }
}
