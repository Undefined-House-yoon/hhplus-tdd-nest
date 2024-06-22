import { PointHistory, UserPoint } from '../model/point.model';

export interface IPointService {
  getPoint(userId: number): Promise<UserPoint>;

  getPointHistory(userId: number): Promise<PointHistory[]>;

  chargePoint(userId: number, amount: number): Promise<UserPoint>;

  usePoint(userId: number, amount: number): Promise<UserPoint>;
}
