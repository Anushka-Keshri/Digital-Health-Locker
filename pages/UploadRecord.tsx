
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, ArrowLeft, Loader2, X, File as FileIcon, Eye, Save, Wand2, ScanSearch, Calendar, Stethoscope, CheckCircle2 } from 'lucide-react';
import { Button, Card, Input, formatDoctorName } from '../components/ui';
import { store } from '../services/store';
import { processMedicalDocument } from '../services/geminiService';
import { MedicalRecord, RecordType, UserRole } from '../types';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const UploadRecord: React.FC = () => {
    const navigate = useNavigate();
    const user = store.getCurrentUser();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // States
    const [file, setFile] = useState<File | null>(null);
    const [fileHash, setFileHash] = useState<string>('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'processing' | 'review'>('upload');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStatus, setProcessingStatus] = useState("Initializing...");
    const [textTab, setTextTab] = useState<'corrected' | 'raw'>('corrected');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Processed Data
    const [processedData, setProcessedData] = useState<{
        extractedText: string;
        correctedText?: string;
        documentType?: string;
        extractedDate?: string | null;
        doctorName?: string | null;
        diagnosis?: string;
        summaryMarkdown?: string;
        confidence: number;
        dateConfidence: number;
    } | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [recordType, setRecordType] = useState<RecordType>(RecordType.PRESCRIPTION);
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [dateConfirmed, setDateConfirmed] = useState(false);

    // Auth Guard
    useEffect(() => {
        if (!user) {
            console.warn("Access Denied: No user session found. Redirecting to login.");
            navigate('/');
            return;
        }
        if (user.role !== UserRole.PATIENT) {
            navigate('/');
        }
    }, [user, navigate]);

    if (!user || user.role !== UserRole.PATIENT) {
        return null;
    }

    // Helper: Compute SHA-256 hash of file with fallback
    const computeFileHash = async (file: File): Promise<string> => {
        try {
            // Check if modern crypto is available (might be missing in insecure contexts)
            if (window.crypto && window.crypto.subtle) {
                const buffer = await file.arrayBuffer();
                const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn("Crypto API failed, using fallback hash:", e);
        }

        // Fallback: Use string metadata if crypto is unavailable
        return `${file.name}-${file.size}-${file.lastModified}`;
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setErrorMessage(null);
        try {
            if (e.target.files && e.target.files[0]) {
                const selectedFile = e.target.files[0];

                if (selectedFile.size > 10 * 1024 * 1024) {
                    alert("File size must be less than 10MB");
                    return;
                }
                if (!['image/jpeg', 'image/png', 'application/pdf'].includes(selectedFile.type)) {
                    alert("Only JPG, PNG and PDF files are allowed");
                    return;
                }

                setFile(selectedFile);
                setTitle(selectedFile.name.split('.')[0]);

                // Compute Hash (with fallback logic)
                const hash = await computeFileHash(selectedFile);
                setFileHash(hash);

                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreviewUrl(e.target?.result as string || null);
                };
                reader.readAsDataURL(selectedFile);
            }
        } catch (err: any) {
            console.error("File selection error:", err);
            setErrorMessage("Failed to read file. Please try again.");
        }
    };


    const mapStringToRecordType = (typeStr?: string): RecordType => {
        if (!typeStr) return RecordType.PRESCRIPTION;
        switch (typeStr) {
            case 'LAB_REPORT': return RecordType.LAB_REPORT;
            case 'DISCHARGE_SUMMARY': return RecordType.DISCHARGE_SUMMARY;
            case 'VACCINATION': return RecordType.VACCINATION;
            default: return RecordType.PRESCRIPTION;
        }
    };

    const handleProcess = async () => {
        if (!file || !previewUrl) return;

        // Duplicate Check
        if (store.checkDuplicate(user.id, fileHash)) {
            setErrorMessage("Duplicate document detected. This file has already been uploaded to your locker.");
            return;
        }

        setErrorMessage(null);
        setStep('processing');
        setUploadProgress(0);

        // Simulate pipeline steps for UX
        const statusSteps = [
            { p: 10, text: "Preprocessing Image & Date Region Crop..." },
            { p: 30, text: "Running High-Precision OCR..." },
            { p: 50, text: "Auto-detecting Date & Document Type..." },
            { p: 70, text: "Validating Medicines & Generating Summary..." },
            { p: 90, text: "Finalizing..." }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < statusSteps.length) {
                setUploadProgress(statusSteps[currentStep].p);
                setProcessingStatus(statusSteps[currentStep].text);
                currentStep++;
            }
        }, 800);

        try {
            const base64Data = previewUrl.split(',')[1];
            const result = await processMedicalDocument(base64Data, file.type);

            clearInterval(interval);
            setProcessedData(result);
            setUploadProgress(100);
            setStep('review');

            // Auto-fill form fields
            if (result.diagnosis && result.diagnosis !== 'Unknown') {
                setTitle(result.diagnosis);
            } else {
                setTitle(file.name.split('.')[0]);
            }

            if (result.extractedDate) {
                setDocDate(result.extractedDate);
                // If high confidence, auto-confirm
                if (result.dateConfidence > 80) setDateConfirmed(true);
            } else {
                setDateConfirmed(false); // Force manual check if null
            }

            setRecordType(mapStringToRecordType(result.documentType));

        } catch (error: any) {
            clearInterval(interval);
            console.error(error);
            setStep('upload'); // Go back to upload screen

            if (error.message && error.message.includes("Invalid Document")) {
                setErrorMessage("⚠ This file does not appear to be a valid medical document. Please upload a prescription, lab report, or medical record.");
            } else {
                setErrorMessage(error.message || "Failed to process document. Please try again.");
            }
        }
    };

    const handleSave = () => {
        if (!file || !previewUrl) return;

        // Final Duplicate Check (Safety)
        if (store.checkDuplicate(user.id, fileHash)) {
            setErrorMessage("Duplicate document detected. Upload cancelled.");
            return;
        }

        // Safety Check: Require confirmation if date confidence was low
        if (processedData?.dateConfidence && processedData.dateConfidence < 75 && !dateConfirmed) {
            alert("Please confirm the document date before saving.");
            return;
        }

        const newRecord: MedicalRecord = {
            id: Math.random().toString(36).substr(2, 9),
            patientId: user.id,
            type: recordType,
            title: title,
            date: new Date(docDate).toISOString(), // Uses the extracted or manually corrected date
            verified: false,
            doctorName: processedData?.doctorName || undefined,
            tags: processedData?.diagnosis ? ['uploaded', processedData.diagnosis.toLowerCase()] : ['uploaded'],
            content: JSON.stringify({
                diagnosis: processedData?.diagnosis || 'Uploaded Record',
                extractedText: processedData?.extractedText || ''
            }),
            attachments: [previewUrl],
            aiSummary: processedData?.summaryMarkdown || "Manual Upload",
            ocrConfidence: processedData?.confidence,
            extractedText: processedData?.extractedText,
            correctedText: processedData?.correctedText,
            dateSource: dateConfirmed ? 'USER' : 'AI', // Track if user manually confirmed
            dateConfidence: processedData?.dateConfidence,
            fileHash: fileHash, // Store Hash
            isDeleted: false // New record
        };

        store.addRecord(newRecord);
        navigate('/patient/dashboard');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/patient/dashboard')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-slate-900">Upload Record</h1>
            </div>

            {step === 'upload' && (
                <>
                    {errorMessage && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <Card className="p-12 border-dashed border-2 border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileSelect}
                        />
                        {file ? (
                            <div className="flex flex-col items-center animate-in fade-in duration-300">
                                {file.type.includes('image') ? (
                                    <img src={previewUrl || ''} className="h-48 object-contain mb-4 rounded-lg shadow-sm bg-white p-2" alt="Preview" />
                                ) : (
                                    <div className="mb-4 p-4 bg-white rounded shadow-sm">
                                        <FileIcon className="h-16 w-16 text-red-500" />
                                    </div>
                                )}
                                <p className="font-medium text-slate-900 text-lg">{file.name}</p>
                                <p className="text-sm text-slate-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                <div className="flex gap-3">
                                    <Button variant="ghost" className="text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setFile(null); setFileHash(''); setErrorMessage(null); }}>
                                        Remove
                                    </Button>
                                    <Button className="px-8" onClick={(e) => { e.stopPropagation(); handleProcess(); }}>
                                        Analyze & Save <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-8">
                                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                    <UploadCloud className="h-10 w-10 text-primary-600" />
                                </div>
                                <h3 className="text-xl font-medium text-slate-900">Click to upload or drag and drop</h3>
                                <p className="text-slate-500 mt-2">Supports JPG, PNG and PDF (Max 10MB)</p>
                                <div className="flex gap-4 mt-6 text-xs text-slate-400">
                                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Secure Encryption</span>
                                    <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> AI Analysis</span>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            )}

            {step === 'processing' && (
                <Card className="p-16 text-center">
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                        <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-6" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Document</h3>
                        <p className="text-slate-500 mb-8 min-h-[3rem] transition-all">{processingStatus}</p>

                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div className="bg-primary-600 h-3 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                    </div>
                </Card>
            )}

            {step === 'review' && processedData && (
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Left Column: Preview & OCR */}
                    <div className="space-y-6">
                        <Card className="p-0 overflow-hidden bg-slate-900">
                            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center text-white">
                                <span className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Document Preview</span>
                                {processedData.confidence < 70 && (
                                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded flex items-center gap-1 animate-pulse">
                                        <AlertTriangle className="h-3 w-3" /> Warning: Low Clarity ({processedData.confidence}%)
                                    </span>
                                )}
                            </div>
                            <div className="p-6 flex justify-center min-h-[300px] items-center">
                                {file?.type.includes('image') ? (
                                    <img src={previewUrl || ''} className="max-h-[400px] max-w-full object-contain rounded" alt="Preview" />
                                ) : (
                                    <iframe src={previewUrl || ''} className="w-full h-[400px] border-none bg-white rounded" title="PDF Preview" />
                                )}
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                                    <ScanSearch className="h-4 w-4 text-slate-400" />
                                    Extracted Text
                                </h4>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setTextTab('corrected')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${textTab === 'corrected' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Wand2 className="h-3 w-3" /> AI Corrected
                                    </button>
                                    <button
                                        onClick={() => setTextTab('raw')}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${textTab === 'raw' ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Raw OCR
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs font-mono text-slate-600 h-60 overflow-y-auto whitespace-pre-wrap">
                                {textTab === 'corrected'
                                    ? (processedData.correctedText || "No correction available.")
                                    : (processedData.extractedText || "No text extracted.")
                                }
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: AI Summary & Form */}
                    <div className="space-y-6">
                        <Card className="p-6 border-primary-100 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <FileText className="h-32 w-32 text-primary-600" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="bg-primary-100 p-1.5 rounded text-primary-600"><FileText className="h-5 w-5" /></span>
                                    AI Health Summary
                                </h3>

                                <div className="bg-white p-4 rounded border border-slate-200 max-h-80 overflow-y-auto">
                                    <MarkdownRenderer content={processedData.summaryMarkdown || "No summary available"} />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="font-semibold text-slate-900 mb-4">Finalize Record</h3>
                            <div className="space-y-4">
                                <Input
                                    label="Document Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Record Type</label>
                                        <select
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            value={recordType}
                                            onChange={(e) => setRecordType(e.target.value as RecordType)}
                                        >
                                            {Object.values(RecordType).map(type => (
                                                <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date Field with Validation UX */}
                                    <div className={`${processedData.dateConfidence < 75 && !dateConfirmed ? 'animate-pulse' : ''}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="block text-sm font-medium text-slate-700">Date</label>
                                            {processedData.dateConfidence < 75 ? (
                                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Check Date</span>
                                            ) : (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Auto-Detected</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                type="date"
                                                value={docDate}
                                                onChange={(e) => { setDocDate(e.target.value); setDateConfirmed(true); }}
                                                className={processedData.dateConfidence < 75 && !dateConfirmed ? "border-yellow-400 ring-2 ring-yellow-100" : ""}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={`px-3 ${dateConfirmed ? 'bg-green-50 text-green-700 border-green-200' : 'text-slate-400'}`}
                                                onClick={() => setDateConfirmed(!dateConfirmed)}
                                                title="Confirm Date Accuracy"
                                            >
                                                {dateConfirmed ? <CheckCircle2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                {processedData.doctorName && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                        <Stethoscope className="h-4 w-4" />
                                        Detected Doctor: <span className="font-medium">{formatDoctorName(processedData.doctorName)}</span>
                                    </div>
                                )}
                                <div className="pt-2 flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>Discard</Button>
                                    <Button className="flex-[2]" onClick={handleSave}>
                                        <Save className="h-4 w-4 mr-2" /> Save to Locker
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};
