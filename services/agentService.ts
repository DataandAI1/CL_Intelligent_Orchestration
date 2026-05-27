import { getProvider } from "./llm/index";
import {
  ProjectRequirements,
  RequirementCategory,
  SuggestionResponse,
  AgentDesignResponse,
  NodeType,
  ArchitectureAnalysis,
  NodeData,
  SimulationStep,
  CompletenessAnalysis,
  ProjectPlan,
  PatternComparisonResponse,
} from "../types";

export const analyzeProjectAssets = async (
  projectName: string,
  projectDescription: string,
  assetsContent: string
): Promise<ProjectRequirements> => {
  const provider = getProvider();

  const prompt = `
    You are an expert AI Solutions Architect.
    The user is starting a new project: "${projectName}".
    Description: "${projectDescription}"

    They have provided the following background documents, meeting notes, or transcripts:
    """
    ${assetsContent.slice(0, 30000)}
    """
    (Content truncated if too long)

    Analyze this text and extract structured requirements for an AI Agent System.
    Categorize key information into:
    1. Business Goals
    2. Key Processes
    3. Use Cases for Agents
    4. Technologies/Tools
    5. Data Sources
    6. Human in the Loop points

    Return a JSON object that strictly matches the expected schema.
    For each item found, provide a clear, concise string.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      goals: { type: "array", items: { type: "string" } },
      processes: { type: "array", items: { type: "string" } },
      useCases: { type: "array", items: { type: "string" } },
      technologies: { type: "array", items: { type: "string" } },
      dataSources: { type: "array", items: { type: "string" } },
      humanInTheLoop: { type: "array", items: { type: "string" } },
    },
  };

  try {
    const rawData = await provider.generateStructured<{
      goals: any[];
      processes: any[];
      useCases: any[];
      technologies: any[];
      dataSources: any[];
      humanInTheLoop: any[];
    }>({ prompt, jsonSchema });

    // Robust formatting: handle null, undefined, or non-array inputs safely
    const format = (arr: any) => {
      if (!Array.isArray(arr)) return [];
      return arr.map((content: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        content: String(content || ""),
      }));
    };

    return {
      projectName,
      projectDescription,
      goals: format(rawData.goals),
      processes: format(rawData.processes),
      useCases: format(rawData.useCases),
      technologies: format(rawData.technologies),
      dataSources: format(rawData.dataSources),
      humanInTheLoop: format(rawData.humanInTheLoop),
    };
  } catch (error) {
    console.error("Error analyzing project assets:", error);
    return {
      projectName,
      projectDescription,
      goals: [],
      processes: [],
      useCases: [],
      technologies: [],
      dataSources: [],
      humanInTheLoop: [],
    };
  }
};

export const expandRequirements = async (
  category: RequirementCategory,
  currentItems: string[],
  context: ProjectRequirements
): Promise<SuggestionResponse> => {
  const provider = getProvider();

  const categoryPromptMap: Record<RequirementCategory, string> = {
    goals: "high-level business goals and outcomes",
    processes: "specific business workflows or operational processes",
    useCases: "specific user scenarios or use cases for AI agents",
    technologies: "relevant technologies, APIs, or software platforms",
    dataSources: "necessary data sources, databases, or documents",
    humanInTheLoop:
      "points where human intervention, approval, manual review, or decision-making is required",
  };

  const prompt = `
    You are an expert AI Solutions Architect helping a user define requirements for an AI Agent system.
    Current Project Context:
    Project Name: ${context.projectName || "Untitled"}
    Project Desc: ${context.projectDescription || "N/A"}
    Current Requirements: ${JSON.stringify(context, null, 2)}

    The user is focusing on the category: "${category}" (${categoryPromptMap[category]}).
    Existing items in this category: ${JSON.stringify(currentItems)}.

    Your Task:
    1. Suggest 5 specific, high-value items to add to this category that would help build a robust system.
    2. Provide 3 strategic, thought-provoking questions the user should ask themselves to clarify or expand this category further.

    Return the result in JSON format with 'suggestions' and 'questions' arrays.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      suggestions: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
    },
  };

  try {
    const result = await provider.generateStructured<{
      suggestions: string[];
      questions: string[];
    }>({ prompt, jsonSchema });
    return {
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
      questions: Array.isArray(result.questions) ? result.questions : [],
    };
  } catch (error) {
    console.error("Error expanding requirements:", error);
    return { suggestions: ["Error generating suggestions."], questions: [] };
  }
};

export const checkRequirementsCompleteness = async (
  requirements: ProjectRequirements
): Promise<CompletenessAnalysis | null> => {
  const provider = getProvider();

  const prompt = `
    You are a strict Senior AI Product Manager and Systems Architect.
    Review the following project requirements for completeness and quality before we attempt to build an Agent Architecture.

    Project: ${requirements.projectName || "Untitled"}
    Description: ${requirements.projectDescription || "N/A"}

    Requirements Collected So Far:
    - Business Goals: ${JSON.stringify((requirements.goals || []).map((i) => i.content))}
    - Processes: ${JSON.stringify((requirements.processes || []).map((i) => i.content))}
    - Agent Use Cases: ${JSON.stringify((requirements.useCases || []).map((i) => i.content))}
    - Technologies: ${JSON.stringify((requirements.technologies || []).map((i) => i.content))}
    - Data Sources: ${JSON.stringify((requirements.dataSources || []).map((i) => i.content))}
    - Human In The Loop: ${JSON.stringify((requirements.humanInTheLoop || []).map((i) => i.content))}

    Assess:
    1. Are the goals clear enough to derive agent behavior?
    2. Are there enough technical details (tools/data) to ground the agents?
    3. Are critical human oversight points missing?

    Output a JSON object with:
    - score: Integer 0-100.
    - rating: Short string (e.g. "Critical Gaps", "Developing", "Solid", "Ready to Build").
    - summary: 1-2 sentences summarizing the state.
    - recommendations: List of specific things to add or clarify.
    - questions: List of questions to ask the user to fill the gaps.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      score: { type: "integer" },
      rating: { type: "string" },
      summary: { type: "string" },
      recommendations: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
    },
    required: ["score", "rating", "summary", "recommendations", "questions"],
  };

  try {
    const parsed = await provider.generateStructured<{
      score: number;
      rating: string;
      summary: string;
      recommendations: any[];
      questions: any[];
    }>({ prompt, jsonSchema });

    return {
      ...parsed,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    };
  } catch (error) {
    console.error("Error checking completeness:", error);
    return null;
  }
};

export const generateArchitecture = async (
  requirements: ProjectRequirements,
  forcedPattern?: string
): Promise<AgentDesignResponse | null> => {
  const provider = getProvider();

  // Normalized prompt to encourage correct Enum values, but schema is relaxed to prevent validation errors
  let prompt = `
    You are an expert AI Systems Architect.
    Based on the following requirements, design an Agentic Orchestration Architecture.

    Project Name: ${requirements.projectName || "Untitled"}
    Project Desc: ${requirements.projectDescription || "N/A"}
    Requirements:
    ${JSON.stringify(requirements, null, 2)}

    1. Determine the best Orchestration Pattern.
    2. Create a set of Nodes (Agents, Tools, Data Sources, Goals, Human Steps) and Connections.
       - AGENT: An AI entity.
       - TOOL: An API or utility.
       - DATA: A database or doc store.
       - GOAL: The objective.
       - HUMAN: A manual review step, approval, or human intervention.

    Ensure the architecture is logical. Agents should use Tools and Data to achieve Goals. Human steps should be placed where critical decisions or oversight are needed as specified in the 'humanInTheLoop' requirements.

    IMPORTANT: For node types, strictly use one of: "AGENT", "TOOL", "DATA", "GOAL", "HUMAN".
  `;

  if (forcedPattern) {
    prompt += `\n\nCRITICAL CONSTRAINT: You MUST organize the architecture using the "${forcedPattern}" pattern. The connectivity and agent hierarchy must reflect this pattern specifically. Do not use any other pattern.`;
  }

  const jsonSchema = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The name of the orchestration pattern used",
      },
      patternDescription: {
        type: "string",
        description: "Short explanation of why this pattern was chosen",
      },
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              description: "One of: AGENT, TOOL, DATA, GOAL, HUMAN",
            },
            label: { type: "string" },
            description: { type: "string" },
            instructions: { type: "string" },
          },
          required: ["type", "label", "description"],
        },
      },
      connections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            relation: { type: "string" },
          },
          required: ["from", "to", "relation"],
        },
      },
    },
  };

  try {
    const parsed = await provider.generateStructured<{
      pattern?: string;
      patternDescription?: string;
      nodes?: any[];
      connections?: any[];
    }>({ prompt, jsonSchema });

    // Normalize Node Types to ensure they match NodeType enum even if model output varies slightly
    const normalizedNodes = (
      Array.isArray(parsed.nodes) ? parsed.nodes : []
    ).map((n: any) => {
      let type = n.type ? n.type.toUpperCase() : "AGENT";
      // Fallback for common misclassifications
      if (type.includes("USER") || type.includes("PERSON")) type = "HUMAN";
      if (type.includes("DB") || type.includes("STORE")) type = "DATA";

      return {
        ...n,
        type: type as NodeType,
      };
    });

    return {
      pattern: parsed.pattern || forcedPattern || "Custom",
      patternDescription: parsed.patternDescription || "",
      nodes: normalizedNodes,
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
    };
  } catch (error) {
    console.error("Error generating architecture:", error);
    return null;
  }
};

export const optimizeArchitecture = async (
  currentNodes: NodeData[],
  requirements: ProjectRequirements
): Promise<ArchitectureAnalysis | null> => {
  const provider = getProvider();

  const prompt = `
    You are an expert AI Agent Designer and System Optimizer.
    Analyze the current agent architecture and the project requirements.

    Project Context: ${requirements.projectName} - ${requirements.projectDescription}
    Requirements:
    ${JSON.stringify(requirements, null, 2)}

    Current Architecture Nodes:
    ${JSON.stringify(
      currentNodes.map((n) => ({
        label: n.label,
        type: n.type,
        description: n.description,
      })),
      null,
      2
    )}

    Your Goal: Critically evaluate the design for efficiency, completeness, and clarity.

    Provide:
    1. A brief analysis of the current setup.
    2. Simplifications: How can we reduce complexity?
    3. Improvements: What would make this system better/smarter?
    4. Context Gaps: What info is missing?
    5. Suggested Nodes: Specific nodes to ADD to the system.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      analysis: { type: "string" },
      simplifications: { type: "array", items: { type: "string" } },
      improvements: { type: "array", items: { type: "string" } },
      contextGaps: { type: "array", items: { type: "string" } },
      suggestedNodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            label: { type: "string" },
            description: { type: "string" },
            instructions: { type: "string" },
            reason: { type: "string" },
          },
          required: ["type", "label", "description", "reason"],
        },
      },
    },
  };

  try {
    const parsed = await provider.generateStructured<{
      analysis?: string;
      simplifications?: any[];
      improvements?: any[];
      contextGaps?: any[];
      suggestedNodes?: any[];
    }>({ prompt, jsonSchema });

    return {
      analysis: parsed.analysis || "Analysis complete.",
      simplifications: Array.isArray(parsed.simplifications)
        ? parsed.simplifications
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
      contextGaps: Array.isArray(parsed.contextGaps) ? parsed.contextGaps : [],
      suggestedNodes: Array.isArray(parsed.suggestedNodes)
        ? parsed.suggestedNodes
        : [],
    };
  } catch (error) {
    console.error("Error optimizing architecture:", error);
    return null;
  }
};

export const simulateAgentRun = async (
  nodes: any[],
  edges: any[],
  userScenario: string
): Promise<SimulationStep[]> => {
  const provider = getProvider();

  const prompt = `
    You are the execution engine of an AI Agent Simulator.

    Architecture Nodes:
    ${JSON.stringify(
      nodes.map((n) => ({
        id: n.id,
        label: n.label,
        type: n.type,
        instructions: n.instructions,
      })),
      null,
      2
    )}

    Architecture Connections:
    ${JSON.stringify(
      edges.map((e) => ({ from: e.source, to: e.target, relation: e.label })),
      null,
      2
    )}

    Scenario Trigger: "${userScenario}"

    Simulate a detailed step-by-step execution of how these agents, tools, human steps, and data sources interact to handle this scenario.
    Break down the process into logical steps. For each step, identify the primary actor (node), the action taken, and details of the data processed or result achieved.
    If a HUMAN node is involved, describe the manual action required.

    IMPORTANT: The final step should be a summary of the outcome/result of the scenario.
  `;

  // Top-level ARRAY schema
  const jsonSchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        step: { type: "integer" },
        actor: {
          type: "string",
          description: "Name of the node involved",
        },
        nodeType: { type: "string" },
        action: {
          type: "string",
          description:
            "Short title of the action, e.g. 'Query Database' or 'Human Approval'",
        },
        details: {
          type: "string",
          description: "Description of what happened in this step",
        },
        status: {
          type: "string",
          enum: ["success", "info", "warning", "error"],
        },
      },
      required: ["step", "actor", "nodeType", "action", "details", "status"],
    },
  };

  try {
    const parsed = await provider.generateStructured<SimulationStep[]>({
      prompt,
      jsonSchema,
    });
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Simulation error", error);
    return [
      {
        step: 1,
        actor: "System",
        nodeType: "SYSTEM",
        action: "Error",
        details: "Simulation failed to generate valid output.",
        status: "error",
      },
    ];
  }
};

export const generateProjectPlan = async (
  requirements: ProjectRequirements,
  nodes: any[],
  edges: any[]
): Promise<ProjectPlan | null> => {
  const provider = getProvider();

  const prompt = `
    You are an expert Technical Project Manager specializing in AI Agent systems.

    Project: ${requirements.projectName}
    Description: ${requirements.projectDescription}

    Architecture Layout:
    Nodes: ${JSON.stringify(
      nodes.map((n) => ({ label: n.label, type: n.type })),
      null,
      2
    )}
    Connections: ${JSON.stringify(edges.length)} total connections.

    Create a detailed Project Implementation Plan to build this system.
    Include:
    1. Executive Summary
    2. Estimated Total Duration and Effort (hours).
    3. Resources required (Identify AI Agents as resources, Human roles, and Infrastructure).
    4. Phased Roadmap (e.g. Design, Development, Integration, Testing). Break down into tasks.
    5. Risk Assessment.

    Return JSON matching the schema.
  `;

  const jsonSchema = {
    type: "object",
    properties: {
      executiveSummary: { type: "string" },
      totalEstimatedDuration: { type: "string" },
      totalEstimatedEffortHours: { type: "integer" },
      resources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: {
              type: "string",
              enum: ["AI Agent", "Human", "Infrastructure", "Data"],
            },
            role: { type: "string" },
            allocation: { type: "string" },
          },
          required: ["name", "type", "role", "allocation"],
        },
      },
      phases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            duration: { type: "string" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  assignee: { type: "string" },
                  complexity: {
                    type: "string",
                    enum: ["Low", "Medium", "High"],
                  },
                  estimatedHours: { type: "number" },
                },
                required: [
                  "id",
                  "title",
                  "description",
                  "assignee",
                  "complexity",
                  "estimatedHours",
                ],
              },
            },
          },
          required: ["id", "title", "duration", "tasks"],
        },
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            risk: { type: "string" },
            severity: {
              type: "string",
              enum: ["Low", "Medium", "High", "Critical"],
            },
            mitigation: { type: "string" },
          },
          required: ["risk", "severity", "mitigation"],
        },
      },
    },
    required: [
      "executiveSummary",
      "totalEstimatedDuration",
      "totalEstimatedEffortHours",
      "resources",
      "phases",
      "risks",
    ],
  };

  try {
    const parsed = await provider.generateStructured<ProjectPlan>({
      prompt,
      jsonSchema,
    });
    return parsed;
  } catch (error) {
    console.error("Error generating project plan:", error);
    throw error;
  }
};

export const compareOrchestrationPatterns = async (
  requirements: ProjectRequirements,
  currentNodes: any[],
  currentEdges: any[]
): Promise<PatternComparisonResponse | null> => {
  const provider = getProvider();

  const prompt = `
      You are an expert AI Systems Architect.
      Analyze the current AI Agent architecture and compare it against other standard orchestration patterns.

      Project: ${requirements.projectName}
      Current Layout:
      - Nodes: ${currentNodes.map((n) => n.type).join(", ")}
      - Connectivity: ${currentEdges.length} edges.

      Analyze the current setup.
      1. Define the 'current' pattern: Name it, give a summary, score its robustness (0-100), list key characteristics, strengths (pros), and weaknesses (cons).
      2. Compare it with 2-3 alternative patterns (e.g. Hierarchical vs Sequential vs Network).

      IMPORTANT:
      - Ensure you provide distinct, high-quality alternatives that would fit this project.
      - Do not return empty alternatives.

      Return a JSON object matching the schema.
    `;

  const jsonSchema = {
    type: "object",
    properties: {
      current: {
        type: "object",
        properties: {
          patternName: { type: "string" },
          summary: { type: "string" },
          score: { type: "integer" },
          characteristics: { type: "array", items: { type: "string" } },
          pros: { type: "array", items: { type: "string" } },
          cons: { type: "array", items: { type: "string" } },
        },
        required: [
          "patternName",
          "summary",
          "score",
          "characteristics",
          "pros",
          "cons",
        ],
      },
      alternatives: {
        type: "array",
        items: {
          type: "object",
          properties: {
            patternName: { type: "string" },
            description: { type: "string" },
            pros: { type: "array", items: { type: "string" } },
            cons: { type: "array", items: { type: "string" } },
            suitabilityScore: { type: "integer" },
            recommendation: { type: "string" },
          },
          required: [
            "patternName",
            "description",
            "pros",
            "cons",
            "suitabilityScore",
            "recommendation",
          ],
        },
      },
    },
    required: ["current", "alternatives"],
  };

  try {
    const parsed = await provider.generateStructured<{
      current?: any;
      alternatives?: any[];
    }>({ prompt, jsonSchema });

    if (!parsed) return null;

    return {
      current: parsed.current || {
        patternName: "Unknown",
        summary: "",
        score: 0,
        characteristics: [],
        pros: [],
        cons: [],
      },
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives
        : [],
    };
  } catch (error) {
    console.error("Error comparing patterns:", error);
    return null;
  }
};
