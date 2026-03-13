
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
}

export enum RecordType {
  PRESCRIPTION = 'PRESCRIPTION',
  LAB_REPORT = 'LAB_REPORT',
  DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
  VACCINATION = 'VACCINATION',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface DoctorProfile extends User {
  role: UserRole.DOCTOR;
  registrationNumber: string; // NMC or State Council
  specialization: string;
  practiceLocation: string;
  isVerified: boolean;
}

export interface PatientProfile extends User {
  role: UserRole.PATIENT;
  dateOfBirth: string;
  bloodGroup: string;
  allergies?: string[];
  dependents?: PatientProfile[];
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId?: string; // If created by a doctor
  doctorName?: string;
  type: RecordType;
  title: string;
  date: string;
  content: string; // JSON string or text summary
  attachments?: string[]; // URLs to images/PDFs
  verified: boolean; // True if created by verified doctor
  fhirData?: any; // Placeholder for HL7 FHIR object
  tags: string[];
  
  // OCR & AI Fields
  extractedText?: string; // Raw OCR
  correctedText?: string; // AI Corrected
  aiSummary?: string;
  ocrConfidence?: number;
  
  // Date Validation Fields
  dateSource?: 'USER' | 'AI' | 'OCR';
  dateConfidence?: number; // 0-100

  // Duplicate Prevention
  fileHash?: string;

  // Deletion Status
  isDeleted?: boolean;

  // PDF & Professional Metadata
  prescriptionHash?: string;
  generatedAtTimestamp?: string;
  pdfUrl?: string; // Mocked path to professional PDF
}

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface PrescriptionData {
  diagnosis: string;
  symptoms: string;
  notes: string;
  items: PrescriptionItem[];
}

// Sharing & Security Types
export type AccessStatus = 'ACTIVE' | 'REVOKED';

export interface SharedDocument {
  id: string;
  documentId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorRegistration: string;
  doctorEmail: string;
  accessStatus: AccessStatus;
  sharedAt: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export type AuditAction = 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'REVOKE' | 'DELETE';

export interface AccessLog {
  id: string;
  documentId: string;
  viewerId: string;
  viewerName: string;
  viewerRole: UserRole | 'ADMIN';
  timestamp: string;
  action: AuditAction;
}

// Interoperability Mock
export interface FHIRResource {
  resourceType: string;
  id: string;
  status: string;
  subject: { reference: string; display: string };
  performer?: { reference: string; display: string }[];
}
