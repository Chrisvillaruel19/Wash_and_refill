import { Request, Response } from "express";
import { createEmployeeService } from "../services/employee/create-employee.service.js";

export class EmployeeController {


  public create = async (req: Request, res: Response) => {

    try {

      const {
        username,
        email,
        password,
      } = req.body;

      const result = await createEmployeeService(
        username,
        email,
        password
      );


      return res
        .status(result.code)
        .json(result);


    } catch(error) {

      console.error(
        "EmployeeController.create error:",
        error
      );


      return res.status(500).json({
        status: "error",
        message: "Unable to create employee"
      });

    }

  };

}