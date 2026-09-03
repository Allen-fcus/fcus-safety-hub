import { useState, useRef, useEffect, createContext, useContext } from "react";
import Papa from "papaparse";
import { Home, BookOpen, PlayCircle, ClipboardCheck, FileText, ChevronRight, Download, CheckCircle2, Circle, X, Play, ShieldAlert, Clock, Eraser, Send, PenLine, Users, Eye, BadgeCheck, LogOut, Loader2, CalendarDays, MapPin, Megaphone, Pin, ExternalLink, Lock, AlertTriangle, Camera, Phone, MessageSquare, ImagePlus } from "lucide-react";
import { supabase, loadProjectMap, projectIdForSlug, projectSlugForId } from "./supabaseClient.js";

// ============================================================
// CONTENT SOURCE CONFIG
// Paste your published-to-web Google Sheet CSV links below.
// Leave blank ("") to keep using the built-in sample content.
// How to get a link: in Google Sheets, File > Share > Publish to web
// > select the specific sheet/tab > CSV > Publish, then copy the URL.
// Required column headers are noted above each URL.
//
// Columns reference (same shape for every project below):
//   manual            — Title, Pages, ViewLink (Drive "preview" share link)
//   toolbox           — Title, Length, Date, VideoLink, IsNew (yes/no)
//   training          — Title, Questions
//   forms             — Title, Fields (pipe-separated), PdfLink
//   externalForms     — Title, Url (shared company-wide — not project-specific)
//   personnel         — Name, EmployeeID, Badge, Role, Employer, OrientationDate,
//                        Qualifications ("Label:status; Label:status"), TrainingAccess (yes/no),
//                        MultiSiteAccess (yes/no — can this person switch between projects?), PhotoUrl
//   orientation       — Date, Time, Location, Notes
//   orientationDocs   — Title, PdfLink
//   weeklyReports     — Week, Title, Summary, ViewLink
//   workPlans         — Subcontractor, Title, Pages, ViewLink
//   emergencyContacts — Department, Name, Phone
//   bulletin          — Title, Date, Message, Pinned (yes/no)
// ============================================================
// ============================================================
// EMAIL DELIVERY (EmailJS — sends the browser straight to an inbox,
// no backend server needed). Fill these in once you've created a
// free account at emailjs.com and set up a Service + Template.
// Leave blank and form submissions still save to the database,
// they just won't trigger an email until these are filled in.
// ============================================================
const EMAILJS_SERVICE_ID = "";
const EMAILJS_TEMPLATE_ID = "";
const EMAILJS_PUBLIC_KEY = "";

async function sendFormEmail({ toEmail, formTitle, fieldsText, submittedBy, projectName }) {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    return { sent: false, reason: "Email not configured yet." };
  }
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: toEmail,
          form_title: formTitle,
          submitted_by: submittedBy,
          project_name: projectName,
          fields_text: fieldsText,
        },
      }),
    });
    return { sent: res.ok, reason: res.ok ? null : "Email service rejected the request." };
  } catch (e) {
    return { sent: false, reason: "Could not reach the email service." };
  }
}

const EMPTY_SHEET_URLS = {
  manual: "", toolbox: "", training: "", forms: "", externalForms: "",
  personnel: "", orientation: "", orientationDocs: "", weeklyReports: "",
  workPlans: "", emergencyContacts: "", bulletin: "",
};

const ProjectContext = createContext(null);

function useSheetData(url, fallback, mapRow) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(!!url);

  useEffect(() => {
    if (!url) { setData(fallback); return; }
    setLoading(true);
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          setData(results.data.map(mapRow));
        } catch (e) {
          setData(fallback);
        }
        setLoading(false);
      },
      error: () => { setData(fallback); setLoading(false); },
    });
    // eslint-disable-next-line
  }, [url]);

  return [data, loading];
}

// ---- Design tokens ----
// Ink #101010, Surface #F4F3EF, Brand red #C8102E, Caution amber #FFB81C, Steel #5B6168
const GOLD = "#EBB701";   // Ferrovial brand gold
const ALERT = "#C8102E";  // reserved for genuine warnings (expired, errors)
const AMBER = "#EBB701";  // alias kept for hazard-stripe styling
const INK = "#101010";
const STEEL = "#5B6168";

function HazardRule({ height = 4 }) {
  return <div style={{ height, background: AMBER }} />;
}



function TopBar({ title, onBack, onBadge, badgeLabel = "Badge", onProjectTap, user }) {
  const { name: projectName } = useContext(ProjectContext);
  const canSwitch = !!(user && user.multiSiteAccess);
  return (
    <div className="sticky top-0 z-20" style={{ background: INK }}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="text-white/70 pr-1 text-lg leading-none">
              ‹
            </button>
          )}
          <div>
            <div
              className="text-white uppercase tracking-wide"
              style={{ fontFamily: "Oswald, sans-serif", fontSize: 19, fontWeight: 600, letterSpacing: "0.02em" }}
            >
              {title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {onBadge && (
            <button onClick={onBadge} className="flex items-center gap-1">
              <BadgeCheck size={18} color={AMBER} />
              <span className="text-[10px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace" }}>{badgeLabel}</span>
            </button>
          )}
        </div>
      </div>
      {canSwitch ? (
        <button onClick={onProjectTap} className="px-4 pb-2 -mt-1 flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}>
            {projectName}
          </span>
          <ChevronRight size={11} color={AMBER} style={{ transform: "rotate(90deg)" }} />
        </button>
      ) : (
        <div className="px-4 pb-2 -mt-1 flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}>
            {projectName}
          </span>
        </div>
      )}
      <HazardRule height={4} />
    </div>
  );
}

function Tag({ children, tone = "steel" }) {
  const bg = tone === "amber" ? AMBER : tone === "red" ? GOLD : "#E7E5DF";
  const color = tone === "amber" ? INK : tone === "red" ? "#fff" : STEEL;
  return (
    <span
      className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm"
      style={{ background: bg, color, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}
    >
      {children}
    </span>
  );
}

const HERO_IMAGE = "data:image/jpeg;base64,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";

// ---- Screen: Home ----
function HomeScreen({ go, progress, user, activeProjectId }) {
  const { fallbacks, name: projectName } = useContext(ProjectContext);
  const sections = [
    { key: "orientation", label: "Orientation", desc: "Sessions, what to bring & paperwork", icon: CalendarDays, count: `${ORIENTATION_SESSIONS_DEFAULT.length} sessions/wk` },
    { key: "manual", label: "H&S Minimum Standard & Safety Plan", desc: "Official standards & safety plan", icon: BookOpen, count: `${fallbacks.safetyPlan.length + 1} documents` },
    { key: "forms", label: "Forms & Templates", desc: "Fill, sign & submit", icon: FileText, count: `${FORMS_DEFAULT.length} forms` },
    { key: "reports", label: "Weekly Report", desc: "Lessons learned from other projects", icon: AlertTriangle, count: `${WEEKLY_REPORTS_DEFAULT.length} posted` },
    { key: "toolbox", label: "Toolbox Talks", desc: "Weekly video briefings", icon: PlayCircle, count: "12 videos" },
    { key: "workplans", label: "Work Plans", desc: "By subcontractor, view only", icon: ClipboardCheck, count: `${fallbacks.workPlans.length} plans` },
    { key: "personnel", label: "Personnel Lookup", desc: "Quals & competent persons", icon: Users, count: `${fallbacks.personnel.length} on file` },
    { key: "emergency", label: "Emergency Contacts", desc: "Safety, Traffic, Environmental, PR", icon: Phone, count: "Always available" },
    { key: "concern", label: "Report a Concern", desc: "Speak up — anonymous option available", icon: MessageSquare, count: "Always available" },
  ];

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setLoadingPosts(true);
      await loadProjectMap();
      const projectUuid = projectIdForSlug(activeProjectId);
      if (!projectUuid) { if (!cancelled) { setPosts([]); setLoadingPosts(false); } return; }
      const { data, error } = await supabase
        .from("bulletin_posts")
        .select("*")
        .eq("project_id", projectUuid)
        .order("posted_at", { ascending: false });
      if (cancelled) return;
      setPosts(
        error || !data
          ? []
          : data.map((row) => ({
              title: row.title,
              date: row.posted_at ? new Date(row.posted_at).toLocaleDateString() : "",
              message: row.message,
              checklist: row.checklist || null,
              pinned: !!row.pinned,
            }))
      );
      setLoadingPosts(false);
    }
    loadPosts();
    return () => { cancelled = true; };
  }, [activeProjectId]);

  const sortedPosts = [...posts].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const [emergencyContacts] = useSheetData(EMPTY_SHEET_URLS.emergencyContacts, fallbacks.emergencyContacts, (row) => ({
    department: row.Department || "Untitled",
    name: row.Name || "TBD",
    phone: row.Phone || "",
  }));

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div
        className="rounded-md p-4 mb-4 text-white relative overflow-hidden flex items-stretch gap-3"
        style={{ background: INK }}
      >
        <div className="relative flex-1 min-w-0">
          <div style={{ fontFamily: "IBM Plex Mono, monospace" }} className="text-[10px] uppercase tracking-widest" >
            <span style={{ color: AMBER }}>Safety Hub</span>
          </div>
          <div className="mt-2 mb-1">
            <div
              style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, color: AMBER, letterSpacing: "0.02em" }}
              className="text-2xl leading-[0.95]"
            >
              ALWAYS<br/>SAFE.
            </div>
            <div
              style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, letterSpacing: "0.02em" }}
              className="text-2xl leading-[0.95] mt-1"
            >
              ALWAYS<br/>READY.
            </div>
          </div>
          <div className="mt-3 inline-block text-[10px] uppercase font-bold px-2 py-1 rounded-sm" style={{ background: AMBER, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
            {projectName}
          </div>
        </div>
        <img
          src={HERO_IMAGE}
          alt="Highway interchange"
          className="rounded-sm flex-shrink-0 object-cover"
          style={{ width: 128, height: "100%" }}
        />
      </div>

      <div className="rounded-md p-3 mb-4" style={{ background: INK }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Phone size={13} color={AMBER} />
          <span className="text-[11px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.04em" }}>Emergency Contacts — Always Available</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {emergencyContacts.length === 0 && (
            <div className="col-span-2 text-[11px] px-2 py-1.5" style={{ color: "#9AA0A6" }}>Not set up for this project yet.</div>
          )}
          {(() => {
            const grouped = {};
            emergencyContacts.forEach((c) => {
              if (!grouped[c.department]) grouped[c.department] = [];
              grouped[c.department].push(c);
            });
            return Object.keys(grouped).map((dept, i) => {
              const list = grouped[dept];
              const primary = list[0];
              return (
                <button
                  key={i}
                  onClick={() => go("emergency")}
                  className="text-left rounded-sm px-2 py-1.5"
                  style={{ background: "#222" }}
                >
                  <div className="text-[9px] uppercase font-bold" style={{ color: "#9AA0A6", fontFamily: "IBM Plex Mono, monospace" }}>{dept}</div>
                  <div className="text-[11px] text-white truncate">{primary.phone ? `${primary.name} · ${primary.phone}` : "Pending"}{list.length > 1 ? ` +${list.length - 1}` : ""}</div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      <div className="rounded-md p-3 mb-5 bg-white border" style={{ borderColor: GOLD, borderLeftWidth: 3 }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Megaphone size={13} color={STEEL} />
            <span className="text-xs uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.06em" }}>Bulletin Board</span>
          </div>
          {user && user.canAddPersonnel && (
            <button onClick={() => go("managebulletin")} className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
              Manage
            </button>
          )}
        </div>
        {loadingPosts && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
        <div className="space-y-2">
          {sortedPosts.map((p, i) => (
            <div
              key={i}
              className="bg-white rounded-md p-3 border"
              style={{ borderColor: p.pinned ? GOLD : "#E4E2DA", borderLeftWidth: p.pinned ? 3 : 1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {p.pinned && <Pin size={12} color={GOLD} />}
                  <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{p.title}</div>
                </div>
                <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{p.date}</span>
              </div>
              <div className="text-[12px]" style={{ color: "#333" }}>{p.message}</div>
              {p.checklist && p.checklist.length > 0 && (
                <div className="mt-2 space-y-1">
                  {p.checklist.map((item, ci) => (
                    <div key={ci} className="flex items-start gap-1.5">
                      <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: GOLD }} />
                      <span className="text-[11px] leading-snug" style={{ color: "#333" }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {sortedPosts.length === 0 && (
            <div className="text-[12px] text-center py-4" style={{ color: STEEL }}>No announcements yet.</div>
          )}
        </div>
      </div>

      <div className="text-xs uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.06em" }}>
        Jump to
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => go(s.key)}
            className="text-left rounded-md p-3 bg-white border active:scale-[0.98] transition"
            style={{ borderColor: "#E4E2DA" }}
          >
            <s.icon size={20} color={GOLD} />
            <div style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }} className="mt-2 text-[15px]" >
              {s.label}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: STEEL }}>{s.desc}</div>
            <div className="mt-2">
              <Tag tone={s.key === "training" ? "amber" : "steel"}>{s.count}</Tag>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-md p-3 flex items-center gap-3" style={{ background: "#FCEFEF", border: `1px solid ${GOLD}33` }}>
        <ShieldAlert size={22} color={GOLD} />
        <div>
          <div className="text-[13px] font-bold" style={{ color: INK, fontFamily: "Oswald, sans-serif" }}>New this week</div>
          <div className="text-[12px]" style={{ color: STEEL }}>Toolbox Talk: "Fall Protection Refresher" — watch by Friday. Required for all crew on {projectName} sites.</div>
        </div>
      </div>
    </div>
  );
}

// ---- Screen: Emergency Contacts (never gated — always available) ----
const EMERGENCY_CONTACTS_DEFAULT = [
  { department: "Safety", name: "Jim Quinn", phone: "682-478-7742" },
  { department: "Safety", name: "Paul Vares", phone: "972-890-5632" },
  { department: "Safety", name: "Allen Garcia", phone: "817-564-5594" },
  { department: "Traffic Control", name: "Kedric Hayes", phone: "504-908-8581" },
  { department: "Traffic Control", name: "Marco Nieto", phone: "817-360-1587" },
  { department: "Environmental", name: "Jeff McCully", phone: "817-422-1491" },
  { department: "Environmental", name: "Abigail Reed", phone: "682-380-0026" },
  { department: "Environmental", name: "Ethan Tang", phone: "817-751-4837" },
  { department: "Public Relations", name: "Tommy Willamson", phone: "817-914-0543" },
];

// Departments known, contacts not yet assigned for these projects
const EMERGENCY_CONTACTS_TBD = [
  { department: "Safety", name: "Unknown", phone: "" },
  { department: "Traffic Control", name: "Unknown", phone: "" },
  { department: "Environmental", name: "Unknown", phone: "" },
  { department: "Public Relations", name: "Unknown", phone: "" },
];

function EmergencyContactsScreen() {
  const { sheetUrls, fallbacks } = useContext(ProjectContext);
  const [contacts, loading] = useSheetData(sheetUrls.emergencyContacts, fallbacks.emergencyContacts, (row) => ({
    department: row.Department || "Untitled",
    name: row.Name || "TBD",
    phone: row.Phone || "",
  }));
  const grouped = {};
  contacts.forEach((c) => {
    if (!grouped[c.department]) grouped[c.department] = [];
    grouped[c.department].push(c);
  });
  const departments = Object.keys(grouped);

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Available to everyone at all times — no login required. Tap a number to call directly.
      </div>
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      {departments.length === 0 && !loading && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No emergency contacts posted for this project yet.</div>
      )}
      {departments.map((dept) => (
        <div key={dept} className="mb-4">
          <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{dept}</div>
          <div className="space-y-2">
            {grouped[dept].map((c, i) => (
              <div key={i} className="bg-white rounded-md p-3 flex items-center justify-between border" style={{ borderColor: "#E4E2DA" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: INK }}>
                    <Phone size={18} color={GOLD} />
                  </div>
                  <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{c.name}</div>
                </div>
                {c.phone ? (
                  <a
                    href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}
                    className="text-[12px] font-bold px-3 py-2 rounded-sm flex-shrink-0 ml-2"
                    style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
                  >
                    {c.phone}
                  </a>
                ) : (
                  <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-sm flex-shrink-0 ml-2" style={{ background: "#E4E2DA", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Screen: Report a Concern (never gated — always available) ----
const CONCERN_CATEGORIES = ["Safety Concern", "Near Miss", "Unsafe Condition", "Environmental", "Other"];

function ReportConcernScreen({ onSubmit }) {
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(null);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const canSubmit = category !== null && description.trim().length > 0;

  const handleSubmit = () => {
    onSubmit({
      anonymous,
      name: anonymous ? "Anonymous" : (name.trim() || "Anonymous"),
      category: CONCERN_CATEGORIES[category],
      location,
      description,
      photo,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="px-4 pt-10 pb-8 flex flex-col items-center text-center" style={{ background: "#F4F3EF", minHeight: "100%" }}>
        <CheckCircle2 size={40} color={GOLD} />
        <div className="text-[16px] mt-3 mb-1" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Report Submitted</div>
        <div className="text-[12px] max-w-[260px]" style={{ color: STEEL }}>
          Thanks for speaking up. Your report has been sent to the safety team. You will never be disciplined for reporting a hazard or concern.
        </div>
        <button
          onClick={() => {
            setSubmitted(false); setAnonymous(false); setName(""); setCategory(null);
            setLocation(""); setDescription(""); setPhoto(null);
          }}
          className="mt-5 text-[12px] font-bold uppercase px-4 py-2 rounded-sm"
          style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-4" style={{ color: STEEL }}>
        See something? Say something. Available to everyone at all times — no login required, and you can report anonymously.
      </div>

      <button
        onClick={() => setAnonymous((a) => !a)}
        className="w-full flex items-center justify-between bg-white rounded-md p-3 border mb-4"
        style={{ borderColor: "#E4E2DA" }}
      >
        <div>
          <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Submit Anonymously</div>
          <div className="text-[11px]" style={{ color: STEEL }}>Your name will not be included</div>
        </div>
        <div className="w-10 h-6 rounded-full flex items-center px-0.5 flex-shrink-0" style={{ background: anonymous ? GOLD : "#E4E2DA", justifyContent: anonymous ? "flex-end" : "flex-start" }}>
          <div className="w-5 h-5 rounded-full bg-white" />
        </div>
      </button>

      {!anonymous && (
        <div className="mb-4">
          <label className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Your Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
            style={{ borderColor: "#C9C6BC" }}
          />
        </div>
      )}

      <div className="mb-4">
        <ChoiceGroup group={{ label: "Category", items: CONCERN_CATEGORIES }} value={category} onChange={setCategory} />
      </div>

      <div className="mb-4">
        <label className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Location</label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Ramp 0, Segment 3"
          className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: "#C9C6BC" }}
        />
      </div>

      <div className="mb-4">
        <label className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>What did you see?</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
          style={{ borderColor: "#C9C6BC" }}
        />
      </div>

      <div className="mb-5">
        <label className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Photo (optional)</label>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
        {photo ? (
          <div className="relative mt-1">
            <img src={photo} alt="Attached" className="w-full rounded-md" style={{ maxHeight: 180, objectFit: "cover" }} />
            <button onClick={() => setPhoto(null)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: INK }}>
              <X size={13} color="white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="w-full mt-1 rounded-md border-2 border-dashed py-4 flex flex-col items-center gap-1"
            style={{ borderColor: "#C9C6BC" }}
          >
            <ImagePlus size={20} color={STEEL} />
            <span className="text-[11px]" style={{ color: STEEL }}>Attach a photo</span>
          </button>
        )}
      </div>

      <button
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-md py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
      >
        <Send size={15} /> Submit Report
      </button>
    </div>
  );
}

// ---- Screen: Safety Manual ----
// H&S Minimum Standards is the same document company-wide, shared across every project.
const HS_STANDARDS_ITEM = { title: "H&S Minimum Standards", pages: 38, link: "https://drive.google.com/file/d/1OF9Es0Q0Vy-tkE1UNe3zSptsxbDGHEth/preview" };
// The Safety Plan itself is project-specific — each project's fallback is set in PROJECTS below.
const SAFETY_PLAN_DEFAULT = [{ title: "Chapter 5A – Safety Program", pages: 135, link: "https://drive.google.com/file/d/1CN4zxti0ovQd8cUkxfqy7WuXJMQfiYhd/preview", downloadable: false }];

function ManualScreen() {
  const { sheetUrls, fallbacks } = useContext(ProjectContext);
  const [viewing, setViewing] = useState(null);
  const [downloaded, setDownloaded] = useState({});
  const [sections, loading] = useSheetData(sheetUrls.manual, [...fallbacks.safetyPlan, HS_STANDARDS_ITEM], (row) => ({
    title: row.Title || "Untitled",
    pages: row.Pages || "—",
    link: row.ViewLink || "",
    downloadable: (row.Downloadable || "yes").toLowerCase() !== "no",
  }));

  const handleDownload = (s, i) => {
    setDownloaded((d) => ({ ...d, [i]: true }));
    if (s.link) window.open(s.link, "_blank");
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        View or download the full safety manual by section.
      </div>
      {loading && <div className="text-[12px]" style={{ color: STEEL }}>Loading…</div>}
      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={i} className="bg-white rounded-md p-3 border" style={{ borderColor: "#E4E2DA" }}>
            <div className="mb-2">
              <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{s.title}</div>
              <div className="text-[11px]" style={{ color: STEEL }}>{s.pages} pages</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setViewing(s)} className={s.downloadable === false ? "w-full flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" : "flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border"} style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                <Eye size={12} /> View
              </button>
              {s.downloadable !== false && (
                <button onClick={() => handleDownload(s, i)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                  {downloaded[i] ? <CheckCircle2 size={12} color={GOLD} /> : <Download size={12} />} {downloaded[i] ? "Saved" : "Download"}
                </button>
              )}
            </div>
          </div>
        ))}
        {sections.length === 0 && !loading && (
          <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No documents posted for this project yet.</div>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden max-h-[85%] flex flex-col" style={{ height: "80%" }}>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#E4E2DA" }}>
              <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{viewing.title}</div>
              <button onClick={() => setViewing(null)}><X size={18} color={STEEL} /></button>
            </div>
            {viewing.link ? (
              <iframe src={viewing.link} className="flex-1 w-full" style={{ border: "none" }} title={viewing.title} />
            ) : (
              <div className="flex-1 overflow-y-auto flex items-center justify-center py-12" style={{ background: "#FCFCFA" }}>
                <div className="text-center px-6">
                  <Eye size={28} color={STEEL} className="mx-auto" />
                  <div className="text-[11px] mt-2" style={{ color: STEEL }}>Document viewer — {viewing.pages} pages</div>
                  <div className="text-[10px] mt-1" style={{ color: STEEL }}>Add a ViewLink in your sheet to show the real document here.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Screen: Work Plans (view-only, grouped by subcontractor) ----
const WORK_PLANS_FLAT_DEFAULT = [
  { subcontractor: "Road Maker", title: "Roadway Paving Work Plan", pages: 6, link: "" },
  { subcontractor: "Road Maker", title: "Milling & Resurfacing Work Plan", pages: 4, link: "" },
  { subcontractor: "MW Panel Tech", title: "Precast Panel Installation Work Plan", pages: 5, link: "" },
  { subcontractor: "NTI", title: "Site Mobilization Work Plan", pages: 3, link: "" },
  { subcontractor: "FGA", title: "Grading & Excavation Work Plan", pages: 7, link: "" },
  { subcontractor: "Paniolo", title: "Fencing & Barrier Work Plan", pages: 3, link: "" },
  { subcontractor: "MCD Construction", title: "Structural Concrete Work Plan", pages: 6, link: "" },
  { subcontractor: "MCD Construction", title: "Bridge Deck Pour Work Plan", pages: 5, link: "" },
];

function WorkPlansScreen({ user, go }) {
  const [viewing, setViewing] = useState(null);
  const [flatPlans, setFlatPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.sessionToken) { setFlatPlans([]); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.rpc("list_work_plans", { p_token: user.sessionToken });
      if (cancelled) return;
      setFlatPlans(
        error || !data
          ? []
          : data.map((row) => ({
              subcontractor: row.subcontractor || "Unassigned",
              title: row.title || "Untitled",
              pages: row.pages || "—",
              link: row.view_link || "",
            }))
      );
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user?.sessionToken]);

  const handleDownload = (p, key) => {
    setDownloaded((d) => ({ ...d, [key]: true }));
    if (p.link) window.open(p.link, "_blank");
  };

  const grouped = {};
  flatPlans.forEach((p) => {
    if (!grouped[p.subcontractor]) grouped[p.subcontractor] = [];
    grouped[p.subcontractor].push(p);
  });
  const subcontractors = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px]" style={{ color: STEEL }}>
          Active work plans by subcontractor. View or download as needed.
        </div>
        {user && user.canAddPersonnel && (
          <button onClick={() => go("manageworkplans")} className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm flex-shrink-0 ml-2" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
            Manage
          </button>
        )}
      </div>
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      {subcontractors.map((name) => (
        <div key={name} className="mb-4">
          <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{name}</div>
          <div className="space-y-2">
            {grouped[name].map((p, i) => {
              const key = `${name}-${i}`;
              return (
                <div key={key} className="bg-white rounded-md p-3 border" style={{ borderColor: "#E4E2DA" }}>
                  <div className="mb-2">
                    <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{p.title}</div>
                    <div className="text-[11px]" style={{ color: STEEL }}>{p.pages} pages</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewing(p)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                      <Eye size={12} /> View
                    </button>
                    <button onClick={() => handleDownload(p, key)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                      {downloaded[key] ? <CheckCircle2 size={12} color={GOLD} /> : <Download size={12} />} {downloaded[key] ? "Saved" : "Download"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {subcontractors.length === 0 && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No work plans posted yet.</div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden max-h-[85%] flex flex-col" style={{ height: "80%" }}>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#E4E2DA" }}>
              <div>
                <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{viewing.subcontractor}</div>
                <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{viewing.title}</div>
              </div>
              <button onClick={() => setViewing(null)}><X size={18} color={STEEL} /></button>
            </div>
            {viewing.link ? (
              <iframe src={viewing.link} className="flex-1 w-full" style={{ border: "none" }} title={viewing.title} />
            ) : (
              <div className="flex-1 overflow-y-auto flex items-center justify-center py-12" style={{ background: "#FCFCFA" }}>
                <div className="text-center px-6">
                  <Eye size={28} color={STEEL} className="mx-auto" />
                  <div className="text-[11px] mt-2" style={{ color: STEEL }}>Document viewer — {viewing.pages} pages</div>
                  <div className="text-[10px] mt-1" style={{ color: STEEL }}>Add a ViewLink in your sheet to show the real plan here.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Screen: Toolbox Talks ----
const TALKS_DEFAULT = [
  { title: "Fall Protection Refresher", len: "6:12", date: "Aug 24", isNew: true, videoLink: "" },
  { title: "Scaffold Safety & Inspection", len: "8:40", date: "Aug 17", videoLink: "" },
  { title: "Jobsite Traffic & Cone Placement", len: "5:05", date: "Aug 10", videoLink: "" },
  { title: "PPE for General Construction", len: "4:48", date: "Aug 3", videoLink: "" },
  { title: "Heat Stress & Hydration", len: "5:33", date: "Jul 27", videoLink: "" },
];
function ToolboxScreen() {
  const { sheetUrls } = useContext(ProjectContext);
  const [playing, setPlaying] = useState(null);
  const [talks, loading] = useSheetData(sheetUrls.toolbox, TALKS_DEFAULT, (row) => ({
    title: row.Title || "Untitled",
    len: row.Length || "",
    date: row.Date || "",
    videoLink: row.VideoLink || "",
    isNew: (row.IsNew || "").toLowerCase() === "yes",
  }));
  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Short weekly briefings. Watch on-site or beforehand — no login needed once installed.
      </div>
      {loading && <div className="text-[12px]" style={{ color: STEEL }}>Loading…</div>}
      <div className="space-y-2">
        {talks.map((t, i) => (
          <button
            key={i}
            onClick={() => setPlaying(t)}
            className="w-full text-left bg-white rounded-md p-3 flex items-center gap-3 border"
            style={{ borderColor: "#E4E2DA" }}
          >
            <div className="w-14 h-14 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: INK }}>
              <Play size={20} color={AMBER} fill={AMBER} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] truncate" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{t.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <Clock size={11} color={STEEL} />
                <span className="text-[11px]" style={{ color: STEEL }}>{t.len}</span>
                <span className="text-[11px]" style={{ color: STEEL }}>· {t.date}</span>
                {t.isNew && <Tag tone="amber">New</Tag>}
              </div>
            </div>
            <ChevronRight size={16} color={STEEL} />
          </button>
        ))}
      </div>

      {playing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden">
            {playing.videoLink ? (
              <div className="aspect-video">
                <iframe src={playing.videoLink} className="w-full h-full" style={{ border: "none" }} title={playing.title} allowFullScreen />
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center" style={{ background: INK }}>
                <div className="text-center">
                  <Play size={36} color={AMBER} fill={AMBER} className="mx-auto" />
                  <div className="text-white/60 text-[11px] mt-2">Video player</div>
                  <div className="text-white/40 text-[10px] mt-1 px-6">Add a VideoLink in your sheet to play the real video here.</div>
                </div>
              </div>
            )}
            <div className="p-3 flex items-center justify-between">
              <div style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }} className="text-[14px]">{playing.title}</div>
              <button onClick={() => setPlaying(null)}><X size={18} color={STEEL} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Screen: Training ----
const MODULES_DEFAULT = [
  { title: "PPE Basics", q: 3 },
  { title: "Scaffold & Fall Protection", q: 4 },
  { title: "Ladder Safety", q: 3 },
  { title: "Jobsite Traffic Safety", q: 3 },
  { title: "Incident Reporting", q: 2 },
];

// ---- Interactive course: Excavation & Trench Safety ----
const EXCAVATION_COURSE = {
  id: "excavation-trench-safety",
  title: "Excavation & Trench Safety",
  estimatedMinutes: 15,
  steps: [
    { type: "content", title: "The Reality of the Trench", bullets: [
      "373 workers died in U.S. trenching incidents between 2003–2017.",
      "More than 80% of those fatalities occurred in construction.",
      "A cubic yard of soil can weigh over 3,000 lbs — about the weight of a compact car.",
      "Trench collapses can happen suddenly, without warning.",
    ]},
    { type: "content", title: "The #1 Killer: Cave-In", bullets: [
      "A cave-in is the sudden separation of soil from the side of a trench.",
      "Occurs without warning — workers have little or no time to escape.",
      "Can cause crushing injuries and suffocation within seconds.",
      "Even a small amount of soil can be fatal.",
    ]},
    { type: "quiz", question: "About how much can one cubic yard of soil weigh?", options: ["About 300 lbs", "About 3,000 lbs — roughly a compact car", "About 30,000 lbs", "It depends only on moisture, never over 1,000 lbs"], correct: 1,
      explanation: "A cubic yard of soil can weigh over 3,000 lbs — enough to cause fatal crushing injuries in a cave-in." },
    { type: "content", title: "Why Fatalities Keep Happening", bullets: [
      "Entering a trench with no protective system in place.",
      "No competent person inspection before entry.",
      "No safe means of egress.",
      "Working in unstable or wet soil without re-evaluation.",
    ]},
    { type: "content", title: "What Is a Lifesaving Control?", bullets: [
      "Not worker-dependent — works even when people make mistakes.",
      "Remains effective when mistakes occur.",
      "Prevents or mitigates exposure to the hazard.",
      "Example: a trench box protects workers even if a cave-in occurs.",
    ]},
    { type: "content", title: "The Three Tiers of Control", bullets: [
      "Tier 1 – Prevention: shoring, shielding, barriers — physically separates workers from the hazard.",
      "Tier 2 – Mitigation: sloping/benching, rescue equipment — reduces the consequences.",
      "Tier 3 – Supporting: training, permits, signage, PPE — never a substitute for Tier 1 or 2.",
    ]},
    { type: "quiz", question: "Which of these is a Tier 1 (prevention) control?", options: ["A warning sign", "Shoring or shielding", "PPE", "A permit"], correct: 1,
      explanation: "Tier 1 controls physically prevent exposure — shoring and shielding create a real barrier between workers and the hazard. Signs, PPE, and permits are Tier 3 — important, but not lifesaving on their own." },
    { type: "content", title: "Planning: Call 811 Before You Dig", bullets: [
      "Call 811 before any excavation — it's free and required by law in most states.",
      "Wait until all utilities have been identified and marked.",
      "No locates = no digging. Stop work if markings are missing, unclear, or disturbed.",
      "Maintain at least 5 feet of clearance from marked utilities whenever possible.",
    ]},
    { type: "content", title: "The Competent Person", bullets: [
      "OSHA definition: someone who can identify hazards and has authority to take immediate corrective action.",
      "Classifies soil conditions and selects/approves the protective system.",
      "Inspects daily, before each shift, after rainstorms, and after any hazard-producing event.",
      "Has the authority to stop work when hazards can't be controlled.",
    ]},
    { type: "quiz", question: "Who is responsible for classifying soil and inspecting the excavation daily?", options: ["Any available worker", "The Competent Person", "The equipment operator", "The client"], correct: 1,
      explanation: "The Competent Person is specifically responsible for soil classification, daily inspections, and stopping work when hazards can't be controlled." },
    { type: "content", title: "Soil Classification", bullets: [
      "Stable Rock — most stable, can stay intact with vertical sides.",
      "Type A — cohesive, high-strength soil like clay; most stable classification.",
      "Type B — moderate stability; silt, sandy loam, previously disturbed soil.",
      "Type C — sand, gravel, or saturated soil; least stable, highest cave-in risk.",
    ]},
    { type: "content", title: "The 5-Foot Rule", bullets: [
      "Excavations 5 ft deep or greater require cave-in protection (except solid stable rock).",
      "Excavations 20 ft deep or greater require a design from a Registered Professional Engineer.",
      "Protection must be in place before workers enter — every time.",
      "Approved methods: benching, sloping, or mechanical shoring.",
    ]},
    { type: "quiz", question: "At what depth must workers generally be protected from cave-ins?", options: ["2 feet", "5 feet", "10 feet", "Only below 20 feet"], correct: 1,
      explanation: "OSHA's 5-Foot Rule: excavations 5 feet deep or greater require an approved protective system, unless it's entirely stable rock." },
    { type: "content", title: "Slope It, Shore It, Shield It", bullets: [
      "Sloping: cut trench walls back to a safe angle based on soil type.",
      "Shoring: a support system (hydraulic shores, screw jacks, engineered systems) that resists soil movement.",
      "Shielding: a trench box protects workers inside it — it doesn't stop a cave-in, it protects if one happens.",
      "Workers must stay inside the shield at all times while in the trench.",
    ]},
    { type: "content", title: "Access & Egress", bullets: [
      "A ladder, stairway, or ramp must be within 25 feet of every worker in the trench.",
      "Ladders must extend at least 3 feet above the edge of the excavation.",
      "Ladders must be properly secured — job-built or nailed-together ladders are prohibited.",
      "Never climb on shoring systems or trench boxes — they aren't access equipment.",
    ]},
    { type: "quiz", question: "How far above the edge of the trench must a ladder extend?", options: ["It doesn't need to extend above the edge", "At least 1 foot", "At least 3 feet", "At least 10 feet"], correct: 2,
      explanation: "Ladders must extend at least 3 feet above the edge of the excavation so workers have a secure handhold entering and exiting." },
    { type: "content", title: "Hazardous Atmospheres & Water", bullets: [
      "Test the atmosphere before entry; monitor continuously while workers are inside.",
      "Gases heavier than air can collect in deep trenches — often with no visible warning.",
      "Water weakens soil and can destabilize trench walls rapidly.",
      "Re-inspect after any rain event before allowing workers back in.",
    ]},
    { type: "content", title: "Spoils, Falling Loads & Equipment", bullets: [
      "Keep spoil piles and materials at least 2 feet back from the trench edge.",
      "Never work beneath suspended loads.",
      "Use barriers, berms, or stop logs to keep equipment from entering the excavation.",
      "Use a spotter whenever equipment operates in blind zones near the trench.",
    ]},
    { type: "quiz", question: "How far back should spoil piles and materials be kept from the trench edge?", options: ["No specific distance required", "At least 2 feet", "At least 6 inches", "As close as convenient"], correct: 1,
      explanation: "Spoil piles and materials must be kept at least 2 feet back from the edge to reduce surcharge load and prevent material falling back into the trench." },
    { type: "content", title: "Rescue: Don't Become the Next Victim", bullets: [
      "Never enter an unprotected trench to rescue a trapped worker — secondary collapses are common.",
      "Call 911 immediately; give exact location, depth, and what happened.",
      "Keep everyone away from the trench edge — added weight can trigger another collapse.",
      "Follow the Emergency Action Plan and let trained rescue personnel respond.",
    ]},
    { type: "quiz", question: "If a trench collapses and traps a worker, what's the very first thing to do?", options: ["Jump in and start digging them out", "Call 911 and keep everyone away from the edge", "Wait for the supervisor to decide", "Nothing, they will likely climb out"], correct: 1,
      explanation: "Never enter an unprotected trench — secondary collapses kill rescuers too. Call 911 immediately and keep everyone clear of the edge." },
    { type: "content", title: "Report Everything", bullets: [
      "Report every incident, injury, and near-miss — no matter how minor.",
      "A near-miss is a warning without an injury — treat it as a free lesson.",
      "You will never be disciplined for reporting a hazard or stopping work.",
      "Failure to report prevents corrective action and puts others at risk.",
    ]},
    { type: "content", title: "Summary: Six Commitments", bullets: [
      "Plan — utility locates, soil classification, protective system, emergency plan.",
      "Competent — no entry until a competent person inspects and approves.",
      "Protect — never enter an unprotected trench.",
      "Watch — conditions change; stay alert all day.",
      "Exit — safe access/egress within 25 ft, always.",
      "Report — every hazard, incident, and near-miss, immediately.",
    ]},
  ],
};

function CoursePlayer({ course, onClose, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(() => Date.now());

  const step = course.steps[stepIndex];
  const isLast = stepIndex === course.steps.length - 1;
  const pct = Math.round(((stepIndex) / course.steps.length) * 100);

  const handleSelect = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === step.correct) setCorrectCount((c) => c + 1);
  };

  const handleNext = () => {
    if (isLast) {
      const durationMin = Math.max(1, Math.round((Date.now() - startTime) / 60000));
      onComplete({ durationMin, correctCount, totalQuizzes: course.steps.filter((s) => s.type === "quiz").length });
      return;
    }
    setStepIndex((i) => i + 1);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-4">
      <div className="bg-white rounded-md w-full max-w-sm overflow-hidden flex flex-col" style={{ height: "88%" }}>
        <div style={{ background: INK }} className="p-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white text-[12px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{course.title}</div>
            <button onClick={onClose}><X size={18} color="white" /></button>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#333" }}>
            <div className="h-full" style={{ width: `${pct}%`, background: GOLD }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step.type === "content" && (
            <div>
              <div className="text-[15px] mb-3" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{step.title}</div>
              <div className="space-y-2.5">
                {step.bullets.map((b, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: GOLD }} />
                    <span className="text-[13px] leading-snug">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step.type === "quiz" && (
            <div>
              <div className="text-[10px] uppercase font-bold mb-2" style={{ color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>Quick Check</div>
              <div className="text-[15px] mb-3" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{step.question}</div>
              <div className="space-y-2">
                {step.options.map((opt, i) => {
                  const isCorrect = i === step.correct;
                  const isSelected = i === selected;
                  let bg = "#FCFCFA", border = "#E4E2DA", color = INK;
                  if (answered && isCorrect) { bg = "#E9F6EC"; border = "#1E7A34"; }
                  else if (answered && isSelected && !isCorrect) { bg = "#FCEFEF"; border = ALERT; }
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      className="w-full text-left rounded-md px-3 py-2.5 border text-[13px] flex items-center justify-between"
                      style={{ background: bg, borderColor: border, color }}
                    >
                      <span>{opt}</span>
                      {answered && isCorrect && <CheckCircle2 size={16} color="#1E7A34" />}
                      {answered && isSelected && !isCorrect && <X size={16} color={ALERT} />}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <div className="mt-3 text-[12px] rounded-md p-2.5" style={{ background: "#F4F3EF", color: STEEL }}>
                  {step.explanation}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t flex-shrink-0" style={{ borderColor: "#E4E2DA" }}>
          <button
            onClick={handleNext}
            disabled={step.type === "quiz" && !answered}
            className="w-full rounded-md py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
          >
            {isLast ? "Finish Course" : "Continue"} {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrainingScreen({ completed, setCompleted, user, trainingRecords, onCourseComplete }) {
  const { sheetUrls } = useContext(ProjectContext);
  const [modules, loading] = useSheetData(sheetUrls.training, MODULES_DEFAULT, (row) => ({
    title: row.Title || "Untitled",
    q: row.Questions || "—",
  }));
  const [activeCourse, setActiveCourse] = useState(null);
  const pct = Math.round((Object.keys(completed).length / modules.length) * 100);
  const myRecords = (trainingRecords || []).filter((r) => r.badge === user?.badge);
  const courseDone = myRecords.some((r) => r.courseId === EXCAVATION_COURSE.id);

  if (!user || !user.trainingAccess) {
    return (
      <div className="px-4 pt-10 pb-8 flex flex-col items-center text-center" style={{ background: "#F4F3EF", minHeight: "100%" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: INK }}>
          <Lock size={22} color={GOLD} />
        </div>
        <div className="text-[15px] mb-1" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Training Access Restricted</div>
        <div className="text-[12px] max-w-[260px]" style={{ color: STEEL }}>
          Training isn't enabled for your account. If you believe you should have access, check with your supervisor.
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Interactive Course</div>
      <button
        onClick={() => setActiveCourse(EXCAVATION_COURSE)}
        className="w-full text-left bg-white rounded-md p-3 border flex items-center gap-3 mb-5"
        style={{ borderColor: "#E4E2DA" }}
      >
        <div className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: INK }}>
          <Play size={18} color={GOLD} fill={GOLD} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{EXCAVATION_COURSE.title}</div>
          <div className="text-[11px]" style={{ color: STEEL }}>~{EXCAVATION_COURSE.estimatedMinutes} min · {EXCAVATION_COURSE.steps.filter(s => s.type === "quiz").length} quick checks</div>
        </div>
        {courseDone ? <CheckCircle2 size={20} color={GOLD} className="flex-shrink-0" /> : <ChevronRight size={18} color={STEEL} className="flex-shrink-0" />}
      </button>

      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Quick Modules</div>
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      <div className="bg-white rounded-md p-3 mb-4 border" style={{ borderColor: "#E4E2DA" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-bold" style={{ fontFamily: "Oswald, sans-serif" }}>Overall progress</span>
          <span className="text-[12px]" style={{ color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E4E2DA" }}>
          <div className="h-full" style={{ width: `${pct}%`, background: GOLD }} />
        </div>
      </div>
      <div className="space-y-2 mb-5">
        {modules.map((m, i) => {
          const done = completed[i];
          return (
            <div key={i} className="bg-white rounded-md p-3 flex items-center justify-between border" style={{ borderColor: "#E4E2DA" }}>
              <div className="flex items-center gap-3">
                {done ? <CheckCircle2 size={20} color={GOLD} /> : <Circle size={20} color={STEEL} />}
                <div>
                  <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{m.title}</div>
                  <div className="text-[11px]" style={{ color: STEEL }}>{m.q}-question check</div>
                </div>
              </div>
              <button
                onClick={() => setCompleted((c) => ({ ...c, [i]: !c[i] }))}
                className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-sm"
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  background: done ? "#E4E2DA" : GOLD,
                  color: done ? STEEL : "white",
                }}
              >
                {done ? "Redo" : "Start"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Your Training History — Badge {user.badge}</div>
      <div className="space-y-2">
        {myRecords.length === 0 && (
          <div className="text-[12px] text-center py-4" style={{ color: STEEL }}>No completed courses yet.</div>
        )}
        {myRecords.map((r, i) => (
          <div key={i} className="bg-white rounded-md p-3 border" style={{ borderColor: "#E4E2DA" }}>
            <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{r.courseTitle}</div>
            <div className="text-[11px] mt-1" style={{ color: STEEL }}>{r.date} · {r.time} · {r.durationMin} min{r.score ? ` · Score: ${r.score}` : ""}</div>
          </div>
        ))}
      </div>

      {activeCourse && (
        <CoursePlayer
          course={activeCourse}
          onClose={() => setActiveCourse(null)}
          onComplete={({ durationMin, correctCount, totalQuizzes }) => {
            onCourseComplete({
              badge: user.badge, empId: user.empId, name: user.name,
              courseId: activeCourse.id, courseTitle: activeCourse.title,
              durationMin, score: `${correctCount}/${totalQuizzes}`,
            });
            setActiveCourse(null);
          }}
        />
      )}
    </div>
  );
}

// ---- Screen: Forms ----
// Field/checklist model:
//   fields: simple text inputs
//   statusGroups: { label, options: [...], items: [...] } — each item gets one of `options` (e.g. Y / N/A)
//   choiceGroups: { label, items: [...] } — pick exactly one item from the list
// External forms that live outside the app (e.g. GoFormz syncing to Procore)
const EXTERNAL_FORMS_DEFAULT = [
  { title: "Lifesaving Control Assessment", url: "http://app.goformz.com/us/s/N7fQagfNLkdSuD9D09R" },
  { title: "Cority - Safety Observation", url: "http://ferrovial.my.cority.com/#/record/safetyincidentselfreport?eventReportTypeld=-5" },
];

const FORMS_DEFAULT = [
  {
    title: "Job Hazard Analysis",
    pdfLink: "https://drive.google.com/file/d/1mnudZbn3_LlA95Brg-Fktb0pTP4bzsaP/preview",
    fields: [
      "Task",
      "Certified FA/CPR Person Name",
      "Certified Flagger Name",
      "Machinery to be Used",
      "Tools to be Used",
      "Special PPE Required",
      "Crew Members Involved (list names)",
    ],
    stepPlan: {
      minSteps: 7,
      fieldLabels: ["Step to Complete Work", "Hazards of This Step", "Actions Taken to Prevent Hazards", "Lifesaving Control"],
    },
    statusGroups: [
      {
        label: "Requirements in Place",
        options: ["Yes", "N/A"],
        items: ["Shade for employees", "Drinking water", "Paper cups", "Trash containers", "Restrooms", "Fire extinguishers", "GFCIs", "Work area protection", "First aid kit", "Crane Critical Lift Plan"],
      },
      {
        label: "Daily Inspections Completed",
        options: ["Yes", "N/A"],
        items: ["All Machinery", "Tools and equipment", "Excavations", "Scaffolds"],
      },
      {
        label: "Permits",
        options: ["Yes", "N/A"],
        items: ["Utility Locate Permit", "Close Proximity (Power Line)", "Confined Space", "Hot Work"],
      },
    ],
  },
  {
    title: "Daily Equipment Inspection",
    pdfLink: "https://drive.google.com/file/d/1CI_aP42nIKyPgRGoMmPlwsBwc7fbOapy/preview",
    fields: ["Operator", "Equipment Type", "Project Location"],
    statusGroups: [
      {
        label: "Equipment Condition",
        options: ["OK", "Bad", "N/A"],
        items: [
          "Tracks, Tires", "Brakes", "Horn", "Lights", "Windshield Wiper", "Glass", "Rear View Visibility",
          "Body", "Covers", "Roll Over Protection", "Dump Mechanism", "Steering – Control", "Fire Extinguisher",
          "Signal System", "Fuel & Gas Lines", "Fuel Tank", "Exhaust System", "Backup Alarm", "Seatbelt",
          "Grab Bars, Steps", "Warning Lights", "Motor / Wiring", "Radiator", "Belts", "Hoses", "Overhead Rotating Beacon",
        ],
      },
    ],
  },
  {
    title: "Utility Locate Permit",
    pdfLink: "https://drive.google.com/file/d/1e-gtaeZ4mZge8_-Tqkkl6tpgQyFOqhR-/preview",
    fields: [
      "Purpose of Excavation / Drilling / Boring",
      "Location of Excavation / Drilling / Boring",
      "Depth", "Width / Diameter", "Length",
      "Utility Locate Reference #",
      "Date Located",
      "Have Locates Been Documented With Video/Photos?",
      "Ticket Refresh Date 1", "Ticket Number 1",
      "Ticket Refresh Date 2", "Ticket Number 2",
    ],
    choiceGroups: [
      { label: "Safe Guarding Used", items: ["Safety Fence", "Handrails", "Cover", "N/A"] },
    ],
    statusGroups: [
      {
        label: "Locate Flags / Paint Marks Visible",
        options: ["Yes", "N/A"],
        items: ["Electric", "Gas", "Communications", "Water", "Sewer", "Pipeline", "NTI", "NTEMP", "Telephone (TX-DOT)", "Storm Water / Slurry"],
      },
    ],
  },
  {
    title: "Daily Excavation Checklist",
    pdfLink: "https://drive.google.com/file/d/10Ew0hQruE-Zg6F0T1FKuBhq2lYJTq3mK/preview",
    fields: ["Site Location", "Soil Type", "Excavation Depth", "Excavation Width", "Type of Protective System Used"],
    statusGroups: [
      {
        label: "General Information",
        options: ["Yes", "No", "N/A"],
        items: ["Excavation less than 5 ft deep?", "Potential for cave-in?", "Excavation deeper than 5 ft?", "Sloping used as protective system?"],
      },
      {
        label: "Inspection of Job-site",
        options: ["Yes", "No", "N/A"],
        items: [
          "Inspected daily by Competent Person before work start", "Competent Person can remove employees immediately",
          "Surface encumbrances removed/supported", "Employees protected from loose rock/soil",
          "Hard hats and safety glasses worn by all", "Spoils/materials/equipment set back 2+ ft from edge",
          "Adequate barriers at excavations/wells/pits/shafts", "Class III traffic vests worn by all",
          "Employees stand away from vehicles being loaded/unloaded", "Warning system for mobile equipment near edge",
          "Employees prohibited from going under suspended loads",
        ],
      },
      {
        label: "Utilities",
        options: ["Yes", "No", "N/A"],
        items: ["Location of utilities marked", "Utilities located by hand digging / non-destructive means before equipment use", "Utilities protected/supported/removed when excavation open"],
      },
      {
        label: "Means of Access and Egress",
        options: ["Yes", "No", "N/A"],
        items: ["Travel distance to egress ≤ 25 ft (4+ ft deep)", "Ladders extend 3+ ft above trench edge", "Ramps designed by Competent Person", "Employees protected from cave-ins entering/exiting"],
      },
      {
        label: "Wet Conditions",
        options: ["Yes", "No", "N/A"],
        items: ["Precautions taken for water accumulation", "Water removal equipment monitored by Competent Person", "Surface water/runoff diverted or controlled", "Inspections after rainstorm/hazard-increasing event"],
      },
      {
        label: "Hazardous Atmosphere",
        options: ["Yes", "No", "N/A"],
        items: ["Exposed sewer or gas lines in excavation?", "Near landfill or hazardous substances stored close by?", "Employees will contact Fire/Rescue (911) in emergencies"],
      },
      {
        label: "Support Systems",
        options: ["Yes", "No", "N/A"],
        items: [
          "Materials/equipment selected based on soil analysis, depth, loads", "Materials/equipment inspected and in good condition",
          "Non-conforming materials removed from service", "Systems installed without exposing employees to hazards",
          "Members securely fastened to prevent failure", "Systems ensure stability of adjacent structures",
          "Excavations below footing base approved by Registered PE", "Removal progresses bottom-up, slowly",
          "Backfilling progresses with support removal", "Excavation ≤ 2 ft below support system bottom (if designed for full depth)",
          "Shield system placed to prevent lateral movement", "Employees prohibited in shield during vertical movement",
        ],
      },
      {
        label: "Training",
        options: ["Yes", "No", "N/A"],
        items: ["All employees have had Excavation Safety Awareness Training"],
      },
    ],
  },
  {
    title: "Confined Space Evaluation",
    pdfLink: "https://drive.google.com/file/d/1H8GcJm2gB5XVwj8w5fVUf49pMelzANTH/preview",
    fields: ["Segment #", "Competent Person(s)", "Purpose of Entry", "Location / Description of Work Area", "Comments"],
    statusGroups: [
      {
        label: "Safety Checklist",
        options: ["Yes", "N/A"],
        items: [
          "Acceptable entry conditions defined?", "Plan to monitor and test work area?",
          "Plan to isolate release of energy/material into work area?", "Plan to eliminate/control atmospheric hazards?",
          "Plan to protect workers from external hazards?", "Plan to verify conditions acceptable for entire duration?",
        ],
      },
      {
        label: "Equipment",
        options: ["Yes", "N/A"],
        items: ["Testing & Monitoring", "Ventilation", "Communications", "Lighting", "Ingress/Egress", "Rescue", "Personal Protection", "Barriers/Shields"],
      },
    ],
  },
  {
    title: "Hot Work Permit",
    pdfLink: "https://drive.google.com/file/d/1e1NrKBbnoCIgGS-QQJCPq8GdzKAUoMTT/preview",
    fields: [
      "Contractor Performing Work", "Contact Name", "Contact Tel",
      "Location of Work", "Description of Work", "Equipment to be Used",
      "Permit Begins (Date/Time)", "Permit Expires (Date/Time)",
      "Special Conditions (if any)",
    ],
    statusGroups: [
      {
        label: "Authorization Checklist",
        options: ["Confirmed", "N/A"],
        items: [
          "Welding/cutting equipment assembled & maintained per OSHA/manufacturer",
          "Appropriate PPE worn at all times", "Fire extinguisher & mandatory fire watcher present",
          "Barricades, warning signs & spark/flash screens provided", "Work area clear of flammable liquids, gases, vapors",
          "Combustibles within 10 ft removed or protected", "Compressed gas cylinders upright and secured",
          "Hot work area patrolled from start until after completion",
        ],
      },
    ],
  },
  {
    title: "Monthly Fire Protection Verification",
    pdfLink: "https://drive.google.com/file/d/1CQ4YRSO8K2gDsv4iE2CxH4j_hA71YzCj/preview",
    fields: ["Competent Person", "Period Covered"],
  },
  {
    title: "Power Line Close Proximity Permit",
    pdfLink: "https://drive.google.com/file/d/1ENH06dITuGyG81Dtr6tAx-6GlnB-JQvy/preview",
    fields: [
      "Requested By", "Competent Person", "Segment", "Start Time", "End Time",
      "Purpose of Activity", "Location of Activity", "Supervisor Completing the Form",
      "Height of Power Line (ft)", "Voltage (kV)", "Owner of Utility & Point of Contact", "Equipment to Be Used",
    ],
    referenceTable: {
      title: "Table A — Minimum Clearance Distance (Reference)",
      columns: ["Voltage (Nominal, kV)", "Minimum Clearance"],
      rows: [
        ["Up to 50", "10 ft"],
        ["Over 50 to 200", "15 ft"],
        ["Over 200 to 350", "20 ft"],
        ["Over 350 to 500", "25 ft"],
        ["Over 500 to 750", "35 ft"],
        ["Over 750 to 1000", "45 ft"],
      ],
    },
    choiceGroups: [
      { label: "Safety Option Chosen", items: ["De-energize and Ground", "Maintain 20' Clearance", "Table A Clearance"] },
      { label: "Method of Protection", items: ["Dedicated Spotter", "Proximity Alarm", "Encroachment Warning Device", "Encroachment Limiting Device", "Insulating Link/Device"] },
    ],
  },
  {
    title: "Crane Inspection Checklist",
    pdfLink: "https://drive.google.com/file/d/1cpgAGp3bzP_OJmITgkKAvYGFrzp0qLqE/preview",
    fields: ["Unit No.", "Make", "Model", "Serial No.", "Hours"],
    statusGroups: [
      {
        label: "Overall",
        options: ["S", "U", "N/A"],
        items: [
          "Monthly critical items inspection", "Operational test of all functions", "Annual inspection current record",
          "Deficiencies repaired to date?", "Operator's Manual proper, in cab & legible",
        ],
      },
      {
        label: "Safety Devices",
        options: ["S", "U", "N/A"],
        items: [
          "Load Chart for specific configuration", "Load Indicator", "Boom angle & radius reading correctly",
          "Anti-two block", "Line riders in place for lift crane service", "Signal horn", "Swing warning devices",
        ],
      },
      {
        label: "General Crane Items",
        options: ["S", "U", "N/A"],
        items: [
          "Known weight & capacity of blocks & balls", "Swing radius protection", "Guards & covers in place",
          "Warning decals in place", "Fire extinguisher w/ current annual tag", "Seat & seat belts/restraints",
          "Mirrors", "Glass/windows & wipers", "Lights (work, signal, marker)", "Instruments, gauges, & fault indicators",
          "Controls properly identified legibly", "Steps & hand tools", "All daily grease points",
          "Fluid levels, condition and type", "Engine air clean", "Belts & hoses", "Fuel system sediment",
          "Cooling systems (engine & hydraulic)", "Air system pressure & leaks", "Steering",
          "Brake pedal(s) operation & latching", "Parking brake", "Swing brake operation, adjustment & condition",
          "Positive swing/house lock", "Turntable bearing, ring & pinion gears", "Load hoists", "Drum rotation indicators",
          "Wire rope spooling properly", "Wire rope condition, daily — lubricate weekly", "Wire rope end terminations",
          "Pins, keepers and retainers", "Boom & jib condition", "Boom head machinery, sheaves & guards",
          "Boom slider pads in place & lubricated", "Structural cracks or damage", "Outrigger pads & latches",
          "Positive locks for mid-point outriggers", "Rear axle oscillation system for pick-and-carry",
          "Physical damage to machine",
        ],
      },
      {
        label: "Crawler Crane / Additional Items",
        options: ["S", "U", "N/A"],
        items: [
          "Boom hoist brake", "Boom hoist pawl operation", "Boom hoist worm gear inspection",
          "Load hoist clutches & pedal stroke", "Load hoist clutches — weekly adjustment",
          "Load hoist brakes & pedal stroke", "Load hoist brakes — weekly adjustment",
          "Crawler tracks — check adjustments & cracks", "Drive chains, sprockets & shafts",
          "Boom and/or jib lattice or chord damage", "High boom angle kick-out", "Boom stops",
          "Main engine clutch/disconnect", "Travel dawgs", "Boom hoist reeving & sheaves",
          "Auto lube system working & full", "Freefall operation & indicator lights", "Travel alarm",
          "Travel brakes", "Hook & load rollers", "Drain water from deck sump", "Air system — drain water",
          "Leaks — cylinders, hoses, & connections",
        ],
      },
    ],
  },
];

// Orientation-specific forms — viewable, fillable, and downloadable from
// the Orientation tab (not Forms & Templates), since they're only
// relevant at the time someone goes through orientation.
const ORIENTATION_FORMS_DEFAULT = [
  {
    title: "Competent Person Designation",
    description: "This form designates an employee as a Competent Person for specific project safety activities. For this project, the designated employee must have OSHA 10 or OSHA 30 training. The subcontractor must identify the applicable areas, submit supporting training certifications, and obtain signatures from both the employee and an authorized representative. The form must be submitted before or during orientation and updated if the designation changes.",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1diZi1qh_onXtXdqn_U8FDMP4qaUxHz-R/preview",
    fields: [
      "Employee Name",
      "Copies of Training Documents Attached? (Yes/No — required, or bring in person at orientation)",
    ],
    choiceGroups: [
      { label: "Competent Person Fulfilled By", items: ["Training (Certification)", "Experience (Resume)", "Qualification (Diploma)"] },
    ],
    statusGroups: [
      {
        label: "Competent Person In The Following Areas",
        options: ["Yes", "N/A"],
        items: [
          "Excavation", "Confined Space", "Ladder Inspection", "Traffic Control (Cert.)", "Scaffolds",
          "Rigging Inspection (Cert.)", "Respiratory Protection", "Asbestos Abatement (Cert.)", "Fall Protection (Cert.)",
          "Fire Extinguisher", "Flagging Work Zones (Cert.)", "Silica (Cert.)", "Aerial Lift (Cert.)", "Assured Grounding",
        ],
      },
    ],
  },
  {
    title: "Equipment Operator Designation",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1MIvnaeGXGE2XiLR17GIWfnO-uqO1TBo1/preview",
    fields: ["Employee Name", "Other Equipment (if applicable)"],
    statusGroups: [
      {
        label: "Qualified / Certified to Operate",
        options: ["Yes", "N/A"],
        items: [
          "Aerial Man Lift", "Trackhoe", "Backhoe", "Forklift", "Skidsteer", "Excavator", "Boom Lift", "Mini Excavator",
          "Skytrac", "Off Road Truck", "Water Truck", "Dozer", "Compactor", "Front End Loader", "Trencher",
          "Sheep Foot Roller", "Motor Grader", "Scraper", "Scissor Lift", "Dump Truck", "Bore Machine", "Rock Hauler",
          "Milling Machine", "Broom / Sweeper", "Shuttle Buggy", "Asphalt Paver", "Power Broom", "Lime Mixer",
          "TMA", "Boat", "Crane", "Drill Rig",
        ],
      },
    ],
  },
  {
    title: "Drug Screen Affidavit",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1lbc7gPzre4g7e7bqbJk6k9f9xw9jgYEK/preview",
    fields: [
      "Project",
      "Employee Names Passing Drug Screen (one per line)",
      "Contact Name",
      "Contact Phone",
    ],
  },
  {
    title: "Flagger Designation",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1ivEZHTQbnChCIo_ITjDaqcpcUgsv6DBO/preview",
    fields: ["Employee Name"],
    choiceGroups: [
      { label: "Certification Method", items: ["TX DOT-Approved Organization", "Certified Flagging Instructor (Contractor)"] },
    ],
  },
  {
    title: "Crane Operator Designation",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1urrolz6w8UWU5qh_1KN9L9RBq3MjtUZH/preview",
    fields: ["Employee Name", "Name of Accredited Crane Operator Testing Organization (if applicable)"],
    choiceGroups: [
      { label: "Certification Option", items: ["Option 1: Certified by Accredited Testing Organization (1926.1427(b))", "Interim Option: Phase-in (1926.1427(k))"] },
    ],
  },
  {
    title: "Assembly/Disassembly (A/D) Director Designation",
    submitEmail: "ntisafety@ferrovial.us",
    pdfLink: "https://drive.google.com/file/d/1obdxjmg3RmeTYqQnpvVpenY8PRvfYIpi/preview",
    fields: ["Employee Name"],
  },
];

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const empty = useRef(true);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = INK;
    ctx.lineTo(x, y);
    ctx.stroke();
    empty.current = false;
    onChange(false);
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    empty.current = true;
    onChange(true);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={310}
        height={130}
        className="w-full rounded-md border touch-none"
        style={{ borderColor: "#C9C6BC", background: "#FCFCFA" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button onClick={clear} className="mt-1.5 flex items-center gap-1 text-[11px]" style={{ color: STEEL }}>
        <Eraser size={13} /> Clear signature
      </button>
    </div>
  );
}

function StatusGroup({ group, values, onChange }) {
  return (
    <div>
      <div className="text-[11px] uppercase font-bold mb-1.5" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{group.label}</div>
      <div className="space-y-1.5">
        {group.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 bg-[#FCFCFA] rounded-sm px-2 py-1.5 border" style={{ borderColor: "#E4E2DA" }}>
            <span className="text-[12px] flex-1">{item}</span>
            <div className="flex gap-1 flex-shrink-0">
              {group.options.map((opt) => {
                const active = values[i] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onChange(i, opt)}
                    className="text-[10px] uppercase font-bold px-2 py-1 rounded-sm"
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      background: active ? (opt === "Bad" ? ALERT : GOLD) : "#E4E2DA",
                      color: active ? (opt === "Bad" ? "white" : INK) : STEEL,
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceGroup({ group, value, onChange }) {
  return (
    <div>
      <div className="text-[11px] uppercase font-bold mb-1.5" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{group.label}</div>
      <div className="space-y-1.5">
        {group.items.map((item, i) => {
          const active = value === i;
          return (
            <button
              key={i}
              onClick={() => onChange(i)}
              className="w-full text-left flex items-center gap-2 rounded-sm px-2 py-1.5 border"
              style={{ borderColor: active ? GOLD : "#E4E2DA", background: active ? "#FFF8E1" : "#FCFCFA" }}
            >
              {active ? <CheckCircle2 size={15} color={GOLD} /> : <Circle size={15} color={STEEL} />}
              <span className="text-[12px]">{item}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const SUBCONTRACTOR_OPTIONS = ["Road Maker", "MW Panel Tech", "NTI", "FGA", "Paniolo", "MCD Construction"];

function FillFormModal({ form, onClose, user }) {
  const todayStr = new Date().toLocaleDateString();
  const [standardValues, setStandardValues] = useState({
    name: user?.name || "",
    subcontractor: SUBCONTRACTOR_OPTIONS.includes(user?.employer) ? user.employer : "",
    segment: "",
    date: todayStr,
  });
  const [values, setValues] = useState({});
  const [statusValues, setStatusValues] = useState({});
  const [choiceValues, setChoiceValues] = useState({});
  const [sigEmpty, setSigEmpty] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [stepCount, setStepCount] = useState(form.stepPlan ? form.stepPlan.minSteps : 0);
  const [stepValues, setStepValues] = useState({});

  const setStd = (key, val) => setStandardValues((v) => ({ ...v, [key]: val }));
  const setStepField = (stepIdx, fieldIdx, val) => {
    setStepValues((v) => ({ ...v, [stepIdx]: { ...(v[stepIdx] || {}), [fieldIdx]: val } }));
  };
  const setStatus = (groupIdx, itemIdx, opt) => {
    setStatusValues((v) => ({ ...v, [groupIdx]: { ...(v[groupIdx] || {}), [itemIdx]: opt } }));
  };
  const setChoice = (groupIdx, itemIdx) => {
    setChoiceValues((v) => ({ ...v, [groupIdx]: itemIdx }));
  };

  const buildFieldsText = () => {
    const lines = [
      `Name: ${standardValues.name}`,
      `Subcontractor: ${standardValues.subcontractor}`,
      `Segment: ${standardValues.segment}`,
      `Date: ${standardValues.date}`,
      "",
    ];
    (form.fields || []).forEach((f, i) => lines.push(`${f}: ${values[i] || ""}`));
    (form.statusGroups || []).forEach((group, gi) => {
      lines.push("", group.label + ":");
      group.items.forEach((item, ii) => lines.push(`  ${item}: ${(statusValues[gi] || {})[ii] || "—"}`));
    });
    (form.choiceGroups || []).forEach((group, gi) => {
      const chosenIdx = choiceValues[gi];
      lines.push("", `${group.label}: ${chosenIdx != null ? group.items[chosenIdx] : "—"}`);
    });
    if (form.stepPlan) {
      lines.push("", "Task Steps:");
      Array.from({ length: stepCount }).forEach((_, si) => {
        lines.push(`  Step ${si + 1}:`);
        form.stepPlan.fieldLabels.forEach((label, fi) => {
          lines.push(`    ${label}: ${(stepValues[si] || {})[fi] || ""}`);
        });
      });
    }
    return lines.join("\n");
  };

  const doSubmit = async () => {
    setSubmitting(true);
    const fieldsText = buildFieldsText();

    if (form.submitEmail) {
      const result = await sendFormEmail({
        toEmail: form.submitEmail,
        formTitle: form.title,
        fieldsText,
        submittedBy: standardValues.name || "Unknown",
        projectName: user?.employer || "",
      });
      setEmailStatus(result);
    }

    if (user && user.sessionToken) {
      try {
        await supabase.rpc("submit_form", {
          p_token: user.sessionToken,
          p_form_title: form.title,
          p_data: { ...standardValues, fields: values, statusValues, choiceValues, stepValues },
          p_signature: null,
        });
      } catch (e) {
        // best-effort — submission still counts as successful to the user
      }
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
        <div className="bg-white rounded-md w-full max-w-sm p-6 text-center">
          <CheckCircle2 size={40} color={GOLD} className="mx-auto" />
          <div className="mt-3 text-[16px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Submitted</div>
          <div className="text-[12px] mt-1" style={{ color: STEEL }}>
            {form.submitEmail
              ? emailStatus && emailStatus.sent
                ? `Emailed to ${form.submitEmail}.`
                : `Saved. Email delivery to ${form.submitEmail} isn't fully set up yet — this submission is stored, but wasn't emailed.`
              : "Saved to the system."}
          </div>
          <button onClick={onClose} className="mt-4 text-[12px] font-bold uppercase px-4 py-2 rounded-sm" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
      <div
        className="bg-white rounded-md w-full max-w-sm flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between p-3 border-b flex-shrink-0" style={{ borderColor: "#E4E2DA" }}>
          <div className="text-[14px] pr-2" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{form.title}</div>
          <button onClick={onClose} className="flex-shrink-0"><X size={18} color={STEEL} /></button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Name</label>
              <input
                value={standardValues.name}
                onChange={(e) => setStd("name", e.target.value)}
                className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "#C9C6BC" }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Subcontractor</label>
              <select
                value={standardValues.subcontractor}
                onChange={(e) => setStd("subcontractor", e.target.value)}
                className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px] bg-white"
                style={{ borderColor: "#C9C6BC" }}
              >
                <option value="">Select…</option>
                {SUBCONTRACTOR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Segment</label>
              <input
                value={standardValues.segment}
                onChange={(e) => setStd("segment", e.target.value)}
                className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "#C9C6BC" }}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Date</label>
              <input
                value={standardValues.date}
                onChange={(e) => setStd("date", e.target.value)}
                className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "#C9C6BC" }}
              />
            </div>
          </div>

          {(form.fields || []).map((f, i) => (
            <div key={i}>
              <label className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{f}</label>
              <textarea
                rows={f.length > 30 ? 2 : 1}
                value={values[i] || ""}
                onChange={(e) => setValues((v) => ({ ...v, [i]: e.target.value }))}
                className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
                style={{ borderColor: "#C9C6BC" }}
              />
            </div>
          ))}

          {form.stepPlan && (
            <div>
              <div className="text-[11px] uppercase font-bold mb-2" style={{ color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>
                Task Steps — Hazards &amp; Lifesaving Controls
              </div>
              <div className="space-y-3">
                {Array.from({ length: stepCount }).map((_, stepIdx) => (
                  <div key={stepIdx} className="rounded-md p-3 border" style={{ borderColor: "#E4E2DA", background: "#FCFCFA" }}>
                    <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                      Step {stepIdx + 1}
                    </div>
                    <div className="space-y-2">
                      {form.stepPlan.fieldLabels.map((label, fieldIdx) => (
                        <div key={fieldIdx}>
                          <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{label}</label>
                          <textarea
                            rows={2}
                            value={(stepValues[stepIdx] || {})[fieldIdx] || ""}
                            onChange={(e) => setStepField(stepIdx, fieldIdx, e.target.value)}
                            className="w-full mt-1 rounded-md border px-2.5 py-1.5 text-[13px]"
                            style={{ borderColor: "#C9C6BC" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStepCount((c) => c + 1)}
                className="w-full mt-2 text-[11px] font-bold uppercase px-3 py-2 rounded-sm border"
                style={{ borderColor: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
              >
                + Add Another Step
              </button>
            </div>
          )}

          {(form.statusGroups || []).map((group, gi) => (
            <StatusGroup key={gi} group={group} values={statusValues[gi] || {}} onChange={(itemIdx, opt) => setStatus(gi, itemIdx, opt)} />
          ))}

          {form.referenceTable && (
            <div>
              <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{form.referenceTable.title}</div>
              <div className="overflow-x-auto rounded-md border" style={{ borderColor: "#E4E2DA" }}>
                <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {form.referenceTable.columns.map((c, i) => (
                        <th key={i} className="text-left p-2" style={{ background: INK, color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.referenceTable.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 === 0 ? "white" : "#FCFCFA" }}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-2 border-t" style={{ borderColor: "#E4E2DA" }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(form.choiceGroups || []).map((group, gi) => (
            <ChoiceGroup key={gi} group={group} value={choiceValues[gi]} onChange={(itemIdx) => setChoice(gi, itemIdx)} />
          ))}

          <div>
            <label className="text-[11px] uppercase font-bold flex items-center gap-1" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
              <PenLine size={12} /> Signature
            </label>
            <div className="mt-1">
              <SignaturePad onChange={setSigEmpty} />
            </div>
          </div>
          <button
            disabled={sigEmpty || submitting}
            onClick={doSubmit}
            className="w-full mt-2 rounded-md py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
          >
            <Send size={15} /> {submitting ? "Submitting…" : "Submit & Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormsScreen({ user }) {
  const { sheetUrls } = useContext(ProjectContext);
  const [openForm, setOpenForm] = useState(null);
  const [viewingPdf, setViewingPdf] = useState(null);
  const [downloaded, setDownloaded] = useState({});
  const [forms, loading] = useSheetData(sheetUrls.forms, FORMS_DEFAULT, (row) => ({
    title: row.Title || "Untitled",
    fields: (row.Fields || "").split("|").map((s) => s.trim()).filter(Boolean),
    pdfLink: row.PdfLink || "",
  }));
  const [externalForms] = useSheetData(sheetUrls.externalForms, EXTERNAL_FORMS_DEFAULT, (row) => ({
    title: row.Title || "Untitled",
    url: row.Url || "",
  }));

  const handleDownload = (f, i) => {
    setDownloaded((d) => ({ ...d, [i]: true }));
    if (f.pdfLink) window.open(f.pdfLink, "_blank");
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Fill out, sign with your finger, and submit — it's emailed automatically. Or view, print, or download a blank copy.
      </div>

      {externalForms.length > 0 && (
        <div className="space-y-2 mb-4">
          {externalForms.map((f, i) => (
            <button
              key={i}
              onClick={() => window.open(f.url, "_blank")}
              className="w-full text-left rounded-md p-3 flex items-center justify-between"
              style={{ background: INK }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink size={17} color={GOLD} className="flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] text-white leading-tight" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{f.title}</div>
                  <div className="text-[10px] uppercase font-bold mt-0.5" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace" }}>External Link</div>
                </div>
              </div>
              <ChevronRight size={16} color={AMBER} className="flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      <div className="space-y-2">
        {forms.map((f, i) => (
          <div key={i} className="bg-white rounded-md p-3 border" style={{ borderColor: "#E4E2DA" }}>
            <button className="flex items-center gap-2 w-full text-left min-w-0 mb-2" onClick={() => setOpenForm(f)}>
              <FileText size={18} color={GOLD} className="flex-shrink-0" />
              <div className="text-[13px] leading-tight" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{f.title}</div>
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setOpenForm(f)} className="flex-1 text-center text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm whitespace-nowrap" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
                Fill Out
              </button>
              <button onClick={() => setViewingPdf(f)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                <Eye size={13} /> View
              </button>
              <button onClick={() => handleDownload(f, i)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                {downloaded[i] ? <CheckCircle2 size={13} color={GOLD} /> : <Download size={13} />} {downloaded[i] ? "Saved" : "Download"}
              </button>
            </div>
          </div>
        ))}
        {forms.length === 0 && !loading && (
          <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No forms posted for this project yet.</div>
        )}
      </div>
      {openForm && <FillFormModal form={openForm} onClose={() => setOpenForm(null)} user={user} />}
      {viewingPdf && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden max-h-[85%] flex flex-col" style={{ height: "80%" }}>
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#E4E2DA" }}>
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{viewingPdf.title}</div>
              <button onClick={() => setViewingPdf(null)}><X size={18} color={STEEL} /></button>
            </div>
            {viewingPdf.pdfLink ? (
              <iframe src={viewingPdf.pdfLink} className="flex-1 w-full" style={{ border: "none" }} title={viewingPdf.title} />
            ) : (
              <div className="flex-1 overflow-y-auto flex items-center justify-center py-12" style={{ background: "#FCFCFA" }}>
                <div className="text-center px-6">
                  <Eye size={28} color={STEEL} className="mx-auto" />
                  <div className="text-[11px] mt-2" style={{ color: STEEL }}>Blank PDF viewer / print</div>
                  <div className="text-[10px] mt-1" style={{ color: STEEL }}>Add a PdfLink in your sheet to show the real form here.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Screen: Personnel ----
function parseQuals(str) {
  if (!str) return [];
  return str.split(";").map((part) => {
    const [label, status] = part.split(":").map((s) => s.trim());
    return { label: label || part.trim(), status: (status || "current").toLowerCase() };
  }).filter((q) => q.label);
}

const PHOTO_ALLEN_GARCIA = "data:image/jpeg;base64,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";

const EMPLOYEES_DEFAULT = [
  {
    name: "Allen Garcia", empId: "FCSV0001", badge: "FCSV0001",
    role: "", employer: "", orientationDate: "Aug 31, 2026", trainingAccess: false, multiSiteAccess: true, photoUrl: PHOTO_ALLEN_GARCIA,
    quals: [
      { label: "Competent Person – Fall Protection", status: "current" },
      { label: "Competent Person – Excavation", status: "current" },
      { label: "Driving Awareness", status: "current" },
    ],
  },
  {
    name: "Dylan Herd", empId: "FCSV0002", badge: "FCSV0002",
    role: "", employer: "", orientationDate: "Aug 31, 2026", trainingAccess: false, multiSiteAccess: false, photoUrl: "",
    quals: [
      { label: "Driving Awareness", status: "current" },
    ],
  },
  {
    name: "Jim Quinn", empId: "FCSV0003", badge: "FCSV0003",
    role: "", employer: "", orientationDate: "Aug 31, 2026", trainingAccess: false, multiSiteAccess: false, photoUrl: "",
    quals: [
      { label: "Competent Person – Fall Protection", status: "current" },
      { label: "Competent Person – Excavation", status: "current" },
      { label: "Driving Awareness", status: "current" },
    ],
  },
  {
    name: "Marjorie Maldonado", empId: "FCSV0004", badge: "FCSV0004",
    role: "", employer: "", orientationDate: "Aug 31, 2026", trainingAccess: false, multiSiteAccess: false, photoUrl: "",
    quals: [
      { label: "Driving Awareness", status: "current" },
    ],
  },
  {
    name: "Paul Vares", empId: "FCSV0005", badge: "FCSV0005",
    role: "", employer: "", orientationDate: "Aug 31, 2026", trainingAccess: false, multiSiteAccess: false, photoUrl: "",
    quals: [
      { label: "Competent Person – Fall Protection", status: "current" },
      { label: "Competent Person – Excavation", status: "current" },
      { label: "Driving Awareness", status: "current" },
    ],
  },
];

// ============================================================
// PROJECTS
// Each project gets its own Google Sheets (badges, forms, work plans,
// and the Safety Plan/Manual do NOT duplicate across projects — every
// other section, e.g. Toolbox Talks, Bulletin, Emergency Contacts,
// Orientation, is the same replicated structure per project until you
// connect that project's own sheet for it too).
// To add a new project: copy a block below, give it a unique key,
// set the name, and leave sheetUrls blank until sheets are ready.
// ============================================================
function QualTag({ status, children }) {
  const map = {
    current: { bg: "#E9F6EC", color: "#1E7A34", label: "Current" },
    expiring: { bg: "#FFF4DC", color: "#93650A", label: "Expiring soon" },
    expired: { bg: "#FCEFEF", color: ALERT, label: "Expired" },
  };
  const s = map[status];
  return (
    <div className="flex items-center justify-between rounded-sm px-2 py-1" style={{ background: s.bg }}>
      <span className="text-[11px]" style={{ color: INK, fontFamily: "Inter, sans-serif" }}>{children}</span>
      <span className="text-[9px] uppercase font-bold ml-2 flex-shrink-0" style={{ color: s.color, fontFamily: "IBM Plex Mono, monospace" }}>{s.label}</span>
    </div>
  );
}

function EmployeeDetail({ emp, onClose, photo }) {
  const initials = emp.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/80 px-0 sm:px-4">
      <div className="bg-white rounded-t-md sm:rounded-md w-full max-w-sm overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "#E4E2DA" }}>
          <div className="text-[15px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{emp.name}</div>
          <button onClick={onClose}><X size={18} color={STEEL} /></button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {photo ? (
              <img src={photo} alt={emp.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" style={{ border: `2px solid ${GOLD}` }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-[15px]" style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>
                {initials}
              </div>
            )}
            <div className="text-[12px]" style={{ color: STEEL }}>{emp.role}</div>
          </div>
          <div className="flex gap-2 mb-4">
            <Tag>ID {emp.empId}</Tag>
            <Tag>Badge {emp.badge}</Tag>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-sm px-2 py-1.5" style={{ background: "#F4F3EF" }}>
              <div className="text-[9px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Employer</div>
              <div className="text-[12px] font-bold">{emp.employer || "—"}</div>
            </div>
            <div className="rounded-sm px-2 py-1.5" style={{ background: "#F4F3EF" }}>
              <div className="text-[9px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Orientation Date</div>
              <div className="text-[12px] font-bold">{emp.orientationDate || "—"}</div>
            </div>
          </div>
          <div className="text-[11px] uppercase font-bold mb-1.5" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
            Designations
          </div>
          {emp.quals.length === 0 ? (
            <div className="text-[12px]" style={{ color: STEEL }}>No designated operator or competent person qualifications on file.</div>
          ) : (
            <div className="space-y-1.5">
              {emp.quals.map((q, i) => (
                <QualTag key={i} status={q.status}>{q.label}</QualTag>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddPersonScreen({ user, onDone }) {
  const [mode, setMode] = useState("single"); // "single" | "bulk"
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [badge, setBadge] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("");
  const [employer, setEmployer] = useState("");
  const [orientationDate, setOrientationDate] = useState(new Date().toISOString().slice(0, 10));
  const [trainingAccess, setTrainingAccess] = useState(false);
  const [quals, setQuals] = useState([]);
  const [qualLabel, setQualLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (empId) => {
    if (!photoFile) return { url: null, error: null };
    setUploadingPhoto(true);
    const ext = photoFile.name.split(".").pop();
    const path = `${empId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("badge-photos").upload(path, photoFile);
    setUploadingPhoto(false);
    if (uploadError) return { url: null, error: uploadError.message || "Photo upload failed." };
    const { data } = supabase.storage.from("badge-photos").getPublicUrl(path);
    return { url: data && data.publicUrl ? data.publicUrl : null, error: null };
  };

  const generatePin = () => setPin(String(Math.floor(1000 + Math.random() * 9000)));

  const addQual = () => {
    if (!qualLabel.trim()) return;
    setQuals((q) => [...q, { label: qualLabel.trim(), status: "current" }]);
    setQualLabel("");
  };
  const removeQual = (i) => setQuals((q) => q.filter((_, idx) => idx !== i));

  const canSubmit = name.trim() && employeeId.trim() && badge.trim() && pin.trim().length >= 4 && employer;

  const submit = async () => {
    setSubmitting(true);
    setError("");
    const { url: photoUrl, error: photoError } = await uploadPhoto(employeeId.trim());
    if (photoError) {
      setSubmitting(false);
      setError(`Photo upload failed: ${photoError}`);
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("add_personnel", {
      p_token: user.sessionToken,
      p_name: name.trim(),
      p_employee_id: employeeId.trim(),
      p_badge: badge.trim(),
      p_pin: pin.trim(),
      p_role: role.trim(),
      p_employer: employer,
      p_orientation_date: orientationDate,
      p_training_access: trainingAccess,
      p_qualifications: quals,
      p_photo_url: photoUrl,
    });
    setSubmitting(false);
    if (rpcError || !data) {
      setError("Something went wrong. Try again.");
      return;
    }
    if (!data.success) {
      setError(data.error || "Couldn't add this person.");
      return;
    }
    setSuccess({ name: name.trim(), badge: badge.trim(), pin: pin.trim() });
  };

  if (success) {
    return (
      <div className="px-4 pt-10 pb-8 flex flex-col items-center text-center" style={{ background: "#F4F3EF", minHeight: "100%" }}>
        <CheckCircle2 size={40} color={GOLD} />
        <div className="text-[16px] mt-3 mb-1" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Person Added</div>
        <div className="text-[12px] mb-4" style={{ color: STEEL }}>
          Give {success.name} their login info:
        </div>
        <div className="bg-white rounded-md p-4 border w-full max-w-xs" style={{ borderColor: "#E4E2DA" }}>
          <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Badge Number</div>
          <div className="text-[16px] font-bold mb-2">{success.badge}</div>
          <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>PIN</div>
          <div className="text-[16px] font-bold">{success.pin}</div>
        </div>
        <button
          onClick={onDone}
          className="mt-5 text-[12px] font-bold uppercase px-4 py-2 rounded-sm"
          style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
        >
          Add Another
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("single")}
          className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm"
          style={{ background: mode === "single" ? GOLD : "white", color: mode === "single" ? INK : STEEL, fontFamily: "IBM Plex Mono, monospace", border: `1px solid ${mode === "single" ? GOLD : "#E4E2DA"}` }}
        >
          Add One
        </button>
        <button
          onClick={() => setMode("bulk")}
          className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm"
          style={{ background: mode === "bulk" ? GOLD : "white", color: mode === "bulk" ? INK : STEEL, fontFamily: "IBM Plex Mono, monospace", border: `1px solid ${mode === "bulk" ? GOLD : "#E4E2DA"}` }}
        >
          Bulk Import (CSV)
        </button>
      </div>

      {mode === "bulk" ? (
        <BulkImportPanel user={user} onDone={onDone} />
      ) : (
      <>
      <div className="text-[12px] mb-4" style={{ color: STEEL }}>
        Adds someone to your project's roster only. They'll use the Badge Number and PIN you set here to log in.
      </div>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Photo (optional)</label>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
      {photoPreview ? (
        <div className="flex items-center gap-3 mt-1 mb-3">
          <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" style={{ border: `2px solid ${GOLD}` }} />
          <button onClick={() => photoInputRef.current && photoInputRef.current.click()} className="text-[11px] font-bold uppercase px-3 py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
            Change
          </button>
        </div>
      ) : (
        <button
          onClick={() => photoInputRef.current && photoInputRef.current.click()}
          className="w-full mt-1 mb-3 rounded-md border-2 border-dashed py-3 flex flex-col items-center gap-1"
          style={{ borderColor: "#C9C6BC" }}
        >
          <Camera size={18} color={STEEL} />
          <span className="text-[11px]" style={{ color: STEEL }}>Add a photo</span>
        </button>
      )}

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Full Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Employee ID</label>
      <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. FCSV0006" className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Badge Number</label>
      <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. FCSV0006" className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>PIN (they'll use this to log in)</label>
      <div className="flex gap-2 mt-1 mb-3">
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={6} className="flex-1 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />
        <button onClick={generatePin} className="text-[10px] font-bold uppercase px-3 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Generate</button>
      </div>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Role</label>
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Construction Laborer" className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Subcontractor</label>
      <select value={employer} onChange={(e) => setEmployer(e.target.value)} className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px] bg-white" style={{ borderColor: "#C9C6BC" }}>
        <option value="">Select…</option>
        {SUBCONTRACTOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Orientation Date</label>
      <input type="date" value={orientationDate} onChange={(e) => setOrientationDate(e.target.value)} className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <button
        onClick={() => setTrainingAccess((t) => !t)}
        className="w-full flex items-center justify-between bg-white rounded-md p-3 border mb-3"
        style={{ borderColor: "#E4E2DA" }}
      >
        <span className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Training Access</span>
        <div className="w-10 h-6 rounded-full flex items-center px-0.5" style={{ background: trainingAccess ? GOLD : "#E4E2DA", justifyContent: trainingAccess ? "flex-end" : "flex-start" }}>
          <div className="w-5 h-5 rounded-full bg-white" />
        </div>
      </button>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Designations / Qualifications</label>
      <div className="flex gap-2 mt-1 mb-2">
        <input value={qualLabel} onChange={(e) => setQualLabel(e.target.value)} placeholder="e.g. Competent Person – Fall Protection" className="flex-1 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} onKeyDown={(e) => e.key === "Enter" && addQual()} />
        <button onClick={addQual} className="text-[10px] font-bold uppercase px-3 rounded-sm" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>Add</button>
      </div>
      <div className="space-y-1.5 mb-4">
        {quals.map((q, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-sm px-2.5 py-1.5 border" style={{ borderColor: "#E4E2DA" }}>
            <span className="text-[12px]">{q.label}</span>
            <button onClick={() => removeQual(i)}><X size={14} color={STEEL} /></button>
          </div>
        ))}
      </div>

      {error && <div className="text-[11px] mb-3" style={{ color: ALERT }}>{error}</div>}
      <button
        disabled={!canSubmit || submitting}
        onClick={submit}
        className="w-full rounded-md py-2.5 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
      >
        {submitting ? "Adding…" : "Add Person"}
      </button>
      </>
      )}
    </div>
  );
}

function BulkImportPanel({ user, onDone }) {
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState([]);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const parseCsv = (text) => {
    setCsvText(text);
    setParseError("");
    setResult(null);
    if (!text.trim()) { setParsed([]); return; }
    Papa.parse(text.trim(), {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors && results.errors.length > 0) {
          setParseError("Couldn't read that CSV — check the format against the template.");
          setParsed([]);
          return;
        }
        const rows = results.data.map((row) => ({
          name: row.Name || "",
          employee_id: row.EmployeeID || "",
          badge: row.Badge || "",
          pin: row.PIN || String(Math.floor(1000 + Math.random() * 9000)),
          role: row.Role || "",
          employer: row.Employer || "",
          orientation_date: row.OrientationDate || "",
          training_access: (row.TrainingAccess || "").toLowerCase() === "yes",
          qualifications: (row.Qualifications || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((label) => ({ label, status: "current" })),
        }));
        setParsed(rows);
      },
    });
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseCsv(reader.result);
    reader.readAsText(file);
  };

  const submit = async () => {
    setSubmitting(true);
    const { data, error } = await supabase.rpc("bulk_add_personnel", {
      p_token: user.sessionToken,
      p_people: parsed,
    });
    setSubmitting(false);
    if (error || !data) {
      setResult({ added: 0, errors: [{ error: "Something went wrong reaching the server." }] });
      return;
    }
    setResult(data);
  };

  return (
    <div>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Upload or paste a CSV to add several people at once. Columns needed (first row, exact names):
      </div>
      <div className="bg-white rounded-md p-2.5 mb-3 border text-[10px]" style={{ borderColor: "#E4E2DA", fontFamily: "IBM Plex Mono, monospace", color: STEEL, overflowX: "auto", whiteSpace: "nowrap" }}>
        Name,EmployeeID,Badge,PIN,Role,Employer,OrientationDate,TrainingAccess,Qualifications
      </div>
      <div className="text-[11px] mb-3" style={{ color: STEEL }}>
        PIN is optional — leave blank and one is generated automatically. Qualifications: separate multiple with a semicolon (e.g. "Driving Awareness; Competent Person – Excavation"). TrainingAccess: yes or no.
      </div>

      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="w-full mb-3 rounded-md border-2 border-dashed py-3 flex flex-col items-center gap-1"
        style={{ borderColor: "#C9C6BC" }}
      >
        <ImagePlus size={18} color={STEEL} />
        <span className="text-[11px]" style={{ color: STEEL }}>Upload a CSV file</span>
      </button>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Or paste CSV text</label>
      <textarea
        rows={5}
        value={csvText}
        onChange={(e) => parseCsv(e.target.value)}
        className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[12px]"
        style={{ borderColor: "#C9C6BC", fontFamily: "IBM Plex Mono, monospace" }}
      />

      {parseError && <div className="text-[11px] mb-3" style={{ color: ALERT }}>{parseError}</div>}

      {parsed.length > 0 && !result && (
        <div className="bg-white rounded-md p-3 mb-3 border" style={{ borderColor: "#E4E2DA" }}>
          <div className="text-[12px] font-bold mb-2">{parsed.length} people ready to add:</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {parsed.map((p, i) => (
              <div key={i} className="text-[11px]" style={{ color: STEEL }}>{p.name || "(no name)"} — {p.badge || "(no badge)"}</div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-md p-3 mb-3 border" style={{ borderColor: "#E4E2DA" }}>
          <div className="text-[13px] font-bold mb-1" style={{ color: "#1E7A34" }}>{result.added} people added successfully</div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2">
              <div className="text-[11px] font-bold mb-1" style={{ color: ALERT }}>{result.errors.length} failed:</div>
              {result.errors.map((e, i) => (
                <div key={i} className="text-[11px]" style={{ color: ALERT }}>{e.name || "?"}: {e.error}</div>
              ))}
            </div>
          )}
          <button
            onClick={onDone}
            className="mt-3 text-[11px] font-bold uppercase px-3 py-2 rounded-sm"
            style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
          >
            Done
          </button>
        </div>
      )}

      {!result && (
        <button
          disabled={parsed.length === 0 || submitting}
          onClick={submit}
          className="w-full rounded-md py-2.5 text-sm font-bold disabled:opacity-40"
          style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
        >
          {submitting ? "Adding…" : `Add ${parsed.length || ""} People`}
        </button>
      )}
    </div>
  );
}

function PersonnelScreen({ user, go }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.sessionToken) { setEmployees([]); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.rpc("list_personnel", { p_token: user.sessionToken });
      if (cancelled) return;
      if (error || !data) {
        setEmployees([]);
      } else {
        setEmployees(
          data.map((e) => ({
            name: e.name,
            empId: e.employee_id,
            badge: e.badge_number,
            role: e.role || "",
            employer: e.employer || "",
            orientationDate: e.orientation_date || "",
            photoUrl: e.photo_url || "",
            quals: e.qualifications || [],
          }))
        );
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user?.sessionToken]);

  const q = query.trim().toLowerCase();
  const filtered = employees.filter((e) =>
    !q || e.name.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q) || e.badge.toLowerCase().includes(q)
  );
  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Look up crew by name, employee number, or badge number to check designated operator / competent person status.
      </div>
      {user && user.canAddPersonnel && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => go("addperson")}
            className="flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-bold uppercase"
            style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
          >
            <Users size={15} /> Add Person
          </button>
          <button
            onClick={() => go("manageroster")}
            className="flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-bold uppercase border"
            style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}
          >
            Manage Roster
          </button>
        </div>
      )}
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, employee #, or badge #"
        className="w-full rounded-md border px-3 py-2 text-[13px] mb-3"
        style={{ borderColor: "#C9C6BC" }}
      />
      <div className="space-y-2">
        {filtered.map((e, i) => {
          const photo = e.photoUrl;
          const initials = e.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
          return (
          <button
            key={i}
            onClick={() => setSelected(e)}
            className="w-full text-left bg-white rounded-md p-3 flex items-center gap-3 border"
            style={{ borderColor: "#E4E2DA" }}
          >
            {photo ? (
              <img src={photo} alt={e.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" style={{ border: `1.5px solid ${GOLD}` }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[12px]" style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{e.name}</div>
              <div className="text-[11px] mt-0.5" style={{ color: STEEL }}>{e.role} · ID {e.empId} · Badge {e.badge}</div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {e.quals.length === 0 ? (
                  <span className="text-[10px]" style={{ color: STEEL }}>No quals on file</span>
                ) : (
                  e.quals.map((q, qi) => (
                    <span key={qi} className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm" style={{
                      background: q.status === "current" ? "#E9F6EC" : q.status === "expiring" ? "#FFF4DC" : "#FCEFEF",
                      color: q.status === "current" ? "#1E7A34" : q.status === "expiring" ? "#93650A" : ALERT,
                      fontFamily: "IBM Plex Mono, monospace",
                    }}>
                      {q.status === "current" ? "Qualified" : q.status === "expiring" ? "Expiring" : "Expired"}
                    </span>
                  ))
                )}
              </div>
            </div>
            <ChevronRight size={16} color={STEEL} />
          </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No matches.</div>
        )}
      </div>
      {selected && <EmployeeDetail emp={selected} onClose={() => setSelected(null)} photo={selected.photoUrl} />}
    </div>
  );
}

function RosterRow({ person, user, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(person.role || "");
  const [employer, setEmployer] = useState(person.employer || "");
  const [trainingAccess, setTrainingAccess] = useState(person.training_access || false);
  const [isAdmin, setIsAdmin] = useState(person.can_add_personnel || false);
  const [saving, setSaving] = useState(false);
  const [pinResult, setPinResult] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(person.photo_url || null);
  const photoInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const [saveError, setSaveError] = useState("");

  const save = async () => {
    setSaving(true);
    setSaveError("");
    let photoUrl = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${person.employee_id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("badge-photos").upload(path, photoFile);
      if (uploadError) {
        setSaving(false);
        setSaveError(`Photo upload failed: ${uploadError.message || "unknown error"}`);
        return;
      }
      const { data } = supabase.storage.from("badge-photos").getPublicUrl(path);
      photoUrl = data && data.publicUrl ? data.publicUrl : null;
    }
    await supabase.rpc("update_personnel", {
      p_token: user.sessionToken,
      p_person_id: person.id,
      p_role: role,
      p_employer: employer,
      p_training_access: trainingAccess,
      p_photo_url: photoUrl,
      p_can_add_personnel: isAdmin,
    });
    setSaving(false);
    setEditing(false);
    onChanged();
  };

  const toggleActive = async () => {
    await supabase.rpc("set_personnel_active", {
      p_token: user.sessionToken,
      p_person_id: person.id,
      p_active: !person.active,
    });
    onChanged();
  };

  const doResetPin = async () => {
    const newPin = String(Math.floor(1000 + Math.random() * 9000));
    const { data } = await supabase.rpc("reset_pin", {
      p_token: user.sessionToken,
      p_person_id: person.id,
      p_new_pin: newPin,
    });
    if (data) setPinResult(newPin);
  };

  return (
    <div className="bg-white rounded-md p-3 border mb-2" style={{ borderColor: "#E4E2DA", opacity: person.active ? 1 : 0.55 }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{person.name}</div>
          <div className="text-[11px]" style={{ color: STEEL }}>ID {person.employee_id} · Badge {person.badge_number}{!person.active ? " · Inactive" : ""}{person.can_add_personnel ? " · Admin" : ""}</div>
        </div>
        <button onClick={() => setEditing((e) => !e)} className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "#E4E2DA" }}>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          <div className="flex items-center gap-3 mb-3">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-full object-cover" style={{ border: `2px solid ${GOLD}` }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#E4E2DA" }}>
                <Camera size={18} color={STEEL} />
              </div>
            )}
            <button onClick={() => photoInputRef.current && photoInputRef.current.click()} className="text-[11px] font-bold uppercase px-3 py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
              {photoPreview ? "Change Photo" : "Add Photo"}
            </button>
          </div>

          <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Role</label>
          <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

          <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Subcontractor</label>
          <select value={employer} onChange={(e) => setEmployer(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px] bg-white" style={{ borderColor: "#C9C6BC" }}>
            <option value="">Select…</option>
            {SUBCONTRACTOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>

          <button
            onClick={() => setTrainingAccess((t) => !t)}
            className="w-full flex items-center justify-between rounded-md p-2 border mb-3"
            style={{ borderColor: "#E4E2DA", background: "#FCFCFA" }}
          >
            <span className="text-[12px]">Training Access</span>
            <div className="w-9 h-5 rounded-full flex items-center px-0.5" style={{ background: trainingAccess ? GOLD : "#E4E2DA", justifyContent: trainingAccess ? "flex-end" : "flex-start" }}>
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </button>

          <button
            onClick={() => setIsAdmin((a) => !a)}
            className="w-full flex items-center justify-between rounded-md p-2 border mb-3"
            style={{ borderColor: isAdmin ? GOLD : "#E4E2DA", background: isAdmin ? "#FFF8E1" : "#FCFCFA" }}
          >
            <div>
              <div className="text-[12px] font-bold">Admin Rights</div>
              <div className="text-[10px]" style={{ color: STEEL }}>Can add people & manage Bulletin, Orientation, Work Plans</div>
            </div>
            <div className="w-9 h-5 rounded-full flex items-center px-0.5 flex-shrink-0 ml-2" style={{ background: isAdmin ? GOLD : "#E4E2DA", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </button>

          {saveError && <div className="text-[11px] mb-2" style={{ color: ALERT }}>{saveError}</div>}
          <button onClick={save} disabled={saving} className="w-full mb-2 text-[11px] font-bold uppercase py-2 rounded-sm disabled:opacity-50" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <div className="flex gap-2">
            <button onClick={toggleActive} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm border" style={{ borderColor: person.active ? ALERT : "#C9C6BC", color: person.active ? ALERT : STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
              {person.active ? "Deactivate" : "Reactivate"}
            </button>
            <button onClick={doResetPin} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
              Reset PIN
            </button>
          </div>
          {pinResult && (
            <div className="mt-2 text-[12px] text-center rounded-sm p-2" style={{ background: "#FFF8E1" }}>
              New PIN for {person.name}: <span className="font-bold">{pinResult}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManageRosterScreen({ user }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_personnel_admin", { p_token: user.sessionToken });
    setPeople(error || !data ? [] : data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.sessionToken]);

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Edit info, reset PINs, or deactivate people on your project's roster.
      </div>
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      {people.map((p) => <RosterRow key={p.id} person={p} user={user} onChanged={load} />)}
      {!loading && people.length === 0 && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>Nobody on this roster yet.</div>
      )}
    </div>
  );
}

function BulletinPostEditor({ post, user, onDone }) {
  const [title, setTitle] = useState(post ? post.title : "");
  const [message, setMessage] = useState(post ? post.message : "");
  const [checklistText, setChecklistText] = useState(post && post.checklist ? post.checklist.join("\n") : "");
  const [pinned, setPinned] = useState(post ? post.pinned : false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim() || !message.trim()) { setError("Title and message are required."); return; }
    setSaving(true);
    setError("");
    const checklist = checklistText.trim()
      ? checklistText.split("\n").map((s) => s.trim()).filter(Boolean)
      : null;

    const { data, error: rpcError } = post
      ? await supabase.rpc("update_bulletin_post", {
          p_token: user.sessionToken, p_post_id: post.id,
          p_title: title.trim(), p_message: message.trim(), p_checklist: checklist, p_pinned: pinned,
        })
      : await supabase.rpc("add_bulletin_post", {
          p_token: user.sessionToken,
          p_title: title.trim(), p_message: message.trim(), p_checklist: checklist, p_pinned: pinned,
        });

    setSaving(false);
    if (rpcError || !data) { setError("Something went wrong. Try again."); return; }
    onDone();
  };

  return (
    <div className="bg-white rounded-md p-3 border mb-3" style={{ borderColor: "#E4E2DA" }}>
      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Message</label>
      <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Checklist Items (optional — one per line)</label>
      <textarea rows={3} value={checklistText} onChange={(e) => setChecklistText(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[12px]" style={{ borderColor: "#C9C6BC" }} />

      <button onClick={() => setPinned((p) => !p)} className="w-full flex items-center justify-between rounded-md p-2 border mb-3" style={{ borderColor: "#E4E2DA", background: "#FCFCFA" }}>
        <span className="text-[12px]">Pin to top</span>
        <div className="w-9 h-5 rounded-full flex items-center px-0.5" style={{ background: pinned ? GOLD : "#E4E2DA", justifyContent: pinned ? "flex-end" : "flex-start" }}>
          <div className="w-4 h-4 rounded-full bg-white" />
        </div>
      </button>

      {error && <div className="text-[11px] mb-2" style={{ color: ALERT }}>{error}</div>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm disabled:opacity-50" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          {saving ? "Saving…" : post ? "Save Changes" : "Post It"}
        </button>
        <button onClick={onDone} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageBulletinScreen({ user }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_bulletin_admin", { p_token: user.sessionToken });
    setPosts(error || !data ? [] : data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.sessionToken]);

  const remove = async (postId) => {
    await supabase.rpc("delete_bulletin_post", { p_token: user.sessionToken, p_post_id: postId });
    load();
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Posts you add here show up on the Home screen for everyone on this project — no login required to see them.
      </div>

      {!showNew && !editingPost && (
        <button onClick={() => setShowNew(true)} className="w-full mb-3 text-[12px] font-bold uppercase py-2.5 rounded-md" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          + New Post
        </button>
      )}

      {showNew && <BulletinPostEditor user={user} onDone={() => { setShowNew(false); load(); }} />}

      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}

      {posts.map((p) =>
        editingPost === p.id ? (
          <BulletinPostEditor key={p.id} post={p} user={user} onDone={() => { setEditingPost(null); load(); }} />
        ) : (
          <div key={p.id} className="bg-white rounded-md p-3 border mb-2" style={{ borderColor: p.pinned ? GOLD : "#E4E2DA", borderLeftWidth: p.pinned ? 3 : 1 }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{p.title}</div>
              {p.pinned && <Pin size={13} color={GOLD} />}
            </div>
            <div className="text-[12px] mb-2" style={{ color: "#333" }}>{p.message}</div>
            <div className="flex gap-2">
              <button onClick={() => setEditingPost(p.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Edit</button>
              <button onClick={() => remove(p.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: ALERT, color: ALERT, fontFamily: "IBM Plex Mono, monospace" }}>Delete</button>
            </div>
          </div>
        )
      )}
      {!loading && posts.length === 0 && !showNew && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No posts yet — add the first one above.</div>
      )}
    </div>
  );
}

// ---- Screen: Orientation ----
const ORIENTATION_LOCATION = "8713 Airport Freeway, 4th Floor, North Richland Hills, TX 76180";
const ORIENTATION_SESSIONS_DEFAULT = [
  { date: "Every Monday", time: "7:30 AM", location: ORIENTATION_LOCATION, notes: "Conducted in English" },
  { date: "Every Tuesday", time: "7:30 AM", location: ORIENTATION_LOCATION, notes: "Conducted in Spanish / En español" },
];
// Same weekly schedule, location not yet set for these projects
const ORIENTATION_SESSIONS_TBD = [
  { date: "Every Monday", time: "7:30 AM", location: "To Be Determined", notes: "Conducted in English" },
  { date: "Every Tuesday", time: "7:30 AM", location: "To Be Determined", notes: "Conducted in Spanish / En español" },
];

// Printable-only orientation documents — download & bring/submit, not filled in-app
const ORIENTATION_DOCS_DEFAULT = [
  { title: "Competent Person Designation", pdfLink: "https://drive.google.com/file/d/1feA_9rlMhRNHwmaTl1_82gUJ3r0oR56l/preview" },
  { title: "Equipment Operator Designation", pdfLink: "https://drive.google.com/file/d/187jtVCLCJpciawGgi0f2Pq-Rs3DtiPlY/preview" },
  { title: "Drug Screen Affidavit", pdfLink: "https://drive.google.com/file/d/1lbc7gPzre4g7e7bqbJk6k9f9xw9jgYEK/preview" },
];

function OrientationScreen({ user, go, activeProjectId }) {
  const { fallbacks } = useContext(ProjectContext);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSessions(true);
      await loadProjectMap();
      const projectUuid = projectIdForSlug(activeProjectId);
      if (!projectUuid) { if (!cancelled) { setSessions([]); setLoadingSessions(false); } return; }
      const { data, error } = await supabase
        .from("orientation_sessions")
        .select("*")
        .eq("project_id", projectUuid)
        .order("date_label");
      if (cancelled) return;
      setSessions(
        error || !data
          ? []
          : data.map((row) => ({ date: row.date_label, time: row.time_label, location: row.location, notes: row.notes }))
      );
      setLoadingSessions(false);
    }
    load();
    return () => { cancelled = true; };
  }, [activeProjectId]);

  const [downloaded, setDownloaded] = useState({});
  const [viewingPdf, setViewingPdf] = useState(null);
  const [openForm, setOpenForm] = useState(null);

  const handleDownload = (d, i) => {
    setDownloaded((s) => ({ ...s, [i]: true }));
    if (d.pdfLink) window.open(d.pdfLink, "_blank");
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Upcoming Sessions</div>
        {user && user.canAddPersonnel && (
          <button onClick={() => go("manageorientation")} className="text-[10px] font-bold uppercase px-2 py-1 rounded-sm" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
            Manage
          </button>
        )}
      </div>
      {loadingSessions && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      <div className="space-y-2 mb-5">
        {sessions.map((s, i) => (
          <div key={i} className="bg-white rounded-md p-3 border flex gap-3" style={{ borderColor: "#E4E2DA" }}>
            <div className="flex-shrink-0 w-11 h-11 rounded-md flex flex-col items-center justify-center" style={{ background: INK }}>
              <CalendarDays size={18} color={GOLD} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{s.date} · {s.time}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} color={STEEL} />
                <span className="text-[11px]" style={{ color: STEEL }}>{s.location}</span>
              </div>
              {s.notes && <div className="text-[11px] mt-1" style={{ color: STEEL }}>{s.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Orientation Documents</div>
      <div className="space-y-2 mb-5">
        {ORIENTATION_FORMS_DEFAULT.map((d, i) => (
          <div key={i} className="bg-white rounded-md p-3 border" style={{ borderColor: "#E4E2DA" }}>
            <div className="flex items-center gap-2 min-w-0 mb-2">
              <FileText size={17} color={GOLD} className="flex-shrink-0" />
              <div className="text-[13px] leading-tight" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{d.title}</div>
            </div>
            {d.description && (
              <div className="text-[11px] leading-snug mb-2" style={{ color: STEEL }}>{d.description}</div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setOpenForm(d)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
                <PenLine size={12} /> Fill Out
              </button>
              <button onClick={() => setViewingPdf(d)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                <Eye size={12} /> View
              </button>
              <button onClick={() => handleDownload(d, i)} className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold uppercase px-2 py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
                {downloaded[i] ? <CheckCircle2 size={12} color={GOLD} /> : <Download size={12} />} {downloaded[i] ? "Saved" : "Download"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewingPdf && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden max-h-[85%] flex flex-col" style={{ height: "80%" }}>
            <div className="flex items-center justify-between p-3 border-b flex-shrink-0" style={{ borderColor: "#E4E2DA" }}>
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{viewingPdf.title}</div>
              <button onClick={() => setViewingPdf(null)}><X size={18} color={STEEL} /></button>
            </div>
            {viewingPdf.pdfLink ? (
              <iframe src={viewingPdf.pdfLink} className="flex-1 w-full" style={{ border: "none" }} title={viewingPdf.title} />
            ) : (
              <div className="flex-1 flex items-center justify-center" style={{ color: STEEL }}>No preview available.</div>
            )}
          </div>
        </div>
      )}

      {openForm && <FillFormModal form={openForm} onClose={() => setOpenForm(null)} user={user} />}
    </div>
  );
}

// ---- Bulletin Board data (rendered inline on Home) ----
const BULLETIN_DEFAULT = [
  {
    title: "Heat Safety Alert: 80°F & Above",
    date: "Aug 27, 2026",
    message: "Shade is mandatory at 80°F+. When ambient temperatures reach 80°F, shade must be open, accessible, and ready for use.",
    checklist: [
      "Capacity: Must fit 100% of workers taking rest breaks simultaneously.",
      "Proximity: Located as close as safely possible to the work area.",
      "Airflow: Open to the air on all sides — not an enclosed trap.",
      "Comfort: Must never expose workers to hazardous conditions or excessive radiant heat.",
    ],
    pinned: true,
  },
  {
    title: "Lifesaving Controls",
    date: "Aug 27, 2026",
    message: "Fail-Safe Protection Against Human Error — Core Principles:",
    checklist: [
      "Does not depend on people.",
      "Effective when we make mistakes.",
      "Prevents or mitigates the exposure.",
    ],
    pinned: false,
  },
  { title: "Quarterly Safety Meeting", date: "Aug 27, 2026", message: "Tuesday, 7:30 AM in Ramp 0.", pinned: false },
];

// ============================================================
// PROJECTS
// Personnel/badges, Work Plans, and the Safety Plan are project-specific
// and never duplicate across projects. H&S Minimum Standards and Forms
// are the same company-wide (see HS_STANDARDS_ITEM / FORMS_DEFAULT above).
// Bulletin Board and Emergency Contacts are also project-specific — each
// project has its own. To add a new project: copy a block, give it a
// unique key, set the name, and leave fallbacks empty until real content
// (or a connected sheet) is ready.
// ============================================================
const PROJECTS = {
  "safety-hub": {
    id: "safety-hub",
    name: "Safety Hub",
    sheetUrls: { ...EMPTY_SHEET_URLS },
    fallbacks: { personnel: [], workPlans: [], safetyPlan: [], bulletin: [], emergencyContacts: [], orientation: [] },
  },
  "nti-sylvania": {
    id: "nti-sylvania",
    name: "NTI - Sylvania",
    sheetUrls: { ...EMPTY_SHEET_URLS },
    fallbacks: {
      personnel: EMPLOYEES_DEFAULT,
      workPlans: WORK_PLANS_FLAT_DEFAULT,
      safetyPlan: SAFETY_PLAN_DEFAULT,
      bulletin: BULLETIN_DEFAULT,
      emergencyContacts: EMERGENCY_CONTACTS_DEFAULT,
      orientation: ORIENTATION_SESSIONS_DEFAULT,
    },
  },
  "sh99-houston": {
    id: "sh99-houston",
    name: "SH-99 - Houston",
    sheetUrls: { ...EMPTY_SHEET_URLS },
    fallbacks: { personnel: [], workPlans: [], safetyPlan: [], bulletin: [], emergencyContacts: EMERGENCY_CONTACTS_TBD, orientation: ORIENTATION_SESSIONS_TBD },
  },
  "nashville": {
    id: "nashville",
    name: "Nashville",
    sheetUrls: { ...EMPTY_SHEET_URLS },
    fallbacks: { personnel: [], workPlans: [], safetyPlan: [], bulletin: [], emergencyContacts: EMERGENCY_CONTACTS_TBD, orientation: ORIENTATION_SESSIONS_TBD },
  },
};

// Used from the generic "Safety Hub" landing environment: search every
// project's personnel for a badge match, so logging in there automatically
// places someone in their assigned project.
function findEmployeeAcrossProjects(query) {
  const q = query.trim().toLowerCase();
  for (const proj of Object.values(PROJECTS)) {
    if (proj.id === "safety-hub") continue;
    const match = (proj.fallbacks.personnel || []).find(
      (e) => e.name.toLowerCase() === q || e.empId.toLowerCase() === q || e.badge.toLowerCase() === q
    );
    if (match) return { employee: match, projectId: proj.id };
  }
  return null;
}

const INCIDENT_IMAGES = {
  "66906": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHCAkIBgoJCAkMCwoMDxoRDw4ODx8WGBMaJSEnJiQhJCMpLjsyKSw4LCMkM0Y0OD0/QkNCKDFITUhATTtBQj//2wBDAQsMDA8NDx4RER4/KiQqPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz//wAARCAEMAM0DASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAAAgMBBAUABgcI/8QAOxAAAgEDAwEGBAQFAwUAAwAAAQIRAAMhBBIxQQUTIlFhcTKBkaEGQlKxFCPB0fAV4fEzQ2JygiVjkv/EABkBAQEBAQEBAAAAAAAAAAAAAAEAAgMEBf/EACURAQEAAgICAgIBBQAAAAAAAAABAhEDIRIxQVETIhRSYeHw8f/aAAwDAQACEQMRAD8A0fF5n613i8z9aOK6K+k+cCW8z9aiWP5j9aZFRFSB4v1Golv1H60ZWuilAk/qP1qJPmfrRxXRSC5P6j9a7xfqP1o4roqFLz+o/Wulv1H60cVEVAMt+o/Wo8X6j9aOK6KkDxfrP1rpb9R+tFFdFSDL/qP1rpfzP1ooriIHNSVNVqUthrTuS7LhOd1ZVnV92znezl1hg2DVrV3rd7Uae8reBRIMwecx9Kzrd22bxuQ0QJLHMxj9q8XPn318PXxY9NqxfOps93cYrfUSVBgrmAaaFuIoAYkHnP35qvoAlq21+44JuBZePU0N7WuwvbPAm0rbI53Tz6cV0x5MZJ5VzuN30HtVry2EAZlSSXbftAxjPuazbT3tOjhL1xVbwoCfHHr8yafqtTdu6C5avb1FgqrvE729fTFZ1i5Km4XG23OGAx5n3rzc+Xe47ceO5qrCi9d1FwWbgCtJuEsZC9ZPzite1q7us1F5dHc/lWCELfqbr/SsTY1wNctF/GApYScD/OK1OyHt2LD9+wtl23AExVxZ96GeL0UVMelGBXba97zlxURTYqCtILioimba4rUi4qIpm2oipAioj0o4ropGi9tdFMg1EVAuK6KOK6KtgEUIIYsAQSvPpS+0L402iuXJAYgqsmMwayuzO0EBusY2BVL4OCJk/ORXLPkmOUjeOG5ttba4rIIjmqOh7SXU6u9aaFAyntIA+s1a1F9bQdZAuBNwB6048mOU3F42XTzep0qdn3ksm4YBJHUgHE8+2KG5ZuXL15Cq2whSFEScDI9aZdv3/wDUUTWhZW4H8S5dcCARwPMVbtahhrdVeRLfdFUO0xJOwQBXDPHG9vRjbEXCtns1XF0LLBbg6xBwPPkUpHSJICmJAY8x703tFk/0nT91bUbruQgkyAcCetVdLp+8IW2CC8gO4gjzn6V5OWdyR1w+drl6/pXRFawURUO24hxMGMfb51RtWbd8HaWW0IV2cABfIY5wRTjfuWNKQlpW3SH3ZEQTI9fX2quQEKW3dcQSCYA6x961c7lj32pjq9Buu9u5d0qDcgiX4AHuKO1buXC0SQvhAVdxHvim2bR1W5NPeOWPh4+nr/atnRCxp0KWRtuY71Rnxf8AM04cfl38M55eMbIFcRRhamK923n0VFdFNioina0XFdHpRxXEU7Gi4qIpm2uK1bBcVEelMioinYL21EU2K6KtgqKgimxXRVtlidtnYbXeobli4dpgE7GEwfnMVlCbeiRLVwtbjgwCdvp869Hqe41YvaO7gR1OJ5rzGv2NeuKpAS1bGbbRuGBjyHWvLzYy9x6eK9aqtYY7mt21clSQcAEgZn1rU0+n/j79rVAktZARgXxG05PrwP8AMZenZrN5SAz3UWQNvPSPuT862/w2Lih7t+Le8fzFaAQxOB7dBXHi1t05PSldu6jTXNOq+M6diWDAEmRiPvVgaldR2lev2l3qNvSQDAH71FjQPp9cQWuG67Hc5OFPT36Vc7NsFddqVu5hcwYnPNdbb6HWtuu6BtZ2Utu4DvSGQqYOD/Wsa2uoCC2IUE+IuDHnEivYoo27YrH1V6zeDacaJ3KXBCkQF8jTnhOqzhnd1nI93SLduiyt4kE7SZ9oFDpdGNUCrg71GwsDJgDEdJxVuxauPobzoibUskPkiYGPPiivFzpLG1LYti3O8pgnbBHp5e9c8cdTt1t3VDTA2WnS7rispVLbeZbnFaIuXNNeuWmuIWGSwESTNN0N3TizYbR25uP4fh6gUJ0N+8xYaa0SSTvFz4pP/P1pmNk6Zt3e3poqYFFHpUxia77cyyK6K65ct2gO8dUniTE0UVbWgRXRRxXRTsaBtqIpkVEU7Gi4qNtMIrop2zovbUFabFRFWxorbUEEAkZPlTiKpnUlb15SoISNsHLHrVctDSozrqtO+8C1qANrgP4kB8jXmNUG72NQ0swKDbxwOvz+9ei7b0y3NPda0GDoVZuk+vyBrxmouXrncWrSyWI8XJz/AJ9q83LXfjh19XfXWRaIQq4V4aCRjias2dSyrcnqSWBYDcBBH/NVL4uBFtvv7xTlmXJxJ/rVjTWLS6q2AhZ7jY3HznH3rz36j0YyfLe0XaB1+jOnuNN6RBJBJwTP1EU7su1cXtDU228LKik5nnP9aT2fa7vWo6abPebWuwAu04WBP+TVvQn/APP65TzsXHoMV6ZPVrj/AFSNAgIjHdtAHJ6Vjumrv6cnW6ru7Z4CwDHMyJ6DrW3dtJdXu3B5BwY44rLbse2urdiS9m5O4OfPnP8AnNdMtueLNvumi0JSxeu/w4Md2pBZp5JJ96ydSNVbvHZZuQ7SEUyCFPAjrirfb7WLTtpu9Ja225iYXECM5kyOnNHrdGuj0toWr4S29nfM+JiRxPXrXnz76+nfEzsTUahb9q3eNu2rKXdmIgZHHrg46c1qWO1tMpujV6q3IuMFKBiInjA6f3rzXZ5febD22NkEFTcBjwzIH0/w1cvrp7TK965Z06OP5draWCgHmY5JmT7U4Z2RnLGWm6Lte7oQ5DNc3rtAdpjyj70Vjt7W2VVO8DBJy45kVmPp9rYdmJadpxE/2ikXLl1GVbiBVbIJMj5fauEztnVb1Gu+tu6i4bt1yzHEgU9O07umtnVWWDFRtdWJII6fSvPJqi1zO8ITCtECeDHn71d0l0xcNxfAAAQRNFuUuz76az/iTUttKm2pByoXn0zTl/EOpuWQQtlWMflM/vWJqHtWSGNnBwy9I9qVecFVuiDBGRwRwf2rX5M76FxjbPamsZRv1UAtMqAI9KHUdra17aWxeME/Egg/UVl2UY232tBPwhmkGp0zFtNvtqxC9Bk1TkyvuqSNNO1dYr51JJMSDFPv/iHULKratAnAMExVC0iNbVoCGOWEH6Um4z2m3lgoBIZuJxiBWpyZG8cXV7d1rMlw3UC8bdoAJq3Z7c1RgNZtuJ5EifvWUGud4y20XayEQIEz/WK60DaAEArugruz7Ufms+WPxxvjtvBLaQ45i6D/AEpVztJr15kuWClqZtso3E+cx86xt9kXzbaxct2wcOLnT5+lSbiqneWr7YwoKdfOZqvNyGccX9V2po2uXbV5LptXF2+HoY9T5V5hX7vW24B2WyWUngA9TTbl7cmU5/7h5mqGofZdQlCciTsqudyUx1VhtQ97VHDHqx9JPSPKrule0uvtC6rG2pJhaqnZdUHd3d4kT5z61YCd3YLMo3BehnzrHlfbrJ019F2tprGrOy61xWXLRAXAAAE+lBZ7VFrtzU3xb3b7Yn0G4x+1eZ05Nm8jgmHhSrGJnqPL1q8Syai49tkZRaUkHkfFH7mt/ky0zMZ29bZ7e0hdxdW5bg/ERM8Uq9+INI2ne5av90ytADoW3iDxXldDce+ge8hU/E0YJk8enFMu6Zb1wm1qGtdQrCcxV/Iy9MzjlN1Pamnvq72NMjtgNca0GJxz5D3qnprpe4WazdJDADc8bQPMkHEdKq63dprRViWdxCMDI5iPoKsJd7uyzswY2yzGegMmPr5+dZuVvbUnws6jthrd9bemvm3NsLv6wJnAj60m72m7BFYXbrgSzl4Jn3nFUtSHa6l2GKkypdMtPI/b6027sYqQygRAn/kUXKjTTT+ISJIvTgkfl9D1oFC3VZLwW6s7u7iYHUetK1V+5b05uW4csPcqfUDHM1X1+rYkaawmy5G5zH39JrnMaV632dprguFA5VzwCVVSOIgiKsf6XcbRpftLs1Ftti2wVJVCMkQfQdetFp7huIr4tnG6OQfOasNf1LBXXUO7COp6eRmryvy1LGaxf+J/hblyb1sCRtEkHIoFtsN++NgMjMxVq+97Ug2zceTJhiSDH7VlpeuFkewz93MPuORnNanc6Zp1rUbdSbThlQiQecgZE+lXdLcDJvQMhmWB6nr/AErPsXk1Vu6qugJ3IrQZB9J5qwha0hCAC4Tz09RBkD5VWCL77gVKwyk5CzUG2rsNykEnEgEKP96p3taIQOPC3xEArEfTGRVbT32LFLh3BWlzPhIPB+VY/Y3Jcssi7kAe4bJklk4Hz+ec0uyt1bjI7qlsiZHEk+mcevnTLWs0ffMLIuK5ks4UnJ5x558qO7pn1WptXQSLRAkOAsMJn36Ub77B21CSHC85g0sorqQrHbOAuBU2wltTkE7iZM4/yftQtbz3unYQOAJAI9ZpmU2CAiEbRiB+ZRzmqF2+6XTaEOxIIUjBHzrR1N8LY3lUN3y96yEUtqFe54mZlMgHif7V0mr6MW0Ia65CLBYGes/PyirIdltOUJCggEA8/FPFKRANzM67SIGJII8qdfKi3ccMqncpVgYz4vWrp0npk22L6m33ify2eUZvKP3p+utLc107iFFlSTMZBj65o2tW9yG40MqgACTJ6fan6y2g7RUvPht3CfIRHl1/2q2IVoritcCkksUmd0CftmKs3LuxiDBYjg8mkaZDevIQsqh/lrmPcdTzS9Z3I1FtNQWFxRjavhM++ennXOTdE9H6h7dxO7CloQZUDGOg96z9WtwMtuxZdQy+PIwDjOf8imXe0LCFv4fh2BtAiABIicxirbag2vDfsaViVa5sDBpwRHJkSZ9cRXSQ6Ubu64tuCve7TDqxkxn3pLFe9JvheAFUkYH9auoLeX1NkIrgjwqFYeQgcVWfTvrWNxVkAlRsuiYBgTJmkPSqlsAm3gMCWbdwf+aU1lxpwDse4cjmJ8h6VNuFA2iR1J9aPcQkkjbyCG6V55a11QXA9q3IWLgGRPhPER61OzuwptwFJLMZgCuLBhvDAMJnPJ9/SgK22jdIjMFoAzUNGEqRuLjaYzugz51mv2Yq6glbxt6c/kCSeOhNaKKhTbPgcHHQ0onECDHwg9PamWz0CF0ndW1TTorW14EfWrBuW7On/mDaOoGRjzJpZdmuIgVpkjC/vVDtFX1Onu2++7u4hkqQfER04rXd9j0sa7SWtWqXtPdQK58W9sMPL5Z+lK7QK6KzpwiL3bAjcowTyATM1Qtdo3rdu3KKrJGxQkecmrdrVDU2CmvYTb8QdkAn0HSK142Bn6a8ReQlCCCSRJwPKtzTatG1QQLcCMspjg5+vFYtyyFsW7unZrqbSWuTB+nmR+1bfZzG5pBbc7FK7l25Ocg+9WcmgTqtZpRbRdTZeS+bbNkQefpHvTO0GP8ADFCTasmAbk8jjjzxWPqNTfvILVzuxda4ysrHK+IceUR960r91SjJaURIO0yQek/as3GY6Spft99ZO28DtxjBiP8AD86Zpx3aIFncseKOT7fKmJtcuHksxEwAATMSaUzkX1QEgLdHXnmt49mGLe7rVbQ8Lt8vU5nmrN7uzbaWncRPvB/vSEG/X3jhQLYhtuOtXL9sNZWTEERj0H96W4UizeAKrtDAYB6n/ehuydVYLeIszASIGVP1p1n/AKip0Vsn2zSL7qhsllHhuqVkx1j+tGjFrTHuLe2c4nOB/ek6ixY1BTwLO4GCMx1/pR2XZtw+EA8+cVKHwk5PiiDnMf8AFE6TO1ty40W00YazjLrtPI4HlXLphZ3G0rW/CRCmR0A9eop128CDZDoGKGZaINBfdWFwW73KCALkZ9vWK1PSihffU6hUTVWgoLSpU4PMjml22tWrlxFRGIIBMkDijVTdUrdLb8LLEEjqc9MTShZsbm/l7h02GY95qg09Vcvd38YttbAOQgAEcZABqu91dS/8rTXNoyCtzaI8sg5r2Wr/AA3ptQQDrbLweL9sFj6bgQao3fw9esoQmncIODYuh1+SnNY6dfGsT+Ht7Aii6mfzAMOffjihD21bZ/EoGVgDuRuvQY/r0rSfs97S7WlJx/MU2yfkcdaoHs6/av79sWkG5SQf3+f3p0LL9BtWzct7ZtMhnHeLieg4NFesXEuM6o21o3QDg/T/ACKDUafUC4jaeyWSMgYz71NxL9oNqG07heoP5PWjUY1/Yq5qSAlq3bbc7bVLYgjrH3pl/T2bqg3riubY53QR/n+cUvtDtF9KiFbhc3CNik7gBxMH9qRqtVetDfqUtOzBllkCj04jp603H6FkZvaumuadjqrOoFyysKABDLP/ADWdd0t22m8u1yy48Dp5eUdPavXaHQrq+zhe1Wj7iwH3BxdZVE8fFJPnHOaTd7K0pA01nUah7KksGS0r7upMkgkCPIVubZ8XneyriWyWIHEEmIK8ce9bWgXvNI6oTsIIVgcp9frVex2NctKwXUW2NwQFVWBOcDiK9P2X+GO1V0q2zpDb8Q8bGAR0z/nFGXc6PjXif4bULfNt7ZR7WWaJEYGT15NX4w5B8AHAz6/SvSdtfhfVaDs19Vfu2XVXPem2wO3Mkf7GvOaa+ADaW2ACpEgc0W/Y1o21h4VfDg4PqKWVYuz7SxB3BR5yatqO7sK4j8oIA4PkaC3ctteKG6EMSQSBnpznp96t6Kud1iQUgllM+/StNhu0dtog7pBn0WKh2RVUqwGYG0AEiOPsaG+xNpVUmZwfYA1TLZnYVMXVBkkkkxjoRSdTbR7f5RDK4ZsQZmoV93ebT8KzjMZFV7ve3NOwtQSzSAOmeT7VS1rS6jobTPEZkTg+eKncGARpDEhZ8jPX60mG71QAQuYE8gUlr4XU7HmJkjzP7ms3dFhrW/GEUILmSDERI445rH1lq4oNxmh7akkooHXma07ly0yXGBK3Y3ICZEHkcVWItC4d+4rdJUK55WOY6VqdKTanpbhv2BauHx7pOCemTTNJet6O2UZgZPA6fagv300+uAUW9qKQROODif8AOKRYu3L1ube0Ac5aPsa1O4vT9BuiXVh0B9xVY6Kzu3raAPmpH9auKRUFQZMA+9Y07bU4ABUXPCRBRwY/tVd+z9JdO5bCW2Od1o7T9sfUVotaDZgD2oGt2wM2x8qtLbA1PYt5A5091Wtt/wBu4Ixj8w9vKo/jdXp7fd6zSAoBG4rux8vlzXoe5Mfy3dTPU0D23XLW0eeduDR2dvAdp6GxrbguK9q3wQpWMxJnjjp+1Judm3ydpssSGB8K7pIE/Lzr3VzT6Vrm4o1t+ASoMVj6nsAah2ezYNpiCve6e8bZjjjg/ane2bjL28ldQXNSSQzMohlJJn1zxT9Fqtty8yq3eacFggOY+XpP1rfudn6i1YspduWXu22M3NZbI7xYwJAIx/g86tvsK/ea7duaG0O8Q2yNPqAQ69TBAEn5V1mU+XO8f1WpY/EXZ3Y3ZFltDoFOpEhzbCqrMCeWPt0nmsnT/jztnVHU3DZRXJC90Bt2DJDbiYjmqPavY2rm0lpnsoilVt3bLFVA4G5QRNZV/Sa+0s2NKl3agDm24aVJ5MZwa1PEXHOeo2+13u619Pf1utvQd2wo5NpIE7R1k+fWvPnS6+7q3m6yWQd4FxZH3+Vah0Opu2UF65c7xPgBG1QI6Ch12h1FlQrIqwvx7dxIPp9K5ZWW9NzDKe1ZlNpHN+7aJnwsYGf/AJ48qqomkvaoh9kleLZZTH/0DPNWP9OvKHUWyFdYl8gj0Xmo0/Z1rTAdyQ7SXfchJXPmRHSjejZlZ6WbZsk2gLV9VEE72mfUCMfWnKNMtq5udgqwUZrcyYjMNjjpVFAgcructPg3c/Tzptrvw8jR37twxtIO2PsZ5NGqzN/AxatAbt1oBolRuJ5mZiKWNPZ0bEJdtlWySHwJ9+Kg2NXdtuWs2lAGQ7xFLbQXNXb/AJ9/TqrCfCcemJmq410klM7sl2ZSrrByrqOSDg8Ghu29Nbtg39RYsgnh7wkYzEA1WudkX7zgWGLKIA22yAMR5Vb0/wCFrl9i19BII2tcwT8s/tTMFbLf2Z+3sK0wZu1WLdAlpn+5Ax/tS2XsUhz/ABvaFzb4m2WFwMceL3+grZt/hzfqhat6B32HxXCfAcesfag1H4VKajvtks+QltVZVPyiK30P1/3/AKwFu/hu2Cz6ftHUGD8dxQD9M8etMTX9iPI03Z1pEB/7qFz9TcFbdv8AC1/X6e7da9pD3TRtBC3CQP8A1g4rrf4T2LtW5atxzvVWk0eTcm5/h9TR5PJPpTVcHp9aSLTLxEUYBEEDJ86yyduXzFTjoRSZPT70SknMVIfAjFcAeuaHdFcGxzUBMgYQfvVZtF4t6vDDggRVrdPSamQZzQtqbC9bEE716hhzVE6bSM246VtK/G/TuUn1hefmK2GAFCbat8QHzFRZwtXVnu9XbuwMC6Ap+q/2qL1lbonU6UNAkFrYuD5RNXjp7RBgx0ru6uJ8LyOgNWltlXNDp74eJBuQWNt4kD0/2rP1HYNu8H7y718J2su0DyCmPtXo3WdrXEG5eC6zFAbOBsYpBkT4h7QcxV2fJ5luwTYW73L3Cm0bdjAux9Tigt9iaYMtvUG49xk3FnkBP/owK9Mbbb2wrrEqQYM+R/vSy3d2u9uFrQmD3ggA+/FW6uvpgWOzdCim/ZRds7d/dgj65q4ukBYRuUg46D6TWlqLK3gov2UubTIIHFVbunRbrXTcfcV/7hLAfLire1rH4Vn7LsTN1d05gkkT7cUVywljTsLdsABSQAg8qq3L2psWQos3Lr7/APqOAFA+VTc1Eoi7id/xEEKF85zSvFb7oWkgQqr/AOIEVG8RCnBw3z49qr973jtCljxuM/KKF7oJgjgn0An9qlqGBxMKdqN+Vueh/uPcCu2RB74ypH5euPL2+5quLqTgTmZFLS+NwW2SxU8CI9j/AM0Hf0fqLasgUXTbVRAIB44jPsPpVB9MjgAay6sEzDkVZfU3BxE9VHjI9xgD60Zcx8ajpkAUbo9vWg3BxtrnLx4kWPOYohuH/l781Mqx8o6RUiCpMkQR5Co3lcEfI5p5Ef0mo8R/2EUgrcIk5moVjHFS2wGJUenJoZG7xIQPMilJ3kE4pgc+TfSkG7J8IHNcSeZM+lQWN8SZOOgrlvBgekVXBciA2PInNCACcmffGaitglv0n5VOY5A9RVdGC4QkU0MCCTUB7lK+dCbasM0EIPhubZPAFFkCJx7VItrLThiR5HNcSyjaVBU8xn7U2RPMxQs3AAoJD2rd0ghWSOqMVMeVcyr3m1pAPBdf607Bwwx60LYHgaR5DilFDTjaNoYsOoMg1TvaRWu20YJ8clIzweav+Jen9K6ZcXG2llBCkiYmJ/YfSspQ1Gke4DynEeXPlVO7pnCzbKmOd2K2zcE5B2+XSuYWb6mRIOJ4qlWnmdRbKyrWbty7ghYhQPMngfc1Wa27pLuoPRLZhfaeT9vavVXNMCsJcJccEVWbs7dbAufzSv5ohuepq2XnAHtbVuIU/SBgR6UYW4CYj961NT2OGtbbJZIHKx5/LzrMXsnU23ZbpLKANrIRn3mrae2L+GSp9qEPOQG9KBXaPhPzpqhiPiAPqOKkgO0wZqSQRiZqSjkDxLPXFcVaelKKuKW+LA9KXsVR4dzf+1OAdesj1riWPAX61Ao7TAMIehAoQAWgEsBTo/8A1T60DMVX/pwP/GlFtG6OlREiIgepFcWSfEjGes0Mbh4ZGKk4+E8/KuV2gknj1ofCSQWg+9cR5GSakYHny461IYkH83pMUmDJ4z0FRvcSP2oSyr5IYRPrTC6kQGHzFU++kiRwMUT7QJJgmpLDEjJFCrAsYX50gXNh8MEe9Eb8jKnjpVtHFlgFiPlS2AztHFcl1Sf01xljCuOeTVtQlgZkmi3YBCgjrmjKT+Xp8VCbM/CeOlZpCtxQwABX/wBaMvLH+bMn8w4oGQBZBJjpFcqqUJY0IalgDvthm6Mn9qALuncSD5Ef3oSNk7Xj2xUd/dXCuD5luaEvkBYA8qhS4ypketEDPTPTFEDPPNMQlbGaLE0s8QMVw4jp1rYMxUFcyOR1qAfLFTJE5+1KCZjOajBGOaP4h1oSs5Oak7aNuMe9DsPX967aR6j71KmTjnyqRW1AfCo8z5ULWRIlY9qcyknmKHu2J5x5c1JXa3nmQaFrZBkMD71a2qDIik3QeoFCV3LN8QmaVjhxBFPaRggQaDHBFFJO4H81ECRwZnoakqozsBoduZwBQky5QyswOaJYglTn3pZmcGoDsAc45IFCWQ9wCZWPQ5piMyzmPOqpMtJwfSp3KTElR5GraWC5kkxEczQO4IEid3rzSlLr4QZFT3rAgMMelSdcUEkgHPSgNtQcmfWYp42uN0kCOpoSS2T4j7TQmgrh8qCB6iKk8+tVbd57oyJHkKeYtoSxMeXlTtGYjzFTmTwKUl9ScgADimqQwkcVpOHOTj1opPTI8vKgIgzk1wJIkZFKHM/2rh5fahDQc1MggnJHpzUNJMRmhZdwwP70XTGR+1Qc89KUUSR1kHGea5X3E5j0mKaQJzSykx1Hn1qSJUyYz1oCJMjFTLKRiftUwcNImoEtanzIImagWR7gcCYprAn39KU4PIIigq5wSGET0roBEcetPaYyAw8qSw3k8ADzNYpLOOvWhwTkwPOjKEyJA+dJY87iDQnGJPU81048QmoxNSIIxNRduIxxFHvOBjFQZn4ZrlTcJUcVJBhusDoIrkZkBAEj0qGXIG8QT1qCsEjcMdfOo1aW+5EWU2mIxTbVq+TuuGfOTS7N1LNokKS3Woe/dvEhZg8gdKkfuVCThjHnRjUqi5+LnApFrbbgEdOvBply0CZSAeo5pA1vK7ZUyKcGBAmcdap2LYPiJJYGJXFXJx1HvirYMUBjmSPWgZXGSJjqK5Wk+oojc2tBInyrURYbMkx5mi39T/8A0MihZt8yRE+VCqAmAuR1WlHCZ5riRNKuKFO9WmBwaFbxwSh+WRUDm4M/WlbcyCSAIxRq4djGTHFc22cNmlFAkRzUAB1bb7eVM3GZ284qNpK4GTmfWglkbQQQM8ZpbWyJLAT50153cBwfLmgzcGD8poqJZto8HlSCoMkdafcBUkMvNKIxPSsEphHBmpUD296g9Ymu2Sek/vUdGFSAcfapV4Pl6VNtWW3MwKEgMpJBkdagh4ZgZA6GgZEDmSCOmKkmARyTQklTHPzqa0NbjcbiIEHFMkLDKPF18qTB8UKccxmiBwCTANCWGtlwWVh8zXIHRlILKo5FHYuKh3E4jE9aK9qe8G1PCOs0hwvgvBRQ3XHNWFuADORHE5rOFqWlsR1FWLdpSdwLHyxzULDxcnhSBRCeYExIqO7OI6DrUMSCDAM9BSEd2fiLEDypylVkRk9aXkCM/OoLESQJFO06+zbgRAHORU4K4MHmRQbobxeEEULXowBAHM9fnVtGMkiTkjqopW50OTI6ytSl+VIYGPXMUyQwmDk5kc1JwugCSDA6xRkhgCp+3NRhG454HIpRILExEdRSjDk+KVI6gzQd0ArboBJ5AokctEeL2xRb1JAGG8jRtEuSEHeLunkjp/hqpcADSAYPkZq867liNpBFV7+n8W+ccYHWgqpA3GJio+ImBT4hTvAZZwYg0DW4ggyrUGUEkjORRKkZMA0UgFTieIqZAY7o9Kihk4JEHjFK278kxTCW5+lCRJJkColhIcbBjrBg1LKF4mOorrRLtJJ54ppEEiTE0AoN45mPSmjaDN1fF70FxtpAAHi5NdaUNtLCSQSTUtnq7MQNoAPJ6UasobwPMc4qs4CAbep8/SnaLIPpmkVad3lZaAM5o7ZBPmQIqncuuLxWcRJ9adaO6TxHlUNLRPO7mhgFvCcjkVSvXmF3biF4qxadiIJxNQSbRLFiR7GkvuV14j26U7dKmQMUVs70O7pFSIYQw3qoHIK0QuKSCrQBRXbauviFU3UAk9ZilLb3lZMSGHWotLCgxIjktJ+tVVuNIWcHmrNswsio6OASJGRPzFQ0N1yPrVe47ETwQTxRLlirZjgnmgGCVPmPeaLAEKdoHTzpKn+YidDRvi8UnEdaUXdiDsUT0I/rSmtq9pYnchkQMCjvsUVNpiTFNtLiZMyPvQi4hDNsEx71C21ZmG/IPAHSOKfcUBmUYjNJPiVbkw0xIqMLZWUy4x0NLuFiQfCJ8sVbI3IN2ZWc1WPhuMBBAPXPSo7f/9k=",
  "66875": "data:image/jpeg;base64,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",
  "66910": "data:image/jpeg;base64,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",
  "66904": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHCAkIBgoJCAkMCwoMDxoRDw4ODx8WGBMaJSEnJiQhJCMpLjsyKSw4LCMkM0Y0OD0/QkNCKDFITUhATTtBQj//2wBDAQsMDA8NDx4RER4/KiQqPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz//wAARCAD9AYEDASIAAhEBAxEB/8QAHAAAAgMBAQEBAAAAAAAAAAAAAwQCBQYBAAcI/8QASxAAAgEDAgMFBQUFBQUHAwUAAQIDAAQREiEFMUEGEyJRYRRxgZGhMrHB0fAHI0JS4RUWM2LxU1SCktIkNENVcpOiF6OyJmWDhML/xAAaAQEBAQEBAQEAAAAAAAAAAAAAAQIDBAUG/8QAIxEBAQACAgICAgMBAAAAAAAAAAECERIhMUEDE1FhIjJxFP/aAAwDAQACEQMRAD8Aru3XHL9P2hXHDjIr2y3UWhZFyFyq7e7f6nzpIcS1wWc08oiv4HaF4tecockAe4lRvvS37TdUX7QOJzDIxIm4P+Vf6VWXgFxxL2q3BxNMrID6nIre9M62n2hl77i0jjkVFVhOYnVtyQNJ8tx+FW/ErMGJLrvMBj3eCPLOPupA2s6qrd0xVgCCBnINN7SF5RmJT1H6/KrKxkZ+Flf9k/0P+tKzRaDLGB9gA/Mfmpo3CDqS4izzUH5VudxjJZWOt5QI0L43IB50DjDZtrRQPCpcZznOd/wpvhgMd4mHxnbJ6VDjsKQ2EaoztpuCclcAZXl+vSufjLTXp9G7EToOxli8rqqqGXJOB9sgVUftDZZeyrtnJ9vX4eAiq/s9xWM9j7axici4SYkjJXYknn05iodrZSOzBilyJDOj4PXY710yy3qOeOOrsXs5Daw/s+S4ktUFwzuEnC5z+9Ox8jj6VS8Zh7qzdXypB3z50zwfiwj7IW/DlLBmmcttkY1E/eRS3HXP9nnLFhqG5NYx8rl5VMyK1szou2oACrLs6he1jIJGHfkcfxVXQkNZSDPiySPU5x+NWfApVi4eIzIiSAtkM4GMscVqtXwQ7YYF/HoLlu7GcttzPTz519U7N8Dtf7M4HfSIwura0UKQ22GBO4/4j86+YcYt47q/1qVZ1jCkhxn3c61nDu2PFLaxhtksYZlhjCArqyQox50xykvZxtxmj37TUjNrYKyKWaVjnG+APP405+zqzSDs40yIAZ5nOQNyoOAPnn51ju0fHbzjLW8V1bdw0OojzOcZ6en1q8s+MXy8Dg4dw6P2cRRnvJj9o8y2P5eu/Otc5MuRxvHTZX3FbGwYLdXARjvpAJIHmQOVNwyLPCksZJRxkZBG3uNZDs4OCLfM1zdd/eZBDSghM77jPM7czvWqs+I295KyW5ZgozqK4B3x+Fbw+Tl2xljozg17FExXGIVSzEADck9K3tnSOK9ipYrwweVDTMdokDcXlBGQUjz/AMi1meAb8FgXrFqjYeRViPwrT9oGK8ZlyPDoTc/+hev54rO8JCR3XErcbMLjvcejqD9+qu2N/qX2bK9RXguRRimDtUSvUV02yEVqOmmMZqJSrtANPpXNNHK1zTTYCVrhX0oxWuaabAdNR00fTXtNNgGmuaaPpqOmmwLT6VzTRdNe00AdPpXtNF017TV2Baa8RRdNcK02AqVcZQgjONqjOhMRCsUJ5EUWFAIUCqFGkbCoXKSMgWJlViRgkZ9fwrNvS+3kQqgBYtjqedS00QLgDrXtNaQLTXqLpr1NhTt9Yi57Y3yrasSXUlsZDeEbn9dKq7Kya1uRFImIkOVIBx6b/oVuu1VzGnaOaEqDkgnJ64GKpTcxwlmlg1IFLO2kMPLG36+Vfncvk3eL6EknbNcZt826qrMFaN2Cg7Fgwx99VdleNFaxI6a40YZO/LNXQl9rjlRsLIiyuBjYDKED6GkODhY3nhkUlQzbZ5ivTjuTVcspulZY00LMpB71nTnnOncfeaRsZVtb3VL9jBDYp+/XF0rFiRFLp36Dcfcaqb0BLpkdToY7kHfB54rpjembNr5LuzfPd3PdsRsSCMH31V30d4I9ct9FOisGIWfV18qXWG3hBS6i0jPhmVmAPvAPOriHglne8JvpoS6vBF3iEPqBwCd8+eKlyk7JHeA3KxW2HdFAf+JwOlH7QX9tJw8xpOjuWBChs9TWaWHSPCTQbjV3ig88VrXaLzhl5BHYgNnWHbAA5A01xO8N1wksI9AyFB/mwKzccoij1Z+FHlcyqwW4wijUqsdjy2x5706iatOWitLGEwDpUu2fLNFMER/gFC4a5RCSBl4yv/yp0ISQBuTU26aILIIbogDKg405NbaCDhvEOCmSx1QXyJsI5XOCemGIHPf3DzrvaD9mnEre3WfhrCU6cujHqeeD+fzqhtDd2sXcXKvEVUgoy4Zc+/kK5+a0Q9q4g8pYyu9wdsuAxHzqE3E+LxZt3uTpPiZQo2Py+laHjlrDw/h9vcW7yi4nIAJOQoIySNuf3VaJ2X4elsiyPIzKniOc79cDGRU3JN1demIik4iZP3cza85wGxvVlBedobMA215KokHNX/Xn9a1K9n7aM5jcqfMqD94oEnBIA5X2iUltycDn76xzs8HFSjjXalIw44hOwPIZzTB412w7sqLtmU4BDIhyD71q3XhUAOsXkkbhcEgAUI2SM64utQK6Tt9r60+3I4Que03bGJgC0c6nr3S/gBTEXbbtNqEfsNq7AZJKEfD7VRXh+k59p9wPlUzwsmIqlzhjuGI+zn3/AK3p92ScI0d1LLcNDPcLpmlt4XdRyVjGpI+GcVQr+77VSxAaRNaK4PmVYg/RhWgliaOO1jdtbLawKW8yI13rJ9oeLR8N7QWTPCzd3ExbSftB+Q+BT619OZawxt/Tz6tysX6t/C2xrpXqKzp7W2zIC1lNjGc6l/OnOE8fg4heG2SGRCELZcryGPI+tWfLjb5L8eU9LXGNxXQM0XSG3FcKHNdNsaCK1wrUPa4hcGFhIGAB/wANsb59P8ppgrU5Q0DpqOmjla5pq7QHTXMUXTXNNNgWmuaaLpr2mnIB01wrRtNc002Baa9pommvaauwPTQ7gabeRhzCE/SmMUG6XMOPN1HwLCparoQAADkKFIqtPGp5jLj4bf8A+qa00IKDcnPNUGPiT+QpaPaa9p9KJpr2mryNB4r1E016nJFr2n4es3HriYnByBs58huRispxu2FuEUmV43/2bDwj1yOlbzjZaXjU6KkilOThjjkDyrN9qlkbh7TiLWIR4yCSdJwNulfBuPe4+hNe2T4bGhvmjR2KtEwBbGenlQ4gqcRUnOiQZ+dIWt4thxW2kZ8x6sEnbYkZ+lMx3MN1ePDGWDQy43226/dXeS+3LLW+kePwgwADPXcc84H5VS8QBdYJiN3QE/f+NaW5dZJIXYZVDlh57jP41QXjA2k7aCvczt4T0BOR9CK1L3xZlNWvADd2EUi3IWOQDKF2wvnnatPbcJ4pFwwpFe20sTxd2EbvM6cH0x59etZ3gfEZJbaO3CZVPtH0rR8BvppOJ3NpdECOKMPEUyDpORjHmMGs3nvtr+LDroZQfFg8qVve49p0yNKGAA8KjH303CqxxjvXCCNd9e2cdB61WtIJ793H2c7E16Nub10kCooLyb740j86JZvHGzuV1xtEVGV+vvpe/dWZVUg454qzWxEnZ5Jk1d5GwyM7aTk7isVr0atBnAxjbl/xVbWUXeX9vHj7Uij61UcPB/dnnlM/WtN2fj18atzjIXLH4A1Kr6Ba8ZubaN2W4PdoSGEm4FdubjgvH0MV/Eiy42mgIJHr50sY0mjaN4/A3MEYzQ4bC2tpC8EQRiMEgms3e2prSk7b8Fljs7KazTv7WN9LSpvp5AZ8quvZUd8ywgylQfEpOSPrRopJI5m7tiARgjofeOtMrNG+dSiNzyOTpB8/SsZY9dLKSMKsgTu12YZ2AJFANjApyYmDE4wZSvyHWrEzpESJGGV8RJQjbz58qG3EQSv7oMjfxAKPrnesabJJaR8hGQvMKWO/x2/GgC3h71iY2VuWAh2PpyzTl9xSGKPIjd9PIYU5/X3UlLxEyKGWyjgYrkvvt6noB1pxTaSwAkpKjrp/iaLGaiIo0lA7ttI8RLDOR55+VVrXU99av3M3fSZKjSdIJzjbI2OM1GLWoVpdSgDcH7Az03pwNp9pO1acM4x7EtrrMUEHiL42MSHlj1rF8Y4y3HbyAvCkOjwBlPMEjn7t6J27ilk7TMYzrU21tqA2x+4j5Vn1SfUFKkKMgZxnBr0c8ta25ySXZkzBXKFpAI8jGBt0NXXZOXRx+3kVj3ZJVsleqnoPUCswGka6l15/eK3MYz1rtlN3UiFvsg745/OkutVrLO2WPtzKAMg6aiJAWVSQSwJGDzH6NfLr3jvEZ7eRRcyFSxIyc4Hvpzs52mNkkguA8uEJjGepxt7thXb7ptw4NjxiT2dvalLDQgY4PMA49f56tIzqjU+Y51koePxcWl7q5iVMQudm2fxKds+i/fWg4VMX4TYOo2kjXVn/ANOfvrWOe70XE/iokV3UKg8iICWYKBzJPKt8mdO1zFRWaNwpSRW17rg8/dVBxntRBw66ltRE7yoBlhyBOPwNS5yHHbQYrmKxnDe2uZWXiUYVceExLvnPUE1Yr2jeUh4LcNCx8JJ3A9ak+SVeFaLaubVkm7YFbtYntcKN5Dq3A91ck7Zx/wDhWh6jxPy22299T7cTjWtr1YGTtRxKUsyOkSkgYCDC/Or+345JNZxzaYhjKupPi1AbkAdPhU+7FZhavqBcH95AvRpMH4KT+FUzcSuGcMs6qoIyhjOT59OXxpLi3GJI4C6XTrMMMirEBjpncnpmn3Rr6q1UmrC6CM6hnPl1ocB1TTt5OFHuAB+8msAO0nEQ4b2xyR5xLV3Z3V89skntcg7zxnCJuTv5U+6E+K1q6jWcaa5d2Jmk32yG0n6UNoyRl5rlj1Bnf86n3z8NfTfy09erLd3H5Tf+43516p/0fo+j9vqPGUJ4tcNkYBHP3Cst2m4nHBYSQKQ0kg0EZ5AjfA9Pxpzt1f3Fre3QhKpmQLqB3I0g7/Wvn0iqx1MPF99efHHd23arpFilDpgHScYJ8qkyx2d5HLACFlTWSCTuefP3/Sji1jB3XrnJp61toJ7aVZE1PHuhPQcjW8mYrvbEKpktgMdQxzBH9aShmN8L4YJMgyM884x+VN3VukTFdIG/nQ7aKOKU92mGweXX9YpMbvbPSPZ4RmSaMLgldQHPlz++m+0J9iWM6wdfh0q2/wAqT4aHteKCQo/dHOWAzseX4UXiaRyFpVjMmdz3i50+7PSntPbNNLmRg5LDpqPKhMd+Y+FXEMdvcW6OYEXJwQPfS98kMThY4UAx5HfnWlV2vCYGx6nzq+4fcf8AYZLZ2wG049wB2+tIRxxPKmpVVSdzirC1gVsBSScn3AeZqZTrR7WPC9EblXXYwlFPQHUMVp+y0S/2yyFkkPcMfCcgbgfjWT9pt40CKxOnbNWvZzjtpwziLzzrIytGUGgDIyQfP0rFl3vbcs1rT6HZRSRwnvwBIWOceVHIqjsu1PBpFCe1shz/AOMpH15VcQ3VvdRF7aeOZfNGDfdSoigyzGpY9KFKsvdxmKPVlvFvjA+Yrka3CjAjRRoz9onxbUAeMzz2vCpJoBlo8HBGduXLrzrGXPErm+uoYJUaOOMapAqjrvy5fOttdRzPw24EhAbu2IwM4ONqy0ZaCLUwLk4yCAMfAdd6zfLUNJMJMl9R08h9on1zj7qC8NzMxMD6bdsZEobJ+Bz9anDE2qR5JNTSE5wcj4VCNjFKY+9fOcb/AH1NroxNBsrySMylcBAoXVv8vnU/E5VGQnYYAyMbfKjRwSyurJbM6hf8QgAH+nwqfD+HyywyN4hMDspUrn3ZO3686oyva7h0snHzKrFlNtbYxjpAg/CqteHTI+pNOMY0kEkVve0aC04wWjMcpEEI0sdJbEajp6CqwzWsgcyfumG+lWLE+eOm1TVRim4fe99GXtFIQEKUJAO1DfhjWvd5QszZOCm4x9OoraxupR1iUyc8Ex4+oqZYMpSW1yOeTJjH03q/yLIxEdvMNepGQoMKpGMHHl86rzHcvcMVglKAnkh2r6fY26XLMiIuhd21+I/0+FWA4ZB/EAR5YNTtNPk9rNIjKQrqQdOpgdwdiKtnueLRcLSJJ5lSNdACkjkcY2+VfRV4bw4kJLa5AOf60K84dw+KHVa2vfMratMshVVOc52HPNa3o1+WD4G3GjBcJau6Kpy4Z1XfHqRvQeIQ8WmvnLrLKDCGcjcEbHBIJBANbId0sLqvD4GZ/tabhsn/AOIpnhi2cUiveQmGZBlGV2bbcYPrjyrW99HGMFw+x4lJPFO1vcra5AkliGSinY9dh08quuJdl7Qx3KRw8SN6pJjjlCnUu2/gyPTnWqvLnhhd2kihuGkwAEyrEDlz54q4sxbMgWNNLOoykijY49OtZ8U1NPkl72N4jazO0jQxwrlhrmUHA6b8zypJohHEWySUUK51YHLbFfYpeExM3720jkwMDIz9+aSbs7w+Z2FzZIqMMY7sY+Y361qZ69HFgeC8MTiFhJJFAHZThnWBpTnPkM5PpgV5uG+xhnuYlZk3MclqUJG3oCPPcVuTwmDhdv3XCH9nR31OEldGGNsjJGOdVk/ZvvpHmnkumkOPEXLE7cyTmpMpvs41nbuBpCHseCPNE0at3ke6glQTvjz259Kr5rZ2RZL20e3UnDsreIb567fStQ/DpLe0az9ouY45CcujgNgjlsOX51WL2Ql3dL+QuVIAkHn6g1rlimqAnZ5WJR7+ARHBwTk887EZA8utNSdm7KRWLXsm+BlQGAx8BWs4dGsPDreCUvrhjVCVlODgYzy9K400Ivo4GeQakZs95nlj8657v5dJGMi4EY3UCRHg70HW0Y145foVcJbRwRIokbCgADT5fGtMsURXKSN7zGD+dcPdgf8AeIvjbr/01Lu+ydM33cedpGyf8tE7pAP8Q591XzQAjfuCP80Kr9wryWyfw29pJ6Yb8DTVXkoe7h/nk/5B+derQ+z/AP7fafKT/qr1NZLtoOMz8Fn4tc2nEobfUGAy6ENuB/EPxIqj4j2Qs5onbhcwictldTa436ABuY68/nWP7c9pbjh37QuLW0yCe2WRcLyZfAvI/nT3BeOHC3fC7jUo+3EfLyZa7ST04bAk7PX0Ny8VzGYXXdgfFt8PdUoeGGE977QN1bwlDvt1zW5tryy4/Z90+I5BnTk5KH8V9P6E524Wzjle1e5MNwhwVfwlcfTp5+tc7lY1NVi+Jp+9BHlvVfE+mRTjODyq945D7NfPHjwNuD5g9arUt0Y6kGG8j09a6S9M6TnTuI9KkBVAC5GQVOfyFEurQqhUylgdsEAZFdu9Rsw5Opf8M+fQj7qVj4iY07oqZSuAC1TtKSe0ezttgTGG2OOVd4pa2sdjBcQzd48mNQOPDkZP1pt78uB3kGoDpnbHypW5lFzGkYh0op2APKtSp2RtoGk3AHkoPU01NOtoBAOZH7xh5+VTdhaq023esMRrj7I86Qit2mcvKcKefoT1q3s8Jl2uNo42YA8+lSgtXmyUbGMZGRnHxp23gXCPFIA2xK6c4OKse6R9LSfbP0rN1F7UJtZxEJEKsucbnBB+Nc4ZxS74dxJZ4WMckZwV8x1BrQJBEquDyc8sbAbflSV/w+OeJpIgBKqjB/XpTpX0+243Zy2kTK5LugbQqn/SoHizGVVSA7ncZ1MPgOVY/slxOwh4a0V/A73kLFQN8Ffuq0uO0cugpaQRwDO22dvcMVjTW41kjK8DK22pcGshawvaKVmUmQL4tWSSMfInbpVcb+7acStcyswOV8WAPgNqsuDTvecQb21nnUoc62JPMcqmWKyum8vD3UvDkVVbKvKwyy/+kfPen4bOGCBpLokORnQWGrOObeR9eVMtaWENwzozRsF8JZgRj/XyqXsUcsOInEMfMll8O5+FYacSZkcyWolZox9gAYPlp8+vWie3XkxfvhOngBUacaSfPfc8+nSrOFYo9IVnEGSSgYaMgY3oqyAN+6ttmI8TjFVGS49LHcdpJbeQ4kgggyjA4OYUPhGf1ilUt7dVGtUON8FcAH40n24Wb+991LGQrRxwHn9r90nX6fKuQStxAI1oqyIyc8kaT5H7q63HU25zLd0blmC6xHGFC7k+YqEXtF2wx9jqcYWm7bhrKC0wyGOcABd6sUtjIQV8CKNgcY+lYbes4IoowsW+canHM09uAQQTihxoiYAwfca9cNIIz3aBn8i+B91B5c6929N+lclU93lSCGFDUkodeFbT4l8tq9ZM7J4wABsPWgrSrCQ7g78ga8YhLIMAjfG/65VY3UWohgrHG21V8zPAwGkqnMHV1ooUkzplELAAb707bXlpYcEe6kgldo5Cu0hUgkc/IjfqKSvECykHDK25B5VrOGex3XDo5QhZh4GYHGphtk0RlhxjjV1dmK3VbaFlDI8kBZSMeY+AqxFp2paIsOJWig9Aqn6ZrRWVhb4eaXu0Y5wzJg49TRLq4s+HWrSyvhF6qu5J5YqoqOENd4EfFGimXkZVjKEn3AYq3SwtJEAjZowdwMY/KqK/7VpYwvNDBKyIcBiQT8hnNZx+315NP+9hIB/n0IfqavHZybp+AEqgS5EiL/DINX37/Wlm4RNG8jSRxNHgaQvhPr1qjsO01w9x30wL68D7QwB/w5q9TtfZJJpvI3iXI8aYcD1PI/fWeK7LG0QYDxzRE9Mah8xmqWa11dpTEko0pa6t9hnUK2XELu0/s176HiUVxAcY7n95nfppyeorF8TveFSzPNOXaWRQrhtBVlHIYIP3VOLWN8jz8NmJBChvLSaRnFxErIe9DEYBDlcHOc0NuPWVoixW88Fmi74MufXAB5VWcQ7UxhklS7S4C5wO7ICnHTb4VeKLe1lnVDqcsw6sM5+dOJLcMgLsSOo6ViJO1Usuo6ML0IyfypIdoZ2YO6d5zwoGN/Q86vH9pdx9I1N/s1+Z/OvVhf7a4z/5bd/80leq8f2nKHv2i2drN284s0zxIxdf/Gwx8C9Kz/D7R7O5S5sbtl/mBXIYeRI2rUftASY9u+KEXcqIXXCrjA8C+dUIjlVcm4ZveiflTca+vK+lta8akgnV0DQyjcld1Jqz7U3sV/JZcRtyTLJFpuEjbJVlxgke44z1xWaTO+t9RJ54xUmJ7vwnxE7lRyqWy+W/qs1o7dXcEfB3eaIz3MiIYSDjutJbJc+ufsjfbO1V3C4L+9le4Mlva22rSWk2APkATkmmLdM6tckh1fws2M+7ak5eHMytIJZGjU4KMdh5ED4Dek14jOWOU7oT8YYRvGED5bnggfKuf2g0dss0igKzaeQ5/Okcacou58qA6yFySnMYxjetacl97UxGpdJB5YoUl3MOoXbyqssp2BdMMAP4SORrkkqkljkHPKtQFZzcS5kbJP66U9CoQENCXC4G52pC1kOtgcDGNzyIq0QzCNEkXSoHhUUQ1bxYOrSEHMgDFFd44my2Ceg8qhqMVqzZGQuRk9elVELS3DNKzYUnGw51nyq7E8bfaB+FQbETbnKkbGq2SQxBWU5wcb05G+bcqD9liAfSppSkBW2468aqVEqEkevOrdUd4JJlA0JjUc1Q8UmaK8tZMjQB5756/TFP2JuLmEWEGBqkJL5IUDoP6elUOQ6pZVRAWdjgAVq7DggtrYT3dwkerYgHr5cx5fSqfh8/CuEQOksrSXR8JePdwRjIwfs4rWQXUphVxEGVsELIPEOm/kcYrnla1ISjsICuqKF5khJOJBnO4znbn94FOEGQhpTHGqHIjVeR2x+s0GXiSq49omUKcAKuPlt7+Xr5cuuoZhpkkDAhm0Y0kdM8zWWlhaNbJJ/h98cEYL7AjmAPOuTqGRjA76D/AAd4ckc9j1/pVZGoXMsaxRy5DatJwx922/ptzzT4jzAdJ/r6UGA7dEL2tnlzkdzb5Vjsv7hNiKruD8Tk4fxNJIstaysBIOQBPUD9chVj26gWTtRPIDhhb2+GxnP7lKzgAazkBdsAEjnzxnnj0Fej485nLPw8lnHJ9YQqyKxKkY8IHWpAE6WOy+VVnZQ9/wADhllJLYwG5nHl8M/SrJ2Abw7jpmud6unpl3NvM2MnH1xXHcRjUxGOm9cOd8kFcb5qKnvipRsKPNDk/r9cqgLEjLG7kDvG3O+cfGhyEsc+LbrmmCMDQCMY5kYzQmdi+HO4zgbD8KCakBtz796SvWDBZBGWJGMDG49aaLeEFTnPXnS92jPGjLGJJF+z577HB91AlOS0CSaQrbAgHmfKuWXEX4Ykp8RR9+7CFyxLdAOp86PFhoTHKwB0+Ek7g+ux+41XXKd0F1OrIR4vDnC+nx93PpQa1eJmdl0mQOpIZVJXPy67D51WdteJLLwWPvEdQkyuSQOeDjbfPuOxqssLoT2+oAK3JF1aiw9QOR2rl7w684tBokZVgkJD4ySo8+Q6etNjIS8SuYoSsUiMQulfFkjfdjvuSSOfny50OTtLKrNpTwBQqjPv3/pU+1PAIeEwLMksjEyFWB5HIJ28hzrPwWN1eFEtITLIwJ0rjOK0y2XZW/n41fSW0rRqY4Q5d4yxyCAcDI8/pWkm4agkDC6nUjfEYRR9VP31k+wFleWfHbhrm2kiRrZlBYddS7Vt5idW2KVZVbc2UDj97Jcv/wD2ZAPkCBSfsVlCrBLK2OeZkiWRvmwJqyk5bmkZuWxqDO8YiS3miuoI1jaNh9hQuN9uVev44m4D3hYd9LKTq8+R386c4jGJYHQ8iMe6q2WRRwOCORcuuds49Pwqt4eVQ8KCCMeLcE56Zz+WK4ndW8iM5bOoEADOwIJ+6tA91arwojUO504W3H2i3qcc+pYe4Vn++EZcGUKGGllYncY36HerFz/rVv8A2ta/7x99eqj7qw/3tv8Alr1befT7D2oi4hP2k4rPBNBDb28gDMyZY/uxnoc7Gs8Oz9zPcQQiZWTRkuVcCMYBxg4/mGw86s+2/Fr637UcRtbefuou8U+AANnSp586z3tt+sbzJNLrO0kw+1joC3PG3LPSuD2SZaPzdmHRrTurnvBctjJjK6RgnOM+QO1KcXsLGxkkhhN28sZUM7ACPJGffypZuJ35Klr2clDlT3h2OMZ+RqE15dXShbm6llUbgO5O9G5MvdciZVB0kvjzO2Kkcz/u1CRknAYnAz0yfKhxggkggf8ABRojI8gCvpPmBj7qF8Ka7tJLHiM1vKP3kT6WC8s+eetJm2uWmc+MpjZcV+ieEXay8GspHKu4iCkBQNJAwR8xR7riVtZQvPczJHEpxqbrt023pzeXi/PVvw0dyWiHj56c70RUt9be1RnIHTzrW9puOcCuJo5eF8Plim1ZklXCB/XSMgk/CsJxC7mklZ48AMTz3PzrpLWbIaZrYMvcRFWGdyM525U9Cso096NTHl1rPWcswn1S6ip2yNt6urcooCBwWOxqoeu49dq+2xI5GkoIisShlIG5/wBaeDqYwjHYjG55UtNbOx05fTjPh8qkFfK6yS6FPgG5NOxE9zvzJ1H0oQgWMeIYHl51GSZvsofE+wq1IruKHvLzwEsAMAE8j6UxDbzakS/d0Vt0Ub5NH9mQspOA682AzVrwyxSWRZ765CJGMqQmdPkfSpbpqRZdnuF2bzRyIkjyqdWk4I9Dy2+JrS3M0FsxjDxtMSpdJWYYzvsf6ClOHW1tZwBYmGlgWclN5M9Sf9KVvo5MmW1nRnHiiQY8WTvg9D7s865W7rcNTMsjJHPGGJjGAV5ry1bjf30S0Yd8o0MFBwpQYz6n0+WflSkGptCyXkrSjlESHCE+Q9M86OYpIJI2e4bV/GT4lO3PHwO+NqgYOtLpnjVlmKhceIjn7x5+VOA98SAcEbkqDgH6fdS1vcRXFsJEk2I+0vMDoTnr91eErpKwVSVXk6nIPrmixk+3spXtPPH9nEMGW9e5Ss/OJjZpD3gJmYAeDnn19w+taPtpayT9qZ5hjT3NvqzkD/ATf0pvg/ZiETxX94NLLvHECcA+Z+m1d8Zj8ePXt57Lln0ueFQ+y8MghlUBlH2R76cxqbxFtOcZ3rhKgldBIzvsPzqEjKijZj/KMda512nT00eod2hPrU1dkjCZxjYs2c1yFQZSQmnqdxmmZ5FCKB5428qAEb6k6tvviuv4lZ1GkDbGnP6+dFjjTUcDJxzIAApWY7nMbE89t+tFdt1AIcuWB3AxyqN33YiwoYKTliqZIHPl8K5BJrdWGB02UGu3rIFYd8dSkEbbjB5gkelQLIypavIDrRVzqONwem3p91U/dmKNlSQ4G6q2MEHOANtvlV1bJiAgy6/F4Qxxt1A+NVl6ncjFuoSNR42IwFzzwM42GfnVAIzHokcKC7Hc5wowPjnz6/fWq7PXhktlinlUSNkquoZYZzkbA43x8Ky5Vl71451ihAMhJOpiMZ3JXrvt6e6lrG6ihuO478yXRZZVwWBQnfI6HmDnp0zUDv7QwkvDb44wYplPL3D8azvYuPN8CjFSsBIbHI7fnVn2od7XsvcR3EnfiXQkbAY0EaSRufFnBPmM+VJ9jAqxTSnYaFUE+e/5VqMpdnry8k7bTJNcPJC/ehAXyNicbfCtdOd+lUnZO3ge3s5zGouf3j6wg1EHVsTzxvn4VdzpzPKgSmbBxmk5SdOcZJpuUKV6nbegMuwwRt9KCou/snH1pWdEFlaySsoTvBkONiM+dN3g8JOM4oEoJ4fZOcBUnzk++q3h5SuLO2bg/eLZjIhLrOvItrxjA9Kz2FEExIG2N8Voc27cCue4mmldSTJEJfCmW5gbbfOqzi6aRKoiWPZfCo5Z3wdh0/Rq4pn/AFV2gfyj5V6n/Zh/K3yr1dHnbLt26L2z4iWVftru238C+tZqS7gGzXMK+neLUP2oB3/aLxdQNu8Tp/kWqCw4bJcSDbA5kk7AVy4vT9tnTRxyQSo7iZSiDJPl8hRrdrP2Z7iSeMKoDBOrZJGwPPkarZVRoBa2pPdAgs421n8qLHCUtJImlcqxHhzsQNx9SfnWdLfkyNNxSxGpY0lyRsTjathZ9mwLC2upOIwxo8QdTIgGARnnnp7qwD2y6sg6dsbACii2leMyNcGQqMBdycDp7qvFjnfb6dbdo+DcEsUs/bu/kQnW6rq3J57bfWqLtZ2j4dxy1iSznlMsDkhXTCuDj67VkI4FePUXyvQE4P62o/cQ/aXmOhblSYROQUVnHIS0mog+W21MG0g0hViQoOhGd6lbzGPEbRsT0KnIomRnLeEeVbZL3NgksBVQo26CqU99ZF1YasDGcdPKtJrHiTBxz2pO7jinAXAyeRNBXJdK2MMCQucrnauteFSS0nXIOfoKjJw/kxDKDnnsMda57NGAF0L4dsjBxkU0BS3RkPhOpj05CuQsrEs2GY+tWU1ikVr3iS6d+vLf3UsLZFVSyq2jOluW9AxAWJGoAEDHkRWt4DAqWIKsNUjeJRvt0FZS0QNNgncAtgdcdB5mtO/HlltDLbWiw3tv4ysQKsc7E4z9rcnO5HpXPL8NYrWTvbRw9zFcdyWJ0yPpB9VB3PQ/dzqsMESSa42lXUhKxBTrAPXpzBxj8qDBxGHjHCRDcqcQuHTx+Ig89hz5CneGW0k+THbd9cBdRaWMkoc7YyN/fWfDSnuLfis11GsYjYkjxvmNtOOZU7jAHrTt5HPNal3kX2mAYEg21eec/D7/ADq5l4deqEbvVYuxcO8YZdQyee4GOeTgem1Ae1uVcFi4aRsB4rc4P8udsDf4fSgQseId4EkWJEifZ2x4gMbaQMZxnr5077XJGSbZgZVBXACkZG2N8789jQm4GiXOmCwuZDISVRZvCRnkT05deuKYjsbmJJUMEsNzziEbklemSSSOYxnPu9CqDjAmve36W8zK3ewWxkyMZPs8bHHlyNawqB7/AFbFYjtYz2PbpXYMGgitSwZsnaCPIJrbORnO+D13OP6b10ynUc8fNecaYWLMy5OAVGd/T1rsKuQ8TOftaskhT86kFxELgYYBSV8XwB5flS5dmcSFgRkHGsjHKstnUMaRAOScA550vE8sutpH1DPI9AfhUZGDFRnJfGT/AC/DlR1RVTBTHQgjNBJGbHIsR1X+tVt7eKT3DTJHjYksCfUbGnp5hbwHSSTyO+DvVVNpupQ0gMgKh987j0I+G1AVpEClIWw5GCXAU5Gc4BoMVkXbM5dmLZCAY5eZ6ioWskbQjvYm7p2OolcHY8/p9c09cMif93KkoAfEAuCfUjB2PTP4UC9w8dvBIsZzIF2VSCwz6daQW4aZtQlcjoNQ323+v6NHubbVPI1y6SAKQFO4b374HL0pS2t29mLNHIU1nGdnGT6fh+dAB7pYXbVBMulSuBIFBXIzgHbJ54xmpXi2qXgvpH7yeZVMkyuS2BzUL0G2D154ot22kZMa4UjUS5VgMeWc/Dnt1rk9sbmPuLsxsCW0lG0k5H3gn3b0QjNxVJbV7e7jW4RlXKFQdR6nHQeX6z204hw21ea3Re7ikONxhQ2NgPTb4H6BXslfzyYhuUVmYllc8tzjcc/d+VV3Gey1xZW5kFwZwv2ykPhTbkTkkHOQNunMVekT7H8SvH7SWFlI/wD2ZS66Qo2PdsOdfQbgbkCvmnZtZbXinDS6aG9rK6SAGGQo369etfSbl9J3G5NFs0QkAIxilZdsFevrmmJDzPlvSrk4yRgZ68qIr7zIU5G5FV98pXg9uwP2mbY/Knr05Xl0pS/WR+A2hG6q7gj4/wCtG8PJrSF7Hh5EaZ2Q6CsYPdjV5jeqjjVyLbiBQZ0EIQCd/sj4VaSRWzdmVdpI45ljONEmlm8WysOtIcW4dNdXUssMsQCIuz6sk6RsPl9a1Ez6hf8AtmX/AHhq9VX7DxT/AHR/ka9WnFuv2gR2y9uuKSOrPIXXbkB4F61n2aSaPSqhYgfsrsM1eftDL/384qRGSgdckD/ItUEAuFYCPbPTmazpseJFHLbamY9BQs2QOWKGqiMkODjGM4IA8jXpUK92ygt12PzzTSbSXK+IDbBG+Dn4VKJJBbM8LAvt4SOnkPWos+nbZsYyMZNKvdBZQVLRI2xONvfv+tqugwrBp8hlQFQ3PmeeKksyMxj1A55AHB61UXV00M0eELxhcAcyfjTMsTRsroHGoYOrOMeWc4+G3KqLGORoXKQqpYfxEEjPXr61wSvda221rzKDA2+NLwISrAogDLpDYwQfOp9w2nQrtk8iDRBGl0lJNGRFjVtyzsR9TQoJI2hLtA7K3keVcFtkKdeopt9rOTR4YyQ3eIoJPTce/wB9NGw95cMWZxuQrDl6fHFRFi7zvIB3avyXVnG3n76bRVjQEyKFGNtNfRuFcJ4PBYx3IQSl01d7PuFHXbkMVnKzGLO2D4b2a4heAC2WcwnfW+NI+Y+6tDZdjLa2KtxGU3BPRToQefqa2qyWxgDpIvdaQVZTsRjzqtvOJcMRBlY53Xcbahn6iuVyt8Okkg0XDLGOwMFoqxR40lYjkjPXOaqJuEzQqUshbuofUveFg3u65HPFcuOMxvAyWcDQENsVA33qPD+JnOm40p4skk8/mfOs9tC2nCWuJS/FILcBf8NIgcr/AMR3+FPNbo13HI007Ip0CNT4GI6Hb8d6bhu4ZFAQo2OqtmjZUjw6s+lBxNCxg6e78wQBvUNK6wV1EjPLYfKpaFO7ddsk7iumNQQduoBPr+hQREgYkg4A5knO/lXT4sqW1EDOnoOdERcHUiHHIeVF1EfZAB5Cg+QftAjZu212g3bRANup7lK2KKGwG8cYO4MeDnoDWO/aI3/65vycjCQn/wCylXfZji39qcKZGJEsG0hB2bPXGOv4V3s/jK5Y3urW4nZpDGiF1zzUgcvQjkK6kauiBomIQ5wTnPPcUaJFjJl31cjvz8sf0rpYLGWJ2GcEbZrDZRgTMDpKgDIAcc/wpgtpHjPiI2PTPrSXeg3RIbS4IJ0Nlm68ug9+PTNFuFmJEmNjkDIIB9M++oFbp1adnQAgAbZ2Y/jtvQ4o1jcyPolUxBWWQaTnmdxkHyx+dN2du0gKxgkkk6cHAHu5fH3b0UwRRoT3Clk3LHmwHMY+fLeqELSaRmmYzxMgwgMURC+Y6nJIowEElw6Q4Yqd1Q5CddzuKjCqurTdwo8RHeOPF0O3z6/SjRyGHVkFBjclMjOOvnyoAFTHKwaTEeSMBSCo88b6juPlQNZEzRoBpU4Gkfa2HyO4p1oywklDqcnfKYJwcHGeXOlLhQ6qFXUMY0Y2OfMVBExxSDJdBzyY9juNt85J2O3rXI7Cd5BNIjxRoMlVxpBONyNzkYHy50zaAx6mlbvGzzUAfd61G7d5LdkUM66ttX8J55GTnmBy/OgbDxWtkFLbjG6+XwPl+dZ+6v3iuSJVCW7jcqwwBvzz13H099WD3agqjFj3mwDgDp9aqr6yE8kMWp0Mzrgldnxvjkd8kbnpQEjsF4jxe0uGDwdwVl0aSzMcggsSB/L68utXtwDuM8q9A4W4gtiHV4oxldDAA8vtDbH5VK5QjJzuelWJVXKuOmc0o/XNPSjOcmk5hp548tqqK273XIPOg3M6RdnYwUBcyHBzy50e7JKnNIXvi4Oi9NbHGPWjeHkdXin7NZuLaLUitpkOz/aGMbdcn5VU8Wee7uJJrLvTGcbLkfwjmM1cd7br2UiE2vvUU92WhbCtq6NjHKrDsj2i4fwqGW34ijt3kgYShQwXAA5fkKq5TpgfZuKf7O4+Rr1fZ/72dm/98/8AtSf9Nepv9Oemc/aAdXbbiXiClWUDC/5F5mqBdT5wME88DA+lart0sf8AfHiWpcnWpxy/gFZ/GFGVAPRVFb0yGPtZZcqByNC7hdeouRt57U33bNJkjauiILkbZNVCQGNUcbbMPFkUKThazIdUhA5gYqyMS5ONlO2ANvnRGVWiChdvMGgpoE0zkygBYQukkb7dffVg8qXPJgUBzgDntUp7LvQPEa7bWa25KqOY39TQCtky7JsEG6kcvdTIj0sDg5NTmzHbu0ceoj+EcjS1ncxzoIxIBLuWABO2fM0QcRsVwcc9iBXmZUB1HT54qEt0VOI11LjnS75YMZAck/M1Wblo5E8bgMACnnqHLzrY9n+JW8fA5AV75onYRIYypcZGQM8+ZrB20crTiNIyxbbGCTWl4XYcUtZkABW2LZKuwwPd/SsZTaTOzttJrYXFkkSr3SugJQ4wh28vWszcW01vOIrlSjDkcggj31Z+KJXeElJDzwTv5HHnVhbXPtsLxmQK5XABG3wHnXLVjpj8sy6ZR4u8uVKlZEXIcMT4vcemKNMAbcRytqXTjBwSQRyq/itYvafZb1baRzug0aGZep57n4fnTf8AZdlG2be1HeY8LEEgH41Nuql4Db3Bm79SY4TsQeT/AA/GtEowdycdAKhGl0rhZihQgHWmxznlg9PjRC6B2TUNQ5jPKsqkcKQCwA6V3BKggjUPjXmIyGAzjzP41wtIWJyAByFFECgtzHy5V1ysaFnPhyOQJz8KErMXJLalxgjGPlUS5ZcZA8iu30oj45+0xtP7QL/P2SkGD/8AwpSXZbiD23GYYll0pOdD7Zz5D3nln1rTftZsA99FxFcnTHFFIdOBugI/H5isDYSi3vYZ1AzG6tsPI16sdXFxvVfYE1SaS85XP2SFIO/rRLkgx6IVZ1IySSFyf9K7EVVDLsNh03Hw/OgSKHm1TNqGrdQwAAPPl6frlXF1AtokjO2FXcgKx+I5Yz+vcSYFQGVMsMnSGxt1+POvRRxI0vewg76iVbBY43J5+g86lhhImULEHORJpIHw943NB20SHvVuZu/140rH3jEY+BwOtdnifvGcwukODpcNqJIOFGOo+Pp1okky2cGQgA07sdznHQflvQI83KZNyUTbESoNTLzxqz1x0x+FB22WOO60mARgplyJPGxwSuRnbcn4UC2aAsB3gYKMZUZPLlgfreiXCvFMvdQNoZxq66eYGx59PpXYbchgGLCPH2sDUOv50EGUd54yZD/O4yTzoMlqpwS8ejlyAI68/jypsSSICAvUb5J91BljuI1xNGRr8QO2QPj7qg5FoEWZG8IODtt7qIyRooXVhG6ff76DA1t3ujGGGS3ou3KjFkSVBJnuwQNGQcgn7+VAvc2kSMjRIxjbAI8v1j050vcS3FvmO3bJIJ0rhPEMY1bY2x5U8GZokypR3UAkAlQSMHcjbflmpFGOQ4VgNmZs45ctqBLhs7LJcTpJMy40Kr7h2zksD5ZNL3vaThtvxOWxvZGgnj0guyeBiQDsRnHPrT19PLbQgBcsqiNCI8nOcLnffc4rNcQ4dFx7hULX0oteIxMyiVwNEpJ2BPwxzyM8t6sSr1ZoLldVvPHMPONw33UtMmAdt6wV12Z4lZJLJL3KrGCwImGWwd8Dnn0OKrUuruM+G4lXHTWaqN9cxkqTikbxF/sZdS7rKd8dKq+C8V4aYnt+NQzsXJxcRzvqQY5AZx8wav8AikHDjwaNeDXRe1BDEyNqbON8kDGaN4eVXFxh/Ymsn1dx3Bj04z4s7N5gYqubng4zVrAOER2Y9qluXuQCToYBOe2MjPLFVdwIgUMc/eHGDtjFax8rnrXTm9eqNero4Po/bYg9r+ILg/aX/wDEVRCPA2x7+taDtpt2u4hncF16f5Vqj3O+MCpPAh3Z04DEeoqMcXd4Bck+po2M5wMV0L1qgLpkHAyccjtUBG4CkKmrr6UZoSXDFzgdBTEdvLI4EcbscbBRmpsLIu+onPltRMHAq1teAcTmAC2zqP5pMLVpb9jbmTHfXKJnoq6vyqXKQ1WTYMQMYx1yaS7pBNiNWBOwAXavpsPY+xjjPeM8r421nb5Cox2EMF0kMFvFDJjOMZB9RkfnU5ysZyxgrHg1/eSp3kJEJOC7AbD3VobXspapIolkM0pPIZC1oJnRLjMHIfxZ399C7wDKyHxcsnmc9alyrlaFAqWsRS1iSIcgyoA1TCMYzI7hgOXXnQta5IIyPIVzvAV0jwnO2BUT/XQhByCT0H+lG0OAWiVQ4bAAbTk9N6WZiQwJ2Ox35VD2mRdSty/mxn54ong+5Z0768e4t5EA1CNgveAdM4ztv86PZcVD3OieSMgFijBT9nJAyehGN6rFu5oij6+8j5EMcA+nI0S/FncWDTwJpljAJWMfaHUY2ztn6VnT045baXWrjKlSp5Y3zQyf4hnAHSs6/Eb3uhEYxCRg96mykdPd8act7+UQBbrSkwXxDX+PrWNO21lknBB1A+7aouCUwzEeueVVzXzxrqART/FhiwJ88n7qC1537bNgjGUzsT1NXjU54xa6go8ZyR1A++hvcDcfZI3OVJx9Ko3kmS6LvJlWXSAhOgNzB5Z3/GoMbuCOe4EmqNVwV7sNqGeWP1zqaa29224cOJLJC0qoZoIiG3OCFBGNuWR9TXxZkkjl0vlSpwRyIrcdqe1HEbTtHKkEaRRCGArHJEuQDCnl0649enKsbJcmaeSS4bLOck4613x3HO6r6VY9ouHJwSKSa9UMI1RkZsvnbO3PHPzqUfFrK5tjcR3cYt1OJenw3xg8/f8ACvljP3jAINgftUVSApB3z5danGLyb277WWVtqFt3k4bxAAkANj15eXXzqsj7ZXvfsZLeJ4w2VQs3h8t81lwoHqakNW+Nh7qsxibrSw9rrzvj7THHMuokKBp08vhj4VpeGXtrxJO7tpQw+0yFcMvL/TPKvm4yDvvkUWAzxOs1vrVlOzISNJ6bilxhK+pHRHNLcESnLEIE1eIcttztt5+mKs7e6iyqyaWDciD5jyIwaznB47s8MD34T2o+HL7nTgEDAI3OcH38qnczR28qLI7ShFC6iN2I5tp3J888hXNto3t7e4mjaNdAI/ib5YA2paW0ZWKnUMHGx9/P4UnFeSsqtGyrpQPhlIJ8x7+Xy603DxNVRjdjSuDkscA+71/XuAQj7sbbYbURnmfP7/rUFjZVDo4VlHJfXn76mFjnVlEsKqSd1OrV1HPljqBzokNt3Ui69UqZJIOx3930oFVTTA/e5YjBxhcE9c5/W1B7098VglVtxhWbIA2yRjJA38qauEdNwmcHGcEtj3daQeNZJirBoS6adUR0ls+eQd/htvQGOWGJPCpIBIYYznB5kZHL1qRsGa3jKWkMkEmpS8j52wMg5ycA5HL317uAi4iZWQHAUZxgHYA8xtyzSNzwyOYjeSJtX7xU2B8OMZ223+m+egH4pecO4fwx7WaxtljZTo0FtLahtuFwOvyqj/ufYcShSdLlrc6ThY0RxgHbOlsZx6064nd2lv7eFra3BzAqh2fGyHJ3wFzt4d/OtdFCoTQFKggHwncHnjH6503pHy277C8SigM1s8NwnRQ2lvkdvrVD/Zd2LaedoSqQMEkyQCp8iOdfczaL3Z0NjltpB+nKqPjnZu14opEoKOoIikQEFT0GM4I29KsyNPkSrjfka3fZifshBwsT8SgzeJ4XjkDSB/VRy+eMfWoD9n95vqv7RFHVnI/DanY/2b3Jj1/2hGAVBwYzn763bKzqof292U/8nvf/AHm/6q9R/wD6eN/5mn/tj/qr1OjVWPbMH+91/j+df/xFV1vw29uCO5tZW9dJx8+VfWruwge/kndE1kjfTv8AOuhIVAwvLqTWPs0vF88tuyPEplDSd1Cv+ZqtrbsTGuGubpmHUIuB861evxE6Sc9fKud4MZY7nltWedqzGKu37NcKtxn2YOR1kOqnYLS1tYyttAka5yQq6dz7qlJOEBAOc1DvsKV8/Ss7XWhjjGQMYrjEkZJ3oHeHkMgVBix/i61FGd1C7tg5zvVZfyI9vrkQxHOkADdt/PypvI6b423pW5iWV1d3wqAg5Gcg1YxlLYqo0MuQrHVjOnTknHSozxhkWTWA3WPbP9KFeJLZzwBMAkMSVzk74+40NpIwSrN8K6vJZx6opkzuMKByIHOhSSqXwzZxypZ2JJWPfJAXGcmu2cLXk5htyHmGcIOZ9OXxqElvhIynOSykdBg5qQ7xyCFdhjfKkZ+Vdntbi0mCXEXdkkgasbn8fv8ASpTSx5YrODJ/CMEZHX8aLcbPLjW0urGNAO3PG/rXYQivyyw5auWajFLcSRMVjdoznOORx+VDjbQ+wLI3PG2PQ1aY6l3TjJdSL3ihFc5WJ9WjSdt9hyP4e6uW082kLcRpKNOJGTw88ZbAFBE7MyxYiAB8OTg49cfrnR5r60e2Olo/CwDBhpOw+0Fxyz8/OsPX/hK6sr4XVvG1y7LKSCSutZAemOh/WakIBHOY4oo0YjLSAsFyei88Y+lFTi/KYqkUUcylHTKDA3OdQOcZHqM++leKXsHtzX8rrHbytpZ4t1BI2Y7nAJ8uXrWnPOXXRrSIx++QMDyGrYjy3wD8fxpJ7cC7t3iupY4ioGosMKP4c7b8jz3Pu5Mw3BChJJe8BHh1DBOPI8s1CWSMFpL2RNKY/c4VjJ6b8hn/AF8pYnx5XwV7ZcMS+Uy8PtY5Ln2eDMkqYyDGowNW2cY5cvfWI4X2ZuLu7aG6jlt1T7TFPxJxX068uPaGS+KlFa3iKxgajui4OR6b49arO9Z3EsjOGIwBnGeXzNWXTrrb5/xDs9e2k+iC2mmhJ8DLGSfiBypZOE8Qdgq2U5JGRiM7jnX02J1mkBZsDIAI8W/x2+7lRwCqlYiCx2Ab443/AF1+F5VOL5pZ8B4pduVS0kRV2LSAqB86uR2Kuu4VmuYRIzHwKpOBjzrWqjiGEa1ZdgSCdsY5Z99HRHMcjpjvY2IxqJB8Ixnr1qcqaZWz7FhJkWa476YnwwqhGff18/Kr2PhcFsxiigjRgdARUVsHPMn7/L61YiznZVkyoc5DKvL+vI86FNEixqRGm25OMjfngddtqm9roG3EwndYZAplOpW0jIOd23OASAN/U+VRkVJ5SBG0oYly7kAPz3wOY8hvnptinpEjMaow1rqwQGyp6b/lj76HMh7kLJI8isurTCNJG2Cdx5Z6ZOBvQINKySMs0iF1Z1VFDE7lcr1GcjGx+7YtzGQ0EUjiHCkDCaRITjlnngZHOiW0TpK5TE4C4IUBCu/LceuTv0HwlcrHcSxxDDRaQHUNr1+4b4+fz6lLyQxwuIpUAGrTgKBvkbcvPf4dcUwbt0TVqUFt1BbOofLPlQpZAyaV1qGdkJAK4Oxxv5YxjfmPKhia2aF1gWItq2IkDMANsMfhjmeXPzB+1vGKvHeELJjKaVLK3oWxgGuu1u2Ar6Tz9KQ9ikkZ2lkKrsS5Y7bZ/m+nKhnhk8YBjmZUJAGg6c8sZ/KgskiimUAAEYJyPzHuoN0WbIZiM8iG6DYikrqe5RzEuFGCc4BbPoM/D1pSa8UzJG/fLIz5SM7F/CeYx/mzy22+AMSC3GRa3QczDCo85yMAk4O+2PTHoas+EcbtuKWum3mdriLHeAYOg7jn1Gx3rPTzXiWLvbAvKpBCs38a7FQp88n6etWnBkPCuHKk0EUaAlpDGoGGJ3yckdfPpSjTrcIpOWO3PUMEijMFZHESk5B2IzVZbXcd5bJNbyo6PspAG+Mg+flRIzKhC/wKAAw6+mDUB2hXTq1ssitkbnGfUZ+/zp60nDpkHJHruffSJkKjGN+bDyHlUpLhYVyWCk8yfDt76C67x/IfSvVSf2tB/tov/cH516g0t/IFnkBJBJ8s0j3pxpAqfEZE9vmUMCQRkZ5bUrr0rkYznGM1mrDBdkxr69KGz8t8GvSSd4m+MjzoHMZJ3qA4ZTzyaj3m4HlQS2kYxmuYkJOF2PTliqJ6xk77g8qiZFCkAgn03NRcohAGSx9eVLS3AQr4WfO+V5AedA05JzpXYUGRmB/eHKnblQZHDSMYmEoQY1L1yOYOPhQPanBUSROyltOOZ9+fLlREbqWGbAWbRIo+zk4bfcZFVjMjHUqqWJ5Yo0sX7g93FqSRdkLaGTbowz8tvfSsERiKtcSSmOQ/yjWo9QByH6Fbjh8uPsS4udUYRoY9KLsUXBB9/M/GurNOqpKDFsS+vZX/AAz6UpcXEUcStFEZdsltWwA9M9eVe9oZIwzowLDI3B/RrTlLTZmWWXvJyzs25bGT6VzuRPKpiQs6jAHLHv8A11pNzLbAySxuFbLA4xtnmBzpiKW5lnSKO3MitnU7HKIuNvF1PkKGtvGSZG0xmQEqd0fTjNcRpHRidR/y0WeZjKy5PeIo1KB8K8iSTYYo7jbB07H3UQS2y3hmgQ5/jA8Q9Bim+5BMveaCFLalKAldvIVXozEkFWVgevOraOEIokeEd9IAXxuT5Z9axk7/ABW60Wvgs9uiGMFDuW0csc9iNuv3dap5JLiydZLRRLEQWkH8KjPryA9dxWnERLF2QIVAxr2qu4vai9gJdnjAbIaKTSy+ueXzpK62FbS1tlUG0Rrck5a3fOB/6fSleL8Nu7217uMmGQnWu+ykZ2PQ7UKJLy3kSO2MVxbxbKobD4HPGBhhgEg7Vd293HcQK0y90wbBGTsw9SMjnWvDncZbsK1hnhhtlulHfG1h16GJGO7UY+Qxkf1KUxdljTV42OyLtk5HIfTcZP0q24qSLwhBoIgi07kf+Gu223SqiIx3N3JGFcgYB1p4Qu+fQ9KjonbRswYx5OwK622XG+wPqRzxuaNra4jDEIipjKsfsjqT5nnXmOthGww/2mCrpUeQ8s+m42rkdvJG+pScA6cYwE6A4HzqK9JIBHqBJc5wWO2eW/mOnu9wo8JElxpeUd2hydDnxnf455fOhFwJCoXLH7JXIHM74x9/yoioGkYqmFyNs/rzogsqmUgRjScHLZI1+mB/SuCNkgjDyJkAAqCM5PIZxk8qiDrRVYHOMDw8/Lf9dKi9yXnHcQDQmwwc5ONxnHoen9AJPEDbq7yB3DAack6h92OnuqGlUdj9sErhAjDOxwRp8z99JzNI7SDwCOMDLhSp35rnly+O1GkMTvqY/uguqRde4HLAPMb/ABO1URD9zPq0sGC6sEbczzz54NTh0v3iMxMq7MsbZHry65z67fGpiZkEscUGhcB1JQkgbbjBz/LnYb+eKYWeW5yb6ARLCMJAvhVVOMjJxvigQZo11gK0aYBLsxHUbc89DtyqTHICW8Je4LfwHBflnbHTbfO2a9cIoYNMSSVzqH2gME7Y921KtbtcZjmVbeMnBB8THbG+x99FNZlTSjNG4IK7MV3HTzz7qi1upkkLGXUi50qx2O2Nidjtn4miW9vBqK6EXu+XhIAyeW/6xjfpU3kCTvH3DywgYeQnY77gDry57Cgr722uI7wRSmRZCuoE4TvAPU+/kKWZiYI/apgU14B0qQc55bbZ2HrTKmObiI9rvwsK953sTqXiUZOCp6Nyrvc2Nk8s/DR7ZDArRCIMDGSQreHGTnp8TRFc1/PG2iGwC2ynT3nTmG3ViAD1+B5E1Ph0dugXhqpCHMZzBNIJA2DkMRuTsTgZwME42FHSeRuGRB4VXMbBodZ7wsDyydsbdSOdFt757uONbawQyQJ3AlQKrDJGpdJ5KMEc/L1NAazt5+G2SWdjHBGiSO7sgznOSBjHqBv0Wn7WSdYlMxfWTjffp0/pVbBZcScOpmltI3kHeIQJGZeWzAnHuOcb1ZmSWK5AleJI8kMI5QxQ58II57jJ8hUUeSQmNgsao+SBkZOfL6Vm07YkTTQ3MXcywjDLIjE526Abcj6bc60rSqyeAagh8THHX31WcQ4VwzijEXsCSySeAsDpZeuzDn54O1UV396Jf95t/mfyr1D/ALgcF/nuf/dH/TXqvSdvoPFNC8WnVQqlmyTjmcDmaAqnHMMCNvKmuM6V4hK0reEHIGw6UgZDIhwrCM9Rnf4Y+dc/bUGDOD4snA6Co94uc8/d0+lLxSOJtPd5QDxHV9NOcjl99dd+7TX3OvG+BsfdnlTQYaQa9KjSRuTy+/NDknl04RBICcAl9ONx5Dlz8vjSMsfEpL+GKCxR4mAZpSy/u/PAznPLkaceGN7wgyrqQZWMMeXmw69cUR5I5jM2cFSxOljmuosjMQozGw0gbYG/SmYF0qqkAaRgYGAPcKO2ToAUMjNvny9PpQZSG+hk477MtrcFlkKtqLBVxlc6c4Ixjc+W1XzW6uM9B0pmQYQBVGdsDoKHnulctp0nGNzn4/WlqlJYxHbGOEEBtlKJ9kkc/dSNvw2YK7SLqRVJGDnUegq3aQFVKgZPyJ6UvczJBEgmlEIZgiknqeQFWVjLGXyzzRW6SKArJuNaqMH126GiXDrL3aICFjyNRG+46/L600vCYwrCaQ5B5ofrSt7HJbMEgPhcbjm3x866SyvLcMsZsGK2klJY4wnh1sw1D86mZmMLAEk6iVBfBx76qIlu470lxqBJDacbqev1q4tLMy6tMhUb/bGo/Q8qp56DS3lmj7+6YNHrxpI8QPp59OdWJl1IChI5YzQLiORe7hgiaWNGJcqCWxgbjoeRqERk0fvEZdQJVCuDge/eo1diNpkcSFircttznz935Va2QDeNg2oAgtjYEY+8VRMwXLHwk+Q51G44pJwsRWk7rrkkGrvsKoBxnB5bbnJrOTfxzvbQlDPko4IG2++PfUZY+7JGVI5Gu8IjMNqCRgOMsGwc/Lajyo4OcA9PF5ViO6mFhCl0k6B0ZAQESQ6SCRnbkPh5mjTxPMrR63TYEMByP49KekiG7ZAIx8aUMzwM/wC4mkjUasrjODzIGenlVAb/AMNzD3pw4t4cjPhU90tLRwqzGCLumt9ZXu4lCrgb9T1B59cUxxULJxHvNTBngifc4wvdrzz93pScYR7czzOTGTofXtkkk7ZG/Xb/AFrQ9BE11KznIRMqSy/aPmu+CMcv0KKUARirnJAAwcnbPL/SuRSlZAgUBB4VGNgF8uX51OXBJjfmfFpA2PLfHxqAYUsuVwmDvnAH636imLSASQNOmgREZRiee/LJ6b+fSgK8kx7qPm+duQO++/8AUb142rQSEsEYEHwqxyBy/GqC63WTL8wqsQdyByG3z+VEjdVjMo1MRJpYcxn0H6/Gk72CZUzCjW6MN9WGD5xzGcnbHyHnUrFpXJl7pzIFUMWOpcYblj0b5+VASGa4MU7IRpABKggYXJHxyR51NHzCZI2WbvFDMwwwQEbZ2293XypLiF1cXbrEDKkqLnVjC5OMAnYZ2I+VOd0qRMuVe5MayN4Bv4dXhbOCBvk554ogbkAw266SAdZyWGCD132PwPKomGVZe9LyGRhqBbOQQScAdBgDzP0opWV5UZH1Lp3OdlODnntnwjzxn3UN8Nam3GVz9pG2OM/Q89tvIeRDrhWTRpQeJSFznJGck7eW2OddmEYlAKgLtrywGDnmBj0xjbrXpEMrGQhn8W5OQm/LLEbb7/Kl72JmjZiDEy5BUYZiTnCj12+uNs0V2K4BuWiluDJltCY21sQdyMZOBjyp3SZGk5s+AWG46EADfyx5cvjQbGDOhRLMkgcDXqGhuuNicbD3b+oNL3dt7VxHuIQItI/fXQAJjUjfDHkdt/Ic+lQdu4LWeF45Fi06ct3h2IyCds4Ow+XWq6xitILHRZmNUBOZEVRgHOc78+RHu8tqavOGW7Rm2ISaKNBGGVjhlGCN85zsOR9KUtbW6sbBobN4cOhxrXJOR5kff86qC381jDNE0bowtzrWJ2DsWKnC5Y+HfBz0qHBOOxjh0cbsyXAUF0cAFmKjOleZ3PzoHGOFR31wZryZYu7276ABSeQ3yN9umfh5n02twsNtZSwXMceIkhlhwyEKclSTkbZzsOm9FWnA+Px3sErSqYTDIyPqGCuD1HuxSPDeKWNrBxD2m9jJFzIcsd+exA5np586U7m6trYNexsZSSFFrggZPLxDnv7qJwrh4jt+IrLcNeLNdYEMqgIxwCdQKnf3ennUQ9wfiUXEy81oJBDsGfkA3PHq2/Tyqd1wu5bisFzHxMxxpJ3hi0DkOYBGNiPPPOmeF8MtrThtvZqhKwNq051rq55wQPPnsdqcNuSSCunOBqB+tVXe5k/2if8AKK9Xu4uf50+X9K9QXPFtUnEbhU5htIyhIB0jc+fPp/ojGJmd4wyxumdWlcA+W3QYPnn3U3xi1li4rcXEc07LIRmNiSo2/h8v616NGhiJbDEjcjmfOs0hGOMwqdgCxy5CgZY9fPNGRQ5PeLgjG4NQhuVmdk7iWJT/ABSj7R5HA8uXvzR9GFydKt5eXlUUObvy6Pay923IqcgMDj4/o7UdI+TOAXIwWx92/KgL4uhbbO9FjA0kAjHr5moaGjXwgZ+Z512aIy20iFmXUrLscHl0ND7zSVZTg52x1oneaom5kjzPxohVsKM6jnkc865KwZM7kY5VKQYVuWD670u7adIGkk+lFSiZkwHATT4QAcjFdll0gEhcBvEWPLyocju/IcjgjpioSFHQpN4iccvMcqoIyYXJ6/X1pe4LRwtHEoAYZJOCcbZ51OR2JITqQNOMjFeyARhSWJPu99ajN7Vr2668JEQkiHQdsc+efOkRG1nGVjkww2xud/1ire4hEpB8ZJO+k8sfryqDlUjV3hxqyS8Y5H1bl1+tdJXlzw7V1rcyT60SRt92HqaZjje5AW4dgqDCsTjO/KmzBCyB5EWMOn8C4I39OuaDFaNMQjq4gU6h4gWzv6bjl8qlMcbERAjTpEq7jBdxv65x0py+kBtxJNGG1+EZ6VKSC8uHTWRGFbKn088D3ffR7pwquMZyBtnmeVZrvhNAQXDziJIlXuiclwxGB0AGN/n+FOo2UO/mCT6VU2kqrnJ2O655Ci62uI2jJkQZ+0gyT88jz5isuhi6KzxmIh4ySNLpvv8Ar76qJrlxJPPh1OgRkk4CjJ+yTgHnUbHiqzcQlg0OHhDd3LqIWT/hAxz5cumKnPNcXcq+xZdCNyr4QHfrzrUjNevpY7S/ijjumWU2cKAFctjulG+epoACsiKupYkU4RSck4xtjYZxjNNcSiReLB+5C3K28Qkk0nxnulBOdum3wpe2kGpWMaspbGrSTr9P155qKM0igRxRHCo2wxsAPXPn+j15IX8UbO53OTyxv0869FG2hdWEGjPdr059f0OdRKLCndgcxkgDfH5flRUSo0ZU7k8gAR8R8fdR4EiLgMSITjXgDc/Hpt9Rt1peFZlCvBN4pG0tgtkjyG+3MefWiIVZNiQDzGrAb0APuPLy8zVRJ2fvWMcGxI8QIwd8AAAYJ+GN+uM0e2CvGJSRlRpOc4GeuB+vlQ7h5GUI0IdgpHj2GccxvjG+ffXtNsHlijZw64CRnblnVkADy8utA7HO7R92qqSyk7Ddfr99JxH2eOcRvNhPD3aYB2IJBPTYbgUWBsWgkIMbOPcRvg8/1tQWdopDJBGO8LhlbIJAG3I+4HofWg9cFmyVhZmfU5ORsvpnbmBy/qIMJFQsrZye8J32J3AJxv8Aa9PuqKEyoyskgmdyFSNS+pc/xDcDYg/1xQJIZn4fG6zrlCpkl2VgOmQRzAwPXnQFRlLd3A+nuwWISQknB2BwN+R59a5dytDG6tLC8C4dnDAYB/mHTGcY3FLSOYhJPLcNPpYnX3Qkkk56QNO3n9CSKcn9kaJWbSyhST3rasb58zuN8EculFCtZJri3Ui0dIxhjKu2M8ufuOw5A8+VNNeG3YorkSKuQinSGOevPO+Bvj40WV2PCZIYI9K5DSbFiFBBAyeZOOe/M7Gq+4mLMFi0SSOQxWNtQHkBq92fKpAeZ3ePWyn7WcEkcjnAUevz8xQb9nSYyMwmjCk6SNJGOZIyOnodzTCjvSO8ZxCj4V9A1vhivwyPv94pSaXNy7W3CSZipxPPGSScEBQSOXPltsPOqAgNecOBCmNpsqcuBkbE9d+W33Uve3Js5IENoxIOtmVssAMeedsZ3BHvopF0xR2IE6K+vBBhGBk6sHOTgeeN+dIJxSJ+Nx8Pu0SOTGAWBGpiRgeeNz+hsRdgTwwQ20cZ/wAIu8sxGXJPLScsOexOR03rk8xtJDK4dVIxqxnGOpA9/wCuVRnuJoIJnvoJJYpThyqhtAGQBgbnlnIHUVcxXicZ4Fn2mJ7hRnKDPctjOD8CM1BRdl7m4v8Ait7KZ1msdKlWGft5IxpO4OBy36edagBVOTKrxHIyD4gf6Y3rG2nGeG2N7JiA2lxIrd+xDGN2XGCMbHOc59a10axyQkKE09PI0oN3kX8o/Xxr1L6V80+deoq54hHdNxafvLkGAkd3GqY07DOT1+lK3cPtLxxCRoxGQfA32x5Hblyqy4ocXjg7gkfdSekRA6MgEn76lIhLCcqVLaVHTpQJ4ZtREbqCN/sk5o007LBI+ASq5pCzuJ5tTyODzxhccs1FNqO7CkgY5YFFGCuVG/voYbYnn1NchckBuWOlRUupUgbGuxnBOCCGP6FcdVVi2N9Oa5ExLsT0UED9e6iOzKQr4xg7UoSivgjlud84phg0fdo0jSHbxNjJz7qQkijS4kdIwHk+03U45Vo2K0hLHA2PnQyreEKM12Jsq2wA54FTk3jKZIDAjY4NEQTSxKhhrA3A6VCa4SDCMyqOrO2AR+ulBtuHJbK3dTS94w0s7EE9eQ5A/CjlA0Ka8EsATtjeqjqnfPU8wDUnjV00OupSd89aHgeI8yN9/SjrIE0qFyW8Oc8tqGkHXZlVhnrvyGOX686B3ZQ64ZTpU5aLVyG243zmjpErO74Go+EnG5/W9fLx7XJ2glsxeOFWUrkrkHDdRVktTqPqoIQqf5jnA5ipwlMEjGTnf7qUOfZ2AOCNgR0qLSNFgDckYPvHWoqT20UzkkFCG6fWpSLHFaMrHCLuxJxy61xpM23eldx0z60OOZpCwIAPpTXtWc4YXju7qwTEksn7tm56F2OrlvsRjbcmtPBaLHsCVIAQ7/axsCfXFVccyxTW99HCivcQoHUeg2x8/oKt5C2MhsZO23LalSEeNgjiDhySBDEqKOZ/dr16jNV7yTJbFLeIPpbKCQlVB5b4zncA1ZdoGEPE48KCxijOeX8Ciq7ht201qW0hdcpXn0BON6KNAjIA1wwbSSNKghNIU4OrG5JH15UJpO5jWUsFBbLJ0z6+m48qZ7vfu0Yqztu/M5yN6WCu/tTu+pbcnYrnORg4PTOBRDENu4t1ljYTRfZLFhkkDoB5/DFeKyqVeQPoYDWDuRuc8ht8aq+I8VaLiM9nbwrHFCI3IznWxxuc+7p6eVWkjSzLGgfSGkOrbJABxgdBvv18qoNLFiEMkgUzLpbzx7yMA0vFFcS3oS1VIpJSzCV5OYxkc+hyfUb88USGTvu6YqMp1O5O3Kp3NvHPesrNKiOjMVjkK4IBAx5fZG9Ajb299cxSRzLGp73eQSfynmSAPIjr03wKjGoC5RCJwNUhDliNmCHkM5zkDHU46GmbiCL+yVeNSgV2jKBjpYDfccs7/rNEC5cOCc6teTud9+fPp9TQL2bXdhcI6zIveBsITvsRqwB15Hcj41OSS49jzGPtjBjjIILZZQDv51KBE9oL+MljGpy56jVt5bnpvTN8j2/HRFbvoWKAnJXLE+/3ZHxoK+G3vlvrYSSe2CIFpIiT3cORjUSQdWx645cvItvHhBK8jyd2ARIUMepsbHGcDOx6dN6I15I0ctvCFij0MG2yWwoJ9BnlQOHTsLRyQCJI+9UY+yMfZ9Rt99QHv83D95/2iOMsp5KA3TGevU/lzEGiMtvHBBoQyIQdXKMADG3nvjH1paRTBfwkYcQNlUfUUJxzK535/rFMsytZQyhSryAsNJwF3xj159c9fOqIwqwi9l7uacoAobY5U7Z2x058hS/FbnESxwzMBHJ+8MSljsMkDGc5z+sYp22X2x1gDPFH/huEbGsZ052x5Ue/toIozoQhVQaRq3GdudRVBxPJlZRlkddxnfyPlvU+BLwtWjlntYoTN/FIMMCduZ+75Uzxixhl4RMJRnul1jT4c0mI8r42LjB2PTboeYqgl1cSwSLAjPLDpY5jGSGG4/i35Y+NKX0yWXDJ7jhcS2rTRJ/hxkCQeIbrnAOMYIyc5Fd4NwGGK4doJ5I/aCVxzCAFuXX61p+HxRrZxxMuuOdQpDAHSDldtvSojCwQ3vEOG2B1mDiETDu55XK4yfvxnY75HrW2F7cWU8avE1xbugXXEPEj+ZH8pHlyx5cq48JtrqUWFyMrJGx1J4dJBXcZzg5IPPoKldwS3He28F3NbLGjSlkILEc8AnOPfTYuPbh/J/8AJfzr1Zn+4lp/5lff8yf9Neq6H//Z",
  "66902": "data:image/jpeg;base64,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",
  "66901": "data:image/jpeg;base64,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",
  "66900": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHCAkIBgoJCAkMCwoMDxoRDw4ODx8WGBMaJSEnJiQhJCMpLjsyKSw4LCMkM0Y0OD0/QkNCKDFITUhATTtBQj//2wBDAQsMDA8NDx4RER4/KiQqPz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz8/Pz//wAARCAD3ALkDASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAAAwECBAUGAAcI/8QAPxAAAgEDAwIDBgQEBAUEAwAAAQIRAAMhBBIxQVEFImEGE3GBkaEyscHwFEJS4SNT0fEVYoKSwhYzctIHVLL/xAAYAQEBAQEBAAAAAAAAAAAAAAABAAIDBP/EAB8RAQEBAQEBAQADAQEAAAAAAAABEQIxIUEDEjIiUf/aAAwDAQACEQMRAD8A9AZ2HEAd+aTeYhon4Uwtt74ppcnIE+vFOrBQ/lkMQM09Lm4w0EHGKjMysCrbgrCDEg/UcUUKCpCgKYwadWJYaFhT0ryb2stCx7UaxVmGYPPqyhj9zXp1sXFXzbSesV5/7f2hb8cs3dse9sKWPcgkfkBRfs1frNtJ5rmIBma4MJJGZ5zxSMPJ0NZBpY0MnBnOeaeTjPyoUyxEnn61IfUo127p7S/iYKvzMCvZvAAyeGLvIJZmI+EwPyryCyjP45pbY/kuL9AZP5V6/oLd214ZYVSGYICe8nJ/Ot81q+LNmGDUa434j3JqLd1F22onaQT1MYorfgAovxQG5tYspPZYPrUSy5aVLbWUkEAdP3NSEbcGKiPMYJqPdVVu3RIAuACJ4/eaxaUy1qBa09y62TBIAGcZ/fxrJ6m6b+pLMRt3FiQOTVt4rqPd6b3YbL5+A/uapVY7CZ9JNVuzDzM+uEvcntgfGs97c+JizZt+GW2BZouXip/7VP5/StC2otaLS3dVqP8A27ClmI5J6DOJOAPWvLPENXc12vvam8Ze4xZo4+A9BwPSm/IvajmO9NUEsIEzTsbQBzUtlXR6Q33B97jaI71ybiDqbrWlNhSQT+KD9qiQe1czs7s7SWYyTSbm/ZrWM6+lGubQTz8Kal9eij6YimoVIAjPpSMDunAWa2wOHVsEHPSlYheOPzoMleDih3NUtuS7SBHTqeB8atSalwHmsh/+RLZaxobu3yqzqT8QpH5GtHa1CXF3Bonowgiqj21tm77O7xxauq5+GV/8qQ87YZBX4ccU9yo4z/tQxJnPTApIYgsftQilcbj8OaGRLgDqaK20SrGDt4plsA6i3PVh+dQWfhVtr3tCoBjaGJPYbSJ+pr19VCIqqZCqAJ9K8p9k7Rv+PO38o2gn4sv6A16l7wgDvTK3fCuZIDAET1przIk8c1xaTkwcUjZE1nqqBxGFhRUe8u4LAgIeo70RmgxwCY+1RdfcWxoWulYZxtE9Dn8hNBik8U1PvdTCsey+gqE93btWD6etdbb3jM7gEnAFQdZq109u7qbmbdlZCz+IngfM4qjpfFN7Y+Jttt+HW2wP8S8R1Y/hHyGfmO1ZS2jO6qCMmJNO1N59TqHu3G3M7FmPckzUvwxS2oG1dxA5mNvrn6fOs9dfokLpNIoZjf4RdxH96r9fqP4i75RFtcKKn+Maja/uElYXzAHA6fWqhY3jcJUZI9KOZ+1m38DfaCNk7SBz3jP3pn75rmILY4pPpXRl9ILbYCQyg9xzTkLEzE57RQbd+2yMy+UczxNPFxjMsCsZIJn6ClDGCoGR2nH+9Ce2CArAMo6FaW3cU4IJxyev1pxuKokqRmoAPp7LrBBBGR5qi+OaY3fZ/VIHJVbRYqx/pO79KsgytkUl+0t+xctP+G4pViOxEVGvI1kNGAeAaRxtALHkyBSlSGzzP0pu1oO7PYjvQyTBmIB+Oa7TAfxicYBPEdDXCCPIJMdutLYUtfZv6FJ/T9aQ0vsDaLa25dIld4I+IVv/ALCvQiZbIkVifYC2V0zuerMV+B2j81NbIEmh0w4ElwJiCPpT3MJihA+deKe5MqOkd6zacR3AdwrEbTgjb9f0qk9odXvv+5QyLawY/qPP6D61d3Li2bNzUXABsGPX0+pj5VjNTda5qWLGSzEse9FakIWKrtXmsh7Wa4NcXR228tvzP6sf9B9ya0niWqOi0N3VEL5fKu7hmPH79DXnpc39QWcs7M2c+Zif1p8iv2iaPTXL7japK9SKtbrp4dpmdArXXACndJY9SPSioLWn04XYLdsCHIbdJjg/cVR3G968loE8dFrEm1W4DqS5uMzqQWIYSckESKisw2MoySIPpUnWXDduMyKVXO2e1QxxXRzJGKWKWK750p9BjQ2lbDOCTIBND9xqEZtlwMojaP6frz9qnhmaCFwB/MOa5QDEgAgQQBSEPdetiTaaIng/SuGrEGYXvIkVNYRwYJ57GhEKQA6q4PUif96iHb1VowZI+RmpSOrcNUV9Na3MUVg2DIxTrVq4pO1h+HyqR1qTznxW0tnxbV21G1VvMFX0kxUV1DKJBA9Dx61b+1KMntBfLKV3BWn/AKR+oqqIG1mgmBOMD4UMghGUbgcTgHM0iN7tL7LAi2Y+op6iVB2nBPIxTWgae6DyzKoPzNK/W/8AYq1s8I3MBugAsOsksPsw+taHcJ5FVns9aax4JZVhBiCeMqNp+61YsQw5ms66Y5mUMuJG4U+5u8wmSQABx0oCsTeUbZg89sTRwYdmaAq9TWSpvaK+bdm1pVbkb35BI4X6mfpWeQZwZIOTHWpGs1DarW37pOHaVU9hx84iqrxbXDw7wx7oP+IfKmOW7/L9IrM+1vMjOe13iQ1WsGjsH/B0/lMfzN1/0+VUultuH3BSWjAHWfl2oSBrtwlQSTnAo73W09o+YSMAetav34z4J4lqF2Jp7cyAGeR1MYH2qETCHzAzQ1JClyTJPPWlnyjERWpMmMW7T8BGZiNqiBOc/v8AKo7srQVEQI+NLcYEBcgfnQ+RxSCE4pJ9aU803NWB9GreWCFwBxNKL/ODPwqMLQUeTytxS7vLGc1FINzPIA6k4pyFT5lgmahkyNpBIPpg/GioUYFdxxyC0TUksCVgYPaiAAjjNREJVtwGX7VIRjEmR8aqcYz26tMPENPdOFeztUjmQxJ//oVm1wp6AY5x2rZ+3NndotLenCXGWP8A5Cf/ABrGwNuIzkmRzVGb6bELuPmjBpnu2uBVTm5eVQAOSAf9aK8bZBOcEweP3++Kfowf4jTKFllvF/kBmi+CevSNICvh1gMpyoYEGInP60RmYISgGOAcTUgWwttUidoAn5RTCilpJHbNDrLgWmvzdUMsMSZHPShePaj+H8PNtSN94lR3j+Y/THzqRqLul0afxGpICrgEjJJHA9awniPtN/xLxNdisunQ+7RZnexz24AGSM/h6cl8M+1KuMUMLILZNYf2k8RGr1nukabVmVWOCep+f5AVovG9edF4e9xW/wAW4NiHg9ie/wA+5FYPdJJn1o5atFtsUQsCQCDuI7VFuM1yXMxMCiurG1AwDg49aPqbS6fTKkEtPmPTia1PWOvERoWwBETTUBIJJJBPPrTrjFvKehrlB93gdZjmtVjTGMrECmxinucmetN4BqQZGa6PQ0p55rs96k+j0IdIuJ/8ZpTZshYdSMYIOZ/KhAtciYgd652BSAoA+FdJGNEbToV3KWUdmMmhvY/pZWJgBSYgz6xT9xC5JUcR1rriiVCkEzk0/wBYtpi2yFJcEDgkiijdGI460ofbgMBAmTUW/rwjFF2sQQCZrN4/8anSu9qkV/CHBjcjK8T6x/5GsQGAUGPMekTW71wXU+Haprg3H3LbQO4UkfeKwYIDSCZ9DWLzZ6rdM3Aggk8QMmftVh4LaNzxfRJgq24OsEkgnbP3qvJ8xkkjielX3slaZvHLJ2syrb8xH8pMsPyovinrePJGaZcuJa073brBbaKWZuwAkn6UTymAYOKoPbHW/wAH4BdUFi147VCtDRyYHWY2x/zVmujC+MeK6zxrVn3sWkB2raV5Cg/Qme8Z+UAy+EzprNxCPe2XVwBHB8p+Agg/IVAs2g1lWuqGvMoJYAAGOCJGBHSKn2PD7psq1pyqquBJUiQOgo07jLeO+IfxutKqx91b8qieg6/OoOmtPfvpatruZzA/1rZt4K+oa4zr7x2GDunPrJjNVXszpQvil5bi+ZPwyMhf3FUskFu/Tb2itadSrghdyqC383mE8+mfhULxO2yq8naEeAG4OBHp3+VaS4rXdGhYjyuCJMkwZx9D96zvirbr1wOu4bo4/CIBxHbP74OLtPX+YqwAPMRIiT+/pTrmYjr965wTO3cVDEZ5iuZWCCfjxXZyBIlR34pCMntTnXaok85ikc+aT1oKR4d4fd8Qv+7tiEXL3Dwo/U9h/err/wBM6b/9x/8AtFRvZ3XG1ebSNlbnmWTgMBn6gfatL77/AJfsa4999StZHo7YUdyeTSIcyfN1E4+Waytr2r1NsL/FeGKzclrd3bj4MP1qfa9q/D3Ye9TU2AOWa1IHzE/lXqnUccq9Zio8rAgCZJ6/lQ/NJ3ADHQTB+NQtP4z4bfzb8Qskcjc20k/9QFTrVwMoa2Qyt/MpkGtI9GKrBz3M5NAvaeXDBjz9qkFSwBkgnpE0zzSd3FI0lqyMGZ7jvXmt629q+9l1KsjFWAPBBzXpq+UeXnvzXnfjmlu2fEbz3GDF7jMWAAyTPA4+FY7MqGx649JOKtvAr7afxAMTClVG5TmVWY+hqkUM7hEZSxMAGQat9CxXX3BuIWWVWBxGBn6CsT2GLK37eaVrzWnW8t1bxUWzbGVkjvzAHzPaoHttqbms8Ws6Zd3urcdMFjDYIz/Tz/SfmlnwvQ3de2rRUe6GDEqQeev5/SrQaS14h4lc/iGZfcRbG1gMFQc89SfrR1PmunNUPumACqoAAIIFLYS7Z1HvbcnEFZgN6T3ofjest+HWrQsANccSytkBft1/KqbWa9tV4Yiuot3VYllDYYkSD3B5Hzrjl1utx4dqbNwK6AgTDAjKnsfWqd9KNL7XKACFvqQFCwMQwjHxHXiqb2XvakatrVk7m2byrNhvNAAJ45Pwges6vxG/pmbSawstu5p2VrhbDKOSCO5BbjnHpVfVnxR6wrZsKyMfd+8YQSpLZxknmCOtZ/xllF1VBEhtxAGIIWDPU4/KtD4nduN7l3Cqly+GlV/mLTJzzBH0qn9o7YGvbagDNtkbpMBV6dOftTx/qnqf8yqa2Wt3jswVJBPccEfAiaI4DIyqOoIEzTG2tcELC9x+tPtAMMjzY5NdXEC5hQp7yOkd6G45I6UbVLDgCZzM9/2aCwJHxoQasyOroSrK0qR0g4q4/wDUN7/IX/uqmNNkdqM1rXuj+F6d1JABbiAaA/g1oiCVngY4qzDMQysu3EDM4pFa2tsK0sOOKsCgu+z+8Q9tSQTHJETgyR2qG/gDWrguWdyMOGRip+1bRVBUSSDMxjNNdLjKSrLuGAdsj4c0Ji2u+NaNpteIX2PQXTv+UGi2faHxpG909vT31U+ZipUk9R5TH2q7vtduXyqLi3lmCxkAx1+IwaHoNDbuN7x9xLkkr5fNxk9cfHr1rcvU/VkRk9pGBJ1Xh11VUfitXd30EConiHiOj1Vvc3vLedo96kHt8K0lzw7TFJCgfCol3wm0QdgnrVe7+j+sY6zprV3WIEZT5pgt0H+1RZuNpNXe0pKvtO1pIPfHbE1rLnhdhnMoHZeJWfpUW/4Wqlvdyd3PmPzxWZ3DOcZjwfxHWXfENLZFvaiE7225Ig4J6/vsI2HhV5rnvbuNxuEGccYn7VVLo2sktYYq39TKD9quvDLPudMFkszksxiIk5NP9tmGMb4l7P6n+NuM960EYlgCzYXmMgxHxNWfhHgluza1FrUBbhuyjAYXaBIA/OatdQrFLLASSon6VMtaUslx4YwdyhcSY4rlbb8bVtvQaTwsXLtldrXCu5mk4EY9Oft1ppS/4zf90hNnRo3mZDtZoHAjtn4fapCJc11y6uxV0w8pu4JbMkL24AJ9PpaWEtJaFu3ahY2qowAB/v8AnRIrWJ8VvhrNlTaCg6khQ0ltoEd/ke8dKj+0FlV1t7epXcy7eBMLBP771M8WVX11m5aBW374MQzdZzyB/UcdJoXtSFW+pcFmdQCZhVG1hHxnNa5mdHq7xGWv29lxSIAIj9/auOCWHAIiaNqUB0qssFlOSOg7n4z+XegLtQbSCy9YPoMzXVxO153bbqr/AIZIXcB12ifuCfnUUGBPpFTiJ8I1KESfK6mJgBgD8Oarp8vOO1Rhh9PvTNhojRNN2+lSe9SCBPm3T5oijIVY5MkZqKisXG5sQdxOCD6c0dG8p2gLPBJFCH3SsA5+ND1N8WLLO5ACjvSJtAwxLDJzNVmvve8vLZ3CSYVYMljiYHafzrLQVwsFNy42bxJYJuMrEnjPHEDMcdKurdpEsleFKwQwxHaKqEU3NXaUMT7pdpZjIgjpgflVySqooBLGPKY5PetfjJSy7OwHAA4obtIx3zikZyXhh5R6/aKYXEwMdMnmsVqBXADggnrzQAAQMBfNHwHPyqQ2dx6dKEV6RHeslF92rL5hBHfrT0aHWBExgdc0+6JBKrLDPMCmKslVuCAYnE0wB2rW64lvnaQJPEVbpb90hXqO9Vlld15QTG4wSDVo6zdDmZAIEMYzk4+QqkKPqgdpiM98Y6mgl/c6W7dBXcoO1SOT6/b6ipV4AqFYSCYYelR9QF/4eFZdzM0L1IIM9eP2KYKxWr1jXXW17stqrd1dzBsOwKg+kkgknuak+P2DfvqqKpLWo3O0LOYgdTz9vSoGp2WPGru8Fgl3ccc5nE1P9oLjWbVm/BYr5YHGYP1gGjzprd5jKWlK7lEgbWgd/LUV9ttSAp3YkTgDn86kW5uXSJCNLS0ETgn7/rQ77tdvq6KqoECwAJJ2wST8q6uRok6O9ZcbZWQ3phs+h2jNV0yM980Y37yBlJg5UmJwREfSmPLMzNEtkxjNRgLY6Z7Um7/lNcwbnqMU3zd6U98UxiM966JzFNJByT96chAIgk/lXNOO4CEMd6r7Sg6jUX3uMApAIUCTJGBPWBHXmpWpubMkT1AWfN6faqy3uAViNrO5Y4/lGVBPxJP/AEjthjSf4ZJZrjZZySxIj981PYBTu/DIg5Jmo2nCgHaPKOKM90sDBBHTFVZhHYlweg6elNZiZaPlTVbasnzGcZ/OlLSSSIms1pxnBJnPHShjyrJHPSlmTBMDiaa2DAme3pQXY6nk5io2pbarMOVUtFHG05JyKj6lS1llCzKkR3wZqRbBYai2JglqtpItzMwcQfvVOlwtrLQEKqtHxNXLFQxSDJk/hMfX50b8M9AuMFtqSqsWMQ3XNRfENM0K7XFO3DAeUkFswfSpTAsylW5GJAhcnPE9ftTdZp7tzS3mt3WuqV8qsueScHtxGJxzmmX6LGA8XBXx5miN7KwLcAwJqb4ncF72cW+SrMqrcYEjJEKYnrLGg+0Wncai09xHBKBZZeY7emaLbK3/AGfvKQsqGAkySZkc+tHX+o1P81mjF+2rbSLrjJU8GSMjvx1qN7u4qwGZg0jaOP3mrFLalrjAEObbC223JYGcfL6T61X233QoYwTGf5c8+tdY5UG/pmZC1k7yqgkAQY6/SoiGZiT6VcWlexvvWVJV5tgtMiRme0j9ageI6X+B8RfThiVEfcZH1kUqK85LDdInEUm3/mp2xQzeYCDwabj+o/elPfCQRHTtNCdApwxUnO0H8X1opO0gKSV6mousvbbQUAqWJGOYrCRtQ5vX7KSHhlkSQJ/SusvOrKpEKJG3yhQMAADpxQbdxbL3n3A3EwFzknHT0n9xU/ThSpeZa4JO48/CtI9ZUnGDkxFKWO4RyMiDn9/Gnb4BDAS3AppJJAKk/OsUx24g4A9KUEjDYI6E00c8AAdBNdJMkiMznoKKXYgsNopv4lnPEGa4RBA796cQCpEdfkaCYFUbmUCXy0fzYgE/ICkZgJ3dVIiKVTuJBJ9I60C86sGCtlSFYdjg/rQiWQG1aAjrIJFXbcERiDkVQ6bd/G2wM5Mj0rQHLGaL4Z6iXnItlgJZe3br+tPs6hWAUMZEyIysH9/vFdcRGDpcHlYEMKi2bNvTaa0LRICKqjOQAcAn5UTxVW+2mntXPBhfuN5rVwbQDyGwR+ue1ZrwBve6XVWmGR5oPXkfoK1/jm6/4VatBlBZoa60EKemOuA3HBFZfTtbteK2bGkIClGQsVmYIJz1OPv2ii35jpzPlUWrBtXL6FQWUlRKgHmAccfiJwew6VVCbdwtbAKsOok5zVv41fS04a3bEsSWMzBmP9KrrYW44XaVbBBHwx+YrvzdmuHUy4l+HG263LNwqpJVlYmApX+xM1V+I7m1PnVhciGLf1AkH9Km3LTKGtKwZjJkDgfH5UZLDN4Tqr2qKqyspVm5bBG2tMqFwC3mJwKFB7faplxVdVbK5ALfl+RoPurX+YPtSXs6G5p193lrQ4ZmHlH+lD1F1mjIILbRmSR9fhRrohWLLuAEQfzqvTe10EElS3EARAOfhjt9eKzAONl1F0wbci5DAkCCeQCSO+R6ZNWARbaLByoAjvUG1aLaprtsAWySTJg9vX86mkNn15/3pqcArEO0nJ6VxaCSsyeCK6R0IJnr1prE8CPpzWDCozTgD1nvSLJBBiesUggMM9iK5WkDI295qaOwV2tnqKUzt4M12DEDE8mudvOSSxgTHSDHH0PSs1BOACpzGOZ5oeoJ935QScYB5orndIjb9yfn1qPqGhV55HHTBopdpxGoQgkH86vHaSxzEYqj04nV2usHiauwsYBIJkzFZ/CC5lT6DNNRZsbGbMEdaKoBaehodptry0EbuJ5qiqF4hZTU+EOjqIQZyMmY69wSPy6VndNo7SstxCNyck85wfhwK1jol03LJE23SSpBz16f35rE+JNc0rXrCqrlHC7gCYIaJn0MfajqfGuL9xU6jw/TMl+zqL3urtpS1sxAbkmflED161UoPeXEt3bpALTIbgH48cCtL4xYb3tzVobgX3K3QyqGUxtEGcHAmD9DxWfKMl8FwRIJUssTnn+9dP47sZ/kn3Q0VrF8b2ZuQxHPMdeRT9RduPpzY3DawUhieGBMH6GKW8bTLutk+YboIgLyInmkKqWBgBW8uTxE4n1iujkiXLTKjW7jFSRIJHPUfI1ClP6fzrR6+2tzwGxdiTp2KtB5DQfp0z29ao5X+n7CqJ7FqtQCrKrZXDbcgek/Ooxb3OnfP+Iy4VRgAn8We5k/70diLpC7dwDQIHmBHUd/px9RH1Ki5es2rRdkU7gWIP0Pbn60pJ0qrbsKm6C3E5ijIYBXcxPVjy1IgBldsKIgiudto3CIJ8xmqmHsQBgCfjzTUHUnNIji4u5VgRIHeuJIWccVlGs5LQOnNdEsoUHLCMU2FkiD9a5fMQvaTz6UNHghTiIByKJPkiOsULAaQcdabubJJMTwM0VHvtIPafhUXUsQyANhmyB1EGpO5Qkduai3B5TORu61mk/TeW+skLJMGr5gdpA5qh00nV25Mj+1X+PkaM+LQZ27SvE5oPDmD14+JozqVf0jGKE/lO45UjHrRDSuIe3dJVVXmc4rGX9Jcbxk2lbc5O1254PJ78A1s2E6TbmQcAdf39qyviRuabxuyLd87rgLEKskeYntV1Ph5uENtrvgy2TtDBQrL+JZGCMzIwRWV1919Rpma/DXVXaTuBOIiM9j9zWxNtbFm8JLKpZtxyc5P3JrJ+KIG1n+GzNbvANuAzt54PYd/Tir+Kr+SK/TuyaPzWty7iuf5TGadbdXuhbiwrNjmODH5iltllLWra7iYJBODHT1xH3pNQDaa06CGY8rjgwP0r0OIuhe3c1H8OYKalVRxMR6zmCCJoH/AAq72X6USyqW9WbzWgFKyoZiVDYIyIPf7VO/4q/+Vp/q3/2oMbZWC2WQKyq0BYaZBJA7z1NdpPdteZ1YNuaQT2z98Cot8KqNd2nkW13ZmQCftIBHb51O0dr/AAiwBEfCaQO3lKrPx7RTHYgkDIOB9KTerHYQefyp7qqLIy0cDmgwqEKgVWHciab7w3FbIA4H61H07O15muABcR6ZqTcdUts7EKFEksYAHWTQgyocMGjaRBBzIpzBR5uABFNU7l3BgVIkHuKTeNxU9vp86EUMTgcRiRSFp8uKG7raHn/mmAOtKp3OrBRuOc4ihoRmAUKOJg0C4y+6J3DcGH609n2rOZkVFullWROfWjFo2icDVqScTGa0e7zbTI7/AG/1rMaBgdWuf5ua0W8nUBZxtM/Hy1XxQ942kE8CgXhMRT9TbF2wVY4wcdCDINIwBjGayTbVyGVTEnHw/cVm/aGybep0moU7WVwpgesyf3mtAPxT0HOarfaLSXdVo9KtpgSh3MzRmBzGB+VSiKuxifdpcVSGLEqQNzEk+kzJ+dZfWaZbdlW90xa0zIWM5UEFT9/ua1Vu01rQrvIZZtjcA0A4Bbick+n51nNXda/YvpBV7F6G7Mu4xPrg1ji5062bzap7LC1eQqp3Bh5lyCCcyPh+VGJW4hubYWwPejzAkDk59D+VRdTqG/iGXTlgqNuVTkbj1HyNLbcrbbkBlIYSODgj8/rXpefA9Ze3aZEZAq7wVAPPfIx1FBlf8pftRjae6ge6rbLXlVgJIjipf8JZ7v8A9xpTcJaW/qkDZ92o5GZP7FWG0K0KCFjIqDpFIl8KzsSY/SrEKrqT0/CDHNVZgKqDcB4bkd6QqzuS5gcAT0pbiqpxmBAjvQ2bbYYW5Zp61mtQRiEB4gTJrhLKZJziguylBblQWliB9/zp4uKF2qJBGIP3oBCSByJJg96G1wqSFiDx9a53IuhYJAEkjFcLV0NuuIsN+JwCZPJJ9fn0qJHY7QsTzGK5BB82PjSsQDzIHUdaYglSR8eakVoB/EZ/KjeFWbOq8QFrULuVlaBujPT9ajNggYnmakeHKtxNSqSupRN9llIEkSCM46jn7VKLkeHaWw3vbdpVIP8AMxI+GTUPXs+n26hQSoO1h2HQ1L8P1v8AHaMXCu26p2XVOCrDmiOttrRV1BVhBBHPTg1mtBWbq6iySDMicUpEHbnPB+VVdot4drTack2X/wDbbt6fKrQENtYd6zSCQQwiQrDPxqP4tba5o9lsxJAkicHHHeptyNytHX70y9Z96riSCw5mpKJdb/CK9i8zOG8oZMqBHEdOZxWXvow1uo06iWaGOMMJG4fDzN9Kv7lq4/i677bIfdGY/lHQjp0+/pUM6i0165qrUOqsRLLBhSQftJ/6hWL8uu3N+YyzWwNSzIo3BiAobgDI/eKIfO7OGYiZ3d8Z/fxqZ4hba34gyhoXduifjiPtUO8ty3oiVbc28E46CvRLrz2ZS3rqfwKsrbd7bWjj8P8Aao3u7/d/rRbllX0IVWzu3Hif3mmQn+c9IejaYEoSTkYHpUwCLSrJxia6upoR1YMG7CKYAGM5AHrXV1ZRnvLbOoC9Yg8EgE/pNPXcz+aCDgDgY/Yrq6qoly2DdGJnIM/v0obbzcKb/wAIBI9CTH5GurqERoa4ufwMCACRmIz35pJYFyw8oAIYHmScR++a6uqLsQQMmOTVfqdcdB4hpNRuMBzIicSJ+okV1dUZ6tbpXSeOKUdzp9ZtwpK+g4I6EVf3GC+U9YMfE/3FdXUUo2r0tvVWSGkN/Kex6VC0GpeDau/jtmDFdXUUp+8OBMCWgY9D/elJPvFIYzkV1dQlX4qy2LVy6Mhl4J4M/D1FVWps27Om072UIBcjJ5JEmfoK6urPXjcVXjCnaLqgMpgzwRyPzNVJbdZzmSDn6f6V1dW+PGO/UYYW5bAklZBPTNB94P6h/wBtdXV0jD//2Q==",
  "energy_td": "data:image/jpeg;base64,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",
};

function OrientationSessionEditor({ session, user, onDone }) {
  const [dateLabel, setDateLabel] = useState(session ? session.date_label : "");
  const [timeLabel, setTimeLabel] = useState(session ? session.time_label : "");
  const [location, setLocation] = useState(session ? session.location : "");
  const [notes, setNotes] = useState(session ? session.notes : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!dateLabel.trim() || !timeLabel.trim()) { setError("Date and time are required."); return; }
    setSaving(true);
    setError("");
    const { data, error: rpcError } = session
      ? await supabase.rpc("update_orientation_session", {
          p_token: user.sessionToken, p_session_id: session.id,
          p_date_label: dateLabel.trim(), p_time_label: timeLabel.trim(), p_location: location.trim(), p_notes: notes.trim(),
        })
      : await supabase.rpc("add_orientation_session", {
          p_token: user.sessionToken,
          p_date_label: dateLabel.trim(), p_time_label: timeLabel.trim(), p_location: location.trim(), p_notes: notes.trim(),
        });
    setSaving(false);
    if (rpcError || !data) { setError("Something went wrong. Try again."); return; }
    onDone();
  };

  return (
    <div className="bg-white rounded-md p-3 border mb-3" style={{ borderColor: "#E4E2DA" }}>
      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Date (e.g. "Every Monday")</label>
      <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Time (e.g. "7:30 AM")</label>
      <input value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Location</label>
      <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Notes (e.g. "Conducted in English")</label>
      <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      {error && <div className="text-[11px] mb-2" style={{ color: ALERT }}>{error}</div>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm disabled:opacity-50" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          {saving ? "Saving…" : session ? "Save Changes" : "Add Session"}
        </button>
        <button onClick={onDone} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageOrientationScreen({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_orientation_admin", { p_token: user.sessionToken });
    setSessions(error || !data ? [] : data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.sessionToken]);

  const remove = async (id) => {
    await supabase.rpc("delete_orientation_session", { p_token: user.sessionToken, p_session_id: id });
    load();
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Sessions here show up in Orientation for everyone on this project.
      </div>

      {!showNew && !editingId && (
        <button onClick={() => setShowNew(true)} className="w-full mb-3 text-[12px] font-bold uppercase py-2.5 rounded-md" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          + New Session
        </button>
      )}

      {showNew && <OrientationSessionEditor user={user} onDone={() => { setShowNew(false); load(); }} />}

      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}

      {sessions.map((s) =>
        editingId === s.id ? (
          <OrientationSessionEditor key={s.id} session={s} user={user} onDone={() => { setEditingId(null); load(); }} />
        ) : (
          <div key={s.id} className="bg-white rounded-md p-3 border mb-2" style={{ borderColor: "#E4E2DA" }}>
            <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{s.date_label} · {s.time_label}</div>
            <div className="text-[11px] mt-0.5" style={{ color: STEEL }}>{s.location}</div>
            {s.notes && <div className="text-[11px] mt-0.5" style={{ color: STEEL }}>{s.notes}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditingId(s.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Edit</button>
              <button onClick={() => remove(s.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: ALERT, color: ALERT, fontFamily: "IBM Plex Mono, monospace" }}>Delete</button>
            </div>
          </div>
        )
      )}
      {!loading && sessions.length === 0 && !showNew && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No sessions yet — add the first one above.</div>
      )}
    </div>
  );
}

function WorkPlanEditor({ plan, user, onDone }) {
  const [subcontractor, setSubcontractor] = useState(plan ? plan.subcontractor : "");
  const [title, setTitle] = useState(plan ? plan.title : "");
  const [pages, setPages] = useState(plan ? String(plan.pages) : "");
  const [viewLink, setViewLink] = useState(plan ? plan.view_link || "" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!subcontractor.trim() || !title.trim()) { setError("Subcontractor and title are required."); return; }
    setSaving(true);
    setError("");
    const { data, error: rpcError } = plan
      ? await supabase.rpc("update_work_plan", {
          p_token: user.sessionToken, p_plan_id: plan.id,
          p_subcontractor: subcontractor.trim(), p_title: title.trim(), p_pages: parseInt(pages) || null, p_view_link: viewLink.trim(),
        })
      : await supabase.rpc("add_work_plan", {
          p_token: user.sessionToken,
          p_subcontractor: subcontractor.trim(), p_title: title.trim(), p_pages: parseInt(pages) || null, p_view_link: viewLink.trim(),
        });
    setSaving(false);
    if (rpcError || !data) { setError("Something went wrong. Try again."); return; }
    onDone();
  };

  return (
    <div className="bg-white rounded-md p-3 border mb-3" style={{ borderColor: "#E4E2DA" }}>
      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Subcontractor</label>
      <select value={subcontractor} onChange={(e) => setSubcontractor(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px] bg-white" style={{ borderColor: "#C9C6BC" }}>
        <option value="">Select…</option>
        {SUBCONTRACTOR_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Plan Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Pages</label>
      <input value={pages} onChange={(e) => setPages(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-full mt-1 mb-2 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>View Link (Google Drive "Anyone with the link" preview URL)</label>
      <input value={viewLink} onChange={(e) => setViewLink(e.target.value)} placeholder="https://drive.google.com/file/d/…/preview" className="w-full mt-1 mb-3 rounded-md border px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#C9C6BC" }} />

      {error && <div className="text-[11px] mb-2" style={{ color: ALERT }}>{error}</div>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm disabled:opacity-50" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          {saving ? "Saving…" : plan ? "Save Changes" : "Add Work Plan"}
        </button>
        <button onClick={onDone} className="flex-1 text-[11px] font-bold uppercase py-2 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManageWorkPlansScreen({ user }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_work_plans_admin", { p_token: user.sessionToken });
    setPlans(error || !data ? [] : data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.sessionToken]);

  const remove = async (id) => {
    await supabase.rpc("delete_work_plan", { p_token: user.sessionToken, p_plan_id: id });
    load();
  };

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Plans here show up in Work Plans, grouped by subcontractor, for everyone on this project.
      </div>

      {!showNew && !editingId && (
        <button onClick={() => setShowNew(true)} className="w-full mb-3 text-[12px] font-bold uppercase py-2.5 rounded-md" style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}>
          + New Work Plan
        </button>
      )}

      {showNew && <WorkPlanEditor user={user} onDone={() => { setShowNew(false); load(); }} />}

      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}

      {plans.map((p) =>
        editingId === p.id ? (
          <WorkPlanEditor key={p.id} plan={p} user={user} onDone={() => { setEditingId(null); load(); }} />
        ) : (
          <div key={p.id} className="bg-white rounded-md p-3 border mb-2" style={{ borderColor: "#E4E2DA" }}>
            <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{p.subcontractor}</div>
            <div className="text-[13px] mt-0.5" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{p.title}</div>
            <div className="text-[11px] mt-0.5" style={{ color: STEEL }}>{p.pages || "—"} pages{!p.view_link ? " · No link set" : ""}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditingId(p.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Edit</button>
              <button onClick={() => remove(p.id)} className="flex-1 text-[10px] font-bold uppercase py-1.5 rounded-sm border" style={{ borderColor: ALERT, color: ALERT, fontFamily: "IBM Plex Mono, monospace" }}>Delete</button>
            </div>
          </div>
        )
      )}
      {!loading && plans.length === 0 && !showNew && (
        <div className="text-[12px] text-center py-6" style={{ color: STEEL }}>No work plans yet — add the first one above.</div>
      )}
    </div>
  );
}

// ---- Screen: Weekly Report (Lessons Learned) ----
const WEEKLY_REPORTS_DEFAULT = [
  {
    week: "Aug 19 – Aug 25, 2026",
    title: "Weekly Report — Incident Summary",
    summaryTable: {
      columns: ["Energy", "Construction", "Cintra", "Airports", "Thalia", "Ferrovial"],
      rows: [
        { label: "Fatality", values: [0, 0, 0, 0, 0, 0] },
        { label: "Injury (Serious) HiPo", values: [0, 0, 0, 0, 0, 0] },
        { label: "Injury (Non-Serious) HiPo", values: [0, 1, 0, 0, 0, 1] },
        { label: "Near Miss (HiPo)", values: [1, 6, 0, 0, 0, 7] },
        { label: "TOTAL SIF & HiPo", values: [1, 7, 0, 0, 0, 8], total: true },
      ],
    },
    incidents: [
      {
        company: "Ferrovial Construcción, S.A. Suc Portugal",
        incidentId: "66906", image: INCIDENT_IMAGES["66906"],
        project: "Ctra. IP3 Sta. Comba / Viseu (CB0N)",
        eventType: "Injury (Non-Serious) HiPo",
        description: "During earthmoving works at the E1 abutment of the Ribeira de Asnes viaduct, a subcontractor worker was compacting soil with a roller. While reversing, the compactor deviated from its path, got too close to the slope edge, slid down, and tipped over. The operator jumped clear and rolled down the slope, out of the machine's path.",
        hipoScenario: "Roll-over or roll-away of mobile equipment",
        lifesavingControl: { present: false, note: "Uncontrolled exposure" },
        controlMeasures: "Trajectory deviation sensors",
        relatedStandard: "Machinery and Equipment",
      },
      {
        company: "Ferrovial Construcción PR, LLC",
        incidentId: "66875", image: INCIDENT_IMAGES["66875"],
        project: "Rehab. PR52 San Juan – Caguas (C7FI)",
        eventType: "Near Miss (HiPo)",
        description: "During a road moving operation, drones were being placed along a concrete barrier from a flatbed truck. A passing vehicle changed lanes with no evidence of braking and struck the attenuator truck protecting the work area. The impact was absorbed by the attenuator, preventing intrusion into the work area; two employees fell and received minor bumps and scrapes.",
        hipoScenario: "Traffic events requiring evasive action",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "Use of impact-attenuating vehicle",
        relatedStandard: "Traffic Control",
      },
      {
        company: "Budimex",
        incidentId: "66910", image: INCIDENT_IMAGES["66910"],
        project: "2S7P — Flood-affected area works",
        eventType: "Near Miss (HiPo)",
        description: "A subcontractor worker not authorized to operate a 9-tonne articulated site dumper drove it over uneven ground, deviated from its path, and made side contact with an oncoming lorry. The dumper rotated across the road; the unbelted operator was thrown from the seat. The worker was taken to hospital for assessment and discharged the same day.",
        hipoScenario: "Traffic events requiring evasive action",
        lifesavingControl: { present: false, note: "Uncontrolled exposure" },
        controlMeasures: "Do not leave keys in the ignition when equipment is unused",
        relatedStandard: "Traffic Control",
      },
      {
        company: "Webber",
        incidentId: "66904", image: INCIDENT_IMAGES["66904"],
        project: "US 380, Collin Co. (CWOK)",
        eventType: "Near Miss (HiPo)",
        description: "A roller operator misjudged the depth of an edge; the rear left tire sank into a soft spot, shifting the roller and causing a rollover. Dry cut material had little integrity, and the crew had just moved into a newer section where the soft area hadn't been identified.",
        hipoScenario: "Roll-over or roll-away of mobile equipment",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "Seatbelt worn by operator; physical separation from workers/equipment; ROPS protection",
        relatedStandard: "Machinery and Equipment",
      },
      {
        company: "Webber",
        incidentId: "66902", image: INCIDENT_IMAGES["66902"],
        project: "I-95 Improvements JV (CES60)",
        eventType: "Near Miss (HiPo)",
        description: "An excavator positioned on a spoil pile was loading dump trucks near the Savannah River Bridge. While rotating to dump a load, the ground beneath the leading track gave way after days of heavy rain, causing the excavator to tip over.",
        hipoScenario: "Roll-over or roll-away of mobile equipment",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "ROPS canopy, FOPS, seatbelt",
        relatedStandard: "Machinery and Equipment",
      },
      {
        company: "Webber",
        incidentId: "66901", image: INCIDENT_IMAGES["66901"],
        project: "FM 2100, Harris Co. (CW1P)",
        eventType: "Near Miss (HiPo)",
        description: "A skid steer was fine-grading a sidewalk embankment. While back-grading dirt, the operator backed too far off the edge of the embankment, causing a rollover.",
        hipoScenario: "Roll-over or roll-away of mobile equipment",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "Seatbelt, ROPS",
        relatedStandard: "Machinery and Equipment",
      },
      {
        company: "Webber",
        incidentId: "66900", image: INCIDENT_IMAGES["66900"],
        project: "Pflugerville WWTP CMA (CP5K)",
        eventType: "Near Miss (HiPo)",
        description: "During a 100 PSI hydrostatic pressure test, the crew noticed plug supports bending while holding at 80 psi. The supports failed and the plug released from the line into the tertiary basin chamber. No one was in the area and no one was injured.",
        hipoScenario: "Uncontrolled release of hazardous energy",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "No employees inside the space during testing; area barricaded with physical barriers",
        relatedStandard: "Safety Planning",
      },
      {
        company: "Energy: T&D",
        incidentId: "—", image: INCIDENT_IMAGES["energy_td"],
        project: "Aragón Maintenance — Magallón Substation, 220 kV",
        eventType: "Near Miss (HiPo)",
        description: "During installation of droppers between a circuit breaker and overhead lines, an MEWP's boom encroached on the substation busbar's danger zone. An electric arc occurred between the busbar and the platform boom. The platform was grounded via a grounding rod, which immediately cleared the fault.",
        hipoScenario: "Unintentional contact with utilities — power lines / gas mains",
        lifesavingControl: { present: true, note: "Controlled exposure / fail-safe" },
        controlMeasures: "Ground-connected MEWP",
        relatedStandard: "Aerial Work Platforms",
      },
    ],
  },
];

function StatTable({ table }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 mb-4">
      <table className="w-full text-[10px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th className="text-left p-1.5" style={{ background: INK, color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>Event</th>
            {table.columns.map((c, i) => (
              <th key={i} className="text-center p-1.5" style={{ background: INK, color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} style={{ background: r.total ? "#FFF8E1" : "white" }}>
              <td className="p-1.5 border" style={{ borderColor: "#E4E2DA", fontWeight: r.total ? 700 : 500 }}>{r.label}</td>
              {r.values.map((v, j) => (
                <td key={j} className="text-center p-1.5 border" style={{ borderColor: "#E4E2DA", fontWeight: r.total ? 700 : 400, color: v > 0 ? ALERT : INK }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncidentCard({ inc }) {
  return (
    <div className="bg-white rounded-md p-3 border mb-2" style={{ borderColor: "#E4E2DA" }}>
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{inc.company}</div>
          <div className="text-[13px] mt-0.5" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{inc.project}</div>
        </div>
        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0 ml-2" style={{ background: "#FCEFEF", color: ALERT, fontFamily: "IBM Plex Mono, monospace" }}>{inc.eventType}</span>
      </div>
      {inc.image && (
        <img src={inc.image} alt={`Incident ${inc.incidentId}`} className="w-full rounded-sm mb-2" style={{ maxHeight: 220, objectFit: "cover" }} />
      )}
      <div className="text-[12px] mb-2 leading-snug" style={{ color: "#333" }}>{inc.description}</div>
      <div className="space-y-1 text-[11px]">
        <div><span style={{ color: STEEL }}>HiPo Scenario: </span>{inc.hipoScenario}</div>
        <div>
          <span style={{ color: STEEL }}>Lifesaving Control Present: </span>
          <span style={{ color: inc.lifesavingControl.present ? "#1E7A34" : ALERT, fontWeight: 600 }}>
            {inc.lifesavingControl.present ? "Yes" : "No"}
          </span> — {inc.lifesavingControl.note}
        </div>
        <div><span style={{ color: STEEL }}>Control Measures: </span>{inc.controlMeasures}</div>
        <div><span style={{ color: STEEL }}>Related Standard: </span>{inc.relatedStandard}</div>
      </div>
    </div>
  );
}

function ReportDetail({ report }) {
  return (
    <div>
      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>HiPo Incident Summary</div>
      <StatTable table={report.summaryTable} />
      <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>High Potential Events</div>
      {report.incidents.map((inc, i) => <IncidentCard key={i} inc={inc} />)}
    </div>
  );
}

function WeeklyReportScreen() {
  const [viewing, setViewing] = useState(null);
  const reports = WEEKLY_REPORTS_DEFAULT;
  const [latest, ...older] = reports;

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-1" style={{ color: STEEL }}>
        High-potential incidents and near-misses from other projects — reviewed as lessons learned so we don't repeat them here.
      </div>
      <div className="text-[10px] uppercase font-bold mb-4" style={{ color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>{latest.week}</div>

      <ReportDetail report={latest} />

      {older.length > 0 && (
        <>
          <div className="text-[11px] uppercase font-bold mt-2 mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Previous Reports</div>
          <div className="space-y-2">
            {older.map((r, i) => (
              <button
                key={i}
                onClick={() => setViewing(r)}
                className="w-full text-left bg-white rounded-md p-3 flex items-center gap-3 border"
                style={{ borderColor: "#E4E2DA" }}
              >
                <div className="w-11 h-11 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: INK }}>
                  <AlertTriangle size={18} color={GOLD} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{r.week}</div>
                  <div className="text-[13px] mt-0.5" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{r.title}</div>
                </div>
                <ChevronRight size={16} color={STEEL} className="flex-shrink-0" />
              </button>
            ))}
          </div>
        </>
      )}

      {viewing && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-md w-full max-w-sm overflow-hidden max-h-[85%] flex flex-col" style={{ height: "85%" }}>
            <div className="flex items-center justify-between p-3 border-b flex-shrink-0" style={{ borderColor: "#E4E2DA" }}>
              <div className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{viewing.week}</div>
              <button onClick={() => setViewing(null)}><X size={18} color={STEEL} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ReportDetail report={viewing} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Login (modal, only needed to claim/view a badge) ----
// ---- Project Switcher ----
function ProjectSwitcherModal({ activeProjectId, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
      <div className="w-full max-w-xs rounded-xl overflow-hidden" style={{ background: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ background: INK }} className="p-4 flex items-center justify-between">
          <div className="text-white text-[13px]" style={{ fontFamily: "Oswald, sans-serif" }}>Switch Project</div>
          <button onClick={onClose}><X size={18} color="white" /></button>
        </div>
        <HazardRule height={4} />
        <div className="p-3 space-y-2">
          {Object.values(PROJECTS).map((p) => {
            const active = p.id === activeProjectId;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full text-left rounded-md p-3 border flex items-center justify-between"
                style={{ borderColor: active ? GOLD : "#E4E2DA", background: active ? "#FFF8E1" : "white" }}
              >
                <span className="text-[13px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: active ? 700 : 500 }}>{p.name}</span>
                {active && <CheckCircle2 size={16} color={GOLD} />}
              </button>
            );
          })}
        </div>
        <div className="px-3 pb-3 text-[10px]" style={{ color: STEEL }}>
          Switching projects logs you out — badges, forms, and personnel are specific to each project.
        </div>
      </div>
    </div>
  );
}

function LoginModal({ onLogin, onClose, activeProjectId }) {
  const { name: projectName } = useContext(ProjectContext);
  const [badge, setBadge] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!badge.trim() || !pin.trim()) { setError("Enter your badge number and PIN"); return; }
    setLoading(true);
    setError("");

    await loadProjectMap();
    const projectUuid = activeProjectId === "safety-hub" ? null : projectIdForSlug(activeProjectId);

    const { data, error: rpcError } = await supabase.rpc("authenticate", {
      p_badge: badge.trim(),
      p_pin: pin.trim(),
      p_project_id: projectUuid,
    });

    setLoading(false);

    if (rpcError) {
      setError("Something went wrong reaching the server. Try again.");
      return;
    }
    if (!data) {
      setError("Badge number or PIN not recognized.");
      return;
    }

    const matchedSlug = projectSlugForId(data.project_id) || (activeProjectId !== "safety-hub" ? activeProjectId : null);
    const user = {
      sessionToken: data.session_token,
      name: data.name,
      empId: data.employee_id,
      badge: data.badge_number,
      role: data.role,
      employer: data.employer,
      orientationDate: data.orientation_date,
      trainingAccess: data.training_access,
      multiSiteAccess: data.multi_site_access,
      canAddPersonnel: data.can_add_personnel,
      photoUrl: data.photo_url,
      quals: data.qualifications || [],
    };
    onLogin(user, matchedSlug);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
      <div className="w-full max-w-xs rounded-xl overflow-hidden" style={{ background: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ background: INK }} className="p-4 flex items-center justify-between">
          <div>
            <div className="text-[9px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace" }}>{projectName}</div>
            <div className="text-white text-[13px]" style={{ fontFamily: "Oswald, sans-serif" }}>Log In Required</div>
          </div>
          <button onClick={onClose}><X size={18} color="white" /></button>
        </div>
        <HazardRule height={4} />
        <div className="p-5">
          <div className="text-[12px] mb-4" style={{ color: STEEL }}>
            Enter your badge number and PIN to access this section and get your digital badge.
          </div>
          <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Badge Number</label>
          <input
            value={badge}
            onChange={(e) => { setBadge(e.target.value); setError(""); }}
            className="w-full rounded-md border px-3 py-2.5 text-[14px] mt-1 mb-3"
            style={{ borderColor: "#C9C6BC" }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <label className="text-[10px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(""); }}
            className="w-full rounded-md border px-3 py-2.5 text-[14px] mt-1"
            style={{ borderColor: "#C9C6BC" }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <div className="text-[11px] mt-1.5" style={{ color: ALERT }}>{error}</div>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full mt-4 rounded-md py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif" }}
          >
            {loading ? "Checking…" : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Digital Badge ----
const QR_PATTERN = [1,1,1,0,1, 1,0,0,0,1, 1,0,1,0,0, 0,0,1,1,1, 1,1,0,1,0].map(Boolean);
function BadgeModal({ user, onClose, trainingRecords, onLogout }) {
  const { name: projectName } = useContext(ProjectContext);
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const myRecords = (trainingRecords || []).filter((r) => r.badge === user.badge);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-6">
      <div className="w-full max-w-xs rounded-xl overflow-hidden max-h-[90vh] flex flex-col" style={{ background: "white", boxShadow: "0 10px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ background: INK }} className="p-4 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-[9px] uppercase font-bold" style={{ color: AMBER, fontFamily: "IBM Plex Mono, monospace" }}>{projectName}</div>
            <div className="text-white text-[12px]" style={{ fontFamily: "Oswald, sans-serif" }}>Digital Crew Badge</div>
          </div>
          <button onClick={onClose}><X size={18} color="white" /></button>
        </div>
        <HazardRule height={4} />
        <div className="p-5 flex flex-col items-center overflow-y-auto">
          <div className="relative mb-3">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-20 h-20 rounded-full object-cover" style={{ border: `2px solid ${GOLD}` }} />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-xl"
                style={{ background: GOLD, color: INK, fontFamily: "Oswald, sans-serif", fontWeight: 600 }}
              >
                {initials}
              </div>
            )}
          </div>
          <div className="text-[17px] text-center" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>{user.name}</div>
          <div className="text-[12px] mb-3" style={{ color: STEEL }}>{user.role}</div>
          <div className="flex gap-2 mb-4">
            <Tag>ID {user.empId}</Tag>
            <Tag>Badge {user.badge}</Tag>
          </div>
          <div className="w-full grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-sm px-2 py-1.5" style={{ background: "#F4F3EF" }}>
              <div className="text-[9px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Employer</div>
              <div className="text-[12px] font-bold">{user.employer || "—"}</div>
            </div>
            <div className="rounded-sm px-2 py-1.5" style={{ background: "#F4F3EF" }}>
              <div className="text-[9px] uppercase font-bold" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Orientation Date</div>
              <div className="text-[12px] font-bold">{user.orientationDate || "—"}</div>
            </div>
          </div>
          {user.quals.length > 0 && (
            <div className="w-full mb-4">
              <div className="text-[10px] uppercase font-bold mb-1.5 text-center" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Designations</div>
              <div className="space-y-1.5">
                {user.quals.map((q, i) => <QualTag key={i} status={q.status}>{q.label}</QualTag>)}
              </div>
            </div>
          )}
          {myRecords.length > 0 && (
            <div className="w-full mb-4">
              <div className="text-[10px] uppercase font-bold mb-1.5 text-center" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Training Completed</div>
              <div className="space-y-1.5">
                {myRecords.map((r, i) => (
                  <div key={i} className="rounded-sm px-2 py-1.5" style={{ background: "#F4F3EF" }}>
                    <div className="text-[11px] font-bold">{r.courseTitle}</div>
                    <div className="text-[10px]" style={{ color: STEEL }}>{r.date} · {r.time} · {r.durationMin} min{r.score ? ` · ${r.score}` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div
            className="w-24 h-24 grid grid-cols-5 gap-[2px] p-2 rounded-sm"
            style={{ background: INK }}
          >
            {QR_PATTERN.map((on, i) => (
              <div key={i} style={{ background: on ? AMBER : INK }} />
            ))}
          </div>
          <div className="text-[9px] uppercase mt-2 text-center" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>Scan to verify on site</div>
          <div className="text-[9px] mt-1 text-center max-w-[220px]" style={{ color: "#9AA0A6" }}>
            Encodes: {user.name}, Badge {user.badge}, {user.employer || "—"}, Orientation {user.orientationDate || "—"}{user.quals.length > 0 ? `, ${user.quals.map((q) => q.label).join("; ")}` : ""}
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="mt-4 text-[10px] uppercase font-bold px-3 py-2 rounded-sm border"
              style={{ borderColor: "#C9C6BC", color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}
            >
              Log Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- App shell ----
const GATED_SCREENS = ["forms", "manual", "toolbox", "workplans"];

export default function SafetyHubPrototype() {
  const [activeProjectId, setActiveProjectId] = useState("safety-hub");
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [screen, setScreen] = useState("home");
  const [completed, setCompleted] = useState({});
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [concernReports, setConcernReports] = useState([]);
  const [user, setUser] = useState(null);
  const [showBadge, setShowBadge] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingScreen, setPendingScreen] = useState(null);
  const progress = Math.round((Object.keys(completed).length / MODULES_DEFAULT.length) * 100);

  // On load, check for a saved session token and re-log the person in
  // automatically instead of making them enter their PIN every time.
  useEffect(() => {
    async function restoreSession() {
      const savedToken = localStorage.getItem("safetyhub_session_token");
      if (!savedToken) { setSessionChecked(true); return; }

      const { data, error } = await supabase.rpc("get_session", { p_token: savedToken });
      if (error || !data) {
        localStorage.removeItem("safetyhub_session_token");
        setSessionChecked(true);
        return;
      }

      const matchedSlug = projectSlugForId(data.project_id);
      if (matchedSlug) setActiveProjectId(matchedSlug);
      setUser({
        sessionToken: data.session_token,
        name: data.name,
        empId: data.employee_id,
        badge: data.badge_number,
        role: data.role,
        employer: data.employer,
        orientationDate: data.orientation_date,
        trainingAccess: data.training_access,
        multiSiteAccess: data.multi_site_access,
        canAddPersonnel: data.can_add_personnel,
        photoUrl: data.photo_url,
        quals: data.qualifications || [],
      });
      setSessionChecked(true);
    }
    loadProjectMap().then(restoreSession);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("safetyhub_session_token");
    setUser(null);
    setShowBadge(false);
    setActiveProjectId("safety-hub");
    setTrainingRecords([]);
    setConcernReports([]);
    setCompleted({});
    setScreen("home");
  };

  const handleSwitchProject = (projectId) => {
    localStorage.removeItem("safetyhub_session_token");
    setActiveProjectId(projectId);
    setShowProjectSwitcher(false);
    setUser(null);
    setTrainingRecords([]);
    setConcernReports([]);
    setCompleted({});
    setScreen("home");
  };

  const titles = {
    home: "Safety Hub",
    manual: "H&S Minimum Standard & Safety Plan",
    toolbox: "Toolbox Talks",
    reports: "Weekly Report",
    forms: "Forms & Templates",
    personnel: "Personnel Lookup",
    orientation: "Orientation",
    workplans: "Work Plans",
    emergency: "Emergency Contacts",
    concern: "Report a Concern",
    addperson: "Add Person",
    manageroster: "Manage Roster",
    managebulletin: "Manage Bulletin",
    manageorientation: "Manage Orientation",
    manageworkplans: "Manage Work Plans",
  };

  const tabs = [
    { key: "home", icon: Home, label: "Home" },
    { key: "manual", icon: BookOpen, label: "Manual" },
    { key: "toolbox", icon: PlayCircle, label: "Talks" },
    { key: "reports", icon: AlertTriangle, label: "Reports" },
    { key: "forms", icon: FileText, label: "Forms" },
    { key: "personnel", icon: Users, label: "Crew" },
  ];

  // Central navigation gate: Forms, Manual & Toolbox require a badge (login) first
  const go = (targetScreen) => {
    if (GATED_SCREENS.includes(targetScreen) && !user) {
      setPendingScreen(targetScreen);
      setShowLogin(true);
      return;
    }
    setScreen(targetScreen);
  };

  const handleBadgeTap = () => {
    if (user) setShowBadge(true);
    else {
      setPendingScreen(null);
      setShowLogin(true);
    }
  };

  const handleLogin = (u, matchedProjectId) => {
    if (matchedProjectId && matchedProjectId !== activeProjectId) {
      setActiveProjectId(matchedProjectId);
    }
    if (u.sessionToken) {
      localStorage.setItem("safetyhub_session_token", u.sessionToken);
    }
    setUser(u);
    setShowLogin(false);
    if (pendingScreen) {
      setScreen(pendingScreen);
      setPendingScreen(null);
    } else {
      setShowBadge(true);
    }
  };

  const sidebarItems = [
    { key: "home", icon: Home, label: "Home" },
    { key: "orientation", icon: CalendarDays, label: "Orientation" },
    { key: "manual", icon: BookOpen, label: "H&S Manual & Safety Plan" },
    { key: "forms", icon: FileText, label: "Forms & Templates" },
    { key: "reports", icon: AlertTriangle, label: "Weekly Report" },
    { key: "toolbox", icon: PlayCircle, label: "Toolbox Talks" },
    { key: "workplans", icon: ClipboardCheck, label: "Work Plans" },
    { key: "personnel", icon: Users, label: "Personnel Lookup" },
    { key: "emergency", icon: Phone, label: "Emergency Contacts" },
  ];

  return (
    <ProjectContext.Provider value={PROJECTS[activeProjectId]}>
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#F4F3EF" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500&family=IBM+Plex+Mono:wght@500;600&display=swap');
        * { font-family: 'Inter', sans-serif; }
        html, body { background: #F4F3EF; }
      `}</style>

      {/* Desktop / tablet sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 flex-shrink-0" style={{ background: INK }}>
        <div className="p-5 border-b" style={{ borderColor: "#2A2A2A" }}>
          <div className="text-[10px] uppercase font-bold" style={{ color: GOLD, fontFamily: "IBM Plex Mono, monospace" }}>{PROJECTS[activeProjectId].name}</div>
          <div className="text-white text-[16px] mt-1" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600 }}>Safety Hub</div>
        </div>
        <div className="flex-1 py-3">
          {sidebarItems.map((t) => {
            const active = screen === t.key;
            const locked = GATED_SCREENS.includes(t.key) && !user;
            return (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left"
                style={{ background: active ? "rgba(235,183,1,0.12)" : "transparent", borderLeft: active ? `3px solid ${GOLD}` : "3px solid transparent" }}
              >
                <t.icon size={18} color={active ? GOLD : "#9AA0A6"} />
                <span className="text-[13px] flex-1" style={{ color: active ? "white" : "#C9C6BC", fontFamily: "Inter, sans-serif", fontWeight: active ? 600 : 400 }}>
                  {t.label}
                </span>
                {locked && <Lock size={12} color="#6B7280" />}
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "#2A2A2A" }}>
          {user && user.multiSiteAccess && (
            <button
              onClick={() => setShowProjectSwitcher(true)}
              className="w-full flex items-center justify-center gap-2 rounded-md py-2 mb-2 text-[11px] font-bold uppercase border"
              style={{ borderColor: "#3A3A3A", color: "#C9C6BC", fontFamily: "IBM Plex Mono, monospace" }}
            >
              Switch Project
            </button>
          )}
          <button
            onClick={handleBadgeTap}
            className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-[12px] font-bold uppercase"
            style={{ background: GOLD, color: INK, fontFamily: "IBM Plex Mono, monospace" }}
          >
            <BadgeCheck size={16} /> {user ? "My Badge" : "Get Badge"}
          </button>
        </div>
      </div>

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <div className="md:hidden">
          <TopBar title={titles[screen]} onBack={screen !== "home" ? () => setScreen("home") : null} onBadge={handleBadgeTap} badgeLabel={user ? "Badge" : "Get Badge"} onProjectTap={() => setShowProjectSwitcher(true)} user={user} />
        </div>
        <div className="hidden md:flex items-center justify-between px-8 py-4 border-b flex-shrink-0" style={{ borderColor: "#E4E2DA", background: "white" }}>
          <div className="text-[18px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 600, color: INK }}>{titles[screen]}</div>
          {user && (
            <div className="text-[12px]" style={{ color: STEEL }}>
              Logged in as <span style={{ fontWeight: 600, color: INK }}>{user.name}</span> · Badge {user.badge}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="md:max-w-3xl md:mx-auto md:w-full">
            {screen === "home" && <HomeScreen go={go} progress={progress} user={user} activeProjectId={activeProjectId} />}
            {screen === "manual" && <ManualScreen />}
            {screen === "toolbox" && <ToolboxScreen />}
            {screen === "reports" && <WeeklyReportScreen />}
            {screen === "forms" && <FormsScreen user={user} />}
            {screen === "personnel" && <PersonnelScreen user={user} go={go} />}
            {screen === "addperson" && <AddPersonScreen user={user} onDone={() => go("personnel")} />}
            {screen === "manageroster" && <ManageRosterScreen user={user} />}
            {screen === "managebulletin" && <ManageBulletinScreen user={user} />}
            {screen === "workplans" && <WorkPlansScreen user={user} go={go} />}
            {screen === "manageworkplans" && <ManageWorkPlansScreen user={user} />}
            {screen === "emergency" && <EmergencyContactsScreen />}
            {screen === "concern" && (
              <ReportConcernScreen
                onSubmit={(report) => {
                  const now = new Date();
                  setConcernReports((r) => [
                    ...r,
                    { ...report, date: now.toLocaleDateString(), time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                  ]);
                }}
              />
            )}
            {screen === "orientation" && <OrientationScreen user={user} go={go} activeProjectId={activeProjectId} />}
            {screen === "manageorientation" && <ManageOrientationScreen user={user} />}
          </div>
        </div>

        {/* Mobile bottom tab bar */}
        <div className="flex border-t md:hidden sticky bottom-0" style={{ borderColor: "#E4E2DA", background: "white" }}>
          {tabs.map((t) => {
            const active = screen === t.key;
            const locked = GATED_SCREENS.includes(t.key) && !user;
            return (
              <button
                key={t.key}
                onClick={() => go(t.key)}
                className="flex-1 flex flex-col items-center py-2 relative"
              >
                <t.icon size={19} color={active ? GOLD : STEEL} />
                {locked && (
                  <Lock size={9} color={STEEL} className="absolute" style={{ top: 2, right: "28%" }} />
                )}
                <span
                  className="text-[10px] mt-0.5"
                  style={{ color: active ? GOLD : STEEL, fontFamily: "IBM Plex Mono, monospace", fontWeight: active ? 700 : 500 }}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {showBadge && user && (
        <BadgeModal
          user={user}
          onClose={() => setShowBadge(false)}
          trainingRecords={trainingRecords}
          onLogout={handleLogout}
        />
      )}
      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} activeProjectId={activeProjectId} />}
      {showProjectSwitcher && (
        <ProjectSwitcherModal
          activeProjectId={activeProjectId}
          onSelect={handleSwitchProject}
          onClose={() => setShowProjectSwitcher(false)}
        />
      )}
    </div>
    </ProjectContext.Provider>
  );
}
