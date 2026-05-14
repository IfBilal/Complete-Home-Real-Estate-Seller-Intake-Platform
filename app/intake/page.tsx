"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import IntakeChatbot from "../../components/IntakeChatbot";
import { getRoomSignal, getSignalLabel, getOverview, getFlags, getAssessment } from "../../lib/aiSummary";

const steps = ["Address", "Property", "Rooms", "Uploads", "Contact", "Review"];
const SESSION_KEY = "ch_intake_session";

interface UploadItem {
  id: string;
  name: string;
  type: "photo" | "video";
  preview: string | null;
  progress: number;
  status: "compressing" | "uploading" | "ok" | "mismatch";
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
            {item.status === "compressing" && "⏳ Compressing"}
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

const mockProperties = [
  {
    address: "123 Willow Lane, Austin TX",
    sqft: "2,140",
    beds: 4,
    baths: 3,
    yearBuilt: 2008,
    lotSize: "0.23 ac"
  },
  {
    address: "88 Brookview Dr, Dallas TX",
    sqft: "1,860",
    beds: 3,
    baths: 2,
    yearBuilt: 2012,
    lotSize: "0.19 ac"
  },
  {
    address: "410 Lake Crest Rd, Houston TX",
    sqft: "2,980",
    beds: 5,
    baths: 4,
    yearBuilt: 2016,
    lotSize: "0.31 ac"
  }
];

const baseRooms = ["Kitchen", "Living Room", "Exterior", "Garage", "Backyard"];

const PREQUAL_LABELS: Record<string, string> = {
  ownership: "Ownership",
  timeline: "Timeline",
  motivation: "Reason for Selling",
  mortgage: "Mortgage",
  liens: "Liens / Judgments",
  occupancy: "Occupancy",
  offer_type: "Offer Preference"
};

const addressSchema = z.object({
  address: z.string().min(5),
  confirmed: z.literal(true)
});

const propertySchema = z.object({
  bedrooms: z.number().min(1),
  bathrooms: z.number().min(1),
  yearBuilt: z.string().min(4),
  lotSize: z.string().min(1),
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
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7)
});

export default function IntakePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<
    (typeof mockProperties)[number] | null
  >(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [yearBuilt, setYearBuilt] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [condition, setCondition] = useState("");
  const [errors, setErrors] = useState<{
    address?: string;
    rooms?: string;
    uploads?: string;
  }>({});
  const [propertyErrors, setPropertyErrors] = useState<{
    bedrooms?: string;
    bathrooms?: string;
    yearBuilt?: string;
    lotSize?: string;
    condition?: string;
  }>({});
  const [selectedRooms, setSelectedRooms] = useState<string[]>([
    "Kitchen",
    "Living Room",
    "Bedroom 1",
    "Bathroom 1",
    "Exterior"
  ]);
  const roomOptions = useMemo(() => {
    const roomList = [...baseRooms];

    if (bedrooms) {
      for (let i = 1; i <= bedrooms; i += 1) {
        roomList.splice(2, 0, `Bedroom ${i}`);
      }
    }

    if (bathrooms) {
      for (let i = 1; i <= bathrooms; i += 1) {
        roomList.splice(2 + (bedrooms ?? 0), 0, `Bathroom ${i}`);
      }
    }

    return roomList;
  }, [bedrooms, bathrooms]);

  useEffect(() => {
    setSelectedRooms((prev) =>
      prev.filter((room) => roomOptions.includes(room))
    );
  }, [roomOptions]);
  const [activePanel, setActivePanel] = useState("Kitchen");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [prequalAnswers, setPrequalAnswers] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactErrors, setContactErrors] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string }>({});

  useEffect(() => {
    if (!showSuccess) {
      return undefined;
    }

    const timer = setTimeout(() => {
      router.push("/");
    }, 1200);

    return () => clearTimeout(timer);
  }, [router, showSuccess]);

  const [uploads, setUploads] = useState<Record<string, UploadItem[]>>({});

  const uploadPanels = useMemo(() => selectedRooms, [selectedRooms]);

  const filteredSuggestions = useMemo(() => {
    if (!addressQuery.trim()) {
      return mockProperties;
    }

    return mockProperties.filter((property) =>
      property.address.toLowerCase().includes(addressQuery.toLowerCase())
    );
  }, [addressQuery]);
  const progress = useMemo(
    () => Math.round((currentStep / (steps.length - 1)) * 100),
    [currentStep]
  );

  const totalUploads = useMemo(
    () =>
      Object.values(uploads).reduce(
        (sum, roomUploads) => sum + roomUploads.length,
        0
      ),
    [uploads]
  );

  const roomUploadStatus = useMemo(() => {
    return selectedRooms.map((room) => {
      const roomUploads = uploads[room] ?? [];
      const photoCount = roomUploads.filter((item) => item.type === "photo").length;
      const videoCount = roomUploads.filter((item) => item.type === "video").length;
      return {
        room,
        photoCount,
        videoCount,
        photosMissing: Math.max(0, 3 - photoCount),
        videoMissing: Math.max(0, 1 - videoCount)
      };
    });
  }, [selectedRooms, uploads]);

  const mismatchUploads = useMemo(() => {
    return Object.entries(uploads).flatMap(([room, roomUploads]) =>
      roomUploads
        .filter((item) => item.status === "mismatch")
        .map((item) => ({ room, item }))
    );
  }, [uploads]);

  const addUpload = (room: string, file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isLarge = file.size > 2 * 1024 * 1024;
    const id = `${room}-${Date.now()}`;
    const preview = !isVideo ? URL.createObjectURL(file) : null;

    setUploads((prev) => ({
      ...prev,
      [room]: [...(prev[room] ?? []), {
        id, name: file.name,
        type: isVideo ? "video" : "photo",
        preview, progress: 0, status: "compressing"
      }]
    }));

    const uploadStart = isLarge ? 900 : 200;

    if (isLarge) {
      setTimeout(() => {
        setUploads((prev) => ({
          ...prev,
          [room]: (prev[room] ?? []).map(u =>
            u.id === id ? { ...u, status: "uploading" as const, progress: 10 } : u
          )
        }));
      }, 900);
    }

    [20, 45, 70, 90, 100].forEach((pct, i) => {
      setTimeout(() => {
        setUploads((prev) => ({
          ...prev,
          [room]: (prev[room] ?? []).map(u =>
            u.id === id
              ? { ...u, progress: pct, status: pct === 100 ? (Math.random() < 0.2 ? "mismatch" as const : "ok" as const) : "uploading" as const }
              : u
          )
        }));
      }, uploadStart + (i + 1) * 300);
    });
  };

  const removeUpload = (room: string, id: string) => {
    setUploads((prev) => {
      const item = (prev[room] ?? []).find(u => u.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return {
        ...prev,
        [room]: (prev[room] ?? []).filter(u => u.id !== id)
      };
    });
  };

  const moveUpload = (fromRoom: string, id: string, toRoom: string) => {
    setUploads((prev) => {
      const item = (prev[fromRoom] ?? []).find(u => u.id === id);
      if (!item) return prev;
      return {
        ...prev,
        [fromRoom]: (prev[fromRoom] ?? []).filter(u => u.id !== id),
        [toRoom]: [...(prev[toRoom] ?? []), { ...item, status: "ok" as const }]
      };
    });
    setActivePanel(toRoom);
  };

  const resolveMismatch = (room: string, id: string) => {
    setUploads((prev) => ({
      ...prev,
      [room]: (prev[room] ?? []).map(u =>
        u.id === id ? { ...u, status: "ok" as const } : u
      )
    }));
  };

  // Restore session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || s.currentStep === undefined) return;
      setCurrentStep(s.currentStep ?? 0);
      setAddressQuery(s.addressQuery ?? "");
      setSelectedProperty(s.selectedProperty ?? null);
      setIsConfirmed(s.isConfirmed ?? false);
      setBedrooms(s.bedrooms ?? null);
      setBathrooms(s.bathrooms ?? null);
      setYearBuilt(s.yearBuilt ?? "");
      setLotSize(s.lotSize ?? "");
      setCondition(s.condition ?? "");
      setSelectedRooms(s.selectedRooms ?? ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"]);
      if (s.firstName) setFirstName(s.firstName);
      if (s.lastName) setLastName(s.lastName);
      if (s.email) setEmail(s.email);
      if (s.phone) setPhone(s.phone);
      if (s.currentStep > 0) setShowResumeBanner(true);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save to localStorage whenever key state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      const session = {
        currentStep,
        addressQuery,
        selectedProperty,
        isConfirmed,
        bedrooms,
        bathrooms,
        yearBuilt,
        lotSize,
        condition,
        selectedRooms,
        firstName,
        lastName,
        email,
        phone,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }, 800);
    return () => clearTimeout(timer);
  }, [currentStep, addressQuery, selectedProperty, isConfirmed, bedrooms, bathrooms, yearBuilt, lotSize, condition, selectedRooms, firstName, lastName, email, phone]);

  // Load pre-qual answers whenever user reaches the review step
  useEffect(() => {
    if (currentStep !== steps.length - 1) return; // only on Review step
    try {
      const raw = localStorage.getItem("ch_prequal_answers");
      if (raw) setPrequalAnswers(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [currentStep]);

  const handleStartFresh = () => {
    localStorage.removeItem(SESSION_KEY);
    setShowResumeBanner(false);
    setCurrentStep(0);
    setAddressQuery("");
    setSelectedProperty(null);
    setIsConfirmed(false);
    setIsEditing(false);
    setBedrooms(null);
    setBathrooms(null);
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

  const showDropdown = addressQuery.length >= 2 && !isConfirmed && !selectedProperty;

  const handleSelectProperty = useCallback((property: typeof mockProperties[number]) => {
    setAddressQuery(property.address);
    setSelectedProperty(property);
    setIsConfirmed(false);
    setHighlightedIndex(-1);
  }, []);

  const handleManualEntry = useCallback(() => {
    setSelectedProperty(null);
    setIsConfirmed(true);
    setHighlightedIndex(-1);
  }, []);

  const handleConfirm = useCallback(() => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      setIsConfirmed(true);
    }, 600);
  }, []);

  const handleAddressKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    const total = filteredSuggestions.length + 1; // +1 for manual entry
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        handleSelectProperty(filteredSuggestions[highlightedIndex]);
      } else if (highlightedIndex === filteredSuggestions.length) {
        handleManualEntry();
      }
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
    }
  }, [showDropdown, filteredSuggestions, highlightedIndex, handleSelectProperty, handleManualEntry]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const validateStep = (step: number) => {
    setErrors({});
    setPropertyErrors({});

    if (step === 0) {
      const result = addressSchema.safeParse({
        address: addressQuery,
        confirmed: isConfirmed
      });
      if (!result.success) {
        setErrors({ address: "Confirm the address to continue." });
        return false;
      }
    }

    if (step === 1) {
      const result = propertySchema.safeParse({
        bedrooms: bedrooms ?? 0,
        bathrooms: bathrooms ?? 0,
        yearBuilt,
        lotSize,
        condition
      });

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
        setErrors({
          uploads: "Fix any room mismatches before continuing."
        });
        return false;
      }

      const incompleteRooms = roomUploadStatus.filter(
        (room) => room.photosMissing > 0 || room.videoMissing > 0
      );

      if (incompleteRooms.length > 0) {
        const roomNames = incompleteRooms.map((room) => room.room).join(", ");
        setErrors({
          uploads: `Please complete uploads for: ${roomNames}. Each room needs 3 photos and 1 video.`
        });
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
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  return (
    <main className="intake-shell">
      <section className="intake-hero">
        <div className="container intake-hero-inner">
          <div className="intake-hero-text reveal">
            <div className="hero-pill">Private Seller Intake · Concierge Guided</div>
            <h1>Seller Intake</h1>
            <p>
              A refined, step-by-step intake designed for clarity, speed, and
              premium review.
            </p>
          </div>
          <div className="intake-progress reveal" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <div className="stepper">
              <div className="stepper-bar">
                <div className="stepper-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="stepper-steps">
                {steps.map((step, index) => {
                  const isActive = index === currentStep;
                  const isComplete = index < currentStep;

                  return (
                    <div className="step" key={step}>
                      <span
                        className={`step-indicator${
                          isActive ? " active" : isComplete ? " complete" : ""
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className={`step-label${isActive ? " active" : ""}`}>
                        {step}
                      </span>
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
            <div className="intake-step-header">
              <div>
                <h2>{steps[currentStep]}</h2>
                <p className="intake-step-help">Complete each section to continue.</p>
              </div>
              <span className="intake-step-count">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="intake-step-body" key={currentStep}>
          {showResumeBanner && (
            <div className="resume-banner">
              <span className="resume-banner-icon">👋</span>
              <div className="resume-banner-text">
                <strong>Welcome back!</strong>
                <span>Your progress has been saved. Pick up where you left off.</span>
              </div>
              <div className="resume-banner-actions">
                <button type="button" className="resume-fresh-btn" onClick={handleStartFresh}>
                  Start fresh
                </button>
                <button type="button" className="resume-dismiss-btn" onClick={() => setShowResumeBanner(false)}>
                  ×
                </button>
              </div>
            </div>
          )}
          {currentStep === 0 && (
            <div className="address-step">
              <div className="address-card">
                <label className="input-label" htmlFor="address-search">
                  Property address
                </label>
                <div className="address-input-wrapper" ref={dropdownRef}>
                  <div className={`input-with-icon${showDropdown ? " focused" : ""}`}>
                    <span className="input-icon">📍</span>
                    <input
                      id="address-search"
                      type="text"
                      placeholder="Start typing your address…"
                      value={addressQuery}
                      autoComplete="off"
                      onChange={(e) => {
                        setAddressQuery(e.target.value);
                        setSelectedProperty(null);
                        setIsConfirmed(false);
                        setIsEditing(false);
                        setHighlightedIndex(-1);
                      }}
                      onKeyDown={handleAddressKeyDown}
                    />
                    {addressQuery && (
                      <button
                        type="button"
                        className="input-clear"
                        aria-label="Clear address"
                        onClick={() => {
                          setAddressQuery("");
                          setSelectedProperty(null);
                          setIsConfirmed(false);
                          setHighlightedIndex(-1);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {showDropdown && (
                    <div className="address-dropdown" role="listbox">
                      {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((p, i) => (
                          <button
                            key={p.address}
                            type="button"
                            role="option"
                            aria-selected={highlightedIndex === i}
                            className={`address-dropdown-item${highlightedIndex === i ? " highlighted" : ""}`}
                            onMouseEnter={() => setHighlightedIndex(i)}
                            onClick={() => handleSelectProperty(p)}
                          >
                            <span className="dropdown-item-icon">📍</span>
                            <span className="dropdown-item-text">
                              <span className="dropdown-address-line">{p.address}</span>
                              <span className="dropdown-meta-line">{p.sqft} sqft · {p.beds} bed · {p.baths} bath · Built {p.yearBuilt}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="address-dropdown-empty">
                          <span style={{ fontSize: "20px" }}>🔍</span>
                          No matches — try a different address
                        </div>
                      )}
                      <button
                        type="button"
                        className={`address-dropdown-manual${highlightedIndex === filteredSuggestions.length ? " highlighted" : ""}`}
                        onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
                        onClick={handleManualEntry}
                      >
                        <span style={{ fontSize: "14px" }}>✏️</span>
                        Use &ldquo;{addressQuery}&rdquo; — enter manually
                      </button>
                    </div>
                  )}
                </div>

                {errors.address && (
                  <div className="intake-error">⚠ {errors.address}</div>
                )}
              </div>

              {(selectedProperty || addressQuery.length >= 5) && (
                <div className={`property-card${isConfirmed ? " confirmed" : ""}`}>
                  {selectedProperty && (
                    <div className="property-image">
                      <span className="property-image-label">Exterior · Auto-fetched</span>
                    </div>
                  )}
                  <div className="property-details">
                    <div>
                      <p className="property-address">
                        {selectedProperty?.address || addressQuery}
                      </p>
                      <p className="property-meta">
                        {selectedProperty
                          ? `${selectedProperty.sqft} sqft · ${selectedProperty.beds} bed · ${selectedProperty.baths} bath`
                          : "Entered manually — details will be confirmed by our team"}
                      </p>
                    </div>
                    {selectedProperty && (
                      <div className="property-info-grid">
                        <div>
                          <span>Year built</span>
                          <strong>{selectedProperty.yearBuilt}</strong>
                        </div>
                        <div>
                          <span>Lot size</span>
                          <strong>{selectedProperty.lotSize}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isConfirmed && (
                    <div className="property-actions">
                      <span>{selectedProperty ? "Is this the correct property?" : "Confirm your address to continue"}</span>
                      <div className="property-buttons">
                        {selectedProperty && (
                          <button
                            className="button-secondary"
                            type="button"
                            onClick={() => {
                              setIsConfirmed(false);
                              setIsEditing(false);
                              setAddressQuery("");
                              setSelectedProperty(null);
                            }}
                          >
                            No, search again
                          </button>
                        )}
                        <button
                          className="button-primary"
                          type="button"
                          disabled={isConfirming}
                          onClick={handleConfirm}
                        >
                          {isConfirming ? <><span className="btn-spinner" />Confirming…</> : selectedProperty ? "Yes, this is correct" : "Confirm address"}
                        </button>
                      </div>
                    </div>
                  )}
                  {isConfirmed && (
                    <div className="property-confirmed">
                      <span className="property-confirmed-icon">✓</span>
                      Address confirmed
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="property-step">
              <div className="form-grid">
                <div>
                  <label className="input-label">Bedrooms</label>
                  <div className="segmented-control-row">
                    <div className="segmented-control">
                      {[1, 2, 3, 4, 5, 6, 7].map((value) => (
                        <button
                          key={`bed-${value}`}
                          type="button"
                          className={bedrooms === value ? "active" : ""}
                          onClick={() => setBedrooms(value)}
                        >
                          {value}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={(bedrooms ?? 0) >= 8 ? "active" : ""}
                        onClick={() => setBedrooms(8)}
                      >
                        8+
                      </button>
                    </div>
                    {(bedrooms ?? 0) >= 8 && (
                      <input
                        className="text-input segmented-custom-input"
                        type="number"
                        min={8}
                        max={20}
                        placeholder="Enter count"
                        value={bedrooms ?? ""}
                        onChange={e => setBedrooms(Math.max(8, parseInt(e.target.value) || 8))}
                      />
                    )}
                  </div>
                  {propertyErrors.bedrooms && (
                    <p className="field-error">{propertyErrors.bedrooms}</p>
                  )}
                  <p className="helper-text">Select the total bedrooms.</p>
                </div>
                <div>
                  <label className="input-label">Bathrooms</label>
                  <div className="segmented-control-row">
                    <div className="segmented-control">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={`bath-${value}`}
                          type="button"
                          className={bathrooms === value ? "active" : ""}
                          onClick={() => setBathrooms(value)}
                        >
                          {value}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={(bathrooms ?? 0) >= 6 ? "active" : ""}
                        onClick={() => setBathrooms(6)}
                      >
                        6+
                      </button>
                    </div>
                    {(bathrooms ?? 0) >= 6 && (
                      <input
                        className="text-input segmented-custom-input"
                        type="number"
                        min={6}
                        max={20}
                        placeholder="Enter count"
                        value={bathrooms ?? ""}
                        onChange={e => setBathrooms(Math.max(6, parseInt(e.target.value) || 6))}
                      />
                    )}
                  </div>
                  {propertyErrors.bathrooms && (
                    <p className="field-error">{propertyErrors.bathrooms}</p>
                  )}
                  <p className="helper-text">Include full and half baths.</p>
                </div>
                <div>
                  <label className="input-label">Year Built</label>
                  <input
                    className="text-input"
                    type="number"
                    placeholder="2008"
                    value={yearBuilt}
                    onChange={(event) => setYearBuilt(event.target.value)}
                  />
                  {propertyErrors.yearBuilt && (
                    <p className="field-error">{propertyErrors.yearBuilt}</p>
                  )}
                  <p className="helper-text">Use the year on your deed or listing.</p>
                </div>
                <div>
                  <label className="input-label">Lot Size</label>
                  <input
                    className="text-input"
                    type="text"
                    placeholder="0.23 acres"
                    value={lotSize}
                    onChange={(event) => setLotSize(event.target.value)}
                  />
                  {propertyErrors.lotSize && (
                    <p className="field-error">{propertyErrors.lotSize}</p>
                  )}
                  <p className="helper-text">Approximate lot size is okay.</p>
                </div>
                <div>
                  <label className="input-label">Condition</label>
                  <select
                    className="text-input"
                    value={condition}
                    onChange={(event) => setCondition(event.target.value)}
                  >
                    <option value="">Select</option>
                    <option>Excellent</option>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Needs work</option>
                  </select>
                  {propertyErrors.condition && (
                    <p className="field-error">{propertyErrors.condition}</p>
                  )}
                  <p className="helper-text">Select the best match.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep > 4 && (
            <p>
              Step content will be implemented in Phase {currentStep + 4} to
              match the detailed plan. This section will include fields,
              uploads, and validation for {steps[currentStep].toLowerCase()}.
            </p>
          )}

          {currentStep === 2 && (
            <div className="rooms-step">
              <div className="section-header">
                <h3>Select rooms and areas</h3>
                <p>We’ll generate upload slots for every room you select.</p>
              </div>
              <div className="room-grid">
                {roomOptions.map((room) => {
                  const isSelected = selectedRooms.includes(room);
                  return (
                    <button
                      key={room}
                      type="button"
                      className={`room-card${isSelected ? " active" : ""}`}
                      onClick={() => {
                        setSelectedRooms((prev) =>
                          prev.includes(room)
                            ? prev.filter((item) => item !== room)
                            : [...prev, room]
                        );
                      }}
                    >
                      <span className="room-icon">🏠</span>
                      <span className="room-label">{room}</span>
                      <span className="room-state">
                        {isSelected ? "Selected" : "Tap to add"}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.rooms && <div className="intake-error">⚠ {errors.rooms}</div>}
            </div>
          )}

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
                {uploadPanels.map((panel) => {
                  const roomStatus = roomUploadStatus.find(r => r.room === panel);
                  const isDone = roomStatus?.photosMissing === 0 && roomStatus?.videoMissing === 0;
                  const photoItems = (uploads[panel] ?? []).filter(u => u.type === "photo");
                  const videoItem = (uploads[panel] ?? []).find(u => u.type === "video");
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
                        <span className="upload-panel-meta">
                          {roomStatus?.photoCount ?? 0}/3 photos · {roomStatus?.videoCount ?? 0}/1 video
                        </span>
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
                                onUpload={(file) => addUpload(panel, file)}
                                onRemove={(id) => removeUpload(panel, id)}
                                onResolve={(id) => resolveMismatch(panel, id)}
                                onMove={(id, toRoom) => moveUpload(panel, id, toRoom)}
                              />
                            ))}
                            <UploadSlot
                              key={`${panel}-video`}
                              item={videoItem}
                              isVideo
                              room={panel}
                              otherRooms={otherRooms}
                              onUpload={(file) => addUpload(panel, file)}
                              onRemove={(id) => removeUpload(panel, id)}
                              onResolve={(id) => resolveMismatch(panel, id)}
                              onMove={(id, toRoom) => moveUpload(panel, id, toRoom)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.uploads && (
                <div className="intake-error">⚠ {errors.uploads}</div>
              )}
            </div>
          )}
          {currentStep === 4 && (
            <div className="contact-step">
              <div className="form-grid">
                <div>
                  <label className="input-label">First name</label>
                  <input
                    className={`text-input${contactErrors.firstName ? " input-error" : ""}`}
                    type="text"
                    placeholder="Jane"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); setContactErrors(p => ({ ...p, firstName: undefined })); }}
                  />
                  {contactErrors.firstName && <p className="field-error">{contactErrors.firstName}</p>}
                </div>
                <div>
                  <label className="input-label">Last name</label>
                  <input
                    className={`text-input${contactErrors.lastName ? " input-error" : ""}`}
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); setContactErrors(p => ({ ...p, lastName: undefined })); }}
                  />
                  {contactErrors.lastName && <p className="field-error">{contactErrors.lastName}</p>}
                </div>
                <div>
                  <label className="input-label">Email address</label>
                  <input
                    className={`text-input${contactErrors.email ? " input-error" : ""}`}
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setContactErrors(p => ({ ...p, email: undefined })); }}
                  />
                  {contactErrors.email && <p className="field-error">{contactErrors.email}</p>}
                </div>
                <div>
                  <label className="input-label">Phone number</label>
                  <input
                    className={`text-input${contactErrors.phone ? " input-error" : ""}`}
                    type="tel"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setContactErrors(p => ({ ...p, phone: undefined })); }}
                  />
                  {contactErrors.phone && <p className="field-error">{contactErrors.phone}</p>}
                </div>
              </div>
              <p className="contact-note">Your information is kept private and only used to follow up on your submission.</p>
            </div>
          )}
          {currentStep === 5 && (
            <div className="review-step">
              <div className="review-grid">
                <div className="review-left">
                  <div className="summary-card">
                    <h3>Property Summary</h3>
                    <p className="summary-address">
                      {selectedProperty?.address || addressQuery || "Address pending"}
                    </p>
                    <div className="summary-meta">
                      <span>{selectedProperty?.sqft || "—"} sqft</span>
                      <span>{bedrooms ?? "—"} bed</span>
                      <span>{bathrooms ?? "—"} bath</span>
                    </div>
                    <div className="summary-details">
                      <div>
                        <span>Year built</span>
                        <strong>{yearBuilt || "—"}</strong>
                      </div>
                      <div>
                        <span>Lot size</span>
                        <strong>{lotSize || "—"}</strong>
                      </div>
                      <div>
                        <span>Condition</span>
                        <strong>{condition || "—"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="summary-card">
                    <h3>Contact Info</h3>
                    <div className="summary-details">
                      <div>
                        <span>Name</span>
                        <strong>{`${firstName} ${lastName}`.trim() || "—"}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{email || "—"}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{phone || "—"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ai-summary-card">
                    <div className="ai-header">
                      <h3>AI Summary (Preview)</h3>
                      <span className="ai-badge">Generated</span>
                    </div>
                    <div className="admin-ai-card">
                      <div className="ai-summary-section">
                        <h5>Property Overview</h5>
                        <p>{getOverview(condition, bedrooms, bathrooms)}</p>
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
                          {getFlags(condition).map(flag => (
                            <span key={flag}>{flag}</span>
                          ))}
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
                          items
                            .filter(item => item.type === "photo" && item.preview)
                            .map(item => ({ id: item.id, preview: item.preview!, room }))
                        ).slice(0, 9);
                        if (photos.length === 0) {
                          return Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="gallery-tile"><span>Room photo {i + 1}</span></div>
                          ));
                        }
                        return photos.map(photo => (
                          <div
                            key={photo.id}
                            className="gallery-tile"
                            style={{ backgroundImage: `url(${photo.preview})`, backgroundSize: "cover", backgroundPosition: "center" }}
                          >
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

              <button
                className="button-primary submit-button"
                type="button"
                onClick={() => {
                  try {
                    const id = `MS-${Date.now()}`;
                    const now = new Date();
                    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const submission = {
                      id,
                      name: `${firstName} ${lastName}`.trim() || "Submitted Seller",
                      email,
                      phone,
                      address: selectedProperty?.address || addressQuery || "Unknown Address",
                      date: dateStr,
                      submittedAt: now.toISOString(),
                      status: "New",
                      isNew: true,
                      sqft: selectedProperty?.sqft || "",
                      beds: bedrooms,
                      baths: bathrooms,
                      yearBuilt,
                      lotSize,
                      condition,
                      rooms: selectedRooms,
                      prequalAnswers
                    };
                    const existing = localStorage.getItem("ch_submissions");
                    const list = existing ? JSON.parse(existing) : [];
                    list.unshift(submission);
                    localStorage.setItem("ch_submissions", JSON.stringify(list));
                  } catch {
                    // ignore storage errors
                  }
                  localStorage.removeItem(SESSION_KEY);
                  localStorage.removeItem("ch_prequal_answers");
                  setShowSuccess(true);
                }}
              >
                Submit Intake
              </button>
            </div>
          )}
            </div>
          </div>

          {currentStep < steps.length - 1 && (
            <div className="intake-nav">
              <button
                className="button-secondary"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
              >
                Back
              </button>
              <button
                className="button-primary"
                onClick={handleContinue}
                disabled={currentStep === steps.length - 1}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </section>

      <IntakeChatbot />

      {showSuccess && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h3>Submission received</h3>
            <p>
              Thanks! Your intake has been sent for review. You’ll receive a
              confirmation email with next steps.
            </p>
            <button
              className="button-primary"
              type="button"
              onClick={() => router.push("/")}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
