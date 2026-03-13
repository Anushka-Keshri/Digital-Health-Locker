
import { User, UserRole, DoctorProfile, PatientProfile, MedicalRecord, RecordType, SharedDocument, AccessLog, AuditAction, AccessStatus } from '../types';

// Seed Data
const MOCK_DOCTOR: DoctorProfile = {
  id: 'd1',
  name: 'Aditi Sharma',
  email: 'doctor@healthlocker.in',
  role: UserRole.DOCTOR,
  registrationNumber: 'NMC-2024-10293',
  specialization: 'Cardiologist',
  practiceLocation: 'Apollo Hospital, Delhi',
  isVerified: true,
};

const MOCK_DOCTOR_2: DoctorProfile = {
  id: 'd2',
  name: 'Arindam Roychoudhury',
  email: 'arindam@hospital.com',
  role: UserRole.DOCTOR,
  registrationNumber: 'WBMC-57334',
  specialization: 'General & Chest Physician',
  practiceLocation: 'Wellness Clinic, Kolkata',
  isVerified: true,
};

const MOCK_PATIENT: PatientProfile = {
  id: 'p1',
  name: 'Rajesh Kumar',
  email: 'patient@healthlocker.in',
  role: UserRole.PATIENT,
  dateOfBirth: '1985-06-15',
  bloodGroup: 'O+',
  allergies: ['Penicillin'],
};

const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 'r1',
    patientId: 'p1',
    doctorId: 'd1',
    doctorName: 'Aditi Sharma',
    type: RecordType.PRESCRIPTION,
    title: 'Cardiac Consultation Follow-up',
    date: '2023-10-25T10:00:00Z',
    verified: true,
    tags: ['hypertension', 'checkup'],
    content: JSON.stringify({
      diagnosis: 'Mild Hypertension',
      symptoms: 'Occasional headaches',
      notes: 'Maintain low salt diet. Regular exercise.',
      items: [
        { medicine: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'After breakfast' }
      ]
    }),
  }
];

class StoreService {
  private users: User[] = [MOCK_DOCTOR, MOCK_DOCTOR_2, MOCK_PATIENT];
  private records: MedicalRecord[] = [...MOCK_RECORDS];
  private sharedDocuments: SharedDocument[] = [];
  private accessLogs: AccessLog[] = [];
  private currentUser: User | null = null;

  constructor() {
    this.load();
  }

  private load() {
    const storedUsers = localStorage.getItem('dhl_users');
    const storedRecords = localStorage.getItem('dhl_records');
    const storedShares = localStorage.getItem('dhl_shares');
    const storedLogs = localStorage.getItem('dhl_logs');
    const storedUser = localStorage.getItem('dhl_current_user');

    if (storedUsers) this.users = JSON.parse(storedUsers);
    if (storedRecords) this.records = JSON.parse(storedRecords);
    if (storedShares) this.sharedDocuments = JSON.parse(storedShares);
    if (storedLogs) this.accessLogs = JSON.parse(storedLogs);
    if (storedUser) this.currentUser = JSON.parse(storedUser);
  }

  private save() {
    localStorage.setItem('dhl_users', JSON.stringify(this.users));
    localStorage.setItem('dhl_records', JSON.stringify(this.records));
    localStorage.setItem('dhl_shares', JSON.stringify(this.sharedDocuments));
    localStorage.setItem('dhl_logs', JSON.stringify(this.accessLogs));
    if (this.currentUser) {
      localStorage.setItem('dhl_current_user', JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem('dhl_current_user');
    }
  }

  login(email: string, role: UserRole): User | null {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
    if (user) {
      this.currentUser = user;
      this.save();
      return user;
    }
    return null;
  }

  logout() {
    this.currentUser = null;
    this.save();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getRecordsForPatient(patientId: string): MedicalRecord[] {
    return this.records
      .filter(r => r.patientId === patientId && !r.isDeleted)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getSharedDocumentsForDoctor(doctorId: string): { record: MedicalRecord, share: SharedDocument, patient: PatientProfile }[] {
    const activeShares = this.sharedDocuments.filter(share =>
      share.doctorId === doctorId && share.accessStatus === 'ACTIVE'
    );

    const results = activeShares.map(share => {
      const record = this.records.find(r => r.id === share.documentId);
      const patient = this.users.find(u => u.id === share.patientId) as PatientProfile;
      if (!record || record.isDeleted || !patient) return null;
      return { record, share, patient };
    }).filter(item => item !== null) as { record: MedicalRecord, share: SharedDocument, patient: PatientProfile }[];

    return results;
  }

  getPatientsWithSharedRecords(doctorId: string): PatientProfile[] {
    const results = this.getSharedDocumentsForDoctor(doctorId);
    const uniquePatients = new Map<string, PatientProfile>();
    results.forEach(item => uniquePatients.set(item.patient.id, item.patient));
    return Array.from(uniquePatients.values());
  }

  // Returns ONLY verified registered doctors
  getVerifiedDoctors(): DoctorProfile[] {
    return (this.users.filter(u => u.role === UserRole.DOCTOR && (u as DoctorProfile).isVerified) as DoctorProfile[]);
  }

  shareDocument(documentId: string, patientId: string, doctorId: string): void {
    const doctor = this.users.find(u => u.id === doctorId && u.role === UserRole.DOCTOR) as DoctorProfile;
    if (!doctor) throw new Error("Doctor not authorized for document sharing");

    // Check for existing active share
    const existing = this.sharedDocuments.find(s => s.documentId === documentId && s.doctorId === doctorId && s.accessStatus === 'ACTIVE');
    if (existing) return;

    const share: SharedDocument = {
      id: Math.random().toString(36).substr(2, 9),
      documentId,
      patientId,
      doctorId,
      doctorName: doctor.name,
      doctorRegistration: doctor.registrationNumber,
      doctorEmail: doctor.email,
      accessStatus: 'ACTIVE',
      sharedAt: new Date().toISOString(),
      accessCount: 0
    };

    this.sharedDocuments.push(share);
    this.save();
    this.logAccess(documentId, patientId, this.currentUser?.name || 'Patient', 'SHARE');
  }

  revokeAccess(shareId: string): void {
    const share = this.sharedDocuments.find(s => s.id === shareId);
    if (share) {
      share.accessStatus = 'REVOKED';
      this.save();
      this.logAccess(share.documentId, this.currentUser?.id || 'sys', this.currentUser?.name || 'Patient', 'REVOKE');
    }
  }

  getSharedList(documentId: string): SharedDocument[] {
    return this.sharedDocuments.filter(s => s.documentId === documentId && s.accessStatus === 'ACTIVE');
  }

  // Get all sharing logs for a specific document (even revoked ones for audit)
  getShareHistory(documentId: string): SharedDocument[] {
    return this.sharedDocuments.filter(s => s.documentId === documentId);
  }

  addRecord(record: MedicalRecord) {
    const index = this.records.findIndex(r => r.id === record.id);
    if (index !== -1) {
      this.records[index] = record;
    } else {
      this.records.unshift(record);
    }
    this.save();
  }

  deleteRecord(recordId: string) {
    const record = this.records.find(r => r.id === recordId);
    if (record) {
      record.isDeleted = true;
      this.save();
      this.logAccess(recordId, this.currentUser?.id || 'sys', this.currentUser?.name || 'System', 'DELETE');
    }
  }

  logAccess(documentId: string, viewerId: string, viewerName: string, action: AuditAction = 'VIEW') {
    const user = this.users.find(u => u.id === viewerId);
    const viewerRole = user?.role || (viewerId === 'sys' ? 'ADMIN' : UserRole.PATIENT);

    // Update access tracking if a doctor is viewing a shared document
    if (viewerRole === UserRole.DOCTOR && action === 'VIEW') {
      const shareEntry = this.sharedDocuments.find(s =>
        s.documentId === documentId && s.doctorId === viewerId && s.accessStatus === 'ACTIVE'
      );
      if (shareEntry) {
        shareEntry.accessCount++;
        shareEntry.lastAccessedAt = new Date().toISOString();
      }
    }

    const log: AccessLog = {
      id: Math.random().toString(36).substr(2, 9),
      documentId,
      viewerId,
      viewerName,
      viewerRole,
      timestamp: new Date().toISOString(),
      action
    };
    this.accessLogs.unshift(log);
    this.save();
  }

  getAccessLogs(documentId: string): AccessLog[] {
    return this.accessLogs
      .filter(log => log.documentId === documentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getRecordById(id: string): MedicalRecord | undefined {
    const record = this.records.find(r => r.id === id);
    if (record && record.isDeleted) return undefined;
    return record;
  }

  getAllPatients(): PatientProfile[] {
    return this.users.filter(u => u.role === UserRole.PATIENT) as PatientProfile[];
  }

  // Add checkDuplicate method to fix errors in UploadRecord.tsx
  checkDuplicate(patientId: string, fileHash: string): boolean {
    if (!fileHash) return false;
    return this.records.some(r => r.patientId === patientId && r.fileHash === fileHash && !r.isDeleted);
  }
}

export const store = new StoreService();
