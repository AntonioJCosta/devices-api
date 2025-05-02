import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceController } from '../src/controllers/deviceController'
import { deviceService } from '../src/services/deviceService'
import { createDeviceSchema, updateDeviceSchema } from '../src/validations/deviceValidation'
import type { Context, Cookie } from 'elysia'
import TypedResponse from 'elysia'
import type { Device } from '../drizzle/schema'

// Mock the service
vi.mock('../src/services/deviceService', () => ({
    deviceService: {
        createDevice: vi.fn(),
        getAllDevices: vi.fn(),
        getDeviceById: vi.fn(),
        updateDevice: vi.fn(),
        deleteDevice: vi.fn(),
    }
}));

// Mock the validation schemas
vi.mock('../src/validations/deviceValidation', async (importOriginal) => {
     const actual = await importOriginal<typeof import('../src/validations/deviceValidation')>();
    return {
        ...actual, // Keep actual types if needed
        createDeviceSchema: {
            safeParse: vi.fn()
        },
        updateDeviceSchema: {
            safeParse: vi.fn()
        }
    };
});

/// --- Define a more specific type for the mock context ---
type MockContextSet = {
    status?: number | string | undefined;
    headers?: Record<string, string> | undefined;
    redirect?: string | undefined;
    cookie?: Record<string, Cookie<any>>; // Use Cookie type
} & TypedResponse<any, any>;

// Make the main MockContext generic for Params
type MockContext<ParamsType = Record<string, any>> = Partial<Omit<Context<any>, 'set' | 'params' | 'body' | 'query'>> & {
    set: MockContextSet;
    params: ParamsType; // Use the generic type here
    body: any;
    query: Record<string, any>;
};


// Helper to create a mock context, now generic for Params
const mockContext = <ParamsType = Record<string, any>>( // Add generic parameter
    params: ParamsType, // Use the generic type for the argument
    body: any = undefined,
    query: Record<string, any> = {}
): MockContext<ParamsType> => ({ // Return the generic type
    params,
    body,
    query,
    set: {
        status: 200
    } as MockContextSet,
});


describe('Device Controller', () => {
    const mockDevice: Device = {
        id: 1,
        name: 'Test Device',
        brand: 'Test Brand',
        state: 'available',
        createdAt: new Date(),
    };
     const mockDeviceInUse: Device = {
        ...mockDevice,
        id: 2,
        state: 'in-use',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default mock implementations
        vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
        vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
        vi.mocked(deviceService.createDevice).mockResolvedValue(mockDevice);
        vi.mocked(deviceService.getAllDevices).mockResolvedValue([mockDevice, mockDeviceInUse]);
        vi.mocked(deviceService.getDeviceById).mockResolvedValue(mockDevice);
        vi.mocked(deviceService.updateDevice).mockResolvedValue(mockDevice);
        vi.mocked(deviceService.deleteDevice).mockResolvedValue(true);

        // Ensure the mock context's 'set' status is reset if modified in tests
        // (or create a new mock context in each test)
    });

    describe('create', () => {
        it('should return 400 if validation fails', async () => {
            const validationError = { success: false, error: { format: () => ({ _errors: ['Validation failed'] }) } };
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue(validationError as any);
            const ctx = mockContext({}, { invalid: 'data' });

            const result = await deviceController.create(ctx as any);

            expect(createDeviceSchema.safeParse).toHaveBeenCalledWith({ invalid: 'data' });
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid input data', details: { _errors: ['Validation failed'] } });
            expect(deviceService.createDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 201 on successful creation', async () => {
            const inputData = { name: 'New', brand: 'Brand', state: 'available' as const };
            const createdDevice = { ...inputData, id: 10, createdAt: new Date() };
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: inputData } as any);
            vi.mocked(deviceService.createDevice).mockResolvedValue(createdDevice);
            const ctx = mockContext({}, inputData);

            const result = await deviceController.create(ctx as any);

            expect(createDeviceSchema.safeParse).toHaveBeenCalledWith(inputData);
            expect(deviceService.createDevice).toHaveBeenCalledWith(inputData);
            expect(ctx.set.status).toBe(201);
            expect(result).toEqual(createdDevice);
        });

        it('should return 500 if service throws error', async () => {
            const inputData = { name: 'New', brand: 'Brand', state: 'available' as const };
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: inputData } as any);
            vi.mocked(deviceService.createDevice).mockRejectedValue(new Error('DB error'));
            const ctx = mockContext({}, inputData);

            const result = await deviceController.create(ctx as any);

            expect(deviceService.createDevice).toHaveBeenCalledWith(inputData);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to create device' });
        });
    });

    describe('getAll', () => {
        it('should call service with query params and return devices', async () => {
            const query = { brand: 'Test Brand', state: 'available' };
            const expectedDevices = [mockDevice];
            vi.mocked(deviceService.getAllDevices).mockResolvedValue(expectedDevices);
            const ctx = mockContext({}, undefined, query);

            const result = await deviceController.getAll(ctx as any);

            expect(deviceService.getAllDevices).toHaveBeenCalledWith(query);
            expect(result).toEqual(expectedDevices);
            expect(ctx.set.status).toBe(200); // Default status
        });

        it('should return 500 if service throws error', async () => {
            vi.mocked(deviceService.getAllDevices).mockRejectedValue(new Error('Fetch error'));
            const ctx = mockContext({}, undefined, {});

            const result = await deviceController.getAll(ctx as any);

            expect(deviceService.getAllDevices).toHaveBeenCalledWith({});
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to fetch devices' });
        });
    });

    describe('getById', () => {
        it('should return 400 if ID is not a number', async () => {
            // Specify the expected params type { id: string }
            const id = mockDevice.id;
            const ctx = mockContext({ id: 'abc' } as { id: string });
            const result = await deviceController.getById(ctx as any);
               expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid device ID' });
            expect(deviceService.getDeviceById).not.toHaveBeenCalled();
        });

        it('should call service with ID and return device if found', async () => {
            const id = mockDevice.id;
            vi.mocked(deviceService.getDeviceById).mockResolvedValue(mockDevice);
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(id);
            expect(result).toEqual(mockDevice);
            expect(ctx.set.status).toBe(200);
        });

        it('should return 404 if service returns undefined', async () => {
            const id = 999;
            vi.mocked(deviceService.getDeviceById).mockResolvedValue(undefined);
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 500 if service throws error', async () => {
            const id = mockDevice.id;
            vi.mocked(deviceService.getDeviceById).mockRejectedValue(new Error('DB error'));
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to fetch device' });
        });
    });

    describe('update', () => {
         it('should return 400 if ID is not a number', async () => {
            const ctx = mockContext({ id: 'abc' }, { name: 'Update' });
            const result = await deviceController.update(ctx as any);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid device ID' });
            expect(updateDeviceSchema.safeParse).not.toHaveBeenCalled();
            expect(deviceService.updateDevice).not.toHaveBeenCalled();
        });

         it('should return 400 if validation fails', async () => {
            const id = mockDevice.id;
            const validationError = { success: false, error: { format: () => ({ _errors: ['Invalid state'] }) } };
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue(validationError as any);
            const ctx = mockContext({ id: String(id) }, { state: 'broken' });

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith({ state: 'broken' });
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid input data', details: { _errors: ['Invalid state'] } });
            expect(deviceService.updateDevice).not.toHaveBeenCalled();
        });

         it('should return 400 if validated data is empty object', async () => {
            const id = mockDevice.id;
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
            const ctx = mockContext({ id: String(id) }, {}); // Empty body leads to empty validated data

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith({});
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Update payload cannot be empty' });
            expect(deviceService.updateDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 200 on successful update', async () => {
            const id = mockDevice.id;
            const updateData = { name: 'Updated Name' };
            const updatedDevice = { ...mockDevice, name: 'Updated Name' };
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockResolvedValue(updatedDevice);
            const ctx = mockContext({ id: String(id) }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith(updateData);
            expect(deviceService.updateDevice).toHaveBeenCalledWith(id, updateData);
            expect(ctx.set.status).toBe(200);
            expect(result).toEqual(updatedDevice);
        });

        it('should return 404 if service returns null (device not found)', async () => {
            const id = 999;
            const updateData = { state: 'inactive' as const };
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockResolvedValue(null);
            const ctx = mockContext({ id: String(id) }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(id, updateData);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 400 if service throws domain validation error', async () => {
            const id = mockDeviceInUse.id;
            const updateData = { name: 'New Name' };
            const errorMsg = "Cannot update name for a device that is 'in-use'";
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext({ id: String(id) }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(id, updateData);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: errorMsg });
        });

        it('should return 500 if service throws other error', async () => {
            const id = mockDevice.id;
            const updateData = { state: 'inactive' as const };
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error('Generic DB Error'));
            const ctx = mockContext({ id: String(id) }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(id, updateData);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to update device' });
        });
    });

     describe('delete', () => {
         it('should return 400 if ID is not a number', async () => {
            const ctx = mockContext({ id: 'abc' });
            const result = await deviceController.delete(ctx as any);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid device ID' });
            expect(deviceService.deleteDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 204 on successful delete', async () => {
            const id = mockDevice.id;
            vi.mocked(deviceService.deleteDevice).mockResolvedValue(true);
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(204);
            expect(result).toBeUndefined(); // No body for 204
        });

        it('should return 404 if service returns false (device not found)', async () => {
            const id = 999;
            vi.mocked(deviceService.deleteDevice).mockResolvedValue(false);
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 400 if service throws domain validation error', async () => {
            const id = mockDeviceInUse.id;
            const errorMsg = "Cannot delete a device that is 'in-use'";
            vi.mocked(deviceService.deleteDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: errorMsg });
        });

        it('should return 500 if service throws other error', async () => {
            const id = mockDevice.id;
            vi.mocked(deviceService.deleteDevice).mockRejectedValue(new Error('Generic DB Error'));
            const ctx = mockContext({ id: String(id) });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(id);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to delete device' });
        });
    });
});