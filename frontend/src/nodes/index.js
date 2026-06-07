// nodes/index.js
// Single registration point. Adding a node = add it here only.
// ui.js and toolbar.js import from this file — never import node files directly.

import { InputNode } from './inputNode';
import { LLMNode } from './llmNode';
import { OutputNode } from './outputNode';
import { TextNode } from './textNode';
import { PromptTemplateNode } from './promptTemplateNode';
import { VectorSearchNode } from './vectorSearchNode';
import { RouterNode } from './routerNode';
import { MemoryNode } from './memoryNode';
import { ParserNode } from './parserNode';

// ReactFlow node type map — must be defined at module level (not inside a component).
// Defining nodeTypes inside a render function causes every node to remount on every render.
export const nodeTypes = {
  customInput: InputNode,
  llm: LLMNode,
  customOutput: OutputNode,
  text: TextNode,
  promptTemplate: PromptTemplateNode,
  vectorSearch: VectorSearchNode,
  router: RouterNode,
  memory: MemoryNode,
  parser: ParserNode,
};

// Toolbar configuration — drives DraggableNode rendering in toolbar.js.
export const nodeConfig = [
  { type: 'customInput',    label: 'Input',           color: '#4ade80' },
  { type: 'customOutput',   label: 'Output',          color: '#f97316' },
  { type: 'llm',            label: 'LLM',             color: '#a855f7' },
  { type: 'promptTemplate', label: 'Prompt Template', color: '#ec4899' },
  { type: 'text',           label: 'Text',            color: '#94a3b8' },
  { type: 'vectorSearch',   label: 'Vector Search',   color: '#facc15' },
  { type: 'router',         label: 'Router',          color: '#3b82f6' },
  { type: 'memory',         label: 'Memory',          color: '#14b8a6' },
  { type: 'parser',         label: 'Parser',          color: '#fb7185' },
];
