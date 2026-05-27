export type SubmissionStatus = "New" | "Reviewing" | "Offer Made" | "Closed";
export type FileType = "photo" | "video";
export type RoomSignal = "good" | "fair" | "poor";
export type AIFileStatus = "pending" | "analyzing" | "done" | "skipped";

export interface Submission {
  id: string;
  human_id: string;
  draft: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string;
  address_line1?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_lat?: number;
  address_lng?: number;
  sqft?: string;
  beds?: number;
  baths?: number;
  year_built?: string;
  lot_size?: string;
  condition?: string;
  rooms: string[];
  prequal_answers: Record<string, string>;
  status: SubmissionStatus;
  is_new: boolean;
  ai_summary?: AISummary;
  ai_generated_at?: string;
  internal_notes: InternalNote[];
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionFile {
  id: string;
  submission_id: string;
  room: string;
  file_type: FileType;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes?: number;
  ai_confidence?: number;
  ai_is_mismatch?: boolean;
  ai_is_invalid?: boolean;
  ai_status: AIFileStatus;
  ai_analyzed_at?: string;
  uploaded_at: string;
}

export interface SubmissionFileWithUrl extends SubmissionFile {
  signed_url: string;
}

export interface InternalNote {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface AISummary {
  overview: string;
  rooms: AISummaryRoom[];
  flags: string[];
  assessment: string;
  generated_at: string;
  model: string;
}

export interface AISummaryRoom {
  room: string;
  signal: RoomSignal;
  label: string;
  notes?: string;
}


export interface PlacesAutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  formattedAddress: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  lat: number;
  lng: number;
}


export interface AdminSubmissionListItem {
  id: string;
  human_id: string;
  name: string;
  address: string;
  address_city?: string;
  status: SubmissionStatus;
  is_new: boolean;
  beds?: number;
  baths?: number;
  condition?: string;
  submitted_at: string;
  file_count: number;
}

export interface AdminSubmissionDetail extends Submission {
  files: SubmissionFileWithUrl[];
}

export interface UploadStatusResponse {
  fileId: string;
  aiStatus: AIFileStatus;
  isMismatch?: boolean;
  isInvalid?: boolean;
  confidence?: number;
}
