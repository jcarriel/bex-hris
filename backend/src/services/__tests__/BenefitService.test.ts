import BenefitService from '../BenefitService';

describe('BenefitService', () => {
  describe('createBenefit', () => {
    it('should create a new benefit', async () => {
      const benefitData = {
        name: 'Health Insurance',
        description: 'Comprehensive health coverage',
        type: 'health' as const,
        value: 500,
        frequency: 'monthly' as const,
        applicable: 'all' as const,
      };

      const benefit = await BenefitService.createBenefit(benefitData);

      expect(benefit).toBeDefined();
      expect(benefit.id).toBeDefined();
      expect(benefit.name).toBe('Health Insurance');
      expect(benefit.type).toBe('health');
      expect(benefit.value).toBe(500);
    });

    it('should have createdAt and updatedAt timestamps', async () => {
      const benefitData = {
        name: 'Retirement Plan',
        type: 'retirement' as const,
        value: 1000,
        frequency: 'monthly' as const,
        applicable: 'all' as const,
      };

      const benefit = await BenefitService.createBenefit(benefitData);

      expect(benefit.createdAt).toBeDefined();
      expect(benefit.updatedAt).toBeDefined();
    });
  });

  describe('getAllBenefits', () => {
    it('should return all benefits', async () => {
      const benefits = await BenefitService.getAllBenefits();

      expect(Array.isArray(benefits)).toBe(true);
    });
  });

  describe('getBenefit', () => {
    it('should return null for non-existent benefit', async () => {
      const benefit = await BenefitService.getBenefit('non-existent-id');

      expect(benefit).toBeNull();
    });

    it('should return a benefit by id', async () => {
      const benefitData = {
        name: 'Bonus',
        type: 'bonus' as const,
        value: 2000,
        frequency: 'annual' as const,
        applicable: 'all' as const,
      };

      const created = await BenefitService.createBenefit(benefitData);
      const retrieved = await BenefitService.getBenefit(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Bonus');
    });
  });

  describe('updateBenefit', () => {
    it('should update a benefit', async () => {
      const benefitData = {
        name: 'Original Name',
        type: 'allowance' as const,
        value: 300,
        frequency: 'monthly' as const,
        applicable: 'all' as const,
      };

      const created = await BenefitService.createBenefit(benefitData);
      const updated = await BenefitService.updateBenefit(created.id, {
        name: 'Updated Name',
        value: 400,
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.value).toBe(400);
    });

    it('should throw error for non-existent benefit', async () => {
      await expect(
        BenefitService.updateBenefit('non-existent-id', { name: 'New Name' })
      ).rejects.toThrow('Benefit not found');
    });
  });

  describe('deleteBenefit', () => {
    it('should delete a benefit', async () => {
      const benefitData = {
        name: 'To Delete',
        type: 'other' as const,
        value: 100,
        frequency: 'monthly' as const,
        applicable: 'all' as const,
      };

      const created = await BenefitService.createBenefit(benefitData);
      const deleted = await BenefitService.deleteBenefit(created.id);

      expect(deleted).toBe(true);

      const retrieved = await BenefitService.getBenefit(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent benefit', async () => {
      const deleted = await BenefitService.deleteBenefit('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('getBenefitsByType', () => {
    it('should return benefits by type', async () => {
      const benefitData = {
        name: 'Health Plan',
        type: 'health' as const,
        value: 500,
        frequency: 'monthly' as const,
        applicable: 'all' as const,
      };

      await BenefitService.createBenefit(benefitData);
      const healthBenefits = await BenefitService.getBenefitsByType('health');

      expect(Array.isArray(healthBenefits)).toBe(true);
      expect(healthBenefits.length).toBeGreaterThan(0);
      expect(healthBenefits.every(b => b.type === 'health')).toBe(true);
    });
  });
});
