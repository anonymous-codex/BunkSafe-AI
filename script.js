/***********************
 * DARK MODE TOGGLE
 ***********************/
const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
  themeToggle.textContent = "Light";
} else {
  themeToggle.textContent = "Dark";
}

themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
  themeToggle.textContent = document.body.classList.contains("dark")
    ? "Light"
    : "Dark";
};

/***********************
 * TARGET SLIDER LOGIC
 ***********************/
const slider = document.getElementById("targetSlider");
const sliderPercent = document.getElementById("sliderPercent");

let target = localStorage.getItem("attendanceTarget")
  ? parseInt(localStorage.getItem("attendanceTarget"))
  : 75;

slider.value = target;
sliderPercent.textContent = target + "%";

slider.addEventListener("input", () => {
  target = Number(slider.value);
  sliderPercent.textContent = target + "%";
  localStorage.setItem("attendanceTarget", target);
  renderSubjects();
});

/***********************
 * ADD / EDIT SUBJECT
 ***********************/
const modal = document.getElementById("modal");
const addBtn = document.getElementById("addSubjectBtn");
const closeBtn = document.getElementById("closeModal");
const saveBtn = document.getElementById("saveSubject");
const subjectList = document.getElementById("subjectList");

let subjects = JSON.parse(localStorage.getItem("subjects")) || [];
let editingSubjectId = null;

addBtn.onclick = () => {
  editingSubjectId = null;

  // CLEAR INPUTS for fresh add
  document.getElementById("subName").value = "";
  document.getElementById("subTotal").value = "";
  document.getElementById("subAttended").value = "";

  modal.style.display = "block";
};


closeBtn.onclick = () => {
  modal.style.display = "none";
};

saveBtn.onclick = () => {
  const name = document.getElementById("subName").value.trim();
  const total = Number(document.getElementById("subTotal").value);
  const attended = Number(document.getElementById("subAttended").value);

  if (!name || isNaN(total) || isNaN(attended) || attended > total) {
    alert("Please enter valid subject details");
    return;
  }

  if (editingSubjectId) {
    subjects = subjects.map(sub =>
      sub.id === editingSubjectId ? { ...sub, name, total, attended } : sub
    );
    editingSubjectId = null;
  } else {
    subjects.push({ id: Date.now(), name, total, attended });
  }

  localStorage.setItem("subjects", JSON.stringify(subjects));
  modal.style.display = "none";
  renderSubjects();
};

/***********************
 * ATTEND / MISS
 ***********************/
function markAttend(id) {
  subjects = subjects.map(sub =>
    sub.id === id
      ? { ...sub, attended: sub.attended + 1, total: sub.total + 1 }
      : sub
  );
  saveAndRender();
}

function markMiss(id) {
  subjects = subjects.map(sub =>
    sub.id === id ? { ...sub, total: sub.total + 1 } : sub
  );
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem("subjects", JSON.stringify(subjects));
  renderSubjects();
}

/***********************
 * RENDER SUBJECTS (FIXED)
 ***********************/
function renderSubjects() {
  subjectList.innerHTML = "";

  subjects.forEach(sub => {
    const percent =
      sub.total === 0 ? 0 : (sub.attended / sub.total) * 100;
    const t = target / 100;

    let statusText = "";
    let color = "#e74c3c";

    if (percent >= target) {
      const safeBunks = Math.floor(
        (sub.attended - t * sub.total) / t
      );

      if (safeBunks > 0) {
        statusText = `On track. You may leave next ${safeBunks} classes.`;
      } else {
        statusText = "On track, but you cannot miss the next class.";
      }

      if (percent === 100) {
        statusText = "On track. Attendance is perfect.";
      }

      color = "#2ecc71";
    } else {
      const needed = Math.max(
        0,
        Math.ceil((t * sub.total - sub.attended) / (1 - t))
      );

      statusText =
        needed > 0
          ? `Attend next ${needed} classes to get back on track.`
          : "Below target.";

      color = percent >= target - 5 ? "#f39c12" : "#e74c3c";
    }

    const card = document.createElement("div");
    card.className = "subject-card";

    card.innerHTML = `
      <h3>${sub.name}</h3>
      <p>Attendance: ${sub.attended} / ${sub.total}</p>

      <div class="circle" style="
        background: conic-gradient(${color} ${percent}%, #e0e0e0 0);
      ">
        ${percent.toFixed(1)}%
      </div>

      <p style="color:${color}; font-weight:bold">
        Status: ${statusText}
      </p>

      <div class="action-buttons">
        <button class="attend-btn" onclick="markAttend(${sub.id})">Attend</button>
        <button class="miss-btn" onclick="markMiss(${sub.id})">Miss</button>
        <button class="edit-btn" onclick="editSubject(${sub.id})">Edit</button>
        <button class="delete-btn" onclick="deleteSubject(${sub.id})">Delete</button>
      </div>
    `;

    subjectList.appendChild(card);
  });

  updateOverallAttendance();
}

/***********************
 * OVERALL ATTENDANCE
 ***********************/
function updateOverallAttendance() {
  const overallSpan = document.getElementById("overallPercent");

  let totalAttended = 0;
  let totalClasses = 0;

  subjects.forEach(sub => {
    totalAttended += sub.attended;
    totalClasses += sub.total;
  });

  overallSpan.textContent =
    totalClasses === 0
      ? "0%"
      : ((totalAttended / totalClasses) * 100).toFixed(1) + "%";
}

function normalizeDayLabel(rawDay) {
  const map = {
    mon: "Monday",
    monday: "Monday",
    tue: "Tuesday",
    tues: "Tuesday",
    tuesday: "Tuesday",
    wed: "Wednesday",
    wednesday: "Wednesday",
    thu: "Thursday",
    thur: "Thursday",
    thurs: "Thursday",
    thursday: "Thursday",
    fri: "Friday",
    friday: "Friday",
    sat: "Saturday",
    saturday: "Saturday",
    sun: "Sunday",
    sunday: "Sunday"
  };
  return map[String(rawDay || "").toLowerCase()] || rawDay;
}

function getKnownPhraseSet(extraSubjects) {
  const defaults = [
    "computer science",
    "data science",
    "machine learning",
    "artificial intelligence",
    "software engineering",
    "operating systems",
    "web development",
    "data structures",
    "physical education"
  ];

  const subjectNames = (extraSubjects || []).map((name) => normalizeText(name));
  return new Set([...defaults.map((item) => normalizeText(item)), ...subjectNames].filter(Boolean));
}

function splitCells(line, knownPhrases) {
  const source = String(line || "").replace(/[‘’'"`]/g, " ");
  const cleaned = source.replace(/\s+/g, " ").trim();

  const delimiterSplit = source
    .split(/\s{2,}|\t+|\s\|\s|,|;/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (delimiterSplit.length > 1) {
    return delimiterSplit;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words;

  const cells = [];
  let index = 0;

  while (index < words.length) {
    let match = null;
    for (let size = 3; size >= 2; size -= 1) {
      if (index + size > words.length) continue;
      const phrase = normalizeText(words.slice(index, index + size).join(" "));
      if (knownPhrases.has(phrase)) {
        match = words.slice(index, index + size).join(" ");
        index += size;
        break;
      }
    }

    if (match) {
      cells.push(match);
    } else {
      cells.push(words[index]);
      index += 1;
    }
  }

  return cells;
}

function extractTimeHeaders(lines) {
  const rangeRegex = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi;
  const candidateHeaders = [];

  lines.forEach((line) => {
    const matches = line.match(rangeRegex);
    if (matches) {
      matches.forEach((value) => candidateHeaders.push(value.replace(/\s+/g, " ").trim()));
    }
  });

  return candidateHeaders;
}

function parseDayRows(lines, knownPhrases) {
  const dayRegex = /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
  const rows = [];

  lines.forEach((line) => {
    const dayMatch = line.match(dayRegex);
    if (!dayMatch) return;

    const day = normalizeDayLabel(dayMatch[1]);
    const cleaned = line.replace(dayRegex, " ").replace(/\s+/g, " ").trim();
    let cells = splitCells(cleaned, knownPhrases);

    if (cells.length <= 1 && cleaned.includes(" - ")) {
      cells = cleaned.split(" - ").map((part) => part.trim()).filter(Boolean);
    }

    if (cells.length > 0) {
      rows.push({ label: day, cells });
    }
  });

  return rows;
}

function parseGenericRows(lines) {
  const tokenRows = lines
    .map((line) => splitCells(line, new Set()))
    .filter((tokens) => tokens.length >= 2);

  if (tokenRows.length < 2) return null;

  const maxCols = Math.max(...tokenRows.map((row) => row.length));
  const headers = Array.from({ length: Math.max(1, maxCols - 1) }, (_, index) => `Slot ${index + 1}`);
  const rows = tokenRows.map((row, index) => {
    const label = row[0] || `Row ${index + 1}`;
    const cells = row.slice(1);
    return { label, cells };
  });

  return { headers, rows };
}

function extractWeekdayHeader(line) {
  const dayRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
  const matches = String(line || "").match(dayRegex) || [];
  const uniqueDays = [];

  matches.forEach((day) => {
    const normalized = normalizeDayLabel(day);
    if (!uniqueDays.includes(normalized)) {
      uniqueDays.push(normalized);
    }
  });

  return uniqueDays.length >= 3 ? uniqueDays : null;
}

function parseHeaderWithPeriodRows(lines, knownPhrases) {
  let dayHeaderIndex = -1;
  let days = null;

  for (let i = 0; i < lines.length; i += 1) {
    const headerDays = extractWeekdayHeader(lines[i]);
    if (headerDays) {
      dayHeaderIndex = i;
      days = headerDays;
      break;
    }
  }

  if (!days || dayHeaderIndex === -1) return null;

  const slotRows = [];
  for (let i = dayHeaderIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/after school/i.test(line)) break;
    if (/^\s*break\s*$/i.test(line)) continue;
    if (/\b(lesson|tutorial|activities|clubs?)\b/i.test(line)) continue;

    const numbered = line.match(/^\s*(?:period\s*)?(\d{1,2})\s+(.+)$/i);
    if (!numbered) continue;

    const slotNo = Number(numbered[1]);
    const textPart = numbered[2].trim();
    if (!textPart) continue;

    let cells = splitCells(textPart, knownPhrases);
    if (cells.length === 0) continue;

    if (cells.length < days.length) {
      cells = [...cells, ...Array.from({ length: days.length - cells.length }, () => "-")];
    } else if (cells.length > days.length) {
      cells = cells.slice(0, days.length);
    }

    slotRows.push({ slotNo, cells });
  }

  if (slotRows.length === 0) return null;

  slotRows.sort((a, b) => a.slotNo - b.slotNo);
  const headers = slotRows.map((row) => `Slot ${row.slotNo}`);
  const rows = days.map((day, dayIndex) => ({
    label: day,
    cells: slotRows.map((row) => row.cells[dayIndex] || "-")
  }));

  return { headers, rows, source: "weekday-header-periods" };
}

function isDayLikeLabel(value) {
  return /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i.test(
    String(value || "")
  );
}

function isTimeLikeLabel(value) {
  return /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:-|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/i.test(String(value || ""));
}

function normalizeAsDayTimeModel(model) {
  if (!model || !Array.isArray(model.rows) || model.rows.length === 0) return model;

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const rowLabels = model.rows.map((row) => String(row.label || "").trim());
  const dayLikeCount = rowLabels.filter(isDayLikeLabel).length;
  const timeLikeRows = model.rows.filter((row) => isTimeLikeLabel(row.label));

  // If rows are already day-like, keep and sort by standard day order.
  if (dayLikeCount >= Math.max(1, Math.ceil(model.rows.length * 0.5))) {
    const rows = model.rows
      .map((row) => ({
        label: normalizeDayLabel(row.label),
        cells: Array.isArray(row.cells) ? row.cells : []
      }))
      .sort((a, b) => {
        const ai = dayOrder.indexOf(a.label);
        const bi = dayOrder.indexOf(b.label);
        const av = ai === -1 ? 999 : ai;
        const bv = bi === -1 ? 999 : bi;
        return av - bv;
      });
    return { ...model, rows };
  }

  // If rows are time-like, transpose to get days on left and times on top.
  if (timeLikeRows.length >= 2) {
    const timeRows = timeLikeRows;
    const headers = timeRows.map((row) => String(row.label || "").trim());
    const maxDayCols = Math.max(...timeRows.map((row) => (Array.isArray(row.cells) ? row.cells.length : 0)));

    const rows = Array.from({ length: maxDayCols }, (_, dayIndex) => {
      const label = dayOrder[dayIndex] || `Day ${dayIndex + 1}`;
      const cells = headers.map((_, timeIndex) => {
        const row = timeRows[timeIndex];
        return row?.cells?.[dayIndex] || "-";
      });
      return { label, cells };
    });

    return { headers, rows, source: "time-transposed" };
  }

  return model;
}

function parseTimeToken(token) {
  const match = String(token || "")
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || "").toUpperCase();

  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (!meridiem && hour === 12) hour = 12;

  return { minutes: hour * 60 + minute, meridiem };
}

function formatMinutes(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const minutePart = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`;
  return `${hour12}${minutePart} ${meridiem}`;
}

function expandTimeHeaders(firstHeader, slotCount) {
  const range = String(firstHeader || "")
    .replace(/\s+/g, " ")
    .trim()
    .match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (!range) return null;

  const start = parseTimeToken(range[1]);
  let end = parseTimeToken(range[2]);
  if (!start) return null;

  // Infer missing meridiem in end using start if needed.
  if (end && !end.meridiem && start.meridiem) {
    const endToken = String(range[2]).trim();
    const rawEnd = Number(endToken.match(/^\d{1,2}/)?.[0] || "0");
    const rawMinute = Number(endToken.match(/:(\d{2})/)?.[1] || "0");
    let hour = rawEnd;
    if (start.meridiem === "AM" && rawEnd === 12) hour = 0;
    if (start.meridiem === "PM" && rawEnd !== 12) hour += 12;
    end = { minutes: hour * 60 + rawMinute, meridiem: start.meridiem };
  }

  if (!end) return null;

  let duration = end.minutes - start.minutes;
  if (duration <= 0) duration = 60;

  return Array.from({ length: slotCount }, (_, index) => {
    const slotStart = start.minutes + duration * index;
    const slotEnd = slotStart + duration;
    return `${formatMinutes(slotStart)} - ${formatMinutes(slotEnd)}`;
  });
}

function parseTimetableText(rawText, extraSubjects) {
  const text = String(rawText || "").replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 2);

  if (lines.length === 0) return null;

  const knownPhrases = getKnownPhraseSet(extraSubjects);

  const headerPeriodModel = parseHeaderWithPeriodRows(lines, knownPhrases);
  if (headerPeriodModel) {
    return normalizeAsDayTimeModel(headerPeriodModel);
  }

  const dayRows = parseDayRows(lines, knownPhrases);
  if (dayRows.length > 0) {
    const maxSlots = Math.max(...dayRows.map((row) => row.cells.length));
    const extractedHeaders = extractTimeHeaders(lines);
    let headers = extractedHeaders.length >= maxSlots ? extractedHeaders.slice(0, maxSlots) : [];
    if (headers.length === 1 && maxSlots > 1) {
      headers = expandTimeHeaders(headers[0], maxSlots) || headers;
    }
    if (headers.length < maxSlots) {
      const fallbackHeaders = Array.from({ length: maxSlots }, (_, index) => `Slot ${index + 1}`);
      headers = headers.length > 0
        ? [...headers, ...fallbackHeaders.slice(headers.length)]
        : fallbackHeaders;
    }

    const rows = dayRows.map((row) => ({
      label: row.label,
      cells: Array.from({ length: maxSlots }, (_, index) => row.cells[index] || "-")
    }));

    return normalizeAsDayTimeModel({ headers, rows, source: "day" });
  }

  const generic = parseGenericRows(lines);
  if (!generic) return null;
  return normalizeAsDayTimeModel({ ...generic, source: "generic" });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTimetable(model, outputElement) {
  if (!outputElement) return;

  if (!model || !Array.isArray(model.headers) || !Array.isArray(model.rows) || model.rows.length === 0) {
    outputElement.innerHTML =
      "<div class=\"timetable-empty\">Could not detect a timetable grid. Try a clearer, straight image.</div>";
    return;
  }

  const headerCells = model.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const bodyRows = model.rows
    .map((row) => {
      const cells = model.headers
        .map((_, index) => `<td>${escapeHtml(row.cells[index] || "-")}</td>`)
        .join("");
      return `<tr><th>${escapeHtml(row.label)}</th>${cells}</tr>`;
    })
    .join("");

  outputElement.innerHTML = `
    <div class="timetable-grid-wrap">
      <table class="timetable-grid">
        <thead>
          <tr>
            <th>Day</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

const TIMETABLE_MODEL_KEY = "savedTimetableModel";
const TIMETABLE_OCR_TEXT_KEY = "savedTimetableOcrText";

function saveTimetableState(model, ocrText) {
  if (model) {
    localStorage.setItem(TIMETABLE_MODEL_KEY, JSON.stringify(model));
  }
  if (typeof ocrText === "string") {
    localStorage.setItem(TIMETABLE_OCR_TEXT_KEY, ocrText);
  }
}

function loadTimetableState() {
  let model = null;
  let ocrText = "";

  try {
    const rawModel = localStorage.getItem(TIMETABLE_MODEL_KEY);
    model = rawModel ? JSON.parse(rawModel) : null;
  } catch (error) {
    model = null;
  }

  ocrText = String(localStorage.getItem(TIMETABLE_OCR_TEXT_KEY) || "");
  return { model, ocrText };
}

function clearTimetableState() {
  localStorage.removeItem(TIMETABLE_MODEL_KEY);
  localStorage.removeItem(TIMETABLE_OCR_TEXT_KEY);
}

async function preprocessImageForOCR(file) {
  if (!file) return null;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(image.width * scale));
        canvas.height = Math.max(1, Math.floor(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const contrast = 1.5;

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const boosted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128));
          data[i] = boosted;
          data[i + 1] = boosted;
          data[i + 2] = boosted;
        }

        ctx.putImageData(imgData, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(blob);
          },
          "image/png",
          0.95
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    image.src = objectUrl;
  });
}

function looksLikeTimetableModel(model) {
  if (!model || !Array.isArray(model.rows) || model.rows.length < 3) return false;
  if (!Array.isArray(model.headers) || model.headers.length < 2) return false;
  if (model.source === "day") return true;

  const longCells = model.rows.some((row) =>
    (row.cells || []).some((cell) => String(cell || "").trim().split(/\s+/).length >= 4)
  );
  return !longCells;
}

async function scanTimetableFromImage(file, statusElement, outputElement, triggerButton) {
  if (!file) {
    if (statusElement) statusElement.textContent = "Select a timetable image first.";
    return;
  }

  if (typeof Tesseract === "undefined") {
    if (statusElement) statusElement.textContent = "OCR library failed to load. Refresh and try again.";
    return;
  }

  if (triggerButton) triggerButton.disabled = true;
  if (statusElement) statusElement.textContent = "Scanning image...";

  try {
    const preprocessed = await preprocessImageForOCR(file);

    const result = await Tesseract.recognize(preprocessed || file, "eng", {
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
      logger: (message) => {
        if (!statusElement) return;
        if (message.status === "recognizing text") {
          statusElement.textContent = `Recognizing text... ${Math.round((message.progress || 0) * 100)}%`;
        } else if (message.status) {
          statusElement.textContent = `${message.status}...`;
        }
      }
    });

    const extractedText = result?.data?.text || "";
    const editor = document.getElementById("ocrTextEditor");
    if (editor) editor.value = extractedText;

    const knownSubjects = (readSavedSubjects() || []).map((subject) => subject.name);
    const model = parseTimetableText(extractedText, knownSubjects);
    renderTimetable(model, outputElement);
    if (model) {
      saveTimetableState(model, extractedText);
    }

    if (statusElement) {
      if (!model) {
        statusElement.textContent = "OCR completed, but timetable format was unclear. Try a clearer image.";
      } else if (!looksLikeTimetableModel(model)) {
        statusElement.textContent = "OCR finished, but result looks noisy. Edit OCR Text and click Build Table from Text.";
      } else {
        statusElement.textContent = "Timetable scanned successfully.";
      }
    }
  } catch (error) {
    if (statusElement) statusElement.textContent = "Scan failed. Please try another image.";
  } finally {
    if (triggerButton) triggerButton.disabled = false;
  }
}

/***********************
 * INITIAL LOAD
 ***********************/
renderSubjects();


/***********************
 * GLOBAL EDIT / DELETE FIX
 ***********************/
window.editSubject = function (id) {
  const sub = subjects.find(s => s.id === id);
  if (!sub) return;

  document.getElementById("subName").value = sub.name;
  document.getElementById("subTotal").value = sub.total;
  document.getElementById("subAttended").value = sub.attended;

  editingSubjectId = id;
  modal.style.display = "block";
};

window.deleteSubject = function (id) {
  if (!confirm("Are you sure you want to delete this subject?")) return;

  subjects = subjects.filter(sub => sub.id !== id);
  localStorage.setItem("subjects", JSON.stringify(subjects));
  renderSubjects();
};




document.addEventListener('DOMContentLoaded', () => {
    const chatToggle = document.getElementById('chat-toggle');
    const chatWindow = document.getElementById('chat-window');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatContent = document.getElementById('chat-content');
    const closeChat = document.getElementById('close-chat');
    const timetableImage = document.getElementById('timetableImage');
    const scanTimetableBtn = document.getElementById('scanTimetableBtn');
    const ocrStatus = document.getElementById('ocrStatus');
    const timetableOutput = document.getElementById('timetableOutput');
    const ocrTextEditor = document.getElementById('ocrTextEditor');
    const buildFromTextBtn = document.getElementById('buildFromTextBtn');
    const removeTimetableBtn = document.getElementById('removeTimetableBtn');

    const savedTimetable = loadTimetableState();
    if (ocrTextEditor && savedTimetable.ocrText) {
      ocrTextEditor.value = savedTimetable.ocrText;
    }
    if (savedTimetable.model) {
      renderTimetable(savedTimetable.model, timetableOutput);
      if (ocrStatus) ocrStatus.textContent = "Loaded saved timetable.";
    }

    // 1. Open Chat
    if (chatToggle) {
        chatToggle.onclick = () => {
            chatWindow.style.display = 'flex';
        };
    }

    // 2. Close Chat
    if (closeChat) {
        closeChat.onclick = () => {
            chatWindow.style.display = 'none';
        };
    }

    // 3. Send Message Logic
    const sendMessage = async () => {
      const text = userInput.value.trim();
      if (!text) return;

      addMessage(text, 'user', chatContent);
      userInput.value = '';
      userInput.disabled = true;
      if (sendBtn) sendBtn.disabled = true;

      const response = await generateResponse(text);
      addMessage(response, 'bot', chatContent);

      userInput.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      userInput.focus();
    };

    if (sendBtn) {
      sendBtn.onclick = sendMessage;
    }

    if (userInput) {
      userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          sendMessage();
        }
      });
    }

    if (scanTimetableBtn) {
      scanTimetableBtn.onclick = () => {
        const selectedFile = timetableImage?.files?.[0];
        scanTimetableFromImage(selectedFile, ocrStatus, timetableOutput, scanTimetableBtn);
      };
    }

    if (buildFromTextBtn) {
      buildFromTextBtn.onclick = () => {
        const text = String(ocrTextEditor?.value || "").trim();
        if (!text) {
          if (ocrStatus) ocrStatus.textContent = "Paste or edit OCR text first.";
          return;
        }
        const knownSubjects = (readSavedSubjects() || []).map((subject) => subject.name);
        const model = parseTimetableText(text, knownSubjects);
        renderTimetable(model, timetableOutput);
        if (ocrStatus) {
          ocrStatus.textContent = model
            ? "Table rebuilt from edited text."
            : "Could not build table from edited text.";
        }
        if (model) {
          saveTimetableState(model, text);
        }
      };
    }

    if (removeTimetableBtn) {
      removeTimetableBtn.onclick = () => {
        clearTimetableState();
        if (timetableOutput) timetableOutput.innerHTML = "";
        if (ocrTextEditor) ocrTextEditor.value = "";
        if (timetableImage) timetableImage.value = "";
        if (ocrStatus) ocrStatus.textContent = "Timetable removed.";
      };
    }
});

function addMessage(text, role, chatContent) {
  if (!chatContent) return;

  const row = document.createElement('div');
  row.className = `msg ${role}`;
  row.textContent = text;

  chatContent.appendChild(row);
  chatContent.scrollTop = chatContent.scrollHeight;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readSavedSubjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem("subjects") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return null;
  }
}

function readApiKey() {
  return String(localStorage.getItem("bunkBuddyApiKey") || "").trim();
}

function getTargetPercent() {
  return Number(localStorage.getItem("attendanceTarget") || 75);
}

function getSubjectStats(subject, targetPercent) {
  const attended = Number(subject.attended || 0);
  const total = Number(subject.total || 0);
  const percent = total > 0 ? (attended / total) * 100 : 0;
  const t = targetPercent / 100;

  const safeBunks = t > 0 ? Math.max(0, Math.floor((attended - t * total) / t)) : 0;
  const needToAttend = t < 1 ? Math.max(0, Math.ceil((t * total - attended) / (1 - t))) : 0;

  return { attended, total, percent, safeBunks, needToAttend };
}

function findSubjectFromText(text, savedSubjects) {
  const normalizedInput = normalizeText(text);
  let bestMatch = null;
  let bestScore = -1;

  savedSubjects.forEach((subject) => {
    const rawName = String(subject.name || "").trim();
    const name = normalizeText(rawName);
    if (!name) return;

    let score = -1;
    if (normalizedInput === name) score = 100;
    else if (normalizedInput.includes(name)) score = 80 + name.length;
    else if (name.includes(normalizedInput) && normalizedInput.length >= 2) score = 40 + normalizedInput.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = subject;
    }
  });

  return bestMatch;
}

function buildSubjectsContext(savedSubjects, target) {
  const rows = savedSubjects.map((subject) => {
    const stats = getSubjectStats(subject, target);
    return `${subject.name}: attended=${stats.attended}, total=${stats.total}, percent=${stats.percent.toFixed(1)}%`;
  });

  return rows.join("\n");
}

function isAttendanceIntent(text) {
  const keywords = [
    "attendance", "attend", "miss", "skip", "bunk", "class", "classes",
    "subject", "percent", "percentage", "target", "safe", "bunkable"
  ];
  return keywords.some((word) => text.includes(word));
}

function getOfflineChatReply(text) {
  if (text.includes("your name") || text.includes("who are you")) {
    return "I'm Bunk Buddy, your attendance assistant and chat companion.";
  }

  if (text.includes("how are you")) {
    return "Doing well. Ready when you are.";
  }

  if (text.includes("what can you do")) {
    return "I can chat and also calculate attendance, safe bunks, and recovery plans.";
  }

  if (text.includes("bye") || text.includes("good night")) {
    return "See you later.";
  }

  return "I can chat normally, and I can also solve attendance questions. Try: \"Can I miss 2 math classes?\"";
}

async function callRealtimeAI(userMessage, savedSubjects, target) {
  const apiKey = readApiKey();
  if (!apiKey) return null;

  const systemPrompt =
    "You are Bunk Buddy, a concise friendly student assistant. " +
    "Use the attendance data below whenever the user asks attendance-related questions. " +
    "If user asks general chat, respond naturally. " +
    "For attendance math, be precise and show final decision clearly. " +
    `Attendance target: ${target}%.\n` +
    "Subjects:\n" +
    buildSubjectsContext(savedSubjects, target);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.4
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return "Your API key looks invalid. Set a valid key using: /setkey YOUR_OPENAI_KEY";
      }
      return null;
    }

    const data = await response.json();
    const text = String(data.output_text || "").trim();
    return text || null;
  } catch (error) {
    return null;
  }
}

// UPDATED generateResponse function with better error handling and logging
aasync function generateResponse(message) {
  // Quick greeting check
  const greeting = message.toLowerCase().trim();
  if (greeting === 'hi' || greeting === 'hello' || greeting === 'hey') {
    return "Hello! How can I help you today?";
  }
  
  try {
    const subjects = readSavedSubjects();
    const target = getTargetPercent();
    
    if (!subjects || subjects.length === 0) {
      return "No subjects found yet. Add at least one subject in the tracker first.";
    }
    
    console.log('Sending to function:', { message, subjects, target });
    
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        subjects: subjects,
        target: target
      })
    });
    
    const data = await response.json();
    console.log('Response from function:', data);
    
    // The function now always returns 200 with a reply
    return data.reply;
    
  } catch (error) {
    console.error('Chat error:', error);
    return "Sorry, I couldn't reach the AI. Check your internet connection.";
  }
}