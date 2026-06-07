import { useState } from 'react';
import PageTransition from '../components/PageTransition';

const NODES = [
  { type: 'customInput',    label: 'Input',           color: '#4ADE80' },
  { type: 'customOutput',   label: 'Output',          color: '#F97316' },
  { type: 'llm',            label: 'LLM',             color: '#A855F7' },
  { type: 'promptTemplate', label: 'Prompt Template', color: '#EC4899' },
  { type: 'text',           label: 'Text',            color: '#94A3B8' },
  { type: 'vectorSearch',   label: 'Vector Search',   color: '#FACC15' },
  { type: 'router',         label: 'Router',          color: '#3B82F6' },
  { type: 'memory',         label: 'Memory',          color: '#14B8A6' },
  { type: 'parser',         label: 'Parser',          color: '#FB7185' },
];

const DOCS = {
  customInput: {
    description: 'The Input node is the entry point for external data into the pipeline graph. It accepts a named, typed value from the system boundary and makes it available to downstream nodes via its output handle.',
    inputs: [],
    outputs: [{ handle: 'value', type: 'string | file', desc: 'The typed input value emitted into the graph.' }],
    config: [
      { field: 'inputName', type: 'string', default: 'input_1', desc: 'Identifier for this input, used in downstream template references.' },
      { field: 'inputType', type: '"Text" | "File"', default: 'Text', desc: 'The data type of the accepted input.' },
    ],
    connections: 'Connect the output handle to any node that accepts a string input: Text, Prompt Template, LLM (system/prompt), Vector Search (query).',
    example: `{
  "type": "customInput",
  "data": {
    "inputName": "user_query",
    "inputType": "Text"
  }
}`,
  },
  customOutput: {
    description: 'The Output node is the terminal node of any pipeline. It receives the final computed value and materializes the pipeline\'s result. A valid pipeline must have at least one Output node.',
    inputs: [{ handle: 'value', type: 'any', desc: 'The final computed value to output.' }],
    outputs: [],
    config: [
      { field: 'outputName', type: 'string', default: 'output_1', desc: 'Identifier for this output.' },
      { field: 'outputType', type: '"Text" | "Image"', default: 'Text', desc: 'The expected data type of the output.' },
    ],
    connections: 'Connect from LLM (response), Parser (extracted fields), Text, or any value-producing node.',
    example: `{
  "type": "customOutput",
  "data": {
    "outputName": "final_response",
    "outputType": "Text"
  }
}`,
  },
  llm: {
    description: 'The LLM node invokes a configured language model with a system prompt and a user prompt. It accepts two input handles (system and prompt) and emits the model\'s response text via its output handle.',
    inputs: [
      { handle: 'system', type: 'string', desc: 'System prompt. Sets the model\'s behavior and persona.' },
      { handle: 'prompt', type: 'string', desc: 'User prompt. The primary input to the model.' },
    ],
    outputs: [{ handle: 'response', type: 'string', desc: 'The model\'s completion text.' }],
    config: [
      { field: 'model', type: 'string', default: 'gpt-4o', desc: 'The model ID to invoke. Supports GPT-4o, Claude Sonnet 4, and GPT-3.5 Turbo.' },
    ],
    connections: 'Receives from Prompt Template (prompt), Text (system). Connects to Output, Parser, Router.',
    example: `{
  "type": "llm",
  "data": {
    "model": "gpt-4o"
  }
}`,
  },
  promptTemplate: {
    description: 'The Prompt Template node composes dynamic prompts from a template string using {{variable}} syntax. Each unique variable automatically creates a target handle, enabling fine-grained input wiring.',
    inputs: [{ handle: '{{variable}}', type: 'string', desc: 'One target handle is created per unique {{variable}} found in either template field.' }],
    outputs: [{ handle: 'prompt', type: 'string', desc: 'The fully rendered prompt string with all variables substituted.' }],
    config: [
      { field: 'systemPrompt', type: 'string', default: 'You are a helpful AI assistant.', desc: 'System instructions. Supports {{variable}} substitution.' },
      { field: 'userPrompt',   type: 'string', default: '{{query}}', desc: 'User message template. Supports {{variable}} substitution.' },
    ],
    connections: 'Receives Input or Text node values into variable handles. Connects its output to LLM (prompt).',
    example: `{
  "type": "promptTemplate",
  "data": {
    "systemPrompt": "You are an expert at {{domain}}.",
    "userPrompt": "Summarize: {{document}}"
  }
}`,
  },
  text: {
    description: 'The Text node emits a static or templated string into the graph. Like Prompt Template, it supports {{variable}} syntax — each variable creates a target handle. Use it for constants, formatted strings, or reusable text fragments.',
    inputs: [{ handle: '{{variable}}', type: 'string', desc: 'Dynamic handle per {{variable}} in the content.' }],
    outputs: [{ handle: 'output', type: 'string', desc: 'The rendered text value.' }],
    config: [
      { field: 'text', type: 'string', default: '{{input}}', desc: 'The text content. Supports {{variable}} interpolation.' },
    ],
    connections: 'Connects to LLM (system), Prompt Template variables, Output.',
    example: `{
  "type": "text",
  "data": {
    "text": "You are an assistant specialized in {{domain}}."
  }
}`,
  },
  vectorSearch: {
    description: 'The Vector Search node performs semantic document retrieval from a configured vector store. It embeds the input query and returns the top-K most similar documents as context.',
    inputs: [{ handle: 'query', type: 'string', desc: 'The query string to embed and search against the vector store.' }],
    outputs: [{ handle: 'context', type: 'string', desc: 'Retrieved document chunks formatted as a context string.' }],
    config: [
      { field: 'collection', type: 'string', default: '', desc: 'The vector store collection name or index to query.' },
      { field: 'topK',       type: 'number', default: '5', desc: 'Number of most similar documents to retrieve.' },
      { field: 'metric',     type: '"cosine" | "euclidean" | "dot"', default: 'cosine', desc: 'Distance metric for similarity scoring.' },
    ],
    connections: 'Receives from Input (query). Connects to LLM or Prompt Template (as context variable).',
    example: `{
  "type": "vectorSearch",
  "data": {
    "collection": "internal-docs",
    "topK": 5,
    "metric": "cosine"
  }
}`,
  },
  router: {
    description: 'The Router node classifies the input and routes it to one of N labeled output handles. Define route labels one per line — each becomes a typed output handle. Use for conditional branching, intent-based routing, or A/B flows.',
    inputs: [{ handle: 'input', type: 'string', desc: 'The value to classify and route.' }],
    outputs: [{ handle: 'route_label', type: 'string', desc: 'One output handle per line in the routes config.' }],
    config: [
      { field: 'routeText', type: 'string (multiline)', default: 'general\ntechnical\ncreative', desc: 'Route labels, one per line. Each label becomes a named output handle.' },
    ],
    connections: 'Receives from LLM (response) or Input. Each output connects to a downstream pipeline branch.',
    example: `{
  "type": "router",
  "data": {
    "routeText": "billing\\ntechnical\\ngeneral"
  }
}`,
  },
  memory: {
    description: 'The Memory node stores conversation history for stateful, multi-turn agent pipelines. It accepts new messages and an optional clear signal, and emits the rolling conversation history within a configurable window.',
    inputs: [
      { handle: 'message', type: 'string', desc: 'New message to append to the session memory.' },
      { handle: 'clear',   type: 'any',    desc: 'When connected and triggered, clears the session history.' },
    ],
    outputs: [{ handle: 'history', type: 'string', desc: 'Formatted conversation history within the window size.' }],
    config: [
      { field: 'sessionKey',  type: 'string', default: 'default', desc: 'Unique key identifying this memory session.' },
      { field: 'windowSize',  type: 'number', default: '10',      desc: 'Maximum number of messages to retain in context.' },
    ],
    connections: 'Receives from Input (message). Connects to Prompt Template (as history variable) or LLM (system).',
    example: `{
  "type": "memory",
  "data": {
    "sessionKey": "user-session-abc",
    "windowSize": 10
  }
}`,
  },
  parser: {
    description: 'The Parser node extracts structured fields from raw LLM output text. Each field name defined in the config becomes a labeled output handle, enabling downstream nodes to receive specific extracted values.',
    inputs: [{ handle: 'raw', type: 'string', desc: 'Raw unstructured text from an LLM or other source.' }],
    outputs: [{ handle: 'field_name', type: 'string', desc: 'One output handle per field defined in the config.' }],
    config: [
      { field: 'fieldText', type: 'string (multiline)', default: 'name\nemail\nsummary', desc: 'Field names to extract, one per line. Each becomes a named output handle.' },
    ],
    connections: 'Receives from LLM (response). Each output handle connects to Output nodes or downstream processors.',
    example: `{
  "type": "parser",
  "data": {
    "fieldText": "name\\nemail\\ncompany\\nsummary"
  }
}`,
  },
};

export default function Blocks() {
  const [selected, setSelected] = useState('llm');
  const doc = DOCS[selected];
  const node = NODES.find(n => n.type === selected);

  return (
    <PageTransition>
    <div className="ps-page">
      <div className="ps-page-header">
        <div className="ps-page-header__left">
          <span className="ps-page-header__eyebrow">Reference</span>
          <h1 className="ps-page-header__title">Node Library</h1>
          <p className="ps-page-header__sub">
            Documentation for all 9 primitive node types
          </p>
        </div>
      </div>

      <div className="ps-page-body" style={{ paddingTop: 0 }}>
        <div className="blocks-layout">

          {/* Left nav */}
          <nav className="blocks-nav">
            <div className="blocks-nav__group-label">Nodes</div>
            {NODES.map(n => (
              <div
                key={n.type}
                className={`blocks-nav__item${selected === n.type ? ' blocks-nav__item--active' : ''}`}
                onClick={() => setSelected(n.type)}
              >
                <span className="blocks-nav__dot" style={{ background: n.color }} />
                {n.label}
              </div>
            ))}
          </nav>

          {/* Content */}
          <div className="blocks-content">
            <div className="blocks-header">
              <div className="blocks-header__rail" style={{ background: node.color }} />
              <h2 className="blocks-header__type" style={{ color: node.color, margin: 0 }}>
                {node.label}
              </h2>
              <span style={{
                fontFamily: 'Space Mono, monospace', fontSize: '11px',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                padding: '3px 8px', borderRadius: '2px',
              }}>
                {node.type}
              </span>
            </div>

            <p className="blocks-desc">{doc.description}</p>

            {doc.inputs.length > 0 && (
              <>
                <div className="blocks-section-title">Inputs</div>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden', marginBottom: 16 }}>
                  <table className="blocks-table">
                    <thead>
                      <tr><th>Handle</th><th>Type</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      {doc.inputs.map(inp => (
                        <tr key={inp.handle}>
                          <td style={{ fontFamily: 'Space Mono, monospace', color: 'var(--text-primary)' }}>{inp.handle}</td>
                          <td style={{ fontFamily: 'Space Mono, monospace', color: node.color, fontSize: '11px' }}>{inp.type}</td>
                          <td>{inp.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {doc.outputs.length > 0 && (
              <>
                <div className="blocks-section-title">Outputs</div>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden', marginBottom: 16 }}>
                  <table className="blocks-table">
                    <thead>
                      <tr><th>Handle</th><th>Type</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                      {doc.outputs.map(out => (
                        <tr key={out.handle}>
                          <td style={{ fontFamily: 'Space Mono, monospace', color: 'var(--text-primary)' }}>{out.handle}</td>
                          <td style={{ fontFamily: 'Space Mono, monospace', color: 'var(--accent-input)', fontSize: '11px' }}>{out.type}</td>
                          <td>{out.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="blocks-section-title">Configuration</div>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden', marginBottom: 16 }}>
              <table className="blocks-table">
                <thead>
                  <tr><th>Field</th><th>Type</th><th>Default</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {doc.config.map(c => (
                    <tr key={c.field}>
                      <td style={{ fontFamily: 'Space Mono, monospace', color: 'var(--text-primary)' }}>{c.field}</td>
                      <td style={{ fontFamily: 'Space Mono, monospace', color: 'var(--accent-llm)', fontSize: '11px' }}>{c.type}</td>
                      <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px' }}>{c.default}</td>
                      <td>{c.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="blocks-section-title">Common Connections</div>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.65, marginBottom: 20 }}>
              {doc.connections}
            </p>

            <div className="blocks-section-title">Example</div>
            <code className="blocks-code">{doc.example}</code>
          </div>

        </div>
      </div>
    </div>
    </PageTransition>
  );
}
