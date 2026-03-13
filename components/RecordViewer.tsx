import React, { useState } from 'react';
import { 
  FileText, Activity, Pill, Info, Stethoscope, 
  BrainCircuit, ChevronDown, ChevronUp, Calendar, Hash, ShieldCheck
} from 'lucide-react';
import { MedicalRecord, RecordType, PrescriptionItem } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatDoctorName } from './ui';

interface RecordViewerProps {
  record: MedicalRecord;
}

export const RecordViewer: React.FC<RecordViewerProps> = ({ record }) => {
  const [showSummary, setShowSummary] = useState(true);

  const getParsedContent = () => {
    if (!record.content) return {};
    if (typeof record.content !== 'string') return record.content;
    try {
      return JSON.parse(record.content);
    } catch (e) {
      return { rawText: record.content };
    }
  };

  const content = getParsedContent();
  const diagnosis = content.diagnosis || record.title || 'General Medical Consultation';
  const medicines = content.items || [];
  const notes = content.notes || '';
  const symptoms = content.symptoms || '';

  return (
    <div className="space-y-8 pb-10">
      {/* 1. AI Summary Panel (Mandatory) */}
      {(record.aiSummary || record.extractedText) && (
        <div className="border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
          <button 
            onClick={() => setShowSummary(!showSummary)}
            className="w-full bg-indigo-50/50 p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-indigo-950 text-sm">AI Medical Summary</h3>
                <p className="text-[10px] text-indigo-600 font-medium uppercase tracking-wider">Powered by Gemini 3.0 Pro</p>
              </div>
            </div>
            {showSummary ? <ChevronUp className="h-5 w-5 text-indigo-400" /> : <ChevronDown className="h-5 w-5 text-indigo-400" />}
          </button>
          
          {showSummary && (
            <div className="p-6 bg-white prose prose-indigo max-w-none">
              {record.aiSummary ? (
                <MarkdownRenderer content={record.aiSummary} />
              ) : (
                <div className="flex items-center gap-3 text-slate-500 italic py-4">
                  <Info className="h-5 w-5" />
                  <span>Processing detailed AI analysis...</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Structured Medical Data */}
      <div className="space-y-6">
        {/* Diagnosis / Findings Section */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Clinical Impression / Diagnosis</h4>
              <p className="text-xl font-bold text-slate-900 leading-tight">{diagnosis}</p>
            </div>
          </div>

          {symptoms && (
            <div className="mt-4 pt-4 border-t border-slate-50">
               <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Symptoms Noted</h5>
               <p className="text-slate-700 leading-relaxed">{symptoms}</p>
            </div>
          )}
        </section>

        {/* Prescription Details (If applicable) */}
        {record.type === RecordType.PRESCRIPTION && medicines.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-2">
               <Pill className="h-5 w-5 text-primary-600" />
               <h4 className="font-bold text-slate-900">Rx Medications</h4>
            </div>
            
            <div className="grid gap-4">
              {medicines.map((item: PrescriptionItem, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center gap-4 group hover:bg-white hover:shadow-md transition-all">
                   <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900 group-hover:text-primary-700 transition-colors">{item.medicine}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                         <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 uppercase">Dosage: {item.dosage}</span>
                         <span className="text-[10px] font-bold bg-primary-50 px-2 py-0.5 rounded border border-primary-100 text-primary-700 uppercase">Freq: {item.frequency}</span>
                      </div>
                   </div>
                   <div className="md:w-32 text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Duration</p>
                      <p className="text-sm font-bold text-slate-900">{item.duration}</p>
                   </div>
                   {item.instructions && (
                      <div className="w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 md:pl-4 md:border-l flex gap-2">
                        <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 italic leading-snug">{item.instructions}</p>
                      </div>
                   )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Clinical Advice / Notes */}
        {notes && (
          <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
             <div className="flex items-center gap-3 mb-3">
                <div className="p-1.5 bg-amber-100 text-amber-600 rounded">
                  <Info className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest">Doctor's Advice & Plan</h4>
             </div>
             <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{notes}</p>
          </section>
        )}

        {/* Footer Audit Info */}
        <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
               <Calendar className="h-3.5 w-3.5" />
               Record Date: {new Date(record.date).toLocaleDateString()}
            </div>
            {record.doctorId && (
               <div className="flex items-center gap-2">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Issued by: {formatDoctorName(record.doctorName)}
               </div>
            )}
            {record.prescriptionHash && (
               <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Hash: {record.prescriptionHash.slice(0, 12)}...
               </div>
            )}
        </div>
      </div>
    </div>
  );
};