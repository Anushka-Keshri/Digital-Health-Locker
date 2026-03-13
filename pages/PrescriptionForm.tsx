import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Send, Check, Stethoscope, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { Autocomplete } from '../components/Autocomplete';
import { store } from '../services/store';
import { generatePrescriptionPDF } from '../services/pdfService';
import { UserRole, PrescriptionItem, MedicalRecord, RecordType, DoctorProfile, PatientProfile } from '../types';
import { MEDICINES, SYMPTOMS, DIAGNOSES, ADVICE, FREQUENCIES, DURATIONS } from '../services/medicalDictionary';

export const PrescriptionForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = store.getCurrentUser();
  const patients = store.getAllPatients();

  // State
  const [selectedPatientId, setSelectedPatientId] = useState<string>((location.state as any)?.patientId || '');
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([
    { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to get available dosages for a specific medicine
  const getDosagesForMedicine = (medicineName: string): string[] => {
    const entry = MEDICINES.find(m => m.name.toLowerCase() === medicineName.trim().split(' (')[0].toLowerCase());
    return entry ? entry.dosages : [];
  };

  useEffect(() => {
    if (!user) {
      console.warn("Access Denied: No user session found. Redirecting to login.");
      navigate('/');
      return;
    }
    if (user.role !== UserRole.DOCTOR) {
      console.warn("Access Denied: User is not a doctor.");
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== UserRole.DOCTOR) return null;

  const handleAddItem = () => {
    setItems([...items, { medicine: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Auto-set dosage if medicine name matches exactly and has only 1 dosage option
    if (field === 'medicine') {
      const dosages = getDosagesForMedicine(value);
      if (dosages.length === 1) {
        newItems[index].dosage = dosages[0];
      }
    }

    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !diagnosis) return;

    setIsSubmitting(true);

    try {
      const doc = user as DoctorProfile;
      const patient = patients.find(p => p.id === selectedPatientId) as PatientProfile;
      const timestamp = new Date().toISOString();
      const recordId = Math.random().toString(36).substr(2, 9);

      // --- NEW: Professional PDF Generation ---
      const prescriptionData = {
        diagnosis: diagnosis.replace(/,\s*$/, ""),
        symptoms: symptoms.replace(/,\s*$/, ""),
        notes: notes.replace(/,\s*$/, ""),
        items
      };

      const { pdfBlob, hash } = await generatePrescriptionPDF(
        doc,
        patient,
        prescriptionData,
        recordId,
        timestamp
      );

      // Convert Blob to Data URL for mock storage
      const pdfDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(pdfBlob);
      });

      const newRecord: MedicalRecord = {
        id: recordId,
        patientId: selectedPatientId,
        doctorId: doc.id,
        doctorName: doc.name,
        type: RecordType.PRESCRIPTION,
        title: `Rx: ${diagnosis.split(',')[0]}`,
        date: timestamp,
        verified: true,
        tags: ['prescription', 'doctor-issued', ...diagnosis.split(',').map(d => d.trim().toLowerCase())],
        content: JSON.stringify(prescriptionData),
        prescriptionHash: hash,
        generatedAtTimestamp: timestamp,
        pdfUrl: pdfDataUrl // Store the generated professional PDF
      };

      store.addRecord(newRecord);

      // Auto-share with the issuing doctor so it appears in their dashboard
      store.shareDocument(newRecord.id, selectedPatientId, doc.id);

      // Success delay
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/doctor/dashboard');
      }, 800);

    } catch (err) {
      console.error("Prescription Issue Error:", err);
      alert("Failed to issue prescription. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Prepare Medicine Options with Brands
  const medicineOptions = MEDICINES.map(m => `${m.name}${m.brand ? ` (Brand: ${m.brand})` : ''}`);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Prescription</h1>
          <p className="text-slate-500 text-sm">Create digital prescription with professional PDF generation.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/doctor/dashboard')}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <Card className="p-6 border-l-4 border-l-primary-500">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <div className="p-1 bg-primary-100 rounded text-primary-600"><Stethoscope className="h-4 w-4" /></div>
            Patient Details
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Patient</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                required
              >
                <option value="">-- Select Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Age / Gender" placeholder="e.g. 34 M" disabled />
              <Input label="Weight (kg)" placeholder="e.g. 70" />
            </div>
          </div>
        </Card>

        {/* Diagnosis & Symptoms */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Clinical Findings</h3>
          <div className="space-y-4">
            <Autocomplete
              label="Diagnosis"
              placeholder="Start typing (e.g. Gastritis, Fever...)"
              value={diagnosis}
              onChange={setDiagnosis}
              options={DIAGNOSES}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <Autocomplete
                label="Symptoms"
                placeholder="Type symptoms (e.g. Cough, Headache...)"
                value={symptoms}
                onChange={setSymptoms}
                options={SYMPTOMS}
                multi={true}
              />

              <Autocomplete
                label="Advice / Instructions"
                placeholder="Type advice (e.g. Drink warm water...)"
                value={notes}
                onChange={setNotes}
                options={ADVICE}
                multi={true}
              />
            </div>
          </div>
        </Card>

        {/* Medications */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">Medications (Rx)</h3>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Add Medicine
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const currentMedName = item.medicine.split(' (')[0].trim();
              const availableDosages = getDosagesForMedicine(currentMedName);

              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-sm relative group">
                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Medicine Name</label>
                    <Autocomplete
                      value={item.medicine}
                      onChange={(val) => handleItemChange(index, 'medicine', val)}
                      options={medicineOptions}
                      placeholder="Search medicine..."
                      className="w-full"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Dosage</label>
                    {availableDosages.length > 0 ? (
                      <div className="relative">
                        <select
                          className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                          value={item.dosage}
                          onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        >
                          <option value="">Select</option>
                          {availableDosages.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    ) : (
                      <Input
                        placeholder="e.g. 500mg"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Frequency</label>
                    <div className="relative">
                      <select
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                      >
                        <option value="">Select</option>
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Duration</label>
                    <div className="relative">
                      <select
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                        value={item.duration}
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                      >
                        <option value="">Select</option>
                        {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-6 flex gap-2">
                    <Input
                      placeholder="Notes"
                      className="text-sm"
                      value={item.instructions}
                      onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors self-start"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-end gap-4 sticky bottom-4 z-40 bg-white/80 p-4 backdrop-blur-md rounded-xl border border-slate-200 shadow-lg">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full md:w-auto shadow-xl shadow-primary-500/20 gap-3"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Generating Secure PDF...</span>
              </>
            ) : (
              <>
                <div className="flex flex-col items-start text-left">
                  <span className="leading-none text-sm font-bold">Sign & Generate PDF</span>
                  <span className="text-[10px] opacity-80 font-normal">Tamper-proof professional record</span>
                </div>
                <Send className="h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};