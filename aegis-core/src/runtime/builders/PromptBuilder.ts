import {
  RuntimeContext
} from '../context/RuntimeContext.js';

export class PromptBuilder {

  static build(
    context: RuntimeContext
  ): string {

    let prompt = '';

    prompt += `# IDENTITY\n`;
    prompt += `${context.soul.identity}\n\n`;

    prompt += `# MISSION\n`;
    prompt += `${context.soul.mission}\n\n`;

    prompt += `# ETHICS\n`;
    prompt += `${context.soul.ethics}\n\n`;

    prompt += `# BEHAVIOR\n`;
    prompt += `${context.soul.behavior}\n\n`;

    prompt += `# COMMUNICATION\n`;
    prompt += `${context.soul.communication}\n\n`;

    prompt += `# POLICIES\n`;
    prompt += `${context.soul.policies}\n\n`;

    prompt += `# CONSTRAINTS\n`;
    prompt += `${context.soul.constraints}\n\n`;

    prompt += `# SKILLS\n`;

    for (const skill of context.skills) {

      prompt += `## ${skill.name}\n`;
      prompt += `${skill.content}\n\n`;

    }

    prompt += `# TOOLS\n`;

    for (const tool of context.tools) {

      prompt += `- ${tool.name}: ${tool.description}\n`;

    }

    prompt += `\nTo use a tool, output valid JSON wrapped in <tool> tags.\n`;

    return prompt;
  }
}