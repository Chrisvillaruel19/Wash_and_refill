import { UserRepository } from "../../repositories/user.repository.js";
import { hashPassword } from "../../utils/password.js";

export async function createEmployeeService(username: string, email:string , password: string) {
  const userRepository = new UserRepository();

  try {
    const existing = await userRepository.findByUsername(username);
    if (existing) {
      return { 
        code: 409, 
        status: "error", 
        message: "Username already registered" };
    }

    const created = await userRepository.create({ 
      username, 
      email, 
      password: hashPassword(password) });

    return {
      code: 200,
      status: "success",
      message: "Created account successfully",
      data: { user: created },
    };

  } catch (error) {
    console.error("SignupUserService error", error);
    return { 
      code: 500, 
      status: "error", 
      message: "Unable to create account" };
  }
}