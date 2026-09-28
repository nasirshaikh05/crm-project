import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'super_secret_crm_jwt_passkey_change_me_in_production';

  // Database
  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USERNAME?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  // SendGrid
  @IsString()
  @IsOptional()
  SENDGRID_API_KEY?: string;

  @IsString()
  @IsOptional()
  SENDGRID_FROM_EMAIL?: string;

  // Twilio
  @IsString()
  @IsOptional()
  TWILIO_ACCOUNT_SID?: string;

  @IsString()
  @IsOptional()
  TWILIO_AUTH_TOKEN?: string;

  @IsString()
  @IsOptional()
  TWILIO_FROM_NUMBER?: string;

  @IsString()
  @IsOptional()
  TWILIO_WHATSAPP_FROM_NUMBER?: string;

  // DigitalOcean Spaces / S3 Storage
  @IsString()
  @IsOptional()
  DO_SPACES_ENDPOINT: string = 'https://syd1.digitaloceanspaces.com';

  @IsString()
  @IsOptional()
  DO_SPACES_REGION: string = 'syd1';

  @IsString()
  @IsOptional()
  DO_SPACES_KEY: string = 'DO801ZPXPRK69CEFGALD';

  @IsString()
  @IsOptional()
  DO_SPACES_SECRET?: string;

  @IsString()
  @IsOptional()
  DO_SPACES_BUCKET: string = 'sales-genie';
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
