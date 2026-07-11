/* ==========================================================================
   AEGIS FRONTEND LOGIC & ENGINE
   ========================================================================== */

const API_BASE = "http://127.0.0.1:3005/api";

// UI Global State
let activeSessionId = null;
let currentBotBubble = null;
let currentBotText = "";
let currentStepBlock = null;

function getStoredSessionName(session) {
  return session.displayName || localStorage.getItem(`display_name_${session.sessionId}`) || `Session ${session.sessionId.split('_').pop()}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function refreshSessionViews() {
  await loadSessions();
  await loadSessionsIndex();
  await loadTrash();
}

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initDropdowns();
  initSessions();
  initChatInput();
  initLiveActivityTracker();
  initProviderSelector();
  initUnifiedActions();
  initSidebarToggles();
  
  // Initial load
  loadSessions();
  loadCapabilities();
});

/* ==========================================================================
   1. NAVIGATION MANAGEMENT
   ========================================================================== */
function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const sections = document.querySelectorAll(".page-section");
  const appContainer = document.getElementById("app-container");

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Toggle active classes on nav buttons
      navBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Show/Hide corresponding sections
      const targetId = btn.getAttribute("data-target");
      sections.forEach(sec => {
        if (sec.id === targetId) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });

      // Hide or show the sessions sidebar (left sidebar)
      if (targetId === "page-home") {
        appContainer.classList.remove("hide-sessions");
      } else {
        appContainer.classList.add("hide-sessions");
      }

      // Reload data if page changes
      if (targetId === "page-home") {
        loadActiveSession();
      } else if (targetId === "page-sessions-stub") {
        loadSessionsIndex();
      } else if (targetId === "page-trash-stub") {
        loadTrash();
      } else {
        loadCapabilities();
      }
    });
  });
}

/* ==========================================================================
   2. DROPDOWN TOGGLES
   ========================================================================== */
function initDropdowns() {
  const triggers = document.querySelectorAll(".dropdown-trigger");
  
  triggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const parent = trigger.parentElement;
      const content = parent.querySelector(".dropdown-content");
      
      // Close other dropdowns first
      document.querySelectorAll(".dropdown-content").forEach(c => {
        if (c !== content) c.classList.remove("show");
      });

      content.classList.toggle("show");
    });
  });

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-content").forEach(c => {
      c.classList.remove("show");
    });
  });
}

/* ==========================================================================
   3. SESSION CRUD OPERATIONS
   ========================================================================== */
function initSessions() {
  const btnNewSession = document.getElementById("btn-new-session");
  
  btnNewSession.addEventListener("click", async () => {
    try {
      btnNewSession.disabled = true;
      const response = await fetch(`${API_BASE}/sessions`, { method: 'POST' });
      if (!response.ok) throw new Error("Failed to create session");
      const session = await response.json();
      
      // Reload sessions and select the newly created one
      await loadSessions();
      await checkoutSession(session.sessionId);
    } catch (err) {
      console.error(err);
      alert("Error creating new session: " + err.message);
    } finally {
      btnNewSession.disabled = false;
    }
  });
}

async function loadSessions() {
  try {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to fetch sessions");
    const { sessions, activeSessionId: currentActive } = await response.json();
    
    activeSessionId = currentActive;
    renderSessionsList(sessions);
    
    if (activeSessionId) {
      loadActiveSession();
    }
  } catch (err) {
    console.error("Could not load sessions:", err);
  }
}

function renderSessionsList(sessions) {
  const list = document.getElementById("session-list");
  list.innerHTML = "";

  if (sessions.length === 0) {
    list.innerHTML = `<li class="dropdown-empty">No sessions. Create one!</li>`;
    return;
  }

  sessions.forEach(session => {
    const formattedDate = new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const isCurrent = session.sessionId === activeSessionId;
    const name = getStoredSessionName(session);

    const li = document.createElement("li");
    li.className = `session-item ${isCurrent ? 'active' : ''}`;
    li.setAttribute("data-id", session.sessionId);
    
    li.innerHTML = `
      <div class="session-info">
        <span class="session-name">${escapeHtml(name)}</span>
        <span class="session-meta">${escapeHtml(formattedDate)}</span>
      </div>
    `;

    li.addEventListener("click", () => {
      checkoutSession(session.sessionId);
    });

    list.appendChild(li);
  });
}

async function renameSession(sessionId, currentName) {
  if (!sessionId) return;

  const newName = prompt("Enter new name for the session:", currentName);
  if (newName === null) return;

  const trimmed = newName.trim();
  if (!trimmed) {
    alert("Session name cannot be empty.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/sessions/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, displayName: trimmed })
    });
    if (!response.ok) throw new Error("Rename failed");

    localStorage.setItem(`display_name_${sessionId}`, trimmed);
    await refreshSessionViews();
    if (activeSessionId === sessionId) {
      await loadActiveSession();
    }
  } catch (err) {
    alert("Error renaming session: " + err.message);
  }
}

async function deleteSession(sessionId, name = "this session") {
  if (!sessionId) return;

  if (confirm(`Are you sure you want to delete "${name}"? It will move to Trash.`)) {
    try {
      const response = await fetch(`${API_BASE}/sessions/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!response.ok) throw new Error("Delete failed");

      localStorage.removeItem(`display_name_${sessionId}`);
      await refreshSessionViews();
      await loadActiveSession();
    } catch (err) {
      alert("Error deleting session: " + err.message);
    }
  }
}

async function checkoutSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/sessions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!response.ok) throw new Error("Checkout failed");
    
    activeSessionId = sessionId;
    
    // Highlight in list
    document.querySelectorAll(".session-item").forEach(item => {
      if (item.getAttribute("data-id") === sessionId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    loadActiveSession();
  } catch (err) {
    alert("Error selecting session: " + err.message);
  }
}

async function loadActiveSession() {
  if (!activeSessionId) {
    document.getElementById("active-session-title").innerText = "No Active Session";
    document.getElementById("active-session-subtitle").innerText = "Select or create a session to begin.";
    document.getElementById("chat-messages").innerHTML = "";

    // Clear details panel
    if (document.getElementById("session-details-id")) document.getElementById("session-details-id").textContent = "—";
    if (document.getElementById("session-details-created")) document.getElementById("session-details-created").textContent = "—";
    if (document.getElementById("session-details-status")) document.getElementById("session-details-status").textContent = "—";
    if (document.getElementById("session-details-provider")) document.getElementById("session-details-provider").textContent = "—";
    if (document.getElementById("session-details-node")) document.getElementById("session-details-node").textContent = "—";
    if (document.getElementById("session-details-model")) document.getElementById("session-details-model").textContent = "—";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/sessions/active`);
    if (!response.ok) throw new Error("Failed to load active session");
    const sessionDetails = await response.json();
    
    const { activeSessionId: id, metadata, state, history } = sessionDetails;
    
    // Update headers
    const name = getStoredSessionName({ sessionId: id, displayName: metadata?.displayName });
    document.getElementById("active-session-title").innerText = name;
    
    let subtitleText = "Federated Health Agent";
    if (state?.goal) {
      subtitleText = `Goal: ${state.goal}`;
    }
    document.getElementById("active-session-subtitle").innerText = subtitleText;

    // Update right details panel
    const detailId = document.getElementById("session-details-id");
    const detailCreated = document.getElementById("session-details-created");
    const detailStatus = document.getElementById("session-details-status");
    const detailProvider = document.getElementById("session-details-provider");
    const detailNode = document.getElementById("session-details-node");
    const detailModel = document.getElementById("session-details-model");

    if (detailId) detailId.textContent = id;
    if (detailCreated) {
      const createdDate = new Date(metadata?.createdAt || Date.now());
      detailCreated.textContent = createdDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (detailStatus) detailStatus.textContent = metadata?.lifecycleState || "Active";
    if (detailProvider) detailProvider.textContent = state?.provider || "local/ollama";
    if (detailNode) detailNode.textContent = document.getElementById("agent-status-text")?.textContent || "Idle";
    if (detailModel) detailModel.textContent = state?.model || "Not Selected";

    // Display history
    renderChatHistory(history);
  } catch (err) {
    console.error("Could not load session details:", err);
  }
}

/**
 * Refreshes only the session metadata (title, goal, details panel)
 * WITHOUT re-rendering the chat messages. Used after streaming to avoid duplicates.
 */
async function refreshSessionDetails() {
  if (!activeSessionId) return;

  try {
    const response = await fetch(`${API_BASE}/sessions/active`);
    if (!response.ok) return;
    const sessionDetails = await response.json();
    
    const { activeSessionId: id, metadata, state } = sessionDetails;
    
    // Update headers
    const name = getStoredSessionName({ sessionId: id, displayName: metadata?.displayName });
    document.getElementById("active-session-title").innerText = name;
    
    let subtitleText = "Federated Health Agent";
    if (state?.goal) {
      subtitleText = `Goal: ${state.goal}`;
    }
    document.getElementById("active-session-subtitle").innerText = subtitleText;

    // Update right details panel
    const detailId = document.getElementById("session-details-id");
    const detailCreated = document.getElementById("session-details-created");
    const detailStatus = document.getElementById("session-details-status");
    const detailProvider = document.getElementById("session-details-provider");
    const detailNode = document.getElementById("session-details-node");
    const detailModel = document.getElementById("session-details-model");

    if (detailId) detailId.textContent = id;
    if (detailCreated) {
      const createdDate = new Date(metadata?.createdAt || Date.now());
      detailCreated.textContent = createdDate.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    if (detailStatus) detailStatus.textContent = metadata?.lifecycleState || "Active";
    if (detailProvider) detailProvider.textContent = state?.provider || "local/ollama";
    if (detailNode) detailNode.textContent = document.getElementById("agent-status-text")?.textContent || "Idle";
    if (detailModel) detailModel.textContent = state?.model || "Not Selected";
  } catch (err) {
    console.error("Could not refresh session details:", err);
  }
}

/* ==========================================================================
   4. CHAT INTERFACE & SSE STREAM HANDLER
   ========================================================================== */
function initChatInput() {
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");

  // Adjust textarea height dynamically
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = (chatInput.scrollHeight) + "px";
  });

  // Enter to send, Shift+Enter for new line
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  btnSend.addEventListener("click", sendMessage);
}

function renderChatHistory(messages) {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="message-bubble bot system-message">
        <div class="message-content">
          Conversation context starts here. Ask Aegis anything.
        </div>
      </div>
    `;
    return;
  }

  messages.forEach(msg => {
    // We ignore raw tool output messages in main chat unless they are formatted,
    // as they will be displayed inline inside assistant bubbles.
    if (msg.role === 'tool') return;
    
    appendMessageBubble(msg.role, msg.content, msg.metadata);
  });

  scrollChatToBottom();
}

function appendMessageBubble(role, content, metadata = null) {
  const container = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  bubble.className = `message-bubble ${role === 'user' ? 'user' : 'bot'}`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = content;

  bubble.appendChild(contentDiv);
  container.appendChild(bubble);
  
  scrollChatToBottom();
  return bubble;
}

function scrollChatToBottom() {
  const container = document.getElementById("chat-messages");
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (!message || !activeSessionId) return;

  // Clear input
  input.value = "";
  input.style.height = "auto";

  // Append user message
  appendMessageBubble("user", message);

  // Set loading states
  setAgentStatus("busy", "Agent Executing ReAct loop...");
  showThinkingIndicator(true);
  clearLiveActivity();

  // Create Bot Message bubble that we will stream text into
  currentBotBubble = appendMessageBubble("bot", "");
  currentBotText = "";
  currentStepBlock = null;

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (response.status === 409) {
      currentBotBubble.querySelector(".message-content").textContent = "Error: Agent is busy. Please try again.";
      showThinkingIndicator(false);
      setAgentStatus("online", "Core Node Idle");
      return;
    }

    if (!response.ok) throw new Error("API call failed");

    // Start reading SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // preserve last incomplete line
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("event: ")) {
          // Track event types if needed
        } else if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.slice(5).trim();
          if (!dataStr) continue;
          
          try {
            const parsed = JSON.parse(dataStr);
            handleSSEEvent(parsed);
          } catch (e) {
            // ignore JSON errors on incomplete tokens
          }
        }
      }
    }

  } catch (err) {
    console.error("Stream error:", err);
    if (currentBotBubble) {
      currentBotBubble.querySelector(".message-content").textContent += `\n[Fatal Connection Error: ${err.message}]`;
    }
  } finally {
    showThinkingIndicator(false);
    setAgentStatus("online", "Core Node Idle");
    
    // Refresh session details (title, goal, status) WITHOUT re-rendering chat messages
    refreshSessionDetails();
  }
}

function handleSSEEvent(eventData) {
  const contentDiv = currentBotBubble.querySelector(".message-content");
  
  if (eventData.chunk) {
    // Streaming assistant tokens
    currentBotText += eventData.chunk;
    contentDiv.textContent = currentBotText;
    
    // Re-append step blocks if any were added
    if (currentStepBlock && !contentDiv.contains(currentStepBlock)) {
      contentDiv.appendChild(currentStepBlock);
    }
    
    scrollChatToBottom();
  } 
  else if (eventData.name && eventData.input !== undefined) {
    // Tool execution started
    addLiveActivity(`🔧 Executing Tool: ${eventData.name}`, "blue");
    
    // Create detailed steps inside assistant chat bubble
    createAgentStepBlock(eventData.name, eventData.input);
  } 
  else if (eventData.name && eventData.output !== undefined) {
    // Tool execution finished
    addLiveActivity(`✅ Tool Finished: ${eventData.name}`, "green");
    
    // Fill step block output
    if (currentStepBlock) {
      const body = currentStepBlock.querySelector(".agent-step-body");
      if (body) {
        body.textContent = eventData.output;
      }
    }
  } 
  else if (eventData.error) {
    // Error encountered
    addLiveActivity(`❌ Error: ${eventData.error}`, "red");
    contentDiv.textContent += `\n[Agent Error: ${eventData.error}]`;
  }
}

function createAgentStepBlock(toolName, input) {
  const contentDiv = currentBotBubble.querySelector(".message-content");
  
  const block = document.createElement("div");
  block.className = "agent-step-block";
  
  block.innerHTML = `
    <div class="agent-step-header">
      <span>🛠️ Tool Execution: ${toolName}</span>
      <span class="chevron-step">▼</span>
    </div>
    <div class="agent-step-body">Running action with input: ${JSON.stringify(input, null, 2)}...</div>
  `;

  // Accordion toggle
  const header = block.querySelector(".agent-step-header");
  const body = block.querySelector(".agent-step-body");
  const chevron = block.querySelector(".chevron-step");
  
  header.addEventListener("click", () => {
    const isHidden = body.style.display === "none";
    body.style.display = isHidden ? "block" : "none";
    chevron.textContent = isHidden ? "▼" : "▲";
  });

  contentDiv.appendChild(block);
  currentStepBlock = block;
  scrollChatToBottom();
}

/* ==========================================================================
   5. LIVE ACTIVITY TRACKER LOGS
   ========================================================================== */
function initLiveActivityTracker() {
  const tracker = document.getElementById("agent-activity-tracker");
  const header = document.getElementById("activity-header");
  
  header.addEventListener("click", () => {
    tracker.classList.toggle("collapsed");
  });
}

function clearLiveActivity() {
  const log = document.getElementById("activity-log");
  log.innerHTML = "";
}

function addLiveActivity(text, colorClass = "") {
  const log = document.getElementById("activity-log");
  const item = document.createElement("div");
  item.style.color = colorClass === "green" ? "var(--accent-green)" : 
                     colorClass === "blue" ? "var(--accent-blue)" : 
                     colorClass === "red" ? "var(--accent-red)" : "var(--text-secondary)";
  
  const timestamp = new Date().toLocaleTimeString(undefined, { hour12: false });
  item.textContent = `[${timestamp}] ${text}`;
  
  log.appendChild(item);
  
  // Auto scroll activity logs
  const body = document.getElementById("activity-body");
  body.scrollTop = body.scrollHeight;
}

function setAgentStatus(status, text) {
  const dot = document.querySelector(".status-dot");
  const statusText = document.getElementById("agent-status-text");
  
  dot.className = `status-dot ${status}`;
  statusText.textContent = text;
}

function showThinkingIndicator(show) {
  const ind = document.getElementById("thinking-indicator");
  if (show) {
    ind.classList.remove("hidden");
  } else {
    ind.classList.add("hidden");
  }
}

/* ==========================================================================
   6. CAPABILITIES MANAGEMENT (SKILLS, TOOLS, PLUGINS)
   ========================================================================== */
async function loadCapabilities() {
  try {
    const response = await fetch(`${API_BASE}/capabilities`);
    if (!response.ok) throw new Error("Failed to load capabilities");
    const data = await response.json();
    
    renderCapabilitiesGrid(data);
    renderDropdownOptions(data);
  } catch (err) {
    console.error("Could not fetch capabilities:", err);
  }
}

function renderCapabilitiesGrid(data) {
  // 1. Skills Grid
  const skillsGrid = document.getElementById("skills-grid");
  skillsGrid.innerHTML = "";
  const activeSkills = data.skills.filter(s => s.isActive);
  
  if (activeSkills.length === 0) {
    skillsGrid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">No active skills. Load one using the dropdown above!</p>`;
  } else {
    activeSkills.forEach(skill => {
      const card = createCapabilityCard("skill", skill.name, "Active Skill", "Ready to perform dynamic summaries, parses, or agent tasks.", skill.path);
      skillsGrid.appendChild(card);
    });
  }

  // 2. Tools Grid
  const toolsGrid = document.getElementById("tools-grid");
  toolsGrid.innerHTML = "";
  const activeTools = data.tools.filter(t => t.isActive);
  
  if (activeTools.length === 0) {
    toolsGrid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">No active tools. Load one using the dropdown above!</p>`;
  } else {
    activeTools.forEach(tool => {
      const card = createCapabilityCard("tool", tool.name, "Active Tool", "Provides functional APIs for files, directory logs, and process execution.", tool.path);
      toolsGrid.appendChild(card);
    });
  }

  // 3. Plugins Grid
  const pluginsGrid = document.getElementById("plugins-grid");
  pluginsGrid.innerHTML = "";
  const activePlugins = data.plugins.filter(p => p.isActive);
  
  if (activePlugins.length === 0) {
    pluginsGrid.innerHTML = `<p class="text-secondary" style="grid-column: 1/-1; text-align: center;">No active plugins. Load one using the dropdown above!</p>`;
  } else {
    activePlugins.forEach(plugin => {
      const card = createCapabilityCard("plugin", plugin.name, "Active Plugin", "Core background service facilitating encryption, blockchain nodes, or persistence.", plugin.path);
      pluginsGrid.appendChild(card);
    });
  }
}

function createCapabilityCard(type, name, subtitle, defaultDesc, path) {
  const card = document.createElement("div");
  card.className = "card";
  
  card.innerHTML = `
    <div>
      <div class="card-header">
        <h3 class="card-title">${name}</h3>
        <span class="card-badge">${subtitle}</span>
      </div>
      <p class="card-desc">${defaultDesc}</p>
      <div class="card-meta">Path: <code>${path}</code></div>
    </div>
    <div class="card-actions">
      <button class="btn btn-danger btn-unload-capability">Disable</button>
    </div>
  `;

  const btnDisable = card.querySelector(".btn-unload-capability");
  btnDisable.addEventListener("click", async () => {
    if (confirm(`Disable this ${type}: "${name}"?`)) {
      try {
        btnDisable.disabled = true;
        const response = await fetch(`${API_BASE}/capabilities/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, name })
        });
        if (!response.ok) throw new Error("Disable failed");
        
        loadCapabilities();
      } catch (err) {
        alert(`Error disabling capability: ${err.message}`);
      } finally {
        btnDisable.disabled = false;
      }
    }
  });

  return card;
}

function renderDropdownOptions(data) {
  // 1. Skills Dropdown
  const skillsList = document.getElementById("dropdown-skills-list");
  skillsList.innerHTML = "";
  const inactiveSkills = data.skills.filter(s => !s.isActive);
  
  if (inactiveSkills.length === 0) {
    skillsList.innerHTML = `<div class="dropdown-empty">All skills loaded</div>`;
  } else {
    inactiveSkills.forEach(skill => {
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.textContent = skill.name;
      btn.addEventListener("click", () => addCapability("skill", skill.name));
      skillsList.appendChild(btn);
    });
  }

  // 2. Tools Dropdown
  const toolsList = document.getElementById("dropdown-tools-list");
  toolsList.innerHTML = "";
  const inactiveTools = data.tools.filter(t => !t.isActive);
  
  if (inactiveTools.length === 0) {
    toolsList.innerHTML = `<div class="dropdown-empty">All tools loaded</div>`;
  } else {
    inactiveTools.forEach(tool => {
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.textContent = tool.name;
      btn.addEventListener("click", () => addCapability("tool", tool.name));
      toolsList.appendChild(btn);
    });
  }

  // 3. Plugins Dropdown
  const pluginsList = document.getElementById("dropdown-plugins-list");
  pluginsList.innerHTML = "";
  const inactivePlugins = data.plugins.filter(p => !p.isActive);
  
  if (inactivePlugins.length === 0) {
    pluginsList.innerHTML = `<div class="dropdown-empty">All plugins loaded</div>`;
  } else {
    inactivePlugins.forEach(plugin => {
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.textContent = plugin.name;
      btn.addEventListener("click", () => addCapability("plugin", plugin.name));
      pluginsList.appendChild(btn);
    });
  }
}

async function addCapability(type, name) {
  try {
    const response = await fetch(`${API_BASE}/capabilities/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name })
    });
    if (!response.ok) throw new Error("Load failed");
    
    // Reload capabilities grid & lists
    loadCapabilities();
  } catch (err) {
    alert(`Error loading ${type} "${name}": ${err.message}`);
  }
}

/* ==========================================================================
   7. MODEL PROVIDER & GGUF LORA MANAGEMENT
   ========================================================================== */
const GGUF_API_BASE = "http://127.0.0.1:5001/api/gguf";

function initProviderSelector() {
  const providerSelect = document.getElementById("provider-select");
  if (!providerSelect) return;

  providerSelect.addEventListener("change", async () => {
    const selectedProvider = providerSelect.value;
    try {
      const response = await fetch(`${API_BASE}/providers/switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider })
      });
      if (!response.ok) {
        throw new Error("Failed to switch provider");
      }
      const data = await response.json();
      console.log("[Provider] Switched to:", data.active);
      updateProviderView(data.active);
    } catch (err) {
      alert("Error switching provider: " + err.message);
      // Revert select value
      loadProviders();
    }
  });

  // Hook LoRA buttons
  const btnAttach = document.getElementById("btn-lora-attach");
  const btnDetach = document.getElementById("btn-lora-detach");

  if (btnAttach) {
    btnAttach.addEventListener("click", async () => {
      const loraSelect = document.getElementById("lora-select");
      const selectedLora = loraSelect.value;
      if (!selectedLora) {
        alert("Please select a LoRA adapter first.");
        return;
      }
      try {
        btnAttach.disabled = true;
        addLiveActivity(`🔌 Requesting LoRA attach: ${selectedLora}`, "blue");
        const response = await fetch(`${GGUF_API_BASE}/lora/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "attach", path: selectedLora })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to attach LoRA");
        }
        addLiveActivity(`✅ LoRA attached: ${selectedLora}`, "green");
        await loadGGUFStatus();
      } catch (err) {
        alert("Error attaching LoRA: " + err.message);
        addLiveActivity(`❌ LoRA attach failed: ${err.message}`, "red");
      } finally {
        btnAttach.disabled = false;
      }
    });
  }

  if (btnDetach) {
    btnDetach.addEventListener("click", async () => {
      try {
        btnDetach.disabled = true;
        addLiveActivity("🔌 Requesting LoRA detach", "blue");
        const response = await fetch(`${GGUF_API_BASE}/lora/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "detach" })
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to detach LoRA");
        }
        addLiveActivity("✅ LoRA detached successfully", "green");
        await loadGGUFStatus();
      } catch (err) {
        alert("Error detaching LoRA: " + err.message);
        addLiveActivity(`❌ LoRA detach failed: ${err.message}`, "red");
      } finally {
        btnDetach.disabled = false;
      }
    });
  }

  // Load initial providers
  loadProviders();
}

async function loadProviders() {
  try {
    const response = await fetch(`${API_BASE}/providers`);
    if (!response.ok) throw new Error("Failed to fetch providers");
    const data = await response.json();
    
    const providerSelect = document.getElementById("provider-select");
    if (!providerSelect) return;
    
    providerSelect.innerHTML = "";
    data.list.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      if (p === data.active) {
        opt.selected = true;
      }
      providerSelect.appendChild(opt);
    });

    updateProviderView(data.active);
  } catch (err) {
    console.error("Error loading providers:", err);
  }
}

function updateProviderView(activeProvider) {
  const ggufControls = document.getElementById("gguf-controls");
  if (ggufControls) {
    if (activeProvider === "local/gguf") {
      ggufControls.classList.remove("hidden");
      loadGGUFStatus();
    } else {
      ggufControls.classList.add("hidden");
    }
  }

  const footerProvider = document.getElementById("footer-active-provider");
  if (footerProvider) {
    footerProvider.textContent = activeProvider;
  }
}

async function loadGGUFStatus() {
  try {
    const response = await fetch(`${GGUF_API_BASE}/lora/status`);
    if (!response.ok) throw new Error("Failed to fetch GGUF status");
    const status = await response.json();

    // Update UI elements
    const statusDot = document.getElementById("gguf-status-dot");
    const statusText = document.getElementById("gguf-status-text");
    const loraCurrentStatus = document.getElementById("lora-current-status");
    const loraSelect = document.getElementById("lora-select");

    // Since we are checking status and it succeeded, the server is online
    if (statusDot) {
      statusDot.className = "status-dot online";
    }
    if (statusText) {
      statusText.textContent = "GGUF Model Server Online";
    }

    if (loraCurrentStatus) {
      if (status.attached && status.active_lora) {
        loraCurrentStatus.textContent = status.active_lora;
        loraCurrentStatus.className = "lora-badge"; // cyan active badge
      } else {
        loraCurrentStatus.textContent = "No Adapter Attached (Base Model)";
        loraCurrentStatus.className = "lora-badge text-secondary";
      }
    }

    if (loraSelect) {
      const prevVal = loraSelect.value;
      loraSelect.innerHTML = '<option value="" disabled selected>Select LoRA...</option>';
      status.available_loras.forEach(lora => {
        const opt = document.createElement("option");
        opt.value = lora;
        opt.textContent = lora;
        if (lora === status.active_lora) {
          opt.selected = true;
        }
        loraSelect.appendChild(opt);
      });
      // If none was active but there was a previous selection, restore it if it's still available
      if (!status.active_lora && prevVal && status.available_loras.includes(prevVal)) {
        loraSelect.value = prevVal;
      }
    }

  } catch (err) {
    console.error("GGUF status load failed:", err);
    const statusDot = document.getElementById("gguf-status-dot");
    const statusText = document.getElementById("gguf-status-text");
    const loraCurrentStatus = document.getElementById("lora-current-status");

    if (statusDot) {
      statusDot.className = "status-dot offline";
    }
    if (statusText) {
      statusText.textContent = "GGUF Model Server Offline";
    }
    if (loraCurrentStatus) {
      loraCurrentStatus.textContent = "Connection Refused";
      loraCurrentStatus.className = "lora-badge error";
    }
  }
}

/* ==========================================================================
   8. UNIFIED SIDEBAR ACTIONS & SEARCH FILTER
   ========================================================================== */
function initUnifiedActions() {
  // Session Search Filter
  const searchInput = document.getElementById("session-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll(".session-item").forEach(item => {
        const name = item.querySelector(".session-name").textContent.toLowerCase();
        if (name.includes(query)) {
          item.style.display = "flex";
        } else {
          item.style.display = "none";
        }
      });
    });
  }

  // Copy Session ID
  const btnCopySessionId = document.getElementById("btn-copy-session-id");
  if (btnCopySessionId) {
    btnCopySessionId.addEventListener("click", () => {
      if (!activeSessionId) return;
      navigator.clipboard.writeText(activeSessionId);
      
      const originalSvg = btnCopySessionId.innerHTML;
      btnCopySessionId.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      setTimeout(() => {
        btnCopySessionId.innerHTML = originalSvg;
      }, 1500);
    });
  }

  // Rename Session
  const btnRenameSession = document.getElementById("btn-rename-session");
  if (btnRenameSession) {
    btnRenameSession.addEventListener("click", () => {
      if (!activeSessionId) return;
      const currentName = document.getElementById("active-session-title")?.textContent || `Session ${activeSessionId.split('_').pop()}`;
      renameSession(activeSessionId, currentName);
    });
  }

  // Export Session History
  const btnExportSession = document.getElementById("btn-export-session");
  if (btnExportSession) {
    btnExportSession.addEventListener("click", async () => {
      if (!activeSessionId) return;
      try {
        const response = await fetch(`${API_BASE}/sessions/active`);
        if (!response.ok) throw new Error("Failed to load active session");
        const sessionDetails = await response.json();
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionDetails, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `session_${activeSessionId}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } catch (err) {
        alert("Failed to export session: " + err.message);
      }
    });
  }

  // Clear Message Bubbles
  const btnClearMessages = document.getElementById("btn-clear-messages");
  if (btnClearMessages) {
    btnClearMessages.addEventListener("click", () => {
      if (confirm("Clear messages from the current view?")) {
        document.getElementById("chat-messages").innerHTML = "";
      }
    });
  }

  // Delete Session (Right Panel Button)
  const btnDeleteSessionRight = document.getElementById("btn-delete-session-right");
  if (btnDeleteSessionRight) {
    btnDeleteSessionRight.addEventListener("click", async () => {
      if (!activeSessionId) return;
      const currentName = document.getElementById("active-session-title")?.textContent || "the active session";
      await deleteSession(activeSessionId, currentName);
    });
  }

  // Delete All Sessions (Danger Zone)
  const btnDeleteAllSessions = document.getElementById("btn-delete-all-sessions");
  if (btnDeleteAllSessions) {
    btnDeleteAllSessions.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete ALL sessions? This cannot be undone.")) {
        try {
          const res = await fetch(`${API_BASE}/sessions`);
          if (!res.ok) throw new Error("Could not list sessions");
          const { sessions } = await res.json();
          for (const s of sessions) {
            await fetch(`${API_BASE}/sessions/delete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: s.sessionId })
            });
            localStorage.removeItem(`display_name_${s.sessionId}`);
          }
          await refreshSessionViews();
          await loadActiveSession();
        } catch (err) {
          alert("Error deleting sessions: " + err.message);
        }
      }
    });
  }

  // Accordion Toggles
  const accordions = document.querySelectorAll(".details-accordion");
  accordions.forEach(acc => {
    const header = acc.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      acc.classList.toggle("active");
    });
  });

  // Hotkey listener for new session (Cmd+N / Ctrl+N)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      const newSessionBtn = document.getElementById("btn-new-session");
      if (newSessionBtn && !newSessionBtn.disabled) {
        newSessionBtn.click();
      }
    }
  });

  // Theme Switcher stub
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      alert("Theme is optimized for AEGIS Clinical and Medical Dark UI aesthetics.");
    });
  }

  // Empty Trash
  const btnEmptyTrash = document.getElementById("btn-empty-trash");
  if (btnEmptyTrash) {
    btnEmptyTrash.addEventListener("click", async () => {
      if (confirm("Are you sure you want to permanently empty the trash? This cannot be undone.")) {
        try {
          const response = await fetch(`${API_BASE}/trash/empty`, { method: 'POST' });
          if (!response.ok) throw new Error("Empty trash failed");
          await refreshSessionViews();
        } catch (err) {
          alert("Error emptying trash: " + err.message);
        }
      }
    });
  }
}

/* ==========================================================================
   9. INTERACTIVE SESSIONS & TRASH MANAGEMENT RENDERING
   ========================================================================== */
async function loadSessionsIndex() {
  try {
    const response = await fetch(`${API_BASE}/sessions`);
    if (!response.ok) throw new Error("Failed to load sessions");
    const { sessions } = await response.json();
    
    const tbody = document.getElementById("sessions-index-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-gray-3);">No active sessions found.</td></tr>`;
      return;
    }
    
    sessions.forEach(session => {
      const name = getStoredSessionName(session);
      
      const formattedDate = new Date(session.updatedAt || session.createdAt).toLocaleString();
      const isCurrent = session.sessionId === activeSessionId;
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(name)}</td>
        <td style="font-family: monospace; font-size: 11px; color: var(--text-gray-3);">${escapeHtml(session.sessionId)}</td>
        <td style="color: var(--text-gray-2); font-size: 12px;">${escapeHtml(formattedDate)}</td>
        <td>
          <span class="status-chip" style="display: inline-flex; border: none; padding: 2px 8px; font-size: 10px;">
            <span class="status-indicator-dot" style="background: ${isCurrent ? 'var(--accent-green)' : 'var(--text-gray-3)'};"></span>
            ${isCurrent ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary-action btn-sm" onclick="checkoutSession('${session.sessionId}')" style="height: 24px; font-size: 11px; padding: 0 8px;">Checkout</button>
            <button class="btn-secondary-action btn-sm" onclick="renameSessionFromIndex('${session.sessionId}')" style="height: 24px; font-size: 11px; padding: 0 8px;">Rename</button>
            <button class="btn-danger btn-sm" onclick="deleteSessionFromIndex('${session.sessionId}')" style="height: 24px; font-size: 11px; padding: 0 8px;">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

window.renameSessionFromIndex = async function(sessionId) {
  const row = document.querySelector(`#sessions-index-tbody button[onclick="renameSessionFromIndex('${sessionId}')"]`)?.closest("tr");
  const currentName = row?.querySelector("td")?.textContent || `Session ${sessionId.split('_').pop()}`;
  await renameSession(sessionId, currentName);
}

window.deleteSessionFromIndex = async function(sessionId) {
  const row = document.querySelector(`#sessions-index-tbody button[onclick="deleteSessionFromIndex('${sessionId}')"]`)?.closest("tr");
  const name = row?.querySelector("td")?.textContent || "this session";
  await deleteSession(sessionId, name);
}

async function loadTrash() {
  try {
    const response = await fetch(`${API_BASE}/trash`);
    if (!response.ok) throw new Error("Failed to load trash");
    const { sessions } = await response.json();
    
    const tbody = document.getElementById("trash-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (sessions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-gray-3);">Trash is empty.</td></tr>`;
      return;
    }
    
    sessions.forEach(session => {
      const name = getStoredSessionName(session);
      
      const formattedDate = session.deletedAt ? new Date(session.deletedAt).toLocaleString() : (session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—');
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight: 600;">${escapeHtml(name)}</td>
        <td style="font-family: monospace; font-size: 11px; color: var(--text-gray-3);">${escapeHtml(session.sessionId)}</td>
        <td style="color: var(--text-gray-2); font-size: 12px;">${escapeHtml(formattedDate)}</td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary-action btn-sm" onclick="restoreTrashSession('${session.sessionId}')" style="height: 24px; font-size: 11px; padding: 0 8px;">Restore</button>
            <button class="btn-danger btn-sm" onclick="deleteTrashSessionPermanently('${session.sessionId}')" style="height: 24px; font-size: 11px; padding: 0 8px;">Delete Permanently</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

window.restoreTrashSession = async function(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/trash/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!response.ok) throw new Error("Restore failed");
    await refreshSessionViews();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

window.deleteTrashSessionPermanently = async function(sessionId) {
  if (confirm("Are you sure you want to permanently delete this session? This action cannot be undone.")) {
    try {
      const response = await fetch(`${API_BASE}/trash/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (!response.ok) throw new Error("Delete failed");
      localStorage.removeItem(`display_name_${sessionId}`);
      await refreshSessionViews();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
}

function initSidebarToggles() {
  const appContainer = document.getElementById("app-container");
  const btnToggleLeft = document.getElementById("btn-toggle-left-sidebar");
  const btnToggleRight = document.getElementById("btn-toggle-right-sidebar");

  if (!appContainer) return;

  // Restore states
  const leftCollapsed = localStorage.getItem("left_sidebar_collapsed") === "true";
  const rightCollapsed = localStorage.getItem("right_sidebar_collapsed") === "true";

  if (leftCollapsed) {
    appContainer.classList.add("collapsed-left");
  }
  if (rightCollapsed) {
    appContainer.classList.add("collapsed-right");
  }

  // Toggle Left
  if (btnToggleLeft) {
    btnToggleLeft.addEventListener("click", () => {
      appContainer.classList.toggle("collapsed-left");
      const isCollapsed = appContainer.classList.contains("collapsed-left");
      localStorage.setItem("left_sidebar_collapsed", isCollapsed);
    });
  }

  // Toggle Right
  if (btnToggleRight) {
    btnToggleRight.addEventListener("click", () => {
      appContainer.classList.toggle("collapsed-right");
      const isCollapsed = appContainer.classList.contains("collapsed-right");
      localStorage.setItem("right_sidebar_collapsed", isCollapsed);
    });
  }
}
