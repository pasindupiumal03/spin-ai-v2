import { NextRequest, NextResponse } from "next/server";
import mongoose, { Schema, Model, Document } from "mongoose";

// MongoDB connection types
declare global {
  var mongoose:
    | {
        conn: mongoose.Mongoose | null;
        promise: Promise<mongoose.Mongoose> | null;
      }
    | undefined;
}

// Cache the Mongo connection
interface CachedConnection {
  conn: mongoose.Mongoose | null;
  promise: Promise<mongoose.Mongoose> | null;
}

let cached: CachedConnection | undefined = globalThis.mongoose;

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectMongo(): Promise<mongoose.Mongoose> {
  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    const opts: mongoose.ConnectOptions = { bufferCommands: false };
    cached!.promise = mongoose.connect(process.env.MONGODB_URI!, opts);
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}

// Define interfaces
interface UploadedFile {
  id: number;
  name: string;
  type: string;
  size: number;
  content: string;
  lastModified: number;
}

interface FileChange {
  path: string;
  status: "new" | "updated" | "deleted";
  previousContent?: string;
}

interface ConversationTurn {
  prompt: string;
  timestamp: Date;
  fileChanges: FileChange[];
  fullState: { [key: string]: string };
}

interface ConversationDocument extends Document {
  userId: string;
  initialPrompt: string;
  uploadedFiles: UploadedFile[];
  conversationTurns: ConversationTurn[];
  currentFiles: { [key: string]: string };
  createdAt: Date;
  updatedAt: Date;
}

// Define schema and model
const conversationSchema: Schema<ConversationDocument> = new Schema({
  userId: { type: String, required: true, index: true },
  initialPrompt: { type: String, required: true },
  uploadedFiles: [
    {
      id: Number,
      name: String,
      type: String,
      size: Number,
      content: String,
      lastModified: Number,
    },
  ],
  conversationTurns: [
    {
      prompt: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      fileChanges: [
        {
          path: String,
          status: { type: String, enum: ["new", "updated", "deleted"] },
          previousContent: String,
        },
      ],
      fullState: { type: Object },
    },
  ],
  currentFiles: { type: Object, default: {} },
}, {
  timestamps: true,
});

const Conversation: Model<ConversationDocument> =
  mongoose.models.Conversation ||
  mongoose.model<ConversationDocument>("Conversation", conversationSchema);

// Retry wrapper with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3,
  backoff: number = 1000
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 529 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, backoff));
        backoff *= 2;
        continue;
      }
      if (!response.ok) throw new Error(`Status: ${response.status}`);
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, backoff));
      backoff *= 1.5;
    }
  }
  throw new Error("Max retries reached");
}

// Extract and parse JSON
function extractAndParseJSON(responseText: string): { [key: string]: string } {
  let jsonText = responseText;

  const codeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  } else {
    const startIndex = responseText.indexOf("{");
    if (startIndex !== -1) {
      let braceCount = 0;
      let endIndex = -1;
      let inString = false;
      let escaped = false;

      for (let i = startIndex; i < responseText.length; i++) {
        const char = responseText[i];
        if (!inString) {
          if (char === "{") braceCount++;
          else if (char === "}") {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i + 1;
              break;
            }
          } else if (char === '"') inString = true;
        } else {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
        }
      }

      if (endIndex > startIndex) {
        jsonText = responseText.substring(startIndex, endIndex);
      }
    }
  }

  jsonText = jsonText.replace(/```json|```|\n```/g, "").trim();

  try {
    const parsed = JSON.parse(jsonText);

    if (typeof parsed !== "object" || parsed === null) {
      throw new Error("Response is not a valid object");
    }

    const files: { [key: string]: string } = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== "string") {
        console.warn(`File content for ${key} is not a string, converting...`);
        files[key] = String(value);
      } else {
        files[key] = value;
      }
    }

    if (Object.keys(files).length === 0) {
      throw new Error("No files generated");
    }

    console.log("Successfully parsed files:", Object.keys(files));
    return files;
  } catch (error: any) {
    console.error("JSON parsing failed:", error);
    throw new Error(`Failed to parse generated code: ${error.message}`);
  }
}

// Generate iterative prompt for updates
function generateIterativePrompt(
  prompt: string,
  existingFiles: { [key: string]: string },
  conversationHistory?: ConversationTurn[]
): string {
  const baseInstructions = `You are an expert React developer working on an iterative code modification task. 

**CRITICAL: Return ONLY valid JSON - no explanations, no markdown, just the JSON object.**

**CURRENT REQUEST**: ${prompt}

**EXISTING FILES:**
${JSON.stringify(existingFiles, null, 2)}

**CONVERSATION CONTEXT:**
${conversationHistory ? conversationHistory.slice(-3).map((turn, index) => 
  `${index + 1}. User: "${turn.prompt}" (${turn.fileChanges.length} files affected)`
).join('\n') : 'This is the first modification request.'}

**MANDATORY RULES FOR ITERATIVE UPDATES:**

1. **Incremental Changes Only:**
   - Only modify files that need changes based on the user's request
   - Preserve all existing functionality unless explicitly asked to change it
   - Maintain the current file structure unless structural changes are requested
   - Keep all existing imports and dependencies intact unless they conflict with changes

2. **File Modification Strategy:**
   - For small changes: Return ONLY the modified files
   - For structural changes: Return all affected files
   - Always ensure imports reference existing files only
   - Validate that all component references exist in the returned files

3. **React Component Rules (maintain existing standards):**
   - Keep all existing \`import React from 'react';\` statements
   - Preserve existing \`export default ComponentName;\` patterns
   - Use function components consistently
   - Maintain existing CSS class usage patterns

4. **Import Validation:**
   - Check that all import statements reference files that exist
   - If you create new components, ensure they're properly exported
   - If you reference new files, include them in the response
   - Remove imports for deleted components/files

5. **Consistency Rules:**
   - Maintain existing naming conventions
   - Keep the same styling approach (CSS classes, inline styles, etc.)
   - Preserve existing state management patterns
   - Match existing code formatting and structure

6. **Response Format:**
   Return a JSON object with only the files that need to be changed:
   \`\`\`json
   {
     "/src/ComponentToModify.js": "modified content here...",
     "/src/NewComponent.js": "new component content if needed..."
   }
   \`\`\`

**VALIDATION CHECKLIST:**
- [ ] All imports in modified files reference existing files
- [ ] All new components have proper exports
- [ ] Existing functionality is preserved where not explicitly changed
- [ ] CSS classes and styling approach is consistent
- [ ] React component structure follows existing patterns
- [ ] No placeholder or incomplete code

**IMPORTANT:** If the request is unclear or would break existing functionality, make minimal, safe changes that align with the user's intent while preserving the working state of the application.`;

  return baseInstructions;
}

// Detect file changes
function detectFileChanges(
  previousFiles: { [key: string]: string },
  newFiles: { [key: string]: string }
): FileChange[] {
  const changes: FileChange[] = [];
  const allPaths = new Set([...Object.keys(previousFiles), ...Object.keys(newFiles)]);

  for (const path of allPaths) {
    const prevContent = previousFiles[path];
    const newContent = newFiles[path];

    if (!prevContent && newContent) {
      changes.push({ path, status: "new" });
    } else if (prevContent && !newContent) {
      changes.push({ path, status: "deleted", previousContent: prevContent });
    } else if (prevContent !== newContent) {
      changes.push({ path, status: "updated", previousContent: prevContent });
    }
  }

  return changes;
}

// Streaming helpers
interface StreamingResponse {
  stream: ReadableStream<Uint8Array>;
  sendData: (data: { type: string; [key: string]: any }) => void;
  closeStream: () => void;
}

function createStreamingResponse(): StreamingResponse {
  const encoder = new TextEncoder();
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
    cancel() {
      console.log("Stream cancelled");
    },
  });

  const sendData = (data: { type: string; [key: string]: any }) => {
    if (controllerRef) {
      controllerRef.enqueue(
        encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
      );
    }
  };

  const closeStream = () => {
    if (controllerRef) {
      controllerRef.close();
    }
  };

  return { stream, sendData, closeStream };
}

// Updated generatePrompt with explicit instructions
function generatePrompt(
  prompt?: string,
  existingFiles?: { [key: string]: string }
): string {
  const basePrompt = `You are an expert React developer. Generate PRODUCTION-READY React code that works perfectly in code preview environments.

**CRITICAL: Return ONLY valid JSON - no explanations, no markdown, just the JSON object.**

**JSON FORMAT EXAMPLE:**
{
  "/src/App.js": "import React from 'react';\\n\\nfunction App() {\\n  return (\\n    <div className=\\"min-h-screen bg-gray-100\\">\\n      <h1>Hello World</h1>\\n    </div>\\n  );\\n}\\n\\nexport default App;",
  "/src/index.js": "import React from 'react';\\nimport { createRoot } from 'react-dom/client';\\nimport App from './App';\\n\\nconst root = createRoot(document.getElementById('root'));\\nroot.render(<App />);"
}

**MANDATORY RULES:**

1. **React Component Structure:**
   - EVERY component file MUST start with: \`import React from 'react';\`
   - EVERY component MUST end with: \`export default ComponentName;\`
   - Use ONLY function components: \`function ComponentName() { return (...); }\`
   - NO class components, NO arrow functions for main components

2. **Required Files (MUST include all):**
   - "/src/App.js" - Main component with React import and default export
   - "/src/index.js" - Entry point using createRoot from react-dom/client
   - "/src/App.css" - Basic CSS styles (can be empty but include the file)
   - "/public/index.html" - HTML with proper setup
   - "/package.json" - Package configuration

3. **Import Rules:**
   - React components: \`import ComponentName from './ComponentName';\`
   - React: \`import React from 'react';\`
   - CSS: \`import './App.css';\`
   - createRoot: \`import { createRoot } from 'react-dom/client';\`

4. **Styling - USE NORMAL CSS:**
   - Use CSS classes defined in App.css file
   - Create modern, responsive designs with custom CSS
   - NO external CSS frameworks or CDNs
   - Focus on clean, user-friendly interfaces

5. **File Templates (use exactly as shown):**

/src/index.js template:
\`\`\`
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './App.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
\`\`\`

/public/index.html template:
\`\`\`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
\`\`\`

/src/App.css template - CREATE COMPREHENSIVE, MODERN CSS:
\`\`\`
/* Modern CSS Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

#root {
  min-height: 100vh;
}

/* Container and Layout Classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Card Components */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin: 16px 0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
}

/* Button Styles */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f8f9fa;
  color: #495057;
  border: 2px solid #e9ecef;
}

.btn-secondary:hover {
  background: #e9ecef;
  border-color: #dee2e6;
}

/* Form Elements */
.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.form-input {
  width: 100;
  padding: 12px 16px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Header Styles */
.header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 16px 0;
}

.header h1 {
  color: #495057;
  font-size: 28px;
  font-weight: 700;
}

/* Grid System */
.grid {
  display: grid;
  gap: 20px;
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

/* Flex Utilities */
.flex {
  display: flex;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-column {
  display: flex;
  flex-direction: column;
}

/* Spacing Utilities */
.mt-1 { margin-top: 8px; }
.mt-2 { margin-top: 16px; }
.mt-3 { margin-top: 24px; }
.mb-1 { margin-bottom: 8px; }
.mb-2 { margin-bottom: 16px; }
.mb-3 { margin-bottom: 24px; }
.p-1 { padding: 8px; }
.p-2 { padding: 16px; }
.p-3 { padding: 24px; }

/* Text Utilities */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }
.text-large { font-size: 24px; font-weight: 600; }
.text-medium { font-size: 18px; }
.text-small { font-size: 14px; color: #6c757d; }

/* Color Classes */
.text-primary { color: #667eea; }
.text-secondary { color: #6c757d; }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
.text-warning { color: #ffc107; }

.bg-primary { background-color: #667eea; color: white; }
.bg-light { background-color: #f8f9fa; }
.bg-white { background-color: white; }

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .card {
    padding: 16px;
    margin: 12px 0;
  }
  
  .btn {
    width: 100%;
  }
  
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
  
  .header h1 {
    font-size: 24px;
  }
}

/* Loading and Animation Classes */
.loading {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fade-in {
  animation: fadeIn 0.5s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modern Component Styles */
.nav {
  background: white;
  padding: 16px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-list {
  list-style: none;
  display: flex;
  gap: 32px;
  margin: 0;
  padding: 0;
}

.nav-link {
  color: #495057;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: #667eea;
}

.hero {
  text-align: center;
  padding: 80px 0;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.hero h1 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #495057;
}

.hero p {
  font-size: 20px;
  color: #6c757d;
  margin-bottom: 32px;
}
\`\`\`

/package.json template:
\`\`\`
{
  "name": "react-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
\`\`\`

**CSS USAGE GUIDELINES:**
- Use the predefined CSS classes from App.css
- Create modern, user-friendly interfaces
- Common patterns:
  - Container: \`<div className="container">\`
  - Card: \`<div className="card">\`
  - Button: \`<button className="btn btn-primary">\`
  - Grid: \`<div className="grid grid-2">\` or \`<div className="grid grid-3">\`
  - Flex: \`<div className="flex-center">\` or \`<div className="flex-between">\`
- Always include proper spacing with utility classes (mt-2, mb-3, p-2, etc.)
- Use semantic HTML elements (header, main, section, article, etc.)

**UI/UX BEST PRACTICES:**
- Create intuitive navigation and clear hierarchy
- Use consistent spacing and typography
- Include hover effects and smooth transitions
- Make interfaces responsive for mobile devices
- Add loading states and user feedback
- Use proper contrast ratios for accessibility
- Group related elements with cards or sections

**VALIDATION BEFORE RESPONDING:**
- Check that every .js file has \`import React from 'react';\`
- Check that every component has \`export default ComponentName;\`
- Check that App.js is imported correctly in index.js
- Ensure App.css contains comprehensive styles for modern UI
- Ensure components use predefined CSS classes from App.css
- Ensure valid JSON with proper escaping (\\n for newlines, \\" for quotes)
- Verify that the UI is user-friendly and visually appealing`;

  if (existingFiles) {
    return `${basePrompt}

**TASK**: Enhance the existing React application.

**EXISTING FILES:**
${JSON.stringify(existingFiles, null, 2)}

**USER REQUEST**: ${prompt || "Enhance the application"}

**INSTRUCTIONS:**
1. Keep all existing functionality
2. Fix any import/export issues in existing code
3. Add the requested enhancements
4. Ensure all files follow the rules above, especially CSS styling
5. If CSS file exists, enhance it with modern styles and user-friendly classes
6. Focus on creating intuitive, visually appealing interfaces
7. Return complete enhanced project as JSON`;
  } else {
    return `${basePrompt}

**TASK**: Create a new React application from scratch.

**USER REQUEST**: ${prompt || "Create a React application"}

**INSTRUCTIONS:**
1. Build a complete functional React app for the user's request
2. Follow all the mandatory rules above, especially CSS styling
3. Create modern, responsive UI with custom CSS classes
4. Include all required files with proper structure
5. Focus on user-friendly interfaces with intuitive navigation
6. Use semantic HTML and proper CSS architecture
7. Return complete project as JSON

**DOUBLE-CHECK BEFORE RESPONDING:**
- All components have React imports and default exports
- index.js uses createRoot and imports App correctly
- HTML is clean without external dependencies
- CSS file includes comprehensive styles for modern UI
- All CSS classes are properly used in components
- Interface is user-friendly and visually appealing
- JSON is properly formatted with escaped quotes and newlines`;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectMongo();
    const body: {
      prompt?: string;
      existingFiles?: { [key: string]: string };
      uploadedFiles?: UploadedFile[];
      streaming?: boolean;
      userId?: string;
      conversationId?: string;
      isIterativeUpdate?: boolean;
    } = await request.json();

    const {
      prompt,
      existingFiles,
      uploadedFiles,
      streaming = false,
      userId = "anonymous",
      conversationId,
      isIterativeUpdate = false,
    } = body;

    if (!prompt && (!uploadedFiles || uploadedFiles.length === 0)) {
      return NextResponse.json(
        { error: "Prompt or uploaded files required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 500 });
    }

    let conversation: ConversationDocument | null = null;
    let systemPrompt: string;

    // Handle iterative updates
    if (isIterativeUpdate && conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      systemPrompt = generateIterativePrompt(
        prompt!,
        existingFiles || conversation.currentFiles,
        conversation.conversationTurns
      );
    } else {
      systemPrompt = generatePrompt(prompt, existingFiles);
    }

    // Handle streaming
    if (streaming) {
      const { stream, sendData, closeStream } = createStreamingResponse();

      (async () => {
        try {
          sendData({ 
            type: "status", 
            message: isIterativeUpdate ? "Applying changes..." : "Starting generation..." 
          });

          const requestBody = JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8192,
            stream: true,
            messages: [{ role: "user", content: systemPrompt }],
          });

          const response = await fetchWithRetry(
            "https://api.anthropic.com/v1/messages",
            {
              method: "POST",
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: requestBody,
            }
          );

          if (!response.body) throw new Error("Empty stream body");

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullResponse = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            chunk.split("\n").forEach((line) => {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data !== "[DONE]") {
                  try {
                    const parsed: { type: string; delta?: { text?: string } } =
                      JSON.parse(data);
                    if (
                      parsed.type === "content_block_delta" &&
                      parsed.delta?.text
                    ) {
                      fullResponse += parsed.delta.text;
                      sendData({
                        type: "progress",
                        content: parsed.delta.text,
                      });
                    }
                  } catch {
                    // Ignore parsing errors
                  }
                }
              }
            });
          }

          // Parse and validate files
          const newFiles = extractAndParseJSON(fullResponse);
          const previousFiles = existingFiles || conversation?.currentFiles || {};
          
          // Merge changes with existing files for full state
          const fullFileState = { ...previousFiles, ...newFiles };
          
          // Detect changes
          const fileChanges = detectFileChanges(previousFiles, newFiles);

          // Update conversation
          if (isIterativeUpdate && conversation) {
            conversation.conversationTurns.push({
              prompt: prompt!,
              timestamp: new Date(),
              fileChanges,
              fullState: fullFileState,
            });
            conversation.currentFiles = fullFileState;
            await conversation.save();
          } else {
            // Create new conversation
            conversation = new Conversation({
              userId,
              initialPrompt: prompt!,
              uploadedFiles: uploadedFiles || [],
              conversationTurns: [{
                prompt: prompt!,
                timestamp: new Date(),
                fileChanges: Object.keys(newFiles).map(path => ({ path, status: "new" as const })),
                fullState: fullFileState,
              }],
              currentFiles: fullFileState,
            });
            await conversation.save();
          }

          // Send file updates
          for (const [fileName, content] of Object.entries(newFiles)) {
            const changeInfo = fileChanges.find(c => c.path === fileName);
            sendData({ 
              type: "file", 
              fileName, 
              content,
              changeType: changeInfo?.status || "new"
            });
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          sendData({
            type: "complete",
            conversationId: conversation._id,
            userId,
            changedFiles: fileChanges,
            fullFiles: isIterativeUpdate ? fullFileState : newFiles,
            isIterativeUpdate,
          });
        } catch (err: any) {
          sendData({ type: "error", error: err.message });
        } finally {
          closeStream();
        }
      })();

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const requestBody = JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 8192,
      messages: [{ role: "user", content: systemPrompt }],
    });

    const response = await fetchWithRetry(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: requestBody,
      }
    );

    const data: { content: { text: string }[]; stop_reason?: string } =
      await response.json();

    if (data.stop_reason === "max_tokens") {
      throw new Error(
        "Response truncated: Increase max_tokens or simplify prompt"
      );
    }

    const responseText = data.content[0]?.text;
    if (!responseText) {
      throw new Error("No content generated by Anthropic API");
    }

    // Parse and validate files
    const newFiles = extractAndParseJSON(responseText);
    const previousFiles = existingFiles || conversation?.currentFiles || {};
    
    // Merge changes with existing files for full state
    const fullFileState = { ...previousFiles, ...newFiles };
    
    // Detect changes
    const fileChanges = detectFileChanges(previousFiles, newFiles);

    // Update or create conversation
    if (isIterativeUpdate && conversation) {
      conversation.conversationTurns.push({
        prompt: prompt!,
        timestamp: new Date(),
        fileChanges,
        fullState: fullFileState,
      });
      conversation.currentFiles = fullFileState;
      await conversation.save();
    } else {
      conversation = new Conversation({
        userId,
        initialPrompt: prompt!,
        uploadedFiles: uploadedFiles || [],
        conversationTurns: [{
          prompt: prompt!,
          timestamp: new Date(),
          fileChanges: Object.keys(newFiles).map(path => ({ path, status: "new" as const })),
          fullState: fullFileState,
        }],
        currentFiles: fullFileState,
      });
      await conversation.save();
    }

    return NextResponse.json({
      files: newFiles,
      fullFiles: fullFileState,
      changedFiles: fileChanges,
      conversationId: conversation._id,
      userId,
      isIterativeUpdate,
    });
  } catch (error: any) {
    console.error("Error in Anthropic API route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectMongo();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (conversationId) {
      // Get specific conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation || conversation.userId !== userId) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ conversation }, { status: 200 });
    } else {
      // Get all conversations for user
      const conversations = await Conversation.find({ userId }).sort({
        updatedAt: -1,
      });
      return NextResponse.json({ conversations }, { status: 200 });
    }
  } catch (error: any) {
    console.error("Error retrieving conversations:", error);
    return NextResponse.json(
      { error: "Failed to retrieve conversations" },
      { status: 500 }
    );
  }
}