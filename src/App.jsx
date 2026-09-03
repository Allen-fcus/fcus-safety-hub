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

function WorkPlansScreen() {
  const { sheetUrls, fallbacks } = useContext(ProjectContext);
  const [viewing, setViewing] = useState(null);
  const [flatPlans, loading] = useSheetData(sheetUrls.workPlans, fallbacks.workPlans, (row) => ({
    subcontractor: row.Subcontractor || "Unassigned",
    title: row.Title || "Untitled",
    pages: row.Pages || "—",
    link: row.ViewLink || "",
  }));

  const grouped = {};
  flatPlans.forEach((p) => {
    if (!grouped[p.subcontractor]) grouped[p.subcontractor] = [];
    grouped[p.subcontractor].push(p);
  });
  const subcontractors = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="px-4 pt-4 pb-8" style={{ background: "#F4F3EF", minHeight: "100%" }}>
      <div className="text-[12px] mb-3" style={{ color: STEEL }}>
        Active work plans by subcontractor. Viewing only — plans cannot be downloaded.
      </div>
      {loading && <div className="text-[12px] mb-2" style={{ color: STEEL }}>Loading…</div>}
      {subcontractors.map((name) => (
        <div key={name} className="mb-4">
          <div className="text-[11px] uppercase font-bold mb-2" style={{ color: STEEL, fontFamily: "IBM Plex Mono, monospace" }}>{name}</div>
          <div className="space-y-2">
            {grouped[name].map((p, i) => (
              <button
                key={i}
                onClick={() => setViewing(p)}
                className="w-full text-left bg-white rounded-md p-3 flex items-center justify-between border"
                style={{ borderColor: "#E4E2DA" }}
              >
                <div>
                  <div className="text-[14px]" style={{ fontFamily: "Oswald, sans-serif", fontWeight: 500 }}>{p.title}</div>
                  <div className="text-[11px]" style={{ color: STEEL }}>{p.pages} pages</div>
                </div>
                <Eye size={17} color={STEEL} />
              </button>
            ))}
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
          "Sheep Foot
