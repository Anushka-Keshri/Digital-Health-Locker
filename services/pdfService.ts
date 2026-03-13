import { jsPDF } from 'jspdf';
import { DoctorProfile, PatientProfile, PrescriptionData, MedicalRecord } from '../types';

/**
 * Generates a professional PDF prescription pad
 */
export async function generatePrescriptionPDF(
  doctor: DoctorProfile,
  patient: PatientProfile,
  data: PrescriptionData,
  recordId: string,
  timestamp: string
): Promise<{ pdfBlob: Blob, hash: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // --- 1. Authentic Header ---
  // Left Side: Doctor Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`Dr. ${doctor.name}`, 20, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(doctor.specialization, 20, 25);
  doc.text(`Reg No: ${doctor.registrationNumber}`, 20, 30);
  doc.text(`Email: ${doctor.email}`, 20, 35);

  // Right Side: Clinic Details
  doc.setFont('helvetica', 'bold');
  doc.text(doctor.practiceLocation || 'Consultation Clinic', 190, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('City Medical Centre', 190, 25, { align: 'right' });
  doc.text('Emergency Contact: +91-9876543210', 190, 30, { align: 'right' });

  // Header Line
  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);

  // --- 2. Patient Information ---
  doc.setFontSize(11);
  doc.text(`Patient: ${patient.name}`, 20, 50);
  doc.text(`Age/Sex: 35Y / Male`, 80, 50); // Age is mock for now
  doc.text(`Date: ${new Date(timestamp).toLocaleDateString()}`, 190, 50, { align: 'right' });

  doc.setLineWidth(0.2);
  doc.line(20, 55, 190, 55);

  // --- 3. Diagnosis Section ---
  doc.setFont('helvetica', 'bold');
  doc.text('Diagnosis:', 20, 65);
  doc.setFont('helvetica', 'normal');
  
  const diagnosisLines = doc.splitTextToSize(data.diagnosis || 'Clinical Consultation', 160);
  doc.text(diagnosisLines, 20, 71);
  
  let currentY = 71 + (diagnosisLines.length * 5) + 5;

  if (data.symptoms) {
    doc.setFont('helvetica', 'bold');
    doc.text('Symptoms:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const symptomLines = doc.splitTextToSize(data.symptoms, 160);
    doc.text(symptomLines, 20, currentY + 6);
    currentY += 6 + (symptomLines.length * 5) + 5;
  }

  // --- 4. Medication (Rx) Section ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Rx (Prescription)', 20, currentY);
  doc.line(20, currentY + 2, 60, currentY + 2);
  currentY += 10;

  doc.setFontSize(11);
  data.items.forEach((item, index) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.medicine} - ${item.dosage}`, 25, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${item.frequency} for ${item.duration}`, 30, currentY + 5);
    if (item.instructions) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Instructions: ${item.instructions}`, 30, currentY + 10);
      currentY += 18;
    } else {
      currentY += 12;
    }
    
    // Page break check
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  // --- 5. Advice ---
  if (data.notes) {
    currentY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Advice / Notes:', 20, currentY);
    doc.setFont('helvetica', 'normal');
    const adviceLines = doc.splitTextToSize(data.notes, 160);
    doc.text(adviceLines, 20, currentY + 6);
    currentY += 6 + (adviceLines.length * 5) + 10;
  }

  // --- 6. Digital Signature ---
  currentY = Math.max(currentY, 260);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Digitally Signed By:', 190, currentY, { align: 'right' });
  doc.text(`Dr. ${doctor.name}`, 190, currentY + 5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Reg No: ${doctor.registrationNumber}`, 190, currentY + 10, { align: 'right' });
  doc.text(`Timestamp: ${new Date(timestamp).toLocaleString()}`, 190, currentY + 15, { align: 'right' });

  // --- 7. Tamper-Proof Hash (Footer) ---
  const prescriptionDataStr = JSON.stringify({
    docId: doctor.id,
    patId: patient.id,
    data,
    ts: timestamp
  });
  
  // Calculate SHA-256 hash
  const msgBuffer = new TextEncoder().encode(prescriptionDataStr);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Document ID: ${recordId}`, 20, 285);
  doc.text(`Verification Hash: ${hashHex}`, 20, 289);
  doc.text('This is a digitally generated medical prescription and does not require a physical seal.', 190, 289, { align: 'right' });

  return {
    pdfBlob: doc.output('blob'),
    hash: hashHex
  };
}
