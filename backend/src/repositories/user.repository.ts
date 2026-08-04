import { prisma } from "../lib/prisma.js";
import { Prisma, Role, AccountStatus } from "../../generated/prisma/client.js";

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

// Shared shape for every Employee Management read/write — never exposes
// password. hiredDate/phone/accountStatus already existed on User before
// this feature; only the select/query surface is new.
const employeeSelect = {
  id: true,
  username: true,
  email: true,
  name: true,
  phone: true,
  hiredDate: true,
  role: true,
  accountStatus: true,
} as const;

export class UserRepository {

  async findByUsername(username: string, tx: PrismaClientOrTx = prisma) {
    return await tx.user.findFirst({
      where: {
        username,
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        name: true,
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

  async create(
    data: {
      username: string;
      email: string;
      password: string;
      name: string;
      phone?: string;
      hiredDate?: Date;
      role?: Role;
    },
    tx: PrismaClientOrTx = prisma
  ) {
    return await tx.user.create({
      data,
      select: employeeSelect,
    });
  }

  // Employee Management list — scoped to STAFF only. Admin accounts are
  // managed outside this feature (there's no "archive the Admin" flow).
  async findAllStaff(tx: PrismaClientOrTx = prisma) {
    return tx.user.findMany({
      where: { role: Role.STAFF },
      select: employeeSelect,
      orderBy: { name: "asc" },
    });
  }

  async findByIdForEmployee(id: string, tx: PrismaClientOrTx = prisma) {
    return tx.user.findUnique({ where: { id }, select: employeeSelect });
  }

  async updateEmployee(
    id: string,
    data: Partial<{
      username: string;
      name: string;
      email: string;
      phone: string;
      hiredDate: Date;
      password: string;
    }>,
    tx: PrismaClientOrTx = prisma
  ) {
    return tx.user.update({ where: { id }, data, select: employeeSelect });
  }

  async setAccountStatus(id: string, accountStatus: AccountStatus, tx: PrismaClientOrTx = prisma) {
    return tx.user.update({ where: { id }, data: { accountStatus }, select: employeeSelect });
  }



  // Dashboard: employee count for the Admin dashboard's "Employees" card.
  async countByRole(role: Role) {
    return prisma.user.count({ where: { role } });
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