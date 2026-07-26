import { prisma } from "../lib/prisma.js";
import { Role } from "../../generated/prisma/client.js";
export class UserRepository {

  async findByUsername(username: string) {
    return await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        accountStatus: true,
      },
    });
  }


  async findById(id: string) {
    return await prisma.user.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        role: true,
        accountStatus: true,
      },
    });
  }

  async findByEmail(email: string) {
    return await prisma.user.findFirst({
      where: {
        email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        accountStatus: true,
      },
    });
  }

  async create(data: {
    username: string;
    email: string;
    password: string;
    role?: Role;
  }) {
    return await prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });
  }



  async updatePassword(id: string, password: string) {
  return await prisma.user.update({
    where: {
      id,
    },
    data: {
      password,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  });
}

}