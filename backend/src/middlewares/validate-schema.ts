import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

export const validateSchema = (schema: ZodTypeAny) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // parseAsync's return value must be written back — coercions
      // (z.coerce.date(), etc.) and transforms only take effect on the
      // parsed output, not on req.body itself. Previously discarded here,
      // silently defeating every z.coerce/.transform in the codebase.
      const parsed = (await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })) as { body?: unknown; query?: unknown; params?: unknown };
      if (parsed.body !== undefined) req.body = parsed.body;
      // req.query is a getter-only accessor on this Express/Node version —
      // a plain `req.query = ...` throws ("Cannot set property query of
      // #<IncomingMessage> which has only a getter"), crashing every GET
      // route whose schema coerces query params. defineProperty replaces
      // the accessor instead of assigning through it.
      if (parsed.query !== undefined) {
        Object.defineProperty(req, "query", {
          value: parsed.query,
          writable: true,
          configurable: true,
        });
      }
      if (parsed.params !== undefined) req.params = parsed.params as Request["params"];
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      return next(error);
    }
  };