"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import * as tus from "tus-js-client";
import imageCompression from "browser-image-compression";
import IntakeChatbot from "../../components/IntakeChatbot";
import { getRoomSignal, getSignalLabel, getOverview, getFlags, getAssessment } from "../../lib/aiSummary";
import { apiFetch } from "../../lib/client/apiClient";
import { loadSession, saveSession, clearSession, DEFAULT_SESSION, type IntakeSession } from "../../lib/client/intakeSession";
import type { PlacesAutocompleteResult, PlaceDetails, UploadStatusResponse } from "../../lib/types";

const steps = ["Address", "Property", "Rooms", "Uploads", "Contact", "Review"];

interface UploadItem {
  id: string;
  fileId?: string;
  name: string;
  type: "photo" | "video";
  preview: string | null;
  progress: number;
  status: "uploading" | "ok" | "mismatch";
}

interface UploadSlotProps {
  item?: UploadItem;
  isVideo?: boolean;
  room: string;
  otherRooms: string[];
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  onResolve: (id: string) => void;
  onMove: (id: string, toRoom: string) => void;
}

function UploadSlot({ item, isVideo, room, otherRooms, onUpload, onRemove, onResolve, onMove }: UploadSlotProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (item) {
    return (
      <div className="upload-slot-filled">
        <div
          className={`upload-preview${item.type === "video" ? " upload-preview-video" : ""}`}
          style={item.preview ? { backgroundImage: `url(${item.preview})` } : {}}
        >
          {item.type === "video" && (
            <div className="video-info">
              <span className="video-play-icon">▶</span>
              <span className="video-filename">{item.name}</span>
            </div>
          )}
          <button type="button" className="upload-remove-btn" onClick={() => onRemove(item.id)}>×</button>
          <span className={`upload-status-badge status-${item.status}`}>
            {item.status === "uploading" && `↑ ${item.progress}%`}
            {item.status === "ok" && "✓ Matched"}
            {item.status === "mismatch" && "⚠ Wrong room?"}
          </span>
          {item.status === "uploading" && (
            <div className="upload-progress-track">
              <div className="upload-progress-fill" style={{ width: `${item.progress}%` }} />
            </div>
          )}
        </div>
        {item.status === "mismatch" && (
          <div className="mismatch-panel">
            <p className="mismatch-label">May not be <strong>{room}</strong>. Move to:</p>
            <div className="mismatch-rooms">
              {otherRooms.map(r => (
                <button key={r} type="button" className="mismatch-room-btn" onClick={() => onMove(item.id, r)}>{r}</button>
              ))}
            </div>
            <button type="button" className="mismatch-keep-btn" onClick={() => onResolve(item.id)}>
              Keep here — it&apos;s correct
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`upload-slot${isVideo ? " upload-slot-video" : ""}${dragging ? " dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div className="upload-empty-inner">
        <span className="upload-add-icon">{isVideo ? "▶" : "+"}</span>
        <span className="upload-add-label">{isVideo ? "Add video" : "Drop or click"}</span>
        {!isVideo && <span className="upload-add-hint">JPG · PNG · HEIC</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const baseRooms = ["Kitchen", "Living Room", "Exterior", "Garage", "Backyard"];

const PREQUAL_LABELS: Record<string, string> = {
  ownership:  "Ownership",
  timeline:   "Timeline",
  motivation: "Reason for Selling",
  mortgage:   "Mortgage",
  liens:      "Liens / Judgments",
  occupancy:  "Occupancy",
  offer_type: "Offer Preference"
};

// ─── Schemas ──────────────────────────────────────────────────────────────────
const addressSchema = z.object({
  address:   z.string().min(5),
  confirmed: z.literal(true)
});

const propertySchema = z.object({
  beds:      z.number().min(1),
  baths:     z.number().min(1),
  yearBuilt: z.string().min(4),
  lotSize:   z.string().min(1),
  condition: z.string().min(1)
});

const roomsSchema = z.object({
  rooms: z.array(z.string()).min(1)
});

const uploadsSchema = z.object({
  totalUploads: z.number().min(1)
});

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  phone:     z.string().min(7)
});

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IntakePage() {
  const router = useRouter();

  // ── Step / navigation
  const [currentStep, setCurrentStep]     = useState(0);
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">("forward");

  // ── Session (holds submissionId, humanId, placeId, addressCity/State/Zip, etc.)
  const [session, setSession] = useState<IntakeSession>(DEFAULT_SESSION);

  const updateSession = useCallback((updates: Partial<IntakeSession>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      saveSession(next);
      return next;
    });
  }, []);

  // ── Address step state
  const [addressQuery, setAddressQuery]               = useState("");
  const [isConfirmed, setIsConfirmed]                 = useState(false);
  const [isConfirming, setIsConfirming]               = useState(false);
  const [highlightedIndex, setHighlightedIndex]       = useState(-1);
  const [suggestions, setSuggestions]                 = useState<PlacesAutocompleteResult[]>([]);
  const [sessionToken]                                = useState(() => crypto.randomUUID());
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [exteriorImageUrl, setExteriorImageUrl]       = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Property step state
  const [sqft, setSqft]           = useState<string | null>(null);
  const [beds, setBeds]           = useState<number | null>(null);
  const [baths, setBaths]         = useState<number | null>(null);
  const [yearBuilt, setYearBuilt] = useState("");
  const [lotSize, setLotSize]     = useState("");
  const [condition, setCondition] = useState("");

  // ── Errors
  const [errors, setErrors]               = useState<{ address?: string; rooms?: string; uploads?: string; submit?: string }>({});
  const [propertyErrors, setPropertyErrors] = useState<{ beds?: string; baths?: string; yearBuilt?: string; lotSize?: string; condition?: string }>({});
  const [contactErrors, setContactErrors]   = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string }>({});

  // ── Submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Rooms step
  const [selectedRooms, setSelectedRooms] = useState<string[]>(["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"]);

  const roomOptions = useMemo(() => {
    const roomList = [...baseRooms];
    if (beds) {
      for (let i = 1; i <= beds; i++) roomList.splice(2, 0, `Bedroom ${i}`);
    }
    if (baths) {
      for (let i = 1; i <= baths; i++) roomList.splice(2 + (beds ?? 0), 0, `Bathroom ${i}`);
    }
    return roomList;
  }, [beds, baths]);

  useEffect(() => {
    setSelectedRooms(prev => prev.filter(room => roomOptions.includes(room)));
  }, [roomOptions]);

  // ── Upload step
  const [activePanel, setActivePanel] = useState("Kitchen");
  const [uploads, setUploads]         = useState<Record<string, UploadItem[]>>({});
  const uploadPanels = useMemo(() => selectedRooms, [selectedRooms]);

  // ── Contact step
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");

  // ── Review step
  const [prequalAnswers, setPrequalAnswers] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess]       = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // ── Derived
  const progress = useMemo(() => Math.round((currentStep / (steps.length - 1)) * 100), [currentStep]);

  const totalUploads = useMemo(
    () => Object.values(uploads).reduce((sum, arr) => sum + arr.length, 0),
    [uploads]
  );

  const roomUploadStatus = useMemo(() => selectedRooms.map(room => {
    const arr = uploads[room] ?? [];
    return {
      room,
      photoCount:    arr.filter(u => u.type === "photo").length,
      videoCount:    arr.filter(u => u.type === "video").length,
      photosMissing: Math.max(0, 3 - arr.filter(u => u.type === "photo").length),
      videoMissing:  Math.max(0, 1 - arr.filter(u => u.type === "video").length),
    };
  }), [selectedRooms, uploads]);

  const mismatchUploads = useMemo(() =>
    Object.entries(uploads).flatMap(([room, arr]) =>
      arr.filter(u => u.status === "mismatch").map(u => ({ room, item: u }))
    ), [uploads]);

  // ─── Redirect after success ───────────────────────────────────────────────
  useEffect(() => {
    if (!showSuccess) return undefined;
    const t = setTimeout(() => router.push("/"), 1200);
    return () => clearTimeout(t);
  }, [router, showSuccess]);

  // ─── Load pre-qual answers on Review step ────────────────────────────────
  useEffect(() => {
    if (currentStep !== steps.length - 1) return;
    try {
      const raw = localStorage.getItem("ch_prequal_answers");
      if (raw) setPrequalAnswers(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [currentStep]);

  // ─── Restore session on mount ─────────────────────────────────────────────
  useEffect(() => {
    const s = loadSession();
    // Restore if: past step 0, OR on step 0 but address already confirmed (has submissionId)
    if (!s) return;
    if (s.currentStep === 0 && !s.submissionId) return;

    setSession(s);
    setCurrentStep(s.currentStep);
    setAddressQuery(s.selectedAddress ?? "");
    setIsConfirmed(s.isConfirmed);
    setSqft(s.sqft);
    setBeds(s.beds);
    setBaths(s.baths);
    setYearBuilt(s.yearBuilt);
    setLotSize(s.lotSize);
    setCondition(s.condition);
    setSelectedRooms(s.selectedRooms);
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setEmail(s.email);
    setPhone(s.phone);
    setExteriorImageUrl(s.exteriorImageUrl);
    if (s.currentStep > 0) setShowResumeBanner(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Debounced session save ───────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      saveSession({
        ...session,
        currentStep,
        addressQuery,
        isConfirmed,
        sqft,
        beds,
        baths,
        yearBuilt,
        lotSize,
        condition,
        selectedRooms,
        firstName,
        lastName,
        email,
        phone,
        exteriorImageUrl,
        savedAt: new Date().toISOString(),
      });
    }, 800);
    return () => clearTimeout(t);
  }, [session, currentStep, addressQuery, isConfirmed, sqft, beds, baths, yearBuilt, lotSize, condition, selectedRooms, firstName, lastName, email, phone, exteriorImageUrl]);

  // ─── Address autocomplete — debounced 300ms ───────────────────────────────
  useEffect(() => {
    if (addressQuery.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        const results = await apiFetch<PlacesAutocompleteResult[]>(
          `/api/address/autocomplete?q=${encodeURIComponent(addressQuery)}&session=${sessionToken}`
        );
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addressQuery, sessionToken]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleStartFresh = () => {
    clearSession();
    localStorage.removeItem("ch_prequal_answers");
    setShowResumeBanner(false);
    setSession(DEFAULT_SESSION);
    setCurrentStep(0);
    setAddressQuery("");
    setIsConfirmed(false);
    
    setSuggestions([]);
    setExteriorImageUrl(null);
    setSqft(null);
    setBeds(null);
    setBaths(null);
    setYearBuilt("");
    setLotSize("");
    setCondition("");
    setSelectedRooms(["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"]);
    setUploads({});
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
  };

  const handleSelectSuggestion = useCallback((suggestion: PlacesAutocompleteResult) => {
    setAddressQuery(suggestion.description);
    setIsConfirmed(false);
    setHighlightedIndex(-1);
    setSuggestions([]);
    updateSession({ placeId: suggestion.placeId, selectedAddress: suggestion.description });
  }, [updateSession]);

  const handleManualEntry = useCallback(() => {
    setIsConfirmed(true);
    setHighlightedIndex(-1);
    setSuggestions([]);
    updateSession({ placeId: null, selectedAddress: addressQuery });
  }, [addressQuery, updateSession]);

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      // 1. Get structured place details (city, state, zip, lat, lng)
      let city = "", state = "", zip = "", lat = 0, lng = 0;
      let fullAddress = addressQuery;

      const placeId = session.placeId;
      if (placeId) {
        const details = await apiFetch<PlaceDetails>(
          `/api/address/details?placeId=${encodeURIComponent(placeId)}`
        );
        city        = details.addressCity ?? "";
        state       = details.addressState ?? "";
        zip         = details.addressZip ?? "";
        lat         = details.lat ?? 0;
        lng         = details.lng ?? 0;
        fullAddress = details.formattedAddress ?? addressQuery;
        setAddressQuery(fullAddress);
      }

      // 2. Get Street View image — non-blocking failure
      const streetView = await apiFetch<{ exteriorImageUrl: string }>(
        `/api/address/property?address=${encodeURIComponent(fullAddress)}`
      ).catch(() => null);
      if (streetView?.exteriorImageUrl) setExteriorImageUrl(streetView.exteriorImageUrl);

      // 3. Create/update draft submission — get real submissionId
      const draft = await apiFetch<{ submissionId: string; humanId: string }>(
        "/api/intake/draft",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address:         fullAddress,
            addressCity:     city,
            addressState:    state,
            addressZip:      zip,
            addressLat:      lat || undefined,
            addressLng:      lng || undefined,
            existingDraftId: session.submissionId ?? undefined,
          }),
        }
      );

      // 4. Persist everything to session
      updateSession({
        submissionId:    draft.submissionId,
        humanId:         draft.humanId,
        selectedAddress: fullAddress,
        addressCity:     city,
        addressState:    state,
        addressZip:      zip,
        addressLat:      lat || null,
        addressLng:      lng || null,
        exteriorImageUrl: streetView?.exteriorImageUrl ?? null,
        placeId:          null,
      });

      setIsConfirmed(true);
    } catch (e) {
      setErrors({ address: "Could not confirm address. Please try again." });
      console.error(e);
    } finally {
      setIsConfirming(false);
    }
  }, [addressQuery, session.placeId, session.submissionId, updateSession]);

  const showDropdown = addressQuery.length >= 2 && !isConfirmed && suggestions.length > 0;

  const handleAddressKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (addressQuery.length < 2 || isConfirmed) return;
    const total = suggestions.length + 1; // +1 for manual entry
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[highlightedIndex]);
      } else if (highlightedIndex === suggestions.length) {
        handleManualEntry();
      }
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
    }
  }, [addressQuery, isConfirmed, suggestions, highlightedIndex, handleSelectSuggestion, handleManualEntry]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // ─── Upload handlers ────────────────────────────────────────────────────────
  const addUpload = useCallback((room: string, file: File) => {
    const submissionId = session.submissionId;
    if (!submissionId) return;

    const isVideo = file.type.startsWith("video/");
    const id = `${room}-${Date.now()}`;
    const preview = !isVideo ? URL.createObjectURL(file) : null;

    setUploads(prev => ({
      ...prev,
      [room]: [...(prev[room] ?? []), { id, name: file.name, type: isVideo ? "video" : "photo", preview, progress: 0, status: "uploading" }],
    }));

    (async () => {
      try {
        // 0. Compress photos client-side before upload
        let fileToUpload: File = file;
        if (!isVideo) {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB:        2,
              maxWidthOrHeight: 2048,
              useWebWorker:     true,
              initialQuality:   0.85,
            });
            fileToUpload = compressed;
            const newPreview = URL.createObjectURL(compressed);
            setUploads(prev => ({
              ...prev,
              [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, preview: newPreview } : u),
            }));
            if (preview) URL.revokeObjectURL(preview);
          } catch {
            fileToUpload = file;
          }
        }

        // 1. Init — register file in DB + get signed Supabase Storage URL + TUS token
        const { fileId, uploadUrl, storagePath, token } = await apiFetch<{ fileId: string; uploadUrl: string; storagePath: string; token: string }>(
          "/api/intake/upload/init",
          {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              submissionId,
              room,
              fileType:     isVideo ? "video" : "photo",
              originalName: fileToUpload.name,
              mimeType:     fileToUpload.type,
              sizeBytes:    fileToUpload.size,
            }),
          }
        );

        setUploads(prev => ({
          ...prev,
          [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, fileId } : u),
        }));

        // 2. Upload to Supabase Storage
        if (isVideo) {
          // TUS resumable upload for videos — chunked, survives connection drops
          await new Promise<void>((resolve, reject) => {
            const upload = new tus.Upload(fileToUpload, {
              endpoint:                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
              retryDelays:                 [0, 3000, 5000, 10000, 20000],
              headers:                     { authorization: `Bearer ${token}`, "x-upsert": "false" },
              uploadDataDuringCreation:    true,
              removeFingerprintOnSuccess:  true,
              metadata: {
                bucketName:  "property-media",
                objectName:  storagePath,
                contentType: fileToUpload.type,
                cacheControl: "3600",
              },
              chunkSize:  6 * 1024 * 1024,
              onProgress: (bytesUploaded, bytesTotal) => {
                const pct = Math.round((bytesUploaded / bytesTotal) * 90);
                setUploads(prev => ({
                  ...prev,
                  [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, progress: pct } : u),
                }));
              },
              onSuccess: () => resolve(),
              onError:   (err) => reject(err),
            });
            upload.start();
          });
        } else {
          // XHR PUT for photos — already compressed, fast single-shot
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", fileToUpload.type);
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 90);
                setUploads(prev => ({
                  ...prev,
                  [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, progress: pct } : u),
                }));
              }
            };
            xhr.onload  = () => xhr.status < 400 ? resolve() : reject(new Error(`Upload ${xhr.status}`));
            xhr.onerror = () => reject(new Error("Network error"));
            xhr.send(fileToUpload);
          });
        }

        // 3. Confirm — triggers background AI room detection for photos
        await apiFetch("/api/intake/upload/confirm", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId, submissionId }),
        });

        setUploads(prev => ({
          ...prev,
          [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, progress: 100, status: "ok" } : u),
        }));

        // 4. Poll for AI mismatch result (photos only, max ~30s)
        if (!isVideo) {
          let attempts = 0;
          const poll = async () => {
            if (attempts++ >= 12) return;
            try {
              const s = await apiFetch<UploadStatusResponse>(
                `/api/intake/upload/status?fileId=${fileId}&submissionId=${submissionId}`
              );
              if (s.aiStatus === "done") {
                if (s.isMismatch) {
                  setUploads(prev => ({
                    ...prev,
                    [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, status: "mismatch" } : u),
                  }));
                }
                return;
              }
            } catch { return; }
            setTimeout(poll, 2500);
          };
          setTimeout(poll, 2500);
        }
      } catch (e) {
        console.error("Upload failed:", e);
        setUploads(prev => {
          const item = (prev[room] ?? []).find(u => u.id === id);
          if (item?.fileId) {
            fetch(`/api/intake/upload/init?fileId=${item.fileId}&submissionId=${submissionId}`, { method: "DELETE" }).catch(() => {});
          }
          if (item?.preview) URL.revokeObjectURL(item.preview);
          return { ...prev, [room]: (prev[room] ?? []).filter(u => u.id !== id) };
        });
      }
    })();
  }, [session.submissionId]);

  const removeUpload = (room: string, id: string) => {
    setUploads(prev => {
      const item = (prev[room] ?? []).find(u => u.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return { ...prev, [room]: (prev[room] ?? []).filter(u => u.id !== id) };
    });
  };

  const moveUpload = (fromRoom: string, id: string, toRoom: string) => {
    setUploads(prev => {
      const item = (prev[fromRoom] ?? []).find(u => u.id === id);
      if (!item) return prev;
      return {
        ...prev,
        [fromRoom]: (prev[fromRoom] ?? []).filter(u => u.id !== id),
        [toRoom]:   [...(prev[toRoom] ?? []), { ...item, status: "ok" as const }],
      };
    });
    setActivePanel(toRoom);
  };

  const resolveMismatch = (room: string, id: string) => {
    setUploads(prev => ({
      ...prev,
      [room]: (prev[room] ?? []).map(u => u.id === id ? { ...u, status: "ok" as const } : u)
    }));
  };

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateStep = (step: number) => {
    setErrors({});
    setPropertyErrors({});

    if (step === 0) {
      const result = addressSchema.safeParse({ address: addressQuery, confirmed: isConfirmed });
      if (!result.success) {
        setErrors({ address: "Confirm the address to continue." });
        return false;
      }
    }

    if (step === 1) {
      const result = propertySchema.safeParse({ beds: beds ?? 0, baths: baths ?? 0, yearBuilt, lotSize, condition });
      if (!result.success) {
        const fieldErrors: typeof propertyErrors = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof typeof fieldErrors;
          fieldErrors[field] = "Required";
        }
        setPropertyErrors(fieldErrors);
        return false;
      }
    }

    if (step === 2) {
      const result = roomsSchema.safeParse({ rooms: selectedRooms });
      if (!result.success) {
        setErrors({ rooms: "Select at least one room to continue." });
        return false;
      }
    }

    if (step === 3) {
      const result = uploadsSchema.safeParse({ totalUploads });
      if (!result.success) {
        setErrors({ uploads: "Upload at least one photo or video." });
        return false;
      }
      if (mismatchUploads.length > 0) {
        setErrors({ uploads: "Fix any room mismatches before continuing." });
        return false;
      }
      const incompleteRooms = roomUploadStatus.filter(r => r.photosMissing > 0 || r.videoMissing > 0);
      if (incompleteRooms.length > 0) {
        setErrors({ uploads: `Please complete uploads for: ${incompleteRooms.map(r => r.room).join(", ")}. Each room needs 3 photos and 1 video.` });
        return false;
      }
    }

    if (step === 4) {
      const result = contactSchema.safeParse({ firstName, lastName, email, phone });
      if (!result.success) {
        const fieldErrors: typeof contactErrors = {};
        for (const issue of result.error.issues) {
          const field = issue.path[0] as keyof typeof contactErrors;
          fieldErrors[field] = field === "email" ? "Valid email required" : "Required";
        }
        setContactErrors(fieldErrors);
        return false;
      }
      setContactErrors({});
    }

    return true;
  };

  const handleContinue = () => {
    if (!validateStep(currentStep)) return;
    setStepDirection("forward");
    setCurrentStep(prev => Math.min(steps.length - 1, prev + 1));
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <main className="intake-shell">
      <section className="intake-hero">
        <div className="container intake-hero-inner">
          <div className="intake-hero-text reveal">
            <div className="hero-pill">Private Seller Intake · Concierge Guided</div>
            <h1>Seller Intake</h1>
            <p>A refined, step-by-step intake designed for clarity, speed, and premium review.</p>
          </div>
          <div className="intake-progress reveal" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <div className="stepper">
              <div className="stepper-bar">
                <div className="stepper-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="stepper-steps">
                {steps.map((step, index) => {
                  const isActive   = index === currentStep;
                  const isComplete = index < currentStep;
                  return (
                    <div className="step" key={step}>
                      <span className={`step-indicator${isActive ? " active" : isComplete ? " complete" : ""}`}>
                        {isComplete ? "✓" : index + 1}
                      </span>
                      <span className={`step-label${isActive ? " active" : ""}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="intake-body">
        <div className="container">
          <div className="intake-card intake-panel reveal">
            <div className="intake-card-progress-bar">
              <div className="intake-card-progress-fill" style={{ width: `${Math.round((currentStep / (steps.length - 1)) * 100)}%` }} />
            </div>
            <div className="intake-step-header">
              <div>
                <h2>{steps[currentStep]}</h2>
                <p className="intake-step-help">Complete each section to continue.</p>
              </div>
              <span className="intake-step-count">Step {currentStep + 1} of {steps.length}</span>
            </div>

            <div className="intake-step-body" key={currentStep} data-dir={stepDirection}>

              {/* Resume banner */}
              {showResumeBanner && (
                <div className="resume-banner">
                  <span className="resume-banner-icon">👋</span>
                  <div className="resume-banner-text">
                    <strong>Welcome back!</strong>
                    <span>Your progress has been saved. Pick up where you left off.</span>
                  </div>
                  <div className="resume-banner-actions">
                    <button type="button" className="resume-fresh-btn" onClick={handleStartFresh}>Start fresh</button>
                    <button type="button" className="resume-dismiss-btn" onClick={() => setShowResumeBanner(false)}>×</button>
                  </div>
                </div>
              )}

              {/* ── Step 0: Address ───────────────────────────────────────── */}
              {currentStep === 0 && (
                <div className="address-step">
                  <div className="address-card">
                    <label className="input-label" htmlFor="address-search">Property address</label>
                    <div className="address-input-wrapper" ref={dropdownRef}>
                      <div className={`input-with-icon${showDropdown ? " focused" : ""}`}>
                        <span className="input-icon">📍</span>
                        <input
                          id="address-search"
                          type="text"
                          placeholder="Start typing your address…"
                          value={addressQuery}
                          autoComplete="off"
                          onChange={e => {
                            setAddressQuery(e.target.value);
                            setIsConfirmed(false);
                            
                            setHighlightedIndex(-1);
                            updateSession({ placeId: null, selectedAddress: null });
                          }}
                          onKeyDown={handleAddressKeyDown}
                        />
                        {autocompleteLoading && (
                          <span className="input-icon" style={{ right: 36 }}>⟳</span>
                        )}
                        {addressQuery && (
                          <button
                            type="button"
                            className="input-clear"
                            aria-label="Clear address"
                            onClick={() => {
                              setAddressQuery("");
                              setIsConfirmed(false);
                              setSuggestions([]);
                              setHighlightedIndex(-1);
                              updateSession({ placeId: null, selectedAddress: null });
                            }}
                          >×</button>
                        )}
                      </div>

                      {showDropdown && (
                        <div className="address-dropdown" role="listbox">
                          {suggestions.map((s, i) => (
                            <button
                              key={s.placeId}
                              type="button"
                              role="option"
                              aria-selected={highlightedIndex === i}
                              className={`address-dropdown-item${highlightedIndex === i ? " highlighted" : ""}`}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              onClick={() => handleSelectSuggestion(s)}
                            >
                              <span className="dropdown-item-icon">📍</span>
                              <span className="dropdown-item-text">
                                <span className="dropdown-address-line">{s.mainText}</span>
                                <span className="dropdown-meta-line">{s.secondaryText}</span>
                              </span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className={`address-dropdown-manual${highlightedIndex === suggestions.length ? " highlighted" : ""}`}
                            onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                            onClick={handleManualEntry}
                          >
                            <span style={{ fontSize: "14px" }}>✏️</span>
                            Use &ldquo;{addressQuery}&rdquo; — enter manually
                          </button>
                        </div>
                      )}
                    </div>

                    {errors.address && <div className="intake-error">⚠ {errors.address}</div>}
                  </div>

                  {/* Property confirmation card */}
                  {addressQuery.length >= 5 && (
                    <div className={`property-card${isConfirmed ? " confirmed" : ""}`}>
                      {/* Street View image */}
                      {exteriorImageUrl ? (
                        <img
                          src={exteriorImageUrl}
                          alt="Street view"
                          className="property-image"
                          style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                      ) : (
                        <div className="property-image">
                          <span className="property-image-label">Exterior · Auto-fetched</span>
                        </div>
                      )}

                      <div className="property-details">
                        <div>
                          <p className="property-address">{session.selectedAddress || addressQuery}</p>
                          <p className="property-meta">
                            {isConfirmed
                              ? `${sqft ?? "—"} sqft · ${beds ?? "—"} bed · ${baths ?? "—"} bath`
                              : "Confirm to continue"}
                          </p>
                        </div>
                      </div>

                      {!isConfirmed && (
                        <div className="property-actions">
                          <span>Is this the correct property?</span>
                          <div className="property-buttons">
                            <button
                              className="button-secondary"
                              type="button"
                              onClick={() => {
                                setIsConfirmed(false);
                                
                                setAddressQuery("");
                                setSuggestions([]);
                                updateSession({ placeId: null, selectedAddress: null });
                              }}
                            >No, search again</button>
                            <button
                              className="button-primary"
                              type="button"
                              disabled={isConfirming}
                              onClick={handleConfirm}
                            >
                              {isConfirming ? <><span className="btn-spinner" />Confirming…</> : "Yes, this is correct"}
                            </button>
                          </div>
                        </div>
                      )}

                      {isConfirmed && (
                        <div className="property-confirmed">
                          <span className="property-confirmed-icon">✓</span>
                          Address confirmed
                          {session.humanId && <span className="property-confirmed-id"> · {session.humanId}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 1: Property ──────────────────────────────────────── */}
              {currentStep === 1 && (
                <div className="property-step">
                  <div className="form-grid">
                    <div>
                      <label className="input-label">Square Footage</label>
                      <input
                        className="text-input"
                        type="number"
                        placeholder="2140"
                        value={sqft ?? ""}
                        onChange={e => setSqft(e.target.value)}
                      />
                      <p className="helper-text">From public records — edit if incorrect.</p>
                    </div>
                    <div>
                      <label className="input-label">Bedrooms</label>
                      <div className="segmented-control-row">
                        <div className="segmented-control">
                          {[1, 2, 3, 4, 5, 6, 7].map(v => (
                            <button key={`bed-${v}`} type="button" className={beds === v ? "active" : ""} onClick={() => setBeds(v)}>{v}</button>
                          ))}
                          <button type="button" className={(beds ?? 0) >= 8 ? "active" : ""} onClick={() => setBeds(8)}>8+</button>
                        </div>
                        {(beds ?? 0) >= 8 && (
                          <input className="text-input segmented-custom-input" type="number" min={8} max={20} placeholder="Enter count"
                            value={beds ?? ""} onChange={e => setBeds(Math.max(8, parseInt(e.target.value) || 8))} />
                        )}
                      </div>
                      {propertyErrors.beds && <p className="field-error">{propertyErrors.beds}</p>}
                      <p className="helper-text">Select the total bedrooms.</p>
                    </div>
                    <div>
                      <label className="input-label">Bathrooms</label>
                      <div className="segmented-control-row">
                        <div className="segmented-control">
                          {[1, 2, 3, 4, 5].map(v => (
                            <button key={`bath-${v}`} type="button" className={baths === v ? "active" : ""} onClick={() => setBaths(v)}>{v}</button>
                          ))}
                          <button type="button" className={(baths ?? 0) >= 6 ? "active" : ""} onClick={() => setBaths(6)}>6+</button>
                        </div>
                        {(baths ?? 0) >= 6 && (
                          <input className="text-input segmented-custom-input" type="number" min={6} max={20} placeholder="Enter count"
                            value={baths ?? ""} onChange={e => setBaths(Math.max(6, parseInt(e.target.value) || 6))} />
                        )}
                      </div>
                      {propertyErrors.baths && <p className="field-error">{propertyErrors.baths}</p>}
                      <p className="helper-text">Include full and half baths.</p>
                    </div>
                    <div>
                      <label className="input-label">Year Built</label>
                      <input className="text-input" type="number" placeholder="2008" value={yearBuilt}
                        onChange={e => setYearBuilt(e.target.value)} />
                      {propertyErrors.yearBuilt && <p className="field-error">{propertyErrors.yearBuilt}</p>}
                      <p className="helper-text">Use the year on your deed or listing.</p>
                    </div>
                    <div>
                      <label className="input-label">Lot Size</label>
                      <input className="text-input" type="text" placeholder="0.23 acres" value={lotSize}
                        onChange={e => setLotSize(e.target.value)} />
                      {propertyErrors.lotSize && <p className="field-error">{propertyErrors.lotSize}</p>}
                      <p className="helper-text">Approximate lot size is okay.</p>
                    </div>
                    <div>
                      <label className="input-label">Condition</label>
                      <select className="text-input" value={condition} onChange={e => setCondition(e.target.value)}>
                        <option value="">Select</option>
                        <option>Excellent</option>
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Needs work</option>
                      </select>
                      {propertyErrors.condition && <p className="field-error">{propertyErrors.condition}</p>}
                      <p className="helper-text">Select the best match.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Rooms ─────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div className="rooms-step">
                  <div className="section-header">
                    <h3>Select rooms and areas</h3>
                    <p>We&apos;ll generate upload slots for every room you select.</p>
                  </div>
                  <div className="room-grid">
                    {roomOptions.map(room => {
                      const isSelected = selectedRooms.includes(room);
                      return (
                        <button
                          key={room}
                          type="button"
                          className={`room-card${isSelected ? " active" : ""}`}
                          onClick={() => setSelectedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room])}
                        >
                          <span className="room-icon">🏠</span>
                          <span className="room-label">{room}</span>
                          <span className="room-state">{isSelected ? "Selected" : "Tap to add"}</span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.rooms && <div className="intake-error">⚠ {errors.rooms}</div>}
                </div>
              )}

              {/* ── Step 3: Uploads ───────────────────────────────────────── */}
              {currentStep === 3 && (
                <div className="uploads-step">
                  <div className="section-header">
                    <h3>Upload your walkthrough</h3>
                    <p>3 photos + 1 video per room. Drag files onto each slot or click to browse.</p>
                  </div>
                  {mismatchUploads.length > 0 && (
                    <div className="upload-mismatch-banner">
                      <span>⚠</span>
                      <div>
                        <strong>Room mismatch detected</strong>
                        <span>Fix the flagged photos before continuing.</span>
                      </div>
                    </div>
                  )}
                  <div className="upload-panels">
                    {uploadPanels.map(panel => {
                      const roomStatus = roomUploadStatus.find(r => r.room === panel);
                      const isDone     = roomStatus?.photosMissing === 0 && roomStatus?.videoMissing === 0;
                      const photoItems = (uploads[panel] ?? []).filter(u => u.type === "photo");
                      const videoItem  = (uploads[panel] ?? []).find(u => u.type === "video");
                      const otherRooms = selectedRooms.filter(r => r !== panel);
                      return (
                        <div key={panel} className={`upload-panel${isDone ? " done" : ""}`}>
                          <button
                            type="button"
                            className={`upload-panel-header${activePanel === panel ? " active" : ""}${isDone ? " done" : ""}`}
                            onClick={() => setActivePanel(activePanel === panel ? "" : panel)}
                          >
                            {isDone && <span className="upload-panel-check">✓</span>}
                            <span className="upload-panel-room">{panel}</span>
                            <span className="upload-panel-meta">{roomStatus?.photoCount ?? 0}/3 photos · {roomStatus?.videoCount ?? 0}/1 video</span>
                            <span className="upload-panel-toggle">{activePanel === panel ? "−" : "+"}</span>
                          </button>
                          {activePanel === panel && (
                            <div className="upload-panel-body">
                              <div className="upload-slot-grid">
                                {Array.from({ length: 3 }).map((_, idx) => (
                                  <UploadSlot
                                    key={`${panel}-photo-${idx}`}
                                    item={photoItems[idx]}
                                    room={panel}
                                    otherRooms={otherRooms}
                                    onUpload={file => addUpload(panel, file)}
                                    onRemove={id => removeUpload(panel, id)}
                                    onResolve={id => resolveMismatch(panel, id)}
                                    onMove={(id, toRoom) => moveUpload(panel, id, toRoom)}
                                  />
                                ))}
                                <UploadSlot
                                  key={`${panel}-video`}
                                  item={videoItem}
                                  isVideo
                                  room={panel}
                                  otherRooms={otherRooms}
                                  onUpload={file => addUpload(panel, file)}
                                  onRemove={id => removeUpload(panel, id)}
                                  onResolve={id => resolveMismatch(panel, id)}
                                  onMove={(id, toRoom) => moveUpload(panel, id, toRoom)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors.uploads && <div className="intake-error">⚠ {errors.uploads}</div>}
                </div>
              )}

              {/* ── Step 4: Contact ───────────────────────────────────────── */}
              {currentStep === 4 && (
                <div className="contact-step">
                  <div className="form-grid">
                    <div>
                      <label className="input-label">First name</label>
                      <input className={`text-input${contactErrors.firstName ? " input-error" : ""}`} type="text" placeholder="Jane"
                        value={firstName} onChange={e => { setFirstName(e.target.value); setContactErrors(p => ({ ...p, firstName: undefined })); }} />
                      {contactErrors.firstName && <p className="field-error">{contactErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="input-label">Last name</label>
                      <input className={`text-input${contactErrors.lastName ? " input-error" : ""}`} type="text" placeholder="Smith"
                        value={lastName} onChange={e => { setLastName(e.target.value); setContactErrors(p => ({ ...p, lastName: undefined })); }} />
                      {contactErrors.lastName && <p className="field-error">{contactErrors.lastName}</p>}
                    </div>
                    <div>
                      <label className="input-label">Email address</label>
                      <input className={`text-input${contactErrors.email ? " input-error" : ""}`} type="email" placeholder="jane@example.com"
                        value={email} onChange={e => { setEmail(e.target.value); setContactErrors(p => ({ ...p, email: undefined })); }} />
                      {contactErrors.email && <p className="field-error">{contactErrors.email}</p>}
                    </div>
                    <div>
                      <label className="input-label">Phone number</label>
                      <input className={`text-input${contactErrors.phone ? " input-error" : ""}`} type="tel" placeholder="(555) 000-0000"
                        value={phone} onChange={e => { setPhone(e.target.value); setContactErrors(p => ({ ...p, phone: undefined })); }} />
                      {contactErrors.phone && <p className="field-error">{contactErrors.phone}</p>}
                    </div>
                  </div>
                  <p className="contact-note">Your information is kept private and only used to follow up on your submission.</p>
                </div>
              )}

              {/* ── Step 5: Review ────────────────────────────────────────── */}
              {currentStep === 5 && (
                <div className="review-step">
                  <div className="review-grid">
                    <div className="review-left">
                      <div className="summary-card">
                        <h3>Property Summary</h3>
                        <p className="summary-address">
                          {session.selectedAddress || addressQuery || "Address pending"}
                        </p>
                        <div className="summary-meta">
                          <span>{sqft || "—"} sqft</span>
                          <span>{beds ?? "—"} bed</span>
                          <span>{baths ?? "—"} bath</span>
                        </div>
                        <div className="summary-details">
                          <div><span>Year built</span><strong>{yearBuilt || "—"}</strong></div>
                          <div><span>Lot size</span><strong>{lotSize || "—"}</strong></div>
                          <div><span>Condition</span><strong>{condition || "—"}</strong></div>
                        </div>
                      </div>

                      <div className="summary-card">
                        <h3>Contact Info</h3>
                        <div className="summary-details">
                          <div><span>Name</span><strong>{`${firstName} ${lastName}`.trim() || "—"}</strong></div>
                          <div><span>Email</span><strong>{email || "—"}</strong></div>
                          <div><span>Phone</span><strong>{phone || "—"}</strong></div>
                        </div>
                      </div>

                      <div className="ai-summary-card">
                        <div className="ai-header">
                          <h3>AI Summary (Preview)</h3>
                          <span className="ai-badge">Estimated · Final generated after review</span>
                        </div>
                        <div className="admin-ai-card">
                          <div className="ai-summary-section">
                            <h5>Property Overview</h5>
                            <p>{getOverview(condition, beds, baths)}</p>
                          </div>
                          <div className="ai-summary-section">
                            <h5>Condition by Room</h5>
                            <div className="ai-room-grid">
                              {selectedRooms.map(room => {
                                const signal = getRoomSignal(room, condition);
                                return (
                                  <div key={room} className="ai-room-row">
                                    <span className="ai-room-name">{room}</span>
                                    <span className={`ai-room-signal ai-signal-${signal}`}>{getSignalLabel(signal)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="ai-summary-section">
                            <h5>Visible Flags</h5>
                            <div className="admin-ai-flags">
                              {getFlags(condition).map(flag => <span key={flag}>{flag}</span>)}
                            </div>
                          </div>
                          <div className="ai-summary-section">
                            <h5>Overall Assessment</h5>
                            <p className="ai-overall">{getAssessment(condition)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="review-right">
                      <div className="gallery-card">
                        <h3>Photo Gallery</h3>
                        <div className="gallery-grid">
                          {(() => {
                            const photos = Object.entries(uploads).flatMap(([room, items]) =>
                              items.filter(i => i.type === "photo" && i.preview)
                                   .map(i => ({ id: i.id, preview: i.preview!, room }))
                            ).slice(0, 9);
                            if (photos.length === 0) {
                              return Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="gallery-tile"><span>Room photo {i + 1}</span></div>
                              ));
                            }
                            return photos.map(photo => (
                              <div key={photo.id} className="gallery-tile"
                                style={{ backgroundImage: `url(${photo.preview})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                                <span className="gallery-tile-room">{photo.room}</span>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      <div className="prequal-card">
                        <h3>Pre‑Qualification Answers</h3>
                        {Object.keys(prequalAnswers).length > 0 ? (
                          <div className="prequal-list">
                            {Object.entries(prequalAnswers).map(([key, value]) => (
                              <div key={key}>
                                <span>{PREQUAL_LABELS[key] ?? key}</span>
                                <strong>{value}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="prequal-empty">Complete the pre-qualification chat to see your answers here.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {errors.submit && (
                    <p className="field-error" style={{ textAlign: "center", marginBottom: "0.75rem" }}>{errors.submit}</p>
                  )}
                  <button
                    className="button-primary submit-button"
                    type="button"
                    disabled={isSubmitting}
                    onClick={async () => {
                      if (!session.submissionId) {
                        setErrors(e => ({ ...e, submit: "Session expired — please start again." }));
                        return;
                      }
                      setIsSubmitting(true);
                      setErrors(e => ({ ...e, submit: undefined }));
                      try {
                        await apiFetch("/api/intake/submit", {
                          method:  "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            submissionId:   session.submissionId,
                            firstName:      firstName.trim(),
                            lastName:       lastName.trim(),
                            email:          email.trim(),
                            phone:          phone.trim(),
                            sqft:           sqft ?? undefined,
                            beds:           beds ?? undefined,
                            baths:          baths ?? undefined,
                            yearBuilt:      yearBuilt || undefined,
                            lotSize:        lotSize || undefined,
                            condition:      condition || undefined,
                            rooms:          selectedRooms,
                            prequalAnswers,
                          }),
                        });
                        clearSession();
                        localStorage.removeItem("ch_prequal_answers");
                        setShowSuccess(true);
                      } catch (e: unknown) {
                        const msg = e instanceof Error ? e.message : "Submission failed. Please try again.";
                        setErrors(prev => ({ ...prev, submit: msg }));
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    {isSubmitting ? <><span className="btn-spinner" />Submitting…</> : "Submit Intake"}
                  </button>
                </div>
              )}

            </div>
          </div>

          {currentStep < steps.length - 1 && (
            <div className="intake-nav">
              <button
                className="button-secondary"
                onClick={() => { setStepDirection("backward"); setCurrentStep(prev => Math.max(0, prev - 1)); }}
                disabled={currentStep === 0}
              >Back</button>
              <button
                className="button-primary"
                onClick={handleContinue}
                disabled={currentStep === steps.length - 1}
              >Continue</button>
            </div>
          )}
        </div>
      </section>

      <IntakeChatbot currentStep={currentStep} />

      {showSuccess && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h3>Submission received</h3>
            <p>
              Thanks{firstName ? `, ${firstName}` : ""}! Your intake{session.humanId ? ` (${session.humanId})` : ""} has been sent for review.
              You&apos;ll receive a confirmation email with next steps.
            </p>
            <button className="button-primary" type="button" onClick={() => router.push("/")}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
