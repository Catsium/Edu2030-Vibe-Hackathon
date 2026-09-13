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
let currentView = "stats";
let currentOpportunities = [];
let currentOpportunityMessage = "";
let currentOpportunityIntro = "";
let activeQuizId = "";
let busy = false;

function makeId() {
  if (self.crypto && typeof self.crypto.randomUUID === "function") {
    return self.crypto.randomUUID();
  }
  return String(Date.now()) + "-" + String(Math.random()).slice(2);
}

function createEmptyProfile() {
  return {
    version: 2,
    evidence: {
      isDemoData: false,
      updatedAt: "",
      subjects: SUBJECT_NAMES.map(function (name) {
        return { name: name, score: null, actualTestScore: null, topics: [] };
      }),
      projects: [],
      interests: ""
    },
    tracking: {
      materials: [],
      quizzes: [],
      attempts: []
    },
    skillProfile: null,
    careers: null
  };
}

function createEmptyTracking() {
  return { materials: [], quizzes: [], attempts: [] };
}

function normalizeTracking(saved) {
  const tracking = createEmptyTracking();
  if (!saved || typeof saved !== "object") {
    return tracking;
  }
  if (Array.isArray(saved.materials)) {
    tracking.materials = saved.materials.map(function (material) {
      return {
        id: material && material.id ? String(material.id) : makeId(),
        name: material && typeof material.name === "string" ? material.name : "Untitled material",
        subject: material && SUBJECT_NAMES.includes(material.subject) ? material.subject : SUBJECT_NAMES[0],
        content: material && typeof material.content === "string" ? material.content.slice(0, 2800000) : "",
        contentType: material && typeof material.contentType === "string" ? material.contentType : "text/plain",
        uploadedAt: material && typeof material.uploadedAt === "string" ? material.uploadedAt : ""
      };
    }).filter(function (material) { return material.content.trim(); });
  }
  if (Array.isArray(saved.quizzes)) {
    tracking.quizzes = saved.quizzes.map(function (quiz) {
      return {
        id: quiz && quiz.id ? String(quiz.id) : makeId(),
        title: quiz && typeof quiz.title === "string" ? quiz.title : "Targeted quiz",
        subject: quiz && SUBJECT_NAMES.includes(quiz.subject) ? quiz.subject : SUBJECT_NAMES[0],
        topic: quiz && typeof quiz.topic === "string" ? quiz.topic : "",
        sourceMaterialId: quiz && quiz.sourceMaterialId ? String(quiz.sourceMaterialId) : "",
        createdAt: quiz && typeof quiz.createdAt === "string" ? quiz.createdAt : "",
        questions: Array.isArray(quiz && quiz.questions) ? quiz.questions.map(function (question) {
          return {
            question: question && typeof question.question === "string" ? question.question : "",
            options: Array.isArray(question && question.options) ? question.options.map(String).slice(0, 4) : [],
            answerIndex: question && Number.isInteger(Number(question.answerIndex)) ? Number(question.answerIndex) : -1,
            topic: question && typeof question.topic === "string" ? question.topic : ""
          };
        }).filter(function (question) {
          return question.question && question.options.length >= 2 && question.answerIndex >= 0;
        }) : []
      };
    }).filter(function (quiz) { return quiz.questions.length; });
  }
  if (Array.isArray(saved.attempts)) {
    tracking.attempts = saved.attempts.map(function (attempt) {
      return {
        id: attempt && attempt.id ? String(attempt.id) : makeId(),
        quizId: attempt && attempt.quizId ? String(attempt.quizId) : "",
        subject: attempt && SUBJECT_NAMES.includes(attempt.subject) ? attempt.subject : SUBJECT_NAMES[0],
        score: Number(attempt && attempt.score),
        total: Number(attempt && attempt.total),
        completedAt: attempt && typeof attempt.completedAt === "string" ? attempt.completedAt : "",
        topicScores: Array.isArray(attempt && attempt.topicScores) ? attempt.topicScores.map(function (topic) {
          return { name: topic && typeof topic.name === "string" ? topic.name : "", score: Number(topic && topic.score) };
        }).filter(function (topic) { return topic.name && validScore(topic.score); }) : []
      };
    }).filter(function (attempt) {
      return validScore(attempt.score) && attempt.total > 0;
    });
  }
  return tracking;
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
    const actualTestScore = source && source.actualTestScore !== undefined
      ? source.actualTestScore
      : source && source.score !== undefined ? source.score : null;
    return {
      name: name,
      score: actualTestScore,
      actualTestScore: actualTestScore,
      topics: topics.map(function (topic) {
        return {
          id: topic && topic.id ? String(topic.id) : makeId(),
          name: topic && typeof topic.name === "string" ? topic.name : "",
          score: topic && topic.score !== undefined && topic.score !== null ? topic.score : ""
        };
      })
    };
  });

  profile.tracking = normalizeTracking(saved.tracking || evidence.tracking);

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

function setMascotState(state, message) {
  const mascot = byId("verity-header-mascot");
  const caption = byId("verity-mascot-caption");
  if (mascot) {
    mascot.src = runtimeUrl(state === "loading" ? "mascot/anim/14s_idle_to_loading.gif" : "mascot/static/verity.jpeg");
    mascot.alt = state === "loading" ? "Verity is working" : "Verity";
  }
  if (caption) {
    caption.textContent = message || "";
    caption.hidden = !message;
  }
}

function setBusy(value, message) {
  busy = value;
  if (value) {
    setMascotState("loading", message);
  } else {
    const caption = byId("verity-mascot-caption");
    const existingMessage = caption && !caption.hidden ? caption.textContent : "";
    setMascotState("idle", existingMessage);
  }
  [
    "save-evidence-button",
    "analyse-profile-button",
    "load-demo-data-button",
    "find-careers-button",
    "find-opportunities-button",
    "add-project-button",
    "add-material-button",
    "generate-quiz-button"
  ].forEach(function (id) {
    const button = byId(id);
    if (button) {
      button.disabled = value;
    }
  });
}

function navigate(view) {
  currentView = view === "home" ? "stats" : view;
  document.querySelectorAll("#classroom-assistant-container .verity-view").forEach(function (section) {
    section.hidden = section.id !== "view-" + currentView;
  });
  document.querySelectorAll("#classroom-assistant-container .verity-nav-button").forEach(function (button) {
    button.classList.toggle("active", button.dataset.view === currentView);
  });
  const override = byId("open-data-input-button");
  if (override) {
    override.classList.toggle("active", currentView === "data-input");
  }
}

function setBadge(id, visible) {
  const badge = byId(id);
  if (badge) {
    badge.hidden = !visible;
  }
}

function trackingAttemptsForSubject(subjectName) {
  const tracking = studentProfile.tracking || createEmptyTracking();
  return tracking.attempts.filter(function (attempt) { return attempt.subject === subjectName; });
}

function subjectMetrics(subject) {
  const testScore = validScore(subject.actualTestScore) ? Number(subject.actualTestScore)
    : (validScore(subject.score) ? Number(subject.score) : null);
  const attempts = trackingAttemptsForSubject(subject.name);
  const totalQuestions = attempts.reduce(function (sum, attempt) { return sum + Number(attempt.total || 0); }, 0);
  const correctAnswers = attempts.reduce(function (sum, attempt) { return sum + Number(attempt.score || 0) * Number(attempt.total || 0) / 100; }, 0);
  const quizScore = totalQuestions ? Math.round(correctAnswers / totalQuestions * 100) : null;
  const finalScore = quizScore === null
    ? testScore
    : Math.round(quizScore * 0.7 + (testScore === null ? 0 : testScore) * 0.3);
  return { testScore: testScore, quizScore: quizScore, finalScore: finalScore, quizCount: attempts.length };
}

function currentSubjectScore(subject) {
  return subjectMetrics(subject).finalScore;
}

function weakestTopic(subjectName) {
  const subject = studentProfile.evidence.subjects.find(function (item) { return item.name === subjectName; });
  if (!subject || !subject.topics.length) {
    return "";
  }
  const weak = subject.topics.filter(function (topic) { return validScore(topic.score); })
    .sort(function (a, b) { return Number(a.score) - Number(b.score); })[0];
  return weak && Number(weak.score) < 75 ? weak.name : "";
}

function trackedTopicScores(subjectName) {
  const totals = {};
  trackingAttemptsForSubject(subjectName).forEach(function (attempt) {
    (attempt.topicScores || []).forEach(function (topic) {
      if (!totals[topic.name]) {
        totals[topic.name] = { weighted: 0, count: 0 };
      }
      totals[topic.name].weighted += Number(topic.score) * Number(attempt.total || 1);
      totals[topic.name].count += Number(attempt.total || 1);
    });
  });
  return Object.keys(totals).map(function (name) {
    return { name: name, score: Math.round(totals[name].weighted / totals[name].count) };
  });
}

function trackingPayload() {
  const tracking = studentProfile.tracking || createEmptyTracking();
  return {
    materials: tracking.materials.map(function (material) {
      return { name: material.name, subject: material.subject, uploadedAt: material.uploadedAt };
    }),
    quizzes: tracking.quizzes.map(function (quiz) {
      return { title: quiz.title, subject: quiz.subject, topic: quiz.topic, createdAt: quiz.createdAt };
    }),
    attempts: tracking.attempts.map(function (attempt) {
      return {
        subject: attempt.subject,
        score: attempt.score,
        total: attempt.total,
        completedAt: attempt.completedAt,
        topicScores: attempt.topicScores
      };
    })
  };
}

function renderStatsTracking() {
  const subjectsNode = byId("stats-strong-subjects");
  const skillsNode = byId("stats-strong-skills");
  const quizCountNode = byId("stats-quiz-count");
  const activityHelpNode = byId("stats-activity-help");
  const subjectsGrid = byId("stats-subjects");
  const observationNode = byId("stats-observation");
  if (!subjectsNode || !skillsNode || !quizCountNode || !subjectsGrid) {
    return;
  }

  const scoredSubjects = studentProfile.evidence.subjects.map(function (subject) {
    return { subject: subject, score: currentSubjectScore(subject) };
  });
  subjectsNode.replaceChildren();
  scoredSubjects.filter(function (item) { return validScore(item.score) && Number(item.score) >= 70; })
    .sort(function (a, b) { return Number(b.score) - Number(a.score); }).slice(0, 3)
    .forEach(function (item) { addText(subjectsNode, "span", null, item.subject.name + " · " + item.score + "/100"); });
  if (!subjectsNode.childElementCount) {
    addText(subjectsNode, "span", "empty-copy", "Complete evidence to see strong subjects.");
  }

  skillsNode.replaceChildren();
  const skills = studentProfile.skillProfile && Array.isArray(studentProfile.skillProfile.skills)
    ? studentProfile.skillProfile.skills.slice().sort(function (a, b) { return Number(b.score) - Number(a.score); }).slice(0, 3)
    : [];
  skills.filter(function (skill) { return Number(skill.score) >= 70; }).forEach(function (skill) {
    addText(skillsNode, "span", null, skill.name + " · " + skill.score + "/100");
  });
  if (!skillsNode.childElementCount) {
    addText(skillsNode, "span", "empty-copy", "Refresh the profile after tracking activity.");
  }

  const attempts = (studentProfile.tracking || createEmptyTracking()).attempts;
  quizCountNode.textContent = String(attempts.length);
  if (activityHelpNode) {
    activityHelpNode.textContent = String((studentProfile.tracking || createEmptyTracking()).materials.length) + " materials · " + attempts.length + " quizzes completed";
  }
  if (observationNode) {
    const observation = profileObservation(skills);
    observationNode.replaceChildren();
    if (observation) {
      addText(observationNode, "strong", null, "Verity noticed");
      addText(observationNode, "p", null, observation);
      observationNode.hidden = false;
    } else {
      observationNode.hidden = true;
    }
  }
  const statsChart = byId("stats-skills-chart");
  if (statsChart) {
    renderRadarChart(statsChart, skills);
  }

  subjectsGrid.replaceChildren();
  scoredSubjects.forEach(function (item) {
    const subject = item.subject;
    const metrics = subjectMetrics(subject);
    const card = addText(subjectsGrid, "article", "tracking-subject-card");
    const header = addText(card, "div", "skill-card-header");
    addText(header, "h3", null, subject.name);
    addText(header, "span", "record-score", validScore(metrics.finalScore) ? metrics.finalScore + "/100" : "Not recorded");
    const breakdown = addText(card, "div", "score-breakdown");
    addText(breakdown, "span", null, "Quiz 70%: " + (metrics.quizScore === null ? "pending" : metrics.quizScore + "/100"));
    addText(breakdown, "span", null, "Test 30%: " + (metrics.testScore === null ? "pending" : metrics.testScore + "/100"));
    if (metrics.quizScore === null) {
      addText(card, "p", "empty-copy", "Take a class-material quiz to complete this weighted score.");
    }
    if (subject.topics.length) {
      const topicList = addText(card, "ul", "topic-list");
      subject.topics.forEach(function (topic) {
        addText(topicList, "li", null, topic.name + " — " + (validScore(topic.score) ? topic.score + "/100" : "Not recorded"));
      });
    }
    const trackedTopics = trackedTopicScores(subject.name);
    if (trackedTopics.length) {
      const quizTopicList = addText(card, "ul", "topic-list");
      trackedTopics.forEach(function (topic) {
        addText(quizTopicList, "li", null, "Quiz · " + topic.name + " — " + topic.score + "/100");
      });
    }
  });

  const materialSubject = byId("material-subject-select");
  const quizMaterial = byId("quiz-material-select");
  if (materialSubject) {
    const selected = materialSubject.value;
    materialSubject.replaceChildren();
    SUBJECT_NAMES.forEach(function (name) {
      const option = addText(materialSubject, "option", null, name);
      option.value = name;
      option.selected = name === selected || (!selected && name === SUBJECT_NAMES[0]);
    });
  }
  if (quizMaterial) {
    const selected = quizMaterial.value;
    quizMaterial.replaceChildren();
    const materials = (studentProfile.tracking || createEmptyTracking()).materials;
    if (!materials.length) {
      const option = addText(quizMaterial, "option", null, "Save a class material first");
      option.value = "";
    } else {
      materials.forEach(function (material) {
        const option = addText(quizMaterial, "option", null, material.name + " · " + material.subject);
        option.value = material.id;
        option.selected = material.id === selected;
      });
    }
  }
  renderFocusTopicOptions();
  renderMaterials();
  renderQuizzes();
  setBadge("stats-demo-badge", studentProfile.evidence.isDemoData);
  renderSignalInto(byId("stats-signal"));
}

function renderFocusTopicOptions() {
  const topicSelect = byId("quiz-topic-select");
  const materialSelect = byId("quiz-material-select");
  if (!topicSelect) {
    return;
  }
  const material = (studentProfile.tracking || createEmptyTracking()).materials.find(function (item) {
    return item.id === (materialSelect && materialSelect.value);
  });
  const subjectName = material ? material.subject : SUBJECT_NAMES[0];
  const subject = studentProfile.evidence.subjects.find(function (item) { return item.name === subjectName; });
  const selected = topicSelect.value;
  topicSelect.replaceChildren();
  const any = addText(topicSelect, "option", null, "Focus on a weak topic (optional)");
  any.value = "";
  (subject ? subject.topics : []).forEach(function (topic) {
    const option = addText(topicSelect, "option", null, topic.name + (validScore(topic.score) ? " · " + topic.score + "/100" : ""));
    option.value = topic.name;
    option.selected = topic.name === selected;
  });
  const weak = weakestTopic(subjectName);
  if (!selected && weak) {
    topicSelect.value = weak;
  }
  const focusCopy = byId("focus-topic-copy");
  if (focusCopy) {
    focusCopy.textContent = weak ? "Verity suggests targeting " + weak + " next." : "Complete a quiz to add the 70% learning component.";
  }
}

function renderMaterials() {
  const list = byId("materials-list");
  if (!list) {
    return;
  }
  list.replaceChildren();
  const materials = (studentProfile.tracking || createEmptyTracking()).materials;
  if (!materials.length) {
    addText(list, "p", "empty-copy", "No class materials saved yet.");
    return;
  }
  materials.forEach(function (material) {
    const card = addText(list, "article", "material-card");
    const heading = addText(card, "div", "skill-card-header");
    addText(heading, "h3", null, material.name);
    addText(heading, "span", "tag", material.subject);
    addText(card, "p", null, "Saved locally · " + String(material.content || "").length + " characters");
    const actions = addText(card, "div", "compact-actions");
    const generate = addText(actions, "button", "small-button", "Generate quiz");
    generate.type = "button";
    generate.dataset.action = "generate-quiz-from-material";
    generate.dataset.materialId = material.id;
    const remove = addText(actions, "button", "icon-button", "×");
    remove.type = "button";
    remove.title = "Delete class material";
    remove.dataset.action = "delete-material";
    remove.dataset.materialId = material.id;
  });
}

function renderQuizzes() {
  const list = byId("quizzes-list");
  if (!list) {
    return;
  }
  list.replaceChildren();
  const quizzes = (studentProfile.tracking || createEmptyTracking()).quizzes;
  if (!quizzes.length) {
    addText(list, "p", "empty-copy", "Generate a quiz from a saved class material.");
  } else {
    quizzes.forEach(function (quiz) {
      const card = addText(list, "article", "quiz-card");
      const heading = addText(card, "div", "skill-card-header");
      addText(heading, "h3", null, quiz.title);
      addText(heading, "span", "tag", quiz.subject);
      addText(card, "p", null, String(quiz.questions.length) + " questions" + (quiz.topic ? " · " + quiz.topic : ""));
      const latest = (studentProfile.tracking || createEmptyTracking()).attempts.find(function (attempt) { return attempt.quizId === quiz.id; });
      if (latest) {
        addText(card, "p", "quiz-result", "Latest attempt: " + latest.score + "%");
      }
      const take = addText(card, "button", "small-button", activeQuizId === quiz.id ? "Close quiz" : "Take quiz");
      take.type = "button";
      take.dataset.action = "take-quiz";
      take.dataset.quizId = quiz.id;
    });
  }
  renderActiveQuiz();
}

function renderActiveQuiz() {
  const panel = byId("active-quiz");
  if (!panel) {
    return;
  }
  panel.replaceChildren();
  const quiz = (studentProfile.tracking || createEmptyTracking()).quizzes.find(function (item) { return item.id === activeQuizId; });
  if (!quiz) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  addText(panel, "h3", null, quiz.title);
  addText(panel, "p", "empty-copy", "Choose one answer for each question, then save the attempt.");
  const form = addText(panel, "form", "quiz-form");
  quiz.questions.forEach(function (question, index) {
    const fieldset = addText(form, "fieldset", "quiz-question");
    addText(fieldset, "legend", null, String(index + 1) + ". " + question.question);
    question.options.forEach(function (optionText, optionIndex) {
      const label = addText(fieldset, "label", "quiz-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "quiz-question-" + index;
      input.value = String(optionIndex);
      label.appendChild(input);
      addText(label, "span", null, optionText);
    });
  });
  const submit = addText(form, "button", "primary-button", "Save quiz attempt");
  submit.type = "submit";
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    submitQuizAttempt(quiz.id);
  });
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
    const testValue = subject.actualTestScore === null || subject.actualTestScore === undefined ? subject.score : subject.actualTestScore;
    scoreInput.value = testValue === null || testValue === undefined ? "" : testValue;
    scoreInput.dataset.subjectIndex = String(subjectIndex);
    scoreInput.dataset.field = "actualTestScore";
    scoreInput.setAttribute("aria-label", subject.name + " actual test score");
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
  renderStatsTracking();
}

function renderRadarChart(node, skills) {
  node.replaceChildren();
  if (!skills.length) {
    addText(node, "p", "empty-copy", "Analyse your saved evidence to see your skill shape.");
    return;
  }

  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("viewBox", "0 0 320 290");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Radar chart of inferred skills");

  const title = document.createElementNS(svgNamespace, "title");
  title.textContent = "Inferred skill profile";
  svg.appendChild(title);

  const labels = [
    "Hands-on",
    "Sequential",
    "Pattern recognition",
    "Communication",
    "Creativity",
    "Critical analysis"
  ];
  const centerX = 160;
  const centerY = 132;
  const radius = 91;
  const values = labels.map(function (label) {
    const skill = skills.find(function (item) {
      return item.name.toLowerCase().startsWith(label.toLowerCase().split(" ")[0]);
    });
    return skill ? Number(skill.score) : 0;
  });
  const point = function (index, distance) {
    const angle = -Math.PI / 2 + (index * Math.PI * 2 / labels.length);
    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance
    };
  };
  const pointString = function (distanceForPoint) {
    return labels.map(function (_, index) {
      const current = point(index, distanceForPoint(index));
      return current.x.toFixed(1) + "," + current.y.toFixed(1);
    }).join(" ");
  };
  const addSvg = function (tagName, attributes) {
    const element = document.createElementNS(svgNamespace, tagName);
    Object.keys(attributes).forEach(function (key) {
      element.setAttribute(key, attributes[key]);
    });
    svg.appendChild(element);
    return element;
  };

  [25, 50, 75, 100].forEach(function (level) {
    addSvg("polygon", {
      points: pointString(function () { return radius * level / 100; }),
      fill: "none",
      stroke: "#dfe5f1",
      "stroke-width": "1"
    });
  });
  labels.forEach(function (label, index) {
    const edge = point(index, radius);
    addSvg("line", {
      x1: centerX,
      y1: centerY,
      x2: edge.x,
      y2: edge.y,
      stroke: "#e4e8f1",
      "stroke-width": "1"
    });
    const labelPoint = point(index, radius + 25);
    const text = addSvg("text", {
      x: labelPoint.x,
      y: labelPoint.y,
      fill: "#65738b",
      "font-size": "10",
      "text-anchor": labelPoint.x < centerX - 4 ? "end" : (labelPoint.x > centerX + 4 ? "start" : "middle")
    });
    text.textContent = label;
  });
  addSvg("polygon", {
    points: pointString(function (index) { return radius * values[index] / 100; }),
    fill: "rgba(83, 104, 216, .22)",
    stroke: "#5368d8",
    "stroke-width": "2"
  });
  values.forEach(function (value, index) {
    const valuePoint = point(index, radius * value / 100);
    addSvg("circle", {
      cx: valuePoint.x,
      cy: valuePoint.y,
      r: "3.5",
      fill: "#5368d8",
      stroke: "#fff",
      "stroke-width": "1.5"
    });
  });
  node.appendChild(svg);
  addText(node, "p", "radar-caption", "Scores show the strength of evidence currently available.");
}

function profileObservation(skills) {
  if (studentProfile.skillProfile && typeof studentProfile.skillProfile.summary === "string" &&
      studentProfile.skillProfile.summary.trim()) {
    return studentProfile.skillProfile.summary.trim();
  }
  const topSkills = skills.slice().sort(function (a, b) {
    return Number(b.score) - Number(a.score);
  }).slice(0, 2).map(function (skill) { return skill.name.toLowerCase(); });
  const topSubjects = studentProfile.evidence.subjects.slice().sort(function (a, b) {
    return Number(currentSubjectScore(b) || 0) - Number(currentSubjectScore(a) || 0);
  }).slice(0, 2).map(function (subject) { return subject.name; });
  if (topSkills.length && topSubjects.length) {
    return "Your strongest evidence currently points toward " + topSkills.join(" and ") +
      ", supported by " + topSubjects.join(" and ") + ".";
  }
  if (topSkills.length) {
    return "Your strongest evidence currently points toward " + topSkills.join(" and ") + ".";
  }
  return "";
}

function renderRecords() {
  const subjectsNode = byId("records-subjects");
  const chartNode = byId("records-skills-chart");
  const skillsNode = byId("records-skills");
  const strengthsNode = byId("records-strengths");
  const projectsNode = byId("records-projects");
  const activityNode = byId("records-learning-activity");
  const observationNode = byId("records-observation");
  if (!subjectsNode || !chartNode || !skillsNode || !strengthsNode || !projectsNode) {
    return;
  }

  subjectsNode.replaceChildren();
  studentProfile.evidence.subjects.forEach(function (subject) {
    const card = addText(subjectsNode, "article", "record-card");
    const heading = addText(card, "div", "skill-card-header");
    addText(heading, "h3", null, subject.name);
    const metrics = subjectMetrics(subject);
    addText(heading, "span", "record-score", validScore(metrics.finalScore) ? metrics.finalScore + "/100" : "Not recorded");
    const breakdown = addText(card, "div", "score-breakdown");
    addText(breakdown, "span", null, "Quiz 70%: " + (metrics.quizScore === null ? "pending" : metrics.quizScore + "/100"));
    addText(breakdown, "span", null, "Test 30%: " + (metrics.testScore === null ? "pending" : metrics.testScore + "/100"));
    if (!subject.topics.length) {
      addText(card, "p", "empty-copy", "No topic scores recorded.");
    } else {
      const list = addText(card, "ul", "topic-list");
      subject.topics.forEach(function (topic) {
        addText(list, "li", null, topic.name + " — " + (validScore(topic.score) ? topic.score + "/100" : "Not recorded"));
      });
    }
    trackedTopicScores(subject.name).forEach(function (topic) {
      const list = card.querySelector(".topic-list") || addText(card, "ul", "topic-list");
      addText(list, "li", null, "Quiz · " + topic.name + " — " + topic.score + "/100");
    });
  });

  const skills = studentProfile.skillProfile && Array.isArray(studentProfile.skillProfile.skills)
    ? studentProfile.skillProfile.skills
    : [];
  renderRadarChart(chartNode, skills);
  skillsNode.replaceChildren();
  if (observationNode) {
    const observation = profileObservation(skills);
    observationNode.replaceChildren();
    if (observation) {
      addText(observationNode, "strong", null, "Verity noticed");
      addText(observationNode, "p", null, observation);
      observationNode.hidden = false;
    } else {
      observationNode.hidden = true;
    }
  }
  if (!skills.length) {
    addText(skillsNode, "p", "empty-copy", "Analyse your saved evidence to generate all six inferred skills.");
  } else {
    skills.forEach(function (skill) {
      const card = addText(skillsNode, "article", "skill-card");
      const heading = addText(card, "div", "skill-card-header");
      addText(heading, "h3", null, skill.name);
      addText(heading, "span", "record-score", skill.score + "/100");
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
    const score = currentSubjectScore(subject);
    if (validScore(score) && Number(score) >= 70) {
      strengths.push({ title: subject.name, detail: score + "/100 subject evidence" });
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
  if (activityNode) {
    activityNode.replaceChildren();
    const tracking = studentProfile.tracking || createEmptyTracking();
    if (!tracking.materials.length && !tracking.attempts.length) {
      addText(activityNode, "p", "empty-copy", "No class materials or quiz attempts have been recorded yet.");
    } else {
      tracking.materials.forEach(function (material) {
        addText(activityNode, "div", "activity-item", "Material · " + material.name + " · " + material.subject);
      });
      tracking.attempts.forEach(function (attempt) {
        addText(activityNode, "div", "activity-item", "Quiz · " + attempt.subject + " · " + attempt.score + "%");
      });
    }
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
  const careersIntroNode = byId("careers-intro");
  const opportunityIntroNode = byId("opportunity-intro");
  if (!pathwaysNode || !opportunitiesNode) {
    return;
  }

  pathwaysNode.replaceChildren();
  const pathways = studentProfile.careers && Array.isArray(studentProfile.careers.pathways)
    ? studentProfile.careers.pathways
    : [];
  if (careersIntroNode) {
    careersIntroNode.replaceChildren();
    const intro = studentProfile.careers && typeof studentProfile.careers.intro === "string"
      ? studentProfile.careers.intro
      : "";
    if (intro) {
      careersIntroNode.textContent = intro;
      careersIntroNode.hidden = false;
    } else {
      careersIntroNode.hidden = true;
    }
  }
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
  if (opportunityIntroNode) {
    opportunityIntroNode.textContent = currentOpportunityIntro || "";
    opportunityIntroNode.hidden = !currentOpportunityIntro;
  }
  if (currentOpportunityMessage) {
    addText(opportunitiesNode, "p", "empty-copy", currentOpportunityMessage);
    return;
  }
  if (!currentOpportunities.length) {
    addText(opportunitiesNode, "p", "empty-copy", "Find pathways first, then search for current opportunities.");
    return;
  }
  currentOpportunities.slice().sort(function (a, b) {
    return Number(b.interestMatch) - Number(a.interestMatch);
  }).forEach(function (opportunity) {
    const card = addText(opportunitiesNode, "article", "opportunity-card");
    addText(card, "h3", null, opportunity.title);
    addText(card, "p", null, opportunity.organisation);
    addText(card, "div", "match-score", Number(opportunity.interestMatch) + "% Verity Match");
    addText(card, "p", null, opportunity.summary);
    addText(card, "p", "opportunity-label", "Why you may like it");
    addText(card, "p", null, opportunity.whyYouMayLikeIt);
    addText(card, "p", "opportunity-label", "What this adds");
    addText(card, "p", null, opportunity.whatItAdds);
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
  renderStatsTracking();
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
  currentOpportunityIntro = "";
  activeQuizId = "";
}

function validateEvidence() {
  for (const subject of studentProfile.evidence.subjects) {
    const testScore = subject.actualTestScore === undefined ? subject.score : subject.actualTestScore;
    if (!validScore(testScore)) {
      return subject.name + " needs an actual test score from 0 to 100 in Override data.";
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
        score: Number(subject.actualTestScore === undefined ? subject.score : subject.actualTestScore),
        actualTestScore: Number(subject.actualTestScore === undefined ? subject.score : subject.actualTestScore),
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
      const metrics = subjectMetrics(subject);
      const score = metrics.finalScore === null ? metrics.testScore : metrics.finalScore;
      return {
        name: subject.name,
        score: Number(score === null ? 0 : score),
        actualTestScore: metrics.testScore,
        quizScore: metrics.quizScore,
        finalScore: metrics.finalScore,
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
    interests: studentProfile.evidence.interests,
    tracking: trackingPayload()
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
  currentOpportunityIntro = "";
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
  if (!data || typeof data.summary !== "string" || !data.summary.trim() ||
      !Array.isArray(data.skills) || data.skills.length !== SKILL_NAMES.length) {
    throw new Error("The profile response did not contain all six skills.");
  }
  const names = data.skills.map(function (skill) { return skill && skill.name; });
  if (new Set(names).size !== SKILL_NAMES.length || SKILL_NAMES.some(function (name) { return !names.includes(name); })) {
    throw new Error("The profile response contained an unexpected skill set.");
  }
  data.skills.forEach(function (skill) {
    if (!skill || typeof skill.score !== "number" || !Number.isInteger(skill.score) ||
      skill.score < 0 || skill.score > 100 || !String(skill.reason || "").trim() ||
      !Array.isArray(skill.evidence) || skill.evidence.some(function (item) { return typeof item !== "string"; })) {
      throw new Error("The profile response contained an invalid skill.");
    }
  });
}

function validateCareerResponse(data) {
  if (!data || typeof data.intro !== "string" || !data.intro.trim() ||
      !Array.isArray(data.pathways) || data.pathways.length < 3 || data.pathways.length > 5) {
    throw new Error("The careers response did not contain 3 to 5 pathways.");
  }
  data.pathways.forEach(function (pathway) {
    if (!pathway || !String(pathway.name || "").trim() || !String(pathway.reason || "").trim() ||
      !Array.isArray(pathway.matchedSubjects) || !Array.isArray(pathway.matchedSkills)) {
      throw new Error("The careers response contained an invalid pathway.");
    }
  });
}

function validateOpportunityResponse(data) {
  if (!data || typeof data.intro !== "string" || !data.intro.trim() ||
      !Array.isArray(data.opportunities) || data.opportunities.length > 6) {
    throw new Error("The opportunities response was malformed.");
  }
  data.opportunities.forEach(function (opportunity) {
    if (!opportunity || !String(opportunity.title || "").trim() ||
        !String(opportunity.organisation || "").trim() ||
        !String(opportunity.summary || "").trim() ||
        !String(opportunity.whyYouMayLikeIt || "").trim() ||
        !String(opportunity.whatItAdds || "").trim() ||
        typeof opportunity.interestMatch !== "number" ||
        !Number.isInteger(opportunity.interestMatch) ||
        opportunity.interestMatch < 0 || opportunity.interestMatch > 100 ||
        !safeHttpUrl(opportunity.url) ||
        (opportunity.deadline !== null && typeof opportunity.deadline !== "string") ||
        (opportunity.eligibility !== null && typeof opportunity.eligibility !== "string")) {
      throw new Error("The opportunities response contained an invalid result.");
    }
  });
}

function validateQuizResponse(data) {
  if (!data || typeof data.title !== "string" || !data.title.trim() ||
      !SUBJECT_NAMES.includes(data.subject) || !Array.isArray(data.questions) ||
      data.questions.length < 3 || data.questions.length > 5) {
    throw new Error("The quiz response was malformed.");
  }
  data.questions.forEach(function (question) {
    if (!question || typeof question.question !== "string" || !question.question.trim() ||
        !Array.isArray(question.options) || question.options.length < 3 || question.options.length > 4 ||
        !Number.isInteger(question.answerIndex) || question.answerIndex < 0 || question.answerIndex >= question.options.length ||
        typeof question.topic !== "string") {
      throw new Error("The quiz response contained an invalid question.");
    }
    if (question.options.some(function (option) { return typeof option !== "string" || !option.trim(); })) {
      throw new Error("The quiz response contained an invalid option.");
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
      const score = currentSubjectScore(subject);
      return group.subjects.includes(subject.name) && validScore(score) && Number(score) >= 70;
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
  setBusy(true, "Verity is looking through your strengths...");
  setStatus("stats-status", "Verity is analysing your tracked evidence…", "");
  try {
    await persistEvidence();
    const result = await requestBackend("/api/profile", evidencePayload());
    validateProfileResponse(result);
    studentProfile.skillProfile = {
      generatedAt: new Date().toISOString(),
      sourceEvidenceUpdatedAt: studentProfile.evidence.updatedAt,
      summary: result.summary,
      skills: result.skills
    };
    studentProfile.careers = null;
    await storageSet();
    renderAll();
    navigate("records");
    setStatus("stats-status", "Profile analysed and saved.", "success");
    setMascotState("ready", "Verity found a clearer picture of your strengths.");
  } catch (error) {
    setStatus("stats-status", error.message, "error");
    setMascotState("error", "Verity couldn't complete that yet.");
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
  setBusy(true, "Verity is connecting your strengths to possible pathways...");
  setStatus("careers-status", "Verity is finding pathways worth exploring…", "");
  try {
    const result = await requestBackend("/api/careers", {
      subjects: evidencePayload().subjects,
      projects: evidencePayload().projects,
      interests: studentProfile.evidence.interests,
      tracking: evidencePayload().tracking,
      skills: studentProfile.skillProfile.skills
    });
    validateCareerResponse(result);
    studentProfile.careers = {
      generatedAt: new Date().toISOString(),
      sourceProfileGeneratedAt: studentProfile.skillProfile.generatedAt,
      intro: result.intro,
      pathways: result.pathways
    };
    currentOpportunities = [];
    currentOpportunityMessage = "";
    currentOpportunityIntro = "";
    await storageSet();
    renderCareers();
    setStatus("careers-status", "Pathways updated.", "success");
    setMascotState("ready", "Verity connected your strengths to a few pathways.");
  } catch (error) {
    setStatus("careers-status", error.message, "error");
    setMascotState("error", "Verity couldn't connect those pathways yet.");
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
  setBusy(true, "Verity is looking for opportunities that fit you...");
  setStatus("opportunities-status", "Searching current opportunities…", "");
  currentOpportunityMessage = "";
  currentOpportunityIntro = "";
  try {
    const result = await requestBackend("/api/opportunities", {
      subjects: evidencePayload().subjects,
      projects: evidencePayload().projects,
      interests: studentProfile.evidence.interests,
      tracking: evidencePayload().tracking,
      skills: studentProfile.skillProfile.skills,
      pathways: studentProfile.careers.pathways,
      currentRequest: String((byId("opportunity-request") || {}).value || "").trim()
    });
    validateOpportunityResponse(result);
    currentOpportunities = Array.isArray(result.opportunities) ? result.opportunities : [];
    currentOpportunityMessage = result.message
      ? "I couldn't find a strong current match this time. Try changing what you're interested in or searching again later."
      : "";
    currentOpportunityIntro = typeof result.intro === "string" ? result.intro : "";
    renderCareers();
    setStatus("opportunities-status", currentOpportunities.length ? "Opportunities updated." : "", currentOpportunities.length ? "success" : "");
    setMascotState(
      currentOpportunities.length ? "ready" : "empty",
      currentOpportunities.length
        ? "I found a few options that may fit you."
        : "I couldn't find a strong current match this time."
    );
  } catch (error) {
    currentOpportunities = [];
    currentOpportunityMessage = "";
    currentOpportunityIntro = "";
    renderCareers();
    setStatus("opportunities-status", error.message, "error");
    setMascotState("error", "Verity couldn't finish that search yet.");
  } finally {
    setBusy(false);
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function materialKind(file) {
  const name = String(file.name || "").toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return "application/pdf";
  }
  if (name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".doc") || file.type === "application/msword") {
    return "application/msword";
  }
  return "text/plain";
}

async function addMaterial() {
  if (busy) {
    return;
  }
  const fileInput = byId("material-file-input");
  const subjectSelect = byId("material-subject-select");
  const titleInput = byId("material-title-input");
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;
  if (!file) {
    setStatus("material-status", "Choose a class material file first.", "error");
    return;
  }
  setBusy(true, "Verity is saving your class material...");
  setStatus("material-status", "Saving material locally…", "");
  try {
    const contentType = materialKind(file);
    let content = "";
    if (contentType === "text/plain") {
      content = String(await file.text()).trim().slice(0, 8000);
    } else {
      if (contentType === "application/msword") {
        throw new Error("Legacy .doc files are not supported yet. Save the document as .docx or PDF and try again.");
      }
      if (file.size > 2000000) {
        throw new Error("For this prototype, keep PDF/DOCX files under 2 MB.");
      }
      content = arrayBufferToBase64(await file.arrayBuffer());
    }
    if (!content) {
      throw new Error("This file does not contain readable material.");
    }
    const tracking = studentProfile.tracking || createEmptyTracking();
    tracking.materials.unshift({
      id: makeId(),
      name: String((titleInput && titleInput.value) || file.name).trim() || file.name,
      subject: subjectSelect && SUBJECT_NAMES.includes(subjectSelect.value) ? subjectSelect.value : SUBJECT_NAMES[0],
      content: content,
      contentType: contentType,
      uploadedAt: new Date().toISOString()
    });
    studentProfile.tracking = tracking;
    studentProfile.evidence.isDemoData = false;
    markEvidenceDirty();
    activeQuizId = "";
    await storageSet();
    if (fileInput) {
      fileInput.value = "";
    }
    if (titleInput) {
      titleInput.value = "";
    }
    renderAll();
    setStatus("material-status", "Material saved locally. Generate a quiz when you are ready.", "success");
  } catch (error) {
    setStatus("material-status", error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function deleteMaterial(materialId) {
  if (busy) {
    return;
  }
  const tracking = studentProfile.tracking || createEmptyTracking();
  tracking.materials = tracking.materials.filter(function (material) { return material.id !== materialId; });
  const removedQuizIds = tracking.quizzes.filter(function (quiz) { return quiz.sourceMaterialId === materialId; }).map(function (quiz) { return quiz.id; });
  tracking.quizzes = tracking.quizzes.filter(function (quiz) { return quiz.sourceMaterialId !== materialId; });
  tracking.attempts = tracking.attempts.filter(function (attempt) { return !removedQuizIds.includes(attempt.quizId); });
  studentProfile.tracking = tracking;
  markEvidenceDirty();
  activeQuizId = "";
  await storageSet();
  renderAll();
  setStatus("material-status", "Material and its generated quiz history were removed.", "success");
}

async function generateQuizForMaterial(materialId) {
  if (busy) {
    return;
  }
  const tracking = studentProfile.tracking || createEmptyTracking();
  const material = tracking.materials.find(function (item) { return item.id === materialId; });
  if (!material) {
    setStatus("quiz-status", "Choose a saved class material first.", "error");
    return;
  }
  const topicSelect = byId("quiz-topic-select");
  setBusy(true, "Verity is turning your class material into a short quiz...");
  setStatus("quiz-status", "Generating a targeted quiz…", "");
  try {
    const result = await requestBackend("/api/quiz", {
      subject: material.subject,
      materialName: material.name,
      materialText: material.contentType === "text/plain" ? material.content : "",
      materialData: material.contentType === "text/plain" ? null : material.content,
      materialType: material.contentType || "text/plain",
      focusTopic: topicSelect ? String(topicSelect.value || "").trim() : ""
    });
    validateQuizResponse(result);
    const quiz = {
      id: makeId(),
      title: result.title,
      subject: result.subject,
      topic: result.topic || (topicSelect ? String(topicSelect.value || "").trim() : ""),
      sourceMaterialId: material.id,
      questions: result.questions,
      createdAt: new Date().toISOString()
    };
    tracking.quizzes.unshift(quiz);
    studentProfile.tracking = tracking;
    markEvidenceDirty();
    await storageSet();
    activeQuizId = quiz.id;
    renderAll();
    navigate("stats");
    setStatus("quiz-status", "Quiz ready. Take it to update the subject score.", "success");
    setMascotState("ready", "Your targeted quiz is ready.");
  } catch (error) {
    setStatus("quiz-status", error.message, "error");
    setMascotState("error", "Verity couldn't make that quiz yet.");
  } finally {
    setBusy(false);
  }
}

async function submitQuizAttempt(quizId) {
  if (busy) {
    return;
  }
  const tracking = studentProfile.tracking || createEmptyTracking();
  const quiz = tracking.quizzes.find(function (item) { return item.id === quizId; });
  const panel = byId("active-quiz");
  const form = panel && panel.querySelector("form");
  if (!quiz || !form) {
    return;
  }
  let correct = 0;
  const topicTotals = {};
  for (let index = 0; index < quiz.questions.length; index += 1) {
    const question = quiz.questions[index];
    const selected = form.querySelector("input[name=quiz-question-" + index + "]:checked");
    if (!selected) {
      setStatus("quiz-status", "Answer every question before saving the attempt.", "error");
      return;
    }
    const topic = question.topic || quiz.topic || "Class material practice";
    if (!topicTotals[topic]) {
      topicTotals[topic] = { correct: 0, total: 0 };
    }
    topicTotals[topic].total += 1;
    if (Number(selected.value) === Number(question.answerIndex)) {
      correct += 1;
      topicTotals[topic].correct += 1;
    }
  }
  const score = Math.round(correct / quiz.questions.length * 100);
  setBusy(true, "Verity is recording what you learned...");
  try {
    tracking.attempts.unshift({
      id: makeId(),
      quizId: quiz.id,
      subject: quiz.subject,
      score: score,
      total: quiz.questions.length,
      completedAt: new Date().toISOString(),
      topicScores: Object.keys(topicTotals).map(function (name) {
        return { name: name, score: Math.round(topicTotals[name].correct / topicTotals[name].total * 100) };
      })
    });
    studentProfile.tracking = tracking;
    studentProfile.evidence.isDemoData = false;
    markEvidenceDirty();
    await storageSet();
    activeQuizId = "";
    renderAll();
    navigate("stats");
    setStatus("stats-status", "Quiz saved at " + score + "%. Your subject score now uses 70% quiz evidence and 30% test evidence.", "success");
    setMascotState("ready", "Verity added that learning evidence to your profile.");
  } catch (error) {
    setStatus("quiz-status", error.message, "error");
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
  }) || studentProfile.evidence.projects.length ||
    (studentProfile.tracking && (studentProfile.tracking.materials.length || studentProfile.tracking.attempts.length));
  if (hasEvidence && !window.confirm("Replace the current evidence with demo data?")) {
    return;
  }
  studentProfile = {
    version: 2,
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
    tracking: {
      materials: [
        {
          id: makeId(),
          name: "Demo · Forces and motion notes",
          subject: "Science",
          content: "Forces can change an object's motion. A balanced force does not change motion, while an unbalanced force causes acceleration.",
          uploadedAt: new Date().toISOString()
        }
      ],
      quizzes: [],
      attempts: []
    },
    skillProfile: null,
    careers: null
  };
  currentOpportunities = [];
  currentOpportunityMessage = "";
  currentOpportunityIntro = "";
  activeQuizId = "";
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
  if (target.dataset.field === "actualTestScore") {
    subject.actualTestScore = target.value;
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
  root.querySelector("#add-material-button").addEventListener("click", addMaterial);
  root.querySelector("#generate-quiz-button").addEventListener("click", function () {
    const select = byId("quiz-material-select");
    generateQuizForMaterial(select ? select.value : "");
  });
  root.querySelector("#quiz-material-select").addEventListener("change", renderFocusTopicOptions);
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

  root.querySelector("#materials-list").addEventListener("click", function (event) {
    const target = event.target;
    if (target.dataset.action === "generate-quiz-from-material") {
      const select = byId("quiz-material-select");
      if (select) {
        select.value = target.dataset.materialId;
        renderFocusTopicOptions();
      }
      generateQuizForMaterial(target.dataset.materialId);
    }
    if (target.dataset.action === "delete-material") {
      deleteMaterial(target.dataset.materialId).catch(function (error) {
        setStatus("material-status", error.message, "error");
      });
    }
  });

  root.querySelector("#quizzes-list").addEventListener("click", function (event) {
    const target = event.target;
    if (target.dataset.action === "take-quiz") {
      activeQuizId = activeQuizId === target.dataset.quizId ? "" : target.dataset.quizId;
      renderQuizzes();
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
