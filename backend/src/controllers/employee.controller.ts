import { Request, Response } from "express";
import { createEmployeeService } from "../services/employee/create-employee.service.js";
import { listEmployeesService, EmployeeListStatus } from "../services/employee/list-employees.service.js";
import { updateEmployeeService } from "../services/employee/update-employee.service.js";
import { deactivateEmployeeService } from "../services/employee/deactivate-employee.service.js";
import { archiveEmployeeService } from "../services/employee/archive-employee.service.js";
import { restoreEmployeeService } from "../services/employee/restore-employee.service.js";
import { JwtPayload } from "../lib/jwt.js";
import { UserRepository } from "../repositories/user.repository.js";
import { sendEmailVerification, verificationRequestResponse } from "../services/auth/email-verification.service.js";

const userRepository = new UserRepository();

type AuthenticatedRequest = Request & { user?: JwtPayload };

export class EmployeeController {

  public create = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const { username, email, name, password, phone, hiredDate } = req.body;

      const result = await createEmployeeService(
        actorUserId,
        username,
        email,
        name,
        password,
        phone,
        hiredDate
      );

      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.create error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to create employee",
      });
    }
  };

  public list = async (req: Request, res: Response) => {
    try {
      const status = req.query.status as EmployeeListStatus | undefined;
      const result = await listEmployeesService(status);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.list error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to retrieve employees",
      });
    }
  };

  public update = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await updateEmployeeService(actorUserId, id, req.body);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.update error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to update employee",
      });
    }
  };

  public deactivate = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await deactivateEmployeeService(actorUserId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.deactivate error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to deactivate employee",
      });
    }
  };

  public archive = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await archiveEmployeeService(actorUserId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.archive error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to archive employee",
      });
    }
  };

  // Admin resends the verification link to a Staff member's current email.
  public sendVerification = async (req: Request, res: Response) => {
    try {
      const employee = await userRepository.findByIdForEmployee(req.params.id as string);
      if (!employee) return res.status(404).json({ code: 404, status: "error", message: "Employee not found" });
      const result = verificationRequestResponse(await sendEmailVerification(employee.id));
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.sendVerification error", error instanceof Error ? error.message : "unknown error");
      return res.status(500).json({ code: 500, status: "error", message: "Unable to send verification email" });
    }
  };

  public restore = async (req: Request, res: Response) => {
    try {
      const actorUserId = (req as AuthenticatedRequest).user?.sub as string;
      const id = req.params.id as string;
      const result = await restoreEmployeeService(actorUserId, id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error("EmployeeController.restore error:", error);
      return res.status(500).json({
        status: "error",
        message: "Unable to restore employee",
      });
    }
  };
}
