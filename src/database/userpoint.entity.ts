import { Entity, PrimaryGeneratedColumn, Column, VersionColumn } from 'typeorm';

@Entity()
export class UserPoint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  point: number;

  @VersionColumn()
  version: number;

  @Column()
  updateMillis: number;
}
