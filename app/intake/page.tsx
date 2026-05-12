"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const steps = ["Address", "Property", "Rooms", "Uploads", "Review"];

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

export default function IntakePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [addressQuery, setAddressQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<
    (typeof mockProperties)[number] | null
  >(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  useEffect(() => {
    if (!showSuccess) {
      return undefined;
    }

    const timer = setTimeout(() => {
      router.push("/");
    }, 1200);

    return () => clearTimeout(timer);
  }, [router, showSuccess]);

  const [uploads, setUploads] = useState<Record<string, {
    id: string;
    name: string;
    type: "photo" | "video";
    progress: number;
    status: "checking" | "ok" | "mismatch";
  }[]>>({});

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

  const addUpload = (room: string, type: "photo" | "video") => {
    const id = `${room}-${type}-${Date.now()}`;
    const name =
      type === "photo"
        ? `${room.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.jpg`
        : `${room.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.mp4`;

    setUploads((prev) => {
      const roomUploads = prev[room] ?? [];
      return {
        ...prev,
        [room]: [...roomUploads, { id, name, type, progress: 0, status: "checking" }]
      };
    });

    setTimeout(() => {
      const isMismatch = Math.random() < 0.2;
      setUploads((prev) => {
        const roomUploads = prev[room] ?? [];
        return {
          ...prev,
          [room]: roomUploads.map((item) =>
            item.id === id
              ? { ...item, progress: 100, status: isMismatch ? "mismatch" : "ok" }
              : item
          )
        };
      });
    }, 1200);
  };

  const removeUpload = (room: string, id: string) => {
    setUploads((prev) => {
      const roomUploads = prev[room] ?? [];
      return {
        ...prev,
        [room]: roomUploads.filter((item) => item.id !== id)
      };
    });
  };

  const resolveMismatch = (room: string, id: string) => {
    setUploads((prev) => {
      const roomUploads = prev[room] ?? [];
      return {
        ...prev,
        [room]: roomUploads.map((item) =>
          item.id === id ? { ...item, status: "ok" } : item
        )
      };
    });
  };

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
          <div className="intake-hero-text">
            <div className="hero-pill">Private Seller Intake · Concierge Guided</div>
            <h1>Seller Intake</h1>
            <p>
              A refined, step-by-step intake designed for clarity, speed, and
              premium review.
            </p>
          </div>
          <div className="intake-progress">
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
          <div className="intake-card intake-panel">
            <div className="intake-step-header">
              <div>
                <h2>{steps[currentStep]}</h2>
                <p className="intake-step-help">Complete each section to continue.</p>
              </div>
              <span className="intake-step-count">
                Step {currentStep + 1} of {steps.length}
              </span>
            </div>
            <div className="intake-step-body">
          {currentStep === 0 && (
            <div className="address-step">
              <div className="address-card">
                <label className="input-label" htmlFor="address-search">
                  Property address
                </label>
                <div className="input-with-icon">
                  <span className="input-icon">📍</span>
                  <input
                    id="address-search"
                    type="text"
                    placeholder="Start typing your address"
                    value={addressQuery}
                    onChange={(event) => {
                      setAddressQuery(event.target.value);
                      setSelectedProperty(null);
                      setIsConfirmed(false);
                      setIsEditing(false);
                    }}
                  />
                </div>
                  <div className="suggestions">
                  {filteredSuggestions.map((property) => (
                    <button
                      key={property.address}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setAddressQuery(property.address);
                        setSelectedProperty(property);
                        setIsConfirmed(false);
                        setIsEditing(false);
                      }}
                    >
                      {property.address}
                    </button>
                  ))}
                </div>
                {errors.address && (
                  <p className="field-error">{errors.address}</p>
                )}
              </div>

              {selectedProperty && (
                <div className={`property-card${isConfirmed ? " confirmed" : ""}`}>
                  <div className="property-image" />
                  <div className="property-details">
                    <div>
                      <p className="property-address">
                        {selectedProperty.address}
                      </p>
                      <p className="property-meta">
                        {selectedProperty.sqft} sqft · {selectedProperty.beds} bed · {selectedProperty.baths} bath
                      </p>
                    </div>
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
                  </div>
                  {!isConfirmed && (
                    <div className="property-actions">
                      <span>Is this the correct address?</span>
                      <div className="property-buttons">
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
                        <button
                          className="button-primary"
                          type="button"
                          onClick={() => {
                            setIsConfirmed(true);
                            setIsEditing(false);
                          }}
                        >
                          Yes, correct
                        </button>
                      </div>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="property-confirmed">Confirmed</div>
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
                  <div className="segmented-control">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={`bed-${value}`}
                        type="button"
                        className={bedrooms === value ? "active" : ""}
                        onClick={() => setBedrooms(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  {propertyErrors.bedrooms && (
                    <p className="field-error">{propertyErrors.bedrooms}</p>
                  )}
                  <p className="helper-text">Select the total bedrooms.</p>
                </div>
                <div>
                  <label className="input-label">Bathrooms</label>
                  <div className="segmented-control">
                    {[1, 2, 3, 4].map((value) => (
                      <button
                        key={`bath-${value}`}
                        type="button"
                        className={bathrooms === value ? "active" : ""}
                        onClick={() => setBathrooms(value)}
                      >
                        {value}
                      </button>
                    ))}
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
              {errors.rooms && <p className="field-error">{errors.rooms}</p>}
            </div>
          )}

          {currentStep === 3 && (
            <div className="uploads-step">
              <div className="section-header">
                <h3>Upload your walkthrough</h3>
                <p>Each room requires 3 photos and 1 short video.</p>
              </div>
              {mismatchUploads.length > 0 && (
                <div className="upload-mismatch">
                  <strong>Room mismatch detected.</strong>
                  <span>
                    Please fix the flagged uploads before continuing.
                  </span>
                </div>
              )}
              <div className="upload-panels">
                {uploadPanels.map((panel) => (
                  <div key={panel} className="upload-panel">
                    <button
                      type="button"
                      className={`upload-panel-header${
                        activePanel === panel ? " active" : ""
                      }`}
                      onClick={() => setActivePanel(panel)}
                    >
                      <span>{panel}</span>
                      <span className="upload-panel-meta">
                        {(() => {
                          const roomStatus = roomUploadStatus.find(
                            (item) => item.room === panel
                          );
                          if (!roomStatus) {
                            return "0/3 photos · 0/1 video";
                          }
                          return `${roomStatus.photoCount}/3 photos · ${roomStatus.videoCount}/1 video`;
                        })()}
                      </span>
                      <span>{activePanel === panel ? "−" : "+"}</span>
                    </button>
                    {activePanel === panel && (
                      <div className="upload-panel-body">
                        <div className="upload-slot-grid">
                          {Array.from({ length: 3 }).map((_, index) => {
                            const photoUploads = (uploads[panel] ?? []).filter(
                              (item) => item.type === "photo"
                            );
                            const uploadItem = photoUploads[index];

                            return uploadItem ? (
                              <div key={uploadItem.id} className="upload-slot filled">
                                <span>{uploadItem.name}</span>
                                {uploadItem.progress < 100 && (
                                  <div className="progress-bar">
                                    <div
                                      className="progress-fill"
                                      style={{ width: `${uploadItem.progress}%` }}
                                    />
                                  </div>
                                )}
                                {uploadItem.progress === 100 && (
                                  <div
                                    className={`upload-status ${uploadItem.status}`}
                                  >
                                    {uploadItem.status === "checking" && "Checking"}
                                    {uploadItem.status === "ok" && "Matched"}
                                    {uploadItem.status === "mismatch" && "Mismatch"}
                                  </div>
                                )}
                                {uploadItem.status === "mismatch" && (
                                  <button
                                    type="button"
                                    className="upload-fix"
                                    onClick={() => resolveMismatch(panel, uploadItem.id)}
                                  >
                                    Mark corrected
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="upload-remove"
                                  onClick={() => removeUpload(panel, uploadItem.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                key={`${panel}-photo-${index}`}
                                type="button"
                                className="upload-slot"
                                onClick={() => addUpload(panel, "photo")}
                              >
                                <span className="upload-icon">＋</span>
                                <span>Add photo</span>
                              </button>
                            );
                          })}
                          {(() => {
                            const videoUpload = (uploads[panel] ?? []).find(
                              (item) => item.type === "video"
                            );

                            return videoUpload ? (
                              <div key={videoUpload.id} className="upload-slot filled">
                                <span>{videoUpload.name}</span>
                                {videoUpload.progress < 100 && (
                                  <div className="progress-bar">
                                    <div
                                      className="progress-fill"
                                      style={{ width: `${videoUpload.progress}%` }}
                                    />
                                  </div>
                                )}
                                {videoUpload.progress === 100 && (
                                  <div
                                    className={`upload-status ${videoUpload.status}`}
                                  >
                                    {videoUpload.status === "checking" && "Checking"}
                                    {videoUpload.status === "ok" && "Matched"}
                                    {videoUpload.status === "mismatch" && "Mismatch"}
                                  </div>
                                )}
                                {videoUpload.status === "mismatch" && (
                                  <button
                                    type="button"
                                    className="upload-fix"
                                    onClick={() => resolveMismatch(panel, videoUpload.id)}
                                  >
                                    Mark corrected
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="upload-remove"
                                  onClick={() => removeUpload(panel, videoUpload.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="upload-slot video"
                                onClick={() => addUpload(panel, "video")}
                              >
                                <span className="upload-icon">▶</span>
                                <span>Add video</span>
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {errors.uploads && (
                <p className="field-error">{errors.uploads}</p>
              )}
            </div>
          )}
          {currentStep === 4 && (
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

                  <div className="ai-summary-card">
                    <div className="ai-header">
                      <h3>AI Summary (Preview)</h3>
                      <span className="ai-badge">Generated</span>
                    </div>
                    <div className="ai-section">
                      <h4>Property Overview</h4>
                      <p>
                        Two-story home with bright living areas and a recently
                        updated kitchen. Exterior appears well maintained.
                      </p>
                    </div>
                    <div className="ai-section">
                      <h4>Condition Signals</h4>
                      <ul>
                        <li>Hardwood flooring in main living area.</li>
                        <li>Updated countertops and cabinetry.</li>
                        <li>Clean exterior with minimal wear.</li>
                      </ul>
                    </div>
                    <div className="ai-section">
                      <h4>Visible Flags</h4>
                      <div className="ai-flags">
                        <span>Minor paint wear</span>
                        <span>Older fixtures in bath 2</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="review-right">
                  <div className="gallery-card">
                    <h3>Photo Gallery</h3>
                    <div className="gallery-grid">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="gallery-tile">
                          <span>Room photo {index + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="prequal-card">
                    <h3>Pre‑Qualification Answers</h3>
                    <div className="prequal-list">
                      <div>
                        <span>Ownership status</span>
                        <strong>Owner‑occupied</strong>
                      </div>
                      <div>
                        <span>Timeline to sell</span>
                        <strong>Within 60 days</strong>
                      </div>
                      <div>
                        <span>Mortgage status</span>
                        <strong>Active mortgage</strong>
                      </div>
                      <div>
                        <span>Offer preference</span>
                        <strong>Open to cash or listing</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="button-primary submit-button"
                type="button"
                onClick={() => setShowSuccess(true)}
              >
                Submit Intake
              </button>
            </div>
          )}
            </div>
          </div>

          {currentStep < steps.length - 1 && (
            <div className="intake-nav desktop">
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

          {currentStep < steps.length - 1 && (
            <div className="intake-nav mobile">
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

      {showSuccess && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="success-modal">
            <div className="success-icon">✓</div>
            <h3>Submission received</h3>
            <p>Thanks! Your intake has been sent for review.</p>
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
