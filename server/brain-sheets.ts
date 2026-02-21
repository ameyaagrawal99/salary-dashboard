import { createSign } from "crypto";

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_API_BASE = "https://sheets.googleapis.com/v4";

const FALLBACK_SHEET_NAMES = ["Thought Inbox", "MessageIndex", "Sheet1"];

export type SyncMode = "service_account" | "oauth_token" | "api_key" | "public";

export interface BrainColumn {
  key: string;
  header: string;
  editable: boolean;
}

export interface BrainRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface BrainEntriesResponse {
  sheetId: string;
  sheetName: string;
  sheetUrl: string;
  mode: SyncMode;
  editable: boolean;
  readOnlyReason?: string;
  columns: BrainColumn[];
  rows: BrainRow[];
  totalRows: number;
  fetchedAtIso: string;
  availableSheets: string[];
  serviceAccountEmail?: string;
}

export interface BrainSyncStatus {
  mode: SyncMode;
  editable: boolean;
  readOnlyReason?: string;
  serviceAccountEmail?: string;
}

export interface GetBrainEntriesOptions {
  sheet?: string;
  sheetName?: string;
}

export interface UpdateBrainRowOptions {
  sheet?: string;
  sheetName?: string;
  rowNumber: number;
  updates: Record<string, string>;
}

interface ParsedSheetData {
  columns: BrainColumn[];
  rows: BrainRow[];
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number;
}

interface SheetValuesResponse {
  values?: string[][];
}

interface SpreadsheetMetadataResponse {
  sheets?: Array<{ properties?: { title?: string } }>;
}

interface GvizCell {
  v?: unknown;
  f?: string;
}

interface GvizResponse {
  status?: string;
  errors?: Array<{ detailed_message?: string; message?: string }>;
  table?: {
    cols?: Array<{ label?: string }>;
    rows?: Array<{ c?: Array<GvizCell | null> }>;
  };
}

let tokenCache: TokenCacheEntry | null = null;

export class BrainSheetError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function getDefaultSheetInput(): string {
  return process.env.BRAIN_SHEET_URL || process.env.BRAIN_SHEET_ID || "";
}

function getEnvDefaultSheetName(): string | undefined {
  const name = process.env.BRAIN_SHEET_TAB?.trim();
  return name || undefined;
}

function extractSheetId(sheetInput: string): string | null {
  const trimmed = sheetInput.trim();
  if (!trimmed) {
    return null;
  }

  const directIdMatch = trimmed.match(/^[a-zA-Z0-9-_]{20,}$/);
  if (directIdMatch) {
    return directIdMatch[0];
  }

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return urlMatch ? urlMatch[1] : null;
}

function normalizeSheetId(sheetInput?: string): string {
  const candidate = (sheetInput || getDefaultSheetInput()).trim();
  const parsed = extractSheetId(candidate);
  if (!parsed) {
    throw new BrainSheetError(
      "Missing Google Sheet ID/URL. Provide it in the UI or set BRAIN_SHEET_URL/BRAIN_SHEET_ID.",
      400,
    );
  }

  return parsed;
}

function quoteSheetName(sheetName: string): string {
  if (/^[A-Za-z0-9_]+$/.test(sheetName)) {
    return sheetName;
  }

  return `'${sheetName.replace(/'/g, "''")}'`;
}

function buildSheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
}

function toBase64Url(input: string | Buffer): string {
  const value = typeof input === "string" ? Buffer.from(input) : input;
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getServiceAccountCredentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<ServiceAccountCredentials>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          token_uri: parsed.token_uri,
        };
      }
    } catch (error) {
      throw new BrainSheetError(
        `GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${
          error instanceof Error ? error.message : "Unknown parse error"
        }`,
        500,
      );
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (clientEmail && privateKeyRaw) {
    return {
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, "\n"),
      token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI,
    };
  }

  return null;
}

function getSyncMode(): SyncMode {
  if (getServiceAccountCredentials()) {
    return "service_account";
  }

  if (process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim()) {
    return "oauth_token";
  }

  if (process.env.GOOGLE_SHEETS_API_KEY?.trim()) {
    return "api_key";
  }

  return "public";
}

function isWriteMode(mode: SyncMode): mode is "service_account" | "oauth_token" {
  return mode === "service_account" || mode === "oauth_token";
}

function getReadOnlyReason(mode: SyncMode): string | undefined {
  if (isWriteMode(mode)) {
    return undefined;
  }

  if (mode === "api_key") {
    return "Read-only mode: GOOGLE_SHEETS_API_KEY can fetch data but cannot edit rows.";
  }

  return "Read-only mode: configure GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_ACCESS_TOKEN for two-way sync.";
}

async function getServiceAccountAccessToken(): Promise<string> {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new BrainSheetError("Service account credentials are not configured.", 500);
  }

  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAt - 60 > now) {
    return tokenCache.accessToken;
  }

  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: GOOGLE_SHEETS_SCOPE,
      aud: credentials.token_uri || GOOGLE_TOKEN_URL,
      exp: now + 3600,
      iat: now,
    }),
  );

  const unsignedToken = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(credentials.private_key);
  const assertion = `${unsignedToken}.${toBase64Url(signature)}`;

  const tokenResponse = await fetch(credentials.token_uri || GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const message = await extractErrorMessage(tokenResponse);
    throw new BrainSheetError(`Failed to get Google access token: ${message}`, 502);
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!tokenPayload.access_token) {
    throw new BrainSheetError("Google token response did not include access_token.", 502);
  }

  tokenCache = {
    accessToken: tokenPayload.access_token,
    expiresAt: now + Math.max(tokenPayload.expires_in ?? 3600, 60),
  };

  return tokenPayload.access_token;
}

async function getAccessToken(mode: SyncMode): Promise<string | null> {
  if (mode === "service_account") {
    return getServiceAccountAccessToken();
  }

  if (mode === "oauth_token") {
    const token = process.env.GOOGLE_SHEETS_ACCESS_TOKEN?.trim();
    if (!token) {
      throw new BrainSheetError("GOOGLE_SHEETS_ACCESS_TOKEN is empty.", 500);
    }
    return token;
  }

  return null;
}

async function extractErrorMessage(response: Response): Promise<string> {
  const text = (await response.text()).trim();
  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string };
      message?: string;
    };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // Ignore JSON parse failures and return raw body below.
  }

  return text;
}

type ApiMode = Exclude<SyncMode, "public">;

async function callSheetsApi<T>(
  mode: ApiMode,
  path: string,
  init: RequestInit = {},
  searchParams?: URLSearchParams,
): Promise<T> {
  const url = new URL(`${GOOGLE_SHEETS_API_BASE}${path}`);

  if (searchParams) {
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  if (mode === "api_key") {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY?.trim();
    if (!apiKey) {
      throw new BrainSheetError("GOOGLE_SHEETS_API_KEY is missing.", 500);
    }
    url.searchParams.set("key", apiKey);
  }

  const headers = new Headers(init.headers || {});
  if (isWriteMode(mode)) {
    const accessToken = await getAccessToken(mode);
    if (!accessToken) {
      throw new BrainSheetError("Google access token is missing.", 500);
    }
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    const status = response.status === 404 ? 404 : 502;
    throw new BrainSheetError(`Google Sheets API request failed: ${message}`, status);
  }

  return (await response.json()) as T;
}

function headerToLabel(header: string | undefined, index: number): string {
  const normalized = header?.trim();
  if (normalized) {
    return normalized;
  }
  return `Column ${index + 1}`;
}

function toColumnKey(header: string, index: number, usedKeys: Set<string>): string {
  const base =
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `column_${index + 1}`;

  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(key);
  return key;
}

function isColumnEditable(columnKey: string): boolean {
  const lockedColumns = new Set([
    "lookup_key",
    "message_key",
    "thread_key",
    "notion_page_id",
    "telegram_chat_id",
    "telegram_message_id",
    "reply_to_message_id",
    "media_group_id",
    "created_at",
    "created_at_iso",
    "processed_at_iso",
    "update_id",
  ]);

  return !lockedColumns.has(columnKey);
}

function normalizeCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function matrixToParsedData(matrix: string[][]): ParsedSheetData {
  if (!matrix.length) {
    return { columns: [], rows: [] };
  }

  const headers = matrix[0];
  const usedKeys = new Set<string>();
  const columns = headers.map((rawHeader, index) => {
    const header = headerToLabel(rawHeader, index);
    const key = toColumnKey(header, index, usedKeys);
    return {
      key,
      header,
      editable: isColumnEditable(key),
    };
  });

  const rows = matrix.slice(1).map((row, rowIndex) => {
    const values: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      values[column.key] = row[columnIndex] ?? "";
    });

    return {
      rowNumber: rowIndex + 2,
      values,
    };
  });

  return { columns, rows };
}

function gvizToParsedData(payload: GvizResponse): ParsedSheetData {
  if (payload.status && payload.status !== "ok") {
    const message =
      payload.errors?.[0]?.detailed_message ||
      payload.errors?.[0]?.message ||
      "Unknown GViz error";
    throw new BrainSheetError(`GViz request failed: ${message}`, 502);
  }

  const table = payload.table;
  if (!table) {
    throw new BrainSheetError("Google GViz response did not include table data.", 502);
  }

  const headers = (table.cols || []).map((column, index) =>
    headerToLabel(column.label, index),
  );
  const usedKeys = new Set<string>();
  const columns = headers.map((header, index) => {
    const key = toColumnKey(header, index, usedKeys);
    return {
      key,
      header,
      editable: isColumnEditable(key),
    };
  });

  const rows = (table.rows || []).map((row, rowIndex) => {
    const values: Record<string, string> = {};

    columns.forEach((column, columnIndex) => {
      const cell = row.c?.[columnIndex];
      if (cell && typeof cell.f === "string") {
        values[column.key] = cell.f;
      } else {
        values[column.key] = normalizeCellValue(cell?.v);
      }
    });

    return {
      rowNumber: rowIndex + 2,
      values,
    };
  });

  return { columns, rows };
}

function parseGvizPayload(text: string): GvizResponse {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new BrainSheetError("Unable to parse Google GViz response.", 502);
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  } catch (error) {
    throw new BrainSheetError(
      `Invalid GViz payload: ${error instanceof Error ? error.message : "Unknown parse error"}`,
      502,
    );
  }
}

async function listSheetNames(mode: SyncMode, sheetId: string): Promise<string[]> {
  if (mode === "public") {
    return [];
  }

  try {
    const metadata = await callSheetsApi<SpreadsheetMetadataResponse>(
      mode,
      `/spreadsheets/${sheetId}`,
      { method: "GET" },
      new URLSearchParams({
        fields: "sheets.properties.title",
      }),
    );

    return (metadata.sheets || [])
      .map((sheet) => sheet.properties?.title?.trim())
      .filter((sheetName): sheetName is string => Boolean(sheetName));
  } catch {
    return [];
  }
}

async function fetchRowsViaApi(
  mode: ApiMode,
  sheetId: string,
  sheetName: string,
): Promise<ParsedSheetData> {
  const range = `${quoteSheetName(sheetName)}!A1:ZZ`;
  const data = await callSheetsApi<SheetValuesResponse>(
    mode,
    `/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { method: "GET" },
    new URLSearchParams({
      majorDimension: "ROWS",
    }),
  );

  return matrixToParsedData(data.values || []);
}

async function fetchRowsViaGviz(
  sheetId: string,
  sheetName?: string,
): Promise<ParsedSheetData> {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:json");
  if (sheetName) {
    url.searchParams.set("sheet", sheetName);
  }

  const response = await fetch(url);
  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new BrainSheetError(`Google Sheet public feed failed: ${message}`, 502);
  }

  const rawPayload = await response.text();
  return gvizToParsedData(parseGvizPayload(rawPayload));
}

function candidateSheetNames(
  requestedName: string | undefined,
  availableSheets: string[],
): Array<string | undefined> {
  const candidates: Array<string | undefined> = [];

  if (requestedName?.trim()) {
    candidates.push(requestedName.trim());
  }

  const envDefault = getEnvDefaultSheetName();
  if (envDefault) {
    candidates.push(envDefault);
  }

  for (const fallbackName of FALLBACK_SHEET_NAMES) {
    candidates.push(fallbackName);
  }

  if (availableSheets.length > 0) {
    candidates.push(availableSheets[0]);
  }

  candidates.push(undefined);

  const unique = new Set<string>();
  const deduped: Array<string | undefined> = [];
  for (const candidate of candidates) {
    if (candidate === undefined) {
      if (!deduped.includes(undefined)) {
        deduped.push(undefined);
      }
      continue;
    }

    const normalized = candidate.trim();
    if (!normalized) {
      continue;
    }
    if (!unique.has(normalized)) {
      unique.add(normalized);
      deduped.push(normalized);
    }
  }

  return deduped;
}

function getColumnIndexByKey(columns: BrainColumn[]): Map<string, number> {
  const indexByKey = new Map<string, number>();
  columns.forEach((column, index) => {
    indexByKey.set(column.key, index);
    indexByKey.set(column.header, index);
    indexByKey.set(column.header.toLowerCase(), index);
  });
  return indexByKey;
}

function columnIndexToLetter(columnCount: number): string {
  let value = columnCount;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

export function getBrainSyncStatus(): BrainSyncStatus {
  const mode = getSyncMode();
  const serviceAccount = getServiceAccountCredentials();
  return {
    mode,
    editable: isWriteMode(mode),
    readOnlyReason: getReadOnlyReason(mode),
    serviceAccountEmail: serviceAccount?.client_email,
  };
}

export async function getBrainEntries(
  options: GetBrainEntriesOptions = {},
): Promise<BrainEntriesResponse> {
  const sheetId = normalizeSheetId(options.sheet);
  const mode = getSyncMode();
  const availableSheets = await listSheetNames(mode, sheetId);
  const candidates = candidateSheetNames(options.sheetName, availableSheets);

  let lastError: unknown = null;
  let data: ParsedSheetData | null = null;
  let selectedSheetName: string | undefined;

  for (const candidate of candidates) {
    if (mode !== "public" && !candidate) {
      continue;
    }

    try {
      data =
        mode === "public"
          ? await fetchRowsViaGviz(sheetId, candidate)
          : await fetchRowsViaApi(mode, sheetId, candidate as string);
      selectedSheetName = candidate;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!data) {
    if (lastError instanceof BrainSheetError) {
      throw lastError;
    }

    throw new BrainSheetError("Unable to load sheet rows.", 502);
  }

  return {
    sheetId,
    sheetName:
      selectedSheetName ||
      options.sheetName?.trim() ||
      availableSheets[0] ||
      getEnvDefaultSheetName() ||
      "Sheet1",
    sheetUrl: buildSheetUrl(sheetId),
    mode,
    editable: isWriteMode(mode),
    readOnlyReason: getReadOnlyReason(mode),
    columns: data.columns,
    rows: data.rows,
    totalRows: data.rows.length,
    fetchedAtIso: new Date().toISOString(),
    availableSheets,
    serviceAccountEmail: getServiceAccountCredentials()?.client_email,
  };
}

export async function updateBrainRow(
  options: UpdateBrainRowOptions,
): Promise<{
  sheetId: string;
  sheetName: string;
  rowNumber: number;
  updatesApplied: number;
  row: BrainRow;
}> {
  const mode = getSyncMode();
  if (!isWriteMode(mode)) {
    throw new BrainSheetError(
      "Write operations require GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_ACCESS_TOKEN.",
      403,
    );
  }

  const rowNumber = Number.isInteger(options.rowNumber) ? options.rowNumber : NaN;
  if (!Number.isFinite(rowNumber) || rowNumber < 2) {
    throw new BrainSheetError("rowNumber must be an integer >= 2.", 400);
  }

  if (!options.updates || Object.keys(options.updates).length === 0) {
    throw new BrainSheetError("No updates provided.", 400);
  }

  const sheetId = normalizeSheetId(options.sheet);
  const availableSheets = await listSheetNames(mode, sheetId);
  const sheetName =
    options.sheetName?.trim() ||
    availableSheets[0] ||
    getEnvDefaultSheetName() ||
    FALLBACK_SHEET_NAMES[0];

  const range = `${quoteSheetName(sheetName)}!A1:ZZ`;
  const current = await callSheetsApi<SheetValuesResponse>(
    mode,
    `/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { method: "GET" },
    new URLSearchParams({
      majorDimension: "ROWS",
    }),
  );

  const matrix = current.values || [];
  if (matrix.length === 0) {
    throw new BrainSheetError("Sheet is empty. Cannot update rows without headers.", 400);
  }

  const parsed = matrixToParsedData(matrix);
  if (!parsed.columns.length) {
    throw new BrainSheetError("No header row found. Add headers in row 1.", 400);
  }

  const rowIndex = rowNumber - 2;
  if (rowIndex < 0 || rowIndex >= parsed.rows.length) {
    throw new BrainSheetError(`Row ${rowNumber} does not exist in the loaded sheet.`, 404);
  }

  const rawExistingRow = matrix[rowNumber - 1] || [];
  const workingRow = Array.from({ length: parsed.columns.length }, (_, index) => {
    return rawExistingRow[index] ?? "";
  });

  const indexByKey = getColumnIndexByKey(parsed.columns);
  let updatesApplied = 0;
  for (const [rawKey, rawValue] of Object.entries(options.updates)) {
    const key = rawKey.trim();
    if (!key) {
      continue;
    }

    const columnIndex = indexByKey.get(key) ?? indexByKey.get(key.toLowerCase());
    if (columnIndex === undefined) {
      throw new BrainSheetError(`Unknown column key: ${rawKey}`, 400);
    }

    workingRow[columnIndex] = rawValue ?? "";
    updatesApplied += 1;
  }

  if (updatesApplied === 0) {
    throw new BrainSheetError("No valid column updates were provided.", 400);
  }

  const endColumn = columnIndexToLetter(parsed.columns.length);
  const updateRange = `${quoteSheetName(sheetName)}!A${rowNumber}:${endColumn}${rowNumber}`;
  await callSheetsApi<unknown>(
    mode,
    `/spreadsheets/${sheetId}/values/${encodeURIComponent(updateRange)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        range: updateRange,
        majorDimension: "ROWS",
        values: [workingRow],
      }),
    },
    new URLSearchParams({
      valueInputOption: "USER_ENTERED",
    }),
  );

  const updatedValues: Record<string, string> = {};
  parsed.columns.forEach((column, index) => {
    updatedValues[column.key] = workingRow[index] ?? "";
  });

  return {
    sheetId,
    sheetName,
    rowNumber,
    updatesApplied,
    row: {
      rowNumber,
      values: updatedValues,
    },
  };
}
