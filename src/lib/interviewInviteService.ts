/**
 * Interview Invitation Service
 * 
 * Utility module for sending interview invitations and generating secure links
 * to candidates using the Brevo email API integration.
 * 
 * Features:
 * - Send interview invitations with secure tokens
 * - Generate expiring interview links
 * - Track invitation status
 * - Support for candidate and recruiter notifications
 */

export interface SendInviteRequest {
  email: string;
  candidateName?: string;
  role?: string;
  inviteLink?: string;
  preferredVoice?: 'male' | 'female' | 'neutral';
  clientEmail?: string;
  smtpConfig?: SmtpConfig;
}

export interface SendInviteResponse {
  success: boolean;
  deliveredTo: string;
  token: string;
  expiresAt: string;
  secureLink: string;
  clientNotified: string | null;
  timestamp: string;
  isSandbox?: boolean;
  sandboxUrl?: string | null;
  error?: string;
}

export interface SmtpConfig {
  host: string;
  port: string | number;
  user: string;
  pass: string;
  from?: string;
}

export interface VerifyInviteResponse {
  valid: boolean;
  token?: string;
  candidateEmail?: string;
  role?: string;
  candidateName?: string;
  preferredVoice?: string;
  expiresAt?: string;
  status?: 'pending' | 'used';
  error?: string;
}

/**
 * Send an interview invitation email to a candidate
 * 
 * @param request - SendInviteRequest object
 * @returns Promise<SendInviteResponse>
 * 
 * @example
 * ```typescript
 * const result = await sendInterviewInvite({
 *   email: 'candidate@example.com',
 *   candidateName: 'John Doe',
 *   role: 'Senior Software Engineer',
 *   preferredVoice: 'female',
 *   clientEmail: 'recruiter@company.com'
 * });
 * 
 * if (result.success) {
 *   console.log('Invitation sent:', result.secureLink);
 * }
 * ```
 */
export async function sendInterviewInvite(
  request: SendInviteRequest
): Promise<SendInviteResponse> {
  try {
    const response = await fetch('/api/send-invite-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        deliveredTo: request.email,
        token: '',
        expiresAt: '',
        secureLink: '',
        clientNotified: null,
        timestamp: new Date().toISOString(),
        error: error.error || 'Failed to send invitation',
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending interview invite:', error);
    return {
      success: false,
      deliveredTo: request.email,
      token: '',
      expiresAt: '',
      secureLink: '',
      clientNotified: null,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Verify if an interview invitation token is valid
 * 
 * @param token - The invitation token to verify
 * @returns Promise<VerifyInviteResponse>
 * 
 * @example
 * ```typescript
 * const result = await verifyInviteToken('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
 * 
 * if (result.valid) {
 *   console.log('Candidate:', result.candidateName);
 *   console.log('Role:', result.role);
 * } else {
 *   console.log('Invalid or expired token');
 * }
 * ```
 */
export async function verifyInviteToken(token: string): Promise<VerifyInviteResponse> {
  try {
    const response = await fetch(`/api/verify-invite/${token}`);

    if (!response.ok) {
      return {
        valid: false,
        error: 'Token verification failed',
      };
    }

    const data = await response.json();
    return {
      valid: data.valid !== false,
      token: data.token,
      candidateEmail: data.candidateEmail,
      role: data.role,
      candidateName: data.candidateName,
      preferredVoice: data.preferredVoice,
      expiresAt: data.expiresAt,
      status: data.status,
    };
  } catch (error) {
    console.error('Error verifying invite token:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update the status of an interview invitation
 * 
 * @param token - The invitation token
 * @param status - New status ('pending' or 'used')
 * @returns Promise<{ success: boolean; error?: string }>
 * 
 * @example
 * ```typescript
 * const result = await updateInviteStatus('a1b2c3d4e5f6...', 'used');
 * 
 * if (result.success) {
 *   console.log('Invitation status updated');
 * }
 * ```
 */
export async function updateInviteStatus(
  token: string,
  status: 'pending' | 'used'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/update-invite-status/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || 'Failed to update status',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating invite status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Generate a comprehensive invite request with defaults
 * 
 * @param baseRequest - Partial request object
 * @returns SendInviteRequest with defaults applied
 * 
 * @example
 * ```typescript
 * const request = buildInviteRequest({
 *   email: 'candidate@example.com',
 *   candidateName: 'Jane Doe'
 * });
 * 
 * const result = await sendInterviewInvite(request);
 * ```
 */
export function buildInviteRequest(
  baseRequest: Partial<SendInviteRequest>
): SendInviteRequest {
  return {
    email: baseRequest.email || '',
    candidateName: baseRequest.candidateName || 'Candidate',
    role: baseRequest.role || 'Software Engineer',
    inviteLink: baseRequest.inviteLink || window.location.origin,
    preferredVoice: baseRequest.preferredVoice || 'female',
    clientEmail: baseRequest.clientEmail,
    smtpConfig: baseRequest.smtpConfig,
  };
}

/**
 * Format invitation data for display purposes
 * 
 * @param response - SendInviteResponse from the server
 * @returns Formatted string for user display
 */
export function formatInviteResponse(response: SendInviteResponse): string {
  if (!response.success) {
    return `Failed to send invitation: ${response.error || 'Unknown error'}`;
  }

  const expiresDate = new Date(response.expiresAt);
  const formattedDate = expiresDate.toLocaleString();

  return `Invitation sent successfully to ${response.deliveredTo}\n` +
         `Secure Link: ${response.secureLink}\n` +
         `Expires: ${formattedDate}\n` +
         `Token: ${response.token}`;
}

/**
 * Check if an invitation is still valid (not expired)
 * 
 * @param expiresAt - ISO datetime string
 * @returns boolean indicating if invitation is still valid
 */
export function isInvitationValid(expiresAt: string): boolean {
  try {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    return currentTime < expirationTime;
  } catch {
    return false;
  }
}

/**
 * Get remaining time for an invitation in human-readable format
 * 
 * @param expiresAt - ISO datetime string
 * @returns Time remaining string (e.g., "2 hours 30 minutes")
 */
export function getInvitationTimeRemaining(expiresAt: string): string {
  try {
    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const diffMs = expirationTime - currentTime;

    if (diffMs <= 0) {
      return 'Expired';
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } catch {
    return 'Unknown';
  }
}
