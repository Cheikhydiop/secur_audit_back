// src/dto/invitation/invitation.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class InvitationDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  status: string;

  @Expose()
  organization: {
    id: number;
    name: string;
    type: string;
  };

  @Expose()
  invitedBy: {
    name: string;
    email: string;
  };

  @Expose()
  expiresAt: Date;
}
