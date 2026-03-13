
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, FileText, Eye, X, ShieldCheck, Stethoscope, 
  Paperclip, Maximize2, ZoomIn, ZoomOut, Download, ChevronLeft, 
  User, Activity, Pill, Info, AlertCircle, CheckCircle2, PlusCircle, Clock,
  History, Share2
} from 'lucide-react';
import { Button, Card, formatDoctorName, StatusBadge } from '../components/ui';
import { store } from '../services/store';
import { MedicalRecord, SharedDocument, PatientProfile, UserRole, RecordType } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = store.getCurrentUser();
  const [activeTab, setActiveTab] = useState<'documents' | 'patients'>('documents');
  
  // Data State
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [sharedDocs, setSharedDocs] = useState<{ record: MedicalRecord, share: SharedDocument, patient: PatientProfile }[]>([]);
  
  // View Modal State
  const [selectedDocData, setSelectedDocData] = useState<{record: MedicalRecord, patient: PatientProfile} | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Security Logic: Bypass Chrome Blocking for PDF Data URIs
  const pdfBlobUrl = useMemo(() => {
    if (selectedDocData?.record?.pdfUrl?.startsWith('data:application/pdf')) {
      const byteString = atob(selectedDocData.record.pdfUrl.split(',')[1]);
      const mimeString = selectedDocData.record.pdfUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [selectedDocData]);

  // Cleanup Blob
  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!user || user.role !== UserRole.DOCTOR) {
      navigate('/');
      return;
    }
    setPatients(store.getPatientsWithSharedRecords(user.id));
    setSharedDocs(store.getSharedDocumentsForDoctor(user.id));
  }, [user, navigate]);

  if (!user || user.role !== UserRole.DOCTOR) return null;

  const handleViewDocument = (record: MedicalRecord, patient: PatientProfile) => {
    // AUDIT LOGGING: Log when doctor accesses a document and increment access count
    store.logAccess(record.id, user.id, user.name, 'VIEW');
    setSelectedDocData({ record, patient });
    // Refresh shares list to show updated access counts
    setSharedDocs(store.getSharedDocumentsForDoctor(user.id));
  };

  const handleDownloadPDF = (e: React.MouseEvent, record: MedicalRecord) => {
    e.stopPropagation();
    if (!record.pdfUrl) return;
    store.logAccess(record.id, user.id, user.name, 'DOWNLOAD');
    const link = document.createElement('a');
    link.href = record.pdfUrl;
    link.download = `Prescription_${record.id}.pdf`;
    link.click();
    // Refresh for access count update
    setSharedDocs(store.getSharedDocumentsForDoctor(user.id));
  };

  const closeViewer = () => setSelectedDocData(null);

  const getRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Shared Today";
    return `Shared ${diffDays}d ago`;
  };

  // --- RECORD VIEW MODE ---
  if (selectedDocData) {
      const { record, patient } = selectedDocData;

      return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={closeViewer}><ChevronLeft /></Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{record.title}</h1>
                        <p className="text-sm text-slate-500">Patient: <span className="font-semibold">{patient.name}</span> • ID: {patient.id}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <StatusBadge verified={record.verified} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-6">
                    <Card className="p-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Clinical Insights</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-700">AI Medical Summary</h4>
                                <div className="text-sm text-slate-600 mt-1 bg-slate-50 p-3 rounded border border-slate-100 max-h-[500px] overflow-y-auto">
                                    <MarkdownRenderer content={record.aiSummary || "Analysis not available."} />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-8">
                    <Card className="overflow-hidden flex flex-col h-[700px] shadow-lg border-slate-300">
                        <div className="bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center text-white">
                            <span className="text-sm font-medium flex items-center gap-2"><Paperclip className="h-4 w-4" /> Secure Document Preview</span>
                            <div className="flex gap-2">
                                {record.pdfUrl && (
                                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={(e) => handleDownloadPDF(e, record)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-white hover:bg-white/10" 
                                  onClick={() => setFullscreenOpen(true)}
                                >
                                  <Maximize2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center relative">
                            {record.pdfUrl ? (
                                <iframe 
                                    src={pdfBlobUrl || ''} 
                                    type="application/pdf"
                                    className="w-full h-full bg-white" 
                                    title="Doctor View PDF"
                                />
                            ) : record.attachments?.[0] ? (
                                <img src={record.attachments[0]} className="max-w-full h-auto shadow-2xl" alt="Medical Scan" />
                            ) : (
                                <div className="text-slate-400">No visual attachment</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Fullscreen Viewer Modal */}
            {fullscreenOpen && (
              <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
                <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md z-10">
                    <div className="flex items-center gap-3 text-white">
                        <FileText className="h-5 w-5 text-primary-400" />
                        <span className="font-bold">{record.title} - {patient.name}</span>
                    </div>
                    <button onClick={() => setFullscreenOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white transition-all">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="w-full h-full p-4 md:p-12 flex items-center justify-center">
                    {record.pdfUrl ? (
                      <iframe src={pdfBlobUrl || ''} className="w-full max-w-6xl h-full rounded-xl bg-white shadow-2xl" title="Doctor Fullscreen PDF" />
                    ) : record.attachments?.[0] ? (
                      <img src={record.attachments[0]} className="max-w-full max-h-[85vh] object-contain shadow-2xl shadow-black rounded-lg" alt="Doctor Fullscreen Image" />
                    ) : (
                      <div className="text-slate-500">No content available.</div>
                    )}
                </div>
              </div>
            )}
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctor Dashboard</h1>
          <p className="text-slate-500">Verified Professional Access Portal</p>
        </div>
        <Button onClick={() => navigate('/doctor/create')} className="gap-2 h-12 shadow-lg shadow-primary-500/20">
          <PlusCircle className="h-5 w-5" /> New Prescription
        </Button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
          <button onClick={() => setActiveTab('documents')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'documents' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500'}`}>
              📁 Shared With Me ({sharedDocs.length})
          </button>
          <button onClick={() => setActiveTab('patients')} className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'patients' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500'}`}>
              👥 Linked Patients ({patients.length})
          </button>
      </div>

      {activeTab === 'documents' && (
        <div className="grid gap-4">
           {sharedDocs.length === 0 ? (
               <Card className="p-16 text-center text-slate-500 bg-white/50 border-dashed border-2">
                   <div className="bg-slate-100 p-4 rounded-full inline-flex mb-4"><Share2 className="h-8 w-8" /></div>
                   <p className="font-medium">No documents have been shared with you yet.</p>
                   <p className="text-xs text-slate-400 mt-2">Verified patients can share their records using your registered email.</p>
               </Card>
           ) : (
               sharedDocs.map(({ record, share, patient }) => (
                   <Card key={share.id} className="p-5 hover:border-primary-300 transition-all flex flex-col md:flex-row gap-4 items-center justify-between group">
                       <div className="flex gap-4 items-center flex-1 min-w-0">
                           <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 shrink-0 ${record.type === RecordType.PRESCRIPTION ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                               <FileText className="h-6 w-6" />
                           </div>
                           <div className="min-w-0">
                               <h3 className="font-bold text-slate-900 truncate">{record.title}</h3>
                               <p className="text-sm text-slate-600 flex items-center gap-2">
                                   <User className="h-3.5 w-3.5 text-slate-400" /> 
                                   <span className="font-semibold">{patient.name}</span>
                               </p>
                               <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                   <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {getRelativeTime(share.sharedAt)}</span>
                                   <span className="flex items-center gap-1 text-primary-600"><Eye className="h-3 w-3" /> Viewed {share.accessCount} times</span>
                                   {share.lastAccessedAt && (
                                     <span className="flex items-center gap-1"><History className="h-3 w-3" /> Last: {new Date(share.lastAccessedAt).toLocaleDateString()}</span>
                                   )}
                               </div>
                           </div>
                       </div>
                       <div className="flex gap-2 w-full md:w-auto">
                          {record.pdfUrl && (
                            <Button variant="outline" size="sm" onClick={(e) => handleDownloadPDF(e, record)} className="flex-1 md:flex-none">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="secondary" onClick={() => handleViewDocument(record, patient)} className="flex-[2] md:flex-none gap-2">
                              <Eye className="h-4 w-4" /> Review Record
                          </Button>
                       </div>
                   </Card>
               ))
           )}
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map(patient => (
                <Card key={patient.id} className="p-5 hover:shadow-md transition-shadow">
                     <div className="flex items-center gap-4 mb-4">
                         <div className="h-14 w-14 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-700 font-bold text-xl">
                             {patient.name.charAt(0)}
                         </div>
                         <div>
                             <h3 className="font-bold text-slate-900">{patient.name}</h3>
                             <p className="text-xs text-slate-500">Blood: <span className="text-slate-900 font-medium">{patient.bloodGroup}</span></p>
                         </div>
                     </div>
                     <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={() => navigate('/doctor/create', { state: { patientId: patient.id } })}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Issue New Rx
                     </Button>
                </Card>
            ))}
            {patients.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                    <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">No patient profiles linked yet.</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
