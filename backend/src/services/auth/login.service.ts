import { UserRepository } from "../../repositories/user.repository.js";
import { TokenRepository } from "../../repositories/token.repository.js";
import { AttendanceRepository } from "../../repositories/attendance.repository.js";
import { sweepStaleAttendance } from "../attendance/auto-close.util.js";
import { Role } from "../../../generated/prisma/client.js";
import { verifyPassword } from "../../utils/password.js";
import { 
  signAccessToken, 
  signRefreshToken, 
  TokenExpiry 
} from "../../lib/jwt.js";

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();
const attendanceRepository = new AttendanceRepository();

// A syntactically valid (but unusable — no real user has this salt/hash)
// PBKDF2 record, used only to make the "unknown username" path pay the same
// pbkdf2 cost as the "wrong password" path below. Without this, an attacker
// measuring response latency could distinguish the two cases (fast return
// vs. a ~120,000-iteration derivation) and enumerate valid usernames.
const DUMMY_PASSWORD_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000:120000:" +
  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

export async function LoginService(
  username: string,
  password: string
) {

  try {

    const user = await userRepository.findByUsername(username);

    if (!user) {
      // Still pay the pbkdf2 cost — see DUMMY_PASSWORD_HASH above.
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


    // Handoff rule, enforced at the door: a Staff member can't log in while
    // another Staff member's shift is still open (not clocked out). Checked
    // only after the password is verified, so it never reveals who's on
    // duty to someone without valid credentials. Admin is never blocked.
    // clockInService re-checks the same rule under a lock, covering two
    // Staff logging in at the same moment.
    if (user.role === Role.STAFF) {
      await sweepStaleAttendance();
      const onDuty = await attendanceRepository.findOpenStaffSessionForOtherUser(user.id);
      if (onDuty) {
        return {
          code: 409,
          status: "error",
          message: `${onDuty.user.name} is currently on duty and has not clocked out yet. You can log in once they clock out.`
        };
      }
    }


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