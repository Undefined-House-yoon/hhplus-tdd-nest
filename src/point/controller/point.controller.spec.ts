import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { PointService } from '../service/point.service';
import { PointHistory, TransactionType, UserPoint } from '../model/point.model';
import { PointBody as PointDto } from '../dto/point.dto';

describe('PointController', () => {
  let pointController: PointController;
  let pointService: PointService;

  beforeEach(async () => {
    const mockPointService = {
      getPoint: jest.fn(),
      getPointHistory: jest.fn(),
      chargePoint: jest.fn(),
      usePoint: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [{ provide: PointService, useValue: mockPointService }],
    }).compile();

    pointController = module.get<PointController>(PointController);
    pointService = module.get<PointService>(PointService);
  });

  it('should be defined', () => {
    expect(pointController).toBeDefined();
  });

  describe('getPoint', () => {
    it('should return user point', async () => {
      const result: UserPoint = { id: 1, point: 100, updateMillis: Date.now() };
      jest.spyOn(pointService, 'getPoint').mockResolvedValue(result);

      expect(await pointController.point('1')).toBe(result);
      expect(pointService.getPoint).toHaveBeenCalledWith(1);
    });
  });

  describe('getPointHistory', () => {
    it('should return user point histories', async () => {
      const result: PointHistory[] = [
        {
          id: 1,
          userId: 1,
          amount: 50,
          type: TransactionType.CHARGE,
          timeMillis: Date.now(),
        },
      ];
      jest.spyOn(pointService, 'getPointHistory').mockResolvedValue(result);

      expect(await pointController.history('1')).toBe(result);
      expect(pointService.getPointHistory).toHaveBeenCalledWith(1);
    });
  });

  describe('chargePoint', () => {
    it('should charge user point', async () => {
      const result: UserPoint = { id: 1, point: 150, updateMillis: Date.now() };
      const dto: PointDto = { amount: 50 };
      jest.spyOn(pointService, 'chargePoint').mockResolvedValue(result);

      expect(await pointController.charge('1', dto)).toBe(result);
      expect(pointService.chargePoint).toHaveBeenCalledWith(1, 50);
    });
  });

  describe('usePoint', () => {
    it('should use user point', async () => {
      const result: UserPoint = { id: 1, point: 50, updateMillis: Date.now() };
      const dto: PointDto = { amount: 50 };
      jest.spyOn(pointService, 'usePoint').mockResolvedValue(result);

      expect(await pointController.use('1', dto)).toBe(result);
      expect(pointService.usePoint).toHaveBeenCalledWith(1, 50);
    });
  });
});
