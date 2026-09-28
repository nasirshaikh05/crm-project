import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LeadService } from './src/lead/lead.service';
import { WorkflowStore } from './src/lead/workflow-store.service';
import { StepActionType } from './src/step/entities/step.entity';

async function bootstrap() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const leadService = app.get(LeadService);
  const workflowStore = app.get(WorkflowStore);

  console.log('Ensuring default active Queue, Stage, and Step exist in PostgreSQL...');
  
  // 1. Queue
  let queue = await workflowStore.queueRepo.findOne({ where: { isActive: true } });
  if (!queue) {
    queue = workflowStore.queueRepo.create({
      name: 'Default Pipeline Queue',
      description: 'Main sales pipeline',
      isActive: true,
    });
    queue = await workflowStore.queueRepo.save(queue);
  }

  // 2. Stage
  let stage = await workflowStore.stageRepo.findOne({ where: { queueId: queue.id } });
  if (!stage) {
    stage = workflowStore.stageRepo.create({
      name: 'Initial Stage',
      queueId: queue.id,
      orderIndex: 0,
    });
    stage = await workflowStore.stageRepo.save(stage);
  }

  // 3. Step
  let step = await workflowStore.stepRepo.findOne({ where: { orderIndex: 0 } });
  if (!step) {
    step = workflowStore.stepRepo.create({
      name: 'Welcome Step',
      orderIndex: 0,
      actionType: StepActionType.DO_NOTHING,
    });
    step = await workflowStore.stepRepo.save(step);
  }

  console.log('Testing getDashboardStats...');
  const workspaceRepo = workflowStore.leadRepo.manager.getRepository('Workspace');
  const workspace = await workspaceRepo.findOne({ where: {} });
  const stats = await leadService.getDashboardStats(workspace?.id);
  console.log('Dashboard Stats Result (Completely Dynamic):', JSON.stringify(stats, null, 2));

  await app.close();
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
