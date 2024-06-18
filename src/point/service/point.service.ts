import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserPointTable } from '../../database/userpoint.table';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType } from '../model/point.model';

@Injectable()
export class PointService {
  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}
  //동시성 문제 트랜잭션으로 처리
  async chargePoint(id: number, amount: number) {
    const userPoint = await this.userPointTable.selectById(id);
    const originalPoint = userPoint.point;
    userPoint.point += amount;
    try {
      await this.userPointTable.insertOrUpdate(id, userPoint.point);
      await this.pointHistoryTable.insert(
        id,
        amount,
        TransactionType.CHARGE,
        Date.now(),
      );
    } catch (error) {
      await this.userPointTable.insertOrUpdate(id, originalPoint);
      throw new InternalServerErrorException(
        'Transaction failed. Rolled back.',
      );
    }
    return userPoint;
  }
  //동시성 문제 트랜잭션으로 처리
  async usePoint(id: number, usePointAmount: number) {
    const userPoint = await this.userPointTable.selectById(id);
    const originalPoint = userPoint.point;
    if (userPoint.point < usePointAmount) {
      throw new BadRequestException('Insufficient balance');
    }
    userPoint.point -= usePointAmount;
    try {
      await this.userPointTable.insertOrUpdate(id, userPoint.point);
      await this.pointHistoryTable.insert(
        id,
        usePointAmount,
        TransactionType.USE,
        Date.now(),
      );
    } catch (error) {
      // 트랜잭션 롤백
      await this.userPointTable.insertOrUpdate(id, originalPoint);
      throw new InternalServerErrorException(
        'Transaction failed. Rolled back.',
      );
    }
    return userPoint;
  }

  async getPoint(id: number) {
    return this.userPointTable.selectById(id);
  }

  async getPointHistories(id: number) {
    return this.pointHistoryTable.selectAllByUserId(id);
  }
}
