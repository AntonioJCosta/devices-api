import { describe, it, expect } from 'vitest'
import { createDeviceSchema, updateDeviceSchema } from '../src/validations/deviceValidation'

describe('Device Validation Schemas', () => {

    describe('createDeviceSchema', () => {
        it('should validate a correct device object', () => {
            const validDevice = { name: 'Test Device', brand: 'Test Brand', state: 'available' as const };
            const result = createDeviceSchema.safeParse(validDevice);
            expect(result.success).toBe(true);
        });

        it('should fail validation if name is missing', () => {
            const invalidDevice = { brand: 'Test Brand', state: 'available' as const };
            const result = createDeviceSchema.safeParse(invalidDevice);
            expect(result.success).toBe(false);
        });

        it('should fail validation if brand is missing', () => {
            const invalidDevice = { name: 'Test Device', state: 'available' as const };
            const result = createDeviceSchema.safeParse(invalidDevice);
            expect(result.success).toBe(false);
        });

        it('should fail validation if state is missing', () => {
            const invalidDevice = { name: 'Test Device', brand: 'Test Brand' };
            const result = createDeviceSchema.safeParse(invalidDevice);
            expect(result.success).toBe(false);
        });

        it('should fail validation if state is not one of the allowed enums', () => {
            const invalidDevice = { name: 'Test Device', brand: 'Test Brand', state: 'broken' };
            const result = createDeviceSchema.safeParse(invalidDevice);
            expect(result.success).toBe(false);
        });

         it('should fail validation if name is empty string', () => {
            const invalidDevice = { name: '', brand: 'Test Brand', state: 'available' as const };
            const result = createDeviceSchema.safeParse(invalidDevice);
            expect(result.success).toBe(false);
        });
    });

    describe('updateDeviceSchema', () => {
        it('should validate a partial update with only name', () => {
            const partialUpdate = { name: 'New Name' };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(partialUpdate);
            }
        });

        it('should validate a partial update with only brand', () => {
            const partialUpdate = { brand: 'New Brand' };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(true);
             if (result.success) {
                expect(result.data).toEqual(partialUpdate);
            }
        });

        it('should validate a partial update with only state', () => {
            const partialUpdate = { state: 'in-use' as const };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(true);
             if (result.success) {
                expect(result.data).toEqual(partialUpdate);
            }
        });

        it('should validate a partial update with multiple fields', () => {
            const partialUpdate = { name: 'Updated Name', state: 'inactive' as const };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(true);
             if (result.success) {
                expect(result.data).toEqual(partialUpdate);
            }
        });

        it('should fail validation if state is invalid enum', () => {
            const partialUpdate = { state: 'disposed' };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(false);
        });

         it('should fail validation if name is provided but empty', () => {
            const partialUpdate = { name: '' };
            const result = updateDeviceSchema.safeParse(partialUpdate);
            expect(result.success).toBe(false);
        });
    });
});