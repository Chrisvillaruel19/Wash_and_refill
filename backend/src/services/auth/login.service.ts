import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { verifyPassword } from "../../utils/password.js";
import { 
  signAccessToken, 
  signRefreshToken, 
  TokenExpiry 
} from "../../lib/jwt.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();

// A syntactically valid (but unusable — no real user has this salt/hash)
// PBKDF2 record, used only to make the "unknown username" path pay the same
// pbkdf2 cost as the "wrong password" path below. Without this, an attacker
// measuring response latency could distinguish the two cases (fast return
// vs. a ~120,000-iteration derivation) and enumerate valid usernames.
const DUMMY_PASSWORD_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000:120000:" +
  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function LoginService(
  usernameOrEmail: string,
  password: string
) {

  try {

    // The login form's placeholder promises "Enter your username or email"
    // (frontend/app/(login)/page.tsx), so the backend has to honor both.
    // Usernames can never contain "@" (enforced by the shared usernameRule,
    // letters/numbers/underscore only) and emails must contain "@" to pass
    // validation, so the branch on "@" is unambiguous — no identifier can
    // ever be valid as both. Leading/trailing whitespace is trimmed from
    // the credential, matching every other user-typed identifier in this
    // codebase (all of which .trim() before matching). The trim happens
    // BEFORE the "@" branch so " anzano@x.com "-style paste artifacts can
    // never route a real email into the username lookup.
    const identifier = usernameOrEmail.trim();
    const user = identifier.includes("@")
      ? await userRepository.findActiveCredentialByEmailForLogin(identifier)
      : await userRepository.findByUsername(identifier);

    if (!user) {
      // Still pay the pbkdf2 cost — see DUMMY_PASSWORD_HASH above. Preserved
      // on the email path too: an unknown email must look identical (same
      // latency, same generic message) to a known email with a wrong
      // password, or the timing difference would let an attacker enumerate
      // registered email addresses.
      verifyPassword(password, DUMMY_PASSWORD_HASH);
      return {
        code: 401,
        status: "error",
        message: "Invalid username or password"
      };
    }


    if (!verifyPassword(password, user.password)) {
      return {
        code: 401,
        status: "error",
        message: "Invalid username or password"
      };
    }


    if (user.accountStatus !== "ACTIVE") {
      return {
        code: 403,
        status: "error",
        message: "Account is not active"
      };
    }

    // Post-password, pre-token status check left exactly as it was above —
    // an INACTIVE/ARCHIVED account fails here regardless of whether login
    // was attempted by username or by email, so account status gating can't
    // be bypassed by choosing the email path.


    const accessToken = signAccessToken(
      user.id,
      user.role,
      TokenExpiry.ACCESS_TOKEN_EXPIRES
    );

    const refreshToken = signRefreshToken(
      user.id,
      TokenExpiry.REFRESH_TOKEN_EXPIRES
    );


    await tokenRepository.createRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
    });


    return {
      code: 200,
      status: "success",
      message: "Login successful",
      data: {
        tokens: {
          accessToken,
          refreshToken,
        },
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
    };


  } catch(error) {

    console.error(error);

    return {
      code: 500,
      status: "error",
      message: "Unable to login"
    };

  }

}