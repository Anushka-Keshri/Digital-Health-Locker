# Digital Health Locker 🏥🛡️

Digital Health Locker is a secure, intelligent, and user-centric platform for managing medical records. It leverages **OCR (Optical Character Recognition)** and **RAG (Retrieval-Augmented Generation)** to analyze prescriptions, correct extraction errors, and provide clinical insights.

## ✨ Key Features

- **🔐 Secure Records Vault**: Store and manage medical prescriptions, lab reports, and scan results with end-to-end encryption logic.
- **🚀 AI-Powered OCR**: Automatically extract text from prescription images using Groq-powered Vision models.
- **🧠 RAG-Based Correction**: 
  - Validates OCR text against a dataset of **250,000+ Indian medicines** and 16,000+ medical terms.
  - Automatically fixes common typos (e.g., "Augmntin" ➔ "Augmentin").
  - Optimized with **O(1) high-speed lookups** for instant processing without browser lag.
- **📝 Clinical Summaries**: Generates intelligent summaries of prescriptions, including retrieved drug knowledge (uses, side effects, and precautions).
- **👥 Dual-Portal Access**:
  - **Patient Portal**: Upload, analyze, and securely share specific documents with verified doctors.
  - **Doctor Portal**: Review shared patient records with AI-enhanced summaries and original document previews.
- **📅 Access History & Audit**: Track exactly who viewed or downloaded your records and when.

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Tailwind CSS (Design)
- **Icons**: Lucide React
- **AI/LLM**: Groq SDK (Llama & Vision models)
- **Search Engine**: Fuse.js (Fuzzy matching) & Optimized Set Lookups
- **Routing**: React Router DOM
- **Security**: SubtleCrypto Web API (with metadata fallback)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A **Groq API Key** (Get it at [console.groq.com](https://console.groq.com))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Anushka-Keshri/Digital-Health-Locker.git
   cd Digital-Health-Locker
