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


export async function LoginService(
  username: string,
  password: string
) {

  try {

    const user = await userRepository.findByUsername(username);

    if (!user) {
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