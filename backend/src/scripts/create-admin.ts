import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";
import { usernameRule, passwordRule } from "../schema/common/validation-rules.js";
import { z } from "zod";

// Usage:
//   CONFIRM_CREATE_ADMIN=YES npm --prefix backend run create-admin -- \
//     --username anzano --email elenoanzanojr123@gmail.com --password 123123123 --name "Anzano"
//
// Credentials come from CLI args (never hardcoded), and the run must be
// explicitly confirmed — same guard pattern as delete-archived-test-employees.
async function createAdmin() {
  if (process.env.CONFIRM_CREATE_ADMIN !== "YES") {
    throw new Error(
      "Refusing to create the admin account. Set CONFIRM_CREATE_ADMIN=YES to confirm this one-time action."
    );
  }

  // Minimal arg parsing: --key value pairs.
  const args = process.argv.slice(2);
  function getArg(name: string): string | undefined {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : undefined;
  }

  const username = getArg("username");
  const email = getArg("email");
  const password = getArg("password");
  const name = getArg("name") ?? username;

  const adminSchema = z.object({
    username: usernameRule,
    email: z.string().trim().email("A valid email is required"),
    password: passwordRule,
    name: z.string().trim().min(1),
  });

  const parsed = adminSchema.safeParse({ username, email, password, name });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(` - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid admin account arguments. See above for details.");
  }

  const existingUsername = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (existingUsername) {
    throw new Error(`Username "${parsed.data.username}" is already registered.`);
  }
  const existingEmail = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingEmail) {
    throw new Error(`Email "${parsed.data.email}" is already registered.`);
  }

  const created = await prisma.user.create({
    data: {
      username: parsed.data.username,
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashPassword(parsed.data.password),
      role: Role.ADMIN,
      accountStatus: "ACTIVE",
    },
    select: { id: true, username: true, email: true, name: true, role: true, accountStatus: true, createdAt: true },
  });

  console.log("Admin account created:");
  console.log(created);
}

createAdmin()
  .catch((error) => {
    console.error("Admin creation failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
