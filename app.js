const storageKey = "question-paper-builder-v1";

const quotes = [
  "学而不思则罔，思而不学则殆。——孔子",
  "天才就是长期劳动的结果。——牛顿",
  "重复是学习之母。——狄慈根",
  "知不足而奋进，望远山而前行。——佚名",
  "不积跬步，无以至千里。——荀子",
  "胜利属于最坚忍的人。——拿破仑",
  "今天的努力，是明天的底气。——佚名",
  "求知若饥，虚心若愚。——乔布斯",
  "纸上得来终觉浅，绝知此事要躬行。——陆游",
  "把每个错误，都变成下一次的答案。——佚名",
];

const sampleQuestions = [
  {
    subject: "数学",
    difficulty: "普通",
    stem: "若函数 f(x)=2x+3，求 f(4) 的值。",
    options: ["8", "10", "11", "12"],
    answer: "11",
    explanation: "把 x=4 代入，2×4+3=11。",
  },
  {
    subject: "语文",
    difficulty: "简单",
    stem: "“会当凌绝顶，一览众山小”出自哪位诗人？",
    options: ["杜甫", "李白", "王维", "白居易"],
    answer: "杜甫",
    explanation: "诗句出自杜甫的《望岳》。",
  },
  {
    subject: "英语",
    difficulty: "普通",
    stem: "Choose the correct form: She ____ to school every day.",
    options: ["go", "goes", "going", "gone"],
    answer: "goes",
    explanation: "主语 she 为第三人称单数，一般现在时动词加 s。",
  },
];

const state = loadState();
let activeView = "bankView";
let showAnswers = false;
let selectedIds = [];
let visibleBankIds = [];
let editingId = "";
let pendingImportItems = [];
let pendingImportSource = "";
let pendingImportSelected = [];
let sidebarCollapsed = false;
let topbarCollapsed = false;

const els = {
  quoteText: document.querySelector("#quoteText"),
  totalCount: document.querySelector("#totalCount"),
  wrongCount: document.querySelector("#wrongCount"),
  paperCount: document.querySelector("#paperCount"),
  masteredCount: document.querySelector("#masteredCount"),
  dueCount: document.querySelector("#dueCount"),
  practiceProgress: document.querySelector("#practiceProgress"),
  questionList: document.querySelector("#questionList"),
  paperList: document.querySelector("#paperList"),
  recentList: document.querySelector("#recentList"),
  wrongList: document.querySelector("#wrongList"),
  folderList: document.querySelector("#folderList"),
  deletedList: document.querySelector("#deletedList"),
  searchInput: document.querySelector("#searchInput"),
  tagFilter: document.querySelector("#tagFilter"),
  masteryFilter: document.querySelector("#masteryFilter"),
  tagInput: document.querySelector("#tagInput"),
  recentTagInput: document.querySelector("#recentTagInput"),
  batchMasteryInput: document.querySelector("#batchMasteryInput"),
  selectedCount: document.querySelector("#selectedCount"),
  fileInput: document.querySelector("#fileInput"),
  backupInput: document.querySelector("#backupInput"),
  pasteInput: document.querySelector("#pasteInput"),
  repairMathBtn: document.querySelector("#repairMathBtn"),
  sidebarToggleBtn: document.querySelector("#sidebarToggleBtn"),
  topbarToggleBtn: document.querySelector("#topbarToggleBtn"),
  questionForm: document.querySelector("#questionForm"),
  editorModal: document.querySelector("#editorModal"),
  editForm: document.querySelector("#editForm"),
  editSubjectInput: document.querySelector("#editSubjectInput"),
  editDifficultyInput: document.querySelector("#editDifficultyInput"),
  editMasteryInput: document.querySelector("#editMasteryInput"),
  editStemInput: document.querySelector("#editStemInput"),
  editOptionsInput: document.querySelector("#editOptionsInput"),
  editAnswerInput: document.querySelector("#editAnswerInput"),
  editExplainInput: document.querySelector("#editExplainInput"),
  editTagsInput: document.querySelector("#editTagsInput"),
  imageTargetInput: document.querySelector("#imageTargetInput"),
  imageInput: document.querySelector("#imageInput"),
  importPreviewModal: document.querySelector("#importPreviewModal"),
  previewSummary: document.querySelector("#previewSummary"),
  previewSelectedCount: document.querySelector("#previewSelectedCount"),
  previewList: document.querySelector("#previewList"),
  folderNameInput: document.querySelector("#folderNameInput"),
  folderSelect: document.querySelector("#folderSelect"),
  savedPaperNameInput: document.querySelector("#savedPaperNameInput"),
  toast: document.querySelector("#toast"),
};

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

setRandomQuote();

document.querySelector("#sampleBtn").addEventListener("click", () => {
  addQuestions(sampleQuestions);
  toast("已载入示例题目");
});

document.querySelector("#pasteImportBtn").addEventListener("click", () => {
  const items = parsePastedQuestions(els.pasteInput.value);

  if (!items.length) {
    toast("没有识别到可导入的题目");
    return;
  }

  openImportPreview(items, "paste");
});

document.querySelector("#makePaperBtn").addEventListener("click", () => {
  if (makePaper(state.questions)) switchView("paperView");
});

document.querySelector("#makeRecentPaperSideBtn")?.addEventListener("click", () => {
  if (makePaper(getRecentQuestions())) switchView("paperView");
});

document.querySelector("#makeWrongPaperBtn").addEventListener("click", () => {
  if (makePaper(getWrongQuestions())) switchView("paperView");
});

document.querySelector("#makeDuePaperBtn").addEventListener("click", () => {
  if (makePaper(getDueQuestions())) switchView("paperView");
});

document.querySelector("#makeReviewPaperBtn").addEventListener("click", () => {
  if (makePaper(getReviewQuestions())) switchView("paperView");
});

document.querySelector("#makeFilteredPaperBtn").addEventListener("click", () => {
  const filteredQuestions = visibleBankIds
    .map((id) => state.questions.find((item) => item.id === id))
    .filter(Boolean);
  if (makePaper(filteredQuestions)) switchView("paperView");
});

document.querySelector("#makeSelectedPaperBtn").addEventListener("click", () => {
  const selectedQuestions = selectedIds
    .map((id) => state.questions.find((item) => item.id === id))
    .filter(Boolean);
  if (makePaper(selectedQuestions)) switchView("paperView");
});

document.querySelector("#makeRecentPaperBtn")?.addEventListener("click", () => {
  if (makePaper(getRecentQuestions())) switchView("paperView");
});

document.querySelector("#clearFiltersBtn").addEventListener("click", () => {
  els.searchInput.value = "";
  els.tagFilter.value = "";
  if (els.masteryFilter) els.masteryFilter.value = "";
  render();
});

document.querySelector("#toggleAnswersBtn").addEventListener("click", (event) => {
  showAnswers = !showAnswers;
  event.currentTarget.textContent = showAnswers ? "隐藏答案" : "显示答案";
  render();
});

document.querySelector("#resetPaperBtn").addEventListener("click", () => {
  state.paperResults = {};
  state.paperAnswers = {};
  saveState();
  render();
  toast("本卷作答记录已清空");
});

document.querySelector("#printPaperBtn").addEventListener("click", () => {
  switchView("paperView");
  window.print();
});

document.querySelector("#exportPaperPdfBtn").addEventListener("click", () => {
  exportViewToPdf("paperView");
});

document.querySelector("#exportPaperWordBtn").addEventListener("click", () => {
  exportViewToWord("paperView", "当前试卷");
});

document.querySelector("#printWrongBtn").addEventListener("click", () => {
  switchView("wrongView");
  window.print();
});

document.querySelector("#exportWrongPdfBtn").addEventListener("click", () => {
  exportViewToPdf("wrongView");
});

document.querySelector("#exportWrongWordBtn").addEventListener("click", () => {
  exportViewToWord("wrongView", "错题卷");
});

document.querySelector("#clearWrongBtn").addEventListener("click", () => {
  state.wrongIds = [];
  saveState();
  render();
  toast("已清空错题标记");
});

document.querySelector("#selectVisibleBtn").addEventListener("click", () => {
  selectedIds = [...new Set([...selectedIds, ...visibleBankIds])];
  render();
});

document.querySelector("#clearSelectionBtn").addEventListener("click", () => {
  selectedIds = [];
  render();
});

document.querySelector("#applyTagBtn").addEventListener("click", applyTagsToSelected);
document.querySelector("#applyRecentTagBtn").addEventListener("click", applyTagsToRecent);
document.querySelector("#applyMasteryBtn")?.addEventListener("click", applyMasteryToSelected);
document.querySelector("#deleteSelectedBtn").addEventListener("click", deleteSelectedQuestions);
document.querySelector("#exportDataBtn").addEventListener("click", exportData);
els.repairMathBtn?.addEventListener("click", repairExistingMath);
els.sidebarToggleBtn?.addEventListener("click", toggleSidebar);
els.topbarToggleBtn?.addEventListener("click", toggleTopbar);
document.querySelector("#clearDeletedBtn")?.addEventListener("click", () => {
  clearDeletedQuestions();
});
document.querySelector("#createFolderBtn").addEventListener("click", createFolder);
document.querySelector("#savePaperToFolderBtn").addEventListener("click", saveCurrentPaperToFolder);
document.querySelector("#saveWrongToFolderBtn").addEventListener("click", saveWrongPaperToFolder);
document.querySelector("#closeEditorBtn").addEventListener("click", closeEditor);
document.querySelector("#cancelEditBtn").addEventListener("click", closeEditor);
document.querySelector("#closePreviewBtn").addEventListener("click", closeImportPreview);
document.querySelector("#cancelImportBtn").addEventListener("click", closeImportPreview);
document.querySelector("#confirmImportBtn").addEventListener("click", confirmImportPreview);
document.querySelector("#selectAllPreviewBtn").addEventListener("click", () => {
  pendingImportSelected = pendingImportItems.map((_, index) => index);
  renderImportPreview();
});
document.querySelector("#clearPreviewSelectionBtn").addEventListener("click", () => {
  pendingImportSelected = [];
  renderImportPreview();
});
els.editorModal.addEventListener("click", (event) => {
  if (event.target === els.editorModal) closeEditor();
});
els.importPreviewModal.addEventListener("click", (event) => {
  if (event.target === els.importPreviewModal) closeImportPreview();
});

els.searchInput.addEventListener("input", render);
els.tagFilter.addEventListener("change", render);
els.masteryFilter?.addEventListener("change", render);
els.fileInput.addEventListener("change", handleFile);
els.backupInput.addEventListener("change", handleBackupImport);
els.questionForm.addEventListener("submit", handleManualAdd);
els.editForm.addEventListener("submit", saveEditedQuestion);
els.imageInput.addEventListener("change", handleImageInsert);
window.addEventListener("load", renderMath);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.editorModal.classList.contains("visible")) {
    closeEditor();
  }
  if (event.key === "Escape" && els.importPreviewModal.classList.contains("visible")) {
    closeImportPreview();
  }
});

render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      questions: Array.isArray(saved?.questions) ? saved.questions : [],
      wrongIds: Array.isArray(saved?.wrongIds) ? saved.wrongIds : [],
  paperIds: Array.isArray(saved?.paperIds) ? saved.paperIds : [],
  recentIds: Array.isArray(saved?.recentIds) ? saved.recentIds : [],
  deletedQuestions: Array.isArray(saved?.deletedQuestions) ? saved.deletedQuestions : [],
  paperResults: saved?.paperResults && typeof saved.paperResults === "object" ? saved.paperResults : {},
  paperAnswers: saved?.paperAnswers && typeof saved.paperAnswers === "object" ? saved.paperAnswers : {},
  folders: Array.isArray(saved?.folders) ? saved.folders : [],
    };
  } catch {
    return {
      questions: [],
      wrongIds: [],
      paperIds: [],
  recentIds: [],
  deletedQuestions: [],
  paperResults: {},
  paperAnswers: {},
  folders: [],
    };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function normalizeQuestionContent(value) {
  return normalizeLatexInput(cleanImportedText(value));
}

function normalizeOptionText(value) {
  return stripDisplayMathAroundOption(normalizeLatexInput(cleanImportedText(value)));
}

function stripDisplayMathAroundOption(value) {
  return String(value || "")
    .replace(/^\s*\$\$\s*([A-HＡ-Ｈ][.、．)][\s\S]*?)\s*\$\$\s*$/i, "$1")
    .replace(/^\s*\\\[\s*([A-HＡ-Ｈ][.、．)][\s\S]*?)\s*\\\]\s*$/i, "$1")
    .trim();
}

function normalizeAnswerText(answer, type = "", options = []) {
  const cleaned = normalizeQuestionContent(answer).replace(/^[答案：:\s]+/g, "").trim();
  const objective = normalizeObjectiveAnswer(cleaned);
  if (objective && (isObjectiveType(type, options, objective) || /^[A-H]$|^[TF]$/.test(objective))) {
    return objective;
  }
  return cleaned;
}

function displayAnswer(item) {
  return normalizeAnswerText(item.answer, item.type, item.options);
}

function isObjectiveType(type = "", options = [], answer = "") {
  return (
    /选择|单选|多选|判断|正误|true|false/i.test(String(type || "")) ||
    (Array.isArray(options) && options.length >= 2) ||
    /^[A-H]$|^[TF]$/.test(answer)
  );
}

function normalizeObjectiveAnswer(answer) {
  const value = String(answer || "")
    .trim()
    .replace(/[。．.、，,\s]+$/g, "")
    .replace(/^选\s*/i, "")
    .replace(/^答案\s*[:：]?\s*/i, "");

  const upper = value.toUpperCase();
  const letter = upper.match(/^[A-H](?=$|[。．.、，,\s）)]|选项)/);
  if (letter) return letter[0];

  if (/^(?:T|TRUE|对|正确|是|√|✓)(?:[,，、/]\s*T)?$/i.test(value)) return "T";
  if (/^(?:F|FALSE|错|错误|否|×|✗)(?:[,，、/]\s*F)?$/i.test(value)) return "F";
  if (/^(?:对|正确|是)[,，、/]\s*(?:T|TRUE)$/i.test(value)) return "T";
  if (/^(?:错|错误|否)[,，、/]\s*(?:F|FALSE)$/i.test(value)) return "F";

  return "";
}

function getOptionLetter(option) {
  const match = String(option || "").trim().match(/^([A-H])(?:[.．、，,\s]|$)/i);
  return match ? match[1].toUpperCase() : "";
}

function normalizeQuestion(item) {
  const options = Array.isArray(item.options)
    ? item.options
    : String(item.options || item["选项"] || "")
        .split(/\n|;|；/)
        .map((option) => option.trim())
        .filter(Boolean);
  const type = item.type || item.questionType || item["题型"] || "";
  let normalizedStem = normalizeQuestionContent(item.stem || item.question || item["题目"] || item["题干"] || "");
  let normalizedOptions = options.map((option) => normalizeOptionText(option));
  const merged = mergeOptionsFromStem(normalizedStem, normalizedOptions);
  normalizedStem = merged.stem;
  normalizedOptions = merged.options;
  const rawAnswer = normalizeQuestionContent(item.answer || item["答案"] || "");

  return {
    id: item.id || crypto.randomUUID(),
    subject: item.subject || item["科目"] || "未分类",
    chapter: item.chapter || item["章节"] || "",
    type,
    difficulty: item.difficulty || item["难度"] || "普通",
    stem: normalizedStem,
    options: normalizedOptions,
    answer: normalizeAnswerText(rawAnswer, type, normalizedOptions),
    explanation: normalizeQuestionContent(item.explanation || item.analysis || item["解析"] || ""),
    tags: normalizeTags(item.tags || item["标签"] || item.tag || ""),
    mastery: normalizeMastery(item.mastery || item["掌握状态"] || item["掌握"] || "未掌握"),
    wrongTimes: Number(item.wrongTimes || item["错题次数"] || item.errorCount || item.wrongCount || 0),
    reviewCount: Number(item.reviewCount || item["复习次数"] || 0),
    lastReviewed: item.lastReviewed || item["上次复习"] || "",
    nextReview: item.nextReview || item["下次复习"] || "",
  };
}

function addQuestions(items) {
  const cleaned = items.map(normalizeQuestion).filter((item) => item.stem && item.answer);
  state.questions = [...state.questions, ...cleaned];
  if (cleaned.length) {
    state.recentIds = cleaned.map((item) => item.id);
  }
  const dedupedCount = deduplicateQuestions();
  saveState();
  render();
  if (dedupedCount) {
    toast(`已导入 ${cleaned.length} 道题，并自动移除 ${dedupedCount} 道重复短题`);
  }
}

function handleManualAdd(event) {
  event.preventDefault();
  addQuestions([
    {
      subject: document.querySelector("#subjectInput").value,
      difficulty: document.querySelector("#difficultyInput").value,
      stem: normalizeLatexInput(document.querySelector("#stemInput").value),
      options: normalizeLatexInput(document.querySelector("#optionsInput").value),
      answer: normalizeLatexInput(document.querySelector("#answerInput").value),
      explanation: normalizeLatexInput(document.querySelector("#explainInput").value),
    },
  ]);
  els.questionForm.reset();
  toast("题目已添加");
}

function openEditor(id) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;

  editingId = id;
  els.editSubjectInput.value = question.subject || "未分类";
  els.editDifficultyInput.value = question.difficulty || "普通";
  if (els.editMasteryInput) els.editMasteryInput.value = getMastery(question);
  els.editStemInput.value = question.stem || "";
  els.editOptionsInput.value = (question.options || []).join("\n");
  els.editAnswerInput.value = question.answer || "";
  els.editExplainInput.value = question.explanation || "";
  els.editTagsInput.value = normalizeTags(question.tags).join(" ");
  els.editorModal.classList.add("visible");
  els.editorModal.setAttribute("aria-hidden", "false");
  els.editStemInput.focus();
}

function closeEditor() {
  editingId = "";
  els.editForm.reset();
  els.editorModal.classList.remove("visible");
  els.editorModal.setAttribute("aria-hidden", "true");
}

function saveEditedQuestion(event) {
  event.preventDefault();

  if (!editingId) return;

  state.questions = state.questions.map((question) => {
    if (question.id !== editingId) return question;
    return {
      ...question,
      subject: els.editSubjectInput.value.trim() || "未分类",
      difficulty: els.editDifficultyInput.value || "普通",
      mastery: normalizeMastery(els.editMasteryInput?.value || question.mastery || "未掌握"),
      stem: normalizeQuestionContent(els.editStemInput.value),
      options: els.editOptionsInput.value
        .split("\n")
        .map((option) => normalizeOptionText(option))
        .filter(Boolean),
      answer: normalizeAnswerText(normalizeQuestionContent(els.editAnswerInput.value), question.type, els.editOptionsInput.value.split("\n")),
      explanation: normalizeQuestionContent(els.editExplainInput.value) || "暂无解析",
      tags: normalizeTags(els.editTagsInput.value),
    };
  });

  saveState();
  closeEditor();
  render();
  toast("题目已更新");
}

function handleImageInsert(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    toast("请选择图片文件");
    event.target.value = "";
    return;
  }

  if (file.size > 2.5 * 1024 * 1024) {
    toast("图片太大，建议小于 2.5MB");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    insertImageToken(String(reader.result || ""));
    event.target.value = "";
  };
  reader.onerror = () => {
    toast("图片读取失败");
    event.target.value = "";
  };
  reader.readAsDataURL(file);
}

function insertImageToken(dataUrl) {
  if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    toast("图片格式不支持");
    return;
  }

  const target = {
    stem: els.editStemInput,
    answer: els.editAnswerInput,
    explanation: els.editExplainInput,
  }[els.imageTargetInput.value];

  const token = `\n[[image:${dataUrl}]]\n`;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  target.value = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`;
  target.focus();
  target.selectionStart = target.selectionEnd = start + token.length;
  toast("图片已插入");
}

async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const items = file.name.endsWith(".json") ? JSON.parse(text) : parseCsv(text);
    const normalizedItems = (Array.isArray(items) ? items : items.questions || [])
      .map(normalizeQuestion)
      .filter((item) => item.stem && item.answer);

    if (!normalizedItems.length) {
      toast("没有识别到可导入的题目");
      return;
    }

    openImportPreview(normalizedItems, "file");
  } catch {
    toast("导入失败，请检查文件格式");
  } finally {
    event.target.value = "";
  }
}

function openImportPreview(items, source) {
  pendingImportItems = items.map(normalizeQuestion).filter((item) => item.stem && item.answer);
  pendingImportSource = source;
  pendingImportSelected = pendingImportItems.map((_, index) => index);

  if (!pendingImportItems.length) {
    toast("没有识别到可导入的题目");
    return;
  }

  renderImportPreview();
  els.importPreviewModal.classList.add("visible");
  els.importPreviewModal.setAttribute("aria-hidden", "false");
  renderMath();
}

function closeImportPreview() {
  pendingImportItems = [];
  pendingImportSource = "";
  pendingImportSelected = [];
  els.previewList.innerHTML = "";
  els.importPreviewModal.classList.remove("visible");
  els.importPreviewModal.setAttribute("aria-hidden", "true");
}

function confirmImportPreview() {
  const selectedItems = pendingImportSelected
    .map((index) => pendingImportItems[index])
    .filter(Boolean);

  if (!selectedItems.length) {
    toast("请至少选择一道题");
    return;
  }

  const importedCount = selectedItems.length;
  addQuestions(selectedItems);
  if (pendingImportSource === "paste") {
    els.pasteInput.value = "";
  }
  closeImportPreview();
  toast(`已导入 ${importedCount} 道题`);
}

function renderImportPreview() {
  els.previewSummary.textContent = `识别到 ${pendingImportItems.length} 道题。请检查题目、答案和解析是否正确。`;
  els.previewSelectedCount.textContent = `已选 ${pendingImportSelected.length} 题`;
  els.previewList.innerHTML = pendingImportItems
    .map((item, index) => previewCard(item, index))
    .join("");

  document.querySelectorAll("[data-preview-index]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      togglePreviewSelection(Number(checkbox.dataset.previewIndex), checkbox.checked);
    });
  });
  renderMath();
}

function togglePreviewSelection(index, checked) {
  pendingImportSelected = checked
    ? [...new Set([...pendingImportSelected, index])]
    : pendingImportSelected.filter((item) => item !== index);
  els.previewSelectedCount.textContent = `已选 ${pendingImportSelected.length} 题`;
}

function previewCard(item, index) {
  const options = item.options.length
    ? `<ol class="options">${item.options.map((option) => `<li>${richText(option)}</li>`).join("")}</ol>`
    : "";
  const checked = pendingImportSelected.includes(index) ? "checked" : "";

  return `
    <article class="questionCard previewCard">
      <div class="questionHead">
        <p class="stem">${index + 1}. ${richText(item.stem)}</p>
        <label class="selectQuestion">
          <input data-preview-index="${index}" type="checkbox" ${checked} />
          <span>导入</span>
        </label>
      </div>
      <div class="meta">
        <span class="pill">${escapeHtml(item.subject)}</span>
        ${item.chapter ? `<span class="pill">${escapeHtml(item.chapter)}</span>` : ""}
        ${item.type ? `<span class="pill">${escapeHtml(item.type)}</span>` : ""}
        <span class="pill">${escapeHtml(item.difficulty)}</span>
        ${normalizeTags(item.tags).map((tag) => `<span class="pill tag">${escapeHtml(tag)}</span>`).join("")}
      </div>
      ${options}
      <div class="answerBox visible">
        <div class="qaItem">
          <strong>答案：</strong>
          <div class="richText">${formatRichText(displayAnswer(item))}</div>
        </div>
        <div class="qaItem">
          <strong>解析：</strong>
          <div class="richText">${formatRichText(item.explanation || "暂无解析")}</div>
        </div>
      </div>
    </article>
  `;
}

async function handleBackupImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    if (!Array.isArray(backup.questions)) {
      toast("备份文件格式不正确");
      return;
    }

    state.questions = backup.questions.map(normalizeQuestion);
    state.wrongIds = Array.isArray(backup.wrongIds) ? backup.wrongIds : [];
    state.paperIds = Array.isArray(backup.paperIds) ? backup.paperIds : [];
    state.recentIds = Array.isArray(backup.recentIds) ? backup.recentIds : [];
    state.deletedQuestions = Array.isArray(backup.deletedQuestions) ? backup.deletedQuestions : [];
    state.paperResults =
      backup.paperResults && typeof backup.paperResults === "object" ? backup.paperResults : {};
    state.paperAnswers =
      backup.paperAnswers && typeof backup.paperAnswers === "object" ? backup.paperAnswers : {};
    state.folders = Array.isArray(backup.folders) ? backup.folders : [];
    selectedIds = [];
    saveState();
    render();
    toast(`已恢复 ${state.questions.length} 道题`);
  } catch {
    toast("恢复失败，请检查备份文件");
  } finally {
    event.target.value = "";
  }
}

function exportData() {
  const backup = {
    exportedAt: new Date().toISOString(),
    questions: state.questions,
    wrongIds: state.wrongIds,
    paperIds: state.paperIds,
    recentIds: state.recentIds,
    deletedQuestions: state.deletedQuestions || [],
    paperResults: state.paperResults || {},
    paperAnswers: state.paperAnswers || {},
    folders: state.folders || [],
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `错题组卷助手备份-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("备份已导出");
}

function repairExistingMath() {
  const confirmed = window.confirm("这会尝试修复当前题库中的数学公式。建议先导出备份。是否继续？");
  if (!confirmed) return;

  state.questions = state.questions.map((question) => {
    const repaired = repairQuestionOptions(question);
    return {
      ...question,
      ...repaired,
      answer: normalizeAnswerText(question.answer, question.type, repaired.options),
      explanation: normalizeQuestionContent(question.explanation || "暂无解析"),
    };
  });
  const dedupedCount = deduplicateQuestions();
  saveState();
  render();
  toast(dedupedCount ? `已修复公式，并自动移除 ${dedupedCount} 道重复短题` : "已尝试修复已有题目的数学公式");
}

function exportViewToPdf(viewId) {
  switchView(viewId);
  window.print();
}

function exportViewToWord(viewId, title) {
  const view = document.querySelector(`#${viewId}`);
  const list = view?.querySelector(".questionList");

  if (!list || !list.children.length) {
    toast("没有可导出的内容");
    return;
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1e2723; line-height: 1.65; }
          h1 { font-size: 22px; margin: 0 0 18px; }
          .questionCard { page-break-inside: avoid; border-bottom: 1px solid #ddd; padding: 14px 0; }
          .stem { font-weight: 700; white-space: pre-wrap; }
          .meta, .cardActions, .practiceActions, .selectQuestion { display: none; }
          .options { margin-top: 10px; }
          .answerBox { margin-top: 10px; padding: 10px; background: #f7faf7; border: 1px solid #ddd; }
          .answerBox:not(.visible) { display: none; }
          .inlineImage { display: block; max-width: 640px; max-height: 380px; margin: 10px auto; }
          .katex-html { display: none; }
          .katex-mathml { display: inline; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${list.innerHTML}
      </body>
    </html>
  `;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title}-${todayKey()}.doc`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Word 文件已导出");
}

function createFolder() {
  const name = els.folderNameInput.value.trim();

  if (!name) {
    toast("请输入文件夹名称");
    return;
  }

  state.folders = [
    ...(state.folders || []),
    {
      id: crypto.randomUUID(),
      name,
      papers: [],
      createdAt: new Date().toISOString(),
    },
  ];
  els.folderNameInput.value = "";
  saveState();
  render();
  toast("文件夹已创建");
}

function saveCurrentPaperToFolder() {
  if (!state.paperIds.length) {
    toast("当前没有试卷可保存");
    return;
  }

  const name = els.savedPaperNameInput.value.trim() || `试卷 ${new Date().toLocaleString("zh-CN")}`;
  const saved = saveQuestionsToFolder({
    questionIds: state.paperIds,
    name,
    type: "paper",
    emptyMessage: "当前没有试卷可保存",
    successMessage: "试卷已保存到文件夹，当前试卷已清空",
  });

  if (!saved) return;

  state.paperIds = [];
  state.paperResults = {};
  state.paperAnswers = {};
  els.savedPaperNameInput.value = "";
  saveState();
  render();
}

function saveWrongPaperToFolder() {
  const wrongQuestionIds = getWrongQuestions().map((item) => item.id);
  const name = els.savedPaperNameInput.value.trim() || `错题本 ${new Date().toLocaleString("zh-CN")}`;
  const saved = saveQuestionsToFolder({
    questionIds: wrongQuestionIds,
    name,
    type: "wrong",
    emptyMessage: "当前没有错题可保存",
    successMessage: "错题本已保存到文件夹",
  });

  if (!saved) return;

  els.savedPaperNameInput.value = "";
  saveState();
  render();
}

function saveQuestionsToFolder({ questionIds, name, type, emptyMessage, successMessage }) {
  const folderId = els.folderSelect.value;
  const folder = (state.folders || []).find((item) => item.id === folderId);

  if (!folder) {
    toast("请先选择文件夹");
    return false;
  }

  const validIds = [...new Set(questionIds)].filter((id) => state.questions.some((item) => item.id === id));

  if (!validIds.length) {
    toast(emptyMessage);
    return false;
  }

  folder.papers = [
    ...(folder.papers || []),
    {
      id: crypto.randomUUID(),
      name,
      type,
      questionIds: validIds,
      savedAt: new Date().toISOString(),
    },
  ];
  toast(successMessage);
  return true;
}

function openSavedPaper(folderId, paperId) {
  const folder = (state.folders || []).find((item) => item.id === folderId);
  const paper = folder?.papers?.find((item) => item.id === paperId);

  if (!paper) {
    toast("没有找到这张试卷");
    return;
  }

  state.paperIds = paper.questionIds.filter((id) => state.questions.some((item) => item.id === id));
  state.paperResults = {};
  state.paperAnswers = {};
  saveState();
  render();
  switchView("paperView");
  toast(`已打开：${paper.name}`);
}

async function deleteSavedPaper(folderId, paperId) {
  const folder = (state.folders || []).find((item) => item.id === folderId);
  if (!folder) return;
  const paper = (folder.papers || []).find((item) => item.id === paperId);
  const confirmed = await askConfirm(`确定要移除“${paper?.name || "这张试卷"}”吗？`, "移除后只会从文件夹中删除，不会删除题库里的题目。");
  if (!confirmed) return;

  folder.papers = (folder.papers || []).filter((item) => item.id !== paperId);
  saveState();
  render();
  toast("试卷已从文件夹移除");
}

function syncFolderSelect() {
  const current = els.folderSelect.value;
  const options = ['<option value="">选择文件夹</option>']
    .concat(
      (state.folders || []).map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
    )
    .join("");

  if (els.folderSelect.innerHTML !== options) {
    els.folderSelect.innerHTML = options;
  }
  els.folderSelect.value = (state.folders || []).some((folder) => folder.id === current) ? current : "";
}

function renderFolders() {
  if (!state.folders?.length) return "";

  return state.folders
    .map((folder) => {
      const papers = folder.papers || [];
      const paperRows = papers.length
        ? papers
            .map((paper) => {
              const count = paper.questionIds.filter((id) => state.questions.some((item) => item.id === id)).length;
              const typeLabel = paper.type === "wrong" ? "错题本" : "试卷";
              return `
                <div class="savedPaper">
                  <div>
                    <strong>${escapeHtml(paper.name)}</strong>
                    <span>${escapeHtml(typeLabel)} · ${count} 题 · ${formatDateTime(paper.savedAt)}</span>
                  </div>
                  <div class="savedPaperActions">
                    <button class="secondary" data-open-paper data-folder-id="${escapeHtml(folder.id)}" data-paper-id="${escapeHtml(paper.id)}" type="button">打开</button>
                    <button class="secondary" data-delete-paper data-folder-id="${escapeHtml(folder.id)}" data-paper-id="${escapeHtml(paper.id)}" type="button">移除</button>
                  </div>
                </div>
              `;
            })
            .join("")
        : '<p class="folderEmpty">这个文件夹还没有试卷。</p>';

      return `
        <section class="folderCard">
          <div class="folderHead">
            <h3>${escapeHtml(folder.name)}</h3>
            <span>${papers.length} 张试卷</span>
          </div>
          <div class="savedPaperList">${paperRows}</div>
        </section>
      `;
    })
    .join("");
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseCsv(text) {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map(parseCsvLine);
  const headers = rows.shift() || [];
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] || ""]))
  );
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function parsePastedQuestions(text) {
  const rawText = cleanGptImportText(normalizeLatexInput(String(text || ""))).replace(/\r\n?/g, "\n").trim();
  if (!rawText) return [];

  if (hasWebImportFormat(rawText)) {
    const webItems = parseWebImportQuestions(rawText);
    if (!webItems.length) {
      console.warn("parsePastedQuestions: 网页导入格式未识别到有效题目", rawText);
    }
    return webItems;
  }

  const normalized = rawText
    .replace(/\r\n?/g, "\n")
    .replace(/[【\[]\s*(题目|题干|问题|材料)\s*[】\]]/g, "\n题目：\n")
    .replace(/[【\[]\s*(答案|参考答案|正确答案|答案与解析)\s*[】\]]/g, "\n答案：\n")
    .replace(/[【\[]\s*(解析|分析|详解|解答|讲解|答案解析)\s*[】\]]/g, "\n解析：\n")
    .replace(/(^|\n)\s*(参考答案|正确答案|答案与解析)\s*[:：]/g, "$1答案：")
    .replace(/(^|\n)\s*(分析|详解|解答|讲解|答案解析)\s*[:：]/g, "$1解析：")
    .replace(/(^|\n)\s*(问题|材料)\s*[:：]/g, "$1题目：")
    .trim();

  if (!normalized) return [];

  const items = splitPastedBlocks(normalized)
    .map(parsePastedBlock)
    .filter((item) => item.stem && item.answer);

  if (!items.length) {
    console.warn("parsePastedQuestions: 未识别到可导入题目", rawText);
  }

  return items;
}

function hasWebImportFormat(text) {
  return /(^|\n)\s*#{1,6}\s*(?:.*?第\s*\d+\s*题|\d+\s*[.、．]\s*)/.test(text) && /【\s*题目\s*】/.test(text) && /【\s*答案\s*】/.test(text);
}

function parseWebImportQuestions(text) {
  return splitWebImportBlocks(text)
    .map(parseWebImportBlock)
    .filter((item) => item.stem && item.answer);
}

function splitWebImportBlocks(text) {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .split(/(?=^\s*#{1,6}\s*(?:.*?第\s*\d+\s*题|\d+\s*[.、．]\s*).*$)/gm)
    .map((block) => block.trim())
    .filter((block) => /【\s*题目\s*】/.test(block) && /【\s*答案\s*】/.test(block));
}

function parseWebImportBlock(block) {
  const sections = extractBracketSections(block, ["题目", "选项", "答案", "解析", "公式", "易错点"]);
  const metadataText = getWebMetadataText(block);
  const optionsText = sections["选项"] || "";
  const explanationParts = [];

  appendLabeledExplanation(explanationParts, "", sections["解析"]);
  appendLabeledExplanation(explanationParts, "【公式】", sections["公式"]);
  appendLabeledExplanation(explanationParts, "【易错点】", sections["易错点"]);

  return {
    subject: readMetadata(metadataText, "科目") || "中级微观经济学",
    chapter: readMetadata(metadataText, "章节") || "",
    difficulty: readMetadata(metadataText, "难度") || "普通",
    type: readMetadata(metadataText, "题型") || "",
    stem: cleanSectionText(sections["题目"]),
    options: parseWebOptions(optionsText),
    answer: cleanSectionText(sections["答案"]),
    explanation: explanationParts.join("\n\n").trim() || "暂无解析",
  };
}

function extractBracketSections(block, names) {
  const markerPattern = new RegExp(`【\\s*(${names.join("|")})\\s*】`, "g");
  const markers = [...block.matchAll(markerPattern)];
  const sections = {};

  markers.forEach((marker, index) => {
    const next = markers[index + 1];
    sections[marker[1]] = cleanSectionText(block.slice(marker.index + marker[0].length, next ? next.index : block.length));
  });

  return sections;
}

function getWebMetadataText(block) {
  const firstSection = block.search(/【\s*(题目|选项|答案|解析|公式|易错点)\s*】/);
  return firstSection >= 0 ? block.slice(0, firstSection) : block;
}

function readMetadata(text, label) {
  const match = String(text || "").match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:：]\\s*([^\\n]+)`));
  return match ? match[1].trim() : "";
}

function cleanSectionText(value) {
  return cleanImportedText(value);
}

function parseWebOptions(text) {
  const value = cleanSectionText(text);
  if (!value || /^无\s*$/i.test(value)) return [];

  const lineOptions = value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-HＡ-Ｈ][.、．)]\s+/.test(line));

  if (lineOptions.length) return uniqueOptions(lineOptions);
  return uniqueOptions(splitOptionText(value));
}

function appendLabeledExplanation(parts, label, value) {
  const text = cleanSectionText(value);
  if (!text) return;
  parts.push(label ? `${label}\n${text}` : text);
}

function splitPastedBlocks(text) {
  const headingBlocks = text
    .split(/(?=^\s*(?:#{1,6}\s*)?(?:第\s*\d+\s*题|题\s*\d+|Q\s*\d+|Question\s*\d+)\s*[.、：:]?\s*$)/gim)
    .map((block) => block.trim())
    .filter(Boolean);

  if (headingBlocks.length > 1) return headingBlocks;

  const numberedBlocks = text
    .split(/(?=^\s*(?:\d+|[一二三四五六七八九十]+)[.、．]\s+)/gm)
    .map((block) => block.trim())
    .filter(Boolean);

  if (numberedBlocks.length > 1 && numberedBlocks.some(hasAnswerLabel)) return numberedBlocks;

  const lineBlocks = [];
  let currentLines = [];
  text.split("\n").forEach((line) => {
    const currentText = currentLines.join("\n");
    if (currentLines.length && looksLikeQuestionStart(line) && hasAnswerLabel(currentText)) {
      lineBlocks.push(currentText.trim());
      currentLines = [];
    }
    currentLines.push(line);
  });

  if (currentLines.length) lineBlocks.push(currentLines.join("\n").trim());
  if (lineBlocks.length > 1) return lineBlocks.filter(Boolean);

  const paragraphs = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const blocks = [];
  let current = [];

  paragraphs.forEach((paragraph) => {
    const currentText = current.join("\n\n");
    if (current.length && looksLikeQuestionStart(paragraph) && hasAnswerLabel(currentText)) {
      blocks.push(currentText);
      current = [];
    }
    current.push(paragraph);
  });

  if (current.length) blocks.push(current.join("\n\n"));
  return blocks.length ? blocks : [text];
}

function parsePastedBlock(block) {
  const question = {
    subject: "未分类",
    difficulty: "普通",
    stem: "",
    options: [],
    answer: "",
    explanation: "暂无解析",
  };
  const fieldLines = {
    stem: [],
    answer: [],
    explanation: [],
  };
  let currentField = "";

  block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const labelMatch = line.match(/^(科目|难度|题目|题干|选项|答案|解析|分析)\s*[:：]\s*(.*)$/);

      if (labelMatch) {
        const label = normalizeQuestionLabel(labelMatch[1]);
        const value = labelMatch[2].trim();
        const parts = splitInlineFields(value);

        if (label === "科目") {
          question.subject = value || question.subject;
          currentField = "";
        } else if (label === "难度") {
          question.difficulty = value || question.difficulty;
          currentField = "";
        } else if (label === "题目" || label === "题干") {
          currentField = "stem";
          const extracted = extractOptionsFromText(stripQuestionNumber(parts.main));
          appendField(fieldLines.stem, extracted.text);
          question.options.push(...extracted.options);
          appendField(fieldLines.answer, parts.answer);
          appendField(fieldLines.explanation, parts.explanation);
        } else if (label === "选项") {
          currentField = "options";
          question.options.push(...splitOptionText(parts.main));
          appendField(fieldLines.answer, parts.answer);
          appendField(fieldLines.explanation, parts.explanation);
        } else if (label === "答案") {
          currentField = "answer";
          appendField(fieldLines.answer, parts.main);
          appendField(fieldLines.explanation, parts.explanation);
        } else if (label === "解析" || label === "分析") {
          currentField = "explanation";
          appendField(fieldLines.explanation, parts.main);
        }
        return;
      }

      const inlineParts = splitInlineFields(line);
      if (inlineParts.answer || inlineParts.explanation) {
        if (inlineParts.main) {
          const extracted = extractOptionsFromText(stripQuestionNumber(inlineParts.main));
          if (extracted.options.length && currentField !== "answer" && currentField !== "explanation") {
            appendField(fieldLines.stem, extracted.text);
            question.options.push(...extracted.options);
          } else if (currentField === "answer") {
            appendField(fieldLines.answer, inlineParts.main);
          } else if (currentField === "explanation") {
            appendField(fieldLines.explanation, inlineParts.main);
          } else {
            appendField(fieldLines.stem, extracted.text);
          }
        }
        appendField(fieldLines.answer, inlineParts.answer);
        appendField(fieldLines.explanation, inlineParts.explanation);
        currentField = inlineParts.explanation ? "explanation" : "answer";
        return;
      }

      const optionParts = splitOptionText(line);
      if (optionParts.length && currentField !== "answer" && currentField !== "explanation") {
        question.options.push(...optionParts);
        currentField = "options";
        return;
      }

      if (currentField === "answer") {
        appendField(fieldLines.answer, line);
      } else if (currentField === "explanation") {
        appendField(fieldLines.explanation, line);
      } else {
        currentField = "stem";
        const extracted = extractOptionsFromText(stripQuestionNumber(line));
        appendField(fieldLines.stem, extracted.text);
        question.options.push(...extracted.options);
      }
    });

  inferAnswerAndExplanation(fieldLines);
  question.stem = fieldLines.stem.join("\n").trim();
  question.answer = fieldLines.answer.join("\n").trim();
  question.explanation = fieldLines.explanation.join("\n").trim() || "暂无解析";
  question.options = uniqueOptions(question.options);
  return question;
}

function appendField(lines, value) {
  if (value) lines.push(value);
}

function hasAnswerLabel(text) {
  return /(?:^|\n)\s*(?:(?:答案|参考答案|正确答案|答案与解析)\s*[:：]|[【\[]\s*(?:答案|参考答案|正确答案|答案与解析)\s*[】\]])/.test(text);
}

function looksLikeQuestionStart(text) {
  return /^\s*(?:#{1,6}\s*)?(?:第\s*\d+\s*题|题\s*\d+|Q\s*\d+|Question\s*\d+|科目\s*[:：]|题目\s*[:：]|题干\s*[:：]|问题\s*[:：]|材料\s*[:：]|[【\[]\s*(?:题目|题干|问题|材料)\s*[】\]]|(?:\d+|[一二三四五六七八九十]+)[.、．]\s+)/i.test(text);
}

function stripQuestionNumber(text) {
  return String(text || "")
    .replace(/^\s*(?:#{1,6}\s*)?(?:第\s*\d+\s*题|题\s*\d+|Q\s*\d+|Question\s*\d+|(?:(?:\d+|[一二三四五六七八九十]+)[.、．]))\s*/i, "")
    .trim();
}

function splitOptionText(text) {
  const value = String(text || "").trim();
  if (!value) return [];

  const optionMatches = value.match(/[A-HＡ-Ｈ][.、．)]\s*[\s\S]*?(?=\s*[A-HＡ-Ｈ][.、．)]\s*|$)/g) || [];
  if (!optionMatches.length) return [];

  const joined = optionMatches.join("").trim();
  if (joined.length < value.length * 0.5) return [];
  return optionMatches.map((option) => stripOptionNoise(option)).filter(Boolean);
}

function extractOptionsFromText(text) {
  const value = stripOrphanMathDelimiters(String(text || "")).trim();
  const matches = [...value.matchAll(/[A-HＡ-Ｈ][.、．)]\s*[\s\S]*?(?=\s*[A-HＡ-Ｈ][.、．)]\s*|$)/g)];

  if (matches.length < 2) {
    return { text: value, options: [] };
  }

  const firstOptionIndex = matches[0].index;
  const stemText = value.slice(0, firstOptionIndex).trim();
  const optionText = value.slice(firstOptionIndex).trim();
  return {
    text: stemText,
    options: splitOptionText(optionText),
  };
}

function stripOptionNoise(option) {
  return stripOrphanMathDelimiters(String(option || ""))
    .replace(/^\s*\$\$\s*/g, "")
    .replace(/\s*\$\$\s*$/g, "")
    .replace(/^\s*\\\[\s*/g, "")
    .replace(/\s*\\\]\s*$/g, "")
    .trim();
}

function normalizeQuestionLabel(label) {
  const map = {
    问题: "题目",
    材料: "题目",
    参考答案: "答案",
    正确答案: "答案",
    答案与解析: "答案",
    详解: "解析",
    解答: "解析",
    讲解: "解析",
    答案解析: "解析",
  };
  return map[label] || label;
}

function splitInlineFields(text) {
  const result = { main: String(text || "").trim(), answer: "", explanation: "" };
  const answerPattern = /(答案|参考答案|正确答案|答案与解析)\s*[:：]\s*/;
  const explanationPattern = /(解析|分析|详解|解答|讲解|答案解析)\s*[:：]\s*/;
  const answerMatch = result.main.match(answerPattern);
  const explanationMatch = result.main.match(explanationPattern);

  if (!answerMatch && !explanationMatch) return result;

  const markers = [];
  if (answerMatch) markers.push({ type: "answer", index: answerMatch.index, length: answerMatch[0].length });
  if (explanationMatch) {
    markers.push({ type: "explanation", index: explanationMatch.index, length: explanationMatch[0].length });
  }
  markers.sort((a, b) => a.index - b.index);

  result.main = result.main.slice(0, markers[0].index).trim();
  markers.forEach((marker, index) => {
    const next = markers[index + 1];
    const value = text.slice(marker.index + marker.length, next ? next.index : text.length).trim();
    if (marker.type === "answer") result.answer = value;
    if (marker.type === "explanation") result.explanation = value;
  });

  return result;
}

function inferAnswerAndExplanation(fieldLines) {
  if (fieldLines.answer.length || !fieldLines.stem.length) return;

  const lastIndex = fieldLines.stem.length - 1;
  const lastLine = fieldLines.stem[lastIndex];
  const answerOnlyMatch = lastLine.match(/^(?:答[:：]?\s*)?([A-HＡ-Ｈ]|[对错√×]|正确|错误|是|否|[-+]?\\?frac\{[^}]+\}\{[^}]+\}|[-+]?\d+(?:\.\d+)?|选\s*[A-HＡ-Ｈ])$/);

  if (answerOnlyMatch && fieldLines.stem.length > 1) {
    fieldLines.answer.push(answerOnlyMatch[1].replace(/^选\s*/, ""));
    fieldLines.stem.splice(lastIndex, 1);
  }
}

function uniqueOptions(options) {
  const seen = new Set();
  return options.filter((option) => {
    const key = option.replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makePaper(source) {
  if (!source.length) {
    toast("没有可组卷的题目");
    return false;
  }

  state.paperIds = source.map((item) => item.id);
  state.paperResults = {};
  state.paperAnswers = {};
  saveState();
  render();
  toast(`试卷已生成，共 ${state.paperIds.length} 道题`);
  return true;
}

function getWrongQuestions() {
  return state.questions
    .filter((item) => state.wrongIds.includes(item.id))
    .sort((a, b) => getWrongTimes(b) - getWrongTimes(a));
}

function getDueQuestions() {
  return state.questions.filter(isDueQuestion);
}

function getReviewQuestions() {
  return state.questions.filter(
    (item) => state.wrongIds.includes(item.id) || getMastery(item) !== "已掌握" || isDueQuestion(item)
  );
}

function getRecentQuestions() {
  return state.recentIds
    .map((id) => state.questions.find((item) => item.id === id))
    .filter(Boolean);
}

function switchView(viewId) {
  activeView = viewId;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewId);
  });
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.body.classList.toggle("sidebarCollapsed", sidebarCollapsed);
  if (els.sidebarToggleBtn) {
    els.sidebarToggleBtn.textContent = sidebarCollapsed ? "展开左侧栏" : "收起左侧栏";
  }
}

function toggleTopbar() {
  topbarCollapsed = !topbarCollapsed;
  document.body.classList.toggle("topbarCollapsed", topbarCollapsed);
  if (els.topbarToggleBtn) {
    els.topbarToggleBtn.textContent = topbarCollapsed ? "展开顶部栏" : "收起顶部栏";
  }
}

function render() {
  const query = els.searchInput.value.trim().toLowerCase();
  const tagFilter = els.tagFilter.value;
  const masteryFilter = els.masteryFilter?.value || "";
  const allTags = getAllTags();
  syncTagFilterOptions(allTags, tagFilter);

  const filtered = state.questions.filter((item) => {
    const tags = normalizeTags(item.tags);
    const matchesQuery = [item.subject, item.difficulty, item.stem, item.answer, item.explanation, ...tags]
      .join(" ")
      .toLowerCase()
      .includes(query);
    const matchesTag = !tagFilter || tags.includes(tagFilter);
    const matchesMastery = !masteryFilter || getMastery(item) === masteryFilter;
    return matchesQuery && matchesTag && matchesMastery;
  });

  const paperQuestions = state.paperIds
    .map((id) => state.questions.find((item) => item.id === id))
    .filter(Boolean);
  const recentQuestions = state.recentIds
    .map((id) => state.questions.find((item) => item.id === id))
    .filter(Boolean);

  syncFolderSelect();
  visibleBankIds = filtered.map((item) => item.id);
  selectedIds = selectedIds.filter((id) => state.questions.some((item) => item.id === id));
  els.totalCount.textContent = state.questions.length;
  els.wrongCount.textContent = state.wrongIds.length;
  els.paperCount.textContent = paperQuestions.length;
  if (els.masteredCount) {
    els.masteredCount.textContent = state.questions.filter((item) => getMastery(item) === "已掌握").length;
  }
  els.dueCount.textContent = getDueQuestions().length;
  els.selectedCount.textContent = `已选 ${selectedIds.length} 题`;
  els.practiceProgress.textContent = getPracticeProgressText(paperQuestions);

  els.questionList.innerHTML = filtered
    .map((item, index) => card(item, index + 1, true, { selectable: true }))
    .join("");
  els.paperList.innerHTML = paperQuestions
    .map((item, index) => card(item, index + 1, true, { practice: true }))
    .join("");
  els.recentList.innerHTML = recentQuestions.map((item, index) => card(item, index + 1, true)).join("");
  els.wrongList.innerHTML = getWrongQuestions()
    .map((item, index) => card(item, index + 1, true, { wrongBook: true }))
    .join("");
  els.folderList.innerHTML = renderFolders();
  els.deletedList.innerHTML = (state.deletedQuestions || [])
    .map((item, index) => deletedCard(item, index + 1))
    .join("");

  bindCardActions();
  switchView(activeView);
  renderMath();
}

function renderMath() {
  if (window.renderMathInElement) {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false },
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      throwOnError: false,
    });
  }
}

function card(item, number, withActions, cardOptions = {}) {
  item = getDisplayQuestion(item);
  const isWrong = state.wrongIds.includes(item.id);
  const isSelected = selectedIds.includes(item.id);
  const result = state.paperResults?.[item.id] || "";
  const tags = normalizeTags(item.tags);
  const wrongTimes = getWrongTimes(item);
  const safeId = escapeHtml(item.id);
  const tagPills = tags.map((tag) => `<span class="pill tag">${escapeHtml(tag)}</span>`).join("");
  const selector = cardOptions.selectable
    ? `<label class="selectQuestion">
        <input data-select-id="${safeId}" type="checkbox" ${isSelected ? "checked" : ""} />
        <span>选择</span>
      </label>`
    : "";
  const selectedAnswer = state.paperAnswers?.[item.id] || "";
  const optionList = item.options.length
    ? `<ol class="options ${cardOptions.practice ? "clickableOptions" : ""}">
        ${item.options.map((option, index) => renderOptionItem(item, option, index, cardOptions.practice, selectedAnswer)).join("")}
      </ol>`
    : "";
  const answerClass = showAnswers ? "answerBox visible" : "answerBox";
  const practiceControls = cardOptions.practice ? renderPracticeControls(item, selectedAnswer) : "";

  return `
    <article class="questionCard">
      <div class="questionHead">
        <div>
          <p class="stem">${number}. ${richText(item.stem)}</p>
          <div class="meta">
            ${item.chapter ? `<span class="pill">${escapeHtml(item.chapter)}</span>` : ""}
            ${item.type ? `<span class="pill">${escapeHtml(item.type)}</span>` : ""}
            ${result ? `<span class="pill result ${result}">${escapeHtml(resultLabel(result, selectedAnswer))}</span>` : ""}
            ${isWrong ? '<span class="pill wrong">错题</span>' : ""}
            ${wrongTimes ? `<span class="pill wrongTimes">错 ${wrongTimes} 次</span>` : ""}
            ${tagPills}
          </div>
        </div>
        ${selector}
      </div>
      ${optionList}
      <div class="${answerClass}">
        <div class="qaItem">
          <strong>答案：</strong>
          <div class="richText">${formatRichText(displayAnswer(item))}</div>
        </div>
        <div class="qaItem">
          <strong>解析：</strong>
          <div class="richText">${formatRichText(item.explanation || "暂无解析")}</div>
        </div>
      </div>
      ${
        practiceControls
      }
      ${
        withActions
          ? `<div class="cardActions">
              <button class="secondary" data-action="toggleWrong" data-id="${safeId}" type="button">
                ${isWrong ? "移出错题" : "标为错题"}
              </button>
              ${
                cardOptions.wrongBook
                  ? `<div class="wrongAdjust" aria-label="调整错题次数">
                      <button class="secondary" data-action="removeWrongTime" data-id="${safeId}" type="button">错题 -1</button>
                      <button class="secondary" data-action="addWrongTime" data-id="${safeId}" type="button">错题 +1</button>
                    </div>`
                  : ""
              }
              <button class="secondary" data-action="showOne" data-id="${safeId}" type="button">查看答案</button>
              <button class="secondary" data-action="edit" data-id="${safeId}" type="button">编辑</button>
              <button class="secondary" data-action="delete" data-id="${safeId}" type="button">删除</button>
            </div>`
          : ""
      }
    </article>
  `;
}

function deletedCard(item, number) {
  item = getDisplayQuestion(item);
  const safeId = escapeHtml(item.id);
  const options = item.options?.length
    ? `<ol class="options">${item.options.map((option) => `<li>${richText(option)}</li>`).join("")}</ol>`
    : "";
  const deletedAt = item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "";

  return `
    <article class="questionCard deletedCard">
      <div class="questionHead">
        <div>
          <p class="stem">${number}. ${richText(item.stem)}</p>
          <div class="meta">
            <span class="pill">${escapeHtml(item.subject || "未分类")}</span>
            <span class="pill">${escapeHtml(item.difficulty || "普通")}</span>
            ${deletedAt ? `<span class="pill wrongTimes">删除于 ${escapeHtml(deletedAt)}</span>` : ""}
          </div>
        </div>
      </div>
      ${options}
      <div class="answerBox visible">
        <div class="qaItem">
          <strong>答案：</strong>
          <div class="richText">${formatRichText(item.answer)}</div>
        </div>
        <div class="qaItem">
          <strong>解析：</strong>
          <div class="richText">${formatRichText(item.explanation || "暂无解析")}</div>
        </div>
      </div>
      <div class="cardActions">
        <button class="secondary" data-action="restoreDeleted" data-id="${safeId}" type="button">恢复</button>
        <button class="danger" data-action="deleteForever" data-id="${safeId}" type="button">彻底删除</button>
      </div>
    </article>
  `;
}

function renderOptionItem(item, option, index, isPractice, selectedAnswer) {
  const letter = getOptionLetter(option) || "ABCDEFGH"[index] || "";
  const selectedClass = selectedAnswer && selectedAnswer === letter ? " selected" : "";
  const correctClass = state.paperResults?.[item.id] === "correct" && selectedAnswer === letter ? " correct" : "";
  const wrongClass = state.paperResults?.[item.id] === "wrong" && selectedAnswer === letter ? " wrong" : "";
  const actionAttrs = isPractice && letter
    ? `data-action="chooseAnswer" data-id="${escapeHtml(item.id)}" data-choice="${escapeHtml(letter)}" tabindex="0" role="button"`
    : "";
  return `<li class="${isPractice ? "optionChoice" : ""}${selectedClass}${correctClass}${wrongClass}" ${actionAttrs}>${richText(option)}</li>`;
}

function getDisplayQuestion(item) {
  if (!item) return item;
  const merged = mergeOptionsFromStem(item.stem || "", item.options || []);
  if (merged.stem === item.stem && merged.options.length === (item.options || []).length) return item;
  return {
    ...item,
    stem: merged.stem,
    options: merged.options,
  };
}

function repairQuestionOptions(question) {
  const stem = normalizeQuestionContent(question.stem);
  const options = (question.options || []).map((option) => normalizeOptionText(option));
  return mergeOptionsFromStem(stem, options);
}

function mergeOptionsFromStem(stem, options = []) {
  const cleanStem = normalizeQuestionContent(stem);
  const cleanOptions = options.map((option) => normalizeOptionText(option)).filter(Boolean);
  const extracted = extractOptionsFromText(cleanStem);
  if (!extracted.options.length) return { stem: cleanStem, options: cleanOptions };
  return {
    stem: normalizeQuestionContent(extracted.text),
    options: uniqueOptionsByLetter([
      ...extracted.options.map((option) => normalizeOptionText(option)),
      ...cleanOptions,
    ]),
  };
}

function uniqueOptionsByLetter(options) {
  const seenLetters = new Set();
  const seenText = new Set();
  return options.filter((option) => {
    const letter = getOptionLetter(option);
    const textKey = String(option || "").replace(/\s+/g, " ").trim();
    if (letter) {
      if (seenLetters.has(letter)) return false;
      seenLetters.add(letter);
      return true;
    }
    if (seenText.has(textKey)) return false;
    seenText.add(textKey);
    return Boolean(textKey);
  });
}

function renderPracticeControls(item, selectedAnswer) {
  const choices = getObjectiveChoices(item);
  const safeId = escapeHtml(item.id);

  if (!choices.length || item.options?.length) {
    if (item.options?.length) return "";
    return `<div class="practiceActions">
      <button class="secondary" data-action="markCorrect" data-id="${safeId}" type="button">答对</button>
      <button class="secondary" data-action="markWrong" data-id="${safeId}" type="button">答错</button>
    </div>`;
  }

  return `<div class="practiceActions objectiveActions">
    ${choices
      .map((choice) => {
        const selectedClass = selectedAnswer === choice ? " selected" : "";
        return `<button class="secondary${selectedClass}" data-action="chooseAnswer" data-id="${safeId}" data-choice="${escapeHtml(choice)}" type="button">${escapeHtml(choice)}</button>`;
      })
      .join("")}
  </div>`;
}

function getObjectiveChoices(item) {
  const typeText = String(item.type || "");
  const answer = normalizeObjectiveAnswer(item.answer);
  const optionLetters = (item.options || [])
    .map((option, index) => getOptionLetter(option) || "ABCDEFGH"[index])
    .filter(Boolean);

  if (/判断|正误|true|false/i.test(typeText) || ["T", "F"].includes(answer)) {
    return ["T", "F"];
  }

  if (/选择|单选|多选/i.test(typeText) || (item.options || []).length >= 2 || /^[A-H]$/.test(answer)) {
    const choices = optionLetters.length ? [...new Set(optionLetters)] : inferChoicesFromAnswer(answer);
    return choices.length ? choices : ["A", "B", "C", "D"];
  }

  return [];
}

function inferChoicesFromAnswer(answer) {
  if (!/^[A-H]$/.test(answer)) return [];
  return "ABCDEFGH".slice(0, "ABCDEFGH".indexOf(answer) + 1).split("");
}

function bindCardActions() {
  document.querySelectorAll("[data-select-id]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      toggleSelected(checkbox.dataset.selectId, checkbox.checked);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const { action, id } = button.dataset;
      if (action === "toggleWrong") toggleWrong(id);
      if (action === "addWrongTime") incrementWrongTimes(id);
      if (action === "removeWrongTime") decrementWrongTimes(id);
      if (action === "showOne") button.closest(".questionCard").querySelector(".answerBox").classList.toggle("visible");
      if (action === "edit") openEditor(id);
      if (action === "markCorrect") recordPractice(id, "correct");
      if (action === "markWrong") recordPractice(id, "wrong");
      if (action === "chooseAnswer") chooseObjectiveAnswer(id, button.dataset.choice);
      if (action === "delete") deleteQuestion(id);
      if (action === "restoreDeleted") restoreDeletedQuestion(id);
      if (action === "deleteForever") deleteForever(id);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        button.click();
      }
    });
  });

  document.querySelectorAll("[data-open-paper]").forEach((button) => {
    button.addEventListener("click", () => {
      openSavedPaper(button.dataset.folderId, button.dataset.paperId);
    });
  });

  document.querySelectorAll("[data-delete-paper]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteSavedPaper(button.dataset.folderId, button.dataset.paperId);
    });
  });
}

function toggleSelected(id, checked) {
  selectedIds = checked
    ? [...new Set([...selectedIds, id])]
    : selectedIds.filter((item) => item !== id);
  els.selectedCount.textContent = `已选 ${selectedIds.length} 题`;
}

function applyTagsToSelected() {
  const tags = normalizeTags(els.tagInput.value);

  if (!selectedIds.length) {
    toast("请先选择题目");
    return;
  }

  if (!tags.length) {
    toast("请输入标签");
    return;
  }

  state.questions = state.questions.map((question) => {
    if (!selectedIds.includes(question.id)) return question;
    return {
      ...question,
      tags: [...new Set([...normalizeTags(question.tags), ...tags])],
    };
  });
  els.tagInput.value = "";
  saveState();
  render();
  toast(`已给 ${selectedIds.length} 道题添加标签`);
}

function applyTagsToRecent() {
  const tags = normalizeTags(els.recentTagInput.value);
  const recentIds = state.recentIds.filter((id) => state.questions.some((question) => question.id === id));

  if (!recentIds.length) {
    toast("最近题目里还没有题目");
    return;
  }

  if (!tags.length) {
    toast("请输入标签");
    return;
  }

  state.questions = state.questions.map((question) => {
    if (!recentIds.includes(question.id)) return question;
    return {
      ...question,
      tags: [...new Set([...normalizeTags(question.tags), ...tags])],
    };
  });

  els.recentTagInput.value = "";
  saveState();
  render();
  toast(`已给最近 ${recentIds.length} 道题添加标签`);
}

function applyMasteryToSelected() {
  const mastery = normalizeMastery(els.batchMasteryInput.value);

  if (!selectedIds.length) {
    toast("请先选择题目");
    return;
  }

  if (!els.batchMasteryInput.value) {
    toast("请选择掌握状态");
    return;
  }

  state.questions = state.questions.map((question) => {
    if (!selectedIds.includes(question.id)) return question;
    return {
      ...question,
      mastery,
    };
  });
  els.batchMasteryInput.value = "";
  saveState();
  render();
  toast(`已更新 ${selectedIds.length} 道题的掌握状态`);
}

function cycleMastery(id) {
  const order = ["未掌握", "复习中", "已掌握"];
  state.questions = state.questions.map((question) => {
    if (question.id !== id) return question;
    const currentIndex = order.indexOf(getMastery(question));
    return {
      ...question,
      mastery: order[(currentIndex + 1) % order.length],
    };
  });
  saveState();
  render();
}

function chooseObjectiveAnswer(id, choice) {
  const question = state.questions.find((item) => item.id === id);
  if (!question) return;

  const selected = normalizeObjectiveAnswer(choice);
  const correct = normalizeObjectiveAnswer(question.answer);
  const result = selected && correct && selected === correct ? "correct" : "wrong";
  recordPractice(id, result, selected);
  toast(result === "correct" ? "答对了" : `答错了，正确答案是 ${correct || displayAnswer(question)}`);
}

function recordPractice(id, result, selectedAnswer = "") {
  state.paperResults = {
    ...(state.paperResults || {}),
    [id]: result,
  };
  state.paperAnswers = {
    ...(state.paperAnswers || {}),
    [id]: selectedAnswer,
  };

  if (result === "correct") {
    advanceMastery(id);
    scheduleReview(id, "correct");
  } else {
    state.wrongIds = [...new Set([...state.wrongIds, id])];
    addWrongTimeToQuestion(id);
    setMastery(id, "未掌握");
    scheduleReview(id, result);
  }

  saveState();
  render();
}

function advanceMastery(id) {
  const order = ["未掌握", "复习中", "已掌握"];
  state.questions = state.questions.map((question) => {
    if (question.id !== id) return question;
    const currentIndex = order.indexOf(getMastery(question));
    const mastery = order[Math.min(currentIndex + 1, order.length - 1)];
    if (mastery === "已掌握") {
      state.wrongIds = state.wrongIds.filter((wrongId) => wrongId !== id);
    }
    return {
      ...question,
      mastery,
    };
  });
}

function setMastery(id, mastery) {
  state.questions = state.questions.map((question) =>
    question.id === id ? { ...question, mastery } : question
  );
}

function incrementWrongTimes(id) {
  state.wrongIds = [...new Set([...state.wrongIds, id])];
  addWrongTimeToQuestion(id);
  setMastery(id, "未掌握");
  saveState();
  render();
  toast("错题次数已加 1");
}

function decrementWrongTimes(id) {
  state.questions = state.questions.map((question) => {
    if (question.id !== id) return question;
    return {
      ...question,
      wrongTimes: Math.max(0, getWrongTimes(question) - 1),
    };
  });

  const question = state.questions.find((item) => item.id === id);
  if (question && getWrongTimes(question) === 0) {
    state.wrongIds = state.wrongIds.filter((wrongId) => wrongId !== id);
  }

  saveState();
  render();
  toast("错题次数已减 1");
}

function addWrongTimeToQuestion(id) {
  state.questions = state.questions.map((question) =>
    question.id === id ? { ...question, wrongTimes: getWrongTimes(question) + 1 } : question
  );
}

function getWrongTimes(item) {
  return Math.max(0, Number(item?.wrongTimes || 0));
}

function scheduleReview(id, result) {
  state.questions = state.questions.map((question) => {
    if (question.id !== id) return question;

    const reviewCount = Number(question.reviewCount || 0) + 1;
    const mastery = getMastery(question);
    let interval = 1;

    if (result === "correct") {
      if (mastery === "已掌握") {
        interval = Math.min(30, 7 + reviewCount * 3);
      } else if (mastery === "复习中") {
        interval = 3;
      }
    }

    return {
      ...question,
      reviewCount,
      lastReviewed: todayKey(),
      nextReview: addDaysKey(interval),
    };
  });
}

function toggleWrong(id) {
  state.wrongIds = state.wrongIds.includes(id)
    ? state.wrongIds.filter((item) => item !== id)
    : [...state.wrongIds, id];
  saveState();
  render();
}

function deleteQuestion(id) {
  const deletedCount = moveQuestionsToTrash([id], "manual");
  if (!deletedCount) return;
  saveState();
  render();
  toast("题目已移入最近删除");
}

function deleteSelectedQuestions() {
  if (!selectedIds.length) {
    toast("请先选择题目");
    return;
  }

  const confirmed = window.confirm(`确定删除选中的 ${selectedIds.length} 道题吗？它们会先进入最近删除，可恢复。`);
  if (!confirmed) return;

  const deletedCount = moveQuestionsToTrash(selectedIds, "batch");
  selectedIds = [];
  saveState();
  render();
  toast(`已删除 ${deletedCount} 道题`);
}

function moveQuestionsToTrash(ids, reason = "manual") {
  const idSet = new Set(ids);
  const deleting = state.questions.filter((item) => idSet.has(item.id));
  if (!deleting.length) return 0;

  const deletedAt = new Date().toISOString();
  const trashItems = deleting.map((item) => ({
    ...item,
    deletedAt,
    deleteReason: reason,
  }));

  state.deletedQuestions = [...trashItems, ...(state.deletedQuestions || [])].slice(0, 300);
  state.questions = state.questions.filter((item) => !idSet.has(item.id));
  removeQuestionReferences(idSet);
  selectedIds = selectedIds.filter((item) => !idSet.has(item));
  return deleting.length;
}

function removeQuestionReferences(idSet) {
  state.wrongIds = state.wrongIds.filter((item) => !idSet.has(item));
  state.paperIds = state.paperIds.filter((item) => !idSet.has(item));
  state.recentIds = state.recentIds.filter((item) => !idSet.has(item));
  state.folders = (state.folders || []).map((folder) => ({
    ...folder,
    papers: (folder.papers || []).map((paper) => ({
      ...paper,
      questionIds: (paper.questionIds || []).filter((questionId) => !idSet.has(questionId)),
    })),
  }));

  if (state.paperResults) {
    idSet.forEach((id) => delete state.paperResults[id]);
  }
  if (state.paperAnswers) {
    idSet.forEach((id) => delete state.paperAnswers[id]);
  }
}

function restoreDeletedQuestion(id) {
  const question = (state.deletedQuestions || []).find((item) => item.id === id);
  if (!question) {
    toast("没有找到这道题");
    return;
  }

  const restored = {
    ...question,
    id: state.questions.some((item) => item.id === question.id) ? crypto.randomUUID() : question.id,
  };
  delete restored.deletedAt;
  delete restored.deleteReason;

  state.questions = [...state.questions, normalizeQuestion(restored)];
  state.recentIds = [restored.id];
  state.deletedQuestions = (state.deletedQuestions || []).filter((item) => item.id !== id);
  deduplicateQuestions();
  saveState();
  render();
  toast("题目已恢复");
}

function deleteForever(id) {
  const confirmed = window.confirm("彻底删除后无法恢复。确定继续吗？");
  if (!confirmed) return;
  state.deletedQuestions = (state.deletedQuestions || []).filter((item) => item.id !== id);
  saveState();
  render();
  toast("已彻底删除");
}

async function clearDeletedQuestions() {
  if (!state.deletedQuestions?.length) {
    toast("最近删除里没有题目");
    return;
  }

  const confirmed = await askConfirm(
    `确定要一键彻底删除 ${state.deletedQuestions.length} 道题吗？`,
    "删除后无法恢复，建议确认不需要这些题目后再继续。"
  );
  if (!confirmed) return;

  state.deletedQuestions = [];
  saveState();
  render();
  toast("最近删除已清空");
}

function askConfirm(title, message = "") {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirmOverlay";
    overlay.innerHTML = `
      <section class="confirmDialog" role="dialog" aria-modal="true">
        <h2>${escapeHtml(title)}</h2>
        ${message ? `<p>${escapeHtml(message)}</p>` : ""}
        <div class="confirmActions">
          <button class="danger" data-confirm-yes type="button">是</button>
          <button class="secondary" data-confirm-no type="button">否</button>
        </div>
      </section>
    `;

    const close = (answer) => {
      overlay.remove();
      resolve(answer);
    };

    overlay.querySelector("[data-confirm-yes]").addEventListener("click", () => close(true));
    overlay.querySelector("[data-confirm-no]").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });
    document.body.appendChild(overlay);
    overlay.querySelector("[data-confirm-no]").focus();
  });
}

function deduplicateQuestions() {
  const removeIds = new Set();
  const seen = new Map();

  state.questions.forEach((question) => {
    const key = duplicateKey(question);
    if (!key || removeIds.has(question.id)) return;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, question);
      return;
    }

    const shorter = pickShorterQuestion(existing, question);
    const longer = shorter.id === existing.id ? question : existing;
    removeIds.add(shorter.id);
    seen.set(key, longer);
  });

  const candidates = state.questions.filter((question) => !removeIds.has(question.id));
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const first = candidates[i];
      const second = candidates[j];
      if (removeIds.has(first.id) || removeIds.has(second.id)) continue;
      if (!isNearDuplicateQuestion(first, second)) continue;
      removeIds.add(pickShorterQuestion(first, second).id);
    }
  }

  if (!removeIds.size) return 0;
  return moveQuestionsToTrash([...removeIds], "重复题目自动移除");
}

function duplicateKey(question) {
  return normalizeDuplicateText([question.stem, question.answer].join(" "));
}

function normalizeDuplicateText(text) {
  return String(text || "")
    .replace(/\[\[image:[^\]]+\]\]/gi, "")
    .replace(/\\(?:left|right|frac|sqrt|bar|min|max|le|ge|in|cdot|times)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

function questionTextLength(question) {
  return [
    question.stem,
    ...(question.options || []),
    question.answer,
    question.explanation,
    ...(question.tags || []),
  ].join("").length;
}

function pickShorterQuestion(first, second) {
  return questionTextLength(first) <= questionTextLength(second) ? first : second;
}

function isNearDuplicateQuestion(first, second) {
  const a = duplicateKey(first);
  const b = duplicateKey(second);
  if (!a || !b || Math.min(a.length, b.length) < 18) return false;
  if (a === b) return true;

  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  if (long.includes(short) && short.length / long.length >= 0.86) return true;

  return ngramSimilarity(short, long) >= 0.92;
}

function ngramSimilarity(a, b) {
  const first = makeNgrams(a, 3);
  const second = makeNgrams(b, 3);
  if (!first.size || !second.size) return 0;

  let overlap = 0;
  first.forEach((gram) => {
    if (second.has(gram)) overlap += 1;
  });

  return overlap / Math.max(first.size, second.size);
}

function makeNgrams(text, size) {
  const value = String(text || "");
  if (value.length <= size) return new Set(value ? [value] : []);
  const grams = new Set();
  for (let index = 0; index <= value.length - size; index += 1) {
    grams.add(value.slice(index, index + size));
  }
  return grams;
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,，、;；\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getAllTags() {
  return [...new Set(state.questions.flatMap((item) => normalizeTags(item.tags)))].sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN")
  );
}

function syncTagFilterOptions(tags, selectedTag) {
  const options = ['<option value="">全部标签</option>']
    .concat(tags.map((tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`))
    .join("");

  if (els.tagFilter.innerHTML !== options) {
    els.tagFilter.innerHTML = options;
  }
  els.tagFilter.value = tags.includes(selectedTag) ? selectedTag : "";
}

function normalizeMastery(value) {
  return ["未掌握", "复习中", "已掌握"].includes(value) ? value : "未掌握";
}

function getMastery(item) {
  return normalizeMastery(item.mastery);
}

function masteryClass(value) {
  return {
    未掌握: "low",
    复习中: "middle",
    已掌握: "high",
  }[normalizeMastery(value)];
}

function getPracticeProgressText(paperQuestions) {
  const total = paperQuestions.length;
  const done = paperQuestions.filter((item) => state.paperResults?.[item.id]).length;
  const correct = paperQuestions.filter((item) => state.paperResults?.[item.id] === "correct").length;
  return `已完成 ${done} / ${total}${done ? `，答对 ${correct} 题` : ""}`;
}

function resultLabel(result, selectedAnswer = "") {
  const label = {
    correct: "已答对",
    wrong: "已答错",
  }[result] || "";
  return selectedAnswer ? `${label}：${selectedAnswer}` : label;
}

function setRandomQuote() {
  if (!els.quoteText) return;
  const index = Math.floor(Math.random() * quotes.length);
  els.quoteText.textContent = quotes[index];
}

function isDueQuestion(item) {
  if (state.wrongIds.includes(item.id)) return true;
  if (!item.nextReview) return getMastery(item) !== "已掌握";
  return item.nextReview <= todayKey();
}

function reviewLabel(item) {
  if (!item.nextReview) return "待安排";
  return item.nextReview <= todayKey() ? "今日复习" : `下次 ${item.nextReview.slice(5)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysKey(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function richText(value) {
  return escapeHtml(autoFormatMath(recoverBrokenLatexDelimiters(normalizeLatexInput(value)))).replace(
    /\[\[image:(data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)\]\]/gi,
    '<img class="inlineImage" src="$1" alt="题目图片" />'
  );
}

function recoverBrokenLatexDelimiters(text) {
  return String(text || "")
    .replace(/\\\(\s*([^。\n]*\\(?:frac|sqrt|bar|min|max|text|le|ge|in)[^。\n]*?)(?=。|，|；|、|\n|$)/g, (match, expression) => {
      if (match.includes("\\)")) return match;
      return `\\(${normalizeMathExpression(expression)}\\)`;
    })
    .replace(/\\\[\s*([\s\S]*?)(?=\n\n|$)/g, (match, expression) => {
      if (match.includes("\\]")) return match;
      return `\\[${normalizeMathExpression(expression)}\\]`;
    });
}

function cleanImportedText(text) {
  return stripOrphanMathDelimiters(stripGptNoiseBlocks(stripLeakedQuestionHeading(String(text || ""))))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .split("\n")
    .filter((line) => !isNoiseDelimiterLine(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripOrphanMathDelimiters(text) {
  let output = String(text || "")
    .replace(/(^|\n)\s*(?:\$\$|\\\[|\\\])\s*(?=\n|$)/g, "\n")
    .replace(/\$\$\s*([A-HＡ-Ｈ][.、．)]\s*[\s\S]*?)\s*\$\$/g, "$1");

  const dollarCount = (output.match(/\$\$/g) || []).length;
  if (dollarCount % 2 === 1) {
    output = output.replace(/\$\$/g, "");
  }

  const openBracketCount = (output.match(/\\\[/g) || []).length;
  const closeBracketCount = (output.match(/\\\]/g) || []).length;
  if (openBracketCount !== closeBracketCount) {
    output = output.replace(/\\\[/g, "").replace(/\\\]/g, "");
  }

  return output;
}

function isNoiseDelimiterLine(line) {
  const value = String(line || "").trim();
  if (!value) return false;
  return /^(?:[-–—_=*·•]{3,}|[|｜]{3,})$/.test(value);
}

function stripLeakedQuestionHeading(text) {
  return String(text || "")
    .replace(/\n\s*#{1,6}\s*(?:.*?第\s*\d+\s*题|\d+\s*[.、．]\s*.*)[\s\S]*$/g, "")
    .replace(/\n\s*(?:#{1,6}\s*)?(?:第[一二三四五六七八九十\d]+章|第[一二三四五六七八九十\d]+节|本章|本节)?\s*(?:总口诀|口诀|总复盘|总回顾|总口决|知识点归纳|知识点总结|考点总结|章节总结|做题思路|做题方法|做题先判断|题型总结|方法总结|复习提纲|重点回顾|易错点总结|易错提醒)\b[\s\S]*$/g, "")
    .replace(/\n\s*(?:第\s*\d+\s*题|题目\s*\d+|计算题\s*第\s*\d+\s*题)[\s\S]*$/g, "");
}

function cleanGptImportText(text) {
  let output = String(text || "").replace(/\r\n?/g, "\n");
  const firstQuestionIndex = findFirstQuestionStart(output);
  if (firstQuestionIndex > 0) {
    output = output.slice(firstQuestionIndex);
  }
  return stripGptNoiseBlocks(output);
}

function findFirstQuestionStart(text) {
  const patterns = [
    /^\s*#{1,6}\s*(?:.*?第\s*\d+\s*题|\d+\s*[.、．]\s*)/m,
    /^[【\[]\s*(题目|题干|问题|材料)\s*[】\]]/m,
    /^\s*(题目|题干|问题|材料)\s*[:：]/m,
    /^\s*(?:\d+|[一二三四五六七八九十]+)[.、．]\s+/m,
  ];
  const indexes = patterns
    .map((pattern) => {
      const match = text.match(pattern);
      return match ? match.index : -1;
    })
    .filter((index) => index >= 0);
  return indexes.length ? Math.min(...indexes) : 0;
}

function stripGptNoiseBlocks(text) {
  let output = String(text || "");
  output = output.replace(
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:以下是|下面是|好的|我来|我将|接下来|当然可以|没问题|已为你|根据你的要求|这里是)[^\n]*(?:\n|$)/g,
    "\n"
  );
  output = output.replace(
    /\n\s*(?:#{1,6}\s*)?(?:总结|总之|综上|最后总结|学习建议|复习建议|使用建议|补充说明|说明|提示|注意事项|答题策略|易错总结|整体结论|结论|总口诀|口诀|总复盘|总回顾|知识点归纳|知识点总结|考点总结|章节总结|做题思路|做题方法|做题先判断|题型总结|方法总结|复习提纲|重点回顾|易错点总结|易错提醒)\s*[:：]?\s*[\s\S]*$/g,
    ""
  );
  output = output.replace(
    /\n\s*(?:#{1,6}\s*)?(?:第[一二三四五六七八九十\d]+章|第[一二三四五六七八九十\d]+节|本章|本节)\s*(?:总口诀|口诀|总复盘|总回顾|知识点归纳|知识点总结|考点总结|章节总结|做题思路|做题方法|做题先判断|题型总结|方法总结|复习提纲|重点回顾|易错点总结|易错提醒)[\s\S]*$/g,
    ""
  );
  output = output.replace(
    /\n\s*(?:如果你|如需|需要我|我可以|你可以|希望这|以上就是|以上内容|这就是)[\s\S]*$/g,
    ""
  );
  return stripTrailingNoiseDelimiters(output).trim();
}

function stripTrailingNoiseDelimiters(text) {
  return String(text || "")
    .replace(/(?:\n\s*(?:[-–—_=*·•]{3,}|[|｜]{3,})\s*)+$/g, "")
    .replace(/(?:\n\s*(?:#{1,6}\s*)?(?:分隔线|答案分割线|解析分割线)\s*)+$/g, "");
}

function formatRichText(text) {
  const cleaned = cleanImportedText(text);
  if (!cleaned) return "";

  return cleaned
    .split(/\n{2,}/)
    .map((block) => `<p>${richText(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeLatexInput(text) {
  let output = stripOrphanMathDelimiters(preNormalizeLatexText(String(text || "").replace(/\r\n?/g, "\n")));
  output = normalizeMarkdownMathBlocks(output);

  return splitMathSegments(output)
    .map((part) => {
      if (!part) return "";
      if (isMathSegment(part)) return normalizeWrappedMathSegment(part);
      return normalizePlainLatexText(part);
    })
    .join("")
    .replace(/\\\(\\\(/g, "\\(")
    .replace(/\\\)\\\)/g, "\\)")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function preNormalizeLatexText(text) {
  return String(text || "")
    .replace(/\\\\(?=[()[\]])/g, "\\")
    .replace(/\\\\(?=(?:sqrt|frac|sum|lim|int|cdot|times|min|max|bar|le|ge|in|alpha|beta|gamma|delta|mu|pi|theta|text)\b)/g, "\\")
    .replace(/([A-Za-z])\\\(([^()\n]+)\\\)(\s*=)/g, "$1($2)$3")
    .replace(/\\text\s*\{\\([^{}]+)\}/g, "\\text{$1}")
    .replace(/\\text\s*\{([^{}]*)\\([\u4e00-\u9fa5][^{}]*)\}/g, "\\text{$1$2}")
    .replace(/\\([\u4e00-\u9fa5])/g, "$1");
}

function normalizeMarkdownMathBlocks(text) {
  return String(text || "").replace(
    /(^|\n)\s*\[\s*\n([\s\S]*?)\n\s*\]\s*(?=\n|$)/g,
    (match, prefix, expression) => {
      const value = expression.trim();
      if (!looksLikeStandaloneMath(value)) return match;
      return `${prefix}$$${normalizeMathExpression(value)}$$`;
    }
  );
}

function normalizeWrappedMathSegment(segment) {
  if (segment.startsWith("$$")) return `$$${normalizeMathExpression(segment.slice(2, -2))}$$`;
  if (segment.startsWith("\\[")) return `\\[${normalizeMathExpression(segment.slice(2, -2))}\\]`;
  if (segment.startsWith("\\(")) return `\\(${normalizeMathExpression(segment.slice(2, -2))}\\)`;
  return segment;
}

function normalizePlainLatexText(text) {
  return String(text || "")
    .split("\n")
    .map((line) => normalizeLatexLine(line))
    .join("\n");
}

function normalizeLatexLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return line;

  if (!isOptionLine(trimmed) && looksLikeStandaloneMath(trimmed) && !/[\u4e00-\u9fa5]/.test(trimmed)) {
    return line.replace(trimmed, () => `$$${normalizeMathExpression(trimmed)}$$`);
  }

  let output = wrapBareFunctionEquationRuns(line);
  output = normalizeFullWidthParenMath(output);
  output = normalizeOuterAsciiParenMath(output);
  output = normalizeAsciiParenMath(output);
  output = wrapBareLatexCommandRuns(output);
  output = wrapBareRelationRuns(output);
  output = wrapShortComparisonRuns(output);
  return output;
}

function isOptionLine(text) {
  return /^[A-HＡ-Ｈ][.、．)]\s*/i.test(String(text || "").trim());
}

function wrapBareFunctionEquationRuns(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(
        /(^|[\s，。；：、（(])([A-Za-z]+\s*\(\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*(?:,\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*)+\)\s*=\s*[^，。；：、\n]+)/g,
        (match, prefix, expression) => {
          const value = trimMathCandidate(expression);
          if (!looksLikeInlineMath(value)) return match;
          return `${prefix}\\(${normalizeMathExpression(value)}\\)${expression.slice(value.length)}`;
        }
      );
    })
    .join("");
}

function normalizeFullWidthParenMath(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(/（([^（）\n]+)）/g, (match, expression) => {
        const value = expression.trim();
        if (!looksLikeInlineMath(value)) return match;
        return `\\(${normalizeMathExpression(value)}\\)`;
      });
    })
    .join("");
}

function normalizeOuterAsciiParenMath(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(/(^|[\s，。；：、])\(([^。\n]*(?:=|<|>|\\le|\\ge|\\in|\\frac|\\bar|\\sqrt|\\min|\\max)[^。\n]*)\)(?=$|[\s，。；：、）)]|时)/g, (match, prefix, expression) => {
        const value = expression.trim();
        if (!looksLikeInlineMath(value)) return match;
        return `${prefix}\\(${normalizeMathExpression(value)}\\)`;
      });
    })
    .join("");
}

function normalizeAsciiParenMath(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(/\(([^()\n]+)\)/g, (match, expression) => {
        const value = expression.trim();
        if (!looksLikeInlineMath(value)) return match;
        return `\\(${normalizeMathExpression(value)}\\)`;
      });
    })
    .join("");
}

function wrapBareLatexCommandRuns(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(
        /(^|[\s，。；：、（])((?:\\(?:frac|bar|sqrt|min|max|le|ge|in|cdot|times)\b|[A-Za-z0-9_{}])(?:[A-Za-z0-9_{}\\^+\-*/=().,<>]|\s)*(?:\\(?:frac|bar|sqrt|min|max|le|ge|in|cdot|times)\b)(?:[A-Za-z0-9_{}\\^+\-*/=().,<>]|\s)*)/g,
        (match, prefix, expression) => {
          const value = trimMathCandidate(expression);
          if (!looksLikeInlineMath(value)) return match;
          return `${prefix}\\(${normalizeMathExpression(value)}\\)${expression.slice(value.length)}`;
        }
      );
    })
    .join("");
}

function wrapBareRelationRuns(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(
        /(^|[\s，。；：、（])([A-Za-z0-9_{}\\^+\-*/().,]+(?:\s*[A-Za-z0-9_{}\\^+\-*/().,]+)*\s*(?:=|<=|>=|<|>|\\le|\\ge)\s*[A-Za-z0-9_{}\\^+\-*/().,]+(?:\s*[A-Za-z0-9_{}\\^+\-*/().,]+)*)/g,
        (match, prefix, expression) => {
          const value = trimMathCandidate(expression);
          if (!looksLikeInlineMath(value)) return match;
          return `${prefix}\\(${normalizeMathExpression(value)}\\)${expression.slice(value.length)}`;
        }
      );
    })
    .join("");
}

function wrapShortComparisonRuns(line) {
  return splitMathSegments(line)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(
        /(^|[\s，。；：、（])([A-Za-z]{1,3}\s*(?:=|<=|>=|<|>|\\le|\\ge)\s*[A-Za-z0-9]{1,6})(?=$|[\s，。；：、）)])/g,
        (match, prefix, expression) => {
          const value = trimMathCandidate(expression);
          if (!looksLikeInlineMath(value)) return match;
          return `${prefix}\\(${normalizeMathExpression(value)}\\)`;
        }
      );
    })
    .join("");
}

function trimMathCandidate(value) {
  return String(value || "")
    .replace(/[\s，。；：、）)]*$/g, "")
    .trim();
}

function looksLikeInlineMath(text) {
  const value = normalizeMathSymbols(String(text || "").trim());
  if (!value || value.length > 120) return false;
  if (stripLatexTextBlocks(value).match(/[\u4e00-\u9fa5]/)) return false;
  if (/^(?:[A-HＡ-Ｈ]|答案\s*[A-HＡ-Ｈ]?|第\s*\d+\s*题)$/i.test(value)) return false;
  return /(?:=|<=|>=|<|>|\\le|\\ge|\\in|\\frac|\\bar|\\sqrt|\\min|\\max|[_^]|\b[A-Za-z]\s*\()/.test(value);
}

function stripLatexTextBlocks(value) {
  return String(value || "").replace(/\\text\s*\{[^{}]*\}/g, "");
}

function normalizeMathText(text) {
  let output = String(text || "").replace(/\r\n?/g, "\n");

  output = output.replace(/\$\$([\s\S]*?)\$\$/g, (match, expression) => {
    const fixed = normalizeMathExpression(expression);
    return shouldUseInlineMath(fixed) ? `\\(${fixed}\\)` : `$$${fixed}$$`;
  });

  output = output.replace(/\\\[([\s\S]*?)\\\]/g, (match, expression) => {
    const fixed = normalizeMathExpression(expression);
    return shouldUseInlineMath(fixed) ? `\\(${fixed}\\)` : `\\[${fixed}\\]`;
  });

  output = output.replace(/\\\(([\s\S]*?)\\\)/g, (match, expression) => `\\(${normalizeMathExpression(expression)}\\)`);
  output = output.replace(/\n{2,}(\\\([^()\n]+\\\))\n{2,}/g, "\n$1\n");
  output = output.replace(/\n{2,}(\\\([^()\n]+\\\))(?=\n|$)/g, "\n$1");
  output = output.replace(/(\\\([^()\n]+\\\))\n{2,}/g, "$1\n");

  return output
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || isAlreadyMath(trimmed) || /[\u4e00-\u9fa5]/.test(trimmed)) return line;
      if (!looksLikeStandaloneMath(trimmed)) return line;
      return line.replace(trimmed, () => `$$${normalizeMathExpression(trimmed)}$$`);
    })
    .join("\n");
}

function shouldUseInlineMath(expression) {
  const value = String(expression || "").trim();
  return (
    value.length <= 18 &&
    !/\\(?:frac|sqrt|sum|int|lim|begin|cdot)/.test(value) &&
    !/[;]/.test(value)
  );
}

function normalizeMathExpression(expression) {
  let output = normalizeMathSymbols(String(expression || "").trim());
  output = output.replace(/^(?:\\\()+/, "").replace(/(?:\\\))+$/, "");
  output = normalizeTextCommand(output);
  output = output.replace(/\(([^()]+)\)\^\{?1\/2\}?/g, "\\sqrt{$1}");
  output = output.replace(/\\sqrt\s*([A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*)(?!\s*\})/g, "\\sqrt{$1}");
  output = output.replace(/\\min\s*\{([^{}]+)\}/g, "\\min\\{$1\\}");
  output = output.replace(/\\max\s*\{([^{}]+)\}/g, "\\max\\{$1\\}");
  output = output.replace(/(^|[^A-Za-z\\])x([12])\b/g, "$1x_$2");
  output = output.replace(/(^|[^A-Za-z\\])p([123])\b/g, "$1p_$2");
  output = output.replace(/([A-Za-z]+_\{?[A-Za-z0-9]+\}?)\*/g, "$1^*");
  output = convertSlashFractions(output);
  return balanceMathParentheses(output);
}

function normalizeTextCommand(expression) {
  return String(expression || "")
    .replace(/\\text\s*\{\\([^{}]+)\}/g, "\\text{$1}")
    .replace(/\\text\s*\{([^{}]*)\\([\u4e00-\u9fa5][^{}]*)\}/g, "\\text{$1$2}")
    .replace(/\\text\s*\{\s*([^{}]*?)\s*\}/g, "\\text{$1}")
    .replace(/\\([\u4e00-\u9fa5])/g, "$1");
}

function balanceMathParentheses(expression) {
  let output = String(expression || "");
  const openCount = (output.match(/\(/g) || []).length;
  const closeCount = (output.match(/\)/g) || []).length;

  if (openCount > closeCount && output.trim().startsWith("(")) {
    output = output.replace(/^\s*\(/, "");
  }

  if (closeCount > openCount && output.trim().endsWith(")")) {
    output = output.replace(/\)\s*$/, "");
  }

  return output;
}

function convertSlashFractions(expression) {
  const atom = String.raw`(?:\([^()]+\)|-?\d+(?:\.\d+)?|-?[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*|-?[A-Za-z0-9]+[A-Za-z_{}0-9]*)`;
  return String(expression || "").replace(
    new RegExp(`(^|[^A-Za-z0-9_{}\\\\])(${atom})\\s*\\/\\s*(${atom})(?![A-Za-z0-9_{}\\\\/])`, "g"),
    (match, prefix, numerator, denominator) => `${prefix}\\frac{${stripOuterParens(numerator)}}{${stripOuterParens(denominator)}}`
  );
}

function normalizeMathSymbols(text) {
  const subscriptMap = {
    "₀": "0",
    "₁": "1",
    "₂": "2",
    "₃": "3",
    "₄": "4",
    "₅": "5",
    "₆": "6",
    "₇": "7",
    "₈": "8",
    "₉": "9",
  };

  return String(text || "")
    .replace(/\\\\(?=[()[\]])/g, "\\")
    .replace(/\\\\(?=(?:sqrt|frac|sum|lim|int|cdot|times|min|max|bar|le|ge|in|alpha|beta|gamma|delta|mu|pi|theta)\b)/g, "\\")
    .replace(/\\\\(?=text\b)/g, "\\")
    .replace(/\\text\s*\{\\([^{}]+)\}/g, "\\text{$1}")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (match) => `_${[...match].map((char) => subscriptMap[char]).join("")}`)
    .replace(/[＝]/g, "=")
    .replace(/[＜]/g, "<")
    .replace(/[＞]/g, ">")
    .replace(/[·•]/g, "\\cdot ");
}

function autoFormatMath(value) {
  return String(value || "")
    .split(/(\[\[image:data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+\]\])/gi)
    .map((part) => (part.toLowerCase().startsWith("[[image:") ? part : formatTextMathSegments(part)))
    .join("");
}

function formatTextMathSegments(text) {
  return splitMathSegments(text)
    .map((part) => {
      if (!part) return "";
      if (part.startsWith("$$")) return `$$${formatMathExpression(part.slice(2, -2))}$$`;
      if (part.startsWith("\\[")) return `\\[${formatMathExpression(part.slice(2, -2))}\\]`;
      if (part.startsWith("\\(")) return `\\(${formatMathExpression(part.slice(2, -2))}\\)`;
      return processPlainMathText(part);
    })
    .join("");
}

function splitMathSegments(text) {
  return preNormalizeLatexText(text).split(/(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
}

function processPlainMathText(text) {
  let output = autoWrapMathLines(normalizeMathSymbols(text));
  output = wrapBareLatexCommands(output);
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareEquationRuns(part)))
    .join("");
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareRelationRuns(part)))
    .join("");
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareInlineEquations(part)))
    .join("");
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareInlineFunctionCalls(part)))
    .join("");
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareVariables(part)))
    .join("");
  output = splitMathSegments(output)
    .map((part) => (isMathSegment(part) ? part : wrapBareInlineFractions(part)))
    .join("");
  return output;
}

function wrapBareLatexCommands(text) {
  return String(text || "")
    .replace(/\(([^()\n]*\\(?:sqrt|frac|sum|lim|int|cdot|alpha|beta|gamma|delta|mu|pi|theta)[^()\n]*)\)/g, (match, expression) => {
      return `\\(${formatMathExpression(expression.trim())}\\)`;
    })
    .replace(
      /(^|[\s，。；：、])([^，。；：、\n]*\\(?:sqrt|frac|sum|lim|int|cdot|alpha|beta|gamma|delta|mu|pi|theta)[^，。；：、\n]*)/g,
      (match, prefix, expression) => {
        const value = expression.trim();
        if (/[\u4e00-\u9fa5]/.test(value) || isMathSegment(value)) return match;
        return `${prefix}\\(${formatMathExpression(value)}\\)`;
      }
    );
}

function isMathSegment(text) {
  return String(text || "").startsWith("\\(") || String(text || "").startsWith("$$") || String(text || "").startsWith("\\[");
}

function autoWrapMathLines(text) {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || isAlreadyMath(trimmed) || /[\u4e00-\u9fa5]/.test(trimmed)) return line;
      if (!looksLikeStandaloneMath(trimmed)) return line;
      return line.replace(trimmed, () => `$$${normalizeMathExpression(trimmed)}$$`);
    })
    .join("\n");
}

function wrapBareVariables(text) {
  const parenthesized = String(text || "")
    .replace(
      /(^|[^A-Za-z0-9_\\])(\(\s*[A-Za-z]+_\{?[A-Za-z0-9]+\}?\s*\))/g,
      (match, prefix, expression) => `${prefix}\\(${normalizeMathExpression(expression)}\\)`
    );

  return splitMathSegments(parenthesized)
    .map((part) => {
      if (isMathSegment(part)) return part;
      return part.replace(
        /(^|[\s，。；：、（(])([A-Za-z]+_\{?[A-Za-z0-9]+\}?)(?=$|[\s，。；：、）).,])/g,
        (match, prefix, variable) => `${prefix}\\(${normalizeMathExpression(variable)}\\)`
      );
    })
    .join("");
}

function wrapBareInlineFractions(text) {
  return String(text || "")
    .split("\n")
    .map((line) => {
      if (isAlreadyMath(line.trim()) || /https?:\/\//i.test(line)) return line;
      return line.replace(
        /(^|[\s，。；：、（(])((?:\([^()]+\)|-?\d+(?:\.\d+)?|-?[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*|-?[A-Za-z0-9]+[A-Za-z_{}0-9]*))\s*\/\s*((?:\([^()]+\)|-?\d+(?:\.\d+)?|-?[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*|-?[A-Za-z0-9]+[A-Za-z_{}0-9]*))(?![A-Za-z0-9_{}\\/])/g,
        (match, prefix, numerator, denominator) => `${prefix}\\(\\frac{${stripOuterParens(numerator)}}{${stripOuterParens(denominator)}}\\)`
      );
    })
    .join("\n");
}

function wrapBareInlineEquations(text) {
  const variable = String.raw`(?:[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\*?|[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*)`;
  const value = String.raw`-?(?:\\[A-Za-z]+(?:\{[^{}]+\})?|[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*|\d+(?:\.\d+)?|\([^()]+\)|\[[^\[\]]+\]|[A-Za-z0-9]+[A-Za-z_{}0-9]*)`;
  const term = String.raw`${value}(?:\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*)?`;
  const equationPattern = new RegExp(
    `(^|[\\s，。；：、（(])(${variable}\\s*=\\s*${term}(?:\\s*(?:\\/|\\\\cdot)\\s*${term})*)`,
    "g"
  );

  return String(text || "").replace(equationPattern, (match, prefix, equation) => {
    return `${prefix}\\(${formatMathExpression(equation)}\\)`;
  });
}

function wrapBareEquationRuns(text) {
  const mathRun = String.raw`[A-Za-z\\][A-Za-z0-9_{}\\^*+\-*/=().,\s\[\]]*=[A-Za-z0-9_{}\\^*+\-*/=().,\s\[\]]*[A-Za-z0-9_})\]]`;
  const runPattern = new RegExp(`(^|[\\s，。；：、（(])(${mathRun})(?=$|[\\s，。；：、）)])`, "g");

  return String(text || "").replace(runPattern, (match, prefix, equation) => {
    const trailingSpaces = equation.match(/\s+$/)?.[0] || "";
    const trimmed = equation.trim();
    if (!/[=]/.test(trimmed) || trimmed.length < 3) return match;
    return `${prefix}\\(${formatMathExpression(trimmed)}\\)${trailingSpaces}`;
  });
}

function wrapBareInlineFunctionCalls(text) {
  return String(text || "")
    .replace(
      /(^|[^A-Za-z0-9_\\])([A-Za-z]+\s*\(\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*(?:,\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*)+\)\s*=\s*[^，。；：、\n]+)/g,
      (match, prefix, expression) => `${prefix}\\(${normalizeMathExpression(trimMathCandidate(expression))}\\)`
    )
    .replace(
      /(^|[^A-Za-z0-9_\\])([A-Za-z]+\s*\(\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*,\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*\))/g,
      (match, prefix, expression) => `${prefix}\\(${normalizeMathExpression(expression)}\\)`
    )
    .replace(
      /(^|[^A-Za-z0-9_\\])(\(\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*,\s*[A-Za-z]+(?:_\{?[A-Za-z0-9]+\}?)*\s*\))/g,
      (match, prefix, expression) => `${prefix}\\(${normalizeMathExpression(expression)}\\)`
    );
}

function stripOuterParens(value) {
  const text = String(value || "").trim();
  return text.startsWith("(") && text.endsWith(")") ? text.slice(1, -1) : text;
}

function isAlreadyMath(text) {
  return text.startsWith("$$") || text.startsWith("\\[") || text.startsWith("\\(");
}

function looksLikeStandaloneMath(text) {
  const value = normalizeMathSymbols(String(text || "").trim());
  return (
    value.length <= 90 &&
    /[=<>+\-*/^_]|\\(?:frac|bar|sqrt|min|max|le|ge)|MRS|MU|MC|MR|p_x|p_y/.test(value) &&
    /^[A-Za-z0-9_{}\\^+\-*/=<>().,\s\[\]]+$/.test(value)
  );
}

function formatMathExpression(expression) {
  let output = normalizeMathExpression(expression);
  output = output.replace(/\(([^()]+)\)\s*\/\s*([A-Za-z0-9_{}\\]+)/g, "\\frac{$1}{$2}");
  output = output.replace(/([A-Za-z0-9_{}\\]+)\s*\/\s*([A-Za-z0-9_{}\\]+)/g, "\\frac{$1}{$2}");
  output = output.replace(/-\s*\\frac/g, "-\\frac");
  return output;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}
