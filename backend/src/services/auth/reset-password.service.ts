import {UserRepository} from "../../repositories/user.repository.js";
import {TokenRepository} from "../../repositories/token.repository.js";
import {hashPassword} from "../../utils/password.js";


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
        await userRepository.updatePassword(
            resetToken.userId,
            hashedPassword
        );

        await tokenRepository.consumeToken(resetToken.id);

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
