# DocuSign Clone / SecureSign SaaS

A production-ready Document Signature Web Application built with the MERN stack (MongoDB, Express, React, Node.js). This platform provides a seamless experience for managing, signing, and tracking PDF documents. Users can upload documents, invite guests to sign via secure links, and generate finalized PDFs with embedded digital signatures.

## Key Features
- **Digital Signature Engine**: Interactive drag-and-drop interface for placing signatures on PDFs via `dnd-kit` and `react-signature-canvas`.
- **Server-Side PDF Processing**: High-fidelity signature embedding using `pdf-lib`.
- **Guest Workflow**: Secure guest signing links with session persistence.
- **Comprehensive Audit Log**: Full transparency with tracked actions (Upload, View, Sign, Finalize).
- **Modern Tech Stack**: React 19 (Vite), Tailwind CSS 4, Node.js, and MongoDB.
- **Mobile Optimized**: Fully responsive UI designed for signing on any device.
- **Authentication**: Secure JWT-based login, registration, and refresh tokens.

## Prerequisites
-   Node.js (v14+)
-   MongoDB Atlas (or local MongoDB)

## Setup

### 1. Clone & Install Dependencies

**Client:**
```bash
cd client
npm install
```

**Server:**
```bash
cd server
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Used to generate public invitation/reset links
FRONTEND_URL=http://localhost:5173

# Email (SendGrid API) - Unified system for Invitations and Passwords
# This uses HTTP (Port 443) which works on restrictive platforms like Render.
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

### 3. Run the Application

**Start Backend:**
```bash
cd server
npm run dev
```

**Start Frontend:**
```bash
cd client
npm run dev
```

Open your browser at `http://localhost:5173`.

## Architecture
-   `client/` - React frontend application.
-   `server/` - Express backend API.
-   `server/models` - Mongoose schemas (User, Document, Signature, AuditLog).
-   `server/controllers` - Business logic.
-   `server/uploads` - Local storage for uploaded documents.

## Usage Flow
1.  Register a new account.
2.  Login to the dashboard.
3.  Click "New Document" to upload a PDF.
4.  Click on a document to view it.
5.  Drag the signature placeholder (or click "Drag Me to Sign") to place a signature.
6.  Click "Finalize" to embed signatures and lock the document.
7.  View the immutable Audit Trail at the bottom of the document page.
