import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListDto {
  @ApiProperty({
    description: '列表名称',
    example: 'To Do',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;
}
