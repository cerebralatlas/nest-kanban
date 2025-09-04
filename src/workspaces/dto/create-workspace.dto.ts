import { IsNotEmpty, IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: '工作区名称',
    example: 'My Team Workspace',
    minLength: 2
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    description: '工作区描述',
    example: '团队协作的主要工作区',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: '工作区唯一标识符',
    example: 'my-team-workspace',
    pattern: '^[a-z0-9-]+$',
    minLength: 3
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug 只能包含小写字母、数字和短横线'
  })
  slug: string;
}
