import React, { useState, useRef, useEffect, useMemo, createContext, useContext } from "react";
import Papa from "papaparse";
import { Wallet, Home, BookOpen, PlayCircle, ClipboardCheck, FileText, ChevronRight, Download, CheckCircle2, Circle, X, Play, ShieldAlert, Clock, Eraser, Send, PenLine, Users, Eye, BadgeCheck, LogOut, Loader2, CalendarDays, MapPin, Megaphone, Pin, ExternalLink, Lock, AlertTriangle, Camera, Phone, MessageSquare, ImagePlus, Volume2, VolumeX, Pause, Truck, BarChart3, Search } from "lucide-react";
import { supabase, loadProjectMap, projectIdForSlug, projectSlugForId } from "./supabaseClient.js";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { LOGO_FCW24, LOGO_WEBBER, LOGO_NTA } from "./projectLogos.js";

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
