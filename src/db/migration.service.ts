import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * MigrationService handles automatic database migrations on application startup.
 *
 * Migration files should be placed in the /migrations folder at the project root.
 * Files are executed in alphabetical order (use numeric prefixes like 001_, 002_).
 *
 * Features:
 * - Tracks applied migrations in a `Migrations` table
 * - Skips already-applied migrations
 * - Supports .sql files only
 * - Runs migrations within transactions where possible
 * - Logs all migration activity
 *
 * Migration file naming convention:
 * - 001_description.sql
 * - 002_another_migration.sql
 */
@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly migrationsPath: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
  ) {
    // Migrations folder at project root
    this.migrationsPath = path.join(process.cwd(), 'migrations');
  }

  async onModuleInit(): Promise<void> {
    // Skip migrations if DB_SYNC is enabled (TypeORM handles schema automatically)
    const dbSync = process.env.DB_SYNC === 'true';
    if (dbSync) {
      this.logger.info(
        'MigrationService: Skipping migrations (DB_SYNC=true, TypeORM synchronize enabled)',
      );
      return;
    }

    // Run migrations on startup
    await this.runMigrations();
  }

  /**
   * Ensures the Migrations tracking table exists.
   */
  private async ensureMigrationsTable(): Promise<void> {
    await this.entityManager.query(`
      CREATE TABLE IF NOT EXISTS "Migrations" (
        "MigrationID" SERIAL PRIMARY KEY,
        "Name" VARCHAR(255) NOT NULL UNIQUE,
        "Checksum" TEXT,
        "AppliedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_MIGRATION_NAME" ON "Migrations" ("Name");
    `);
  }

  /**
   * Gets list of already applied migration names.
   */
  private async getAppliedMigrations(): Promise<Set<string>> {
    const result = await this.entityManager.query(
      `SELECT "Name" FROM "Migrations" ORDER BY "Name"`,
    );
    return new Set(result.map((row: { Name: string }) => row.Name));
  }

  /**
   * Records a migration as applied.
   */
  private async recordMigration(name: string, checksum: string): Promise<void> {
    await this.entityManager.query(
      `INSERT INTO "Migrations" ("Name", "Checksum") VALUES ($1, $2)`,
      [name, checksum],
    );
  }

  /**
   * Computes SHA256 checksum of migration content.
   */
  private computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Gets all migration files from the migrations directory.
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsPath)) {
      this.logger.warn(
        `MigrationService: Migrations directory not found at ${this.migrationsPath}`,
      );
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath);
    return files.filter((file) => file.endsWith('.sql')).sort(); // Alphabetical order ensures 001_ runs before 002_
  }

  /**
   * Runs all pending migrations.
   */
  async runMigrations(): Promise<void> {
    this.logger.info(`MigrationService: Starting migration check...`);

    try {
      // Ensure tracking table exists
      await this.ensureMigrationsTable();

      // Get already applied migrations
      const appliedMigrations = await this.getAppliedMigrations();
      this.logger.info(
        `MigrationService: Found ${appliedMigrations.size} already applied migrations`,
      );

      // Get migration files
      const migrationFiles = this.getMigrationFiles();
      this.logger.info(
        `MigrationService: Found ${migrationFiles.length} migration files in ${this.migrationsPath}`,
      );

      // Filter to pending migrations
      const pendingMigrations = migrationFiles.filter(
        (file) => !appliedMigrations.has(file),
      );

      if (pendingMigrations.length === 0) {
        this.logger.info(`MigrationService: No pending migrations to run`);
        return;
      }

      this.logger.info(
        `MigrationService: Running ${pendingMigrations.length} pending migrations`,
      );

      // Run each pending migration
      for (const migrationFile of pendingMigrations) {
        await this.runMigration(migrationFile);
      }

      this.logger.info(
        `MigrationService: All migrations completed successfully`,
      );
    } catch (error) {
      this.logger.error(
        `MigrationService: Migration failed [error=${error.message}, stack=${error.stack}]`,
      );
      throw error; // Re-throw to prevent app from starting with incomplete migrations
    }
  }

  /**
   * Runs a single migration file.
   */
  private async runMigration(fileName: string): Promise<void> {
    const filePath = path.join(this.migrationsPath, fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = this.computeChecksum(content);

    this.logger.info(`MigrationService: Running migration [name=${fileName}]`);

    try {
      // Execute the migration SQL
      // Note: Some migrations may have their own BEGIN/COMMIT, so we don't wrap everything
      await this.entityManager.query(content);

      // Record successful migration
      await this.recordMigration(fileName, checksum);

      this.logger.info(
        `MigrationService: Migration completed [name=${fileName}]`,
      );
    } catch (error) {
      this.logger.error(
        `MigrationService: Migration failed [name=${fileName}, error=${error.message}]`,
      );
      throw new Error(`Migration ${fileName} failed: ${error.message}`);
    }
  }

  /**
   * Gets the status of all migrations (for admin/debugging).
   */
  async getMigrationStatus(): Promise<{
    applied: string[];
    pending: string[];
    total: number;
  }> {
    await this.ensureMigrationsTable();
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = this.getMigrationFiles();
    const pendingMigrations = migrationFiles.filter(
      (file) => !appliedMigrations.has(file),
    );

    return {
      applied: Array.from(appliedMigrations),
      pending: pendingMigrations,
      total: migrationFiles.length,
    };
  }
}
