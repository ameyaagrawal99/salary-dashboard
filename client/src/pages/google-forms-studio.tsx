import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  FileText,
  Plus,
  RefreshCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  buildGoogleFormsPlan,
  createField,
  createSampleBuilderForm,
  createSection,
  createStep,
  FIELD_TYPE_LABELS,
  SCREENSHOT_CAPABILITIES,
  SUPPORT_TONE,
  type BuilderField,
  type BuilderFieldType,
  type BuilderForm,
} from "@/lib/google-forms-builder";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "google-forms-studio-schema-v1";
const FIELD_TYPES: BuilderFieldType[] = [
  "short_text",
  "long_text",
  "dropdown",
  "multiple_choice",
  "checkboxes",
  "date",
  "time",
  "number",
  "grid",
  "file_upload",
];

function moveByOne<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const copy = [...items];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

function loadInitialSchema(): BuilderForm {
  if (typeof window === "undefined") {
    return createSampleBuilderForm();
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return createSampleBuilderForm();
    }

    const parsed = JSON.parse(saved) as Partial<BuilderForm>;
    if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createSampleBuilderForm();
    }

    return parsed as BuilderForm;
  } catch {
    return createSampleBuilderForm();
  }
}

function renderFieldPreview(field: BuilderField): JSX.Element {
  if (field.type === "long_text") {
    return <Textarea placeholder={field.label} className="min-h-[92px] bg-white/80" />;
  }

  if (field.type === "dropdown" || field.type === "multiple_choice" || field.type === "checkboxes") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white/85 p-3">
        <div className="text-sm font-medium text-slate-700">{field.label}</div>
        <div className="mt-2 space-y-2">
          {field.options.map((option) => (
            <div key={option} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="h-3.5 w-3.5 rounded-full border border-slate-300 bg-white" />
              {option}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "grid") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/85">
        <div className="grid grid-cols-[minmax(160px,1.5fr)_repeat(3,minmax(90px,1fr))] bg-teal-500/90 text-xs font-semibold uppercase tracking-[0.16em] text-white">
          <div className="px-3 py-2">Row</div>
          {field.options.slice(0, 3).map((option) => (
            <div key={option} className="px-3 py-2 text-center">
              {option}
            </div>
          ))}
        </div>
        {field.rows.map((row) => (
          <div
            key={row}
            className="grid grid-cols-[minmax(160px,1.5fr)_repeat(3,minmax(90px,1fr))] border-t border-slate-200 text-sm"
          >
            <div className="px-3 py-3 text-slate-700">{row}</div>
            {field.options.slice(0, 3).map((option) => (
              <div key={`${row}-${option}`} className="px-3 py-3">
                <div className="h-9 rounded-lg border border-slate-200 bg-slate-50" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "file_upload") {
    return (
      <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/80 p-4 text-sm text-sky-900">
        <div className="font-medium">{field.label}</div>
        <div className="mt-1 text-sky-800/80">
          Manual follow-up in Google Forms. The API export leaves a placeholder.
        </div>
      </div>
    );
  }

  return <Input placeholder={field.label} className="h-11 bg-white/85" />;
}

function GoogleFormsStudioPage() {
  const [schema, setSchema] = useState<BuilderForm>(() => loadInitialSchema());
  const [selectedStepId, setSelectedStepId] = useState<string>(() => schema.steps[0]?.id ?? "");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    () => schema.steps[0]?.sections[0]?.id ?? "",
  );
  const [copyState, setCopyState] = useState<"schema" | "export" | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(schema));
  }, [schema]);

  const selectedStep = schema.steps.find((step) => step.id === selectedStepId) ?? schema.steps[0];
  const selectedSection = selectedStep?.sections.find((section) => section.id === selectedSectionId) ?? selectedStep?.sections[0];
  const exportPlan = useMemo(() => buildGoogleFormsPlan(schema), [schema]);
  const exportJson = useMemo(() => JSON.stringify(exportPlan.batchUpdatePayload, null, 2), [exportPlan]);
  const schemaJson = useMemo(() => JSON.stringify(schema, null, 2), [schema]);

  useEffect(() => {
    if (!selectedStep) {
      return;
    }

    if (!schema.steps.some((step) => step.id === selectedStepId)) {
      setSelectedStepId(schema.steps[0]?.id ?? "");
      setSelectedSectionId(schema.steps[0]?.sections[0]?.id ?? "");
      return;
    }

    if (!selectedStep.sections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(selectedStep.sections[0]?.id ?? "");
    }
  }, [schema.steps, selectedStep, selectedSectionId, selectedStepId]);

  function updateSchema(next: BuilderForm) {
    setSchema(next);
  }

  function updateStep(stepId: string, updater: (step: BuilderForm["steps"][number]) => BuilderForm["steps"][number]) {
    updateSchema({
      ...schema,
      steps: schema.steps.map((step) => (step.id === stepId ? updater(step) : step)),
    });
  }

  function updateSection(
    stepId: string,
    sectionId: string,
    updater: (section: NonNullable<typeof selectedStep>["sections"][number]) => NonNullable<typeof selectedStep>["sections"][number],
  ) {
    updateStep(stepId, (step) => ({
      ...step,
      sections: step.sections.map((section) => (section.id === sectionId ? updater(section) : section)),
    }));
  }

  function updateField(
    stepId: string,
    sectionId: string,
    fieldId: string,
    updater: (field: BuilderField) => BuilderField,
  ) {
    updateSection(stepId, sectionId, (section) => ({
      ...section,
      fields: section.fields.map((field) => (field.id === fieldId ? updater(field) : field)),
    }));
  }

  function handleAddStep() {
    const nextStep = createStep(`Step ${schema.steps.length + 1}`);
    updateSchema({
      ...schema,
      steps: [...schema.steps, nextStep],
    });
    setSelectedStepId(nextStep.id);
    setSelectedSectionId(nextStep.sections[0]?.id ?? "");
  }

  function handleAddSection() {
    if (!selectedStep) {
      return;
    }

    const nextSection = createSection(`Section ${selectedStep.sections.length + 1}`);
    updateStep(selectedStep.id, (step) => ({
      ...step,
      sections: [...step.sections, nextSection],
    }));
    setSelectedSectionId(nextSection.id);
  }

  function handleAddField(type: BuilderFieldType) {
    if (!selectedStep || !selectedSection) {
      return;
    }

    updateSection(selectedStep.id, selectedSection.id, (section) => ({
      ...section,
      fields: [...section.fields, createField(type, `New ${FIELD_TYPE_LABELS[type]}`)],
    }));
  }

  function handleCopy(text: string, mode: "schema" | "export") {
    navigator.clipboard.writeText(text).then(() => {
      setCopyState(mode);
      window.setTimeout(() => setCopyState(null), 1600);
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_28%),linear-gradient(180deg,#f8f5ec_0%,#f6f7f0_52%,#edf6f4_100%)]">
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        <section className="overflow-hidden rounded-[28px] border border-white/60 bg-white/70 shadow-xl backdrop-blur">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,rgba(13,148,136,0.95),rgba(14,116,144,0.92))] px-6 py-8 text-white md:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                Google Forms backend only
              </Badge>
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white">
                No-code schema builder starter
              </Badge>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
              <div>
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-4xl">
                  Build dense recruitment workflows like your screenshots, but constrain them to what Google Forms can actually run.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/86 md:text-base">
                  This page models fixed-slot repeaters, step-wise sections, branching-ready modules, and Google export payloads.
                  The applicant runtime remains the Google-hosted responder form, which preserves Google drafts and resume behavior.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/70">Steps</div>
                  <div className="mt-1 text-3xl font-semibold">{schema.steps.length}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/70">Google items</div>
                  <div className="mt-1 text-3xl font-semibold">{exportPlan.renderedQuestionCount}</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/70">Manual follow-ups</div>
                  <div className="mt-1 text-3xl font-semibold">{exportPlan.manualSteps.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-4 py-5 md:px-6 lg:grid-cols-[300px_minmax(0,1.15fr)_420px]">
            <Card className="border-slate-200/80 bg-white/90">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Builder map</CardTitle>
                    <CardDescription>Steps, sections, and fixed-slot repeaters.</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddStep}>
                    <Plus className="h-4 w-4" />
                    Step
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Form shell</div>
                  <Input
                    value={schema.title}
                    onChange={(event) => updateSchema({ ...schema, title: event.target.value })}
                    className="mt-3 bg-white"
                    placeholder="Form title"
                  />
                  <Textarea
                    value={schema.description}
                    onChange={(event) => updateSchema({ ...schema, description: event.target.value })}
                    className="mt-3 min-h-[90px] bg-white"
                    placeholder="Form description"
                  />
                  <div className="mt-3 space-y-2 text-sm">
                    <label className="flex items-center gap-3 text-slate-700">
                      <Checkbox
                        checked={schema.collectEmail}
                        onCheckedChange={(checked) =>
                          updateSchema({ ...schema, collectEmail: checked === true })
                        }
                      />
                      Collect responder email
                    </label>
                    <label className="flex items-center gap-3 text-slate-700">
                      <Checkbox
                        checked={schema.requireSignIn}
                        onCheckedChange={(checked) =>
                          updateSchema({ ...schema, requireSignIn: checked === true })
                        }
                      />
                      Signed-in flow for drafts and resume
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {schema.steps.map((step, stepIndex) => {
                    const isActive = selectedStep?.id === step.id;
                    return (
                      <div
                        key={step.id}
                        className={cn(
                          "rounded-2xl border p-3 transition-colors",
                          isActive
                            ? "border-teal-300 bg-teal-50/70 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStepId(step.id);
                            setSelectedSectionId(step.sections[0]?.id ?? "");
                          }}
                          className="w-full text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                Step {stepIndex + 1}
                              </div>
                              <div className="mt-1 font-medium text-slate-900">{step.title}</div>
                              <div className="mt-1 text-sm text-slate-600">{step.sections.length} sections</div>
                            </div>
                            <Badge variant="outline" className="bg-white/80">
                              {step.sections.reduce((count, section) => count + section.fields.length, 0)} fields
                            </Badge>
                          </div>
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateSchema({
                                ...schema,
                                steps: moveByOne(schema.steps, stepIndex, -1),
                              })
                            }
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateSchema({
                                ...schema,
                                steps: moveByOne(schema.steps, stepIndex, 1),
                              })
                            }
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateStep(step.id, (current) => ({
                                ...current,
                                sections: [...current.sections, createSection("New section")],
                              }))
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (schema.steps.length === 1) {
                                updateSchema({ ...schema, steps: [createStep("Step 1")] });
                                return;
                              }

                              updateSchema({
                                ...schema,
                                steps: schema.steps.filter((current) => current.id !== step.id),
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                          {step.sections.map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => {
                                setSelectedStepId(step.id);
                                setSelectedSectionId(section.id);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                                selectedSection?.id === section.id && selectedStep?.id === step.id
                                  ? "bg-white shadow-sm ring-1 ring-teal-200"
                                  : "hover:bg-slate-100",
                              )}
                            >
                              <div>
                                <div className="font-medium text-slate-800">{section.title}</div>
                                <div className="text-xs text-slate-500">
                                  {section.repeatMode === "fixed"
                                    ? `${section.slotCount} fixed slots`
                                    : "Single section"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">{section.fields.length}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/92">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Section editor</CardTitle>
                    <CardDescription>Edit the schema that later becomes Google Form sections and questions.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={handleAddSection}>
                      <Plus className="h-4 w-4" />
                      Section
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateSchema(createSampleBuilderForm())}>
                      <RefreshCcw className="h-4 w-4" />
                      Reset sample
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedStep ? (
                  <>
                    <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/90 p-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Current step</div>
                        <Input
                          value={selectedStep.title}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (step) => ({ ...step, title: event.target.value }))
                          }
                          className="mt-3 bg-white"
                          placeholder="Step title"
                        />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Step description</div>
                        <Textarea
                          value={selectedStep.description}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (step) => ({ ...step, description: event.target.value }))
                          }
                          className="mt-3 min-h-[98px] bg-white"
                          placeholder="Explain what this step collects"
                        />
                      </div>
                    </div>

                    {selectedSection ? (
                      <>
                        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_220px]">
                          <div className="space-y-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Section title</div>
                              <Input
                                value={selectedSection.title}
                                onChange={(event) =>
                                  updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                    ...section,
                                    title: event.target.value,
                                  }))
                                }
                                className="mt-2"
                                placeholder="Section title"
                              />
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Section description</div>
                              <Textarea
                                value={selectedSection.description}
                                onChange={(event) =>
                                  updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                    ...section,
                                    description: event.target.value,
                                  }))
                                }
                                className="mt-2 min-h-[110px]"
                                placeholder="How should this block be interpreted in Google Forms?"
                              />
                            </div>
                          </div>
                          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Repeat mode</div>
                              <Select
                                value={selectedSection.repeatMode}
                                onValueChange={(value: "single" | "fixed") =>
                                  updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                    ...section,
                                    repeatMode: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="mt-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Single block</SelectItem>
                                  <SelectItem value="fixed">Fixed slots</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Slot count</div>
                              <Input
                                type="number"
                                min={1}
                                value={selectedSection.slotCount}
                                onChange={(event) =>
                                  updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                    ...section,
                                    slotCount: Math.max(1, Number(event.target.value || 1)),
                                  }))
                                }
                                className="mt-2"
                              />
                            </div>
                            <div className="space-y-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() =>
                                  updateStep(selectedStep.id, (step) => ({
                                    ...step,
                                    sections: [...step.sections, createSection("New section")],
                                  }))
                                }
                              >
                                <Plus className="h-4 w-4" />
                                Add sibling section
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                  const sectionIndex = selectedStep.sections.findIndex(
                                    (section) => section.id === selectedSection.id,
                                  );
                                  updateStep(selectedStep.id, (step) => ({
                                    ...step,
                                    sections: moveByOne(step.sections, sectionIndex, -1),
                                  }));
                                }}
                              >
                                <ArrowUp className="h-4 w-4" />
                                Move section up
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                  const sectionIndex = selectedStep.sections.findIndex(
                                    (section) => section.id === selectedSection.id,
                                  );
                                  updateStep(selectedStep.id, (step) => ({
                                    ...step,
                                    sections: moveByOne(step.sections, sectionIndex, 1),
                                  }));
                                }}
                              >
                                <ArrowDown className="h-4 w-4" />
                                Move section down
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                  const remaining = selectedStep.sections.filter(
                                    (section) => section.id !== selectedSection.id,
                                  );
                                  updateStep(selectedStep.id, (step) => ({
                                    ...step,
                                    sections: remaining.length > 0 ? remaining : [createSection("Untitled section")],
                                  }));
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove section
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3">
                          {FIELD_TYPES.map((type) => (
                            <Button key={type} size="sm" variant="outline" onClick={() => handleAddField(type)}>
                              <Plus className="h-4 w-4" />
                              {FIELD_TYPE_LABELS[type]}
                            </Button>
                          ))}
                        </div>

                        <div className="space-y-4">
                          {selectedSection.fields.map((field, fieldIndex) => (
                            <div key={field.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                    Field {fieldIndex + 1}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                                    <Badge
                                      variant="outline"
                                      className={cn("border", SUPPORT_TONE[field.type === "file_upload" ? "manual" : "native"])}
                                    >
                                      {FIELD_TYPE_LABELS[field.type]}
                                    </Badge>
                                    {field.required ? (
                                      <Badge variant="outline" className="bg-white">
                                        Required
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                        ...section,
                                        fields: moveByOne(section.fields, fieldIndex, -1),
                                      }))
                                    }
                                  >
                                    <ArrowUp className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                        ...section,
                                        fields: moveByOne(section.fields, fieldIndex, 1),
                                      }))
                                    }
                                  >
                                    <ArrowDown className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updateSection(selectedStep.id, selectedSection.id, (section) => ({
                                        ...section,
                                        fields: section.fields.filter((current) => current.id !== field.id),
                                      }))
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Label</div>
                                  <Input
                                    value={field.label}
                                    onChange={(event) =>
                                      updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                        ...current,
                                        label: event.target.value,
                                      }))
                                    }
                                    className="mt-2 bg-white"
                                  />
                                </div>
                                <div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Type</div>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value: BuilderFieldType) => {
                                      const defaults = createField(value, field.label);
                                      updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                        ...current,
                                        type: value,
                                        options: defaults.options,
                                        rows: defaults.rows,
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="mt-2 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(FIELD_TYPE_LABELS) as BuilderFieldType[]).map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {FIELD_TYPE_LABELS[type]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Help text</div>
                                  <Textarea
                                    value={field.helpText}
                                    onChange={(event) =>
                                      updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                        ...current,
                                        helpText: event.target.value,
                                      }))
                                    }
                                    className="mt-2 min-h-[90px] bg-white"
                                  />
                                </div>
                                <div>
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Width hint</div>
                                  <Select
                                    value={field.width}
                                    onValueChange={(value: "full" | "half") =>
                                      updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                        ...current,
                                        width: value,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="mt-2 bg-white">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="half">Half width</SelectItem>
                                      <SelectItem value="full">Full width</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                                    <Checkbox
                                      checked={field.required}
                                      onCheckedChange={(checked) =>
                                        updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                          ...current,
                                          required: checked === true,
                                        }))
                                      }
                                    />
                                    Required question
                                  </label>
                                </div>
                                {field.type === "dropdown" ||
                                field.type === "multiple_choice" ||
                                field.type === "checkboxes" ? (
                                  <div className="md:col-span-2">
                                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                      Options, one per line
                                    </div>
                                    <Textarea
                                      value={field.options.join("\n")}
                                      onChange={(event) =>
                                        updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                          ...current,
                                          options: event.target.value
                                            .split("\n")
                                            .map((item) => item.trim())
                                            .filter(Boolean),
                                        }))
                                      }
                                      className="mt-2 min-h-[100px] bg-white"
                                    />
                                  </div>
                                ) : null}
                                {field.type === "grid" ? (
                                  <>
                                    <div>
                                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                                        Grid columns
                                      </div>
                                      <Textarea
                                        value={field.options.join("\n")}
                                        onChange={(event) =>
                                          updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                            ...current,
                                            options: event.target.value
                                              .split("\n")
                                              .map((item) => item.trim())
                                              .filter(Boolean),
                                          }))
                                        }
                                        className="mt-2 min-h-[110px] bg-white"
                                      />
                                    </div>
                                    <div>
                                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Grid rows</div>
                                      <Textarea
                                        value={field.rows.join("\n")}
                                        onChange={(event) =>
                                          updateField(selectedStep.id, selectedSection.id, field.id, (current) => ({
                                            ...current,
                                            rows: event.target.value
                                              .split("\n")
                                              .map((item) => item.trim())
                                              .filter(Boolean),
                                          }))
                                        }
                                        className="mt-2 min-h-[110px] bg-white"
                                      />
                                    </div>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="border-slate-200/80 bg-white/92">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Google runtime preview</CardTitle>
                      <CardDescription>
                        This is the closest structural preview you can control before respondents land in Google Forms.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-slate-50">
                      Single-column runtime
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {schema.steps.map((step, index) => (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => {
                          setSelectedStepId(step.id);
                          setSelectedSectionId(step.sections[0]?.id ?? "");
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-sm transition-colors",
                          selectedStep?.id === step.id
                            ? "border-teal-300 bg-teal-50 text-teal-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {index + 1}. {step.title}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,249,0.98))] p-4 shadow-sm">
                    <div className="border-b border-slate-200 pb-4">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{schema.title}</div>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                        {selectedStep?.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{selectedStep?.description}</p>
                    </div>

                    <div className="mt-4 space-y-4">
                      {selectedStep?.sections.map((section) => (
                        <div key={section.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
                            </div>
                            <Badge variant="outline" className="bg-slate-50">
                              {section.repeatMode === "fixed"
                                ? `${section.slotCount} fixed slots`
                                : "Single"}
                            </Badge>
                          </div>

                          <div className="mt-4 space-y-4">
                            {Array.from({
                              length: section.repeatMode === "fixed" ? section.slotCount : 1,
                            }).map((_, slotIndex) => (
                              <div
                                key={`${section.id}-${slotIndex}`}
                                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                              >
                                {section.repeatMode === "fixed" ? (
                                  <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {section.title} {slotIndex + 1}
                                  </div>
                                ) : null}
                                <div className="grid gap-3">
                                  {section.fields.map((field) => (
                                    <div key={`${field.id}-${slotIndex}`}>
                                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <span>{field.label}</span>
                                        {field.required ? <span className="text-rose-600">*</span> : null}
                                      </div>
                                      {renderFieldPreview(field)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/92">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">Google export package</CardTitle>
                      <CardDescription>Use this to create the form, then send the generated batch update requests.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopy(exportJson, "export")}>
                        <Copy className="h-4 w-4" />
                        {copyState === "export" ? "Copied" : "Copy requests"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Create payload</div>
                    <pre className="mt-3 max-h-[160px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-50">
                      {JSON.stringify(exportPlan.createPayload, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Batch update requests</div>
                      <Badge variant="outline" className="bg-white">
                        {exportPlan.batchUpdatePayload.requests.length} requests
                      </Badge>
                    </div>
                    <pre className="mt-3 max-h-[260px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-50">
                      {exportJson}
                    </pre>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Schema snapshot</div>
                      <Button size="sm" variant="outline" onClick={() => handleCopy(schemaJson, "schema")}>
                        <Download className="h-4 w-4" />
                        {copyState === "schema" ? "Copied" : "Copy schema"}
                      </Button>
                    </div>
                    <pre className="mt-3 max-h-[200px] overflow-auto rounded-xl bg-white p-4 text-xs leading-5 text-slate-700">
                      {schemaJson}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">What survives Google Forms</CardTitle>
                  <CardDescription>Based on the screenshots you shared and the current Forms API constraints.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SCREENSHOT_CAPABILITIES.map((capability) => (
                    <div key={capability.label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-900">{capability.label}</div>
                          <div className="mt-1 text-sm leading-6 text-slate-600">{capability.detail}</div>
                        </div>
                        <Badge variant="outline" className={cn("border", SUPPORT_TONE[capability.support])}>
                          {capability.support}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/92">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Manual follow-ups</CardTitle>
                  <CardDescription>These are the steps you still perform after API export.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exportPlan.manualSteps.map((step) => (
                    <div key={step} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                      <p className="text-sm leading-6 text-slate-700">{step}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 bg-white/92">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-700" />
                    <CardTitle className="text-xl">Recommended product shape</CardTitle>
                  </div>
                  <CardDescription>What this builder should become if you stay Google-only.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm leading-6 text-slate-700">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Builder UI for admins: steps, sections, fixed-slot repeaters, branching prompts, validations, and export.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Google generation pipeline: `forms.create`, `forms.batchUpdate`, manual file-upload pass, then `forms.setPublishSettings`.
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    Applicant runtime: Google-hosted form for actual responses, so you inherit Google drafts and avoid unsupported custom submission flows.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GoogleFormsStudioPage;
