import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const filesystemRouter = Router();
const execFileAsync = promisify(execFile);

async function selectFolder(): Promise<string | null> {
  if (process.platform === "darwin") {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Select a project folder")',
    ]);
    return stdout.trim() || null;
  }

  if (process.platform === "win32") {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$dialog.Description = 'Select a project folder'",
      "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($dialog.SelectedPath) }",
    ].join("; ");
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script]);
    return stdout.trim() || null;
  }

  try {
    const { stdout } = await execFileAsync("zenity", [
      "--file-selection",
      "--directory",
      "--title=Select a project folder",
    ]);
    return stdout.trim() || null;
  } catch (error) {
    if (isPickerCancelled(error)) return null;
    const { stdout } = await execFileAsync("kdialog", ["--getexistingdirectory", os.homedir()]);
    return stdout.trim() || null;
  }
}

function isPickerCancelled(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number | string }).code;
  return code === 1 || code === -128;
}

filesystemRouter.get("/select", async (_req, res) => {
  try {
    const selectedPath = await selectFolder();
    if (!selectedPath) {
      res.status(204).end();
      return;
    }

    res.json({ path: path.resolve(selectedPath) });
  } catch (error) {
    if (isPickerCancelled(error)) {
      res.status(204).end();
      return;
    }
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unable to open the system folder selector",
    });
  }
});

filesystemRouter.get("/browse", (req, res) => {
  const dirPath = (req.query.path as string) || os.homedir();
  const resolved = path.resolve(dirPath);

  if (!fs.existsSync(resolved)) {
    res.status(400).json({ error: `Directory not found: ${resolved}` });
    return;
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    res.status(400).json({ error: `Not a directory: ${resolved}` });
    return;
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const items = entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
      path: path.join(resolved, e.name),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  res.json({ path: resolved, entries: items });
});

filesystemRouter.get("/detect", (req, res) => {
  const dirPath = req.query.path as string;
  if (!dirPath) {
    res.status(400).json({ error: "path parameter is required" });
    return;
  }

  const resolved = path.resolve(dirPath);
  const openspecDir = path.join(resolved, "openspec");
  const configPath = path.join(openspecDir, "config.yaml");

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf-8");
    const schemaMatch = content.match(/^schema:\s*(.+)$/m);
    const schema = schemaMatch ? schemaMatch[1].trim() : "unknown";
    res.json({ hasOpenSpec: true, schema });
    return;
  }

  // Fallback: 檢查 openspec/specs/ 或 openspec/changes/ 是否存在
  const hasSpecs = fs.existsSync(path.join(openspecDir, "specs"));
  const hasChanges = fs.existsSync(path.join(openspecDir, "changes"));
  if (hasSpecs || hasChanges) {
    res.json({ hasOpenSpec: true, schema: "unknown" });
    return;
  }

  res.json({ hasOpenSpec: false });
});
