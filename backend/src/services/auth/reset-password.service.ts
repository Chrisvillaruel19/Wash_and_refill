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

        // Password update and token consumption must commit together — if
        // either fails, the token must NOT be left in a used-but-unconsumed
        // state (a replayable reset token) or vice versa.
        await prisma.$transaction(async (tx) => {
            await userRepository.updatePassword(
                resetToken.userId,
                hashedPassword,
                tx
            );

            await tokenRepository.consumeToken(resetToken.id, tx);
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
