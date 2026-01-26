import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DBConfig } from './db.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MigrationService } from './migration.service';

@Module({})
export class DBModule {
  public static getConnectionOptions(
    dbConfig: DBConfig,
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    let connectionOptions: TypeOrmModuleOptions =
      DBModule.getConnectionOptionsPostgres(configService);

    // Determine synchronize behavior based on environment
    // - 'development' with DB_SYNC=true: synchronize enabled (dangerous, use for quick prototyping only)
    // - 'production': synchronize ALWAYS disabled, use migrations
    // - 'test': synchronize enabled, dropSchema enabled
    const nodeEnv = configService.get('NODE_ENV');
    const dbSync = configService.get('DB_SYNC') === 'true';
    const shouldSync =
      nodeEnv === 'test' || (nodeEnv === 'development' && dbSync);

    connectionOptions = {
      ...connectionOptions,
      synchronize: shouldSync,
      entities: dbConfig.entities,
      dropSchema: nodeEnv === 'test', // WARNING : DO NOT RUN IN PRODUCTION WITH ENV SET TO 'test'. IT WILL DELETE THE ENTIRE DB !!!!!
    };
    return connectionOptions;
  }

  private static getConnectionOptionsPostgres(
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: configService.get('POSTGRES_HOST'),
      port: configService.get('POSTGRES_PORT'),
      username: configService.get('POSTGRES_USER'),
      password: configService.get('POSTGRES_PASSWORD'),
      database: configService.get('POSTGRES_DB'),
      ssl: {
        rejectUnauthorized: false,
      },
    };
  }

  public static forRoot(dbConfig: DBConfig): DynamicModule {
    return {
      module: DBModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (ConfigService) =>
            DBModule.getConnectionOptions(dbConfig, ConfigService),
        }),
      ],
      controllers: [],
      providers: [MigrationService],
      exports: [MigrationService],
    };
  }
}
