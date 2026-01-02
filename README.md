# CureSight - AI Medical Symptom Analysis

An advanced medical symptom analysis application with dual portals for patients and doctors, featuring AI-powered diagnosis, multilingual support, prescription photo analysis, and voice interaction.

## Features

### Patient Portal
- **Multi-Input Symptom Entry**
  - Text input with character counter
  - Voice recording with real-time transcription
  - Prescription photo upload with OCR text extraction
  
- **AI Analysis**
  - Disease category identification
  - Severity assessment (LOW, MODERATE, HIGH, EMERGENCY)
  - Personalized recommendations
  - Safety rule overrides for dangerous keywords
  
- **Multilingual Support**
  - English, Hindi, Telugu, Kannada
  - Voice input in selected language
  - Text-to-speech results playback
  
- **Accessible Design**
  - Large buttons and icons for elderly users
  - Clean, minimal interface
  - Medical gradient theme
  - Smooth animations

### Doctor/Admin Portal
- **Authentication**
  - Password-protected access (Admin@22)
  
- **Dashboard Views**
  - Recent patient queries with full details
  - Extracted prescription text review
  - Real-time severity tracking
  
- **Safety Rules Management**
  - View dangerous keyword triggers
  - Emergency override configurations
  - Category and severity assignments
  
- **Guidance Content**
  - Self-care, consult, and emergency guidance
  - Multilingual content management
  - Severity-based recommendations

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: OnSpace Cloud (Supabase-compatible)
- **AI**: OnSpace AI (Gemini 2.5 Flash for analysis and OCR)
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for images and audio cache
- **State Management**: Zustand
- **UI Components**: shadcn/ui

## Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn components
│   ├── LanguageSelector.tsx   # Multi-language dropdown
│   ├── VoiceInput.tsx         # Speech recognition
│   ├── PrescriptionUpload.tsx # Image upload & OCR
│   └── AnalysisResults.tsx    # Results display
├── pages/
│   ├── PatientPortal.tsx      # Main patient interface
│   └── DoctorPortal.tsx       # Admin dashboard
├── stores/
│   └── useLanguageStore.ts    # Language state
├── lib/
│   ├── supabase.ts            # Backend client
│   └── translations.ts        # Multi-language strings
└── types/
    └── index.ts               # TypeScript definitions

supabase/functions/
├── _shared/
│   └── cors.ts                # CORS headers
├── analyze-symptoms/          # AI symptom analysis
├── extract-prescription/      # OCR text extraction
├── text-to-speech/            # TTS (client-side fallback)
└── admin-login/               # Doctor authentication
```

## Database Schema

### Tables
- **patient_queries**: Stores all symptom analysis requests
- **doctor_notes**: Doctor comments on patient queries
- **safety_rules**: Dangerous keyword triggers
- **guidance_content**: Multilingual recommendations

### Storage Buckets
- **prescriptions**: Uploaded prescription images
- **audio-cache**: Cached TTS audio files

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   - `VITE_SUPABASE_URL`: Auto-configured by OnSpace
   - `VITE_SUPABASE_ANON_KEY`: Auto-configured by OnSpace

3. **Backend Setup**
   - Database tables created automatically via SQL migrations
   - Edge Functions deployed to OnSpace Cloud
   - OnSpace AI configured with API keys

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Usage Guide

### For Patients

1. **Select Language**: Choose from English, Hindi, Telugu, or Kannada
2. **Input Symptoms**: Use any combination of:
   - Type symptoms in the text area
   - Click "Voice Input" and speak
   - Upload a prescription photo
3. **Analyze**: Click the "Analyze" button
4. **View Results**: 
   - Disease category and severity
   - Personalized recommendation
   - Reason for assessment
5. **Listen**: Results are automatically spoken in your language

### For Doctors

1. **Login**: Navigate to Doctor Portal and enter password (Admin@22)
2. **View Dashboard**: 
   - Patient Queries: Recent analyses with full details
   - Safety Rules: Emergency keyword triggers
   - Guidance Content: Multilingual recommendations
3. **Review Data**: Click on any query to see symptoms, prescription text, and AI analysis

## Safety Features

- **Emergency Keyword Detection**: Automatic override for life-threatening symptoms
- **Privacy Protection**: OCR removes personal identifiers from prescriptions
- **Severity Assessment**: Four-level system (LOW → EMERGENCY)
- **Rule-Based Overrides**: Pre-configured for chest pain, breathing difficulty, etc.

## Multilingual Configuration

The system supports four languages with full translation coverage:
- **English (en)**: Default language
- **Hindi (hi)**: हिन्दी interface and voice
- **Telugu (te)**: తెలుగు interface and voice
- **Kannada (kn)**: ಕನ್ನಡ interface and voice

Voice recognition and synthesis use browser's native Web Speech API with language-specific models.

## OCR and Text Extraction

Prescription photo analysis:
1. Upload image (PNG, JPG, JPEG)
2. AI vision model extracts medical text
3. Personal identifiers removed automatically
4. Only medication names, dosages, and symptoms retained
5. Combined with user symptoms for comprehensive analysis

## Voice Features

### Input
- Web Speech API with language-specific recognition
- Continuous listening mode
- Real-time transcript display

### Output
- Auto-play results on analysis completion
- Manual "Speak" button for replay
- Audio caching to reduce TTS calls

## Admin Configuration

### Default Safety Rules
- chest pain → EMERGENCY
- difficulty breathing → EMERGENCY
- severe bleeding → EMERGENCY
- unconscious → EMERGENCY
- stroke symptoms → EMERGENCY

### Guidance Templates
Pre-configured in all four languages for:
- Self-care (LOW severity)
- Consult doctor (MODERATE/HIGH)
- Emergency attention (EMERGENCY)

## API Endpoints

### Edge Functions
- `analyze-symptoms`: Process symptoms with AI
- `extract-prescription`: OCR on uploaded images
- `text-to-speech`: Generate audio (client fallback)
- `admin-login`: Authenticate doctor access

## Browser Compatibility

- **Voice Input**: Chrome, Edge, Safari (with webkit prefix)
- **Speech Synthesis**: All modern browsers
- **File Upload**: Universal support
- **Responsive**: Mobile-first design

## Security

- Row Level Security on all tables
- Password-protected admin portal
- Public anonymous access for patients
- CORS configured for edge functions
- Service role for admin operations

## Performance Optimizations

- Audio caching to avoid repeated TTS calls
- Lazy loading for images
- Debounced voice recognition
- Optimistic UI updates
- Client-side speech synthesis fallback

## Troubleshooting

### Voice Input Not Working
- Enable microphone permissions
- Use Chrome/Edge for best compatibility
- Check browser console for errors

### OCR Extraction Failed
- Ensure clear, well-lit prescription photos
- Supported formats: PNG, JPG, JPEG
- Maximum file size: 10MB

### Analysis Taking Too Long
- Check internet connection
- Verify OnSpace AI service status
- Review edge function logs

## Future Enhancements

- Doctor notes on patient queries
- Advanced rule editor UI
- Content management interface
- SMS/Email notifications
- Integration with EHR systems
