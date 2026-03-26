// src/dto/invitation/invitation-response.dto.ts
export interface AcceptInvitationResponse {
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    roles: string[];
  };
  organization: {
    id: number;
    name: string;
    type: string;
  };
  access_token: string;
  refresh_token: string;
}

export class InvitationResponseDto {
  id: number;
  email: string;
  role: string;
  status: string;
  organization: {
    id: number;
    name: string;
    type: string;
  };
  invitedBy: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  expiresAt: Date;
}
