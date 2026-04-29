export type BuilderFieldType =
  | "short_text"
  | "long_text"
  | "dropdown"
  | "multiple_choice"
  | "checkboxes"
  | "date"
  | "time"
  | "number"
  | "email"
  | "phone"
  | "grid"
  | "file_upload";

export type RepeatMode = "single" | "fixed";
export type SupportLevel = "native" | "degraded" | "manual" | "unsupported";

export type BuilderField = {
  id: string;
  label: string;
  type: BuilderFieldType;
  required: boolean;
  helpText: string;
  options: string[];
  rows: string[];
  width: "full" | "half";
};

export type BuilderSection = {
  id: string;
  title: string;
  description: string;
  repeatMode: RepeatMode;
  slotCount: number;
  fields: BuilderField[];
};

export type BuilderStep = {
  id: string;
  title: string;
  description: string;
  sections: BuilderSection[];
};

export type BuilderForm = {
  id: string;
  title: string;
  description: string;
  collectEmail: boolean;
  requireSignIn: boolean;
  steps: BuilderStep[];
};

export type GoogleFormsPlan = {
  createPayload: Record<string, unknown>;
  batchUpdatePayload: {
    includeFormInResponse: boolean;
    requests: Record<string, unknown>[];
  };
  manualSteps: string[];
  compatibilityCounts: Record<SupportLevel, number>;
  renderedQuestionCount: number;
};

export const FIELD_TYPE_LABELS: Record<BuilderFieldType, string> = {
  short_text: "Short text",
  long_text: "Paragraph",
  dropdown: "Dropdown",
  multiple_choice: "Multiple choice",
  checkboxes: "Checkboxes",
  date: "Date",
  time: "Time",
  number: "Number",
  email: "Email",
  phone: "Phone",
  grid: "Grid",
  file_upload: "File upload",
};

export const SUPPORT_TONE: Record<SupportLevel, string> = {
  native: "text-emerald-700 bg-emerald-50 border-emerald-200",
  degraded: "text-amber-700 bg-amber-50 border-amber-200",
  manual: "text-sky-700 bg-sky-50 border-sky-200",
  unsupported: "text-rose-700 bg-rose-50 border-rose-200",
};

export const SCREENSHOT_CAPABILITIES: Array<{
  label: string;
  support: SupportLevel;
  detail: string;
}> = [
  {
    label: "Wizard steps",
    support: "native",
    detail: "Maps cleanly to Google Form sections with page breaks.",
  },
  {
    label: "Save and resume",
    support: "native",
    detail: "Google-hosted responder drafts can autosave for signed-in respondents.",
  },
  {
    label: "Two-column layout",
    support: "degraded",
    detail: "Google Forms renders a single-column flow. Layout hints remain builder-only metadata.",
  },
  {
    label: "Inline validation styling",
    support: "degraded",
    detail: "Google controls the runtime error UI. Custom red inline treatment will not carry over.",
  },
  {
    label: "Dynamic plus/minus repeaters",
    support: "degraded",
    detail: "Use fixed slots such as Referee 1 and Referee 2, or Best Paper 1 to 5.",
  },
  {
    label: "Conditional modules",
    support: "degraded",
    detail: "Supported through section branching and gateway questions, with less design control than Paperform.",
  },
  {
    label: "Matrix summary tables",
    support: "manual",
    detail: "Some can become grid questions; others should be flattened into explicit fields.",
  },
  {
    label: "File uploads everywhere",
    support: "manual",
    detail: "Google Forms supports file upload questions, but the Forms API does not create them programmatically.",
  },
  {
    label: "Paperform-style calculations",
    support: "unsupported",
    detail: "Google Forms does not provide a live calculated runtime like Paperform.",
  },
];

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createField(type: BuilderFieldType, label = "Untitled field"): BuilderField {
  return {
    id: makeId("field"),
    label,
    type,
    required: false,
    helpText: "",
    options:
      type === "dropdown" || type === "multiple_choice" || type === "checkboxes" || type === "grid"
        ? ["Option 1", "Option 2"]
        : [],
    rows: type === "grid" ? ["Row 1", "Row 2"] : [],
    width: "half",
  };
}

export function createSection(title = "New section"): BuilderSection {
  return {
    id: makeId("section"),
    title,
    description: "",
    repeatMode: "single",
    slotCount: 1,
    fields: [createField("short_text", "New question")],
  };
}

export function createStep(title = "New step"): BuilderStep {
  return {
    id: makeId("step"),
    title,
    description: "",
    sections: [createSection("Untitled section")],
  };
}

export function createSampleBuilderForm(): BuilderForm {
  return {
    id: "faculty-recruitment",
    title: "Faculty Recruitment Application",
    description:
      "Google Forms-compatible schema for a structured academic hiring workflow with fixed slots instead of open-ended repeaters.",
    collectEmail: true,
    requireSignIn: true,
    steps: [
      {
        id: "step-personal",
        title: "Personal details",
        description: "Core identity, contact, and address details.",
        sections: [
          {
            id: "section-personal-core",
            title: "Applicant identity",
            description: "Equivalent to the personal details block in your screenshots.",
            repeatMode: "single",
            slotCount: 1,
            fields: [
              {
                id: "field-post",
                label: "Post applying for",
                type: "dropdown",
                required: true,
                helpText: "Use one Google Forms dropdown.",
                options: ["Assistant Professor", "Associate Professor", "Professor", "Post Doctoral Fellow"],
                rows: [],
                width: "half",
              },
              {
                id: "field-department",
                label: "Department",
                type: "dropdown",
                required: true,
                helpText: "",
                options: ["Electrical Engineering", "Computer Science", "Humanities", "Mechanical Engineering"],
                rows: [],
                width: "half",
              },
              {
                id: "field-first-name",
                label: "First name",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-last-name",
                label: "Last name",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-dob",
                label: "Date of birth",
                type: "date",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-email",
                label: "Email ID",
                type: "email",
                required: true,
                helpText: "API export creates a text question; add response validation manually if required.",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-address",
                label: "Current address",
                type: "long_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
              {
                id: "field-mobile",
                label: "Mobile number",
                type: "phone",
                required: true,
                helpText: "For Google Forms, this stays a short text question with manual validation.",
                options: [],
                rows: [],
                width: "half",
              },
            ],
          },
        ],
      },
      {
        id: "step-academic",
        title: "Academic details",
        description: "Structured education history and PhD-specific fields.",
        sections: [
          {
            id: "section-academic-record",
            title: "Academic record",
            description: "Fixed three-slot version of the plus/minus academic history block.",
            repeatMode: "fixed",
            slotCount: 3,
            fields: [
              {
                id: "field-degree",
                label: "Degree",
                type: "dropdown",
                required: true,
                helpText: "",
                options: ["Bachelor of Technology", "Master of Technology", "Doctor of Philosophy"],
                rows: [],
                width: "half",
              },
              {
                id: "field-university",
                label: "University or institute",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-year-completion",
                label: "Year of completion",
                type: "number",
                required: true,
                helpText: "Keep as text/number, or change to date if you prefer year-first collection.",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-grade-type",
                label: "Grade type",
                type: "multiple_choice",
                required: true,
                helpText: "",
                options: ["Percentage", "CGPA"],
                rows: [],
                width: "half",
              },
              {
                id: "field-marks",
                label: "Marks or CGPA",
                type: "number",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-additional",
                label: "Additional information",
                type: "long_text",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
          {
            id: "section-phd",
            title: "PhD details",
            description: "Branch to this section only for PhD applicants or records.",
            repeatMode: "single",
            slotCount: 1,
            fields: [
              {
                id: "field-thesis-status",
                label: "Current status of your PhD thesis",
                type: "dropdown",
                required: true,
                helpText: "",
                options: ["Synopsis submitted", "Thesis submitted", "Defended"],
                rows: [],
                width: "half",
              },
              {
                id: "field-thesis-title",
                label: "Title of the PhD thesis",
                type: "long_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
              {
                id: "field-thesis-guide",
                label: "Thesis guide",
                type: "short_text",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
            ],
          },
        ],
      },
      {
        id: "step-experience",
        title: "Experience details",
        description: "Employment blocks and optional experience modules.",
        sections: [
          {
            id: "section-employment",
            title: "Employment history",
            description: "Use a fixed capacity instead of Google-incompatible dynamic repeaters.",
            repeatMode: "fixed",
            slotCount: 4,
            fields: [
              {
                id: "field-designation",
                label: "Designation",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-organization",
                label: "Organization",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-from",
                label: "From",
                type: "date",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-to",
                label: "To",
                type: "date",
                required: false,
                helpText: "Use branching if you want a separate 'Till now' flow.",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-responsibilities",
                label: "Roles and responsibilities",
                type: "long_text",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
              {
                id: "field-proof",
                label: "Upload further details",
                type: "file_upload",
                required: false,
                helpText: "The builder will mark this for manual setup after export.",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
        ],
      },
      {
        id: "step-publication",
        title: "Publication details",
        description: "Publication totals, top papers, and research plan.",
        sections: [
          {
            id: "section-publication-summary",
            title: "Publication summary",
            description: "Grid or flattened questions depending on how compact you want the responder flow.",
            repeatMode: "single",
            slotCount: 1,
            fields: [
              {
                id: "field-publication-grid",
                label: "Publication counts",
                type: "grid",
                required: false,
                helpText: "A Google grid works for compact count collection.",
                options: ["Indian", "International", "Total"],
                rows: [
                  "Journal publication",
                  "Conference proceedings",
                  "Conference but not published",
                ],
                width: "full",
              },
              {
                id: "field-best-papers-note",
                label: "Best five papers",
                type: "long_text",
                required: false,
                helpText: "Use this as a section intro or split into fixed repeated slots below.",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
          {
            id: "section-best-papers",
            title: "Best paper",
            description: "Five fixed rows instead of a spreadsheet-like live table.",
            repeatMode: "fixed",
            slotCount: 5,
            fields: [
              {
                id: "field-paper-author",
                label: "Author",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-paper-title",
                label: "Title",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-paper-journal",
                label: "Journal or conference",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-paper-year",
                label: "Year",
                type: "number",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-paper-citations",
                label: "Number of citations",
                type: "number",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-paper-file",
                label: "Upload paper",
                type: "file_upload",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
        ],
      },
      {
        id: "step-referees",
        title: "Referee details",
        description: "Structured referee capture with a fixed slot count.",
        sections: [
          {
            id: "section-referees",
            title: "Referee",
            description: "Two fixed referee blocks match your screenshot well.",
            repeatMode: "fixed",
            slotCount: 2,
            fields: [
              {
                id: "field-ref-name",
                label: "Referee name",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-ref-designation",
                label: "Designation",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-ref-organization",
                label: "Organization",
                type: "short_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-ref-email",
                label: "Email ID",
                type: "email",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-ref-phone",
                label: "Contact number",
                type: "phone",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-ref-thesis-guide",
                label: "This person is my thesis guide",
                type: "multiple_choice",
                required: false,
                helpText: "",
                options: ["Yes", "No"],
                rows: [],
                width: "half",
              },
            ],
          },
        ],
      },
      {
        id: "step-submit",
        title: "Others and submit",
        description: "Awards, research plan, and final uploads.",
        sections: [
          {
            id: "section-awards",
            title: "Awards and recognitions",
            description: "Optional sections can be enabled by branching questions.",
            repeatMode: "single",
            slotCount: 1,
            fields: [
              {
                id: "field-awards",
                label: "Awards and recognitions",
                type: "long_text",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
              {
                id: "field-award-year",
                label: "Year",
                type: "number",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "half",
              },
              {
                id: "field-award-file",
                label: "Upload award",
                type: "file_upload",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
          {
            id: "section-research-plan",
            title: "Research plan",
            description: "Final narrative block before submit.",
            repeatMode: "single",
            slotCount: 1,
            fields: [
              {
                id: "field-research-plan",
                label: "Describe research plan",
                type: "long_text",
                required: true,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
              {
                id: "field-cover-letter",
                label: "Upload cover letter",
                type: "file_upload",
                required: false,
                helpText: "",
                options: [],
                rows: [],
                width: "full",
              },
            ],
          },
        ],
      },
    ],
  };
}

function createTextQuestion(paragraph: boolean): Record<string, unknown> {
  return {
    textQuestion: {
      paragraph,
    },
  };
}

function createChoiceQuestion(
  options: string[],
  type: "DROP_DOWN" | "RADIO" | "CHECKBOX",
): Record<string, unknown> {
  return {
    choiceQuestion: {
      type,
      options: options.map((value) => ({ value })),
      shuffle: false,
    },
  };
}

function createGridQuestion(rows: string[], columns: string[]): Record<string, unknown> {
  return {
    questionGroupItem: {
      questions: rows.map((title) => ({
        required: false,
        rowQuestion: {
          title,
        },
      })),
      grid: {
        columns: {
          options: columns.map((value) => ({ value })),
          shuffle: false,
        },
      },
    },
  };
}

function makeQuestionItem(
  title: string,
  description: string,
  required: boolean,
  body: Record<string, unknown>,
): Record<string, unknown> {
  return {
    title,
    description,
    questionItem: {
      question: {
        required,
        ...body,
      },
    },
  };
}

function makeCreateRequest(item: Record<string, unknown>, index: number): Record<string, unknown> {
  return {
    createItem: {
      item,
      location: {
        index,
      },
    },
  };
}

function supportForField(field: BuilderField): SupportLevel {
  if (field.type === "file_upload") {
    return "manual";
  }

  if (field.type === "email" || field.type === "phone" || field.type === "number") {
    return "degraded";
  }

  return "native";
}

function convertFieldToItem(
  field: BuilderField,
  manualSteps: string[],
): Record<string, unknown> | null {
  const description = field.helpText;

  switch (field.type) {
    case "short_text":
      return makeQuestionItem(field.label, description, field.required, createTextQuestion(false));
    case "long_text":
      return makeQuestionItem(field.label, description, field.required, createTextQuestion(true));
    case "email":
      manualSteps.push(`Add manual response validation for "${field.label}" if you want strict email formatting.`);
      return makeQuestionItem(field.label, description, field.required, createTextQuestion(false));
    case "phone":
      manualSteps.push(`Add manual response validation for "${field.label}" if you need phone length or country-code checks.`);
      return makeQuestionItem(field.label, description, field.required, createTextQuestion(false));
    case "number":
      manualSteps.push(`Add manual numeric response validation for "${field.label}" if you need min, max, or year ranges.`);
      return makeQuestionItem(field.label, description, field.required, createTextQuestion(false));
    case "dropdown":
      return makeQuestionItem(field.label, description, field.required, createChoiceQuestion(field.options, "DROP_DOWN"));
    case "multiple_choice":
      return makeQuestionItem(field.label, description, field.required, createChoiceQuestion(field.options, "RADIO"));
    case "checkboxes":
      return makeQuestionItem(field.label, description, field.required, createChoiceQuestion(field.options, "CHECKBOX"));
    case "date":
      return makeQuestionItem(field.label, description, field.required, {
        dateQuestion: {
          includeYear: true,
        },
      });
    case "time":
      return makeQuestionItem(field.label, description, field.required, {
        timeQuestion: {
          duration: false,
        },
      });
    case "grid":
      return {
        title: field.label,
        description,
        ...createGridQuestion(field.rows, field.options),
      };
    case "file_upload":
      manualSteps.push(`Create the file upload question "${field.label}" manually in the Google Forms editor after export.`);
      return {
        title: field.label,
        description:
          description ||
          "Manual follow-up: the Forms API does not create file upload questions. Add this one directly in Google Forms.",
        textItem: {},
      };
    default:
      return null;
  }
}

export function buildGoogleFormsPlan(form: BuilderForm): GoogleFormsPlan {
  const manualSteps: string[] = [];
  const requests: Record<string, unknown>[] = [];
  const compatibilityCounts: Record<SupportLevel, number> = {
    native: 0,
    degraded: 0,
    manual: 0,
    unsupported: 0,
  };

  let index = 0;
  let renderedQuestionCount = 0;

  if (form.collectEmail) {
    requests.push({
      updateSettings: {
        settings: {
          emailCollectionType: "VERIFIED",
        },
        updateMask: "emailCollectionType",
      },
    });
  }

  form.steps.forEach((step, stepIndex) => {
    if (stepIndex === 0) {
      requests.push(
        makeCreateRequest(
          {
            title: step.title,
            description: step.description,
            textItem: {},
          },
          index,
        ),
      );
    } else {
      requests.push(
        makeCreateRequest(
          {
            title: step.title,
            description: step.description,
            pageBreakItem: {},
          },
          index,
        ),
      );
    }
    index += 1;

    step.sections.forEach((section) => {
      const slotCount = section.repeatMode === "fixed" ? Math.max(section.slotCount, 1) : 1;

      for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const sectionTitle =
          section.repeatMode === "fixed" ? `${section.title} ${slotIndex + 1}` : section.title;

        requests.push(
          makeCreateRequest(
            {
              title: sectionTitle,
              description:
                section.repeatMode === "fixed"
                  ? `${section.description} Fixed slot ${slotIndex + 1} of ${slotCount}.`
                  : section.description,
              textItem: {},
            },
            index,
          ),
        );
        index += 1;

        if (section.repeatMode === "fixed") {
          compatibilityCounts.degraded += 1;
        }

        section.fields.forEach((field) => {
          const support = supportForField(field);
          compatibilityCounts[support] += 1;
          const converted = convertFieldToItem(field, manualSteps);

          if (!converted) {
            compatibilityCounts.unsupported += 1;
            return;
          }

          requests.push(makeCreateRequest(converted, index));
          index += 1;
          renderedQuestionCount += 1;
        });
      }
    });
  });

  manualSteps.push(
    "Publish the generated form after export. Forms created after March 31, 2026 default to unpublished.",
  );

  if (form.requireSignIn) {
    manualSteps.push(
      "Keep Google-hosted responses enabled for signed-in users if you want draft autosave and resume behavior.",
    );
  }

  return {
    createPayload: {
      info: {
        title: form.title,
        documentTitle: form.title,
        description: form.description,
      },
    },
    batchUpdatePayload: {
      includeFormInResponse: false,
      requests,
    },
    manualSteps: Array.from(new Set(manualSteps)),
    compatibilityCounts,
    renderedQuestionCount,
  };
}
