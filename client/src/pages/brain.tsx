import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Brain,
  ExternalLink,
  Loader2,
  Lock,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type SyncMode = "service_account" | "oauth_token" | "api_key" | "public";

interface BrainColumn {
  key: string;
  header: string;
  editable: boolean;
}

interface BrainRow {
  rowNumber: number;
  values: Record<string, string>;
}

interface BrainEntriesResponse {
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

type SortBy = "row" | "updated" | "due" | "priority" | "category" | "status";
type SortOrder = "asc" | "desc";

interface FieldMap {
  title: string | null;
  original: string | null;
  rewritten: string | null;
  type: string | null;
  category: string | null;
  tags: string | null;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  updatedAt: string | null;
  createdAt: string | null;
}

const STORAGE_SHEET_INPUT = "brain2_sheet_input";
const STORAGE_SHEET_NAME = "brain2_sheet_name";
const DEFAULT_SHEET_INPUT =
  "https://docs.google.com/spreadsheets/d/1NAXIJpRcYgQpEFV9jYMfYLR6c8WtNnps36_WxvgCesc/edit?usp=sharing";
const DEFAULT_SHEET_NAME = "Thought Inbox";

function getInitialValue(key: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = localStorage.getItem(key);
  return stored ? stored : fallback;
}

function getColumnKey(columns: BrainColumn[], candidates: string[]): string | null {
  const keys = new Set(columns.map((column) => column.key));
  for (const candidate of candidates) {
    if (keys.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

function getValue(row: BrainRow, key: string | null): string {
  if (!key) {
    return "";
  }
  return row.values[key] ?? "";
}

function parseTags(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }

  if (raw.trim().startsWith("[") && raw.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to delimiter split below.
    }
  }

  return raw
    .split(/[,;|]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function toSnippet(text: string, max = 180): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}...`;
}

function parseDateValue(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareNullableNumbers(a: number | null, b: number | null): number {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a - b;
}

function prettyKey(column: BrainColumn): string {
  return column.header || column.key.replace(/_/g, " ");
}

function isLongField(columnKey: string): boolean {
  return (
    columnKey.includes("original") ||
    columnKey.includes("rewritten") ||
    columnKey.includes("summary") ||
    columnKey.includes("action") ||
    columnKey.includes("json") ||
    columnKey.includes("note") ||
    columnKey.includes("description")
  );
}

function formatDateLabel(value: string): string {
  const parsed = parseDateValue(value);
  if (parsed === null) {
    return value;
  }
  return new Date(parsed).toLocaleString();
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

function parseGvizPayload(raw: string): GvizResponse {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Unable to parse Google public feed response.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as GvizResponse;
}

function normalizeColumnKey(header: string, index: number, used: Set<string>): string {
  const base =
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || `column_${index + 1}`;

  let key = base;
  let count = 2;
  while (used.has(key)) {
    key = `${base}_${count}`;
    count += 1;
  }
  used.add(key);
  return key;
}

async function fetchPublicSheetInBrowser(
  sheetInput: string,
  sheetName: string,
): Promise<BrainEntriesResponse> {
  const sheetId = extractSheetId(sheetInput);
  if (!sheetId) {
    throw new Error("Invalid Google Sheet URL or ID.");
  }

  const url = new URL(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`);
  url.searchParams.set("tqx", "out:json");
  if (sheetName.trim()) {
    url.searchParams.set("sheet", sheetName.trim());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Public sheet request failed: ${response.status} ${response.statusText}`);
  }

  const payload = parseGvizPayload(await response.text());
  if (payload.status && payload.status !== "ok") {
    const message =
      payload.errors?.[0]?.detailed_message ||
      payload.errors?.[0]?.message ||
      "Unknown public feed error";
    throw new Error(message);
  }

  const table = payload.table;
  if (!table) {
    throw new Error("No table data returned by the Google public feed.");
  }

  const usedKeys = new Set<string>();
  const columns: BrainColumn[] = (table.cols || []).map((column, index) => {
    const header = column.label?.trim() || `Column ${index + 1}`;
    return {
      key: normalizeColumnKey(header, index, usedKeys),
      header,
      editable: false,
    };
  });

  const rows: BrainRow[] = (table.rows || []).map((row, rowIndex) => {
    const values: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      const cell = row.c?.[columnIndex];
      if (cell && typeof cell.f === "string") {
        values[column.key] = cell.f;
      } else if (cell?.v === undefined || cell?.v === null) {
        values[column.key] = "";
      } else {
        values[column.key] = String(cell.v);
      }
    });
    return {
      rowNumber: rowIndex + 2,
      values,
    };
  });

  return {
    sheetId,
    sheetName: sheetName.trim() || "Sheet1",
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    mode: "public",
    editable: false,
    readOnlyReason:
      "Read-only fallback mode (client-side public feed). Configure API/server credentials for editing.",
    columns,
    rows,
    totalRows: rows.length,
    fetchedAtIso: new Date().toISOString(),
    availableSheets: [],
  };
}

export default function BrainPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [sheetInput, setSheetInput] = useState(() =>
    getInitialValue(STORAGE_SHEET_INPUT, DEFAULT_SHEET_INPUT),
  );
  const [sheetName, setSheetName] = useState(() =>
    getInitialValue(STORAGE_SHEET_NAME, DEFAULT_SHEET_NAME),
  );
  const [sheetInputDraft, setSheetInputDraft] = useState(sheetInput);
  const [sheetNameDraft, setSheetNameDraft] = useState(sheetName);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRowNumber, setSelectedRowNumber] = useState<number | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(STORAGE_SHEET_INPUT, sheetInput);
    localStorage.setItem(STORAGE_SHEET_NAME, sheetName);
  }, [sheetInput, sheetName]);

  const entriesQuery = useQuery<BrainEntriesResponse, Error>({
    queryKey: ["brain-entries", sheetInput, sheetName],
    enabled: Boolean(sheetInput.trim()),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sheet", sheetInput.trim());
      if (sheetName.trim()) {
        params.set("sheetName", sheetName.trim());
      }

      try {
        const response = await fetch(`/api/brain/entries?${params.toString()}`);
        const raw = await response.text();
        if (!response.ok) {
          try {
            const parsed = JSON.parse(raw) as { message?: string };
            throw new Error(parsed.message || raw || "Failed to load sheet rows.");
          } catch {
            throw new Error(raw || "Failed to load sheet rows.");
          }
        }
        return JSON.parse(raw) as BrainEntriesResponse;
      } catch (apiError) {
        try {
          return await fetchPublicSheetInBrowser(sheetInput, sheetName);
        } catch (fallbackError) {
          const apiMessage =
            apiError instanceof Error ? apiError.message : "API request failed unexpectedly.";
          const fallbackMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : "Public-feed fallback failed unexpectedly.";
          throw new Error(`${apiMessage} Fallback error: ${fallbackMessage}`);
        }
      }
    },
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const rows = entriesQuery.data?.rows ?? [];
  const columns = entriesQuery.data?.columns ?? [];
  const editableColumns = useMemo(() => {
    const priority = [
      "title",
      "original_text",
      "rewritten_text",
      "summary_1line",
      "category",
      "task_status",
      "priority",
      "due_date_iso",
      "tags",
      "action_items",
      "person",
      "reminder_text",
    ];

    return [...columns]
      .filter((column) => column.editable)
      .sort((a, b) => {
        const aIndex = priority.indexOf(a.key);
        const bIndex = priority.indexOf(b.key);
        const aRank = aIndex === -1 ? 999 : aIndex;
        const bRank = bIndex === -1 ? 999 : bIndex;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return a.header.localeCompare(b.header);
      });
  }, [columns]);

  const fieldMap = useMemo<FieldMap>(() => {
    return {
      title: getColumnKey(columns, ["title"]),
      original: getColumnKey(columns, ["original", "original_text"]),
      rewritten: getColumnKey(columns, ["rewritten", "rewritten_text", "summary_1line"]),
      type: getColumnKey(columns, ["type"]),
      category: getColumnKey(columns, ["category"]),
      tags: getColumnKey(columns, ["tags"]),
      status: getColumnKey(columns, ["task_status", "status"]),
      priority: getColumnKey(columns, ["priority"]),
      dueDate: getColumnKey(columns, ["due_date_iso", "due_date"]),
      updatedAt: getColumnKey(columns, ["updated_at_iso", "updated_at"]),
      createdAt: getColumnKey(columns, ["created_at"]),
    };
  }, [columns]);

  const typeOptions = useMemo(() => {
    if (!fieldMap.type) {
      return [];
    }
    return Array.from(new Set(rows.map((row) => getValue(row, fieldMap.type)).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [rows, fieldMap.type]);

  const categoryOptions = useMemo(() => {
    if (!fieldMap.category) {
      return [];
    }
    return Array.from(
      new Set(rows.map((row) => getValue(row, fieldMap.category)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));
  }, [rows, fieldMap.category]);

  const statusOptions = useMemo(() => {
    if (!fieldMap.status) {
      return [];
    }
    return Array.from(new Set(rows.map((row) => getValue(row, fieldMap.status)).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [rows, fieldMap.status]);

  const tagOptions = useMemo(() => {
    if (!fieldMap.tags) {
      return [];
    }

    const tagSet = new Set<string>();
    rows.forEach((row) => {
      parseTags(getValue(row, fieldMap.tags)).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [rows, fieldMap.tags]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      if (query) {
        const haystack = Object.values(row.values).join(" ").toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      if (typeFilter !== "all" && getValue(row, fieldMap.type) !== typeFilter) {
        return false;
      }
      if (categoryFilter !== "all" && getValue(row, fieldMap.category) !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && getValue(row, fieldMap.status) !== statusFilter) {
        return false;
      }
      if (tagFilter !== "all") {
        const tags = parseTags(getValue(row, fieldMap.tags));
        if (!tags.includes(tagFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [
    rows,
    searchText,
    typeFilter,
    categoryFilter,
    statusFilter,
    tagFilter,
    fieldMap.type,
    fieldMap.category,
    fieldMap.status,
    fieldMap.tags,
  ]);

  const sortedRows = useMemo(() => {
    const priorityMap: Record<string, number> = {
      high: 3,
      medium: 2,
      low: 1,
    };

    const sorted = [...filteredRows].sort((a, b) => {
      if (sortBy === "row") {
        return a.rowNumber - b.rowNumber;
      }

      if (sortBy === "updated") {
        return compareNullableNumbers(
          parseDateValue(getValue(a, fieldMap.updatedAt)),
          parseDateValue(getValue(b, fieldMap.updatedAt)),
        );
      }

      if (sortBy === "due") {
        return compareNullableNumbers(
          parseDateValue(getValue(a, fieldMap.dueDate)),
          parseDateValue(getValue(b, fieldMap.dueDate)),
        );
      }

      if (sortBy === "priority") {
        const aPriority = getValue(a, fieldMap.priority).toLowerCase();
        const bPriority = getValue(b, fieldMap.priority).toLowerCase();
        return (priorityMap[aPriority] || 0) - (priorityMap[bPriority] || 0);
      }

      if (sortBy === "category") {
        return getValue(a, fieldMap.category).localeCompare(getValue(b, fieldMap.category));
      }

      if (sortBy === "status") {
        return getValue(a, fieldMap.status).localeCompare(getValue(b, fieldMap.status));
      }

      return 0;
    });

    if (sortOrder === "desc") {
      sorted.reverse();
    }

    return sorted;
  }, [
    filteredRows,
    sortBy,
    sortOrder,
    fieldMap.updatedAt,
    fieldMap.dueDate,
    fieldMap.priority,
    fieldMap.category,
    fieldMap.status,
  ]);

  const selectedRow = useMemo(() => {
    if (selectedRowNumber === null) {
      return null;
    }
    return rows.find((row) => row.rowNumber === selectedRowNumber) || null;
  }, [rows, selectedRowNumber]);

  useEffect(() => {
    if (!editorOpen || !selectedRow) {
      return;
    }
    setDraftValues(selectedRow.values);
  }, [editorOpen, selectedRow]);

  const pendingUpdates = useMemo(() => {
    if (!selectedRow) {
      return {};
    }

    const updates: Record<string, string> = {};
    for (const column of editableColumns) {
      const before = selectedRow.values[column.key] ?? "";
      const after = draftValues[column.key] ?? "";
      if (before !== after) {
        updates[column.key] = after;
      }
    }
    return updates;
  }, [selectedRow, editableColumns, draftValues]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRow) {
        throw new Error("No row is selected.");
      }

      const updates = pendingUpdates;
      if (!Object.keys(updates).length) {
        throw new Error("No changes to save.");
      }

      const response = await apiRequest("PATCH", `/api/brain/entries/${selectedRow.rowNumber}`, {
        sheet: sheetInput,
        sheetName,
        updates,
      });

      return (await response.json()) as { updatesApplied: number };
    },
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({
        queryKey: ["brain-entries", sheetInput, sheetName],
      });
      toast({
        title: "Row updated",
        description: `${payload.updatesApplied} field(s) synced to Google Sheets.`,
      });
      setEditorOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update this row.",
      });
    },
  });

  const taskCount = useMemo(() => {
    if (!fieldMap.type) {
      return 0;
    }
    return rows.filter((row) => getValue(row, fieldMap.type).toLowerCase() === "task").length;
  }, [rows, fieldMap.type]);

  const applySheetSelection = () => {
    const nextSheet = sheetInputDraft.trim();
    const nextSheetName = sheetNameDraft.trim();
    if (!nextSheet) {
      toast({
        title: "Sheet input required",
        description: "Paste a Google Sheet URL or the sheet ID.",
      });
      return;
    }

    const changed = nextSheet !== sheetInput || nextSheetName !== sheetName;
    setSheetInput(nextSheet);
    setSheetName(nextSheetName);
    if (!changed) {
      entriesQuery.refetch();
    }
  };

  const openRowEditor = (rowNumber: number) => {
    setSelectedRowNumber(rowNumber);
    setEditorOpen(true);
  };

  const sourceSheetUrl =
    entriesQuery.data?.sheetUrl ||
    (sheetInput.includes("http")
      ? sheetInput
      : `https://docs.google.com/spreadsheets/d/${sheetInput}/edit`);

  const changedCount = Object.keys(pendingUpdates).length;

  const editorBody = selectedRow ? (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/35 p-3 text-xs text-muted-foreground">
        Row #{selectedRow.rowNumber} in tab {entriesQuery.data?.sheetName || sheetName || "Sheet"}
      </div>

      {!entriesQuery.data?.editable && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Read-only mode</AlertTitle>
          <AlertDescription>
            Configure write credentials to enable two-way sync from this panel.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {editableColumns.map((column) => {
          const value = draftValues[column.key] ?? "";
          return (
            <div key={column.key} className="space-y-1.5">
              <Label htmlFor={`brain-field-${column.key}`} className="text-xs uppercase tracking-wide">
                {prettyKey(column)}
              </Label>
              {isLongField(column.key) ? (
                <Textarea
                  id={`brain-field-${column.key}`}
                  value={value}
                  rows={4}
                  onChange={(event) =>
                    setDraftValues((current) => ({
                      ...current,
                      [column.key]: event.target.value,
                    }))
                  }
                />
              ) : (
                <Input
                  id={`brain-field-${column.key}`}
                  value={value}
                  onChange={(event) =>
                    setDraftValues((current) => ({
                      ...current,
                      [column.key]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          {changedCount} pending change{changedCount === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditorOpen(false)}
            disabled={saveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              !entriesQuery.data?.editable || saveMutation.isPending || Object.keys(pendingUpdates).length === 0
            }
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="text-sm text-muted-foreground">Select a row first.</div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_hsl(190_72%_92%),_transparent_42%),radial-gradient(circle_at_bottom_right,_hsl(38_92%_92%),_transparent_36%),hsl(var(--background))]">
      <div className="pointer-events-none absolute -left-20 top-8 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl space-y-5 px-4 py-6">
        <section className="rounded-2xl border bg-card/90 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Brain className="h-6 w-6 text-primary" />
                Brain 2.0 Console
              </h1>
              <p className="text-sm text-muted-foreground">
                Read, filter, sort, and optionally edit your Telegram thought pipeline in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                {entriesQuery.data?.mode || "public"} mode
              </Badge>
              <Badge variant="outline">{rows.length} entries</Badge>
              <Badge variant="outline">{taskCount} tasks</Badge>
            </div>
          </div>
        </section>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Google Sheet Connection</CardTitle>
            <CardDescription>
              Paste your sheet URL/ID and tab name. Data auto-refreshes every 30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_240px_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                applySheetSelection();
              }}
            >
              <Input
                value={sheetInputDraft}
                onChange={(event) => setSheetInputDraft(event.target.value)}
                placeholder="Google Sheet URL or ID"
              />
              <Input
                value={sheetNameDraft}
                onChange={(event) => setSheetNameDraft(event.target.value)}
                placeholder="Tab name (optional)"
              />
              <Button type="submit">Load</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => entriesQuery.refetch()}
                disabled={entriesQuery.isFetching}
              >
                {entriesQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </form>

            {!!entriesQuery.data?.availableSheets.length && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Detected tabs:</span>
                {entriesQuery.data.availableSheets.map((name) => (
                  <Button
                    key={name}
                    size="sm"
                    variant={sheetNameDraft === name ? "default" : "outline"}
                    onClick={() => setSheetNameDraft(name)}
                    type="button"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <a href={sourceSheetUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Google Sheet
                </a>
              </Button>
            </div>

            {entriesQuery.data && !entriesQuery.data.editable && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Two-way sync is currently disabled</AlertTitle>
                <AlertDescription>
                  {entriesQuery.data.readOnlyReason}
                  {entriesQuery.data.serviceAccountEmail
                    ? ` Share the sheet with ${entriesQuery.data.serviceAccountEmail} and set write credentials.`
                    : ""}
                </AlertDescription>
              </Alert>
            )}

            {entriesQuery.error && (
              <Alert variant="destructive">
                <AlertTitle>Unable to load sheet</AlertTitle>
                <AlertDescription>{entriesQuery.error.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Explore Entries</CardTitle>
            <CardDescription>Search, filter, and sort your thoughts for fast review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Search original, rewritten, tags..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                  />
                </div>
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {tagOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as SortBy)}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">Updated Time</SelectItem>
                    <SelectItem value="due">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="row">Row Number</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
                  }
                  aria-label="Toggle sort order"
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowDown className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Showing {sortedRows.length} of {rows.length} rows
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="md:hidden space-y-3">
          {entriesQuery.isLoading && (
            <Card>
              <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading rows...
              </CardContent>
            </Card>
          )}

          {!entriesQuery.isLoading &&
            sortedRows.map((row) => {
              const title =
                getValue(row, fieldMap.rewritten) ||
                getValue(row, fieldMap.original) ||
                getValue(row, fieldMap.title) ||
                "Untitled";
              const tags = parseTags(getValue(row, fieldMap.tags)).slice(0, 4);
              return (
                <Card key={row.rowNumber} className="cursor-pointer" onClick={() => openRowEditor(row.rowNumber)}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{toSnippet(title, 140)}</p>
                      <Badge variant="outline">#{row.rowNumber}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getValue(row, fieldMap.category) && (
                        <Badge variant="secondary">{getValue(row, fieldMap.category)}</Badge>
                      )}
                      {getValue(row, fieldMap.status) && (
                        <Badge variant="outline">{getValue(row, fieldMap.status)}</Badge>
                      )}
                      {tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getValue(row, fieldMap.updatedAt)
                        ? `Updated ${formatDateLabel(getValue(row, fieldMap.updatedAt))}`
                        : "Tap to open editor"}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {!entriesQuery.isLoading && !sortedRows.length && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No rows match the current filters.
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="hidden md:block">
          <CardContent className="p-0">
            {entriesQuery.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading rows...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Row</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[130px]">Category</TableHead>
                    <TableHead>Original / Rewritten</TableHead>
                    <TableHead className="w-[180px]">Tags</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[180px]">Updated</TableHead>
                    <TableHead className="w-[70px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map((row) => {
                    const original = getValue(row, fieldMap.original);
                    const rewritten = getValue(row, fieldMap.rewritten);
                    const tags = parseTags(getValue(row, fieldMap.tags)).slice(0, 2);
                    return (
                      <TableRow key={row.rowNumber} onClick={() => openRowEditor(row.rowNumber)} className="cursor-pointer">
                        <TableCell className="font-medium">#{row.rowNumber}</TableCell>
                        <TableCell>{getValue(row, fieldMap.type) || "-"}</TableCell>
                        <TableCell>{getValue(row, fieldMap.category) || "-"}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rewritten && <p className="text-xs font-medium">{toSnippet(rewritten, 120)}</p>}
                            {original && (
                              <p className="text-xs text-muted-foreground">{toSnippet(original, 130)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tags.length ? (
                              tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getValue(row, fieldMap.status) || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {getValue(row, fieldMap.updatedAt)
                            ? formatDateLabel(getValue(row, fieldMap.updatedAt))
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => {
                              event.stopPropagation();
                              openRowEditor(row.rowNumber);
                            }}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!sortedRows.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                        No rows match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {isMobile ? (
        <Drawer open={editorOpen} onOpenChange={setEditorOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>Edit Row</DrawerTitle>
              <DrawerDescription>Update fields and sync back to Google Sheets.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{editorBody}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
          <SheetContent className="w-full overflow-hidden sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Edit Row</SheetTitle>
              <SheetDescription>Update fields and sync back to Google Sheets.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">{editorBody}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
