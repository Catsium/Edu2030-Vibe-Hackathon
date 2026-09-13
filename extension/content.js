const STORAGE_KEY = "verityStudentProfile";
const SUBJECT_NAMES = [
  "Design & Technology",
  "Science",
  "Math",
  "English",
  "Art",
  "History"
];
const EXPOSURE_TYPES = [
  "Project",
  "Competition",
  "Workshop",
  "Internship / Job Shadowing",
  "Course",
  "Other"
];
const SKILL_NAMES = [
  "Hands-on ability",
  "Sequential problem solving",
  "Pattern recognition / application of concepts",
  "Communication",
  "Creativity",
  "Critical analysis"
];
const SIGNAL_GROUPS = [
  {
    name: "Engineering / technology",
    subjects: ["Design & Technology", "Math", "Science"],
    skills: ["Hands-on ability", "Sequential problem solving", "Pattern recognition / application of concepts"],
    keywords: ["engineering", "technology", "robot", "arduino", "programming", "coding", "prototype", "maker", "stem", "technical"]
  },
  {
    name: "Creative / design",
    subjects: ["Art", "Design & Technology"],
    skills: ["Creativity", "Communication"],
    keywords: ["art", "design", "creative", "media", "architecture", "illustration", "photography"]
  },
  {
    name: "Communication / humanities",
    subjects: ["English", "History"],
    skills: ["Communication", "Critical analysis"],
    keywords: ["writing", "debate", "journalism", "museum", "history", "public speaking", "presentation", "communication"]
  }
];

let studentProfile = createEmptyProfile();
let currentView = "home";
let currentOpportunities = [];
let currentOpportunityMessage = "";
let busy = false;

function makeId() {
  if (self.crypto && typeof self.crypto.randomUUID === "function") {
    return self.crypto.randomUUID();
  }
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function createEmptyProfile() {
  return {
    version: 1,
    evidence: {
      isDemoData: false,
      updatedAt: "",
      subjects: SUBJECT_NAMES.map(function (name) {
        return { name: name, score: null, topics: [] };
      }),
      projects: [],
      interests: ""
    },
    skillProfile: null,
    careers: null
  };
}

function byId(id) {
  return document.getElementById(id);
}

function addText(parent, tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  parent.appendChild(node);
  return node;
}

function storageGet() {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.get([STORAGE_KEY], function (result) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result[STORAGE_KEY]);
    });
  });
}

function storageSet() {
  return new Promise(function (resolve, reject) {
    chrome.storage.local.set({ [STORAGE_KEY]: studentProfile }, function () {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

function normalizeProfile(saved) {
  const profile = createEmptyProfile();
  if (!saved || typeof saved !== "object") {
    return profile;
  }

  const evidence = saved.evidence && typeof saved.evidence === "object" ? saved.evidence : saved;
  profile.evidence.isDemoData = Boolean(evidence.isDemoData);
  profile.evidence.updatedAt = typeof evidence.updatedAt === "string" ? evidence.updatedAt : "";
  profile.evidence.interests = typeof evidence.interests === "string" ? evidence.interests : "";

  const savedSubjects = Array.isArray(evidence.subjects) ? evidence.subjects : [];
  profile.evidence.subjects = SUBJECT_NAMES.map(function (name) {
    const source = savedSubjects.find(function (subject) {
      return subject && subject.name === name;
    });
    const topics = source && Array.isArray(source.topics) ? source.topics : [];
    return {
      name: name,
      score: source && source.score !== undefined && source.score !== null ? source.score : null,
      topics: topics.map(function (topic) {
        return {
          id: topic && topic.id ? String(topic.id) : makeId(),
          name: topic && typeof topic.name === "string" ? topic.name : "",
          score: topic && topic.score !== undefined && topic.score !== null ? topic.score : ""
        };
      })
    };
  });

  const savedProjects = Array.isArray(evidence.projects) ? evidence.projects : [];
  profile.evidence.projects = savedProjects.map(function (project) {
    return {
      id: project && project.id ? String(project.id) : makeId(),
      name: project && typeof project.name === "string" ? project.name : "",
      type: project && typeof project.type === "string" ? project.type : "Project",
      description: project && typeof project.description === "string" ? project.description : ""
    };
  });

  if (saved.skillProfile && Array.isArray(saved.skillProfile.skills)) {
    profile.skillProfile = saved.skillProfile;
  }
  if (saved.careers && Array.isArray(saved.careers.pathways)) {
    profile.careers = saved.careers;
  }
  return profile;
}

function runtimeUrl(path) {
  return chrome.runtime.getURL(path);
}

function setStatus(id, message, type) {
  const node = byId(id);
  if (!node) {
    return;
  }
  node.textContent = message || "";
  node.className = "inline-status" + (type ? " " + type : "");
}

function setBusy(value) {
  busy = value;
  const mascot = byId("verity-header-mascot");
  if (mascot) {
    mascot.src = runtimeUrl(value ? "mascot/anim/14s_idle_to_loading.gif" : "mascot/static/verity.jpeg");
    mascot.alt = value ? "Verity is working" : "Verity";
  }
  [
    "save-evidence-button",
    "analyse-profile-button",
    "load-demo-data-button",
    "find-careers-button",
    "find-opportunities-button",
    "add-project-button"
  ].forEach(function (id) {
    const button = byId(id);
    if (button) {
      button.disabled = value;
    }
  });
}

function navigate(view) {
  currentView = view;
  document.querySelectorAll("#classroom-assistant-container .verity-view").forEach(function (section) {
    section.hidden = section.id !== "view-" + view;
  });
  document.querySelectorAll("#classroom-assistant-container .verity-nav-button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function setBadge(id, visible) {
  const badge = byId(id);
  if (badge) {
    badge.hidden = !visible;
  }
}

function renderDataInput() {
  const subjectsEditor = byId("subjects-editor");
  const projectsEditor = byId("projects-editor");
  const interests = byId("interests-input");
  if (!subjectsEditor || !projectsEditor || !interests) {
    return;
  }

  subjectsEditor.replaceChildren();
  studentProfile.evidence.subjects.forEach(function (subject, subjectIndex) {
    const card = addText(subjectsEditor, "article", "subject-card");
    const header = addText(card, "div", "subject-card-header");
    addText(header, "h3", null, subject.name);

    const scoreInput = document.createElement("input");
    scoreInput.className = "score-input";
    scoreInput.type = "number";
    scoreInput.min = "0";
    scoreInput.max = "100";
    scoreInput.step = "1";
    scoreInput.placeholder = "0–100";
    scoreInput.value = subject.score === null || subject.score === undefined ? "" : subject.score;
    scoreInput.dataset.subjectIndex = String(subjectIndex);
    scoreInput.dataset.field = "score";
    scoreInput.setAttribute("aria-label", subject.name + " score");
    header.appendChild(scoreInput);

    const topicHeading = addText(card, "div", "topics-heading");
    addText(topicHeading, "span", null, "Topics");
    const addTopic = addText(topicHeading, "button", "small-button", "+ Add topic");
    addTopic.type = "button";
    addTopic.dataset.action = "add-topic";
    addTopic.dataset.subjectIndex = String(subjectIndex);

    if (!subject.topics.length) {
      addText(card, "p", "empty-copy", "No topics recorded yet.");
    }

    subject.topics.forEach(function (topic) {
      const row = addText(card, "div", "topic-row");
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.placeholder = "Topic name";
      nameInput.value = topic.name;
      nameInput.dataset.subjectIndex = String(subjectIndex);
      nameInput.dataset.topicId = topic.id;
      nameInput.dataset.field = "name";
      nameInput.setAttribute("aria-label", "Topic name");
      row.appendChild(nameInput);

      const topicScore = document.createElement("input");
      topicScore.type = "number";
      topicScore.min = "0";
      topicScore.max = "100";
      topicScore.step = "1";
      topicScore.placeholder = "Score";
      topicScore.value = topic.score === null || topic.score === undefined ? "" : topic.score;
      topicScore.dataset.subjectIndex = String(subjectIndex);
      topicScore.dataset.topicId = topic.id;
      topicScore.dataset.field = "score";
      topicScore.setAttribute("aria-label", "Topic score");
      row.appendChild(topicScore);

      const remove = addText(row, "button", "icon-button", "×");
      remove.type = "button";
      remove.title = "Delete topic";
      remove.dataset.action = "delete-topic";
      remove.dataset.subjectIndex = String(subjectIndex);
      remove.dataset.topicId = topic.id;
    });
  });

  projectsEditor.replaceChildren();
  if (!studentProfile.evidence.projects.length) {
    addText(projectsEditor, "p", "empty-copy", "No projects or exposure have been recorded yet.");
  }
  studentProfile.evidence.projects.forEach(function (project) {
    const row = addText(projectsEditor, "div", "project-editor-card");
    const name = document.createElement("input");
    name.type = "text";
    name.placeholder = "Name";
    name.value = project.name;
    name.dataset.projectId = project.id;
    name.dataset.field = "name";
    name.setAttribute("aria-label", "Project or exposure name");
    row.appendChild(name);

    const type = document.createElement("select");
    type.dataset.projectId = project.id;
    type.dataset.field = "type";
    type.setAttribute("aria-label", "Project or exposure type");
    EXPOSURE_TYPES.forEach(function (optionValue) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = optionValue === project.type;
      type.appendChild(option);
    });
    row.appendChild(type);

    const description = document.createElement("textarea");
    description.rows = 2;
    description.placeholder = "Short description";
    description.value = project.description;
    description.dataset.projectId = project.id;
    description.dataset.field = "description";
    description.setAttribute("aria-label", "Project or exposure description");
    row.appendChild(description);

    const remove = addText(row, "button", "icon-button", "×");
    remove.type = "button";
    remove.title = "Delete record";
    remove.dataset.action = "delete-project";
    remove.dataset.projectId = project.id;
  });
  interests.value = studentProfile.evidence.interests;
  setBadge("data-demo-badge", studentProfile.evidence.isDemoData);
}

function renderHome() {
  const subjectsNode = byId("home-strong-subjects");
  const skillsNode = byId("home-strong-skills");
  const countNode = byId("home-project-count");
  if (!subjectsNode || !skillsNode || !countNode) {
    return;
  }

  subjectsNode.replaceChildren();
  const strongSubjects = studentProfile.evidence.subjects
    .filter(function (subject) { return Number.isInteger(Number(subject.score)) && Number(subject.score) >= 70; })
    .sort(function (a, b) { return Number(b.score) - Number(a.score); })
    .slice(0, 3);
  if (!strongSubjects.length) {
    addText(subjectsNode, "span", "empty-copy", "No strong subject evidence yet.");
  } else {
    strongSubjects.forEach(function (subject) {
      addText(subjectsNode, "span", null, subject.name + " · " + subject.score + "/100");
    });
  }

  skillsNode.replaceChildren();
  const strongSkills = studentProfile.skillProfile && Array.isArray(studentProfile.skillProfile.skills)
    ? studentProfile.skillProfile.skills
      .filter(function (skill) { return Number(skill.score) >= 70; })
      .sort(function (a, b) { return Number(b.score) - Number(a.score); })
      .slice(0, 3)
    : [];
  if (!strongSkills.length) {
    addText(skillsNode, "span", "empty-copy", "Analyse evidence to infer skills.");
  } else {
    strongSkills.forEach(function (skill) {
      addText(skillsNode, "span", null, skill.name + " · " + skill.score + "/100");
    });
  }

  countNode.textContent = String(studentProfile.evidence.projects.length);
  setBadge("home-demo-badge", studentProfile.evidence.isDemoData);
  renderSignalInto(byId("home-signal"));
}

function renderRecords() {
  const subjectsNode = byId("records-subjects");
  const skillsNode = byId("records-skills");
  const strengthsNode = byId("records-strengths");
  const projectsNode = byId("records-projects");
  if (!subjectsNode || !skillsNode || !strengthsNode || !projectsNode) {
    return;
  }

  subjectsNode.replaceChildren();
  studentProfile.evidence.subjects.forEach(function (subject) {
    const card = addText(subjectsNode, "article", "record-card");
    const heading = addText(card, "div", "skill-card-header");
    addText(heading, "h3", null, subject.name);
    addText(heading, "span", "record-score", validScore(subject.score) ? subject.score + "/100" : "Not recorded");
    if (!subject.topics.length) {
      addText(card, "p", "empty-copy", "No topic scores recorded.");
    } else {
      const list = addText(card, "ul", "topic-list");
      subject.topics.forEach(function (topic) {
        addText(list, "li", null, topic.name + " — " + (validScore(topic.score) ? topic.score + "/100" : "Not recorded"));
      });
    }
  });

  skillsNode.replaceChildren();
  const skills = studentProfile.skillProfile && Array.isArray(studentProfile.skillProfile.skills)
    ? studentProfile.skillProfile.skills
    : [];
  if (!skills.length) {
    addText(skillsNode, "p", "empty-copy", "Analyse your saved evidence to generate all six inferred skills.");
  } else {
    skills.forEach(function (skill) {
      const card = addText(skillsNode, "article", "skill-card");
      const heading = addText(card, "div", "skill-card-header");
      addText(heading, "h3", null, skill.name);
      addText(heading, "span", "record-score", skill.score + "/100");
      const track = addText(card, "div", "progress-track");
      const fill = addText(track, "div", "progress-fill");
      fill.style.width = Math.max(0, Math.min(100, Number(skill.score))) + "%";
      addText(card, "p", "skill-reason", skill.reason);
      const details = document.createElement("details");
      addText(details, "summary", null, "Evidence used");
      const evidenceList = addText(details, "ul", "evidence-list");
      (Array.isArray(skill.evidence) ? skill.evidence : []).forEach(function (evidence) {
        addText(evidenceList, "li", null, evidence);
      });
      card.appendChild(details);
    });
  }

  strengthsNode.replaceChildren();
  const strengths = [];
  studentProfile.evidence.subjects.forEach(function (subject) {
    if (validScore(subject.score) && Number(subject.score) >= 70) {
      strengths.push({ title: subject.name, detail: subject.score + "/100 subject evidence" });
    }
  });
  skills.filter(function (skill) { return Number(skill.score) >= 70; }).forEach(function (skill) {
    strengths.push({ title: skill.name, detail: skill.score + "/100 inferred skill evidence" });
  });
  if (!strengths.length) {
    addText(strengthsNode, "p", "empty-copy", "No demonstrated strengths at 70+ yet.");
  } else {
    strengths.forEach(function (strength) {
      const item = addText(strengthsNode, "div", "strength-item");
      item.textContent = strength.title + " ";
      addText(item, "span", null, "— " + strength.detail);
    });
  }

  projectsNode.replaceChildren();
  if (!studentProfile.evidence.projects.length) {
    addText(projectsNode, "p", "empty-copy", "No projects or exposure have been recorded yet.");
  } else {
    studentProfile.evidence.projects.forEach(function (project) {
      const card = addText(projectsNode, "article", "exposure-card");
      const heading = addText(card, "div", "skill-card-header");
      addText(heading, "h3", null, project.name);
      addText(heading, "span", "tag", project.type);
      addText(card, "p", null, project.description);
    });
  }
  setBadge("records-demo-badge", studentProfile.evidence.isDemoData);
  renderSignalInto(byId("records-signal"));
}

function renderSignalInto(node) {
  if (!node) {
    return;
  }
  node.replaceChildren();
  const signals = getExposureSignals();
  if (!signals.length) {
    if (node.id === "records-signal") {
      addText(node, "p", "empty-copy", "No high-potential/low-exposure signal is currently shown.");
      node.hidden = false;
    } else {
      node.hidden = true;
    }
    return;
  }
  node.hidden = false;
  signals.forEach(function (signal) {
    const card = addText(node, "div", "signal-card");
    addText(card, "strong", null, "High potential, low exposure · " + signal.name);
    addText(card, "p", null, signal.reason + " Demo signal — not an official assessment.");
  });
}

function renderCareers() {
  const pathwaysNode = byId("pathways-list");
  const opportunitiesNode = byId("opportunities-list");
  if (!pathwaysNode || !opportunitiesNode) {
    return;
  }

  pathwaysNode.replaceChildren();
  const pathways = studentProfile.careers && Array.isArray(studentProfile.careers.pathways)
    ? studentProfile.careers.pathways
    : [];
  if (!pathways.length) {
    addText(pathwaysNode, "p", "empty-copy", "Analyse your profile, then find pathways worth exploring.");
  } else {
    pathways.forEach(function (pathway) {
      const card = addText(pathwaysNode, "article", "pathway-card");
      addText(card, "h3", null, pathway.name);
      addText(card, "p", null, pathway.reason);
      const tags = addText(card, "div", "tag-row");
      (Array.isArray(pathway.matchedSubjects) ? pathway.matchedSubjects : []).forEach(function (tag) {
        addText(tags, "span", "tag", tag);
      });
      (Array.isArray(pathway.matchedSkills) ? pathway.matchedSkills : []).forEach(function (tag) {
        addText(tags, "span", "tag", tag);
      });
    });
  }

  opportunitiesNode.replaceChildren();
  if (currentOpportunityMessage) {
    addText(opportunitiesNode, "p", "empty-copy", currentOpportunityMessage);
    return;
  }
  if (!currentOpportunities.length) {
    addText(opportunitiesNode, "p", "empty-copy", "Find pathways first, then search for current opportunities.");
    return;
  }
  currentOpportunities.forEach(function (opportunity) {
    const card = addText(opportunitiesNode, "article", "opportunity-card");
    addText(card, "h3", null, opportunity.title);
    addText(card, "p", null, opportunity.organisation);
    addText(card, "p", null, opportunity.summary);
    addText(card, "p", null, opportunity.whyMatched);
    const meta = addText(card, "div", "opportunity-meta");
    if (opportunity.deadline) {
      addText(meta, "span", null, "Deadline: " + opportunity.deadline);
    }
    if (opportunity.eligibility) {
      addText(meta, "span", null, "Eligibility: " + opportunity.eligibility);
    }
    if (safeHttpUrl(opportunity.url)) {
      const link = addText(card, "a", null, "View source");
      link.href = opportunity.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
}

function renderAll() {
  renderDataInput();
  renderHome();
  renderRecords();
  renderCareers();
  navigate(currentView);
}

function validScore(value) {
  return value !== "" && value !== null && value !== undefined &&
    Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
}

function markEvidenceDirty() {
  studentProfile.skillProfile = null;
  studentProfile.careers = null;
  currentOpportunities = [];
  currentOpportunityMessage = "";
}

function validateEvidence() {
  for (const subject of studentProfile.evidence.subjects) {
    if (!validScore(subject.score)) {
      return subject.name + " needs a whole-number score from 0 to 100.";
    }
    for (const topic of subject.topics) {
      if (!String(topic.name || "").trim()) {
        return "Every topic needs a name.";
      }
      if (!validScore(topic.score)) {
        return "Topic scores must be whole numbers from 0 to 100.";
      }
    }
  }
  for (const project of studentProfile.evidence.projects) {
    if (!String(project.name || "").trim()) {
      return "Every project or exposure record needs a name.";
    }
    if (!EXPOSURE_TYPES.includes(project.type)) {
      return "Choose a valid project or exposure type.";
    }
    if (!String(project.description || "").trim()) {
      return "Every project or exposure record needs a short description.";
    }
  }
  return "";
}

function cleanEvidence() {
  return {
    isDemoData: studentProfile.evidence.isDemoData,
    updatedAt: new Date().toISOString(),
    subjects: studentProfile.evidence.subjects.map(function (subject) {
      return {
        name: subject.name,
        score: Number(subject.score),
        topics: subject.topics.map(function (topic) {
          return { id: topic.id, name: String(topic.name).trim(), score: Number(topic.score) };
        })
      };
    }),
    projects: studentProfile.evidence.projects.map(function (project) {
      return {
        id: project.id,
        name: String(project.name).trim(),
        type: project.type,
        description: String(project.description).trim()
      };
    }),
    interests: String(studentProfile.evidence.interests || "").trim()
  };
}

function evidencePayload() {
  return {
    subjects: studentProfile.evidence.subjects.map(function (subject) {
      return {
        name: subject.name,
        score: Number(subject.score),
        topics: subject.topics.map(function (topic) {
          return { name: topic.name, score: Number(topic.score) };
        })
      };
    }),
    projects: studentProfile.evidence.projects.map(function (project) {
      return {
        name: project.name,
        type: project.type,
        description: project.description
      };
    }),
    interests: studentProfile.evidence.interests
  };
}

async function persistEvidence() {
  const error = validateEvidence();
  if (error) {
    throw new Error(error);
  }
  studentProfile.evidence = cleanEvidence();
  studentProfile.skillProfile = null;
  studentProfile.careers = null;
  currentOpportunities = [];
  currentOpportunityMessage = "";
  await storageSet();
  renderAll();
}

function requestBackend(endpoint, payload) {
  return new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage({
      type: "VERITY_API_REQUEST",
      endpoint: endpoint,
      payload: payload
    }, function (response) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response || !response.ok) {
        reject(new Error(response && response.error ? response.error : "The backend did not respond."));
        return;
      }
      resolve(response.data);
    });
  });
}

function validateProfileResponse(data) {
  if (!data || !Array.isArray(data.skills) || data.skills.length !== SKILL_NAMES.length) {
    throw new Error("The profile response did not contain all six skills.");
  }
  const names = data.skills.map(function (skill) { return skill && skill.name; });
  if (new Set(names).size !== SKILL_NAMES.length || SKILL_NAMES.some(function (name) { return !names.includes(name); })) {
    throw new Error("The profile response contained an unexpected skill set.");
  }
  data.skills.forEach(function (skill) {
    if (!skill || !validScore(skill.score) || !String(skill.reason || "").trim() ||
      !Array.isArray(skill.evidence) || skill.evidence.some(function (item) { return typeof item !== "string"; })) {
      throw new Error("The profile response contained an invalid skill.");
    }
  });
}

function validateCareerResponse(data) {
  if (!data || !Array.isArray(data.pathways) || data.pathways.length < 3 || data.pathways.length > 5) {
    throw new Error("The careers response did not contain 3 to 5 pathways.");
  }
  data.pathways.forEach(function (pathway) {
    if (!pathway || !String(pathway.name || "").trim() || !String(pathway.reason || "").trim() ||
      !Array.isArray(pathway.matchedSubjects) || !Array.isArray(pathway.matchedSkills)) {
      throw new Error("The careers response contained an invalid pathway.");
    }
  });
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function getExposureSignals() {
  const exposureText = studentProfile.evidence.projects
    .map(function (project) {
      return (project.name + " " + project.type + " " + project.description).toLowerCase();
    })
    .join(" ");
  return SIGNAL_GROUPS.filter(function (group) {
    const strongSubjects = studentProfile.evidence.subjects.filter(function (subject) {
      return group.subjects.includes(subject.name) && validScore(subject.score) && Number(subject.score) >= 70;
    }).length;
    const strongSkills = studentProfile.skillProfile && Array.isArray(studentProfile.skillProfile.skills)
      ? studentProfile.skillProfile.skills.filter(function (skill) {
        return group.skills.includes(skill.name) && Number(skill.score) >= 70;
      }).length
      : 0;
    const hasMatchingExposure = group.keywords.some(function (keyword) {
      return exposureText.includes(keyword);
    });
    return strongSubjects + strongSkills >= 2 && !hasMatchingExposure;
  }).map(function (group) {
    return {
      name: group.name,
      reason: "Strong recorded subject or skill evidence is present, but little matching exposure has been recorded."
    };
  });
}

async function saveEvidence() {
  if (busy) {
    return;
  }
  try {
    await persistEvidence();
    setStatus("data-status", "Evidence saved locally.", "success");
  } catch (error) {
    setStatus("data-status", error.message, "error");
  }
}

async function analyseProfile() {
  if (busy) {
    return;
  }
  setBusy(true);
  setStatus("data-status", "Verity is analysing the evidence…", "");
  try {
    await persistEvidence();
    const result = await requestBackend("/api/profile", evidencePayload());
    validateProfileResponse(result);
    studentProfile.skillProfile = {
      generatedAt: new Date().toISOString(),
      sourceEvidenceUpdatedAt: studentProfile.evidence.updatedAt,
      skills: result.skills
    };
    studentProfile.careers = null;
    await storageSet();
    renderAll();
    navigate("records");
    setStatus("data-status", "Profile analysed and saved.", "success");
  } catch (error) {
    setStatus("data-status", error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function findCareers() {
  if (busy) {
    return;
  }
  if (!studentProfile.skillProfile) {
    setStatus("careers-status", "Analyse your profile before finding pathways.", "error");
    return;
  }
  setBusy(true);
  setStatus("careers-status", "Verity is finding pathways worth exploring…", "");
  try {
    const result = await requestBackend("/api/careers", {
      subjects: evidencePayload().subjects,
      projects: evidencePayload().projects,
      interests: studentProfile.evidence.interests,
      skills: studentProfile.skillProfile.skills
    });
    validateCareerResponse(result);
    studentProfile.careers = {
      generatedAt: new Date().toISOString(),
      sourceProfileGeneratedAt: studentProfile.skillProfile.generatedAt,
      pathways: result.pathways
    };
    currentOpportunities = [];
    currentOpportunityMessage = "";
    await storageSet();
    renderCareers();
    setStatus("careers-status", "Pathways updated.", "success");
  } catch (error) {
    setStatus("careers-status", error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function findOpportunities() {
  if (busy) {
    return;
  }
  if (!studentProfile.skillProfile || !studentProfile.careers) {
    setStatus("opportunities-status", "Find pathways before searching for opportunities.", "error");
    return;
  }
  setBusy(true);
  setStatus("opportunities-status", "Searching current opportunities…", "");
  currentOpportunityMessage = "";
  try {
    const result = await requestBackend("/api/opportunities", {
      subjects: evidencePayload().subjects,
      projects: evidencePayload().projects,
      interests: studentProfile.evidence.interests,
      skills: studentProfile.skillProfile.skills,
      pathways: studentProfile.careers.pathways,
      currentRequest: String((byId("opportunity-request") || {}).value || "").trim()
    });
    currentOpportunities = Array.isArray(result.opportunities) ? result.opportunities : [];
    currentOpportunityMessage = result.message || "";
    renderCareers();
    setStatus("opportunities-status", currentOpportunities.length ? "Opportunities updated." : "", currentOpportunities.length ? "success" : "");
  } catch (error) {
    currentOpportunities = [];
    currentOpportunityMessage = "";
    renderCareers();
    setStatus("opportunities-status", error.message, "error");
  } finally {
    setBusy(false);
  }
}

function loadDemoData() {
  if (busy) {
    return;
  }
  const hasEvidence = studentProfile.evidence.subjects.some(function (subject) {
    return subject.score !== null && subject.score !== "";
  }) || studentProfile.evidence.projects.length;
  if (hasEvidence && !window.confirm("Replace the current evidence with demo data?")) {
    return;
  }
  studentProfile = {
    version: 1,
    evidence: {
      isDemoData: true,
      updatedAt: new Date().toISOString(),
      subjects: [
        {
          name: "Design & Technology",
          score: 88,
          topics: [
            { id: makeId(), name: "Design Process", score: 91 },
            { id: makeId(), name: "Prototyping", score: 89 }
          ]
        },
        {
          name: "Science",
          score: 81,
          topics: [
            { id: makeId(), name: "Forces", score: 87 },
            { id: makeId(), name: "Light", score: 74 }
          ]
        },
        {
          name: "Math",
          score: 84,
          topics: [
            { id: makeId(), name: "Algebra", score: 86 },
            { id: makeId(), name: "Geometry", score: 76 },
            { id: makeId(), name: "Probability", score: 90 }
          ]
        },
        { name: "English", score: 65, topics: [] },
        { name: "Art", score: 73, topics: [] },
        { name: "History", score: 61, topics: [] }
      ],
      projects: [
        {
          id: makeId(),
          name: "School community improvement project",
          type: "Project",
          description: "Worked with classmates to suggest ways to improve a shared school space."
        }
      ],
      interests: ""
    },
    skillProfile: null,
    careers: null
  };
  currentOpportunities = [];
  currentOpportunityMessage = "";
  storageSet().then(function () {
    renderAll();
    setStatus("data-status", "Demo data loaded. Analyse it to generate Verity’s skill profile.", "success");
  }).catch(function (error) {
    setStatus("data-status", error.message, "error");
  });
}

function updateSubjectField(target) {
  const subject = studentProfile.evidence.subjects[Number(target.dataset.subjectIndex)];
  if (!subject) {
    return;
  }
  if (target.dataset.field === "score") {
    subject.score = target.value;
    markEvidenceDirty();
  }
  if (target.dataset.topicId) {
    const topic = subject.topics.find(function (item) { return item.id === target.dataset.topicId; });
    if (topic) {
      topic[target.dataset.field] = target.value;
      markEvidenceDirty();
    }
  }
}

function bindUi(root) {
  const button = root.querySelector("#classroom-assistant-button");
  const popup = root.querySelector("#classroom-assistant-popup");
  const closeButton = root.querySelector("#assistant-close-button");
  const subjectsEditor = root.querySelector("#subjects-editor");
  const projectsEditor = root.querySelector("#projects-editor");
  const interests = root.querySelector("#interests-input");

  root.querySelectorAll("[data-view]").forEach(function (control) {
    control.addEventListener("click", function () {
      navigate(control.dataset.view);
    });
  });
  button.addEventListener("click", function () {
    popup.classList.toggle("open");
  });
  closeButton.addEventListener("click", function () {
    popup.classList.remove("open");
  });
  root.querySelector("#save-evidence-button").addEventListener("click", saveEvidence);
  root.querySelector("#analyse-profile-button").addEventListener("click", analyseProfile);
  root.querySelector("#load-demo-data-button").addEventListener("click", loadDemoData);
  root.querySelector("#find-careers-button").addEventListener("click", findCareers);
  root.querySelector("#find-opportunities-button").addEventListener("click", findOpportunities);
  root.querySelector("#add-project-button").addEventListener("click", function () {
    if (busy) {
      return;
    }
    studentProfile.evidence.projects.push({ id: makeId(), name: "", type: "Project", description: "" });
    markEvidenceDirty();
    renderDataInput();
  });

  interests.addEventListener("input", function () {
    studentProfile.evidence.interests = interests.value;
    markEvidenceDirty();
  });

  subjectsEditor.addEventListener("input", function (event) {
    updateSubjectField(event.target);
  });
  subjectsEditor.addEventListener("click", function (event) {
    const target = event.target;
    if (target.dataset.action === "add-topic") {
      const subject = studentProfile.evidence.subjects[Number(target.dataset.subjectIndex)];
      if (subject) {
        subject.topics.push({ id: makeId(), name: "", score: "" });
        markEvidenceDirty();
        renderDataInput();
      }
    }
    if (target.dataset.action === "delete-topic") {
      const subject = studentProfile.evidence.subjects[Number(target.dataset.subjectIndex)];
      if (subject) {
        subject.topics = subject.topics.filter(function (topic) { return topic.id !== target.dataset.topicId; });
        markEvidenceDirty();
        renderDataInput();
      }
    }
  });

  projectsEditor.addEventListener("input", function (event) {
    const target = event.target;
    const project = studentProfile.evidence.projects.find(function (item) {
      return item.id === target.dataset.projectId;
    });
    if (project && target.dataset.field) {
      project[target.dataset.field] = target.value;
      markEvidenceDirty();
    }
  });
  projectsEditor.addEventListener("change", function (event) {
    const target = event.target;
    const project = studentProfile.evidence.projects.find(function (item) {
      return item.id === target.dataset.projectId;
    });
    if (project && target.dataset.field) {
      project[target.dataset.field] = target.value;
      markEvidenceDirty();
    }
  });
  projectsEditor.addEventListener("click", function (event) {
    const target = event.target;
    if (target.dataset.action === "delete-project") {
      studentProfile.evidence.projects = studentProfile.evidence.projects.filter(function (project) {
        return project.id !== target.dataset.projectId;
      });
      markEvidenceDirty();
      renderDataInput();
    }
  });
}

async function loadAssistant() {
  if (document.getElementById("classroom-assistant-button")) {
    return;
  }

  const htmlURL = runtimeUrl("menu.html");
  try {
    const response = await fetch(htmlURL);
    if (!response.ok) {
      throw new Error("Could not load the Verity overlay.");
    }
    const html = await response.text();
    const container = document.createElement("div");
    container.id = "classroom-assistant-container";
    container.innerHTML = html;
    document.body.appendChild(container);

    const buttonImg = container.querySelector("#assistant-button-img");
    const headerMascot = container.querySelector("#verity-header-mascot");
    buttonImg.src = runtimeUrl("mascot/anim/7s_idle.gif");
    headerMascot.src = runtimeUrl("mascot/static/verity.jpeg");

    bindUi(container);
    try {
      studentProfile = normalizeProfile(await storageGet());
    } catch (storageError) {
      setStatus("data-status", "Local evidence could not be loaded: " + storageError.message, "error");
    }
    renderAll();
  } catch (error) {
    console.error("Verity overlay failed to load", error);
  }
}

loadAssistant();
