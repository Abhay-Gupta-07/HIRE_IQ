/**
 * Interview Invite Service - Usage Examples
 * 
 * This file demonstrates how to use the interview invitation service
 * in your React components.
 */

// ============================================
// Example 1: Simple Invite Button Component
// ============================================

import React, { useState } from 'react';
import { sendInterviewInvite, SendInviteResponse } from '../lib/interviewInviteService';

export function SendInviteButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SendInviteResponse | null>(null);

  const handleSendInvite = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await sendInterviewInvite({
        email: 'candidate@example.com',
        candidateName: 'John Doe',
        role: 'Senior Engineer',
        preferredVoice: 'female',
        clientEmail: 'recruiter@company.com',
      });

      if (response.success) {
        setSuccess(response);
      } else {
        setError(response.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSendInvite} disabled={loading}>
        {loading ? 'Sending...' : 'Send Interview Invite'}
      </button>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      {success && (
        <div style={{ color: 'green' }}>
          <p>Invitation sent successfully!</p>
          <p>Secure Link: {success.secureLink}</p>
          <p>Expires: {new Date(success.expiresAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Example 2: Complete Interview Invite Form
// ============================================

import React, { useState, FormEvent } from 'react';
import {
  sendInterviewInvite,
  buildInviteRequest,
  formatInviteResponse,
  SendInviteRequest,
} from '../lib/interviewInviteService';

interface FormData {
  candidateEmail: string;
  candidateName: string;
  role: string;
  preferredVoice: 'male' | 'female' | 'neutral';
  recruiterEmail: string;
}

export function InterviewInviteForm() {
  const [formData, setFormData] = useState<FormData>({
    candidateEmail: '',
    candidateName: '',
    role: 'Software Engineer',
    preferredVoice: 'female',
    recruiterEmail: '',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const inviteRequest: SendInviteRequest = buildInviteRequest({
        email: formData.candidateEmail,
        candidateName: formData.candidateName,
        role: formData.role,
        preferredVoice: formData.preferredVoice,
        clientEmail: formData.recruiterEmail || undefined,
      });

      const response = await sendInterviewInvite(inviteRequest);
      setResult(formatInviteResponse(response));
    } catch (error) {
      setResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Candidate Email: </label>
        <input
          type="email"
          name="candidateEmail"
          value={formData.candidateEmail}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label>Candidate Name: </label>
        <input
          type="text"
          name="candidateName"
          value={formData.candidateName}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label>Role: </label>
        <input
          type="text"
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        />
      </div>

      <div>
        <label>Preferred Voice: </label>
        <select
          name="preferredVoice"
          value={formData.preferredVoice}
          onChange={handleChange}
        >
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="neutral">Neutral</option>
        </select>
      </div>

      <div>
        <label>Recruiter Email (Optional): </label>
        <input
          type="email"
          name="recruiterEmail"
          value={formData.recruiterEmail}
          onChange={handleChange}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>

      {result && (
        <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>
          {result}
        </pre>
      )}
    </form>
  );
}

// ============================================
// Example 3: Invite Token Verification
// ============================================

import React, { useEffect, useState } from 'react';
import {
  verifyInviteToken,
  isInvitationValid,
  getInvitationTimeRemaining,
} from '../lib/interviewInviteService';

interface InviteVerificationProps {
  token: string;
}

export function InviteVerification({ token }: InviteVerificationProps) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await verifyInviteToken(token);

        if (result.valid) {
          setValid(true);
          setCandidateInfo(result);
          setTimeRemaining(
            getInvitationTimeRemaining(result.expiresAt || '')
          );
        }
      } finally {
        setLoading(false);
      }
    };

    verifyToken();

    // Update time remaining every minute
    const interval = setInterval(() => {
      if (candidateInfo?.expiresAt) {
        setTimeRemaining(
          getInvitationTimeRemaining(candidateInfo.expiresAt)
        );
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [token]);

  if (loading) {
    return <div>Verifying your invitation...</div>;
  }

  if (!valid) {
    return (
      <div>
        <h2>Invalid or Expired Invitation</h2>
        <p>This invitation link is no longer valid. Please contact your recruiter.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome, {candidateInfo?.candidateName}!</h2>
      <p>Role: {candidateInfo?.role}</p>
      <p>Status: {candidateInfo?.status}</p>
      <p style={{ color: 'orange' }}>
        This invitation expires in: {timeRemaining}
      </p>
      <button onClick={() => {
        /* Start interview */
      }}>
        Start Interview
      </button>
    </div>
  );
}

// ============================================
// Example 4: Bulk Invite Management
// ============================================

import React, { useState } from 'react';
import { sendInterviewInvite } from '../lib/interviewInviteService';

interface CandidateData {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function BulkInviteManager() {
  const [candidates, setCandidates] = useState<CandidateData[]>([
    { id: '1', email: 'candidate1@example.com', name: 'John Doe', role: 'Frontend' },
    { id: '2', email: 'candidate2@example.com', name: 'Jane Smith', role: 'Backend' },
  ]);

  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Map<string, string>>(new Map());

  const handleSendAllInvites = async () => {
    setSending(true);
    const newResults = new Map(results);

    for (const candidate of candidates) {
      try {
        const response = await sendInterviewInvite({
          email: candidate.email,
          candidateName: candidate.name,
          role: candidate.role,
        });

        newResults.set(
          candidate.id,
          response.success ? `Sent: ${response.secureLink}` : `Failed: ${response.error}`
        );
      } catch (error) {
        newResults.set(
          candidate.id,
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    setResults(newResults);
    setSending(false);
  };

  return (
    <div>
      <h3>Bulk Interview Invitations</h3>
      <button onClick={handleSendAllInvites} disabled={sending}>
        {sending ? 'Sending...' : `Send Invites to ${candidates.length} Candidates`}
      </button>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map(candidate => (
            <tr key={candidate.id}>
              <td>{candidate.name}</td>
              <td>{candidate.email}</td>
              <td>{candidate.role}</td>
              <td>{results.get(candidate.id) || 'Pending'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Example 5: Using with React Context
// ============================================

import React, { createContext, useContext, ReactNode } from 'react';

interface InviteContextType {
  sendInvite: (data: any) => Promise<any>;
  verifyToken: (token: string) => Promise<any>;
}

const InviteContext = createContext<InviteContextType | undefined>(undefined);

export function InviteProvider({ children }: { children: ReactNode }) {
  const value: InviteContextType = {
    sendInvite: sendInterviewInvite,
    verifyToken: async (token: string) => {
      // Implementation
      return null;
    },
  };

  return (
    <InviteContext.Provider value={value}>
      {children}
    </InviteContext.Provider>
  );
}

export function useInviteService() {
  const context = useContext(InviteContext);
  if (!context) {
    throw new Error('useInviteService must be used within InviteProvider');
  }
  return context;
}

// Usage in component:
function MyComponent() {
  const { sendInvite } = useInviteService();
  // Use sendInvite function
  return <div>Component using invite service</div>;
}

// ============================================
// Export all examples
// ============================================

export {
  SendInviteButton,
  InterviewInviteForm,
  InviteVerification,
  BulkInviteManager,
};
