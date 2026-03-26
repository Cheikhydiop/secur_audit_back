import { IsNotEmpty, IsString, IsEmail, MaxLength, MinLength, IsOptional } from 'class-validator';

export class ContactEmailDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Subject is required' })
  @IsString({ message: 'Subject must be a string' })
  @MaxLength(200, { message: 'Subject cannot exceed 200 characters' })
  subject: string;

  @IsNotEmpty({ message: 'Message is required' })
  @IsString({ message: 'Message must be a string' })
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters' })
  message: string;

  @IsOptional()
  @IsString({ message: 'Company must be a string' })
  @MaxLength(100, { message: 'Company name cannot exceed 100 characters' })
  company?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone number cannot exceed 20 characters' })
  phone?: string;
}