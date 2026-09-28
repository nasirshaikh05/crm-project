import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadCreatedEvent } from '../events/lead-created.event';
import { NotificationService } from '../../notification/notification.service';
import { WorkflowStore } from '../workflow-store.service';

@Injectable()
export class LeadCreatedListener {
  private readonly logger = new Logger(LeadCreatedListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly workflowStore: WorkflowStore,
  ) {}

  @OnEvent('lead.created', { async: true })
  async handleLeadCreatedEvent(event: LeadCreatedEvent) {
    this.logger.log(`Received lead.created event for lead: ${event.lead.id}`);
    try {
      const lead = event.lead;

      // Resolve workspace name
      let workspaceName = 'Airnet Data Pty Ltd';
      let workspaceOwnerId: string | null = null;
      if (lead.workspaceId && this.workflowStore.leadRepo.manager) {
        try {
          const workspace = await this.workflowStore.leadRepo.manager.getRepository('Workspace').findOne({
            where: { id: lead.workspaceId },
          });
          if (workspace) {
            workspaceName = workspace.orgName || workspace.name;
            workspaceOwnerId = (workspace as any).userId || null;
          }
        } catch (err) {
          this.logger.warn(`Failed to resolve workspace for footer: ${err.message}`);
        }
      }

      // Resolve sender info
      const senderUserId = lead.userId || workspaceOwnerId;
      let senderInfo = '';
      if (senderUserId && this.workflowStore.leadRepo.manager) {
        try {
          const sender = await this.workflowStore.leadRepo.manager.getRepository('User').findOne({
            where: { id: senderUserId }
          });
          if (sender) {
            if (sender.firstName && sender.lastName) {
              senderInfo = `${sender.firstName} ${sender.lastName}`;
            } else {
              senderInfo = sender.email;
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to resolve sender user for footer: ${err.message}`);
        }
      }

      if (!senderInfo) {
        senderInfo = 'Workspace Team';
      }

      const footer = `\n\nRegards\n${senderInfo}\n${workspaceName}`;

      await this.notificationService.sendLeadNotifications(lead, event.preferences, footer, workspaceName);
    } catch (error) {
      this.logger.error(
        `Error processing notifications for lead ${event.lead.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
