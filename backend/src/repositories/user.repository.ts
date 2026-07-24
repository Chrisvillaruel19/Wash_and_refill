import { prisma } from "@/lib/prisma";

export class UserRepository {

  async findByUsername(username: string) {
    return await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
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


  async create(data: {
    username: string;
    email: string;
    password: string;
    role?: "STAFF" | "ADMIN";
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

}