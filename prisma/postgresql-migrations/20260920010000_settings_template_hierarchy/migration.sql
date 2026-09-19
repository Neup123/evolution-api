CREATE TABLE "SettingsTemplate" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "settings" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "SettingsTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SettingsTemplate_name_key" ON "SettingsTemplate"("name");
CREATE TABLE "SettingsTemplateBinding" (
  "id" TEXT NOT NULL,
  "instanceId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "scope" VARCHAR(20) NOT NULL,
  "target" VARCHAR(255) NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "SettingsTemplateBinding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SettingsTemplateBinding_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SettingsTemplateBinding_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SettingsTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SettingsTemplateBinding_instanceId_scope_target_key" ON "SettingsTemplateBinding"("instanceId", "scope", "target");
CREATE INDEX "SettingsTemplateBinding_templateId_idx" ON "SettingsTemplateBinding"("templateId");
