import { IsArray, IsString, IsInt, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ListOrderItem {
  @ApiProperty({
    description: '列表ID',
    example: 'clx1234567890'
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: '新的排序位置',
    example: 1,
    minimum: 1
  })
  @IsInt()
  @Min(1)
  order: number;
}

export class ReorderListsDto {
  @ApiProperty({
    description: '列表重排序数据',
    type: [ListOrderItem],
    example: [
      { id: 'clx1234567890', order: 1 },
      { id: 'clx1234567891', order: 2 },
      { id: 'clx1234567892', order: 3 }
    ]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListOrderItem)
  lists: ListOrderItem[];
}
