
export interface MedicineEntry {
    name: string;
    type: string;
    dosages: string[];
    brand?: string;
}

export const MEDICINES: MedicineEntry[] = [
    { name: "Paracetamol", type: "Tablet", dosages: ["500 mg", "650 mg", "1000 mg"], brand: "Dolo/Calpol" },
    { name: "Amoxicillin", type: "Capsule", dosages: ["250 mg", "500 mg"], brand: "Mox" },
    { name: "Azithromycin", type: "Tablet", dosages: ["250 mg", "500 mg"], brand: "Azithral" },
    { name: "Pantoprazole", type: "Tablet", dosages: ["20 mg", "40 mg"], brand: "Pan" },
    { name: "Metformin", type: "Tablet", dosages: ["500 mg", "850 mg", "1000 mg"], brand: "Glycomet" },
    { name: "Atorvastatin", type: "Tablet", dosages: ["10 mg", "20 mg", "40 mg"], brand: "Atorva" },
    { name: "Amlodipine", type: "Tablet", dosages: ["2.5 mg", "5 mg", "10 mg"], brand: "Amlong" },
    { name: "Levocetirizine", type: "Tablet", dosages: ["5 mg", "10 mg"], brand: "Levocet" },
    { name: "Montelukast", type: "Tablet", dosages: ["10 mg"], brand: "Montair" },
    { name: "Ibuprofen", type: "Tablet", dosages: ["200 mg", "400 mg"], brand: "Brufen" },
    { name: "Omeprazole", type: "Capsule", dosages: ["20 mg"], brand: "Omez" },
    { name: "Ranitidine", type: "Tablet", dosages: ["150 mg", "300 mg"], brand: "Rantac" },
    { name: "Telmisartan", type: "Tablet", dosages: ["20 mg", "40 mg", "80 mg"], brand: "Telma" },
    { name: "Diclofenac", type: "Tablet", dosages: ["50 mg", "75 mg", "100 mg"], brand: "Voveran" },
    { name: "Ciprofloxacin", type: "Tablet", dosages: ["250 mg", "500 mg"], brand: "Cifran" },
    { name: "Metronidazole", type: "Tablet", dosages: ["200 mg", "400 mg"], brand: "Flagyl" },
    { name: "Vitamin D3", type: "Sachet", dosages: ["60000 IU"], brand: "Calcirol" },
    { name: "B-Complex", type: "Capsule", dosages: ["Standard"], brand: "Becosules" },
    { name: "Cough Syrup", type: "Syrup", dosages: ["5 ml", "10 ml"], brand: "Ascoril" },
    { name: "Antacid", type: "Syrup", dosages: ["10 ml", "15 ml"], brand: "Gelusil" }
];

export const SYMPTOMS = [
    "Fever", "Fever with chills", "High-grade fever", "Low-grade fever",
    "Cough", "Dry Cough", "Productive Cough", "Sore throat",
    "Headache", "Migraine", "Body ache", "Joint pain",
    "Stomach ache", "Abdominal pain", "Nausea", "Vomiting",
    "Loose motion", "Diarrhea", "Constipation",
    "Chest pain", "Breathlessness", "Palpitations",
    "Skin rash", "Itching", "Allergy",
    "Fatigue", "Weakness", "Dizziness", "Vertigo"
];

export const DIAGNOSES = [
    "Viral Fever", "Acute Febrile Illness", "Typhoid Fever", "Dengue Fever", "Malaria",
    "Acute Bronchitis", "Upper Respiratory Tract Infection (URTI)", "Pneumonia", "Asthma",
    "Acute Gastritis", "Gastroenteritis", "GERD", "Acid Peptic Disease", "IBS",
    "Hypertension", "Type 2 Diabetes Mellitus", "Hypothyroidism",
    "Urinary Tract Infection (UTI)", "Kidney Stone",
    "Migraine", "Tension Headache",
    "Allergic Rhinitis", "Dermatitis", "Eczema",
    "Anemia", "Vitamin D Deficiency"
];

export const ADVICE = [
    "Drink plenty of water", "Drink warm water", "Salt water gargle", "Steam inhalation",
    "Avoid spicy and oily food", "Avoid cold items", "Avoid outside food",
    "Take adequate rest", "Bed rest for 3 days", "Complete bed rest",
    "Review after 3 days", "Review after 5 days", "Review after 1 week",
    "Monitor blood pressure daily", "Monitor blood sugar levels",
    "Light diet", "Soft diet", "High protein diet"
];

export const FREQUENCIES = [
    "1-0-1 (BD)", "1-0-0 (OD)", "0-0-1 (HS)", "1-1-1 (TDS)", 
    "1-1-1-1 (QID)", "0-1-0 (Afternoon)", "SOS (As needed)", 
    "Every 6 hours", "Every 12 hours", "Once a week"
];

export const DURATIONS = [
    "3 days", "5 days", "7 days", "10 days", "14 days", 
    "1 month", "2 months", "3 months", "Continue"
];
