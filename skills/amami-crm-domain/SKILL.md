# Amami CRM Domain Skill

## Purpose

Use this skill when making domain, docs, or review decisions for the Amami Home LINE CRM.

## Domain Notes

- The first customer is Amami Home, one construction company.
- The system must still be designed for future multi-tenant resale.
- Core concepts are tenants, customers, messages, alerts, staff, auth, FAQ/RAG, LINE webhook, AI summary, AI reply draft, and staff reply.
- Current state is an internal review / local demo MVP.
- Real LINE, OpenAI, and Supabase production connections are not connected.
- Obsidian is not a product feature.
- Obsidian is used only by opening docs Markdown, especially dev logs and design notes.

## Guardrails

- Keep `tenant_id` separation explicit.
- Do not let AI choose or infer a tenant.
- Keep internal review edition and production operation clearly separated.
- Do not add real external service calls unless the Loop explicitly requests them.
