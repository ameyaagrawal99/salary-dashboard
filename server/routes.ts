import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  BrainSheetError,
  getBrainEntries,
  getBrainSyncStatus,
  updateBrainRow,
} from "./brain-sheets";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get("/api/brain/status", (_req, res) => {
    res.json(getBrainSyncStatus());
  });

  app.get("/api/brain/entries", async (req, res, next) => {
    try {
      const sheet = typeof req.query.sheet === "string" ? req.query.sheet : undefined;
      const sheetName =
        typeof req.query.sheetName === "string" ? req.query.sheetName : undefined;
      const data = await getBrainEntries({ sheet, sheetName });
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/brain/entries/:rowNumber", async (req, res, next) => {
    try {
      const rowNumber = Number.parseInt(req.params.rowNumber, 10);
      const body =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? (req.body as {
              sheet?: unknown;
              sheetName?: unknown;
              updates?: unknown;
            })
          : {};

      if (!body.updates || typeof body.updates !== "object" || Array.isArray(body.updates)) {
        throw new BrainSheetError("Request body must include an `updates` object.", 400);
      }

      const updates: Record<string, string> = {};
      for (const [key, value] of Object.entries(body.updates)) {
        if (!key.trim()) {
          continue;
        }
        updates[key] = value === null || value === undefined ? "" : String(value);
      }

      const sheet = typeof body.sheet === "string" ? body.sheet : undefined;
      const sheetName = typeof body.sheetName === "string" ? body.sheetName : undefined;
      const data = await updateBrainRow({ sheet, sheetName, rowNumber, updates });
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
