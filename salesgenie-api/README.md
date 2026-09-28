# CRM Workflow Automation Backend

This is a robust lead management and workflow state-machine engine built on **NestJS**, **TypeORM**, and **PostgreSQL**. It allows sales operators to define custom lead pipelines consisting of Queues, Stages, and Steps, and automate communications (Email, SMS, WhatsApp) as leads move through the system.

---

## 🚀 Features

- **Hierarchical Pipeline Design**: Structure your sales pipelines dynamically with `Queues` -> `Stages` -> `Steps`.
- **Automated Step Actions**: Configure actions (e.g. sending emails with buttons, form links, calendar invites, or agreements) triggered automatically for leads at a given step.
- **Button-Click State Machine**: Simulate customer feedback by tracking button-clicks that trigger pre-configured target transitions (e.g., automatically routing a lead to a new queue or converting them to a customer).
- **Manual Repositioning**: Allow sales representatives to manually advance or move leads between stages or steps.
- **Full History Logging**: Track a comprehensive audit trail of lead state transitions and automated execution logs.

---

## 🛠️ Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (TypeScript)
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Validation**: `class-validator` & `class-transformer`

---

## ⚙️ Getting Started & Setup

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** database instance running locally or remotely

### 1. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory and configure your PostgreSQL database credentials:

```env
# Server Port
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_NAME=crm_workflow_db
```

### 3. Database Reset & Startup

1. Make sure your database is running and the database name specified in `.env` exists.
2. Start the NestJS application in watch mode:

```bash
# Development mode
npm run start:dev
```

3. **Reset Database**: Hit the utility endpoint to wipe any previous mock configurations:

```bash
curl -X POST http://localhost:3000/leads/workflow/seed
```
> [!NOTE]
> This endpoint simply clears all tables (queues, stages, steps, leads, and customer logs) so you can build your custom workspace from a clean slate.

---

## 📖 API Documentation & Integration Guide

* **Interactive Swagger UI Playground**: Once the application is running, navigate to `http://localhost:3000/api` to view, test, and execute endpoints live from your browser.
* **Detailed Static Guide**: For a step-by-step developer integration workflow, database schemas, enums, and comprehensive integration logic, see the local [API Documentation](file:///c:/Desktop%20Files/Codehaste/CRM/API_DOCUMENTATION.md).

### Quick Flow for Newbies

1. **Reset**: Run `POST /leads/workflow/seed` to clear database logs.
2. **Configure Pipeline**:
   - Run `POST /queues` to create your custom pipeline funnel.
   - Run `POST /stages` using the created `queueId` to configure stages.
   - Run `POST /steps` using the created `stageId` to add automated actions (e.g. `send_sms`).
3. **Leads**: Run `POST /leads` to create a new contact and place them in the created stages.
4. **Interact**: Run `POST /leads/:id/execute-action` to fire step actions, and `POST /leads/:id/click-button` to simulate button clicks.
