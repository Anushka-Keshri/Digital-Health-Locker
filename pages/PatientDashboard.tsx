
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Search as SearchIcon, FileText, Share2, Eye, ShieldCheck, X,
  Calendar, Trash2, Download, FileCheck, SortDesc, SortAsc, ShieldAlert,
  Loader2, Maximize2, AlertCircle, History, Clock, ZoomIn, ZoomOut,
  UserPlus, UserMinus, ShieldX
} from 'lucide-react';
import { store } from '../services/store';
import { explainMedicalRecord } from '../services/geminiService';
import { MedicalRecord, RecordType, UserRole, AccessLog, DoctorProfile, SharedDocument } from '../types';
import { Button, Card, StatusBadge, formatDoctorName } from '../components/ui';
import { RecordViewer } from '../components/RecordViewer';

export const PatientDashboard: React.FC = () => {
  const user = store.getCurrentUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // UI State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [selectedRecordForAction, setSelectedRecordForAction] = useState<MedicalRecord | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [shareHistory, setShareHistory] = useState<SharedDocument[]>([]);

  // Sharing State
  const [availableDoctors, setAvailableDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [shareError, setShareError] = useState('');

  // Derived state for details modal
  const recordId = searchParams.get('recordId');
  const selectedRecord = recordId ? records.find(r => r.id === recordId) || null : null;

  // IMPORTANT: Fix for Chrome "Blocked" PDF issue
  const pdfBlobUrl = useMemo(() => {
    if (selectedRecord && selectedRecord.pdfUrl && selectedRecord.pdfUrl.startsWith('data:application/pdf')) {
      const byteString = atob(selectedRecord.pdfUrl.split(',')[1]);
      const mimeString = selectedRecord.pdfUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    }
    return null;
  }, [selectedRecord]);

  // Audit viewing when record details are opened
  useEffect(() => {
    if (selectedRecord && user) {
      store.logAccess(selectedRecord.id, user.id, user.name, 'VIEW');
    }
  }, [selectedRecord?.id]);

  useEffect(() => {
    setAvailableDoctors(store.getVerifiedDoctors());
  }, []);

  // Handle automatic summary generation for older records
  useEffect(() => {
    if (selectedRecord && !selectedRecord.aiSummary && selectedRecord.content && !isGeneratingSummary) {
      handleGenerateSummary(selectedRecord);
    }
  }, [selectedRecord]);

  const handleGenerateSummary = async (record: MedicalRecord) => {
    setIsGeneratingSummary(true);
    try {
      const contentStr = typeof record.content === 'string' ? record.content : JSON.stringify(record.content);
      const summary = await explainMedicalRecord(contentStr, record.type);
      const updated = { ...record, aiSummary: summary };
      store.addRecord(updated);
      setRecords(prev => prev.map(r => r.id === record.id ? updated : r));
    } catch (e) {
      console.error("AI Summary generation failed", e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!user || user.role !== UserRole.PATIENT) {
      navigate('/');
      return;
    }
    setRecords(store.getRecordsForPatient(user.id));
  }, [user, navigate]);

  if (!user || user.role !== UserRole.PATIENT) return null;

  const refreshRecords = () => {
    setRecords(store.getRecordsForPatient(user.id));
  };

  const openRecord = (record: MedicalRecord) => {
    setSearchParams({ recordId: record.id });
  };

  const closeRecord = () => {
    setSearchParams({});
  };

  const handleDownloadPDF = (e: React.MouseEvent, record: MedicalRecord) => {
    e.stopPropagation();
    if (!record.pdfUrl) return;
    store.logAccess(record.id, user.id, user.name, 'DOWNLOAD');
    const link = document.createElement('a');
    link.href = record.pdfUrl;
    link.download = `Prescription_${record.id}.pdf`;
    link.click();
  };

  const handleViewHistory = (e?: React.MouseEvent, record?: MedicalRecord) => {
    if (e) e.stopPropagation();
    const target = record || selectedRecord;
    if (target) {
      setShareHistory(store.getShareHistory(target.id));
      setHistoryModalOpen(true);
    }
  };

  const handleShareClick = (e: React.MouseEvent, record: MedicalRecord) => {
    e.stopPropagation();
    setSelectedRecordForAction(record);
    setSelectedDoctorId('');
    setShareError('');
    setShareModalOpen(true);
  };

  const handleShareWithDoctor = () => {
    if (selectedRecordForAction && user && selectedDoctorId) {
      try {
        store.shareDocument(selectedRecordForAction.id, user.id, selectedDoctorId);
        setShareModalOpen(false);
        // Refresh local UI state if necessary
      } catch (err: any) {
        setShareError(err.message || "Unable to share document.");
      }
    }
  };

  const handleRevoke = (shareId: string) => {
    store.revokeAccess(shareId);
    if (selectedRecordForAction) {
      setShareHistory(store.getShareHistory(selectedRecordForAction.id));
    } else if (selectedRecord) {
      setShareHistory(store.getShareHistory(selectedRecord.id));
    }
  };

  const confirmDelete = () => {
    if (selectedRecordForAction) {
      store.deleteRecord(selectedRecordForAction.id);
      refreshRecords();
      setDeleteModalOpen(false);
      if (selectedRecord && selectedRecord.id === selectedRecordForAction.id) {
        closeRecord();
      }
    }
  };

  const filteredRecords = records
    .filter(r =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.doctorName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Health Locker</h1>
          <p className="text-slate-500 text-sm">Store, share, and analyze your medical history.</p>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary-500/20" onClick={() => navigate('/patient/upload')}>
          <Plus className="h-4 w-4" /> Upload Record
        </Button>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search diagnoses, doctors, or hospitals..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-shadow"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="px-4 rounded-xl" onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}>
              {sortOrder === 'newest' ? <SortDesc className="h-5 w-5" /> : <SortAsc className="h-5 w-5" />}
            </Button>
          </div>

          <div className="grid gap-4">
            {filteredRecords.map(record => (
              <Card key={record.id} className="p-0 overflow-hidden hover:border-primary-300 transition-all relative group cursor-pointer" onClick={() => openRecord(record)}>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleShareClick(e, record)}
                    className="p-2 text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-full transition-colors"
                    title="Share with Doctor"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleViewHistory(e, record)}
                    className="p-2 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
                    title="View Access History"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedRecordForAction(record); setDeleteModalOpen(true); }}
                    className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 flex items-start gap-4">
                  <div className={`p-4 rounded-2xl ${record.pdfUrl ? 'bg-emerald-100 text-emerald-700' : record.type === RecordType.PRESCRIPTION ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {record.pdfUrl ? <FileCheck className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{record.title}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-sm text-slate-500 flex items-center gap-1.5 font-medium">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(record.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${record.type === RecordType.PRESCRIPTION ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {record.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <StatusBadge verified={record.verified} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-primary-600 text-white border-none shadow-xl relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 opacity-20 transform rotate-12">
              <ShieldCheck className="h-32 w-32" />
            </div>
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Secure Wallet
            </h3>
            <p className="text-sm text-primary-100 mb-6 leading-relaxed opacity-90 font-medium">Your medical documents are end-to-end encrypted and ABHA verified.</p>
            <div className="text-xs font-mono bg-white/20 p-3 rounded-xl border border-white/30 text-center backdrop-blur-md">
              ABHA: 12-3456-7890-1234
            </div>
          </Card>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-7xl w-full h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${selectedRecord.type === RecordType.PRESCRIPTION ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">{selectedRecord.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge verified={selectedRecord.verified} />
                    <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedRecord.date).toLocaleDateString(undefined, { dateStyle: 'full' })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-600" onClick={() => handleViewHistory()}>
                  <History className="h-4 w-4" /> View History
                </Button>
                <Button variant="outline" size="sm" className="gap-2 text-primary-600 border-primary-200" onClick={(e) => handleShareClick(e, selectedRecord)}>
                  <Share2 className="h-4 w-4" /> Share with Doctor
                </Button>
                <button onClick={closeRecord} className="p-3 hover:bg-slate-100 rounded-2xl transition-all group">
                  <X className="h-6 w-6 text-slate-400 group-hover:text-slate-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
              <div className="flex-1 overflow-y-auto p-6 md:p-10 border-r border-slate-200 bg-white">
                <div className="max-w-2xl mx-auto space-y-10">
                  <RecordViewer record={selectedRecord} />
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-4 md:p-8 flex flex-col overflow-hidden">
                <div className="bg-slate-800 rounded-2xl flex flex-col h-full shadow-inner overflow-hidden border border-slate-700">
                  <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex justify-between items-center text-white/70">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Secure Document Viewer
                    </span>
                    <div className="flex gap-2">
                      <button
                        className="p-1.5 hover:text-white hover:bg-white/10 rounded transition-colors"
                        onClick={() => setFullscreenOpen(true)}
                        title="Maximize View"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center">
                    {selectedRecord.pdfUrl ? (
                      <iframe
                        src={pdfBlobUrl || ''}
                        type="application/pdf"
                        className="w-full h-full bg-slate-300"
                        title="Prescription PDF Preview"
                      />
                    ) : selectedRecord.attachments?.[0] ? (
                      <img
                        src={selectedRecord.attachments[0]}
                        className="max-w-full max-h-full object-contain shadow-2xl shadow-black/20 p-4"
                        alt="Medical Scan Preview"
                      />
                    ) : (
                      <div className="text-slate-400 flex flex-col items-center gap-3">
                        <AlertCircle className="h-10 w-10 opacity-20" />
                        <span className="text-sm font-medium">No visual document attached to this record.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share with Doctor Modal */}
      {shareModalOpen && selectedRecordForAction && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-md">
          <Card className="max-w-md w-full p-8 rounded-3xl shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                  <Share2 className="h-5 w-5" />
                </div>
                Share Medical Record
              </h3>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Select Verified Doctor</label>
                <select
                  className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="">-- Choose Doctor --</option>
                  {availableDoctors.length === 0 ? (
                    <option disabled>No verified doctors available</option>
                  ) : (
                    availableDoctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {formatDoctorName(doc.name)} ({doc.specialization})
                      </option>
                    ))
                  )}
                </select>
                {availableDoctors.length > 0 && selectedDoctorId && (
                  <p className="mt-2 text-xs text-slate-500 px-1">
                    Doctor Email: {availableDoctors.find(d => d.id === selectedDoctorId)?.email}
                  </p>
                )}
              </div>

              {shareError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                  {shareError}
                </div>
              )}

              <div className="bg-primary-50 p-4 rounded-2xl flex items-start gap-4 border border-primary-100">
                <ShieldCheck className="h-5 w-5 text-primary-600 mt-1 shrink-0" />
                <p className="text-xs text-primary-900 font-medium leading-relaxed">
                  Only verified doctors from our secure network are eligible for sharing.
                </p>
              </div>

              <Button
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary-500/20"
                onClick={handleShareWithDoctor}
                disabled={!selectedDoctorId}
              >
                Authorize Secure Access
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Share History / Access History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-4xl w-full p-0 overflow-hidden rounded-3xl animate-in zoom-in-95 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                  <History className="h-5 w-5" />
                </div>
                Access & Share History
              </h3>
              <button onClick={() => setHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-8">
              {/* 1. Share Status (Revoke controls) */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Doctor Sharing Status</h4>
                <div className="grid gap-3">
                  {shareHistory.length === 0 ? (
                    <div className="text-center py-8 bg-white/50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
                      Document has not been shared with any doctors yet.
                    </div>
                  ) : (
                    shareHistory.map(share => (
                      <div key={share.id} className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${share.accessStatus === 'REVOKED' ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${share.accessStatus === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                            {share.accessStatus === 'ACTIVE' ? <ShieldCheck className="h-5 w-5" /> : <ShieldX className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{formatDoctorName(share.doctorName)}</p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{share.doctorEmail}</p>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end text-xs text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" /> Shared on {new Date(share.sharedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Eye className="h-3 w-3" /> Accessed {share.accessCount} times
                          </div>
                        </div>

                        {share.accessStatus === 'ACTIVE' ? (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 gap-2 border border-red-100" onClick={() => handleRevoke(share.id)}>
                            <UserMinus className="h-4 w-4" /> Revoke Access
                          </Button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-1 rounded">REVOKED</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* 2. Detailed Audit Log (Views, Downloads, etc.) */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Raw Access Logs</h4>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {store.getAccessLogs((selectedRecordForAction || selectedRecord)?.id || '').map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                            {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{log.viewerName}</span>
                              <span className={`text-[10px] font-bold uppercase ${log.viewerRole === 'PATIENT' ? 'text-primary-600' : 'text-emerald-600'}`}>{log.viewerRole}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${log.action === 'VIEW' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              log.action === 'DOWNLOAD' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                log.action === 'SHARE' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                  log.action === 'REVOKE' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                    'bg-red-50 text-red-700 border-red-100'
                              }`}>
                              {log.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedRecordForAction && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="max-w-sm w-full p-8 text-center rounded-3xl shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><Trash2 className="h-8 w-8" /></div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Permanently Remove?</h3>
            <div className="flex gap-4 mt-8">
              <Button variant="secondary" className="flex-1 h-12 rounded-xl" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 h-12 rounded-xl" onClick={confirmDelete}>Delete</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Fullscreen Viewer Modal */}
      {fullscreenOpen && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-0 w-full p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-3 text-white">
              <FileText className="h-5 w-5 text-primary-400" />
              <span className="font-bold">{selectedRecord.title}</span>
            </div>
            <div className="flex items-center gap-3">
              {selectedRecord.pdfUrl && (
                <Button variant="ghost" className="text-white hover:bg-white/10 gap-2" onClick={(e) => handleDownloadPDF(e, selectedRecord)}>
                  <Download className="h-4 w-4" /> Download Original
                </Button>
              )}
              <button onClick={() => setFullscreenOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white transition-all">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="w-full h-full p-4 md:p-12 flex items-center justify-center">
            {selectedRecord.pdfUrl ? (
              <iframe src={pdfBlobUrl || ''} className="w-full max-w-6xl h-full rounded-xl bg-white shadow-2xl" title="Fullscreen PDF" />
            ) : selectedRecord.attachments?.[0] ? (
              <img src={selectedRecord.attachments[0]} className="max-w-full max-h-[85vh] object-contain shadow-2xl shadow-black rounded-lg" alt="Fullscreen Image" />
            ) : (
              <div className="text-slate-500">No content available to preview.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
