import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserPointTable } from '../../database/userpoint.table';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType } from '../model/point.model';
import { IPointService } from '../interfaces/point.interfaces';

@Injectable()
export class PointService implements IPointService {
  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}

  //동시성 문제 트랜잭션으로 처리
  async chargePoint(id: number, amount: number) {
    const userPoint = await this.userPointTable.selectById(id);
    const originalPoint = userPoint.point;
    const currentUpdateMillis = userPoint.updateMillis;
    userPoint.point += amount;
    const result: boolean = await this.insertOrUpdateIfVersionMatch(
      id,
      userPoint.point,
      currentUpdateMillis,
    );
    try {
      if (result) {
        await this.pointHistoryTable.insert(
          id,
          amount,
          TransactionType.CHARGE,
          Date.now(),
        );
      }
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
    const currentUpdateMillis = userPoint.updateMillis;
    userPoint.point -= usePointAmount;

    const result = await this.insertOrUpdateIfVersionMatch(
      id,
      userPoint.point,
      currentUpdateMillis,
    );

    try {
      if (result) {
        await this.pointHistoryTable.insert(
          id,
          usePointAmount,
          TransactionType.USE,
          Date.now(),
        );
      }
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

  async getPointHistory(id: number) {
    return this.pointHistoryTable.selectAllByUserId(id);
  }

  private async insertOrUpdateIfVersionMatch(
    id: number,
    newPoint: number,
    currentUpdateMillis: number,
  ): Promise<boolean> {
    const user = await this.userPointTable.selectById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.updateMillis !== currentUpdateMillis) {
      return false; // 버전 충돌
    }

    // 업데이트
    await this.userPointTable.insertOrUpdate(id, newPoint);
    return true;
  }
}
