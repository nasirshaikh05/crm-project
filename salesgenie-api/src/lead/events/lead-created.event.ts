import { Lead } from '../entities/lead.entity';

export class LeadCreatedEvent {
  constructor(
    public readonly lead: Lead,
    public readonly preferences: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
    },
  ) {}
}
