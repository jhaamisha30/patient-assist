# Patient Assist

A medical records management web application built with Next.js, MongoDB Atlas, and Cloudinary.

## Features

- **Authentication System**
  - Doctor registration and login
  - Patient login (credentials provided by doctors)
  - Admin account (pre-configured)

- **Doctor Dashboard**
  - View doctor profile (name, email, profile picture)
  - View list of all patients
  - Add new patients with detailed information
  - Add diagnostic records for patients
  - Export patient records to PDF and Excel formats

- **Patient Dashboard**
  - View personal information
  - View diagnostic records
  - Export own records to PDF and Excel formats

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Authentication**: JWT with HTTP-only cookies
- **File Storage**: Cloudinary
- **Export**: jsPDF (PDF), xlsx (Excel)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Atlas Connection
MONGODB_URI=your_mongodb_atlas_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Admin Credentials (change these)
ADMIN_EMAIL=admin@patientassist.com
ADMIN_PASSWORD=admin123
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Admin Account

Run the admin creation script:

```bash
node scripts/create-admin.js
```

Note: You may need to modify the script to work with your setup. The admin account will be created with the credentials specified in `.env.local`.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### For Doctors

1. Register a new account or login with existing credentials
2. View your profile and patient list
3. Add new patients by clicking "Add New Patient"
4. Add diagnostic records by clicking "Add Diagnostic" next to a patient
5. Export patient records using "Export PDF" or "Export Excel" buttons

### For Patients

1. Login with credentials provided by your doctor (email and password)
2. View your personal information and diagnostic records
3. Export your records using "Export to PDF" or "Export to Excel" buttons

**Note:** Patients cannot register themselves. Doctors create patient accounts and provide login credentials.

## Project Structure

```
patient-assist/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   ├── login/           # Login page
│   ├── register/        # Registration page
│   └── page.js          # Home page
├── lib/
│   ├── api.js           # API client functions
│   ├── auth.js          # Authentication utilities
│   ├── db.js            # Database utilities
│   └── mongodb.js       # MongoDB connection
├── scripts/
│   └── create-admin.js  # Admin account creation script
└── .env.local           # Environment variables (create this)
```

## Color Scheme

The application uses a medical-themed color palette:
- **Primary Green**: #22c55e
- **Dark Green**: #16a34a
- **Light Green**: #86efac
- **Background**: White and gray shades

## Security Notes

- Passwords are hashed using bcrypt
- JWT tokens are stored in HTTP-only cookies
- API routes are protected with authentication checks
- Patient data is isolated by doctor/patient relationships

## License

This project is private and proprietary.
