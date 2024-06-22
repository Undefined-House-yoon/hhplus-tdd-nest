import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class PointHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  type: string;

  @Column()
  amount: number;

  @Column()
  timeMillis: number;
}
